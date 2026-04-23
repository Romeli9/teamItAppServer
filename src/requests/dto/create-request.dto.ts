import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  projectId!: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
