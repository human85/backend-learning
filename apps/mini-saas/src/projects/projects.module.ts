import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ProjectEntity } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectCollaborationController } from './project-collaboration.controller';
import { ProjectCollaborationService } from './project-collaboration.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  controllers: [ProjectsController, ProjectCollaborationController],
  providers: [ProjectsService, ProjectCollaborationService, SessionAuthGuard],
})
export class ProjectsModule {}
