import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRequest } from '@prisma/client';

import { ChatsService } from '../chats/chats.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';

const requestInclude = {
  project: { select: { id: true, name: true, creatorId: true } },
  fromUser: { select: { id: true, userName: true, avatar: true } },
} as const;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly chats: ChatsService,
  ) {}

  async create(fromUserId: string, dto: CreateRequestDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.creatorId === fromUserId) {
      throw new ConflictException('Cannot apply to your own project');
    }
    if (!project.required.includes(dto.role)) {
      throw new NotFoundException('Role not declared on this project');
    }
    const existing = await this.prisma.projectRequest.findFirst({
      where: {
        projectId: dto.projectId,
        fromUserId,
        role: dto.role,
        status: 'pending',
      },
    });
    if (existing) {
      throw new ConflictException('You already have a pending request for this role');
    }

    const request = await this.prisma.projectRequest.create({
      data: {
        projectId: dto.projectId,
        fromUserId,
        toUserId: project.creatorId,
        role: dto.role,
        message: dto.message,
        status: 'pending',
      },
      include: requestInclude,
    });

    await this.notifications.create({
      userId: project.creatorId,
      type: 'request_new',
      projectId: project.id,
      fromUserId,
      payload: { requestId: request.id, role: dto.role },
    });

    return request;
  }

  async listIncoming(toUserId: string, projectId?: string) {
    return this.prisma.projectRequest.findMany({
      where: { toUserId, projectId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: requestInclude,
    });
  }

  async listOutgoing(fromUserId: string) {
    return this.prisma.projectRequest.findMany({
      where: { fromUserId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: requestInclude,
    });
  }

  async accept(id: string, requesterId: string) {
    const request = await this.assertRecipient(id, requesterId);
    const project = await this.prisma.project.findUnique({
      where: { id: request.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const slot = project.required.indexOf(request.role);
    if (slot === -1) {
      throw new NotFoundException('Role no longer exists on project');
    }

    const members = [...project.members];
    // Pad members array if somehow shorter than required (defensive).
    while (members.length < project.required.length) members.push('-');
    members[slot] = request.fromUserId;

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: project.id },
        data: { members },
      }),
      this.prisma.projectRequest.update({
        where: { id },
        data: { status: 'accepted' },
      }),
    ]);

    const chatId = await this.chats.findChatIdForProject(project.id);
    if (chatId) {
      await this.chats.addParticipant(chatId, request.fromUserId);
    }

    await this.notifications.create({
      userId: request.fromUserId,
      type: 'request_accepted',
      projectId: project.id,
      fromUserId: requesterId,
      payload: { role: request.role },
    });

    return this.prisma.projectRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
  }

  async reject(id: string, requesterId: string) {
    const request = await this.assertRecipient(id, requesterId);
    const updated = await this.prisma.projectRequest.update({
      where: { id },
      data: { status: 'rejected' },
      include: requestInclude,
    });

    await this.notifications.create({
      userId: request.fromUserId,
      type: 'request_rejected',
      projectId: request.projectId,
      fromUserId: requesterId,
      payload: { role: request.role },
    });

    return updated;
  }

  async cancel(id: string, senderId: string) {
    const request = await this.prisma.projectRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.fromUserId !== senderId) {
      throw new ForbiddenException('Not your request');
    }
    await this.prisma.projectRequest.delete({ where: { id } });
    return { id };
  }

  private async assertRecipient(
    id: string,
    recipientId: string,
  ): Promise<ProjectRequest> {
    const request = await this.prisma.projectRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.toUserId !== recipientId) {
      throw new ForbiddenException('Not the recipient of this request');
    }
    return request;
  }
}
