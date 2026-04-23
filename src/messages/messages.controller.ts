import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
  ) {
    return this.messages.list(chatId, user.id);
  }

  @Post()
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.send(chatId, user.id, dto);
  }

  @Patch('read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
  ) {
    return this.messages.markRead(chatId, user.id);
  }
}
