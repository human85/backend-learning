import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectEntity } from './project.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let projectsService: ProjectsService;
  const projectsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
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
    projectsRepository.find.mockResolvedValue([]);

    await expect(projectsService.findAll()).resolves.toEqual([]);
    expect(projectsRepository.find).toHaveBeenCalledWith({
      order: { id: 'ASC' },
    });
  });

  it('should create and save a project', async () => {
    const unsavedProject = { name: 'My Project' };
    const savedProject = { id: 1, name: 'My Project' };
    projectsRepository.create.mockReturnValue(unsavedProject);
    projectsRepository.save.mockResolvedValue(savedProject);

    await expect(projectsService.createProject('My Project')).resolves.toEqual(
      savedProject,
    );
    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'My Project',
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(unsavedProject);
  });

  it('should find a project by id', async () => {
    const project = { id: 1, name: 'My Project' };
    projectsRepository.findOneBy.mockResolvedValue(project);

    await expect(projectsService.findOne(1)).resolves.toEqual(project);
    expect(projectsRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('should throw when a project does not exist', async () => {
    projectsRepository.findOneBy.mockResolvedValue(null);

    await expect(projectsService.findOne(999)).rejects.toEqual(
      new NotFoundException('Project with id 999 not found'),
    );
  });

  it('should update an existing project', async () => {
    projectsRepository.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Old Name',
    });
    projectsRepository.save.mockResolvedValue({
      id: 1,
      name: 'New Name',
    });

    await expect(projectsService.updateProject(1, 'New Name')).resolves.toEqual(
      {
        id: 1,
        name: 'New Name',
      },
    );
    expect(projectsRepository.save).toHaveBeenCalledWith({
      id: 1,
      name: 'New Name',
    });
  });

  it('should throw when updating a missing project', async () => {
    projectsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      projectsService.updateProject(999, 'New Name'),
    ).rejects.toEqual(new NotFoundException('Project with id 999 not found'));
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('should delete an existing project', async () => {
    projectsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(projectsService.deleteProject(1)).resolves.toBeUndefined();
    expect(projectsRepository.delete).toHaveBeenCalledWith(1);
  });

  it('should throw when deleting a missing project', async () => {
    projectsRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(projectsService.deleteProject(999)).rejects.toEqual(
      new NotFoundException('Project with id 999 not found'),
    );
  });
});
