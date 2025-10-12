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
  });
});
