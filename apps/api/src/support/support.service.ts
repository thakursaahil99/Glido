import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  async myMessages(userId: string) {
    const messages = await this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    await this.prisma.supportMessage.updateMany({
      where: { userId, senderRole: "ADMIN", isRead: false },
      data: { isRead: true },
    });
    return messages;
  }

  async sendAsCustomer(userId: string, message: string) {
    const created = await this.prisma.supportMessage.create({
      data: { userId, senderRole: "CUSTOMER", message },
    });
    this.realtime.emitSupportMessage(userId, created);
    return created;
  }

  /** Conversation list for the admin support inbox — one row per customer who has messaged in. */
  async adminListConversations() {
    const grouped = await this.prisma.supportMessage.groupBy({ by: ["userId"] });

    const conversations = await Promise.all(
      grouped.map(async ({ userId }) => {
        const [user, lastMessage, unreadCount] = await Promise.all([
          this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true } }),
          this.prisma.supportMessage.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
          this.prisma.supportMessage.count({ where: { userId, senderRole: "CUSTOMER", isRead: false } }),
        ]);
        return { user, lastMessage, unreadCount };
      }),
    );

    return conversations.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async adminConversation(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true } });
    if (!user) throw new NotFoundException("User not found.");

    const messages = await this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    await this.prisma.supportMessage.updateMany({
      where: { userId, senderRole: "CUSTOMER", isRead: false },
      data: { isRead: true },
    });
    return { user, messages };
  }

  async sendAsAdmin(userId: string, message: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found.");

    const created = await this.prisma.supportMessage.create({
      data: { userId, senderRole: "ADMIN", message, isRead: true },
    });
    this.realtime.emitSupportMessage(userId, created);
    this.notifications.notify(userId, "New message from Glido Support", message.slice(0, 120), "SYSTEM");
    return created;
  }
}
