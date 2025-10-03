import { describe, it, expect, vi } from 'vitest';
import { AiService, type AiBinding } from '../../src/services/AiService';

describe('AiService', () => {
  describe('generateEnhancedTagContent', () => {
    it('should generate enhanced content from AI response', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          response: `要約: 人類と巨人の戦いを描くダークファンタジー作品
関連タグ: #マンガ #アニメ #ダークファンタジー #バトル #諫山創
サブセクション:
- 主要キャラクター: #エレン #ミカサ #アルミン #リヴァイ
- 主要部隊: #調査兵団 #駐屯兵団 #憲兵団`
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateEnhancedTagContent({
        tagName: '進撃の巨人',
        wikipediaContent: '進撃の巨人は、諫山創による日本の漫画作品。',
        wikipediaUrl: 'https://ja.wikipedia.org/wiki/進撃の巨人'
      });

      expect(result.summary).toBeTruthy();
      expect(result.relatedTags).toBeInstanceOf(Array);
      expect(result.relatedTags.length).toBeGreaterThan(0);
      expect(result.relatedTags).toContain('マンガ');
      expect(result.relatedTags).toContain('アニメ');
      
      expect(result.subsections).toBeDefined();
      expect(result.subsections?.length).toBeGreaterThan(0);
    });

    it('should handle AI response without subsections', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          response: `要約: シンプルな説明
関連タグ: #タグ1 #タグ2`
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateEnhancedTagContent({
        tagName: 'テスト',
        wikipediaContent: 'テスト内容',
        wikipediaUrl: 'https://ja.wikipedia.org/wiki/テスト'
      });

      expect(result.summary).toBeTruthy();
      expect(result.relatedTags).toContain('タグ1');
      expect(result.relatedTags).toContain('タグ2');
      expect(result.subsections).toBeUndefined();
    });

    it('should throw error when AI request fails', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockRejectedValue(new Error('AI service unavailable'))
      };

      const aiService = new AiService(mockAi);
      
      await expect(
        aiService.generateEnhancedTagContent({
          tagName: 'テスト',
          wikipediaContent: 'テスト内容',
          wikipediaUrl: 'https://ja.wikipedia.org/wiki/テスト'
        })
      ).rejects.toThrow('Failed to generate AI-enhanced content');
    });
  });

  describe('formatAsMarkdown', () => {
    it('should format AI output as markdown with comments', () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      const output = {
        summary: 'テストの説明',
        relatedTags: ['タグ1', 'タグ2', 'タグ3'],
        subsections: [
          {
            title: 'セクション1',
            tags: ['サブタグ1', 'サブタグ2']
          }
        ]
      };

      const markdown = aiService.formatAsMarkdown(
        output,
        'https://ja.wikipedia.org/wiki/テスト'
      );

      // AI生成マーカーを確認
      expect(markdown).toContain('<!-- AI生成コンテンツ開始 -->');
      expect(markdown).toContain('<!-- AI生成コンテンツ終了 -->');
      
      // 要約を確認
      expect(markdown).toContain('テストの説明');
      
      // 関連タグを確認
      expect(markdown).toContain('**関連タグ**');
      expect(markdown).toContain('#タグ1');
      expect(markdown).toContain('#タグ2');
      expect(markdown).toContain('#タグ3');
      
      // サブセクションを確認
      expect(markdown).toContain('### セクション1');
      expect(markdown).toContain('- #サブタグ1');
      expect(markdown).toContain('- #サブタグ2');
      
      // Wikipedia出典を確認
      expect(markdown).toContain('出典: [Wikipedia]');
      expect(markdown).toContain('https://ja.wikipedia.org/wiki/テスト');
    });

    it('should format without subsections when not provided', () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      const output = {
        summary: 'シンプルな説明',
        relatedTags: ['タグ1', 'タグ2']
      };

      const markdown = aiService.formatAsMarkdown(
        output,
        'https://ja.wikipedia.org/wiki/テスト'
      );

      expect(markdown).toContain('<!-- AI生成コンテンツ開始 -->');
      expect(markdown).toContain('シンプルな説明');
      expect(markdown).toContain('#タグ1');
      expect(markdown).not.toContain('###');
    });
  });

  describe('extractHashtags', () => {
    it('should extract hashtags in both formats', () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      
      // プライベートメソッドなので、間接的にテスト
      // formatAsMarkdownを通じて動作を確認
      const output = {
        summary: 'テスト',
        relatedTags: ['テスト タグ', 'シンプルタグ', 'Test123']
      };

      const markdown = aiService.formatAsMarkdown(output, 'https://test.com');
      
      // 両方の形式が含まれていることを確認
      expect(markdown).toContain('#テスト タグ');
      expect(markdown).toContain('#シンプルタグ');
      expect(markdown).toContain('#Test123');
    });
  });
});
