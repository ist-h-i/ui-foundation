import {Component,input} from '@angular/core';
import {DataTableView,TableTemplate,type TableColumn,type TableEditableColumn} from '../../.ui/generated/angular';

interface WarningRow{id:number;name:string;amount:number;}

/** All four utility <col> branches have separate DOM cells, including the two projected branches. */
@Component({selector:'runtime-warning-utility-table',standalone:true,imports:[DataTableView,TableTemplate],template:`
 <ui-data-table caption="補助列を実測する表" tableId="warning-utility" [rows]="rows" [columns]="columns" keyField="id" [pagination]="false" [autoWidth]="false" [columnControls]="false" [resizableColumns]="false" [sortable]="false" [selectionMode]="enabled()?'multiple':'none'" [rowActions]="enabled()?actions:[]" [editMode]="enabled()?'row':'none'" [aggregates]="[{column:'amount',kind:'sum'}]">
  @if(enabled()){<ng-template uiTableDetail [uiTableTemplateOf]="rows" let-row><p>詳細 {{row.name}}</p></ng-template>}
 </ui-data-table>`})
export class RuntimeWarningUtilityTable{
 readonly enabled=input(true);
 readonly rows:readonly WarningRow[]=[{id:0,name:'最初',amount:1},{id:1,name:'最後',amount:2}];
 readonly columns:readonly TableColumn<WarningRow>[]=[{id:'name',field:'name',header:'氏名',width:160,minWidth:80},{id:'amount',field:'amount',header:'金額',type:'number',width:100,minWidth:80}];
 readonly actions=[{id:'confirm',label:'確認'}];
}

/** A projected descendant can grow independently of Angular inputs and the owning table's render effect. */
@Component({selector:'runtime-warning-async-table',standalone:true,imports:[DataTableView,TableTemplate],template:`
 <ui-data-table caption="遅延する固定行" tableId="warning-async" [rows]="rows" [columns]="columns" keyField="id" [pagination]="false" [columnControls]="false" [resizableColumns]="false" [sortable]="false" [stickyHeader]="stickyHeader()" [stickyFooter]="stickyFooter()" [fixedStartKeys]="[0,1]" [fixedEndKeys]="[18,19]" [aggregates]="[{column:'amount',kind:'sum'}]">
  <ng-template uiTableCell="name" [uiTableTemplateOf]="rows" let-row><div [attr.data-warning-grow]="row.id"><input class="ui-field-control" [attr.aria-label]="'遅延行の入力 '+row.id" [value]="row.name"></div></ng-template>
 </ui-data-table>`})
export class RuntimeWarningAsyncTable{
 readonly stickyHeader=input(true);readonly stickyFooter=input(true);
 readonly rows:readonly WarningRow[]=Array.from({length:20},(_,id)=>({id,name:'保持 '+id,amount:id}));
 readonly columns:readonly TableColumn<WarningRow>[]=[{id:'name',field:'name',header:'保持する入力',minWidth:180,maxWidth:260},{id:'amount',field:'amount',header:'金額',type:'number',width:100}];
}

/** Real table-owned editor sessions; growth originates in a different projected column. */
@Component({selector:'runtime-warning-managed-table',standalone:true,imports:[DataTableView,TableTemplate],template:`
 <ui-data-table caption="管理された編集中の固定行" tableId="warning-managed" [rows]="rows" [columns]="columns" keyField="id" [pagination]="false" [columnControls]="false" [resizableColumns]="false" [sortable]="false" [editMode]="mode()" [stickyHeader]="stickyHeader()" [stickyFooter]="stickyFooter()" [fixedStartKeys]="[0,1]" [fixedEndKeys]="[18,19]" [aggregates]="[{column:'amount',kind:'sum'}]">
  <ng-template uiTableCell="amount" [uiTableTemplateOf]="rows" let-row><div [attr.data-warning-grow]="row.id">{{row.amount}}</div></ng-template>
 </ui-data-table>`})
export class RuntimeWarningManagedTable{
 readonly mode=input<'cell'|'row'>('cell');readonly stickyHeader=input(true);readonly stickyFooter=input(true);
 readonly rows:readonly WarningRow[]=Array.from({length:20},(_,id)=>({id,name:'保持 '+id,amount:id}));
 readonly columns:readonly TableEditableColumn<WarningRow>[]=[{id:'name',field:'name',header:'氏名',minWidth:180,maxWidth:260},{id:'amount',field:'amount',header:'金額',type:'number',width:100,editable:false}];
}
