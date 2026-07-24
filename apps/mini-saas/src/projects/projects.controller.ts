import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedSession } from '../session/session.types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SESSION_COOKIE_NAME } from '../session/session.constants';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@Controller('projects')
@UseGuards(SessionAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid project input' })
  createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.createProject(
      createProjectDto.name,
      session.userId,
    );
  }

  @Get()
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  getProjects(
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAll(session.userId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Project ID must be an integer' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProject(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, session.userId);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid project ID or input' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.updateProject(
      id,
      updateProjectDto.name,
      session.userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiBadRequestResponse({ description: 'Project ID must be an integer' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  deleteProject(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: AuthenticatedSession,
  ): Promise<void> {
    return this.projectsService.deleteProject(id, session.userId);
  }
}
