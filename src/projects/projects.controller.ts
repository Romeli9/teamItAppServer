import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  // List all projects OTHER than the caller's own, with optional filters.
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('categories') categories?: string | string[],
    @Query('required') required?: string | string[],
    @Query('status') status?: string,
  ) {
    return this.projects.list({
      excludeCreatorId: user.id,
      categories: toArr(categories),
      required: toArr(required),
      status,
    });
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.projects.listMine(user.id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.projects.getById(id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(id, user.id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projects.delete(id, user.id);
  }

  @Post(':id/members/:slot')
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('slot', ParseIntPipe) slot: number,
    @Body('userId') userId: string,
  ) {
    return this.projects.addMember(id, user.id, slot, userId);
  }

  @Delete(':id/members/:slot')
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('slot', ParseIntPipe) slot: number,
  ) {
    return this.projects.removeMember(id, user.id, slot);
  }
}

function toArr(v?: string | string[]): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}
