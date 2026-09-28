import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  list(page?: string) {
    const parsed = Number(page ?? 1);
    const current = Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 1000) : 1;
    return this.prisma.supportTicket.findMany({
      skip: (current - 1) * 30, take: 30, orderBy: { createdAt: 'desc' },
      select: { id: true, category: true, title: true, status: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
    });
  }
  async one(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة.');
    return ticket;
  }
  async create(data: { category: string; title: string; description: string; imageData?: string }, authorId: string) {
    if (data.imageData && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.imageData) || data.imageData.length > 400000)) {
      throw new BadRequestException('الصورة يجب أن تكون PNG أو JPEG أو WebP وبحجم صغير.');
    }
    return this.prisma.supportTicket.create({ data: { authorId, category: data.category, title: data.title.trim(), description: data.description.trim(), imageData: data.imageData } });
  }
  async comment(ticketId: string, body: string, authorId: string) {
    if (!await this.prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true } })) throw new NotFoundException('التذكرة غير موجودة.');
    return this.prisma.supportTicketMessage.create({ data: { ticketId, body: body.trim(), authorId } });
  }
  async updateStatus(id: string, status: string, role: string) {
    if (!['REGISTRAR', 'SYSTEM_ADMIN'].includes(role)) throw new ForbiddenException();
    if (!await this.prisma.supportTicket.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('التذكرة غير موجودة.');
    return this.prisma.supportTicket.update({ where: { id }, data: { status } });
  }
}
