import { and, eq } from 'drizzle-orm';
import type { Database } from '../database/database.js';
import {
  idempotencyRecordsTable,
  type IdempotencyRecordRow,
} from '../database/schema.js';

export type IdempotencyScope = {
  userId: number;
  operation: string;
  idempotencyKey: string;
};

export type IdempotencyResponse = {
  status: number;
  body: string;
};

export type ReservationResult =
  | { kind: 'reserved'; record: IdempotencyRecordRow }
  | { kind: 'replay'; record: IdempotencyRecordRow }
  | { kind: 'in-progress'; record: IdempotencyRecordRow }
  | { kind: 'conflict'; record: IdempotencyRecordRow };

export interface IdempotencyRepository {
  reserve(
    scope: IdempotencyScope,
    requestHash: string,
  ): Promise<ReservationResult>;
  complete(
    scope: IdempotencyScope,
    requestHash: string,
    response: IdempotencyResponse,
  ): Promise<IdempotencyRecordRow>;
}

function scopeCondition(scope: IdempotencyScope) {
  return and(
    eq(idempotencyRecordsTable.userId, scope.userId),
    eq(idempotencyRecordsTable.operation, scope.operation),
    eq(idempotencyRecordsTable.idempotencyKey, scope.idempotencyKey),
  )!;
}

export function createIdempotencyRepository(
  database: Database,
): IdempotencyRepository {
  return {
    async reserve(scope, requestHash) {
      const [inserted] = await database
        .insert(idempotencyRecordsTable)
        .values({
          userId: scope.userId,
          operation: scope.operation,
          idempotencyKey: scope.idempotencyKey,
          requestHash,
          status: 'processing',
        })
        .onConflictDoNothing({
          target: [
            idempotencyRecordsTable.userId,
            idempotencyRecordsTable.operation,
            idempotencyRecordsTable.idempotencyKey,
          ],
        })
        .returning();

      if (inserted) {
        return { kind: 'reserved', record: inserted };
      }

      const [existing] = await database
        .select()
        .from(idempotencyRecordsTable)
        .where(scopeCondition(scope))
        .limit(1);

      if (!existing) {
        throw new Error('Idempotency conflict was not persisted');
      }

      if (existing.requestHash !== requestHash) {
        return { kind: 'conflict', record: existing };
      }

      if (existing.status === 'completed') {
        return { kind: 'replay', record: existing };
      }

      return { kind: 'in-progress', record: existing };
    },

    async complete(scope, requestHash, response) {
      const [updated] = await database
        .update(idempotencyRecordsTable)
        .set({
          status: 'completed',
          responseStatus: response.status,
          responseBody: response.body,
        })
        .where(
          and(
            scopeCondition(scope),
            eq(idempotencyRecordsTable.requestHash, requestHash),
            eq(idempotencyRecordsTable.status, 'processing'),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error('Idempotency record cannot be completed');
      }

      return updated;
    },
  };
}
