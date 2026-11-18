import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import type { AuthenticatedSession } from '../session/session.types';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import {
  ProjectCollaborationParamsDto,
  TransferProjectDto,
} from './dto/transfer-project.dto';
import { ProjectCollaborationService } from './project-collaboration.service';

@ApiTags('projects')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiBadRequestResponse({ description: 'Invalid ID or unexpected input' })
@ApiNotFoundResponse({
  description: 'Project not found or action not permitted',
})
@ApiParam({
  name: 'projectId',
  schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
})
@UseGuards(SessionAuthGuard)
@Controller('projects/:projectId')
export class ProjectCollaborationController {
  constructor(private readonly collaboration: ProjectCollaborationService) {}

  @Get('members')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ProjectMemberResponseDto, isArray: true })
  listMembers(
    @Param() params: ProjectCollaborationParamsDto,
    @Session() session: AuthenticatedSession,
    @Query() query: Record<string, unknown>,
  ): Promise<ProjectMemberResponseDto[]> {
    if (Object.keys(query).length > 0) {
      throw new BadRequestException('Query parameters are not supported');
    }
    return this.collaboration.listMembers(
      Number(params.projectId),
      session.userId,
    );
  }

  @Post('transfer')
  @HttpCode(204)
  @ApiServiceUnavailableResponse({ description: 'Project lock wait timed out' })
  @ApiNoContentResponse({
    description: 'Ownership transferred; previous owner is a member',
  })
  @ApiConflictResponse({
    description: 'Target is not a current member or is already owner',
  })
  transfer(
    @Param() params: ProjectCollaborationParamsDto,
    @Body() body: TransferProjectDto,
    @Session() session: AuthenticatedSession,
    @Query() query: Record<string, unknown>,
  ): Promise<void> {
    if (Object.keys(query).length)
      throw new BadRequestException('Query parameters are not supported');
    return this.collaboration.transfer(
      Number(params.projectId),
      body.memberId,
      session.userId,
    );
  }

  @Delete('members/me')
  @HttpCode(204)
  @ApiServiceUnavailableResponse({ description: 'Project lock wait timed out' })
  @ApiNoContentResponse({ description: 'Current member left the project' })
  @ApiConflictResponse({
    description: 'Owner must transfer ownership before leaving',
  })
  leave(
    @Param() params: ProjectCollaborationParamsDto,
    @Session() session: AuthenticatedSession,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ): Promise<void> {
    if (
      Object.keys(query).length ||
      (body !== undefined &&
        (body === null ||
          typeof body !== 'object' ||
          Array.isArray(body) ||
          Object.keys(body).length))
    ) {
      throw new BadRequestException(
        'Leaving does not accept body or query fields',
      );
    }
    return this.collaboration.leave(Number(params.projectId), session.userId);
  }
}
