# 初版のUI部品

五つの基盤部品群、ラジオグループ、ナビゲーション／パンくず、タブ、開閉領域、ダイアログ、表、ページ送りを、プロファイルと二段階トークンへ接続します。検証アプリはCLIが生成したAngularソースとCSSを使用します。設定・生成・型検査・ビルド・実操作・自動アクセシビリティは別々に検証します。

## 実装と受入条件

- Angular 22.2.1、TypeScript 6.0.3、Node 24.19.0を採用する。standalone、signal input/output、OnPush、通常のCSSとHTML標準要素を使う。新しいフォームライブラリや実行時APIは不要。
- `templates/angular/`は生成元。CLIで同期した`output/angular/index.ts`から各部品をimportする。共通CSSは生成した`tokens.css`、`tailwind.css`、`angular/styles.css`を読み込む。検証アプリは`.ui/generated/angular/index.ts`を使用する。
- 表示の意味、入力と業務状態の所有権は利用アプリに残す。部品はHTTP、実データ復元、業務判断を行わない。
- 操作テストで処理中の再操作抑止、buttonとlinkの意味、入力とエラーの関連付け、入力保持、選択、局所再試行、部分欠損、結果不明、実状態を戻すUndo、キーボード、狭い画面、動きの低減を確認する。
- 拡張部品ではナビゲーションの現在地、タブのキーボードと入力保持、開閉、モーダルのEscapeとフォーカス復帰、表の見出し・ソート表示・欠損表現、ページ送りの境界、ラジオ選択を確認する。
- 静的コンパイル、実操作、自動アクセシビリティ、表示レビューを分ける。利用者による理解や実業務の有効性は未確認。

## トークンとプロファイル

具体値はYAMLの`primitives`、役割との対応は`semantic`、利用者別の上書きは`profiles.<id>.semantic`に置く。必須roleと型は[設計](design.md)を参照。部品のCSSは`--ui-color-action`、`--ui-text-body`、`--ui-space-control-x`等の意味トークンを参照し、色・文字・余白・寸法・角丸・border・weight・line height・motionの具体値を持たない。`--ui-font-body`は書体であり、文字サイズは`--ui-text-body`。旧テーマ変数やdensityの互換層は持たない。

生成したTailwindテーマの`bg-action`、`text-on-action`、`px-control-x`、`py-control-y`、`font-body`、`text-body`、`rounded-control`も同じ意味トークンへ接続する。検証アプリの`styles.css`をTailwind CLIの入力にし、トークン、adapter、部品CSS、アプリCSSを読み込んで実際のutilityを生成する。

`:root`は既定プロファイル。`data-ui-profile="guided"`または`"dense"`を持つスコープでは全意味トークンを再定義する。検証アプリの初期値とlabel付きselect「表示設定」のID・labelは、同じYAMLから生成した`.ui/generated/profiles.ts`の`uiProfiles`を使う。設定例の既定はguided。選択で同じmain要素の属性を変更し、入力・選択・取得状態・処理中・実行結果をアプリのsignalと同じDOMへ保持する。生成メタデータにないIDはアプリ側で選択を受け付けない。

guidedは青の主操作、初期本文18px、広い余白、12pxの操作角丸。denseは緑の主操作、初期本文16px、狭い余白、4pxの操作角丸。文字サイズはremで定義し、root文字サイズの変更に追随する。検証アプリの入れ子ではdenseの内側へguided、guidedの内側へdenseを適用する。プロファイルのcontext/guidanceはAIが構成を判断する材料であり、runtimeの部品は対象利用者や画面構成を自動推定しない。

## 公開API

### PageFrame

`<ui-page-frame title="申請の編集">`。`headingLevel: 1 | 2`（既定1）。`[uiPageContext]` に判断材料、`[uiPageActions]` にページ操作、残りを本文として投影する。main要素はアプリが所有する。不要なサブタイトルは追加しない。

### ActionControl / ActionLink

`<button uiAction>`（ActionControl）と `<a uiAction href="…">`（ActionLink）。`variant: 'primary' | 'secondary' | 'danger'`（既定secondary）、`busy: boolean`、`disabled: boolean`。buttonのtype既定値はbuttonで、明示したsubmit/resetを保つ。busyの間は再操作を抑止し、aria-busyと見える処理中表示を持つ。投影されたラベルは残す。ActionLinkはhrefを受け取り、無効・処理中の間は実際の遷移と利用者のclick/auxclick処理を抑止し、タブ順から外す。hrefを復元すると既定tabindex=0で再び操作できる。busy/disabledの所有権は部品に接続するアプリ側。RouterLinkや独自キーボードハンドラーとの合成は未検証。

consumerのイベント処理より前に抑止するため、ActionControl/ActionLinkはRenderer2のcapture listenerを持ち、DestroyRefで解除する。DOMへのアクセスはこの操作ガードに限定する。サーバーレンダリング／hydrationは検証対象外。

ラベルは部品内の `.ui-action-label` に投影する。長い操作名や区切りのない文字列は折り返し、処理中表示は縮めない。ラベルを省略・切り詰めず、狭い画面や文字拡大時にも操作名と処理中表示を枠内に収める。

### FormField / FieldControl

`<ui-form-field controlId="name" label="申請名" [required]="true" hint="…" [error]="error()"><input uiFieldControl …></ui-form-field>`。FormFieldは一つのHTML標準input/select/textareaを扱い、FieldControlがid、required、aria-invalid、aria-describedbyを接続する。追加の説明IDは `describedBy`（空白区切り）に渡す。controlIdはアプリ内で一意、空白なしとする。labelは空にせず、input/select/textareaにuiFieldControlを付ける。値と入力イベントは標準HTML／Angular formsでアプリが所有する。checkbox/selectの選択状態も標準要素を使う。radioグループは後述RadioGroupを使う。複合コントロール、独自ControlValueAccessorは初版の範囲外。Angular formsとの接続は標準要素にformControl等を置ける構造で、初版試験はnative value/input/changeのみ。

FormFieldのhostへ `[hidden]="true"` を指定すると、チェックボックスのレイアウトを含めて非表示とし、入力はタブ順から外れる。入力のインスタンスは維持し、再表示時に値・選択状態を保持する。

### AsyncRegion

`<ui-async-region [state]="state()" [retryAvailable]="true" (retry)="reload()">…</ui-async-region>`。

`AsyncRegionState` は `{kind: 'ready'}` または `{kind: 'loading' | 'empty' | 'error' | 'refreshing' | 'partial' | 'stale'; message: string}`。loading/empty/errorでは本文をhiddenにし、ready/refreshing/partial/staleでは本文を残す。本文のインスタンスは作り直さず入力を維持する。partialは一部欠損、staleは既存結果を残した更新失敗。messageで欠損や影響を説明する。`retryAvailable`（既定false）、`retryBusy`（既定false）、`retryLabel`（既定「再試行」）、`retry` output。正常な独立領域をアプリが分ける。描画例外の隔離は保証しない。

### ActionFeedback

`<ui-action-feedback [state]="feedback()" recoveryLabel="元に戻す" (recover)="undo()" />`。

`ActionFeedbackState` は `{kind: 'idle'}` または `{kind: 'success' | 'error' | 'unknown' | 'warning'; message: string}`。結果不明を成功・失敗として表示しない。warningで不可逆操作の対象・影響を事前説明できる。`recoveryLabel` が空なら復旧操作を表示しない。`recoveryBusy`、`recoveryDisabled` は既定false、`recover` output。Undoは実際に復元できる場合だけアプリが接続する。障害のメッセージを自動で消さない。

AsyncRegionとActionFeedbackは、初期のready/idleでも空のlive regionを保持し、状態更新時にそのテキストを変更する。視覚表示は同じメッセージを表示する。支援技術による実際の読み上げは初版の自動試験だけでは確認できない。

### RadioGroup / RadioOption

`<ui-radio-group name="priority" label="優先度" [value]="priority()" (valueChange)="priority.set($event)" [required]="true" hint="…" [error]="error()">` 内で `<label class="ui-radio-option"><input uiRadioOption value="normal">通常</label>` を投影する。native fieldset/legendと同じnameのradioを使う。`name` はアプリ内で一意、空白なし、labelは空にしない。valueはstring|null、valueChangeはstring。disabledをグループまたは個別RadioOptionに指定できる。値と検証の所有者はアプリで、ネイティブの矢印キー選択を使う。

### Navigation / Breadcrumb / NavigationItem

`<nav uiNavigation label="主要画面">`、`<nav uiBreadcrumb>` にnative linkやol/liを置く。Navigationはlabel必須、Breadcrumbは既定label「パンくず」。`<a uiNavigationItem href="…" [currentPage]="true">` は現在地をaria-current="page"で示す。リンク先と現在のページはアプリが決定する。Angular Routerとの合成は未検証。

### Tabs / TabPanel

`<ui-tabs label="申請の情報" [selected]="panelId()" (selectedChange)="panelId.set($event)"><ui-tab-panel panelId="summary" label="概要">…</ui-tab-panel>…</ui-tabs>`。panelIdはアプリ内で一意。selectedが空の場合は先頭、指定する場合は存在するpanelIdを渡す。横方向の手動アクティベーションで、左右/Home/Endはフォーカス移動、Enter/Space/クリックは選択する。タブとパネルのARIAを接続し、非表示パネルをhiddenにして入力のインスタンスを保持する。縦タブは初版の範囲外。

### Disclosure

`<ui-disclosure title="詳細条件" [open]="expanded()" (openChange)="expanded.set($event)">…</ui-disclosure>`。native details/summaryを使う。title必須、openは既定false。開閉状態の所有者はアプリ。HTML標準のキーボード操作を維持する。

TabsとDisclosureのhostに `[hidden]="true"` を指定すると、表示とキーボードのタブ順から外れる。再表示しても入力値と選択・開閉状態を保持する。

### Dialog

`<dialog uiDialog label="申請の削除" [open]="dialogOpen()" (openChange)="dialogOpen.set($event)">…</dialog>`。native dialog上のcomponentでshowModal/closeを接続し、背景操作の抑止とフォーカス管理はブラウザーのmodal dialogを使用する。label必須。cancelled/closed outputでEscapeと閉じる動作を受け取る。アプリに閉じるボタンを置き、openをfalseへ更新する。SSR/hydration、多重モーダルは未検証。

### DataTable / TableContainer

`<ui-table-container label="申請の一覧表"><table uiTable caption="申請一覧"><thead>…</thead><tbody>…</tbody></table></ui-table-container>`。captionと領域labelは必須。thのscope、ソートのaria-sort、各行のキー、セルの意味、欠損を「未取得」と示す責任はアプリ。ソートや行選択を基盤が自動実装するとは扱わない。横スクロールは表の領域内に収め、キーボードからも領域へフォーカスできる。

### Pagination

`<ui-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" label="申請一覧のページ" />`。pageは1以上、totalPagesは0以上のsafe integer。totalPages>0ではpage<=totalPages、既知の0件ではpage=1を渡す。範囲外や不明な数値は『ページ情報を表示できません』と示して操作を抑止する。取得前の総頁数を0に置き換えず、AsyncRegion等で状態を分ける。disabledは既定false。前後操作と現在頁／総頁を示し、全頁分のボタンを大量生成しない。

## 今後必要に応じて追加する部品

検索付きcombobox、メニュー、ツールチップ、日付選択、ファイルアップロード、仮想化表、ドラッグ操作は今回のセットに含めない。単純な日付・ファイル入力はFormField内の標準inputで構成できるが、アップロード処理やブラウザー固有のpicker挙動は未検証。今回の整備を、すべてのアプリの部品が揃ったという一般保証にはしない。

## 表示方針

検証アプリは申請の一覧と編集フォームを持つ作業画面。最初に現在の申請、保存操作、表示設定と入力欄を示す。主操作は保存、破壊的操作は対象と不可逆性の説明を添える。不要なHero、カードの入れ子、繰り返し説明は置かない。両プロファイルでOS標準フォント、意味別の色、44px以上の操作領域、見えるfocusを採用し、外部フォント・画像を読み込まない。入れ子のスコープは下部の表示比較例へ限定する。

## 今回の検証範囲

`tests/ui/`は既存の27操作シナリオをguided/denseの両方へ適用する。色・書体・文字サイズ・余白・角丸・checkbox寸法・表の余白はcomputed styleで確認する。プロファイル変更前後の同じ入力DOM、部分欠損・非表示領域・処理中の一回だけの実行・完了結果を確認し、入れ子の全必須意味トークンと実際の部品／utilityの見た目を比較する。

狭幅、文字サイズ100%／200%、キーボード、正常／エラー／部分欠損／結果不明／処理中、展開とdialog、reduced-motion、touch、自動axeの試験を両プロファイルで実行する。文字拡大試験では実際のfont-sizeが2倍になったことも確認する。実行結果は後続の検証記録に記載し、未実行を合格扱いしない。

## 検証記録（2026-10-05）

- 実行環境: Node 24.19.0、Angular 22.2.1、Tailwind CLI 4.3.0、Chromium。
- 生成: `npm run ui:sync -- --dry-run`で差分を表示し、`npm run ui:sync`で同期した。`npm run ui:check`で設定と生成物の一致を確認した。型検査とビルドも成功し、生成したAngularソースのAOTコンパイル／公式linkerとTailwind CSSの実生成を実行した。
- 全体検証: `npm ci`後に`npm test`を実行し、設定45件、生成14件、Chromiumの操作61件がすべて成功した。skip／retryは0。操作61件は既存27シナリオの両プロファイル実行54件と、切替・生成metadata・入れ子等の7件。対象状態のaxe自動検査違反は0件。
- 表示: guided／denseの部品とutilityが同じroleから青／緑、本文18px／16px、余白、角丸を解決することをcomputed styleで確認した。checkboxの20px寸法、表の余白、全48必須roleを持つ入れ子、100%／200%の文字サイズ、320pxの横はみ出し、dialogの中央配置を測定した。
- 描画レビュー: Chromiumで両プロファイルの1280×1000／390×844の初期画面、保存失敗・部分欠損、modal dialogを撮影して確認した。主操作の色と寸法、本文と補助文の読み分け、狭幅での折返し、入力を残す障害表示、dialogの中央配置と操作名の表示を確認した。静止画の確認を実利用者による理解評価とは扱わない。
- 未確認: Firefox／Safari、実スクリーンリーダー、SSR／hydration、多重modal、Angular forms／Routerとの統合、実サービスの通信と復元、利用者の理解・実業務での有効性。自動コンパイル・操作・axeの成功から、これらの成立は推測しない。
