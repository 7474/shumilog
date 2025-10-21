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
            content: 'あなたはWikipedia記事を参照して正確な情報を抽出する専門アシスタントです。以下の重要ルールを厳守してください：\n\n【絶対ルール】\n1. 必ず日本語版Wikipediaで記事を検索し、実際の記事内容のみを参照すること\n   - Wikipedia REST APIやOpenSearch APIを使用すること\n   - 記事が見つからない場合は、検索クエリのバリエーションを試すこと\n   - Wikipediaのリダイレクトを追跡すること\n   - 曖昧さ回避ページの場合は、最も適切な記事を選択すること\n2. Wikipedia記事に書かれていない情報は絶対に生成しないこと（ハルシネーション厳禁）\n3. 不確実な情報や推測は一切含めないこと\n4. 記事の冒頭部分から正確に要約を作成すること\n5. ハッシュタグは記事に明記されている関連項目のみから生成すること\n6. サブタイトル・エピソード情報がある場合は必ずすべて列挙すること\n\n【Wikipedia検索のベストプラクティス】\n- まず直接URLアクセスを試す: https://ja.wikipedia.org/wiki/[記事名]\n- 見つからない場合はOpenSearch APIで検索: https://ja.wikipedia.org/w/api.php?action=opensearch&search=[検索語]\n- リダイレクトは自動的に追跡される\n- 曖昧さ回避ページに遭遇した場合は、文脈に最も合う記事を選ぶ\n\n【ハッシュタグ正規化の必須ルール】\n- 作品名から「アニメ」「ゲーム」「漫画」などのメディアタイプを除去（正式名称の一部を除く）\n- カッコ書きの補足情報を除去（例：「（GB）」「（テレビアニメ）」）\n- 空白を含む場合は#{タグ名}形式、含まない場合は#タグ名形式を使用\n\n記事を見つけるために十分な努力をした後、それでも見つからない場合のみ「Wikipedia記事が見つかりませんでした」と回答してください。'
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
    const prompt = `# タスク
日本語版Wikipediaで「${requestedTagName}」を検索し、記事内容から正確な情報を抽出してMarkdown形式で出力してください。

## ステップ1: Wikipedia記事の確認と検索方法

### 検索手順（以下の順番で試してください）
1. **直接アクセス**: https://ja.wikipedia.org/wiki/${encodeURIComponent(requestedTagName)} にアクセス
2. **Wikipedia検索API**: https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(requestedTagName)}&limit=1&namespace=0&format=json を使用
3. **類似記事の検索**: 検索クエリのバリエーションを試す
   - ひらがな・カタカナ・漢字の変換
   - 空白の追加・削除
   - 「（曖昧さ回避）」などの括弧付き記事名
4. **リダイレクトの追跡**: Wikipediaは自動的にリダイレクトを処理します。リダイレクト先の記事を使用してください

### 判定基準
- 記事が存在しない場合（404エラー）→ 「「${requestedTagName}」に関するWikipedia記事が見つかりませんでした。」と出力して終了
- 記事が存在する場合 → ステップ2へ進む
- リダイレクトされた場合 → リダイレクト先の記事を使用してステップ2へ進む

## ステップ2: 出力形式（記事が存在する場合のみ）

### 1. 冒頭の要約（必須）
- Wikipedia記事の**冒頭部分（導入文）を正確に要約**してください
- 1〜2行で簡潔に
- 記事に書かれていない情報は絶対に含めないこと

### 2. 関連タグ（必須）
\`**関連タグ**: \` で始まり、その後にハッシュタグを空白区切りで3〜10個列挙

**ハッシュタグ正規化ルール（厳守）：**
1. Wikipedia記事の関連項目セクションや本文中の関連作品から抽出
2. **メディアタイプを除去**: 「アニメ」「ゲーム」「漫画」「映画」などのプレフィックスを削除
   - 例: 「アニメ SSSS.DYNAZENON」→「SSSS.DYNAZENON」
   - 例: 「漫画 電光超人グリッドマン」→「電光超人グリッドマン」
   - 例外: 「劇場版 幼女戦記」は正式名称なので保持
3. **カッコ書きを除去**: 「（）」や「「」」で囲まれた補足情報を削除
   - 例: 「SSSS.DYNAZENON（アニメ）」→「SSSS.DYNAZENON」
4. **形式**: 空白なし=#タグ名、空白あり=#{タグ名}
   - 例: #トリガー #円谷プロダクション #{SSSS.DYNAZENON}

### 3. サブセクション（連載・シリーズ作品の場合は必須）
Wikipedia記事に以下の情報がある場合は**必ずすべて列挙**してください：
- シーズン・期
- 章・巻
- エピソード・各話タイトル
- 関連作品シリーズ

各セクションは \`### セクション名\` で始め、箇条書きで列挙：
\`\`\`
### シーズン
- #{Season 1}
- #{Season 2}

### 主要エピソード
- #{第1話 タイトル}
- #{第2話 タイトル}
\`\`\`

**注意**: サブタイトル情報がある場合は省略せず、記事に記載されているものをすべて列挙してください。

### 4. 出典（必須）
\`出典: [Wikipedia](実際のWikipediaページURL)\`

## 重要な注意事項
❌ Wikipedia記事に書かれていない情報を生成しない
❌ 推測や創作で情報を補完しない
❌ 放送年や配信サービスなど、確認できない情報を含めない
✅ Wikipedia記事の内容のみを参照
✅ 不確実な情報は含めない
✅ ハッシュタグ正規化ルールを厳守

## 出力例
【記事が存在しない場合】
「30 MINUTES FANTASY」に関するWikipedia記事が見つかりませんでした。

【記事が存在する場合】
円谷プロダクションの特撮テレビドラマ『電光超人グリッドマン』を原作とする、TRIGGERによるテレビアニメ作品。

**関連タグ**: #TRIGGER #円谷プロダクション #電光超人グリッドマン #{SSSS.DYNAZENON}

### シリーズ作品
- #電光超人グリッドマン
- #{SSSS.DYNAZENON}

出典: [Wikipedia](https://ja.wikipedia.org/wiki/SSSS.GRIDMAN)
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
