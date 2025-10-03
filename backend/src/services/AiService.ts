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
}

export interface AiEnhancedTagOutput {
  summary: string;
  relatedTags: string[];
  subsections?: {
    title: string;
    tags: string[];
  }[];
}

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
      wikipediaUrl: input.wikipediaUrl,
      wikipediaContentLength: input.wikipediaContent.length
    });

    const prompt = this.buildPrompt(input);
    
    try {
      console.log('[AiService] Sending request to AI model: @cf/meta/llama-3.2-3b-instruct');
      const response = await this.ai.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'あなたはアニメ、マンガ、ゲームなどの趣味コンテンツに詳しい日本語アシスタントです。与えられた情報から、タグの説明と関連タグを簡潔に生成してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      });

      console.log('[AiService] AI response received:', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : []
      });

      // AI応答をパース
      const result = this.parseAiResponse(response, input.tagName);
      console.log('[AiService] generateEnhancedTagContent result:', {
        summary: result.summary,
        relatedTagsCount: result.relatedTags.length,
        hasSubsections: !!result.subsections,
        subsectionsCount: result.subsections?.length || 0
      });
      return result;
    } catch (error) {
      console.error('[AiService] AI request failed:', error);
      throw new Error('Failed to generate AI-enhanced content');
    }
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(input: AiEnhancedTagInput): string {
    const prompt = `以下のWikipedia情報を基に、タグ「${input.tagName}」の説明を生成してください。

Wikipedia内容：
${input.wikipediaContent}

【重要】以下の形式で必ず出力してください：

1行目: "要約: " で始まる1行の端的な説明（50文字以内）
2行目: "関連タグ: " で始まり、その後にハッシュタグを空白区切りで列挙（3〜10個）
   - 空白を含まないタグ: #タグ名 形式（例: #マンガ #ゲーム）
   - 空白を含むタグ: #{タグ名} 形式（例: #{Attack on Titan}）

任意で追加セクション（関連作品や登場人物など）:
3行目以降: "セクション名:" で始まり、その後にハッシュタグを列挙

【出力形式例】
要約: アニメーション作品の総称で、日本の独自文化として世界的に人気
関連タグ: #マンガ #ゲーム #声優 #キャラクター #ストーリー #劇場版
代表作品: #鬼滅の刃 #進撃の巨人 #ワンピース

この形式を厳密に守って出力してください。`;

    console.log('[AiService] buildPrompt called:', {
      tagName: input.tagName,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + '...'
    });

    return prompt;
  }

  /**
   * AI応答をパースして構造化データに変換
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

    // 行ごとに分割して解析
    const lines = content.split('\n').filter(line => line.trim());
    console.log('[AiService] Parsing', lines.length, 'lines');
    
    let summary = '';
    const relatedTags: string[] = [];
    const subsections: { title: string; tags: string[] }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // "要約:" または "説明:" で始まる行からサマリーを抽出
      if (trimmed.startsWith('要約:') || trimmed.startsWith('説明:')) {
        summary = trimmed.split(':', 2)[1].trim();
        console.log('[AiService] Found summary:', summary);
      } 
      // "関連タグ:" で始まる行から関連タグを抽出
      else if (trimmed.startsWith('関連タグ:')) {
        const tagsText = trimmed.split(':', 2)[1].trim();
        const tags = this.extractHashtags(tagsText);
        console.log('[AiService] Extracted related tags:', tags);
        relatedTags.push(...tags);
      }
      // その他のセクション（":"を含む行）
      else if (trimmed.includes(':') && !trimmed.startsWith('#')) {
        const colonIndex = trimmed.indexOf(':');
        const sectionTitle = trimmed.substring(0, colonIndex).trim();
        const tagsText = trimmed.substring(colonIndex + 1).trim();
        
        // セクションタイトルが有効な場合のみ追加
        if (sectionTitle && tagsText) {
          const tags = this.extractHashtags(tagsText);
          if (tags.length > 0) {
            subsections.push({
              title: sectionTitle,
              tags: tags
            });
            console.log('[AiService] Found subsection:', sectionTitle, 'with', tags.length, 'tags');
          }
        }
      }
      // ハッシュタグのみの行（前のセクションに追加）
      else if (trimmed.includes('#')) {
        const tags = this.extractHashtags(trimmed);
        if (tags.length > 0) {
          // 関連タグが空の場合は関連タグとして扱う
          if (relatedTags.length === 0) {
            relatedTags.push(...tags);
            console.log('[AiService] Added to related tags:', tags);
          }
          // 直前にサブセクションがある場合はそこに追加
          else if (subsections.length > 0) {
            subsections[subsections.length - 1].tags.push(...tags);
            console.log('[AiService] Added to last subsection:', tags);
          }
        }
      }
    }

    // サマリーがない場合はデフォルト
    if (!summary) {
      summary = `${tagName}に関する情報`;
      console.log('[AiService] Using default summary');
    }

    const result = {
      summary,
      relatedTags: [...new Set(relatedTags)], // 重複削除
      subsections: subsections.length > 0 ? subsections : undefined
    };

    console.log('[AiService] parseAiResponse result:', {
      summaryLength: result.summary.length,
      relatedTagsCount: result.relatedTags.length,
      subsectionsCount: result.subsections?.length || 0
    });

    return result;
  }

  /**
   * テキストからハッシュタグを抽出
   */
  private extractHashtags(text: string): string[] {
    const tags: string[] = [];
    
    // #{tagName} 形式
    const curlyMatches = text.matchAll(/#\{([^}]+)\}/g);
    for (const match of curlyMatches) {
      tags.push(match[1].trim());
    }
    
    // #tagName 形式（日本語対応）
    const simpleMatches = text.matchAll(/#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+)/g);
    for (const match of simpleMatches) {
      tags.push(match[1].trim());
    }
    
    return tags;
  }

  /**
   * AI生成コンテンツをMarkdown形式に変換
   * AI生成部分をMarkdownコメントでラップする
   */
  formatAsMarkdown(output: AiEnhancedTagOutput, wikipediaUrl: string): string {
    console.log('[AiService] formatAsMarkdown called with:', {
      summary: output.summary,
      relatedTagsCount: output.relatedTags.length,
      subsectionsCount: output.subsections?.length || 0,
      wikipediaUrl
    });

    let markdown = '<!-- AI生成コンテンツ開始 -->\n\n';
    
    // 要約
    markdown += `${output.summary}\n\n`;
    
    // 関連タグ
    if (output.relatedTags.length > 0) {
      markdown += '**関連タグ**: ';
      markdown += output.relatedTags.map(tag => this.formatHashtag(tag)).join(' ');
      markdown += '\n\n';
    }
    
    // サブセクション
    if (output.subsections && output.subsections.length > 0) {
      for (const subsection of output.subsections) {
        markdown += `### ${subsection.title}\n\n`;
        if (subsection.tags.length > 0) {
          markdown += subsection.tags.map(tag => `- ${this.formatHashtag(tag)}`).join('\n');
          markdown += '\n\n';
        }
      }
    }
    
    markdown += '<!-- AI生成コンテンツ終了 -->\n\n';
    
    // Wikipedia出典
    markdown += `出典: [Wikipedia](<${wikipediaUrl}>)`;
    
    console.log('[AiService] formatAsMarkdown result:', {
      markdownLength: markdown.length,
      markdownPreview: markdown.substring(0, 200) + '...'
    });

    return markdown;
  }

  /**
   * タグ名をハッシュタグ形式にフォーマット
   * 空白を含む場合は #{タグ名}、含まない場合は #タグ名 形式
   */
  private formatHashtag(tagName: string): string {
    if (tagName.includes(' ')) {
      return `#{${tagName}}`;
    }
    return `#${tagName}`;
  }
}
