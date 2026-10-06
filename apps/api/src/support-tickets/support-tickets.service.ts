import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(role: string) {
    return ['ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN'].includes(role);
  }

  async list(user: { id: string; role: string }, page?: string) {
    const parsed = Number(page ?? 1);
    const current = Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 1000) : 1;
    const tickets = await this.prisma.supportTicket.findMany({
      where: this.isStaff(user.role) ? {} : { authorId: user.id },
      skip: (current - 1) * 30, take: 30, orderBy: { createdAt: 'desc' },
      select: { id: true, authorId: true, category: true, title: true, status: true, createdAt: true, updatedAt: true },
    });
    if (!this.isStaff(user.role) || tickets.length === 0) return tickets;
    const authors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(tickets.map((ticket) => ticket.authorId))] } },
      select: { id: true, displayName: true, student: { select: { fullName: true, firstName: true, middleName: true, familyName: true, universityId: true, programId: true } } },
    });
    const programIds = [...new Set(authors.map((author) => author.student?.programId).filter((id): id is string => Boolean(id)))];
    const programs = await this.prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, nameAr: true, college: { select: { nameAr: true } }, department: { select: { nameAr: true, college: { select: { nameAr: true } } } } },
    });
    const programsById = new Map(programs.map((program) => [program.id, program]));
    const authorsById = new Map(authors.map((author) => {
      const student = author.student;
      const program = student?.programId ? programsById.get(student.programId) : undefined;
      return [author.id, {
        name: student?.fullName || [student?.firstName, student?.middleName, student?.familyName].filter(Boolean).join(' ') || author.displayName || 'مستخدم',
        universityId: student?.universityId ?? null,
        programName: program?.nameAr ?? null,
        departmentName: program?.department?.nameAr ?? null,
        collegeName: program?.college?.nameAr ?? program?.department?.college.nameAr ?? null,
      }];
    }));
    return tickets.map((ticket) => ({ ...ticket, author: authorsById.get(ticket.authorId) ?? null }));
  }
  async one(id: string, user: { id: string; role: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!ticket || (!this.isStaff(user.role) && ticket.authorId !== user.id)) throw new NotFoundException('التذكرة غير موجودة.');
    if (!this.isStaff(user.role)) return ticket;
    const author = await this.prisma.user.findUnique({
      where: { id: ticket.authorId },
      select: { id: true, displayName: true, student: { select: { fullName: true, firstName: true, middleName: true, familyName: true, universityId: true, programId: true } } },
    });
    const program = author?.student?.programId
      ? await this.prisma.program.findUnique({ where: { id: author.student.programId }, select: { nameAr: true, college: { select: { nameAr: true } }, department: { select: { nameAr: true, college: { select: { nameAr: true } } } } } })
      : null;
    const student = author?.student;
    return {
      ...ticket,
      author: author ? {
        name: student?.fullName || [student?.firstName, student?.middleName, student?.familyName].filter(Boolean).join(' ') || author.displayName || 'مستخدم',
        universityId: student?.universityId ?? null,
        programName: program?.nameAr ?? null,
        departmentName: program?.department?.nameAr ?? null,
        collegeName: program?.college?.nameAr ?? program?.department?.college.nameAr ?? null,
      } : null,
    };
  }
  async create(data: { category: string; title: string; description: string; imageData?: string }, user: { id: string; role: string }) {
    if (user.role !== 'STUDENT') throw new ForbiddenException();
    if (data.imageData && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.imageData) || data.imageData.length > 400000)) {
      throw new BadRequestException('الصورة يجب أن تكون PNG أو JPEG أو WebP وبحجم صغير.');
    }
    return this.prisma.supportTicket.create({ data: { authorId: user.id, category: data.category, title: data.title.trim(), description: data.description.trim(), imageData: data.imageData } });
  }
  async reply(ticketId: string, body: string, user: { id: string; role: string }) {
    if (!this.isStaff(user.role)) throw new ForbiddenException();
    const ticket = await this.one(ticketId, user);
    if (ticket.status === 'ANSWERED' || ticket.messages.some((message) => message.authorId !== ticket.authorId)) {
      throw new BadRequestException('تم الرد على التذكرة بالفعل.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.updateMany({ where: { id: ticketId, status: { not: 'ANSWERED' } }, data: { status: 'ANSWERED' } });
      if (!updated.count) throw new BadRequestException('تم الرد على التذكرة بالفعل.');
      return tx.supportTicketMessage.create({ data: { ticketId, body: body.trim(), authorId: user.id } });
    });
  }
  async updateStatus(id: string, status: string, role: string) {
    if (!this.isStaff(role)) throw new ForbiddenException();
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, select: { status: true } });
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة.');
    if (ticket.status !== 'NEW') throw new BadRequestException('التذكرة قيد المراجعة أو تم الرد عليها بالفعل.');
    return this.prisma.supportTicket.update({ where: { id }, data: { status } });
  }
}
