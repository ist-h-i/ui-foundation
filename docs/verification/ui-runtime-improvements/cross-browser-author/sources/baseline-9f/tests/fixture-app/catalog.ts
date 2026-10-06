import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { uiProfiles } from '../../.ui/generated/profiles';
import { OverlayCatalog } from './overlay-catalog';
import { InputCatalog } from './input-catalog';
import { DateCatalog } from './date-catalog';
import { GridCatalog } from './grid-catalog';
import {
  ActionControl, DataTableView, TableTemplate, createTableState,
  type TableColumn, type TableState, type TableKey, type TableDataState, type TableRowAction,
} from '../../.ui/generated/angular/index';
interface RecordRow { id: number; name: string; amount: number | null; date: string; status: string }
@Component({
 selector: 'fixture-app', imports: [DataTableView, TableTemplate, ActionControl, InputCatalog, DateCatalog, GridCatalog, OverlayCatalog], changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
  <main class="catalog" [attr.data-ui-profile]="profile()" [attr.dir]="rtl() ? 'rtl' : 'ltr'">
    <h1>共通部品の操作確認</h1><a href="/catalog/feedback">状態表示の確認</a> <a href="/catalog/actions">操作部品の確認</a><a href="/catalog/layout">配置部品の操作確認</a>
    <div><label for="catalog-profile">表示設定</label><select id="catalog-profile" class="ui-field-control" [value]="profile()" (change)="profile.set(value($event))">@for (item of profiles; track item.id) { <option [value]="item.id">{{ item.label }}</option> }</select></div>
    <div class="catalog-options">
      <label><input type="checkbox" [checked]="rtl()" (change)="rtl.set(checked($event))">RTL</label>
      <label><input type="checkbox" [checked]="sortable()" (change)="sortable.set(checked($event))">ソートを有効にする</label>
      <label><input type="checkbox" [checked]="multipleSort()" (change)="multipleSort.set(checked($event))">複数列ソート</label>
      <label><input type="checkbox" [checked]="filters()" (change)="filters.set(checked($event))">列フィルターを有効にする</label>
      <label><input type="checkbox" [checked]="searchEnabled()" (change)="searchEnabled.set(checked($event))">全体検索を有効にする</label>
      <label><input type="checkbox" [checked]="paginationEnabled()" (change)="paginationEnabled.set(checked($event))">ページ送りを有効にする</label>
      <label><input type="checkbox" [checked]="sticky()" (change)="sticky.set(checked($event))">ヘッダーを固定する</label>
      <label><input type="checkbox" [checked]="autoWidth()" (change)="autoWidth.set(checked($event))">自動列幅</label>
      <div><label for="catalog-fit">自動幅の方式</label><select id="catalog-fit" class="ui-field-control" [value]="autoFit()" (change)="changeFit($event)"><option value="available">表示領域</option><option value="content">内容</option></select></div>
      <div><label for="catalog-widths">列幅の境界条件</label><select id="catalog-widths" class="ui-field-control" [value]="widthCase()" (change)="widthCase.set(value($event))"><option value="normal">標準</option><option value="minimum">最小400・最大450</option><option value="maximum">単一列・最大100</option></select></div>
      <div><label for="catalog-selection">行選択</label><select id="catalog-selection" class="ui-field-control" [value]="selectionMode()" (change)="changeSelection($event)"><option value="none">なし</option><option value="single">単一</option><option value="multiple">複数</option></select></div>
      <div><label for="catalog-status">一覧の状態</label><select id="catalog-status" class="ui-field-control" [value]="status()" (change)="changeStatus($event)"><option value="ready">通常</option><option value="loading">取得中</option><option value="updating">更新中</option><option value="error">エラー</option><option value="partial">部分欠損</option></select></div>
      <label><input type="checkbox" [checked]="server()" (change)="server.set(checked($event)); state.set(initialState)">サーバー処理</label>
    </div>
    <section aria-label="表の検証">
      <ui-data-table caption="申請一覧" tableId="catalog-table" [rows]="visibleRecords()" [columns]="columns()" keyField="id"
        [state]="state()" (stateChange)="state.set($event); requests.update(increment)" [mode]="server() ? 'server' : 'client'" [totalItems]="server() ? 40 : null"
        [dataState]="dataState()" [sortable]="sortable()" [sortMode]="multipleSort() ? 'multiple' : 'single'"
        [columnFilters]="filters()" [globalSearch]="searchEnabled()" [searchColumns]="['name','status']" [pagination]="paginationEnabled()"
        [pageSizeOptions]="[2,4,8]" [autoWidth]="autoWidth()" [autoFit]="autoFit()" [stickyHeader]="sticky()"
        [selectionMode]="selectionMode()" [selectedKeys]="selected()" (selectedKeysChange)="selected.set($event)" [rowSelectable]="selectable"
        [expandedKeys]="expanded()" (expandedKeysChange)="expanded.set($event)" [rowActions]="actions" (rowAction)="lastAction.set($event.action + ':' + $event.key)"
        [striped]="true" [borders]="true" [retryAvailable]="true" (retry)="status.set('ready')">
        <ng-template uiTableCell="name" [uiTableTemplateOf]="records" let-row><strong>{{ row.name }}</strong></ng-template>
        <ng-template uiTableDetail [uiTableTemplateOf]="records" let-row><label>メモ: {{ row.name }}<input class="ui-field-control" [value]="'入力を保持: ' + row.name"></label></ng-template>
      </ui-data-table>
      <p data-testid="selected">選択: {{ selected().join(',') }}</p>
      <p data-testid="row-action">操作: {{ lastAction() }}</p>
      <p data-testid="requests">状態変更: {{ requests() }}</p>
      <button uiAction (click)="savedState.set(state())">表示状態を保存</button>
      <button uiAction [disabled]="!savedState()" (click)="restore()">表示状態を復元</button>
      <button uiAction (click)="state.set(initialState)">検索とソートを初期化</button>
    </section>
    <input-catalog />
    <date-catalog />
    <grid-catalog />
    <overlay-catalog />
  </main>
 `,
 styles: `
  .catalog { padding: var(--ui-space-page); max-inline-size: var(--ui-size-content); margin-inline: auto; color: var(--ui-color-text); background: var(--ui-color-surface); font-family: var(--ui-font-body); font-size: var(--ui-text-body); line-height: var(--ui-leading-body); overflow-wrap: anywhere; }
  h1 { font-size: var(--ui-text-heading); line-height: var(--ui-leading-heading); }
  .catalog-options { display: flex; flex-wrap: wrap; gap: var(--ui-space-field); margin-block: var(--ui-space-section); }
  .catalog-options > label { display: grid; gap: var(--ui-space-control-gap); max-inline-size: 100%; }
  .catalog-options input[type="checkbox"] { inline-size: var(--ui-size-icon); block-size: var(--ui-size-icon); }
 `,
})
export class CatalogFixture {
 readonly profiles=uiProfiles.profiles;
 readonly profile=signal<string>(uiProfiles.defaultProfile);
 readonly rtl=signal(false); readonly sortable=signal(true); readonly multipleSort=signal(false); readonly filters=signal(true);
 readonly searchEnabled=signal(true); readonly paginationEnabled=signal(true); readonly sticky=signal(true); readonly autoWidth=signal(true);
 readonly autoFit=signal<'content'|'available'>('available'); readonly selectionMode=signal<'none'|'single'|'multiple'>('multiple');
 readonly server=signal(false); readonly status=signal<TableDataState['kind']>('ready'); readonly selected=signal<readonly TableKey[]>([]);
 readonly expanded=signal<readonly TableKey[]>([]); readonly lastAction=signal(''); readonly requests=signal(0); readonly increment=(n:number)=>n+1;
 readonly initialState=createTableState(2); readonly state=signal<TableState>(this.initialState); readonly savedState=signal<TableState|null>(null);
 readonly records: RecordRow[]=[
  {id:1,name:'備品購入',amount:3000,date:'2026-10-01',status:'下書き'}, {id:2,name:'出張旅費',amount:null,date:'2026-10-02',status:'確認中'},
  {id:3,name:'会議室予約',amount:1000,date:'2026-09-28',status:'承認済み'}, {id:4,name:'備品追加',amount:2000,date:'2026-10-03',status:'下書き'},
  {id:5,name:'資料作成',amount:1000,date:'2026-09-29',status:'下書き'}, {id:6,name:'交通費精算',amount:800,date:'2026-10-04',status:'承認済み'},
 ];
 readonly widthCase=signal('normal');
 readonly baseColumns: TableColumn<RecordRow>[]=[
  {id:'name',field:'name',header:'申請名',width:220,minWidth:160,maxWidth:500},
  {id:'amount',field:'amount',header:'金額',type:'number',width:180},
  {id:'date',field:'date',header:'申請日',type:'date',width:220},
  {id:'status',field:'status',header:'状態',width:180,options:[{value:'下書き',label:'下書き'},{value:'確認中',label:'確認中'},{value:'承認済み',label:'承認済み'}]},
 ];
 readonly columns=computed(()=>this.widthCase()==='maximum'?[{...this.baseColumns[0]!,width:undefined,minWidth:80,maxWidth:100}]:this.widthCase()==='minimum'?this.baseColumns.map(column=>column.id==='name'?{...column,width:undefined,minWidth:400,maxWidth:450}:column):this.baseColumns);
 readonly actions: TableRowAction<RecordRow>[]=[{id:'inspect',label:'確認する',disabled:row=>row.status==='承認済み'}];
 readonly selectable=(row:RecordRow)=>row.status!=='承認済み';
 readonly visibleRecords=computed(()=>this.server()?this.records.slice(0,2):this.records);
 readonly dataState=computed<TableDataState>(()=>{const kind=this.status(); return kind==='ready'?{kind}:{kind,message:{loading:'一覧を取得しています。',updating:'一覧を更新しています。前回の結果を表示します。',error:'一覧の取得に失敗しました。入力と表示設定は保持されています。',partial:'金額が未取得の行があります。確認操作はアプリの判断に従ってください。'}[kind]};});
 value(event:Event):string{return (event.target as HTMLInputElement).value;}
 checked(event:Event):boolean{return (event.target as HTMLInputElement).checked;}
 changeFit(event:Event):void{this.autoFit.set(this.value(event)==='content'?'content':'available');}
 changeSelection(event:Event):void{const v=this.value(event);if(v==='none'||v==='single'||v==='multiple')this.selectionMode.set(v);}
 changeStatus(event:Event):void{const v=this.value(event);if(v==='ready'||v==='loading'||v==='updating'||v==='error'||v==='partial')this.status.set(v);}
 restore():void{const state=this.savedState();if(state)this.state.set(state);}
}
