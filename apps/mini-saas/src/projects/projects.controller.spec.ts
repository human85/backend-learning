import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedSession } from '../session/session.types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  const session = { userId: 10 } as AuthenticatedSession;
  let projectsController: ProjectsController;
  const projectsService = {
    createProject: jest
      .fn()
      .mockImplementation((name: string, ownerId: number) =>
        Promise.resolve({ id: 1, name, ownerId }),
      ),
    findAll: jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'My Project',
        ownerId: 10,
      },
    ]),
    findOne: jest.fn().mockResolvedValue({
      id: 1,
      name: 'My Project',
      ownerId: 10,
    }),
    updateProject: jest
      .fn()
      .mockImplementation((id: number, name: string, ownerId: number) =>
        Promise.resolve({ id, name, ownerId }),
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
        SessionAuthGuard,
      ],
    }).compile();

    projectsController = module.get<ProjectsController>(ProjectsController);
  });

  it('should delegate project creation to the service', async () => {
    await expect(
      projectsController.createProject({ name: 'My Project' }, session),
    ).resolves.toEqual({
      id: 1,
      name: 'My Project',
      ownerId: 10,
    });
    expect(projectsService.createProject).toHaveBeenCalledWith(
      'My Project',
      10,
    );
  });

  it('should delegate project listing to the service', async () => {
    await expect(projectsController.getProjects(session)).resolves.toEqual([
      {
        id: 1,
        name: 'My Project',
        ownerId: 10,
      },
    ]);
    expect(projectsService.findAll).toHaveBeenCalledWith(10);
  });

  it('should delegate finding one project to the service', async () => {
    await expect(projectsController.getProject(1, session)).resolves.toEqual({
      id: 1,
      name: 'My Project',
      ownerId: 10,
    });
    expect(projectsService.findOne).toHaveBeenCalledWith(1, 10);
  });

  it('should delegate project updates to the service', async () => {
    await expect(
      projectsController.updateProject(1, { name: 'New Name' }, session),
    ).resolves.toEqual({ id: 1, name: 'New Name', ownerId: 10 });
    expect(projectsService.updateProject).toHaveBeenCalledWith(
      1,
      'New Name',
      10,
    );
  });

  it('should delegate project deletion to the service', async () => {
    await expect(
      projectsController.deleteProject(1, session),
    ).resolves.toBeUndefined();
    expect(projectsService.deleteProject).toHaveBeenCalledWith(1, 10);
  });
});
