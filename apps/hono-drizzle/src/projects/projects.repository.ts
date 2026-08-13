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
