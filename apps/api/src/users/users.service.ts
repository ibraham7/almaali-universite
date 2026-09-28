import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStaffUserDto } from './dto/create-staff-user.dto.js';

type UserStatusValue =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'LOCKED'
  | 'DISABLED';

type RoleCodeValue =
  | 'STUDENT'
  | 'ADVISOR'
  | 'REGISTRAR'
  | 'SYSTEM_ADMIN';

interface FindUsersOptions {
  search?: string;
  status?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findByEmail(
    email: string,
  ) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        status: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        status: true,
        role: { select: { code: true } },
      },
    });
  }

  async createStaffUser(input: CreateStaffUserDto, actingUserId: string) {
    const username = input.username.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const studentWithUsername = await this.prisma.student.findUnique({ where: { universityId: username }, select: { id: true } });
    if (studentWithUsername) throw new BadRequestException('اسم الدخول مستخدم كرقم جامعي. اختر اسمًا آخر.');
    const role = await this.prisma.role.findUnique({ where: { code: input.roleCode } });
    if (!role?.isActive) throw new BadRequestException('الدور المحدد غير متاح.');

    try {
      const user = await this.prisma.user.create({
        data: {
          email: `${username}@staff.local`,
          username,
          displayName,
          passwordHash: await argon2.hash(input.password),
          status: 'ACTIVE',
          roleId: role.id,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          status: true,
          role: { select: { id: true, code: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
      await this.prisma.auditLog.create({
        data: {
          action: 'STAFF_USER_CREATED',
          entity: 'User',
          entityId: user.id,
          userId: actingUserId,
          details: JSON.stringify({ username, role: role.code }),
        },
      });
      return user;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new BadRequestException('اسم الدخول مستخدم مسبقًا. اختر اسمًا آخر.');
      }
      throw error;
    }
  }

  async findAll(
    options: FindUsersOptions = {},
  ) {
    const search =
      options.search?.trim();

    const status =
      options.status?.trim();

    const role =
      options.role?.trim();

    return this.prisma.user.findMany({
      where: {
        ...(status
          ? {
              status:
                status as UserStatusValue,
            }
          : {}),

        ...(role
          ? {
              role: {
                code:
                  role as RoleCodeValue,
              },
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  email: {
                    contains:
                      search,

                    mode:
                      'insensitive',
                  },
                },
                {
                  username: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  displayName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },

                {
                  student: {
                    is: {
                      OR: [
                        {
                          universityId:
                            {
                              contains:
                                search,

                              mode:
                                'insensitive',
                            },
                        },

                        {
                          firstName:
                            {
                              contains:
                                search,

                              mode:
                                'insensitive',
                            },
                        },

                        {
                          middleName:
                            {
                              contains:
                                search,

                              mode:
                                'insensitive',
                            },
                        },

                        {
                          familyName:
                            {
                              contains:
                                search,

                              mode:
                                'insensitive',
                            },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },

      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
            status: true,
            lastLoginAt: true,

        roleId: true,

        role: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true,
          },
        },

        student: {
          select: {
            id: true,
            universityId: true,
            firstName: true,
            middleName: true,
            familyName: true,
            universityEmail: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          status: true,
          lastLoginAt: true,

          roleId: true,

          role: true,

          student: {
            include: {
              enrollments: {
                orderBy: {
                  createdAt:
                    'desc',
                },

                take: 5,
              },
            },
          },

          createdAt: true,
          updatedAt: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return user;
  }

  async findRoles() {
    return this.prisma.role.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        code: 'asc',
      },
    });
  }

  async findSignupAttempts() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedCount, attempts] = await Promise.all([
      this.prisma.signupAttempt.count({ where: { succeeded: false, createdAt: { gte: since } } }),
      this.prisma.signupAttempt.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, succeeded: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { failedCount, attempts };
  }

  async resetStudentSignup(id: string, actingUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, student: true },
    });
    if (!user || user.role.code !== 'STUDENT' || user.status !== 'PENDING_VERIFICATION' || !user.student) {
      throw new BadRequestException('Only pending student signup accounts can be reset');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: user.student!.id }, data: { userId: null } });
      await tx.user.delete({ where: { id } });
      await tx.auditLog.create({ data: {
        action: 'STUDENT_SIGNUP_RESET', entity: 'User', entityId: id,
        userId: actingUserId, details: JSON.stringify({ studentId: user.student!.id }),
      } });
    });
    return { reset: true };
  }

  async updateStatus(
    id: string,
    status: UserStatusValue,
    actingUserId: string,
  ) {
    const allowedStatuses:
      UserStatusValue[] = [
      'ACTIVE',
      'PENDING_VERIFICATION',
      'SUSPENDED',
      'LOCKED',
      'DISABLED',
    ];

    if (
      !allowedStatuses.includes(
        status,
      )
    ) {
      throw new BadRequestException(
        'Invalid user status',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        include: {
          role: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (
      id === actingUserId &&
      status !== 'ACTIVE'
    ) {
      throw new BadRequestException(
        'You cannot disable, suspend or lock your own account',
      );
    }

    const updatedUser =
      await this.prisma.user.update({
        where: {
          id,
        },

        data: {
          status,
        },

        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          status: true,

          role: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },

          createdAt: true,
          updatedAt: true,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'USER_STATUS_UPDATED',

        entity:
          'User',

        entityId:
          id,

        userId:
          actingUserId,

        details: JSON.stringify({
          previousStatus:
            user.status,

          newStatus:
            status,
        }),
      },
    });

    return updatedUser;
  }

  async updateRole(
    id: string,
    roleCode: RoleCodeValue,
    actingUserId: string,
  ) {
    const allowedRoles:
      RoleCodeValue[] = [
      'STUDENT',
      'ADVISOR',
      'REGISTRAR',
      'SYSTEM_ADMIN',
    ];

    if (
      !allowedRoles.includes(
        roleCode,
      )
    ) {
      throw new BadRequestException(
        'Invalid role code',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        include: {
          role: true,
          student: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    const role =
      await this.prisma.role.findUnique({
        where: {
          code:
            roleCode as never,
        },
      });

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    if (!role.isActive) {
      throw new BadRequestException(
        'Role is inactive',
      );
    }

    if (
      id === actingUserId &&
      roleCode !==
        'SYSTEM_ADMIN'
    ) {
      throw new BadRequestException(
        'You cannot remove your own system administrator role',
      );
    }

    if (
      roleCode === 'STUDENT' &&
      !user.student
    ) {
      throw new BadRequestException(
        'This account has no student profile linked to it',
      );
    }

    const updatedUser =
      await this.prisma.user.update({
        where: {
          id,
        },

        data: {
          roleId:
            role.id,
        },

        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          status: true,

          role: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },

          student: {
            select: {
              id: true,
              universityId: true,
              firstName: true,
              middleName: true,
              familyName: true,
            },
          },

          createdAt: true,
          updatedAt: true,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'USER_ROLE_UPDATED',

        entity:
          'User',

        entityId:
          id,

        userId:
          actingUserId,

        details: JSON.stringify({
          previousRole:
            user.role.code,

          newRole:
            role.code,
        }),
      },
    });

    return updatedUser;
  }
}
