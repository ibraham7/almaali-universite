import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto.js';
import { AddEnrollmentItemDto } from './dto/add-enrollment-item.dto.js';
import { RegistrationValidationService } from '../registration-validation/registration-validation.service.js';
import { DropEnrollmentItemDto } from './dto/drop-enrollment-item.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class StudentEnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: RegistrationValidationService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(dto: CreateStudentEnrollmentDto) {
    return this.prisma.studentEnrollment.create({
      data: {
        studentId: dto.studentId,
        semesterId: dto.semesterId,
      },
      include: {
        items: {
          include: {
            course: true,
            section: true,
          },
        },
        approvals: true,
      },
    });
  }

  async addItem(dto: AddEnrollmentItemDto) {
    // 1. التحقق من فترة التسجيل
    const periodValidation =
      await this.validation.validateRegistrationPeriod(
        dto.enrollmentId,
      );

    if (!periodValidation.valid) {
      return {
        success: false,
        errors: periodValidation.errors,
      };
    }

    // 2. التحقق من الشعبة وحالتها وسعتها
    const sectionValidation =
      await this.validation.validateSection(
        dto.sectionId,
      );

    if (!sectionValidation.valid) {
      return {
        success: false,
        errors: sectionValidation.errors,
      };
    }

    // 3. التأكد أن الشعبة تابعة للمقرر المرسل
    const sectionCourseValidation =
      await this.validation.validateSectionCourse(
        dto.sectionId,
        dto.courseId,
      );

    if (!sectionCourseValidation.valid) {
      return {
        success: false,
        errors: sectionCourseValidation.errors,
      };
    }

    // 4. التأكد أن المقرر مسموح للطالب
    // ضمن خطته الدراسية وسنته الأكاديمية الحالية
    const eligibilityValidation =
      await this.validation.validateCourseEligibility(
        dto.enrollmentId,
        dto.courseId,
      );

    if (!eligibilityValidation.valid) {
      return {
        success: false,
        errors: eligibilityValidation.errors,
      };
    }

    // 5. منع تسجيل نفس المقرر مرتين
    const existingItem =
      await this.prisma.enrollmentItem.findFirst({
        where: {
          enrollmentId: dto.enrollmentId,
          courseId: dto.courseId,
        },
      });

    if (existingItem) {
      return {
        success: false,
        errors: ['Course is already registered'],
      };
    }

    // 6. التحقق من المتطلبات السابقة
    const prerequisiteValidation =
      await this.validation.validatePrerequisites(
        dto.enrollmentId,
        dto.courseId,
      );

    if (!prerequisiteValidation.valid) {
      return {
        success: false,
        errors: prerequisiteValidation.errors,
      };
    }

    // 7. التحقق من تعارض الأوقات
    const timeConflictValidation =
      await this.validation.validateTimeConflict(
        dto.enrollmentId,
        dto.sectionId,
      );

    if (!timeConflictValidation.valid) {
      return {
        success: false,
        errors: timeConflictValidation.errors,
      };
    }

    // 8. التحقق من الحد الأقصى للساعات
    const maxCreditsValidation =
      await this.validation.validateMaxCredits(
        dto.enrollmentId,
        dto.courseId,
      );

    if (!maxCreditsValidation.valid) {
      return {
        success: false,
        errors: maxCreditsValidation.errors,
      };
    }

    // 9. إضافة المقرر والشعبة
    const enrollmentItem =
      await this.prisma.enrollmentItem.create({
        data: {
          enrollmentId: dto.enrollmentId,
          courseId: dto.courseId,
          sectionId: dto.sectionId,
        },
        include: {
          course: true,
          section: {
            include: {
              schedules: true,
            },
          },
        },
      });

    // 10. زيادة عدد المسجلين في الشعبة
    await this.prisma.courseSection.update({
      where: {
        id: dto.sectionId,
      },
      data: {
        enrolledCount: {
          increment: 1,
        },
      },
    });

    // 11. Audit Log
    await this.auditLogs.create({
      action: 'ADD_COURSE',
      entity: 'EnrollmentItem',
      entityId: enrollmentItem.id,
      details: JSON.stringify({
        enrollmentId: dto.enrollmentId,
        courseId: dto.courseId,
        sectionId: dto.sectionId,
      }),
    });

    return enrollmentItem;
  }

  async confirm(enrollmentId: string) {
    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        include: {
          student: true,
          items: {
            include: {
              course: true,
            },
          },
        },
      });

    if (!enrollment) {
      return {
        success: false,
        errors: ['Enrollment not found'],
      };
    }

    // 1. إعادة التحقق من فترة التسجيل
    const periodValidation =
      await this.validation.validateRegistrationPeriod(
        enrollmentId,
      );

    if (!periodValidation.valid) {
      return {
        success: false,
        errors: periodValidation.errors,
      };
    }

    // 2. التحقق من الحد الأدنى للساعات
    const minCreditsValidation =
      await this.validation.validateMinCredits(
        enrollmentId,
      );

    if (!minCreditsValidation.valid) {
      return {
        success: false,
        errors: minCreditsValidation.errors,
      };
    }

    // 3. إعادة التحقق من جميع المقررات والشعب
    for (const item of enrollment.items) {
      const sectionValidation =
        await this.validation.validateSection(
          item.sectionId,
        );

      if (!sectionValidation.valid) {
        return {
          success: false,
          errors: sectionValidation.errors,
        };
      }

      // التأكد مرة أخرى أن الشعبة للمقرر نفسه
      const sectionCourseValidation =
        await this.validation.validateSectionCourse(
          item.sectionId,
          item.courseId,
        );

      if (!sectionCourseValidation.valid) {
        return {
          success: false,
          errors: sectionCourseValidation.errors,
        };
      }

      // إعادة التحقق من أن المادة ما زالت ضمن
      // خطة الطالب وسنته الأكاديمية
      const eligibilityValidation =
        await this.validation.validateCourseEligibility(
          enrollmentId,
          item.courseId,
        );

      if (!eligibilityValidation.valid) {
        return {
          success: false,
          errors: eligibilityValidation.errors,
        };
      }

      const prerequisiteValidation =
        await this.validation.validatePrerequisites(
          enrollmentId,
          item.courseId,
        );

      if (!prerequisiteValidation.valid) {
        return {
          success: false,
          errors: prerequisiteValidation.errors,
        };
      }

      const timeConflictValidation =
        await this.validation.validateTimeConflict(
          enrollmentId,
          item.sectionId,
        );

      if (!timeConflictValidation.valid) {
        return {
          success: false,
          errors: timeConflictValidation.errors,
        };
      }
    }

    const registrationPeriod =
      periodValidation.registrationPeriod;

    // 4. إذا كانت موافقة المرشد مطلوبة
    if (
      registrationPeriod?.advisorApprovalRequired
    ) {
      if (!enrollment.student.advisorId) {
        return {
          success: false,
          errors: ['Student advisor is not assigned'],
        };
      }

      const existingApproval =
        await this.prisma.advisorApproval.findFirst({
          where: {
            enrollmentId,
          },
        });

      if (!existingApproval) {
        await this.prisma.advisorApproval.create({
          data: {
            enrollmentId,
            advisorId:
              enrollment.student.advisorId,
            status: 'PENDING',
          },
        });
      }

      const pendingEnrollment =
        await this.prisma.studentEnrollment.update({
          where: {
            id: enrollmentId,
          },
          data: {
            status: 'PENDING',
          },
          include: {
            items: {
              include: {
                course: true,
                section: {
                  include: {
                    schedules: true,
                  },
                },
              },
            },
            approvals: true,
          },
        });

      await this.auditLogs.create({
        action: 'CONFIRM_REGISTRATION',
        entity: 'StudentEnrollment',
        entityId: enrollmentId,
        details: JSON.stringify({
          status: 'PENDING',
          advisorApprovalRequired: true,
        }),
      });

      return pendingEnrollment;
    }

    // 5. إذا لم تكن موافقة المرشد مطلوبة
    const confirmedEnrollment =
      await this.prisma.studentEnrollment.update({
        where: {
          id: enrollmentId,
        },
        data: {
          status: 'CONFIRMED',
        },
        include: {
          items: {
            include: {
              course: true,
              section: {
                include: {
                  schedules: true,
                },
              },
            },
          },
          approvals: true,
        },
      });

    await this.auditLogs.create({
      action: 'CONFIRM_REGISTRATION',
      entity: 'StudentEnrollment',
      entityId: enrollmentId,
      details: JSON.stringify({
        status: 'CONFIRMED',
        advisorApprovalRequired: false,
      }),
    });

    return confirmedEnrollment;
  }

  async dropItem(dto: DropEnrollmentItemDto) {
    const item =
      await this.prisma.enrollmentItem.findUnique({
        where: {
          id: dto.enrollmentItemId,
        },
        include: {
          enrollment: true,
        },
      });

    if (!item) {
      return {
        success: false,
        errors: ['Enrollment item not found'],
      };
    }

    const periodValidation =
      await this.validation.validateRegistrationPeriod(
        item.enrollmentId,
      );

    if (!periodValidation.valid) {
      return {
        success: false,
        errors: periodValidation.errors,
      };
    }

    if (
      !periodValidation.registrationPeriod
        ?.dropAllowed
    ) {
      return {
        success: false,
        errors: ['Dropping courses is not allowed'],
      };
    }

    const deadline =
      periodValidation.registrationPeriod
        .addDropDeadline;

    if (
      deadline &&
      new Date() > deadline
    ) {
      return {
        success: false,
        errors: ['Add/drop deadline has passed'],
      };
    }

    await this.prisma.$transaction([
      this.prisma.enrollmentItem.delete({
        where: {
          id: dto.enrollmentItemId,
        },
      }),

      this.prisma.courseSection.update({
        where: {
          id: item.sectionId,
        },
        data: {
          enrolledCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    await this.auditLogs.create({
      action: 'DROP_COURSE',
      entity: 'EnrollmentItem',
      entityId: item.id,
      details: JSON.stringify({
        enrollmentId: item.enrollmentId,
        courseId: item.courseId,
        sectionId: item.sectionId,
      }),
    });

    return {
      success: true,
      message: 'Course dropped successfully',
    };
  }

  async findAll() {
    return this.prisma.studentEnrollment.findMany({
      include: {
        student: true,
        items: {
          include: {
            course: true,
            section: true,
          },
        },
        approvals: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByStudent(studentId: string) {
    return this.prisma.studentEnrollment.findMany({
      where: {
        studentId,
      },
      include: {
        items: {
          include: {
            course: true,
            section: true,
          },
        },
        approvals: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}