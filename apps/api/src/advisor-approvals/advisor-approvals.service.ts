import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { StudentEnrollmentsService } from '../student-enrollments/student-enrollments.service.js';
import { UpdateAdvisorApprovalDto } from './dto/update-advisor-approval.dto.js';

@Injectable()
export class AdvisorApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  private readonly studentDetails = {
    include: {
      college: true,
      department: true,
      program: true,
      studyPlan: true,
      academicYear: true,
      semester: true,
    },
  } as const;

  private readonly includeDetails = {
    enrollment: {
      include: {
        student: this.studentDetails,
        items: {
          include: {
            course: true,
            section: {
              include: {
                schedules: true,
                teacher: true,
                classroom: true,
              },
            },
          },
        },
      },
    },
  } as const;

  private async getPendingOwnedApproval(
    approvalId: string,
    advisorId: string,
  ) {
    const approval = await this.prisma.advisorApproval.findUnique({
      where: { id: approvalId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('طلب الموافقة غير موجود');
    }

    if (approval.advisorId !== advisorId) {
      throw new ForbiddenException(
        'لا يمكنك تعديل طلب تابع لمرشد آخر',
      );
    }

    if (
      approval.status !== 'PENDING' ||
      approval.enrollment.status !== 'PENDING'
    ) {
      throw new BadRequestException(
        'يمكن تعديل الطلب فقط أثناء انتظاره لموافقة المرشد',
      );
    }

    return approval;
  }

  async findForAdvisor(advisorId: string) {
    return this.prisma.advisorApproval.findMany({
      where: { advisorId },
      include: this.includeDetails,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.advisorApproval.findMany({
      include: this.includeDetails,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForAdvisor(
    approvalId: string,
    advisorId: string,
  ) {
    const approval = await this.prisma.advisorApproval.findUnique({
      where: { id: approvalId },
      include: this.includeDetails,
    });

    if (!approval) {
      throw new NotFoundException('طلب الموافقة غير موجود');
    }

    if (approval.advisorId !== advisorId) {
      throw new ForbiddenException(
        'لا يمكنك الوصول إلى طلب تابع لمرشد آخر',
      );
    }

    return approval;
  }

  async findOne(approvalId: string) {
    const approval = await this.prisma.advisorApproval.findUnique({
      where: { id: approvalId },
      include: this.includeDetails,
    });

    if (!approval) {
      throw new NotFoundException('طلب الموافقة غير موجود');
    }

    return approval;
  }

  async getAvailableCoursesForAdvisor(
    approvalId: string,
    advisorId: string,
  ) {
    const approval = await this.getPendingOwnedApproval(
      approvalId,
      advisorId,
    );

    const student = await this.prisma.student.findUnique({
      where: { id: approval.enrollment.studentId },
      include: {
        studyPlan: {
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
        },
        academicYear: true,
      },
    });

    if (
      !student ||
      !student.studyPlanId ||
      !student.academicYear ||
      !student.studyPlan
    ) {
      throw new BadRequestException(
        'بيانات الطالب الأكاديمية غير مكتملة',
      );
    }

    const university =
      student.studyPlan.program.department.college.university;

    const maxLevel =
      student.academicYear.levelNumber +
      university.allowedFutureYears;

    const currentItems = await this.prisma.enrollmentItem.findMany({
      where: { enrollmentId: approval.enrollmentId },
      select: { courseId: true },
    });

    const existingCourseIds = new Set(
      currentItems.map((item) => item.courseId),
    );

    const planCourses = await this.prisma.studyPlanCourse.findMany({
      where: {
        studyPlanId: student.studyPlanId,
        academicYear: {
          levelNumber: {
            gte: student.academicYear.levelNumber,
            lte: maxLevel,
          },
        },
        course: {
          status: 'ACTIVE',
        },
      },
      include: {
        academicYear: true,
        semester: true,
        course: {
          include: {
            sections: {
              where: {
                status: 'OPEN',
              },
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
      },
      orderBy: [
        {
          academicYear: {
            levelNumber: 'asc',
          },
        },
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

    return planCourses
      .filter(
        (planCourse) =>
          !existingCourseIds.has(planCourse.courseId),
      )
      .map((planCourse) => ({
        id: planCourse.course.id,
        code: planCourse.course.code,
        nameAr: planCourse.course.nameAr,
        credits: planCourse.course.credits,
        academicYear: planCourse.academicYear,
        semester: planCourse.semester,
        sections: planCourse.course.sections.filter(
          (section) =>
            section.semesterId === planCourse.semesterId &&
            section.enrolledCount < section.maxCapacity,
        ),
      }))
      .filter((course) => course.sections.length > 0);
  }

  async addCourse(
    approvalId: string,
    advisorId: string,
    courseId: string,
    sectionId: string,
  ) {
    const approval = await this.getPendingOwnedApproval(
      approvalId,
      advisorId,
    );

    await this.prisma.studentEnrollment.update({
      where: { id: approval.enrollmentId },
      data: { status: 'DRAFT' },
    });

    try {
      const result = await this.studentEnrollmentsService.addItem(
        {
          enrollmentId: approval.enrollmentId,
          courseId,
          sectionId,
        },
      );

      if (
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        result.success === false
      ) {
        return result;
      }

      await this.prisma.studentEnrollment.update({
        where: { id: approval.enrollmentId },
        data: { status: 'PENDING' },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'ADVISOR_ADD_REGISTRATION_COURSE',
          entity: 'StudentEnrollment',
          entityId: approval.enrollmentId,
          userId: advisorId,
          details: JSON.stringify({ courseId, sectionId }),
        },
      });

      return this.findOneForAdvisor(approvalId, advisorId);
    } finally {
      await this.prisma.studentEnrollment.updateMany({
        where: {
          id: approval.enrollmentId,
          status: 'DRAFT',
        },
        data: { status: 'PENDING' },
      });
    }
  }

  async removeCourse(
    approvalId: string,
    advisorId: string,
    enrollmentItemId: string,
  ) {
    const approval = await this.getPendingOwnedApproval(
      approvalId,
      advisorId,
    );

    const item = await this.prisma.enrollmentItem.findFirst({
      where: {
        id: enrollmentItemId,
        enrollmentId: approval.enrollmentId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'المقرر غير موجود ضمن تسجيل هذا الطالب',
      );
    }

    await this.prisma.studentEnrollment.update({
      where: { id: approval.enrollmentId },
      data: { status: 'DRAFT' },
    });

    try {
      const result = await this.studentEnrollmentsService.dropItem({
        enrollmentItemId,
      });

      if (
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        result.success === false
      ) {
        return result;
      }

      await this.prisma.studentEnrollment.update({
        where: { id: approval.enrollmentId },
        data: { status: 'PENDING' },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'ADVISOR_REMOVE_REGISTRATION_COURSE',
          entity: 'StudentEnrollment',
          entityId: approval.enrollmentId,
          userId: advisorId,
          details: JSON.stringify({ enrollmentItemId }),
        },
      });

      return this.findOneForAdvisor(approvalId, advisorId);
    } finally {
      await this.prisma.studentEnrollment.updateMany({
        where: {
          id: approval.enrollmentId,
          status: 'DRAFT',
        },
        data: { status: 'PENDING' },
      });
    }
  }

  async cancelRegistration(
    approvalId: string,
    advisorId: string,
    note?: string,
  ) {
    const approval = await this.getPendingOwnedApproval(
      approvalId,
      advisorId,
    );

    await this.prisma.$transaction(async (tx) => {
      const items = await tx.enrollmentItem.findMany({
        where: { enrollmentId: approval.enrollmentId },
        select: {
          id: true,
          sectionId: true,
        },
      });

      for (const item of items) {
        await tx.courseSection.update({
          where: { id: item.sectionId },
          data: {
            enrolledCount: {
              decrement: 1,
            },
          },
        });
      }

      await tx.enrollmentItem.deleteMany({
        where: { enrollmentId: approval.enrollmentId },
      });

      await tx.studentEnrollment.update({
        where: { id: approval.enrollmentId },
        data: { status: 'CANCELLED' },
      });

      await tx.advisorApproval.update({
        where: { id: approvalId },
        data: {
          status: 'REJECTED',
          note:
            note?.trim() ||
            'تم إلغاء التسجيل بواسطة المرشد الأكاديمي',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ADVISOR_CANCEL_REGISTRATION',
          entity: 'StudentEnrollment',
          entityId: approval.enrollmentId,
          userId: advisorId,
          details: JSON.stringify({
            note: note?.trim() || null,
          }),
        },
      });
    });

    return this.findOneForAdvisor(approvalId, advisorId);
  }

  async updateDecision(
    approvalId: string,
    advisorId: string,
    dto: UpdateAdvisorApprovalDto,
  ) {
    const approval = await this.prisma.advisorApproval.findUnique({
      where: { id: approvalId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('طلب الموافقة غير موجود');
    }

    if (approval.advisorId !== advisorId) {
      throw new ForbiddenException(
        'لا يمكنك اتخاذ قرار على طلب تابع لمرشد آخر',
      );
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException(
        'تم اتخاذ قرار على هذا الطلب مسبقًا',
      );
    }

    if (approval.enrollment.status !== 'PENDING') {
      throw new BadRequestException(
        'حالة تسجيل الطالب لم تعد بانتظار موافقة المرشد',
      );
    }

    const note = dto.note?.trim() || null;

    if (dto.status === 'REJECTED' && !note) {
      throw new BadRequestException('سبب الرفض مطلوب');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.advisorApproval.update({
        where: { id: approvalId },
        data: {
          status: dto.status,
          note,
        },
      });

      await tx.studentEnrollment.update({
        where: { id: approval.enrollmentId },
        data: { status: dto.status },
      });

      await tx.auditLog.create({
        data: {
          action:
            dto.status === 'APPROVED'
              ? 'ADVISOR_APPROVE_REGISTRATION'
              : 'ADVISOR_REJECT_REGISTRATION',
          entity: 'AdvisorApproval',
          entityId: approvalId,
          userId: advisorId,
          details: JSON.stringify({
            enrollmentId: approval.enrollmentId,
            studentId: approval.enrollment.studentId,
            previousStatus: approval.status,
            newStatus: dto.status,
            note,
          }),
        },
      });
    });

    return this.findOneForAdvisor(approvalId, advisorId);
  }
}
