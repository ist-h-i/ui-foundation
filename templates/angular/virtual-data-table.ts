import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiLocale,injectUiMessageText,UiStableMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectorRef, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, untracked, viewChild, isSignal, type Signal, type TemplateRef } from '@angular/core';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ActionControl } from './action-control';
import { canFocus } from './focus';import {VirtualScroll} from './virtual-scroll';import {VirtualRows} from './virtual-rows';import {virtualRadioProblem,type VirtualRadioGroup} from './virtual-radio';export type {VirtualRadioGroup,VirtualRadioMember} from './virtual-radio';
import { createTableState, tableConfigurationError, tableOwnValue, tableText, tableValue, type TableColumn, type TableKey, type TableState } from './table-model';
import { type TableTemplateContext } from './data-table-view';
import { tableDomIdToken } from './table-advanced-model';
/** CDK public fixed-size scrolling with explicit table row/column relationships. */
@Component({ selector: 'ui-virtual-data-table', standalone: true, imports: [NgTemplateOutlet, ActionControl, VirtualScroll, VirtualRows, CdkVirtualScrollViewport,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `
 <span #rowProbe class="ui-virtual-table__row-probe" aria-hidden="true"></span>@if(problem()){<p role="alert">{{problem()}}</p>}@else if(rowSize()>0){
 <div role="table" class="ui-virtual-table__table" [attr.aria-label]="caption()" [attr.aria-rowcount]="rows().length+1" [attr.aria-colcount]="columns().length+utilityCount()" [attr.aria-busy]="busy()?'true':null"><p class="ui-virtual-table__caption">{{uiRuntimeText_VirtualDataTable('uiFoundation.virtualDataTable.captionWithCount', {caption: caption(), count: rows().length})}}</p><div class="ui-virtual-table__horizontal">
 <div role="rowgroup"><div role="row" aria-rowindex="1" class="ui-virtual-table__row ui-virtual-table__header" [style.grid-template-columns]="gridColumns()" [style.min-inline-size]="minimumInline()">@if(selectionMode()!=='none'){<div role="columnheader">@if(selectionMode()==='multiple'){<input data-table-virtual-control type="checkbox" [attr.aria-label]="('uiFoundation.virtualDataTable.selectAllLoadedVisibleRows' | uiStableMessage)" [checked]="allSelected()" [indeterminate]="someSelected()&&!allSelected()" [disabled]="busy()||disabled()||!selectionRows().length" (change)="selectAll($event)">}@else{{{'uiFoundation.virtualDataTable.selection' | uiStableMessage}}}</div>}@for(column of columns();track column.id){<div role="columnheader" [id]="headerId(column.id)" [attr.data-column-id]="column.id" [attr.aria-colindex]="$index+1+utilityCount()" [attr.aria-sort]="ariaSort(column.id)">@if(sortable()&&column.sortable!==false){<button uiAction data-table-virtual-control type="button" [disabled]="busy()||disabled()" [attr.aria-label]="uiRuntimeText_VirtualDataTable('uiFoundation.virtualDataTable.sortColumnLabel', {column: column.header})" (click)="sortRequested.emit(column.id)">{{column.header}}</button>}@else{ {{column.header}} }</div>}</div></div>
 <cdk-virtual-scroll-viewport #viewport role="rowgroup" tabindex="0" class="ui-virtual-table__viewport" [attr.aria-label]="uiRuntimeText_VirtualDataTable('uiFoundation.virtualDataTable.viewportLabel', {caption: caption()})" [style.block-size.px]="height()" [style.min-inline-size]="minimumInline()" [uiVirtualScroll]="rowSize()" [uiVirtualOverscan]="overscan()" [uiVirtualRadioGroups]="effectiveRadioGroups()" [uiVirtualRender]="refreshWindow" (keydown)="key($event)"><div class="ui-virtual-window" [style.padding-block-start.px]="scroller()?.offset()??0">
 <div class="ui-virtual-slot" *uiVirtualRows="let row of rows();let index=index;let gap=gap;trackBy:track" [style.padding-block-start.px]="gap"><div role="row" class="ui-virtual-table__row" [attr.data-ui-virtual-index]="index" [attr.aria-rowindex]="index+2" [attr.data-virtual-row-key]="encodedKey(row)" [style.block-size.px]="rowSize()" [style.grid-template-columns]="gridColumns()">@if(selectionMode()!=='none'){<div role="cell"><input data-table-virtual-control [type]="selectionMode()==='single'?'radio':'checkbox'" [name]="tableId()+'-virtual-selection'" [value]="encodedKey(row)" [attr.aria-label]="uiRuntimeText_VirtualDataTable('uiFoundation.virtualDataTable.selectRowLabel', {row: rowLabel(row)})" [checked]="selectedKeys().includes(rowKey(row))" [disabled]="busy()||disabled()||!rowSelectable()(row)" (change)="select(row,$event)"></div>}@for(column of columns();track column.id){<div role="cell" class="ui-virtual-table__cell" tabindex="0" [attr.aria-colindex]="$index+1+utilityCount()" [attr.aria-describedby]="headerId(column.id)">@if(cellTemplate(column);as template){<ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{$implicit:row,value:cellValue(row,column),column}"/>}@else{<span>{{cellText(row,column)}}</span>}</div>}</div>
 </div></div></cdk-virtual-scroll-viewport></div></div>@if(!rows().length){<p role="status">{{'uiFoundation.virtualDataTable.noData' | uiStableMessage}}</p>}}@else{<p role="status">{{'uiFoundation.virtualDataTable.preparingTheTableViewport' | uiStableMessage}}</p>}`, styles: `
 :host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}:host([hidden]){display:none;}.ui-virtual-table__caption{font-weight:var(--ui-weight-control);overflow-wrap:anywhere;margin-block:var(--ui-space-table-y);}.ui-virtual-table__horizontal{max-inline-size:100%;overflow:auto;overscroll-behavior:contain;}.ui-virtual-table__viewport{scroll-padding:calc(var(--ui-border-focus) + var(--ui-border-focus-offset));display:block;box-sizing:border-box;block-size:var(--ui-size-table-viewport);background:var(--ui-color-surface);}.ui-virtual-table__viewport:focus-visible,.ui-virtual-table__cell:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}.ui-virtual-table__row{display:grid;box-sizing:border-box;}.ui-virtual-table__row>[role=cell],.ui-virtual-table__row>[role=columnheader]{min-inline-size:0;box-sizing:border-box;padding:var(--ui-space-table-y) var(--ui-space-table-x);border-block-end:var(--ui-border-control) solid var(--ui-color-border);border-inline-end:var(--ui-border-control) solid var(--ui-color-border);overflow:auto;}.ui-virtual-table__header{background:var(--ui-color-background);font-weight:var(--ui-weight-control);}.ui-virtual-table__cell>span{display:block;white-space:nowrap;overflow-wrap:normal;}.ui-virtual-table__row-probe{position:absolute;visibility:hidden;pointer-events:none;inline-size:0;block-size:calc(max(var(--ui-size-control),calc(var(--ui-text-body) * var(--ui-leading-body))) + 2 * var(--ui-space-table-y));}input[type=checkbox],input[type=radio]{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}` })
export class VirtualDataTable<T extends object> {

 protected readonly uiRuntimeText_VirtualDataTable=injectUiRuntimeText();

 protected readonly uiText_VirtualDataTable=injectUiMessageText();
    readonly caption = input.required<string>();
    readonly tableId = input.required<string>();
    readonly rows = input.required<readonly T[]>();
    readonly columns = input.required<readonly TableColumn<T>[]>();
    readonly keyField = input.required<keyof T & string>();
    readonly state = input<TableState>(createTableState());
    readonly busy = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly height = input<number | null>(null);
    readonly itemHeight = input<number | null>(null);
    readonly overscan = input(3);
    readonly radioGroupsSource=input<readonly VirtualRadioGroup[]|Signal<readonly VirtualRadioGroup[]>>([],{alias:'radioGroups'});readonly radioGroups=computed(()=>{const source=this.radioGroupsSource();return isSignal(source)?source():source;});
    readonly locale = input<string>();
    protected readonly uiLocaleDefaults = injectUiLocale();
    protected readonly effectiveLocale = computed(() => this.locale() ?? this.uiLocaleDefaults().locale);
    readonly missingLabel = input<string>();
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_VirtualDataTable("uiFoundation.virtualDataTable.unavailable"));
    readonly sortable = input(true, { transform: booleanAttribute });
    readonly sortRequested = output<string>();
    readonly selectionMode = input<'none' | 'single' | 'multiple'>('none');
    readonly selectedKeysSource=input<readonly TableKey[]|Signal<readonly TableKey[]>>([],{alias:'selectedKeys'});readonly selectedKeys=computed(()=>{const source=this.selectedKeysSource();return isSignal(source)?source():source;});
    readonly selectedKeysChange = output<readonly TableKey[]>();
    readonly rowSelectable = input<(row: T) => boolean>(() => true);
    readonly cellTemplates = input<Readonly<Record<string, TemplateRef<TableTemplateContext<T>>>>>({});
    readonly columnWidthsChange = output<Readonly<Record<string, number>>>();
    readonly rangeChange = output<{
        start: number;
        end: number;
    }>();
    readonly positionChange = output<{
        offset: number;
        index: number;
    }>();
    protected readonly scroller = viewChild(VirtualScroll);
    private readonly changeDetector = inject(ChangeDetectorRef);readonly refreshWindow=()=>this.changeDetector.detectChanges();
    private readonly viewport = viewChild(CdkVirtualScrollViewport);
    private readonly probe = viewChild<ElementRef<HTMLElement>>('rowProbe');
    private readonly measuredRow = signal(0);
    private readonly destroy = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private priorRowSize = 0;
    private owned: HTMLElement | null = null;
    private readonly renderedRange = signal({start:0,end:0});
    protected readonly rowSize = computed(() => this.itemHeight() ?? this.measuredRow());
    protected readonly utilityCount = computed(() => Number(this.selectionMode() !== 'none'));
    protected readonly minimumInline = computed(() => `calc(var(--ui-size-table-column-min) * ${this.columns().length + this.utilityCount()})`);
    protected readonly gridColumns = computed(() => [...(this.selectionMode() !== 'none' ? ['var(--ui-size-table-column-min)'] : []), ...this.columns().map(column => {
            const width = tableOwnValue(this.state().columnWidths, column.id) ?? column.width;
            if (width !== undefined)
                return Math.max(column.minWidth ?? 1, Math.min(column.maxWidth ?? Infinity, width)) + 'px';
            const minimum = column.minWidth !== undefined ? column.minWidth + 'px' : 'var(--ui-size-table-column-min)';
            return `minmax(${minimum},${column.maxWidth !== undefined ? column.maxWidth + 'px' : '1fr'})`;
        })].join(' '));
    protected readonly problem = computed(() => tableConfigurationError(this.rows(), this.columns(), this.keyField(), this.state(), this.uiRuntimeText_VirtualDataTable) || (!this.caption().trim() || !this.tableId().trim() || this.itemHeight() !== null && (!Number.isFinite(this.itemHeight()) || this.itemHeight()! <= 0) || this.height() !== null && (!Number.isFinite(this.height()) || this.height()! <= 0) || !Number.isSafeInteger(this.overscan()) || this.overscan() < 0 ? this.uiRuntimeText_VirtualDataTable("uiFoundation.virtualDataTable.checkTheVirtualTableDescriptionRowHeightViewportHeightAndOverscan") : null) || virtualRadioProblem(this.radioGroups(), this.rows().map(row => this.rowKey(row)), this.host.closest('form')?.id ?? null, this.uiRuntimeText_VirtualDataTable) || virtualRadioProblem(this.effectiveRadioGroups(), this.rows().map(row => this.rowKey(row)), this.host.closest('form')?.id ?? null, this.uiRuntimeText_VirtualDataTable));
    protected readonly effectiveRadioGroups = computed<readonly VirtualRadioGroup[]>(()=>[...this.radioGroups(),...(this.selectionMode()==='single'?[{name:this.tableId()+'-virtual-selection',value:this.rows().filter(row=>this.selectedKeys().includes(this.rowKey(row))).map(row=>this.encodedKey(row))[0]??null,members:this.rows().map(row=>({key:this.rowKey(row),value:this.encodedKey(row),disabled:this.busy()||this.disabled()||!this.rowSelectable()(row)}))}]:[])]);
    protected readonly selectionRows = computed(() => this.rows().filter(row => this.rowSelectable()(row)));
    protected readonly allSelected = computed(() => this.selectionRows().length > 0 && this.selectionRows().every(row => this.selectedKeys().includes(this.rowKey(row))));
    protected readonly someSelected = computed(() => this.selectionRows().some(row => this.selectedKeys().includes(this.rowKey(row))));
    protected rowKey(row: T): TableKey { return row[this.keyField()] as TableKey; }
    protected encodedKey(row: T): string { return typeof this.rowKey(row) + ':' + this.rowKey(row); }
    protected rowLabel(row: T): string { return tableText(row, this.columns()[0], this.effectiveLocale(), this.uiEffective_missingLabel(), this.uiLocaleDefaults().numberOptions, this.uiRuntimeText_VirtualDataTable); }
    protected cellText(row: T, column: TableColumn<T>): string { return tableText(row, column, this.effectiveLocale(), this.uiEffective_missingLabel(), this.uiLocaleDefaults().numberOptions, this.uiRuntimeText_VirtualDataTable); }
    protected cellValue(row: T, column: TableColumn<T>): unknown { return tableValue(row, column); }
    protected cellTemplate(column: TableColumn<T>): TemplateRef<TableTemplateContext<T>> | undefined { return tableOwnValue(this.cellTemplates(), column.id); }
    protected headerId(id: string): string { return this.tableId() + '-virtual-header-' + tableDomIdToken(id); }
    protected ariaSort(id: string): 'ascending' | 'descending' | null { const first = this.sortable() ? this.state().sort[0] : null; return first?.column === id ? first.direction === 'asc' ? 'ascending' : 'descending' : null; }
    readonly track = (_index: number, row: T): TableKey => this.rowKey(row);
    protected select(row: T, event: Event): void {
        if (this.busy() || this.disabled() || !this.rowSelectable()(row) || this.selectionMode() === 'none')
            return;
        const key = this.rowKey(row), remaining = this.selectedKeys().filter(value => value !== key);
        this.selectedKeysChange.emit(this.selectionMode() === 'single' ? [key] : (event.target as HTMLInputElement).checked ? [...remaining, key] : remaining);
    }
    protected selectAll(event: Event): void {
        if (this.busy() || this.disabled() || this.selectionMode() !== 'multiple')
            return;
        const scope = this.selectionRows().map(row => this.rowKey(row));
        this.selectedKeysChange.emit((event.target as HTMLInputElement).checked ? [...new Set([...this.selectedKeys(), ...scope])] : this.selectedKeys().filter(key => !scope.includes(key)));
    }
    scrollToIndex(index: number): boolean {
        const viewport = this.viewport();
        if (this.destroy.destroyed || !viewport || this.problem() || !Number.isSafeInteger(index) || index < 0 || index >= this.rows().length)
            return false;
        viewport.scrollToIndex(index, 'instant');
        return true;
    }
    scrollToOffset(offset: number): boolean {
        const viewport = this.viewport();
        if (this.destroy.destroyed || !viewport || this.problem() || !Number.isFinite(offset) || offset < 0)
            return false;
        this.scroller()?.releaseKeyboard();
        viewport.scrollToOffset(offset, 'instant');
        return true;
    }
    protected key(event: KeyboardEvent): void {
        const viewport = this.viewport();
        if (!viewport || event.defaultPrevented || event.isComposing || event.keyCode === 229)
            return;
        if(!event.altKey&&!event.ctrlKey&&!event.metaKey&&this.scroller()?.prepareRadioArrow(event,()=>this.changeDetector.detectChanges()))return;
        if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
            this.scroller()?.prepareTab(event, () => this.changeDetector.detectChanges());
            return;
        }
        if (event.target !== viewport.elementRef.nativeElement)
            return;
        const current = Math.floor(viewport.measureScrollOffset() / this.rowSize()), page = Math.max(1, Math.floor(viewport.getViewportSize() / this.rowSize()));
        let index: number;
        if (event.key === 'Home')
            index = 0;
        else if (event.key === 'End')
            index = this.rows().length - 1;
        else if (event.key === 'PageDown')
            index = current + page;
        else if (event.key === 'PageUp')
            index = current - page;
        else
            return;
        event.preventDefault();
        this.scrollToIndex(Math.max(0, Math.min(this.rows().length - 1, index)));
    }
    constructor() {
        const document = this.host.ownerDocument;
        const focus = (event: FocusEvent) => { const target = event.target; this.owned = target instanceof HTMLElement && !!target.closest('[data-virtual-row-key],[data-table-virtual-control]') && target.closest('ui-virtual-data-table') === this.host ? target : null; };
        document.addEventListener('focusin', focus, true);
        this.destroy.onDestroy(() => { document.removeEventListener('focusin', focus, true); this.owned = null; });
        afterRenderEffect(onCleanup => {
            const probe = this.probe()?.nativeElement;
            if (!probe)
                return;
            const measure = () => {
                const value = probe.getBoundingClientRect().height;
                if (value > 0)
                    this.measuredRow.set(value);
            };
            measure();
            const observer = new ResizeObserver(measure);
            observer.observe(probe);
            onCleanup(() => observer.disconnect());
        });
        afterRenderEffect(onCleanup => {
            this.columns();
            this.state();
            this.rowSize();
            this.selectionMode();
            const headers = Array.from(this.host.querySelectorAll<HTMLElement>('[role=columnheader][data-column-id]'));
            if (!headers.length)
                return;
            let prior = '';
            const measure = () => {
                const widths = Object.fromEntries(headers.map(header => [header.dataset['columnId']!, header.getBoundingClientRect().width]));
                const current = JSON.stringify(widths);
                if (current !== prior) {
                    prior = current;
                    this.columnWidthsChange.emit(widths);
                }
            };
            measure();
            const observer = new ResizeObserver(measure);
            headers.forEach(header => observer.observe(header));
            onCleanup(() => observer.disconnect());
        });
        afterRenderEffect(onCleanup => {
            const viewport = this.viewport();
            if (!viewport)
                return;
            const range = viewport.renderedRangeStream.subscribe(value => {
                this.renderedRange.set(value);
                this.rangeChange.emit(value);
                if (this.owned && !this.owned.isConnected && document.activeElement === document.body && canFocus(viewport.elementRef.nativeElement)) {
                    this.owned = null;
                    viewport.elementRef.nativeElement.focus({ preventScroll: true });
                }
            }), position = viewport.elementScrolled().subscribe(() => this.positionChange.emit({ offset: viewport.measureScrollOffset(), index: Math.floor(viewport.measureScrollOffset() / this.rowSize()) })), observer = new ResizeObserver(() => viewport.checkViewportSize());
            observer.observe(viewport.elementRef.nativeElement);
            onCleanup(() => { range.unsubscribe(); position.unsubscribe(); observer.disconnect(); });
        });
        afterRenderEffect(() => {
            this.renderedRange();
            this.columns();
            this.rows();
            const viewport = this.viewport();
            if (this.owned && !this.owned.isConnected && document.activeElement === document.body && canFocus(viewport?.elementRef.nativeElement ?? null)) {
                this.owned = null;
                viewport!.elementRef.nativeElement.focus({ preventScroll: true });
            }
        });
        afterRenderEffect(() => {
            const size = this.rowSize(), viewport = this.viewport();
            this.height();
            this.rows();
            if (!size || !viewport)
                return;
            untracked(() => {
                const index = this.priorRowSize ? viewport.measureScrollOffset() / this.priorRowSize : 0;
                viewport.checkViewportSize();
                if (this.priorRowSize && this.priorRowSize !== size)
                    viewport.scrollToOffset(index * size, 'instant');
                this.priorRowSize = size;
            });
        });
    }
}
