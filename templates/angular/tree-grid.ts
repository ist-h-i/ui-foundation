import {injectUiMessageText as injectUiDiagnosticText} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {injectUiLocale,UiStableMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { DataGrid, type GridPasteRequest, type GridTreeRow } from './data-grid';
import { tableConfigurationError, createTableState, type TableKey } from './table-model';
import { type TableEditableColumn, type TableEditRequest } from './table-advanced-model';
import { installTableControlFocus } from './table-runtime';
import { nextTreeRequestId } from './tree-load-sequence';
import { treeBeginLoad, treeBranch, treeCancelLoads, treeEntries, treeEntry, treeFailLoad, treeNodes, treeResolveLoad, treeUnloaded, treeVisible, treeWithLoads, type TreeLoadCancellation, type TreeLoadRequest, type TreeLoads, type TreeNode } from './tree-model';
/** Hierarchy owns UI string IDs; row data keeps the application's business key type. */
@Component({ selector: 'ui-tree-grid,ui-tree-table', standalone: true, imports: [ActionControl, DataGrid,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush, host: { 'data-table-owner': '', tabindex: '-1', '[attr.aria-label]': 'caption()' }, template: `
 @if(problem()){<p role="alert">{{problem()}}</p>}@else{
 <ui-data-grid #grid [caption]="caption()" [gridId]="gridId()" [rows]="rows()" [columns]="columns()" [keyField]="keyField()" [treeRows]="metadata()" [editable]="editable()" [disabled]="disabled()" [busy]="busy()" [rowSelection]="selectionMode()" [selectedKeys]="selectedKeys()" [locale]="effectiveLocale()" (treeToggleRequested)="toggle($event)" (selectedKeysChange)="selected($event)" (saveRequested)="saveRequested.emit($event)" (pasteRequested)="pasteRequested.emit($event)" (rowsChange)="edited($event)"/>
 @for(record of loadRecords();track record.requestId){<p [attr.role]="record.status==='error'?'alert':'status'">{{nodeLabel(record.nodeId)}}: {{record.status==='loading'?('uiFoundation.treeGrid.loadingChildRows' | uiStableMessage):record.message}}@if(record.status==='error'){<button uiAction data-table-control type="button" [disabled]="disabled()||busy()" (click)="requestLoad(record.nodeId)">{{'uiFoundation.treeGrid.reloadChildRows' | uiStableMessage}} {{nodeLabel(record.nodeId)}}</button>}</p>}}
 @if(collapseDeferredIds().length){<p role="status">{{'uiFoundation.treeGrid.someRowsAreBeingEditedOrAreWaitingToSaveSaveOrCancelTheEditsToCollapseTheHierarchy' | uiStableMessage}}</p>}
 @if(incomplete()){<p>{{'uiFoundation.treeGrid.someChildRowsHaveYetToLoadExpandTheRowToLoadThem' | uiStableMessage}}</p>}`, styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}:host([hidden]){display:none;}p{overflow-wrap:anywhere;}` })
export class TreeGrid<T extends object> {
 private readonly uiDiagnostic_TreeGrid=injectUiDiagnosticText();

 private readonly uiRuntimeText_TreeGrid=injectUiRuntimeText();

    readonly caption = input.required<string>();
    readonly gridId = input.required<string>();
    readonly nodes = input.required<readonly TreeNode<T>[]>();
    readonly columns = input.required<readonly TableEditableColumn<T>[]>();
    readonly keyField = input.required<keyof T & string>();
    readonly expandedIds = input<readonly string[]>([]);
    readonly expandedIdsChange = output<readonly string[]>();
    readonly selectedIds = input<readonly string[]>([]);
    readonly selectedIdsChange = output<readonly string[]>();
    readonly selectionMode = input<'none' | 'single' | 'multiple'>('none');
    readonly editable = input(true, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);
    readonly nodesChange = output<readonly TreeNode<T>[]>();
    readonly saveRequested = output<TableEditRequest<T>>();
    readonly pasteRequested = output<GridPasteRequest<T>>();
    readonly loadRequested = output<TreeLoadRequest>();
    readonly loadCancelled = output<TreeLoadCancellation>();
    private readonly destroy = inject(DestroyRef);
    private readonly grid = viewChild(DataGrid<T>);
    private readonly loads = signal<TreeLoads<T>>({});
    private previousSource: readonly TreeNode<T>[] | null = null;
    private readonly requestSources = new Map<number, readonly TreeNode<T>[]>();
    protected readonly resolved = computed(() => {
        try {
            return treeWithLoads(treeNodes(this.nodes()), this.loads());
        }
        catch {
            return [];
        }
    });
    /** Requested collapse is deferred while it would discard a draft or pending app acknowledgement. */
    readonly displayExpandedIds = computed<readonly string[]>(() => {
        const expanded = new Set(this.expandedIds()), retained = this.grid()?.retainedRowKeys() ?? [];
        if (retained.length)
            for (const entry of treeEntries(this.resolved()))
                if (entry.node.data && retained.includes(entry.node.data[this.keyField()] as TableKey))
                    entry.path.slice(0, -1).forEach(id => expanded.add(id));
        return [...expanded];
    });
    readonly collapseDeferredIds = computed(() => this.displayExpandedIds().filter(id => !this.expandedIds().includes(id)));
    protected readonly entries = computed(() => treeVisible(this.resolved(), this.displayExpandedIds()));
    protected readonly rows = computed(() => this.entries().map(entry => entry.node.data!));
    protected readonly metadata = computed<readonly GridTreeRow[]>(() => this.entries().map(entry => ({ id: entry.node.id, parentId: entry.parentId, level: entry.level, position: entry.position, setSize: entry.setSize, branch: treeBranch(entry.node), expanded: this.displayExpandedIds().includes(entry.node.id), disabled: entry.disabled, selectable: entry.node.selectable, loading: this.loads()[entry.node.id]?.status === 'loading' })));
    protected readonly selectedKeys = computed(() => treeEntries(this.resolved()).filter(entry => this.selectedIds().includes(entry.node.id) && entry.node.data).map(entry => entry.node.data![this.keyField()] as TableKey));
    protected readonly incomplete = computed(() => treeEntries(this.resolved()).some(entry => treeUnloaded(entry.node)));
    protected readonly loadRecords = computed(() => Object.values(this.loads()).filter(record => record.status !== 'loaded'));
    protected readonly problem = computed(() => {
        try {
            const source = treeWithLoads(treeNodes(this.nodes()), this.loads()), entries = treeEntries(source);
            if (entries.some(entry => !entry.node.data || typeof entry.node.data !== 'object'))
                return this.uiRuntimeText_TreeGrid("uiFoundation.treeGrid.provideDataWithColumnsAndARowKeyForEachRowInTheHierarchy");
            return tableConfigurationError(entries.map(entry => entry.node.data!), this.columns(), this.keyField(), createTableState(), this.uiDiagnostic_TreeGrid);
        }
        catch {
            return this.uiRuntimeText_TreeGrid("uiFoundation.treeGrid.checkTheIDsParentChildRelationshipsAndLoadedChildRows");
        }
    });
    protected nodeLabel(id: string): string { return treeEntry(this.resolved(), id)?.node.label ?? id; }
    protected toggle(id: string): void {
        const entry = treeEntry(this.resolved(), id);
        if (!entry || entry.disabled || this.disabled() || this.busy() || !treeBranch(entry.node))
            return;
        if (this.displayExpandedIds().includes(id)) {
            this.expandedIdsChange.emit(this.expandedIds().filter(value => value !== id));
            const ids = Object.values(this.loads()).filter(record => record.path.includes(id)).map(record => record.nodeId);
            this.cancelLoads(ids, 'collapse');
        }
        else {
            this.expandedIdsChange.emit([...this.expandedIds(), id]);
            if (treeUnloaded(entry.node))
                this.requestLoad(id);
        }
    }
    protected requestLoad(id: string): void {
        if (this.destroy.destroyed || this.disabled() || this.busy())
            return;
        const next = treeBeginLoad(this.nodes(), this.loads(), id, nextTreeRequestId());
        if (next.request) {
            this.loads.set(next.loads);
            this.requestSources.set(next.request.requestId, this.nodes());
            this.loadRequested.emit(next.request);
        }
    }
    resolveLoad(requestId: number, children: readonly TreeNode<T>[]): boolean {
        if (this.destroy.destroyed || this.requestSources.get(requestId) !== this.nodes())
            return false;
        let next: TreeLoads<T> | null;
        try {
            next = treeResolveLoad(this.nodes(), this.loads(), requestId, children);
        }
        catch {
            return false;
        }
        if (!next)
            return false;
        this.requestSources.delete(requestId);
        this.loads.set(next);
        return true;
    }
    failLoad(requestId: number, message: string): boolean {
        if (this.destroy.destroyed || this.requestSources.get(requestId) !== this.nodes() || !message.trim())
            return false;
        const next = treeFailLoad(this.loads(), requestId, message);
        if (!next)
            return false;
        this.requestSources.delete(requestId);
        this.loads.set(next);
        return true;
    }
    private cancelLoads(ids: readonly string[] | null, reason: TreeLoadCancellation['reason']): void {
        const next = treeCancelLoads(this.loads(), ids, reason);
        this.loads.set(next.loads);
        for (const request of next.cancelled) {
            this.requestSources.delete(request.requestId);
            if (!this.destroy.destroyed)
                this.loadCancelled.emit(request);
        }
    }
    protected selected(keys: readonly TableKey[]): void {
        if (this.disabled() || this.busy() || this.selectionMode() === 'none')
            return;
        const entries = treeEntries(this.resolved()), ids = entries.filter(entry => entry.node.data && keys.includes(entry.node.data[this.keyField()] as TableKey)).map(entry => entry.node.id);
        this.selectedIdsChange.emit([...this.selectedIds().filter(id => !entries.some(entry => entry.node.id === id)), ...ids]);
    }
    protected edited(rows: readonly T[]): void { const byKey = new Map(rows.map(row => [row[this.keyField()] as TableKey, row])); const walk = (nodes: readonly TreeNode<T>[]): readonly TreeNode<T>[] => nodes.map(node => ({ ...node, ...(node.data ? { data: byKey.get(node.data[this.keyField()] as TableKey) ?? node.data } : {}), ...(node.children ? { children: walk(node.children) } : {}) })); this.nodesChange.emit(walk(this.resolved())); }
    completeEdit(requestId: number, row?: T): boolean { return this.grid()?.completeEdit(requestId, row) ?? false; }
    failEdit(requestId: number, message: string): boolean { return this.grid()?.failEdit(requestId, message) ?? false; }
    completePaste(requestId: number, rows?: readonly T[]): boolean { return this.grid()?.completePaste(requestId, rows) ?? false; }
    failPaste(requestId: number, message: string): boolean { return this.grid()?.failPaste(requestId, message) ?? false; }
    invalidatePending(): void { this.grid()?.invalidatePending(); this.cancelLoads(null, 'invalidate'); }
    constructor() {
        installTableControlFocus();
        effect(() => {
            const source = this.nodes();
            untracked(() => {
                if (this.previousSource && this.previousSource !== source) {
                    this.cancelLoads(null, 'source-change');
                    this.loads.set({});
                    this.grid()?.invalidatePending();
                }
                this.previousSource = source;
            });
        });
        afterRenderEffect(() => {
            const expanded = this.displayExpandedIds();
            this.loads();
            untracked(() => {
                const hidden = Object.values(this.loads()).filter(record => record.status === 'loading' && record.path.some(id => !expanded.includes(id))).map(record => record.nodeId);
                if (hidden.length)
                    this.cancelLoads(hidden, 'collapse');
            });
        });
        this.destroy.onDestroy(() => { this.requestSources.clear(); this.loads.set({}); });
    }
}
