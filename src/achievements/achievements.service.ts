import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  AchievementProjectDto,
  AchievementReviewDto,
  CalculateAchievementsDto,
} from './dto/calculate-achievements.dto';

type Rule =
  | { and: Rule[] }
  | { or: Rule[] }
  | { metric: keyof Metrics; operator: string; value: number };

interface Metrics {
  avgRating: number;
  completedProjects: number;
  positiveComments: number;
}

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(dto: CalculateAchievementsDto) {
    const defs = await this.prisma.achievement.findMany();
    const metrics = this.buildMetrics(dto.userId, dto.projects, dto.reviews);
    const matched = defs.filter((a) => this.checkRule(a.rule as unknown as Rule, metrics));
    return { achievements: matched };
  }

  private buildMetrics(
    userId: string,
    projects: AchievementProjectDto[],
    reviews: AchievementReviewDto[],
  ): Metrics {
    const userReviews = reviews.filter((r) => r.toUserId === userId);
    const authored = projects.filter((p) => p.creatorId === userId);
    const completed = authored.filter((p) => p.status === 'completed');

    const avgRating = userReviews.length
      ? userReviews.reduce((s, r) => s + (r.hardSkills ?? 0), 0) / userReviews.length
      : 0;

    return {
      avgRating,
      completedProjects: completed.length,
      positiveComments: userReviews.filter((r) =>
        (r.comment ?? '').toLowerCase().includes('спасибо'),
      ).length,
    };
  }

  private checkRule(rule: Rule | null | undefined, metrics: Metrics): boolean {
    if (!rule) return false;
    if ('and' in rule) return rule.and.every((r) => this.checkRule(r, metrics));
    if ('or' in rule) return rule.or.some((r) => this.checkRule(r, metrics));

    const left = metrics[rule.metric];
    const right = rule.value;

    switch (rule.operator) {
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '>':  return left > right;
      case '<':  return left < right;
      case '==': return left === right;
      case '!=': return left !== right;
      default:   return false;
    }
  }
}
