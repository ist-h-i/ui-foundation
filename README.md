# ui-foundation

動作を実装したAngularのUI部品と、設定ファイルで見た目を調整できる仕組みを提供するnpmパッケージです。フォーム、表、ナビゲーション、ダイアログなどの部品を組み合わせて、アプリの画面を作れます。

色・文字・余白・寸法・角丸などを一つのYAMLで定義し、UI部品、Tailwindテーマ、AIの開発指針、検査設定へまとめて反映できます。

## できること

- **部品を組み合わせて画面を作る**：入力、選択、開閉、キーボード操作、処理中・エラーなどの表示や操作を備えたAngular部品を使えます。表示だけのモックではなく、アプリの状態やイベントにつないで利用する部品です。
- **アプリに合う見た目へ調整する**：色だけでなく文字、余白、形状、部品の寸法などを設定できます。Angular部品とTailwindのユーティリティが同じ設定を参照します。
- **生成と更新をまとめて行う**：CLIの`init`で設定のひな形を作り、`sync`で部品・スタイル・プロジェクト用Skill・検査器を一括生成します。変更前には`sync --dry-run`で差分を確認できます。
- **設計と実装のずれを確認する**：`check`で設定と生成物の不一致を調べ、指定したアプリソースのデザインルール逸脱を静的に検査できます。
- **AIにも設計の意図を渡す**：利用目的、制約、画面設計の指針、採用した設定をプロジェクト用Skillへ反映し、AIが画面を実装するときの判断材料にできます。

## 使える部品

| 用途 | 代表的な部品 |
| --- | --- |
| 入力・フォーム | テキスト入力、選択、日付・期間入力、段階的入力、条件編集 |
| 表・一覧 | データテーブル、編集表、仮想一覧、ツリー、項目の移動 |
| ナビゲーション | メニュー、サイドナビゲーション、タブ、パンくず |
| 操作・通知 | ボタン、ダイアログ、ポップオーバー、通知、進捗表示 |
| レイアウト・表示 | ページ枠、カード、グリッド、ドロワー、アバター、統計値 |
| 日程・業務画面 | カレンダー、予定表、ガント、カンバン |
| ファイル・媒体 | ファイル選択、画像・音声・動画、PDF、QR・バーコード |
| 可視化・編集 | チャート、地図、表計算、コード・リッチテキスト編集、フロー編集 |

部品の公開名、機能、制約、サンプルの案内は[コンポーネント一覧](docs/components.ja.md)を参照してください。

## 設定で変えられること

具体値を定義する「プリミティブ」と、その値をどこで使うかを定義する「セマンティック」を分けています。「プロファイル」は、この対応関係を名前付きでまとめた設定集です。独自の値とプロファイルを定義でき、決まったテーマから選ぶ方式には限定されません。

設定例の`guided`と`dense`は、同じ画面・部品へ異なる設定を適用するためのサンプルです。機能が組み込まれた特別な名前ではありません。

| 設定例の違い | `guided` | `dense` |
| --- | --- | --- |
| 主操作色 | 青 | 緑 |
| 本文サイズ | 1.125rem | 1rem |
| ページ余白 | 32px | 16px |
| 操作部品の角丸 | 12px | 4px |

`guided`を選ぶだけで画面が手順型になる、といった自動変換は行いません。画面構成や操作経路は、開発者やAIがアプリの目的に合わせて実装します。サンプル画面の「表示設定」は生成済みの設定を比較するもので、選択をYAMLへ保存する機能ではありません。実際のアプリでは一つのプロファイルに固定することもできます。

## 提供範囲

npmパッケージはCLIと生成元を配布し、利用先へAngularのTypeScriptソース、CSS、プロジェクト用Skill、検査器を生成します。コンパイル済みのAngularライブラリを直接importする方式ではなく、生成した部品を利用アプリでビルドします。Angularや描画エンジンなどの依存は[usageの依存関係](docs/ui-library-consumer-guide.ja.md#依存関係)に従って導入します。

| ui-foundationが提供するもの | 利用アプリが組み込むもの |
| --- | --- |
| UI部品の表示・操作・状態とイベント | 画面構成、業務ロジック、HTTP通信、保存・送信・Undo |
| ナビゲーションやリンクのUI | Angular Routerのルート定義・画面切替・遷移制御。既存部品とのRouter合成は未検証 |
| 設定からの生成と静的検査 | アプリのビルド、実操作・アクセシビリティ・見た目・使いやすさの確認 |

実行時のLLM API、サーバー、DBは提供しません。専門部品のworker、補助資産、外部サービスの認証や配信設定は利用アプリが用意します。静的検査の成功を、UX全体や任意の実行時挙動の保証とは扱いません。

## 使い始める

```sh
npm install --save-dev --save-exact @hiroshi.inoue/ui-foundation@0.1.0-beta.1
```

ベータの検証環境はNode.js 24.19.0、macOS arm64、Angular/CDK 22.2.1、TypeScript 6.0.3です。他の構成の確認状況と更新・復旧の条件は[ベータ利用契約](docs/npm-beta-readiness.ja.md)を参照してください。

| 知りたいこと | ドキュメント |
| --- | --- |
| 使える部品と機能を探す | [コンポーネント一覧](docs/components.ja.md) |
| 導入・設定・生成・組み込み・更新を進める | [usage](docs/ui-library-consumer-guide.ja.md) |
| コマンド、引数、結果、エラー対処を調べる | [CLIコマンド一覧](docs/commands.ja.md) |
| prop・イベントなどの詳細を調べる | [部品API](docs/ui-components.md) |
| 設定の構造と生成の契約を調べる | [設計](docs/design.md) |
| 静的検査の対象と限界を調べる | [静的検査](docs/static-checks.ja.md) |

## 開発元のサンプルと検証

次はこのリポジトリのcheckoutで使う既存の手順です。npmパッケージをインストールした利用先アプリの手順は[usage](docs/ui-library-consumer-guide.ja.md)を参照してください。

<details>
<summary>開発元の検証アプリとnpmスクリプト</summary>

Node.js 24.19.0で検証します。依存関係はロックファイルで固定します。

```sh
npm ci
npm exec playwright -- install chromium --no-shell
npm run ui:sync
npm test
npm start
```

http://127.0.0.1:4183 の検証アプリで「表示設定」を切り替えると、`guided`と`dense`の違いを比較できます。入力や取得・実行状態を保持したまま同じ部品の見た目を変更します。Tailwindのユーティリティも部品のCSSも同じ意味トークンを参照します。

| コマンド | 実際に確認・実行する内容 |
| --- | --- |
| `npm run ui:sync -- --dry-run` | 生成予定の差分を表示。書き込みなし。 |
| `npm run ui:sync` | 設定検証、全プロファイルの解決、生成・同期。 |
| `npm run ui:check` | 設定・生成一致と、設定したソースの静的逸脱検査。違反で失敗、動的な処理など、静的に確認できない箇所は警告。 |
| `npm run ui:check:warnings` | 本リポジトリの全警告と分類台帳を照合。未分類・消滅・重複・根拠変更で失敗する。 |
| `npm run typecheck` | 設定/CLIのTypeScript、生成Angular部品のstrictTemplates、下記のMedia/Tree/Diagram回帰の型検査。 |
| `npm run test:config` | 型、参照、必須役割、プロファイル、色ペアの検査。 |
| `npm run test:generation` | 冪等性、dry-run、衝突、パス境界、CLIの失敗状態。 |
| `npm run test:static` | 全トークン用途、部品承認、例外、未確認警告、取り込み先での同梱検査器の実行。 |
| `npm run typecheck:ui:media` | Mediaの3件のspecと、それらが直接使うヘルパーのstrict型検査。通常のtypecheckにも含める。UIの全specをstrict検査するものではない。 |
| `npm run typecheck:ui:runtime` | Tree/Diagram/Menuの4件のspecと、それらが直接使うヘルパー・利用アプリのstrict型検査。通常のtypecheckにも含める。 |
| `npm run test:ui` | 実ブラウザーの操作・表示・自動アクセシビリティ。 |
| `npm run test:svg-paint` | 新規の公開API利用アプリの生成・AOTと34ケースのSVG実描画検査。通常のtestにも含める。 |
| `npm run test:cross-browser` | 2プロファイル×重点6操作×Chromium/Firefox/WebKitの36件。追加実行の詳細は[検証ガイド](docs/cross-browser-runtime-verification.ja.md)。 |

ビルド時には`ui:check`を実行し、未同期の生成物を黙って使いません。設定変更後は`ui:sync`を実行してください。通常の`npm test`は警告の分類確認も行います。

</details>

開発元の[要件](docs/project-brief.ja.md)、[実装・検証計画](docs/implementation-plan.md)、[開発方針](docs/development.md)も参照できます。

## ライセンス

自作のCLI・テンプレート・Skill・生成コードは[MIT License](LICENSE)（Copyright © 2026 Hiroshi Inoue）で提供します。利用アプリ自身のコードや第三者資産のライセンスを変更するものではありません。生成先と生成Skillの`UI-FOUNDATION-LICENSE.txt`を保持し、配布成果物へ`ui-foundation/LICENSE.txt`として含めてください。第三者通知と対応ソースも[usageの配布資産](docs/ui-library-consumer-guide.ja.md#css-と配布資産)に従って保持します。
