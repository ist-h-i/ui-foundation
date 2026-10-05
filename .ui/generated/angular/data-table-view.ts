import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren,
  DestroyRef, Directive, ElementRef, inject, input, output, signal, TemplateRef, viewChild,
} from '@angular/core';
import { ActionControl } from './action-control';
import { Pagination } from './pagination';
import { DataTable } from './data-table';
import {
  createTableState, fitTableColumns, nextTableSort, queryTable, tableConfigurationError, tableText, tableValue,
  type TableColumn, type TableConstraint, type TableFilter, type TableKey, type TableOperator, type TableState,
} from './table-model';

export type TableDataState = { kind: 'ready' } | { kind: 'loading' | 'updating' | 'error' | 'partial'; message: string };
export interface TableRowAction<T> { id: string; label: string; disabled?: (row: T) => boolean }
export interface TableTemplateContext<T extends object> { $implicit: T; value: unknown; column: TableColumn<T> | null }
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
  imports: [NgTemplateOutlet, ActionControl, Pagination, DataTable], changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-data-table', '[attr.aria-busy]': 'busy() ? "true" : null' },
  template: `
    <div class="ui-data-table__toolbar">
      @if (globalSearch()) {
        <label>全体検索
          <input class="ui-field-control" type="search" [value]="state().search" [disabled]="blocked()" (input)="search(value($event))">
        </label>
        <button uiAction [disabled]="blocked() || !state().search" (click)="search('')">検索を解除</button>
      }
      @if (columnControls()) {
        <details class="ui-data-table__columns"><summary>列の設定</summary>
          @for (column of columns(); track column.id) {
            <div class="ui-data-table__column-setting">
              <label><input type="checkbox" [checked]="!state().hiddenColumns.includes(column.id)" [disabled]="blocked() || lastVisible(column.id)" (change)="toggleColumn(column.id)">{{ column.header }}</label>
              <button uiAction [attr.aria-label]="column.header + '列を前へ'" [disabled]="blocked() || orderedColumns()[0]?.id === column.id" (click)="moveColumn(column.id, -1)">前へ</button>
              <button uiAction [attr.aria-label]="column.header + '列を後へ'" [disabled]="blocked() || orderedColumns().at(-1)?.id === column.id" (click)="moveColumn(column.id, 1)">後へ</button>
              <div><label [for]="tableId() + '-pin-' + column.id">固定: {{ column.header }}</label>
                <select [id]="tableId() + '-pin-' + column.id" class="ui-field-control" [value]="pin(column) || 'none'" [disabled]="blocked()" (change)="setPin(column.id, value($event))">
                  <option value="none">固定しない</option><option value="start">先頭側</option><option value="end">末尾側</option>
                </select>
              </div>
              @if (resizableColumns()) {
                <label>列幅: {{ column.header }} ({{ width(column) || measuredWidths()[column.id] || minimumColumnWidth() }}px)
                  <input type="range" [min]="minimumWidth(column)" [max]="maximumWidth(column)" [value]="width(column) || measuredWidths()[column.id] || minimumColumnWidth()"
                    [disabled]="blocked()" (input)="resizeColumn(column, number($event))">
                </label>
              }
            </div>
          }
          <button uiAction [disabled]="blocked()" (click)="resetColumns()">列の設定を戻す</button>
        </details>
      }
      <ng-content select="[uiTableToolbar]" />
    </div>
    <div class="ui-sr-only" role="status" aria-atomic="true">{{ statusMessage() }}</div>
    @if (configurationError()) { <p role="alert">表の設定を確認してください。{{ configurationError() }}</p> }
    @if (dataState().kind !== 'ready') { <p class="ui-data-table__message">{{ statusMessage() }}</p> }
    @if (dataState().kind === 'error' || dataState().kind === 'partial') {
      @if (retryAvailable()) { <button uiAction [busy]="busy()" (click)="retry.emit()">一覧を再取得</button> }
    }
    <div #viewport class="ui-data-table__viewport" role="region" [attr.aria-label]="caption() + 'の表領域'" tabindex="0"
      [hidden]="!!configurationError()" [class.ui-data-table__viewport--bounded]="stickyHeader()">
      <span #minimumProbe class="ui-data-table__minimum-probe" aria-hidden="true"></span>
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
          @if (rowActions().length) { <col [style.width.px]="minimumColumnWidth()"> }
        </colgroup>
        <thead [class.ui-data-table__head--sticky]="stickyHeader()">
          <tr>
            @if (selectionMode() !== 'none') {
              <th scope="col">
                @if (selectionMode() === 'multiple') {
                  <input type="checkbox" [attr.aria-label]="selectAllScope() === 'filtered' && mode() === 'client' ? '検索結果をすべて選択' : 'このページをすべて選択'"
                    [checked]="allSelected()" [indeterminate]="someSelected() && !allSelected()" [disabled]="blocked() || !selectionRows().length" (change)="selectAll($event)">
                } @else { 選択 }
              </th>
            }
            @if (detailTemplate()) { <th scope="col">詳細</th> }
            @for (column of visibleColumns(); track column.id) {
              <th scope="col" [attr.data-column-id]="column.id" [attr.aria-sort]="ariaSort(column.id)" [class.ui-data-table__pinned]="!!pin(column)"
                [style.inset-inline-start.px]="pin(column) === 'start' ? pinOffset(column, 'start') : null"
                [style.inset-inline-end.px]="pin(column) === 'end' ? pinOffset(column, 'end') : null">
                @if (sortable() && column.sortable !== false) {
                  <button uiAction [disabled]="blocked()" [attr.aria-label]="sortLabel(column)" (click)="sort(column.id)">{{ column.header }} {{ sortMarker(column.id) }}</button>
                } @else { {{ column.header }} }
              </th>
            }
            @if (rowActions().length) { <th scope="col">操作</th> }
          </tr>
          @if (columnFilters()) {
            <tr>
              @if (selectionMode() !== 'none') { <td></td> }
              @if (detailTemplate()) { <td></td> }
              @for (column of visibleColumns(); track column.id) {
                <td [class.ui-data-table__pinned]="!!pin(column)"
                  [style.inset-inline-start.px]="pin(column) === 'start' ? pinOffset(column, 'start') : null"
                  [style.inset-inline-end.px]="pin(column) === 'end' ? pinOffset(column, 'end') : null">
                  @if (column.filterable !== false) {
                    <label class="ui-sr-only" [for]="fieldId(column.id)">{{ column.header }}の条件</label>
                    @if (column.options) {
                      <select class="ui-field-control" [id]="fieldId(column.id)" [value]="filterValue(column.id)" [disabled]="blocked()" (change)="filter(column, value($event))">
                        <option value="">すべて</option>
                        @for (option of column.options; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                      </select>
                    } @else {
                      <input class="ui-field-control" [id]="fieldId(column.id)" [type]="column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'search'"
                        [value]="filterValue(column.id)" [disabled]="blocked()" (input)="filter(column, value($event))">
                    }
                    @if (column.type === 'number' || column.type === 'date') {
                      <select class="ui-field-control" [attr.aria-label]="column.header + 'の比較方法'" [disabled]="blocked()" [value]="filterOperator(column)" (change)="operator(column, value($event))">
                        <option value="eq">等しい</option>
                        @if (column.type === 'number') { <option value="gte">以上</option><option value="lte">以下</option> }
                        @else { <option value="after">より後</option><option value="before">より前</option> }
                      </select>
                    }
                  }
                </td>
              }
              @if (rowActions().length) { <td></td> }
            </tr>
          }
        </thead>
        <tbody>
          @for (row of pageRows(); track key(row)) {
            <tr [attr.data-row-key]="key(row)" [class.ui-data-table__row--selected]="selectedKeys().includes(key(row))">
              @if (selectionMode() !== 'none') {
                <td><input [type]="selectionMode() === 'single' ? 'radio' : 'checkbox'" [name]="tableId() + '-selection'"
                  [attr.aria-label]="'行を選択: ' + rowLabel(row)" [checked]="selectedKeys().includes(key(row))"
                  [disabled]="blocked() || !selectable(row)" (change)="select(row, $event)"></td>
              }
              @if (detailTemplate()) {
                <td><button uiAction [disabled]="blocked()" [attr.aria-label]="'詳細: ' + rowLabel(row)" [attr.aria-expanded]="expandedKeys().includes(key(row))" (click)="toggleDetail(row)">{{ expandedKeys().includes(key(row)) ? '閉じる' : '開く' }}</button></td>
              }
              @for (column of visibleColumns(); track column.id) {
                <td [class.ui-data-table__pinned]="!!pin(column)" [class.ui-data-table__cell--nowrap]="!wrapCells()" [class.ui-data-table__cell--ellipsis]="ellipsis()"
                  [style.inset-inline-start.px]="pin(column) === 'start' ? pinOffset(column, 'start') : null"
                  [style.inset-inline-end.px]="pin(column) === 'end' ? pinOffset(column, 'end') : null" [attr.title]="ellipsis() ? cellText(row, column) : null">
                  @if (cellTemplate(column.id); as template) {
                    <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{ $implicit: row, value: cellValue(row, column), column: column }" />
                  } @else { {{ cellText(row, column) }} }
                </td>
              }
              @if (rowActions().length) {
                <td><div class="ui-data-table__actions">
                  @for (action of rowActions(); track action.id) { <button uiAction [disabled]="blocked() || !!action.disabled?.(row)" (click)="activate(action.id, row)">{{ action.label }}</button> }
                </div></td>
              }
            </tr>
            @if (detailTemplate(); as detail) {
              <tr [hidden]="!expandedKeys().includes(key(row))"><td [attr.colspan]="columnCount()"><ng-container [ngTemplateOutlet]="detail" [ngTemplateOutletContext]="{ $implicit: row, value: null, column: null }" /></td></tr>
            }
          } @empty {
            <tr><td [attr.colspan]="columnCount()">{{ emptyMessage() }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    @if (pagination() && !configurationError()) {
      <ui-pagination [page]="displayPage()" [totalItems]="total()" [pageSize]="state().pageSize" [pageSizeOptions]="pageSizeOptions()"
        [busy]="busy()" [disabled]="disabled()" [label]="caption() + 'のページ'" (pageChange)="update({page: $event})" (pageSizeChange)="update({pageSize: $event, page: 1})" />
    }
  `,
  styles: `
    :host { display: block; min-inline-size: 0; max-inline-size: 100%; color: var(--ui-color-text); font: inherit; overflow-wrap: anywhere; }
    :host([hidden]), [hidden] { display: none !important; }
    .ui-data-table__toolbar, .ui-data-table__actions, .ui-data-table__column-setting { display: flex; flex-wrap: wrap; gap: var(--ui-space-control-gap); align-items: center; }
    .ui-data-table__toolbar { margin-block-end: var(--ui-space-field); }
    .ui-data-table__toolbar label, .ui-data-table__column-setting label { display: grid; gap: var(--ui-space-control-gap); min-inline-size: 0; max-inline-size: 100%; }
    .ui-data-table__columns { max-inline-size: 100%; }
    .ui-data-table__column-setting { padding-block: var(--ui-space-control-y); }
    summary { cursor: pointer; padding: var(--ui-space-control-y); min-block-size: var(--ui-size-control); box-sizing: border-box; }
    .ui-data-table__viewport { overflow: auto; max-inline-size: 100%; min-inline-size: 0; position: relative; overscroll-behavior: contain; }
    .ui-data-table__viewport--bounded { max-block-size: var(--ui-size-table-viewport); }
    .ui-data-table__minimum-probe { position: absolute; visibility: hidden; inline-size: var(--ui-size-table-column-min); block-size: 0; pointer-events: none; }
    table { min-inline-size: 100%; }
    .ui-data-table__table--content { inline-size: max-content; table-layout: auto; }
    .ui-data-table__table--fixed { inline-size: 100%; table-layout: fixed; }
    th, td { min-inline-size: var(--ui-size-table-column-min); overflow-wrap: anywhere; }
    .ui-data-table__utility-column { inline-size: calc(var(--ui-size-control) + 2 * var(--ui-space-table-x)); }
    .ui-data-table__head--sticky { position: sticky; inset-block-start: 0; z-index: 1; }
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
  readonly caption = input.required<string>();
  readonly tableId = input.required<string>();
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly TableColumn<T>[]>();
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
  readonly selectedKeys = input<readonly TableKey[]>([]);
  readonly selectedKeysChange = output<readonly TableKey[]>();
  readonly rowSelectable = input<(row: T) => boolean>(() => true);
  readonly selectAllScope = input<'page' | 'filtered'>('page');
  readonly expandedKeys = input<readonly TableKey[]>([]);
  readonly expandedKeysChange = output<readonly TableKey[]>();
  readonly rowActions = input<readonly TableRowAction<T>[]>([]);
  readonly rowAction = output<{ action: string; row: T; key: TableKey }>();
  readonly striped = input(false, { transform: booleanAttribute });
  readonly borders = input(false, { transform: booleanAttribute });
  readonly hoverRows = input(true, { transform: booleanAttribute });
  readonly rowSpacing = input<'profile' | 'compact' | 'comfortable'>('profile');
  readonly wrapCells = input(true, { transform: booleanAttribute });
  readonly ellipsis = input(false, { transform: booleanAttribute });
  readonly locale = input('ja-JP');
  readonly missingLabel = input('未取得');
  readonly retryAvailable = input(false, { transform: booleanAttribute });
  readonly retry = output<void>();
  private readonly templates = contentChildren<TableTemplate<T>>(TableTemplate);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly minimumProbe = viewChild<ElementRef<HTMLElement>>('minimumProbe');
  protected readonly minimumColumnWidth = signal(1);
  protected readonly measuredWidths = signal<Record<string, number>>({});
  private readonly naturalWidths = signal<Record<string, number>>({});
  private readonly availableWidth = signal(0);
  protected readonly resolvedWidths = computed(() => fitTableColumns(this.visibleColumns(), this.availableWidth() - this.utilityCount() * this.minimumColumnWidth(), this.minimumColumnWidth(), this.state().columnWidths, this.naturalWidths(), this.autoFit(), this.autoWidth()));
  protected readonly utilityCount = computed(() => Number(this.selectionMode() !== 'none') + Number(!!this.detailTemplate()) + Number(this.rowActions().length > 0));
  protected readonly tableWidth = computed(() => Object.values(this.resolvedWidths()).reduce((a,b)=>a+b,0) + this.utilityCount() * this.minimumColumnWidth());
  protected readonly busy = computed(() => ['loading', 'updating'].includes(this.dataState().kind));
  protected readonly configurationError = computed(() => tableConfigurationError(this.rows(), this.columns(), this.keyField(), this.state()) || (!this.tableId().trim() || !this.caption().trim() ? '表IDと表題が必要です。' : null));
  protected readonly blocked = computed(() => this.disabled() || this.busy() || !!this.configurationError());
  protected readonly orderedColumns = computed(() => {
    const byId = new Map(this.columns().map(c => [c.id, c]));
    const ids = [...new Set([...this.state().columnOrder, ...this.columns().map(c => c.id)])];
    return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  });
  protected readonly visibleColumns = computed(() => this.orderedColumns().filter(c => !this.state().hiddenColumns.includes(c.id)));
  protected readonly filteredRows = computed(() => this.mode() === 'server' ? [...this.rows()] : queryTable(this.rows(), this.columns(), this.state(), {
    sort: this.sortable(), filters: this.columnFilters(), search: this.globalSearch(), searchColumns: this.searchColumns(), locale: this.locale(),
  }));
  protected readonly displayPage = computed(() => this.mode() === 'client' && this.pagination() && Number.isSafeInteger(this.state().page) && this.state().page > 0
    ? Math.min(this.state().page, Math.max(1, Math.ceil(this.filteredRows().length / this.state().pageSize))) : this.state().page);
  protected readonly pageRows = computed(() => !this.pagination() || this.mode() === 'server' ? this.filteredRows()
    : this.filteredRows().slice((this.displayPage() - 1) * this.state().pageSize, this.displayPage() * this.state().pageSize));
  protected readonly total = computed(() => this.mode() === 'server' ? this.totalItems() : this.filteredRows().length);
  protected readonly selectionRows = computed(() => (this.selectAllScope() === 'filtered' && this.mode() === 'client' ? this.filteredRows() : this.pageRows()).filter(row => this.selectable(row)));
  protected readonly allSelected = computed(() => this.selectionRows().length > 0 && this.selectionRows().every(row => this.selectedKeys().includes(this.key(row))));
  protected readonly someSelected = computed(() => this.selectionRows().some(row => this.selectedKeys().includes(this.key(row))));
  protected readonly columnCount = computed(() => this.visibleColumns().length + Number(this.selectionMode() !== 'none') + Number(!!this.detailTemplate()) + Number(this.rowActions().length > 0));
  protected readonly statusMessage = computed(() => { const state = this.dataState(); return state.kind === 'ready' ? '' : state.message; });
  protected readonly emptyMessage = computed(() => this.busy() ? '一覧を取得しています。' : this.dataState().kind === 'error' ? '一覧を取得できません。'
    : this.globalSearch() && this.state().search.trim() || this.columnFilters() && this.state().filters.some(filter => filter.constraints.some(rule => rule.operator === 'missing' || rule.value !== undefined)) ? '条件に一致する結果はありません。' : 'データはありません。');

  constructor() {
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const container = this.viewport()?.nativeElement;
      if (!container) return;
      if (container.clientWidth !== this.availableWidth()) this.availableWidth.set(container.clientWidth);
      const table = container.querySelector<HTMLTableElement>('table');
      if (table && this.autoFit() === 'content' && this.autoWidth()) {
        const clone = table.cloneNode(true) as HTMLTableElement;
        clone.inert = true; clone.setAttribute('aria-hidden','true');
        clone.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
        Object.assign(clone.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',inlineSize:'max-content',minInlineSize:'0',tableLayout:'auto'});
        clone.querySelectorAll<HTMLTableColElement>('col').forEach(element=>element.style.width='');
        container.appendChild(clone);
        const natural: Record<string,number> = {};
        try { clone.querySelectorAll<HTMLElement>('th[data-column-id]').forEach(element=>{natural[element.dataset['columnId']!] = element.getBoundingClientRect().width;}); }
        finally { clone.remove(); }
        if (JSON.stringify(natural) !== JSON.stringify(this.naturalWidths())) this.naturalWidths.set(natural);
      }
      const widths: Record<string, number> = {};
      container.querySelectorAll<HTMLElement>('th[data-column-id]').forEach(element => { widths[element.dataset['columnId']!] = element.getBoundingClientRect().width; });
      if (JSON.stringify(widths) !== JSON.stringify(this.measuredWidths())) this.measuredWidths.set(widths);
      const min = this.minimumProbe()?.nativeElement.getBoundingClientRect().width;
      if (min && min !== this.minimumColumnWidth()) this.minimumColumnWidth.set(min);
    };
    let lastCorrection: TableState | null = null;
    const render = afterRenderEffect(() => {
      this.columns(); this.state(); this.rows(); this.pagination(); this.autoFit(); this.autoWidth();
      if (!this.blocked() && this.state().page !== this.displayPage() && lastCorrection !== this.state()) {
        lastCorrection = this.state(); this.stateChange.emit({...this.state(),page:this.displayPage()});
      }
      const container = this.viewport()?.nativeElement;
      observer?.disconnect();
      if (container && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure);
        observer.observe(container);
        container.querySelectorAll('th[data-column-id]').forEach(element => observer!.observe(element));
        if (this.minimumProbe()) observer.observe(this.minimumProbe()!.nativeElement);
      }
      measure();
    });
    inject(DestroyRef).onDestroy(() => { observer?.disconnect(); render.destroy(); });
  }
  protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
  protected number(event: Event): number { return Number(this.value(event)); }
  protected key(row: T): TableKey { return row[this.keyField()] as TableKey; }
  protected rowLabel(row: T): string { return tableText(row, this.columns()[0], this.locale(), this.missingLabel()); }
  protected cellText(row: T, column: TableColumn<T>): string { return tableText(row, column, this.locale(), this.missingLabel()); }
  protected cellValue(row: T, column: TableColumn<T>): unknown { return tableValue(row, column); }
  protected cellTemplate(id: string): TemplateRef<TableTemplateContext<T>> | null { return this.templates().find(t => !t.detail() && t.column() === id)?.template ?? null; }
  protected detailTemplate(): TemplateRef<TableTemplateContext<T>> | null { return this.templates().find(t => t.detail())?.template ?? null; }
  protected fieldId(id: string): string { return this.tableId() + '-filter-' + encodeURIComponent(id); }
  protected update(patch: Partial<TableState>): void { if (!this.blocked()) this.stateChange.emit({ ...this.state(), page:this.displayPage(), ...patch }); }
  protected search(search: string): void { this.update({ search, page: 1 }); }
  protected sort(column: string): void { this.update({ sort: nextTableSort(this.state().sort, column, this.sortMode() === 'multiple'), page: 1 }); }
  protected ariaSort(id: string): 'ascending' | 'descending' | null { const first = this.sortable() ? this.state().sort[0] : undefined; return first?.column === id ? first.direction === 'asc' ? 'ascending' : 'descending' : null; }
  protected sortMarker(id: string): string { const index = this.state().sort.findIndex(s => s.column === id); return index < 0 ? '' : (this.state().sort[index].direction === 'asc' ? '↑' : '↓') + (this.sortMode() === 'multiple' ? String(index + 1) : ''); }
  protected sortLabel(column: TableColumn<T>): string { return column.header + 'で並べ替え' + (this.sortMarker(column.id) ? ': ' + this.sortMarker(column.id) : ''); }
  protected filterValue(id: string): string { const value = this.state().filters.find(f => f.column === id)?.constraints[0]?.value; return value === undefined ? '' : String(value); }
  protected filterOperator(column: TableColumn<T>): TableOperator { return this.state().filters.find(f => f.column === column.id)?.constraints[0]?.operator ?? (column.options || column.type === 'number' || column.type === 'date' ? 'eq' : 'contains'); }
  protected filter(column: TableColumn<T>, value: string, operator = this.filterOperator(column)): void {
    const filters = this.state().filters.filter(f => f.column !== column.id);
    filters.push({ column: column.id, match: 'and', constraints: [{ operator, ...(value === '' ? {} : {value: column.type === 'number' ? Number(value) : value}) }] });
    this.update({ filters, page: 1 });
  }
  protected operator(column: TableColumn<T>, operator: string): void {
    if (['eq','gte','lte','before','after'].includes(operator)) this.filter(column, this.filterValue(column.id), operator as TableOperator);
  }
  protected lastVisible(id: string): boolean { return this.visibleColumns().length === 1 && this.visibleColumns()[0].id === id; }
  protected toggleColumn(id: string): void { if (this.lastVisible(id)) return; this.update({ hiddenColumns: this.state().hiddenColumns.includes(id) ? this.state().hiddenColumns.filter(c => c !== id) : [...this.state().hiddenColumns, id] }); }
  protected moveColumn(id: string, direction: number): void {
    const ids = this.orderedColumns().map(c => c.id); const index = ids.indexOf(id); const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]]; this.update({ columnOrder: ids });
  }
  protected width(column: TableColumn<T>): number | null { return this.state().columnWidths[column.id] ?? column.width ?? (!this.autoWidth() ? this.minimumColumnWidth() : null); }
  protected minimumWidth(column: TableColumn<T>): number { return column.minWidth ?? this.minimumColumnWidth(); }
  protected maximumWidth(column: TableColumn<T>): number { return column.maxWidth ?? this.minimumWidth(column) * 8; }
  protected resizeColumn(column: TableColumn<T>, value: number): void {
    if (!this.resizableColumns() || !Number.isFinite(value)) return;
    this.update({ columnWidths: { ...this.state().columnWidths, [column.id]: Math.min(this.maximumWidth(column), Math.max(this.minimumWidth(column), value)) } });
  }
  protected pin(column: TableColumn<T>): 'start' | 'end' | null { const pin = this.state().pinnedColumns[column.id] ?? column.pinned; return pin === 'none' || !pin ? null : pin; }
  protected setPin(id: string, value: string): void { if (['none','start','end'].includes(value)) this.update({ pinnedColumns: { ...this.state().pinnedColumns, [id]: value as 'none'|'start'|'end' } }); }
  protected pinOffset(column: TableColumn<T>, side: 'start' | 'end'): number {
    const columns = this.visibleColumns(); const index = columns.findIndex(c => c.id === column.id);
    return (side === 'start' ? columns.slice(0,index) : columns.slice(index+1)).filter(c => this.pin(c) === side).reduce((sum,c) => sum + (this.measuredWidths()[c.id] ?? this.width(c) ?? this.minimumColumnWidth()),0);
  }
  protected resetColumns(): void { this.update({ columnOrder: [], hiddenColumns: [], columnWidths: {}, pinnedColumns: {} }); }
  protected selectable(row: T): boolean { return this.rowSelectable()(row); }
  protected select(row: T, event: Event): void {
    if (this.blocked() || !this.selectable(row) || this.selectionMode() === 'none') return;
    const key = this.key(row); const checked = (event.target as HTMLInputElement).checked;
    const remaining = this.selectedKeys().filter(k => k !== key);
    this.selectedKeysChange.emit(this.selectionMode() === 'single' ? [key] : checked ? [...remaining, key] : remaining);
  }
  protected selectAll(event: Event): void {
    if (this.blocked() || this.selectionMode() !== 'multiple') return;
    const keys = this.selectionRows().map(row => this.key(row));
    this.selectedKeysChange.emit((event.target as HTMLInputElement).checked ? [...new Set([...this.selectedKeys(), ...keys])] : this.selectedKeys().filter(key => !keys.includes(key)));
  }
  protected toggleDetail(row: T): void { if (!this.blocked()) { const key = this.key(row); this.expandedKeysChange.emit(this.expandedKeys().includes(key) ? this.expandedKeys().filter(k => k !== key) : [...this.expandedKeys(),key]); } }
  protected activate(action: string, row: T): void { const command = this.rowActions().find(a => a.id === action); if (command && !this.blocked() && !command.disabled?.(row)) this.rowAction.emit({action,row,key:this.key(row)}); }
}
