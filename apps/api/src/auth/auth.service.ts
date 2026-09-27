import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentSignupDto } from './dto/student-signup.dto.js';

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 5;
const SIGNUP_MESSAGE = 'إذا كانت البيانات مطابقة لسجل الجامعة، فسيُنشأ الحساب بعد مراجعة الإدارة.';
const TEST_SHORT_LOGIN_EMAILS: Record<string, string> = {
  '01': 'admin.test@university.local',
  '02': 'advisor.test@university.local',
  '03': 'student.test@university.local',
};

function normalize(value: string | null | undefined) {
  return (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(username: string, password: string) {
    const normalizedUsername = username.trim().toLocaleLowerCase();
    const testLoginsEnabled =
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_TEST_LOGINS === 'true';
    const shortcutEmail = testLoginsEnabled
      ? TEST_SHORT_LOGIN_EMAILS[normalizedUsername]
      : undefined;
    const email = shortcutEmail ?? normalizedUsername;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = shortcutEmail
      ? password === normalizedUsername
      : await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
      },
    };
  }

  private hashIp(ip: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET must be configured');
    return createHash('sha256').update(`${secret}:${ip}`).digest('hex');
  }

  async signupStudent(input: StudentSignupDto, ip: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - SIGNUP_WINDOW_MS);
    const ipHash = this.hashIp(ip || 'unknown');
    await this.prisma.signupAttempt.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
    const recentAttempts = await this.prisma.signupAttempt.count({
      where: { ipHash, createdAt: { gte: cutoff } },
    });
    if (recentAttempts >= SIGNUP_MAX_ATTEMPTS) {
      return { message: SIGNUP_MESSAGE };
    }

    const email = input.email.trim().toLocaleLowerCase();
    const student = await this.prisma.student.findUnique({ where: { universityId: input.universityId.trim() } });
    let matched = Boolean(student && !student.userId);
    if (student) {
      matched = matched && normalize(student.firstName) === normalize(input.firstName)
        && normalize(student.familyName) === normalize(input.familyName)
        && (!student.middleName || normalize(student.middleName) === normalize(input.middleName))
        && (!student.dateOfBirth || Boolean(input.dateOfBirth && student.dateOfBirth.toISOString().slice(0, 10) === input.dateOfBirth.slice(0, 10)))
        && (!student.idOrPassport || normalize(student.idOrPassport) === normalize(input.idOrPassport));
      if (student.universityEmail) matched = matched && normalize(student.universityEmail) === normalize(email);
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    const role = await this.prisma.role.findUnique({ where: { code: 'STUDENT' }, select: { id: true, isActive: true } });
    let succeeded = Boolean(matched && !existingEmail && role?.isActive);
    if (succeeded && student && role) {
      const passwordHash = await argon2.hash(input.password);
      try {
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email, passwordHash, roleId: role.id, status: 'PENDING_VERIFICATION' },
          });
          await tx.student.update({ where: { id: student.id }, data: { userId: user.id } });
          await tx.auditLog.create({ data: {
            action: 'STUDENT_SIGNUP_PENDING', entity: 'User', entityId: user.id,
            details: JSON.stringify({ studentId: student.id }),
          } });
        });
      } catch {
        // Keep responses identical if an account was created concurrently.
        succeeded = false;
      }
    }

    await this.prisma.signupAttempt.create({ data: { ipHash, succeeded } });
    return { message: SIGNUP_MESSAGE };
  }
}
