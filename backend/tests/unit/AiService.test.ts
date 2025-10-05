import { describe, it, expect, vi } from 'vitest';
import { AiService, type AiBinding } from '../../src/services/AiService';

describe('AiService', () => {
  describe('generateEnhancedTagContent', () => {
    it('should generate enhanced content from AI response in markdown format', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          response: `人類と巨人の戦いを描くダークファンタジー作品。連載作品として大きな人気を博しました。

**関連タグ**: #マンガ #アニメ #ダークファンタジー #バトル #諫山創

### 主要キャラクター
- #エレン
- #ミカサ
- #アルミン
- #リヴァイ

### 主要部隊
- #調査兵団
- #駐屯兵団
- #憲兵団`
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateEnhancedTagContent({
        tagName: '進撃の巨人',
        wikipediaContent: '進撃の巨人は、諫山創による日本の漫画作品。',
        wikipediaUrl: 'https://ja.wikipedia.org/wiki/進撃の巨人',
        requestedTagName: '進撃の巨人'
      });

      expect(result.markdown).toBeTruthy();
      expect(result.markdown).toContain('人類と巨人の戦い');
      expect(result.markdown).toContain('**関連タグ**');
      expect(result.markdown).toContain('#マンガ');
      expect(result.markdown).toContain('#アニメ');
      expect(result.markdown).toContain('### 主要キャラクター');
    });

    it('should generate enhanced content with requested tag name in prompt', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          response: `イギリスに関する情報です。

**関連タグ**: #ヨーロッパ #連合王国 #イングランド

### 概要
- イギリスは正式には連合王国です`
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateEnhancedTagContent({
        tagName: 'イギリス',
        wikipediaContent: '<html><head><title>イギリス - Wikipedia</title></head><body>イギリス（連合王国）は...</body></html>',
        wikipediaUrl: 'https://ja.wikipedia.org/wiki/イギリス',
        requestedTagName: 'UK'
      });

      expect(result.markdown).toBeTruthy();
      expect(result.markdown).toContain('イギリスに関する情報');
      
      // Verify that the AI was called with the correct prompt containing the requested tag name
      expect(mockAi.run).toHaveBeenCalledWith(
        '@cf/openai/gpt-oss-120b',
        expect.objectContaining({
          prompt: expect.stringContaining('UK')
        })
      );
      
      // Verify that the prompt also contains the redirect instruction
      const callArgs = (mockAi.run as any).mock.calls[0];
      expect(callArgs[1].prompt).toContain('参照記事のタイトルとタグ名が異なる場合');
    });

    it('should handle AI response without subsections', async () => {
      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          response: `シンプルな説明文です。

**関連タグ**: #タグ1 #タグ2`
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateEnhancedTagContent({
        tagName: 'テスト',
        wikipediaContent: 'テスト内容',
        wikipediaUrl: 'https://ja.wikipedia.org/wiki/テスト',
        requestedTagName: 'テスト'
      });

      expect(result.markdown).toBeTruthy();
      expect(result.markdown).toContain('シンプルな説明文');
      expect(result.markdown).toContain('#タグ1');
      expect(result.markdown).toContain('#タグ2');
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
          wikipediaUrl: 'https://ja.wikipedia.org/wiki/テスト',
          requestedTagName: 'テスト'
        })
      ).rejects.toThrow('Failed to generate AI-enhanced content');
    });
  });

  describe('formatAsMarkdown', () => {
    it('should wrap AI markdown output with comments and add Wikipedia source', () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      const output = {
        markdown: `テストの説明文です。

**関連タグ**: #タグ1 #タグ2 #タグ3

### セクション1
- #サブタグ1
- #サブタグ2`
      };

      const markdown = aiService.formatAsMarkdown(
        output,
        'https://ja.wikipedia.org/wiki/テスト'
      );

      // AI生成マーカーを確認
      expect(markdown).toContain('<!-- AI生成コンテンツ開始 -->');
      expect(markdown).toContain('<!-- AI生成コンテンツ終了 -->');
      
      // AI生成内容がそのまま含まれていることを確認
      expect(markdown).toContain('テストの説明文');
      expect(markdown).toContain('**関連タグ**');
      expect(markdown).toContain('#タグ1');
      expect(markdown).toContain('#タグ2');
      expect(markdown).toContain('#タグ3');
      expect(markdown).toContain('### セクション1');
      expect(markdown).toContain('- #サブタグ1');
      expect(markdown).toContain('- #サブタグ2');
      
      // Wikipedia出典を確認
      expect(markdown).toContain('出典: [Wikipedia]');
      expect(markdown).toContain('https://ja.wikipedia.org/wiki/テスト');
    });

    it('should handle simple markdown without subsections', () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      const output = {
        markdown: `シンプルな説明

**関連タグ**: #タグ1 #タグ2`
      };

      const markdown = aiService.formatAsMarkdown(
        output,
        'https://ja.wikipedia.org/wiki/テスト'
      );

      expect(markdown).toContain('<!-- AI生成コンテンツ開始 -->');
      expect(markdown).toContain('シンプルな説明');
      expect(markdown).toContain('#タグ1');
      expect(markdown).not.toContain('###'); // セクション見出しがないことを確認
    });

    it('should handle markdown with tags containing spaces', () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      const output = {
        markdown: `タグ名に空白を含む例

**関連タグ**: #{Attack on Titan} #{進撃の巨人 第1期} #シンプルタグ #{Another Tag}

### 主要キャラクター
- #{Eren Yeager}
- #ミカサ
- #{Armin Arlert}`
      };

      const markdown = aiService.formatAsMarkdown(
        output,
        'https://ja.wikipedia.org/wiki/進撃の巨人'
      );

      // 空白を含むタグは #{} 形式で保持されていることを確認
      expect(markdown).toContain('#{Attack on Titan}');
      expect(markdown).toContain('#{進撃の巨人 第1期}');
      expect(markdown).toContain('#{Another Tag}');
      expect(markdown).toContain('#{Eren Yeager}');
      expect(markdown).toContain('#{Armin Arlert}');
      
      // 空白を含まないタグは # 形式で保持されていることを確認
      expect(markdown).toContain('#シンプルタグ');
      expect(markdown).toContain('#ミカサ');
    });
  });
});
