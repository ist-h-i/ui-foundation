import { uiMessageText, type UiMessageText, type UiStaticMessageId } from './stable-messages';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { cloneTableState } from './table-advanced-model';
import { createTableState, tableOwnValue, type TableColumn, type TableConstraint, type TableFilter, type TableKey, type TableOperator, type TableState } from './table-model';
import { installTableControlFocus } from './table-runtime';
const controlsStyle = `:host{display:block;min-inline-size:0;max-inline-size:100%;color:var(--ui-color-text);font:inherit;overflow-wrap:anywhere;}:host([hidden]),[hidden]{display:none!important;}.ui-table-controls__row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-gap);}label{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--ui-space-control-gap);min-inline-size:0;max-inline-size:100%;}fieldset{min-inline-size:0;border:var(--ui-border-control) solid var(--ui-color-border);padding:var(--ui-space-control-y) var(--ui-space-control-x);}input,select{min-inline-size:0;max-inline-size:100%;box-sizing:border-box;}input[type=checkbox]{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}summary{cursor:pointer;min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y);}input:focus-visible,select:focus-visible,summary:focus-visible,:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}p{margin-block:var(--ui-space-control-gap);}.ui-table-controls__error{color:var(--ui-color-danger);}`;
const tableOperatorMessages = {
    eq: 'uiFoundation.tableOperator.equal',
    missing: 'uiFoundation.tableOperator.missing',
    gte: 'uiFoundation.tableOperator.atLeast',
    lte: 'uiFoundation.tableOperator.atMost',
    after: 'uiFoundation.tableOperator.after',
    before: 'uiFoundation.tableOperator.before',
    contains: 'uiFoundation.tableOperator.contains',
    startsWith: 'uiFoundation.tableOperator.startsWith',
} satisfies Record<TableOperator, UiStaticMessageId>;
export function tableOperators<T extends object>(column: TableColumn<T>, text: UiMessageText = uiMessageText(() => 'ja-JP')): readonly { value: TableOperator; label: string }[] {
    const operators: readonly TableOperator[] = column.options || column.type === 'boolean' ? ['eq', 'missing']
        : column.type === 'number' ? ['eq', 'gte', 'lte', 'missing']
        : column.type === 'date' ? ['eq', 'after', 'before', 'missing']
        : ['contains', 'startsWith', 'eq', 'missing'];
    return operators.map(value => ({ value, label: text(tableOperatorMessages[value]) }));
}
@Component({ selector: 'ui-column-filter', standalone: true, imports: [ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'columnFilterLabel()' }, template: `
 <fieldset [disabled]="disabled()"><legend>{{columnFilterLabel()}}</legend>
 @if(constraints().length>1){<label>{{uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.combineLabel', {column: column().header})}}<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.combineLabel', {column: column().header})" [value]="filter()?.match||'and'" [attr.aria-describedby]="controlId()+'-match-help'" (change)="match(value($event))"><option value="and">{{'uiFoundation.columnFilter.all' | uiStableMessage}}</option><option value="or">{{'uiFoundation.columnFilter.any' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label><small [id]="controlId()+'-match-help'">{{(filter()?.match==='or'?'uiFoundation.columnFilter.matchAnyHelp':'uiFoundation.columnFilter.matchAllHelp') | uiStableMessage}}</small>}
 @for(rule of constraints();track $index;let i=$index){<div class="ui-table-controls__row"><label [attr.for]="controlId()+'-operator-'+i">{{comparisonLabel(i)}}<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="comparisonLabel(i)" [id]="controlId()+'-operator-'+i" [value]="rule.operator" (change)="operator(i,value($event))">@for(operator of operators();track operator.value){<option [value]="operator.value">{{operator.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label>
 @if(rule.operator!=='missing'){<label [attr.for]="controlId()+'-value-'+i">{{valueLabel(i)}}
 @if(column().options){<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="valueLabel(i)" [id]="controlId()+'-value-'+i" [value]="rule.value===undefined?'':string(rule.value)" (change)="edit(i,value($event))"><option value="">{{'uiFoundation.columnFilter.noCriteria' | uiStableMessage}}</option>@for(option of column().options;track option.value){<option [value]="option.value">{{option.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>}
 @else if(column().type==='boolean'){<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="valueLabel(i)" [id]="controlId()+'-value-'+i" [value]="rule.value===undefined?'':string(rule.value)" (change)="edit(i,value($event))"><option value="">{{'uiFoundation.columnFilter.noCriteria' | uiStableMessage}}</option><option value="true">{{'uiFoundation.columnFilter.yes' | uiStableMessage}}</option><option value="false">{{'uiFoundation.columnFilter.no' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>}
 @else{<input data-table-control data-table-filter-value [attr.data-filter-index]="i" class="ui-field-control" [attr.aria-label]="valueLabel(i)" [id]="controlId()+'-value-'+i" [type]="column().type==='number'?'number':column().type==='date'?'date':'search'" [attr.step]="column().type==='number'?'any':null" [value]="inputValue(i,rule)" [attr.aria-invalid]="invalidInputs()[i]?'true':null" [attr.aria-describedby]="valueDescription(i,rule)" (input)="editInput(i,$event)">@if(column().type==='date'&&datePreview(i,rule)){<small [id]="controlId()+'-date-preview-'+i">{{'uiFoundation.columnFilter.dateEntered' | uiStableMessage}} <bdi dir="ltr">{{datePreview(i,rule)}}</bdi></small>}}</label>}
 <button uiAction data-table-control type="button" [attr.aria-label]="removeConditionLabel(i + 1)" (click)="remove(i)">{{'uiFoundation.columnFilter.clearCriteria' | uiStableMessage}}</button></div>}
 @if(invalidDraft()){<p role="status" [id]="controlId()+'-draft-status'">{{'uiFoundation.columnFilter.theIncompleteValueHasYetToBeAppliedTheLastValidFilterRemainsActive' | uiStableMessage}}</p>}
 <button uiAction data-table-control type="button" (click)="add()">{{uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.addLabel', {column: column().header})}}</button></fieldset>`, styles: controlsStyle + `fieldset{border:0;padding:0;margin:0;}legend{padding:0;font-weight:var(--ui-weight-control);}.ui-table-controls__row>label{flex:1 1 max(var(--ui-size-table-column-min),calc(10em + 2 * var(--ui-space-control-x)));}` })
export class ColumnFilter<T extends object> {
 protected readonly uiRuntimeText_ColumnFilter=injectUiRuntimeText();
 protected readonly columnFilterLabel=computed(()=>this.uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.regionLabel', { column: this.column().header }));

    readonly column = input.required<TableColumn<T>>();
    readonly controlId = input.required<string>();
    readonly filter = input<TableFilter | null>(null);
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly filterChange = output<TableFilter | null>();
    protected readonly operators = computed(() => tableOperators(this.column(), this.uiRuntimeText_ColumnFilter));
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
    protected valueLabel(index: number): string { const column = this.column().header;
        return index ? this.uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.criterionLabelNumbered', { column, number: index + 1 })
            : this.uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.criterionLabel', { column }); }
    protected comparisonLabel(index: number): string { const column = this.column().header;
        return index ? this.uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.operatorLabelNumbered', { column, number: index + 1 })
            : this.uiRuntimeText_ColumnFilter('uiFoundation.columnFilter.operatorLabel', { column }); }
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
    protected removeConditionLabel(number: number): string {
        const text = this.uiRuntimeText_ColumnFilter;
        const column = this.column().header;
        return text("uiFoundation.columnFilter.actionColumnConditionNumber", { column, number, action: text("uiFoundation.columnFilter.clearCriteria") });
    }
}
@Component({ selector: 'ui-column-chooser', standalone: true, imports: [ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'chooserLabel()' }, template: `<details><summary data-table-control>{{'uiFoundation.columnChooser.columnSettings' | uiStableMessage}}</summary>@for(column of ordered();track column.id){<div class="ui-table-controls__row"><label><input data-table-control type="checkbox" [checked]="!state().hiddenColumns.includes(column.id)" [disabled]="disabled()||last(column.id)" (change)="toggle(column.id)">{{column.header}}</label><button uiAction data-table-control type="button" [attr.aria-label]="columnMoveText(-1,column.header)" [disabled]="disabled()||$first" (click)="move(column.id,-1)">{{columnMoveText(-1)}}</button><button uiAction data-table-control type="button" [attr.aria-label]="columnMoveText(1,column.header)" [disabled]="disabled()||$last" (click)="move(column.id,1)">{{columnMoveText(1)}}</button><label>{{uiText_ColumnChooser('uiFoundation.columnChooser.pinColumnLabel', {column: column.header})}}<div class="ui-select-control"><select data-table-control class="ui-field-control" [attr.aria-label]="uiText_ColumnChooser('uiFoundation.columnChooser.pinSelectLabel', {column: column.header})" [value]="pinValue(column)" [disabled]="disabled()" (change)="pin(column.id,value($event))"><option value="none">{{'uiFoundation.columnChooser.unpinned' | uiStableMessage}}</option><option value="start">{{'uiFoundation.columnChooser.leadingSide' | uiStableMessage}}</option><option value="end">{{'uiFoundation.columnChooser.trailingSide' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label>@if(resizable()){<label>{{uiText_ColumnChooser('uiFoundation.columnChooser.columnWidthLabel', {column: column.header, width: width(column)})}}<input data-table-control type="range" [min]="min(column)" [max]="max(column)" [value]="width(column)" [disabled]="disabled()" (input)="resize(column,number($event))"></label>}</div>}<button uiAction data-table-control type="button" [disabled]="disabled()" (click)="reset()">{{'uiFoundation.columnChooser.resetColumnSettings' | uiStableMessage}}</button></details><span #probe class="ui-column-chooser__probe" aria-hidden="true"></span>`, styles: controlsStyle + `.ui-column-chooser__probe{position:absolute;visibility:hidden;pointer-events:none;inline-size:var(--ui-size-table-column-min);block-size:0;}` })
export class ColumnChooser<T extends object> {
    protected readonly uiText_ColumnChooser = injectUiMessageText();
    private readonly uiText = injectUiMessageText();
    protected readonly columnMoveText = injectTableColumnMoveText();
    protected readonly chooserLabel = computed(() => this.uiText("uiFoundation.columnChooser.columnSettings"));
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
@Component({ selector: 'ui-filter-chips', standalone: true, imports: [ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'activeFiltersLabel()' }, template: `<ul class="ui-table-controls__row">@if(state().search){<li><button uiAction data-table-control type="button" [disabled]="disabled()" (click)="searchClear()">{{uiRuntimeText_FilterChips('uiFoundation.filterChips.removeSearch', {search: state().search})}}</button></li>}@for(chip of chips();track chip.id){<li><button uiAction data-table-control type="button" [disabled]="disabled()" (click)="remove(chip.column,chip.index)">{{uiRuntimeText_FilterChips('uiFoundation.filterChips.removeCriterion', {criterion: chip.label})}}</button></li>}</ul>@if(chips().length||state().search){<button uiAction data-table-control type="button" [disabled]="disabled()" (click)="clear()">{{'uiFoundation.filterChips.clearAllCriteria' | uiStableMessage}}</button>}@else{<p>{{'uiFoundation.filterChips.thereAreNoActiveFilters' | uiStableMessage}}</p>}`, styles: controlsStyle + `ul{padding:0;list-style:none;}li{max-inline-size:100%;}` })
export class FilterChips<T extends object> {
 protected readonly uiRuntimeText_FilterChips=injectUiRuntimeText();
 protected readonly activeFiltersLabel=computed(()=>this.uiRuntimeText_FilterChips("uiFoundation.filterChips.appliedCriteria"));

    readonly columns = input.required<readonly TableColumn<T>[]>();
    readonly state = input<TableState>(createTableState());
    readonly stateChange = output<TableState>();
    readonly disabled = input(false, { transform: booleanAttribute });
    protected readonly chips = computed(() => this.state().filters.flatMap(filter => {
        const column = this.columns().find(column => column.id === filter.column);
        return filter.constraints.flatMap((rule, index) => {
            if (rule.operator !== 'missing' && rule.value === undefined)
                return [];
            const operator = column ? (tableOperators(column, this.uiRuntimeText_FilterChips).find(option => option.value === rule.operator)?.label ?? rule.operator) : rule.operator, value = column?.options?.find(option => option.value === String(rule.value))?.label ?? (typeof rule.value === 'boolean' ? rule.value ? this.uiRuntimeText_FilterChips("uiFoundation.filterChips.yes") : this.uiRuntimeText_FilterChips("uiFoundation.filterChips.no") : String(rule.value ?? ''));
            const header = column?.header ?? filter.column;
            const label = rule.operator === 'missing'
                ? this.uiRuntimeText_FilterChips('uiFoundation.filterChips.criterionWithoutValue', { column: header, operator })
                : this.uiRuntimeText_FilterChips('uiFoundation.filterChips.criterionWithValue', { column: header, operator, value });
            return [{ id: filter.column + ':' + index, column: filter.column, index, label }];
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
@Component({ selector: 'ui-search-panel', standalone: true, imports: [ActionControl, FilterChips,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'uiEffective_label()' }, template: `<fieldset [disabled]="disabled()"><legend>{{uiEffective_label()}}</legend><label>{{'uiFoundation.searchPanel.searchAllColumns' | uiStableMessage}}<input data-table-control class="ui-field-control" type="search" [value]="state().search" (input)="search(value($event))"></label><button uiAction data-table-control type="button" [disabled]="!state().search" (click)="search('')">{{'uiFoundation.searchPanel.clearSearch' | uiStableMessage}}</button><ui-filter-chips [columns]="columns()" [state]="state()" [disabled]="disabled()" (stateChange)="stateChange.emit($event)"/><label>{{'uiFoundation.searchPanel.nameForSavedFilters' | uiStableMessage}}<input data-table-control class="ui-field-control" type="text" [value]="name()" (input)="name.set(value($event))"></label><button uiAction data-table-control type="button" [disabled]="disabled()||!name().trim()" (click)="save()">{{'uiFoundation.searchPanel.saveCriteria' | uiStableMessage}}</button>@if(savedSearches().length){<label>{{'uiFoundation.searchPanel.savedFilters' | uiStableMessage}}<div class="ui-select-control"><select data-table-control [attr.aria-label]="'uiFoundation.searchPanel.savedFilters' | uiStableMessage" class="ui-field-control" [value]="selectedSaved()" (change)="restore(value($event))"><option value="">{{'uiFoundation.searchPanel.selectAnOption' | uiStableMessage}}</option>@for(search of savedSearches();track search.id){<option [value]="search.id">{{search.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label>}</fieldset>`, styles: controlsStyle })
export class SearchPanel<T extends object> {
 protected readonly uiText_SearchPanel=injectUiMessageText();
    readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_SearchPanel("uiFoundation.searchPanel.searchCriteria"));
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
@Component({ selector: 'ui-table-toolbar', standalone: true, imports: [ActionControl, ColumnChooser,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', 'tabindex': '-1', '[attr.aria-label]': 'uiEffective_label()' }, template: `<div class="ui-table-controls__row">@if(searchable()){<label>{{'uiFoundation.tableToolbar.searchAllColumns' | uiStableMessage}}<input data-table-control class="ui-field-control" type="search" [value]="state().search" [disabled]="blocked()" (input)="search(value($event))"></label><button uiAction data-table-control type="button" [disabled]="blocked()||!state().search" (click)="search('')">{{'uiFoundation.tableToolbar.clearSearch' | uiStableMessage}}</button>}@if(chooseColumns()){<ui-column-chooser [columns]="columns()" [state]="state()" [disabled]="blocked()" (stateChange)="stateChange.emit($event)"/>}<ng-content/>@for(action of bulkActions();track action.id){<button uiAction data-table-control type="button" [disabled]="blocked()||action.disabled||!selectedKeys().length" (click)="bulk(action)">{{uiText_TableToolbar('uiFoundation.tableToolbar.bulkActionCount', {label: action.label, count: selectedKeys().length})}}</button>}@if(outputs()){<label>{{'uiFoundation.tableToolbar.exportScope' | uiStableMessage}}<div class="ui-select-control"><select data-table-control [attr.aria-label]="'uiFoundation.tableToolbar.exportScope' | uiStableMessage" class="ui-field-control" [value]="scope()" [disabled]="blocked()" (change)="selectScope(value($event))"><option value="page">{{'uiFoundation.tableToolbar.pageShown' | uiStableMessage}}</option><option value="filtered">{{'uiFoundation.tableToolbar.loadedSearchResults' | uiStableMessage}}</option><option value="selected">{{'uiFoundation.tableToolbar.loadedSelectedRows' | uiStableMessage}}</option><option value="supplied">{{'uiFoundation.tableToolbar.allReceivedRows' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div></label><button uiAction data-table-control type="button" [disabled]="blocked()" (click)="export('copy')">{{'uiFoundation.tableToolbar.copyTable' | uiStableMessage}}</button><button uiAction data-table-control type="button" [disabled]="blocked()" (click)="export('csv')">{{'uiFoundation.tableToolbar.exportCSV' | uiStableMessage}}</button><button uiAction data-table-control type="button" [disabled]="blocked()" (click)="export('print')">{{'uiFoundation.tableToolbar.printTable' | uiStableMessage}}</button>}</div>`, styles: controlsStyle })
export class TableToolbar<T extends object> {
 protected readonly uiText_TableToolbar=injectUiMessageText();
    readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_TableToolbar("uiFoundation.tableToolbar.tableActions"));
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

/** Keep the localized visible action in the column button's accessible name. */
export function injectTableColumnMoveText() {
    const text = injectUiMessageText();
    return (direction: -1 | 1, column?: string): string => {
        const earlier = direction === -1;
        if (column === undefined) return text(earlier ? "uiFoundation.tableControls.moveEarlier" : "uiFoundation.tableControls.moveLater");
        return text(earlier ? "uiFoundation.tableControls.moveColumnEarlierLabel" : "uiFoundation.tableControls.moveColumnLaterLabel", { column });
    };
}
