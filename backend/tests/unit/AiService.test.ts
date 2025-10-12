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

      // Wikipedia存在チェックをモック
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ extract: 'Test content' })
      } as Response);

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('進撃の巨人');

      expect(result.content).toBeTruthy();
      expect(result.content).toContain('人類と巨人の戦い');
      expect(result.content).toContain('**関連タグ**');
      expect(result.content).toContain('### 参考リンク');
      expect(result.content).toContain('公式サイト');
    });

    it('should return appropriate message when Wikipedia page does not exist', async () => {
      const mockAi: AiBinding = {
        run: vi.fn()
      };

      // Wikipedia存在チェックで404を返す
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('30 MINUTES FANTASY');

      expect(result.content).toBeTruthy();
      expect(result.content).toContain('Wikipedia記事が見つかりませんでした');
      expect(result.content).toContain('30 MINUTES FANTASY');
      expect(result.content).toContain('<!-- AI生成コンテンツ開始 -->');
      expect(result.content).toContain('<!-- AI生成コンテンツ終了 -->');
      // AIは呼ばれない
      expect(mockAi.run).not.toHaveBeenCalled();
    });
  });
});
