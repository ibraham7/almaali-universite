import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateAdvisorApprovalDto } from './dto/update-advisor-approval.dto.js';

@Injectable()
export class AdvisorApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeDetails = {
    enrollment: {
      include: {
        student: true,
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

  async findForAdvisor(advisorId: string) {
    return this.prisma.advisorApproval.findMany({
      where: {
        advisorId,
      },
      include: this.includeDetails,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAll() {
    return this.prisma.advisorApproval.findMany({
      include: this.includeDetails,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForAdvisor(
    approvalId: string,
    advisorId: string,
  ) {
    const approval =
      await this.prisma.advisorApproval.findUnique({
        where: {
          id: approvalId,
        },
        include: this.includeDetails,
      });

    if (!approval) {
      throw new NotFoundException(
        'طلب الموافقة غير موجود',
      );
    }

    if (approval.advisorId !== advisorId) {
      throw new ForbiddenException(
        'لا يمكنك الوصول إلى طلب تابع لمرشد آخر',
      );
    }

    return approval;
  }

  async findOne(approvalId: string) {
    const approval =
      await this.prisma.advisorApproval.findUnique({
        where: {
          id: approvalId,
        },
        include: this.includeDetails,
      });

    if (!approval) {
      throw new NotFoundException(
        'طلب الموافقة غير موجود',
      );
    }

    return approval;
  }

  async updateDecision(
    approvalId: string,
    advisorId: string,
    dto: UpdateAdvisorApprovalDto,
  ) {
    const approval =
      await this.prisma.advisorApproval.findUnique({
        where: {
          id: approvalId,
        },
        include: {
          enrollment: {
            include: {
              student: true,
            },
          },
        },
      });

    if (!approval) {
      throw new NotFoundException(
        'طلب الموافقة غير موجود',
      );
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

    if (
      dto.status === 'REJECTED' &&
      !note
    ) {
      throw new BadRequestException(
        'سبب الرفض مطلوب',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.advisorApproval.update({
        where: {
          id: approvalId,
        },
        data: {
          status: dto.status,
          note,
        },
      });

      await tx.studentEnrollment.update({
        where: {
          id: approval.enrollmentId,
        },
        data: {
          status: dto.status,
        },
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
            enrollmentId:
              approval.enrollmentId,
            studentId:
              approval.enrollment.studentId,
            previousStatus:
              approval.status,
            newStatus: dto.status,
            note,
          }),
        },
      });
    });

    return this.findOneForAdvisor(
      approvalId,
      advisorId,
    );
  }
}