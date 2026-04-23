import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  toUserId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsIn(['creator', 'member'])
  role!: 'creator' | 'member';

  // Creator → member scores
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) hardSkills?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) softSkills?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) deadlines?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) contribution?: number;

  // Member → creator scores
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) overall?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}
