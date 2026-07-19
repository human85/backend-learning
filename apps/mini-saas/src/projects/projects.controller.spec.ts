import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let projectsController: ProjectsController;
  const projectsService = {
    createProject: jest
      .fn()
      .mockImplementation((name: string) => Promise.resolve({ id: 1, name })),
    findAll: jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'My Project',
      },
    ]),
    findOne: jest.fn().mockResolvedValue({
      id: 1,
      name: 'My Project',
    }),
    updateProject: jest
      .fn()
      .mockImplementation((id: number, name: string) =>
        Promise.resolve({ id, name }),
      ),
    deleteProject: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: projectsService,
        },
      ],
    }).compile();

    projectsController = module.get<ProjectsController>(ProjectsController);
  });

  it('should delegate project creation to the service', async () => {
    await expect(
      projectsController.createProject({ name: 'My Project' }),
    ).resolves.toEqual({
      id: 1,
      name: 'My Project',
    });
    expect(projectsService.createProject).toHaveBeenCalledWith('My Project');
  });

  it('should delegate project listing to the service', async () => {
    await expect(projectsController.getProjects()).resolves.toEqual([
      {
        id: 1,
        name: 'My Project',
      },
    ]);
    expect(projectsService.findAll).toHaveBeenCalledTimes(1);
  });

  it('should delegate finding one project to the service', async () => {
    await expect(projectsController.getProject(1)).resolves.toEqual({
      id: 1,
      name: 'My Project',
    });
    expect(projectsService.findOne).toHaveBeenCalledWith(1);
  });

  it('should delegate project updates to the service', async () => {
    await expect(
      projectsController.updateProject(1, { name: 'New Name' }),
    ).resolves.toEqual({ id: 1, name: 'New Name' });
    expect(projectsService.updateProject).toHaveBeenCalledWith(1, 'New Name');
  });

  it('should delegate project deletion to the service', async () => {
    await expect(projectsController.deleteProject(1)).resolves.toBeUndefined();
    expect(projectsService.deleteProject).toHaveBeenCalledWith(1);
  });
});
