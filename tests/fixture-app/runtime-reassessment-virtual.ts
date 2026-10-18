import {Component,input,signal,viewChild} from '@angular/core';
import {VirtualList,VirtualItem,VirtualDataTable,createTableState,type TableColumn,type TableState} from '../../.ui/generated/angular';
interface ReassessmentRow{id:number;name:string;amount:number;}
/** Test-owned drafts intentionally survive CDK view recycling; the library owns scrolling. */
@Component({selector:'runtime-reassessment-virtual',standalone:true,imports:[VirtualList,VirtualItem,VirtualDataTable],template:`
 @if(kind()==='list'){
  <ui-virtual-list [items]="rows()" keyField="id" labelField="name" label="再検証する編集一覧" [height]="height()" [itemHeight]="itemHeight()" [overscan]="overscan()" (rangeChange)="range.set($event)" (positionChange)="position.set($event)">
   @if(editors()){<ng-template uiVirtualItem [uiVirtualItemOf]="rows()" let-row><label class="reassessment-editor"><span>{{row.name}}</span><input class="ui-field-control" [attr.aria-label]="'再検証入力 '+row.id" [value]="drafts().get(row.id)??'元の入力 '+row.id" (input)="save(row.id,$event)"></label></ng-template>}
  </ui-virtual-list>
 }@else{
  <ng-template #editor let-row><input class="ui-field-control" [attr.aria-label]="'再検証入力 '+row.id" [value]="drafts().get(row.id)??'元の入力 '+row.id" (input)="save(row.id,$event)"></ng-template>
  <ui-virtual-data-table caption="再検証する仮想表" tableId="reassessment-table" [rows]="rows()" [columns]="columns" keyField="id" [state]="state()" [height]="height()" [itemHeight]="itemHeight()" [overscan]="overscan()" [cellTemplates]="editors()?{name:editor}:{}" [sortable]="false" (rangeChange)="range.set($event)" (positionChange)="position.set($event)" />
 }
 `,styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}.reassessment-editor{display:flex;align-items:center;gap:var(--ui-space-control-gap);min-inline-size:0;}.reassessment-editor>span{flex:1;min-inline-size:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.reassessment-editor>input{flex:1;min-inline-size:0;max-inline-size:100%;}ui-virtual-data-table input{min-inline-size:0;max-inline-size:100%;box-sizing:border-box;}`})
export class RuntimeReassessmentVirtual{
 readonly kind=input<'list'|'table'>('list');
 /** Projected controls supply an explicit fixed row height; default rows test native text cells. */
 readonly editors=input(false);
 readonly rows=input<readonly ReassessmentRow[]>([]);
 readonly height=input<number|null>(null);
 readonly itemHeight=input<number|null>(null);
 readonly overscan=input(3);
 readonly state=input<TableState>(createTableState());
 readonly columns:readonly TableColumn<ReassessmentRow>[]=[{id:'name',field:'name',header:'編集する申請',minWidth:100,maxWidth:220},{id:'amount',field:'amount',header:'金額',type:'number',minWidth:80,maxWidth:180}];
 readonly range=signal({start:0,end:0});
 readonly position=signal({offset:0,index:0});
 readonly drafts=signal<ReadonlyMap<number,string>>(new Map());
 readonly list=viewChild(VirtualList);
 readonly table=viewChild(VirtualDataTable);
 save(id:number,event:Event):void{this.drafts.update(old=>new Map(old).set(id,(event.target as HTMLInputElement).value));}
}
