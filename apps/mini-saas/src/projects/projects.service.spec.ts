import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let projectsService: ProjectsService;

  beforeEach(() => {
    projectsService = new ProjectsService();
  });

  it('should return the created project', () => {
    expect(projectsService.createProject('My Project')).toEqual({
      name: 'My Project',
    });
  });
});
