import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { ApproveRegistrationDto, StudentInputDto, TransferCollegeDto } from './dto/student-input.dto.js';
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
      const program = await this.prisma.program.findUnique({ where: { id: programId }, select: { departmentId: true, collegeId: true } });
      if (departmentId) {
        if (program?.departmentId !== departmentId) invalid();
      } else if (!collegeId || program?.collegeId !== collegeId || program.departmentId) {
        invalid();
      }
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
    const required = ['universityId', 'firstName', 'middleName', 'motherName', 'applicationNumber'] as const;
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
      familyName: data.familyName?.trim() ? normalizeText(data.familyName) : '',
      meritNumber: data.meritNumber?.trim() || null,
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

  // اعتماد التسجيل: يربط الطلاب الذين بلا خطة بالكلية والقسم والبرنامج والخطة والمستوى والفصل.
  // من لديه خطة مسبقاً يُتخطى (يعدَّل من نموذج الطالب)، ويُرجَع سبب كل تخطٍّ.
  async approveRegistration(dto: ApproveRegistrationDto, actingUserId: string) {
    await this.validateStructure(dto as unknown as StudentInputDto);
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds } },
      select: { id: true, universityId: true, studyPlanId: true },
    });
    const found = new Map(students.map((student) => [student.id, student]));
    const skipped: Array<{ studentId: string; universityId: string; reason: string }> = [];
    const approvable: string[] = [];
    for (const id of dto.studentIds) {
      const student = found.get(id);
      if (!student) skipped.push({ studentId: id, universityId: '', reason: 'الطالب غير موجود' });
      else if (student.studyPlanId) skipped.push({ studentId: id, universityId: student.universityId, reason: 'مرتبط بخطة دراسية مسبقاً' });
      else approvable.push(id);
    }
    if (approvable.length) {
      await this.prisma.$transaction(async (tx) => {
        await tx.student.updateMany({
          where: { id: { in: approvable }, studyPlanId: null },
          data: {
            collegeId: dto.collegeId, departmentId: dto.departmentId, programId: dto.programId,
            studyPlanId: dto.studyPlanId, academicYearId: dto.academicYearId, semesterId: dto.semesterId,
          },
        });
        await tx.auditLog.create({ data: {
          action: 'STUDENTS_REGISTRATION_APPROVED', entity: 'Student', userId: actingUserId,
          details: JSON.stringify({
            count: approvable.length, studentIds: approvable,
            collegeId: dto.collegeId, departmentId: dto.departmentId, programId: dto.programId,
            studyPlanId: dto.studyPlanId, academicYearId: dto.academicYearId, semesterId: dto.semesterId,
          }),
        } });
      });
    }
    return { approved: approvable.length, skipped };
  }

  // نقل طالب إلى كلية أخرى: يتغير رمز الكلية في رقمه الجامعي (السنة الأصلية تبقى) ويبقى الرقم القديم بالسجل.
  // سجلات الطالب (تسجيلات، نتائج، عمليات) مرتبطة بمعرّفه الداخلي فلا تتأثر. خطته تُفكّ (تابعة للكلية القديمة)
  // فيعود «بانتظار اعتماد التسجيل» ويُربط بخطة الكلية الجديدة. تسجيل الدخول يتبع الرقم الجديد.
  async transferCollege(id: string, dto: TransferCollegeDto, actingUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, universityId: true, collegeId: true, advisorId: true, userId: true, createdAt: true },
    });
    if (!student) throw new NotFoundException('الطالب غير موجود.');
    if (student.collegeId === dto.collegeId) throw new BadRequestException('الطالب مسجل في هذه الكلية أصلاً.');
    const college = await this.prisma.college.findUnique({ where: { id: dto.collegeId }, select: { id: true, nameAr: true, code: true } });
    if (!college) throw new NotFoundException('الكلية المحددة غير موجودة.');
    if (!college.code) throw new BadRequestException(`كلية «${college.nameAr}» ليس لها رمز. أضف رمز الكلية من شاشة الهيكل الأكاديمي أولاً.`);
    const open = await this.prisma.studentEnrollment.count({ where: { studentId: id, status: { in: ['DRAFT', 'PENDING', 'APPROVED'] } } });
    if (open > 0) throw new ConflictException('لدى الطالب تسجيل غير منتهٍ (مسودة أو قيد الموافقة أو معتمد). أنهِه أو ألغِه قبل النقل.');

    const match = /^(\d{2})\d{2}\d{3}$/.exec(student.universityId);
    const year = match ? match[1] : dto.admissionYear ? String(dto.admissionYear).slice(-2) : null;
    if (!year) throw new BadRequestException('رقم الطالب الحالي لا يتبع صيغة (سنة + كلية + تسلسل). أدخل سنة القبول لتوليد الرقم الجديد.');
    const prefix = `${year}${college.code}`;
    const [current, past] = await Promise.all([
      this.prisma.student.findMany({ where: { universityId: { startsWith: prefix } }, select: { universityId: true } }),
      this.prisma.studentNumberHistory.findMany({ where: { universityId: { startsWith: prefix } }, select: { universityId: true } }),
    ]);
    let last = 0;
    for (const item of [...current, ...past]) {
      if (item.universityId.length !== prefix.length + 3) continue;
      const suffix = Number(item.universityId.slice(prefix.length));
      if (Number.isInteger(suffix) && suffix > last) last = suffix;
    }
    if (last >= 999) throw new ConflictException('تجاوز التسلسل 999 لهذه الكلية والسنة.');
    const newNumber = `${prefix}${String(last + 1).padStart(3, '0')}`;

    const previous = await this.prisma.studentNumberHistory.findFirst({ where: { studentId: id }, orderBy: { validTo: 'desc' }, select: { validTo: true } });
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.studentNumberHistory.create({ data: {
          studentId: id, universityId: student.universityId, collegeId: student.collegeId,
          replacedByUniversityId: newNumber, reason: dto.reason?.trim() || null, changedById: actingUserId,
          validFrom: previous?.validTo ?? student.createdAt,
        } });
        await tx.student.update({ where: { id }, data: {
          universityId: newNumber, collegeId: dto.collegeId,
          departmentId: null, programId: null, studyPlanId: null, academicYearId: null, semesterId: null, advisorId: null,
        } });
        if (student.userId) {
          const account = await tx.user.findUnique({ where: { id: student.userId }, select: { email: true } });
          if (account?.email === `${student.universityId}@students.local`) {
            await tx.user.update({ where: { id: student.userId }, data: { email: `${newNumber}@students.local` } });
          }
        }
        await tx.auditLog.create({ data: {
          action: 'STUDENT_COLLEGE_TRANSFER', entity: 'Student', entityId: id, userId: actingUserId,
          details: JSON.stringify({
            oldUniversityId: student.universityId, newUniversityId: newNumber,
            fromCollegeId: student.collegeId, toCollegeId: dto.collegeId, previousAdvisorId: student.advisorId, reason: dto.reason?.trim() || null,
          }),
        } });
      });
    } catch (error) { return this.rethrowDuplicate(error); }
    return { universityId: newNumber, previousUniversityId: student.universityId, college: college.nameAr };
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
        select: { status: true, items: { where: { status: 'ACTIVE' }, select: { courseId: true } } },
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
                // الأرقام الجامعية السابقة (بعد النقل بين الكليات)
                {
                  numberHistory: {
                    some: { universityId: { contains: search, mode: 'insensitive' } },
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
        numberHistory: { select: { universityId: true, validTo: true } },
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
          numberHistory: { orderBy: { validTo: 'desc' } },
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
                where: { status: 'ACTIVE' },
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
