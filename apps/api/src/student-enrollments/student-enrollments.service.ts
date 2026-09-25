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
  ) { }

  private async getStudentByUserId(userId: string) {
    return this.prisma.student.findFirst({
      where: {
        userId,
      },
    });
  }

  private async getOwnedEnrollment(
    userId: string,
    enrollmentId: string,
  ) {
    return this.prisma.studentEnrollment.findFirst({
      where: {
        id: enrollmentId,
        student: {
          userId,
        },
      },
      include: {
        student: true,
      },
    });
  }

  async getMyRegistration(userId: string) {
    const student = await this.getStudentByUserId(userId);

    if (!student) {
      return {
        success: false,
        errors: ['Student record not found'],
      };
    }

    if (!student.studyPlanId) {
      return {
        success: false,
        errors: ['Student is not assigned to a study plan'],
      };
    }

    if (!student.academicYearId) {
      return {
        success: false,
        errors: ['Student is not assigned to an academic level'],
      };
    }

    if (!student.semesterId) {
      return {
        success: false,
        errors: ['Student is not assigned to a semester'],
      };
    }

    const [
      studyPlan,
      academicYear,
      semester,
      registrationPeriod,
      enrollment,
    ] = await Promise.all([
      this.prisma.studyPlan.findUnique({
        where: {
          id: student.studyPlanId,
        },
        include: {
          program: {
            include: {
              department: {
                include: {
                  college: {
                    include: {
                      university: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      this.prisma.academicYear.findUnique({
        where: {
          id: student.academicYearId,
        },
      }),

      this.prisma.semester.findUnique({
        where: {
          id: student.semesterId,
        },
      }),

      this.prisma.registrationPeriod.findFirst({
        where: {
          semesterId: student.semesterId,
        },
        orderBy: {
          startDateTime: 'desc',
        },
      }),

      this.prisma.studentEnrollment.findUnique({
        where: {
          studentId_semesterId: {
            studentId: student.id,
            semesterId: student.semesterId,
          },
        },
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
            orderBy: {
              createdAt: 'asc',
            },
          },
          approvals: true,
        },
      }),
    ]);

    if (!studyPlan) {
      return {
        success: false,
        errors: ['Study plan not found'],
      };
    }

    if (!academicYear) {
      return {
        success: false,
        errors: ['Academic level not found'],
      };
    }

    if (!semester) {
      return {
        success: false,
        errors: ['Semester not found'],
      };
    }

    const university =
      studyPlan.program.department.college.university;

    const maxAllowedLevelNumber =
      academicYear.levelNumber +
      university.allowedFutureYears;

    const rawPlanCourses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId: student.studyPlanId,
          academicYear: {
            levelNumber: {
              gte: academicYear.levelNumber,
              lte: maxAllowedLevelNumber,
            },
          },
          course: {
            status: 'ACTIVE',
          },
        },
        include: {
          course: {
            include: {
              prerequisites: {
                include: {
                  prerequisite: true,
                },
              },
              sections: {
                include: {
                  teacher: true,
                  classroom: true,
                  schedules: true,
                },
                orderBy: {
                  sectionNumber: 'asc',
                },
              },
            },
          },
          academicYear: true,
          semester: true,
        },
      });

    const planCourses =
      rawPlanCourses
        .map((planCourse) => ({
          ...planCourse,
          course: {
            ...planCourse.course,
            sections:
              planCourse.course.sections.filter(
                (section) =>
                  section.semesterId ===
                  planCourse.semesterId,
              ),
          },
        }))
        .sort(
          (a, b) =>
            a.academicYear.levelNumber -
            b.academicYear.levelNumber ||
            a.semester.semesterNumber -
            b.semester.semesterNumber ||
            a.priority - b.priority,
        );

    const now = new Date();

    const registrationOpen =
      !!registrationPeriod &&
      registrationPeriod.startDateTime <= now &&
      registrationPeriod.endDateTime >= now;

    const totalRegisteredCredits =
      enrollment?.items.reduce(
        (total, item) =>
          total + item.course.credits,
        0,
      ) ?? 0;

    return {
      success: true,
      student,
      studyPlan,
      academicYear,
      semester,
      registrationPeriod,
      registrationOpen,
      planCourses,
      enrollment,
      totalRegisteredCredits,
      registrationSettings: {
        minGpaForFutureYears: Number(
          university.minGpaForFutureYears,
        ),
        allowedFutureYears:
          university.allowedFutureYears,
        requiredElectiveCredits:
          university.requiredElectiveCredits,
        currentLevelNumber:
          academicYear.levelNumber,
        maxAllowedLevelNumber,
      },
    };
  }

  async createMyEnrollment(userId: string) {
    const student = await this.getStudentByUserId(userId);

    if (!student) {
      return {
        success: false,
        errors: ['Student record not found'],
      };
    }

    if (!student.semesterId) {
      return {
        success: false,
        errors: ['Student is not assigned to a semester'],
      };
    }

    const existingEnrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          studentId_semesterId: {
            studentId: student.id,
            semesterId: student.semesterId,
          },
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

    if (existingEnrollment) {
      return existingEnrollment;
    }

    const now = new Date();

    const registrationPeriod =
      await this.prisma.registrationPeriod.findFirst({
        where: {
          semesterId: student.semesterId,
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
        success: false,
        errors: ['Registration period is closed'],
      };
    }

    const enrollment =
      await this.prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          semesterId: student.semesterId,
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
      action: 'CREATE_REGISTRATION',
      entity: 'StudentEnrollment',
      entityId: enrollment.id,
      userId,
      details: JSON.stringify({
        studentId: student.id,
        semesterId: student.semesterId,
      }),
    });

    return enrollment;
  }

  async addMyItem(
    userId: string,
    courseId: string,
    sectionId: string,
  ) {
    const student = await this.getStudentByUserId(userId);

    if (!student) {
      return {
        success: false,
        errors: ['Student record not found'],
      };
    }

    if (!student.semesterId) {
      return {
        success: false,
        errors: ['Student is not assigned to a semester'],
      };
    }

    let enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          studentId_semesterId: {
            studentId: student.id,
            semesterId: student.semesterId,
          },
        },
      });

    if (!enrollment) {
      const now = new Date();

      const registrationPeriod =
        await this.prisma.registrationPeriod.findFirst({
          where: {
            semesterId: student.semesterId,
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
          success: false,
          errors: ['Registration period is closed'],
        };
      }

      enrollment =
        await this.prisma.studentEnrollment.create({
          data: {
            studentId: student.id,
            semesterId: student.semesterId,
          },
        });

      await this.auditLogs.create({
        action: 'CREATE_REGISTRATION',
        entity: 'StudentEnrollment',
        entityId: enrollment.id,
        userId,
        details: JSON.stringify({
          studentId: student.id,
          semesterId: student.semesterId,
        }),
      });
    }

    return this.addItem(
      {
        enrollmentId: enrollment.id,
        courseId,
        sectionId,
      },
      userId,
    );
  }

  async confirmMyEnrollment(userId: string) {
    const student = await this.getStudentByUserId(userId);

    if (!student) {
      return {
        success: false,
        errors: ['Student record not found'],
      };
    }

    if (!student.semesterId) {
      return {
        success: false,
        errors: ['Student is not assigned to a semester'],
      };
    }

    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          studentId_semesterId: {
            studentId: student.id,
            semesterId: student.semesterId,
          },
        },
      });

    if (!enrollment) {
      return {
        success: false,
        errors: ['Enrollment not found'],
      };
    }

    return this.confirm(enrollment.id, userId);
  }

  async dropMyItem(
    userId: string,
    enrollmentItemId: string,
  ) {
    const item =
      await this.prisma.enrollmentItem.findFirst({
        where: {
          id: enrollmentItemId,
          enrollment: {
            student: {
              userId,
            },
          },
        },
      });

    if (!item) {
      return {
        success: false,
        errors: [
          'Enrollment item not found or does not belong to the current student',
        ],
      };
    }

    return this.dropItem(
      {
        enrollmentItemId,
      },
      userId,
    );
  }

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

  async addItem(
    dto: AddEnrollmentItemDto,
    userId?: string,
  ) {
    if (userId) {
      const ownedEnrollment =
        await this.getOwnedEnrollment(
          userId,
          dto.enrollmentId,
        );

      if (!ownedEnrollment) {
        return {
          success: false,
          errors: [
            'Enrollment does not belong to the current student',
          ],
        };
      }
    }

    const editableValidation =
      await this.validation.validateEnrollmentEditable(
        dto.enrollmentId,
      );

    if (!editableValidation.valid) {
      return {
        success: false,
        errors: editableValidation.errors,
      };
    }

    const enrollment =
      await this.prisma.studentEnrollment.findUnique({
        where: {
          id: dto.enrollmentId,
        },
        select: {
          id: true,
          semesterId: true,
        },
      });

    if (!enrollment) {
      return {
        success: false,
        errors: ['Enrollment not found'],
      };
    }

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

    const eligibilityValidation =
      await this.validation.validateCourseEligibility(
        dto.enrollmentId,
        dto.courseId,
        dto.sectionId,
      );

    if (!eligibilityValidation.valid) {
      return {
        success: false,
        errors: eligibilityValidation.errors,
      };
    }

    const targetSemesterId =
      eligibilityValidation.planCourse?.semesterId;

    if (!targetSemesterId) {
      return {
        success: false,
        errors: [
          'Course placement semester could not be resolved',
        ],
      };
    }

    const sectionValidation =
      await this.validation.validateSection(
        dto.sectionId,
        targetSemesterId,
      );

    if (!sectionValidation.valid) {
      return {
        success: false,
        errors: sectionValidation.errors,
      };
    }

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

    const enrollmentItem =
      await this.prisma.$transaction(
        async (tx) => {
          const freshSection =
            await tx.courseSection.findUnique({
              where: {
                id: dto.sectionId,
              },
            });

          if (!freshSection) {
            throw new Error('Section not found');
          }

          if (freshSection.status !== 'OPEN') {
            throw new Error('Section is closed');
          }

          if (
            freshSection.enrolledCount >=
            freshSection.maxCapacity
          ) {
            throw new Error('Section is full');
          }

          const createdItem =
            await tx.enrollmentItem.create({
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

          await tx.courseSection.update({
            where: {
              id: dto.sectionId,
            },
            data: {
              enrolledCount: {
                increment: 1,
              },
            },
          });

          return createdItem;
        },
      );

    await this.auditLogs.create({
      action: 'ADD_COURSE',
      entity: 'EnrollmentItem',
      entityId: enrollmentItem.id,
      userId,
      details: JSON.stringify({
        enrollmentId: dto.enrollmentId,
        courseId: dto.courseId,
        sectionId: dto.sectionId,
      }),
    });

    return enrollmentItem;
  }

  async confirm(
    enrollmentId: string,
    userId?: string,
  ) {
    if (userId) {
      const ownedEnrollment =
        await this.getOwnedEnrollment(
          userId,
          enrollmentId,
        );

      if (!ownedEnrollment) {
        return {
          success: false,
          errors: [
            'Enrollment does not belong to the current student',
          ],
        };
      }
    }

    const editableValidation =
      await this.validation.validateEnrollmentEditable(
        enrollmentId,
      );

    if (!editableValidation.valid) {
      return {
        success: false,
        errors: editableValidation.errors,
      };
    }

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

    for (const item of enrollment.items) {
      const eligibilityValidation =
        await this.validation.validateCourseEligibility(
          enrollmentId,
          item.courseId,
          item.sectionId,
        );

      if (!eligibilityValidation.valid) {
        return {
          success: false,
          errors: eligibilityValidation.errors,
        };
      }

      const targetSemesterId =
        eligibilityValidation.planCourse?.semesterId;

      if (!targetSemesterId) {
        return {
          success: false,
          errors: [
            'Course placement semester could not be resolved',
          ],
        };
      }

      const sectionValidation =
        await this.validation.validateSection(
          item.sectionId,
          targetSemesterId,
        );

      if (!sectionValidation.valid) {
        return {
          success: false,
          errors: sectionValidation.errors,
        };
      }

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

    const mandatoryCoursesValidation =
      await this.validation.validateMandatoryCourses(
        enrollmentId,
      );

    if (!mandatoryCoursesValidation.valid) {
      return {
        success: false,
        errors: mandatoryCoursesValidation.errors,
      };
    }

    const registrationPeriod =
      periodValidation.registrationPeriod;

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
        userId,
        details: JSON.stringify({
          status: 'PENDING',
          advisorApprovalRequired: true,
        }),
      });

      return pendingEnrollment;
    }

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
      userId,
      details: JSON.stringify({
        status: 'CONFIRMED',
        advisorApprovalRequired: false,
      }),
    });

    return confirmedEnrollment;
  }

  async dropItem(
    dto: DropEnrollmentItemDto,
    userId?: string,
  ) {
    const item =
      await this.prisma.enrollmentItem.findUnique({
        where: {
          id: dto.enrollmentItemId,
        },
        include: {
          enrollment: {
            include: {
              student: true,
            },
          },
        },
      });

    if (!item) {
      return {
        success: false,
        errors: ['Enrollment item not found'],
      };
    }

    if (
      userId &&
      item.enrollment.student.userId !== userId
    ) {
      return {
        success: false,
        errors: [
          'Enrollment item does not belong to the current student',
        ],
      };
    }

    const editableValidation =
      await this.validation.validateEnrollmentEditable(
        item.enrollmentId,
      );

    if (!editableValidation.valid) {
      return {
        success: false,
        errors: editableValidation.errors,
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
      userId,
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