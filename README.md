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
| `npm run ui:check` | 設定検証と生成物の一致。欠損・変更・未管理ファイルで失敗。 |
| `npm run typecheck` | 設定/CLIのTypeScriptと生成Angular部品のstrictTemplates。 |
| `npm run test:config` | 型、参照、必須役割、プロファイル、色ペアの検査。 |
| `npm run test:generation` | 冪等性、dry-run、衝突、パス境界、CLIの失敗状態。 |
| `npm run test:ui` | 実ブラウザーの操作・表示・自動アクセシビリティ。 |

ビルドは`ui:check`を通し、未同期の生成物を黙って使いません。設定変更後は`ui:sync`を実行してください。

## 利用アプリに導入する

現在はソースcheckoutからCLIを実行します。npmへの公開はしていません。利用アプリのディレクトリを作業ディレクトリにし、checkout内のtsxとCLIを指定します。

```sh
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts init
# ui.config.yamlの利用者・トークン・プロファイルを編集
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts sync --dry-run
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts sync
/path/to/ui-foundation/node_modules/.bin/tsx /path/to/ui-foundation/src/cli.ts check
```

`init`は設定雛形だけを作り、既存設定を上書きしません。`--config`でプロジェクト内の別のYAMLを指定できます。`output`は生成専用ディレクトリです。同期対象はそこに置くtokens.css、tailwind.css、angular/、profiles.ts、resolved.json、policy.json、manifest.jsonと、`.agents/skills/project-ui/`です。

利用アプリは生成されたangular/indexからstandalone部品をimportします。生成AngularコードにはAngular/RxJSと`@angular/cdk@22.2.1`が必要です。CDKの公開APIで固定高さの仮想化と移動を接続し、[依存判断と制限](docs/adr/0002-collections-cdk.md)に契約を記録しています。Tailwind v4を利用アプリ側で導入し、CSS入口にTailwind、tokens.css、tailwind.css、angular/styles.cssを読み込み、部品と画面のソースを`@source`へ指定します。[検証アプリのCSS入口](tests/fixture-app/styles.css)が実例です。

`default_profile`が初期値です。実行時の切替が必要なら、利用アプリが設定に存在するIDを選び、スコープに`data-ui-profile="ID"`を付けます。初期化時に一つだけを選ぶ利用もできます。CLIは利用者の属性から勝手に選択しません。

## AIが担当する設計

生成Skillは利用者の文脈と、解決したトークンの対応を読みます。AIは新しいプリミティブや対応関係も提案できます。プレビューで採用する設定を決め、その設定をコードと検査へ固定します。実行時のLLM API、モデル選択、課金、サーバー、DBは持ちません。

画面構成や補助説明の出し方はプロファイルのguidanceを参照してAIが実装します。全画面のDOMや業務仕様をYAMLに記述しません。処理中・エラー・復旧・入力保持の意味、業務上の判断、実データのUndoは、それぞれ部品と利用アプリが責任を持ちます。

## 検査の範囲と文書

`ui:check`は全ソースのASTによる逸脱検査、業務の正しさ、利用者の理解を確認しません。定義済み色ペアの数値検査、自動アクセシビリティ、実操作、意味・視覚レビューを区別します。Firefox/Safari、実スクリーンリーダー、実サービスの復元、実利用での有効性は別途確認が必要です。

- [要件](docs/project-brief.ja.md)
- [設定・生成・責任境界](docs/design.md)
- [実装・検証計画](docs/implementation-plan.md)
- [部品APIと検証範囲](docs/ui-components.md)
- [開発方針](docs/development.md)

生成物もGitで追跡します。手編集や未所有ファイルとの衝突、symlink、プロジェクト外出力は拒否します。通常の書込み失敗では完了済みの書込みを復元しますが、プロセス強制終了を含む複数ディレクトリの原子的な更新は保証しません。生成後にoutputを移す場合は、従来の生成物をGitで確認してから整理してください。

パッケージは`private: true`、ライセンスは未決定です。npmへの公開や権利許諾を指定していません。
