import {Component,computed,signal,viewChild} from '@angular/core';
import {DataGrid,DataTableView,TableTemplate,ColumnChooser,CellEditor,RowEditor,TreeGrid,createTableState,type TableKey,type GridPasteRequest,type TableEditableColumn,type TableEditRequest,type TableHeaderGroup,type TreeNode} from '../../.ui/generated/angular/index';

interface StringTableRow { id: string | number; name: string; }
interface CompoundTableRow { id: string | number; left: string; right: string; }
interface SuffixTableRow { id: string | number; name: string; amount: number; }
interface MapTableRow { id: string | number; name: string; other: string; }

/** A legal typed consumer, independent of the number-only catalog DTO. */
@Component({
    selector: 'stage-unicode-case', standalone: true,
    imports: [DataGrid, DataTableView, TableTemplate, ColumnChooser, CellEditor, RowEditor, TreeGrid],
    template: `<section aria-label="文字列IDの検証">
      <button type="button" (click)="enabled.set(true)">文字列IDの表を開く</button>
      @if(enabled()){
        <h2>文字列キーの表</h2>
        <ui-data-grid #grid caption="文字列キーのグリッド" gridId="unicode-grid" [rows]="rows()" [columns]="columns" keyField="id" (saveRequested)="save($event)" (pasteRequested)="paste($event)" (rowsChange)="rows.set($event)" />
        <ui-data-table caption="文字列キーの通常表" tableId="unicode-native" [rows]="rows()" [columns]="columns" keyField="id" [pagination]="false" [columnGroups]="groups" [columnFilters]="true" [state]="state()" (stateChange)="state.set($event)" editMode="cell" selectionMode="multiple" [selectedKeys]="selected()" (selectedKeysChange)="selected.set($event)" />
        <ui-data-table caption="文字列キーの仮想表" tableId="unicode-virtual" [rows]="rows()" [columns]="columns" keyField="id" [pagination]="false" [virtualize]="true" [virtualHeight]="200" [columnControls]="false" selectionMode="multiple" [selectedKeys]="selected()" (selectedKeysChange)="selected.set($event)" />
        <ui-tree-grid caption="文字列キーの階層表" gridId="unicode-tree" [nodes]="nodes()" [columns]="columns" keyField="id" />
        <ui-cell-editor controlId="unicode-cell" label="Unicodeセル編集" [row]="rows()[0]" [column]="columns[0]" keyField="id" />
        <ui-row-editor controlId="unicode-row" label="Unicode行編集" [row]="rows()[0]" [columns]="columns" keyField="id" />
        <ui-row-editor controlId="unicode-suffix" label="予約suffixの行編集" [row]="suffixRow" [columns]="suffixColumns" keyField="id" />
        @for(column of prototypeColumns;track column.id){
          <ui-row-editor #prototypeEditor [controlId]="'unicode-reserved-'+column.id" [label]="column.id+'の行編集'" [row]="prototypeRow()" [columns]="[column]" keyField="id" (saveRequested)="savePrototype(prototypeEditor,$event)" (rowChange)="prototypeRow.set($event)" />
        }
        <ui-data-table #mapTable caption="辞書キーの通常表" tableId="map-native" [rows]="mapRows()" [columns]="mapColumns" keyField="id" [pagination]="false" [state]="mapState()" (stateChange)="mapState.set($event)" editMode="cell" (saveRequested)="saveMapTable($event)" (rowsChange)="mapRows.set($event)" />
        <ui-column-chooser [columns]="mapColumns" [state]="mapState()" (stateChange)="mapState.set($event)" />
        <ui-data-table caption="辞書キーの仮想表" tableId="map-virtual" [rows]="mapRows()" [columns]="mapColumns" keyField="id" [pagination]="false" [virtualize]="true" [virtualHeight]="200" [columnControls]="false" [state]="mapState()"><ng-template uiTableCell="__proto__" [uiTableTemplateOf]="mapRows()" let-value="value">投影: {{value}}</ng-template></ui-data-table>
        <ui-data-grid #mapGrid caption="辞書キーのグリッド" gridId="map-grid" [rows]="mapRows()" [columns]="mapColumns" keyField="id" (saveRequested)="saveMapGrid($event)" (pasteRequested)="pasteMap($event)" (rowsChange)="mapRows.set($event)" />
        <ui-data-table caption="複合IDの列グループ" tableId="compound-native" [rows]="compoundRows" [columns]="compoundColumns" keyField="id" [pagination]="false" [columnGroups]="compoundGroups" editMode="cell" [columnControls]="false" />
        <ui-data-grid caption="複合IDのグリッド" gridId="compound-grid" [rows]="compoundRows" [columns]="compoundColumns" keyField="id" />
        <p data-testid="unicode-selected">{{serializedSelection()}}</p>
        <p data-testid="unicode-ack-key">{{serializedKey()}}</p>
        <p data-testid="unicode-state">{{serializedState()}}</p>
        <p data-testid="prototype-saves">{{serializedPrototypeSaves()}}</p>
        <p data-testid="map-state">{{serializedMapState()}}</p><p data-testid="map-pastes">{{serializedMapPastes()}}</p><p data-testid="map-saves">{{serializedMapSaves()}}</p>
      }
    </section>`,
    styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;}section{display:grid;gap:var(--ui-space-field);min-inline-size:0;}h2,p{margin:0;overflow-wrap:anywhere;}button{font:inherit;max-inline-size:100%;white-space:normal;}`
})
export class UnicodeTableCase {
    readonly enabled = signal(false);
    readonly rows = signal<readonly StringTableRow[]>([{ id: 'business-\ud800', name: 'Unicodeの申請' }, { id: 17, name: '数値キーの申請' }, { id: 'business-%u0062d800', name: 'リテラルトークンの申請' }]);
    readonly columns: readonly TableEditableColumn<StringTableRow>[] = [{ id: 'column-\udc00', field: 'name', header: '特殊IDの申請名', type: 'text', required: true }];
    readonly groups: readonly TableHeaderGroup[] = [{ id: 'group-\ud800', label: '文字列の列グループ', children: [this.columns[0].id] }];
    readonly compoundRows: readonly CompoundTableRow[] = [{ id: 'a-b', left: 'Aの左', right: 'Aの右' }, { id: 'a', left: 'Bの左', right: 'Bの右' }];
    readonly compoundColumns: readonly TableEditableColumn<CompoundTableRow>[] = [{ id: 'c', field: 'left', header: '左の項目' }, { id: 'b-c', field: 'right', header: '右の項目' }];
    readonly compoundGroups: readonly TableHeaderGroup[] = [{ id: 'a-b', label: '第一グループ', children: ['c'] }, { id: 'a', label: '第二グループ', children: ['b-c'] }];
    readonly suffixRow: SuffixTableRow = { id: 'suffix-row', name: '必須の申請名', amount: 0 };
    readonly suffixColumns: readonly TableEditableColumn<SuffixTableRow>[] = [{ id: 'c', field: 'name', header: '必須の申請名', type: 'text', required: true }, { id: 'c-error', field: 'amount', header: 'suffixの金額', type: 'number' }];
    readonly prototypeRow = signal<StringTableRow>({ id: 'prototype-raw-key', name: '予約名の初期値' });
    readonly prototypeColumns: readonly TableEditableColumn<StringTableRow>[] = [{ id: 'constructor', field: 'name', header: '予約列 constructor', type: 'text', required: true }, { id: '__proto__', field: 'name', header: '予約列 __proto__', type: 'text', required: true }];
    readonly prototypeSaves = signal<readonly TableEditRequest<StringTableRow>[]>([]);
    readonly serializedPrototypeSaves = computed(() => JSON.stringify(this.prototypeSaves()));
    readonly mapRows = signal<readonly MapTableRow[]>([{ id: 'map-raw-key', name: '辞書の最初の行', other: '元の辞書値' }, { id: 31, name: '辞書の二行目', other: '二行目の辞書値' }]);
    readonly mapColumns: readonly TableEditableColumn<MapTableRow>[] = [{ id: 'constructor', field: 'name', header: '辞書列 constructor', type: 'text', required: true }, { id: '__proto__', field: 'other', header: '辞書列 __proto__', type: 'text', required: true }];
    readonly mapState = signal(createTableState());
    readonly mapPastes = signal<readonly GridPasteRequest<MapTableRow>[]>([]);
    readonly mapSaves = signal<readonly TableEditRequest<MapTableRow>[]>([]);
    readonly serializedMapState = computed(() => JSON.stringify(this.mapState()));
    readonly serializedMapPastes = computed(() => JSON.stringify(this.mapPastes()));
    readonly serializedMapSaves = computed(() => JSON.stringify(this.mapSaves()));
    readonly mapGrid = viewChild<DataGrid<MapTableRow>>('mapGrid');
    readonly mapTable = viewChild<DataTableView<MapTableRow>>('mapTable');
    readonly nodes = computed<readonly TreeNode<StringTableRow>[]>(() => [{ id: 'unicode-node', label: '文字列キーのノード', data: this.rows()[0] }]);
    readonly state = signal(createTableState());
    readonly selected = signal<readonly TableKey[]>([]);
    readonly lastKey = signal<TableKey | null>(null);
    readonly serializedSelection = computed(() => JSON.stringify(this.selected()));
    readonly serializedKey = computed(() => JSON.stringify(this.lastKey()));
    readonly serializedState = computed(() => JSON.stringify(this.state()));
    readonly grid = viewChild<DataGrid<StringTableRow>>('grid');
    save(request: TableEditRequest<StringTableRow>): void { this.lastKey.set(request.key); this.grid()?.completeEdit(request.requestId); }
    paste(request: GridPasteRequest<StringTableRow>): void { this.lastKey.set(request.changes[0]?.key ?? null); this.grid()?.completePaste(request.requestId); }
    savePrototype(editor: RowEditor<StringTableRow>, request: TableEditRequest<StringTableRow>): void { this.prototypeSaves.update(requests => [...requests, request]); editor.complete(request.requestId); }
    saveMapGrid(request: TableEditRequest<MapTableRow>): void { this.mapSaves.update(requests => [...requests, request]); this.mapGrid()?.completeEdit(request.requestId); }
    saveMapTable(request: TableEditRequest<MapTableRow>): void { this.mapSaves.update(requests => [...requests, request]); this.mapTable()?.completeEdit(request.requestId); }
    pasteMap(request: GridPasteRequest<MapTableRow>): void { this.mapPastes.update(requests => [...requests, request]); this.mapGrid()?.completePaste(request.requestId); }
}
