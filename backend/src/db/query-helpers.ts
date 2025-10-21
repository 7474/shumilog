/**
 * Drizzle ORM query helper functions
 * データベース非依存のクエリヘルパー関数
 */

import { sql, SQL } from 'drizzle-orm';
import type { DrizzleDB } from './drizzle.js';
import type { PaginatedResult } from '../types/pagination.js';

/**
 * Execute a raw SQL query and return all results
 */
export async function queryAll<T = any>(db: DrizzleDB, query: SQL): Promise<T[]> {
  return await db.all<T>(query);
}

/**
 * Execute a raw SQL query and return the first result
 */
export async function queryFirst<T = any>(db: DrizzleDB, query: SQL): Promise<T | null> {
  return await db.get<T>(query);
}

/**
 * Execute a query with pagination
 */
export async function queryWithPagination<T = any>(
  db: DrizzleDB,
  selectQuery: SQL,
  countQuery: SQL,
  limit = 20,
  offset = 0
): Promise<PaginatedResult<T>> {
  // Get total count
  const countResult = await db.get<{ total: number }>(countQuery);
  const total = countResult?.total || 0;

  // Get paginated results - append LIMIT and OFFSET
  const paginatedQuery = sql`${selectQuery} LIMIT ${limit} OFFSET ${offset}`;
  const items = await db.all<T>(paginatedQuery);

  return {
    items,
    total,
    limit,
    offset,
    has_next: offset + limit < total,
    has_prev: offset > 0
  };
}

/**
 * Execute multiple statements in a batch
 * Note: Drizzle ORM with D1 doesn't have a direct batch API like the raw D1 client,
 * so we execute sequentially. For true batch operations, consider using db.batch()
 * with the underlying D1 client if performance is critical.
 */
export async function batchExecute(
  db: DrizzleDB,
  queries: SQL[]
): Promise<void> {
  for (const query of queries) {
    await db.run(query);
  }
}
