import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  createProject(name: string): { name: string } {
    return { name };
  }
}
