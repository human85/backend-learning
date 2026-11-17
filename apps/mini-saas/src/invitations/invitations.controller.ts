import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Query,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import type { AuthenticatedSession } from '../session/session.types';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@UseGuards(SessionAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: InvitationResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Query parameters are not supported' })
  listReceived(
    @Query() query: Record<string, unknown>,
    @Session() session: AuthenticatedSession,
  ): Promise<InvitationResponseDto[]> {
    if (Object.keys(query).length > 0) {
      throw new BadRequestException('Query parameters are not supported');
    }
    return this.invitationsService.listReceived(session.userId);
  }
}
