import { Controller, Get, Param } from '@nestjs/common';

import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatsService } from './chats.service';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chats.listForUser(user.id);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.chats.getById(id, user.id);
  }
}
