import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let projectsController: ProjectsController;
  const projectsService = {
    createProject: jest.fn().mockImplementation((name: string) => ({ name })),
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

  it('should delegate project creation to the service', () => {
    expect(projectsController.createProject({ name: 'My Project' })).toEqual({
      name: 'My Project',
    });
    expect(projectsService.createProject).toHaveBeenCalledWith('My Project');
  });
});
