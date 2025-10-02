-- Deterministic seed data for local development and testing
-- 複数のユーザー、タグ、ログを含む実用的なシードデータ
BEGIN TRANSACTION;

-- ユーザーデータ
INSERT OR IGNORE INTO users (id, twitter_username, display_name, avatar_url, created_at)
VALUES 
  ('user_alice', 'alice_anime', 'Alice アニメ好き', 'https://example.com/avatar/alice.jpg', '2023-01-01T00:00:00Z'),
  ('user_bob', 'bob_gamer', 'Bob ゲーマー', 'https://example.com/avatar/bob.jpg', '2023-01-01T00:00:00Z'),
  ('user_carol', 'carol_music', 'Carol 音楽愛好家', 'https://example.com/avatar/carol.jpg', '2023-01-01T00:00:00Z'),
  ('user_dave', 'dave_manga', 'Dave マンガ読者', 'https://example.com/avatar/dave.jpg', '2023-01-01T00:00:00Z');

-- タグデータ（より多様なカテゴリ）
INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
VALUES 
  ('tag_anime', 'Anime', 'Japanese animation', '{"category": "media"}', 'user_alice', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_manga', 'Manga', 'Japanese comics', '{"category": "media"}', 'user_dave', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_gaming', 'Gaming', 'Video games', '{"category": "media"}', 'user_bob', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_music', 'Music', 'Music and songs', '{"category": "media"}', 'user_carol', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_attack_on_titan', 'Attack on Titan', 'Popular anime and manga series', '{"category": "series"}', 'user_alice', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_rpg', 'RPG', 'Role-playing games', '{"category": "genre"}', 'user_bob', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_jpop', 'J-POP', 'Japanese pop music', '{"category": "genre"}', 'user_carol', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('tag_shonen', 'Shonen', 'Shonen manga/anime', '{"category": "genre"}', 'user_alice', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

-- タグ関連付け（関連するタグ同士を紐付け）
INSERT OR IGNORE INTO tag_associations (tag_id, associated_tag_id, created_at)
VALUES 
  ('tag_anime', 'tag_manga', '2023-01-01T00:00:00Z'),
  ('tag_attack_on_titan', 'tag_anime', '2023-01-01T00:00:00Z'),
  ('tag_attack_on_titan', 'tag_manga', '2023-01-01T00:00:00Z'),
  ('tag_shonen', 'tag_anime', '2023-01-01T00:00:00Z'),
  ('tag_shonen', 'tag_manga', '2023-01-01T00:00:00Z'),
  ('tag_rpg', 'tag_gaming', '2023-01-01T00:00:00Z'),
  ('tag_jpop', 'tag_music', '2023-01-01T00:00:00Z');

-- ログデータ（公開・非公開、複数ユーザー）
INSERT OR IGNORE INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
VALUES 
  -- Alice のログ
  ('log_alice_1', 'user_alice', '進撃の巨人 最終話を見た', '# 進撃の巨人 最終話の感想\n\nついに最終話を見ました！**エレンの選択**には本当に考えさせられました。\n\n物語全体を通して、自由とは何かを問いかけられた気がします。', 1, '2023-01-05T10:30:00Z', '2023-01-05T10:30:00Z'),
  ('log_alice_2', 'user_alice', '今期アニメチェックリスト', '## 2023年冬アニメ\n\n- 進撃の巨人 Final Season\n- 鬼滅の刃 刀鍛冶の里編\n- チェンソーマン\n\nどれも楽しみ！', 1, '2023-01-03T14:20:00Z', '2023-01-03T14:20:00Z'),
  ('log_alice_3', 'user_alice', '個人的メモ', 'プライベートな感想。公開しない。', 0, '2023-01-04T09:15:00Z', '2023-01-04T09:15:00Z'),
  
  -- Bob のログ
  ('log_bob_1', 'user_bob', 'エルデンリング クリアした！', '# エルデンリング 100時間プレイ\n\n**ついにクリアしました！**\n\nマレニアが一番苦戦した。でも最高に楽しかった。\n\n次は隠しエンディングを目指す。', 1, '2023-01-06T20:45:00Z', '2023-01-06T20:45:00Z'),
  ('log_bob_2', 'user_bob', 'おすすめRPGゲーム', '## 今年プレイしたRPG\n\n1. エルデンリング ⭐⭐⭐⭐⭐\n2. ペルソナ5 ロイヤル ⭐⭐⭐⭐⭐\n3. ゼルダの伝説 ブレス オブ ザ ワイルド ⭐⭐⭐⭐⭐\n\nどれも神ゲー！', 1, '2023-01-07T18:30:00Z', '2023-01-07T18:30:00Z'),
  
  -- Carol のログ
  ('log_carol_1', 'user_carol', 'YOASOBIの新曲が良い', '# YOASOBIの新アルバム\n\n**アイドル**が特に好き！\n\nメロディーも歌詞も素晴らしい。何度聞いても飽きない。', 1, '2023-01-08T15:00:00Z', '2023-01-08T15:00:00Z'),
  ('log_carol_2', 'user_carol', '2023年音楽フェス予定', '## フェス参加予定\n\n- Summer Sonic 2023\n- Rock in Japan 2023\n\n今から楽しみ！', 1, '2023-01-02T12:00:00Z', '2023-01-02T12:00:00Z'),
  
  -- Dave のログ
  ('log_dave_1', 'user_dave', '進撃の巨人 最新巻購入', 'マンガ版も完結。アニメとはまた違った味わい。\n\n**諫山創先生**、お疲れ様でした！', 1, '2023-01-09T11:20:00Z', '2023-01-09T11:20:00Z'),
  ('log_dave_2', 'user_dave', '今月の購入予定', 'プライベートなメモ。', 0, '2023-01-10T08:00:00Z', '2023-01-10T08:00:00Z'),
  ('log_dave_3', 'user_dave', '少年ジャンプ感想', '# 今週のジャンプ\n\nワンピース、またまた盛り上がってる！\n\nギア5の戦闘シーンは圧巻。', 1, '2023-01-11T19:00:00Z', '2023-01-11T19:00:00Z');

-- ログとタグの関連付け
INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id)
VALUES 
  -- Alice のログとタグ
  ('log_alice_1', 'tag_anime'),
  ('log_alice_1', 'tag_attack_on_titan'),
  ('log_alice_1', 'tag_shonen'),
  ('log_alice_2', 'tag_anime'),
  
  -- Bob のログとタグ
  ('log_bob_1', 'tag_gaming'),
  ('log_bob_1', 'tag_rpg'),
  ('log_bob_2', 'tag_gaming'),
  ('log_bob_2', 'tag_rpg'),
  
  -- Carol のログとタグ
  ('log_carol_1', 'tag_music'),
  ('log_carol_1', 'tag_jpop'),
  ('log_carol_2', 'tag_music'),
  
  -- Dave のログとタグ
  ('log_dave_1', 'tag_manga'),
  ('log_dave_1', 'tag_attack_on_titan'),
  ('log_dave_3', 'tag_manga'),
  ('log_dave_3', 'tag_shonen');

COMMIT;
