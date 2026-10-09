import {uiMessageState} from './locale';
import {injectUiText as injectUiDiagnosticText} from './locale';
import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiLocale,injectUiText,UiMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, Directive, ElementRef, inject, input, output, signal, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { canFocus } from './focus';
import { tableDomIdPair, tableDraft, tableEditProblem, tableEditStillCurrent, validateTableRowDraft, type TableEditableColumn, type TableEditRequest } from './table-advanced-model';
import { tableText, type TableKey } from './table-model';
import { installTableControlFocus } from './table-runtime';
const editorTemplate = `<section [attr.role]="editorRole" [attr.aria-label]="label()" [attr.aria-busy]="busy()||!!pending()"><div class="ui-table-editor__display" [hidden]="editing()"><span>{{displayText()}}</span><button uiAction class="ui-table-editor__start" data-table-control data-table-start [attr.tabindex]="tabEntry()?0:-1" type="button" [disabled]="blocked()||readonly()||!!problem()" (click)="beginEdit()">{{uiEffective_editLabel()}}</button></div><div [hidden]="!editing()">@for(column of editableColumns();track column.id){<div class="ui-table-editor__field"><label [for]="fieldId(column.id)">{{column.header}}@if(column.required){  {{'(必須)' | uiMessage}}}</label>@if(column.options||column.type==='boolean'){<div class="ui-select-control"><select data-table-control data-table-editor class="ui-field-control" [id]="fieldId(column.id)" [value]="raw()[column.id]??''" [disabled]="disabled()||readonly()||busy()||!!pending()" [attr.aria-invalid]="validation().errors[column.id]?'true':null" [attr.aria-describedby]="descriptionId(column.id)" (change)="edit(column.id,value($event))" (keydown)="key($event)"><option value="">{{'未入力' | uiMessage}}</option>@if(column.options){@for(option of column.options;track option.value){<option [value]="option.value">{{option.label}}</option>}}@else{<option value="true">{{'はい' | uiMessage}}</option><option value="false">{{'いいえ' | uiMessage}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>}@else{<input data-table-control data-table-editor class="ui-field-control" [id]="fieldId(column.id)" [type]="column.type==='date'?'date':'text'" [attr.inputmode]="column.type==='number'?'decimal':null" [value]="raw()[column.id]??''" [disabled]="disabled()" [readOnly]="readonly()||busy()||!!pending()" [attr.aria-required]="column.required?'true':null" [attr.aria-invalid]="validation().errors[column.id]?'true':null" [attr.aria-describedby]="descriptionId(column.id)" (input)="edit(column.id,value($event))" (keydown)="key($event)">@if(column.type==='date'&&raw()[column.id]){<small class="ui-table-editor__date" [id]="fieldId(column.id)+'-date-preview'">{{'入力した日付:' | uiMessage}} <bdi dir="ltr">{{raw()[column.id]}}</bdi></small>}}@if(validation().errors[column.id]){<p class="ui-table-editor__error" [id]="fieldId(column.id)+'-error'">{{validation().errors[column.id]}}</p>}</div>}<div class="ui-table-editor__actions"><button uiAction data-table-control type="button" [disabled]="blocked()||readonly()||!!pending()||!!problem()||hasErrors()" (click)="save()">{{'保存' | uiMessage}}</button><button uiAction data-table-control type="button" [disabled]="blocked()||readonly()||!!pending()" (click)="cancelEdit()">{{'取消' | uiMessage}}</button></div></div>@if(problem()||resultError()){<p class="ui-table-editor__error" [id]="controlId()+'-result-error'" role="status">{{problem()||resultError()}}</p>}@if(busy()||pending()){<p role="status">{{'保存結果を確認しています。入力内容を保持しています。' | uiMessage}}</p>}</section>`;
const editorStyle = `:host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}:host([hidden]),[hidden]{display:none!important;}section,label{display:block;min-inline-size:0;overflow-wrap:anywhere;}.ui-table-editor__display{display:grid;grid-template-columns:minmax(0,1fr) var(--ui-size-control);align-items:start;gap:var(--ui-space-control-gap);}.ui-table-editor__actions{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);}.ui-table-editor__start.ui-action{inline-size:var(--ui-size-control);padding-inline:0;}.ui-table-editor__start.ui-action:not(:disabled){border-color:transparent;background:transparent;color:var(--ui-color-text);}.ui-table-editor__start.ui-action:hover:not(:disabled){background:var(--ui-color-background);}.ui-table-editor__display span{min-inline-size:0;overflow-wrap:anywhere;}.ui-table-editor__field{margin-block:var(--ui-space-control-gap);}label{font-weight:var(--ui-weight-control);}.ui-field-control{inline-size:100%;max-inline-size:100%;box-sizing:border-box;}.ui-table-editor__date{display:block;margin-block:var(--ui-space-control-gap);font-size:var(--ui-text-small);}.ui-table-editor__error{color:var(--ui-color-danger);margin-block:var(--ui-space-control-gap);}:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}`;
let tableEditSequence = 0;
@Directive()
export abstract class TableEditorSession<T extends object> {
 private readonly uiDiagnostic_TableEditorSession=(()=>{const text=injectUiDiagnosticText();return (value:string|null):string|null=>value===null?null:text(value);})();

 private readonly uiRuntimeText_TableEditorSession=injectUiRuntimeText();

 protected readonly uiText_TableEditorSession=injectUiText();
    readonly row = input.required<T>();
    readonly keyField = input.required<keyof T & string>();
    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly editLabel = input<string>();
 protected readonly uiEffective_editLabel=uiLocaleComputed(()=>this.editLabel()??this.uiText_TableEditorSession('編集'));
    protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);
    readonly missingLabel = input<string>();
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_TableEditorSession('未取得'));
    readonly restoreStartFocus = input(true, { transform: booleanAttribute });
    readonly tabEntry = input(true, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly readonly = input(false, { transform: booleanAttribute });
    readonly saveRequested = output<TableEditRequest<T>>();
    readonly rowChange = output<T>();
    readonly editingChange = output<boolean>();
    protected readonly editorRole: 'group' | 'region' = 'region';
    protected readonly editing = signal(false);
    protected readonly raw = signal<Readonly<Record<string, string>>>({});
    protected readonly pending = signal<TableEditRequest<T> | null>(null);
    protected readonly resultError = uiMessageState('');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly destroy = inject(DestroyRef);
    private observedKey: TableKey | undefined;
    private observedValues: Readonly<Record<string, unknown>> = {};
    private observedColumns: readonly TableEditableColumn<T>[] = [];
    private focusStart = false;
    private focusFinish = false;
    private pendingColumns: readonly TableEditableColumn<T>[] = [];
    protected abstract editColumns(): readonly TableEditableColumn<T>[];
    protected readonly editableColumns = computed(() => this.editColumns().filter(column => column.editable !== false && column.field !== this.keyField()));
    protected readonly blocked = computed(() => this.disabled() || this.busy());
    protected readonly problem = computed(() => this.uiDiagnostic_TableEditorSession(tableEditProblem(this.editColumns(), this.keyField())) || ![this.controlId(), this.label(), this.uiEffective_editLabel()].every(value => value.trim()) ? this.uiRuntimeText_TableEditorSession('編集欄のID、説明、列設定を確認してください。') : !this.editableColumns().length ? this.uiRuntimeText_TableEditorSession('編集できる列がありません。') : null);
    protected readonly validation = computed(() => validateTableRowDraft(this.row(), this.editableColumns(), this.raw(), this.keyField()));
    protected readonly hasErrors = computed(() => Object.keys(this.validation().errors).length > 0);
    protected readonly displayText = computed(() => this.editColumns().map(column => tableText(this.row(), column, this.effectiveLocale(), this.uiEffective_missingLabel(),this.uiLocaleDefaults().numberOptions,this.uiLocaleDefaults().messages)).join(' / '));
    protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
    protected fieldId(id: string): string { return this.controlId() + '-' + tableDomIdPair('field', id); }
    protected descriptionId(id: string): string | null { return [this.editableColumns().some(column => column.id === id && column.type === 'date') && this.raw()[id] ? this.fieldId(id) + '-date-preview' : '', this.validation().errors[id] ? this.fieldId(id) + '-error' : '', this.resultError() ? this.controlId() + '-result-error' : ''].filter(Boolean).join(' ') || null; }
    private snapshot(): void { this.observedKey = this.row()[this.keyField()] as TableKey; this.observedValues = Object.fromEntries(this.editableColumns().map(column => [column.field, (this.row() as Record<string, unknown>)[column.field]])); this.observedColumns = [...this.editableColumns()]; }
    private setDraftFromRow(): void { this.raw.set(Object.fromEntries(this.editableColumns().map(column => [column.id, tableDraft((this.row() as Record<string, unknown>)[column.field])]))); }
    private current(request: TableEditRequest<T>): boolean { return tableEditStillCurrent(request, this.row(), this.keyField()) && this.pendingColumns.length === this.editableColumns().length && this.pendingColumns.every((column, index) => column === this.editableColumns()[index]); }
    /** Invalidates UI acceptance only; does not claim to cancel backend work. */
    invalidatePending(): void { this.pending.set(null); this.pendingColumns = []; }
    isEditing(): boolean { return this.editing(); }
    pendingRequestId(): number | null { return this.pending()?.requestId ?? null; }
    beginEdit(): void {
        if (this.destroy.destroyed || this.blocked() || this.readonly() || this.problem() || this.editing())
            return;
        this.snapshot();
        this.setDraftFromRow();
        this.resultError.set('');
        this.editing.set(true);
        this.editingChange.emit(true);
        this.focusStart = true;
    }
    protected edit(id: string, value: string): void {
        if (this.blocked() || this.readonly() || this.pending() || !this.editableColumns().some(column => column.id === id))
            return;
        this.raw.set({ ...this.raw(), [id]: value });
        this.resultError.set('');
    }
    protected save(): void {
        if (!this.editing() || this.blocked() || this.readonly() || this.pending() || this.problem() || this.hasErrors())
            return;
        const result = this.validation(), request = { requestId: ++tableEditSequence, key: this.row()[this.keyField()] as TableKey, row: this.row(), value: result.value, changes: result.changes };
        this.resultError.set('');
        this.pendingColumns = [...this.editableColumns()];
        this.pending.set(request);
        this.saveRequested.emit(request);
    }
    fail(requestId: number, message: string): boolean {
        const request = this.pending();
        if (this.destroy.destroyed || !request || request.requestId !== requestId || !message.trim() || !this.current(request))
            return false;
        this.invalidatePending();
        this.resultError.set(message);
        return true;
    }
    complete(requestId: number, confirmed?: T): boolean {
        const request = this.pending();
        if (this.destroy.destroyed || !request || request.requestId !== requestId || !this.current(request))
            return false;
        const supplied = confirmed ?? request.value;
        if (supplied[this.keyField()] !== request.key)
            return false;
        const raw = Object.fromEntries(request.changes.map(change => [change.column, tableDraft((supplied as Record<string, unknown>)[change.field])])), result = validateTableRowDraft(this.row(), this.editableColumns(), raw, this.keyField());
        if (Object.keys(result.errors).length)
            return false;
        this.invalidatePending();
        this.resultError.set('');
        this.rowChange.emit(result.value);
        this.finish();
        return true;
    }
    cancelEdit(): void {
        if (this.destroy.destroyed || !this.editing() || this.blocked() || this.readonly() || this.pending())
            return;
        this.setDraftFromRow();
        this.resultError.set('');
        this.finish();
    }
    private finish(): void { const active = this.host.ownerDocument.activeElement; this.focusFinish = this.restoreStartFocus() && active instanceof HTMLElement && active.closest('[data-table-owner]') === this.host; this.editing.set(false); this.editingChange.emit(false); }
    protected key(event: KeyboardEvent): void {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229)
            return;
        if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelEdit();
        }
        else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            this.save();
        }
    }
    constructor() {
        installTableControlFocus();
        afterRenderEffect(() => {
            const row = this.row(), columns = this.editableColumns(), editing = this.editing();
            this.pending();
            this.raw();
            this.disabled();
            this.busy();
            untracked(() => {
                const key = row[this.keyField()] as TableKey;
                if (this.observedKey !== undefined && this.observedKey !== key) {
                    this.invalidatePending();
                    this.editing.set(false);
                    if (editing)
                        this.editingChange.emit(false);
                    this.resultError.set('');
                    this.setDraftFromRow();
                    this.snapshot();
                }
                else if (editing && (columns.length !== this.observedColumns.length || columns.some((column, index) => column !== this.observedColumns[index] || !Object.is((row as Record<string, unknown>)[column.field], this.observedValues[column.field])))) {
                    this.invalidatePending();
                    this.resultError.setMessage([() => this.uiRuntimeText_TableEditorSession('元の値または編集列が更新されました。入力を確認してから保存してください。')]);
                    this.snapshot();
                }
                if (this.focusStart && this.editing()) {
                    const editor = this.host.querySelector<HTMLElement>('[data-table-editor]');
                    if (canFocus(editor)) {
                        this.focusStart = false;
                        editor!.focus();
                    }
                }
                if (this.focusFinish && !this.editing()) {
                    this.focusFinish = false;
                    const start = this.host.querySelector<HTMLElement>('[data-table-start]');
                    if (canFocus(start))
                        start!.focus({ preventScroll: true });
                }
            });
        });
        this.destroy.onDestroy(() => this.invalidatePending());
    }
}
@Component({ selector: 'ui-cell-editor', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', tabindex: '-1', '[attr.aria-label]': 'label()' }, template: editorTemplate, styles: editorStyle })
export class CellEditor<T extends object> extends TableEditorSession<T> {
    protected override readonly editorRole: 'group' | 'region' = 'group';
    readonly column = input.required<TableEditableColumn<T>>();
    protected override editColumns(): readonly TableEditableColumn<T>[] { return [this.column()]; }
}
@Component({ selector: 'ui-row-editor', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', tabindex: '-1', '[attr.aria-label]': 'label()' }, template: editorTemplate, styles: editorStyle })
export class RowEditor<T extends object> extends TableEditorSession<T> {
    readonly columns = input.required<readonly TableEditableColumn<T>[]>();
    protected override editColumns(): readonly TableEditableColumn<T>[] { return this.columns(); }
}
