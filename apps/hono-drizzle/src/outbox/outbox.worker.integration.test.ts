import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database/database.js';
import { outboxEventsTable } from '../database/schema.js';
import { createDrizzleOutboxRepository } from './drizzle-outbox.repository.js';
import { createOutboxWorker } from './outbox.worker.js';

describe('Outbox worker integration', () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests');
  }

  const databaseConnection = createDatabase(databaseUrl);
  const repository = createDrizzleOutboxRepository(databaseConnection.database);

  beforeAll(async () => {
    await databaseConnection.database.execute(sql`select 1`);
  });

  beforeEach(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${outboxEventsTable} restart identity`,
    );
  });

  afterAll(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${outboxEventsTable} restart identity`,
    );
    await databaseConnection.close();
  });

  async function enqueueEvent() {
    return repository.enqueue({
      eventType: 'project.created',
      aggregateType: 'project',
      aggregateId: 1,
      payload: JSON.stringify({ id: 1, name: 'Worker project' }),
    });
  }

  it('processes a pending event and confirms it', async () => {
    const event = await enqueueEvent();
    const receivedEventIds: number[] = [];
    const worker = createOutboxWorker(
      repository,
      async (receivedEvent) => {
        receivedEventIds.push(receivedEvent.id);
      },
      { retryDelayMs: 0 },
    );

    await expect(worker.runOnce()).resolves.toEqual({
      kind: 'processed',
      eventId: event.id,
    });
    expect(receivedEventIds).toEqual([event.id]);

    const [processedEvent] = await databaseConnection.database
      .select()
      .from(outboxEventsTable);
    expect(processedEvent).toMatchObject({
      id: event.id,
      status: 'processed',
      attempts: 0,
      lastError: null,
    });
    expect(processedEvent?.processedAt).not.toBeNull();

    await expect(worker.runOnce()).resolves.toEqual({ kind: 'idle' });
  });

  it('retries temporary failures and preserves a failed record after the limit', async () => {
    const event = await enqueueEvent();
    let receiverCalls = 0;
    const worker = createOutboxWorker(
      repository,
      async () => {
        receiverCalls += 1;
        throw new Error('Receiver unavailable');
      },
      { maxAttempts: 3, retryDelayMs: 0 },
    );

    await expect(worker.runOnce()).resolves.toEqual({
      kind: 'retry-scheduled',
      eventId: event.id,
      attempts: 1,
    });
    await expect(worker.runOnce()).resolves.toEqual({
      kind: 'retry-scheduled',
      eventId: event.id,
      attempts: 2,
    });
    await expect(worker.runOnce()).resolves.toEqual({
      kind: 'failed',
      eventId: event.id,
      attempts: 3,
    });
    expect(receiverCalls).toBe(3);

    const [failedEvent] = await databaseConnection.database
      .select()
      .from(outboxEventsTable);
    expect(failedEvent).toMatchObject({
      id: event.id,
      status: 'failed',
      attempts: 3,
      lastError: 'Receiver unavailable',
    });
    await expect(worker.runOnce()).resolves.toEqual({ kind: 'idle' });
  });

  it('continues a pending event after a worker restart', async () => {
    const event = await enqueueEvent();
    const firstWorker = createOutboxWorker(
      repository,
      async () => {
        throw new Error('Temporary receiver failure');
      },
      { retryDelayMs: 0 },
    );

    await expect(firstWorker.runOnce()).resolves.toEqual({
      kind: 'retry-scheduled',
      eventId: event.id,
      attempts: 1,
    });

    const receivedEventIds: number[] = [];
    const restartedWorker = createOutboxWorker(
      repository,
      async (receivedEvent) => {
        receivedEventIds.push(receivedEvent.id);
      },
      { retryDelayMs: 0 },
    );

    await expect(restartedWorker.runOnce()).resolves.toEqual({
      kind: 'processed',
      eventId: event.id,
    });
    expect(receivedEventIds).toEqual([event.id]);
  });
});
