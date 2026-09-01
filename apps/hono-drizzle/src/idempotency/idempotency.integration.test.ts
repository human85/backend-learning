import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database/database.js';
import { idempotencyRecordsTable } from '../database/schema.js';
import {
  createIdempotencyRepository,
  type IdempotencyScope,
} from './idempotency.repository.js';

describe('IdempotencyRepository', () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests');
  }

  const databaseConnection = createDatabase(databaseUrl);
  const repository = createIdempotencyRepository(databaseConnection.database);

  const baseScope: IdempotencyScope = {
    userId: 1,
    operation: 'projects.create',
    idempotencyKey: 'request-1',
  };

  async function countRecords() {
    const records = await databaseConnection.database
      .select({ id: idempotencyRecordsTable.id })
      .from(idempotencyRecordsTable);

    return records.length;
  }

  beforeAll(async () => {
    await databaseConnection.database.execute(sql`select 1`);
  });

  beforeEach(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${idempotencyRecordsTable} restart identity`,
    );
  });

  afterAll(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${idempotencyRecordsTable} restart identity`,
    );
    await databaseConnection.close();
  });

  it('replays the stored response for the same scoped request', async () => {
    const first = await repository.reserve(baseScope, 'hash-a');

    expect(first.kind).toBe('reserved');

    const completed = await repository.complete(baseScope, 'hash-a', {
      status: 201,
      body: '{"id":1}',
    });

    expect(completed.status).toBe('completed');
    expect(completed.responseStatus).toBe(201);

    const retry = await repository.reserve(baseScope, 'hash-a');

    expect(retry.kind).toBe('replay');

    if (retry.kind !== 'replay') {
      throw new Error('Expected the retry to replay the stored response');
    }

    expect(retry.record.responseBody).toBe('{"id":1}');
    await expect(countRecords()).resolves.toBe(1);
  });

  it('rejects reusing a scoped key with a different request hash', async () => {
    await repository.reserve(baseScope, 'hash-a');

    const conflictingRequest = await repository.reserve(baseScope, 'hash-b');

    expect(conflictingRequest.kind).toBe('conflict');
    await expect(countRecords()).resolves.toBe(1);
  });

  it('allows the same key for different users and operations', async () => {
    const sameKey = 'shared-client-key';

    const first = await repository.reserve(
      { ...baseScope, idempotencyKey: sameKey },
      'hash-a',
    );
    const differentUser = await repository.reserve(
      { ...baseScope, userId: 2, idempotencyKey: sameKey },
      'hash-b',
    );
    const differentOperation = await repository.reserve(
      {
        ...baseScope,
        operation: 'projects.delete',
        idempotencyKey: sameKey,
      },
      'hash-c',
    );

    expect(first.kind).toBe('reserved');
    expect(differentUser.kind).toBe('reserved');
    expect(differentOperation.kind).toBe('reserved');
    await expect(countRecords()).resolves.toBe(3);
  });

  it('lets the database choose one winner for concurrent reservations', async () => {
    const results = await Promise.all([
      repository.reserve(baseScope, 'hash-a'),
      repository.reserve(baseScope, 'hash-a'),
    ]);

    expect(results.filter((result) => result.kind === 'reserved')).toHaveLength(
      1,
    );
    expect(
      results.filter(
        (result) => result.kind === 'in-progress' || result.kind === 'replay',
      ),
    ).toHaveLength(1);
    await expect(countRecords()).resolves.toBe(1);
  });
});
