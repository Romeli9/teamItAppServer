import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) required?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) members?: string[];
  @IsOptional() @IsString() photo?: string;
  @IsOptional() hardSkills?: unknown;
  @IsOptional() softSkills?: unknown;

  @IsOptional()
  @IsIn(['started', 'active', 'completed'])
  status?: string;
}
