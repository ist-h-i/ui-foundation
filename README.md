# ui-foundation

プロジェクトのUI方針から、共通部品・AI向けSkill・検査設定を同じ設定で生成する小さな開発ツールです。人が方針を決め、AIが設計を支援し、承認した設定を通常のコードと検査に固定します。

## 現在の状態

初版のUI部品と共通スタイル、Angularの検証アプリ、実ブラウザー試験を実装しています。五つの基盤部品に、画面構成で必要になる部品を追加しています。CLI、設定解析、Skill生成、逸脱の静的検査は未実装です。現在の部品はテンプレートのソースを直接コンパイルして利用します。

| 部品群 | 提供する内容 |
| --- | --- |
| PageFrame | ページの見出し・判断材料・操作・本文 |
| ActionControl / ActionLink | native button/link、処理中・無効・重大操作 |
| FormField / FieldControl | input/select/textarea/checkbox、ラベル・補助・エラー |
| RadioGroup / RadioOption | fieldset/legend、ラジオ選択、必須・エラー |
| AsyncRegion | 取得中・空・失敗・部分欠損・既存情報維持・再試行 |
| ActionFeedback | 結果・結果不明・復旧・Undo・影響説明 |
| Navigation / Breadcrumb | 画面移動・現在地・パンくず |
| Tabs / TabPanel | キーボードで選べるタブ、パネルの入力保持 |
| Disclosure | 標準details/summaryによる開閉 |
| Dialog | 標準modal dialog、Escape、フォーカス管理 |
| DataTable / TableContainer | caption付き表、領域内スクロール |
| Pagination | 現在頁・総頁・前後操作・境界の抑止 |

初版は単一リポジトリ・単一npmパッケージで、Angular／TypeScriptを対象にします。ASKとは独立したプロジェクトです。実行時のLLM API、サーバー、データベースは使いません。

## 文書

- [ユーザーの要件原文](docs/project-brief.ja.md)：今回の設計の出発点。設定例やパッケージ名は原文でも提案・仮称です。
- [初期設計](docs/design.md)：設定、生成物の所有範囲、アプリとの責任境界、機械検査の範囲。
- [実装・検証計画](docs/implementation-plan.md)：小さな段階と観測可能な完了条件。
- [開発方針](docs/development.md)：変更、検証、依存、ライセンスの扱い。
- [設定例](examples/ui.config.example.yaml)：未実装のスキーマ案。現在はCLIへ入力できません。
- [UI部品のAPIと責任](docs/ui-components.md)：利用方法、状態、共通スタイル、初版の検証範囲。

## 部品を試す

Node.js 24.19.0で検証します。対応範囲はpackage.jsonのenginesに記載し、Angular 22.2.1・TypeScript 6.0.3をlockfileで固定しています。[Angular公式の対応版](https://angular.dev/reference/versions)を参照しています。

```sh
npm ci
npm exec playwright -- install chromium --no-shell
npm test
npm start
```

`npm start` はローカル検証アプリを http://127.0.0.1:4183 で開くためのサーバーです。`npm run typecheck` はAngularの厳密なテンプレート検査、`npm run build` はAngular compilerと公式linkerを使う実アプリのコンパイル、`npm run test:ui` はChromiumによる操作と自動アクセシビリティ検査です。試験用の状態操作を画面に設けています。Playwrightの `channel: 'chromium'` で新しいheadlessモードを使用し、headless shellは不要です。[Playwright公式の説明](https://playwright.dev/docs/browsers#chromium-new-headless-mode)を参照しています。

利用アプリへ `templates/angular/` のTypeScriptとCSSをコピーし、部品をstandalone componentのimportsへ追加してCSSを読み込みます。具体例は [検証アプリ](tests/fixture-app/app.ts) を参照してください。自動コピー／同期はまだ提供していません。

## 予定する使い方

利用アプリが持つ `ui.config.yaml` を唯一の設定の正本とし、解決した同じ設定から、UI部品とスタイル・プロジェクト用Skill・静的検査設定を生成します。

| 予定するコマンド | 役割 |
| --- | --- |
| `ui-foundation init` | 設定雛形、Skillへの導線、開発コマンドの追加。既存設定を保全する。 |
| `ui-foundation sync --dry-run` | 変更対象と差分の確認。 |
| `ui-foundation sync` | 決定的な生成・同期。手編集を黙って上書きしない。 |
| `ui-foundation check` | 設定と生成物の整合性、解析可能な逸脱、例外・判定不能箇所の報告。 |

これらのコマンドは未実装です。`postinstall` で利用者のソースを変更する仕組みは設けません。利用アプリでは将来 `ui:sync`・`ui:check` と、実ブラウザー操作用の `ui:test` を分けて使います。このリポジトリに成功するだけの代用コマンドは置きません。

## 最小構成

```text
ui-foundation/
├── AGENTS.md
├── package.json
├── docs/
├── examples/ui.config.example.yaml
├── src/
│   └── checks/
├── presets/task-oriented/
├── templates/angular/
├── skills/ui-development/
└── tests/
    ├── config/
    ├── generation/
    ├── checks/
    └── fixture-app/
```

`templates/angular/` に上記の基本部品と共通CSSを置き、`tests/fixture-app/` と `tests/ui/` で検証します。`src/`、プリセット、Skill生成は今後の実装です。全画面を同じ見た目にすることや、画面仕様をYAMLへ集約することは目的にしません。

静的検査の成功を、実操作やUX全体の合格と扱いません。実データのUndo、業務上の正しさ、安全に継続できる範囲は利用アプリが保証します。

## 公開とライセンス

パッケージは `private: true` とし、npmへの公開や名前の予約は行いません。ライセンスは未決定です。現時点では第三者への権利許諾を指定していません。
