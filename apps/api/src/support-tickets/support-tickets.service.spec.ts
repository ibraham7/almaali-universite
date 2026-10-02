import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('SupportTicketsService privacy and replies', () => {
  const student = { id: 'student-a', role: 'STUDENT' };
  const advisor = { id: 'advisor-a', role: 'ADVISOR' };
  const ticket = { id: 'ticket-a', authorId: 'student-b', status: 'NEW', messages: [] };

  function setup() {
    const prisma = {
      supportTicket: {
        findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(ticket),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn(), create: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'student-b', displayName: 'Student', student: { fullName: 'Student Example', firstName: 'Student', middleName: 'Example', familyName: '', universityId: 'U-001', programId: null } }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      program: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
      supportTicketMessage: { create: vi.fn().mockResolvedValue({ id: 'reply-a' }) },
      $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma)),
    };
    return { prisma, service: new SupportTicketsService(prisma as unknown as PrismaService) };
  }

  it('lists only the student own tickets while showing incoming tickets to advisors and managers', async () => {
    const { prisma, service } = setup();
    await service.list(student);
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorId: student.id } }));
    await service.list(advisor);
    expect(prisma.supportTicket.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
    await service.list({ id: 'manager-a', role: 'SYSTEM_ADMIN' });
    expect(prisma.supportTicket.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
  });

  it('includes the student name and university number in staff ticket lists', async () => {
    const { prisma, service } = setup();
    prisma.supportTicket.findMany.mockResolvedValue([ticket]);
    prisma.user.findMany.mockResolvedValue([{
      id: 'student-b', displayName: 'Student', student: {
        fullName: 'Student Example', firstName: 'Student', middleName: 'Example', familyName: '', universityId: 'U-001', programId: null,
      },
    }]);
    const [listedTicket] = await service.list(advisor);
    expect(listedTicket.author).toMatchObject({ name: 'Student Example', universityId: 'U-001' });
  });

  it('conceals another student’s ticket and blocks a student reply', async () => {
    const { service } = setup();
    await expect(service.one(ticket.id, student)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.reply(ticket.id, 'a reply', student)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks a staff reply as answered atomically', async () => {
    const { prisma, service } = setup();
    await service.reply(ticket.id, 'a reply', advisor);
    expect(prisma.supportTicket.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'ANSWERED' } }));
    expect(prisma.supportTicketMessage.create).toHaveBeenCalledWith({ data: { ticketId: ticket.id, body: 'a reply', authorId: advisor.id } });
  });
});
