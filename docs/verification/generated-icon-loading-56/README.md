# 生成アイコンと Angular の初回遷移の調査

2026年11月25日。対象は `ist-h-i/ui-foundation` の `21dcefd42f0b7c57eafbfb11d17bfc4e8ac20e56` と npm 公開版 `@hiroshi.inoue/ui-foundation@0.1.0`。製品コードの修正前に、原因と採用方式を比較した。[決定と受入条件](../../adr/0007-generated-icon-loading.md)・[Issue #56](https://github.com/ist-h-i/ui-foundation/issues/56)

## 条件と単位

macOS arm64 の独立した Angular CLI アプリに、公開版の `init --language ja` と `sync` でソースを生成した。npm tarball の SHA-256 は `6a6ea5bed120ed9181d5882df0eaaa001de417f0cea257a67e670aba03716471`。Angular テンプレートの TS/CSS 155ファイルは checkout と一致し、`icon.ts` は報告時のボードとも同じ Git blob `3de34d73e1da3120b5b6331f4d65030d48a167e1` だった。[報告時の生成物](https://github.com/ist-h-i/todo-generator/blob/0666dd8e853af165a6eb4f11358c5a50dfd8e99d/frontend/.ui/generated/angular/icon.ts)

| 条件 | 報告側に合わせた最小アプリ | 基盤側に合わせた最小アプリ |
| --- | --- | --- |
| Angular / CLI / build / CDK | 21.1.4 | 22.3.0 |
| TypeScript / Node | 5.9.3 / 20.19.5（生成は24.19.0） | 6.0.3 / 24.19.0 |
| Playwright / Chromium | 1.57.0 / 143.0.7499.4 | 1.63.0 / 153.0.8010.12 |
| 現行のアイコンパッケージ | `@lucide/angular@1.52.0` | 同左 |

各ケースを別のビルドにし、開始画面と `loadComponent` で開く遅延ルートを用意した。開発時は `optimization: false`、`sourceMap: true`、CLI キャッシュ無効。新しいブラウザーコンテキストで開始画面の読み込みを終えてからリンクをクリックした。以下の「開発」は HTTP 応答の JS 本体をバイト単位で合計した値。インラインの base64 マップも含む。「本番」は最適化あり・マップなしのローカルビルドの非圧縮 JS。公開サービスの回線速度や本番での利用体験は測定していない。

## 登録数と読み込み元の切り分け

各値は遅延ルートの JS 合計（B）。この表の開発ケースは、最大応答1件が合計と同じだった。両バージョンの `Icon` 行は生成された `angular/icon.ts` を直接指定し、公開入口の他の再エクスポートの影響を除いた。

| 遅延ルートに置いたもの | 開発 Angular 21 | 開発 Angular 22 | 本番 Angular 21 |
| --- | ---: | ---: | ---: |
| 空の対照 | 3,452 | 3,376 | 348 |
| 同形のインライン SVG | 4,609 | 4,925 | — |
| 現行 `Icon` と `provideUiIcons()`（既定12件） | 49,701,376 | 50,738,353 | 50,039 |
| `LucideDynamicIcon` に検索1件だけ登録 | 49,689,700 | 50,726,710 | 13,907 |
| 静的な `LucideSearch` | 49,688,713 | 50,725,719 | 10,342 |

Angular 21 の現行アイコンの応答には、マップを除いた JS が 14,872,190 B、インラインマップのコメントが 34,829,186 B 入っていた。検索だけの実コードにも未使用の `LucideAlarmClock` が残る。Angular 22 の公開 `core` 経由では 16,318,446 B と 35,262,238 B だった。パッケージの実行入口は 10,479,179 B の FESM 1本で、1,866個のアイコン定義を含む。`LucideDynamicIcon` は登録済みの名前を解決する。Angular 22 で登録処理を別ファイルに移し、検索1件だけにしても、同じ公開入口からの応答は 51,580,596 B だった。[生成元](../../../templates/angular/icon.ts)・[上流の名前解決](https://github.com/lucide-icons/lucide/blob/1.52.0/packages/angular/src/lucide-dynamic-icon.ts)・[上流のチャンク分割に関する報告](https://github.com/lucide-icons/lucide/issues/5188)

Angular 22 の `core` でビルドの `sourceMap` だけを無効にすると、Vite が配信する応答には引き続きインラインマップが付き、遷移時は 90,845,019 B になった。キャッシュだけを有効にした場合も、合計 55,681,401 B、最大 54,821,925 B だった。キャッシュや開発サーバーの設定変更を導入条件にする理由は得られなかった。

## 公開入口を変える効果

Angular 22 の試作では公開 tarball の**生成元テンプレート**に軽量描画部品と個別データを入れ、正規の CLI で同期した。試作アプリの `node_modules` には `@lucide/angular` も `@lucide/icons` もない。開発サーバーで検索の path と半径8の円を確認し、production の AOT ビルドも通った。試作は配信構造の検証用で、互換入口を含む完成版ではない。

| 構成（検索を1個表示） | 開発・初期合計 B | 開発・遷移合計／最大 B | 本番・初期合計 B | 本番・遷移 B |
| --- | ---: | ---: | ---: | ---: |
| 空の対照 | 5,270,170 | 3,376 | 208,867 | 331 |
| 現行 `core`、既定12件 | 5,271,768 | 51,580,684 | 223,056 | 264,909 |
| 試作、既存の `core`、既定12件 | 5,271,751 | 850,579 | 218,073 | 220,485 |
| 試作、専用入口、検索1件 | 5,270,353 | 21,808 | 217,933 | 3,625 |
| 試作、専用入口、既定12件 | 5,270,353 | 33,317 | 217,933 | 5,310 |

専用入口の検索1件で、空の対照からの開発 JS 増加は初期＋遷移の合計で 18,615 B、遷移時の最大応答で 18,432 B。本番の初期＋遷移では 12,360 B。既定12件の開発合計増加は 30,124 B だった。試作の `core` には本番の遅延チャンクにも部品・診断・表／予定の3辞書が計 201,661 B 残った。アイコンのために最小の入口を設け、共有辞書の改善は #54 として追跡する。[Issue #54](https://github.com/ist-h-i/ui-foundation/issues/54)

同じ localhost 測定で、ブラウザーが報告した遷移時の `transferSize` 合計（ヘッダー込み）は現行 `core` が 51,584,284 B、専用入口の検索1件が 22,708 B。クリックから SVG の path が DOM に現れるまではそれぞれ 2,703 ms と 16.3 ms だった。時間は各1回の参考値とし、性能予算にはバイト数を使う。

ルートの分割も対照を置いた。初期画面で検索を表示し、遅延側でだけ `folder` を追加した。現行 `core` の本番出力では `folder` の SVG path が初期画面の静的な依存チャンクに入った。1アイコン1モジュールの試作では、検索データは初期側、`folder` のデータと path は遅延側にだけ存在した。ブラウザーでは遷移後に `folder` の形状を確認した。

互換性は別の Angular 22 アプリで、公開版の現在の動作を確認した。既定アイコンと追加データの名前・別名が重なると登録の後の値が優先され、同じ injector の複数 provider は最後が有効だった。子に登録がなければ親を継承し、子に登録があれば子のレジストリを使う。Lucide の生の SVG と `ui-icon` の間で登録が双方向に効き、外部の線色・線幅・非拡大 stroke の設定も反映された。未登録名が Angular のエラーハンドラーに届くこと、情報を伝えるアイコンの title と名前、描画後の検索からフォルダーへの変更も確認した。これらは後続実装が保つべき比較元である。[現行の描画](../../../templates/angular/icon.ts)・[Lucide の登録](https://github.com/lucide-icons/lucide/blob/1.52.0/packages/angular/src/lucide-icons.ts)

## 横展開で確認した箇所

配布済みの Angular 実装 TS 151ファイルについて、型専用の参照を除き、値の静的 import と再エクスポートを逆向きにたどった。`icon.ts` 以外に12ファイルが直接参照し、推移的にはこの12件を含む57ファイルから到達できる。メニュー、通知、コレクションも対象に含まれる。配信量は下表の経路で個別に測った。横展開用の最小アプリの空ルートは 3,421 B。

| 経路 | 観測と扱い |
| --- | --- |
| アイコン未指定のボタン・リンク・カード | `core` のボタンは 51,579,535 B、リンクは 51,579,545 B。折りたたみ無効の `Card` でも 51,579,364 B。軽量化の試作では同じボタンが 838,023 B、リンクが 838,033 B。#56 の回帰対象に加える。 |
| フォーム（#54） | `forms` のネイティブ入力を囲む `FormField + FieldControl` は 52,202,744 B、`TextInput` は 52,202,457 B、`Textarea` は 52,202,442 B。診断のため `form-field.ts` から直接読むと前者は 716,870 B で Lucide は含まれず、辞書は残る。本番の同じフォームは両入口とも 219,655 B、そのうち3辞書は 201,661 B。アイコンと辞書には別の回帰条件が要る。[辞書の結合箇所](../../../templates/angular/stable-messages.ts) |
| レイアウト（#55） | `index.Stack` は開発遷移で 61,252,607 B、内部 `layout` の診断対照は 104,989 B。本番の遷移に必要な JS は 233,624 B 対 2,259 B。全件入口の本番出力には辞書、marked、Dagre、jsonc-parser が残る。#55 の公開入口は、専門依存なしの型検査と、単一レイアウトの開発・本番配信量の両方で検証する。[Issue #55](https://github.com/ist-h-i/ui-foundation/issues/55) |
| Gantt のグラフエンジン | 1タスクの SVG を描画する遷移で 12,011,908 B を取得し、未登録の Sankey・Funnel・Candlestick などを含んでいた。必要な機能を名前指定で読み込む遅延アダプターに替えると、同じ3機能を登録するエンジン単体の最小化比較で 1,115,162 B → 477,201 B。これを別件の方針とし、同じ読み込み経路を使う `Chart`・`Sparkline` の描画も回帰対象にする。この2部品はコード上で確認した。[Gantt](../../../templates/angular/gantt.ts)・[Chart と Sparkline](../../../templates/angular/chart.ts) |
| CodeEditor の言語拡張 | 既定のプレーンテキストで入力が反映されるまでに 5,274,788 B を取得し、JavaScript・JSON・Markdown の3言語がすべて含まれた。これはエディター全体の取得量。選択言語の拡張だけを遅延取得する別件とし、言語を切り替えても入力・選択を保つことと、古い読み込みが後から適用されないことを確認する。[CodeEditor](../../../templates/angular/code-editor.ts) |

`Stack` の初回遷移では PDF.js、MapLibre、QR・バーコード、CodeMirror、ProseMirror、ECharts の専用チャンクへのリクエストはなかった。表計算の数式パーサーは計算 worker 側にある。全件入口をビルドするときに解決する依存、生成された遅延ファイル、ブラウザーがその操作で取得したファイルを照合した。[PDF](../../../templates/angular/pdf-adapter.ts)・[地図](../../../templates/angular/map.ts)・[表計算 worker](../../../templates/angular/sheet-formula.worker.ts)

## 再測定の手順

公開入口の表は、Node 24.19.0、npm 11.17.0、Git、このリポジトリの Playwright 1.63.0 と対応する Chromium のある環境で、リポジトリのルートから再測定できる。

```sh
node docs/verification/generated-icon-loading-56/reproduce.mjs
```

スクリプトは一時ディレクトリに npm の固定依存から2つのアプリを構築する。公開版では空の対照・`angular/icon`・`angular/core`、試作では同じ `core`・専用入口の検索1件・既定12件を順に測る。試作の差分は一時アプリ内の npm パッケージのテンプレートに適用し、正規の `sync` で生成する。表示した作業先に各ケースの測定 JSON、開発サーバーログ、本番の `browser-stats.json` が残る。開発サーバーの絶対パスなどによって応答サイズに小差が出るため、同一環境で測った空の対照との差を比較する。この試作は描画・配信の比較用で、0.1.0 の静的検査は新設の `icons/search` 等に `generated-internal-import` を報告する。[再測定スクリプト](reproduce.mjs)・[試作の差分](prototype.patch)・[固定依存](angular22-lock.json.gz)・[図形のライセンス表示](../../../assets/third-party/FOUNDATION-NOTICES.txt)

1. 上記バージョンを固定した Angular CLI アプリに npm の `@hiroshi.inoue/ui-foundation@0.1.0`、`@lucide/angular@1.52.0` と対応する CDK を入れる。Node 24.19.0 で `ui-foundation init --language ja` と `ui-foundation sync` を実行する。
2. 同一の開始画面に `routerLink="/probe"` と `router-outlet` を置く。`/probe` は `loadComponent: () => import('./probe').then(m => m.Probe)` で開く。現行版の測定では遅延部品の `imports: [Icon]`、`providers: [provideUiIcons()]`、テンプレートの `<ui-icon name="search" />` を使う。対照はこの3か所を空にする。ケースごとに同じファイルを差し替えてサーバーを起動する。別ケースを同じアプリに同時登録すると共有チャンクの境界が変わる。
3. `@angular/build:application` と `@angular/build:dev-server` を使用する。`ng serve --configuration development` で新しい Chromium コンテキストを開き、開始画面の通信が止まってからリンクを押す。リクエスト開始時点で初期・遷移を分類し、JavaScript の Content-Type を持つ各応答の `(await response.body()).length` を集計する。インラインマップは末尾の `sourceMappingURL=data:application/json…;base64,…` のコメント全体をバイトで計上する。検索の path と `circle[r="8"]` が DOM に出たことも確認する。
4. 同じケースを `ng build --configuration production --stats-json` でビルドする。本番は各入口から静的 import をたどり、初期側ですでに数えた JS を遅延側から除く。入力モジュール別の `bytesInOutput` と実際の SVG path の格納先を調べる。既存のパッケージ試験は最小化 esbuild と専門依存の検査を継続し、新しい試験で実際の開発サーバーの配信を抑える。[既存のパッケージ試験](../../../tests/package/core-entry.test.mjs)・[バンドル検査](../../../scripts/package-verification/core-bundle.mjs)

## 報告元のボード

アイコンを使った `0666dd8e` とインラインに戻した `5caf38e6` のフロントエンドを別々に展開した。同じ `analyze.spec.ts` の `final publication completed on the board clears shared input before returning` を1ワーカー・再試行なしで実行し、ボードをクリックした後の JS 応答本体を比較した。さらに前者の隔離コピーに、同じ個別データ方式の Angular 21 用試作を同期した。ボード用の試作は既存の `angular/icon` から既定12件を登録し、名前を `Map` で引く。上の再測定用パッチは Angular 22 で専用入口を比較するために作成した別の試作である。ボードと E2E のソース、Angular 設定、lockfile は3条件のうち現行アイコンと Angular 21 用試作で一致する。[利用側の検証 PR](https://github.com/ist-h-i/todo-generator/pull/1331)

| 開発サーバーの構成 | 最大応答 B | 取得合計 B | 元の5秒の URL 待機を含む E2E |
| --- | ---: | ---: | --- |
| 現行の生成アイコン | 51,421,734 | 52,200,715 | URL 待機で失敗 |
| 既存のインライン SVG | 1,714,304 | 2,492,727 | 通過 |
| 既定12件を個別データにした試作 | 1,745,248 | 2,524,229 | 2回とも通過。テスト全体で3.2秒・3.4秒 |

サイズは Playwright トレースの `response.bodySize`。試作の2回は別々に開発サーバーと Chromium を起動し、どちらも同じサイズで検索の path が表示された。試験は API を模擬した開発サーバーでの操作である。

## 修正後の配布候補

個別データと公開入口を実装した候補を npm tarball から導入し、空ルート、検索1件、既定12件、初期と遅延で異なる図形を使うケース、アイコン未指定の基本部品を別々に計測した。次の表は同一条件の空ルートから増えた非圧縮 JS のバイト数。開発合計と本番合計には初期表示と遷移の両方を含む。

| Angular | 検索1件・開発合計 | 検索1件・遷移最大 | 既定12件・開発合計 | 検索1件・本番合計 |
| --- | ---: | ---: | ---: | ---: |
| 21.1.4 | 36,651 | 36,383 | 53,358 | 14,892 |
| 22.3.0 | 36,594 | 36,353 | 53,301 | 14,712 |
| 回帰試験の上限 | 100,000 | 100,000 | 200,000 | 20,000 |

両バージョンが strict AOT を通過した。検索の形状を Chromium で確認し、追加のフォルダー形状は遅延側だけに含まれた。基本部品を含む各ケースで Angular 版 Lucide のビルド入力は0件だった。元のボードの合成 E2E は、新規サーバー・新規 Chromium の2回とも従来の URL 待機5秒を通過し、検索の path を表示した。クリック後の最大 JS 応答は両回とも 1,768,855 B、合計は 2,547,853 B。テスト全体はそれぞれ6.6秒と6.7秒だった。

計測に使った tarball の SHA-256 は `fc307750be71ec0a03c9ad5e77dcfdfce3dedaab0ec5318309885752ee023401`。API 一覧を再生成した候補 `a4f71121e94039099ddca9c9f8551c92f1ee0d69d267f3f823b0a595231a2100` と展開後の全ファイルを照合し、差分は文書 `docs/ui-library-api.json` のみだった。開発時の配信と最適化ビルドを再測定するには次を実行する。特定の tarball を固定するには `UI_FOUNDATION_PACKAGE_TARBALL` と `UI_FOUNDATION_PACKAGE_SHA256` を両方指定する。

```sh
node docs/verification/generated-icon-loading-56/reproduce.mjs --candidate --angular both
```
