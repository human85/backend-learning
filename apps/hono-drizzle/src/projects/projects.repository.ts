export type Project = {
  id: number;
  name: string;
  ownerId: number;
};

export type CreateProjectRecord = Omit<Project, 'id'>;

export interface ProjectsRepository {
  insert(project: CreateProjectRecord): Promise<Project>;
  findByOwner(ownerId: number): Promise<Project[]>;
}

export function createInMemoryProjectsRepository(): ProjectsRepository {
  const projects: Project[] = [];
  let nextId = 1;

  return {
    async insert(project) {
      const savedProject = { id: nextId++, ...project };
      projects.push(savedProject);
      return savedProject;
    },

    async findByOwner(ownerId) {
      return projects.filter((project) => project.ownerId === ownerId);
    },
  };
}
