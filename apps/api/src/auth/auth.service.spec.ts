import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = { findByEmail: vi.fn() };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('token') };
  const prisma = {
    user: { update: vi.fn().mockResolvedValue({}), findUnique: vi.fn() },
    student: { findUnique: vi.fn(), update: vi.fn() },
    role: { findUnique: vi.fn() },
    signupAttempt: { deleteMany: vi.fn(), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
  };

  beforeEach(async () => {
    usersService.findByEmail.mockReset();
    jwtService.signAsync.mockReset().mockResolvedValue('token');
    prisma.user.update.mockReset().mockResolvedValue({});
    prisma.user.findUnique.mockReset();
    prisma.student.findUnique.mockReset();
    prisma.student.update.mockReset();
    prisma.role.findUnique.mockReset();
    prisma.signupAttempt.deleteMany.mockReset();
    prisma.signupAttempt.count.mockReset().mockResolvedValue(0);
    prisma.signupAttempt.create.mockReset();
    prisma.$transaction.mockReset();
    prisma.auditLog.create.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses password hashes and rejects the former numeric shortcut credentials', async () => {
    const user = {
      id: 'u1', email: 'admin.test@university.local', status: 'ACTIVE',
      passwordHash: await argon2.hash('different-secret'), role: { code: 'SYSTEM_ADMIN' },
    };
    usersService.findByEmail.mockResolvedValue(user);
    await expect(service.login('01', '01')).rejects.toThrow('Invalid credentials');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('accepts the short test login only in non-production when explicitly enabled', async () => {
    const previousMode = process.env.NODE_ENV;
    const previousFlag = process.env.ENABLE_TEST_LOGINS;
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_TEST_LOGINS = 'true';
    usersService.findByEmail.mockResolvedValue({
      id: 'admin-1', email: 'admin.test@university.local', status: 'ACTIVE',
      passwordHash: 'unused-for-test-alias', role: { code: 'SYSTEM_ADMIN' },
    });
    try {
      await service.login('01', '01');
      expect(usersService.findByEmail).toHaveBeenCalledWith('admin.test@university.local');
    } finally {
      if (previousMode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousMode;
      if (previousFlag === undefined) delete process.env.ENABLE_TEST_LOGINS;
      else process.env.ENABLE_TEST_LOGINS = previousFlag;
    }
  });

  it('blocks short test logins in production even if the flag is set', async () => {
    const previousMode = process.env.NODE_ENV;
    const previousFlag = process.env.ENABLE_TEST_LOGINS;
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_TEST_LOGINS = 'true';
    usersService.findByEmail.mockResolvedValue({
      id: 'admin-1', email: 'admin.test@university.local', status: 'ACTIVE',
      passwordHash: await argon2.hash('real-secret'), role: { code: 'SYSTEM_ADMIN' },
    });
    try {
      await expect(service.login('01', '01')).rejects.toThrow('Invalid credentials');
    } finally {
      if (previousMode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousMode;
      if (previousFlag === undefined) delete process.env.ENABLE_TEST_LOGINS;
      else process.env.ENABLE_TEST_LOGINS = previousFlag;
    }
  });

  it('rejects a correctly authenticated account until an administrator activates it', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u2', email: 'student@example.edu', status: 'PENDING_VERIFICATION',
      passwordHash: await argon2.hash('correct-password'), role: { code: 'STUDENT' },
    });
    await expect(service.login('student@example.edu', 'correct-password')).rejects.toThrow('Invalid credentials');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns the same public signup response when no student record matches', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 'student-role', isActive: true });
    const response = await service.signupStudent({
      universityId: 'missing', firstName: 'Test', familyName: 'Student',
      email: 'student@example.edu', password: 'a-long-test-password',
    }, '127.0.0.1');
    expect(response.message).toContain('إذا كانت البيانات مطابقة');
    expect(prisma.signupAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ipHash: expect.any(String), succeeded: false } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a pending student account only after matching the registry record', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1', universityId: 'U-1', firstName: 'Sara', middleName: null,
      familyName: 'Ali', dateOfBirth: null, idOrPassport: null,
      universityEmail: 'sara@example.edu', userId: null,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 'student-role', isActive: true });
    const tx = {
      user: { create: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      student: { update: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    await service.signupStudent({
      universityId: 'U-1', firstName: 'Sara', familyName: 'Ali',
      email: 'SARA@example.edu', password: 'a-long-test-password',
    }, '127.0.0.1');
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_VERIFICATION', email: 'sara@example.edu' }) }));
    expect(tx.student.update).toHaveBeenCalledWith({ where: { id: 'student-1' }, data: { userId: 'user-1' } });
    expect(prisma.signupAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ succeeded: true }) }));
  });
});
