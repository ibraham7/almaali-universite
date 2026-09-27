import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const user = { findUnique: vi.fn() };

  beforeEach(async () => {
    user.findUnique.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: { user } }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('selects only login fields and avoids the optional lastLoginAt column', async () => {
    user.findUnique.mockResolvedValue(null);

    await service.findByEmail('student@example.edu');

    expect(user.findUnique).toHaveBeenCalledWith({
      where: { email: 'student@example.edu' },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        role: { select: { code: true } },
      },
    });
  });
});
