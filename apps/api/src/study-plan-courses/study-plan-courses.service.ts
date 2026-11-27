import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { isProgramAllowedForAdvisor } from '../advisors/advisor-scope.js';
import { CreateStudyPlanCourseDto } from './dto/create-study-plan-course.dto.js';
import { ReorderStudyPlanCoursesDto } from './dto/reorder-study-plan-courses.dto.js';
import { RemoveStudyPlanCourseDto } from './dto/remove-study-plan-course.dto.js';
import { assertPlanEditable } from '../study-plans/plan-status.js';
import { UpdateStudyPlanCourseDto } from './dto/update-study-plan-course.dto.js';

// أولويات المقررات المُزالة تبدأ من هنا نزولاً (بعيدة عن الأولويات الحقيقية وعن السالب المؤقت لإعادة الترتيب)
const REMOVED_PRIORITY_BASE = -1_000_000;

@Injectable()
export class StudyPlanCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPlanAccess(studyPlanId: string, actor: { id: string; role: string }) {
    if (actor.role !== 'ADVISOR') return;
    const plan = await this.prisma.studyPlan.findUnique({ where: { id: studyPlanId }, select: { programId: true } });
    if (!plan) throw new NotFoundException('الخطة الدراسية غير موجودة');
    if (!(await isProgramAllowedForAdvisor(this.prisma, actor.id, plan.programId))) {
      throw new ForbiddenException('لا تملك صلاحية تعديل مقررات هذه الخطة.');
    }
  }

  async create(dto: CreateStudyPlanCourseDto, actor: { id: string; role: string }) {
    await this.assertPlanAccess(dto.studyPlanId, actor);
    await assertPlanEditable(this.prisma, dto.studyPlanId);
    // ============================================================
    // 1. التحقق من الخطة الدراسية
    // ============================================================

    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: {
        id: dto.studyPlanId,
      },
    });

    if (!studyPlan) {
      return {
        success: false,
        errors: ['Study plan not found'],
      };
    }

    // ============================================================
    // 2. التحقق من المستوى
    // AcademicYear حاليًا يمثل المستوى داخل الخطة
    // ============================================================

    const academicYear =
      await this.prisma.academicYear.findUnique({
        where: {
          id: dto.academicYearId,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        errors: ['Academic level not found'],
      };
    }

    if (academicYear.studyPlanId !== dto.studyPlanId) {
      return {
        success: false,
        errors: [
          'Academic level does not belong to the selected study plan',
        ],
      };
    }

    // ============================================================
    // 3. التحقق من الفصل
    // ============================================================

    const semester = await this.prisma.semester.findUnique({
      where: {
        id: dto.semesterId,
      },
    });

    if (!semester) {
      return {
        success: false,
        errors: ['Semester not found'],
      };
    }

    if (semester.academicYearId !== dto.academicYearId) {
      return {
        success: false,
        errors: [
          'Semester does not belong to the selected academic level',
        ],
      };
    }

    // ============================================================
    // 4. التحقق من المقرر
    // ============================================================

    const course = await this.prisma.course.findUnique({
      where: {
        id: dto.courseId,
      },
    });

    if (!course) {
      return {
        success: false,
        errors: ['Course not found'],
      };
    }

    // ============================================================
    // 5. منع تكرار المقرر داخل نفس الخطة والمستوى والفصل
    // ============================================================

    const existingCourse =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          semesterId: dto.semesterId,
          courseId: dto.courseId,
          status: 'ACTIVE',
        },
      });

    if (existingCourse) {
      return {
        success: false,
        errors: [
          'Course already exists in this study plan, academic level and semester',
        ],
      };
    }

    // ============================================================
    // 6. منع تكرار priority داخل نفس الفصل
    //
    // priority للترتيب فقط.
    // لا يعني أن المادة ذات priority 2 تعتمد على priority 1.
    // المتطلبات السابقة محفوظة بشكل مستقل في CoursePrerequisite.
    // ============================================================

    const existingPriority =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          semesterId: dto.semesterId,
          priority: dto.priority,
          status: 'ACTIVE',
        },
      });

    if (existingPriority) {
      return {
        success: false,
        errors: [
          `Priority ${dto.priority} is already used in this semester`,
        ],
      };
    }

    // ============================================================
    // 7. إنشاء مقرر الخطة
    // ============================================================

    // لو كان المقرر نفسه أُزيل سابقاً من هذا الفصل نستعيد صفّه (التفرّد بالقاعدة على المقرر والفصل)
    const removedBefore =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          semesterId: dto.semesterId,
          courseId: dto.courseId,
          status: 'REMOVED',
        },
        select: { id: true },
      });

    const include = {
      course: true,
      academicYear: true,
      semester: true,
      studyPlan: true,
    };

    const planCourse = removedBefore
      ? await this.prisma.studyPlanCourse.update({
          where: { id: removedBefore.id },
          data: {
            status: 'ACTIVE',
            priority: dto.priority,
            requirement: dto.requirement,
            category: dto.category ?? null,
            creditsInPlan: dto.creditsInPlan ?? null,
            removedAt: null,
            removedById: null,
            removeReason: null,
          },
          include,
        })
      : await this.prisma.studyPlanCourse.create({
          data: {
            studyPlanId: dto.studyPlanId,
            academicYearId: dto.academicYearId,
            semesterId: dto.semesterId,
            courseId: dto.courseId,
            priority: dto.priority,
            requirement: dto.requirement,
            category: dto.category ?? null,
            creditsInPlan: dto.creditsInPlan ?? null,
          },
          include,
        });

    if (dto.prerequisiteCourseIds !== undefined) {
      await this.setPlanPrerequisites(planCourse.id, dto.prerequisiteCourseIds);
    }

    return {
      success: true,
      planCourse,
    };
  }

  // المتطلبات السابقة داخل الخطة: مقررات من الخطة نفسها وفي فصل أبكر. الاستبدال بتعطيل القديم لا بحذفه.
  private async setPlanPrerequisites(planCourseId: string, courseIds: string[]) {
    const target = await this.prisma.studyPlanCourse.findUnique({
      where: { id: planCourseId },
      select: { id: true, studyPlanId: true, courseId: true, academicYear: { select: { levelNumber: true } }, semester: { select: { semesterNumber: true } } },
    });
    if (!target) throw new NotFoundException('مقرر الخطة غير موجود');
    const unique = [...new Set(courseIds)];
    if (unique.includes(target.courseId)) throw new BadRequestException('لا يمكن أن يكون المقرر متطلبًا سابقًا لنفسه.');
    const inPlan = unique.length
      ? await this.prisma.studyPlanCourse.findMany({
          where: { studyPlanId: target.studyPlanId, courseId: { in: unique }, status: 'ACTIVE' },
          select: { courseId: true, course: { select: { code: true, nameAr: true } }, academicYear: { select: { levelNumber: true } }, semester: { select: { semesterNumber: true } } },
        })
      : [];
    for (const id of unique) {
      const found = inPlan.find((item) => item.courseId === id);
      if (!found) throw new BadRequestException('المتطلب السابق يجب أن يكون مقررًا مضافًا إلى هذه الخطة.');
      const earlier = found.academicYear.levelNumber < target.academicYear.levelNumber
        || (found.academicYear.levelNumber === target.academicYear.levelNumber && found.semester.semesterNumber < target.semester.semesterNumber);
      if (!earlier) throw new BadRequestException(`المتطلب السابق «${found.course.nameAr}» يجب أن يكون في فصل أبكر من المقرر.`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.studyPlanCourse.update({ where: { id: planCourseId }, data: { ownPrerequisites: true } });
      await tx.studyPlanCoursePrerequisite.updateMany({ where: { planCourseId, prerequisiteCourseId: { notIn: unique } }, data: { isActive: false } });
      for (const prerequisiteCourseId of unique) {
        await tx.studyPlanCoursePrerequisite.upsert({
          where: { planCourseId_prerequisiteCourseId: { planCourseId, prerequisiteCourseId } },
          update: { isActive: true },
          create: { planCourseId, prerequisiteCourseId },
        });
      }
    });
  }

  // تعديل خصائص المقرر داخل مسودة الخطة (نوع المتطلب، إجباري/اختياري، الساعات، المتطلبات السابقة).
  async update(id: string, dto: UpdateStudyPlanCourseDto, actor: { id: string; role: string }) {
    const planCourse = await this.prisma.studyPlanCourse.findUnique({ where: { id }, select: { id: true, studyPlanId: true, status: true } });
    if (!planCourse || planCourse.status !== 'ACTIVE') throw new NotFoundException('مقرر الخطة غير موجود');
    await this.assertPlanAccess(planCourse.studyPlanId, actor);
    await assertPlanEditable(this.prisma, planCourse.studyPlanId);
    const data: Record<string, unknown> = {};
    if (dto.requirement !== undefined) data.requirement = dto.requirement;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.creditsInPlan !== undefined) data.creditsInPlan = dto.creditsInPlan;
    if (Object.keys(data).length) await this.prisma.studyPlanCourse.update({ where: { id }, data });
    if (dto.prerequisiteCourseIds !== undefined) await this.setPlanPrerequisites(id, dto.prerequisiteCourseIds);
    return this.prisma.studyPlanCourse.findUnique({ where: { id }, include: { course: true, prerequisites: { where: { isActive: true }, include: { prerequisite: true } } } });
  }

  // ============================================================
  // إزالة مقرر من الخطة (بدون حذف نهائي): الحالة REMOVED مع السبب ومن وكم.
  // المقرر نفسه وتسجيلات الطلاب السابقة ونتائجهم لا تتأثر.
  // ============================================================

  async remove(id: string, dto: RemoveStudyPlanCourseDto, actor: { id: string; role: string }) {
    const planCourse = await this.prisma.studyPlanCourse.findUnique({
      where: { id },
      select: { id: true, status: true, studyPlanId: true, academicYearId: true, semesterId: true, courseId: true, priority: true, course: { select: { code: true, nameAr: true } } },
    });
    if (!planCourse) throw new NotFoundException('مقرر الخطة غير موجود');
    await this.assertPlanAccess(planCourse.studyPlanId, actor);
    await assertPlanEditable(this.prisma, planCourse.studyPlanId);
    if (planCourse.status !== 'ACTIVE') {
      throw new ConflictException('هذا المقرر أُزيل من الخطة سابقاً.');
    }
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('سبب الإزالة مطلوب.');

    await this.prisma.$transaction(async (tx) => {
      // الأولوية فريدة داخل الفصل: ننقل أولوية المُزال لقيمة سالبة بعيدة (الأصلية محفوظة بسجل التدقيق)
      // حتى تُستعمل أولويته لمقرر آخر. السالب القريب (-1..-n) محجوز لإعادة الترتيب المؤقتة.
      const lowest = await tx.studyPlanCourse.aggregate({
        where: { studyPlanId: planCourse.studyPlanId, academicYearId: planCourse.academicYearId, semesterId: planCourse.semesterId },
        _min: { priority: true },
      });
      const removedPriority = Math.min(lowest._min.priority ?? 0, REMOVED_PRIORITY_BASE) - 1;
      await tx.studyPlanCourse.update({
        where: { id },
        data: { status: 'REMOVED', priority: removedPriority, removedAt: new Date(), removedById: actor.id, removeReason: reason },
      });
      await tx.auditLog.create({
        data: {
          action: 'STUDY_PLAN_COURSE_REMOVED',
          entity: 'StudyPlanCourse',
          entityId: id,
          userId: actor.id,
          details: JSON.stringify({
            studyPlanId: planCourse.studyPlanId, academicYearId: planCourse.academicYearId, semesterId: planCourse.semesterId,
            courseId: planCourse.courseId, courseCode: planCourse.course.code, priority: planCourse.priority, reason,
          }),
        },
      });
    });

    return { success: true, message: `أُزيل المقرر «${planCourse.course.nameAr}» من الخطة.` };
  }

  // ============================================================
  // مقررات الخطة حسب المستوى
  //
  // أبقينا هذه الدالة للتوافق مع الكود الحالي.
  // تعيد جميع فصول المستوى مرتبة حسب الفصل ثم priority.
  // ============================================================

  async findByPlanAndYear(
    studyPlanId: string,
    academicYearId: string,
    actor: { id: string; role: string },
  ) {
    await this.assertPlanAccess(studyPlanId, actor);
    const courses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId,
          academicYearId,
          status: 'ACTIVE',
        },

        include: {
          course: {
            include: {
              prerequisites: {
                include: {
                  prerequisite: true,
                },
              },
            },
          },

          academicYear: true,
          semester: true,
        },

        orderBy: [
          {
            semester: {
              semesterNumber: 'asc',
            },
          },
          {
            priority: 'asc',
          },
        ],
      });

    return {
      success: true,
      count: courses.length,
      courses,
    };
  }

  // ============================================================
  // مقررات الخطة حسب المستوى والفصل
  // ============================================================

  async findByPlanYearAndSemester(
    studyPlanId: string,
    academicYearId: string,
    semesterId: string,
    actor: { id: string; role: string },
  ) {
    await this.assertPlanAccess(studyPlanId, actor);
    const semester = await this.prisma.semester.findUnique({
      where: {
        id: semesterId,
      },
    });

    if (!semester) {
      return {
        success: false,
        errors: ['Semester not found'],
      };
    }

    if (semester.academicYearId !== academicYearId) {
      return {
        success: false,
        errors: [
          'Semester does not belong to the selected academic level',
        ],
      };
    }

    const courses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId,
          academicYearId,
          semesterId,
          status: 'ACTIVE',
        },

        include: {
          course: {
            include: {
              prerequisites: {
                include: {
                  prerequisite: true,
                },
              },
            },
          },

          academicYear: true,
          semester: true,
        },

        orderBy: {
          priority: 'asc',
        },
      });

    return {
      success: true,
      count: courses.length,
      courses,
    };
  }

  // ============================================================
  // إعادة ترتيب مقررات المستوى
  //
  // DTO الحالي لا يحتوي semesterId بعد.
  // لذلك نحدد الفصل من المقررات نفسها ونمنع إعادة ترتيب
  // مقررات من أكثر من فصل في نفس العملية.
  // ============================================================

  async reorder(dto: ReorderStudyPlanCoursesDto, actor: { id: string; role: string }) {
    await this.assertPlanAccess(dto.studyPlanId, actor);
    await assertPlanEditable(this.prisma, dto.studyPlanId);
    const academicYear =
      await this.prisma.academicYear.findUnique({
        where: {
          id: dto.academicYearId,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        errors: ['Academic level not found'],
      };
    }

    if (academicYear.studyPlanId !== dto.studyPlanId) {
      return {
        success: false,
        errors: [
          'Academic level does not belong to the selected study plan',
        ],
      };
    }

    if (!dto.items || dto.items.length === 0) {
      return {
        success: false,
        errors: ['No courses provided for reordering'],
      };
    }

    const ids = dto.items.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      return {
        success: false,
        errors: ['Duplicate course IDs are not allowed'],
      };
    }

    const priorities = dto.items.map(
      (item) => item.priority,
    );

    if (
      priorities.some(
        (priority) =>
          !Number.isInteger(priority) || priority < 1,
      )
    ) {
      return {
        success: false,
        errors: [
          'Priority must be a positive integer',
        ],
      };
    }

    if (
      new Set(priorities).size !== priorities.length
    ) {
      return {
        success: false,
        errors: ['Duplicate priorities are not allowed'],
      };
    }

    const planCourses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          id: {
            in: ids,
          },

          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          status: 'ACTIVE',
        },

        select: {
          id: true,
          semesterId: true,
        },
      });

    if (planCourses.length !== dto.items.length) {
      return {
        success: false,
        errors: [
          'One or more courses do not belong to this study plan and academic level',
        ],
      };
    }

    // جميع المواد التي يعاد ترتيبها يجب أن تكون من نفس الفصل.
    const semesterIds = new Set(
      planCourses.map(
        (planCourse) => planCourse.semesterId,
      ),
    );

    if (semesterIds.size !== 1) {
      return {
        success: false,
        errors: [
          'Courses from different semesters cannot be reordered together',
        ],
      };
    }

    const semesterId = planCourses[0].semesterId;

    /*
     * لدينا unique constraint على:
     *
     * studyPlanId
     * academicYearId
     * semesterId
     * priority
     *
     * لذلك لا نستطيع تبديل:
     *
     * 1 -> 2
     * 2 -> 1
     *
     * مباشرة.
     *
     * ننقل القيم أولاً إلى نطاق سالب مؤقت،
     * ثم نضع القيم النهائية.
     */

    await this.prisma.$transaction(async (tx) => {
      for (
        let index = 0;
        index < dto.items.length;
        index++
      ) {
        const item = dto.items[index];

        await tx.studyPlanCourse.update({
          where: {
            id: item.id,
          },

          data: {
            priority: -(index + 1),
          },
        });
      }

      for (const item of dto.items) {
        await tx.studyPlanCourse.update({
          where: {
            id: item.id,
          },

          data: {
            priority: item.priority,
          },
        });
      }
    });

    return this.findByPlanYearAndSemester(
      dto.studyPlanId,
      dto.academicYearId,
      semesterId,
      actor,
    );
  }

}
