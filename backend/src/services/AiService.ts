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
    const prompt = this.buildPrompt(input);
    
    try {
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

      // AI応答をパース
      return this.parseAiResponse(response, input.tagName);
    } catch (error) {
      console.error('AI request failed:', error);
      throw new Error('Failed to generate AI-enhanced content');
    }
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(input: AiEnhancedTagInput): string {
    return `以下のWikipedia情報を基に、タグ「${input.tagName}」の説明を生成してください：

Wikipedia内容：
${input.wikipediaContent}

以下の形式で出力してください：
1. タグを1行で端的に説明（50文字以内）
2. 関連する要素をハッシュタグとして列挙（3〜10個）
   - 空白を含まないタグ名: #タグ名 形式（例: #マンガ #ゲーム）
   - 空白を含むタグ名: #{タグ名} 形式（例: #{Attack on Titan} #{進撃の巨人 第1期}）
3. 特に関連する連載やシリーズのサブタイトルがある場合、見出しとハッシュタグで構造化

出力例：
アニメーション作品の総称で、日本の独自文化として世界的に人気

#マンガ #ゲーム #声優 #キャラクター #ストーリー #劇場版

代表作品:
#鬼滅の刃 #進撃の巨人 #ワンピース`;
  }

  /**
   * AI応答をパースして構造化データに変換
   */
  private parseAiResponse(response: any, tagName: string): AiEnhancedTagOutput {
    // Cloudflare Workers AIのレスポンス形式に対応
    let content = '';
    if (response.response) {
      content = response.response;
    } else if (response.result && response.result.response) {
      content = response.result.response;
    } else if (typeof response === 'string') {
      content = response;
    } else {
      throw new Error('Unexpected AI response format');
    }

    // 簡易的なパース（実際のAI出力形式に応じて調整が必要）
    const lines = content.split('\n').filter(line => line.trim());
    
    let summary = '';
    const relatedTags: string[] = [];
    const subsections: { title: string; tags: string[] }[] = [];
    
    let currentSubsection: { title: string; tags: string[] } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('要約:') || trimmed.startsWith('説明:')) {
        summary = trimmed.split(':', 2)[1].trim();
      } else if (trimmed.startsWith('関連タグ:') || trimmed.includes('#')) {
        // ハッシュタグを抽出
        const tags = this.extractHashtags(trimmed);
        relatedTags.push(...tags);
      } else if (trimmed.startsWith('サブセクション:') || trimmed.startsWith('-')) {
        if (trimmed.includes(':')) {
          // 新しいサブセクションの開始
          if (currentSubsection) {
            subsections.push(currentSubsection);
          }
          const [title, tagsStr] = trimmed.split(':', 2);
          currentSubsection = {
            title: title.replace(/^-\s*/, '').trim(),
            tags: this.extractHashtags(tagsStr || '')
          };
        } else if (currentSubsection && trimmed.includes('#')) {
          // 既存のサブセクションにタグを追加
          currentSubsection.tags.push(...this.extractHashtags(trimmed));
        }
      }
    }

    if (currentSubsection) {
      subsections.push(currentSubsection);
    }

    // サマリーがない場合はデフォルト
    if (!summary) {
      summary = `${tagName}に関する情報`;
    }

    return {
      summary,
      relatedTags: [...new Set(relatedTags)], // 重複削除
      subsections: subsections.length > 0 ? subsections : undefined
    };
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
