import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Session as SessionDecorator,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import type { AppSession } from '../session/session.types';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PublicUser } from './public-user.type';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<PublicUser> {
    return this.authService.register(registerDto.email, registerDto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<PublicUser> {
    const user = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    await this.authSessionService.start(request, user.id);

    return user;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@SessionDecorator() session: AppSession): Promise<PublicUser> {
    return this.authService.getCurrentUser(session.userId as number);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authSessionService.end(request);
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }
}
