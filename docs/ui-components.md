# 初版のUI部品

今回の範囲は五つの基盤部品群、ラジオグループ、ナビゲーション／パンくず、タブ、開閉領域、ダイアログ、表、ページ送りと共通CSS、Angular検証アプリ、実ブラウザー試験です。設定解析、生成CLI、Skill生成、逸脱の静的検査は次の段階に残します。テンプレートのTypeScriptを直接コンパイルして使うため、未実装の生成経路を経由した成功とは扱いません。

## 実装と受入条件

- Angular 22.2.1、TypeScript 6.0.3、Node 24.19.0を採用する。standalone、signal input/output、OnPush、通常のCSSとHTML標準要素を使う。新しいフォームライブラリや実行時APIは不要。
- `templates/angular/index.ts` から各部品をimportする。共通CSSは `templates/angular/styles.css`。将来の生成元とし、現在は利用アプリへこのディレクトリをコピーして使用する。
- 表示の意味、入力と業務状態の所有権は利用アプリに残す。部品はHTTP、実データ復元、業務判断を行わない。
- 操作テストで処理中の再操作抑止、buttonとlinkの意味、入力とエラーの関連付け、入力保持、選択、局所再試行、部分欠損、結果不明、実状態を戻すUndo、キーボード、狭い画面、動きの低減を確認する。
- 拡張部品ではナビゲーションの現在地、タブのキーボードと入力保持、開閉、モーダルのEscapeとフォーカス復帰、表の見出し・ソート表示・欠損表現、ページ送りの境界、ラジオ選択を確認する。
- 静的コンパイル、実操作、自動アクセシビリティ、表示レビューを分ける。利用者による理解や実業務の有効性は未確認。

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

検証アプリは申請の一覧と編集フォームを持つ作業画面。最初に現在の申請、入力欄、保存操作を示す。主操作は保存、破壊的操作は対象と不可逆性の説明を添える。不要なHero、カードの入れ子、繰り返し説明は置かない。OS標準フォント、落ち着いた明るい背景、意味別の色、44px以上の操作領域、見えるfocus、CSS変数による余白と文字を採用する。外部フォント・画像を読み込まない。

## 検証記録（2026-10-04）

- `npm ci`: lockfileから依存を導入。Node 24.19.0。npm auditで検出された脆弱性は0件。esbuildの未承認install scriptに関するnpmの注意表示はあるが、ビルドと実行は成立。
- `npm test`: AngularのstrictTemplates検査と、実アプリのAOTコンパイル／公式linker／Chromium操作試験が成功。25試験、retry 0。
- 実操作: 保存中の再実行抑止、エラーと入力保持、独立領域の利用、部分欠損／更新失敗、局所再試行、実ローカルデータUndo、結果不明の確認、input/select/textarea/checkbox/radio、リンク、タブと入れ子、開閉、modal dialog、表の意味・ソート、ページ境界。
- 自動アクセシビリティ: 初期、エラー、部分欠損、結果不明、開閉後、modal dialogの対象状態でaxe違反0件。キーボード、タッチ、320px、動きの低減を操作試験で確認。
- 描画: PC 1280×900、スマートフォン幅390×844、モーダルのスクリーンショットを確認。スマートフォン幅のページ全体の横はみ出しなし。
- DialogのTabはブラウザーUIへフォーカスを移すことがある。実際の背景入力がinertでフォーカスを受け取らないこと、Shift+Tabでdialogへ戻ること、Escape・閉じる操作で呼出元へ戻ることを試験する。
- 独立レビューでTabs／Disclosureのhostのhidden指定がCSSで上書きされる問題を確認。修正前に回帰試験が失敗することと、修正後に非表示・タブ順除外・再表示時の入力保持が成立することを確認。
- 未確認: Firefox／Safari、実スクリーンリーダーの読み上げ、SSR/hydration、多重modal、Angular forms／Routerの統合、実サービスの通信と復元、利用者の理解・実業務での有効性。静的コンパイル・自動検査・画面描画だけでこれらの成立を主張しない。

## レビュー指摘の修正と検証（2026-10-05）

- 対象: PR #1の `ec2699472485a9d9a59cb13cde967b2d346fa8fc`。チェックボックスを含むFormFieldのhidden指定と、狭幅での長い操作名／処理中表示を修正。
- 修正前: `npm run test:ui -- tests/ui/layout-regressions.spec.ts` は2試験が失敗。hidden属性付きの確認欄が表示・Tab順・直接focusに残ること、操作名と処理中の文字領域がボタン枠から出ることをAngularの実アプリで再現。
- 修正後: `npm test` 成功。strictTemplates、AOTコンパイル／公式linker、Chromiumの27試験、retry 0。既存のaxe対象状態でも違反0件。
- 確認欄: Spaceで変更したchecked値とDOMを非表示中も保持し、Tab順と直接focusから外れる。再表示後に値を保持し、Spaceで再操作できる。
- 長い操作名: buttonとa、日本語と区切りのないASCII文字列、通常／処理中、320px幅と100%／200%文字サイズを確認。各text nodeの `Range.getClientRects()` と処理中要素の矩形が、操作部品の内容領域内に収まることを測定。ページ全体の横スクロール検査だけに依存しない。操作名は省略せず、処理中の操作抑止と通常状態への復帰も確認。
