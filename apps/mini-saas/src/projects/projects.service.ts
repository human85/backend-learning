import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ProjectMemberEntity } from './project-member.entity';

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

  findAll(userId: number): Promise<ProjectEntity[]> {
    return this.readableProjects(userId).orderBy('project.id', 'ASC').getMany();
  }

  async findOne(id: number, userId: number): Promise<ProjectEntity> {
    const project = await this.readableProjects(userId)
      .andWhere('project.id = :id', { id })
      .getOne();

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
    const project = await this.findOwned(id, ownerId);
    // Keep the owner condition on the actual write too: ownership may have
    // changed after the lookup. Never save the stale ownerId back to the row.
    const result = await this.projectsRepository.update(
      { id, ownerId },
      { name },
    );
    if (result.affected !== 1) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return { ...project, name };
  }

  async deleteProject(id: number, ownerId: number): Promise<void> {
    const result = await this.projectsRepository.delete({ id, ownerId });

    if (!result.affected) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
  }

  private readableProjects(userId: number) {
    return this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin(
        ProjectMemberEntity,
        'membership',
        'membership.projectId = project.id AND membership.memberId = :userId',
        { userId },
      )
      .where('(project.ownerId = :userId OR membership.id IS NOT NULL)', {
        userId,
      });
  }

  private async findOwned(id: number, ownerId: number): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOneBy({ id, ownerId });
    if (!project)
      throw new NotFoundException(`Project with id ${id} not found`);
    return project;
  }
}
