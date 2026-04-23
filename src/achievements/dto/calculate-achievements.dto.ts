import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AchievementProjectDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() creatorId?: string;
  @IsOptional() @IsString() status?: string;
}

export class AchievementReviewDto {
  @IsOptional() @IsString() toUserId?: string;
  @IsOptional() @IsNumber() hardSkills?: number;
  @IsOptional() @IsString() comment?: string;
}

export class CalculateAchievementsDto {
  @IsString()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementProjectDto)
  projects!: AchievementProjectDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementReviewDto)
  reviews!: AchievementReviewDto[];
}
