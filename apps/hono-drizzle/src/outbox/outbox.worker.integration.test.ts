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

  async function enableProcessedConfirmationFailure() {
    await databaseConnection.database.execute(
      sql.raw(`
        create or replace function hono_drizzle_fail_processed_confirmation()
        returns trigger
        language plpgsql
        as $function$
        begin
          raise exception 'Injected processed confirmation failure';
        end;
        $function$;
      `),
    );
    await databaseConnection.database.execute(
      sql.raw(`
        create trigger hono_drizzle_fail_processed_confirmation_trigger
        before update of status on outbox_events
        for each row
        when (new.status = 'processed')
        execute function hono_drizzle_fail_processed_confirmation();
      `),
    );
  }

  async function disableProcessedConfirmationFailure() {
    await databaseConnection.database.execute(
      sql.raw(`
        drop trigger if exists hono_drizzle_fail_processed_confirmation_trigger
        on outbox_events;
      `),
    );
    await databaseConnection.database.execute(
      sql.raw(`
        drop function if exists hono_drizzle_fail_processed_confirmation();
      `),
    );
  }

  beforeAll(async () => {
    await databaseConnection.database.execute(sql`select 1`);
    await disableProcessedConfirmationFailure();
  });

  beforeEach(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${outboxEventsTable} restart identity`,
    );
  });

  afterAll(async () => {
    await disableProcessedConfirmationFailure();
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

  it('redelivers after confirmation failure but deduplicates the side effect by event ID', async () => {
    const event = await enqueueEvent();
    const receivedEventIds: number[] = [];
    const appliedEventIds = new Set<number>();
    let sideEffectCount = 0;
    const receiver = async (receivedEvent: typeof event) => {
      receivedEventIds.push(receivedEvent.id);

      if (appliedEventIds.has(receivedEvent.id)) {
        return;
      }

      appliedEventIds.add(receivedEvent.id);
      sideEffectCount += 1;
    };

    await enableProcessedConfirmationFailure();

    try {
      const firstWorker = createOutboxWorker(repository, receiver, {
        retryDelayMs: 0,
      });

      await expect(firstWorker.runOnce()).rejects.toThrow();

      const [pendingEvent] = await databaseConnection.database
        .select()
        .from(outboxEventsTable);
      expect(pendingEvent).toMatchObject({
        id: event.id,
        status: 'pending',
        attempts: 0,
      });
      expect(receivedEventIds).toEqual([event.id]);
      expect(sideEffectCount).toBe(1);
    } finally {
      await disableProcessedConfirmationFailure();
    }

    const restartedWorker = createOutboxWorker(repository, receiver, {
      retryDelayMs: 0,
    });

    await expect(restartedWorker.runOnce()).resolves.toEqual({
      kind: 'processed',
      eventId: event.id,
    });
    expect(receivedEventIds).toEqual([event.id, event.id]);
    expect(sideEffectCount).toBe(1);

    const [processedEvent] = await databaseConnection.database
      .select()
      .from(outboxEventsTable);
    expect(processedEvent).toMatchObject({
      id: event.id,
      status: 'processed',
    });
  });
});
