import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { StudentInputDto } from './dto/student-input.dto.js';
import { digitVariants, isDigitsOnly, isPersonName, isPlaceName, isSyrianMobile, isSyrianNationalId, normalizeDigits, normalizeGender, normalizeText } from './student-data-validation.js';

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
    const required = ['universityId', 'firstName', 'middleName', 'familyName', 'motherName', 'nationalId', 'applicationNumber', 'birthPlace'] as const;
    for (const field of required) {
      if (!data[field]?.trim()) throw new BadRequestException(`${field} is required`);
    }
    const names: Array<[string, string | null | undefined]> = [
      ['الاسم الأول', data.firstName], ['اسم الأب', data.middleName],
      ['اسم العائلة', data.familyName], ['اسم الأم', data.motherName],
      ['الاسم بالإنجليزية', data.englishName],
    ];
    for (const [label, value] of names) {
      if (value?.trim() && !isPersonName(value)) {
        throw new BadRequestException(`${label}: استخدم الحروف والمسافات والشرطة أو الفاصلة العليا فقط.`);
      }
    }
    for (const [label, value] of [['الرقم الوطني', data.nationalId], ['رقم الاكتتاب', data.applicationNumber]] as const) {
      if (value?.trim() && !isDigitsOnly(value)) {
        throw new BadRequestException(`${label}: أدخل الأرقام فقط.`);
      }
    }
    if (data.nationalId?.trim() && !isSyrianNationalId(data.nationalId)) {
      throw new BadRequestException('الرقم الوطني: أدخل 11 رقمًا.');
    }
    if (data.gender?.trim() && !normalizeGender(data.gender)) {
      throw new BadRequestException('الجنس: اختر ذكرًا أو أنثى.');
    }
    if (data.nationality?.trim() && !isPersonName(data.nationality)) {
      throw new BadRequestException('الجنسية: أدخل اسم الجنسية بالحروف فقط.');
    }
    if (data.birthPlace?.trim() && !isPlaceName(data.birthPlace)) {
      throw new BadRequestException('مكان الولادة: أدخل اسم المكان بصيغة صحيحة.');
    }
    if (data.phone?.trim() && !isSyrianMobile(data.phone)) {
      throw new BadRequestException('رقم الهاتف: أدخل رقمًا سوريًا محليًا من 10 أرقام يبدأ بـ 09.');
    }
    const optional = (value?: string | null) => value?.trim() || null;
    const date = (value?: string | null) => value ? new Date(value) : null;
    if (data.dateOfBirth && Number.isNaN(date(data.dateOfBirth)?.getTime())) throw new BadRequestException('Invalid date of birth');
    if (data.admissionDate && Number.isNaN(date(data.admissionDate)?.getTime())) throw new BadRequestException('Invalid admission date');
    return {
      universityId: normalizeText(data.universityId),
      firstName: normalizeText(data.firstName),
      fullName: [data.firstName, data.middleName, data.familyName].map((value) => value?.trim()).filter(Boolean).join(' '),
      familyName: normalizeText(data.familyName),
      middleName: data.middleName?.trim() ? normalizeText(data.middleName) : null,
      motherName: data.motherName?.trim() ? normalizeText(data.motherName) : null,
      nationalId: data.nationalId?.trim() ? normalizeDigits(data.nationalId.trim()) : null,
      applicationNumber: data.applicationNumber?.trim() ? normalizeDigits(data.applicationNumber.trim()) : null,
      birthPlace: optional(data.birthPlace),
      englishName: optional(data.englishName),
      gender: normalizeGender(data.gender),
      dateOfBirth: date(data.dateOfBirth),
      nationality: data.nationality?.trim() ? normalizeText(data.nationality) : null,
      idOrPassport: optional(data.idOrPassport),
      universityEmail: optional(data.universityEmail),
      phone: data.phone?.trim() ? normalizeDigits(data.phone.trim()) : null,
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
      const target = 'meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta
        ? String(error.meta.target)
        : '';
      if (target.toLowerCase().includes('nationalid')) throw new ConflictException('الرقم الوطني مسجل لطالب آخر.');
      if (target.toLowerCase().includes('universityid')) throw new ConflictException('الرقم الجامعي مسجل لطالب آخر.');
      throw new ConflictException('توجد بيانات مكررة لهذا الطالب.');
    }
    throw error;
  }

  private async ensureUniqueNationalId(nationalId: string | null, excludeStudentId?: string) {
    if (!nationalId) return;
    const existing = await this.prisma.student.findFirst({
      where: { nationalId: { in: digitVariants(nationalId) }, ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictException('الرقم الوطني مسجل لطالب آخر.');
  }

  async create(data: StudentInputDto, actingUserId: string) {
    const normalized = this.normalize(data);
    await this.validateStructure(data);
    await this.ensureUniqueNationalId(normalized.nationalId);
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
    await this.ensureUniqueNationalId(normalized.nationalId, id);
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

  async remove(id: string, actingUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        universityId: true,
        userId: true,
        _count: { select: { enrollments: true, results: true } },
      },
    });
    if (!student) throw new NotFoundException('الطالب غير موجود.');
    if (student.userId || student._count.enrollments > 0 || student._count.results > 0) {
      throw new ConflictException('لا يمكن حذف طالب لديه حساب أو سجل أكاديمي. يمكنك تعديل بياناته أو تعطيل حسابه بدلًا من ذلك.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.student.delete({ where: { id } });
        await tx.auditLog.create({ data: {
          action: 'STUDENT_DELETED',
          entity: 'Student',
          entityId: id,
          userId: actingUserId,
          details: JSON.stringify({ universityId: student.universityId }),
        } });
        return { message: 'تم حذف الطالب.' };
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
        throw new ConflictException('لا يمكن حذف الطالب لوجود سجلات أكاديمية مرتبطة به.');
      }
      throw error;
    }
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

  async getMyAcademicStatus(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        universityId: true,
        studyPlanId: true,
        academicYearId: true,
      },
    });

    if (!student) throw new NotFoundException('No student profile is linked to this user account');
    if (!student.studyPlanId) throw new BadRequestException('الطالب غير مرتبط بخطة دراسية. راجع الإدارة.');
    if (!student.academicYearId) throw new BadRequestException('السنة الدراسية للطالب غير محددة. راجع الإدارة.');

    const [studyPlan, academicYear, results, enrollments] = await Promise.all([
      this.prisma.studyPlan.findUnique({
        where: { id: student.studyPlanId },
        select: {
          nameAr: true,
          planCourses: {
            include: { course: true, academicYear: true, semester: true },
            orderBy: [
              { academicYear: { levelNumber: 'asc' } },
              { semester: { semesterNumber: 'asc' } },
              { priority: 'asc' },
            ],
          },
        },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: student.academicYearId },
        select: { id: true, studyPlanId: true, levelNumber: true, nameAr: true },
      }),
      this.prisma.courseResult.findMany({
        where: { studentId: student.id },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { courseId: true, score: true, gradeLabel: true, passed: true, semester: { select: { nameAr: true } } },
      }),
      this.prisma.studentEnrollment.findMany({
        where: { studentId: student.id },
        select: { status: true, items: { select: { courseId: true } } },
      }),
    ]);
    if (!studyPlan) throw new BadRequestException('الخطة الدراسية للطالب غير موجودة. راجع الإدارة.');
    if (!academicYear || academicYear.studyPlanId !== student.studyPlanId) throw new BadRequestException('السنة الدراسية للطالب غير صحيحة. راجع الإدارة.');

    const latestResultByCourse = new Map<string, typeof results[number]>();
    for (const result of results) {
      if (!latestResultByCourse.has(result.courseId)) latestResultByCourse.set(result.courseId, result);
    }
    const enrolledCourseIds = new Set(
      enrollments
        .filter((enrollment) => ['DRAFT', 'PENDING', 'APPROVED', 'CONFIRMED'].includes(enrollment.status))
        .flatMap((enrollment) => enrollment.items.map((item) => item.courseId)),
    );

    return {
      student: { universityId: student.universityId, currentLevel: academicYear.nameAr },
      studyPlan: studyPlan.nameAr,
      courses: studyPlan.planCourses.map((planCourse) => {
        const result = latestResultByCourse.get(planCourse.courseId);
        const status = result?.passed
          ? 'PASSED'
          : enrolledCourseIds.has(planCourse.courseId)
            ? 'REGISTERED'
            : result
              ? 'FAILED'
              : planCourse.academicYear.levelNumber > academicYear.levelNumber
                ? 'FUTURE'
                : 'NOT_TAKEN';
        return {
          id: planCourse.id,
          courseId: planCourse.courseId,
          code: planCourse.course.code,
          nameAr: planCourse.course.nameAr,
          nameEn: planCourse.course.nameEn,
          credits: planCourse.course.credits,
          academicYear: planCourse.academicYear.nameAr,
          levelNumber: planCourse.academicYear.levelNumber,
          semester: planCourse.semester.nameAr,
          status,
          gradeLabel: result?.gradeLabel ?? null,
          score: result?.score === undefined ? null : Number(result.score),
          resultSemester: result?.semester.nameAr ?? null,
        };
      }),
    };
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
