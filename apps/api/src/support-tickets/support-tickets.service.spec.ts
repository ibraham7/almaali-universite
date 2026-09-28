import { SupportTicketsService } from './support-tickets.service.js';

describe('support ticket permissions and images', () => {
  const prisma = { supportTicket: { findUnique: vi.fn().mockResolvedValue({ id: 'ticket-1' }), update: vi.fn(), create: vi.fn() } };
  const service = new SupportTicketsService(prisma as never);

  it('allows only staff to change a public ticket status', async () => {
    await expect(service.updateStatus('ticket-1', 'RESOLVED', 'STUDENT')).rejects.toThrow();
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    await service.updateStatus('ticket-1', 'RESOLVED', 'SYSTEM_ADMIN');
    expect(prisma.supportTicket.update).toHaveBeenCalledWith({ where: { id: 'ticket-1' }, data: { status: 'RESOLVED' } });
  });

  it('rejects unsupported image formats', async () => {
    await expect(service.create({ category: 'PROBLEM', title: 'example', description: 'some description', imageData: 'data:image/svg+xml;base64,AAA' }, 'user-1')).rejects.toThrow();
    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
  });
});
