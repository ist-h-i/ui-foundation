# AI向けUI設計規範の精査（第1段階）

対象: #65。調査基準: main `bd49e07fba0dc1eb2e0f724742f402b680cdd9b1`。DADSの参照日は2026-11-28、表示版はβ版 v2.18.3。

## 結論と適用範囲

現行Skillは実装方法・失敗時の挙動・検証方法について具体的な規範を持つ。一方、画面の目的から情報の優先順位、操作の確定時点、選択肢の性質に応じて部品と配置を決める基準は、既存規範ほど詳細には書かれていない。DADSの使い分けを参考に、業務アプリにも成立する判断基準を補う。DADSの配色・寸法・部品を移植することは目的としない。

人間向けの「UI/UX設計の8つの観点」は判断の背景や価値を説明する記事として扱い、本件では変更しない。AI向けには、観測できる条件と採用・回避・例外・確認方法を記述する。記事との逐条照合は未実施。

本PRは調査記録、採否の暫定案、英語規範案、比較評価計画をレビュー対象とする。配布Skillの変更、生成物の同期、動作確認、効果測定はまだ行っていない。

## 既存資産と責務

| 資産（基準コミット） | 確認した規範・役割 | 本件の扱い |
| --- | --- | --- |
| [SKILL.md](../skills/ui-development/SKILL.md) | 目的・必要情報・操作・復旧経路・利用環境の確認、profile選択、セマンティックトークン、公開API、翻訳、失敗・部分欠損、検証 | 維持。設計段階で読む参照先を短く追加する候補 |
| [token-design.md](../skills/ui-development/references/token-design.md) | action/link/tab-selectedの意味の区別、コントラスト、長いラベル、密度、算出スタイルの検証 | 視覚階層と余白・境界の選択基準のみ補う |
| [component-checks.md](../skills/ui-development/references/component-checks.md) | 狭い画面、フォーカス、入力保持、ネイティブ操作、重複実行、IME、再試行など | 既存の検証規範を再利用し、重複記載しない |
| [ui-library-runtime.md](../skills/ui-development/references/ui-library-runtime.md) | CVA、scope、安定ID、遅延取得、テーブル編集、メディア・workerの契約 | 部品の選択基準から参照し、API契約を変更しない |
| [i18n-check.md](../skills/ui-development/references/i18n-check.md) | 翻訳の所有・メッセージID・検証 | 維持 |
| [design.en.md](design.en.md) / [components.en.md](components.en.md) | YAMLの二段階トークン、profile、部品のカタログと公開API | 利用方法・仕様の正本。AI規範から参照する |
| [src/sync.ts](../src/sync.ts) / [src/skill-docs.ts](../src/skill-docs.ts) | Skillの参照文書の収集・生成、参照リンク、ハッシュによる一致の管理 | 既存経路で同期・配布を確認する |
| [src/check](../src/check) / [tests/generation](../tests/generation) / [tests/package](../tests/package) | 静的検査、生成・パッケージ検証 | 文脈に依存する判断を静的検査の必須条件にしない |

確認したAngular実装は actions、choice-controls、selection-input、radio-group、form-field、card、dialog、tabs、disclosure、feedback、async-region、data-table、toolbar。主に公開クラス・入出力・型の確認であり、全実装の動作や全テストの網羅的な精査ではない。既存のサンプルprofile（guided/dense）は具体値とガイダンスの例であり、画面の構造を自動的に決めるモードではない。

## DADSとの差分と採否案

優先度 P0 は誤操作・意味の不一致・情報欠落を直接防ぐもの、P1 は情報探索・比較・理解の効率に寄与するもの。採用案は規範を補う候補であり、既存部品の変更を要求しない。各行の確認条件は比較評価にも使用する。

| 優先度・観点 | 参照元・既存資産 | 採否案と具体的な判断基準 | 避けること・例外 | 確認 |
| --- | --- | --- | --- | --- |
| P1 情報階層 | [DADS 基本デザイン](https://design.digital.go.jp/dads/foundations/)、[typography](https://design.digital.go.jp/dads/foundations/typography/); token-design | 修正採用。画面名、判断に必要な情報、次の操作、補足の順に重要度を決め、見出し・文字・位置・余白で区別 | 全文太字、色だけで階層化。高密度画面では優先度を変えず情報量を増やせる | 最重要の情報と操作を、色を使わなくても特定できる |
| P1 近接・整列・余白 | [DADS spacing](https://design.digital.go.jp/dads/foundations/spacing/); YAML、token-design | 修正採用。同じ判断対象の情報は近づけ、異なるセクションとの間隔を広げる。繰り返し要素の整列と意味に対応するトークンを使う | 固定pxの移植、無意味な均等余白。行単位の比較が中心なら表の整列を優先 | 狭幅と長文でも所属関係を誤認しない |
| P1 表面・枠・影・角 | [DADS 基本デザイン](https://design.digital.go.jp/dads/foundations/); Card.appearance、radius | 修正採用。まとまりは見出し・余白から検討し、独立対象や境界が必要な場合のみ枠・surfaceを選ぶ。影は重なりなど意味がある場合 | 全要素のカード化、入れ子の枠、角丸の固定値。独立した項目の比較や状態の区別に必要ならカード可 | 枠を減らしても所属・操作対象が分かるか |
| P0 主操作・副操作 | [DADS button](https://design.digital.go.jp/dads/components/button/); actions | 修正採用。通常は同じ作業単位で主操作を一つにし、補助・取消・破壊的操作を区別。複数領域に独立した作業があるときは各領域に主操作を置ける | ページ全体に強制的に主操作を一つにする、色だけで重要度を区別 | 操作結果と対象がラベル・配置から識別できる |
| P0 無効化 | [DADS button](https://design.digital.go.jp/dads/components/button/)、[checkbox](https://design.digital.go.jp/dads/components/checkbox/); component-checks | 修正採用。押せない理由と解消方法を近くに示す。入力不備は訂正可能なエラーを提示し、必要に応じ実行を阻止する | disabled全面禁止。権限不足、進行中、危険な重複実行を許さない | キーボードでも理由・次の行動が分かり、不正な処理が実行されない |
| P0 二値選択・確定時点 | [DADS checkbox](https://design.digital.go.jp/dads/components/checkbox/)、[switch](https://design.digital.go.jp/dads/components/switch/); selection-input | 採用。保存・送信で確定する二値入力や同意はCheckbox、独立した即時適用のオン・オフはSwitch。非同期即時適用は進行と確定・失敗を識別可能にする | Switchの表示だけで永続化成功を示すこと。安全上の確認を要する操作には確認経路を残す | 保存前後・失敗後・再取得後の値が正しい |
| P0 単一/複数選択 | [DADS components](https://design.digital.go.jp/dads/components/); RadioGroup、Select、MultiSelect、Combobox | 採用。少数で比較が重要な単一選択はRadioGroup。選択肢が多く検索不要ならSelect、検索や遅延取得が必要ならCombobox。複数はCheckbox/MultiSelect | 選択件数・検索の必要性を無視した一律部品化。利用目的と利用環境で判断 | 選択可能件数、選択済み項目、検索結果0件が識別可能 |
| P1 入力・補足 | [DADS components](https://design.digital.go.jp/dads/components/); FormField | 採用。入力の意味は常時見えるラベル、形式・制約は入力前に分かる補足、エラーは修正対象に接続 | placeholderのみのラベル、全項目への長文補足。説明不要なら追加しない | 入力値が入っても意味と訂正箇所が分かる |
| P1 タブ・ナビゲーション・開閉 | [DADS components](https://design.digital.go.jp/dads/components/); Tabs、Disclosure | 修正採用。同一対象内で相互排他的な表示切替はタブ、別のページ・対象へ移るならナビゲーション、任意補足はDisclosure | 必須情報やエラーを閉じた領域にしか置かない。タブの再読み込みで入力を消さない | 現在位置・戻る操作・入力保持を確認 |
| P0 手順化 | [DADS components](https://design.digital.go.jp/dads/components/); SKILL | 修正採用。順序に依存する作業を段階化し、現在・完了・残りを区別する。独立した短い入力には不要な手順を設けない | 手順ナビゲーションをページリンクや単なる表示切替として使用。後戻りを不必要に禁止 | 戻る・途中再開の可否と保存状態を確認 |
| P1 一覧・比較 | [DADS components](https://design.digital.go.jp/dads/components/); DataTable、Card、Toolbar | 採用。同じ属性を行間比較するなら表、個別対象の概要や異質な情報の探索ならカード。検索、絞り込み、選択対象、一括操作の関係を明示 | 全件カード化で横比較を阻害、見えていない対象まで暗黙に一括操作 | 選択件数・フィルター条件・対象範囲が判断できる |
| P0 ダイアログ | [DADS components](https://design.digital.go.jp/dads/components/); Dialog | 修正採用。元の操作を中断して確認する必要がある場合に限りモーダルを検討。補足はインライン、軽い切替は既存の表示領域を優先 | 日常的な操作の過剰な確認、取消や復旧不能。不可逆処理には対象・影響を示す | 取消、復帰、フォーカス、エラー後の再試行 |
| P0 通知・エラー | [DADS notification-banner](https://design.digital.go.jp/dads/components/notification-banner/); Alert、ResultState、component-checks | 修正採用。重要・未解決・操作を要する問題は持続表示、入力エラーは近接表示、全体に影響する場合は範囲を示す。短時間の非重要な結果には既存の通知を許容 | 失敗や確認事項を消える通知だけで伝える。DADSの動的通知抑制を既存通知の全面禁止にしない | 消失後も必要な状態・対処・対象が分かる |
| P0 非同期・部分障害 | [DADS components](https://design.digital.go.jp/dads/components/); AsyncRegion、ui-library-runtime | 既存維持＋選択規範。操作対象の領域だけをpendingにし、成功・空・失敗・部分欠損・結果不明を区別 | 全画面を一律に停止する、未知を成功や0件と表示 | 他領域の利用、入力保持、再試行、結果照会 |
| P0 アクセシビリティ | DADS各部品; component-checks、token-design | 既存維持。ネイティブ操作、ラベル、キーボード、焦点、コントラスト、拡大・狭幅で検証 | 既存のアクセシビリティ規範を密度や見た目のために緩める | 既存テストと実ブラウザー確認を再利用 |
| P1 固定寸法・外観 | [DADS 基本デザイン](https://design.digital.go.jp/dads/foundations/); YAML、profiles | 不採用。DADSの視覚値・コンポーネントの外観を必須化しない。役割と値を分け、既存のprofileを活用する | DADSと同じ見た目を合格条件にすること | トークン契約と既存スタイルが維持される |

DADSの各部品の「使い方」「アクセシビリティ」全ページ、全ケースの詳細照合は未完了。上記の採用候補は確認した概要・基礎規範からの暫定判断である。実装前に未照合の条件や例外、既存の部品テストとの重複を確認し、表を更新する。DADSの文章や画像をそのまま転載せず、判断基準をui-foundationの契約に合わせて記述する。

## 実装案

- [英語規範案](verification/ai-ui-design-guidance/skill-candidate.md) を精査し、既存token-designへの短い追記と、画面構成・選択基準を扱う on-demand reference に分ける。部品別の詳細操作仕様は既存文書へ委譲する。常に全規範を読み込ませない。
- SKILL.mdの設計段階に、ページ構成や部品選定を行うときだけ参照文書を読む条件を加える。既存API・YAML・トークン・静的ルールの変更は原則不要。
- 配布と生成は既存の同期処理を用いる。新規参照が導入先でも解決できることを検証する。生成物を直接編集せず `npm run ui:sync`、`npm run ui:check`、生成・package試験を実行する。現行テストの英語参照閉包・同梱・同期契約の検査対象に必要に応じ追加する。
- 規範の形だけを検査する新規静的ルールは作らない。業務上の確定時点、目的、情報の優先度をコードだけで一般的に判定できないため、比較課題とレビューで検証する。

## 比較評価（実施前に固定する案）

同じ課題・初期リポジトリ・モデル・推論設定・時間/トークン予算・ツール権限を使い、現行Skill A と候補Skill B の差だけを変更する。課題ごとに独立3試行ずつ（計18生成）を初期計画とする。試行順は交互または無作為にし、前の答案を共有しない。モデル識別子、基準コミット、Skillの差分・SHA、入力、実行ログを保存する。評価者はA/Bを隠した成果物を比較する。

| 課題 | 提供する要件・データ | 確認条件 |
| --- | --- | --- |
| U65-01 申請フォーム | 必須・任意入力、単一選択、複数選択、後続送信で確定する同意、即時の表示設定、送信失敗 | ラベルと制約、選択部品と確定時点、主操作、入力保持、エラーと再試行、キーボード |
| U65-02 高密度業務一覧 | 複数列の行比較、検索・絞り込み、複数選択・一括更新、権限不足、狭幅、長い値 | 行間比較、対象範囲・件数、操作階層、長い値、空と失敗の区別、権限・取消 |
| U65-03 部分障害ダッシュボード | 独立領域、正常/空/遅延/失敗/結果不明、非重要な操作通知と重要な障害、再取得 | 未取得を0にしない、正常領域の継続利用、持続的な問題表示、局所的な再試行、確認済み結果の識別 |

各条件は、欠落または誤り=0、部分的に満たす=1、画面・操作・テストの証拠で満たす=2、適用外は事前に定義する。課題ごとに同じ条件をA/Bへ適用し、差分と証拠を記録する。重大な欠陥（誤った対象への確定、入力消失、権限逸脱、失敗を成功と表示、既存キーボード操作の破壊）は点数で相殺しない。必須のビルド・既存規範の回帰確認を通過した比較だけを採用判断に使う。失敗試行は除外せず件数と理由を記録する。

初期の採用条件案: 3課題中2課題以上でBの試行中央値がAを上回り、残りで悪化しないこと。新規の重大欠陥がないこと、既存規範・公開契約・生成一致を維持すること。時間・トークン・追加依存・Skill読込量の増加も比較し、改善した条件に対して負担が妥当か判断する。閾値の後付け変更は禁止。差が出ない場合は、効果のない規範を削るか課題の識別力を確認して再検証する。少数試行で一般的な改善効果を断定しない。

証拠: 各試行のコミットまたはパッチ、画面キャプチャ（通常幅・狭幅・拡大）、ビルド/型検査/既存チェック、操作結果、条件別採点と根拠、トークン・時間。全試行の欠損も記録する。

## 残作業

調査の追加（DADS詳細仕様、全関連テスト、記事との重複）→採否の更新→英語規範を適切な正本へ反映→生成・配布確認→比較評価→不要な規範の削減→レビュー。現在の環境ではGitHubへの直接checkoutとnpm取得がDNSエラーとなり、生成・試験・比較評価を実施できていない。PRの記載は評価結果ではなく評価計画であり、#65の受入条件を満たしたとは扱わない。
