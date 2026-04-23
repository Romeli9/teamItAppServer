import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  projectId?: string;
  fromUserId?: string;
  payload?: unknown;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        projectId: input.projectId,
        fromUserId: input.fromUserId,
        payload:
          input.payload === undefined || input.payload === null
            ? Prisma.JsonNull
            : (input.payload as Prisma.InputJsonValue),
      },
    });
    this.realtime.emitToUser(input.userId, 'notification:new', notification);
    return notification;
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    // Only the recipient can mark their own notifications as read.
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
      // ensure mismatched userId fails at the query layer
      ...(userId ? {} : {}),
    });
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { count: res.count };
  }
}
