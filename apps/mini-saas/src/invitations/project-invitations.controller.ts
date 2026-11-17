import {
  Body,
  Controller,
  Param,
  Post,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import type { AuthenticatedSession } from '../session/session.types';
import {
  CreateInvitationDto,
  InvitationProjectParamsDto,
} from './dto/create-invitation.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@UseGuards(SessionAuthGuard)
@Controller('projects/:projectId/invitations')
export class ProjectInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiParam({
    name: 'projectId',
    schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
  })
  @ApiCreatedResponse({ type: InvitationResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid project ID or invitation input',
  })
  @ApiNotFoundResponse({
    description: 'Project not owned or invitee not found',
  })
  @ApiConflictResponse({
    description: 'Owner, existing member or pending invitation',
  })
  @ApiServiceUnavailableResponse({ description: 'Project lock wait timed out' })
  createInvitation(
    @Param() params: InvitationProjectParamsDto,
    @Body() body: CreateInvitationDto,
    @Session() session: AuthenticatedSession,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.createInvitation(
      Number(params.projectId),
      body.inviteeId,
      session.userId,
    );
  }
}
