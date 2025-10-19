#!/usr/bin/env node
/**
 * セッション発行スクリプト
 * 
 * 開発時に特定のユーザーでログインした状態を作成するためのスクリプト
 * KVを使用してセッションを発行します。
 * 
 * 使用方法:
 *   npm run dev:create-session <user_id>
 *   npm run dev:create-session alice
 *   npm run dev:create-session user_alice
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { SessionModel } from '../models/Session.js';

// コマンドライン引数からユーザーIDを取得
const args = process.argv.slice(2);
const userInput = args[0];

if (!userInput) {
  console.error('エラー: ユーザーIDを指定してください');
  console.error('');
  console.error('使用方法:');
  console.error('  npm run dev:create-session <user_id>');
  console.error('');
  console.error('例:');
  console.error('  npm run dev:create-session alice');
  console.error('  npm run dev:create-session 73f7a1b7-ba23-43e9-a154-2ae3cce85ec5');
  console.error('');
  console.error('シードデータのユーザー:');
  console.error('  - alice (73f7a1b7-ba23-43e9-a154-2ae3cce85ec5)');
  console.error('  - bob (7c750194-9e35-446d-afe3-299629c7150e)');
  console.error('  - carol (00ac1168-a19c-4294-a6ad-1b995a6417ae)');
  console.error('  - dave (e9629fd6-381f-4659-9218-d345b30e09b1)');
  process.exit(1);
}

// 短縮名を完全なユーザーIDに変換
const userIdMap: Record<string, string> = {
  'alice': '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5',
  'bob': '7c750194-9e35-446d-afe3-299629c7150e',
  'carol': '00ac1168-a19c-4294-a6ad-1b995a6417ae',
  'dave': 'e9629fd6-381f-4659-9218-d345b30e09b1',
  // 後方互換性のため旧IDもサポート
  'user_alice': '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5',
  'user_bob': '7c750194-9e35-446d-afe3-299629c7150e',
  'user_carol': '00ac1168-a19c-4294-a6ad-1b995a6417ae',
  'user_dave': 'e9629fd6-381f-4659-9218-d345b30e09b1',
};

const userId = userIdMap[userInput.toLowerCase()] || userInput;

async function createSession() {
  console.log('セッション発行を開始します...');
  console.log(`ユーザーID: ${userId}`);
  console.log('');

  try {
    // ユーザーが存在するか確認
    const checkUserSql = `SELECT id, twitter_username, display_name FROM users WHERE id = '${userId}';`;
    const tempCheckFile = '/tmp/check-user.sql';
    writeFileSync(tempCheckFile, checkUserSql);
    
    let userCheckResult: string;
    try {
      userCheckResult = execSync(
        `NO_D1_WARNING=true wrangler d1 execute shumilog-db-dev --local --file ${tempCheckFile}`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (_error: any) {
      console.error('エラー: データベースへのアクセスに失敗しました');
      console.error('');
      console.error('以下を確認してください:');
      console.error('1. マイグレーションが実行されているか: npm run db:migrate');
      console.error('2. シードデータが投入されているか: npm run db:seed');
      process.exit(1);
    } finally {
      unlinkSync(tempCheckFile);
    }

    // ユーザーが見つからない場合
    if (!userCheckResult || userCheckResult.includes('Rows: 0') || !userCheckResult.includes(userId)) {
      console.error(`エラー: ユーザーID "${userId}" が見つかりません`);
      console.error('');
      console.error('シードデータが投入されていない可能性があります。');
      console.error('以下のコマンドを実行してシードデータを投入してください:');
      console.error('  npm run db:seed');
      console.error('');
      console.error('利用可能なユーザー:');
      console.error('  - alice (user_alice)');
      console.error('  - bob (user_bob)');
      console.error('  - carol (user_carol)');
      console.error('  - dave (user_dave)');
      process.exit(1);
    }

    // ユーザー情報を抽出（簡易パース）
    const displayNameMatch = userCheckResult.match(/display_name[:\s|]+([^\n|]+)/);
    const twitterUsernameMatch = userCheckResult.match(/twitter_username[:\s|]+([^\n|]+)/);
    const displayName = displayNameMatch ? displayNameMatch[1].trim() : userId;
    const twitterUsername = twitterUsernameMatch ? twitterUsernameMatch[1].trim() : 'unknown';

    console.log(`✓ ユーザーを確認しました: ${displayName} (@${twitterUsername})`);
    console.log('');

    // セッショントークンを生成（SessionModelを使用してサービス層のロジックを再利用）
    const sessionToken = SessionModel.generateToken();
    const expiresAt = SessionModel.createExpiryDate(30); // 30日間有効
    const now = new Date().toISOString();

    // セッションデータをJSON形式で作成
    const sessionData = {
      token: sessionToken,
      user_id: userId,
      created_at: now,
      expires_at: expiresAt
    };

    // KVにセッションを保存（wrangler kv:key put コマンドを使用）
    const sessionKey = `session:${sessionToken}`;
    const sessionValue = JSON.stringify(sessionData);
    const ttlSeconds = 30 * 24 * 60 * 60; // 30日

    try {
      execSync(
        `wrangler kv:key put --local "${sessionKey}" '${sessionValue}' --ttl ${ttlSeconds} --binding SESSIONS`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (error: any) {
      console.error('エラー: セッションのKVへの保存に失敗しました');
      console.error(error.message);
      console.error('');
      console.error('開発サーバーが起動していることを確認してください:');
      console.error('  npm run dev');
      process.exit(1);
    }

    // ユーザーインデックスも更新
    const userSessionsKey = `user_sessions:${userId}`;
    try {
      // 既存のトークンリストを取得
      let existingTokens: string[] = [];
      try {
        const existingValue = execSync(
          `wrangler kv:key get --local "${userSessionsKey}" --binding SESSIONS`,
          { encoding: 'utf8', stdio: 'pipe' }
        ).trim();
        if (existingValue) {
          existingTokens = JSON.parse(existingValue);
        }
      } catch {
        // キーが存在しない場合は空配列
      }

      // 新しいトークンを追加
      if (!existingTokens.includes(sessionToken)) {
        existingTokens.push(sessionToken);
      }

      execSync(
        `wrangler kv:key put --local "${userSessionsKey}" '${JSON.stringify(existingTokens)}' --ttl ${ttlSeconds} --binding SESSIONS`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (error: any) {
      console.warn('警告: ユーザーインデックスの更新に失敗しました（セッション自体は有効です）');
      console.warn(error.message);
    }

    console.log('✓ セッションの発行に成功しました！');
    console.log('');
    console.log('==========================================');
    console.log('セッショントークン:');
    console.log(sessionToken);
    console.log('==========================================');
    console.log('');
    console.log('このトークンを使用してAPIをテストできます:');
    console.log('');
    console.log('curlの例:');
    console.log(`  curl -X GET http://localhost:8787/api/users/me \\`);
    console.log(`    -H "Cookie: session=${sessionToken}"`);
    console.log('');
    console.log('または、ブラウザの開発者ツールでCookieを設定:');
    console.log(`  名前: session`);
    console.log(`  値: ${sessionToken}`);
    console.log(`  ドメイン: localhost`);
    console.log(`  パス: /`);
    console.log('');
    console.log('注意: このセッションは30日間有効です。');

  } catch (error: any) {
    console.error('エラー: セッションの発行に失敗しました');
    console.error(error.message || error);
    process.exit(1);
  }
}

createSession();
