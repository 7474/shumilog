-- Deterministic seed data for local development and testing
-- 複数のユーザー、タグ、ログを含む実用的なシードデータ
BEGIN TRANSACTION;

-- ユーザーデータ (Alice is admin, others are regular users)
INSERT OR IGNORE INTO users (id, twitter_username, display_name, avatar_url, role, created_at)
VALUES 
  ('73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', 'alice_anime', 'Alice アニメ好き', 'https://example.com/avatar/alice.jpg', 'admin', '2023-01-01T00:00:00Z'),
  ('7c750194-9e35-446d-afe3-299629c7150e', 'bob_gamer', 'Bob ゲーマー', 'https://example.com/avatar/bob.jpg', 'user', '2023-01-01T00:00:00Z'),
  ('00ac1168-a19c-4294-a6ad-1b995a6417ae', 'carol_music', 'Carol 音楽愛好家', 'https://example.com/avatar/carol.jpg', 'user', '2023-01-01T00:00:00Z'),
  ('e9629fd6-381f-4659-9218-d345b30e09b1', 'dave_manga', 'Dave マンガ読者', 'https://example.com/avatar/dave.jpg', 'user', '2023-01-01T00:00:00Z');

-- タグデータ（より多様なカテゴリ）
INSERT OR IGNORE INTO tags (id, name, description, metadata, created_by, created_at, updated_at)
VALUES 
  ('3e8d692f-d9ef-4b26-a708-c9ac352b16aa', 'Anime', 'Japanese animation', '{"category": "media"}', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('96057d51-7fe9-4198-9003-a0449509b632', 'Manga', 'Japanese comics', '{"category": "media"}', 'e9629fd6-381f-4659-9218-d345b30e09b1', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('33aa9586-20b9-4931-af1c-4f9ca431be8b', 'Gaming', 'Video games', '{"category": "media"}', '7c750194-9e35-446d-afe3-299629c7150e', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('e63b8815-4273-4b57-8708-9c961815bba6', 'Music', 'Music and songs', '{"category": "media"}', '00ac1168-a19c-4294-a6ad-1b995a6417ae', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('e709cc42-4780-4653-be03-3883b38fd39b', 'Attack on Titan', 'Popular anime and manga series', '{"category": "series"}', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('de4c5c8b-f8b0-413a-94a2-d00289a55ffa', 'RPG', 'Role-playing games', '{"category": "genre"}', '7c750194-9e35-446d-afe3-299629c7150e', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('56747c55-e194-4468-8627-edfe07ed1882', 'J-POP', 'Japanese pop music', '{"category": "genre"}', '00ac1168-a19c-4294-a6ad-1b995a6417ae', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  ('6599d94b-31d0-4dfa-80ba-3a94afb3c991', 'Shonen', 'Shonen manga/anime', '{"category": "genre"}', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

-- タグ関連付け（関連するタグ同士を紐付け）
INSERT OR IGNORE INTO tag_associations (tag_id, associated_tag_id, created_at, association_order)
VALUES 
  ('3e8d692f-d9ef-4b26-a708-c9ac352b16aa', '96057d51-7fe9-4198-9003-a0449509b632', '2023-01-01T00:00:00Z', 0),
  ('e709cc42-4780-4653-be03-3883b38fd39b', '3e8d692f-d9ef-4b26-a708-c9ac352b16aa', '2023-01-01T00:00:00Z', 0),
  ('e709cc42-4780-4653-be03-3883b38fd39b', '96057d51-7fe9-4198-9003-a0449509b632', '2023-01-01T00:00:00Z', 1),
  ('6599d94b-31d0-4dfa-80ba-3a94afb3c991', '3e8d692f-d9ef-4b26-a708-c9ac352b16aa', '2023-01-01T00:00:00Z', 0),
  ('6599d94b-31d0-4dfa-80ba-3a94afb3c991', '96057d51-7fe9-4198-9003-a0449509b632', '2023-01-01T00:00:00Z', 1),
  ('de4c5c8b-f8b0-413a-94a2-d00289a55ffa', '33aa9586-20b9-4931-af1c-4f9ca431be8b', '2023-01-01T00:00:00Z', 0),
  ('56747c55-e194-4468-8627-edfe07ed1882', 'e63b8815-4273-4b57-8708-9c961815bba6', '2023-01-01T00:00:00Z', 0);

-- ログデータ（公開・非公開、複数ユーザー）
INSERT OR IGNORE INTO logs (id, user_id, title, content_md, is_public, created_at, updated_at)
VALUES 
  -- Alice のログ
  ('fbd889fa-9dea-49f1-95fb-52a15213a1f7', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', '進撃の巨人 最終話を見た', '# 進撃の巨人 最終話の感想

ついに最終話を見ました！**エレンの選択**には本当に考えさせられました。

物語全体を通して、自由とは何かを問いかけられた気がします。', 1, '2023-01-05T10:30:00Z', '2023-01-05T10:30:00Z'),
  ('e80bc620-0d26-4ac4-bc38-1e1837860eb9', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', '今期アニメチェックリスト', '## 2023年冬アニメ

- 進撃の巨人 Final Season
- 鬼滅の刃 刀鍛冶の里編
- チェンソーマン

どれも楽しみ！', 1, '2023-01-03T14:20:00Z', '2023-01-03T14:20:00Z'),
  ('1f54649e-d354-4883-854e-2f62e6d260da', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', '個人的メモ', 'プライベートな感想。公開しない。', 0, '2023-01-04T09:15:00Z', '2023-01-04T09:15:00Z'),
  
  -- Bob のログ
  ('a215ef4d-7d59-438d-b789-524f9ee133ac', '7c750194-9e35-446d-afe3-299629c7150e', 'エルデンリング クリアした！', '# エルデンリング 100時間プレイ

**ついにクリアしました！**

マレニアが一番苦戦した。でも最高に楽しかった。

次は隠しエンディングを目指す。', 1, '2023-01-06T20:45:00Z', '2023-01-06T20:45:00Z'),
  ('96c20a42-1a68-43e8-9fc0-809507f3267a', '7c750194-9e35-446d-afe3-299629c7150e', 'おすすめRPGゲーム', '## 今年プレイしたRPG

1. エルデンリング ⭐⭐⭐⭐⭐
2. ペルソナ5 ロイヤル ⭐⭐⭐⭐⭐
3. ゼルダの伝説 ブレス オブ ザ ワイルド ⭐⭐⭐⭐⭐

どれも神ゲー！', 1, '2023-01-07T18:30:00Z', '2023-01-07T18:30:00Z'),
  
  -- Carol のログ
  ('a34c627d-12b6-4626-926b-76f027721415', '00ac1168-a19c-4294-a6ad-1b995a6417ae', 'YOASOBIの新曲が良い', '# YOASOBIの新アルバム

**アイドル**が特に好き！

メロディーも歌詞も素晴らしい。何度聞いても飽きない。', 1, '2023-01-08T15:00:00Z', '2023-01-08T15:00:00Z'),
  ('f05d6462-1bfd-46a9-9562-1747900e06b2', '00ac1168-a19c-4294-a6ad-1b995a6417ae', '2023年音楽フェス予定', '## フェス参加予定

- Summer Sonic 2023
- Rock in Japan 2023

今から楽しみ！', 1, '2023-01-02T12:00:00Z', '2023-01-02T12:00:00Z'),
  
  -- Dave のログ
  ('92a9cb7f-e7f4-4d27-9e34-5d1e2d9ec9e9', 'e9629fd6-381f-4659-9218-d345b30e09b1', '進撃の巨人 最新巻購入', 'マンガ版も完結。アニメとはまた違った味わい。

**諫山創先生**、お疲れ様でした！', 1, '2023-01-09T11:20:00Z', '2023-01-09T11:20:00Z'),
  ('14aeb7d6-8fe3-4d69-8072-ffa32f5b42c7', 'e9629fd6-381f-4659-9218-d345b30e09b1', '今月の購入予定', 'プライベートなメモ。', 0, '2023-01-10T08:00:00Z', '2023-01-10T08:00:00Z'),
  ('b1d773b0-9d42-4ee3-a9e1-e0a4e498f1ac', 'e9629fd6-381f-4659-9218-d345b30e09b1', '少年ジャンプ感想', '# 今週のジャンプ

ワンピース、またまた盛り上がってる！

ギア5の戦闘シーンは圧巻。', 1, '2023-01-11T19:00:00Z', '2023-01-11T19:00:00Z');

-- ログとタグの関連付け
INSERT OR IGNORE INTO log_tag_associations (log_id, tag_id, association_order, created_at)
VALUES 
  -- Alice のログとタグ
  ('fbd889fa-9dea-49f1-95fb-52a15213a1f7', '3e8d692f-d9ef-4b26-a708-c9ac352b16aa', 0, '2023-01-05T10:30:00Z'),
  ('fbd889fa-9dea-49f1-95fb-52a15213a1f7', 'e709cc42-4780-4653-be03-3883b38fd39b', 1, '2023-01-05T10:30:00Z'),
  ('fbd889fa-9dea-49f1-95fb-52a15213a1f7', '6599d94b-31d0-4dfa-80ba-3a94afb3c991', 2, '2023-01-05T10:30:00Z'),
  ('e80bc620-0d26-4ac4-bc38-1e1837860eb9', '3e8d692f-d9ef-4b26-a708-c9ac352b16aa', 0, '2023-01-03T14:20:00Z'),
  
  -- Bob のログとタグ
  ('a215ef4d-7d59-438d-b789-524f9ee133ac', '33aa9586-20b9-4931-af1c-4f9ca431be8b', 0, '2023-01-06T20:45:00Z'),
  ('a215ef4d-7d59-438d-b789-524f9ee133ac', 'de4c5c8b-f8b0-413a-94a2-d00289a55ffa', 1, '2023-01-06T20:45:00Z'),
  ('96c20a42-1a68-43e8-9fc0-809507f3267a', '33aa9586-20b9-4931-af1c-4f9ca431be8b', 0, '2023-01-07T18:30:00Z'),
  ('96c20a42-1a68-43e8-9fc0-809507f3267a', 'de4c5c8b-f8b0-413a-94a2-d00289a55ffa', 1, '2023-01-07T18:30:00Z'),
  
  -- Carol のログとタグ
  ('a34c627d-12b6-4626-926b-76f027721415', 'e63b8815-4273-4b57-8708-9c961815bba6', 0, '2023-01-08T15:00:00Z'),
  ('a34c627d-12b6-4626-926b-76f027721415', '56747c55-e194-4468-8627-edfe07ed1882', 1, '2023-01-08T15:00:00Z'),
  ('f05d6462-1bfd-46a9-9562-1747900e06b2', 'e63b8815-4273-4b57-8708-9c961815bba6', 0, '2023-01-02T12:00:00Z'),
  
  -- Dave のログとタグ
  ('92a9cb7f-e7f4-4d27-9e34-5d1e2d9ec9e9', '96057d51-7fe9-4198-9003-a0449509b632', 0, '2023-01-09T11:20:00Z'),
  ('92a9cb7f-e7f4-4d27-9e34-5d1e2d9ec9e9', 'e709cc42-4780-4653-be03-3883b38fd39b', 1, '2023-01-09T11:20:00Z'),
  ('b1d773b0-9d42-4ee3-a9e1-e0a4e498f1ac', '96057d51-7fe9-4198-9003-a0449509b632', 0, '2023-01-11T19:00:00Z'),
  ('b1d773b0-9d42-4ee3-a9e1-e0a4e498f1ac', '6599d94b-31d0-4dfa-80ba-3a94afb3c991', 1, '2023-01-11T19:00:00Z');

-- 画像データ（ユーザーが所有）
-- 注: 実際のR2オブジェクトは存在しないため、これらは表示されませんが、
-- データ構造とスキーマを示すためのサンプルデータです
INSERT OR IGNORE INTO images (id, user_id, r2_key, file_name, content_type, file_size, width, height, created_at)
VALUES 
  -- Alice の画像
  ('3579e853-e70d-432a-8848-e6c75db0e8b6', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', 'users/73f7a1b7-ba23-43e9-a154-2ae3cce85ec5/3579e853-e70d-432a-8848-e6c75db0e8b6.jpg', 'attack_on_titan_scene.jpg', 'image/jpeg', 245678, 1920, 1080, '2023-01-05T10:31:00Z'),
  ('b79993b2-32c1-46a7-b0be-549d72a9d768', '73f7a1b7-ba23-43e9-a154-2ae3cce85ec5', 'users/73f7a1b7-ba23-43e9-a154-2ae3cce85ec5/b79993b2-32c1-46a7-b0be-549d72a9d768.jpg', 'eren_final_scene.jpg', 'image/jpeg', 189234, 1280, 720, '2023-01-05T10:32:00Z'),
  
  -- Bob の画像
  ('30ec87a8-1fde-4503-9969-18e6d3ad3bb1', '7c750194-9e35-446d-afe3-299629c7150e', 'users/7c750194-9e35-446d-afe3-299629c7150e/30ec87a8-1fde-4503-9969-18e6d3ad3bb1.png', 'elden_ring_screenshot.png', 'image/png', 512345, 1920, 1080, '2023-01-06T20:46:00Z'),
  
  -- Carol の画像
  ('3b85377b-616d-4d5d-962c-550defe71c37', '00ac1168-a19c-4294-a6ad-1b995a6417ae', 'users/00ac1168-a19c-4294-a6ad-1b995a6417ae/3b85377b-616d-4d5d-962c-550defe71c37.jpg', 'concert_photo.jpg', 'image/jpeg', 378912, 1600, 1200, '2023-01-08T15:01:00Z'),
  ('760f7220-1952-4c5b-b536-7d14058c82c0', '00ac1168-a19c-4294-a6ad-1b995a6417ae', 'users/00ac1168-a19c-4294-a6ad-1b995a6417ae/760f7220-1952-4c5b-b536-7d14058c82c0.jpg', 'artist_photo.jpg', 'image/jpeg', 298456, 1280, 1280, '2023-01-08T15:02:00Z');

-- ログと画像の関連付け
INSERT OR IGNORE INTO log_image_associations (log_id, image_id, display_order, created_at)
VALUES 
  -- Alice のログに画像を関連付け
  ('fbd889fa-9dea-49f1-95fb-52a15213a1f7', '3579e853-e70d-432a-8848-e6c75db0e8b6', 0, '2023-01-05T10:31:00Z'),
  ('fbd889fa-9dea-49f1-95fb-52a15213a1f7', 'b79993b2-32c1-46a7-b0be-549d72a9d768', 1, '2023-01-05T10:32:00Z'),
  
  -- Bob のゲームログに画像を関連付け
  ('a215ef4d-7d59-438d-b789-524f9ee133ac', '30ec87a8-1fde-4503-9969-18e6d3ad3bb1', 0, '2023-01-06T20:46:00Z'),
  
  -- Carol の音楽ログに画像を関連付け
  ('a34c627d-12b6-4626-926b-76f027721415', '3b85377b-616d-4d5d-962c-550defe71c37', 0, '2023-01-08T15:01:00Z'),
  ('a34c627d-12b6-4626-926b-76f027721415', '760f7220-1952-4c5b-b536-7d14058c82c0', 1, '2023-01-08T15:02:00Z');

COMMIT;
