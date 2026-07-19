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

  async createProject(name: string, ownerId: number): Promise<ProjectEntity> {
    const project = this.projectsRepository.create({ name, ownerId });

    return this.projectsRepository.save(project);
  }

  findAll(ownerId: number): Promise<ProjectEntity[]> {
    return this.projectsRepository.find({
      where: { ownerId },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number, ownerId: number): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOneBy({ id, ownerId });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return project;
  }

  async updateProject(
    id: number,
    name: string,
    ownerId: number,
  ): Promise<ProjectEntity> {
    const project = await this.findOne(id, ownerId);

    return this.projectsRepository.save({ ...project, name });
  }

  async deleteProject(id: number, ownerId: number): Promise<void> {
    const result = await this.projectsRepository.delete({ id, ownerId });

    if (!result.affected) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
  }
}
