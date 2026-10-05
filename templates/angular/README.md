# Angularテンプレート

PageFrame、ActionControl／ActionLink、FormField／FieldControl、AsyncRegion、ActionFeedbackに加え、RadioGroup、Navigation／Breadcrumb、Tabs、Disclosure、Dialog、DataTable、Paginationの生成元です。Angular 22.2.1を使うstandalone部品です。

[APIと責任境界](../../docs/ui-components.md)、[利用例](../../tests/fixture-app/app.ts)、[操作試験](../../tests/ui/components.spec.ts)、[プロファイル試験](../../tests/ui/profiles.spec.ts)を参照してください。CLIが設定のoutputへ`angular/`を同期し、利用アプリは生成した`angular/index.ts`をimportします。テンプレートを直接コンパイルする経路は使いません。

グローバルCSSは生成した`tokens.css`、`tailwind.css`、`angular/styles.css`を読み込みます。部品とTailwind utilityは`--ui-カテゴリ-役割`の意味トークンだけを参照し、具体値や既定テーマは持ちません。`--ui-font-body`は書体、`--ui-text-body`は文字サイズです。`data-ui-profile`を持つスコープで設定済みプロファイルを明示適用します。色・寸法を変えても部品の入力や処理状態を作り直す必要はありません。

標準HTML要素を使い、アプリの業務判断・実Undo・安全な継続範囲を推測しません。画面構成のguidanceはAI向けの判断材料であり、部品は文章から画面構成を自動で推定しません。
