import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import type { AuthenticatedSession } from '../session/session.types';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { InvitationIdParamsDto } from './dto/invitation-id-params.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@UseGuards(SessionAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post(':invitationId/reject')
  @HttpCode(204)
  @ApiParam({
    name: 'invitationId',
    schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
  })
  @ApiNoContentResponse({ description: 'Invitation rejected' })
  @ApiBadRequestResponse({ description: 'Invalid ID or unexpected input' })
  @ApiNotFoundResponse({ description: 'Invitation not found for current user' })
  @ApiConflictResponse({ description: 'Invitation is no longer pending' })
  @ApiServiceUnavailableResponse({ description: 'Project lock wait timed out' })
  reject(
    @Param() params: InvitationIdParamsDto,
    @Session() session: AuthenticatedSession,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ): Promise<void> {
    this.assertNoActionInput(query, body);
    return this.invitationsService.rejectInvitation(
      Number(params.invitationId),
      session.userId,
    );
  }

  @Post(':invitationId/accept')
  @HttpCode(200)
  @ApiParam({
    name: 'invitationId',
    schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
  })
  @ApiOkResponse({ type: InvitationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid ID or unexpected input' })
  @ApiNotFoundResponse({ description: 'Invitation not found for current user' })
  @ApiConflictResponse({ description: 'Invitation used or no longer pending' })
  @ApiServiceUnavailableResponse({ description: 'Project lock wait timed out' })
  accept(
    @Param() params: InvitationIdParamsDto,
    @Session() session: AuthenticatedSession,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ): Promise<InvitationResponseDto> {
    this.assertNoActionInput(query, body);
    return this.invitationsService.acceptInvitation(
      Number(params.invitationId),
      session.userId,
    );
  }

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

  private assertNoActionInput(
    query: Record<string, unknown>,
    body: unknown,
  ): void {
    if (
      Object.keys(query).length > 0 ||
      (body !== undefined &&
        (body === null ||
          typeof body !== 'object' ||
          Array.isArray(body) ||
          Object.keys(body).length > 0))
    ) {
      throw new BadRequestException(
        'Invitation action does not accept body or query fields',
      );
    }
  }
}
