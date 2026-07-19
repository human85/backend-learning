import { Injectable, NotFoundException } from '@nestjs/common';
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

  findOne(id: number): Project {
    return this.projects[this.findProjectIndex(id)];
  }

  updateProject(id: number, name: string): Project {
    const projectIndex = this.findProjectIndex(id);
    const updatedProject: Project = {
      ...this.projects[projectIndex],
      name,
    };

    this.projects[projectIndex] = updatedProject;

    return updatedProject;
  }

  deleteProject(id: number): void {
    const projectIndex = this.findProjectIndex(id);
    this.projects.splice(projectIndex, 1);
  }

  private findProjectIndex(id: number): number {
    const projectIndex = this.projects.findIndex((item) => item.id === id);

    if (projectIndex === -1) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return projectIndex;
  }
}
