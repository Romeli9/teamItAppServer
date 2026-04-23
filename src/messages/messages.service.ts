import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Message, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SendMessageDto } from './dto/send-message.dto';

type SerializedMessage = {
  id: string;
  chatId: string;
  authorId: string;
  message: string;
  attachments: unknown;
  isRead: boolean;
  readBy: string[];
  status: 'sent';
  createdAt: string; // ISO — client formats via Intl.DateTimeFormat
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(chatId: string, requesterId: string) {
    await this.assertParticipant(chatId, requesterId);
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });
    return messages.map((m) => this.serialize(m, chatId));
  }

  async send(chatId: string, senderId: string, dto: SendMessageDto) {
    await this.assertParticipant(chatId, senderId);
    if (!dto.text?.trim() && !dto.attachments?.length) {
      throw new BadRequestException('Message must have text or attachments');
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        text: dto.text ?? null,
        attachments:
          dto.attachments && dto.attachments.length
            ? (dto.attachments as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });

    const lastPreview = dto.text?.trim() || '[вложение]';
    await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessage: lastPreview,
        lastMessageAuthorId: senderId,
        lastMessageAt: message.createdAt,
      },
    });

    const serialized = this.serialize(message, chatId);

    const participants = await this.prisma.chatParticipant.findMany({
      where: { chatId },
      select: { userId: true },
    });
    for (const p of participants) {
      this.realtime.emitToUser(p.userId, 'message:new', serialized);
      this.realtime.emitToUser(p.userId, 'chat:updated', {
        id: chatId,
        lastMessage: lastPreview,
        lastMessageAuthorId: senderId,
        time: message.createdAt.getTime(),
      });
    }

    return serialized;
  }

  async markRead(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);
    // Add userId to readBy[] for every message in the chat that isn't
    // already marked read by this user AND wasn't authored by them.
    await this.prisma.$executeRaw`
      UPDATE "Message"
      SET "readBy" = array_append("readBy", ${userId})
      WHERE "chatId" = ${chatId}
        AND "senderId" != ${userId}
        AND NOT (${userId} = ANY("readBy"))
    `;

    const participants = await this.prisma.chatParticipant.findMany({
      where: { chatId },
      select: { userId: true },
    });
    for (const p of participants) {
      this.realtime.emitToUser(p.userId, 'message:read', { chatId, userId });
    }
    return { ok: true };
  }

  private async assertParticipant(chatId: string, userId: string): Promise<void> {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) {
      const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat) throw new NotFoundException('Chat not found');
      throw new ForbiddenException('Not a participant');
    }
  }

  private serialize(m: Message, chatId: string): SerializedMessage {
    // isRead on the wire = "read by at least one other participant".
    // The sender is implicitly considered to have read their own message.
    const othersReadCount = m.readBy.filter((uid) => uid !== m.senderId).length;
    return {
      id: m.id,
      chatId,
      authorId: m.senderId,
      message: m.text ?? '',
      attachments: m.attachments,
      isRead: othersReadCount > 0,
      readBy: m.readBy,
      status: 'sent',
      createdAt: m.createdAt.toISOString(),
    };
  }
}
