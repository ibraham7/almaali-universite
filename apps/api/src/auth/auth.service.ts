import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';

const SHORT_LOGIN_EMAILS: Record<string, string> = {
  '01': 'admin.test@university.local',
  '02': 'advisor.test@university.local',
  '03': 'student.test@university.local',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const normalizedUsername = username.trim();
    const shortcutEmail = SHORT_LOGIN_EMAILS[normalizedUsername];
    const email = shortcutEmail ?? normalizedUsername;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Temporary test-stage shortcuts requested for internal review.
    // Existing email/password credentials remain supported as a fallback.
    const isShortLogin = Boolean(shortcutEmail);
    const isPasswordValid = isShortLogin
      ? password === normalizedUsername
      : await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
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
}
