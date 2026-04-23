import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Review } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(fromUserId: string, dto: CreateReviewDto): Promise<Review> {
    if (fromUserId === dto.toUserId) {
      throw new ConflictException('Cannot review yourself');
    }
    const review = await this.prisma.review.create({
      data: {
        fromUserId,
        toUserId: dto.toUserId,
        projectId: dto.projectId,
        role: dto.role,
        hardSkills: dto.hardSkills,
        softSkills: dto.softSkills,
        deadlines: dto.deadlines,
        contribution: dto.contribution,
        overall: dto.overall,
        strengths: dto.strengths ?? [],
        comment: dto.comment,
      },
    });

    await this.recomputeUserReputation(dto.toUserId);

    await this.notifications.create({
      userId: dto.toUserId,
      type: 'review_received',
      projectId: dto.projectId,
      fromUserId,
      payload: { reviewId: review.id, role: dto.role },
    });

    return review;
  }

  async listForUser(userId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async recomputeUserReputation(userId: string) {
    const reviews = await this.prisma.review.findMany({ where: { toUserId: userId } });

    let sum = 0;
    let count = 0;
    const strengthsCount: Record<string, number> = {};

    for (const r of reviews) {
      const scores = [r.hardSkills, r.softSkills, r.deadlines, r.contribution, r.overall].filter(
        (v): v is number => v !== null && v !== undefined,
      );
      sum += scores.reduce((a, b) => a + b, 0);
      count += scores.length;
      for (const s of r.strengths) strengthsCount[s] = (strengthsCount[s] ?? 0) + 1;
    }

    const rating = count > 0 ? sum / count : 0;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        rating,
        reviewsCount: reviews.length,
        strengths: strengthsCount as Prisma.InputJsonValue,
      },
    });
  }
}
