import { createHash } from 'node:crypto';

export function hashIdempotencyRequest(input: { name: string }): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
