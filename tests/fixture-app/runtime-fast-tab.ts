import {Component,input,viewChild} from '@angular/core';
import {VirtualList,VirtualItem,VirtualDataTable,type TableColumn} from '../../.ui/generated/angular';

interface FastTabRow{id:number;name:string;amount:number;}
/** Local consumer controls; the library alone owns virtual scrolling and Tab handoff. */
@Component({selector:'runtime-fast-tab',standalone:true,imports:[VirtualList,VirtualItem,VirtualDataTable],template:`
 <button type="button" data-fast-boundary="before">一覧の前</button>
 @if(kind()==='list'){
  <ui-virtual-list [items]="rows()" keyField="id" labelField="name" label="連続キーの編集一覧" [height]="360" [itemHeight]="itemHeight()" [overscan]="overscan()">
   <ng-template uiVirtualItem [uiVirtualItemOf]="rows()" let-row><span class="fast-tab-controls">
    <input class="ui-field-control" data-fast-control="main" [attr.aria-label]="'入力 '+row.id" [value]="row.name" [disabled]="disabled()">
    @if(nested()&&row.id===0){
     <ui-virtual-list [items]="nestedRows" keyField="id" labelField="name" label="内部の編集一覧" [height]="120" [itemHeight]="40" [overscan]="2">
      <ng-template uiVirtualItem [uiVirtualItemOf]="nestedRows" let-inner><input [attr.data-fast-nested]="inner.id" [attr.aria-label]="'内部入力 '+inner.id" [value]="inner.name"></ng-template>
     </ui-virtual-list>
    }
    @if(mixed()){
     <input data-fast-control="hidden" hidden aria-label="非表示入力"><button data-fast-control="disabled" disabled>無効操作</button><input data-fast-control="negative" tabindex="-1" aria-label="Tab対象外">
     <select class="ui-field-control" data-fast-control="tail" [attr.aria-label]="'選択 '+row.id" [disabled]="disabled()"><option value="one">候補1</option><option value="two">候補2</option></select>
    }
   </span></ng-template>
  </ui-virtual-list>
 }@else{
  <ng-template #editor let-row><span class="fast-tab-controls">
   <input class="ui-field-control" data-fast-control="main" [attr.aria-label]="'入力 '+row.id" [value]="row.name" [disabled]="disabled()">
   @if(nested()&&row.id===0){
    <ui-virtual-list [items]="nestedRows" keyField="id" labelField="name" label="内部の編集一覧" [height]="120" [itemHeight]="40" [overscan]="2">
     <ng-template uiVirtualItem [uiVirtualItemOf]="nestedRows" let-inner><input [attr.data-fast-nested]="inner.id" [attr.aria-label]="'内部入力 '+inner.id" [value]="inner.name"></ng-template>
    </ui-virtual-list>
   }
   @if(mixed()){
    <input data-fast-control="hidden" hidden aria-label="非表示入力"><button data-fast-control="disabled" disabled>無効操作</button><input data-fast-control="negative" tabindex="-1" aria-label="Tab対象外">
    <select class="ui-field-control" data-fast-control="tail" [attr.aria-label]="'選択 '+row.id" [disabled]="disabled()"><option value="one">候補1</option><option value="two">候補2</option></select>
   }
  </span></ng-template>
  <ui-virtual-data-table caption="連続キーの編集表" tableId="fast-tab-table" [rows]="rows()" [columns]="columns" keyField="id" [height]="360" [itemHeight]="itemHeight()" [overscan]="overscan()" [sortable]="false" [disabled]="disabled()" [cellTemplates]="{name:editor}" />
 }
 <button type="button" data-fast-boundary="after">一覧の後</button>
 `,styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}.fast-tab-controls{display:flex;gap:var(--ui-space-control-gap);min-inline-size:0;}.fast-tab-controls>.ui-field-control{flex:1;min-inline-size:0;max-inline-size:100%;}.fast-tab-controls>[data-fast-control=negative]{max-inline-size:var(--ui-size-icon);min-inline-size:0;}`})
export class RuntimeFastTab{
 readonly kind=input<'list'|'table'>('list');
 readonly rows=input<readonly FastTabRow[]>([]);
 readonly mixed=input(true);
 readonly nested=input(false);
 readonly nestedRows=[{id:0,name:"内部0"},{id:1,name:"内部1"},{id:2,name:"内部2"}];
 readonly overscan=input(2);
 readonly disabled=input(false);
 readonly itemHeight=input<number|null>(null);
 readonly columns:readonly TableColumn<FastTabRow>[]=[{id:'name',field:'name',header:'申請',minWidth:100},{id:'amount',field:'amount',header:'金額',minWidth:80}];
 readonly list=viewChild(VirtualList);
 readonly table=viewChild(VirtualDataTable);
}
