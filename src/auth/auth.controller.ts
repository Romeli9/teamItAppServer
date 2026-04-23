import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser) {
    return this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        id: true,
        email: true,
        userName: true,
        avatar: true,
        background: true,
        aboutMe: true,
        telegram: true,
        experience: true,
        roles: true,
        skills: true,
        hardSkills: true,
        softSkills: true,
        strengths: true,
        rating: true,
        reviewsCount: true,
        avgRating: true,
        completedProjects: true,
      },
    });
  }
}
