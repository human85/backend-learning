import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import type { ProjectsService } from './projects/projects.service.js';

const authorizationHeaders = {
  Authorization: 'Bearer learning-session',
  'Content-Type': 'application/json',
};

function createMockProjectsService(): ProjectsService {
  return {
    create: vi.fn(),
    findAll: vi.fn().mockResolvedValue([]),
  };
}

describe('Hono request pipeline', () => {
  it('returns application health without starting an HTTP server', async () => {
    const app = createApp({ projectsService: createMockProjectsService() });

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns 401 before validating an unauthenticated request', async () => {
    const projectsService = createMockProjectsService();
    const app = createApp({ projectsService });

    const response = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(response.status).toBe(401);
    expect(projectsService.create).not.toHaveBeenCalled();
  });

  it('returns 400 without calling the service when validation fails', async () => {
    const projectsService = createMockProjectsService();
    const app = createApp({ projectsService });

    const response = await app.request('/projects', {
      method: 'POST',
      headers: authorizationHeaders,
      body: JSON.stringify({ name: '' }),
    });

    expect(response.status).toBe(400);
    expect(projectsService.create).not.toHaveBeenCalled();
  });

  it('passes validated input and the trusted user id to the service', async () => {
    const projectsService = createMockProjectsService();
    vi.mocked(projectsService.create).mockResolvedValue({
      id: 1,
      name: 'Launch website',
      ownerId: 1,
    });
    const app = createApp({ projectsService });

    const response = await app.request('/projects', {
      method: 'POST',
      headers: authorizationHeaders,
      body: JSON.stringify({ name: '  Launch website  ' }),
    });

    expect(response.status).toBe(201);
    expect(projectsService.create).toHaveBeenCalledWith('Launch website', 1);
    await expect(response.json()).resolves.toEqual({
      id: 1,
      name: 'Launch website',
      ownerId: 1,
    });
  });
});
