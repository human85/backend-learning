import { Injectable } from '@nestjs/common';
import { Project } from './project.type';

@Injectable()
export class ProjectsService {
  private readonly projects: Project[] = [];
  private nextId = 1;

  createProject(name: string): Project {
    const project: Project = {
      id: this.nextId,
      name,
    };

    this.nextId += 1;
    this.projects.push(project);

    return project;
  }

  findAll(): Project[] {
    return [...this.projects];
  }
}
