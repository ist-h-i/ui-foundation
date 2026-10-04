# Angularテンプレート

PageFrame、ActionControl／ActionLink、FormField／FieldControl、AsyncRegion、ActionFeedbackに加え、RadioGroup、Navigation／Breadcrumb、Tabs、Disclosure、Dialog、DataTable、Paginationを実装しています。`index.ts` からimportし、`styles.css` を利用アプリのグローバルCSSとして読み込みます。Angular 22.2.1を使うstandalone部品です。

[APIと責任境界](../../docs/ui-components.md)、[利用例](../../tests/fixture-app/app.ts)、[操作試験](../../tests/ui/components.spec.ts)を参照してください。現在はソースをコピーして使う方式です。設定からこのテンプレートを生成・同期するCLIは未実装です。

標準HTML要素を使い、アプリの業務判断・実Undo・安全な継続範囲を推測しません。色、文字、余白、focus、モーションは `--ui-*` CSS変数で調整できます。
