import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { cloneTableState } from './table-advanced-model';
import { createTableState, tableOwnValue, type TableColumn, type TableConstraint, type TableFilter, type TableKey, type TableOperator, type TableState } from './table-model';
import { installTableControlFocus } from './table-runtime';
const controlsStyle = `:host{display:block;min-inline-size:0;max-inline-size:100%;color:var(--ui-color-text);font:inherit;overflow-wrap:anywhere;}:host([hidden]),[hidden]{display:none!important;}.ui-table-controls__row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-gap);}label{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--ui-space-control-gap);min-inline-size:0;max-inline-size:100%;}fieldset{min-inline-size:0;border:var(--ui-border-control) solid var(--ui-color-border);padding:var(--ui-space-control-y) var(--ui-space-control-x);}input,select{min-inline-size:0;max-inline-size:100%;box-sizing:border-box;}input[type=checkbox]{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}summary{cursor:pointer;min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y);}input:focus-visible,select:focus-visible,summary:focus-visible,:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}p{margin-block:var(--ui-space-control-gap);}.ui-table-controls__error{color:var(--ui-color-danger);}`;
export function tableOperators<T extends object>(column: TableColumn<T>): readonly {
    value: TableOperator;
    label: string;
}[] { return column.options || column.type === 'boolean' ? [{ value: 'eq', label: '等しい' }, { value: 'missing', label: '未取得' }] : column.type === 'number' ? [{ value: 'eq', label: '等しい' }, { value: 'gte', label: '以上' }, { value: 'lte', label: '以下' }, { value: 'missing', label: '未取得' }] : column.type === 'date' ? [{ value: 'eq', label: '等しい' }, { value: 'after', label: 'より後' }, { value: 'before', label: 'より前' }, { value: 'missing', label: '未取得' }] : [{ value: 'contains', label: '含む' }, { value: 'startsWith', label: 'で始まる' }, { value: 'eq', label: '等しい' }, { value: 'missing', label: '未取得' }]; }
@Component({ selector: 'ui-column-filter', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'column().header+"の列条件"' }, template: `
 <fieldset [disabled]="disabled()"><legend>{{column().header}}{{'の列条件' | uiMessage}}</legend>
 @if(constraints().length>1){<label>{{'条件の結合:' | uiMessage}} {{column().header}}<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="('条件の結合: ' | uiMessage)+column().header" [value]="filter()?.match||'and'" [attr.aria-describedby]="controlId()+'-match-help'" (change)="match(value($event))"><option value="and">{{'すべて' | uiMessage}}</option><option value="or">{{'いずれか' | uiMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label><small [id]="controlId()+'-match-help'">{{(filter()?.match==='or'?'1つ以上に一致する行を表示':'全条件に一致する行を表示') | uiMessage}}</small>}
 @for(rule of constraints();track $index;let i=$index){<div class="ui-table-controls__row"><label [attr.for]="controlId()+'-operator-'+i">{{comparisonLabel(i)}}<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="comparisonLabel(i)" [id]="controlId()+'-operator-'+i" [value]="rule.operator" (change)="operator(i,value($event))">@for(operator of operators();track operator.value){<option [value]="operator.value">{{operator.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label>
 @if(rule.operator!=='missing'){<label [attr.for]="controlId()+'-value-'+i">{{valueLabel(i)}}
 @if(column().options){<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="valueLabel(i)" [id]="controlId()+'-value-'+i" [value]="rule.value===undefined?'':string(rule.value)" (change)="edit(i,value($event))"><option value="">{{'条件なし' | uiMessage}}</option>@for(option of column().options;track option.value){<option [value]="option.value">{{option.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>}
 @else if(column().type==='boolean'){<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="valueLabel(i)" [id]="controlId()+'-value-'+i" [value]="rule.value===undefined?'':string(rule.value)" (change)="edit(i,value($event))"><option value="">{{'条件なし' | uiMessage}}</option><option value="true">{{'はい' | uiMessage}}</option><option value="false">{{'いいえ' | uiMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>}
 @else{<input data-table-control data-table-filter-value [attr.data-filter-index]="i" class="ui-field-control" [attr.aria-label]="valueLabel(i)" [id]="controlId()+'-value-'+i" [type]="column().type==='number'?'number':column().type==='date'?'date':'search'" [attr.step]="column().type==='number'?'any':null" [value]="inputValue(i,rule)" [attr.aria-invalid]="invalidInputs()[i]?'true':null" [attr.aria-describedby]="valueDescription(i,rule)" (input)="editInput(i,$event)">@if(column().type==='date'&&datePreview(i,rule)){<small [id]="controlId()+'-date-preview-'+i">{{'入力した日付:' | uiMessage}} <bdi dir="ltr">{{datePreview(i,rule)}}</bdi></small>}}</label>}
 <button uiAction data-table-control type="button" [attr.aria-label]="column().header+('の条件 ' | uiMessage)+(i+1)+(' を解除' | uiMessage)" (click)="remove(i)">{{'条件を解除' | uiMessage}}</button></div>}
 @if(invalidDraft()){<p role="status" [id]="controlId()+'-draft-status'">{{'入力途中の値は条件へ適用していません。直前の有効な条件を保っています。' | uiMessage}}</p>}
 <button uiAction data-table-control type="button" (click)="add()">{{column().header}}{{'の条件を追加' | uiMessage}}</button></fieldset>`, styles: controlsStyle + `fieldset{border:0;padding:0;margin:0;}legend{padding:0;font-weight:var(--ui-weight-control);}.ui-table-controls__row>label{flex:1 1 max(var(--ui-size-table-column-min),calc(10em + 2 * var(--ui-space-control-x)));}` })
export class ColumnFilter<T extends object> {
 private readonly uiRuntimeText_ColumnFilter=injectUiRuntimeText();

    readonly column = input.required<TableColumn<T>>();
    readonly controlId = input.required<string>();
    readonly filter = input<TableFilter | null>(null);
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly filterChange = output<TableFilter | null>();
    protected readonly operators = computed(() => tableOperators(this.column()));
    protected readonly constraints = computed(() => this.filter()?.constraints.length ? this.filter()!.constraints : [{ operator: this.operators()[0].value }]);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly inputDrafts = signal<Readonly<Record<number, { column: string; type: TableColumn<T>['type']; operator: TableOperator; raw: string; binding: string; invalid: boolean }>>>({});
    private observedFilter: TableFilter | null | undefined;
    private readonly ownFilters: (TableFilter | null)[] = [];
    private acceptsOwnFilter(filter: TableFilter | null): boolean {
        let found = -1;
        this.ownFilters.forEach((issued, index) => {
            if (issued === filter || issued && filter && issued.column === filter.column && issued.match === filter.match && issued.constraints.length === filter.constraints.length && issued.constraints.every((rule, i) => rule.operator === filter.constraints[i].operator && (Object.is(rule.value, filter.constraints[i].value) || rule.value === filter.constraints[i].value)))
                found = index;
        });
        if (found < 0)
            return false;
        this.ownFilters.splice(0, found + 1);
        return true;
    }
    private currentDraft(index: number, rule: TableConstraint) {
        const draft = this.inputDrafts()[index], column = this.column();
        return draft && draft.column === column.id && draft.type === column.type && draft.operator === rule.operator ? draft : null;
    }
    protected readonly invalidInputs = computed<Readonly<Record<number, boolean>>>(() => Object.fromEntries(this.constraints().map((rule, index) => [index, !!this.currentDraft(index, rule)?.invalid])));
    protected readonly invalidDraft = computed(() => Object.values(this.invalidInputs()).some(Boolean));
    protected inputValue(index: number, rule: TableConstraint): string {
        // A native number/date field owns its caret and intermediate characters while editing.
        // Echoing its sanitized value can erase a decimal point or move the caret between keys.
        return this.currentDraft(index, rule)?.binding ?? (rule.value == null ? '' : String(rule.value));
    }
    protected datePreview(index: number, rule: TableConstraint): string {
        const draft = this.currentDraft(index, rule);
        return draft?.invalid ? '' : draft?.raw ?? (rule.value == null ? '' : String(rule.value));
    }
    protected valueDescription(index: number, rule: TableConstraint): string | null {
        return this.invalidInputs()[index] ? this.controlId() + '-draft-status' : this.column().type === 'date' && this.datePreview(index, rule) ? this.controlId() + '-date-preview-' + index : null;
    }
    protected editInput(index: number, event: Event): void {
        if (this.disabled() || !(event.target instanceof HTMLInputElement))
            return;
        if (event.target.validity.badInput) {
            const rule = this.constraints()[index];
            if (!rule)
                return;
            const draft = this.currentDraft(index, rule), column = this.column(), binding = this.inputValue(index, rule);
            this.inputDrafts.update(current => ({ ...current, [index]: { column: column.id, type: column.type, operator: rule.operator, raw: draft?.raw ?? binding, binding, invalid: true } }));
            return;
        }
        this.edit(index, event.target.value, true);
    }
    protected string(value: unknown): string { return String(value); }
    protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
    protected valueLabel(index: number): string { return this.column().header + this.uiRuntimeText_ColumnFilter('の条件') + (index ? ' ' + (index + 1) : ''); }
    protected comparisonLabel(index: number): string { return this.column().header + this.uiRuntimeText_ColumnFilter('の比較方法') + (index ? ' ' + (index + 1) : ''); }
    private publish(constraints: readonly TableConstraint[], match = this.filter()?.match ?? 'and'): void {
        if (!this.disabled()) {
            const filter = constraints.length ? { column: this.column().id, match, constraints } : null;
            this.ownFilters.push(filter);
            if (this.ownFilters.length > 64)
                this.ownFilters.shift();
            this.filterChange.emit(filter);
        }
    }
    protected match(value: string): void {
        if (value === 'and' || value === 'or')
            this.publish(this.constraints(), value);
    }
    protected operator(index: number, value: string): void {
        if (!this.operators().some(operator => operator.value === value))
            return;
        this.publish(this.constraints().map((rule, i) => i === index ? { ...rule, operator: value as TableOperator } : rule));
    }
    protected edit(index: number, raw: string, remember = false): void {
        let value: string | number | boolean | undefined = raw;
        if (raw === '')
            value = undefined;
        else if (this.column().type === 'number')
            value = Number(raw);
        else if (this.column().type === 'boolean')
            value = raw === 'true';
        if (remember && (this.column().type === 'number' || this.column().type === 'date')) {
            const rule = this.constraints()[index], column = this.column(), binding = this.inputValue(index, rule);
            this.inputDrafts.update(current => ({ ...current, [index]: { column: column.id, type: column.type, operator: rule.operator, raw, binding, invalid: false } }));
        }
        this.publish(this.constraints().map((rule, i) => i === index ? { operator: rule.operator, ...(value === undefined ? {} : { value }) } : rule));
    }
    protected add(): void { this.publish([...this.constraints(), { operator: this.operators()[0].value }]); }
    protected remove(index: number): void { this.inputDrafts.set({}); this.publish(this.constraints().filter((_rule, i) => i !== index)); }
    constructor() {
        installTableControlFocus();
        afterRenderEffect(() => {
            const constraints = this.constraints(), drafts = this.inputDrafts();
            this.column();
            const filter = this.filter();
            untracked(() => {
                const external = this.observedFilter !== undefined && this.observedFilter !== filter && !this.acceptsOwnFilter(filter);
                this.observedFilter = filter;
                if (external) {
                    this.ownFilters.length = 0;
                    this.inputDrafts.set({});
                }
                else {
                    const current = Object.fromEntries(Object.entries(drafts).filter(([index]) => !!constraints[Number(index)] && !!this.currentDraft(Number(index), constraints[Number(index)])));
                    if (Object.keys(current).length !== Object.keys(drafts).length)
                        this.inputDrafts.set(current);
                }
                // An authoritative external condition reset also clears native invalid state,
                // including when the next formatted value equals Angular's previous binding.
                for (const field of this.element.querySelectorAll<HTMLInputElement>('input[data-table-filter-value]')) {
                    const index = Number(field.dataset['filterIndex']), rule = constraints[index];
                    if (!rule || this.currentDraft(index, rule))
                        continue;
                    const value = rule.value == null ? '' : String(rule.value);
                    if (field.value !== value || field.validity.badInput)
                        field.value = value;
                }
            });
        });
    }
}
@Component({ selector: 'ui-column-chooser', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', 'aria-label': '列の設定' }, template: `<details><summary data-table-control>{{'列の設定' | uiMessage}}</summary>@for(column of ordered();track column.id){<div class="ui-table-controls__row"><label><input data-table-control type="checkbox" [checked]="!state().hiddenColumns.includes(column.id)" [disabled]="disabled()||last(column.id)" (change)="toggle(column.id)">{{column.header}}</label><button uiAction data-table-control type="button" [attr.aria-label]="column.header+('列を前へ' | uiMessage)" [disabled]="disabled()||$first" (click)="move(column.id,-1)">{{'前へ' | uiMessage}}</button><button uiAction data-table-control type="button" [attr.aria-label]="column.header+('列を後へ' | uiMessage)" [disabled]="disabled()||$last" (click)="move(column.id,1)">{{'後へ' | uiMessage}}</button><label>{{'固定:' | uiMessage}} {{column.header}}<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="('固定: ' | uiMessage)+column.header" [value]="pinValue(column)" [disabled]="disabled()" (change)="pin(column.id,value($event))"><option value="none">{{'固定しない' | uiMessage}}</option><option value="start">{{'先頭側' | uiMessage}}</option><option value="end">{{'末尾側' | uiMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label>@if(resizable()){<label>{{'列幅:' | uiMessage}} {{column.header}} ({{width(column)}}px)<input data-table-control type="range" [min]="min(column)" [max]="max(column)" [value]="width(column)" [disabled]="disabled()" (input)="resize(column,number($event))"></label>}</div>}<button uiAction data-table-control type="button" [disabled]="disabled()" (click)="reset()">{{'列の設定を戻す' | uiMessage}}</button></details><span #probe class="ui-column-chooser__probe" aria-hidden="true"></span>`, styles: controlsStyle + `.ui-column-chooser__probe{position:absolute;visibility:hidden;pointer-events:none;inline-size:var(--ui-size-table-column-min);block-size:0;}` })
export class ColumnChooser<T extends object> {
    readonly columns = input.required<readonly TableColumn<T>[]>();
    readonly state = input<TableState>(createTableState());
    readonly stateChange = output<TableState>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly resizable = input(true, { transform: booleanAttribute });
    readonly measuredWidths = input<Readonly<Record<string, number>>>({});
    private readonly probe = viewChild<ElementRef<HTMLElement>>('probe');
    private readonly minimum = signal(1);
    protected readonly ordered = computed(() => { const byId = new Map(this.columns().map(column => [column.id, column])); return [...new Set([...this.state().columnOrder, ...this.columns().map(column => column.id)])].flatMap(id => byId.has(id) ? [byId.get(id)!] : []); });
    protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
    protected number(event: Event): number { return Number(this.value(event)); }
    protected min(column: TableColumn<T>): number { return column.minWidth ?? this.minimum(); }
    protected max(column: TableColumn<T>): number { return column.maxWidth ?? this.min(column) * 8; }
    protected width(column: TableColumn<T>): number { return Math.max(this.min(column), Math.min(this.max(column), tableOwnValue(this.state().columnWidths, column.id) ?? column.width ?? tableOwnValue(this.measuredWidths(), column.id) ?? this.min(column))); }
    protected pinValue(column: TableColumn<T>): 'none' | 'start' | 'end' { return tableOwnValue(this.state().pinnedColumns, column.id) ?? column.pinned ?? 'none'; }
    protected last(id: string): boolean { const visible = this.columns().filter(column => !this.state().hiddenColumns.includes(column.id)); return visible.length === 1 && visible[0].id === id; }
    private update(patch: Partial<TableState>): void {
        if (!this.disabled())
            this.stateChange.emit({ ...this.state(), ...patch });
    }
    protected toggle(id: string): void {
        if (this.last(id))
            return;
        this.update({ hiddenColumns: this.state().hiddenColumns.includes(id) ? this.state().hiddenColumns.filter(value => value !== id) : [...this.state().hiddenColumns, id] });
    }
    protected move(id: string, direction: number): void {
        const ids = this.ordered().map(column => column.id), index = ids.indexOf(id), next = index + direction;
        if (next < 0 || next >= ids.length || index < 0)
            return;
        [ids[index], ids[next]] = [ids[next], ids[index]];
        this.update({ columnOrder: ids });
    }
    protected pin(id: string, value: string): void {
        if (['none', 'start', 'end'].includes(value))
            this.update({ pinnedColumns: { ...this.state().pinnedColumns, [id]: value as 'none' | 'start' | 'end' } });
    }
    protected resize(column: TableColumn<T>, value: number): void {
        if (!this.resizable() || !Number.isFinite(value))
            return;
        this.update({ columnWidths: { ...this.state().columnWidths, [column.id]: Math.min(this.max(column), Math.max(this.min(column), value)) } });
    }
    protected reset(): void { this.update({ columnOrder: [], hiddenColumns: [], columnWidths: {}, pinnedColumns: {} }); }
    constructor() {
        installTableControlFocus();
        afterRenderEffect(onCleanup => {
            const probe = this.probe()?.nativeElement;
            this.columns();
            if (!probe)
                return;
            const measure = () => {
                const measured = probe.getBoundingClientRect().width;
                if (measured > 0 && measured !== this.minimum())
                    untracked(() => this.minimum.set(measured));
            };
            measure();
            if (typeof ResizeObserver !== 'undefined') {
                const observer = new ResizeObserver(measure);
                observer.observe(probe);
                onCleanup(() => observer.disconnect());
            }
        });
    }
}
export interface SavedTableSearch {
    id: string;
    label: string;
    state: TableState;
}
@Component({ selector: 'ui-filter-chips', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', 'aria-label': '適用条件' }, template: `<ul class="ui-table-controls__row">@if(state().search){<li><button uiAction data-table-control type="button" [disabled]="disabled()" (click)="searchClear()">{{'検索:' | uiMessage}} {{state().search}} {{'を解除' | uiMessage}}</button></li>}@for(chip of chips();track chip.id){<li><button uiAction data-table-control type="button" [disabled]="disabled()" (click)="remove(chip.column,chip.index)">{{chip.label}} {{'を解除' | uiMessage}}</button></li>}</ul>@if(chips().length||state().search){<button uiAction data-table-control type="button" [disabled]="disabled()" (click)="clear()">{{'条件をすべて解除' | uiMessage}}</button>}@else{<p>{{'適用条件はありません。' | uiMessage}}</p>}`, styles: controlsStyle + `ul{padding:0;list-style:none;}li{max-inline-size:100%;}` })
export class FilterChips<T extends object> {
 private readonly uiRuntimeText_FilterChips=injectUiRuntimeText();

    readonly columns = input.required<readonly TableColumn<T>[]>();
    readonly state = input<TableState>(createTableState());
    readonly stateChange = output<TableState>();
    readonly disabled = input(false, { transform: booleanAttribute });
    protected readonly chips = computed(() => this.state().filters.flatMap(filter => {
        const column = this.columns().find(column => column.id === filter.column);
        return filter.constraints.flatMap((rule, index) => {
            if (rule.operator !== 'missing' && rule.value === undefined)
                return [];
            const operator = column ? tableOperators(column).find(option => option.value === rule.operator)?.label ?? rule.operator : rule.operator, value = column?.options?.find(option => option.value === String(rule.value))?.label ?? (typeof rule.value === 'boolean' ? rule.value ? this.uiRuntimeText_FilterChips('はい') : this.uiRuntimeText_FilterChips('いいえ') : String(rule.value ?? ''));
            return [{ id: filter.column + ':' + index, column: filter.column, index, label: (column?.header ?? filter.column) + ' ' + operator + (rule.operator === 'missing' ? '' : ' ' + value) }];
        });
    }));
    protected searchClear(): void {
        if (!this.disabled())
            this.stateChange.emit({ ...this.state(), search: '', page: 1 });
    }
    protected clear(): void {
        if (!this.disabled())
            this.stateChange.emit({ ...this.state(), search: '', filters: [], page: 1 });
    }
    protected remove(id: string, index: number): void {
        if (this.disabled())
            return;
        const filters = this.state().filters.flatMap(filter => {
            if (filter.column !== id)
                return [filter];
            const constraints = filter.constraints.filter((_rule, i) => i !== index);
            return constraints.length ? [{ ...filter, constraints }] : [];
        });
        this.stateChange.emit({ ...this.state(), filters, page: 1 });
    }
    constructor() { installTableControlFocus(); }
}
@Component({ selector: 'ui-search-panel', standalone: true, imports: [ActionControl, FilterChips,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'uiEffective_label()' }, template: `<fieldset [disabled]="disabled()"><legend>{{uiEffective_label()}}</legend><label>{{'全体検索' | uiMessage}}<input data-table-control class="ui-field-control" type="search" [value]="state().search" (input)="search(value($event))"></label><button uiAction data-table-control type="button" [disabled]="!state().search" (click)="search('')">{{'検索を解除' | uiMessage}}</button><ui-filter-chips [columns]="columns()" [state]="state()" [disabled]="disabled()" (stateChange)="stateChange.emit($event)"/><label>{{'保存条件の名前' | uiMessage}}<input data-table-control class="ui-field-control" type="text" [value]="name()" (input)="name.set(value($event))"></label><button uiAction data-table-control type="button" [disabled]="disabled()||!name().trim()" (click)="save()">{{'条件を保存' | uiMessage}}</button>@if(savedSearches().length){<label>{{'保存条件' | uiMessage}}<div class="ui-select-control"><select data-table-control [attr.aria-label]="'保存条件' | uiMessage" class="ui-field-control" [value]="selectedSaved()" (change)="restore(value($event))"><option value="">{{'選択してください' | uiMessage}}</option>@for(search of savedSearches();track search.id){<option [value]="search.id">{{search.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label>}</fieldset>`, styles: controlsStyle })
export class SearchPanel<T extends object> {
 protected readonly uiText_SearchPanel=injectUiText();
    readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_SearchPanel('検索条件'));
    readonly columns = input.required<readonly TableColumn<T>[]>();
    readonly state = input<TableState>(createTableState());
    readonly stateChange = output<TableState>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly savedSearches = input<readonly SavedTableSearch[]>([]);
    readonly saveRequested = output<{
        label: string;
        state: TableState;
    }>();
    protected readonly name = signal('');
    protected readonly selectedSaved = signal('');
    protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
    protected search(search: string): void {
        if (!this.disabled()) {
            this.selectedSaved.set('');
            this.stateChange.emit({ ...this.state(), search, page: 1 });
        }
    }
    protected save(): void {
        if (!this.disabled() && this.name().trim())
            this.saveRequested.emit({ label: this.name().trim(), state: cloneTableState(this.state()) });
    }
    protected restore(id: string): void {
        if (this.disabled())
            return;
        const search = this.savedSearches().find(item => item.id === id);
        this.selectedSaved.set(search?.id ?? '');
        if (search)
            this.stateChange.emit(cloneTableState(search.state));
    }
    constructor() { installTableControlFocus(); }
}
export interface TableBulkAction {
    id: string;
    label: string;
    disabled?: boolean;
}
export interface TableOutputIntent {
    format: 'copy' | 'csv' | 'print';
    scope: 'page' | 'filtered' | 'selected' | 'supplied';
}
@Component({ selector: 'ui-table-toolbar', standalone: true, imports: [ActionControl, ColumnChooser,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'uiEffective_label()' }, template: `<div class="ui-table-controls__row">@if(searchable()){<label>{{'全体検索' | uiMessage}}<input data-table-control class="ui-field-control" type="search" [value]="state().search" [disabled]="blocked()" (input)="search(value($event))"></label><button uiAction data-table-control type="button" [disabled]="blocked()||!state().search" (click)="search('')">{{'検索を解除' | uiMessage}}</button>}@if(chooseColumns()){<ui-column-chooser [columns]="columns()" [state]="state()" [disabled]="blocked()" (stateChange)="stateChange.emit($event)"/>}<ng-content/>@for(action of bulkActions();track action.id){<button uiAction data-table-control type="button" [disabled]="blocked()||action.disabled||!selectedKeys().length" (click)="bulk(action)">{{action.label}} ({{selectedKeys().length}}{{'件)' | uiMessage}}</button>}@if(outputs()){<label>{{'出力対象' | uiMessage}}<div class="ui-select-control"><select data-table-control [attr.aria-label]="'出力対象' | uiMessage" class="ui-field-control" [value]="scope()" [disabled]="blocked()" (change)="selectScope(value($event))"><option value="page">{{'表示ページ' | uiMessage}}</option><option value="filtered">{{'取得済み検索結果' | uiMessage}}</option><option value="selected">{{'取得済み選択行' | uiMessage}}</option><option value="supplied">{{'受け取った全行' | uiMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label><button uiAction data-table-control type="button" [disabled]="blocked()" (click)="export('copy')">{{'表をコピー' | uiMessage}}</button><button uiAction data-table-control type="button" [disabled]="blocked()" (click)="export('csv')">{{'CSVを出力' | uiMessage}}</button><button uiAction data-table-control type="button" [disabled]="blocked()" (click)="export('print')">{{'表を印刷' | uiMessage}}</button>}</div>`, styles: controlsStyle })
export class TableToolbar<T extends object> {
 protected readonly uiText_TableToolbar=injectUiText();
    readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_TableToolbar('表の操作'));
    readonly columns = input.required<readonly TableColumn<T>[]>();
    readonly state = input<TableState>(createTableState());
    readonly stateChange = output<TableState>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly searchable = input(true, { transform: booleanAttribute });
    readonly chooseColumns = input(true, { transform: booleanAttribute });
    readonly outputs = input(true, { transform: booleanAttribute });
    readonly selectedKeys = input<readonly TableKey[]>([]);
    readonly bulkActions = input<readonly TableBulkAction[]>([]);
    readonly bulkRequested = output<{
        action: string;
        keys: readonly TableKey[];
    }>();
    readonly outputRequested = output<TableOutputIntent>();
    protected readonly scope = signal<TableOutputIntent['scope']>('page');
    protected readonly blocked = computed(() => this.disabled() || this.busy());
    protected value(event: Event): string { return (event.target as HTMLInputElement).value; }
    protected search(search: string): void {
        if (!this.blocked())
            this.stateChange.emit({ ...this.state(), search, page: 1 });
    }
    protected bulk(action: TableBulkAction): void {
        if (!this.blocked() && !action.disabled && this.selectedKeys().length)
            this.bulkRequested.emit({ action: action.id, keys: [...this.selectedKeys()] });
    }
    protected selectScope(value: string): void {
        if (['page', 'filtered', 'selected', 'supplied'].includes(value) && !this.blocked())
            this.scope.set(value as TableOutputIntent['scope']);
    }
    protected export(format: TableOutputIntent['format']): void {
        if (!this.blocked())
            this.outputRequested.emit({ format, scope: this.scope() });
    }
    constructor() { installTableControlFocus(); }
}
