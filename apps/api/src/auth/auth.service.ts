import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompleteStudentSignupDto, StudentSignupDto } from './dto/student-signup.dto.js';

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 5;
const SIGNUP_MESSAGE = 'لم تتطابق البيانات مع سجل طالب غير مسجّل. راجع بياناتك لدى الجامعة.';
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
    const studentLogin = !shortcutEmail && !normalizedUsername.includes('@')
      ? await this.prisma.student.findUnique({
          where: { universityId: username.trim() },
          select: { user: { select: { email: true } } },
        })
      : null;
    const staffLogin = !shortcutEmail && !studentLogin?.user?.email && !normalizedUsername.includes('@')
      ? await this.usersService.findByUsername(normalizedUsername)
      : null;
    const email = shortcutEmail ?? studentLogin?.user?.email ?? normalizedUsername;

    const user = staffLogin ?? await this.usersService.findByEmail(email);

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
        email: studentLogin?.user?.email ? username.trim() : user.username ?? user.email,
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
      throw new BadRequestException('عدد المحاولات كبير. حاول مرة أخرى بعد 15 دقيقة.');
    }

    const student = await this.prisma.student.findUnique({ where: { universityId: input.universityId.trim() } });
    let matched = Boolean(student && !student.userId);
    if (student) {
      matched = matched && normalize(student.fullName ?? `${student.firstName} ${student.familyName}`) === normalize(input.fullName)
        && normalize(student.middleName) === normalize(input.fatherName)
        && Boolean(student.motherName && normalize(student.motherName) === normalize(input.motherName))
        && Boolean(student.nationalId && normalize(student.nationalId) === normalize(input.nationalId))
        && Boolean(student.applicationNumber && normalize(student.applicationNumber) === normalize(input.applicationNumber))
        && Boolean(student.birthPlace && normalize(student.birthPlace) === normalize(input.birthPlace));
    }
    await this.prisma.signupAttempt.create({ data: { ipHash, succeeded: matched } });
    if (!matched || !student) throw new BadRequestException(SIGNUP_MESSAGE);
    const verificationToken = await this.jwtService.signAsync(
      { sub: student.id, purpose: 'student-signup', ipHash },
      { expiresIn: '5m' },
    );
    return { verificationToken };
  }

  async completeStudentSignup(input: CompleteStudentSignupDto, ip: string) {
    let claim: { sub: string; purpose: string; ipHash: string };
    try {
      claim = await this.jwtService.verifyAsync(input.verificationToken);
    } catch {
      throw new BadRequestException('انتهت صلاحية التحقق. أعد إدخال بيانات الطالب.');
    }
    if (claim.purpose !== 'student-signup' || claim.ipHash !== this.hashIp(ip || 'unknown')) {
      throw new BadRequestException('انتهت صلاحية التحقق. أعد إدخال بيانات الطالب.');
    }
    const role = await this.prisma.role.findUnique({ where: { code: 'STUDENT' }, select: { id: true, isActive: true } });
    if (!role?.isActive) throw new BadRequestException('تعذر إنشاء الحساب حاليًا.');
    const student = await this.prisma.student.findUnique({ where: { id: claim.sub }, select: { id: true, universityId: true, userId: true } });
    if (!student || student.userId) throw new BadRequestException('هذا الحساب مسجل مسبقًا.');
    const passwordHash = await argon2.hash(input.password);
    try {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: {
          email: `${student.universityId}@students.local`, passwordHash, roleId: role.id, status: 'ACTIVE',
        } });
        const claimed = await tx.student.updateMany({ where: { id: student.id, userId: null }, data: { userId: user.id } });
        if (claimed.count !== 1) throw new Error('Already claimed');
        await tx.auditLog.create({ data: { action: 'STUDENT_SIGNUP', entity: 'User', entityId: user.id, details: JSON.stringify({ studentId: student.id }) } });
      });
    } catch {
      throw new BadRequestException('تعذر إنشاء الحساب أو أنه مسجل مسبقًا.');
    }
    return { message: 'تم إنشاء الحساب. سجّل الدخول باستخدام الرقم الجامعي.' };
  }
}
