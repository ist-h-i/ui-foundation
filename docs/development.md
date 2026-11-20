# 開発方針

## 設定と責任

YAMLのプリミティブが具体値の正本、セマンティックが用途の契約、プロファイルが対応の選択。AIは設計案と個別画面を作り、CLIは確定した設定に従って決定的に生成・検査する。文脈を変えただけで見た目を推測しない。旧preset/density設定や互換性のためのフォールバックを追加しない。

部品は入力、業務判断、HTTP、実データの復元を所有しない。処理中、欠損、結果不明、フォーカス、復旧の意味は見た目と分けて維持する。画面に必要な情報、業務上の安全な継続範囲は利用アプリに残す。

## 依存とスタイル

一つの標準部品だけが使うレイアウトや状態のスタイルは、`templates/angular/` の部品の近くに置く。例えば `PageFrame` の見出し・本文・固定領域は `page-frame.css` で管理する。色や余白は用途別のセマンティックトークンを参照する。

複数部品に共通するスタイルは共通 CSS に置く。投影コンテンツや外部描画エンジンの要素に部品内のスタイルが届かない場合は、対象部品のホストで絞ったグローバル CSS を使う。変更は生成元で行い、同期後にアプリのビルドと該当する表示・操作を確認する。

Angular/TypeScriptの既存standalone、signal、OnPush、native HTMLを使う。Tailwind v4のテーマは生成された意味トークンに接続する。構造CSSとユーティリティが同じ変数を使い、特定の美学や外部フォントを強制しない。依存関係は保守性と互換性を確認し、固定バージョンとロックファイルを記録する。

生成先のTypeScript/CSS/Skillを直接編集しない。設定・templates/angular・skills/ui-developmentを直し、sync/checkを実行する。生成物はGitで追跡する。未同期を合格にしたり、checkを成功するダミーへ置き換えたりしない。

## 検証

設定と生成試験、TypeScript/Angularコンパイル、実ブラウザー操作、自動アクセシビリティ、描画レビューを区別する。実施したコマンドと結果だけを報告し、要素数・部品使用率・色ペア合格をUX品質へ置き換えない。

ユーザーが承認した目的と今回のリポジトリ範囲で作業する。無関係の個人ファイル、認証情報、他プロジェクトのログや実測証拠を取り込まない。機能コードと独自拡張の領域は生成先に置かず、管理外ファイルを保全する。

## 過去の公開認可（2026-10-20）

2026/10/20の本人の明示指示により、`@hiroshi.inoue/ui-foundation@0.1.0-beta.1`の最終検証、`beta`タグ・public accessでのnpm公開、registry取得版の導入確認まで実施する。`private: false`はこの公開工程のための設定。最終候補のSHA・integrityを固定し、同一tgzを検証・監査・公開へ使う。公開用の変更はcommitと独立レビューで確認し、今回認可された公開工程としてmainへ通常mergeする。別versionや別パッケージの公開、権限変更をこの指示から推定しない。自作部分はMIT（Hiroshi Inoue）、第三者の既存条件は保持し、認証情報をリポジトリ・検証記録に保存しない。詳細は[npm公開計画](npm-release-plan.ja.md)を参照する。

## 開発元のサンプルと検証

次はこのリポジトリのcheckoutで使う既存の手順です。npmパッケージをインストールした利用先アプリの手順は[usage](ui-library-consumer-guide.ja.md)を参照してください。

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
| `npm run test:cross-browser` | 2プロファイル×重点6操作×Chromium/Firefox/WebKitの36件。追加実行の詳細は[検証ガイド](cross-browser-runtime-verification.ja.md)。 |

ビルド時には`ui:check`を実行し、未同期の生成物を黙って使いません。設定変更後は`ui:sync`を実行してください。通常の`npm test`は警告の分類確認も行います。

</details>

開発元の[要件](project-brief.ja.md)、[実装・検証計画](implementation-plan.md)、[開発方針](development.md)も参照できます。


## 過去ベータの公開ゲート記録

## 公開ゲート

技術ゲートは配布境界、強制隔離された導入、生成UIのstrict AOT/build/操作、worker/通知/source kit、版更新と復旧、依存監査、対象検証と独立レビュー。公開ゲートはさらに名前・version・自作コードと生成コードの利用条件・公開権限・本人の公開指示を必要とする。名称・version・MITは確定した。CLI認証・メール認証・2FAは確認済み。初版の公開指示は2026/10/20に得た。公開権限は実際のpublish結果で確認し、取得不能や拒否を公開成功へ補完しない。公開後はregistryから新規取得した同一integrityの版で導入確認を行う。


## 開発元の静的警告分類と受入確認

残す警告は[分類台帳](ui-warning-reviews.json)で一対一に管理します。各項目に診断identity、警告が妥当な理由、値のproducer、確認した有限回帰、残るUnknownの境界、再確認条件、根拠ファイルのanchorとhashを記録します。理由が分かる警告を一律の例外へ変えず、静的に改善できる箇所は検査器や実装を修正します。

```sh
# 元の診断と生成一致を確認
npm run ui:check -- --format json
# このリポジトリの全警告と分類台帳を照合
npm run ui:check:warnings
npm run ui:check:warnings -- --format json
# 台帳検証の正負回帰を含む静的検査の回帰
npm run test:static
```

`ui:check:warnings`は本リポジトリの`checkProject`結果と台帳を照合する受入確認です。新規・未分類の警告、消滅した分類、重複、理由不足、欠損・不正な台帳、根拠のhash/anchor変更で終了1にします。元の診断は削除・変更せず、エラーを台帳で承認することもできません。通常の`npm test`からも実行します。利用アプリのYAML schemaや同梱CLIの「警告のみなら終了0」は変更しません。

ソースや根拠が変わったら、通常CLIで差分を確認し、producer・影響する有限回帰・Unknownの境界を再調査して台帳を更新します。消えた警告の項目も取り除きます。hashだけを機械的に更新する全件承認コマンドは用意しません。

2026-10-18の取り込み前の通常CLI基準値は警告122件、確定違反0件、理由付き例外334件です。固定した対象、全件分類、今回実行した検証と未確認事項は[取り込み時の検証記録](verification/ui-static-warning-release-20261018/README.md)にまとめます。古い件数や過去の有限試験は当時の対象に対する記録であり、現行ソースの合格根拠へ流用しません。回帰が使う固定資料は[試験fixture](../tests/fixtures/static-checks/README.md)で管理します。


## Schedulerの依存比較と過去検証

## 依存と成熟候補の判断

設定・templateを直し `npm run ui:sync` → `npm run ui:check` を行い、生成先のAngular public barrelとtokens.cssを利用する。検証したAngular/CDKは `22.2.1`、RxJSは `7.8.2`。生成ソースはpackage manager設定を自動配布するものではない。利用アプリは **runtime依存 `temporal-polyfill: "1.0.5"`** を自身のpackage/lockへ宣言する。root検証用devDependenciesが利用アプリへ自動的に導入されるとは扱わない。consumerの正規install・strict AOT・browser buildでも依存を解決する。

| 対象 | 判断と根拠 |
| --- | --- |
| FullCalendar Angular `7.1.0` | [固定版の公式package](https://raw.githubusercontent.com/fullcalendar/fullcalendar/v7.1.0/packages/angular/package.json)はAngular common/core 16–22をpeerに持ち、[connectorのMIT原文](https://raw.githubusercontent.com/fullcalendar/fullcalendar/v7.1.0/packages/angular/LICENSE.txt)と[公式eventDrop](https://fullcalendar.io/docs/eventDrop)のoldEvent/revert等を比較した。成熟候補として残す。resource timeline/vertical resource等は[別のpremium license](https://fullcalendar.io/docs/premium)であり、今回の依存・利用権として含めない。 |
| 今回のnative部品 | 既存Angular/native HTML/Intl/civil modelとtyped projected DOMを使い、全要求のview・resource・band・native移動を接続する。FullCalendarの採用にはtheme、typed slot/DOM保持、native keyboard代替、業務DTO/ackとlicense範囲を別に検証する。FullCalendarをインストールした実装ではない。 |
| Temporal `1.0.5` | 厳密なzone遷移帯の判定に `import {Temporal} from 'temporal-polyfill'` を採用。[公式entrypoint説明](https://raw.githubusercontent.com/fullcalendar/temporal-polyfill/main/polyfill/README.md)の局所・副作用なしimportを用い、native Temporalがあればその実装を使う。製品sourceでglobals/shim/private chunksをimportしない。[1.0.5 CHANGELOG](https://raw.githubusercontent.com/fullcalendar/temporal-polyfill/main/polyfill/CHANGELOG.md)のepoch `0n` 遷移の修正を確認した。移動draftのinstant確定はアプリへ残す。 |

固定 `package-lock.json` SHA-256は `ccfffbff59251d7429b58872f94c11746b72cce2cd624696d3de29e240448d7e`。実installed packageと原LICENSE、公開型、bundle import閉包を照合した依存は以下。[lock/installed/license証拠](verification/ui-library-tree-scheduler-contract/contract-evidence.json)は元auditとの一致も保持する。

| package | 版 | 原license | 役割 |
| --- | --- | --- | --- |
| `temporal-polyfill` | `1.0.5` | MIT | 公開Temporal runtime entrypoint |
| `temporal-utils` | `1.0.3` | MIT | runtime依存 |
| `temporal-spec` | `1.0.1` | Apache-2.0 | 公開TypeScript型 |

配布する利用アプリはこれらのlicense/noticeを元packageの条件に従って保持する。固定lockの `npm ci --ignore-scripts` はactual exit0・219 added/220 audited・当時のnpm DBでvulnerabilities0。これを将来の脆弱性、runtime安全性、全第三者license義務の包括承認には広げない。

## 正式試験と実測の境界

| 正式試験 | 対象 |
| --- | --- |
| [scheduler model](../tests/model/scheduler.test.ts) | instant、zone、civil navigation、resource/timeband、DST、move入力検証 |
| [Scheduler browser](../tests/ui/scheduler-catalog.spec.ts) | 全view/継続予定、native移動、失敗/再試行/stale/reset/destroy、投影CVA、band/zone、host Temporalと1.0.5強制fallback、320px/200%/RTL/axe |
| [focus transfer](../tests/ui/scheduler-focus-transfer.spec.ts) | close/completeと同じturnの外部・投影memo focus移動 |
| [ID boundaries](../tests/ui/scheduler-id-boundaries.spec.ts) | raw UTF-16、prefix/suffix境界、DOM一意性、native label/ARIA参照、移動要求raw IDs |
| [Foundation browser](../tests/ui/foundation.spec.ts) | provider/明示prop、zone診断、locale/RTL/CDK Dir、live profileとdraft保持 |
| [consumer AOT](../tests/generation/consumer.test.ts) | public barrelから生成部品を使うstrictTemplates/negative型検査 |

独立reviewの実測はTree/Scheduler/Locale合計42/42 native（Scheduler focus8、UTF-16 2、prefix/fold2、Locale6、Tree Escape16、旧不具合8）、モデル16＋locale/server DI5。94 supporting TSのscoped strict AOTはpositive exit0、typed contextのnegative4件は期待するTS2339/exit1。pageerror/console warning/errorは0。axe24 scansのviolationsは0、incompleteはaria-valid-attr-value16 nodes/color-contrast50 nodesを残す。正式試験ファイルの参照とこの独立reviewの実行scopeを区別し、全181部品/full139 AOT、実AT、Firefox/Safari、全component SSR/hydration、実保存/DST確定/Undoを検証済みとはしない。


## 表・グリッドの過去検証範囲

## 検証範囲

| 範囲 | 実行結果と限界 |
| --- | --- |
| 作者stage | 同raw12でChrome 154、guided/denseの27件ずつ、全54 distinct操作がactual0。runtime/console error0、baseとenabled Unicode sceneのaxe0。実Clipboard、CSV内容、print frame/呼出し、fixed footer start/end×LTR/RTL×2profileの8座標、native scroll、CDK1000行、320px/200%/RTL、draft/stale/focusを確認 |
| 作者モデル・consumer | pure22 actual0、TypeScript strict/full Angular AOTとpublic barrel AOT actual0。不正keyFieldの独立作者入口はTS2322×2でexpected exit1。GridCellとTableGridCellの両公開型を確認 |
| 正式追加分の移植 | 原52の本文・登録順序とmodel19を保持するAST/登録検査、追加2profileとモデル3で54/22を維持。fixtureのpublic proxy strictAOT、spec strictTS、モデルstrictTS、registration54、pure22を確認。proxyを正式CLI生成の証拠に数えない |
| 独立レビュー | 独立の正規CLI生成consumerでraw12/source依存/public index一致、strict publicAOT、pure33、negative4のexpected rejection、重点40＋辞書16操作の合計56がactual0。source12採用を承認。作者54やroot全体とは別のscope |
| 統合後 | rootが正式sync/check、型・build、generation consumer、旧DataTable回帰と全UIを行い、独立全体レビュー、PR、merge、要求matrixを確定する |

旧失敗は保存する。URIError、compound/groupとerror suffixのID衝突、prototype error/width/pasteの反例と修正後を分ける。projection fixtureのimplicit row誤り、native描画待ちや試験設定の失敗も製品成功へ置き換えない。追加2ケースを補強しており、従来52の本文・順序を新試験に翻案していない。

Safari/Firefox、実screenreader、OS IME、人の利用評価、backend/実Undo、保存先の永続性、実プリンター完了はこの候補stageでは未実行。既存sorting/paging/format/detail/action回帰、複数隣接fixed列、pointer lifecycle、TreeGrid wrapperの全lazy組合せなどは統合後のsuiteと独立レビューの証拠を参照する。未対応virtual組合せは上述の具体的な通常表復旧契約で示す。

## 基盤部品の過去の実装・検証記録

## 初版で対象外だった部品と拡張範囲

初版では検索付きcombobox、メニュー、日付選択等を対象外とした。拡張依頼により現在は全181要求行を実装対象としている。各部品の現契約はこの文書の拡張節、実装・検証済みと残件は`docs/ui-library-matrix.json`に記録する。ファイルアップロード、仮想化、専門部品等を、名称や単純な標準inputの配置だけで完成とは扱わない。

## 表示方針

検証アプリは申請の一覧と編集フォームを持つ作業画面。最初に現在の申請、保存操作、表示設定と入力欄を示す。主操作は保存、破壊的操作は対象と不可逆性の説明を添える。不要なHero、カードの入れ子、繰り返し説明は置かない。両プロファイルでOS標準フォント、意味別の色、44px以上の操作領域、見えるfocusを採用し、外部フォント・画像を読み込まない。入れ子のスコープは下部の表示比較例へ限定する。

## 今回の検証範囲

`tests/ui/`は既存の27操作シナリオをguided/denseの両方へ適用する。色・書体・文字サイズ・余白・角丸・checkbox寸法・表の余白はcomputed styleで確認する。プロファイル変更前後の同じ入力DOM、部分欠損・非表示領域・処理中の一回だけの実行・完了結果を確認し、入れ子の全必須意味トークンと実際の部品／utilityの見た目を比較する。

狭幅、文字サイズ100%／200%、キーボード、正常／エラー／部分欠損／結果不明／処理中、展開とdialog、reduced-motion、touch、自動axeの試験を両プロファイルで実行する。文字拡大試験では実際のfont-sizeが2倍になったことも確認する。実行結果は後続の検証記録に記載し、未実行を合格扱いしない。

## 検証記録（2026-10-05）

- 実行環境: Node 24.19.0、Angular 22.2.1、Tailwind CLI 4.3.0、Chromium。
- 生成: `npm run ui:sync -- --dry-run`で差分を表示し、`npm run ui:sync`で同期した。`npm run ui:check`で設定と生成物の一致を確認した。型検査とビルドも成功し、生成したAngularソースのAOTコンパイル／公式linkerとTailwind CSSの実生成を実行した。
- 全体検証: `npm ci`後に`npm test`を実行し、設定60件、生成14件、Chromiumの操作66件（計140件）がすべて成功した。skip／retryは0。操作66件は既存27シナリオの両プロファイル実行54件、切替・生成metadata・入れ子等の7件、追加roleのTailwind実生成・描画1件、ナビゲーションの配色・長いラベルの回帰4件。対象状態のaxe自動検査違反は0件。
- 独立検証で、hidden解除直後のTab操作がAngularの再表示より先に進む試験のraceを確認した。主担当も修正前の両プロファイルの失敗を再現し、Tabs／Disclosureの再表示をassertionで待ってからTabを送るよう修正した。`--workers=1 --repeat-each=3`で対象2件を各3回実行し、6件すべて成功した。固定時間のsleepやretryによる回避は使わない。
- 追加roleによるTailwindのutility名衝突を確認し、色・文字サイズ・書体・太さを用途別の名称へ統一した。修正前の描画試験の失敗を確認し、修正後は同じbody／controlの役割名を色と書体へ追加しても、両プロファイルの色・文字サイズ・書体・太さが独立して適用されることをTailwind CLIとChromiumで確認した。生成Skillの実装例も同じ名称へ揃えた。
- 外部ディレクトリの新規利用アプリからcheckoutのCLIを実行し、init／sync --dry-run／sync／checkとprofile metadata・Skillの生成を確認した。
- 表示: guided／denseの部品とutilityが同じroleから青／緑、本文18px／16px、余白、角丸を解決することをcomputed styleで確認した。checkboxの20px寸法、表の余白、全50必須roleを持つ入れ子、100%／200%の文字サイズ、320pxの横はみ出し、dialogの中央配置を測定した。
- 描画レビュー: Chromiumで両プロファイルの1280×1000／390×844の初期画面、保存失敗・部分欠損、modal dialogを撮影して確認した。主操作の色と寸法、本文と補助文の読み分け、狭幅での折返し、入力を残す障害表示、dialogの中央配置と操作名の表示を確認した。静止画の確認を実利用者による理解評価とは扱わない。
- 今回のP2回帰: 修正前のテンプレートで両プロファイルの4件が失敗することを確認した。修正後は白いaction／action-hoverとinkのon-actionを持つ設定が通り、nav／パンくずの通常・現在地・hover、surface／backgroundの実背景、選択タブの文字・下線が4.5:1以上となる。不適切なlink／tab-selectedの配色、必須参照の不足・型違い・参照切れは設定検証で拒否する。
- 長い移動先: 実Angular部品のnav／パンくずを両プロファイル、320px、100%／200%、日本語／連続英字で検証した。全文の各描画行がリンク・list itemの枠内に収まり、ページの横スクロールを生じさせない。nativeのTab／Enter、href、aria-current、hidden／再表示も確認した。Chromium 153.0.8010.12で320px・200%の両部品、白い主操作背景、独立したリンク・選択タブの色を撮影し、実描画を確認した。
- 未確認: Firefox／Safari、実スクリーンリーダー、SSR／hydration、多重modal、Angular forms／Routerとの統合、実サービスの通信と復元、利用者の理解・実業務での有効性。自動コンパイル・操作・axeの成功から、これらの成立は推測しない。


## トークン設計の開発元受入条件

1. 同じ部品がguided/denseの二プロファイルで主操作色、文字サイズ、余白、角丸を変え、ネイティブ要素の意味・フォーカス・状態を維持する。
2. YAMLの対応変更が生成CSS、Tailwindのユーティリティ、Angular部品、Skill、policyへ反映される。
3. 不正設定を拒否し、文脈だけの変更でトークン値を推測しない。
4. 生成の冪等性、dry-run、手編集/衝突/パス境界/未同期検出を実試験で確認する。
5. 実ブラウザーでプロファイル変更後も入力・取得状態・実行結果を保持し、入れ子のスコープも正しく解決する。
6. 両プロファイルで通常/処理中/エラー/部分欠損/復旧、狭い画面、文字拡大、キーボードと自動アクセシビリティを確認する。
7. 設定、生成、型検査、ビルド、操作試験を別々に報告し、未実施の実利用評価を合格扱いしない。
8. 明るい主操作背景の設定でもリンク・選択中タブの読みやすさを維持し、不適切な文字／背景の組合せは設定検証で拒否する。
9. ナビゲーションとパンくずの長い日本語／連続英字を、両プロファイルの320px幅・100%／200%文字サイズで全文表示し、ページの横はみ出しを生じさせない。
