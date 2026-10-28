import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', { ownerId: text('owner_id').primaryKey(), data: text('data').notNull(), version: integer('version').notNull().default(0) });
