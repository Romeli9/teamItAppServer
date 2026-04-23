import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('reviews')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Get('users/:id/reviews')
  listForUser(@Param('id') userId: string) {
    return this.reviews.listForUser(userId);
  }
}
