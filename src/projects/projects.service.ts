import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';

import { ChatsService } from '../chats/chats.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

type SerializedProject = Omit<Project, 'hardSkills' | 'softSkills'> & {
  creator: string;
  hardSkills: unknown;
  softSkills: unknown;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly chats: ChatsService,
  ) {}

  async list(opts: {
    excludeCreatorId?: string;
    categories?: string[];
    required?: string[];
    status?: string;
  }): Promise<SerializedProject[]> {
    const where: Prisma.ProjectWhereInput = {};
    if (opts.excludeCreatorId) where.creatorId = { not: opts.excludeCreatorId };
    if (opts.categories?.length) where.categories = { hasSome: opts.categories };
    if (opts.required?.length) where.required = { hasSome: opts.required };
    if (opts.status) where.status = opts.status;

    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { userName: true } } },
    });
    return projects.map((p) => this.serialize(p));
  }

  async listMine(userId: string): Promise<SerializedProject[]> {
    const projects = await this.prisma.project.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { userName: true } } },
    });
    return projects.map((p) => this.serialize(p));
  }

  async getById(id: string): Promise<SerializedProject> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { creator: { select: { userName: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.serialize(project);
  }

  async create(creatorId: string, dto: CreateProjectDto): Promise<SerializedProject> {
    // Default members array: one '-' slot per required role.
    const members = dto.members ?? dto.required.map(() => '-');

    const project = await this.prisma.project.create({
      data: {
        creatorId,
        name: dto.name,
        description: dto.description,
        required: dto.required,
        categories: dto.categories,
        members,
        photo: dto.photo,
        hardSkills: toJsonInput(dto.hardSkills),
        softSkills: toJsonInput(dto.softSkills),
      },
      include: { creator: { select: { userName: true } } },
    });

    // Auto-create a group chat for the project. Participants grow as
    // requests are accepted (RequestsService.accept adds to ChatParticipant).
    await this.chats.createForProject({
      projectId: project.id,
      name: project.name,
      image: project.photo,
      creatorId,
    });

    return this.serialize(project);
  }

  async update(
    id: string,
    requesterId: string,
    dto: UpdateProjectDto,
  ): Promise<SerializedProject> {
    await this.assertOwner(id, requesterId);

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.required !== undefined) data.required = dto.required;
    if (dto.categories !== undefined) data.categories = dto.categories;
    if (dto.members !== undefined) data.members = dto.members;
    if (dto.photo !== undefined) data.photo = dto.photo;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.hardSkills !== undefined) data.hardSkills = toJsonInput(dto.hardSkills);
    if (dto.softSkills !== undefined) data.softSkills = toJsonInput(dto.softSkills);

    const project = await this.prisma.project.update({
      where: { id },
      data,
      include: { creator: { select: { userName: true } } },
    });

    // When a project flips to 'completed' for the first time, notify every
    // participant (members excluding vacant '-' slots and the creator) so
    // they can leave a review.
    if (dto.status === 'completed') {
      const participants = project.members.filter(
        (m) => m !== '-' && m !== project.creatorId,
      );
      await Promise.all(
        participants.map((memberId) =>
          this.notifications.create({
            userId: memberId,
            type: 'review_invite',
            projectId: project.id,
            fromUserId: project.creatorId,
            payload: { projectName: project.name },
          }),
        ),
      );
    }

    return this.serialize(project);
  }

  async delete(id: string, requesterId: string): Promise<{ id: string }> {
    await this.assertOwner(id, requesterId);
    // Cascade deletes cover requests, chats, messages (via chat cascade),
    // reviews (nullable). See prisma/schema.prisma Project relations.
    await this.prisma.project.delete({ where: { id } });
    return { id };
  }

  async addMember(
    id: string,
    requesterId: string,
    slotIndex: number,
    userId: string,
  ): Promise<SerializedProject> {
    const project = await this.assertOwner(id, requesterId);
    if (slotIndex < 0 || slotIndex >= project.members.length) {
      throw new NotFoundException('Slot index out of range');
    }
    const members = [...project.members];
    members[slotIndex] = userId;
    return this.update(id, requesterId, { members });
  }

  async removeMember(
    id: string,
    requesterId: string,
    slotIndex: number,
  ): Promise<SerializedProject> {
    const project = await this.assertOwner(id, requesterId);
    if (slotIndex < 0 || slotIndex >= project.members.length) {
      throw new NotFoundException('Slot index out of range');
    }
    const members = [...project.members];
    members[slotIndex] = '-';
    return this.update(id, requesterId, { members });
  }

  private async assertOwner(id: string, requesterId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.creatorId !== requesterId) {
      throw new ForbiddenException('Not the project creator');
    }
    return project;
  }

  private serialize(
    p: Project & { creator: { userName: string } },
  ): SerializedProject {
    const { creator, ...rest } = p;
    return { ...rest, creator: creator.userName };
  }
}

function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}
