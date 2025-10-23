import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiService, type AiBinding } from '../../src/services/AiService';

describe('AiService', () => {
  let mockFetch: any;
  
  beforeEach(() => {
    // Reset fetch mock before each test
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('generateTagContentFromName', () => {
    it('should fetch Wikipedia content first and pass it to AI', async () => {
      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: '進撃の巨人',
          extract: '人類と巨人の戦いを描くダークファンタジー作品。諫山創による日本の漫画作品。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/%E9%80%B2%E6%92%83%E3%81%AE%E5%B7%A8%E4%BA%BA'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `人類と巨人の戦いを描くダークファンタジー作品。

**関連タグ**: #マンガ #アニメ #ダークファンタジー

出典: [Wikipedia](https://ja.wikipedia.org/wiki/%E9%80%B2%E6%92%83%E3%81%AE%E5%B7%A8%E4%BA%BA)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('進撃の巨人');

      // Verify Wikipedia was fetched
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ja.wikipedia.org/api/rest_v1/page/summary'),
        expect.any(Object)
      );

      // Verify AI was called with the Wikipedia content
      expect(mockAi.run).toHaveBeenCalled();
      const aiCallArgs = (mockAi.run as any).mock.calls[0][1].input;
      const userPrompt = aiCallArgs[1].content;
      expect(userPrompt).toContain('進撃の巨人');
      expect(userPrompt).toContain('人類と巨人の戦いを描くダークファンタジー作品');

      // Verify result
      expect(result.content).toBeTruthy();
      expect(result.content).toContain('人類と巨人の戦い');
      expect(result.content).toContain('**関連タグ**');
    });

    it('should try OpenSearch API when direct access fails', async () => {
      // Mock Wikipedia REST API to fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      // Mock OpenSearch API to return results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['きみの色', ['きみの色'], ['映画作品'], ['https://ja.wikipedia.org/wiki/%E3%81%8D%E3%81%BF%E3%81%AE%E8%89%B2']]
      });

      // Mock Wikipedia REST API with the found title
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'きみの色',
          extract: '2024年公開の日本のアニメーション映画。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/%E3%81%8D%E3%81%BF%E3%81%AE%E8%89%B2'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `2024年公開の日本のアニメーション映画。

**関連タグ**: #アニメ #映画

出典: [Wikipedia](https://ja.wikipedia.org/wiki/%E3%81%8D%E3%81%BF%E3%81%AE%E8%89%B2)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('きみの色');

      // Verify multiple fetch attempts (now includes HTML fetch attempt)
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      // Verify OpenSearch was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('action=opensearch'),
        expect.any(Object)
      );

      // Verify result
      expect(result.content).toBeTruthy();
      expect(result.content).toContain('アニメーション映画');
    });

    it('should return not found message when Wikipedia article does not exist', async () => {
      // Mock all fetch attempts to fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn()
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('30 MINUTES FANTASY');

      // Verify Wikipedia search was attempted
      expect(mockFetch).toHaveBeenCalled();

      // Verify AI was NOT called (no Wikipedia content to process)
      expect(mockAi.run).not.toHaveBeenCalled();

      // Verify result
      expect(result.content).toBeTruthy();
      expect(result.content).toContain('Wikipedia記事が見つかりませんでした');
      expect(result.content).toContain('30 MINUTES FANTASY');
    });

    it('should pass actual Wikipedia content to AI to prevent hallucinations', async () => {
      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'SSSS.GRIDMAN',
          extract: '円谷プロダクションの特撮テレビドラマ『電光超人グリッドマン』を原作とする、TRIGGERによるテレビアニメ作品。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/SSSS.GRIDMAN'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `円谷プロダクションの特撮テレビドラマ『電光超人グリッドマン』を原作とする、TRIGGERによるテレビアニメ作品。

**関連タグ**: #TRIGGER #円谷プロダクション #電光超人グリッドマン

出典: [Wikipedia](https://ja.wikipedia.org/wiki/SSSS.GRIDMAN)`
                }
              ]
            }
          ]
        })
      };

      const aiService = new AiService(mockAi);
      const result = await aiService.generateTagContentFromName('SSSS.GRIDMAN');

      // Verify AI was called with actual Wikipedia content
      expect(mockAi.run).toHaveBeenCalled();
      const aiCallArgs = (mockAi.run as any).mock.calls[0][1].input;
      
      // System prompt should emphasize using provided content only
      const systemPrompt = aiCallArgs[0].content;
      expect(systemPrompt).toContain('提供されたWikipedia記事の内容のみを参照');
      expect(systemPrompt).toContain('ハルシネーション厳禁');
      expect(systemPrompt).toContain('記事に書かれていない情報は絶対に生成しないこと');
      
      // User prompt should include the actual Wikipedia content
      const userPrompt = aiCallArgs[1].content;
      expect(userPrompt).toContain('## Wikipedia記事の内容');
      expect(userPrompt).toContain('円谷プロダクション');
      expect(userPrompt).toContain('電光超人グリッドマン');
      expect(userPrompt).toContain('TRIGGER');

      // Verify result
      expect(result.content).toBeTruthy();
      expect(result.content).toContain('TRIGGER');
    });

    it('should include hashtag normalization rules in prompt', async () => {
      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'テスト作品',
          extract: 'テスト用の作品説明。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト用の作品説明。

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

      // Verify the prompt includes hashtag normalization instructions
      const userPrompt = (mockAi.run as any).mock.calls[0][1].input[1].content;
      expect(userPrompt).toContain('ハッシュタグ正規化ルール');
      expect(userPrompt).toContain('メディアタイプを除去');
      expect(userPrompt).toContain('カッコ書きを除去');
      expect(userPrompt).toContain('空白なし=#タグ名、空白あり=#{タグ名}');
    });

    it('should warn against creating fake subtitles', async () => {
      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'テスト作品',
          extract: 'テスト用の作品説明。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト用の作品説明。

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

      // Verify the prompt warns against creating fake information
      const systemPrompt = (mockAi.run as any).mock.calls[0][1].input[0].content;
      expect(systemPrompt).toContain('記事に書かれていない情報は絶対に生成しないこと');
      
      const userPrompt = (mockAi.run as any).mock.calls[0][1].input[1].content;
      expect(userPrompt).toContain('記事に明記されていない情報は絶対に含めないこと');
      expect(userPrompt).toContain('推測や創作で補完しないこと');
      expect(userPrompt).toContain('サブタイトルやエピソードを創作しない');
    });

    it('should convert HTML to markdown when available', async () => {
      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'テスト作品',
          extract: 'テスト用の作品説明。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      // Mock HTML fetch with actual HTML content
      const mockHtmlContent = `
        <html>
          <body>
            <h1>テスト作品</h1>
            <p>これは<strong>テスト用</strong>の作品説明です。</p>
            <ul>
              <li>特徴1</li>
              <li>特徴2</li>
            </ul>
          </body>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlContent
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト用の作品説明。

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

      // Verify AI was called with markdown content (not HTML)
      expect(mockAi.run).toHaveBeenCalled();
      const aiCallArgs = (mockAi.run as any).mock.calls[0][1].input;
      const userPrompt = aiCallArgs[1].content;
      
      // Should contain markdown, not HTML
      expect(userPrompt).toContain('## Wikipedia記事の内容');
      expect(userPrompt).not.toContain('<html>');
      expect(userPrompt).not.toContain('<body>');
      expect(userPrompt).not.toContain('<strong>');
      // Should contain markdown-formatted content
      expect(userPrompt).toContain('#');
      expect(userPrompt).toContain('*');
    });

    it('should truncate Wikipedia content when it exceeds max length', async () => {
      // Create a very long extract (more than MAX_WIKIPEDIA_CHARS)
      const longExtract = 'あ'.repeat(50000); // 50,000 characters

      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'テスト作品',
          extract: longExtract,
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト用の作品説明。

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

      // Verify AI was called with truncated content
      expect(mockAi.run).toHaveBeenCalled();
      const aiCallArgs = (mockAi.run as any).mock.calls[0][1].input;
      const userPrompt = aiCallArgs[1].content;
      
      // Extract the Wikipedia content part
      const wikipediaContentMatch = userPrompt.match(/## Wikipedia記事の内容\n\n(.+)/s);
      expect(wikipediaContentMatch).toBeTruthy();
      
      if (wikipediaContentMatch) {
        const wikipediaContent = wikipediaContentMatch[1];
        // Should be truncated to MAX_WIKIPEDIA_CHARS (32,000 characters)
        expect(wikipediaContent.length).toBeLessThan(50000);
        expect(wikipediaContent.length).toBeLessThanOrEqual(32000 + 10); // Allow small margin for truncation logic
      }
    });

    it('should separate instruction from Wikipedia content in prompt', async () => {
      // Mock Wikipedia REST API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'テスト作品',
          extract: 'テスト用の作品説明。',
          content_urls: {
            desktop: {
              page: 'https://ja.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      // Mock HTML fetch (will fail but that's ok - it will use extract)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockAi: AiBinding = {
        run: vi.fn().mockResolvedValue({
          output: [
            {
              type: 'message',
              content: [
                {
                  text: `テスト用の作品説明。

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

      // Verify the prompt structure
      expect(mockAi.run).toHaveBeenCalled();
      const aiCallArgs = (mockAi.run as any).mock.calls[0][1].input;
      const userPrompt = aiCallArgs[1].content;
      
      // Should have clear separation between instruction and Wikipedia content
      expect(userPrompt).toContain('# タスク');
      expect(userPrompt).toContain('## 出力形式');
      expect(userPrompt).toContain('## Wikipedia記事の内容');
      
      // Wikipedia content should be at the end of the prompt
      const wikipediaSection = userPrompt.indexOf('## Wikipedia記事の内容');
      const taskSection = userPrompt.indexOf('# タスク');
      expect(wikipediaSection).toBeGreaterThan(taskSection);
    });
  });
});
