import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { StudentInputDto } from './dto/student-input.dto.js';
import * as XLSX from 'xlsx';

interface FindStudentsOptions {
  search?: string;
  status?: string;
  accountStatus?: string;
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async importStudents(file?: { buffer: Buffer; originalname: string }) {
    if (!file || !/\.(xlsx|csv)$/i.test(file.originalname)) {
      throw new BadRequestException('ارفع ملف Excel أو CSV صالحًا.');
    }
    let rows: Record<string, unknown>[];
    try {
      const workbook = /\.csv$/i.test(file.originalname)
        ? XLSX.read(file.buffer.toString('utf8'), { type: 'string' })
        : XLSX.read(file.buffer, { type: 'buffer', cellText: true, cellDates: false });
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '', raw: false });
    } catch {
      throw new BadRequestException('تعذر قراءة ملف الطلاب.');
    }
    const columns = ['الرقم الجامعي', 'اسم الطالب', 'الأب', 'الأم', 'الرقم الوطني', 'رقم الاكتتاب', 'مكان الولادة'];
    const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
    const header = Object.keys(rows[0] ?? {}).map(clean);
    if (!columns.every((column) => header.includes(column))) {
      throw new BadRequestException(`الملف يحتاج الأعمدة: ${columns.join('، ')}`);
    }
    if (!rows.length || rows.length > 5000) throw new BadRequestException('يجب أن يحتوي الملف على 1 إلى 5000 طالب.');
    const students = rows.map((row, index) => {
      const get = (name: string) => clean(String(Object.entries(row).find(([key]) => clean(key) === name)?.[1] ?? ''));
      const [universityId, fullName, fatherName, motherName, nationalId, applicationNumber, birthPlace] = columns.map(get);
      if ([universityId, fullName, fatherName, motherName, nationalId, applicationNumber, birthPlace].some((value) => !value)) {
        throw new BadRequestException(`بيانات مطلوبة ناقصة في الصف ${index + 2}.`);
      }
      const nameParts = fullName.split(' ');
      return { universityId, fullName, firstName: nameParts[0], familyName: nameParts.slice(1).join(' ') || nameParts[0], middleName: fatherName, motherName, nationalId, applicationNumber, birthPlace };
    });
    if (new Set(students.map(({ universityId }) => universityId)).size !== students.length) {
      throw new BadRequestException('يوجد رقم جامعي مكرر في الملف.');
    }
    const ids = students.map(({ universityId }) => universityId);
    const registered = await this.prisma.student.findFirst({ where: { universityId: { in: ids }, userId: { not: null } }, select: { id: true } });
    if (registered) throw new BadRequestException('يحتوي الملف على طالب يملك حسابًا؛ لن تُستبدل بياناته.');
    await this.prisma.$transaction(async (tx) => {
      for (const student of students) {
        await tx.student.upsert({ where: { universityId: student.universityId }, create: { ...student, status: 'ACTIVE' }, update: student });
      }
    }, { timeout: 120000 });
    return { imported: students.length };
  }

  async findAdvisors() {
    return this.prisma.user.findMany({
      where: { role: { code: 'ADVISOR' }, status: 'ACTIVE' },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }

  private async validateStructure(data: StudentInputDto) {
    const { collegeId, departmentId, programId, studyPlanId, academicYearId, semesterId, advisorId } = data;
    const invalid = () => { throw new BadRequestException('Invalid academic structure or advisor'); };

    if (collegeId && !await this.prisma.college.findUnique({ where: { id: collegeId } })) invalid();
    if (departmentId) {
      const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!collegeId || department?.collegeId !== collegeId) invalid();
    }
    if (programId) {
      const program = await this.prisma.program.findUnique({ where: { id: programId } });
      if (!departmentId || program?.departmentId !== departmentId) invalid();
    }
    if (studyPlanId) {
      const plan = await this.prisma.studyPlan.findUnique({ where: { id: studyPlanId } });
      if (!programId || plan?.programId !== programId) invalid();
    }
    if (academicYearId) {
      const year = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
      if (!studyPlanId || year?.studyPlanId !== studyPlanId) invalid();
    }
    if (semesterId) {
      const semester = await this.prisma.semester.findUnique({ where: { id: semesterId } });
      if (!academicYearId || semester?.academicYearId !== academicYearId) invalid();
    }
    if (advisorId) {
      const advisor = await this.prisma.user.findUnique({ where: { id: advisorId }, include: { role: true } });
      if (advisor?.role.code !== 'ADVISOR' || advisor.status !== 'ACTIVE') invalid();
    }
  }

  private normalize(data: StudentInputDto) {
    const required = ['universityId', 'firstName', 'familyName'] as const;
    for (const field of required) {
      if (!data[field]?.trim()) throw new BadRequestException(`${field} is required`);
    }
    const optional = (value?: string | null) => value?.trim() || null;
    const date = (value?: string | null) => value ? new Date(value) : null;
    if (data.dateOfBirth && Number.isNaN(date(data.dateOfBirth)?.getTime())) throw new BadRequestException('Invalid date of birth');
    if (data.admissionDate && Number.isNaN(date(data.admissionDate)?.getTime())) throw new BadRequestException('Invalid admission date');
    return {
      universityId: data.universityId.trim(),
      firstName: data.firstName.trim(),
      familyName: data.familyName.trim(),
      middleName: optional(data.middleName),
      englishName: optional(data.englishName),
      gender: optional(data.gender),
      dateOfBirth: date(data.dateOfBirth),
      nationality: optional(data.nationality),
      idOrPassport: optional(data.idOrPassport),
      universityEmail: optional(data.universityEmail),
      phone: optional(data.phone),
      status: data.status?.trim() || 'ACTIVE',
      collegeId: optional(data.collegeId),
      departmentId: optional(data.departmentId),
      programId: optional(data.programId),
      studyPlanId: optional(data.studyPlanId),
      academicYearId: optional(data.academicYearId),
      semesterId: optional(data.semesterId),
      advisorId: optional(data.advisorId),
      admissionDate: date(data.admissionDate),
    };
  }

  private rethrowDuplicate(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new ConflictException('University ID already exists');
    }
    throw error;
  }

  async create(data: StudentInputDto, actingUserId: string) {
    const normalized = this.normalize(data);
    await this.validateStructure(data);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const student = await tx.student.create({ data: normalized });
        await tx.auditLog.create({ data: {
          action: 'STUDENT_CREATED', entity: 'Student', entityId: student.id,
          userId: actingUserId, details: JSON.stringify({ universityId: student.universityId }),
        } });
        return student;
      });
    } catch (error) { return this.rethrowDuplicate(error); }
  }

  async update(id: string, data: StudentInputDto, actingUserId: string) {
    const normalized = this.normalize(data);
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');
    await this.validateStructure(data);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const student = await tx.student.update({ where: { id }, data: normalized });
        await tx.auditLog.create({ data: {
          action: 'STUDENT_UPDATED', entity: 'Student', entityId: id,
          userId: actingUserId,
          details: JSON.stringify({
            universityId: student.universityId,
            changedFields: Object.keys(normalized).filter((key) =>
              String(existing[key as keyof typeof existing] ?? '') !== String(student[key as keyof typeof student] ?? ''),
            ),
          }),
        } });
        return student;
      });
    } catch (error) { return this.rethrowDuplicate(error); }
  }

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
    const accountStatus = options.accountStatus?.trim();

    return this.prisma.student.findMany({
      where: {
        ...(status
          ? {
              status,
            }
          : {}),

        ...(accountStatus === 'NO_ACCOUNT' ? { userId: null } : {}),
        ...(accountStatus === 'HAS_ACCOUNT' ? { userId: { not: null } } : {}),
        ...(accountStatus === 'PENDING_VERIFICATION' ? { user: { is: { status: 'PENDING_VERIFICATION' } } } : {}),

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
            lastLoginAt: true,
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
