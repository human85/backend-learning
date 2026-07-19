import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let projectsService: ProjectsService;

  beforeEach(() => {
    projectsService = new ProjectsService();
  });

  it('should start with an empty project list', () => {
    expect(projectsService.findAll()).toEqual([]);
  });

  it('should create and store a project', () => {
    expect(projectsService.createProject('My Project')).toEqual({
      id: 1,
      name: 'My Project',
    });
    expect(projectsService.findAll()).toEqual([
      {
        id: 1,
        name: 'My Project',
      },
    ]);
  });

  it('should assign sequential project ids', () => {
    expect(projectsService.createProject('Project A').id).toBe(1);
    expect(projectsService.createProject('Project B').id).toBe(2);
  });

  it('should find a project by id', () => {
    projectsService.createProject('My Project');

    expect(projectsService.findOne(1)).toEqual({
      id: 1,
      name: 'My Project',
    });
  });

  it('should throw when a project does not exist', () => {
    expect(() => projectsService.findOne(999)).toThrow(
      new NotFoundException('Project with id 999 not found'),
    );
  });
});
