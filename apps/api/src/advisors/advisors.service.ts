import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdvisorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignedPrograms(advisorId: string) {
    const advisor = await this.prisma.user.findUnique({
      where: { id: advisorId },
      select: { id: true, role: { select: { code: true } } },
    });
    if (!advisor || advisor.role.code !== 'ADVISOR') {
      throw new NotFoundException('حساب المسؤول الأكاديمي غير موجود.');
    }
    const assignments = await this.prisma.advisorProgramAssignment.findMany({
      where: { advisorId },
      include: { program: { include: { college: true, department: { include: { college: true } } } } },
      orderBy: [{ program: { nameAr: 'asc' } }],
    });
    return assignments.map(({ program }) => ({
      id: program.id,
      nameAr: program.nameAr,
      departmentId: program.departmentId,
      departmentName: program.department?.nameAr ?? null,
      collegeId: program.collegeId ?? program.department?.collegeId ?? '',
      collegeName: program.college?.nameAr ?? program.department?.college.nameAr ?? '',
    }));
  }

  async getAssignedColleges(advisorId: string) {
    const advisor = await this.prisma.user.findUnique({
      where: { id: advisorId },
      select: { id: true, role: { select: { code: true } } },
    });
    if (!advisor || advisor.role.code !== 'ADVISOR') {
      throw new NotFoundException('حساب المسؤول الأكاديمي غير موجود.');
    }
    const assignments = await this.prisma.advisorCollegeAssignment.findMany({
      where: { advisorId },
      include: { college: true },
      orderBy: [{ college: { nameAr: 'asc' } }],
    });
    return assignments.map(({ college }) => ({ id: college.id, nameAr: college.nameAr }));
  }

  async setAssignedColleges(advisorId: string, collegeIds: string[], actingUserId: string) {
    if (!Array.isArray(collegeIds)) throw new BadRequestException('قائمة الكليات غير صالحة.');
    const ids = [...new Set(collegeIds.map((id) => id.trim()).filter(Boolean))];
    const advisor = await this.prisma.user.findUnique({
      where: { id: advisorId }, include: { role: true },
    });
    if (!advisor || advisor.role.code !== 'ADVISOR') {
      throw new NotFoundException('حساب المسؤول الأكاديمي غير موجود.');
    }
    const colleges = ids.length ? await this.prisma.college.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
    if (colleges.length !== ids.length) throw new BadRequestException('بعض الكليات المحددة غير موجودة.');

    await this.prisma.$transaction(async (tx) => {
      await tx.advisorCollegeAssignment.deleteMany({ where: { advisorId } });
      if (ids.length) await tx.advisorCollegeAssignment.createMany({ data: ids.map((collegeId) => ({ advisorId, collegeId })) });
      await tx.auditLog.create({
        data: {
          action: 'ADVISOR_COLLEGE_ASSIGNMENTS_UPDATED',
          entity: 'User',
          entityId: advisorId,
          userId: actingUserId,
          details: JSON.stringify({ collegeIds: ids }),
        },
      });
    });
    return this.getAssignedColleges(advisorId);
  }

  async setAssignedPrograms(advisorId: string, programIds: string[], actingUserId: string) {
    if (!Array.isArray(programIds)) throw new BadRequestException('قائمة الاختصاصات غير صالحة.');
    const ids = [...new Set(programIds.map((id) => id.trim()).filter(Boolean))];
    const advisor = await this.prisma.user.findUnique({
      where: { id: advisorId }, include: { role: true },
    });
    if (!advisor || advisor.role.code !== 'ADVISOR') {
      throw new NotFoundException('حساب المسؤول الأكاديمي غير موجود.');
    }
    const programs = ids.length ? await this.prisma.program.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
    if (programs.length !== ids.length) throw new BadRequestException('بعض الاختصاصات المحددة غير موجودة.');

    await this.prisma.$transaction(async (tx) => {
      await tx.advisorProgramAssignment.deleteMany({ where: { advisorId } });
      if (ids.length) await tx.advisorProgramAssignment.createMany({ data: ids.map((programId) => ({ advisorId, programId })) });
      await tx.auditLog.create({
        data: {
          action: 'ADVISOR_PROGRAM_ASSIGNMENTS_UPDATED',
          entity: 'User',
          entityId: advisorId,
          userId: actingUserId,
          details: JSON.stringify({ programIds: ids }),
        },
      });
    });
    return this.getAssignedPrograms(advisorId);
  }
}
