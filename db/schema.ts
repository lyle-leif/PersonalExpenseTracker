import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', { ownerId: text('owner_id').primaryKey(), data: text('data').notNull(), version: integer('version').notNull().default(0) });
export const fxReferenceCache = sqliteTable('fx_reference_cache', {
  pair: text('pair').primaryKey(), snapshot: text('snapshot'),
  checkedAt: integer('checked_at').notNull().default(0), attemptedAt: integer('attempted_at').notNull().default(0),
  leaseUntil: integer('lease_until').notNull().default(0), leaseToken: text('lease_token'), lastError: integer('last_error').notNull().default(0)
});
