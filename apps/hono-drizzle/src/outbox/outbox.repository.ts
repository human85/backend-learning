import type { OutboxEventRow } from '../database/schema.js';

export type EnqueueOutboxEvent = {
  eventType: string;
  aggregateType: string;
  aggregateId: number;
  payload: string;
};

export type MarkOutboxEventFailed = {
  status: 'pending' | 'failed';
  attempts: number;
  availableAt: Date;
  lastError: string;
};

export interface OutboxRepository {
  enqueue(event: EnqueueOutboxEvent): Promise<OutboxEventRow>;
  findNextPending(now: Date): Promise<OutboxEventRow | null>;
  markProcessed(id: number): Promise<OutboxEventRow>;
  markFailed(
    id: number,
    failure: MarkOutboxEventFailed,
  ): Promise<OutboxEventRow>;
}
