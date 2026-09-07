import { and, asc, eq, lte } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { outboxEventsTable } from '../database/schema.js';
import type {
  EnqueueOutboxEvent,
  MarkOutboxEventFailed,
  OutboxRepository,
} from './outbox.repository.js';

export function createDrizzleOutboxRepository(
  database: DatabaseExecutor,
): OutboxRepository {
  return {
    async enqueue(event: EnqueueOutboxEvent) {
      const [savedEvent] = await database
        .insert(outboxEventsTable)
        .values(event)
        .returning();

      if (!savedEvent) {
        throw new Error('PostgreSQL did not return the inserted outbox event');
      }

      return savedEvent;
    },

    async findNextPending(now) {
      const [event] = await database
        .select()
        .from(outboxEventsTable)
        .where(
          and(
            eq(outboxEventsTable.status, 'pending'),
            lte(outboxEventsTable.availableAt, now),
          ),
        )
        .orderBy(asc(outboxEventsTable.id))
        .limit(1);

      return event ?? null;
    },

    async markProcessed(id) {
      const [updatedEvent] = await database
        .update(outboxEventsTable)
        .set({
          status: 'processed',
          processedAt: new Date(),
          lastError: null,
        })
        .where(
          and(
            eq(outboxEventsTable.id, id),
            eq(outboxEventsTable.status, 'pending'),
          ),
        )
        .returning();

      if (!updatedEvent) {
        throw new Error('Pending outbox event cannot be marked as processed');
      }

      return updatedEvent;
    },

    async markFailed(id, failure: MarkOutboxEventFailed) {
      const [updatedEvent] = await database
        .update(outboxEventsTable)
        .set(failure)
        .where(
          and(
            eq(outboxEventsTable.id, id),
            eq(outboxEventsTable.status, 'pending'),
          ),
        )
        .returning();

      if (!updatedEvent) {
        throw new Error('Pending outbox event cannot be marked as failed');
      }

      return updatedEvent;
    },
  };
}
