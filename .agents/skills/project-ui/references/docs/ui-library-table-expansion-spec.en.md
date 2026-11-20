# Table and grid consumer contracts

[Japanese](ui-library-table-expansion-spec.ja.md)

Import public components from generated `angular/index.ts`. Synchronize/check after app configuration changes; do not hand-edit generated files.

## Public components and types

Public components: DataTable (`table[uiTable]`), TableContainer (`ui-table-container`), DataTableView (`ui-data-table`), TableTemplate, DataGrid, TreeGrid, VirtualDataTable, CellEditor, RowEditor, ColumnFilter, ColumnChooser, FilterChips, SearchPanel, TableToolbar, TableColumnResize.

Public barrel GridCell remains the existing layout directive. Table coordinates are aliased as TableGridCell, shaped `{row:number;column:number}`. GridRange is `{anchor:TableGridCell;focus:TableGridCell}`. Coordinates are zero-based, distinct from business keys.

TableKey is string|number; use unique nonempty strings/finite numbers within the target. keyField and column field are `keyof T & string`. Supply immutable references for rows/columns/state/tree nodes. In-place changes through the same input-object reference are not automatically detected by contract.

### Column, state and editing types

| Type | Fields |
| --- | --- |
| TableColumn<T> | `id:string`, `field:keyof T & string`, `header:string`, `type?:'text'\|'number'\|'date'\|'boolean'`, `format?:(value:unknown,row:T)=>string`, `sortable?`, `filterable?`, `options?:readonly {value:string;label:string}[]`, `width?`, `minWidth?`, `maxWidth?`, `pinned?:'start'\|'end'` |
| TableEditableColumn<T> | Extends TableColumn with `editable?`, `required?`, `minimum?`, `maximum?`, `parseDraft?:(raw:string,row:T)=>unknown`, `validateValue?:(value:unknown,draftRow:T,originalRow:T)=>string\|null` |
| TableState | `page:number`, `pageSize:number`, `search:string`, `sort:readonly TableSort[]`, `filters:readonly TableFilter[]`, `columnOrder:readonly string[]`, `hiddenColumns:readonly string[]`, `columnWidths:Readonly<Record<string,number>>`, `pinnedColumns:Readonly<Record<string,'start'\|'end'\|'none'>>` |
| TableSort | `column:string`, `direction:'asc'\|'desc'` |
| TableFilter | `column:string`, `match:'and'\|'or'`, `constraints:readonly TableConstraint[]` |
| TableConstraint | `operator:TableOperator`, `value?:string\|number\|boolean` |
| TableEditChange | `column:string`, `field:string`, `previousValue:unknown`, `value:unknown`, `raw:string` |
| TableEditRequest<T> | `requestId:number`, `key:TableKey`, `row:T`, `changes:readonly TableEditChange[]`, `value:T` |

TableOperator is contains/startsWith/eq/gte/lte/before/after/missing. TableFilter.match is required: use and/or even for one constraint. createTableState(pageSize?) initializes state; cloneTableState snapshots nested sort/filter arrays and column records without sharing them. The app owns persistence.

## DataTableView inputs and events

Provide caption/tableId/rows/columns/keyField. Assign tableId/gridId/controlId so DOM relationships do not collide within the document. Additional inputs use these machine names:

| Purpose | Inputs |
| --- | --- |
| Processing/state | `state:TableState`, `mode:'client'\|'server'`, `totalItems:number\|null`, `dataState:TableDataState`, `disabled:boolean`, `retryAvailable:boolean` |
| Search/sorting | `globalSearch:boolean`, `searchColumns:readonly string[]\|undefined`, `sortable:boolean`, `sortMode:'single'\|'multiple'`, `columnFilters:boolean` |
| Paging | `pagination:boolean`, `pageSizeOptions:readonly number[]` |
| Columns/headers | `autoWidth:boolean`, `autoFit:'content'\|'available'`, `columnControls:boolean`, `resizableColumns:boolean`, `columnGroups:readonly TableHeaderGroup[]`, `stickyHeader:boolean` |
| Selection | `selectionMode:'none'\|'single'\|'multiple'`, `selectedKeys:readonly TableKey[]`, `rowSelectable:(row:T)=>boolean`, `selectAllScope:'page'\|'filtered'` |
| Details/row actions | `expandedKeys:readonly TableKey[]`, `rowActions:readonly TableRowAction<T>[]` |
| Editing | `editMode:'none'\|'cell'\|'row'` |
| Fixed/group/aggregates | `fixedStartKeys`/`fixedEndKeys:readonly TableKey[]`, `groupBy:readonly string[]`, `collapsedGroupIds:readonly string[]`, `aggregates:readonly TableAggregate[]`, `aggregateScope:'page'\|'filtered'\|'supplied'`, `stickyFooter:boolean` |
| Virtualization | `virtualize:boolean`, `virtualHeight:number\|null`, `virtualRowHeight:number\|null`, `virtualOverscan:number`, `nativeViewAvailable:boolean` |
| Incremental loading | `moreAvailable:boolean`, `moreFinished:boolean`, `loadingMore:boolean`, `moreError:string\|null`, `autoLoadMore:boolean`, `moreResetKey:string\|number` |
| Output/bulk actions | `showOutput:boolean`, `bulkActions:readonly TableBulkAction[]` |
| Display | `striped:boolean`, `borders:boolean`, `hoverRows:boolean`, `rowSpacing:'profile'\|'compact'\|'comfortable'`, `wrapCells:boolean`, `ellipsis:boolean`, `locale:string`, `missingLabel:string` |

TableDataState is `{kind:'ready'}` or `{kind:'loading'|'updating'|'error'|'partial';message:string}`. Do not replace partial/stale information with success/completely fetched. Loading/updating suppress interactions; retry returns intent to the app.

| Event | Payload/purpose |
| --- | --- |
| stateChange | TableState; the app feeds the new state back |
| selectedKeysChange / expandedKeysChange | readonly TableKey[]; preserve raw business keys |
| collapsedGroupIdsChange | readonly string[] |
| saveRequested / rowsChange | TableEditRequest<T> / readonly T[]; rowsChange occurs on accepted confirmation |
| rowAction | `{action:string;row:T;key:TableKey}` using TableRowAction id/label/disabled predicate |
| bulkRequested | `{action:string;keys:readonly TableKey[]}` selection-scoped business intent |
| outputRequested | `TableOutputIntent & {matrix:readonly (readonly string[])[];text:string;rowCount:number;columnIds:readonly string[]}` |
| loadMoreRequested | `CollectionLoadRequest = {id:number;reason:'button'|'intersection'|'retry'}` |
| virtualRangeChange | `{start:number;end:number}` CDK rendered range |
| virtualPositionChange | `{offset:number;index:number}` actual scroll offset/row index |
| nativeViewRequested / retry | void; request ordinary-table fallback/refetch |

Public methods: completeEdit(requestId,row?), failEdit(requestId,message), invalidatePending(), scrollToIndex(index), scrollToOffset(offset), completeLoad(requestId), failLoad(requestId,message). Methods returning an acceptance boolean are true only for matching request ID/current inputs/lifetime. displayTableState()/displayStateDeferred() expose display-change deferral that would remove an active editor.

## Column filters, search and column configuration

ColumnFilter takes column/controlId/filter:TableFilter|null/disabled and emits filterChange:TableFilter|null. Text supports contains/startsWith/eq; numbers eq/gte/lte; dates eq/before/after; booleans/options eq; missing is also available. Conditions combine AND/OR within a column; different columns combine AND. Empty comparisons remain inactive metadata; missing is active without a value. Numeric0/boolean false are not empty.

Native number/date badInput differs from actual clear. Incomplete minus/date drafts retain the last valid constraint and expose aria-invalid/status. Valid raw spellings remain separate from typed values: rebinding numbers must not erase -0.5/0.25/1.20. External clear/restored filters synchronize display. Turning columnFilters off retains saved filters but excludes them from client evaluation.

Single/multiple sorting follows ascending→descending→removed and TableState.sort. Client mode searches/filters/stably sorts/pages acquired rows. Missing values remain after known values in either sort direction. Server mode displays supplied rows without adding a client query.

ColumnChooser takes columns/state/disabled/resizable/measuredWidths:Readonly<Record<string,number>> and emits stateChange. Show/hide, previous/next order, logical start/end pin, widths and column reset update TableState. The final visible column cannot be hidden. pinnedColumns[id]='none' removes an initial column pin. Reset changes columnOrder/hiddenColumns/columnWidths/pinnedColumns only; search/filter clearing is separate.

FilterChips takes columns/state/disabled, emits stateChange and clears one column filter/global search/all. SearchPanel adds label/savedSearches and emits `saveRequested:{label:string;state:TableState}`. App-supplied SavedTableSearch is `{id:string;label:string;state:TableState}`. Restoring named snapshots uses deep state clones.

TableToolbar adds label/disabled/busy/searchable/chooseColumns/outputs/selectedKeys/bulkActions to columns/state and emits stateChange/bulkRequested/outputRequested. TableBulkAction is `{id:string;label:string;disabled?:boolean}`. Busy/disabled/no-selection suppress bulk actions. Emission does not establish persistence/transport/business success.

## Widths, grouped headers, fixed regions and row groups

Widths are DOM border-box pixels, not embedded theme primitive constants. Distinguish explicit state.columnWidths, column.width and automatic measurement/distribution. Explicit/min/max widths apply even when autoWidth=false. Content measures contents; available distributes available width across flexible columns. Without explicit min/max, minimum comes from measured profile semantics.

TableColumnResize (`[uiTableColumnResize]`) takes label/value/minimum/maximum/disabled and emits resizeChange:number/resizeCancelled:void. It combines pointer dragging/native range, Home/End/arrows and a smaller Shift step. RTL reverses physical pointer deltas/arrows. Pointer cancellation restores starting width; destruction releases capture/observers/listeners. ResizeObserver remeasures profile/scope/hidden-return changes and retains user widths within valid bounds.

TableHeaderGroup is `{id:string;label:string;children:readonly (string|TableHeaderGroup)[]}`; string children are column IDs. Unknown columns, duplicate leaves/groups and cycles are configuration errors. Arbitrary-depth groups generate native th scope=colgroup/col, colSpan/rowSpan and td.headers. Groups made noncontiguous by hiding/reordering split into appropriate header cells without holes for absent columns.

Logical start/end pinning maps to LTR/RTL physical edges. Header/body/aggregate footer share widths/pin offsets. Vertical stickyHeader/stickyFooter and horizontal column pins are separate. fixedStartKeys/fixedEndKeys reference acquired business keys; measured multiple-fixed-row/header/footer heights prevent overlap. If fixed regions fill the viewport, reserve a body-row region and necessary native scrolling.

GroupBy recursively groups rows by ordered column IDs. CollapsedGroupIds preserves editor DOM/drafts for reopening. Duplicate group keys/unknown columns are not successful results. TableAggregate is `{column:string;kind:'sum'|'average'|'min'|'max'|'count';label?:string}`; TableAggregateValue includes value:number|null, known:number, missing:number. All-missing sum/average/min/max are null; a known zero sums to0. Count includes only known values of the target type; invalid types/Dates are not known.

### Projection and detail rows

TableTemplate selects `ng-template[uiTableCell]` or `ng-template[uiTableDetail]`. uiTableCell is column ID; `[uiTableTemplateOf]` supplies typed rows. Context is `$implicit:T`, value:unknown, column:TableColumn<T>|null. let-row receives the row; let-value="value" receives cell value; detail column=null. Native semantics/business inputs inside projection belong to the app.

```html
<ui-data-table caption="Requests" tableId="requests"
  [rows]="rows()" [columns]="columns" keyField="id">
  <ng-template uiTableCell="name" [uiTableTemplateOf]="rows()"
    let-row let-value="value" let-column="column">
    <span>{{value}}</span>
  </ng-template>
</ui-data-table>
```

## Editing, responses and input retention

CellEditor takes row/keyField/controlId/label/column; RowEditor takes row/keyField/controlId/label/columns. Shared inputs: editLabel/locale/missingLabel, restoreStartFocus/tabEntry, disabled/busy/readonly. Shared events: saveRequested:TableEditRequest<T>, rowChange:T, editingChange:boolean. CellEditor inputs form a labelled group; RowEditor is a labelled region.

Separate raw strings from typed values. Validate required/options/minimum/maximum/strict numbers/civil dates/parseDraft/validateValue; cross-field validation receives a row incorporating all drafts. Key fields and editable=false columns are not editable. Distinguish0/false/null/incomplete raw/parser-validator exceptions/invalid Date. Errors prevent save requests.

Expose beginEdit/isEditing/pendingRequestId, complete(requestId,confirmed?), fail(requestId,message), cancelEdit/invalidatePending. Enter is save intent; Escape is cancellation intent; respect IME/composition/keyCode229/defaultPrevented. Pending/busy makes text inputs read-only while retaining raw text and suppresses selects/repeated actions. UI cancellation is not backend cancellation.

SaveRequested does not change rows. Complete commits only when requestId/business key/edited previousValue/current column definitions match; confirmed rows need the same key/validation. Fail retains raw drafts/retry. Different keys, externally changed originals, column changes, invalidation and post-destroy replies are rejected. For parent input changes plus old responses in one turn, call invalidatePending before changing the parent.

In ordinary tables, search/column filters/page/hiding that would remove an active editor retain prior display through displayTableState and defer the change. Save/cancel first, then adopt requested display. Do not block sorting/width changes that retain the editor. Group collapse/profile switching also retain drafts. External business-row/key deletion connects to app unsaved-change decisions.

Completion/cancel focus restoration applies only to actions initiated from owned controls/editors. Do not take focus from projected inputs/external inputs/other widgets. Disappearing operations transfer only owned focus to a usable region.

## DataGrid navigation, selection and clipboard

Inputs: caption/gridId/rows/columns/keyField, disabled/busy/editable, `selectionMode:'none'|'single'|'range'`, selection:GridRange|null, locale/missingLabel/emptyLabel, clipboardWriter/clipboardReader. Separate row selection uses `rowSelection:'none'|'single'|'multiple'`, selectedKeys/treeRows. Cell ranges and business-row selections are different values.

Events: selectionChange:GridRange, selectedKeysChange:readonly TableKey[], saveRequested, pasteRequested:GridPasteRequest<T>, rowsChange, treeToggleRequested:string. GridPasteRequest contains requestId, starting rows, changes (row-edit requests without requestId), matrix and start:TableGridCell.

Use grid/gridcell/roving tabindex, arrows, Home/End, Ctrl/Meta+Home/End, PageUp/PageDown, F2/Enter and Shift-movement rectangle selection. RTL reverses physical horizontal movement. Respect editor keys/IME/defaultPrevented. Tab leaves the cell widget for native controls.

Ctrl/Meta+C/copy writes raw selected-rectangle values as quoted TSV, preserving0/false/embedded tabs/newlines/quotes. copy():Promise<boolean> and readPaste():Promise<boolean> establish Clipboard API acceptance, not destination persistence. Explicit writers/readers connect app Clipboard implementations.

Native paste/readPaste strictly parse TSV. Ragged columns, malformed quotes, out-of-range rectangles, read-only/key columns and invalid required/typed values reject the whole rectangle without early row updates/save requests; original rows remain. Only valid rectangles emit pasteRequested; completePaste(requestId,confirmed?) adopts matching app results. failPaste retains contents; retryPaste rechecks current keys/columns.

Clipboard reads capture starting business keys, column IDs, rows/columns references, selection target, editing state and generation. Responses after focus moved cells, source/column/edit changes, invalidation, destruction or subsequent requests cannot save into a different current cell. Removed components stop accepting Clipboard outcomes.

## TreeGrid hierarchy and loading

Inputs: caption/gridId/nodes/columns/keyField, expandedIds/selectedIds, `selectionMode:'none'|'single'|'multiple'`, editable/disabled/busy/locale. TreeNode<T> uses a stable UI string id, label and business-row data. The TableKey in data remains separate from UI-node ID. Missing children plus hasChildren=true is unfetched; children=[] is a fetched leaf.

expandedIdsChange/selectedIdsChange contain UI-node ID arrays. nodesChange returns `readonly TreeNode<T>[]`, the hierarchy with confirmed business rows applied; saveRequested/pasteRequested retain raw business keys. Treegrid rows connect level/position/setSize/expanded/busy/selected. First-cell horizontal arrows/explicit buttons expand/collapse; Space selects enabled rows; navigation returns from child to parent and respects ancestor disabled.

Expanding an unfetched node emits `loadRequested:TreeLoadRequest={nodeId:string;path:readonly string[];requestId:number}`. resolveLoad(requestId,children)/failLoad(requestId,message) accept only matching source/request. Duplicate IDs/invalid hierarchy are not loaded successfully. TreeLoadCancellation reasons are collapse/source-change/reset/invalidate/destroy/close. loadCancelled emits living-component UI cancellation intent; destruction emits nothing and closes acceptance. The app connects transport abort/global teardown.

Collapsing hierarchy that would discard editing/pending paste is deferred through displayExpandedIds/collapseDeferredIds and explained by status. Save/failure/cancel retain raw drafts and matching/stale distinctions. completeEdit/failEdit, completePaste/failPaste and invalidatePending connect DataGrid response contracts and loading acceptance.

## Virtualization, incremental loading and ordinary-table fallback

VirtualDataTable takes caption/tableId/rows/columns/keyField/state, disabled/busy, height/itemHeight:number|null, overscan, locale/missingLabel/sortable, selectionMode/selectedKeys/rowSelectable and cellTemplates. Outputs: sortRequested:string, selectedKeysChange, columnWidthsChange:Readonly<Record<string,number>>, rangeChange:{start;end}, positionChange:{offset;index}.

Public Angular CDK22.3.0 fixed-size scrolling renders only viewport/small buffer, not all acquired rows as hidden DOM. Preserve ARIA table/rowgroup/row/columnheader/cell relationships, acquired rowcount and rowindex. Height uses explicit itemHeight or measured semantic values, retaining index when profile/200%-text changes row height. ScrollToIndex/scrollToOffset are instant; Home/End/Page keys are connected.

Default fixed-height cells are single-line with native cell-local horizontal scroll. Tab into cells and arrows read long values. Apps provide adequate itemHeight for projected templates. CellTemplates uses column-ID own entries only.

In this version, DataTableView virtualization combined with editing/grouping/multilevel headers/fixed columns-or-rows/aggregates/detail/rowActions is a configuration error. Ordinary tables provide those features. Recoverable apps connect nativeViewAvailable=true/nativeViewRequested to controlled virtualize=false; busy/disabled suppress switching. A generic wrapper does not complete unsupported combinations.

```html
<ui-data-table caption="Acquired requests" tableId="acquired"
  [rows]="rows()" [columns]="columns" keyField="id"
  [virtualize]="virtual()" [nativeViewAvailable]="true"
  (nativeViewRequested)="virtual.set(false)" />
```

Incremental loading connects moreAvailable/moreFinished/loadingMore/moreError/moreResetKey with loadMoreRequested/completeLoad/failLoad. In client/server modes the app appends rows/supplies the endpoint. Ordinary autoLoadMore uses observation; virtual loading uses an explicit button. Suppress repeated pending-token requests and retain failure retry. Components do not create server totals/all search-result rows/backend cancellation.

## Output scopes and I/O boundaries

TableOutputScope is `'page'|'filtered'|'selected'|'supplied'`. TableOutputIntent is `{format:'copy'|'csv'|'print';scope:TableOutputScope}`. DataTableView creates header-inclusive matrix/text and raw columnIds in current visible-column order.

| Scope | Rows |
| --- | --- |
| page | Currently supplied/displayed page |
| filtered | Acquired rows after client query; supplied rows in server mode |
| selected | Acquired supplied rows matching selected keys, including selections hidden by filters |
| supplied | All app-supplied rows |

Never invent unknown selected keys or unfetched server rows. Grid copy uses raw draft-form cell rectangles, separate from formatted table output.

copyTableMatrix(matrix,writer?):Promise<void> awaits TSV Clipboard writes; callers handle rejection. downloadTableCsv(matrix,filename,document?) creates BOM-prefixed UTF-8 CSV preserving quotes/tabs/newlines and mitigates formula-like strings by default. It cleans URLs/temporary anchors; actual persistence at the chosen destination needs browser/app confirmation.

createTablePrintDocument(matrix,title,document?,scope?) returns frame/print/destroy. It builds with textContent, uses the first matrix row as column headings and transfers semantic font/space/color/border/direction from scope. The app calls print and destroys after afterprint/etc. Evidence covers frame rows/headers/profile tokens/native print invocation, not physical printer completion.

## Raw IDs, missing data, profiles, direction and lifetime

Empty/duplicate column IDs are configuration errors, but accepted arbitrary strings are not narrowed just because they resemble reserved names. Null-prototype records retain constructor/__proto__ errors/paste drafts/measured-computed widths. External columnWidths/pinnedColumns/template maps use Object.hasOwn entries. Object.fromEntries/computed-key updates preserve raw IDs. Immutable spread preserves DTO own __proto__/constructor fields without mutating prototypes through business values.

Only DOM IDs become safe tokens; selection/state/columns/keys/Clipboard/save payloads retain raw values. Well-formed single tokens match legacy encodeURIComponent. Accepted lone surrogates use `%u` plus fixed four-digit hex for every UTF-16 unit, distinct from URI literal-percent namespace. Compound tokens escape each part's hyphens, distinguishing group a-b/leaf c from group a/leaf b-c. Editor field namespace/column IDs are paired so column c error suffix cannot collide with c-error input. tableDomIdToken/tableDomIdPair/tableOwnValue are direct-module internal helpers, not new barrel exports.

Preserve native caption/th scope/headers, label.control and aria-describedby. Required actions are not removed for narrow widths. TableContainer label is its region name; caption is its visible title; DataTable.caption is the native table caption. TableContainer exposes scrollDirection:inline|block|both|none, displaySize:content|viewport, height/maxHeight, scrollTop/scrollLeft:number|null, scrollChange:{top:number;left:number}. Finite positions apply to the native region; RTL native scrollLeft is not silently normalized into different coordinates.

Choose valid data-ui-profile IDs. Table spacing/typography/focus/minimum column widths/viewports/colors use purpose-specific semantics. Profile/scope/hidden changes remeasure without recreating editor DOM. RowSpacing enums are existing display choices, not old density/preset compatibility. RTL connects logical pin/text alignment/indent and physical keys. Virtual navigation is instant and does not depend on decorative-animation completion; app-added smooth movement respects reduced motion.

Null/undefined/invalid typed values/invalid Date use missingLabel, without treating0/false as missing. Pending/partial/unknown outcomes do not become success. Destroy cleans listeners/observers/CDK subscriptions/pointer capture/pending-Clipboard generations. The app owns persistence/fetching/sending/real undo/durability/OS permissions/business safety.

## Consumer verification scope

Verify actual screen readers, OS IME, browser differences, business persistence/undo, destination durability and physical printing in the adopted app environment. Typechecking/generation consistency/browser interaction/automated accessibility/visual-semantic review are distinct. Use the ordinary-table fallback contract above for unsupported virtual combinations.
