import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateProjectDto } from './create-project.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string } {
    return this.appService.getHealth();
  }

  @Post('projects')
  createProject(@Body() createProjectDto: CreateProjectDto): { name: string } {
    return this.appService.createProject(createProjectDto.name);
  }
}
