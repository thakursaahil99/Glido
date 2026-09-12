import { Injectable } from "@nestjs/common";
import type { NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private realtime: RealtimeGateway) {}

  /** Creates a notification and pushes it over the socket if the user is connected. Fire-and-forget from callers. */
  async notify(userId: string, title: string, body: string, type: NotificationType = "SYSTEM") {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type },
    });
    this.realtime.emitNotification(userId, notification);
    return notification;
  }

  async listMine(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { message: "Marked as read." };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { message: "All notifications marked as read." };
  }
}
