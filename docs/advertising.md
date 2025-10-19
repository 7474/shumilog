# 広告機能ガイド

## 概要

shumilogには広告表示機能が組み込まれており、ログやタグのコンテンツに関連する広告を表示することができます。この機能は環境変数で簡単に有効化・無効化できます。

## 特徴

- **控えめなデザイン**: コンテンツの閲覧を妨げない配置
- **環境変数で制御**: 簡単に有効/無効を切り替え可能
- **レスポンシブ対応**: モバイル・デスクトップの両方に対応
- **複数の広告ネットワーク対応**: Google AdSenseなど主要な広告サービスに対応可能

## 広告の配置場所

### 1. ログ詳細ページ
- ログコンテンツの直後、関連ログの前に表示
- スロットID: `log-detail-bottom`

### 2. タグ詳細ページ
- タグ情報の直後、新着ログの前に表示
- スロットID: `tag-detail-middle`

## セットアップ手順

### 1. 環境変数の設定

フロントエンドの`.env`ファイルに以下の環境変数を追加します：

```bash
# 広告を有効化
VITE_ADS_ENABLED=true

# Google AdSense クライアントID（オプション）
VITE_ADSENSE_CLIENT_ID=ca-pub-1234567890123456
```

### 2. Google AdSense の設定（例）

Google AdSenseを使用する場合：

1. [Google AdSense](https://www.google.com/adsense/)でアカウントを作成
2. サイトを登録し、承認を待つ
3. クライアントIDを取得
4. 環境変数`VITE_ADSENSE_CLIENT_ID`に設定

### 3. 広告スクリプトのカスタマイズ

`frontend/src/components/AdBanner.tsx`の`useEffect`内で、実際の広告ネットワークの初期化コードを追加します：

```typescript
useEffect(() => {
  if (!isAdEnabled || !adRef.current) {
    return;
  }
  
  // Google AdSenseの例
  const adClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;
  if (adClientId) {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
}, [isAdEnabled]);
```

## 広告の無効化

広告を無効化する場合は、環境変数を変更します：

```bash
VITE_ADS_ENABLED=false
```

または、環境変数を削除・コメントアウトします。

## 開発とテスト

### 開発環境での確認

1. 環境変数で広告を有効化
2. 開発サーバーを起動：
   ```bash
   cd frontend
   npm run dev
   ```
3. ログ詳細ページ（例：`/logs/<log-id>`）とタグ詳細ページ（例：`/tags/Anime`）で広告表示を確認

### プレースホルダー表示

広告が有効な場合でも、実際の広告スクリプトが設定されていない場合は、プレースホルダーが表示されます：
- 「スポンサー」ラベル
- 「広告スペース」テキスト
- スロットID（開発時のみ）

## カスタマイズ

### 広告フォーマット

`AdBanner`コンポーネントは3つのフォーマットをサポートしています：

- `horizontal`: 横長バナー（デフォルト）
- `square`: 正方形
- `vertical`: 縦長

使用例：
```tsx
<AdBanner format="square" slotId="my-ad-slot" />
```

### スタイルのカスタマイズ

`frontend/src/components/AdBanner.tsx`でスタイルをカスタマイズできます：
- 広告カードの背景色、境界線
- プレースホルダーのデザイン
- レスポンシブサイズ

## 本番環境へのデプロイ

Cloudflare Pagesでの環境変数設定：

1. Cloudflare Pagesのダッシュボードにアクセス
2. プロジェクトの「設定」→「環境変数」
3. 以下の変数を追加：
   - `VITE_ADS_ENABLED`: `true`
   - `VITE_ADSENSE_CLIENT_ID`: あなたのクライアントID

## 注意事項

- **プライバシーポリシー**: 広告を表示する場合は、適切なプライバシーポリシーを用意してください
- **広告ブロッカー**: ユーザーが広告ブロッカーを使用している場合、広告は表示されません
- **パフォーマンス**: 広告スクリプトの読み込みがページパフォーマンスに影響する可能性があります
- **コンテンツポリシー**: 広告ネットワークのコンテンツポリシーを遵守してください

## トラブルシューティング

### 広告が表示されない

1. 環境変数`VITE_ADS_ENABLED`が`true`に設定されているか確認
2. ブラウザの開発者ツールでコンソールエラーを確認
3. 広告ブロッカーが無効になっているか確認

### プレースホルダーのみ表示される

- これは正常です。実際の広告スクリプトを`AdBanner.tsx`に追加してください
- Google AdSenseの場合、サイトの承認が完了していることを確認してください

## 参考リンク

- [Google AdSense](https://www.google.com/adsense/)
- [Google AdSense ヘルプ](https://support.google.com/adsense/)
- [Cloudflare Pages 環境変数](https://developers.cloudflare.com/pages/platform/build-configuration#environment-variables)
