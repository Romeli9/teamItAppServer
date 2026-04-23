import { Body, Controller, Post } from '@nestjs/common';

import { AchievementsService } from './achievements.service';
import { CalculateAchievementsDto } from './dto/calculate-achievements.dto';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculateAchievementsDto) {
    return this.achievements.calculate(dto);
  }
}
