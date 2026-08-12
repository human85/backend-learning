import type { Project, ProjectsRepository } from './projects.repository.js';

export interface ProjectsService {
  create(name: string, ownerId: number): Promise<Project>;
  findAll(ownerId: number): Promise<Project[]>;
}

export function createProjectsService(
  projectsRepository: ProjectsRepository,
): ProjectsService {
  return {
    create(name, ownerId) {
      return projectsRepository.insert({ name, ownerId });
    },

    findAll(ownerId) {
      return projectsRepository.findByOwner(ownerId);
    },
  };
}
