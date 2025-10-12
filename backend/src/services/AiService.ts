/**
 * AIサービス: Cloudflare Workers AIへのリクエストを管理
 * ユニットテスト時はこのクラスをモックする
 */

import TurndownService from 'turndown';
import * as domino from '@mixmark-io/domino';

export interface AiBinding {
  run(model: string, inputs: any): Promise<any>;
}

/**
 * @deprecated Use generateTagContentFromName instead
 */
export interface AiEnhancedTagInput {
  tagName: string;
  wikipediaContent: string;
  wikipediaUrl: string;
  requestedTagName: string;
  metadata?: ExtractedMetadata;
}

export interface AiEnhancedTagOutput {
  markdown: string;
}

interface ExtractedMetadata {
  officialSites: string[]; // 公式サイトのURL一覧
  relatedLinks: { url: string; title: string }[]; // 関連リンク
}

/**
 * 使用するAIモデル
 */
const AI_MODEL = '@cf/openai/gpt-oss-120b';

export class AiService {
  private turndownService: TurndownService;

  constructor(private ai: AiBinding) {
    // HTMLからMarkdownへの変換サービスを初期化
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  /**
   * WikipediaのHTMLからメタデータを抽出
   * 
   * @param html Wikipedia HTML内容
   * @returns 抽出されたメタデータ
   */
  extractMetadataFromWikipedia(html: string): ExtractedMetadata {
    console.log('[AiService] extractMetadataFromWikipedia called with HTML length:', html.length);
    
    const doc = domino.createDocument(html);
    const metadata: ExtractedMetadata = {
      officialSites: [],
      relatedLinks: []
    };
    
    // 外部リンクセクションから公式サイトを抽出
    // Wikipediaの外部リンクは通常 class="external" を持つ
    const externalLinks = doc.querySelectorAll('a.external');
    const seenUrls = new Set<string>();
    
    externalLinks.forEach((link: any) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim() || '';
      
      if (href && !seenUrls.has(href)) {
        seenUrls.add(href);
        
        // 公式サイトと思われるリンクを判定
        if (text.includes('公式') || text.includes('オフィシャル') || 
            text.includes('Official') || href.includes('official')) {
          metadata.officialSites.push(href);
        }
        
        // すべての外部リンクを関連リンクとして保存（最大10個まで）
        if (metadata.relatedLinks.length < 10) {
          metadata.relatedLinks.push({ url: href, title: text });
        }
      }
    });
    
    console.log('[AiService] extractMetadataFromWikipedia result:', {
      officialSitesCount: metadata.officialSites.length,
      relatedLinksCount: metadata.relatedLinks.length
    });
    
    return metadata;
  }

  /**
   * WikipediaのHTMLをMarkdownに変換
   * トークン消費を削減するため、HTMLからMarkdownへ変換する
   * 
   * @param html Wikipedia HTML内容
   * @returns Markdown形式の内容
   */
  convertHtmlToMarkdown(html: string): string {
    console.log('[AiService] convertHtmlToMarkdown called with HTML length:', html.length);
    
    // dominoを使ってDOMドキュメントを作成
    // これによりCloudflare Workers環境でもDOM操作が可能になる
    const doc = domino.createDocument(html);
    
    // ドキュメント全体をTurndownServiceに渡してMarkdownに変換
    const markdown = this.turndownService.turndown(doc.documentElement);
    
    console.log('[AiService] convertHtmlToMarkdown result:', {
      htmlLength: html.length,
      markdownLength: markdown.length,
      reductionPercent: ((1 - markdown.length / html.length) * 100).toFixed(2) + '%'
    });
    
    return markdown;
  }
  
  /**
   * タグ名からAI拡張コンテンツを生成（Wikipedia取得とメタデータ抽出を含む）
   * 
   * @param tagName タグ名
   * @returns AI生成された内容とWikipedia URL
   */
  async generateTagContentFromName(tagName: string): Promise<{ content: string; }> {
    console.log('[AiService] generateTagContentFromName called with tagName:', tagName);

    try {
      // AI指示プロンプトを構築
      const instructionPrompt = this.buildInstructionPrompt(tagName);

      console.log(`[AiService] Sending request to AI model: ${AI_MODEL}`);
      const aiResponse = await this.ai.run(AI_MODEL, {
        input: [
          {
            role: 'system',
            content: 'あなたはアニメ、マンガ、ゲームなどの趣味コンテンツに詳しい日本語アシスタントです。まずWikipediaでタグ名を検索し、記事が存在するか確認してください。記事が存在する場合のみ、その情報を基にタグの説明と関連タグを生成してください。記事が存在しない場合は、その旨を正直に伝えてください。存在しない情報を創作してはいけません。'
          },
          {
            role: 'user',
            content: instructionPrompt
          }
        ],
      });

      console.log('[AiService] AI response received:', {
        hasResponse: !!aiResponse,
        responseType: typeof aiResponse,
        responseKeys: aiResponse ? Object.keys(aiResponse) : []
      });

      // AI応答をパース
      const aiOutput = this.parseAiResponse(aiResponse, tagName);

      // AI生成内容をMarkdown形式に変換
      const content = this.formatAsMarkdown(aiOutput);

      return {
        content,
      };
    } catch (error) {
      console.error('[AiService] generateTagContentFromName failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate tag content');
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
    const prompt = `タグ「${requestedTagName}」の説明をMarkdown形式で生成してください。

【最重要】Wikipedia記事の確認とハルシネーション（虚偽情報の生成）の防止：
- まず日本語版のWikipediaでタグ名「${requestedTagName}」を検索し、該当する記事が存在するか確認してください
- Wikipedia記事が存在しない場合は、「Wikipedia記事が見つかりませんでした」と明記し、それ以上の情報を生成しないでください
- Wikipedia記事が存在する場合のみ、その記事に記載されている情報を基に説明を生成してください
- 存在しない情報、確認できない情報は絶対に生成しないでください
- 推測や創作で情報を補完してはいけません
- 情報が不足している場合は、その旨を正直に記載してください
- 出典リンクは実際に存在することを確認したWikipediaページのURLのみを使用してください

【注意】参照記事のタイトルとタグ名が異なる場合（転送・リダイレクトされた場合）は、記事全体を参照しつつ、タグ名「${requestedTagName}」に該当する内容を優先的に抽出してください。

【重要】必ずMarkdown形式で出力してください：

1. 最初の段落: 1〜2行の端的な説明文（プレーンテキスト）
   - Wikipedia記事が存在しない場合: 「「${requestedTagName}」に関するWikipedia記事が見つかりませんでした。」とだけ記載
   - Wikipedia記事が存在する場合: 記事に基づく事実のみを記載、情報が不足している場合は「詳細な情報が見つかりませんでした」と明記
2. 関連タグ: "**関連タグ**: " で始まり、その後にハッシュタグを空白区切りで列挙（3〜10個）
   - Wikipedia記事が存在しない場合は省略してください
   - 空白を含まないタグ: #タグ名 形式（例: #マンガ #ゲーム）
   - 空白を含むタグ: #{タグ名} 形式（例: #{Attack on Titan}）
   - 【ハッシュタグ正規化ルール】ハッシュタグには作品名や要素名のみを含め、以下を除去してください：
     * メディアタイプのプレフィックス（「ゲーム」「漫画」「アニメ」「映画」など）- ただし正式名称の一部である場合は除く
     * カッコ囲いの補足情報（「」や（）で囲まれた部分）
     * 例: 「ゲーム「SDコマンドガンダム」（GB）」→「SDコマンドガンダム」
     * 例: 「漫画 SDコマンド戦記」→「SDコマンド戦記」
     * 例外: 「劇場版 幼女戦記」→「劇場版 幼女戦記」（正式名称の一部として保持）
   - Wikipedia記事に明記されている関連作品や概念のみをタグとして列挙
3. サブセクション（オプション）: 連載・シリーズ作品の場合、### 見出しで各セクションを作成し、その下に箇条書き（- で始まる）でハッシュタグを列挙
   - Wikipedia記事が存在しない場合は省略してください
   - 【必須】連載・シリーズのサブタイトル情報は省略しないでください
   - 特にシーズン、期、章、巻、エピソード、各話タイトルなどの情報はすべて列挙してください
   - 各話・エピソードのタイトルも重要な情報として含めてください
   - 【ハッシュタグ正規化ルール適用】サブセクション内のハッシュタグも上記の正規化ルールを適用してください
   - Wikipedia記事に記載されているサブタイトルのみを列挙し、存在しないエピソードは生成しないでください
4. Wikipediaを情報源とした場合は、その記事に出展としてリンクしてください
   - Wikipedia記事が存在しない場合は省略してください
   - Wikipediaの記事を参照する場合はCCライセンスに準拠するための対応です
   - 【重要】実際に存在することを確認したWikipediaページのURLのみをリンクしてください
   - 存在しないページへのリンクは絶対に生成しないでください

【Wikipedia記事が存在しない場合の出力例】
「30 MINUTES FANTASY」に関するWikipedia記事が見つかりませんでした。

【Wikipedia記事が存在する場合の出力例】
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

----
出展: [Wikipedia](https://ja.wikipedia.org/wiki/アニメ)
`;

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
      response: JSON.stringify(response),
    });

    // gpt-oss-120bのレスポンス形式に対応
    let content = '';
    if (response.output) {
      content = response.output
        .filter((item: any) => item.type == 'message')
        .flatMap((item: any) => item.content || [])
        .map((content: any) => content.text || "")
        .join("\n\n")
        .trim();
    } else {
      console.error('[AiService] Unexpected AI response format:', response);
      throw new Error('Unexpected AI response format');
    }

    console.log('[AiService] Extracted content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200)
    });

    // AI応答をそのまま返す（加工しない）
    const markdown = content.trim() || `${tagName}に関する情報（AI処理失敗）`;

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
  formatAsMarkdown(output: AiEnhancedTagOutput): string {
    console.log('[AiService] formatAsMarkdown called with:', {
      markdownLength: output.markdown.length,
    });

    // AI生成コンテンツをコメントでラップ
    let markdown = '<!-- AI生成コンテンツ開始 -->\n\n';
    markdown += output.markdown;
    markdown += '\n\n<!-- AI生成コンテンツ終了 -->\n\n';
    
    console.log('[AiService] formatAsMarkdown result:', {
      markdownLength: markdown.length,
      markdownPreview: markdown.substring(0, 200) + '...'
    });

    return markdown;
  }
}
