import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('q') q?: string, @Query('roles') roles?: string | string[]) {
    const rolesArr = Array.isArray(roles) ? roles : roles ? [roles] : undefined;
    return this.users.list(q, rolesArr);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.users.getById(id);
  }
}
