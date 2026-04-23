import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Chat } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type SerializedChat = {
  id: string;
  projectId: string | null;
  name: string;
  image: string | null;
  group: boolean;
  participants: string[];
  lastMessage: string | null;
  lastMessageAuthorId: string | null;
  time: number; // epoch ms (lastMessageAt ?? createdAt) for client compat
  createdAt: string;
};

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async listForUser(userId: string): Promise<SerializedChat[]> {
    const chats = await this.prisma.chat.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: { select: { userId: true } } },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
    return chats.map((c) => this.serialize(c));
  }

  async getById(id: string, userId: string): Promise<SerializedChat> {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: { participants: { select: { userId: true } } },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (!chat.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('Not a participant');
    }
    return this.serialize(chat);
  }

  async createForProject(params: {
    projectId: string;
    name: string;
    image?: string | null;
    creatorId: string;
  }): Promise<Chat> {
    const chat = await this.prisma.chat.create({
      data: {
        projectId: params.projectId,
        name: params.name,
        image: params.image,
        group: true,
        participants: { create: { userId: params.creatorId } },
        lastMessage: 'Чат создан',
        lastMessageAt: new Date(),
      },
    });
    return chat;
  }

  async addParticipant(chatId: string, userId: string): Promise<void> {
    await this.prisma.chatParticipant.upsert({
      where: { chatId_userId: { chatId, userId } },
      update: {},
      create: { chatId, userId },
    });
    this.emitChatUpdated(chatId);
  }

  async findChatIdForProject(projectId: string): Promise<string | null> {
    const chat = await this.prisma.chat.findFirst({
      where: { projectId },
      select: { id: true },
    });
    return chat?.id ?? null;
  }

  async emitChatUpdated(chatId: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: { select: { userId: true } } },
    });
    if (!chat) return;
    const serialized = this.serialize(chat);
    for (const p of chat.participants) {
      this.realtime.emitToUser(p.userId, 'chat:updated', serialized);
    }
  }

  private serialize(
    c: Chat & { participants: { userId: string }[] },
  ): SerializedChat {
    return {
      id: c.id,
      projectId: c.projectId,
      name: c.name,
      image: c.image,
      group: c.group,
      participants: c.participants.map((p) => p.userId),
      lastMessage: c.lastMessage,
      lastMessageAuthorId: c.lastMessageAuthorId,
      time: (c.lastMessageAt ?? c.createdAt).getTime(),
      createdAt: c.createdAt.toISOString(),
    };
  }
}
