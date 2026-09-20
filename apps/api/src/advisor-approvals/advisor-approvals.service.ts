import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateAdvisorApprovalDto } from './dto/update-advisor-approval.dto.js';

@Injectable()
export class AdvisorApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(enrollmentId: string, advisorId: string) {
    return this.prisma.advisorApproval.create({
      data: {
        enrollmentId,
        advisorId,
        status: 'PENDING',
      },
    });
  }

  async update(
    approvalId: string,
    dto: UpdateAdvisorApprovalDto,
  ) {
    const approval = await this.prisma.advisorApproval.update({
      where: {
        id: approvalId,
      },
      data: {
        status: dto.status,
        note: dto.note,
      },
    });

    await this.prisma.studentEnrollment.update({
      where: {
        id: approval.enrollmentId,
      },
      data: {
        status:
          dto.status === 'APPROVED'
            ? 'APPROVED'
            : 'REJECTED',
      },
    });

    return this.findById(approvalId);
  }

  async findById(approvalId: string) {
    return this.prisma.advisorApproval.findUnique({
      where: {
        id: approvalId,
      },
      include: {
        enrollment: {
          include: {
            student: true,
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
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.advisorApproval.findMany({
      include: {
        enrollment: {
          include: {
            student: true,
            items: {
              include: {
                course: true,
                section: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}