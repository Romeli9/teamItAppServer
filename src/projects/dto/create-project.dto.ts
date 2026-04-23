import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString() name!: string;
  @IsString() description!: string;

  @IsArray() @IsString({ each: true }) required!: string[];
  @IsArray() @IsString({ each: true }) categories!: string[];

  // Parallel to `required`: '-' means vacant slot, otherwise a userId.
  @IsOptional() @IsArray() @IsString({ each: true }) members?: string[];

  @IsOptional() @IsString() photo?: string;

  // Keep as free-form JSON so the mobile client can pass through Skill[]
  // (from emsiApi) without the server having to model it strictly.
  @IsOptional() hardSkills?: unknown;
  @IsOptional() softSkills?: unknown;
}
