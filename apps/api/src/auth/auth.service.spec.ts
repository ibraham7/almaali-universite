import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = { findByEmail: vi.fn(), findByUsername: vi.fn() };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('token'), verifyAsync: vi.fn() };
  const prisma = {
    user: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    student: { findUnique: vi.fn(), update: vi.fn() },
    role: { findUnique: vi.fn(), upsert: vi.fn() },
    affairsStaff: { findFirst: vi.fn().mockResolvedValue(null) },
    signupAttempt: { deleteMany: vi.fn(), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
  };

  beforeEach(async () => {
    usersService.findByEmail.mockReset();
    usersService.findByUsername.mockReset();
    jwtService.signAsync.mockReset().mockResolvedValue('token');
    prisma.user.update.mockReset().mockResolvedValue({});
    prisma.user.findUnique.mockReset();
    prisma.user.findFirst.mockReset().mockResolvedValue(null);
    prisma.user.create.mockReset();
    prisma.student.findUnique.mockReset();
    prisma.student.update.mockReset();
    prisma.role.findUnique.mockReset();
    prisma.role.upsert.mockReset().mockResolvedValue({ id: 'admin-role' });
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

  it('creates a single initial admin only with the configured bootstrap token', async () => {
    const previousToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    process.env.ADMIN_BOOTSTRAP_TOKEN = 'a'.repeat(48);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'admin-1',
      username: data.username,
      email: data.email,
      displayName: data.displayName,
    }));

    try {
      await expect(service.bootstrapAdmin('temporary-password', 'wrong-token')).rejects.toThrow('رمز التهيئة غير صحيح.');
      expect(prisma.user.create).not.toHaveBeenCalled();

      await expect(service.bootstrapAdmin('temporary-password', 'a'.repeat(48))).resolves.toMatchObject({
        user: { username: 'admin', email: 'admin.test@university.local' },
      });
      const createdUser = prisma.user.create.mock.calls[0][0];
      await expect(argon2.verify(createdUser.data.passwordHash, 'temporary-password')).resolves.toBe(true);
      expect(process.env.ADMIN_BOOTSTRAP_TOKEN).toBeUndefined();
    } finally {
      if (previousToken === undefined) delete process.env.ADMIN_BOOTSTRAP_TOKEN;
      else process.env.ADMIN_BOOTSTRAP_TOKEN = previousToken;
    }
  });

  it('refuses to bootstrap a second administrator', async () => {
    const previousToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    process.env.ADMIN_BOOTSTRAP_TOKEN = 'b'.repeat(48);
    prisma.user.findFirst.mockResolvedValue({ id: 'existing-admin' });
    try {
      await expect(service.bootstrapAdmin('temporary-password', 'b'.repeat(48))).rejects.toThrow('يوجد مدير للنظام بالفعل.');
      expect(prisma.user.create).not.toHaveBeenCalled();
    } finally {
      if (previousToken === undefined) delete process.env.ADMIN_BOOTSTRAP_TOKEN;
      else process.env.ADMIN_BOOTSTRAP_TOKEN = previousToken;
    }
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

  it('authenticates without writing to the optional lastLoginAt column', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'student-1', email: 'student@example.edu', status: 'ACTIVE',
      passwordHash: await argon2.hash('valid-password'), role: { code: 'STUDENT' },
    });

    await expect(service.login('student@example.edu', 'valid-password')).resolves.toMatchObject({
      user: { email: 'student@example.edu', role: 'STUDENT' },
      access_token: 'token',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows staff to log in with the username created by an administrator', async () => {
    usersService.findByUsername.mockResolvedValue({
      id: 'staff-1', username: 'advisor01', email: 'advisor01@staff.local', status: 'ACTIVE',
      passwordHash: await argon2.hash('a-strong-temporary-password'), role: { code: 'ADVISOR' },
    });
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(service.login('advisor01', 'a-strong-temporary-password')).resolves.toMatchObject({
      user: { email: 'advisor01', role: 'ADVISOR' },
      access_token: 'token',
    });
    expect(usersService.findByUsername).toHaveBeenCalledWith('advisor01');
  });

  it('flags an active affairs employee (registrar with a staff profile) at login, and nobody else', async () => {
    const staffLogin = async (role: string, staff: unknown) => {
      usersService.findByUsername.mockResolvedValue({ id: 'u-1', username: 'u1', email: 'u1@staff.local', status: 'ACTIVE', passwordHash: await argon2.hash('a-strong-password'), role: { code: role } });
      prisma.student.findUnique.mockResolvedValue(null);
      prisma.affairsStaff.findFirst.mockReset().mockResolvedValue(staff);
      return service.login('u1', 'a-strong-password');
    };
    expect((await staffLogin('REGISTRAR', { id: 's1' })).user.affairsStaff).toBe(true);
    expect(prisma.affairsStaff.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u-1', isActive: true } }));
    expect((await staffLogin('REGISTRAR', null)).user.affairsStaff).toBe(false);
    const admin = await staffLogin('SYSTEM_ADMIN', { id: 's1' });
    expect(admin.user.affairsStaff).toBe(false);
    expect(prisma.affairsStaff.findFirst).not.toHaveBeenCalled();
    expect((await staffLogin('ADVISOR', { id: 's1' })).user.affairsStaff).toBe(false);
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

  it('rejects unmatched identity data without issuing a signup token', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 'student-role', isActive: true });
    await expect(service.signupStudent({
      universityId: 'missing', fullName: 'Test Student', fatherName: 'A', motherName: 'B',
      nationalId: '12345678901', applicationNumber: '67890', birthPlace: 'C',
    }, '127.0.0.1')).rejects.toThrow('لم تتطابق');
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(prisma.signupAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ipHash: expect.any(String), succeeded: false } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('issues a short lived token and creates an active account after password selection', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1', universityId: 'U-1', firstName: 'Sara', fullName: 'Sara Ali', middleName: 'Omar',
      familyName: 'Ali', motherName: 'Mona', nationalId: '12345678901', applicationNumber: '67890', birthPlace: 'Aleppo', userId: null,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 'student-role', isActive: true });
    const tx = {
      user: { create: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      student: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    const verification = await service.signupStudent({
      universityId: 'U-1', fullName: 'Sara Ali', fatherName: 'Omar', motherName: 'Mona',
      nationalId: '12345678901', applicationNumber: '67890', birthPlace: 'Aleppo',
    }, '127.0.0.1');
    expect(verification.verificationToken).toBe('token');
    expect(jwtService.signAsync).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'student-signup' }), { expiresIn: '5m' });
    jwtService.verifyAsync.mockResolvedValue(jwtService.signAsync.mock.calls[0][0]);
    await service.completeStudentSignup({ verificationToken: 'token', password: 'a-long-test-password' }, '127.0.0.1');
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', email: 'U-1@students.local' }) }));
    expect(tx.student.updateMany).toHaveBeenCalledWith({ where: { id: 'student-1', userId: null }, data: { userId: 'user-1' } });
    expect(prisma.signupAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ succeeded: true }) }));
  });

  it('returns field-specific format errors before checking the student record', async () => {
    await expect(service.signupStudent({
      universityId: 'U-2', fullName: 'Sara Ali', fatherName: 'Omar', motherName: 'Mona',
      nationalId: '12A45', applicationNumber: '67890', birthPlace: 'Aleppo',
    }, '127.0.0.1')).rejects.toMatchObject({
      response: { invalidFields: ['الرقم الوطني: أرقام فقط'] },
    });
    expect(prisma.student.findUnique).not.toHaveBeenCalled();
  });

  const ministryRecord = (extra: Record<string, unknown> = {}) => ({
    id: 'student-2', universityId: 'U-2', firstName: 'Sara', fullName: 'Sara Ali', middleName: 'Omar', familyName: 'Ali',
    motherName: 'Mona', nationalId: null, applicationNumber: '67890', birthPlace: null, dateOfBirth: new Date('2004-03-25T00:00:00.000Z'), userId: null, ...extra,
  });
  const ministryInput = { universityId: 'U-2', fullName: 'Sara Ali', fatherName: 'Omar', motherName: 'Mona', applicationNumber: '67890', dateOfBirth: '2004-03-25' };

  it('verifies a student whose record has no national ID or birth place (ministry file) by the data it does have', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue(ministryRecord());
    const result = await service.signupStudent(ministryInput, '127.0.0.1');
    expect(result.verificationToken).toBe('token');
  });

  it('rejects a wrong date of birth when the record has one', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue(ministryRecord());
    await expect(service.signupStudent({ ...ministryInput, dateOfBirth: '2004-03-26' }, '127.0.0.1')).rejects.toMatchObject({ response: { mismatchedFields: ['تاريخ الميلاد'] } });
    await expect(service.signupStudent({ ...ministryInput, dateOfBirth: undefined }, '127.0.0.1')).rejects.toMatchObject({ response: { mismatchedFields: ['تاريخ الميلاد'] } });
  });

  it('still requires the national ID and birth place once the record has them (completed later by the university)', async () => {
    process.env.JWT_SECRET = 'test-secret';
    prisma.student.findUnique.mockResolvedValue(ministryRecord({ nationalId: '12345678901', birthPlace: 'Aleppo' }));
    await expect(service.signupStudent(ministryInput, '127.0.0.1')).rejects.toMatchObject({ response: { mismatchedFields: ['الرقم الوطني', 'مكان الولادة'] } });
    const ok = await service.signupStudent({ ...ministryInput, nationalId: '12345678901', birthPlace: 'Aleppo' }, '127.0.0.1');
    expect(ok.verificationToken).toBe('token');
  });
});
