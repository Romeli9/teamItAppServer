import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

const publicSelect = {
  id: true,
  email: true,
  userName: true,
  avatar: true,
  background: true,
  aboutMe: true,
  telegram: true,
  experience: true,
  roles: true,
  skills: true,
  hardSkills: true,
  softSkills: true,
  strengths: true,
  rating: true,
  reviewsCount: true,
  avgRating: true,
  completedProjects: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q?: string, roles?: string[]) {
    const where: Prisma.UserWhereInput = {};
    if (q) where.userName = { contains: q, mode: 'insensitive' };
    if (roles?.length) where.roles = { hasSome: roles };
    return this.prisma.user.findMany({ where, select: publicSelect });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    const data: Prisma.UserUpdateInput = {};
    if (dto.userName !== undefined) data.userName = dto.userName;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.background !== undefined) data.background = dto.background;
    if (dto.aboutMe !== undefined) data.aboutMe = dto.aboutMe;
    if (dto.telegram !== undefined) data.telegram = dto.telegram;
    if (dto.experience !== undefined) data.experience = dto.experience;
    if (dto.roles !== undefined) data.roles = dto.roles;
    if (dto.skills !== undefined) data.skills = dto.skills;
    if (dto.hardSkills !== undefined) data.hardSkills = toJsonInput(dto.hardSkills);
    if (dto.softSkills !== undefined) data.softSkills = toJsonInput(dto.softSkills);
    if (dto.strengths !== undefined) data.strengths = toJsonInput(dto.strengths);

    return this.prisma.user.update({
      where: { id },
      data,
      select: publicSelect,
    });
  }
}
