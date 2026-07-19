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
import type { AuthenticatedSession } from '../session/session.types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './project.entity';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(SessionAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectEntity> {
    return this.projectsService.createProject(
      createProjectDto.name,
      session.userId,
    );
  }

  @Get()
  getProjects(
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.findAll(session.userId);
  }

  @Get(':id')
  getProject(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectEntity> {
    return this.projectsService.findOne(id, session.userId);
  }

  @Patch(':id')
  updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Session() session: AuthenticatedSession,
  ): Promise<ProjectEntity> {
    return this.projectsService.updateProject(
      id,
      updateProjectDto.name,
      session.userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: AuthenticatedSession,
  ): Promise<void> {
    return this.projectsService.deleteProject(id, session.userId);
  }
}
