/**
 * AIサービス: Cloudflare Workers AIへのリクエストを管理
 * ユニットテスト時はこのクラスをモックする
 */

export interface AiBinding {
  run(model: string, inputs: any): Promise<any>;
}

export interface AiEnhancedTagInput {
  tagName: string;
  wikipediaContent: string;
  wikipediaUrl: string;
  requestedTagName: string; // ユーザーがリクエストした元のタグ名
}

export interface AiEnhancedTagOutput {
  markdown: string;
}

/**
 * 使用するAIモデル
 */
const AI_MODEL = '@cf/openai/gpt-oss-120b';

export class AiService {
  constructor(private ai: AiBinding) {}

  /**
   * Wikipediaの内容を基に、AIを使用してタグの編集サポート内容を生成
   * 
   * @param input タグ名、Wikipedia内容、URL
   * @returns AI生成された要約と関連タグ
   */
  async generateEnhancedTagContent(input: AiEnhancedTagInput): Promise<AiEnhancedTagOutput> {
    console.log('[AiService] generateEnhancedTagContent called with input:', {
      tagName: input.tagName,
      requestedTagName: input.requestedTagName,
      wikipediaUrl: input.wikipediaUrl,
      wikipediaContentLength: input.wikipediaContent.length
    });

    const instructionPrompt = this.buildInstructionPrompt(input.requestedTagName);
    
    try {
      console.log(`[AiService] Sending request to AI model: ${AI_MODEL}`);
      const response = await this.ai.run(AI_MODEL, {
        input: [
          {
            role: 'system',
            content: 'あなたはアニメ、マンガ、ゲームなどの趣味コンテンツに詳しい日本語アシスタントです。与えられた情報から、タグの説明と関連タグを簡潔に生成してください。'
          },
          {
            role: 'user',
            content: `参照情報（Wikipedia HTML）:\n\n${input.wikipediaContent}`
          },
          {
            role: 'user',
            content: instructionPrompt
          }
        ]
      });

      console.log('[AiService] AI response received:', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : []
      });

      // AI応答をパース
      const result = this.parseAiResponse(response, input.tagName);
      console.log('[AiService] generateEnhancedTagContent result:', {
        markdownLength: result.markdown.length
      });
      return result;
    } catch (error) {
      console.error('[AiService] AI request failed:', error);
      throw new Error('Failed to generate AI-enhanced content');
    }
  }

  /**
   * 指示プロンプトを構築（Wikipedia内容は含めない）
   * 
   * 【重要】連載・シリーズ作品のサブタイトル情報の抽出は重要要素です。
   * AIに対して、シーズン、期、章、巻、エピソード、各話タイトルなどの
   * サブタイトル情報を省略せず、すべて列挙するよう明示的に指示しています。
   * 特に各話・エピソードのタイトルは重要な情報として扱います。
   */
  private buildInstructionPrompt(requestedTagName: string): string {
    const prompt = `上記の参照情報（Wikipedia HTML）を基に、タグ「${requestedTagName}」の説明をMarkdown形式で生成してください。

【注意】参照記事のタイトルとタグ名が異なる場合（転送・リダイレクトされた場合）は、記事全体を参照しつつ、タグ名「${requestedTagName}」に該当する内容を優先的に抽出してください。

【重要】必ずMarkdown形式で出力してください：

1. 最初の段落: 1〜2行の端的な説明文（プレーンテキスト）
2. 関連タグ: "**関連タグ**: " で始まり、その後にハッシュタグを空白区切りで列挙（3〜10個）
   - 空白を含まないタグ: #タグ名 形式（例: #マンガ #ゲーム）
   - 空白を含むタグ: #{タグ名} 形式（例: #{Attack on Titan}）
3. サブセクション（オプション）: 連載・シリーズ作品の場合、### 見出しで各セクションを作成し、その下に箇条書き（- で始まる）でハッシュタグを列挙
   - 【必須】連載・シリーズのサブタイトル情報は省略しないでください
   - 特にシーズン、期、章、巻、エピソード、各話タイトルなどの情報はすべて列挙してください
   - 各話・エピソードのタイトルも重要な情報として含めてください

【出力例】
アニメーション作品の総称で、日本の独自文化として世界的に人気があります。

**関連タグ**: #マンガ #ゲーム #声優 #キャラクター #ストーリー #劇場版

### 代表作品
- #鬼滅の刃
- #進撃の巨人
- #ワンピース

### シーズン
- #{進撃の巨人 Season1}
- #{進撃の巨人 Season2}
- #{進撃の巨人 Season3}

### 主要エピソード（例）
- #{第1話 二千年後の君へ}
- #{第2話 その日}

この形式を厳密に守ってMarkdownで出力してください。特に連載・シリーズのサブタイトル情報（各話・エピソードタイトルを含む）は省略しないでください。`;

    console.log('[AiService] buildInstructionPrompt called:', {
      requestedTagName: requestedTagName,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + '...'
    });

    return prompt;
  }

  /**
   * AI応答をパースしてMarkdownテキストに変換
   * AI出力をそのまま使用し、加工は行わない
   */
  private parseAiResponse(response: any, tagName: string): AiEnhancedTagOutput {
    console.log('[AiService] parseAiResponse called with:', {
      tagName,
      responseType: typeof response,
      hasResponse: !!response?.response,
      hasResult: !!response?.result
    });

    // Cloudflare Workers AIのレスポンス形式に対応
    let content = '';
    if (response.response) {
      content = response.response;
    } else if (response.result && response.result.response) {
      content = response.result.response;
    } else if (typeof response === 'string') {
      content = response;
    } else {
      console.error('[AiService] Unexpected AI response format:', response);
      throw new Error('Unexpected AI response format');
    }

    console.log('[AiService] Extracted content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200)
    });

    // AI応答をそのまま返す（加工しない）
    const markdown = content.trim() || `${tagName}に関する情報`;

    const result = {
      markdown
    };

    console.log('[AiService] parseAiResponse result:', {
      markdownLength: result.markdown.length
    });

    return result;
  }

  /**
   * AI生成コンテンツをMarkdown形式に変換
   * AI生成部分をMarkdownコメントでラップし、Wikipedia出典を追加
   */
  formatAsMarkdown(output: AiEnhancedTagOutput, wikipediaUrl: string): string {
    console.log('[AiService] formatAsMarkdown called with:', {
      markdownLength: output.markdown.length,
      wikipediaUrl
    });

    // AI生成コンテンツをコメントでラップ
    let markdown = '<!-- AI生成コンテンツ開始 -->\n\n';
    markdown += output.markdown;
    markdown += '\n\n<!-- AI生成コンテンツ終了 -->\n\n';
    
    // Wikipedia出典を追加
    markdown += `出典: [Wikipedia](<${wikipediaUrl}>)`;
    
    console.log('[AiService] formatAsMarkdown result:', {
      markdownLength: markdown.length,
      markdownPreview: markdown.substring(0, 200) + '...'
    });

    return markdown;
  }
}
