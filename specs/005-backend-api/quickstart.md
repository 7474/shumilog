# クイックスタート: バックエンドAPIキャッシュ

1. Cloudflare WorkersのCDNキャッシュ機能を有効化
2. GETかつ認証不要なAPIエンドポイントでキャッシュ制御ヘッダ（Cache-Control, SWR）を付与
3. 5分間キャッシュされることを確認
4. 認証付きAPIやPOST/PUT/DELETE等はキャッシュ対象外であることを確認
5. CDNキャッシュのヒット/ミスをCloudflare Analytics等で確認
