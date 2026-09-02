import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createDatabase } from './database/database.js';
import { idempotencyRecordsTable, projectsTable } from './database/schema.js';
import { createIdempotentProjectsService } from './idempotency/idempotent-projects.service.js';
import { createDrizzleProjectsRepository } from './projects/drizzle-projects.repository.js';
import { createProjectsService } from './projects/projects.service.js';

const authorizationHeaders = {
  Authorization: 'Bearer learning-session',
  'Content-Type': 'application/json',
};

describe('Hono and Drizzle integration', () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests');
  }

  const databaseConnection = createDatabase(databaseUrl);
  const projectsRepository = createDrizzleProjectsRepository(
    databaseConnection.database,
  );
  const projectsService = createProjectsService(projectsRepository);
  const idempotentProjectsService = createIdempotentProjectsService(
    databaseConnection.database,
  );
  const app = createApp({ projectsService, idempotentProjectsService });

  beforeAll(async () => {
    await databaseConnection.database.execute(sql`select 1`);
  });

  beforeEach(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${projectsTable}, ${idempotencyRecordsTable} restart identity`,
    );
  });

  afterAll(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${projectsTable}, ${idempotencyRecordsTable} restart identity`,
    );
    await databaseConnection.close();
  });

  it('persists a project and reads it through the complete HTTP pipeline', async () => {
    const createResponse = await app.request('/projects', {
      method: 'POST',
      headers: authorizationHeaders,
      body: JSON.stringify({ name: 'Persistent project' }),
    });

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toEqual({
      id: 1,
      name: 'Persistent project',
      ownerId: 1,
    });

    const listResponse = await app.request('/projects', {
      headers: authorizationHeaders,
    });

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual([
      {
        id: 1,
        name: 'Persistent project',
        ownerId: 1,
      },
    ]);
  });

  it('returns only projects owned by the authenticated user', async () => {
    await projectsRepository.insert({ name: 'My project', ownerId: 1 });
    await projectsRepository.insert({
      name: 'Another user project',
      ownerId: 2,
    });

    const response = await app.request('/projects', {
      headers: authorizationHeaders,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 1,
        name: 'My project',
        ownerId: 1,
      },
    ]);
  });

  it('replays the same HTTP response for a retried create request', async () => {
    const headers = {
      ...authorizationHeaders,
      'Idempotency-Key': 'create-project-1',
    };

    const firstResponse = await app.request('/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Reliable project' }),
    });
    const retryResponse = await app.request('/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Reliable project' }),
    });

    expect(firstResponse.status).toBe(201);
    expect(retryResponse.status).toBe(201);
    const firstBody = await firstResponse.json();
    const retryBody = await retryResponse.json();
    expect(retryBody).toEqual(firstBody);

    const listResponse = await app.request('/projects', {
      headers: authorizationHeaders,
    });
    await expect(listResponse.json()).resolves.toHaveLength(1);
  });

  it('rejects a reused key when the request body changes', async () => {
    const headers = {
      ...authorizationHeaders,
      'Idempotency-Key': 'create-project-2',
    };

    const firstResponse = await app.request('/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'First project' }),
    });
    const conflictingResponse = await app.request('/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Different project' }),
    });

    expect(firstResponse.status).toBe(201);
    expect(conflictingResponse.status).toBe(409);

    const listResponse = await app.request('/projects', {
      headers: authorizationHeaders,
    });
    await expect(listResponse.json()).resolves.toEqual([
      { id: 1, name: 'First project', ownerId: 1 },
    ]);
  });

  it('creates only one project for concurrent requests with the same key', async () => {
    const headers = {
      ...authorizationHeaders,
      'Idempotency-Key': 'create-project-3',
    };

    const responses = await Promise.all([
      app.request('/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Concurrent project' }),
      }),
      app.request('/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Concurrent project' }),
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(bodies[0]).toEqual(bodies[1]);

    const listResponse = await app.request('/projects', {
      headers: authorizationHeaders,
    });
    await expect(listResponse.json()).resolves.toHaveLength(1);
  });
});
