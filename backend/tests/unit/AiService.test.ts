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
  });
});
