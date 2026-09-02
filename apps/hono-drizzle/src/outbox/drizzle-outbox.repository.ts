import type { DatabaseExecutor } from '../database/database.js';
import { outboxEventsTable } from '../database/schema.js';
import type {
  EnqueueOutboxEvent,
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
  };
}
