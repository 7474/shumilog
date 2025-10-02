/**
 * ローカルD1データベースアクセスヘルパー
 * 
 * Wranglerのローカルストレージから直接D1データベースにアクセスします。
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const WRANGLER_STATE_DIR = '.wrangler/state/v3/d1';
const DB_NAME = 'miniflare-D1DatabaseObject';

export interface LocalD1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      run(): Promise<any>;
      first(): Promise<any>;
      all(): Promise<any>;
    };
  };
}

/**
 * ローカルD1データベースへの接続を取得
 */
export async function getLocalDatabase(): Promise<LocalD1Database> {
  const dbDir = join(process.cwd(), WRANGLER_STATE_DIR, DB_NAME);
  
  try {
    // .sqliteファイルを探す
    const files = readdirSync(dbDir);
    const sqliteFile = files.find(f => f.endsWith('.sqlite'));
    
    if (!sqliteFile) {
      throw new Error('データベースファイルが見つかりません');
    }
    
    const dbPath = join(dbDir, sqliteFile);
    
    // better-sqlite3でデータベースを開く
    const db = new Database(dbPath);
    
    // D1互換インターフェースでラップ
    return {
      prepare(query: string) {
        return {
          bind(...values: any[]) {
            return {
              async run() {
                const stmt = db.prepare(query);
                return stmt.run(...values);
              },
              async first() {
                const stmt = db.prepare(query);
                return stmt.get(...values);
              },
              async all() {
                const stmt = db.prepare(query);
                return { results: stmt.all(...values) };
              },
            };
          },
        };
      },
    };
  } catch (error) {
    throw new Error(
      `ローカルデータベースに接続できませんでした: ${dbDir}\n` +
      'npm run db:migrate と npm run db:seed を実行してデータベースを初期化してください。\n' +
      `エラー詳細: ${error instanceof Error ? error.message : error}`
    );
  }
}
