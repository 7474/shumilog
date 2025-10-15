import { Miniflare } from 'miniflare';
import { createApp } from '../../src/index.js';
import { DATABASE_SCHEMAS } from '../../src/db/schema.sql.js';

// Test ID mappings for consistent UUIDs
export const TEST_TAG_IDS = {
  ANIME: '3e8d692f-d9ef-4b26-a708-c9ac352b16aa',
  MANGA: '96057d51-7fe9-4198-9003-a0449509b632',
  ATTACK_ON_TITAN: 'e709cc42-4780-4653-be03-3883b38fd39b',
} as const;

const mf = new Miniflare({
  modules: true,
  script: `export default { async fetch() { return new Response('test helper', { status: 404 }); } };`,
  kvNamespaces: ['KV', 'SESSIONS'],
  d1Databases: ['DB'],
});

const testKV = await mf.getKVNamespace('KV');
const testSessionsKV = await mf.getKVNamespace('SESSIONS');
const testD1 = await mf.getD1Database('DB');

const TABLES_IN_DEPENDENCY_ORDER = [
  'schema_migrations',
  'log_image_associations',
  'log_tag_associations',
  'tag_associations',
  'images',
  'logs',
  'tags',
  'users',
];

const TRIGGERS_TO_DROP = [
  'logs_fts_insert',
  'logs_fts_update',
  'logs_fts_delete',
  'tags_fts_insert',
  'tags_fts_update',
  'tags_fts_delete',
];

const FTS_TABLES = [
  'logs_fts',
  'tags_fts',
];

async function execSqlStatements(sql: string): Promise<void> {
  // For triggers and other multi-statement blocks, we need to handle them specially
  // Split by semicolon but only at the end of complete statements
  const statements: string[] = [];
  let currentStatement = '';
  let inTrigger = false;
  
  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if we're starting a trigger
    if (trimmedLine.startsWith('CREATE TRIGGER')) {
      inTrigger = true;
    }
    
    currentStatement += line + '\n';
    
    // Check if we're ending a trigger
    if (inTrigger && trimmedLine === 'END;') {
      statements.push(currentStatement.trim());
      currentStatement = '';
      inTrigger = false;
    } else if (!inTrigger && trimmedLine.endsWith(';') && trimmedLine.length > 1) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  for (const statement of statements) {
    if (statement.length === 0) continue;
    
    const sqlStatement = statement.endsWith(';') ? statement : `${statement};`;
    if (process.env.DEBUG_D1_SQL === 'true') {
      console.log('Executing SQL:', sqlStatement);
    }
    await testD1.prepare(sqlStatement).run();
  }
}

async function applySchemas(): Promise<void> {
  for (const schema of DATABASE_SCHEMAS) {
    await execSqlStatements(schema);
  }
}

async function resetDatabase(): Promise<void> {
  try {
    await execSqlStatements('PRAGMA foreign_keys = OFF;');
  } catch (_) {
    // PRAGMA may not be supported by all runtimes; ignore if it fails.
  }

  // Drop triggers first
  for (const trigger of TRIGGERS_TO_DROP) {
    try {
      await execSqlStatements(`DROP TRIGGER IF EXISTS ${trigger};`);
    } catch (_) {
      // Ignore errors if trigger doesn't exist
    }
  }

  // Drop FTS tables
  for (const table of FTS_TABLES) {
    try {
      await execSqlStatements(`DROP TABLE IF EXISTS ${table};`);
    } catch (_) {
      // Ignore errors if table doesn't exist
    }
  }

  // Drop regular tables
  for (const table of TABLES_IN_DEPENDENCY_ORDER) {
    await execSqlStatements(`DROP TABLE IF EXISTS ${table};`);
  }

  try {
    await execSqlStatements('PRAGMA foreign_keys = ON;');
  } catch (_) {
    // Ignore if not supported.
  }

  await applySchemas();
}

await resetDatabase();

function buildEnv() {
  return {
    DB: testD1,
    KV: testKV,
    SESSIONS: testSessionsKV,
    TWITTER_CLIENT_ID: 'test_client_id',
    TWITTER_CLIENT_SECRET: 'test_client_secret',
    TWITTER_REDIRECT_URI: 'http://localhost:8787/auth/callback',
    NODE_ENV: 'test',
  } as const;
}

const app = createApp(buildEnv());

async function purgeKVNamespace(): Promise<void> {
  // KVとSESSIONS KVの両方をクリア
  for (const kv of [testKV, testSessionsKV]) {
    let cursor: string | undefined;
    do {
      const list = await kv.list({ cursor });
      if (list.keys.length > 0) {
        await Promise.all(list.keys.map((key) => kv.delete(key.name)));
      }
      cursor = list.list_complete ? undefined : ('cursor' in list ? list.cursor : undefined);
    } while (cursor);
  }
}

async function insertUser({
  id,
  twitterUsername,
  displayName,
  avatarUrl,
  role,
  createdAt,
}: {
  id: string;
  twitterUsername: string;
  displayName: string;
  avatarUrl?: string;
  role?: 'user' | 'admin';
  createdAt: string;
}): Promise<void> {
  await testD1
    .prepare(
      `INSERT OR IGNORE INTO users (id, twitter_username, display_name, avatar_url, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, twitterUsername, displayName, avatarUrl ?? null, role ?? 'user', createdAt)
    .run();
}

async function insertSession({
  token,
  userId,
  createdAt,
  expiresAt,
}: {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}): Promise<void> {
  // KVにセッションを保存
  const session = {
    token,
    user_id: userId,
    created_at: createdAt,
    expires_at: expiresAt
  };
  
  // TTLを計算（expiresAtまでの秒数）
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const ttlSeconds = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
  
  await testSessionsKV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds > 0 ? ttlSeconds : 30 * 24 * 60 * 60 // デフォルト30日
  });
  
  // ユーザーインデックスも追加
  const userSessionsKey = `user_sessions:${userId}`;
  const existingTokensJson = await testSessionsKV.get(userSessionsKey);
  const tokens = existingTokensJson ? JSON.parse(existingTokensJson) : [];
  if (!tokens.includes(token)) {
    tokens.push(token);
    await testSessionsKV.put(userSessionsKey, JSON.stringify(tokens), {
      expirationTtl: ttlSeconds > 0 ? ttlSeconds : 30 * 24 * 60 * 60
    });
  }
}

async function insertTag(tag: {
  id: string;
  name: string;
  description?: string;
  metadata?: object;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}): Promise<void> {
  await testD1
    .prepare(
      `INSERT INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tag.id,
      tag.name,
      tag.description ?? null,
      JSON.stringify(tag.metadata ?? {}),
      tag.createdBy,
      tag.createdAt,
      tag.updatedAt
    )
    .run();
}

async function insertLog(log: {
  id: string;
  userId: string;
  title?: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}): Promise<void> {
  await testD1
    .prepare(
      `INSERT INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      log.id,
      log.userId,
      log.title ?? null,
      log.content,
      log.isPublic ? 1 : 0,
      log.createdAt,
      log.updatedAt
    )
    .run();
}

async function associateLogTag(logId: string, tagId: string): Promise<void> {
  await testD1
    .prepare('INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id) VALUES (?, ?)')
    .bind(logId, tagId)
    .run();
}

export async function clearTestData(): Promise<void> {
  await purgeKVNamespace();
  await resetDatabase();
}

export async function createTestSession(userId: string = 'mock-user-id'): Promise<string> {
  const token = 'valid_session_token';
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await createTestUser(userId, `user_${userId}`);

  await insertSession({ token, userId, createdAt: now, expiresAt });
  return token;
}

export async function createTestUser(
  userId: string = 'mock-user-id', 
  username: string = 'testuser',
  role: 'user' | 'admin' = 'user'
): Promise<void> {
  const now = new Date().toISOString();
  await insertUser({
    id: userId,
    twitterUsername: username,
    displayName: `Test User ${username}`,
    avatarUrl: `https://example.com/avatar/${username}.jpg`,
    role,
    createdAt: now,
  });
}

export async function seedTestTags(): Promise<void> {
  await createTestUser('mock-user-id', 'tag_creator', 'admin'); // Make tag creator an admin
  const now = new Date().toISOString();
  const tags = [
    {
      id: TEST_TAG_IDS.ANIME,
      name: 'Anime',
      description: 'Japanese animation',
      metadata: { category: 'media' },
    },
    {
      id: TEST_TAG_IDS.ATTACK_ON_TITAN,
      name: 'Attack on Titan',
      description: 'Popular anime series',
      metadata: { category: 'series' },
    },
    {
      id: TEST_TAG_IDS.MANGA,
      name: 'Manga',
      description: 'Japanese comics',
      metadata: { category: 'media' },
    },
  ];

  for (const tag of tags) {
    await insertTag({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      metadata: tag.metadata,
      createdBy: 'mock-user-id',
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function seedTestLogs(): Promise<{
  ownerId: string;
  otherUserId: string;
  publicLogId: string;
  privateLogId: string;
  otherPublicLogId: string;
}> {
  const now = new Date().toISOString();
  const ownerId = 'user_log_owner';
  const otherUserId = 'user_other_owner';

  await createTestUser(ownerId, 'log_owner');
  await createTestUser(otherUserId, 'other_owner');
  await seedTestTags();

  await insertLog({
    id: 'log_public_entry',
    userId: ownerId,
    title: 'First Public Entry',
    content: '# Public Entry\nHello world',
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  });

  await insertLog({
    id: 'log_private_entry',
    userId: ownerId,
    title: 'Private Thoughts',
    content: 'Secret notes',
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  await insertLog({
    id: 'log_other_public_entry',
    userId: otherUserId,
    title: 'Friend Public Log',
    content: 'Sharing experiences',
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  });

  await associateLogTag('log_public_entry', TEST_TAG_IDS.ANIME);
  await associateLogTag('log_public_entry', TEST_TAG_IDS.MANGA);
  await associateLogTag('log_other_public_entry', TEST_TAG_IDS.MANGA);

  return {
    ownerId,
    otherUserId,
    publicLogId: 'log_public_entry',
    privateLogId: 'log_private_entry',
    otherPublicLogId: 'log_other_public_entry',
  };
}

export async function setupTestEnvironment(): Promise<string> {
  await clearTestData();
  await seedTestTags();
  return createTestSession();
}

export function getTestD1Database() {
  return testD1;
}

export function getTestSessionsKV() {
  return testSessionsKV;
}

export { app, testKV as mockKV, testSessionsKV as mockSessionsKV };
export default app;