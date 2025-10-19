/**
 * Drizzle ORM スキーマ定義
 * 既存のマイグレーションから生成されたスキーマ
 */

import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * ユーザーテーブル
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  twitterUsername: text('twitter_username'),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  twitterUsernameIdx: index('idx_users_twitter_username').on(table.twitterUsername),
}));

/**
 * セッションテーブル
 */
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
}, (table) => ({
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
  expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
}));

/**
 * タグテーブル
 */
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  metadata: text('metadata').notNull().default('{}'),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  nameIdx: index('idx_tags_name').on(table.name),
}));

/**
 * タグ関連付けテーブル
 */
export const tagAssociations = sqliteTable('tag_associations', {
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  associatedTagId: text('associated_tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.tagId, table.associatedTagId] }),
  associatedTagIdIdx: index('idx_tag_assoc_associated_tag_id').on(table.associatedTagId),
}));

/**
 * ログテーブル
 */
export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  contentMd: text('content_md').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index('idx_logs_user_id').on(table.userId),
  userCreatedIdx: index('idx_logs_user_created').on(table.userId, table.createdAt),
}));

/**
 * ログ-タグ関連付けテーブル
 */
export const logTagAssociations = sqliteTable('log_tag_associations', {
  logId: text('log_id').notNull().references(() => logs.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.logId, table.tagId] }),
  tagIdIdx: index('idx_log_tag_assoc_tag_id').on(table.tagId),
}));

/**
 * 画像テーブル
 */
export const images = sqliteTable('images', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  fileName: text('file_name').notNull(),
  contentType: text('content_type').notNull(),
  fileSize: integer('file_size').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index('idx_images_user_id').on(table.userId),
}));

/**
 * ログ-画像関連付けテーブル
 */
export const logImageAssociations = sqliteTable('log_image_associations', {
  logId: text('log_id').notNull().references(() => logs.id, { onDelete: 'cascade' }),
  imageId: text('image_id').notNull().references(() => images.id, { onDelete: 'cascade' }),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.logId, table.imageId] }),
  imageIdIdx: index('idx_log_image_assoc_image_id').on(table.imageId),
  displayOrderIdx: index('idx_log_image_assoc_display_order').on(table.logId, table.displayOrder),
}));

/**
 * スキーママイグレーショントラッキング
 */
export const schemaMigrations = sqliteTable('schema_migrations', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at').default(sql`CURRENT_TIMESTAMP`),
  description: text('description'),
});

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TagAssociation = typeof tagAssociations.$inferSelect;
export type NewTagAssociation = typeof tagAssociations.$inferInsert;

export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;

export type LogTagAssociation = typeof logTagAssociations.$inferSelect;
export type NewLogTagAssociation = typeof logTagAssociations.$inferInsert;

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

export type LogImageAssociation = typeof logImageAssociations.$inferSelect;
export type NewLogImageAssociation = typeof logImageAssociations.$inferInsert;

export type SchemaMigration = typeof schemaMigrations.$inferSelect;
export type NewSchemaMigration = typeof schemaMigrations.$inferInsert;
