import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { StudentEnrollmentsService } from './student-enrollments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto.js';
import { AddEnrollmentItemDto } from './dto/add-enrollment-item.dto.js';
import { DropEnrollmentItemDto } from './dto/drop-enrollment-item.dto.js';
import { DirectAdvisorRegistrationDto } from './dto/direct-advisor-registration.dto.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface AddMyEnrollmentItemBody {
  courseId: string;
  sectionId: string;
}

interface DropMyEnrollmentItemBody {
  enrollmentItemId: string;
}

@Controller('student-enrollments')
@UseGuards(JwtGuard, RolesGuard)
export class StudentEnrollmentsController {
  constructor(
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
    private readonly prisma: PrismaService,
  ) {}

  private async reopenForStudent(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      select: {
        id: true,
        semesterId: true,
      },
    });

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

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: {
        studentId_semesterId: {
          studentId: student.id,
          semesterId: student.semesterId,
        },
      },
    });

    if (!enrollment) {
      return { success: true };
    }

    if (enrollment.revisionCount >= 2) {
      return {
        success: false,
        errors: ['تم استنفاد مرتي تعديل التسجيل المسموحتين'],
      };
    }

    if (enrollment.status === 'DRAFT') {
      return { success: true, enrollment };
    }

    if (!['PENDING', 'APPROVED', 'REJECTED', 'CONFIRMED'].includes(enrollment.status)) {
      return {
        success: false,
        errors: ['This registration cannot be reopened'],
      };
    }

    const now = new Date();

    const activePeriod = await this.prisma.registrationPeriod.findFirst({
      where: {
        semesterId: student.semesterId,
        startDateTime: { lte: now },
        endDateTime: { gte: now },
      },
      orderBy: {
        startDateTime: 'desc',
      },
    });

    if (!activePeriod) {
      return {
        success: false,
        errors: ['Registration period is closed'],
      };
    }

    if (activePeriod.addDropDeadline && now > activePeriod.addDropDeadline) {
      return {
        success: false,
        errors: ['Add/drop deadline has passed'],
      };
    }

    const updatedEnrollment = await this.prisma.$transaction(async (tx) => {
      const reopened = await tx.studentEnrollment.updateMany({
        where: {
          id: enrollment.id,
          status: enrollment.status,
          revisionCount: { lt: 2 },
        },
        data: {
          status: 'DRAFT',
          revisionCount: { increment: 1 },
        },
      });

      if (!reopened.count) {
        throw new BadRequestException('تم استنفاد مرتي تعديل التسجيل المسموحتين');
      }

      await tx.advisorApproval.deleteMany({ where: { enrollmentId: enrollment.id } });

      const updated = await tx.studentEnrollment.findUnique({
        where: { id: enrollment.id },
      });

      await tx.auditLog.create({
        data: {
          action: 'REOPEN_REGISTRATION',
          entity: 'StudentEnrollment',
          entityId: enrollment.id,
          userId,
          details: JSON.stringify({
            previousStatus: enrollment.status,
            newStatus: 'DRAFT',
          }),
        },
      });

      return updated;
    });

    return {
      success: true,
      enrollment: updatedEnrollment,
    };
  }

  @Get('me/registration')
  @Roles('STUDENT')
  getMyRegistration(@Req() request: AuthenticatedRequest) {
    return this.studentEnrollmentsService.getMyRegistration(
      request.user.id,
    );
  }

  @Post('me')
  @Roles('STUDENT')
  createMyEnrollment(@Req() request: AuthenticatedRequest) {
    return this.studentEnrollmentsService.createMyEnrollment(
      request.user.id,
    );
  }

  @Post('me/reopen')
  @Roles('STUDENT')
  reopenMyEnrollment(@Req() request: AuthenticatedRequest) {
    return this.reopenForStudent(request.user.id);
  }

  @Post('me/items')
  @Roles('STUDENT')
  addMyItem(
    @Req() request: AuthenticatedRequest,
    @Body() body: AddMyEnrollmentItemBody,
  ) {
    return this.studentEnrollmentsService.addMyItem(
      request.user.id,
      body.courseId,
      body.sectionId,
    );
  }

  @Post('me/confirm')
  @Roles('STUDENT')
  confirmMyEnrollment(@Req() request: AuthenticatedRequest) {
    return this.studentEnrollmentsService.confirmMyEnrollment(
      request.user.id,
    );
  }

  @Post('me/items/drop')
  @Roles('STUDENT')
  dropMyItem(
    @Req() request: AuthenticatedRequest,
    @Body() body: DropMyEnrollmentItemBody,
  ) {
    return this.studentEnrollmentsService.dropMyItem(
      request.user.id,
      body.enrollmentItemId,
    );
  }

  @Get('advisor/:universityId/catalog')
  @Roles('ADVISOR')
  getAdvisorRegistrationCatalog(@Param('universityId') universityId: string, @Req() request: AuthenticatedRequest) {
    return this.studentEnrollmentsService.getAdvisorRegistrationCatalog(universityId, request.user.id);
  }

  @Post('advisor/direct-register')
  @Roles('ADVISOR')
  registerDirectlyByAdvisor(@Body() dto: DirectAdvisorRegistrationDto, @Req() request: AuthenticatedRequest) {
    return this.studentEnrollmentsService.registerDirectlyByAdvisor(dto.universityId, request.user.id, dto.items);
  }

  @Post('items/drop')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  dropItem(@Body() dto: DropEnrollmentItemDto) {
    return this.studentEnrollmentsService.dropItem(dto);
  }

  @Post(':enrollmentId/confirm')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  confirm(@Param('enrollmentId') enrollmentId: string) {
    return this.studentEnrollmentsService.confirm(enrollmentId);
  }

  @Post('items')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  addItem(@Body() dto: AddEnrollmentItemDto) {
    return this.studentEnrollmentsService.addItem(dto);
  }

  @Post()
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  create(@Body() dto: CreateStudentEnrollmentDto) {
    return this.studentEnrollmentsService.create(dto);
  }

  @Get()
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  findAll() {
    return this.studentEnrollmentsService.findAll();
  }

  @Get('student/:studentId')
  @Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
  findByStudent(@Param('studentId') studentId: string) {
    return this.studentEnrollmentsService.findByStudent(studentId);
  }
}
