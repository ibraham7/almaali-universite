import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AffairsUser } from './affairs.service.js';

const PAGE_SIZE = 20;

// A person reads only their own notifications. Rows are marked read, never deleted.
@Injectable()
export class AffairsNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AffairsUser, unreadOnly: boolean, page = 1) {
    const where = { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };
    const [rows, unread] = await Promise.all([
      this.prisma.affairsNotification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE + 1 }),
      this.prisma.affairsNotification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE, page, unread };
  }

  async unreadCount(user: AffairsUser) {
    return { unread: await this.prisma.affairsNotification.count({ where: { userId: user.id, isRead: false } }) };
  }

  async markRead(id: string, user: AffairsUser) {
    const result = await this.prisma.affairsNotification.updateMany({ where: { id, userId: user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    if (result.count === 0) {
      const exists = await this.prisma.affairsNotification.count({ where: { id, userId: user.id } });
      if (!exists) throw new NotFoundException('الإشعار غير موجود.');
    }
    return this.unreadCount(user);
  }

  async markAllRead(user: AffairsUser) {
    await this.prisma.affairsNotification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return { unread: 0 };
  }
}
