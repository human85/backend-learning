import type { OutboxEventRow } from '../database/schema.js';

export type EnqueueOutboxEvent = {
  eventType: string;
  aggregateType: string;
  aggregateId: number;
  payload: string;
};

export interface OutboxRepository {
  enqueue(event: EnqueueOutboxEvent): Promise<OutboxEventRow>;
}
