import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
  ) {}

  async createProject(name: string): Promise<ProjectEntity> {
    const project = this.projectsRepository.create({ name });

    return this.projectsRepository.save(project);
  }

  findAll(): Promise<ProjectEntity[]> {
    return this.projectsRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOneBy({ id });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return project;
  }

  async updateProject(id: number, name: string): Promise<ProjectEntity> {
    const project = await this.findOne(id);

    return this.projectsRepository.save({ ...project, name });
  }

  async deleteProject(id: number): Promise<void> {
    const result = await this.projectsRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
  }
}
