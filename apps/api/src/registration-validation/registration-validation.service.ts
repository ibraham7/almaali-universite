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

  async validateSection(sectionId: string) {
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

    if (
      section.enrolledCount >=
      section.maxCapacity
    ) {
      return {
        valid: false,
        errors: ['Section is full'],
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
          'Student is not assigned to an academic year',
        ],
      };
    }

    const planCourse =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: student.studyPlanId,
          academicYearId:
            student.academicYearId,
          courseId,
          course: {
            status: 'ACTIVE',
          },
        },
        include: {
          course: true,
          academicYear: true,
        },
      });

    if (!planCourse) {
      return {
        valid: false,
        errors: [
          'Course is not available in the student study plan and academic year',
        ],
      };
    }

    return {
      valid: true,
      errors: [],
      planCourse,
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
     * يكفي أن يكون الطالب قد سجله.
     *
     * ملاحظة تنفيذية مؤقتة:
     * التسجيلات CANCELLED و DROPPED لا تُحسب حاليًا.
     * نحتاج تأكيد الإدارة لاحقًا إن كانت المادة
     * المسحوبة/الملغاة يجب أن تعتبر "مسجلة سابقًا".
     */
    const previouslyRegisteredItems =
      await this.prisma.enrollmentItem.findMany({
        where: {
          enrollment: {
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

    if (
      missingPrerequisites.length > 0
    ) {
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

    for (
      const existingItem of existingItems
    ) {
      if (
        existingItem.sectionId ===
        sectionId
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
          semesterId:
            enrollment.semesterId,
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

    if (
      !registrationPeriod?.maxCredits
    ) {
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
      currentCredits +
        course.credits >
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

    if (
      !registrationPeriod?.minCredits
    ) {
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