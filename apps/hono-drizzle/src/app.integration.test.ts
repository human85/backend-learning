import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createDatabase } from './database/database.js';
import {
  idempotencyRecordsTable,
  outboxEventsTable,
  projectsTable,
} from './database/schema.js';
import { createIdempotentProjectsService } from './idempotency/idempotent-projects.service.js';
import { createDrizzleProjectsRepository } from './projects/drizzle-projects.repository.js';
import { createProjectCreationService } from './projects/project-creation.service.js';
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
  const projectCreationService = createProjectCreationService(
    databaseConnection.database,
  );
  const idempotentProjectsService = createIdempotentProjectsService(
    databaseConnection.database,
  );
  const app = createApp({
    projectsService,
    projectCreationService,
    idempotentProjectsService,
  });

  async function enableOutboxInsertFailure() {
    await databaseConnection.database.execute(
      sql.raw(`
        create or replace function hono_drizzle_fail_outbox_insert()
        returns trigger
        language plpgsql
        as $function$
        begin
          raise exception 'Injected outbox insert failure';
        end;
        $function$;
      `),
    );
    await databaseConnection.database.execute(
      sql.raw(`
        create trigger hono_drizzle_fail_outbox_insert_trigger
        before insert on outbox_events
        for each row
        execute function hono_drizzle_fail_outbox_insert();
      `),
    );
  }

  async function disableOutboxInsertFailure() {
    await databaseConnection.database.execute(
      sql.raw(`
        drop trigger if exists hono_drizzle_fail_outbox_insert_trigger
        on outbox_events;
      `),
    );
    await databaseConnection.database.execute(
      sql.raw(`
        drop function if exists hono_drizzle_fail_outbox_insert();
      `),
    );
  }

  beforeAll(async () => {
    await databaseConnection.database.execute(sql`select 1`);
    await disableOutboxInsertFailure();
  });

  beforeEach(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${projectsTable}, ${idempotencyRecordsTable}, ${outboxEventsTable} restart identity`,
    );
  });

  afterAll(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${projectsTable}, ${idempotencyRecordsTable}, ${outboxEventsTable} restart identity`,
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

    const events = await databaseConnection.database
      .select()
      .from(outboxEventsTable);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'project.created',
      aggregateId: 1,
      status: 'pending',
    });
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

    const events = await databaseConnection.database
      .select()
      .from(outboxEventsTable);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'project.created',
      aggregateType: 'project',
      aggregateId: 1,
      status: 'pending',
      attempts: 0,
    });
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

  it('rolls back the project when the outbox insert fails', async () => {
    await enableOutboxInsertFailure();

    try {
      const response = await app.request('/projects', {
        method: 'POST',
        headers: authorizationHeaders,
        body: JSON.stringify({ name: 'Rolled back project' }),
      });

      expect(response.status).toBe(500);
      await expect(
        databaseConnection.database.select().from(projectsTable),
      ).resolves.toEqual([]);
      await expect(
        databaseConnection.database.select().from(outboxEventsTable),
      ).resolves.toEqual([]);
    } finally {
      await disableOutboxInsertFailure();
    }
  });

  it('rolls back the idempotency reservation and retries after recovery', async () => {
    const headers = {
      ...authorizationHeaders,
      'Idempotency-Key': 'recoverable-project-1',
    };

    await enableOutboxInsertFailure();

    try {
      const failedResponse = await app.request('/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Recoverable project' }),
      });

      expect(failedResponse.status).toBe(500);
      await expect(
        databaseConnection.database.select().from(projectsTable),
      ).resolves.toEqual([]);
      await expect(
        databaseConnection.database.select().from(idempotencyRecordsTable),
      ).resolves.toEqual([]);
      await expect(
        databaseConnection.database.select().from(outboxEventsTable),
      ).resolves.toEqual([]);
    } finally {
      await disableOutboxInsertFailure();
    }

    const retryResponse = await app.request('/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Recoverable project' }),
    });

    expect(retryResponse.status).toBe(201);
    const retryBody = await retryResponse.json();
    expect(retryBody).toMatchObject({
      name: 'Recoverable project',
      ownerId: 1,
    });
    expect(retryBody.id).toEqual(expect.any(Number));

    const projects = await databaseConnection.database
      .select()
      .from(projectsTable);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toEqual(retryBody);

    const idempotencyRecords = await databaseConnection.database
      .select()
      .from(idempotencyRecordsTable);
    expect(idempotencyRecords).toMatchObject([
      {
        status: 'completed',
        responseStatus: 201,
      },
    ]);

    const events = await databaseConnection.database
      .select()
      .from(outboxEventsTable);
    expect(events).toMatchObject([
      {
        eventType: 'project.created',
        aggregateId: retryBody.id,
        status: 'pending',
      },
    ]);
  });
});
