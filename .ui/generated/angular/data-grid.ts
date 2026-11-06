import {uiMessageState} from './locale';
import {injectUiText as injectUiDiagnosticText} from './locale';
import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiLocale,injectUiText,UiMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, untracked, viewChildren } from '@angular/core';
import { ActionControl } from './action-control';
import { canFocus } from './focus';
import { CellEditor } from './table-editors';
import { tableDomIdPair, tableDomIdToken, gridCellMove, gridRangeContains, parseTableMatrix, prepareTablePaste, serializeTableMatrix, tableEditProblem, tableEditStillCurrent, tableOutputMatrix, validateTableRowDraft, tableDraft, type GridCell, type GridRange, type TableEditableColumn, type TableEditRequest } from './table-advanced-model';
import { createTableState, tableConfigurationError, tableText, type TableKey } from './table-model';
import { installTableControlFocus } from './table-runtime';
export interface GridTreeRow {
    id: string;
    parentId: string | null;
    /** Matches the Tree/TreeGrid supported depth: 1 through 100. */ level: number;
    position: number;
    setSize: number;
    branch: boolean;
    expanded: boolean;
    loading?: boolean;
    disabled?: boolean;
    selectable?: boolean;
}
export interface GridPasteRequest<T extends object> {
    requestId: number;
    rows: readonly T[];
    changes: readonly Omit<TableEditRequest<T>, 'requestId'>[];
    matrix: readonly (readonly string[])[];
    start: GridCell;
}
let gridPasteSequence = 0;
/** Cell-navigation widget. App-confirmed edits/pastes are the only source of rowsChange. */
@Component({ selector: 'ui-data-grid', standalone: true, imports: [ActionControl, CellEditor,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', tabindex: '-1', '[attr.aria-label]': 'caption()', '(focusin)': 'focusIn($event)', '(focusout)': 'focusOut($event)' }, template: `
 <p [id]="gridId()+'-instructions'">{{'矢印キーでセルを移動します。Shiftと矢印で範囲を選択し、EnterまたはF2で編集します。コピー・貼付けは選択したセルから行います。' | uiMessage}}{{treeRows()?('先頭セルの左右で階層を開閉し、Spaceで行を選択します。' | uiMessage):''}}</p>
 @if(problem()){<p role="alert">{{problem()}}</p>}
 <div class="ui-data-grid__actions"><button uiAction data-table-control type="button" [disabled]="blocked()||clipboardBusy()" (click)="copy()">{{'選択セルをコピー' | uiMessage}}</button><button uiAction data-table-control type="button" [disabled]="blocked()||clipboardBusy()||!editable()" (click)="readPaste()">{{'セルへ貼付け' | uiMessage}}</button></div>
 <p role="status" aria-atomic="true">{{status()}}</p>@if(lastFailedPaste()){<button uiAction data-table-control type="button" [disabled]="blocked()" (click)="retryPaste()">{{'貼付けを再試行' | uiMessage}}</button>}
 <div class="ui-data-grid__viewport" [hidden]="!!problem()"><table [style.min-inline-size]="'calc(max(var(--ui-size-table-column-min), calc(12ch + var(--ui-size-control) + var(--ui-space-control-gap) + 2 * var(--ui-space-table-x))) * '+columns().length+')'" [attr.role]="treeRows()?'treegrid':'grid'" [attr.aria-label]="caption()" [attr.aria-describedby]="gridId()+'-instructions'" [attr.aria-rowcount]="rows().length+1" [attr.aria-colcount]="columns().length" [attr.aria-multiselectable]="selectionMode()==='range'||rowSelection()==='multiple'?'true':null" [attr.aria-busy]="blocked()?'true':null" (keydown)="key($event)" (paste)="paste($event)"><caption>{{caption()}}</caption><thead><tr role="row">@for(column of columns();track column.id){<th role="columnheader" scope="col" [id]="headerId(column.id)">{{column.header}}</th>}</tr></thead><tbody>
 @for(row of rows();track rowKey(row);let ri=$index){<tr role="row" [attr.data-row-key]="rowKey(row)" [attr.aria-rowindex]="ri+2" [attr.aria-level]="treeRows()?.[ri]?.level??null" [attr.aria-posinset]="treeRows()?.[ri]?.position??null" [attr.aria-setsize]="treeRows()?.[ri]?.setSize??null" [attr.aria-expanded]="treeRows()?.[ri]?.branch?treeRows()![ri].expanded:null" [attr.aria-busy]="treeRows()?.[ri]?.loading?'true':null" [attr.aria-selected]="rowSelection()!=='none'?selectedKeys().includes(rowKey(row)):null">
 @for(column of columns();track column.id;let ci=$index){<td role="gridcell" data-table-control data-grid-cell [attr.data-row-index]="ri" [attr.data-column-index]="ci" [attr.tabindex]="active().row===ri&&active().column===ci?0:-1" [attr.headers]="headerId(column.id)" [attr.aria-selected]="selectionMode()!=='none'?selected({row:ri,column:ci}):null" [attr.aria-disabled]="blocked()||treeRows()?.[ri]?.disabled?'true':null" [class.ui-data-grid__selected]="selected({row:ri,column:ci})" (click)="clickCell(ri,ci,$event)" (dblclick)="editCell(ri,ci)">
 @if(ci===0&&!problem()&&treeRows()?.[ri];as meta){<span class="ui-data-grid__hierarchy" [style.padding-inline-start]="indent(meta.level)">@if(meta.branch){<button uiAction data-table-control type="button" tabindex="-1" [attr.aria-label]="(meta.expanded?('閉じる: ' | uiMessage):('展開: ' | uiMessage))+cellText(row,column)" [attr.aria-expanded]="meta.expanded" [disabled]="blocked()||meta.disabled" (click)="toggleTree(ri,$event)">{{meta.expanded?'−':'+'}}</button>}@if(rowSelection()!=='none'){<input data-table-control type="checkbox" tabindex="-1" [attr.aria-label]="('行を選択: ' | uiMessage)+cellText(row,column)" [checked]="selectedKeys().includes(rowKey(row))" [disabled]="blocked()||meta.disabled||meta.selectable===false" (change)="selectRow(ri)">}</span>}
 @if(editable()&&column.editable!==false&&column.field!==keyField()){<ui-cell-editor #editor [row]="row" [keyField]="keyField()" [column]="column" [controlId]="fieldId(rowKey(row),column.id)" [label]="column.header+'・'+rowLabel(row)" [tabEntry]="false" [restoreStartFocus]="false" [disabled]="disabled()||!!treeRows()?.[ri]?.disabled||!!pendingPaste()" [busy]="busy()" [locale]="effectiveLocale()" [missingLabel]="uiEffective_missingLabel()" (saveRequested)="saveRequested.emit($event)" (rowChange)="edited($event)" (editingChange)="editingChanged(editor,ri,ci,$event)"/>}@else{<span>{{cellText(row,column)}}</span>}
 </td>}</tr>}@empty{<tr role="row"><td role="gridcell" [attr.colspan]="columns().length">{{uiEffective_emptyLabel()}}</td></tr>}
 </tbody></table></div>`, styles: `
 :host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}:host([hidden]),[hidden]{display:none!important;}p{overflow-wrap:anywhere;}.ui-data-grid__actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}.ui-data-grid__viewport{overflow:auto;max-inline-size:100%;max-block-size:var(--ui-size-table-viewport);overscroll-behavior:contain;}table{border-collapse:separate;border-spacing:0;inline-size:100%;min-inline-size:100%;table-layout:fixed;}caption{font-weight:var(--ui-weight-control);text-align:start;padding-block:var(--ui-space-table-y);}th,td{min-inline-size:var(--ui-size-table-column-min);padding:var(--ui-space-table-y) var(--ui-space-table-x);text-align:start;vertical-align:top;border:var(--ui-border-control) solid var(--ui-color-border);overflow-wrap:anywhere;}thead{background:var(--ui-color-background);}td.ui-data-grid__selected{background:var(--ui-color-background);box-shadow:inset 0 0 0 var(--ui-border-control) var(--ui-color-action);}td:focus-visible,:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}.ui-data-grid__hierarchy{display:inline-flex;align-items:center;gap:var(--ui-space-control-gap);max-inline-size:100%;box-sizing:border-box;}input[type=checkbox]{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}@media(forced-colors:active){td.ui-data-grid__selected{outline:var(--ui-border-control) solid Highlight;}}` })
export class DataGrid<T extends object> {
 private readonly uiDiagnostic_DataGrid=(()=>{const text=injectUiDiagnosticText();return (value:string|null):string|null=>value===null?null:text(value);})();

 private readonly uiRuntimeText_DataGrid=injectUiRuntimeText();

 protected readonly uiText_DataGrid=injectUiText();
    readonly caption = input.required<string>();
    readonly gridId = input.required<string>();
    readonly rows = input.required<readonly T[]>();
    readonly columns = input.required<readonly TableEditableColumn<T>[]>();
    readonly keyField = input.required<keyof T & string>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly editable = input(true, { transform: booleanAttribute });
    readonly selectionMode = input<'none' | 'single' | 'range'>('range');
    readonly selection = input<GridRange | null>(null);
    readonly selectionChange = output<GridRange>();
    protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);
    readonly missingLabel = input<string>();
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_DataGrid('未取得'));
    readonly emptyLabel = input<string>();
 protected readonly uiEffective_emptyLabel=uiLocaleComputed(()=>this.emptyLabel()??this.uiText_DataGrid('データはありません。'));
    readonly saveRequested = output<TableEditRequest<T>>();
    readonly pasteRequested = output<GridPasteRequest<T>>();
    readonly rowsChange = output<readonly T[]>();
    readonly clipboardWriter = input<((text: string) => Promise<void>) | null>(null);
    readonly clipboardReader = input<(() => Promise<string>) | null>(null);
    /** TreeGrid adapter supplies hierarchy; DataGrid owns cell navigation and editors. */
    readonly treeRows = input<readonly GridTreeRow[] | null>(null);
    readonly treeToggleRequested = output<string>();
    readonly rowSelection = input<'none' | 'single' | 'multiple'>('none');
    readonly selectedKeys = input<readonly TableKey[]>([]);
    readonly selectedKeysChange = output<readonly TableKey[]>();
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly destroy = inject(DestroyRef);
    private readonly editors = viewChildren<CellEditor<T>>(CellEditor);
    protected readonly active = signal<GridCell>({ row: 0, column: 0 });
    protected readonly status = uiMessageState('');
    protected readonly clipboardBusy = signal(false);
    protected readonly pendingPaste = signal<GridPasteRequest<T> | null>(null);
    private pasteColumns: readonly TableEditableColumn<T>[] = [];
    private clipboardGeneration = 0;
    private activeIdentity: {
        key: TableKey;
        column: string;
    } | null = null;
    private activeTreeParents: readonly string[] = [];
    private ownedCell: HTMLElement | null = null;
    private shouldFocus = false;
    private currentEditor: CellEditor<T> | null = null;
    protected readonly problem = computed(() => this.uiDiagnostic_DataGrid(tableConfigurationError(this.rows(), this.columns(), this.keyField(), createTableState())) || this.uiDiagnostic_DataGrid(tableEditProblem(this.columns(), this.keyField())) || (!this.caption().trim() || !this.gridId().trim() ? this.uiRuntimeText_DataGrid('グリッドの説明とIDを指定してください。') : this.treeRows() && (this.treeRows()!.length !== this.rows().length || this.treeRows()!.some(row => !row.id.trim() || !Number.isSafeInteger(row.level) || row.level < 1 || row.level > 100 || row.position < 1 || row.setSize < row.position)) ? this.uiRuntimeText_DataGrid('階層行と表示行の対応を確認してください。') : null));
    protected readonly blocked = computed(() => this.disabled() || this.busy() || !!this.pendingPaste() || !!this.problem());
    protected rowKey(row: T): TableKey { return row[this.keyField()] as TableKey; }
    protected rowLabel(row: T): string { return tableText(row, this.columns()[0], this.effectiveLocale(), this.uiEffective_missingLabel(),this.uiLocaleDefaults().numberOptions,this.uiLocaleDefaults().messages); }
    protected cellText(row: T, column: TableEditableColumn<T>): string { return tableText(row, column, this.effectiveLocale(), this.uiEffective_missingLabel(),this.uiLocaleDefaults().numberOptions,this.uiLocaleDefaults().messages); }
    protected fieldId(key: TableKey, column: string): string { return this.gridId() + '-edit-' + tableDomIdPair(typeof key + ':' + key, column); }
    protected headerId(column: string): string { return this.gridId() + '-header-' + tableDomIdToken(column); }
    protected selected(cell: GridCell): boolean { const range = this.selection() ?? { anchor: this.active(), focus: this.active() }; return this.selectionMode() !== 'none' && gridRangeContains(range, cell); }
    /** TreeGrid can defer hiding rows while a draft or app acknowledgement still owns them. */
    retainedRowKeys(): readonly TableKey[] {
        return [...new Set([...this.editors().filter(editor => editor.isEditing()).map(editor => this.rowKey(editor.row())), ...(this.pendingPaste()?.changes.map(change => change.key) ?? [])])];
    }
    private rememberIdentity(row: number, column: number): void {
        if (!this.rows()[row] || !this.columns()[column])
            return;
        this.activeIdentity = { key: this.rowKey(this.rows()[row]), column: this.columns()[column].id };
        const tree = this.treeRows(), parents: string[] = [];
        let parent = tree?.[row]?.parentId;
        while (parent && !parents.includes(parent)) {
            parents.push(parent);
            parent = tree?.find(item => item.id === parent)?.parentId;
        }
        this.activeTreeParents = parents;
    }
    private validCell(cell: GridCell): boolean { return cell.row >= 0 && cell.row < this.rows().length && cell.column >= 0 && cell.column < this.columns().length; }
    private choose(cell: GridCell, extend = false, focus = true): void {
        if (!this.validCell(cell))
            return;
        this.active.set(cell);
        this.rememberIdentity(cell.row, cell.column);
        if (this.selectionMode() !== 'none') {
            const anchor = extend && this.selectionMode() === 'range' ? (this.selection()?.anchor ?? cell) : cell;
            this.selectionChange.emit({ anchor, focus: cell });
        }
        this.shouldFocus = focus;
    }
    protected clickCell(row: number, column: number, event: MouseEvent): void {
        if (this.blocked() || !(event.target instanceof HTMLElement) || event.target.closest('input,select,textarea,button'))
            return;
        this.choose({ row, column }, event.shiftKey);
    }
    protected focusIn(event: FocusEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        const cell = target.closest<HTMLElement>('[data-grid-cell]');
        if (cell && this.host.contains(cell)) {
            this.ownedCell = cell;
            const row = Number(cell.dataset['rowIndex']), column = Number(cell.dataset['columnIndex']);
            if (this.validCell({ row, column })) {
                this.active.set({ row, column });
                this.rememberIdentity(row, column);
            }
        }
        else
            this.ownedCell = null;
    }
    protected focusOut(event: FocusEvent): void {
        const next = event.relatedTarget;
        if (next instanceof Node && next !== this.host.ownerDocument.body && !this.host.contains(next))
            this.ownedCell = null;
    }
    private focusCell(): void {
        const cell = this.host.querySelector<HTMLElement>(`[data-grid-cell][data-row-index="${this.active().row}"][data-column-index="${this.active().column}"]`);
        if (canFocus(cell)) {
            cell!.focus({ preventScroll: true });
            cell!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }
    protected editCell(row: number, column: number): void {
        if (this.blocked() || !this.editable() || this.treeRows()?.[row]?.disabled)
            return;
        const source = this.rows()[row], definition = this.columns()[column];
        if (!source || !definition)
            return;
        const editor = this.editors().find(editor => editor.row() === source && editor.column().id === definition.id);
        editor?.beginEdit();
    }
    protected editingChanged(editor: CellEditor<T>, row: number, column: number, editing: boolean): void {
        if (editing) {
            if (this.currentEditor && this.currentEditor !== editor) {
                if (this.currentEditor.pendingRequestId() !== null) {
                    editor.cancelEdit();
                    this.status.setMessage([() => this.uiRuntimeText_DataGrid('前の編集の保存結果を確認しています。')]);
                    return;
                }
                this.currentEditor.cancelEdit();
            }
            this.currentEditor = editor;
            this.choose({ row, column }, false, false);
        }
        else if (this.currentEditor === editor) {
            this.currentEditor = null;
            const active = this.host.ownerDocument.activeElement, cell = active instanceof HTMLElement ? active.closest<HTMLElement>('[data-grid-cell]') : null;
            if (cell && Number(cell.dataset['rowIndex']) === row && Number(cell.dataset['columnIndex']) === column) {
                this.active.set({ row, column });
                this.shouldFocus = true;
            }
        }
    }
    protected edited(row: T): void {
        if (this.destroy.destroyed)
            return;
        const key = this.rowKey(row);
        this.rowsChange.emit(this.rows().map(item => this.rowKey(item) === key ? row : item));
    }
    completeEdit(requestId: number, row?: T): boolean { return this.editors().find(editor => editor.pendingRequestId() === requestId)?.complete(requestId, row) ?? false; }
    failEdit(requestId: number, message: string): boolean { return this.editors().find(editor => editor.pendingRequestId() === requestId)?.fail(requestId, message) ?? false; }
    protected toggleTree(row: number, event?: Event): void {
        event?.stopPropagation();
        const meta = this.treeRows()?.[row];
        if (meta?.branch && !meta.disabled && !this.blocked())
            this.treeToggleRequested.emit(meta.id);
    }
    protected selectRow(index: number): void {
        const row = this.rows()[index], meta = this.treeRows()?.[index];
        if (!row || this.rowSelection() === 'none' || this.blocked() || meta?.disabled || meta?.selectable === false)
            return;
        const key = this.rowKey(row), selected = this.selectedKeys().includes(key);
        this.selectedKeysChange.emit(this.rowSelection() === 'single' ? selected ? [] : [key] : selected ? this.selectedKeys().filter(item => item !== key) : [...this.selectedKeys(), key]);
    }
    protected key(event: KeyboardEvent): void {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || this.blocked() || !(event.target instanceof HTMLElement) || !event.target.matches('[data-grid-cell]'))
            return;
        const cell = this.active(), meta = this.treeRows()?.[cell.row], control = event.ctrlKey || event.metaKey;
        if (control && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            void this.copy();
            return;
        }
        if (control && event.key.toLowerCase() === 'a' && this.selectionMode() === 'range' && this.rows().length) {
            event.preventDefault();
            this.selectionChange.emit({ anchor: { row: 0, column: 0 }, focus: { row: this.rows().length - 1, column: this.columns().length - 1 } });
            return;
        }
        if (event.key === 'F2' || event.key === 'Enter') {
            event.preventDefault();
            this.editCell(cell.row, cell.column);
            return;
        }
        if ((event.key === ' ' || event.code === 'Space') && (meta && cell.column === 0 || event.shiftKey)) {
            event.preventDefault();
            this.selectRow(cell.row);
            return;
        }
        const rtl = getComputedStyle(this.host).direction === 'rtl', openKey = rtl ? 'ArrowLeft' : 'ArrowRight', closeKey = rtl ? 'ArrowRight' : 'ArrowLeft';
        if (meta && cell.column === 0 && !event.shiftKey && !control) {
            if (event.key === openKey && meta.branch && !meta.expanded) {
                event.preventDefault();
                this.toggleTree(cell.row);
                return;
            }
            if (event.key === closeKey) {
                if (meta.branch && meta.expanded) {
                    event.preventDefault();
                    this.toggleTree(cell.row);
                    return;
                }
                const parent = this.treeRows()!.findIndex(row => row.id === meta.parentId);
                if (parent >= 0) {
                    event.preventDefault();
                    this.choose({ row: parent, column: 0 });
                    return;
                }
            }
        }
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))
            return;
        event.preventDefault();
        const next = gridCellMove(cell, event.key, this.rows().length, this.columns().length, control, 10, rtl);
        this.choose(next, event.shiftKey);
    }
    private copyMatrix(): readonly (readonly string[])[] { const range = this.selection() ?? { anchor: this.active(), focus: this.active() }, from = Math.min(range.anchor.row, range.focus.row), to = Math.max(range.anchor.row, range.focus.row), left = Math.min(range.anchor.column, range.focus.column), right = Math.max(range.anchor.column, range.focus.column); return this.rows().slice(from, to + 1).map(row => this.columns().slice(left, right + 1).map(column => tableDraft((row as Record<string, unknown>)[column.field]))); }
    async copy(): Promise<boolean> {
        if (this.destroy.destroyed || this.blocked() || this.clipboardBusy() || !this.rows().length)
            return false;
        const generation = ++this.clipboardGeneration, text = serializeTableMatrix(this.copyMatrix());
        this.clipboardBusy.set(true);
        this.status.setMessage([() => this.uiRuntimeText_DataGrid('コピーしています。')]);
        try {
            const writer = this.clipboardWriter() ?? ((value: string) => navigator.clipboard.writeText(value));
            await writer(text);
            if (generation !== this.clipboardGeneration || this.destroy.destroyed)
                return false;
            this.status.setMessage([() => this.uiRuntimeText_DataGrid('選択セルをコピーしました。')]);
            return true;
        }
        catch {
            if (generation === this.clipboardGeneration && !this.destroy.destroyed)
                this.status.setMessage([() => this.uiRuntimeText_DataGrid('コピーできませんでした。再試行できます。')]);
            return false;
        }
        finally {
            if (generation === this.clipboardGeneration && !this.destroy.destroyed)
                this.clipboardBusy.set(false);
        }
    }
    async readPaste(): Promise<boolean> {
        if (this.destroy.destroyed || this.blocked() || this.clipboardBusy() || !this.editable())
            return false;
        if (this.currentEditor?.isEditing()) {
            this.status.setMessage([() => this.uiRuntimeText_DataGrid('編集を保存または取消してから貼付けしてください。')]);
            return false;
        }
        const sourceRows = [...this.rows()], sourceColumns = [...this.columns()], start = { ...this.active() };
        if (!this.validCell(start))
            return false;
        const targetKey = this.rowKey(sourceRows[start.row]), targetColumn = sourceColumns[start.column].id;
        const generation = ++this.clipboardGeneration;
        this.clipboardBusy.set(true);
        this.status.setMessage([() => this.uiRuntimeText_DataGrid('クリップボードを確認しています。')]);
        try {
            const reader = this.clipboardReader() ?? (() => navigator.clipboard.readText()), text = await reader();
            if (generation !== this.clipboardGeneration || this.destroy.destroyed)
                return false;
            const active = this.active();
            if (!this.validCell(active) || this.rowKey(this.rows()[active.row]) !== targetKey || this.columns()[active.column].id !== targetColumn || sourceRows.length !== this.rows().length || sourceRows.some((row, index) => row !== this.rows()[index]) || sourceColumns.length !== this.columns().length || sourceColumns.some((column, index) => column !== this.columns()[index]) || this.currentEditor?.isEditing()) {
                this.status.setMessage([() => this.uiRuntimeText_DataGrid('読み取り中に貼付け先の選択、行、列または編集が変わりました。内容を確認してから再試行してください。')]);
                return false;
            }
            return this.requestPaste(text);
        }
        catch {
            if (generation === this.clipboardGeneration && !this.destroy.destroyed)
                this.status.setMessage([() => this.uiRuntimeText_DataGrid('クリップボードを読み取れませんでした。セルを選んで貼付けを再試行できます。')]);
            return false;
        }
        finally {
            if (generation === this.clipboardGeneration && !this.destroy.destroyed)
                this.clipboardBusy.set(false);
        }
    }
    protected paste(event: ClipboardEvent): void {
        if (event.defaultPrevented || this.blocked() || !this.editable() || !(event.target instanceof HTMLElement) || !event.target.matches('[data-grid-cell]') || !event.clipboardData)
            return;
        event.preventDefault();
        this.requestPaste(event.clipboardData.getData('text/plain'));
    }
    private requestPaste(text: string): boolean {
        if (this.blocked() || !this.editable())
            return false;
        if (this.currentEditor?.isEditing()) {
            this.status.setMessage([() => this.uiRuntimeText_DataGrid('編集を保存または取消してから貼付けしてください。')]);
            return false;
        }
        let matrix: readonly (readonly string[])[];
        try {
            matrix = parseTableMatrix(text);
        }
        catch {
            this.status.setMessage([() => this.uiRuntimeText_DataGrid('貼付け内容の行、列、引用符を確認してください。')]);
            return false;
        }
        const result = prepareTablePaste(this.rows(), this.columns(), this.keyField(), this.active(), matrix,this.uiRuntimeText_DataGrid);
        if (result.errors.length) {
            this.status.setMessage([()=>result.errorText!.map(format=>format()).join(' ')]);
            return false;
        }
        if (result.requests.some(request => { const index = this.rows().findIndex(row => this.rowKey(row) === request.key); return this.treeRows()?.[index]?.disabled; })) {
            this.status.setMessage([() => this.uiRuntimeText_DataGrid('無効な行へ貼付けできません。')]);
            return false;
        }
        const request = { requestId: ++gridPasteSequence, rows: this.rows(), changes: result.requests, matrix, start: { ...this.active() } };
        this.pasteColumns = [...this.columns()];
        this.pendingPaste.set(request);
        this.status.setMessage([() => this.uiRuntimeText_DataGrid('貼付け内容の保存結果を確認しています。')]);
        this.pasteRequested.emit(request);
        return true;
    }
    private pasteCurrent(request: GridPasteRequest<T>): boolean { return this.pasteColumns.length === this.columns().length && this.pasteColumns.every((column, index) => column === this.columns()[index]) && request.changes.every(change => { const row = this.rows().find(row => this.rowKey(row) === change.key); return !!row && tableEditStillCurrent({ ...change, requestId: request.requestId }, row, this.keyField()); }); }
    completePaste(requestId: number, confirmed?: readonly T[]): boolean {
        const request = this.pendingPaste();
        if (this.destroy.destroyed || !request || request.requestId !== requestId || !this.pasteCurrent(request))
            return false;
        const patches = new Map<TableKey, T>();
        for (const change of request.changes) {
            const row = this.rows().find(row => this.rowKey(row) === change.key)!, supplied = confirmed?.find(row => this.rowKey(row) === change.key) ?? change.value;
            const raw = Object.fromEntries(change.changes.map(field => [field.column, tableDraft((supplied as Record<string, unknown>)[field.field])])), result = validateTableRowDraft(row, this.columns(), raw, this.keyField());
            if (Object.keys(result.errors).length)
                return false;
            patches.set(change.key, result.value);
        }
        this.pendingPaste.set(null);
        this.pasteColumns = [];
        this.lastFailedPaste.set(null);
        this.status.setMessage([() => this.uiRuntimeText_DataGrid('アプリが確認した貼付け内容を反映しました。')]);
        this.rowsChange.emit(this.rows().map(row => patches.get(this.rowKey(row)) ?? row));
        return true;
    }
    failPaste(requestId: number, message: string): boolean {
        const request = this.pendingPaste();
        if (this.destroy.destroyed || !request || request.requestId !== requestId || !message.trim() || !this.pasteCurrent(request))
            return false;
        this.pendingPaste.set(null);
        this.pasteColumns = [];
        this.status.setMessage([String(message), () => this.uiRuntimeText_DataGrid(' 貼付け内容は保持しています。再試行できます。')]);
        this.lastFailedPaste.set({ matrix: request.matrix, key: this.rowKey(request.rows[request.start.row]), column: this.columns()[request.start.column].id });
        return true;
    }
    protected readonly lastFailedPaste = signal<{
        matrix: readonly (readonly string[])[];
        key: TableKey;
        column: string;
    } | null>(null);
    retryPaste(): boolean {
        const saved = this.lastFailedPaste();
        if (!saved || this.blocked())
            return false;
        const row = this.rows().findIndex(item => this.rowKey(item) === saved.key), column = this.columns().findIndex(item => item.id === saved.column);
        if (row < 0 || column < 0) {
            this.status.setMessage([() => this.uiRuntimeText_DataGrid('保存した貼付け先がありません。セルを選び直してください。')]);
            return false;
        }
        this.choose({ row, column }, false, false);
        return this.requestPaste(serializeTableMatrix(saved.matrix));
    }
    invalidatePending(): void { this.pendingPaste.set(null); this.pasteColumns = []; this.clipboardGeneration++; this.clipboardBusy.set(false); this.editors().forEach(editor => editor.invalidatePending()); }
    constructor() {
        installTableControlFocus();
        afterRenderEffect(() => {
            const rows = this.rows(), columns = this.columns();
            this.disabled();
            this.busy();
            this.treeRows();
            this.active();
            this.pendingPaste();
            untracked(() => {
                if (this.currentEditor && !this.editors().includes(this.currentEditor))
                    this.currentEditor = null;
                const request = this.pendingPaste();
                if (request && !this.pasteCurrent(request)) {
                    this.pendingPaste.set(null);
                    this.pasteColumns = [];
                    this.status.setMessage([() => this.uiRuntimeText_DataGrid('貼付け先が更新されました。内容を確認してから再試行してください。')]);
                }
                const focused = this.host.ownerDocument.activeElement;
                if (this.ownedCell && !this.ownedCell.isConnected && (focused === this.host.ownerDocument.body || focused === this.host))
                    this.shouldFocus = true;
                let next = this.active();
                if (this.activeIdentity) {
                    let row = rows.findIndex(row => this.rowKey(row) === this.activeIdentity!.key);
                    const column = columns.findIndex(column => column.id === this.activeIdentity!.column);
                    if (row < 0 && this.treeRows()) {
                        for (const parent of this.activeTreeParents) {
                            const index = this.treeRows()!.findIndex(meta => meta.id === parent);
                            if (index >= 0) { row = index; break; }
                        }
                    }
                    next = { row: row < 0 ? Math.min(next.row, Math.max(0, rows.length - 1)) : row, column: column < 0 ? Math.min(next.column, Math.max(0, columns.length - 1)) : column };
                }
                else
                    next = gridCellMove(next, '', rows.length, columns.length);
                if (next.row !== this.active().row || next.column !== this.active().column) {
                    this.active.set(next);
                    const active = this.host.ownerDocument.activeElement;
                    if (this.ownedCell && (active === this.host.ownerDocument.body || active === this.host || active === this.ownedCell))
                        this.shouldFocus = true;
                }
                if (rows[next.row] && columns[next.column])
                    this.rememberIdentity(next.row, next.column);
                if (this.shouldFocus && !this.blocked()) {
                    this.shouldFocus = false;
                    this.focusCell();
                }
            });
        });
        this.destroy.onDestroy(() => { this.clipboardGeneration++; this.pendingPaste.set(null); this.pasteColumns = []; this.ownedCell = null; });
    }
    /** Keep the style producer closed over the same supported tree-depth domain. */
    protected indent(level: number): string {
        if (typeof level !== 'number' || !Number.isSafeInteger(level) || level < 1 || level > 100)
            throw new Error('DataGrid hierarchy level must be a safe integer from 1 through 100.');
        return 'calc(var(--ui-space-control-x) * ' + (level - 1) + ')';
    }

}
