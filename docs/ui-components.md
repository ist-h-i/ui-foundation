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

生成したTailwindテーマの`bg-color-action`、`text-color-on-action`、`px-control-x`、`py-control-y`、`font-family-body`、`text-size-body`、`font-weight-body`、`rounded-control`も同じ意味トークンへ接続する。色／文字サイズ、書体／太さをutility名で区別する。検証アプリの`styles.css`をTailwind CLIの入力にし、トークン、adapter、部品CSS、アプリCSSを読み込んで実際のutilityを生成する。

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

リンク文字は`color.link`を使い、主操作背景の`color.action`と分離する。通常の透明背景ではsurface／background上へ配置し、hover／現在地の背景にはbackgroundを使用する。部品側でlist itemとリンクの幅を制御し、長い日本語・連続英字を折り返す。文言の短縮・省略やoverflowの隠蔽を利用側に要求しない。

### Tabs / TabPanel

`<ui-tabs label="申請の情報" [selected]="panelId()" (selectedChange)="panelId.set($event)"><ui-tab-panel panelId="summary" label="概要">…</ui-tab-panel>…</ui-tabs>`。panelIdはアプリ内で一意。selectedが空の場合は先頭、指定する場合は存在するpanelIdを渡す。横方向の手動アクティベーションで、左右/Home/Endはフォーカス移動、Enter/Space/クリックは選択する。タブとパネルのARIAを接続し、非表示パネルをhiddenにして入力のインスタンスを保持する。縦タブは初版の範囲外。

選択中タブの文字と下線は`color.tab-selected`、タブの背景はsurfaceを使う。文字／背景のコントラストを検証し、ボタンの背景色へ結び付けない。

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
- 全体検証: `npm ci`後に`npm test`を実行し、設定60件、生成14件、Chromiumの操作66件（計140件）がすべて成功した。skip／retryは0。操作66件は既存27シナリオの両プロファイル実行54件、切替・生成metadata・入れ子等の7件、追加roleのTailwind実生成・描画1件、ナビゲーションの配色・長いラベルの回帰4件。対象状態のaxe自動検査違反は0件。
- 独立検証で、hidden解除直後のTab操作がAngularの再表示より先に進む試験のraceを確認した。主担当も修正前の両プロファイルの失敗を再現し、Tabs／Disclosureの再表示をassertionで待ってからTabを送るよう修正した。`--workers=1 --repeat-each=3`で対象2件を各3回実行し、6件すべて成功した。固定時間のsleepやretryによる回避は使わない。
- 追加roleによるTailwindのutility名衝突を確認し、色・文字サイズ・書体・太さを用途別の名称へ統一した。修正前の描画試験の失敗を確認し、修正後は同じbody／controlの役割名を色と書体へ追加しても、両プロファイルの色・文字サイズ・書体・太さが独立して適用されることをTailwind CLIとChromiumで確認した。生成Skillの実装例も同じ名称へ揃えた。
- 外部ディレクトリの新規利用アプリからcheckoutのCLIを実行し、init／sync --dry-run／sync／checkとprofile metadata・Skillの生成を確認した。
- 表示: guided／denseの部品とutilityが同じroleから青／緑、本文18px／16px、余白、角丸を解決することをcomputed styleで確認した。checkboxの20px寸法、表の余白、全50必須roleを持つ入れ子、100%／200%の文字サイズ、320pxの横はみ出し、dialogの中央配置を測定した。
- 描画レビュー: Chromiumで両プロファイルの1280×1000／390×844の初期画面、保存失敗・部分欠損、modal dialogを撮影して確認した。主操作の色と寸法、本文と補助文の読み分け、狭幅での折返し、入力を残す障害表示、dialogの中央配置と操作名の表示を確認した。静止画の確認を実利用者による理解評価とは扱わない。
- 今回のP2回帰: 修正前のテンプレートで両プロファイルの4件が失敗することを確認した。修正後は白いaction／action-hoverとinkのon-actionを持つ設定が通り、nav／パンくずの通常・現在地・hover、surface／backgroundの実背景、選択タブの文字・下線が4.5:1以上となる。不適切なlink／tab-selectedの配色、必須参照の不足・型違い・参照切れは設定検証で拒否する。
- 長い移動先: 実Angular部品のnav／パンくずを両プロファイル、320px、100%／200%、日本語／連続英字で検証した。全文の各描画行がリンク・list itemの枠内に収まり、ページの横スクロールを生じさせない。nativeのTab／Enter、href、aria-current、hidden／再表示も確認した。Chromium 153.0.8010.12で320px・200%の両部品、白い主操作背景、独立したリンク・選択タブの色を撮影し、実描画を確認した。
- 未確認: Firefox／Safari、実スクリーンリーダー、SSR／hydration、多重modal、Angular forms／Routerとの統合、実サービスの通信と復元、利用者の理解・実業務での有効性。自動コンパイル・操作・axeの成功から、これらの成立は推測しない。

## 共通ライブラリの拡張

全依頼は[原文](ui-library-request.ja.md)と[要求マトリクス](ui-library-matrix.json)で追跡します。下記は実装したAPIの契約であり、全カタログの完了を意味しません。高度な表編集、集計・グループ、仮想化、出力、専門部品などの残件はマトリクスに保持します。

Angular入力部品を使うconsumerはアプリと同じ版の`@angular/forms`、Iconを使うconsumerは`@lucide/angular`を導入します。このrepoでは22.2.1／1.52.0を固定し、AOTで利用します。Lucideは[公式Angular adapter](https://lucide.dev/guide/angular)と[ISCライセンス](https://lucide.dev/license)を確認しました。追加のアカウントや有償serviceは使用しません。アイコンの依存ソースはAngular linkerを通し、実際に描画したSVGで検証します。

### DataTableView と Pagination

既存の`table[uiTable]`（native HTMLのDataTable adapter）に加えて、列とレコードを渡す`<ui-data-table>`（DataTableView）を提供します。`rows`、`columns`、`keyField`、`tableId`、`caption`は必須です。行キーは一意な文字列または有限の数値、列IDは一意な非空文字列とします。欠損、無効な数値／日付、0とfalseを区別します。欠損は両ソート方向で最後へ置きます。

`TableColumn<T>`は`id/field/header/type/format/sortable/filterable/options/width/minWidth/maxWidth/pinned`。`TableState`は`page/pageSize/search/sort/filters/columnOrder/hiddenColumns/columnWidths/pinnedColumns`を持ち、`createTableState()`で初期化します。状態は`state` inputと`stateChange` outputでアプリが保持し、永続化／復元へ接続します。部品はHTTPやlocalStorageへ書き込みません。

- `sortable/sortMode`はOFF／単一／複数ソート。昇順→降順→解除の順で循環します。
- `columnFilters/globalSearch/searchColumns`は列の文字・数値・日付・選択肢条件と対象列を指定した全体検索。`TableFilter`はAND/ORと複数条件を表現します。未入力の比較は条件として実行せず、選んだ演算子を保持します。現UIは各列の先頭条件を編集し、複数条件エディターは後続要求です。
- `pagination/pageSizeOptions`はページ操作と件数。clientの絞込みでページ数が減れば有効なページへ補正して状態を返します。`mode='server'`では供給された行へローカル検索／ソート／ページ分割をせず、状態を返します。totalItemsはアプリが供給します。
- `autoWidth/autoFit='content'|'available'`は内容／領域に合わせた幅。DOMで測った幅を上下限へ収め、収まり切らないときは表領域内でスクロールします。`resizableColumns`のスライダーはpointerとキーボードで操作できます。
- `stickyHeader/columnControls`は固定見出し、表示・順序・左右固定・幅・リセットの設定。左右固定はRTLにも論理方向で適用します。最後の一列はUIから隠せません。
- `selectionMode/selectedKeys/selectedKeysChange/rowSelectable/selectAllScope`はnative checkbox/radioで選択します。選択不可行を除外し、他ページの選択を保持します。serverの全選択対象は供給されたページです。
- `expandedKeys/expandedKeysChange/rowActions/rowAction`は詳細表示と操作。詳細は同じDOMをhiddenにし、そのページに留まる間の入力を保持します。アプリが別ページへ移した行の入力保持はアプリが所有します。
- `striped/borders/hover/rowSpacing/wrap/ellipsis`と`dataState/retryAvailable/retry`は表示と取得・更新・失敗・部分欠損。busyはqueryと選択を抑止し、前回の内容を残します。部分欠損で安全に実行できる業務操作はアプリが決めます。

セルは`<ng-template uiTableCell="amount" [uiTableTemplateOf]="rows" let-row let-value="value">`、詳細は`uiTableDetail`で差し替えます。`uiTableTemplateOf`はtemplate contextの型推論に使います。アプリはTableTemplateもimportします。

Paginationは既存の`page/totalPages/pageChange`に加え`totalItems/pageSize/pageSizeOptions/pageSizeChange/showFirstLast/busy/disabled/label`を受け取ります。既知の件数から総ページ数を計算し、先頭／前／次／末尾の境界と無効な設定を抑止します。件数変更に伴うサーバー取得やページ状態の保存はアプリの責任です。

### フォームと候補入力

TextInput、Textarea、NumberInput、PasswordInput、SearchInput、Checkbox、Switch、Select、MultiSelect、Comboboxはnative要素を使うControlValueAccessorです。`controlId/label`は必須、共通で`hint/error/required/disabled/busy/readonly/value/valueChange/name`を持ちます。`[formControl]`／`formControlName`または制御された`value/valueChange`を使い、同じ部品で二つの値の所有者を併用しません。`writeValue`でアプリへ値を返さず、disabled・readonly・busyでは編集を抑止します。表示エラーの文言と表示時機、送信時の最終検証はアプリが所有します。

- TextInput: placeholder、maxLength、autocomplete、clearable、showCount。文字数／maxlengthはnativeのUTF-16単位で扱います。
- Textarea: rows、autoResize、maxHeight、maxLength、showCount、placeholder。最大高さを超えた内容は内部でスクロールし、手動拡大も許可します。
- NumberInput: min/max/step/fractionDigits/grouping/locale/unit。編集はnative number、桁区切りと小数桁は補助表示へ適用します。CVA validatorは範囲・刻み・必須とbadInputを扱い、範囲変更時も再検証します。無効な数値ドラフトで古い値を有効扱いしません。
- PasswordInput: autocomplete、表示切替とアプリが渡すstrength。強度の安全性を部品が保証したとは扱いません。
- SearchInput: debounceMs、loading、suggestions/suggestionsQuery、`searchRequest:{query,requestId}`。入力値は即時更新し、待ち時間後は最新語を一度返します。Enter／検索ボタンは待機を取消して即時に返し、IME変換Enterは処理しません。native searchイベントとの衝突を避けた出力名です。
- Checkbox: boolとindeterminate。Switch: bool、busy、native role=switch。操作後の値とCVA touchedを接続します。
- Select: optionsのlabel/value/disabled/group、placeholder、clearable。標準select/optgroupを使います。
- MultiSelect／`ui-checkbox-group`: options、searchable、showSelectAll、maxSelected、選択済み表示と個別解除。検索で見えなくなった選択を保ち、無効／削除済みの選択も個別解除できます。group外へのfocusoutは`updateOn:'blur'`へ通知します。
- Combobox: options、freeInput、loading、placeholder、`queryChange:{query,requestId}`、optionsQuery／optionsRequestId。非同期のアプリは応答に両方の識別情報を付け、同じ検索語の古い応答も選択させません。非自由入力の編集で古い選択をnullへ戻し、未確定ドラフトはvalidatorでinvalid。外部resetは同値でもドラフトを初期化します。矢印/Home/End/Enter/Escape/Tabとaria-activedescendantを接続し、無効候補とIME Enterを避けます。候補の高度なtemplate差替え／top-layer overlayは後続契約です。

FormLayout（`[uiFormLayout]`）はcolumnsとdirection、InputGroupは前後の`uiInputBefore/uiInputAfter`とconnected、FormErrorSummaryはerrors（controlId/label/message）とvisible/titleを受け取り、native fieldへfocusを移してnavigateを返します。ラベル幅・配置とFormGroupの拡張、他の入力カテゴリはマトリクスで追跡します。

### Calendar と日付入力

日付は`YYYY-MM-DD`、月は`YYYY-MM`、年は文字列、時刻は`HH:mm[:ss]`。日付だけの値を地域時刻へ変換しません。CalendarとDatePickerはmin/max、disabledDates/dateDisabled、weekStartsOn（0～6）、localeを受け取ります。Calendarはvalue/CVA、today、initialMonth、displayMonth/monthChange、view=month/year、selectedDatesと`ng-template[uiCalendarDay]`を持ちます。日セルのcontextはdate（$implicit）/day/inMonth/selected/disabled。日セル内に別の操作要素を入れず、選択操作はCalendarに任せます。

Calendarの日付は一つのタブ停止を持つgrid。左右／上下、Home/End、PageUp/PageDown、Shift+PageUp/PageDownで日・週・月・年を移動します。選択不可日はfocusで確認でき、確定はできません。狭幅・文字拡大時は日付一覧の名前付き領域で横スクロールし、数字を分割しません。追加の日セル情報は`dayDescription(date)`でも伝え、日付ボタンの名前に含めます。DatePickerのnative dialogを開くと選択日へfocusを置き、Escapeまたは確定後に起動ボタンへ戻します。ネイティブdialogは同じプロファイル／RTLスコープ内に残します。

DatePicker/DateRangePickerの`inputFormat`を変更すると最後に確定した値を新しい書式で表示し、未確定の文字とそのエラーを解除します。期間入力は内部の両端のvalidatorを親フォームへ伝え、部分入力がある間は確定済みの期間を保持して親をinvalidにします。preset/clear/reset/カレンダー選択で修復できます。日時の刻みはmin（未指定時はcivil epoch）を起点に日付と時刻の両方で計算します。

DatePickerの`inputFormat`はnative、yyyy-MM-dd、yyyy/MM/dd、dd/MM/yyyy、MM/dd/yyyy。手動書式は明示して解析し、地域から曖昧な順序を推測しません。無効ドラフトは表示を残してvalidatorをinvalidにし、clear/resetで復旧できます。`format`は補助表示のlocale/iso。TimePickerはseconds/stepSeconds/hourFormat=12|24/timeAllowedを持ち、刻みと時間範囲を検証します。DateTimePickerはtimeZoneを明示し、native datetime-local文字列を保持します。Instantへの変換、DSTの重複／欠落時刻の業務上の扱いはアプリが所有し、部品は暗黙変換しません。MonthPicker/YearPickerはmin/maxとclearを持ちます。

DateRangePickerの値は`{start,end}`。min/max、maxDays（両端を含む）、disabledDates/dateDisabled、presets、months、weekStartsOn、locale、initialMonth、clearableを受け取ります。順序、期間上限、期間内部の選択不可日を検証し、入力を保持します。複数月の起点を連動し、開始／終了の選択先を明示します。Schedulerの資源・予定移動は別要求です。

### GridList と Icon

GridListはitems/keyField/labelField/controlId/labelと、`ng-template uiGridItem [uiGridItemOf]="items"`を受け取ります。contextはitem（$implicit）/index/selected。columns=nullは実際の領域幅と意味トークンsize.grid-itemで列数を計算し、columns/maxColumns/minimumItemWidth/itemSize/gap/breakpointsで配置を制御します。breakpointsは`{minWidth,columns}`の領域幅条件です。selectionMode、selectedKeys/selectedKeysChange、itemSelectable、showSelectAll、busy/disabled、emptyMessageを持ちます。選択はnative checkbox/radio。busyは部品の選択操作を抑止し、投影した業務操作はアプリが接続します。

Iconはname、size=small/medium/large、severity、decorative、label。装飾アイコンは支援技術から隠し、意味を持つものはlabelを必須とします。`provideUiIcons()`で業務の基本12種類を登録し、`provideUiIcons(LucideFileText, …)`で必要なアイコンだけ追加できます。同じDI階層で別のLucide providerを置くと登録が上書きされるため、追加も一つのproviderへ渡します。名前だけを登録して描画済み扱いにはせず、SVGの実パスを検証します。

### Cardと領域

`<ui-card cardId="record" title="申請内容" [collapsible]="true" [(collapsed)]="folded">`。`showHeader/showBody/showFooter/showMedia/showActions`はそれぞれの領域をhiddenで制御します。`orientation=vertical|horizontal`、`appearance=outlined|plain|raised`、`padding=none|compact|normal`、`title/subtitle/label`、`loading/loadingLabel`を持ちます。折り畳み・非表示・読込みで入力のインスタンスを維持し、操作中の領域が消えると展開操作またはarticleへfocusを移します。loadingは本文の業務操作を自動で無効にしません。アプリが取得状態の意味に合わせて操作を設定します。

`ui-card-header/body/footer/media/actions`の投影部品は`align=start|center|end`と`padding`を受け取ります。代わりに`<ng-template uiCardTemplate="header|body|footer|media|actions" let-context>`で各領域を差し替えられます。一領域に一テンプレート、contextはtitle/subtitle/collapsed/loading。同じ領域のテンプレートがある場合はそのテンプレートを使います。CardTemplateと投影部品をconsumerのimportsに含めます。

### MenuとOverlay

Menuは`ui-menu/ui-dropdown-menu/ui-context-menu`。`menuId/label`必須、`items`は一意のidを持つ再帰MenuItemで、type=item|checkbox|radio|group|separator、label/icon/disabled/visible/checked/radioGroup/value/childrenを受け取ります。選択は`selected:{item,path}`、チェック変更は`itemsChange`。`open/openChange`、`trigger=click|hover|context`、`placement`、`closeOnSelect`、`disabled`を制御します。radioは明示radioGroup、未指定時は同じ親のグループで排他的に選択します。存在しない/重複ID、循環、空ラベルは拒否します。

矢印、Home/End、Enter/Space、文字検索で操作し、RTLでは階層方向を反転します。無効項目はfocusで確認できますが実行しません。Escapeはfocusのある階層から一段ずつ戻り、親項目へ復帰します。TabはMenuを終了して隣の操作へ移動します。子階層の「親メニューに戻る」はtouchの代替操作です。contextは対象の右クリック、Shift+F10/ContextMenu、500ms長押し、常設の起動ボタンに対応します。context対象は`uiMenuContext`へ投影します。hoverは起動ボタンと内容の間を移動でき、外れた後の200msで終了します。

hover表示は編集中の入力からfocusを奪いません。triggerはメニュー全体の起動を設定し、子階層はクリック・矢印・Enter/Spaceで展開します。狭幅で子メニューが親を覆う場合も、クリック直前のhoverで別項目へ切り替えません。項目の削除・非表示更新では残る同階層の項目、親項目、起動ボタンの順にfocusを修復します。親Dialog終了やanchorのhidden/inert/破棄では内部popupを`scope-exit`で終了します。異なるOverlayHostの外側クリックも、一つのpointerイベントで最上位だけを終了します。

native popoverでトップレイヤーへ移しますが、DOMのプロファイルとRTLスコープを維持します。OverlayHostは任意のスコープでOverlayRegistryを提供し、各scopeを同じDocumentの最上位順で調停します。位置はanchor、visual viewport、RTL、外周余白に応じて反転/制限し、scroll/resizeへ追随します。native modalのinertnessとTabはブラウザーが担当します。MoveHandle/ResizeHandle（button[uiMoveHandle/uiResizeHandle]）はtarget、uiHandleDisabled、rectChangeを受け取り、pointer captureまたは矢印キー、Shiftで移動/リサイズします。

### Dialogの拡張と各種Dialog

Dialogは`dialog[uiDialog]`。`open/openChange/modal`、`showHeader/showFooter`、`closable/closeOnEscape/closeOnOutsideClick`、`size=small|normal|large|full`、`position=center|top|bottom|start|end`、`draggable/resizable/maximizable/busy`を受け取ります。元の投影内容だけで利用する場合、showHeaderの既定はfalse。ヘッダー・フッターは`uiDialogHeader/uiDialogFooter`または`ng-template[uiDialogTemplate]`のheader/body/footerで差し替えます。template contextはbusyとfinish(reason,value,returnValue)。ヘッダーの移動、最大化、閉じる操作と独立したサイズ操作を配置できます。

showHeader=falseでもdraggable/maximizableの操作を本文の前に配置します。表示中のmodal切替はnative close→show/showModalでトップレイヤーの状態を変更し、切替だけではcompletedを通知しません。

`finish(reason,value?,returnValue?)`は`closeRequested:DialogCloseRequest`を同期通知します。アプリの`preventDefault()`で終了を保留でき、未保存確認後にfinishを呼びます。busy中はユーザーの終了を抑止します。確定済み処理の後は`complete(value,returnValue)`でconfirm理由の終了を行い、UIのbusy抑止を越えて確定結果を返せますが、アプリのcloseRequestedによる保留は維持します。明示inputのopen=falseはprogrammatic終了です。`completed:{reason,value,returnValue}`、既存のcancelled/closedを通知し、呼出元へfocusを復帰します。終了理由はescape/outside/close-button/confirm/cancel/programmatic/native。アプリが直接native close()やmethod=dialogを使う場合はnative理由となり、finishの保留契約を通りません。

ConfirmDialogはlabel/message、confirmLabel/cancelLabel、busy、closeOnOutsideClick、open、closeRequested/completedで確認意図を返します。AlertDialogはrole=alertdialogで明示応答するまで保持し、Escapeと外側クリックで閉じません。いずれも通知した確認結果をHTTP更新の成功とは扱いません。

FormDialogはlabel、open、busy、dirty、valid、error、saveLabel、closeOnOutsideClickと投影入力を受け取ります。dirtyでの終了要求を保留し、「編集を続ける／変更を破棄して閉じる」を表示します。saveRequestedでアプリへ検証・保存を委ね、成功時にアプリがcompleteを呼びます。失敗はerrorで伝え、入力を保持します。アプリの追加closeRequestedによる保留も可能です。open=falseはアプリの明示指示なので、未保存確認を経る終了はfinishを使います。

DynamicDialogServiceはDynamicDialogHostを先に配置し、`open<T>({component,label,data,inputs,modal,...})`でAngular componentを実際に描画します。contentはUI_DYNAMIC_DIALOG_DATAとUI_DYNAMIC_DIALOG_REFをinjectでき、ref.finish(reason,value)またはEscape等で終了し、ref.resultがDialogResultを返します。updateInputsはcomponentを作り直さず入力を更新します。一scopeに一host、一つの動的Dialogを扱い、未接続や重複openはエラーにします。host破棄時もresultを解決します。

### Snackbar・Toast・通知ホスト

Snackbarは`ui-snackbar/ui-toast`。`open/openChange/message/severity/autoDismiss/durationSeconds/position/showCloseButton/actionLabel/pauseOnHover/pauseOnFocus`、action、dismissed=close|action|timeoutを受け取ります。ONの既定は5秒で、有限の正の秒数を必要とします。OFFは秒数を参照せず、0やNaNもタイマーへ使用しません。hoverとfocusが重なったpauseは両方を解除してから残り時間を再開します。action/closeは通知を終了し、操作中だったfocusを呼出元へ戻します。focusReturnで復帰先を明示できます。

NotificationService.notify(request)で通知をFIFOへ追加し、NotificationHostのmaxConcurrency、dedup=ignore|replace|allow、positionを設定します。queuedの通知は描画されるまでタイマーを開始しません。dedupKey、未指定時はmessage/severity/positionの組合せで同一とみなします。replaceは同じIDのrevisionを更新して表示時間を再開し、古いaction/timeoutの終了が新しい通知を消しません。dismiss(id)とclearで明示終了できます。位置はtop/bottomとstart/center/endの六種類で、start/endはRTLの論理方向です。

中央配置は入れ子の異なるdirにも対応します。画面より長い通知は表示領域内でスクロールでき、本文と操作へ到達できます。dismiss/clearは自scopeで操作中の通知からだけfocusを復帰し、別scopeの通知操作へ干渉しません。IDはNotificationServiceごとのローカル識別子です。

同時表示数を減らして待機へ戻した通知や位置の変更で描画し直した通知は、次の表示で設定時間から開始します。これらは全体の経過時間を保証するTTLではありません。同じNotificationServiceに一つのhostを置きます。modal内の操作付き通知はuiNotificationScopeまたは専用NotificationService providerと、そのDOM内のNotificationHostを使います。native modalの外の通知は背景として扱い、背景操作を許可しません。実際のUndo、バックエンド保存、通知本文の業務意味、重複キーの設計はアプリが所有します。

## 配置とコンテナ

`PageFrame`（`ui-page-frame` / `ui-app-shell`）はheader/sidebar/body/footer/actionsを投影し、各表示とheader/sidebar/footerのsticky表示を制御する。`uiPageHeader`・`uiPageContext`・`uiPageSidebar`・`uiPageFooter`・`uiPageActions`が投影先。非表示で子の入力を破棄しない。sidebarの標準幅は`size.sidebar`を使用し、狭幅では本文の前に積む。stickyは配置されたスクロール領域内で作用する。header/footerの実高さに追随してsidebarのoffsetと表示高さを計算し、文字拡大などで固定領域と操作1件分の空間を確保できないscroll領域の高さでは通常フローに戻す（documentの場合はviewport）。外部から領域を非表示にする場合は`focusFallback`を指定でき、指定が使えない場合は同じmodal内の外側操作へfocusを移す。

`Container`（`ui-container` / `ui-section`）はcontent/full/明示pxの最大幅、semanticのpadding、start/center/endの配置、surface/muted/transparent背景、heading/headingLevelを扱う。最大幅は利用領域内に収める。`Stack`（`ui-stack` / `ui-flex` / `ui-space`）はvertical/horizontal・gap・align・justify・wrapを扱う。gap/paddingはnone/compact/normal/wideで意味トークンを選び、nowrapを選んだ利用アプリは内容の収め方を決める。

`Grid`はcolumns/rows/gapとコンテナ幅別の`breakpoints`を持つ。幅の境界は含み、該当する最大のminWidthを使用する。`uiGridCell`はcolumn/row/columnSpan/rowSpanと幅別placementsを持ち、結合は現在の列数・明示行数に収める。入力をDOMに保持したままResizeObserverで配置を更新する。breakpointの重複、空/小数の列行数、負の幅・位置は拒否する。

`Panel`（`ui-panel` / `ui-fieldset`）はtitle、`uiPanelActions`、bordered、collapsible/collapsed/collapsedChange、disabledを持つ。本文のnative fieldsetとinert、操作領域のinertで無効状態を表し、collapseとdisableで投影した入力を保持する。`Accordion` / `AccordionItem`はsingle/multiple、initialExpandedまたはexpanded/expandedChange、itemId/title、開閉アイコン、disabledを持つ。入れ子のitemは直近のAccordionに属する。Enter/Spaceで開閉し、Up/Down/Home/Endは利用可能な見出しへ移動する。非表示前に本文focusを見出しへ戻す。regionは必要なitemだけ明示してlandmarkの増殖を避ける。

`Splitter`は`uiSplitPrimary`と本文の2領域を保持し、horizontal（左右）/vertical（上下）、initialRatioまたはratio/ratioChange、minRatio/maxRatio、step、height、resizable、disabled、collapsible/collapsed/collapsedChangeを扱う。比率はハンドルを除いた利用可能領域の百分率。min/maxは0〜100の有効区間で、collapse時はprimaryを0とする。ratioが0/100の領域はhiddenにしてfocusから除外し、内容を保持する。0%からの展開は直前の正の比率（未操作なら有効なinitialRatioまたは範囲の中間）へ戻す。pointer capture・cancel/destroyと操作中の方向変更を扱い、キーと縮小/拡大/開閉ボタンを代替操作にする。左右分割のLeft/RightはRTLの物理方向、上下分割のUp/Down、Home/Endは境界、Enterはcollapseと保持比率への復帰。折畳み中もratioを保持し、利用アプリからの明示ratio更新を優先する。

`Divider` / `Spacer`は方向、semanticの間隔、線種とラベル、growを扱う。`ScrollArea`は方向・高さ・position/positionChangeを持ち、nativeのキーボードスクロールと実scroll座標を使用する。`StickyRegion`（`ui-sticky-region` / `ui-affix`）の対象は直近のnativeスクロール領域で、edge/offset/enabledを制御する。任意の離れたDOMへportalを作らず、固定はその要素の通常位置がoffsetを越えた時点から作用する。

`AspectRatio`は正のratioとcontain/cover/fillを持ち、直接投影するnative img/video/iframeを収める。`ResponsiveVisibility`はviewportのminWidth/maxWidth（含む）の範囲で投影内容を保持して表示し、非表示前のfocusFallbackを受け取る。業務上必須の入力や操作を画面幅だけで消すかどうかは利用アプリが判断する。

配置パターンの参照: [APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)、[APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)。APGのWindow Splitterは例の整備・task forceレビューが継続中と記されており、ここでの対応は記載されたrole/value/keyboard契約と対象操作の実証を示す。
