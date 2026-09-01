import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const projectsTable = pgTable('projects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  ownerId: integer('owner_id').notNull(),
});

export const idempotencyRecordsTable = pgTable(
  'idempotency_records',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull(),
    operation: varchar('operation', { length: 100 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('idempotency_records_scope_unique').on(
      table.userId,
      table.operation,
      table.idempotencyKey,
    ),
  ],
);

export type ProjectRow = typeof projectsTable.$inferSelect;
export type NewProjectRow = typeof projectsTable.$inferInsert;
export type IdempotencyRecordRow = typeof idempotencyRecordsTable.$inferSelect;
