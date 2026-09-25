import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RegistrationValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateEnrollmentEditable(enrollmentId: string) {
    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!enrollment) {
      return {
        valid: false,
        errors: ['Enrollment not found'],
      };
    }

    if (enrollment.status !== 'DRAFT') {
      return {
        valid: false,
        errors: [
          'Enrollment can only be modified while it is in DRAFT status',
        ],
      };
    }

    return {
      valid: true,
      errors: [],
      enrollment,
    };
  }

  async validateSection(
    sectionId: string,
    semesterId?: string,
  ) {
    const section =
      await this.prisma.courseSection.findUnique({
        where: {
          id: sectionId,
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
          schedules: true,
        },
      });

    if (!section) {
      return {
        valid: false,
        errors: ['Section not found'],
      };
    }

    if (section.status !== 'OPEN') {
      return {
        valid: false,
        errors: ['Section is closed'],
      };
    }

    if (section.enrolledCount >= section.maxCapacity) {
      return {
        valid: false,
        errors: ['Section is full'],
      };
    }

    if (
      semesterId &&
      section.semesterId !== semesterId
    ) {
      return {
        valid: false,
        errors: [
          'Section does not belong to the course placement semester',
        ],
      };
    }

    return {
      valid: true,
      errors: [],
      section,
    };
  }

  async validateSectionCourse(
    sectionId: string,
    courseId: string,
  ) {
    const section =
      await this.prisma.courseSection.findUnique({
        where: {
          id: sectionId,
        },
        select: {
          id: true,
          courseId: true,
        },
      });

    if (!section) {
      return {
        valid: false,
        errors: ['Section not found'],
      };
    }

    if (section.courseId !== courseId) {
      return {
        valid: false,
        errors: [
          'Selected section does not belong to the selected course',
        ],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  async validateCourseEligibility(
    enrollmentId: string,
    courseId: string,
    sectionId?: string,
  ) {
    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        include: {
          student: true,
        },
      });

    if (!enrollment) {
      return {
        valid: false,
        errors: ['Enrollment not found'],
      };
    }

    const student = enrollment.student;

    if (!student.studyPlanId) {
      return {
        valid: false,
        errors: [
          'Student is not assigned to a study plan',
        ],
      };
    }

    if (!student.academicYearId) {
      return {
        valid: false,
        errors: [
          'Student is not assigned to an academic level',
        ],
      };
    }

    const [currentLevel, studyPlan, selectedSection] =
      await Promise.all([
        this.prisma.academicYear.findUnique({
          where: {
            id: student.academicYearId,
          },
          select: {
            id: true,
            studyPlanId: true,
            levelNumber: true,
          },
        }),

        this.prisma.studyPlan.findUnique({
          where: {
            id: student.studyPlanId,
          },
          select: {
            id: true,
            program: {
              select: {
                department: {
                  select: {
                    college: {
                      select: {
                        university: {
                          select: {
                            minGpaForFutureYears: true,
                            allowedFutureYears: true,
                            requiredElectiveCredits: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),

        sectionId
          ? this.prisma.courseSection.findUnique({
              where: {
                id: sectionId,
              },
              select: {
                id: true,
                courseId: true,
                semesterId: true,
              },
            })
          : Promise.resolve(null),
      ]);

    if (
      !currentLevel ||
      currentLevel.studyPlanId !== student.studyPlanId
    ) {
      return {
        valid: false,
        errors: [
          'Student academic level does not belong to the assigned study plan',
        ],
      };
    }

    if (!studyPlan) {
      return {
        valid: false,
        errors: ['Study plan not found'],
      };
    }

    if (sectionId && !selectedSection) {
      return {
        valid: false,
        errors: ['Section not found'],
      };
    }

    if (
      selectedSection &&
      selectedSection.courseId !== courseId
    ) {
      return {
        valid: false,
        errors: [
          'Selected section does not belong to the selected course',
        ],
      };
    }

    const settings =
      studyPlan.program.department.college.university;

    const maxAllowedLevelNumber =
      currentLevel.levelNumber +
      settings.allowedFutureYears;

    /*
     * القاعدة المعتمدة:
     * - المقرر يجب أن يكون ضمن خطة الطالب.
     * - المستوى الحالي مسموح.
     * - يمكن السماح بمستويات لاحقة حسب allowedFutureYears.
     * - priority للترتيب فقط ولا يمثل prerequisite.
     *
     * لا نطبق minGpaForFutureYears هنا حتى يوجد GPA محسوب فعليًا
     * من نتائج المقررات. لا نعتمد قيمة GPA يدوية أو وهمية.
     */
    const eligiblePlanCourses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId: student.studyPlanId,
          courseId,
          ...(selectedSection
            ? {
                semesterId: selectedSection.semesterId,
              }
            : {}),
          academicYear: {
            levelNumber: {
              gte: currentLevel.levelNumber,
              lte: maxAllowedLevelNumber,
            },
          },
          course: {
            status: 'ACTIVE',
          },
        },
        include: {
          course: true,
          academicYear: true,
          semester: true,
        },
      });

    if (eligiblePlanCourses.length === 0) {
      return {
        valid: false,
        errors: [
          'Course is not available within the allowed study-plan levels',
        ],
      };
    }

    eligiblePlanCourses.sort(
      (a, b) =>
        a.academicYear.levelNumber -
          b.academicYear.levelNumber ||
        a.semester.semesterNumber -
          b.semester.semesterNumber ||
        a.priority - b.priority,
    );

    const planCourse = eligiblePlanCourses[0];

    return {
      valid: true,
      errors: [],
      planCourse,
      currentLevelNumber: currentLevel.levelNumber,
      maxAllowedLevelNumber,
      universitySettings: {
        minGpaForFutureYears: Number(
          settings.minGpaForFutureYears,
        ),
        allowedFutureYears:
          settings.allowedFutureYears,
        requiredElectiveCredits:
          settings.requiredElectiveCredits,
      },
    };
  }

  async validatePrerequisites(
    enrollmentId: string,
    courseId: string,
  ) {
    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        select: {
          id: true,
          studentId: true,
        },
      });

    if (!enrollment) {
      return {
        valid: false,
        errors: ['Enrollment not found'],
      };
    }

    const prerequisites =
      await this.prisma.coursePrerequisite.findMany({
        where: {
          courseId,
        },
        include: {
          prerequisite: true,
        },
      });

    if (prerequisites.length === 0) {
      return {
        valid: true,
        errors: [],
      };
    }

    /*
     * القاعدة المؤكدة من إدارة الجامعة:
     * لا يشترط النجاح في المتطلب السابق.
     * يكفي أن يكون الطالب قد سجله في تسجيل سابق.
     *
     * التسجيل الحالي لا يُحسب "سابقًا".
     *
     * قرار مؤقت محفوظ من المنطق السابق:
     * CANCELLED و DROPPED لا تُحسب حتى يتم تأكيد الإدارة.
     */
    const previouslyRegisteredItems =
      await this.prisma.enrollmentItem.findMany({
        where: {
          enrollment: {
            id: {
              not: enrollmentId,
            },
            studentId: enrollment.studentId,
            status: {
              notIn: [
                'CANCELLED',
                'DROPPED',
              ],
            },
          },
        },
        select: {
          courseId: true,
        },
      });

    const registeredCourseIds = new Set(
      previouslyRegisteredItems.map(
        (item) => item.courseId,
      ),
    );

    const missingPrerequisites =
      prerequisites
        .filter(
          (item) =>
            !registeredCourseIds.has(
              item.prerequisiteId,
            ),
        )
        .map(
          (item) =>
            item.prerequisite.code,
        );

    if (missingPrerequisites.length > 0) {
      return {
        valid: false,
        errors: [
          `Missing prerequisites: ${missingPrerequisites.join(', ')}`,
        ],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  async validateMandatoryCourses(
    enrollmentId: string,
  ) {
    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        include: {
          student: true,
          items: {
            select: {
              courseId: true,
            },
          },
        },
      });

    if (!enrollment) {
      return {
        valid: false,
        errors: ['Enrollment not found'],
      };
    }

    const semester =
      await this.prisma.semester.findUnique({
        where: {
          id: enrollment.semesterId,
        },
        select: {
          id: true,
          requireMandatoryCourses: true,
        },
      });

    if (!semester) {
      return {
        valid: false,
        errors: ['Semester not found'],
      };
    }

    if (!semester.requireMandatoryCourses) {
      return {
        valid: true,
        errors: [],
      };
    }

    if (!enrollment.student.studyPlanId) {
      return {
        valid: false,
        errors: [
          'Student is not assigned to a study plan',
        ],
      };
    }

    if (!enrollment.student.academicYearId) {
      return {
        valid: false,
        errors: [
          'Student is not assigned to an academic level',
        ],
      };
    }

    const mandatoryPlanCourses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId:
            enrollment.student.studyPlanId,
          academicYearId:
            enrollment.student.academicYearId,
          semesterId:
            enrollment.semesterId,
          requirement: 'MANDATORY',
          course: {
            status: 'ACTIVE',
          },
        },
        include: {
          course: true,
        },
        orderBy: {
          priority: 'asc',
        },
      });

    if (mandatoryPlanCourses.length === 0) {
      return {
        valid: true,
        errors: [],
      };
    }

    const registeredCourseIds = new Set(
      enrollment.items.map(
        (item) => item.courseId,
      ),
    );

    const missingMandatoryCourses =
      mandatoryPlanCourses.filter(
        (planCourse) =>
          !registeredCourseIds.has(
            planCourse.courseId,
          ),
      );

    if (missingMandatoryCourses.length > 0) {
      return {
        valid: false,
        errors: [
          `Mandatory courses are required for this semester: ${missingMandatoryCourses
            .map(
              (item) =>
                item.course.code,
            )
            .join(', ')}`,
        ],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  async validateTimeConflict(
    enrollmentId: string,
    sectionId: string,
  ) {
    const newSection =
      await this.prisma.courseSection.findUnique({
        where: {
          id: sectionId,
        },
        include: {
          schedules: true,
        },
      });

    if (!newSection) {
      return {
        valid: false,
        errors: ['Section not found'],
      };
    }

    const existingItems =
      await this.prisma.enrollmentItem.findMany({
        where: {
          enrollmentId,
        },
        include: {
          section: {
            include: {
              schedules: true,
            },
          },
        },
      });

    for (const existingItem of existingItems) {
      if (
        existingItem.sectionId === sectionId
      ) {
        continue;
      }

      for (
        const newSchedule of
          newSection.schedules
      ) {
        for (
          const existingSchedule of
            existingItem.section.schedules
        ) {
          if (
            newSchedule.day ===
              existingSchedule.day &&
            newSchedule.startTime <
              existingSchedule.endTime &&
            newSchedule.endTime >
              existingSchedule.startTime
          ) {
            return {
              valid: false,
              errors: [
                'Schedule conflict detected',
              ],
            };
          }
        }
      }
    }

    return {
      valid: true,
      errors: [],
    };
  }

  async validateRegistrationPeriod(
    enrollmentId: string,
  ) {
    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        select: {
          id: true,
          semesterId: true,
        },
      });

    if (!enrollment) {
      return {
        valid: false,
        errors: ['Enrollment not found'],
      };
    }

    const now = new Date();

    const registrationPeriod =
      await this.prisma.registrationPeriod.findFirst({
        where: {
          semesterId: enrollment.semesterId,
          startDateTime: {
            lte: now,
          },
          endDateTime: {
            gte: now,
          },
        },
        orderBy: {
          startDateTime: 'desc',
        },
      });

    if (!registrationPeriod) {
      return {
        valid: false,
        errors: [
          'Registration period is closed',
        ],
      };
    }

    return {
      valid: true,
      errors: [],
      registrationPeriod,
    };
  }

  async validateMaxCredits(
    enrollmentId: string,
    courseId: string,
  ) {
    const periodValidation =
      await this.validateRegistrationPeriod(
        enrollmentId,
      );

    if (!periodValidation.valid) {
      return {
        valid: false,
        errors: periodValidation.errors,
      };
    }

    const registrationPeriod =
      periodValidation.registrationPeriod;

    if (!registrationPeriod?.maxCredits) {
      return {
        valid: true,
        errors: [],
      };
    }

    const course =
      await this.prisma.course.findUnique({
        where: {
          id: courseId,
        },
      });

    if (!course) {
      return {
        valid: false,
        errors: ['Course not found'],
      };
    }

    const registeredItems =
      await this.prisma.enrollmentItem.findMany({
        where: {
          enrollmentId,
        },
        include: {
          course: true,
        },
      });

    const currentCredits =
      registeredItems.reduce(
        (total, item) =>
          total + item.course.credits,
        0,
      );

    if (
      currentCredits + course.credits >
      registrationPeriod.maxCredits
    ) {
      return {
        valid: false,
        errors: [
          'Maximum credit limit exceeded',
        ],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  async validateMinCredits(
    enrollmentId: string,
  ) {
    const periodValidation =
      await this.validateRegistrationPeriod(
        enrollmentId,
      );

    if (!periodValidation.valid) {
      return {
        valid: false,
        errors: periodValidation.errors,
      };
    }

    const registrationPeriod =
      periodValidation.registrationPeriod;

    if (!registrationPeriod?.minCredits) {
      return {
        valid: true,
        errors: [],
      };
    }

    const registeredItems =
      await this.prisma.enrollmentItem.findMany({
        where: {
          enrollmentId,
        },
        include: {
          course: true,
        },
      });

    const currentCredits =
      registeredItems.reduce(
        (total, item) =>
          total + item.course.credits,
        0,
      );

    if (
      currentCredits <
      registrationPeriod.minCredits
    ) {
      return {
        valid: false,
        errors: [
          `Minimum credit limit not reached. Required: ${registrationPeriod.minCredits}`,
        ],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }
}
