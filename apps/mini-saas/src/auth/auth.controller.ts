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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import type { AppSession } from '../session/session.types';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionAuthGuard } from './session-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  @Post('register')
  @ApiCreatedResponse({ type: PublicUserDto })
  @ApiBadRequestResponse({ description: 'Invalid registration input' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  register(@Body() registerDto: RegisterDto): Promise<PublicUserDto> {
    return this.authService.register(registerDto.email, registerDto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PublicUserDto })
  @ApiBadRequestResponse({ description: 'Invalid login input' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<PublicUserDto> {
    const user = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    await this.authSessionService.start(request, user.id);

    return user;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth(SESSION_COOKIE_NAME)
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  me(@SessionDecorator() session: AppSession): Promise<PublicUserDto> {
    return this.authService.getCurrentUser(session.userId as number);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth(SESSION_COOKIE_NAME)
  @ApiNoContentResponse({ description: 'Session destroyed' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authSessionService.end(request);
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }
}
