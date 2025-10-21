import { describe, it, expect, vi } from 'vitest';
import { AiService, type AiBinding } from '../../src/services/AiService';

describe('AiService', () => {
  describe('generateTagContentFromName', () => {
    it('should fetch Wikipedia content and generate AI-enhanced content with metadata', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `人類と巨人の戦いを描くダークファンタジー作品。

**関連タグ**: #マンガ #アニメ #ダークファンタジー

### 参考リンク
- [公式サイト](https://shingeki.tv/)
- [関連情報](https://example.com/info)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('進撃の巨人');

      expect(result.content).toBeTruthy();
      expect(result.content).toContain('人類と巨人の戦い');
      expect(result.content).toContain('**関連タグ**');
      expect(result.content).toContain('### 参考リンク');
      expect(result.content).toContain('公式サイト');
    });

    it('should handle AI response when Wikipedia page does not exist', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `「30 MINUTES FANTASY」に関するWikipedia記事が見つかりませんでした。`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('30 MINUTES FANTASY');

      expect(result.content).toBeTruthy();
      expect(result.content).toContain('Wikipedia記事が見つかりませんでした');
      expect(result.content).toContain('30 MINUTES FANTASY');
      // AIは呼ばれる（プロンプトでWikipedia確認を依頼）
      expect(mockAi.run).toHaveBeenCalled();
    });

    it('should verify improved prompt includes accurate summary instructions', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `円谷プロダクションの特撮テレビドラマ『電光超人グリッドマン』を原作とする、TRIGGERによるテレビアニメ作品。

**関連タグ**: #TRIGGER #円谷プロダクション #電光超人グリッドマン #{SSSS.DYNAZENON}

### シリーズ作品
- #電光超人グリッドマン
- #{SSSS.DYNAZENON}

出典: [Wikipedia](https://ja.wikipedia.org/wiki/SSSS.GRIDMAN)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('SSSS.GRIDMAN');

      expect(result.content).toBeTruthy();
      expect(result.content).toContain('円谷プロダクション');
      expect(result.content).toContain('電光超人グリッドマン');
      expect(result.content).toContain('TRIGGER');
      // Check that the prompt was called
      expect(mockAi.run).toHaveBeenCalled();
      
      // Verify the system prompt includes key instructions
      const systemPrompt = (mockAi.run as any).mock.calls[0][1].input[0].content;
      expect(systemPrompt).toContain('Wikipedia記事を参照して正確な情報を抽出');
      expect(systemPrompt).toContain('ハルシネーション厳禁');
      expect(systemPrompt).toContain('記事の冒頭部分から正確に要約を作成');
      expect(systemPrompt).toContain('ハッシュタグ正規化');
      expect(systemPrompt).toContain('サブタイトル・エピソード情報がある場合は必ずすべて列挙');
    });

    it('should verify improved prompt includes hashtag normalization rules', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト作品。

**関連タグ**: #テストタグ

出典: [Wikipedia](https://ja.wikipedia.org/wiki/Test)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      await aiService.generateTagContentFromName('テスト');

      // Verify the user prompt includes hashtag normalization instructions
      const userPrompt = (mockAi.run as any).mock.calls[0][1].input[1].content;
      expect(userPrompt).toContain('ハッシュタグ正規化ルール');
      expect(userPrompt).toContain('メディアタイプを除去');
      expect(userPrompt).toContain('カッコ書きを除去');
      expect(userPrompt).toContain('空白なし=#タグ名、空白あり=#{タグ名}');
      expect(userPrompt).toContain('例: 「アニメ SSSS.DYNAZENON」→「SSSS.DYNAZENON」');
    });

    it('should verify improved prompt emphasizes subtitle enumeration', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト作品。

**関連タグ**: #テストタグ

### シーズン
- #{Season 1}
- #{Season 2}

出典: [Wikipedia](https://ja.wikipedia.org/wiki/Test)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      await aiService.generateTagContentFromName('テスト');

      // Verify the user prompt includes subtitle enumeration instructions
      const userPrompt = (mockAi.run as any).mock.calls[0][1].input[1].content;
      expect(userPrompt).toContain('連載・シリーズ作品の場合は必須');
      expect(userPrompt).toContain('シーズン・期');
      expect(userPrompt).toContain('章・巻');
      expect(userPrompt).toContain('エピソード・各話タイトル');
      expect(userPrompt).toContain('必ずすべて列挙');
      expect(userPrompt).toContain('省略せず、記事に記載されているものをすべて列挙');
    });

    it('should verify prompt includes Wikipedia search instructions', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト作品。

**関連タグ**: #テストタグ

出典: [Wikipedia](https://ja.wikipedia.org/wiki/Test)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      await aiService.generateTagContentFromName('きみの色');

      // Verify the system prompt includes Wikipedia search best practices
      const systemPrompt = (mockAi.run as any).mock.calls[0][1].input[0].content;
      expect(systemPrompt).toContain('Wikipedia検索のベストプラクティス');
      expect(systemPrompt).toContain('直接URLアクセスを試す');
      expect(systemPrompt).toContain('OpenSearch API');
      expect(systemPrompt).toContain('リダイレクトは自動的に追跡');
      expect(systemPrompt).toContain('曖昧さ回避ページ');
      
      // Verify the user prompt includes detailed search steps
      const userPrompt = (mockAi.run as any).mock.calls[0][1].input[1].content;
      expect(userPrompt).toContain('検索手順（以下の順番で試してください）');
      expect(userPrompt).toContain('直接アクセス');
      expect(userPrompt).toContain('Wikipedia検索API');
      expect(userPrompt).toContain('類似記事の検索');
      expect(userPrompt).toContain('リダイレクトの追跡');
      expect(userPrompt).toContain('ひらがな・カタカナ・漢字の変換');
    });
  });
});
