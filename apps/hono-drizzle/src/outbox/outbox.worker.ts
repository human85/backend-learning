import type { OutboxEventRow } from '../database/schema.js';
import type { OutboxRepository } from './outbox.repository.js';

export type OutboxReceiver = (event: OutboxEventRow) => Promise<void>;

export type OutboxWorkerResult =
  | { kind: 'idle' }
  | { kind: 'processed'; eventId: number }
  | { kind: 'retry-scheduled'; eventId: number; attempts: number }
  | { kind: 'failed'; eventId: number; attempts: number };

export type OutboxWorkerOptions = {
  maxAttempts?: number;
  retryDelayMs?: number;
  now?: () => Date;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createOutboxWorker(
  repository: OutboxRepository,
  receiver: OutboxReceiver,
  options: OutboxWorkerOptions = {},
) {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const now = options.now ?? (() => new Date());

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }

  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error('retryDelayMs must be a non-negative number');
  }

  return {
    async runOnce(): Promise<OutboxWorkerResult> {
      const currentTime = now();
      const event = await repository.findNextPending(currentTime);

      if (!event) {
        return { kind: 'idle' };
      }

      try {
        await receiver(event);
      } catch (error) {
        const attempts = event.attempts + 1;
        const status = attempts >= maxAttempts ? 'failed' : 'pending';
        const availableAt = new Date(currentTime.getTime() + retryDelayMs);

        await repository.markFailed(event.id, {
          status,
          attempts,
          availableAt,
          lastError: errorMessage(error),
        });

        if (status === 'failed') {
          return { kind: 'failed', eventId: event.id, attempts };
        }

        return {
          kind: 'retry-scheduled',
          eventId: event.id,
          attempts,
        };
      }

      await repository.markProcessed(event.id);

      return { kind: 'processed', eventId: event.id };
    },
  };
}
