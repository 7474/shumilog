#!/usr/bin/env node
/**
 * ユーザーセッション作成スクリプト
 * 
 * シードデータ内のユーザーのセッションを作成し、動作確認に使用できるセッショントークンを出力します。
 * 
 * 使用方法:
 *   npm run db:create-session <user_id>
 * 
 * 例:
 *   npm run db:create-session user_alice
 *   npm run db:create-session user_bob
 */

import { getLocalDatabase } from './local-db.js';

const SEED_USERS = [
  { id: 'user_alice', name: 'Alice アニメ好き', username: '@alice_anime' },
  { id: 'user_bob', name: 'Bob ゲーマー', username: '@bob_gamer' },
  { id: 'user_carol', name: 'Carol 音楽愛好家', username: '@carol_music' },
  { id: 'user_dave', name: 'Dave マンガ読者', username: '@dave_manga' },
];

async function createSession(userId: string): Promise<string> {
  const db = await getLocalDatabase();
  
  // ユーザーが存在するか確認
  const user = await db.prepare('SELECT id, display_name FROM users WHERE id = ?')
    .bind(userId)
    .first();
  
  if (!user) {
    throw new Error(`ユーザー "${userId}" が見つかりません。先に npm run db:seed を実行してください。`);
  }
  
  // セッショントークンを生成（UUIDv4形式）
  const token = crypto.randomUUID();
  
  // 有効期限を30日後に設定
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // セッションを作成
  await db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(token, userId, now.toISOString(), expiresAt.toISOString())
    .run();
  
  return token;
}

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0];
  
  if (!userId) {
    console.error('エラー: ユーザーIDを指定してください。\n');
    console.log('使用方法:');
    console.log('  npm run db:create-session <user_id>\n');
    console.log('利用可能なユーザー:');
    SEED_USERS.forEach(user => {
      console.log(`  ${user.id.padEnd(15)} - ${user.name} (${user.username})`);
    });
    process.exit(1);
  }
  
  try {
    console.log(`\n🔑 セッションを作成中: ${userId}`);
    const token = await createSession(userId);
    
    console.log('\n✅ セッション作成成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('セッショントークン:');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('使用例:\n');
    console.log('# curlでの使用:');
    console.log(`curl -X POST http://localhost:8787/logs \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Cookie: session=${token}" \\`);
    console.log(`  -d '{"title":"テストログ","content_md":"# テスト","is_public":true}'\n`);
    
    console.log('# HTTPieでの使用:');
    console.log(`http POST localhost:8787/logs \\`);
    console.log(`  Cookie:session=${token} \\`);
    console.log(`  title="テストログ" content_md="# テスト" is_public:=true\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラー:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
