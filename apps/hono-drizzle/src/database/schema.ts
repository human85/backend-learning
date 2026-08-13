import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const projectsTable = pgTable('projects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  ownerId: integer('owner_id').notNull(),
});

export type ProjectRow = typeof projectsTable.$inferSelect;
export type NewProjectRow = typeof projectsTable.$inferInsert;
