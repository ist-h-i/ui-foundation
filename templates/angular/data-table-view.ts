import {injectUiText as injectUiDiagnosticText} from './locale';
import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiLocale,injectUiText,UiMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, Directive, ElementRef, inject, input, isSignal, output, signal, type Signal, TemplateRef, viewChild, viewChildren, untracked, } from '@angular/core';
import { canFocus } from './focus';
import { ActionControl } from './action-control';
import { Pagination } from './pagination';
import { DataTable } from './data-table';
import { VirtualDataTable } from './virtual-data-table';import type {VirtualRadioGroup} from './virtual-radio';
import { ColumnFilter, TableToolbar, type TableBulkAction, type TableOutputIntent } from './table-controls';
import { TableColumnResize } from './table-column-resize';
import { CellEditor, RowEditor } from './table-editors';
import { InfiniteScroll, type CollectionLoadRequest } from './infinite-scroll';
import { tableDomIdPair, tableDomIdToken, aggregateTable, flattenTableGroups, groupTable, tableHeaderProblem, tableHeaderRows, tableCellHeaders, tableOutputRows, tableOutputMatrix, serializeTableMatrix, type TableAggregate, type TableAggregateValue, type TableEditableColumn, type TableEditRequest, type TableGroupEntry, type TableHeaderGroup } from './table-advanced-model';
import { createTableState, fitTableColumns, nextTableSort, queryTable, tableConfigurationError, tableOwnValue, tableText, tableValue, type TableColumn, type TableConstraint, type TableFilter, type TableKey, type TableOperator, type TableState, } from './table-model';
export type TableDataState = {
    kind: 'ready';
} | {
    kind: 'loading' | 'updating' | 'error' | 'partial';
    message: string;
};
export interface TableRowAction<T> {
    id: string;
    label: string;
    disabled?: (row: T) => boolean;
}
export interface TableTemplateContext<T extends object> {
    $implicit: T;
    value: unknown;
    column: TableColumn<T> | null;
}
@Directive({ selector: 'ng-template[uiTableCell],ng-template[uiTableDetail]', standalone: true })
export class TableTemplate<T extends object> {
    readonly column = input('', { alias: 'uiTableCell' });
    readonly detail = input(false, { alias: 'uiTableDetail', transform: booleanAttribute });
    readonly of = input.required<readonly T[]>({ alias: 'uiTableTemplateOf' });
    readonly template = inject<TemplateRef<TableTemplateContext<T>>>(TemplateRef);
    static ngTemplateContextGuard<T extends object>(_directive: TableTemplate<T>, _context: unknown): _context is TableTemplateContext<T> { return true; }
}
/** Controlled query, selection and column state. The application owns requests and persistence. */
@Component({
    selector: 'ui-data-table', standalone: true,
    imports: [NgTemplateOutlet, ActionControl, Pagination, DataTable, VirtualDataTable, ColumnFilter, TableToolbar, TableColumnResize, CellEditor, RowEditor, InfiniteScroll,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ui-data-table', 'data-table-owner': '', tabindex: '-1', '[attr.aria-label]': 'caption()', '(focusin)': 'ownFocus($event)', '(focusout)': 'leaveFocus($event)', '[attr.aria-busy]': 'busy() ? "true" : null' },
    template: `
    <div class="ui-data-table__toolbar">
      @if (globalSearch()) {
        <label>{{'全体検索' | uiMessage}}
          <input data-table-owned-control class="ui-field-control" type="search" [value]="state().search" [disabled]="blocked()" (input)="search(value($event))">
        </label>
        <button uiAction data-table-owned-control [disabled]="blocked() || !state().search" (click)="search('')">{{'検索を解除' | uiMessage}}</button>
      }
      @if (columnControls()) {
        <details class="ui-data-table__columns"><summary data-table-owned-control>{{'列の設定' | uiMessage}}</summary>
          @for (column of columns(); track column.id) {
            <div class="ui-data-table__column-setting">
              <label><input data-table-owned-control type="checkbox" [checked]="!state().hiddenColumns.includes(column.id)" [disabled]="blocked() || lastVisible(column.id)" (change)="toggleColumn(column.id)">{{ column.header }}</label>
              <button uiAction data-table-owned-control [attr.aria-label]="column.header + ('列を前へ' | uiMessage)" [disabled]="blocked() || orderedColumns()[0]?.id === column.id" (click)="moveColumn(column.id, -1)">{{'前へ' | uiMessage}}</button>
              <button uiAction data-table-owned-control [attr.aria-label]="column.header + ('列を後へ' | uiMessage)" [disabled]="blocked() || orderedColumns().at(-1)?.id === column.id" (click)="moveColumn(column.id, 1)">{{'後へ' | uiMessage}}</button>
              <div><label [for]="tableId() + '-pin-' + column.id">{{'固定:' | uiMessage}} {{ column.header }}</label>
                <div class="ui-select-control"><select data-table-owned-control [id]="tableId() + '-pin-' + column.id" class="ui-field-control" [value]="pin(column) || 'none'" [disabled]="blocked()" (change)="setPin(column.id, value($event))">
                  <option value="none">{{'固定しない' | uiMessage}}</option><option value="start">{{'先頭側' | uiMessage}}</option><option value="end">{{'末尾側' | uiMessage}}</option>
                </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>
              </div>
              @if (resizableColumns()) {
                <label>{{'列幅:' | uiMessage}} {{ column.header }} ({{ width(column) || measuredWidth(column) || minimumColumnWidth() }}px)
                  <input data-table-owned-control type="range" [min]="minimumWidth(column)" [max]="maximumWidth(column)" [value]="width(column) || measuredWidth(column) || minimumColumnWidth()"
                    [disabled]="blocked()" (input)="resizeColumn(column, number($event))">
                </label>
              }
            </div>
          }
          <button uiAction data-table-owned-control [disabled]="blocked()" (click)="resetColumns()">{{'列の設定を戻す' | uiMessage}}</button>
        </details>
      }
      <ng-content select="[uiTableToolbar]" />
    </div>
    @if (columnFilters()) {
      <details class="ui-data-table__filters">
        <summary data-table-owned-control>{{'列で絞り込む' | uiMessage}} <span>({{'適用中' | uiMessage}} {{activeFilterCount()}} {{'列' | uiMessage}})</span></summary>
        <div class="ui-data-table__filter-fields">
          @for (column of orderedColumns(); track column.id) {
            @if (column.filterable !== false) {
              <ui-column-filter [column]="column" [controlId]="fieldId(column.id)" [filter]="columnFilter(column.id)" [disabled]="blocked()" (filterChange)="setFilter(column.id,$event)" />
            }
          }
        </div>
      </details>
    }
    <span #minimumProbe class="ui-data-table__minimum-probe" aria-hidden="true"></span>
    <div class="ui-sr-only" role="status" aria-atomic="true">{{ statusMessage() }}</div>
    @if(displayStateDeferred()){<p role="status" class="ui-data-table__view-status">{{'編集中または保存待機中の行・列があります。検索・列表示・ページの変更は、先に編集を保存するか取り消すまで保留しています。' | uiMessage}}</p>}
    @if (configurationError()) { <p role="alert">{{'表の設定を確認してください。' | uiMessage}}{{ configurationError() }}</p>@if(virtualUnsupported()&&nativeViewAvailable()){<button uiAction data-table-owned-control type="button" [disabled]="disabled()||busy()" (click)="requestNativeView()">{{'通常表へ切り替える' | uiMessage}}</button>} }
    @if (dataState().kind !== 'ready') { <p class="ui-data-table__message">{{ statusMessage() }}</p> }
    @if (dataState().kind === 'error' || dataState().kind === 'partial') {
      @if (retryAvailable()) { <button uiAction [busy]="busy()" (click)="retry.emit()">{{'一覧を再取得' | uiMessage}}</button> }
    }
    @if(!virtualize()){<div #viewport class="ui-data-table__viewport" role="region" [attr.aria-label]="caption() + ('の表領域' | uiMessage)" tabindex="0"
      [hidden]="!!configurationError()" [class.ui-data-table__viewport--bounded]="stickyHeader()" [style.max-block-size]="stickyHeader()?boundedViewportSize():null" [style.scroll-padding-block-start.px]="startStack()" [style.scroll-padding-block-end.px]="endStack()">
      <table uiTable [caption]="caption()" class="ui-table" [class.ui-data-table__table--content]="autoWidth() && autoFit() === 'content'"
        [class.ui-data-table__table--fixed]="true" [style.inline-size.px]="tableWidth()" [style.min-inline-size.px]="0"
        [class.ui-data-table__table--striped]="striped()" [class.ui-data-table__table--borders]="borders()"
        [class.ui-data-table__table--hover]="hoverRows()" [attr.data-spacing]="rowSpacing()">
        <colgroup>
          @if (selectionMode() !== 'none') { <col [style.width.px]="minimumColumnWidth()"> }
          @if (detailTemplate()) { <col [style.width.px]="minimumColumnWidth()"> }
          @for (column of visibleColumns(); track column.id) {
            <col [style.width.px]="resolvedWidths()[column.id]">
          }
          @if (rowActions().length) { <col [style.width.px]="minimumColumnWidth()"> }@if(editMode()==='row'){<col [style.width.px]="minimumColumnWidth()">}
        </colgroup>
        <thead [class.ui-data-table__head--sticky]="stickyHeader()">
          @for(headerRow of headerRows();track $index;let hi=$index){<tr>
            @if(hi===0){
              @if(selectionMode()!=='none'){<th scope="col" [attr.rowspan]="headerRows().length">@if(selectionMode()==='multiple'){<input data-table-control data-table-owned-control type="checkbox" [attr.aria-label]="selectAllScope()==='filtered'&&mode()==='client'?('検索結果をすべて選択' | uiMessage):('このページをすべて選択' | uiMessage)" [checked]="allSelected()" [indeterminate]="someSelected()&&!allSelected()" [disabled]="blocked()||!selectionRows().length" (change)="selectAll($event)">}@else{{{'選択' | uiMessage}}}</th>}
              @if(detailTemplate()){<th scope="col" [attr.rowspan]="headerRows().length">{{'詳細' | uiMessage}}</th>}
            }
            @for(header of headerRow;track header.id){
              @if(header.kind==='group'){<th scope="colgroup" [id]="header.id" [attr.colspan]="header.colSpan" [attr.rowspan]="header.rowSpan">{{header.label}}</th>}
              @else{@let column=columnById(header.columnId!);<th scope="col" class="ui-data-table__header-cell" [id]="header.id" [attr.rowspan]="header.rowSpan" [attr.data-column-id]="column.id" [attr.aria-sort]="ariaSort(column.id)" [class.ui-data-table__pinned]="!!pin(column)" [style.inset-inline-start.px]="pin(column)==='start'?pinOffset(column,'start'):null" [style.inset-inline-end.px]="pin(column)==='end'?pinOffset(column,'end'):null">
                @if(sortable()&&column.sortable!==false){<button uiAction class="ui-data-table__sort" data-table-control data-table-owned-control [disabled]="blocked()" [attr.aria-label]="sortLabel(column)" (click)="sort(column.id)">{{column.header}} {{sortMarker(column.id)}}</button>}@else{ {{column.header}} }
                @if(resizableColumns()){<button type="button" data-table-control data-table-owned-control class="ui-data-table__resize" uiTableColumnResize [label]="column.header+('の列境界' | uiMessage)" [value]="resolvedWidths()[column.id]" [minimum]="minimumWidth(column)" [maximum]="maximumWidth(column)" [disabled]="blocked()" (resizeChange)="resizeColumn(column,$event)"></button>}
              </th>}
            }
            @if(hi===0){@if(rowActions().length){<th scope="col" [attr.rowspan]="headerRows().length">{{'操作' | uiMessage}}</th>}@if(editMode()==='row'){<th scope="col" [attr.rowspan]="headerRows().length">{{'行編集' | uiMessage}}</th>}}
          </tr>}
        </thead>
        <tbody>
          @for(entry of bodyEntries();track entryId(entry)){
            @if(entry.kind==='group'){<tr [hidden]="entry.hidden" class="ui-data-table__group"><th scope="rowgroup" [attr.colspan]="columnCount()"><button uiAction data-table-control data-table-owned-control type="button" [disabled]="blocked()" [attr.aria-expanded]="!collapsedGroupIds().includes(entry.group.id)" (click)="toggleGroup(entry.group.id)">{{entry.group.label}} ({{entry.group.rows.length}}{{'件)' | uiMessage}} {{collapsedGroupIds().includes(entry.group.id)?('展開' | uiMessage):('閉じる' | uiMessage)}}</button>@for(value of entry.group.aggregates;track $index){<span class="ui-data-table__aggregate">{{aggregateText(value)}}</span>}</th></tr>}
            @else{@let row=entry.row;
            <tr [hidden]="entry.hidden" [attr.data-table-key]="encodedKey(row)" [attr.data-fixed-row]="rowSide(row)" [class.ui-data-table__fixed-row]="!!rowSide(row)" [style.inset-block-start.px]="rowSide(row)==='start'?fixedOffset(row,'start'):null" [style.inset-block-end.px]="rowSide(row)==='end'?fixedOffset(row,'end'):null" [attr.data-row-key]="key(row)" [class.ui-data-table__row--selected]="selectedKeys().includes(key(row))">
              @if (selectionMode() !== 'none') {
                <td><input data-table-control data-table-owned-control [type]="selectionMode() === 'single' ? 'radio' : 'checkbox'" [name]="tableId() + '-selection'"
                  [attr.aria-label]="('行を選択: ' | uiMessage) + rowLabel(row)" [checked]="selectedKeys().includes(key(row))"
                  [disabled]="blocked() || !selectable(row)" (change)="select(row, $event)"></td>
              }
              @if (detailTemplate()) {
                <td><button uiAction data-table-control data-table-owned-control [disabled]="blocked()" [attr.aria-label]="('詳細: ' | uiMessage) + rowLabel(row)" [attr.aria-expanded]="expandedKeys().includes(key(row))" (click)="toggleDetail(row)">{{ expandedKeys().includes(key(row)) ? ('閉じる' | uiMessage) : ('開く' | uiMessage) }}</button></td>
              }
              @for (column of visibleColumns(); track column.id) {
                <td [attr.headers]="cellHeaders(column.id)" [class.ui-data-table__pinned]="!!pin(column)" [class.ui-data-table__cell--nowrap]="!wrapCells()" [class.ui-data-table__cell--ellipsis]="ellipsis()"
                  [style.inset-inline-start.px]="pin(column) === 'start' ? pinOffset(column, 'start') : null"
                  [style.inset-inline-end.px]="pin(column) === 'end' ? pinOffset(column, 'end') : null" [attr.title]="ellipsis() ? cellText(row, column) : null">
                  @if(editMode()==='cell'&&column.editable!==false&&column.field!==keyField()){<ui-cell-editor data-table-managed-editor [row]="row" [keyField]="keyField()" [column]="editableColumn(column)" [controlId]="editorId(row,column.id)" [label]="column.header+'・'+rowLabel(row)" [disabled]="disabled()" [busy]="busy()" [locale]="effectiveLocale()" [missingLabel]="uiEffective_missingLabel()" (saveRequested)="saveRequested.emit($event)" (rowChange)="edited($event)" (editingChange)="cellEditingChanged($event)"/>}
                  @else if (cellTemplate(column.id); as template) {
                    <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{ $implicit: row, value: cellValue(row, column), column: column }" />
                  } @else { {{ cellText(row, column) }} }
                </td>
              }
              @if (rowActions().length) {
                <td><div class="ui-data-table__actions">
                  @for (action of rowActions(); track action.id) { <button uiAction data-table-owned-control [disabled]="blocked() || !!action.disabled?.(row)" (click)="activate(action.id, row)">{{ action.label }}</button> }
                </div></td>
              }
              @if(editMode()==='row'){<td><button uiAction class="ui-data-table__edit-start" data-table-control data-table-owned-control type="button" [disabled]="blocked()" [attr.aria-label]="('編集: ' | uiMessage)+rowLabel(row)" data-table-row-edit-start (click)="beginRow(row)">{{'行を編集' | uiMessage}}</button></td>}
            </tr>
            @if(editMode()==='row'){<tr [hidden]="entry.hidden||!rowEditor.isEditing()" [attr.data-table-editor-key]="encodedKey(row)"><td [attr.colspan]="columnCount()"><ui-row-editor data-table-managed-editor #rowEditor [row]="row" [keyField]="keyField()" [columns]="columns()" [controlId]="tableId()+'-row-edit-'+encodedKey(row)" [label]="rowLabel(row)+('の行編集' | uiMessage)" [disabled]="disabled()" [busy]="busy()" [locale]="effectiveLocale()" [missingLabel]="uiEffective_missingLabel()" (saveRequested)="saveRequested.emit($event)" (rowChange)="edited($event)" (editingChange)="rowEditingChanged(row,$event)"/></td></tr>}
            @if (detailTemplate(); as detail) {
              <tr [hidden]="entry.hidden||!expandedKeys().includes(key(row))"><td [attr.colspan]="columnCount()"><ng-container [ngTemplateOutlet]="detail" [ngTemplateOutletContext]="{ $implicit: row, value: null, column: null }" /></td></tr>
            }
            }
          } @empty {
            <tr><td [attr.colspan]="columnCount()">{{ emptyMessage() }}</td></tr>
          }
        </tbody>
        @if(aggregates().length){<tfoot [class.ui-data-table__footer--sticky]="stickyFooter()"><tr><th scope="row" [attr.colspan]="columnCount()">{{aggregateLabel()}}</th></tr><tr>@if(selectionMode()!=='none'){<td></td>}@if(detailTemplate()){<td></td>}@for(column of visibleColumns();track column.id){<td [attr.headers]="cellHeaders(column.id)" [class.ui-data-table__pinned]="!!pin(column)" [style.inset-inline-start.px]="pin(column)==='start'?pinOffset(column,'start'):null" [style.inset-inline-end.px]="pin(column)==='end'?pinOffset(column,'end'):null">@for(value of aggregatesFor(column.id);track $index){<span class="ui-data-table__aggregate">{{aggregateText(value)}}</span>}</td>}@if(rowActions().length){<td></td>}@if(editMode()==='row'){<td></td>}</tr></tfoot>}
      </table>
      @if(moreAvailable()){<ui-infinite-scroll #more [label]="caption()+('の追加取得' | uiMessage)" [loading]="loadingMore()" [finished]="moreFinished()" [error]="moreError()" [disabled]="blocked()" [autoLoad]="autoLoadMore()" [observerRoot]="stickyHeader()?viewport:null" [resetKey]="moreResetKey()" [contentVersion]="rows().length" (loadRequested)="loadMoreRequested.emit($event)"/>}
    </div>
    }@else{
      @if(!configurationError()){<ui-virtual-data-table [caption]="caption()" [tableId]="tableId()" [rows]="pageRows()" [columns]="visibleColumns()" [keyField]="keyField()" [state]="state()" [busy]="busy()" [disabled]="disabled()" [height]="virtualHeight()" [itemHeight]="virtualRowHeight()" [overscan]="virtualOverscan()" [sortable]="sortable()" [selectionMode]="selectionMode()" [selectedKeys]="selectedKeys" [radioGroups]="virtualRadioGroups" [rowSelectable]="rowSelectable()" [cellTemplates]="virtualTemplates()" [locale]="effectiveLocale()" [missingLabel]="uiEffective_missingLabel()" (columnWidthsChange)="virtualWidths($event)" (sortRequested)="sort($event)" (selectedKeysChange)="selectedKeysChange.emit($event)" (rangeChange)="virtualRangeChange.emit($event)" (positionChange)="virtualPositionChange.emit($event)"/>}
      @if(moreAvailable()){<ui-infinite-scroll [label]="caption()+('の追加取得' | uiMessage)" [loading]="loadingMore()" [finished]="moreFinished()" [error]="moreError()" [disabled]="blocked()" [autoLoad]="false" [resetKey]="moreResetKey()" [contentVersion]="rows().length" (loadRequested)="loadMoreRequested.emit($event)"/>}
    }
    @if(showOutput()||bulkActions().length){<ui-table-toolbar [label]="caption()+('の出力と一括操作' | uiMessage)" [columns]="columns()" [state]="state()" [searchable]="false" [chooseColumns]="false" [outputs]="showOutput()" [busy]="busy()" [disabled]="disabled()||!!configurationError()" [selectedKeys]="selectedKeys()" [bulkActions]="bulkActions()" (bulkRequested)="bulkRequested.emit($event)" (outputRequested)="export($event)"/>}
    @if (pagination() && !configurationError()) {
      <ui-pagination [page]="displayPage()" [totalItems]="total()" [pageSize]="displayTableState().pageSize" [pageSizeOptions]="pageSizeOptions()"
        [busy]="busy()" [disabled]="disabled()" [label]="caption() + ('のページ' | uiMessage)" (pageChange)="update({page: $event})" (pageSizeChange)="update({pageSize: $event, page: 1})" />
    }
  `,
    styles: `
    :host { display: block; min-inline-size: 0; max-inline-size: 100%; color: var(--ui-color-text); font: inherit; overflow-wrap: anywhere; }
    :host([hidden]), [hidden] { display: none !important; }
    .ui-data-table__toolbar, .ui-data-table__actions, .ui-data-table__column-setting { display: flex; flex-wrap: wrap; gap: var(--ui-space-control-gap); align-items: center; }
    .ui-data-table__toolbar { margin-block-end: var(--ui-space-field); }
    .ui-data-table__toolbar label, .ui-data-table__column-setting label { display: grid; grid-template-columns:minmax(0,1fr); gap: var(--ui-space-control-gap); min-inline-size: 0; max-inline-size: 100%; }
    .ui-data-table__columns { max-inline-size: 100%; }
    .ui-data-table__filters { min-inline-size: 0; margin-block-end: var(--ui-space-field); }
    .ui-data-table__filters summary span { color: var(--ui-color-muted); }
    .ui-data-table__filter-fields { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,calc(var(--ui-size-table-column-min) * 2)),1fr)); gap: var(--ui-space-field); padding-block-start: var(--ui-space-control-gap); }
    .ui-data-table__column-setting { padding-block: var(--ui-space-control-y); }
    summary { cursor: pointer; padding: var(--ui-space-control-y); min-block-size: var(--ui-size-control); box-sizing: border-box; }
    .ui-data-table__viewport { overflow: auto; max-inline-size: 100%; min-inline-size: 0; position: relative; overscroll-behavior: contain; }
    .ui-data-table__viewport--bounded { max-block-size: var(--ui-size-table-viewport); }
    .ui-data-table__minimum-probe { position: absolute; visibility: hidden; inline-size: var(--ui-size-table-column-min); block-size: var(--ui-size-control); pointer-events: none; }
    table { min-inline-size: 100%; }
    .ui-data-table__table--content { inline-size: max-content; table-layout: auto; }
    .ui-data-table__table--fixed { inline-size: 100%; table-layout: fixed; }
    th, td { min-inline-size: var(--ui-size-table-column-min); overflow-wrap: anywhere; }
    .ui-data-table__utility-column { inline-size: calc(var(--ui-size-control) + 2 * var(--ui-space-table-x)); }
    .ui-data-table__head--sticky { position: sticky; inset-block-start: 0; z-index: 4; background: var(--ui-color-background); }
    .ui-data-table__head--sticky th { background: var(--ui-color-background); }
    .ui-data-table__edit-start.ui-action:not(:disabled) { border-color: transparent; background: transparent; color: var(--ui-color-text); }
    .ui-data-table__edit-start.ui-action { padding-inline: var(--ui-space-control-gap); }
    .ui-data-table__edit-start.ui-action:hover:not(:disabled) { background: var(--ui-color-background); }
    .ui-data-table__sort.ui-action { border-color:transparent; background:transparent; padding-inline:0; }
    .ui-data-table__sort.ui-action:hover:not(:disabled) { background:var(--ui-color-surface); color:var(--ui-color-text); }
    .ui-data-table__header-cell:not(.ui-data-table__pinned) {position:relative;}
    .ui-data-table__header-cell {padding-inline-end:var(--ui-size-control);}
    .ui-data-table__resize {position:absolute;inset-inline-end:0;inset-block:0;inline-size:var(--ui-size-control);border:0;border-inline-end:var(--ui-border-control) solid var(--ui-color-border);background:transparent;cursor:col-resize;touch-action:none;}
    .ui-data-table__resize:focus-visible {outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}
    .ui-data-table__fixed-row {position:sticky;z-index:2;background:var(--ui-color-surface);}
    .ui-data-table__fixed-row>td {background:var(--ui-color-surface);}
    .ui-data-table__footer--sticky {position:sticky;inset-block-end:0;z-index:3;background:var(--ui-color-surface);}
    .ui-data-table__aggregate {display:block;white-space:normal;overflow-wrap:anywhere;}
    .ui-data-table__group>th {background:var(--ui-color-background);}
    .ui-data-table__pinned { position: sticky; background: var(--ui-color-surface); z-index: 1; }
    th.ui-data-table__pinned { background: var(--ui-color-background); }
    .ui-data-table__row--selected td { background: var(--ui-color-background); }
    .ui-data-table__table--striped > tbody > tr:nth-child(even) > td { background: var(--ui-color-background); }
    .ui-data-table__table--hover > tbody > tr:hover > td { background: var(--ui-color-disabled-surface); }
    .ui-data-table__table--borders th, .ui-data-table__table--borders td { border: var(--ui-border-control) solid var(--ui-color-border); }
    table[data-spacing="compact"] th, table[data-spacing="compact"] td { padding-block: var(--ui-space-control-y); }
    table[data-spacing="comfortable"] th, table[data-spacing="comfortable"] td { padding-block: var(--ui-space-field); }
    .ui-data-table__cell--nowrap { white-space: nowrap; }
    .ui-data-table__cell--ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    input[type="checkbox"], input[type="radio"] { inline-size: var(--ui-size-icon); block-size: var(--ui-size-icon); accent-color: var(--ui-color-action); }
    input[type="range"] { min-block-size: var(--ui-size-control); max-inline-size: 100%; accent-color: var(--ui-color-action); }
    input:focus-visible, select:focus-visible, summary:focus-visible, .ui-data-table__viewport:focus-visible { outline: var(--ui-border-focus) solid var(--ui-color-focus); outline-offset: var(--ui-border-focus-offset); }
    .ui-data-table__message { margin-block: var(--ui-space-field); }
  `,
})
export class DataTableView<T extends object> {
 private readonly uiDiagnostic_DataTableView=(()=>{const text=injectUiDiagnosticText();return (value:string|null):string|null=>value===null?null:text(value);})();

 private readonly uiRuntimeText_DataTableView=injectUiRuntimeText();

 protected readonly uiText_DataTableView=injectUiText();
    readonly caption = input.required<string>();
    readonly tableId = input.required<string>();
    readonly rows = input.required<readonly T[]>();
    readonly columns = input.required<readonly TableEditableColumn<T>[]>();
    readonly virtualize = input(false, { transform: booleanAttribute });
    readonly nativeViewAvailable = input(false, { transform: booleanAttribute });
    readonly nativeViewRequested = output<void>();
    readonly virtualHeight = input<number | null>(null);
    readonly virtualRowHeight = input<number | null>(null);
    readonly virtualOverscan = input(3);
    readonly virtualRangeChange = output<{
        start: number;
        end: number;
    }>();
    readonly virtualPositionChange = output<{
        offset: number;
        index: number;
    }>();
    readonly columnGroups = input<readonly TableHeaderGroup[]>([]);
    readonly aggregates = input<readonly TableAggregate[]>([]);
    readonly aggregateScope = input<'page' | 'filtered' | 'supplied'>('filtered');
    readonly stickyFooter = input(true, { transform: booleanAttribute });
    readonly groupBy = input<readonly string[]>([]);
    readonly collapsedGroupIds = input<readonly string[]>([]);
    readonly collapsedGroupIdsChange = output<readonly string[]>();
    readonly fixedStartKeys = input<readonly TableKey[]>([]);
    readonly fixedEndKeys = input<readonly TableKey[]>([]);
    readonly editMode = input<'none' | 'cell' | 'row'>('none');
    readonly saveRequested = output<TableEditRequest<T>>();
    readonly rowsChange = output<readonly T[]>();
    readonly showOutput = input(false, { transform: booleanAttribute });
    readonly bulkActions = input<readonly TableBulkAction[]>([]);
    readonly bulkRequested = output<{
        action: string;
        keys: readonly TableKey[];
    }>();
    readonly outputRequested = output<TableOutputIntent & {
        matrix: readonly (readonly string[])[];
        text: string;
        rowCount: number;
        columnIds: readonly string[];
    }>();
    readonly moreAvailable = input(false, { transform: booleanAttribute });
    readonly moreFinished = input(false, { transform: booleanAttribute });
    readonly loadingMore = input(false, { transform: booleanAttribute });
    readonly moreError = input<string | null>(null);
    readonly autoLoadMore = input(false, { transform: booleanAttribute });
    readonly moreResetKey = input<string | number>('');
    readonly loadMoreRequested = output<CollectionLoadRequest>();
    readonly keyField = input.required<keyof T & string>();
    readonly state = input<TableState>(createTableState());
    readonly stateChange = output<TableState>();
    readonly mode = input<'client' | 'server'>('client');
    readonly totalItems = input<number | null>(null);
    readonly dataState = input<TableDataState>({ kind: 'ready' });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly sortable = input(true, { transform: booleanAttribute });
    readonly sortMode = input<'single' | 'multiple'>('single');
    readonly columnFilters = input(false, { transform: booleanAttribute });
    readonly globalSearch = input(false, { transform: booleanAttribute });
    readonly searchColumns = input<readonly string[] | undefined>();
    readonly pagination = input(true, { transform: booleanAttribute });
    readonly pageSizeOptions = input<readonly number[]>([10, 25, 50]);
    readonly autoWidth = input(true, { transform: booleanAttribute });
    readonly autoFit = input<'content' | 'available'>('available');
    readonly stickyHeader = input(false, { transform: booleanAttribute });
    readonly columnControls = input(true, { transform: booleanAttribute });
    readonly resizableColumns = input(true, { transform: booleanAttribute });
    readonly selectionMode = input<'none' | 'single' | 'multiple'>('none');
    readonly selectedKeysSource = input<readonly TableKey[]|Signal<readonly TableKey[]>>([],{alias:'selectedKeys'});
    readonly selectedKeys = computed(()=>{const source=this.selectedKeysSource();return isSignal(source)?source():source;});
    /** Complete projected groups for the current filtered/page rows, not all source rows. */
    readonly virtualRadioGroupsSource = input<readonly VirtualRadioGroup[]|Signal<readonly VirtualRadioGroup[]>>([],{alias:'virtualRadioGroups'});
    readonly virtualRadioGroups = computed(()=>{const source=this.virtualRadioGroupsSource();return isSignal(source)?source():source;});
    readonly selectedKeysChange = output<readonly TableKey[]>();
    readonly rowSelectable = input<(row: T) => boolean>(() => true);
    readonly selectAllScope = input<'page' | 'filtered'>('page');
    readonly expandedKeys = input<readonly TableKey[]>([]);
    readonly expandedKeysChange = output<readonly TableKey[]>();
    readonly rowActions = input<readonly TableRowAction<T>[]>([]);
    readonly rowAction = output<{
        action: string;
        row: T;
        key: TableKey;
    }>();
    readonly striped = input(false, { transform: booleanAttribute });
    readonly borders = input(false, { transform: booleanAttribute });
    readonly hoverRows = input(true, { transform: booleanAttribute });
    readonly rowSpacing = input<'profile' | 'compact' | 'comfortable'>('profile');
    readonly wrapCells = input(true, { transform: booleanAttribute });
    readonly ellipsis = input(false, { transform: booleanAttribute });
    protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);
    readonly missingLabel = input<string>();
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_DataTableView('未取得'));
    readonly retryAvailable = input(false, { transform: booleanAttribute });
    readonly retry = output<void>();
    private readonly templates = contentChildren<TableTemplate<T>>(TableTemplate);
    private readonly cellEditors = viewChildren<CellEditor<T>>(CellEditor);
    private readonly rowEditors = viewChildren<RowEditor<T>>(RowEditor);
    private readonly editViewState = signal<TableState | null>(null);
    private readonly editingEditors = computed(() => [...this.cellEditors(), ...this.rowEditors()].filter(editor => editor.isEditing()));
    private readonly requestedPageRows = computed(() => {
        const state = this.state(), filtered = this.mode() === 'server' ? [...this.rows()] : queryTable(this.rows(), this.columns(), state, {
            sort: this.sortable(), filters: this.columnFilters(), search: this.globalSearch(), searchColumns: this.searchColumns(), locale: this.effectiveLocale(),
        });
        if (!this.pagination() || this.mode() === 'server')
            return filtered;
        const page = Math.min(state.page, Math.max(1, Math.ceil(filtered.length / state.pageSize)));
        return filtered.slice((page - 1) * state.pageSize, page * state.pageSize);
    });
    /** Controlled state remains requested; an active editor's view is retained until save/cancel. */
    readonly displayTableState = computed<TableState>(() => {
        const requested = this.state(), retained = this.editViewState(), editors = this.editingEditors();
        if (!retained || !editors.length)
            return requested;
        const keys = new Set(this.requestedPageRows().map(row => this.key(row)));
        const removesRow = editors.some(editor => !keys.has(this.key(editor.row())) && this.rows().some(row => this.key(row) === this.key(editor.row())));
        const removesColumn = this.cellEditors().some(editor => editor.isEditing() && requested.hiddenColumns.includes(editor.column().id));
        return removesRow || removesColumn ? retained : requested;
    });
    readonly displayStateDeferred = computed(() => this.displayTableState() !== this.state());
    private readonly more = viewChild(InfiniteScroll);
    private readonly virtual = viewChild(VirtualDataTable<T>);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private owned: HTMLElement | null = null;
    private readonly headHeight = signal(0);
    private readonly footHeight = signal(0);
    private readonly fixedHeights = signal<Readonly<Record<string, number>>>({});
    private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
    private readonly minimumProbe = viewChild<ElementRef<HTMLElement>>('minimumProbe');
    protected readonly minimumColumnWidth = signal(1);
    protected readonly measuredWidths = signal<Record<string, number>>({});
    private readonly naturalWidths = signal<Record<string, number>>({});
    private readonly availableWidth = signal(0);
    protected readonly resolvedWidths = computed(() => fitTableColumns(this.visibleColumns(), this.availableWidth() - this.utilityCount() * this.minimumColumnWidth(), this.minimumColumnWidth(), this.displayTableState().columnWidths, this.naturalWidths(), this.autoFit(), this.autoWidth()));
    protected readonly utilityCount = computed(() => Number(this.selectionMode() !== 'none') + Number(!!this.detailTemplate()) + Number(this.rowActions().length > 0) + Number(this.editMode() === 'row'));
    protected readonly tableWidth = computed(() => Object.values(this.resolvedWidths()).reduce((a, b) => a + b, 0) + this.utilityCount() * this.minimumColumnWidth());
    protected readonly busy = computed(() => ['loading', 'updating'].includes(this.dataState().kind));
    protected readonly virtualUnsupported = computed(() => this.virtualize() && (this.editMode() !== 'none' || this.groupBy().length > 0 || this.columnGroups().length > 0 || this.fixedStartKeys().length > 0 || this.fixedEndKeys().length > 0 || this.aggregates().length > 0 || !!this.detailTemplate() || this.rowActions().length > 0 || Object.values(this.state().pinnedColumns).some(value => value !== 'none') || this.columns().some(column => !!column.pinned)));
    protected readonly configurationError = computed(() => this.uiDiagnostic_DataTableView(tableConfigurationError(this.rows(), this.columns(), this.keyField(), this.state())) || this.uiDiagnostic_DataTableView(tableHeaderProblem(this.columns(), this.columnGroups())) || (this.virtualUnsupported() ? this.uiRuntimeText_DataTableView('固定行・固定列・集計・階層見出し・詳細・編集・行操作は通常表を選択してください。') : null) || (new Set(this.groupBy()).size !== this.groupBy().length || this.groupBy().some(id => !this.columns().some(column => column.id === id)) ? this.uiRuntimeText_DataTableView('グループ列を確認してください。') : null) || (this.fixedStartKeys().some(key => this.fixedEndKeys().includes(key)) ? this.uiRuntimeText_DataTableView('同じ行を上下へ固定できません。') : null) || (this.aggregates().some(definition => !this.columns().some(column => column.id === definition.column) || !['sum', 'average', 'min', 'max', 'count'].includes(definition.kind)) ? this.uiRuntimeText_DataTableView('集計列と方法を確認してください。') : null) || (!this.tableId().trim() || !this.caption().trim() ? this.uiRuntimeText_DataTableView('表IDと表題が必要です。') : null));
    protected readonly blocked = computed(() => this.disabled() || this.busy() || !!this.configurationError());
    protected readonly orderedColumns = computed(() => {
        const byId = new Map(this.columns().map(c => [c.id, c]));
        const ids = [...new Set([...this.displayTableState().columnOrder, ...this.columns().map(c => c.id)])];
        return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
    });
    protected readonly visibleColumns = computed(() => this.orderedColumns().filter(c => !this.displayTableState().hiddenColumns.includes(c.id)));
    protected readonly filteredRows = computed(() => this.mode() === 'server' ? [...this.rows()] : queryTable(this.rows(), this.columns(), this.displayTableState(), {
        sort: this.sortable(), filters: this.columnFilters(), search: this.globalSearch(), searchColumns: this.searchColumns(), locale: this.effectiveLocale(),
    }));
    protected readonly displayPage = computed(() => this.mode() === 'client' && this.pagination() && Number.isSafeInteger(this.displayTableState().page) && this.displayTableState().page > 0
        ? Math.min(this.displayTableState().page, Math.max(1, Math.ceil(this.filteredRows().length / this.displayTableState().pageSize))) : this.displayTableState().page);
    protected readonly pageRows = computed(() => !this.pagination() || this.mode() === 'server' ? this.filteredRows()
        : this.filteredRows().slice((this.displayPage() - 1) * this.displayTableState().pageSize, this.displayPage() * this.displayTableState().pageSize));
    protected readonly virtualTemplates = computed(() => Object.fromEntries(this.templates().filter(template => !template.detail()).map(template => [template.column(), template.template])));
    protected readonly headerRows = computed(() => this.configurationError() ? [] : tableHeaderRows(this.visibleColumns(), this.columnGroups(), this.columns(), this.tableId()));
    protected readonly bodyEntries = computed<readonly TableGroupEntry<T>[]>(() => {
        if (this.configurationError())
            return [];
        const rows = this.pageRows(), start = rows.filter(row => this.fixedStartKeys().includes(this.key(row))), end = rows.filter(row => this.fixedEndKeys().includes(this.key(row))), normal = rows.filter(row => !this.fixedStartKeys().includes(this.key(row)) && !this.fixedEndKeys().includes(this.key(row)));
        const entries = this.groupBy().length ? flattenTableGroups(groupTable(normal, this.columns(), this.groupBy(), this.aggregates(), this.effectiveLocale(), this.uiEffective_missingLabel()), this.collapsedGroupIds()) : normal.map(row => ({ kind: 'row' as const, row, hidden: false }));
        return [...start.map(row => ({ kind: 'row' as const, row, hidden: false })), ...entries, ...end.map(row => ({ kind: 'row' as const, row, hidden: false }))];
    });
    private readonly footerValues = computed(() => this.configurationError() ? [] : aggregateTable(this.aggregateScope() === 'page' ? this.pageRows() : this.aggregateScope() === 'supplied' ? this.rows() : this.filteredRows(), this.columns(), this.aggregates()));
    protected readonly aggregateLabel = computed(() => this.mode() === 'server' ? this.uiRuntimeText_DataTableView('受け取った行の集計') : this.aggregateScope() === 'page' ? this.uiRuntimeText_DataTableView('表示ページの集計') : this.aggregateScope() === 'supplied' ? this.uiRuntimeText_DataTableView('受け取った全行の集計') : this.uiRuntimeText_DataTableView('検索結果の集計'));
    protected readonly total = computed(() => this.mode() === 'server' ? this.totalItems() : this.filteredRows().length);
    protected readonly selectionRows = computed(() => (this.selectAllScope() === 'filtered' && this.mode() === 'client' ? this.filteredRows() : this.pageRows()).filter(row => this.selectable(row)));
    protected readonly allSelected = computed(() => this.selectionRows().length > 0 && this.selectionRows().every(row => this.selectedKeys().includes(this.key(row))));
    protected readonly someSelected = computed(() => this.selectionRows().some(row => this.selectedKeys().includes(this.key(row))));
    protected readonly columnCount = computed(() => this.visibleColumns().length + Number(this.selectionMode() !== 'none') + Number(!!this.detailTemplate()) + Number(this.rowActions().length > 0) + Number(this.editMode() === 'row'));
    protected readonly activeFilterCount = computed(() => this.state().filters.filter(filter => this.columns().some(column => column.id === filter.column && column.filterable !== false) && filter.constraints.some(rule => rule.operator === 'missing' || rule.value !== undefined)).length);
    protected readonly statusMessage = computed(() => { const state = this.dataState(); return state.kind === 'ready' ? '' : state.message; });
    protected readonly emptyMessage = computed(() => this.busy() ? this.uiRuntimeText_DataTableView('一覧を取得しています。') : this.dataState().kind === 'error' ? this.uiRuntimeText_DataTableView('一覧を取得できません。')
        : this.globalSearch() && this.state().search.trim() || this.columnFilters() && this.state().filters.some(filter => filter.constraints.some(rule => rule.operator === 'missing' || rule.value !== undefined)) ? this.uiRuntimeText_DataTableView('条件に一致する結果はありません。') : this.uiRuntimeText_DataTableView('データはありません。'));
    private readonly maximumBodyHeight = signal(0);
    private readonly semanticControlHeight = signal(0);
    protected readonly startStack = computed(() => (this.stickyHeader() ? this.headHeight() : 0) + this.fixedStartKeys().reduce<number>((sum, key) => sum + (this.fixedHeights()[tableDomIdToken(typeof key + ':' + key)] ?? 0), 0));
    protected readonly endStack = computed(() => (this.stickyFooter() && this.aggregates().length ? this.footHeight() : 0) + this.fixedEndKeys().reduce<number>((sum, key) => sum + (this.fixedHeights()[tableDomIdToken(typeof key + ':' + key)] ?? 0), 0));
    protected readonly boundedViewportSize = computed(() => `max(var(--ui-size-table-viewport),${this.startStack() + this.endStack() + Math.max(this.maximumBodyHeight(), this.semanticControlHeight())}px)`);
    constructor() {
        let observer: ResizeObserver | undefined;
        const measure = () => {
            const probe = this.minimumProbe()?.nativeElement.getBoundingClientRect();
            const min = probe?.width;
            if (probe?.height && probe.height !== this.semanticControlHeight())
                this.semanticControlHeight.set(probe.height);
            if (min && min !== this.minimumColumnWidth())
                this.minimumColumnWidth.set(min);
            const container = this.viewport()?.nativeElement;
            if (!container)
                return;
            if (container.clientWidth !== this.availableWidth())
                this.availableWidth.set(container.clientWidth);
            const table = container.querySelector<HTMLTableElement>('table');
            if (table && this.autoFit() === 'content' && this.autoWidth()) {
                const clone = table.cloneNode(true) as HTMLTableElement;
                clone.inert = true;
                clone.setAttribute('aria-hidden', 'true');
                clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
                clone.querySelectorAll('[name],[form]').forEach(element => { element.removeAttribute('name'); element.removeAttribute('form'); });
                Object.assign(clone.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', inlineSize: 'max-content', minInlineSize: '0', tableLayout: 'auto' });
                clone.querySelectorAll<HTMLTableColElement>('col').forEach(element => element.style.width = '');
                container.appendChild(clone);
                const natural: Record<string, number> = Object.create(null);
                try {
                    clone.querySelectorAll<HTMLElement>('th[data-column-id]').forEach(element => { natural[element.dataset['columnId']!] = element.getBoundingClientRect().width; });
                }
                finally {
                    clone.remove();
                }
                if (JSON.stringify(natural) !== JSON.stringify(this.naturalWidths()))
                    this.naturalWidths.set(natural);
            }
            const widths: Record<string, number> = Object.create(null);
            container.querySelectorAll<HTMLElement>('th[data-column-id]').forEach(element => { widths[element.dataset['columnId']!] = element.getBoundingClientRect().width; });
            if (JSON.stringify(widths) !== JSON.stringify(this.measuredWidths()))
                this.measuredWidths.set(widths);
            const head = table?.querySelector('thead')?.getBoundingClientRect().height ?? 0, foot = table?.querySelector('tfoot')?.getBoundingClientRect().height ?? 0;
            if (head !== this.headHeight())
                this.headHeight.set(head);
            if (foot !== this.footHeight())
                this.footHeight.set(foot);
            const bodyHeight = Array.from(container.querySelectorAll<HTMLElement>('tbody tr:not([data-fixed-row])'), row => row.getBoundingClientRect().height).reduce((maximum, height) => Math.max(maximum, height), 0);
            if (bodyHeight !== this.maximumBodyHeight())
                this.maximumBodyHeight.set(bodyHeight);
            const heights: Record<string, number> = {};
            container.querySelectorAll<HTMLElement>('tr[data-fixed-row]').forEach(row => { heights[row.dataset['tableKey']!] = row.getBoundingClientRect().height; });
            if (JSON.stringify(heights) !== JSON.stringify(this.fixedHeights()))
                this.fixedHeights.set(heights);
        };
        let lastCorrection: TableState | null = null;
        const render = afterRenderEffect(() => {
            this.columns();
            this.state();
            this.rows();
            this.pagination();
            this.autoFit();
            this.autoWidth();
            this.columnGroups();
            this.aggregates();
            this.groupBy();
            this.collapsedGroupIds();
            this.fixedStartKeys();
            this.fixedEndKeys();
            this.editMode();
            this.rowEditors();
            this.cellEditors();
            const editing = this.editingEditors(), displayed = this.displayTableState();
            untracked(() => {
                if (editing.length && this.editViewState() !== displayed)
                    this.editViewState.set(displayed);
                else if (!editing.length && this.editViewState() !== null)
                    this.editViewState.set(null);
            });
            this.columnControls();
            this.columnFilters();
            this.globalSearch();
            if (!this.blocked() && !this.displayStateDeferred() && this.state().page !== this.displayPage() && lastCorrection !== this.state()) {
                lastCorrection = this.state();
                this.stateChange.emit({ ...this.state(), page: this.displayPage() });
            }
            const container = this.viewport()?.nativeElement;
            observer?.disconnect();
            if (typeof ResizeObserver !== 'undefined' && (container || this.minimumProbe())) {
                observer = new ResizeObserver(measure);
                if (container) {
                    observer.observe(container);
                    container.querySelectorAll('th[data-column-id],tbody tr,thead,tfoot').forEach(element => observer!.observe(element));
                }
                if (this.minimumProbe())
                    observer.observe(this.minimumProbe()!.nativeElement);
            }
            measure();
            const active = this.host.ownerDocument.activeElement;
            if (this.owned && (!this.owned.isConnected || !canFocus(this.owned)) && (active === this.host.ownerDocument.body || active === this.owned)) {
                this.owned = null;
                if (canFocus(container ?? null))
                    container!.focus({ preventScroll: true });
                else if (canFocus(this.host))
                    this.host.focus({ preventScroll: true });
            }
        });
        // A projected resource can resize a fixed stack without changing table
        // inputs. Recheck the active ordinary control or managed editor after the measured insets
        // have reached the DOM; keep its native focus and selection untouched.
        const reveal = afterRenderEffect(() => {
            this.startStack(); this.endStack(); this.maximumBodyHeight();
            this.availableWidth(); this.measuredWidths(); this.viewport();
            untracked(() => this.revealFocusedBodyControl());
        });
        inject(DestroyRef).onDestroy(() => { observer?.disconnect(); render.destroy(); reveal.destroy(); this.owned = null; });
    }
    private revealFocusedBodyControl(): void {
        const container = this.viewport()?.nativeElement;
        const active = this.host.ownerDocument.activeElement;
        if (!container || !(active instanceof HTMLElement) || !container.contains(active) || !canFocus(active))
            return;
        const owner = active.closest<HTMLElement>('[data-table-owner]');
        const managed = !!owner?.hasAttribute('data-table-managed-editor') && owner.parentElement?.closest('[data-table-owner]') === this.host;
        if (owner !== this.host && !managed)
            return;
        const table = container.querySelector(':scope > table'), row = active.closest('tbody tr');
        if (!table || !row || row.closest('table') !== table)
            return;
        // Expansion rows retain a separate identity: they must not enter native
        // data-row queries, and their source row still owns the fixed-row boundary.
        const editorKey = row.getAttribute('data-table-editor-key');
        const source = row.hasAttribute('data-row-key') ? row : managed && editorKey !== null
            ? Array.from(table.querySelectorAll(':scope > tbody > tr[data-table-key]')).find(candidate => candidate.getAttribute('data-table-key') === editorKey) : null;
        if (!source || source.hasAttribute('data-fixed-row'))
            return;
        const view = this.host.ownerDocument.defaultView;
        if (!view)
            return;
        const style = view.getComputedStyle(active), bounds = container.getBoundingClientRect();
        const ring = style.outlineStyle === 'none' ? 0 : Math.max(0, (parseFloat(style.outlineWidth) || 0) + (parseFloat(style.outlineOffset) || 0));
        const top = bounds.top + container.clientTop + this.startStack();
        const bottom = bounds.top + container.clientTop + container.clientHeight - this.endStack();
        const scrollWithin = (start: number, end: number) => {
            const current = active.getBoundingClientRect();
            if (current.height + 2 * ring > end - start)
                return;
            if (current.top - ring < start)
                container.scrollTop += Math.floor(current.top - ring - start);
            else if (current.bottom + ring > end)
                container.scrollTop += Math.ceil(current.bottom + ring - end);
        };
        // First move past the caption/natural table origin. Before that move,
        // not-yet-stuck rows can temporarily leave less room than the stack budget.
        scrollWithin(top, bottom);
        // clientHeight/scrollTop may round to whole CSS pixels. Correct once more
        // against the actual painted sticky edges after the first scroll's layout.
        let paintedTop = top, paintedBottom = bottom;
        row.closest('table')?.querySelectorAll<HTMLElement>(':scope > tbody > tr[data-fixed-row],:scope > thead.ui-data-table__head--sticky,:scope > tfoot.ui-data-table__footer--sticky').forEach(fixed => {
            const edge = fixed.getBoundingClientRect();
            if (fixed.dataset['fixedRow'] === 'start' || fixed.tagName === 'THEAD')
                paintedTop = Math.max(paintedTop, edge.bottom);
            else
                paintedBottom = Math.min(paintedBottom, edge.top);
        });
        scrollWithin(paintedTop, paintedBottom);
    }
    protected ownFocus(event: FocusEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            this.owned = null;
            return;
        }
        const owner = target.closest<HTMLElement>('[data-table-owner]');
        this.owned = target === this.viewport()?.nativeElement || target.hasAttribute('data-table-owned-control') && owner === this.host || (target.hasAttribute('data-table-control') || target === owner) && !!owner?.hasAttribute('data-table-managed-editor') && owner.parentElement?.closest('[data-table-owner]') === this.host ? target : null;
        // Focus can change after all measured geometry has settled. Native
        // scrolling alone need not reveal the control past the fixed stacks.
        this.revealFocusedBodyControl();
    }
    protected leaveFocus(event: FocusEvent): void {
        if (event.relatedTarget instanceof Node && event.relatedTarget !== this.host.ownerDocument.body && !this.host.contains(event.relatedTarget))
            this.owned = null;
    }
    protected columnById(id: string): TableColumn<T> { return this.columns().find(column => column.id === id)!; }
    protected editableColumn(column: TableColumn<T>): TableEditableColumn<T> { return column; }
    protected columnFilter(id: string): TableFilter | null { return this.state().filters.find(filter => filter.column === id) ?? null; }
    protected setFilter(id: string, filter: TableFilter | null): void { this.update({ filters: [...this.state().filters.filter(item => item.column !== id), ...(filter ? [filter] : [])], page: 1 }); }
    protected cellHeaders(id: string): string { return tableCellHeaders(this.headerRows(), id); }
    protected encodedKey(row: T): string { return tableDomIdToken(typeof this.key(row) + ':' + this.key(row)); }
    protected editorId(row: T, column: string): string { return this.tableId() + '-edit-' + tableDomIdPair(typeof this.key(row) + ':' + this.key(row), column); }
    protected entryId(entry: TableGroupEntry<T>): string { return entry.kind === 'group' ? 'group:' + entry.group.id : 'row:' + this.encodedKey(entry.row); }
    protected toggleGroup(id: string): void {
        if (!this.blocked())
            this.collapsedGroupIdsChange.emit(this.collapsedGroupIds().includes(id) ? this.collapsedGroupIds().filter(value => value !== id) : [...this.collapsedGroupIds(), id]);
    }
    protected aggregatesFor(id: string): readonly TableAggregateValue[] { return this.footerValues().filter(value => value.column === id); }
    protected aggregateText(value: TableAggregateValue): string { const labels = { sum: this.uiRuntimeText_DataTableView('合計'), average: this.uiRuntimeText_DataTableView('平均'), min: this.uiRuntimeText_DataTableView('最小'), max: this.uiRuntimeText_DataTableView('最大'), count: this.uiRuntimeText_DataTableView('既知の件数') }, column = this.columns().find(column => column.id === value.column); return (column?.header ?? value.column) + ' ' + (value.label ?? labels[value.kind]) + ': ' + (value.value === null ? this.uiEffective_missingLabel() : new Intl.NumberFormat(this.effectiveLocale()).format(value.value)) + (value.missing ? this.uiRuntimeText_DataTableView(' (既知 ') + value.known + this.uiRuntimeText_DataTableView('件・') + this.uiEffective_missingLabel() + ' ' + value.missing + this.uiRuntimeText_DataTableView('件)') : ''); }
    protected rowSide(row: T): 'start' | 'end' | null { return this.fixedStartKeys().includes(this.key(row)) ? 'start' : this.fixedEndKeys().includes(this.key(row)) ? 'end' : null; }
    protected fixedOffset(row: T, side: 'start' | 'end'): number { const keys = this.pageRows().filter(row => (side === 'start' ? this.fixedStartKeys() : this.fixedEndKeys()).includes(this.key(row))).map(row => this.key(row)), index = keys.indexOf(this.key(row)), prior = side === 'start' ? keys.slice(0, index) : keys.slice(index + 1); return (side === 'start' && this.stickyHeader() ? this.headHeight() : side === 'end' && this.stickyFooter() && this.aggregates().length ? this.footHeight() : 0) + prior.reduce<number>((sum, key) => sum + (this.fixedHeights()[tableDomIdToken(typeof key + ':' + key)] ?? 0), 0); }
    protected beginRow(row: T): void {
        if (!this.blocked())
            this.rowEditors().find(editor => this.key(editor.row()) === this.key(row))?.beginEdit();
    }
    protected cellEditingChanged(editing: boolean): void {
        if (editing)
            this.editViewState.set(this.displayTableState());
    }
    protected rowEditingChanged(row: T, editing: boolean): void {
        if (editing) {
            this.editViewState.set(this.displayTableState());
            return;
        }
        const active = this.host.ownerDocument.activeElement;
        if (!(active instanceof HTMLElement) || !active.closest('ui-row-editor'))
            return;
        const start = this.viewport()?.nativeElement.querySelector<HTMLButtonElement>(`:scope > table > tbody > tr[data-table-key="${this.encodedKey(row)}"] > td > button[data-table-row-edit-start]`);
        queueMicrotask(() => {
            if (this.host.ownerDocument.activeElement === active || this.host.ownerDocument.activeElement === this.host.ownerDocument.body)
                start?.focus({ preventScroll: true });
        });
    }
    protected edited(row: T): void { const key = this.key(row); this.rowsChange.emit(this.rows().map(item => this.key(item) === key ? row : item)); }
    completeEdit(requestId: number, row?: T): boolean { return [...this.cellEditors(), ...this.rowEditors()].find(editor => editor.pendingRequestId() === requestId)?.complete(requestId, row) ?? false; }
    failEdit(requestId: number, message: string): boolean { return [...this.cellEditors(), ...this.rowEditors()].find(editor => editor.pendingRequestId() === requestId)?.fail(requestId, message) ?? false; }
    invalidatePending(): void { [...this.cellEditors(), ...this.rowEditors()].forEach(editor => editor.invalidatePending()); this.more()?.invalidatePending(); }
    protected requestNativeView(): void {
        if (this.virtualUnsupported() && this.nativeViewAvailable() && !this.disabled() && !this.busy())
            this.nativeViewRequested.emit();
    }
    scrollToIndex(index: number): boolean { return this.virtual()?.scrollToIndex(index) ?? false; }
    scrollToOffset(offset: number): boolean { return this.virtual()?.scrollToOffset(offset) ?? false; }
    completeLoad(requestId: number): boolean { return this.more()?.completeLoad(requestId) ?? false; }
    failLoad(requestId: number, message: string): boolean { return this.more()?.failLoad(requestId, message) ?? false; }
    protected export(intent: TableOutputIntent): void {
        if (this.blocked())
            return;
        const rows = tableOutputRows(intent.scope, this.rows(), this.filteredRows(), this.pageRows(), this.selectedKeys(), row => this.key(row)), columns = this.visibleColumns(), matrix = tableOutputMatrix(rows, columns, this.effectiveLocale(), this.uiEffective_missingLabel());
        this.outputRequested.emit({ ...intent, matrix, text: serializeTableMatrix(matrix, intent.format === 'csv' ? ',' : '\t'), rowCount: rows.length, columnIds: columns.map(column => column.id) });
    }
    protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
    protected number(event: Event): number { return Number(this.value(event)); }
    protected key(row: T): TableKey { return row[this.keyField()] as TableKey; }
    protected rowLabel(row: T): string { return tableText(row, this.columns()[0], this.effectiveLocale(), this.uiEffective_missingLabel(),this.uiLocaleDefaults().numberOptions,this.uiLocaleDefaults().messages); }
    protected cellText(row: T, column: TableColumn<T>): string { return tableText(row, column, this.effectiveLocale(), this.uiEffective_missingLabel(),this.uiLocaleDefaults().numberOptions,this.uiLocaleDefaults().messages); }
    protected cellValue(row: T, column: TableColumn<T>): unknown { return tableValue(row, column); }
    protected cellTemplate(id: string): TemplateRef<TableTemplateContext<T>> | null { return this.templates().find(t => !t.detail() && t.column() === id)?.template ?? null; }
    protected detailTemplate(): TemplateRef<TableTemplateContext<T>> | null { return this.templates().find(t => t.detail())?.template ?? null; }
    protected fieldId(id: string): string { return this.tableId() + '-filter-' + tableDomIdToken(id); }
    protected update(patch: Partial<TableState>): void {
        if (!this.blocked())
            this.stateChange.emit({ ...this.state(), page: this.displayPage(), ...patch });
    }
    protected search(search: string): void { this.update({ search, page: 1 }); }
    protected sort(column: string): void { this.update({ sort: nextTableSort(this.state().sort, column, this.sortMode() === 'multiple'), page: 1 }); }
    protected ariaSort(id: string): 'ascending' | 'descending' | null { const first = this.sortable() ? this.displayTableState().sort[0] : undefined; return first?.column === id ? first.direction === 'asc' ? 'ascending' : 'descending' : null; }
    protected sortMarker(id: string): string { const index = this.displayTableState().sort.findIndex(s => s.column === id); return index < 0 ? '' : (this.displayTableState().sort[index].direction === 'asc' ? '↑' : '↓') + (this.sortMode() === 'multiple' ? String(index + 1) : ''); }
    protected sortLabel(column: TableColumn<T>): string { return column.header + this.uiRuntimeText_DataTableView('で並べ替え') + (this.sortMarker(column.id) ? ': ' + this.sortMarker(column.id) : ''); }
    protected filterValue(id: string): string { const value = this.state().filters.find(f => f.column === id)?.constraints[0]?.value; return value === undefined ? '' : String(value); }
    protected filterOperator(column: TableColumn<T>): TableOperator { return this.state().filters.find(f => f.column === column.id)?.constraints[0]?.operator ?? (column.options || column.type === 'number' || column.type === 'date' ? 'eq' : 'contains'); }
    protected filter(column: TableColumn<T>, value: string, operator = this.filterOperator(column)): void {
        const filters = this.state().filters.filter(f => f.column !== column.id);
        filters.push({ column: column.id, match: 'and', constraints: [{ operator, ...(value === '' ? {} : { value: column.type === 'number' ? Number(value) : value }) }] });
        this.update({ filters, page: 1 });
    }
    protected operator(column: TableColumn<T>, operator: string): void {
        if (['eq', 'gte', 'lte', 'before', 'after'].includes(operator))
            this.filter(column, this.filterValue(column.id), operator as TableOperator);
    }
    protected lastVisible(id: string): boolean { const columns = this.columns().filter(column => !this.state().hiddenColumns.includes(column.id)); return columns.length === 1 && columns[0].id === id; }
    protected toggleColumn(id: string): void {
        if (this.lastVisible(id))
            return;
        this.update({ hiddenColumns: this.state().hiddenColumns.includes(id) ? this.state().hiddenColumns.filter(c => c !== id) : [...this.state().hiddenColumns, id] });
    }
    protected moveColumn(id: string, direction: number): void {
        const ids = this.orderedColumns().map(c => c.id);
        const index = ids.indexOf(id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= ids.length)
            return;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        this.update({ columnOrder: ids });
    }
    protected virtualWidths(widths: Readonly<Record<string, number>>): void {
        if (JSON.stringify(widths) !== JSON.stringify(this.measuredWidths()))
            this.measuredWidths.set({ ...widths });
    }
    protected width(column: TableColumn<T>): number | null { return tableOwnValue(this.displayTableState().columnWidths, column.id) ?? column.width ?? (!this.autoWidth() ? this.minimumColumnWidth() : null); }
    protected measuredWidth(column: TableColumn<T>): number | undefined { return tableOwnValue(this.measuredWidths(), column.id); }
    protected minimumWidth(column: TableColumn<T>): number { return column.minWidth ?? this.minimumColumnWidth(); }
    protected maximumWidth(column: TableColumn<T>): number { return column.maxWidth ?? this.minimumWidth(column) * 8; }
    protected resizeColumn(column: TableColumn<T>, value: number): void {
        if (!this.resizableColumns() || !Number.isFinite(value))
            return;
        this.update({ columnWidths: { ...this.state().columnWidths, [column.id]: Math.min(this.maximumWidth(column), Math.max(this.minimumWidth(column), value)) } });
    }
    protected pin(column: TableColumn<T>): 'start' | 'end' | null { const pin = tableOwnValue(this.displayTableState().pinnedColumns, column.id) ?? column.pinned; return pin === 'none' || !pin ? null : pin; }
    protected setPin(id: string, value: string): void {
        if (['none', 'start', 'end'].includes(value))
            this.update({ pinnedColumns: { ...this.state().pinnedColumns, [id]: value as 'none' | 'start' | 'end' } });
    }
    protected pinOffset(column: TableColumn<T>, side: 'start' | 'end'): number {
        const columns = this.visibleColumns();
        const index = columns.findIndex(c => c.id === column.id);
        return (side === 'start' ? columns.slice(0, index) : columns.slice(index + 1)).filter(c => this.pin(c) === side).reduce((sum, c) => sum + (this.measuredWidth(c) ?? this.width(c) ?? this.minimumColumnWidth()), 0);
    }
    protected resetColumns(): void { this.update({ columnOrder: [], hiddenColumns: [], columnWidths: {}, pinnedColumns: {} }); }
    protected selectable(row: T): boolean { return this.rowSelectable()(row); }
    protected select(row: T, event: Event): void {
        if (this.blocked() || !this.selectable(row) || this.selectionMode() === 'none')
            return;
        const key = this.key(row);
        const checked = (event.target as HTMLInputElement).checked;
        const remaining = this.selectedKeys().filter(k => k !== key);
        this.selectedKeysChange.emit(this.selectionMode() === 'single' ? [key] : checked ? [...remaining, key] : remaining);
    }
    protected selectAll(event: Event): void {
        if (this.blocked() || this.selectionMode() !== 'multiple')
            return;
        const keys = this.selectionRows().map(row => this.key(row));
        this.selectedKeysChange.emit((event.target as HTMLInputElement).checked ? [...new Set([...this.selectedKeys(), ...keys])] : this.selectedKeys().filter(key => !keys.includes(key)));
    }
    protected toggleDetail(row: T): void {
        if (!this.blocked()) {
            const key = this.key(row);
            this.expandedKeysChange.emit(this.expandedKeys().includes(key) ? this.expandedKeys().filter(k => k !== key) : [...this.expandedKeys(), key]);
        }
    }
    protected activate(action: string, row: T): void {
        const command = this.rowActions().find(a => a.id === action);
        if (command && !this.blocked() && !command.disabled?.(row))
            this.rowAction.emit({ action, row, key: this.key(row) });
    }
}
