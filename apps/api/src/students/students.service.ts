import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

interface FindStudentsOptions {
  search?: string;
  status?: string;
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findMe(userId: string) {
    const student =
      await this.prisma.student.findUnique({
        where: {
          userId,
        },

        include: {
          enrollments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!student) {
      throw new NotFoundException(
        'No student profile is linked to this user account',
      );
    }

    return student;
  }

  async findAll(
    options: FindStudentsOptions = {},
  ) {
    const search =
      options.search?.trim();

    const status =
      options.status?.trim();

    return this.prisma.student.findMany({
      where: {
        ...(status
          ? {
              status,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  universityId: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  middleName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  familyName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  englishName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  universityEmail: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            role: {
              select: {
                code: true,
              },
            },
          },
        },

        enrollments: {
          orderBy: {
            createdAt: 'desc',
          },

          take: 1,

          select: {
            id: true,
            semesterId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },

      orderBy: [
        {
          firstName: 'asc',
        },
        {
          familyName: 'asc',
        },
      ],
    });
  }

  async findById(id: string) {
    const student =
      await this.prisma.student.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              role: {
                select: {
                  code: true,
                },
              },
            },
          },

          enrollments: {
            include: {
              items: {
                include: {
                  course: true,

                  section: {
                    include: {
                      teacher: true,
                      classroom: true,
                      schedules: true,
                    },
                  },
                },
              },

              approvals: true,
            },

            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!student) {
      throw new NotFoundException(
        'Student not found',
      );
    }

    return student;
  }
}