# 操作の重要度と危険性を分離する段階的移行計画

対象: #65。調査基準: main `bd49e07fba0dc1eb2e0f724742f402b680cdd9b1`。本書は実装前の設計案・受入条件であり、API実装や互換性検証が完了したことを意味しない。

## 目的と責任境界

操作の強調度と、データ消失・権限変更等の操作の性質は独立して判断する。例えば一覧行の削除導線と最終確認の削除ボタンは、どちらも危険操作だが必要な強調度が異なる。色・枠・文字だけでは認可、対象照合、確認、取消、Undo、重複実行防止、実際の処理成功を保証できない。業務判断とI/Oは利用アプリが担い、既存のrequest/ack、focus、busy、disabled、結果不明・復旧契約を維持する。

## 現行契約・影響範囲

| 対象 | 現行の観測 | 対応 |
| --- | --- | --- |
| ActionControl、ActionLink | ActionVariantはprimary/secondary/danger、既定secondary。data-variantと共通CSSで表示。 | 共通の2軸解決処理を追加し旧型・既定値・属性・外観を維持。 |
| IconButton、ToggleButton | ActionControlを継承。 | 入力の継承、アクセシブル名、選択状態、アイコンのみの表示・クリック抑止を検証。 |
| SplitButton | 独自のvariant union、既定primary。主操作にvariantを伝搬。 | 既定primaryを維持し、新入力を主操作へ渡す。メニューの開閉は別の操作として扱う。 |
| ConfirmDialog、ConfirmPopover | 確定ボタンは固定primary。ConfirmPopoverは通常cancelへ初期focus。 | 確定操作のtoneを明示するAPIを追加する案（既定normal）。危険確定の初期focus、取消・閉鎖制御・既存契約を確認。 |
| FormDialog | 変更破棄にvariant=dangerを使用、保存はprimary。 | 新APIへ移行し、破棄ガードと復旧を維持。 |
| Toolbar、Menu、TableToolbar | 項目モデルに重要度・危険性の指定なし。Toolbarの実表示・幅測定・overflowは別経路。 | 必要なモデルへ任意属性を追加する案を精査。強調度は操作群に応じて表現し、危険性はoverflow後も意味とラベルを保持する。測定と実表示・roving focus・操作意図を維持。 |
| 公開エントリ・YAML・検査・文書 | core.ts/index.tsでActionVariantをexport。action/danger関連トークンと色対の検査あり。 | 新型を公開し、APIカタログ、Skill、日英資料、サンプル、必要な検査を同期。 |

参照: [action-control.ts](../templates/angular/action-control.ts)、[actions.ts](../templates/angular/actions.ts)、[styles.css](../templates/angular/styles.css)、[dialog-variants.ts](../templates/angular/dialog-variants.ts)、[floating-panel.ts](../templates/angular/floating-panel.ts)、[toolbar.ts](../templates/angular/toolbar.ts)、[menu-model.ts](../templates/angular/menu-model.ts)、[table-controls.ts](../templates/angular/table-controls.ts)、[roles.ts](../src/roles.ts)。

## 新API案

既存ActionVariantのunionを拡張せず、そのまま残す。利用側がRecord<ActionVariant, ...>や網羅的switchを使用しても型の追加対応を要求しない。新規コードでは独立した任意入力を使用する。

```ts
export type ActionEmphasis = 'primary' | 'secondary' | 'tertiary';
export type ActionTone = 'normal' | 'danger';
```

| emphasis | normal | danger |
| --- | --- | --- |
| primary | 操作色の塗りとon-action | 危険色の塗りとon-danger（旧danger相当） |
| secondary | 通常の枠と文字 | 危険性を示す枠と文字 |
| tertiary | 枠・塗りを抑えた操作ボタン | 枠・塗りを抑え、ラベル等で危険性を示す操作ボタン |

tertiaryでもネイティブbuttonの意味、keyboard/focus、最小操作領域を維持する。画面遷移はネイティブaを使う。危険操作は色だけで識別させず、ラベルと対象を明示する。toneは視覚・意味上の指定であり、リスクを自動判定する仕組みではない。

### 新旧入力の解決

新入力の未指定を許容し、旧variantから既定値を解決する。

| 旧指定 | 新指定 | 解決 |
| --- | --- | --- |
| 未指定（ActionControl/ActionLink） | なし | secondary / normal |
| 未指定（SplitButton） | なし | primary / normal |
| primary | なし | primary / normal |
| secondary | なし | secondary / normal |
| danger | なし | primary / danger |
| 未指定 | emphasis=tertiary, tone=danger | tertiary / danger |
| danger | emphasis=secondary | secondary / danger |
| primary | tone=danger | primary / danger |
| danger | tone=normal | 競合。dangerを維持し、移行時に誤指定を診断する。 |

明示されたemphasis/toneを優先する。ただし旧dangerと新normalが競合するときは危険性の表示を黙って弱めない。通常操作へ変更する場合は旧danger指定を除去する。旧APIのみの利用ではdata-variantを維持し、新しいdata-emphasis/data-toneで表示を解決する。旧CSSと新CSSの優先順位を検証し、旧指定の表示と操作を変えない。競合診断と無効値の方式は既存の検査・runtimeガードに合わせて詳細設計する。

```html
<!-- 旧コード：変更不要 -->
<button uiAction variant="danger" (click)="confirmDelete()">削除する</button>

<!-- 新規コード：一覧の補助的な削除導線 -->
<button uiAction emphasis="tertiary" tone="danger" (click)="openDeleteConfirmation()">削除する</button>

<!-- 新規コード：最終確認 -->
<button uiAction emphasis="primary" tone="danger" [busy]="deleting()" (click)="confirmDelete()">削除を実行</button>
```

実際の文言は利用アプリの翻訳契約に従い、確認と実行の処理は利用アプリが実装する。

## 移行工程・完了条件

### 0. 現行契約の固定

- ActionVariant、variant、data-variant、共通CSS、関連部品の既定値・公開API・試験を棚卸しする。利用アプリのラッパー、CSS上書き、動的variant、網羅型マップを調査する。
- 旧3variantの通常/hover/active/focus-visible/busy/disabled、クリック・キーボード動作を基準版で記録する。

### 1. 後方互換の追加実装（今回）

- 新型・任意入力・共通解決処理と6組み合わせのCSSを実装する。旧ActionVariantは変更しない。セマンティックトークンを使用する。danger文字をbackground等へ配置する際は実際の色対・状態を確認し必要な検査を追加する。新しい必須トークンを既存YAMLに突然要求しない。必要な役割には既定値・移行方法を定義する。
- 影響部品の採用範囲と具体APIを確定し必要な経路を実装する。Toolbarの実表示・幅測定・overflowで意味と動作を保持する。危険な主操作のtoneをメニュー開閉やキャンセルに一律伝搬しない。
- 新旧APIの型・表示・動作を検証し、生成APIカタログ、Skill、日英部品仕様・ガイド、実装例、移行説明を同期する。

### 2. 標準資産の移行・利用環境での確認（今回）

- 標準テンプレート・fixture・推奨実装例・Skillを新APIに更新する。互換テストと移行説明には旧指定を残す。syncによって利用アプリのコードやYAMLを自動書換えしない。
- 公開済み版から固定候補へ更新する独立consumerで、旧コード・旧設定を変えずsync/check/strict AOT/実操作が成立することを確認する。その後、旧dangerを新APIへ移行した場合の外観・操作と、旧版への復旧を確認する。
- 実利用先の依存版、Angular対応環境、ラッパーの有無を精査する。確認した[Ambitus](https://github.com/ist-h-i/ambitus/blob/main/package.json)のルート依存はui-foundation 0.1.0、Angular ^21.1.4。todo-generatorはルートpackage.jsonで直接依存を確認できず、clam-chowderの同パス取得は404だった。全利用先の状況は未確認。実利用先の変更は本PRの対象外。

### 3. 新規実装への誘導と既存利用先の任意移行

- 新規開発はemphasis/toneを推奨する。旧指定を移行ガイドと任意の案内に残す。既存アプリの通常checkを旧指定だけで失敗させない。
- 利用先は必要に応じて更新する。既存利用先の移行状況と互換維持負担を確認する。

### 4. 旧APIの廃止判断（今回の対象外）

廃止時期は固定しない。公開済み利用先の移行状況、第三者利用者への案内、新APIの安定性、既存のSemVer／公開契約、復旧可能性を確認する。必要性がある場合だけ別Issueと明示認可に基づき破壊的変更を行う。

## 受入試験

| 分類 | 最低限の確認 |
| --- | --- |
| 型・公開API | ActionVariantの旧union・網羅型マップ・旧binding、core/index export、SplitButtonの既定、新6組み合わせ・混在時の解決。 |
| 表示 | 旧3variantのcomputed styleと操作を基準版と比較。新6組み合わせの通常・hover・active・focus・disabled・busy、guided/dense、狭幅・拡大、RTL、forced-colors。 |
| 操作 | buttonのclick/Enter/Space、ActionLink、disabled/busy、Toggle、SplitButton、Toolbarのoverflow/計測、確認・取消・Escape・focus・要求結果を回帰確認。 |
| 安全・アクセシビリティ | 対象・影響・操作名の明示、色に依存しない識別、フォーカス、ラベル、最小操作領域、実際の色対比。認可・確認・重複防止・復旧をスタイルに委ねない。 |
| 配布・復旧 | 旧版→固定候補の更新を旧YAML・旧コード無修正でsync/check/AOT/操作確認。新API利用、再同期、旧版復旧、生成物・APIカタログ・日英資料・Skillの一致。 |

既存のtests/ui/actions-catalog.spec.ts、tests/ui/floating-catalog.spec.ts、tests/ui/consumer-dialog-retry.spec.ts、tests/model、tests/generation、tests/packageを起点に試験を補う。実行結果と未実施を区別し、GitHub Actionsを必須の完了条件にしない。

## 復旧・公開境界

旧パッケージ、lockfile、YAML、生成物、Skill、アプリコードを一組の復旧点とする。新API利用後の旧版復旧ではアプリコードも復旧する。互換性回帰が見つかったら候補を修正して再検証する。公開済み版の上書き、npm公開、dist-tag変更、他リポジトリへの変更は別途認可する。新API名、詳細実装、全影響先、互換性検証は未確定・未実施。
