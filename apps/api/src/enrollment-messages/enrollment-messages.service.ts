import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class EnrollmentMessagesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getStudentEnrollmentByUserId(
    userId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      select: {
        id: true,
        semesterId: true,
      },
    });

    if (!student) {
      throw new NotFoundException('سجل الطالب غير موجود');
    }

    if (!student.semesterId) {
      throw new BadRequestException('الطالب غير مرتبط بفصل دراسي');
    }

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: {
        studentId_semesterId: {
          studentId: student.id,
          semesterId: student.semesterId,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('لا يوجد طلب تسجيل حالي للطالب');
    }

    return enrollment;
  }

  private async getAdvisorEnrollment(
    approvalId: string,
    advisorId: string,
  ) {
    const approval = await this.prisma.advisorApproval.findUnique({
      where: { id: approvalId },
      select: {
        enrollmentId: true,
        advisorId: true,
      },
    });

    if (!approval) {
      throw new NotFoundException('طلب الموافقة غير موجود');
    }

    if (approval.advisorId !== advisorId) {
      throw new ForbiddenException(
        'لا يمكنك الوصول إلى محادثة طلب تابع لمرشد آخر',
      );
    }

    return approval.enrollmentId;
  }

  private normalizeMessage(message: string) {
    const normalized = message.trim();

    if (!normalized) {
      throw new BadRequestException('نص الرسالة مطلوب');
    }

    if (normalized.length > 2000) {
      throw new BadRequestException(
        'الرسالة طويلة جدًا. الحد الأقصى 2000 حرف',
      );
    }

    return normalized;
  }

  async getForStudent(userId: string) {
    const enrollment = await this.getStudentEnrollmentByUserId(userId);

    return this.prisma.enrollmentMessage.findMany({
      where: {
        enrollmentId: enrollment.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async sendForStudent(
    userId: string,
    message: string,
  ) {
    const enrollment = await this.getStudentEnrollmentByUserId(userId);

    return this.prisma.enrollmentMessage.create({
      data: {
        enrollmentId: enrollment.id,
        senderUserId: userId,
        senderRole: 'STUDENT',
        message: this.normalizeMessage(message),
      },
    });
  }

  async getForAdvisor(
    approvalId: string,
    advisorId: string,
  ) {
    const enrollmentId = await this.getAdvisorEnrollment(
      approvalId,
      advisorId,
    );

    return this.prisma.enrollmentMessage.findMany({
      where: {
        enrollmentId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async sendForAdvisor(
    approvalId: string,
    advisorId: string,
    message: string,
  ) {
    const enrollmentId = await this.getAdvisorEnrollment(
      approvalId,
      advisorId,
    );

    return this.prisma.enrollmentMessage.create({
      data: {
        enrollmentId,
        senderUserId: advisorId,
        senderRole: 'ADVISOR',
        message: this.normalizeMessage(message),
      },
    });
  }
}
