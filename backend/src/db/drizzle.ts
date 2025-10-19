/**
 * Drizzle ORM Database Connection
 * 
 * Drizzle ORMを使用したデータベース接続管理
 */

import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Drizzle ORMデータベースインスタンスを作成
 */
export function createDrizzleDB(d1Database: D1Database): DrizzleDB {
  return drizzle(d1Database, { schema });
}

/**
 * グローバルDrizzleデータベースインスタンス
 */
let globalDrizzleDB: DrizzleDB | null = null;

/**
 * グローバルDrizzleデータベースインスタンスを初期化
 */
export function initializeDrizzleDB(d1Database: D1Database): DrizzleDB {
  globalDrizzleDB = createDrizzleDB(d1Database);
  return globalDrizzleDB;
}

/**
 * グローバルDrizzleデータベースインスタンスを取得
 */
export function getDrizzleDB(): DrizzleDB {
  if (!globalDrizzleDB) {
    throw new Error('Drizzle DB not initialized. Call initializeDrizzleDB() first.');
  }
  return globalDrizzleDB;
}

/**
 * グローバルDrizzleデータベースインスタンスをリセット
 */
export function resetDrizzleDB(): void {
  globalDrizzleDB = null;
}
