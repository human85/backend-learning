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
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { type Project } from './project.type';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(@Body() createProjectDto: CreateProjectDto): Project {
    return this.projectsService.createProject(createProjectDto.name);
  }

  @Get()
  getProjects(): Project[] {
    return this.projectsService.findAll();
  }

  @Get(':id')
  getProject(@Param('id', ParseIntPipe) id: number): Project {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Project {
    return this.projectsService.updateProject(id, updateProjectDto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(@Param('id', ParseIntPipe) id: number): void {
    this.projectsService.deleteProject(id);
  }
}
