# 試験の置き場

`fixture-app/` は基盤と追加部品を使うAngularアプリ、`ui/` はPlaywrightの操作試験です。`npm run test:ui` は実アプリをコンパイルしてローカルサーバーを起動し、Chromiumで試験します。retryは0で、失敗時は `test-results/` にtraceとスクリーンショットを残します。

`config/`、`generation/`、`checks/` の試験は未実装です。対象シナリオと観測する結果は [部品仕様](../docs/ui-components.md) に記録しています。fixtureのデータと応答制御はローカルの試験用で、実サービスの通信・復元保証とは扱いません。自動アクセシビリティ検査や静的な合格を、実操作・UX全体の合格として扱いません。
