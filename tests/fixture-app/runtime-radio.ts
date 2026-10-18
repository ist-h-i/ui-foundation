import {NgTemplateOutlet} from '@angular/common';
import {Component,computed,ElementRef,input,signal,viewChild} from '@angular/core';
import {VirtualList,VirtualItem,VirtualDataTable,DataTableView,TableTemplate,createTableState} from '../../.ui/generated/angular';

export interface RuntimeRadioRow{id:number;kind:'radio'|'text'|'empty';checked?:boolean;hidden?:boolean;disabled?:boolean;group?:string;form?:string;}
/** The controlled variant owns selection by the native (form, name) group key. */
@Component({selector:'runtime-radio',standalone:true,imports:[NgTemplateOutlet,VirtualList,VirtualItem,VirtualDataTable,DataTableView,TableTemplate],template:`
 <form #ownerForm [id]="owner()" (reset)="resetSelection()">
  <button type="button" data-radio-boundary="before">前</button>
  <ng-template #content let-row><span [attr.data-radio-row]="row.id">
   @if(row.kind==='radio'){
    @if(sameRowPair()&&row.id===0){<input type="radio" [name]="row.group??group()" [attr.form]="row.form??owner()" [value]="row.id+10000" [checked]="extraSelected(row)" [attr.data-radio-control]="row.id+10000" aria-label="同じ行の前方選択" (input)="extraObserve('input',row,$event)" (change)="extraObserve('change',row,$event)">}
    <input type="radio" [name]="row.group??group()" [attr.form]="row.form??owner()" [value]="row.id" [checked]="selected(row)" [hidden]="!!row.hidden" [disabled]="!!row.disabled" [attr.data-radio-control]="row.id" [attr.aria-label]="'選択 '+row.id" (input)="observe('input',row,$event)" (change)="observe('change',row,$event)">
   }@else if(row.kind==='text'){
    <input class="ui-field-control" [attr.data-radio-control]="row.id" [attr.aria-label]="'入力 '+row.id">
   }@else{<span>行 {{row.id}}</span>}
  </span></ng-template>
  @if(wrapper()){
   <ui-data-table [rows]="rows()" [columns]="tableColumns" [tableId]="owner()+'-table'" caption="行を跨ぐ単一選択" keyField="id" [virtualize]="true" [pagination]="false" [state]="tableState" [virtualHeight]="360" [virtualRowHeight]="220" [virtualOverscan]="0" [sortable]="false" [selectionMode]="wrapperProjection()?'none':'single'" [selectedKeys]="tableSelection" (selectedKeysChange)="chooseTable($event)" [rowSelectable]="tableSelectable" [virtualRadioGroups]="wrapperProjection()?radioGroups:emptyGroups">
    @if(wrapperProjection()){<ng-template uiTableCell="id" [uiTableTemplateOf]="rows()" let-row><ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{$implicit:row}" /></ng-template>}
   </ui-data-table>
  }@else if(table()){
   <ui-virtual-data-table [rows]="rows()" [columns]="tableColumns" [tableId]="owner()+'-table'" caption="行を跨ぐ単一選択" keyField="id" [height]="360" [itemHeight]="220" [overscan]="0" [sortable]="false" selectionMode="single" [selectedKeys]="tableSelection" (selectedKeysChange)="chooseTable($event)" [rowSelectable]="tableSelectable" />
  }@else if(virtual()){
   <ui-virtual-list [items]="rows()" [radioGroups]="registered()?radioGroups:emptyGroups" keyField="id" labelField="id" label="行を跨ぐ選択" [height]="360" [itemHeight]="220" [overscan]="0">
    <ng-template uiVirtualItem [uiVirtualItemOf]="rows()" let-row><ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{$implicit:row}" /></ng-template>
   </ui-virtual-list>
  }@else{
   <div tabindex="0" data-radio-native-viewport>
    @for(row of rows();track row.id){<ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{$implicit:row}" />}
   </div>
  }
  <button type="button" data-radio-boundary="after">後</button>
  <button type="reset" data-radio-reset>初期選択へ戻す</button>
 </form>
 <form [id]="otherOwner()"><input type="radio" [name]="group()" [checked]="otherChecked()" tabindex="-1" data-radio-other aria-label="別formの選択済み"></form>
 `,styles:':host{display:block;min-inline-size:0;}'})
export class RuntimeRadio{
 readonly rows=input<readonly RuntimeRadioRow[]>([]);
 readonly virtual=input(true);
 readonly registered=input(true);
 readonly table=input(false);
 readonly wrapper=input(false);
 readonly wrapperProjection=input(false);
 readonly wrapperComponent=viewChild(DataTableView);
 readonly tableState=createTableState(1000);
 readonly emptyGroups=[];
 tableApi(){return this.wrapper()?this.wrapperComponent():this.tableComponent();}
 readonly sameRowPair=input(false);
 readonly tableComponent=viewChild(VirtualDataTable);
 readonly tableColumns=[{id:'id',field:'id' as const,header:'番号'}];
 readonly tableSelectable=(row:RuntimeRadioRow)=>row.kind==='radio'&&!row.disabled&&!row.hidden;
 private readonly tableKeys=signal<readonly (number|string)[]|null>(null);
 readonly tableSelection=computed(()=>this.tableKeys()??this.rows().filter(row=>row.checked).map(row=>row.id));
 readonly tableRequests:(readonly (number|string)[])[]=[];
 chooseTable(keys:readonly (number|string)[]):void{this.tableRequests.push([...keys]);this.tableKeys.set(keys);}
 readonly acceptChanges=input(true);
 readonly group=input('cross-row-group');
 readonly owner=input('radio-owner');
 readonly otherOwner=input('radio-other-owner');
 readonly otherChecked=input(true);
 readonly list=viewChild(VirtualList);
 readonly ownerForm=viewChild<ElementRef<HTMLFormElement>>('ownerForm');
 private readonly selection=signal<ReadonlyMap<string,number>>(new Map());
 readonly events:{type:string;id:number;checked:boolean;trusted:boolean}[]=[];
 private key(row:RuntimeRadioRow):string{return (row.form??this.owner())+'\0'+(row.group??this.group());}
 readonly radioGroups=computed(()=>{
  const groups=new Map<string,{name:string;form:string;value:string|null;members:{key:number;value:string;disabled:boolean;hidden:boolean}[]}>();
  for(const row of this.rows())if(row.kind==='radio'){
   const key=this.key(row);let group=groups.get(key);if(!group){group={name:row.group??this.group(),form:row.form??this.owner(),value:null,members:[]};groups.set(key,group);}
   group.members.push({key:row.id,value:String(row.id),disabled:!!row.disabled,hidden:!!row.hidden});if(this.selected(row))group.value=String(row.id);
   if(this.sameRowPair()&&row.id===0){group.members.push({key:row.id,value:String(row.id+10000),disabled:false,hidden:false});if(this.extraSelected(row))group.value=String(row.id+10000);}
  }return [...groups.values()];
 });
 extraSelected(row:RuntimeRadioRow):boolean{return this.selection().get(this.key(row))===row.id+10000;}
 extraObserve(type:string,row:RuntimeRadioRow,event:Event):void{this.observe(type,{...row,id:row.id+10000},event);}
 selected(row:RuntimeRadioRow):boolean{const selected=this.selection().get(this.key(row));return selected===undefined?!!row.checked:selected===row.id;}
 observe(type:string,row:RuntimeRadioRow,event:Event):void{const checked=(event.target as HTMLInputElement).checked;this.events.push({type,id:row.id,checked,trusted:event.isTrusted});if(type==='change'&&checked&&this.acceptChanges())this.selection.update(prior=>new Map(prior).set(this.key(row),row.id));}
 resetSelection():void{this.selection.set(new Map());}
}
