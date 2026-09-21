import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  open: integer('open').notNull().default(1),
  archived: integer('archived').notNull().default(0),
  joinExpires: integer('join_expires').notNull(),
  expires: integer('expires').notNull(),
  activeUntil: integer('active_until'),
  resultWinners: text('result_winners'),
  resultTimestamp: real('result_timestamp'),
}, table => [index('rooms_expiry').on(table.expires), check('rooms_open_check', sql`${table.open} IN (0, 1)`)]);
export const participants = sqliteTable('participants', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  id: text('id').notNull().unique(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  voter: text('voter').notNull(),
}, table => [uniqueIndex('participants_room_name').on(table.roomId, table.name), uniqueIndex('participants_room_voter').on(table.roomId, table.voter)]);
export const results = sqliteTable('results', {
  id: text('id').primaryKey(),
  owner: text('owner'),
  winners: text('winners').notNull(),
  timestamp: real('timestamp').notNull(),
  expires: integer('expires').notNull(),
  activeUntil: integer('active_until'),
}, table => [index('results_expiry').on(table.expires)]);

export const roomDraws = sqliteTable('room_draws', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  timestamp: real('timestamp').notNull(),
  winners: text('winners').notNull(),
}, table => [uniqueIndex('room_draws_timestamp').on(table.roomId, table.timestamp)]);
