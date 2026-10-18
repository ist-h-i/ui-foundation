# ui-foundation

利用者の目的と利用環境から、プロファイルごとのUI基盤を作る開発ツールです。AIが配色・文字・余白の体系と画面構成を提案し、確定した一つのYAMLから、Angular部品・Tailwindテーマ・プロジェクト用Skill・検査設定を生成します。

## 二段階のトークン

具体値を持つ**プリミティブ**と、用途を表す**セマンティック**を分けます。部品と画面はセマンティックだけを参照します。プロファイルで対応関係を変えると、同じ部品の色、文字、余白、寸法、角丸を一括して変更できます。

```yaml
primitives:
  blue-700: { type: color, value: "#1856a6" }
  green-700: { type: color, value: "#17634a" }
semantic:
  color.action: blue-700
profiles:
  dense:
    semantic:
      color.action: green-700
```

これは構造の抜粋です。必須役割や利用者の文脈を含む実行可能な設定は[設定例](examples/ui.config.example.yaml)を参照してください。旧preset/density方式との互換は提供しません。

## 試す

Node.js 24.19.0で検証します。依存はlockfileで固定します。

```sh
npm ci
npm exec playwright -- install chromium --no-shell
npm run ui:sync
npm test
npm start
```

http://127.0.0.1:4183 の検証アプリで「表示設定」を切り替えると、guidedとdenseの違いを比較できます。入力や取得・実行状態を保持したまま同じ部品の見た目を変更します。Tailwind utilityも部品CSSも同じ意味トークンを参照します。

| コマンド | 実際に確認・実行する内容 |
| --- | --- |
| `npm run ui:sync -- --dry-run` | 生成予定の差分を表示。書き込みなし。 |
| `npm run ui:sync` | 設定検証、全プロファイルの解決、生成・同期。 |
| `npm run ui:check` | 設定・生成一致と、設定したソースの静的逸脱検査。違反で失敗、動的な未確認は警告。 |
| `npm run ui:check:warnings` | 本リポジトリの全警告と分類台帳を照合。未分類・消滅・重複・根拠変更で失敗する。 |
| `npm run typecheck` | 設定/CLIのTypeScript、生成Angular部品のstrictTemplates、下記Media/Tree/Diagram回帰の型検査。 |
| `npm run test:config` | 型、参照、必須役割、プロファイル、色ペアの検査。 |
| `npm run test:generation` | 冪等性、dry-run、衝突、パス境界、CLIの失敗状態。 |
| `npm run test:static` | 全トークン用途、部品承認、例外、未確認警告、取り込み先での同梱検査器の実行。 |
| `npm run typecheck:ui:media` | Media3specと直接helperのstrict型検査。通常typecheckにも含める。全UI specのstrict検査ではない。 |
| `npm run typecheck:ui:runtime` | Tree/Diagram/Menuの4specと直接helper・consumerのstrict型検査。通常typecheckにも含める。 |
| `npm run test:ui` | 実ブラウザーの操作・表示・自動アクセシビリティ。 |
| `npm run test:svg-paint` | 新規公開consumerの生成・AOTと34ケースのSVG実描画検査。通常testにも含める。 |
| `npm run test:cross-browser` | 2プロファイル×重点6操作×Chromium/Firefox/WebKitの36件。追加実行の詳細は[検証ガイド](docs/cross-browser-runtime-verification.ja.md)。 |

ビルドは`ui:check`を通し、未同期の生成物を黙って使いません。設定変更後は`ui:sync`を実行してください。通常の`npm test`は警告の分類確認も行います。

## 利用アプリに導入する

現在はソースcheckoutからCLIを実行します。npmへの公開はしていません。利用アプリのディレクトリを作業ディレクトリにし、checkout内のtsxとCLIを指定します。

```sh
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts init
# ui.config.yamlの利用者・トークン・プロファイルを編集
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts sync --dry-run
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts sync
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts check
```

`init`は設定雛形だけを作り、既存設定を上書きしません。`--config`でプロジェクト内の別のYAMLを指定できます。`output`は生成専用ディレクトリです。同期対象はそこに置くtokens.css、tailwind.css、angular/、profiles.ts、resolved.json、policy.json、check-ui.cjs、checker-lib/、CHECKER-NOTICE.txt、manifest.jsonと、`.agents/skills/project-ui/`です。固定Skill内のownership.jsonは、現在の所有manifestを指す機械情報です。rootごとに一つの生成UIとSkillを所有し、複数YAMLから並行して別の所有者を作りません。

利用アプリは生成されたangular/indexからstandalone部品をimportします。Angular/RxJS/CDKに加え、日程・媒体・専門部品の正規runtime依存と型が必要です。[生成consumerの導入手順](docs/ui-library-consumer-guide.ja.md)にexact版、公開API、CSS、workerとassetの配信を記録しています。CDKの公開APIで仮想化と移動を接続し、[依存判断と制限](docs/adr/0002-collections-cdk.md)を保ちます。Tailwind v4の入口にTailwind、tokens.css、tailwind.css、angular/styles.cssを読み込み、部品と画面のソースを`@source`へ指定します。vendorのglobal CSSも含む[検証アプリのCSS入口](tests/fixture-app/styles.css)が実例です。

PDF/MapLibre/Spreadsheetのworkerは別assetとして配信し、利用アプリのURLを部品へ渡します。[ビルド実例](scripts/build.mjs)は共有ESM chunks、PDFのcmaps/fonts/wasm/iccs、MapLibre CSS、原NOTICE、PDF font source kitも配布します。第三者依存の出典と条件は[監査記録](docs/dependency-license-audit.ja.md)を参照してください。

`default_profile`が初期値です。実行時の切替が必要なら、利用アプリが設定に存在するIDを選び、スコープに`data-ui-profile="ID"`を付けます。初期化時に一つだけを選ぶ利用もできます。CLIは利用者の属性から勝手に選択しません。

## AIが担当する設計

生成Skillは利用者の文脈と、解決したトークンの対応を読みます。AIは新しいプリミティブや対応関係も提案できます。プレビューで採用する設定を決め、その設定をコードと検査へ固定します。実行時のLLM API、モデル選択、課金、サーバー、DBは持ちません。

画面構成や補助説明の出し方はプロファイルのguidanceを参照してAIが実装します。全画面のDOMや業務仕様をYAMLに記述しません。処理中・エラー・復旧・入力保持の意味、業務上の判断、実データのUndoは、それぞれ部品と利用アプリが責任を持ちます。

## 検査の範囲と文書

`ui:check`は指定ソースの全トークン用途と未承認Angular部品・directiveを静的検査します。生成先の`check-ui.cjs`は、本体checkoutや検査専用の追加依存なしで取り込み先から実行できます。明確な違反は失敗にし、動的な未確認は警告として残します。[検査の設定・配布・判定範囲](docs/static-checks.ja.md)を参照してください。

本リポジトリでは`ui:check:warnings`が、全警告の具体的な理由、producer、有限の回帰、残る未確認範囲と再確認条件を[分類台帳](docs/ui-warning-reviews.json)へ照合します。元の警告は消さず、新規・消滅・重複や根拠の変更を受入確認の失敗にします。現在の対象と検証結果は[取り込み時の記録](docs/verification/ui-static-warning-release-20261018/README.md)へ固定します。利用アプリの通常検査は警告のみなら終了0という契約を維持します。

静的検査、定義済み色ペアの数値検査、自動アクセシビリティ、実操作、意味・視覚レビューは別の確認です。有限のブラウザー試験を、任意の入力・OS・支援技術、実サービスの復元、利用者の理解や実業務での有効性の保証へ広げません。

- [要件](docs/project-brief.ja.md)
- [設定・生成・責任境界](docs/design.md)
- [実装・検証計画](docs/implementation-plan.md)
- [部品APIと検証範囲](docs/ui-components.md)
- [全要求の原文と181行の対応](docs/ui-library-matrix.json)
- [生成consumerの導入](docs/ui-library-consumer-guide.ja.md)
- [共通フォーム・locale・RTL・profile契約](docs/ui-library-runtime-foundation-spec.ja.md)
- [開発方針](docs/development.md)

生成物もGitで追跡します。手編集や未所有ファイルとの衝突、symlink、プロジェクト外出力は拒否します。通常の書込み失敗では完了済みの書込みを復元しますが、プロセス強制終了や同じrootでの同時実行を含む複数ディレクトリの原子的な更新は保証しません。

生成後のoutput変更は、ownership.jsonが指す旧manifestで旧生成物と固定SkillのSHAを検査して移行します。`sync --dry-run`で旧ファイルと旧manifestの削除、新ファイルと新manifestの作成、Skillと所有情報の更新を確認できます。手編集や未所有ファイルが旧・新生成先のどちらにあっても拒否し、同内容でも所有権を引き継ぎません。空の旧ディレクトリは残り、アプリが所有するimport先などの変更はアプリ側で行います。

ownership.jsonがまだない従来のv1生成物は、同じoutputで一度syncすれば通常移行を利用できます。ツール更新と同時にoutputを変更する場合は、`sync --from-output .ui/generated --dry-run`で旧生成先を明示し、確認した計画を`sync --from-output .ui/generated`で適用します。既存の所有情報が壊れている場合にこのオプションで上書きすることはできません。大文字・小文字だけの移動は異なる中間生成先を経由してください。

パッケージは`private: true`、ライセンスは未決定です。npmへの公開や権利許諾を指定していません。
