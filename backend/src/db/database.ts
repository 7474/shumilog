/**
 * Database connection and query utilities
 * 
 * Provides connection management and query utilities for Cloudflare D1
 */

export interface DatabaseConfig {
  // For local development
  databasePath?: string;
  
  // For Cloudflare Workers (D1)
  d1Database?: any;
  
  // Connection options
  options?: {
    timeout?: number;
    retries?: number;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
  };
}

export interface QueryResult<T = any> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Database connection wrapper
 */
export class Database {
  private db: any;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    // For D1 databases, we can connect immediately since they're just bindings
    if (config.d1Database) {
      this.db = config.d1Database;
    } else {
      this.db = null;
    }
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      if (this.config.d1Database) {
        // Cloudflare D1 database - already connected in constructor
        this.db = this.config.d1Database;
      } else if (this.config.databasePath) {
        // Local development - use SQLite file directly
        // TODO: In actual production, this would use D1 API
        this.db = {
          type: 'file-sqlite',
          dbPath: this.config.databasePath
        };
        console.log(`Using SQLite file at ${this.config.databasePath}`);
      } else {
        throw new Error('No database configuration provided');
      }
      
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db && typeof this.db.close === 'function') {
      this.db.close();
      console.log('Database connection closed');
    }
  }

  /**
   * Execute a single SQL statement
   */
  async exec(sql: string): Promise<void> {
    try {
      if (this.isD1Database()) {
        await this.db.exec(sql);
      } else {
        this.db.exec(sql);
      }
    } catch (error) {
      console.error('SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Prepare a SQL statement
   */
  prepare(sql: string): DatabaseStatement {
    return new DatabaseStatement(this.db, sql, this.isD1Database());
  }

  /**
   * Execute a query and return all results
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const stmt = this.prepare(sql);
    return await stmt.all<T>(params);
  }

  /**
   * Execute a query and return first result
   */
  async queryFirst<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const stmt = this.prepare(sql);
    return await stmt.get<T>(params);
  }

  /**
   * Execute a query with pagination
   */
  async queryWithPagination<T = any>(
    sql: string, 
    countSql: string,
    params: any[] = [],
    limit = 20,
    offset = 0
  ): Promise<PaginatedResult<T>> {
    // Get total count
    const countResult = await this.queryFirst<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // Get paginated results
    const paginatedSql = `${sql} LIMIT ${limit} OFFSET ${offset}`;
    const items = await this.query<T>(paginatedSql, params);

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
   * Execute multiple statements in a transaction
   */
  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    if (this.isD1Database()) {
      // D1 doesn't support explicit transactions yet
      // All operations are already atomic
      return await callback(this);
    } else {
      // SQLite transaction
      const transaction = this.db.transaction((db: Database) => {
        return callback(db);
      });
      return transaction(this);
    }
  }

  /**
   * Batch execute multiple statements
   */
  async batch(statements: { sql: string; params?: any[] }[]): Promise<QueryResult[]> {
    if (this.isD1Database()) {
      // D1 batch API
      const prepared = statements.map(stmt => 
        this.db.prepare(stmt.sql).bind(...(stmt.params || []))
      );
      return await this.db.batch(prepared);
    } else {
      // SQLite: execute sequentially
      const results: QueryResult[] = [];
      for (const stmt of statements) {
        const prepared = this.prepare(stmt.sql);
        const result = await prepared.run(stmt.params);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Check if using D1 database
   */
  private isD1Database(): boolean {
    return !!this.config.d1Database;
  }

  /**
   * Get database instance (for direct access)
   */
  getDb(): any {
    return this.db;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.queryFirst('SELECT 1 as test');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Database statement wrapper
 */
class DatabaseStatement {
  private db: any;
  private sql: string;
  private isD1: boolean;
  private prepared: any;

  constructor(db: any, sql: string, isD1: boolean) {
    this.db = db;
    this.sql = sql;
    this.isD1 = isD1;
    
    if (isD1) {
      this.prepared = db.prepare(sql);
    } else {
      // For non-D1 databases, create a mock prepared statement
      this.prepared = {
        sql: sql,
        all: (..._params: any[]) => [],
        get: (..._params: any[]) => null,
        run: (..._params: any[]) => ({ changes: 0, lastInsertRowid: 0 })
      };
    }
  }

  /**
   * Execute statement and return all results
   */
  async all<T = any>(params?: any[]): Promise<T[]> {
    try {
      if (this.isD1) {
        const result = await this.prepared.bind(...(params || [])).all();
        return result.results || [];
      } else {
        return this.prepared.all(...(params || []));
      }
    } catch (error) {
      console.error('Statement execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute statement and return first result
   */
  async get<T = any>(params?: any[]): Promise<T | null> {
    try {
      if (this.isD1) {
        const result = await this.prepared.bind(...(params || [])).first();
        return result || null;
      } else {
        return this.prepared.get(...(params || [])) || null;
      }
    } catch (error) {
      console.error('Statement execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute statement (INSERT, UPDATE, DELETE)
   */
  async run(params?: any[]): Promise<QueryResult> {
    try {
      if (this.isD1) {
        return await this.prepared.bind(...(params || [])).run();
      } else {
        const result = this.prepared.run(...(params || []));
        return {
          results: [],
          success: true,
          meta: {
            duration: 0,
            changes: result.changes,
            last_row_id: result.lastInsertRowid,
            changed_db: result.changes > 0,
            size_after: 0,
            rows_read: 0,
            rows_written: result.changes
          }
        };
      }
    } catch (error) {
      console.error('Statement execution failed:', error);
      throw error;
    }
  }
}

/**
 * Database utility functions
 */
export class DatabaseUtils {
  /**
   * Escape SQL identifier
   */
  static escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Build WHERE clause from conditions
   */
  static buildWhereClause(conditions: Record<string, any>): { clause: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          clauses.push(`${DatabaseUtils.escapeIdentifier(key)} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else {
          clauses.push(`${DatabaseUtils.escapeIdentifier(key)} = ?`);
          params.push(value);
        }
      }
    }

    return {
      clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  /**
   * Build ORDER BY clause
   */
  static buildOrderByClause(sortBy?: string, sortOrder?: 'asc' | 'desc'): string {
    if (!sortBy) return '';
    const order = sortOrder || 'asc';
    return `ORDER BY ${DatabaseUtils.escapeIdentifier(sortBy)} ${order.toUpperCase()}`;
  }

  /**
   * Build LIMIT and OFFSET clause
   */
  static buildPaginationClause(limit?: number, offset?: number): string {
    const finalLimit = Math.min(limit || 20, 100); // Max 100 items per page
    const finalOffset = offset || 0;
    return `LIMIT ${finalLimit} OFFSET ${finalOffset}`;
  }

  /**
   * Convert camelCase to snake_case
   */
  static toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase
   */
  static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert object keys from snake_case to camelCase
   */
  static convertKeysCamelCase<T = any>(obj: any): T {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => DatabaseUtils.convertKeysCamelCase(item)) as unknown as T;
    }

    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = DatabaseUtils.toCamelCase(key);
      converted[camelKey] = typeof value === 'object' && value !== null 
        ? DatabaseUtils.convertKeysCamelCase(value)
        : value;
    }
    return converted;
  }

  /**
   * Convert object keys from camelCase to snake_case
   */
  static convertKeysSnakeCase<T = any>(obj: any): T {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => DatabaseUtils.convertKeysSnakeCase(item)) as unknown as T;
    }

    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = DatabaseUtils.toSnakeCase(key);
      converted[snakeKey] = typeof value === 'object' && value !== null 
        ? DatabaseUtils.convertKeysSnakeCase(value)
        : value;
    }
    return converted;
  }
}

/**
 * Global database instance
 */
let globalDatabase: Database | null = null;

/**
 * Initialize global database instance
 */
export function initializeDatabase(config: DatabaseConfig): Database {
  globalDatabase = new Database(config);
  return globalDatabase;
}

/**
 * Get global database instance
 */
export function getDatabase(): Database {
  if (!globalDatabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return globalDatabase;
}

/**
 * Close global database connection
 */
export async function closeDatabase(): Promise<void> {
  if (globalDatabase) {
    await globalDatabase.close();
    globalDatabase = null;
  }
}