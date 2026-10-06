# 表・グリッド拡張の仕様

この仕様は表関連の原文16要求、既存TableState、最終12生成元の契約を整理する。設定の正本は `examples/ui.config.example.yaml`、部品の正本は `templates/angular/`。生成物を手編集せず、設定・生成元から同期する。本文の型名、入力名、イベント名、enum値は生成元と一致させる。

作者の実操作54件、独立consumerの重点操作56件、正式移植の型・登録検査は別の範囲である。この資料やstage履歴だけでは全181要求、統合後の正式suite、PRやmergeの完了を宣言しない。

## 原文16要求との対応

requestedControlsは原文のまま記載する。対応する操作は具体的な部品・状態・イベントに接続する。

| ID | 原文の部品 | requestedControls（原文） | 対応 |
| --- | --- | --- | --- |
| data-09 | TreeTable / TreeGrid | 階層付き表、列、展開、選択、編集 | 公開 `TreeGrid`、TreeNode、展開・選択のcontrolled state、DataGridの編集・貼付け、取得要求 |
| data-13 | TableContainer | 表題、領域名、スクロール、表示サイズ | `TableContainer` のcaption/label、scrollDirection/displaySize、位置入力とscrollChange |
| data-14 | DataTable | 列定義、検索、ソート、フィルター、選択、表示形式 | `DataTableView`、TableEditableColumn、TableState、表示enum、native表 |
| data-15 | DataGrid | セル移動、セル選択、編集、コピー・貼付け | roving cell、GridRange、CellEditor、実Clipboard、全矩形検証とアプリ応答 |
| data-17 | TableToolbar | 全体検索、列設定、一括操作、出力 | `TableToolbar`、ColumnChooser、stateChange、bulkRequested、outputRequested |
| data-18 | ColumnFilter / ColumnChooser | 列条件、表示・非表示、順序、固定、リセット | typed条件、AND/OR、列順・非表示・pin・widthをTableStateに保持 |
| data-19 | CellEditor / RowEditor | 編集、検証、確定、取消、処理中 | raw draft、saveRequested、complete/fail、取消、readonly/disabled、保持 |
| data-20 | FilterChips / SearchPanel | 適用条件、個別解除、全解除、保存条件 | 個別条件・全体検索の解除、savedSearches復元、保存intent |
| table-features-02 | 列フィルター | ON/OFF、文字・数値・日付・選択肢、複数条件 | columnFilters、ColumnFilter、TableFilter/Constraint、native不完全入力の保持 |
| table-features-05 | 列幅 | 自動調節ON/OFF、固定幅、最小・最大幅、手動リサイズ | autoWidth/autoFit、width/minWidth/maxWidth、測定、native range、TableColumnResize |
| table-features-07 | ヘッダー | 固定ON/OFF、多段見出し、列グループ | stickyHeader、TableHeaderGroup、colSpan/rowSpan、headers関連 |
| table-features-08 | 固定表示 | 左右の固定列、固定行、集計フッター | logical start/end pin、fixedStartKeys/fixedEndKeys、stickyFooter、実測offset |
| table-features-11 | 行の詳細 | 展開、操作ボタン、グループ化、集計 | detail投影、expandedKeys、rowActions、groupBy、collapsedGroupIds、集計 |
| table-features-12 | 編集 | なし／セル／行、検証、確定、取消 | editMode、CellEditor/RowEditor、requestId応答、表示変更の保留 |
| table-features-14 | データ処理 | アプリ内処理／サーバー処理、追加取得、仮想スクロール | mode、追加取得のrequest/complete/fail、CDK fixed-size、通常表への復旧 |
| table-features-16 | 出力 | コピー、CSV出力、印刷、出力対象の指定 | TableOutputScope、matrix/textのintent、Clipboard/CSV/print adapter |

## 公開部品・型と生成元

12ファイルは `table-model.ts`、`table-advanced-model.ts`、`table-runtime.ts`、`table-column-resize.ts`、`table-controls.ts`、`table-editors.ts`、`data-grid.ts`、`tree-grid.ts`、`virtual-data-table.ts`、`table-output.ts`、`data-table.ts`、`data-table-view.ts`。既存 `table-model.ts`、`data-table.ts`、`data-table-view.ts` を拡張し、残り9ファイルを追加する。共有tree-model/tree-load-sequenceはtree部品の契約を再利用する。新しい依存や有償table engineは追加していない。

公開部品は `DataTable`（`table[uiTable]`）、`TableContainer`（`ui-table-container`）、`DataTableView`（`ui-data-table`）、`TableTemplate`、`DataGrid`、`TreeGrid`、`VirtualDataTable`、`CellEditor`、`RowEditor`、`ColumnFilter`、`ColumnChooser`、`FilterChips`、`SearchPanel`、`TableToolbar`、`TableColumnResize`。

公開barrelの `GridCell` は既存のlayout directiveを保持する。表の座標型は `TableGridCell` としてalias公開し、形は `{row:number;column:number}`。`GridRange` は `{anchor:TableGridCell;focus:TableGridCell}`。座標は0起点で、業務キーとは別の型である。

`TableKey = string | number`。業務行キーには空でない文字列または有限数値を使い、対象内で一意にする。`keyField` と列の `field` は `keyof T & string`。rows、columns、state、tree nodesはimmutable参照で渡す。入力objectを同じ参照のまま変更したことまで自動検出する契約を作らない。

### 列・状態・編集の型

| 型 | フィールド |
| --- | --- |
| TableColumn<T> | `id:string`、`field:keyof T & string`、`header:string`、`type?:'text'\|'number'\|'date'\|'boolean'`、`format?:(value:unknown,row:T)=>string`、`sortable?`、`filterable?`、`options?:readonly {value:string;label:string}[]`、`width?`、`minWidth?`、`maxWidth?`、`pinned?:'start'\|'end'` |
| TableEditableColumn<T> | TableColumnに `editable?`、`required?`、`minimum?`、`maximum?`、`parseDraft?:(raw:string,row:T)=>unknown`、`validateValue?:(value:unknown,draftRow:T,originalRow:T)=>string\|null` を追加 |
| TableState | `page:number`、`pageSize:number`、`search:string`、`sort:readonly TableSort[]`、`filters:readonly TableFilter[]`、`columnOrder:readonly string[]`、`hiddenColumns:readonly string[]`、`columnWidths:Readonly<Record<string,number>>`、`pinnedColumns:Readonly<Record<string,'start'\|'end'\|'none'>>` |
| TableSort | `column:string`、`direction:'asc'\|'desc'` |
| TableFilter | `column:string`、`match:'and'\|'or'`、`constraints:readonly TableConstraint[]` |
| TableConstraint | `operator:TableOperator`、`value?:string\|number\|boolean` |
| TableEditChange | `column:string`、`field:string`、`previousValue:unknown`、`value:unknown`、`raw:string` |
| TableEditRequest<T> | `requestId:number`、`key:TableKey`、`row:T`、`changes:readonly TableEditChange[]`、`value:T` |

`TableOperator` は `contains`、`startsWith`、`eq`、`gte`、`lte`、`before`、`after`、`missing`。TableFilter.matchは必須で、単一条件でも `'and'` または `'or'` を指定する。`createTableState(pageSize?)` は初期stateを作り、`cloneTableState` はsort/filterの子配列と列のrecordを共有しないsnapshotを作る。永続保存はアプリが担当する。

## DataTableViewの入力とイベント

`caption`、`tableId`、`rows`、`columns`、`keyField`を指定する。`tableId`、gridId、controlIdは同じdocument内のDOM関連が重ならないようアプリが割り当てる。追加の設定は次の機械名を使う。

| 用途 | 入力 |
| --- | --- |
| 処理・状態 | `state:TableState`、`mode:'client'\|'server'`、`totalItems:number\|null`、`dataState:TableDataState`、`disabled:boolean`、`retryAvailable:boolean` |
| 検索・並べ替え | `globalSearch:boolean`、`searchColumns:readonly string[]\|undefined`、`sortable:boolean`、`sortMode:'single'\|'multiple'`、`columnFilters:boolean` |
| ページ | `pagination:boolean`、`pageSizeOptions:readonly number[]` |
| 列と見出し | `autoWidth:boolean`、`autoFit:'content'\|'available'`、`columnControls:boolean`、`resizableColumns:boolean`、`columnGroups:readonly TableHeaderGroup[]`、`stickyHeader:boolean` |
| 選択 | `selectionMode:'none'\|'single'\|'multiple'`、`selectedKeys:readonly TableKey[]`、`rowSelectable:(row:T)=>boolean`、`selectAllScope:'page'\|'filtered'` |
| 詳細・行操作 | `expandedKeys:readonly TableKey[]`、`rowActions:readonly TableRowAction<T>[]` |
| 編集 | `editMode:'none'\|'cell'\|'row'` |
| 固定・group・集計 | `fixedStartKeys`/`fixedEndKeys:readonly TableKey[]`、`groupBy:readonly string[]`、`collapsedGroupIds:readonly string[]`、`aggregates:readonly TableAggregate[]`、`aggregateScope:'page'\|'filtered'\|'supplied'`、`stickyFooter:boolean` |
| 仮想化 | `virtualize:boolean`、`virtualHeight:number\|null`、`virtualRowHeight:number\|null`、`virtualOverscan:number`、`nativeViewAvailable:boolean` |
| 追加取得 | `moreAvailable:boolean`、`moreFinished:boolean`、`loadingMore:boolean`、`moreError:string\|null`、`autoLoadMore:boolean`、`moreResetKey:string\|number` |
| 出力・一括操作 | `showOutput:boolean`、`bulkActions:readonly TableBulkAction[]` |
| 表示 | `striped:boolean`、`borders:boolean`、`hoverRows:boolean`、`rowSpacing:'profile'\|'compact'\|'comfortable'`、`wrapCells:boolean`、`ellipsis:boolean`、`locale:string`、`missingLabel:string` |

`TableDataState` は `{kind:'ready'}` または `{kind:'loading'|'updating'|'error'|'partial';message:string}`。部分欠損や古い情報を成功・全取得済みへ置き換えない。loading/updatingは操作を抑止し、retryはアプリへ再試行意思を返す。

| イベント | ペイロードと用途 |
| --- | --- |
| stateChange | `TableState`。アプリが新stateを入力へ反映する |
| selectedKeysChange / expandedKeysChange | `readonly TableKey[]`。raw業務キーを維持する |
| collapsedGroupIdsChange | `readonly string[]` |
| saveRequested / rowsChange | `TableEditRequest<T>` / `readonly T[]`。rowsChangeは有効な確認応答による確定時 |
| rowAction | `{action:string;row:T;key:TableKey}`。TableRowActionのid/label/disabled predicateを使用 |
| bulkRequested | `{action:string;keys:readonly TableKey[]}`。選択キーの一括処理intent |
| outputRequested | `TableOutputIntent & {matrix:readonly (readonly string[])[];text:string;rowCount:number;columnIds:readonly string[]}` |
| loadMoreRequested | `CollectionLoadRequest = {id:number;reason:'button'\|'intersection'\|'retry'}` |
| virtualRangeChange | `{start:number;end:number}`。CDKのrendered range |
| virtualPositionChange | `{offset:number;index:number}`。実スクロールoffsetと行index |
| nativeViewRequested / retry | `void`。通常表への切替／再取得をアプリへ要求 |

公開メソッドは `completeEdit(requestId,row?)`、`failEdit(requestId,message)`、`invalidatePending()`、`scrollToIndex(index)`、`scrollToOffset(offset)`、`completeLoad(requestId)`、`failLoad(requestId,message)`。受付可否をbooleanで返すものは、要求ID・現在の入力・寿命が一致したときだけtrueとなる。`displayTableState()` と `displayStateDeferred()` は、active editorを消す表示変更の保留状態を示す。

## 列条件、検索、列設定

`ColumnFilter` は `column`、`controlId`、`filter:TableFilter|null`、`disabled`を受け、`filterChange:TableFilter|null`を返す。文字はcontains/startsWith/eq、数値はeq/gte/lte、日付はeq/before/after、boolean・選択肢はeqを使い、missingも指定できる。複数条件の結合は同じ列内でAND/OR、複数の列条件はAND。未入力の比較条件はinactive metadataとして保持し、missingは値なしでも有効である。numeric 0、boolean falseを未入力と混同しない。

number/dateのnative badInputは本当のclearから分ける。途中の `-` や不完全日付の間は直前の有効条件を保持し、aria-invalidとstatusで伝える。有効なraw表記もtyped valueから分け、`-0.5`、`0.25`、`1.20`などを数値再bindingで消さない。外部clearや保存条件の復元では、そのstateの表示へ同期する。columnFiltersをOFFにしても保存済みfiltersは消さず、client評価の対象から外す。

single/multipleのsortはasc→desc→解除の状態とTableState.sortへ接続する。clientでは取得済みrowsを検索・filter・安定sort・page処理する。missingはsort方向を変えても既知値の後ろに置く。serverでは渡されたrowsをそのまま表示し、client queryを重ねない。

`ColumnChooser` は `columns`、`state`、`disabled`、`resizable`、`measuredWidths:Readonly<Record<string,number>>`を受け、`stateChange`を返す。表示/非表示、前/後の順序変更、logical start/end固定、幅変更、列設定resetをTableStateへ反映する。最後の一列を非表示にしない。`pinnedColumns[id]='none'` は列の初期pinを解除する。列resetはcolumnOrder/hiddenColumns/columnWidths/pinnedColumnsだけを戻し、検索・filterは別の解除操作とする。

`FilterChips` はcolumns/state/disabledとstateChangeを持つ。列条件一つの解除、全体検索の解除、全解除を提供する。`SearchPanel` はこれにlabel/savedSearchesを持ち、`saveRequested:{label:string;state:TableState}`を返す。`SavedTableSearch={id:string;label:string;state:TableState}`はアプリが供給する。named snapshotの復元は深いstate cloneを使用する。

`TableToolbar` はcolumns/stateに加えlabel/disabled/busy/searchable/chooseColumns/outputs/selectedKeys/bulkActionsを受ける。stateChange、bulkRequested、outputRequestedを返す。`TableBulkAction={id:string;label:string;disabled?:boolean}`。busy/disabledや選択なしで一括操作を抑止する。保存・送信・業務処理の結果はtoolbarの発火から推定しない。

## 幅、多段見出し、固定表示、行group

幅はDOMのborder-box pxであり、テーマのprimitive定数を部品へ埋め込まない。明示state.columnWidths、column.width、auto測定/配分を区別する。autoWidth=falseでも明示幅とmin/maxは有効。contentは内容幅を測定し、availableは利用可能幅をflexible列へ配分する。明示minWidth/maxWidthがなければ、minimumはprofileのsemantic幅から測る。

`TableColumnResize`（`[uiTableColumnResize]`）はlabel/value/minimum/maximum/disabledを受け、resizeChange:number、resizeCancelled:voidを返す。pointer dragとnative rangeを併設し、Home/Endと左右キー、Shift付き小さいstepで操作できる。RTLではphysical pointer deltaと左右キーの方向を反転する。pointer cancelは開始幅へ戻し、capture・observer・listenerは破棄時に終了する。profile/scope/hidden復帰の幅変化はResizeObserverで再測定し、既存のユーザー指定幅は有効な範囲に保持する。

`TableHeaderGroup={id:string;label:string;children:readonly (string|TableHeaderGroup)[]}`。childrenの文字列はColumn.idである。不明列、重複leaf/group、cycleを設定エラーにする。任意深さのgroupからnative th scope=colgroup/col、colSpan/rowSpanとtd.headersを作る。非表示・順序変更後に連続でなくなったgroupは適切な複数header cellへ分け、欠けた列の穴を残さない。

pinはlogical start/endで指定し、LTR/RTLに応じた左右のedgeで作用する。header/body/aggregate footerは同じ幅とpin offsetを共有する。stickyHeaderとstickyFooterの縦固定、column pinの横固定は別設定である。fixedStartKeys/fixedEndKeysは取得済み業務キーで、複数固定行の高さとheader/footerを実測して重なりを防ぐ。固定領域がviewportを使い切る場合は本文一行の領域も確保し、必要なnative scrollを残す。

groupByは列IDを順に指定し、再帰的なrow groupを作る。collapsedGroupIdsで閉じた行も編集DOMを保持し、再展開で未保存入力を戻す。group keyの重複・不明列は成功結果にしない。`TableAggregate={column:string;kind:'sum'|'average'|'min'|'max'|'count';label?:string}`。`TableAggregateValue`にはvalue:number|null、known:number、missing:numberを含む。全欠損のsum/average/min/maxはnull、既知値0のsumは0。countも対象型の既知値だけを数え、型不正・invalid Dateを既知として扱わない。

### 投影と詳細行

TableTemplateは `ng-template[uiTableCell]` または `ng-template[uiTableDetail]`。列IDはuiTableCell、型推論用rowsは `[uiTableTemplateOf]`で指定する。typed contextは `$implicit:T`、`value:unknown`、`column:TableColumn<T>|null`。`let-row`は行全体、`let-value="value"`はそのセルの値を受ける。detailではcolumn=null。投影内容のnative semanticsや業務inputをアプリが所有する。

```html
<ui-data-table caption="申請一覧" tableId="requests"
  [rows]="rows()" [columns]="columns" keyField="id">
  <ng-template uiTableCell="name" [uiTableTemplateOf]="rows()"
    let-row let-value="value" let-column="column">
    <span>{{value}}</span>
  </ng-template>
</ui-data-table>
```

## 編集、応答、入力保持

CellEditorはrow/keyField/controlId/label/column、RowEditorはrow/keyField/controlId/label/columnsを受ける。共通入力はeditLabel/locale/missingLabel、restoreStartFocus/tabEntry、disabled/busy/readonly。共通イベントはsaveRequested:TableEditRequest<T>、rowChange:T、editingChange:boolean。CellEditorの入力集合はlabelled group、RowEditorはlabelled regionとして示す。

raw文字列をtyped valueから分ける。required、options、minimum/maximum、厳密な数値、civil日付、parseDraft、validateValueを検証し、cross-field検証は全draftを反映した行に対して行う。キーfieldとeditable=falseの列は編集しない。0/false/null、不完全raw、parser/validator例外、invalid Dateを区別する。errorの間は保存要求を出さない。

beginEdit/isEditing/pendingRequestId、complete(requestId,confirmed?)、fail(requestId,message)、cancelEdit/invalidatePendingを公開する。Enterは保存、Escapeは取消の意思として扱い、IME/composition/keyCode229/defaultPreventedを尊重する。pending/busyではtext inputをreadonlyにしてrawを保持し、selectや再操作を抑止する。UIの取消をbackendの処理取消へ読み替えない。

saveRequestedの時点ではrowsを変更せず、requestId、業務キー、編集対象のpreviousValue、現在の列定義が一致したcompleteだけで確定する。confirmed rowも同じキー・validationを満たす必要がある。failはraw draftを残して再試行を可能にする。別キー、原値の外部変更、列の変更、invalidate、destroy後の古い応答は拒否する。親の入力変更と旧応答を同じturnで扱う場合は、アプリが親変更前にinvalidatePendingを呼ぶ。

通常表の標準検索、列条件、page、列非表示がactive editorを消す場合は、displayTableStateで直前の表示を保持して変更を保留する。先に保存または取消してから要求した表示へ移る。並べ替え・列幅など同じeditorを保持できる変更まで一律に止めない。group collapseやprofile切替でも同じdraftを保つ。外部アプリが業務行/キーを削除する処理は、アプリの未保存判断に接続する。

完了・取消のfocus復帰は、自前control/editorから開始した操作に限る。投影input、外部input、別widgetへ移ったfocusを取り戻さない。表示中の操作が消える場合も自前のfocusだけを有効な領域へ退避する。

## DataGridの移動、選択、Clipboard

入力はcaption/gridId/rows/columns/keyField、disabled/busy/editable、`selectionMode:'none'|'single'|'range'`、`selection:GridRange|null`、locale/missingLabel/emptyLabel、clipboardWriter/clipboardReader。row選択は別に `rowSelection:'none'|'single'|'multiple'`、selectedKeys、treeRowsを持つ。セルのrangeと業務行選択を同じ値として扱わない。

イベントはselectionChange:GridRange、selectedKeysChange:readonly TableKey[]、saveRequested、pasteRequested:GridPasteRequest<T>、rowsChange、treeToggleRequested:string。GridPasteRequestはrequestId、開始時rows、changes（requestIdを除く行編集要求の配列）、matrix、start:TableGridCellを含む。

grid/gridcellとroving tabindexを使い、矢印、Home/End、Ctrl/Meta付きHome/End、PageUp/PageDown、F2/Enter、Shift+移動の矩形選択を接続する。RTLで左右のphysical移動を反転する。editor内の入力キー、IME、defaultPreventedを横取りしない。Tabでセルwidgetからnative操作へ移れる。

Ctrl/Meta+Cやコピー操作は選択rectangleのraw値をquoted TSVで書き出す。数値0・falseやembedded tab/newline/quoteを保持する。`copy():Promise<boolean>`、`readPaste():Promise<boolean>`はClipboard API受付を示し、保存先での永続性を保証しない。writer/readerを明示すればアプリのClipboard実装へ接続できる。

native paste eventまたはreadPasteでTSVを厳密解析する。不揃いの列数、壊れたquote、表の範囲外、readonly/key列、requiredやtyped validationの不正は全rectangleを拒否する。一行だけを先取りで反映せず、保存要求を出さず、元rowsを保持する。有効なrectangleだけpasteRequestedを発行し、completePaste(requestId,confirmed?)で一致したアプリ結果を反映する。failPasteは内容を保持し、retryPasteで現在のキー・列を確認して再試行できる。

Clipboard読取り中は開始した業務キー、列ID、rows/columnsの参照、選択先、編集状態とgenerationを記録する。読取り後に別セルへfocusした結果やsource/columns/edit/invalidate/destroy/連続requestで失効した結果を、その時点の別セルへ保存要求として適用しない。部品を除去した後のClipboard結果も受付を終える。

## TreeGridの階層と取得

caption/gridId/nodes/columns/keyField、expandedIds/selectedIds、`selectionMode:'none'|'single'|'multiple'`、editable/disabled/busy/localeを受ける。各TreeNode<T>は安定したUI文字ID id、label、業務rowを持つdataを指定する。data内の業務キーはTableKeyで、UI node IDとは別に保持する。children未指定かつhasChildren=trueは未取得、children=[]は取得済み葉を意味する。

expandedIdsChange/selectedIdsChangeはUI node ID配列、nodesChangeは確認済み業務rowを反映したtree、saveRequested/pasteRequestedはraw業務キーを含む編集要求。treegridのrowにはlevel/position/setSize/expanded/busy/selectedを接続し、先頭セルの左右キーと明示buttonで開閉する。Spaceで有効な行を選び、子から親へ戻れる。ancestor disabledも尊重する。

未取得nodeの展開は `loadRequested:TreeLoadRequest={nodeId:string;path:readonly string[];requestId:number}` を返す。`resolveLoad(requestId,children)`、`failLoad(requestId,message)`は一致したsource/requestだけを受け付ける。重複IDや不正階層を取得成功として追加しない。TreeLoadCancellationのreason型はcollapse/source-change/reset/invalidate/destroy/close。loadCancelledは部品が生存中のUI取消意思を返す。破棄後はemitせず受付を閉じるため、transport abortとアプリ全体の破棄はアプリが接続する。

編集・pending pasteを捨てる階層の閉じる要求はdisplayExpandedIds/collapseDeferredIdsで保留し、statusで伝える。保存・失敗・取消後もraw入力とmatching/stale応答の区別を維持する。completeEdit/failEdit、completePaste/failPaste、invalidatePendingはDataGridの応答契約と取得受付へ接続する。

## 仮想化・追加取得・通常表への復旧

VirtualDataTableはcaption/tableId/rows/columns/keyFieldとstate、disabled/busy、height/itemHeight（number|null）、overscan、locale/missingLabel/sortable、selectionMode/selectedKeys/rowSelectable、cellTemplatesを受ける。sortRequested:string、selectedKeysChange、columnWidthsChange:Readonly<Record<string,number>>、rangeChange:{start;end}、positionChange:{offset;index}を返す。

Angular CDK 22.2.1の公開fixed-size scrolling APIを用い、取得済み全rowsをhidden DOMへ残さずviewportと小さいbufferだけ描画する。ARIA table/rowgroup/row/columnheader/cellの関係、取得済みrowcount、各rowindexを保つ。高さは明示itemHeightまたはsemantic tokenの測定値を使い、profile・200%文字拡大で行高が変わったときに同じindexを保つ。scrollToIndex/scrollToOffsetはinstantで移動し、Home/End/Pageキーも接続する。

固定行高の既定セルは単行とnativeセル内横scrollを使う。長い値はセルへTabで入り、左右キーでも読める。投影templateの必要なitemHeightはアプリが確保する。cellTemplatesの列IDはown entryだけを参照する。

DataTableViewのvirtualizeと編集、group、多段見出し、固定列・行、aggregate、detail、rowActionsの同時設定は、本版では設定エラーである。各機能は通常表で提供する。復旧可能なアプリはnativeViewAvailable=trueとnativeViewRequestedを接続し、controlled virtualize=falseへ切り替える。busy/disabled中は切替を抑止する。未対応組合せを汎用wrapperで完成扱いにしない。

```html
<ui-data-table caption="取得済み申請" tableId="acquired"
  [rows]="rows()" [columns]="columns" keyField="id"
  [virtualize]="virtual()" [nativeViewAvailable]="true"
  (nativeViewRequested)="virtual.set(false)" />
```

追加取得はmoreAvailable/moreFinished/loadingMore/moreError/moreResetKeyとloadMoreRequested/completeLoad/failLoadに接続する。client/serverともアプリがrowsを追加して終端を供給する。通常表のautoLoadMoreは観測による要求、virtual時は明示buttonで取得する。同じpending tokenの連打を抑止し、fail後にretryを残す。serverの総件数・検索結果の全行・backend取消は部品が作らない。

## 出力対象とI/Oの境界

`TableOutputScope` は `'page'|'filtered'|'selected'|'supplied'`。TableOutputIntentは `{format:'copy'|'csv'|'print';scope:TableOutputScope}`。DataTableViewは現在のvisible columns順で見出し付きmatrix/textとraw columnIdsを作る。

| scope | 対象 |
| --- | --- |
| page | 現在受け取って表示するページ |
| filtered | client query後の取得済みrows。serverでは受信済みrows |
| selected | supplied内で選択キーに一致する取得済み行。filterで隠れた選択も含む |
| supplied | アプリから受け取ったrows全体 |

未知の選択キーや未取得server行を生成しない。Gridのcopyはformat済みtable出力と別にraw draft形式のセルrectangleを使う。

`copyTableMatrix(matrix,writer?):Promise<void>` はTSV Clipboard write Promiseをawaitする。失敗はrejectionとして呼出し側で扱う。`downloadTableCsv(matrix,filename,document?)` はBOM付きUTF-8 CSVを作り、quote/tab/newlineを保持する。CSVのformula様文字列は既定でspreadsheet-safeにする。URLと一時anchorを後始末するが、利用者が選んだ保存先への永続保存はブラウザー・アプリの確認に委ねる。

`createTablePrintDocument(matrix,title,document?,scope?)` は `{frame,print,destroy}` を返す。textContentで表を作り、先頭matrix行を列見出しとする。scopeからsemantic font/space/color/borderとdirectionを印刷documentへ伝える。アプリがprintを呼び、afterprint等でdestroyする。確認したのはframeの行・見出し・profile tokenとnative print呼出しであり、実プリンターの完了ではない。

## raw ID、欠損、profile、方向、寿命

空・重複の列IDは設定エラーにするが、受理済みの任意文字列を予約名という理由で狭めない。constructor/__proto__のerror、paste draft、測定/計算widthをnull-prototype recordで保持し、外部のcolumnWidths/pinnedColumns/template mapはObject.hasOwnによるown entryを読む。Object.fromEntriesとcomputed-key updateでraw IDを保持する。業務DTOのown __proto__/constructor fieldもimmutable spreadで保持し、prototypeを業務値で変更しない。

DOM IDだけを安全なtokenへ変換し、selection/state/column/key/Clipboard/save payloadはraw値を保つ。well-formed単tokenは従来encodeURIComponentと同じ。受理済みlone surrogateは `%u` と全UTF16 unitの固定4桁hexで区別し、literal percentのURI namespaceと衝突しない。複合tokenは各部分のhyphenをescapeし、group a-b＋leaf cとgroup a＋leaf b-cを区別する。editor field namespaceと列IDもpairにし、列cのerror suffixと列c-errorのinputが同じIDにならない。tableDomIdToken/tableDomIdPair/tableOwnValueは内部direct-module helperで公開barrelの追加はない。

native caption/th scope/headers、label.control、aria-describedbyを保ち、必要な操作を狭幅だけで除外しない。TableContainerのlabelは領域名、captionは表示表題、DataTable.captionはnative表題である。TableContainerはscrollDirection=`'inline'|'block'|'both'|'none'`、displaySize=`'content'|'viewport'`、height/maxHeight、scrollTop/scrollLeft（各number|null）、scrollChange:{top:number;left:number}を持つ。有限の位置をnative領域へ適用し、RTLのnative scrollLeftも勝手に別座標へ正規化しない。

profileは有効なdata-ui-profileで選ぶ。tableの余白、文字、focus、列の最低幅、viewport、色は用途別semantic tokenから使う。profile/scope/hidden変化は測定へ反映し、native editorのDOMを作り直さない。rowSpacingのenumは既存の表示選択であり、旧density/preset互換APIを追加しない。RTLはlogical pin、text-align、indentとphysicalキー操作を接続する。virtual移動はinstantで、操作を装飾animationの完了に依存させない。アプリが追加するsmooth移動等はreduced-motion設定へ接続する。

null/undefined、typed値の不正やinvalid DateはmissingLabelで伝え、0/falseを欠損へ変えない。処理中・部分欠損・結果不明を成功表示へ変えない。listener、observer、CDK subscription、pointercapture、pending/Clipboard generationは破棄時に後始末する。保存、取得、送信、実Undo、永続性、OS権限、業務安全範囲はアプリが担当する。

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
