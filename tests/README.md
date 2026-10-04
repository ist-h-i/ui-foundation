# 検証

config/はYAML構造・型・参照・プロファイル・定義済み色ペア、generation/は実生成・所有範囲・CLI、fixture-app/とui/は生成Angular部品とTailwindの実ブラウザー操作を確認します。

`npm run ui:sync`で同期後、`npm test`を実行します。ビルドと試験の前にcheckが未同期を拒否します。fixtureのデータはローカル試験用で、実サービスの通信/Undo/安全性を証明しません。自動アクセシビリティ、描画、操作、利用者の理解を区別します。
