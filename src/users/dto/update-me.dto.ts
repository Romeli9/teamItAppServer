import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsOptional() @IsString() userName?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() background?: string;
  @IsOptional() @IsString() aboutMe?: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() experience?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) roles?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() hardSkills?: unknown;
  @IsOptional() softSkills?: unknown;
  @IsOptional() strengths?: unknown;
}
