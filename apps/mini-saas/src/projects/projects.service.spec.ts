import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectEntity } from './project.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const ownerId = 10;
  let projectsService: ProjectsService;
  const readableQuery = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  const projectsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(readableQuery),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: projectsRepository,
        },
      ],
    }).compile();

    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  it('should return an empty project list', async () => {
    readableQuery.getMany.mockResolvedValue([]);

    await expect(projectsService.findAll(ownerId)).resolves.toEqual([]);
  });

  it('should create and save a project', async () => {
    const unsavedProject = { name: 'My Project', ownerId };
    const savedProject = { id: 1, name: 'My Project', ownerId };
    projectsRepository.create.mockReturnValue(unsavedProject);
    projectsRepository.save.mockResolvedValue(savedProject);

    await expect(
      projectsService.createProject('My Project', ownerId),
    ).resolves.toEqual(savedProject);
    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'My Project',
      ownerId,
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(unsavedProject);
  });

  it('should find a project by id', async () => {
    const project = { id: 1, name: 'My Project', ownerId };
    readableQuery.getOne.mockResolvedValue(project);

    await expect(projectsService.findOne(1, ownerId)).resolves.toEqual(project);
  });

  it('should throw when a project is missing or belongs to another user', async () => {
    readableQuery.getOne.mockResolvedValue(null);

    await expect(projectsService.findOne(999, ownerId)).rejects.toEqual(
      new NotFoundException('Project with id 999 not found'),
    );
  });

  it('should update an existing project', async () => {
    projectsRepository.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Old Name',
      ownerId,
    });
    projectsRepository.update.mockResolvedValue({ affected: 1 });

    await expect(
      projectsService.updateProject(1, 'New Name', ownerId),
    ).resolves.toEqual({
      id: 1,
      name: 'New Name',
      ownerId,
    });
    expect(projectsRepository.findOneBy).toHaveBeenCalledWith({
      id: 1,
      ownerId,
    });
    expect(projectsRepository.update).toHaveBeenCalledWith(
      { id: 1, ownerId },
      { name: 'New Name' },
    );
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('should throw when updating a missing project', async () => {
    projectsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      projectsService.updateProject(999, 'New Name', ownerId),
    ).rejects.toEqual(new NotFoundException('Project with id 999 not found'));
    expect(projectsRepository.update).not.toHaveBeenCalled();
  });

  it('does not use a readable project to authorize updates by a member', async () => {
    readableQuery.getOne.mockResolvedValue({
      id: 1,
      name: 'Readable',
      ownerId: 20,
    });
    projectsRepository.findOneBy.mockResolvedValue(null);
    await expect(
      projectsService.updateProject(1, 'Changed', ownerId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(readableQuery.getOne).not.toHaveBeenCalled();
    expect(projectsRepository.update).not.toHaveBeenCalled();
  });

  it('rejects an update if ownership changes after the owner lookup', async () => {
    projectsRepository.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Old',
      ownerId,
    });
    projectsRepository.update.mockResolvedValue({ affected: 0 });
    await expect(
      projectsService.updateProject(1, 'Changed', ownerId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(projectsRepository.update).toHaveBeenCalledWith(
      { id: 1, ownerId },
      { name: 'Changed' },
    );
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('should delete an existing project', async () => {
    projectsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(
      projectsService.deleteProject(1, ownerId),
    ).resolves.toBeUndefined();
    expect(projectsRepository.delete).toHaveBeenCalledWith({ id: 1, ownerId });
  });

  it('should throw when deleting a missing project', async () => {
    projectsRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(projectsService.deleteProject(999, ownerId)).rejects.toEqual(
      new NotFoundException('Project with id 999 not found'),
    );
  });
});
