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

`<nav uiNavigation label="主要画面">`へnative ul/li/linkを投影する。`direction='horizontal'|'vertical'`、`narrow='wrap'|'scroll'`で方向と狭幅時の配置を指定する。アイコンもリンク内へ投影できる。Navigationはlabel必須、Breadcrumbは既定label「パンくず」。`<a uiNavigationItem href="…" [currentPage]="true">` は現在地をaria-current="page"で示す。リンク先と現在のページはアプリが決定する。Angular Routerとの合成は未検証。

Breadcrumbは従来のnative ol/li投影、または`items: readonly BreadcrumbItem[]`を選ぶ。項目は一意なid/labelと任意のhref/current、currentは最大1件、省略時は最後。`separator`は装飾、`maxItems`は3以上の整数で折畳み操作を含む表示件数、`expanded/expandedChange`で中間階層を開閉する。折畳みはリンクを破棄せずnative detailsへ入れ、全階層へ到達できる。hrefなしの現在地はspan。実行可能なjavascript/data/vbscript URLと空URLを拒否する。

リンク文字は`color.link`を使い、主操作背景の`color.action`と分離する。通常の透明背景ではsurface／background上へ配置し、hover／現在地の背景にはbackgroundを使用する。部品側でlist itemとリンクの幅を制御し、長い日本語・連続英字を折り返す。文言の短縮・省略やoverflowの隠蔽を利用側に要求しない。

### Tabs / TabPanel

`<ui-tabs label="申請の情報" [selected]="panelId()" (selectedChange)="panelId.set($event)"><ui-tab-panel panelId="summary" label="概要">…</ui-tab-panel>…</ui-tabs>`。panelIdはアプリ内で一意で、空白や自動生成tab IDとの衝突を拒否する。selectedは空なら最初の有効panel、指定する場合は存在するpanelId。個別disabledを飛ばし、指定panelがdisabledなら最初の有効panelを表示する。選択値自体の更新はアプリが行う。

`orientation='horizontal'|'vertical'`（既定horizontal）、`scrollable`（既定false）はtablist内の局所scroll。横方向のscrollでは長いtabラベルも一行で保ち、行高を他tabへ波及させない。手動アクティベーションで横は左右（RTL反転）、縦は上下、Home/Endはfocusだけ、Enter/Space/クリックは選択。Tabは表示panelへ移る。パネルはhiddenで入力のインスタンスを保持し、入れ子のTabsは所有するTabPanelだけを扱う。

TabPanelの`closable`（既定false）とTabsの`closeRequested: string`はDeleteまたは選択中の閉じる操作でidを返す。アプリが未保存判断を行い、panelデータとselectedを同時に更新する。`reorderable/orderChange`はAlt＋方向キーまたは前後の操作で新しいid順を返し、アプリは`@for(...;track panelId)`で実データを並べ替える。ライブラリは入力を再生成しない。`allowEmpty`（既定false）、`focusFallback: HTMLElement|null`は最後のpanel除去と退避先の明示に使う。空になった時はtablistと選択中の操作を表示せず、指定した退避先へfocusを移す。動的除去/disabledで自前focusが失われた際は次/前の有効tabへ移す。別領域にあるfocusは奪わない。

選択中タブの文字と下線は`color.tab-selected`、タブの背景はsurfaceを使う。文字／背景のコントラストを検証し、ボタンの背景色へ結び付けない。

### Disclosure

`<ui-disclosure title="詳細条件" [open]="expanded()" (openChange)="expanded.set($event)">…</ui-disclosure>`。native details/summaryを使う。title必須、openは既定false。開閉状態の所有者はアプリ。HTML標準のキーボード操作を維持する。

TabsとDisclosureのhostに `[hidden]="true"` を指定すると、表示とキーボードのタブ順から外れる。再表示しても入力値と選択・開閉状態を保持する。

### SideNav / NavigationRail / BottomNavigation / Dock

`<ui-side-nav>`（同じ実装の`ui-navigation-rail`）は必須`navId/label`、`items: readonly NavigationNode[]`、`current`、`expandedIds/expandedIdsChange`、`collapsed/collapsedChange`、任意の正のpixel `width`、`selected: NavigationNode`を持つ。NavigationNodeはid/label、任意のhref/icon/description/disabled/visible/再帰children。IDは全階層で一意、循環を拒否する。native nav/list/details/summaryとリンクを使い、menu-widgetの矢印操作をサイトリンクへ強制しない。親にもhrefがあれば開いた階層内に親へのリンクを表示する。disabledの親はUI展開を拒否し、disabledのリンクは説明可能なまま遷移を拒否する。visible=falseの階層は表示しない。

widthは展開時の幅、省略時はsize.sidebar。全体の折畳みはsize.navigation-railへ切り替え、開いていた階層を記憶する。アイコン/頭文字の表示でも完全なラベルを保つ。折畳み中に親summaryを選ぶとナビを展開してその親を開く。外部collapse/親の終了/項目除去では自前focusだけを残った親summaryまたは折畳み操作へ退避する。

`<ui-bottom-navigation>`（`ui-dock`）は必須label、items/current、`showLabels=true`、`fixed=false`、物理`edge='top'|'bottom'|'left'|'right'`、selectedを持つ。項目は同じNavigationNodeの平坦な移動先で、children付き入力はエラーとしてSideNavへ誘導する。ラベル非表示でもリンクの名前を残し、左右端は縦配置、上下端は横配置で局所scrollする。固定領域が本文を覆わない余白はアプリの画面構成で確保する。URL遷移、現在地、Router、履歴はアプリが所有する。

### AnchorNavigation

`<ui-anchor-navigation>`は必須label、`items: readonly {id;label;target:HTMLElement|null}[]`、任意`scrollRoot:HTMLElement|null`、非負pixel `offset=0`、`position='static'|'sticky'|'fixed'`、`behavior='auto'|'smooth'`、`updateHash=true`、currentChange/selectedを持つ。targetは同一documentの実要素で有効なidを持ち、scrollRootを使う場合はその内部へ置く。target=null/hidden/inert/切断時はリンクを無効にして説明を残す。native hrefを保ち、修飾キー付きクリックを横取りしない。

通常のクリックはtargetへ実scrollし、見出しへfocusし、必要なら元のhistory.stateを保ってhashを更新する。offsetはscroll-margin-block-startへ接続し、移動と現在位置はscrollportのscroll-padding-block-start（比率・calcを含む）も合わせる。local rootのscrollTopにも同じ余白を反映する。reduced motion時はsmoothを使わない。scroll/resize/targetの表示/根dir/profile/style変更で現在位置を追跡する。stickyはhost自体を直近scroll領域内に配置する。破棄/対象変更で自前のmargin/tabindexだけを元へ戻し、その間のアプリ変更を上書きしない。CSS値の保存・所有判定・復元は!importantの優先度も含める。固定領域の予約余白、業務上の現在地解釈、URL同期の追加制約はアプリが決める。windowの移動では画面がhtmlのscroll-padding-block-startを設定する。デモはResizeObserverで実ナビ高さを予約し、static/破棄時に自分の値だけ復元する。local scrollRootのoffsetは実際のレイアウトに合わせる。

### Menubar / MegaMenu

`<ui-menubar>`は必須controlId/label、`items: readonly MenuItem[]`、itemsChange/selected、`disabled=false`、`closeOnSelect=true`を持つ。常時見えるrootは横方向のroving focus、rootのcommand/check/radioと再帰Menuを組み合わせる。rootのgroup/separatorは拒否し、popupのchildrenに置く。子popupを持つrootはtype=itemとし、checkbox/radioの選択項目はpopup内に置く。disabled項目はfocusで説明を確認でき、実行を拒否する。選択はrootを含むid pathとitemを返す。itemsChangeはcheck/radioの新しいdataであり、実行成功を意味しない。

rootの左右（RTL反転）/Home/End/typeahead、popupの上下/Enter/Space、前方キーによる子展開、後方/Escapeによる親へのfocus復帰を接続する。popup内のleafで前方キーを押すと次rootへ移り、そこにpopupがあれば最初の項目へ入る。最上位popupで後方キーは前root。rootとpopupのTab/Shift+Tabで全popupを閉じ、Menubar全体の外へ退出する。root移動直後の`tabindex`描画待ちにも依存しない。root間や深い階層の連続キー、項目除去時の自前focusを検証する。既存Menuの`menubar/rootNavigation`と`openMenu/dismiss/focusTrigger`はこの合成にも使う。

`<ui-mega-menu>`は実anchorを使うnative popupで、Popover共通契約（controlId/anchor/open/trigger/placement/busy/終了理由/保留/対象喪失）を継承する。必須label、`groups: readonly MegaMenuGroup[]`（group=id/label/description/items）、正の整数`columns=3`、current、closeOnSelect=true、closeLabel、selectedを追加する。各groupの見出し/説明、native links/detailsによる子階層と親リンクを実描画し、size.mega-menu/size.navigation-columnで最大列数と折返しを決める。通常のサイト移動なので矢印によるmenu操作を強制しない。Tabで全リンクとsummaryへ到達し、外側/終了時のfocusは共通popupが管理する。遷移先とcurrentの更新はアプリへ返す。通常リンクの移動先がfocusを受け取る場合はnative遷移を優先し、Escape/取消では起動要素へ戻す。

### CommandPalette

`<ui-command-palette>`は必須controlId/label、`commands: readonly PaletteCommand[]`、open/openChange、query/queryChange、recentIds/historyChange、正の整数historyLimit=10を持つ。PaletteCommandは一意id/label、任意description/group/keywords/shortcut/disabled/visible/icon。検索語を空白で分割し、label/description/group/keywordsすべてを対象にAND検索する。groupをまとめ、検索が空なら最近呼び出した項目を優先する。履歴は呼出し履歴であり成功した業務処理の履歴と断定しない。永続化はアプリが行う。

native modal Dialogと入力focusを維持するcombobox/listbox、group名と候補説明を使う。上下は候補移動、EnterはcommandRequested、disabledは表示して実行を拒否する。defaultPrevented/IME変換中のキーは処理しない。検索draftと同じnative editorをclose/reopenや候補差替えでも保持する。busy/error/busyLabel/retryLabelを接続し、busy中の再要求を抑止、エラー後は選択と検索を保って再試行する。closeRequested/completedはDialogの終了保留/結果、`close()`は取消、`complete(value)`はアプリ結果を返す。closeOnSelectは既定falseで、既定では実行要求だけで閉じない。明示trueは即時完了できるアプリ操作に限って接続する。closeOnOutsideClick=false、size=largeが既定。searchLabel/resultsLabel/defaultGroup/emptyLabelも差替え可能。アプリ補助操作は内容投影でDialog内へ置ける。

`shortcut: string|null=null`は開くキーの明示opt-in、`shortcutScope: HTMLElement|null`は監視範囲（既定は同じOverlayHost、なければbody）。Control/Alt/Metaのどれかを含む厳密な修飾キーと文字/数字/F1..12/Enter/Space/方向キーの組合せを使う（例Control+k、Meta+Shift+k）。Shiftだけ、重複修飾子、曖昧なCtrl等は拒否する。候補のshortcutはpaletteが開いている間だけ実行する。通常の入力、既に処理したキー、IME、repeat、別modalの外側にあるpaletteは横取りしない。画面固有のショートカット衝突、OS/SR予約キー、実コマンドとbackend結果はアプリが確認する。全ショートカットに表示上の操作経路も残す。

狭幅・拡大ではDialog見出しを閉じる操作と折り返し、検索label/input/statusを内部スクロール中も固定する。開く・矢印移動・エラー・再検索の描画後に、選択中の操作名を検索領域の実高さに合わせて表示する。長い説明やshortcutの下端だけを表示して操作名を隠さない。文字サイズ変更はResizeObserverへ接続し、破棄ではobserverと予約した描画処理を解除する。

### Dialog

`<dialog uiDialog label="申請の削除" [open]="dialogOpen()" (openChange)="dialogOpen.set($event)">…</dialog>`。native dialog上のcomponentでshowModal/closeを接続し、背景操作の抑止とフォーカス管理はブラウザーのmodal dialogを使用する。label必須。cancelled/closed outputでEscapeと閉じる動作を受け取る。アプリに閉じるボタンを置き、openをfalseへ更新する。SSR/hydration、多重モーダルは未検証。

### DataTable / TableContainer

`<ui-table-container label="申請の一覧表"><table uiTable caption="申請一覧"><thead>…</thead><tbody>…</tbody></table></ui-table-container>`。captionと領域labelは必須。thのscope、ソートのaria-sort、各行のキー、セルの意味、欠損を「未取得」と示す責任はアプリ。ソートや行選択を基盤が自動実装するとは扱わない。横スクロールは表の領域内に収め、キーボードからも領域へフォーカスできる。

### Pagination

`<ui-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" label="申請一覧のページ" />`。pageは1以上、totalPagesは0以上のsafe integer。totalPages>0ではpage<=totalPages、既知の0件ではpage=1を渡す。範囲外や不明な数値は『ページ情報を表示できません』と示して操作を抑止する。取得前の総頁数を0に置き換えず、AsyncRegion等で状態を分ける。disabledは既定false。前後操作と現在頁／総頁を示し、全頁分のボタンを大量生成しない。

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

TextInput、Textarea、NumberInput、PasswordInput、SearchInput、Checkbox、Switch、Select、MultiSelect、Comboboxはnative要素を使うControlValueAccessorです。`controlId/label`は必須、共通で`hint/error/required/disabled/busy/readonly/value/valueChange/name`を持ちます。`[formControl]`／`formControlName`または制御された`value/valueChange`を使い、同じ部品で二つの値の所有者を併用しません。`writeValue`でアプリへ値を返さず、disabled・readonly・busyでは編集を抑止します。表示エラーの文言と表示時機、送信時の最終検証はアプリが所有します。FormFieldで表示するCVAにはlabelPositionも接続し、native fieldsetの選択群はlegendとdirectionを使います。

- TextInput: placeholder、maxLength、autocomplete、clearable、showCount。文字数／maxlengthはnativeのUTF-16単位で扱います。
- Textarea: rows、autoResize、maxHeight、maxLength、showCount、placeholder。最大高さを超えた内容は内部でスクロールし、手動拡大も許可します。autoResizeは入力/CVA更新だけでなく幅、profile、hidden復帰も再計算します。
- NumberInput: min/max/step/fractionDigits/grouping/locale/unit。編集はnative number、桁区切りと小数桁は補助表示へ適用します。CVA validatorは範囲・刻み・必須とbadInputを扱い、範囲変更時も再検証します。無効な数値ドラフトで古い値を有効扱いしません。
- PasswordInput: autocomplete、表示切替とアプリが渡すstrength。強度の安全性を部品が保証したとは扱いません。
- SearchInput: debounceMs、loading、suggestions/suggestionsQuery/suggestionsRequestId、`searchRequest:{query,requestId}`。入力値は即時更新し、待ち時間後は最新語を一度返します。Enter／検索ボタンは待機を取消して即時に返し、IME変換Enterは処理しません。native searchイベントとの衝突を避けた出力名です。非同期応答はqueryとrequestIdの両方を渡し、同じ語に戻った場合も新しいIDを待ちます。同値CVA resetは応答と待機を無効にします。静的候補だけはsuggestionsRequestId=nullにします。
- Checkbox: boolとindeterminate。Switch: bool、busy、native role=switch。操作後の値とCVA touchedを接続します。
- Select: optionsのlabel/value/disabled/group、placeholder、clearable。標準select/optgroupを使います。
- MultiSelect／`ui-checkbox-group`: options、searchable、showSelectAll、maxSelected、選択済み表示と個別解除、direction=vertical/horizontal、columns。検索で見えなくなった選択を保ち、無効／削除済みの選択も個別解除できます。group外へのfocusoutは`updateOn:'blur'`へ通知します。
- Combobox: options、freeInput、loading、placeholder、`queryChange:{query,requestId}`、optionsQuery／optionsRequestId。非同期のアプリは応答に両方の識別情報を付け、同じ検索語の古い応答も選択させません。非自由入力の編集で古い選択をnullへ戻し、未確定ドラフトはvalidatorでinvalid。外部resetは同値でもドラフトを初期化します。矢印/Home/End/Enter/Escape/Tabとaria-activedescendantを接続し、無効候補とIME Enterを避けます。`ng-template[uiComboboxOption]`のtyped contextは`$implicit:SelectOption`、active/selected。候補templateは表示内容だけに使い、入れ子の別操作を置きません。native popoverとOverlayRegistry、placementとviewport反転/クランプを使い、native modal内にも留めます。最初のEscapeは候補、その後のEscapeはDialogへ届きます。Tab/outside/選択で同期して登録を解除し、入力focusを別の操作から奪いません。

FormLayout（`[uiFormLayout]`）はcolumns、direction、gap=none/compact/normal/wide、labelPosition=above/inline、labelWidth（正のpx、nullはsize.form-label）を持ちます。FormFieldのlabelPosition=inherit/above/inlineは既定でlayoutを継承し、inline幅は入力を保つため領域の40%まで、viewport 40rem以下では文字入力を縦に戻します。native checkboxは明示above/inlineも指定できます。InputGroupは前後の`uiInputBefore/uiInputAfter`とconnected、FormErrorSummaryはerrors（controlId/label/message）とvisible/titleを受け取り、native fieldへfocusを移してnavigateを返します。FormGroupはgroupId/label/hint/disabledと同じlayout設定を持つnative fieldset/legendです。disabledはnative子操作を無効にし、値を消しません。Angularのvalidationからも除外する場合はアプリがFormGroup.disable()を使います。他の入力カテゴリはマトリクスで追跡します。

### 構造化入力とフォーム操作

MaskedInput、OTPInput、TagInputも共通CVAに接続します。書式/未確定draftのvalidatorと表示説明を持ち、業務検証と実送信はアプリが所有します。利用側はAngular formsの値をシリアライズします。

- MaskedInput: mask（必須、9=ASCII数字、A=Unicode文字、*=文字またはASCII数字、バックスラッシュでliteralをescape）、placeholderCharacter（1グラフェム）、showPlaceholders、clearIncompleteOnBlur、autocomplete。CVA値は区切りを含まないraw string、native inputは書式付き文字列です。native FormDataは表示文字列を読むため、raw値を送る場合はCVA値を使います。未入力部分はplaceholder/書式の説明として示し、値へ混入させません。途中の値は保持し、明示clearIncompleteOnBlur=trueだけが離脱時に消します。不正文字/超過はdraftに残し、前の受理値でvalidを偽装しません。固定区切りの削除/再入力とcaret、Unicode/IME、CVAの同値resetを扱います。1〜128 slots、256 partsまで。書式変更時も値を捨てず再検証します。
- OTPInput: digits=1..64（既定6）、kind=numeric/alphanumeric（ASCII英数字）、stripPasteSeparators（既定false）。native text/inputmode/patternとautocomplete=one-time-codeを使います。先頭0、全コードの貼付けを保ち、超過/文字種違いも切り詰めません。明示設定した貼付けだけ空白・ハイフンを除きます。OSからの自動入力と認証成否はこのDOM/操作検証の範囲に含めません。
- TagInput／ui-token-input: readonly string[]、options、freeInput、allowDuplicates、caseSensitive、maxTokens（nullまたは0以上の整数）。native editor/datalist、追加/個別削除を使います。重複/候補外/上限で拒否したdraftと、復元された不正なcollectionは残して修正できます。未追加のdraftもvalidatorで区別し、resetがdraftを消します。collectionのrequiredを検証し、空のeditorへnative requiredを付けません。削除前はeditorへfocusを残します。データ更新の結果はアプリから受け取ります。
- RadioGroup: name/label/value/valueChange/required/disabled/hint/errorとdirection。CVAまたは制御された値で初期選択を渡し、各input[uiRadioOption]のvalue/disabledを使います。native矢印で無効候補を飛ばし、グループ退出をtouchedへ接続します。CVA reset後の値はFormControlのnullable/nonNullableとアプリのreset値に従います。
- FormActions: native submit/reset/cancel、formId（外部formとの関連）、busy/disabled、showSubmit/showReset/showCancel、各label、direction/align、groupのlabel。cancelledは意思表示です。native resetはAngular FormGroupDirective/アプリのreset契約へ届きます。busyで各操作と投影したclickを抑止し、組込み操作のfocusを自領域へ留め、完了後は同じ操作へ戻します。外部focusは奪いません。投影した追加操作のdisabled表示/フォーム対象は利用側が接続します。保存成功・戻る先・取消の結果を部品で先取りしません。

一次資料: [HTML autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)、[APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)。

### Calendar と日付入力

日付は`YYYY-MM-DD`、月は`YYYY-MM`、年は文字列、時刻は`HH:mm[:ss]`。日付だけの値を地域時刻へ変換しません。CalendarとDatePickerはmin/max、disabledDates/dateDisabled、weekStartsOn（0～6）、localeを受け取ります。Calendarはvalue/CVA、today、initialMonth、displayMonth/monthChange、view=month/year、selectedDatesと`ng-template[uiCalendarDay]`を持ちます。日セルのcontextはdate（$implicit）/day/inMonth/selected/disabled。日セル内に別の操作要素を入れず、選択操作はCalendarに任せます。

Calendarの`today`とDateRangePickerの`initialMonth`を省略した場合は、部品作成時の端末ローカル日付／月を使用します。午前0時をまたいでも自動で選択や表示月を変更しません。業務のタイムゾーンや日付更新が必要なアプリは明示値を渡します。localeは表示書式だけを変更し、確定済みcivil値と日付演算はタイムゾーンでずれません。

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

## 操作部品

`ActionControl`（`button[uiAction]`）のvariant/type/busy/disabledに、size=small/medium/large、width=auto/full、icon、iconPosition=start/end、`uiActionIcon`の投影を接続する。サイズは現profileのsemantic値に追随し、小サイズも最小操作寸法を縮めない。処理中/無効はnative disabledとcapture guardでconsumerのclickも抑止する。`ActionLink`（`a[uiAction]`）はhref、external、target、relを持ち、externalは「外部リンク」を示し既定target=_blank、noopener/noreferrerを追加する。指定したrelを保持し、無効/処理中はhrefとTab順を外す。

`IconButton`（`button[uiIconButton]`）はicon/label必須、shape=square/round、sizeとselected=null/boolean。選択状態を持つ場合はaria-pressedを接続する。`ToggleButton`（`button[uiToggleButton]`）はlabel、checked/checkedChange、on/offLabel、on/offIconを持つ。labelを一定にしてaria-pressedを伝え、状態文言と装飾iconを差し替える。共通icon/iconPositionも使用できる。`ButtonGroup`はlabel、direction、gap、connected、共通sizeを持ち、投影したnative uiActionの明示sizeは共通設定より優先する。

`SegmentedControl`はcontrolId/label、options=value/label/icon/disabled、multiple、direction、equalWidthを持つ。単一はnative radio、複数はcheckboxで、CVA/required/option/mode validation、disabled/busy/readonly、hint/errorと退出時touchedを接続する。値は単一string/null、複数readonly string[]。選択方式を変える際の値変換は利用アプリが決める。

`SplitButton`は主操作actionとMenuのselectedを分け、items、placement、open/openChange、closeOnSelect、busy/disabledを持つ。`FloatingActionButton`（`ui-floating-action-button` / `ui-speed-dial`）は主操作、補助items、四隅の論理position、up/down/left/rightのpopup direction、open/openChangeを持つ。native modal外では背景操作の抑止を越えない。

`Toolbar`（`ui-toolbar` / `ui-action-bar`）はcontrolId/label、typed itemsの操作/区切り、direction、overflow=menu/wrap、fixed=none/top/bottom、disabledを持つ。実測幅で収まらない操作をMenuへ移す。横方向はRTLを含むLeft/Right、縦方向はUp/Down、Home/Endでroving focus。移動先が非表示になる前に可視の主操作/Moreへ復帰し、popup内の操作が主配置へ戻る場合はその操作へ戻す。fixedはnative stickyの最寄りscroll領域で作用する。

`CopyButton`はtext、label、busy/disabled、successMessage/errorMessage、正のdurationSeconds（既定3）、copied/failedを持つ。既定は実Clipboard APIのwriteTextで、成功したpromiseの後だけ成功を伝える。不可用/拒否を失敗として表示し、再試行できる。処理中の重複と破棄後の古い結果を抑止し、自前buttonにfocusがある場合は処理中に操作内へ退避して完了後に復帰する。外側のfocusは奪わず、結果表示は完了時から設定時間で消す。`UI_CLIPBOARD_WRITER`で環境のwriterを注入できるが、実コピーの意味とpromiseの成否はそのadapterが所有する。画面外のclip内容は取得しない。

操作パターン: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)、[APG Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)、[APG Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)、[Clipboard API](https://www.w3.org/TR/clipboard-apis/#async-clipboard-api)。

## 通知一覧と状態表示

`NotificationCenter`はcontrolId/label、typed `items`（id/title/message/category/read/severity/disabled/busy）、filter/categoryと変更出力、disabled/loading/hasMore/error、追加取得/再試行の文言を持つ。未読件数と分類を表示し、`readRequested:{id,read}`、`deleteRequested:id`、`loadMoreRequested`を利用アプリへ返す。部品は既読・削除・取得成功を先取りせず、アプリから受け取る一覧を表示する。取得中は既存一覧を保持して連打を抑止し、失敗時は再試行する。行がfilter/削除で消える前、操作がbusyで無効になる前に可視操作または状態説明へfocusを移す。

`Alert`（`ui-alert` / `ui-banner` / `ui-inline-message`）はopen/openChange、title/message、severity、announcement=polite/assertive/off、closable/closeLabel、actionLabel/action、busy/disabledとfocusFallbackを持つ。本文と`uiAlertActions`を投影でき、明示終了まで保持する。通知を出しただけでfocusを奪わず、閉じる際だけ内側のfocusを外へ移す。組込みの確認／閉じる操作を外部から非表示にすると、その操作にあったfocusだけを本文へ移します。残る操作や補助入力、領域外のfocusは保持します。投影した独自操作のbusy契約は利用アプリが接続する。

`ActionFeedback`は既存state（idle/success/error/warning/unknown）、recoveryLabel/recover/recoveryBusy/recoveryDisabledにbusy/busyMessage、focusFallbackを接続する。結果不明を成功と扱わず、説明と入力を保持する。`AsyncRegion`はready/loading/empty/error/refreshing/partial/stale、retryAvailable/retryBusy/retryを持ち、取得/欠損の意味を区別する。通常の内容をDOMに保持し、更新中・部分欠損・古い情報では取得済みの内容を表示する。内容と通知の切替前にfocusを退避し、処理中に無効になる復旧操作は状態説明へfocusを残す。

`EmptyState`はkind=empty/search、title/message、image/imageAltと補助操作を持つ。図が取得できなくても説明を残す。`ResultState`はstatus=info/success/warning/error/unknown、title/message/details、native detailsの展開状態、次の操作を持つ。両部品ともbusy/disabled/actionと投影内容・補助操作に対応する。

`ProgressBar`はnative progressにcontrolId/label、value/total/valueTextと取消要求を接続する。totalは正の有限値、valueは有限値またはnull。不定はvalue属性を外し、数値は0〜totalへ収める。`Spinner`（`ui-spinner` / `ui-circular-progress`）は同じ進捗、label、small/medium/large/正のpxのsize、activeとdelayMillisecondsを持つ。表示前の停止と破棄でtimerを取消し、動き低減では回転しない。`Skeleton`はline/rectangle/circle、rows、width/height/diameter、motionを持ち、装飾として支援技術から除外する。円は狭い親へ収めても縦横比を保つ。

`LoadingOverlay`（`ui-loading-overlay` / `ui-block-ui`）は投影した対象領域だけをactiveでinertにし、messageとcancelLabel/cancelRequested、cancelBusy/disabledを表示する。入力を破棄せず、外側の操作を抑止しない。抑止開始時に対象内のfocusだけを退避し、解除後に元の入力、focusFallback、利用可能な内容内操作の順で復帰する。説明が領域より大きい場合は先頭からscrollでき、取消操作へキーボードで到達できる。取消イベントはUIの意思表示であり、処理が停止した保証ではない。

`Tour`（`ui-tour` / `ui-coachmark`）は実HTMLElementをtargetとするtyped steps（id/title/message/placement）、open/openChange、index/indexChange、seen/seenChange、next/back/finish/closeLabelを持つ。対象にscrollし非modal popoverを配置する。対象の操作・入力を許し、次/戻る/再開と表示済みIDをアプリへ返す。closedはcompleted/dismissed/escape/target-unavailable/scope-exitを返す。popup内のfocusは終了後に起動操作へ戻し、対象や外部へ既に移ったfocusは奪わない。外部open=falseも同じfocus復帰を行う。native modalへの移行やCSS不可視で対象が利用できなくなった案内は終了する。表示済みの永続化と再開位置、業務手順の完了判断は利用アプリが所有する。

`uiAction`などdirective付き要素をtarget/focusFallbackに使う場合、Angularのqueryは`viewChild<unknown, ElementRef<HTMLElement>>(name, {read: ElementRef})`のnativeElementを明示して取得する。directiveのtemplate referenceをHTMLElementとして扱わない。

参考: [APG Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)、[HTML progress](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element)、[native modalと背景のinert](https://html.spec.whatwg.org/multipage/interaction.html#modal-dialogs-and-inert-subtrees)。

## 文字・情報・数値表示

`Typography`はnative h1〜h6/p/span/strong/em等へ`uiTypography`/`uiHeading`/`uiText`を付けるdirectiveです。意味と見出し階層は実タグで決まり、`uiTypography=body/heading/small`、tone=neutral/muted/info/success/warning/error、align=start/center/end/justify、wrap=wrap/nowrap/balance、emphasis=normal/strong/italicが見た目を制御します。native strong/emの意味を保ちます。nowrapは内容を局所scrollでき、既にtabindexやnative操作を持たない要素へtab stopを追加します。アプリが指定したtabindexは保持します。

`Badge`はcount、maximum、showZero、dot、label、toneと、inline/top・bottom×start・center・endのpositionを持ちます。上限表示が99+でも完全数値を説明し、dotはlabelを説明に使います。位置は論理方向でRTLへ接続します。投影した対象の上に重ねる場合も枠内へ収めます。

`Tag`（ui-tag/ui-chip）はlabel/icon/tone、selectable、selected/selectedChange、removable/removed、disabled/busy、focusFallbackを持ちます。選択と削除は別のnative buttonです。選択はaria-pressedで示し、削除要求の前に内側のfocusを外へ退避します。組込み操作が動的に除去/無効化されたらTagへfocusを保持し、外側のfocusを奪いません。実際のデータ削除・検証・失敗からの復旧は利用アプリが所有します。

`Avatar`はname/src/alt、decorative、locale、size=small/medium/large、shape=circle/squareを持ちます。画像取得が失敗するとグラフェムを分断しない氏名頭文字と代替説明を表示し、src変更で画像を再試行します。`imageFailed`は失敗したsrcを返します。代替の頭文字は画像の寸法から文字サイズを求め、拡大時も折返さず枠内へ収めます。`AvatarGroup`はtyped items(id/name/src/alt)、maximum、label、size/shape/localeを持ち、上限を超えた担当者はnative detailsから氏名付きで確認できます。上限変更でsummaryが消える場合はGroupへfocusを保持します。

`Descriptions`（ui-descriptions/ui-key-value）はnative dl/dt/dd、typed items(id/label/value)、columns、direction=horizontal/vertical、label、missingLabel、emptyLabelを持ちます。null/undefined、0、false、空の文字列を区別します。狭幅では1列へ折返します。`DescriptionTemplate`（ng-template[uiDescriptionValue]）は$implicit:DescriptionItem、value、missingを型付きで渡します。

`Statistic`（ui-statistic/ui-metric-card）はlabel/value/unit、comparison/comparisonLabel、deltaMode=absolute/percent、deltaLabel/deltaTone、localeとIntl.NumberFormatOptionsのformat、missingLabel/unavailableDeltaLabelを持ちます。有限数またはnullを受け付け、0件と未取得を区別します。百分率は(value−comparison)/abs(comparison)で、比較値0・欠損・表現可能範囲を超える増減は比較不能と説明します。増加を業務上の成功と推定せず、意味色はアプリが指定します。

`Meter`はcontrolId/label、value/minimum/maximum、low/high/optimum、unit/locale、Intl書式のformat、missingLabelをnative meterへ接続します。minimum < maximum、範囲内の有限値、low ≤ highを検証し、nullは数値メーターを作らず未取得と表示します。進捗には既存ProgressBarを使います。`MeterGroup`はcontrolId/label、typed items(id/label/value/tone)、maximum、unit/locale/formatを持ち、取得済みの合計と未知項目数、各区分のnative meterと装飾の比例帯を表示します。重複IDや上限超過の合計を拒否します。補償加算と最終丸め誤差の範囲だけを考慮し、0.1＋0.2が上限0.3の区分を拒否しません。値と合計/上限を同じIntl書式へ接続します。量＋単位／上限、合計／上限はLTRのbdiで周囲の方向から隔離し、単位内部はbdiの自動方向を使います。RTLでも数値の比率の順を保ちます。未知を空き容量0と扱いません。

`HelpText`は投影内容、id、position=inline/above/belowを持ち、入力のaria-describedbyへ明示接続します。`ShortcutHint`はkeys、任意の読み上げlabel、position=inline/belowをnative kbdへ接続します。⌘等の記号には説明labelを指定できます。キーコマンドの実行はアプリが接続します。

`ReadMore`（ui-read-more/ui-truncated-text）はcontrolId/text、正のlines、expanded/expandedChange、expandLabel/collapseLabelを持ちます。実描画のoverflowをResizeObserverで測定し、必要な場合だけnative buttonで全文/折畳みを切り替えます。全文をDOMから捨てず、視覚的な行数制限を行います。短文/行数/幅変更で操作が消える場合はReadMoreへfocusを保持します。

`CodeBlock`はsource、language、label、format=preserve/json、indent、任意の同期formatter(source,language)、lineNumbers、wrap、direction=ltr/rtl/auto（既定ltr）、copyable/copyLabel/copyDurationSeconds、copied/copyFailedを持ちます。pre/codeの文字補間で表示し、HTMLとして実行しません。JSON整形は重複キーや数値/文字列の生トークンを保持して空白だけを変更します。整形失敗は原文と説明を表示します。行番号はsourceの各行と同じrowへ置き、折返した継続行に新しい番号を付けません。空行も行高と番号を保ちます。行番号は支援技術と選択コピーから除き、コードは名前付き局所scroll領域に収めます。実CopyButtonで表示内容をコピーし、失敗時も原文を保ちます。コピーの応答待ちで自前buttonが無効になる前にCopyButton内へfocusを保持し、操作内にfocusが残っている場合だけ完了後にbuttonへ復帰します。操作の外部除去時はコード領域へfocusを保持します。破棄後にClipboard処理が完了しても部品の結果出力は発火しません。開始したOSの書込みを取り消す保証はありません。`InlineCode`はnative code[uiInlineCode]へ同じ書体を接続します。ハイライトや言語補完はこの表示部品の契約に含みません。

`Watermark`はcontrolId/content、repeat、position=top/center/bottom×start/center/end、opacity、tileWidth/tileHeightを持ちます。繰返しはnative SVG patternで実領域を覆い、単発は論理位置へ置きます。opacity=nullは意味トークン、明示値は0〜1、tile寸法は正のpxまたは用途別profile寸法を使います。装飾を支援技術から除外し、pointer-events:noneで下の入力/操作を遮りません。透かしは認証やコピー防止の保証ではありません。

追加の必須役割はfont.code、size.avatar、opacity.watermarkです。設定正本から両profileへ解決し、code書体/avatar寸法はTailwindの対応namespaceへ、opacityはsemantic CSSへ直接接続します。

参考: [HTML meter](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element)、[HTML code/kbd](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-code-element)、[APG disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)、[W3C bidi isolation](https://www.w3.org/International/articles/inline-bidi-markup/)。
## 端の領域と浮動表示

`dialog[uiDrawer]`のDrawerと`dialog[uiBottomSheet]`のBottomSheetはnative Dialogの実装を継承する。`label`、`open/openChange`、`modal`、`closeOnEscape`、`closeOnOutsideClick`、`closable`、`busy`、終了保留の`closeRequested.preventDefault()`、`completed`の理由/値、`finish()`とアプリの結果後の`complete()`はDialogと同じ。`showHeader`はtrueが既定。`uiDialogTemplate=header/body/footer`のtyped contextと領域の投影をそのまま使う。

Drawerの`edge=left/right/top/bottom`は物理位置（既定right）。RTLで左右を反転しない。`width/height`は正の有限pixelまたはnull。nullでは左右端の幅は`size.drawer-inline`、上下端の高さは`size.drawer-block`、反対方向はviewport。viewportを超えず内部scrollを持つ。明示寸法/edge変更は以前の移動/resizeを解除し、内容を作り直さない。Dialogのmove/resize/maximizeを選んだ場合は同じnative keyboard handleを使う。通常のDialogのpositionよりedgeを優先し、最大化はviewportになる。Drawer/BottomSheetがhidden/inert/切離しで利用不能になる場合はnative closeでmodalの背景抑止を解除し、理由nativeを返す。この後始末をUIの終了保留で妨げない。nonmodalの外部終了では、すでに別の操作へ移ったfocusを奪わない。

BottomSheetの`stages`は昇順の正の比率（最大1、既定[.4,.7,1]）、`stage/stageChange`は有効index（既定1）。高さはviewportまたは明示`height`に選択比率を掛けた値。native rangeと`reduceLabel/expandLabel`のbuttons、`setStage(index)`が段階を変更する。`stageLabel`と現在の段階/百分率の説明を残す。busyでは段階の再操作を抑止し、無効になる組込み操作のfocusを領域へ保持する。端の段階で無効になる増減buttonからはrangeへ移す。閉じ方と操作領域はDialogの契約で、pointerのドラッグに依存しない。

Popover/Tooltip/HoverCard/ConfirmPopoverの対象は実`HTMLElement|null`の`anchor`。directive/component付き要素はtemplate referenceがcomponentになる場合があるため、`viewChild(...,{read:ElementRef})`の`nativeElement`を渡す。対象と内容は同じdocument、modal内は同じnative modalのDOM内へ置く。top layerへ入っても元のDOMのprofile/RTLを継承し、anchorへ瞬間移動しない。`controlId`は空白を含まない固有のID。

共通`trigger=click/hover/focus/manual`（Popover/ConfirmPopoverはclick、Tooltip/HoverCardはhover）、`placement`（既定bottom-start、共通Overlayの6種）、`open/openChange`、`disabled`、`busy`、`closeOnEscape/closeOnOutsideClick`（true）、`showDelayMs/hideDelayMs`（有限・0以上・native timer上限内）、`focusFallback`を扱う。hoverにはkeyboard focusと明示clickの経路がある。`show()`で明示開始できる。対象の変更/位置変更を再配置し、対象/内容のhidden/inert/modal scope喪失で後始末する。

`close(reason)`は同期の`PopupCloseRequest`を出力し、アプリが保留できる。busyはUI終了を保留する。`closed`は`{reason,value}`、理由はescape/outside/scope-exit/target-unavailable/close-button/cancel/confirm/programmatic/leave。明示`open=false`、対象喪失と破棄はtimer/listener/Overlayを後始末する。外部操作のfocusを奪わず、自前focusが内容に残る終了では可用なanchorまたは`focusFallback`へ戻す。scope喪失を終了保留で延命しない。native popupを同期で閉じ、次のEscapeを親Dialogへ渡す。

Popover/HoverCardは非modal dialogと`label`、`showHeader/showCloseButton`（true）、`closeLabel/busyLabel`、`focusOnOpen`（true）を持つ。click/明示開始では操作へfocusを移し、hover/focusからの自動表示ではanchorのfocusを残す。自動表示済みのHoverCardをclick/Enterで明示起動した場合も操作へ入れる。Tabも内容へ移動できる。`uiPopupTemplate=header/body/actions`のcontextは`busy/close()`。投影は`uiPopupHeader/uiPopupActions`と本文。内容を閉じてもDOMと入力を保持する。trigger/RTL/profileの実行中の変更でも自前focusと配置を維持する。anchorのaria-controls/haspopup/expandedを部品が所有するので他のcontrollerと共有しない。破棄/対象変更で自分の属性だけを復元する。明示破棄は内容の入力保持を保証せず、利用アプリにopen=trueが残る場合は再作成した部品も開く。

Tooltipは必須`message`だけを表示し、操作を投影しない。既定500ms/100ms、HoverCardは300ms/150ms（明示で変更できる）。Tooltipのrole=tooltipはfocusを受け取らず、anchorの既存`aria-describedby`へ自分のIDだけを足し、対象変更/破棄でそのIDだけを外す。未処理のEscapeは表示前timerも破棄し、同じhover/focusが続く間は再開しない。入力が消費したキーやIME変換中のキーでは待機表示を取り消さない。内容へpointerが移っても保持する。必須の説明はTooltipだけに依存させず常設の説明にも置く。

ConfirmPopoverは必須`label/message`、`confirmLabel/cancelLabel/busyLabel`、`error`を持つ。初期focusは取消。`confirmRequested`はUIの意思表示で、自動で閉じない。アプリがbusy/error/retryを接続し、結果後に`complete(value)`または明示open=falseを行う。取消はcancelで閉じる。処理失敗は入力とerrorを残し、再試行できる。ライブラリはbackendの保存成功・実Undoを保証しない。

共通Escapeは子のキー処理の後で最上位Overlayへ渡し、defaultPreventedまたはIME変換中のキーでは終了しない。busy/終了保留の連続Escapeも保持する。native Dialogはmodalの背景抑止とTabを所有する。native cancelの拒否だけでは連続した閉じ要求を必ず保留できないため、アプリのキー契約を共通Registryで扱う。[判断と制限](adr/0001-overlay-escape.md)を参照する。OSの戻る操作など、キー以外の終了要求の保留を保証しない。

対象/内容の監視はdocumentElementを含む。根のdir/profile/style変更でもPopupを再配置し、根がhidden/inertとなる場合もMenu/Popupの後始末とDrawer/Sheetのnative modal解除を行う。根の利用可能状態を戻した後、別の操作へ移ったfocusを奪わない。

参照は[HTML popover](https://html.spec.whatwg.org/multipage/popover.html)、[APG modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)、[APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)。Tooltip patternはwork in progress。native意味/実操作/axe/描画と実screen reader・利用者理解を区別する。

## 数値・色・編集・段階・条件

生成した`angular/index.ts`からimportする。操作デモは`/catalog/choices`。共通の`controlId`/`label`/`hint`/`error`/`required`/`disabled`/`busy`/`readonly`/`name`とCVAまたは`value`/`valueChange`を接続する。CVAの外部resetはUIの未完了要求を失効させるが、アプリの通信を取消さない。

| 部品 | 設定と値 | 操作とアプリへの出力 |
| --- | --- | --- |
| Slider | 数値。`min`/`max`/`step`/`unit`/`ticks: SliderTick[]`/`labelPosition` | native rangeの矢印/Home/End。minを起点としてsnapし、datalist目盛りと文字ラベルを表示。 |
| RangeSlider | `{start,end}`。上記の範囲と目盛り、`startLabel`/`endLabel` | native rangeを2個使い、開始≦終了を守る。動く範囲が変わってもDOM順は変えない。 |
| Knob | 数値。上記の範囲/刻み/単位/`labelPosition` | SVGの270度の指針、native range、pointer capture、増減button。`size.knob`がprofileごとの寸法。 |
| Rating | 数値。`stars`（1〜20）、`halfSteps`/`clearable`/`clearLabel` | native radio群で整数/0.5段階、0へ解除。必須時は0が不正。readonlyで操作を抑止して値の説明を残す。 |
| ColorPicker | 文字列。`format: hex/rgb/hsl`/`allowAlpha`/`freeSelection`/`palette: ColorChoice[]`/`valueLabel`/`freeLabel`/`alphaLabel`/`paletteLabel` | raw text/native color/alpha range/palette。focus中の文字を保持し、妥当なblurで指定書式へ変換する。 |
| InlineEdit | 文字列。`multiline`/`rows`/`maxLength`/`validateValue`/`editLabel`/`saveLabel`/`cancelLabel`/`emptyLabel`/`busyLabel` | `saveRequested:{requestId,value,previousValue}`と`editingChange`。アプリが`complete(id,value?)`/`fail(id,message)`を返す。 |
| Wizard / Stepper | `controlId`/`label`/`current`/`direction`/`disabled`/`busy`/`deferTransitions`/`nonlinear`と各操作・状態label | `currentChange`、`transitionRequested:{requestId,from,to,reason}`、`completionAccepted`。`approve`/`reject`/`restart`。 |
| WizardStep | `stepId`/`label`/`disabled`/`canProceed`/`next` | 本文を投影。未表示でもmounted/hiddenで入力を残し、移動時に自前の見出しへfocusする。 |
| FilterBuilder / QueryBuilder | 再帰`FilterGroup`、`fields:FilterField[]`、各group/field/operator/value/add/remove/save/clear/restore/状態label | `saveRequested:{requestId,value}`/`savedCleared`。`completeSave`/`failSave`は一致する要求だけを適用。 |

数値の設定はfinite `min<max`と表現できる正のstep。maxが刻みに合わなければ到達できる最後の値まで使う。不正modelは保持したままvalidatorと説明で示し、native描画だけ安全な範囲へ収める。ユーザーの編集時にsnapし、Rangeの逆転したmodelは実編集時に有効範囲から修正できる。値/設定と目盛りの重複を検査し、設定不正では編集を抑止する。nativeのreadonly代替はdisabledによる操作抑止で、値の文字説明は残る。

Colorはhex3/4/6/8桁、rgbのbyte/%、hslの角度/百分率とalphaを解析する。RGBAへ揃えて表示書式を変換するため、hexのalphaはbyte精度、rgb/hslは小数3桁まで。未完成raw入力を無言で戻さない。透明度OFFでは透明なmodelを無言で不透明へ書換えず、明示errorと新しい選択で修正する。`freeSelection=false`はpalette選択と値の読取りだけ。native colorのOS選択UIは環境に依存し、補助的な文字入力とpalette経路を維持する。

InlineEditはEnter（複数行ではControl/Meta＋Enter）で保存要求、Escapeで取消。IME変換中はこれらを実行しない。保存待ちで同じeditorをreadonlyにして入力とfocusを保持し、連打を抑止する。保存失敗はそのdraftへ戻り再試行できる。確認済みcompleteはCVAへ公開し、通常の編集commitとは分けてbusy中でも反映する。reset/破棄後の古い結果はfalse。`[value]`の外部変更が部品へ反映された場合も旧要求を失効させ、同じeditorを新しい値へ同期する。complete/failは要求時のpreviousValueも照合する。自分のfocusだけを編集開始/終了時に移し、結果ボタンなど外部focusは奪わない。最大文字数はUnicode codepoint数で、grapheme数ではない。

Wizardの`next=undefined`は次の有効な投影段階、`null`は完了、ID指定は分岐。線形設定では訪問済み段階へだけ直接戻れ、`nonlinear=true`では未訪問も選べる。戻るは実移動履歴を使う。保留中に進行可否、from/to、分岐、利用可能な段階が変われば旧承認を失効させる。`deferTransitions=false`はUI移動を即時受理し、trueはアプリのapprove/rejectを待つ。完了はUIの段階終了で、backend提出成功ではない。外部currentの無効IDは最初の有効段階へ表示を戻す。入力の検証・業務分岐・永続化・未保存判断はアプリが決める。親wizardは入れ子wizardの段階を所有しない。

Filterはtext/number/date/boolean/choiceのfield、型に合う演算子、再帰and/or、安定した重複しないIDを使う。欠損はnull/undefined/型不正で、0/false/空文字と区別する。dateは有効なYYYY-MM-DDまたはDateのUTC日で比較。`compileFilter`は妥当な条件をコピーし、rowのown propertyのみを評価する。空グループは評価から除外、ルートが空なら制限なし。任意コード・SQL・通信を実行しない。不正構造/値/未知fieldはvalidatorと欄の説明へ残す。保存した条件の復元はUI snapshotで、backend保存結果をアプリがcompleteSaveとして返す。fieldsのID/説明/型/選択肢が部品へ反映された時点で保留要求を失効させ、条件データを残して再検証する。completeSave/failSaveでも同じ定義と妥当な条件を要求する。busy/pendingで操作を抑止し、保存失敗draft、reset/外部条件変更/破棄後の古い結果、除去前の自前focusを確認する。復元されたfield/operator/boolean/choiceは、nativeの選択表示を実際のモデルへ合わせる。

InlineEditとFilterBuilderの`invalidatePending()`は、下書きや保存済みsnapshotを消さずにUIの保留要求だけを失効させる。親signalの変更と応答処理を同じturnで行う場合、Angularが子inputへ反映する前の親の状態は子から観測できない。アプリは親値を置換する前にこのメソッドを呼ぶか、子inputへの反映後に応答を処理する。CVAのwriteValue/resetは同期して失効する。I/O中止、サーバー上の更新取消、外部の同値再書込みの識別はアプリの責任である。

## 一覧・選択・仮想化・移動

生成Angular consumerは`@angular/cdk`をAngularの互換版で導入する。このリポジトリは22.2.1をexact固定する。[ADR 0002](adr/0002-collections-cdk.md)と[段階受入仕様](ui-library-collection-expansion-spec.ja.md)を参照。以下の実装は段階検証中で、完了行はマトリクスのverifiedと実証記録を照合する。

List/ui-list、Masonry/ui-masonry、DataView/ui-data-viewは`items`、`keyField`、`labelField`、`label`、任意`descriptionField/iconField/emptyMessage`を持つ。キーは重複しない非空string/finite number、内容はapp-owned immutable snapshot。`ng-template uiCollectionItem [uiCollectionItemOf]=items`のcontextは`$implicit/index/pageIndex/count/key/label`。ListItem相当の主/補助/行操作を差替えられる。Listは`separators/spacing`、Masonryは`columns/maxColumns/minimumItemWidth/breakpoints/gap`でCSS複数列に高さの異なる行を置く。

DataViewの`state/stateChange: CollectionViewState`はquery/sort/page/pageSize/layoutを保持する。`locale/searchable/sortable/paginated/pageSizes/disabled/busy`を設定。機能OFFはその条件を実処理から外し、保存値はapp stateへ残す。未使用pager設定は検証しない。有効pagerの範囲外pageは最寄りのpageをstateChangeへ返す。context indexはfiltered/sorted一覧の絶対index、pageIndexはページ内index。layoutだけ変えた場合は安定keyの同じ入力DOMを保持する。

Listbox/ui-listboxとSelectionList/ui-selection-listは同じCVA部品。`ListChoice {value,label,disabled?,group?}`、single値string|null、multiple値readonly string[]|null。`multiple/searchable/showSelectAll/maxSelected/clearable/locale/virtual/itemHeight/height/overscan`と共通ValueControl入力を使う。`uiListChoice`のcontextは`$implicit/selected/active/index`、表示内容だけを差替える。選択とfocusは独立、矢印/Home/End/文字検索でfocus、Space/Enterで選択、Ctrl/Meta+Aで可視の有効候補を選択。hidden/disabled選択は残す。max超過の復元値は解除で修復できる。不正shape/重複/unknownは検証errorに残し、アプリが明示form.resetで修復する。仮想group metadataは描画済optionを所有し、未描画active IDを公開しない。仮想行の幅は公開viewportのclientWidthへ合わせ、長い既定ラベルをその幅内で省略表示する。通常表示の行幅は親領域に従う。

VirtualListは`items/keyField/labelField/label/itemHeight/height/overscan/emptyLabel`と`rangeChange/positionChange`、公開`scrollToIndex/scrollToOffset`を使う。寸法nullは意味tokenの測定。`ng-template uiVirtualItem [uiVirtualItemOf]=items`のcontextは`$implicit/index/count`。固定高さの内部は局所scroll、editor stateはappが安定keyに接続する。仮想化で自前focus行が消えた場合はviewportへ移し、外部focusを奪わない。公開viewportのclientWidthをResizeObserverで測り、自前の行幅だけに適用する。長い既定ラベルは行内で省略し、アプリの大きな投影内容は行内でスクロールできる。CDK内部の要素やCSSを変更しない。

SortableList/ui-sortable-listとOrderList/ui-order-listは`items/keyField/labelField/controlId/label/orientation/disabled/busy/readonly/canMove/emptyMessage`、`itemsChange/moved`を持つ。候補更新はappがitemsChangeを受けて接続。`moved {item,fromIndex,toIndex,items,reason}`のreasonはbutton/pointer/keyboard。canMove例外は拒否。公開CDKのhandle/touch-delay、native位置変更button、ハンドルclick→矢印/Home/Endの仮配置→Enter確定/Escape取消を使う。pointer開始sourceが差替わった場合は旧dropを拒否。指を離す前の取消は更新を公開せず、pointer releaseの説明を残す。実Undo/サーバー更新の成功ではない。

InfiniteScrollは`label/loading/finished/error/disabled/autoLoad/observerRoot/rootMargin/resetKey/contentVersion/loadingMessage/endMessage`、`loadRequested {id,reason}`、`completeLoad(id)/failLoad(id,message)/invalidatePending()`を持つ。reasonはbutton/intersection/retry。初期versionで自動要求は一度、アプリの実追加/カーソル進行でversionを更新するとvisible sentinelでも次を取得できる。空応答でversionを進めない。manual/retryは同一versionでも要求できる。明示invalidateはUIの待機を失効して自動監視を再登録し、通信をabortしない。アプリはcallbackに元のhostをcaptureし、再作成した別hostへ古いidを渡さない。

### TransferとTimelineの契約

forms-21 原文: **TransferList / PickList — 左右移動、検索、複数選択、順序変更**。data-11 原文: **Timeline / ActivityLog — 日時、種別、詳細展開、追加読込み**。

TransferList / PickList

- selector `ui-transfer-list` / `ui-pick-list`、`TransferList<T>`。CVA値は `readonly (string | number)[] | null`。キー順が選択済みの順序。`items` / `keyField` / `labelField`、`controlId` / `label` は必須。
- `disabledField` / `hiddenField` は任意のbooleanプロパティ。未設定値はfalse。非表示項目とdisabled選択はCVA値から削除しない。変更不可をnative checkbox/actionのdisabledで示す。
- `sourceLabel` / `targetLabel`、`searchable`、`locale`、`reorderable`、`maxSelected`、共通ValueControlの `required` / `readonly` / `disabled` / `busy` / `hint` / `error` を接続。
- 両側の native checkbox が一括移動する一時的なチェック状態。全選択のscopeは**今の検索に一致する表示中・有効な項目すべて**。disabled/非表示/検索外の値を解除しない。検索外に保持したチェックも、別scopeの一括移動で移動しない。
- 一括追加で上限を超えると全件拒否する。一括削除で上限超過を修復できる。requiredエラーでもユーザーの削除は許可する。配列以外・重複・unknownキーは表示説明とValidatorを出し、その値を保持する。ユーザー操作で不正値を勝手に正規化しない。アプリの `FormControl.reset()` で修復。
- `canTransfer: (TransferChange<T>) => boolean` は移動batch、`canReorder: (TransferReorder<T>) => boolean` はcanonical移動位置を判定。省略時許可、指定時はtrueのみ許可。例外とundefinedはfail closed。関数は同期・純粋で、I/O/実保存/実Undo/業務上の認可はアプリが所有する。
- `transferred` / `reordered` と継承 `valueChange` が意図と変更値を返す。順序のキー解決で、フィルタした画面indexを元配列へ流用しない。
- 接続CDK dragの候補↔選択、選択内並べ替えに加え、追加・削除・上へ・下へのnative buttons。移動ハンドルを押すとdraftを開始し、左右キーで両側、上下/Home/Endで対象位置、Enter/Spaceで確定、Escapeで取消。RTLで左右の意味を対応。draft中にCVA値を確定しない。
- pointerとdraftはOverlayRegistryの `kind:'operation'` をregister。子が消費したEscapeとIMEを尊重。終了・取消・破棄で同期解除する。CDK endedはdroppedに先行するのでsnapshotをepoch付きmicrotaskで清掃。候補/値/状態/検索/ポリシー/方向更新後の古いdropは拒否。`invalidatePending()` はアプリの同一turn更新前の明示失効。
- `ng-template uiTransferItem [uiTransferItemOf]="items"` は補助内容。typed context は `$implicit` / `key` / `label` / `side` / `index` / `pageIndex` / `count` / `checked` / `selected`。indexは左の元catalogまたは右の元選択配列index。pageIndexは現在の表示index。native checkbox labelは部品が維持し、投影template内の操作を所有focus helperの対象にしない。

Timeline / ActivityLog

- selector `ui-timeline` / `ui-activity-log`、`Timeline<T>`。`items` / `keyField` / `labelField` / `label`、`dateTimeField` / `typeField` / `timeZone` 必須。アプリの配列順で表示する。並び順や業務種別の意味はアプリが決める。
- 日時はオフセット付きISO文字列、有限epoch milliseconds、または有効なDate。civil date/オフセット無しのlocal datetimeは拒否。`Intl.DateTimeFormat(locale, {...dateTimeOptions, timeZone})` で表示し、native `time.datetime` にUTC ISOを残す。null/undefinedは未取得、無効値は明示エラー。元の項目を保持する。`dateTimeOptions` 既定はmedium日時/short時刻。
- `typeField` の説明を文字で表示し色だけに依存しない。欠損と不正値を区別する。`detailsField` または詳細templateがある場合にnative `details` / `summary` を出す。折畳み中も詳細DOM/編集を保持。
- `expandedKeys` / `expandedKeysChange` で外部制御、省略時はローカル状態。focusが閉じられる詳細内に残る場合だけそのsummaryへ戻す。外部focusは奪わない。
- `ng-template uiTimelineItem [uiTimelineItemOf]="items"` のslot既定 `item`、`uiTimelineItemSlot="details"` は詳細。typed contextは `$implicit` / `key` / `label` / `index` / `pageIndex` / `count` / `type` / `dateTime` / `expanded`。
- `loadMore` をtrueにすると同じ `InfiniteScroll` hostを使う。`loading` / `finished` / `loadError` / `disabled` / `autoLoad` / `observerRoot` / `rootMargin` / `resetKey` / `contentVersion` / `loadingMessage` / `endMessage` を委譲。
- `loadRequested` は同じ要求元hostが発行した未完了要求のidとreason。idの恒久・別bundle間の一意性を保証しない。アプリは実取得して結果を確認し、**同じTimeline host**の `completeLoad(id)` / `failLoad(id,message)` でackする。受理を確認してデータを追加する。finished/追加items/I/O/backend/実取消はアプリが所有。部品は成功やデータ追加を先取りしない。
- ackは同じ未完了id・同じresetKey・同じInfiniteScroll hostにのみ適用。終端/失敗/再試行、古いquery、loader再作成、破棄後を区別する。`invalidatePending()` はアプリの同一turn条件変更前の明示失効。

共通: 意味tokenのみ、guided/denseを外部profileで切替、RTL/狭幅/文字拡大。色/余白のprimitive直参照、全ソースAST逸脱検査、backend成功/スクリーンリーダー/Firefox/Safari/実利用評価の合格主張はしません。

## 全カテゴリの拡張API

既存部品を含む要求の正本は[181行のマトリクス](ui-library-matrix.json)。以下は公開barrelの型、各制御項目、失敗/復旧、native操作、生成consumerの供給条件を記す。元の仮部品名と公開名の対応も各契約に含む。

- [Tree / TreeSelect / Cascader / OrganizationChart](ui-library-tree-expansion-spec.ja.md)
- [Scheduler / Agenda](ui-library-scheduler-expansion-spec.ja.md)
- [DataTableの全機能、DataGrid/TreeGrid、列設定・編集・検索・出力](ui-library-table-expansion-spec.ja.md)
- [File / PDF / Image / media / QR・Barcode](ui-library-media-expansion-spec.ja.md)
- [Chart / Map / Gantt / Kanban / Spreadsheet / editor / explorer / flow / chat](ui-library-specialist-expansion-spec.ja.md)
- [全入力のフォーム接続・locale/日付書式・RTL/CDK・profile](ui-library-runtime-foundation-spec.ja.md)
- [生成後の独立consumer・runtime依存・worker/asset/NOTICE](ui-library-consumer-guide.ja.md)

exactソースから取得した[prop/event/method/型とexport一覧](ui-library-api.json)は`node scripts/catalog-api.mjs`で更新する。これはAPI目録で、全ソースのAST逸脱やアクセシビリティを検査するものではない。compiler inferenceと継承入力はstrict consumerで確認する。
