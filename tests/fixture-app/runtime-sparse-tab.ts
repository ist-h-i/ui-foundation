import {NgTemplateOutlet} from '@angular/common';
import {Component,computed,input,signal,viewChild} from '@angular/core';
import {VirtualList,VirtualItem,VirtualDataTable,type TableColumn} from '../../.ui/generated/angular';

export interface SparseTabRow{id:number;name:string;amount:number;mode:'controls'|'none'|'hidden'|'disabled'|'negative'|'radio'|'checkedradio';}
/** The consumer owns drafts by row key; the collection owns virtual rendering. */
@Component({selector:'runtime-sparse-tab',standalone:true,imports:[NgTemplateOutlet,VirtualList,VirtualItem,VirtualDataTable],template:`
 <button type="button" data-sparse-boundary="before">一覧の前</button>
 <ng-template #controls let-row><span class="sparse-tab-controls">
  @switch(row.mode){
   @case('controls'){
    <input class="ui-field-control" data-sparse-control="main" [attr.aria-label]="'入力 '+row.id" [value]="draft(row)" (input)="save(row,$event)" [disabled]="disabled()">
    @if(mixed()){
     <input hidden data-sparse-control="hidden" aria-label="非表示入力"><button disabled data-sparse-control="disabled">無効操作</button><input tabindex="-1" data-sparse-control="negative" aria-label="Tab対象外">
     <select class="ui-field-control" data-sparse-control="select" [attr.aria-label]="'選択 '+row.id" [disabled]="disabled()"><option value="one">候補1</option><option value="two">候補2</option></select>
     <a href="#runtime-anchor" data-sparse-control="link">詳細 {{row.id}}</a>
    }
   }
   @case('radio'){<input type="radio" [name]="radioName()" [value]="row.id" [checked]="radioChecked(row)" (change)="radioChange(row,$event)" data-sparse-control="radio" [attr.aria-label]="'選択肢 '+row.id" [disabled]="disabled()">}
   @case('checkedradio'){<input type="radio" [name]="radioName()" [value]="row.id" [checked]="radioChecked(row)" (change)="radioChange(row,$event)" data-sparse-control="radio" [attr.aria-label]="'選択済み '+row.id" [disabled]="disabled()">}
   @case('hidden'){<input hidden data-sparse-control="hidden" [attr.aria-label]="'非表示 '+row.id">}
   @case('disabled'){<button disabled data-sparse-control="disabled">無効操作 {{row.id}}</button>}
   @case('negative'){<input tabindex="-1" data-sparse-control="negative" [attr.aria-label]="'Tab対象外 '+row.id">}
   @default{<span>{{row.name}}</span>}
  }
 </span></ng-template>
 @if(kind()==='list'){
  <ui-virtual-list [items]="rows()" [radioGroups]="radioGroups" keyField="id" labelField="name" label="Tab対象が疎な一覧" [height]="360" [itemHeight]="itemHeight()" [overscan]="overscan()">
   <ng-template uiVirtualItem [uiVirtualItemOf]="rows()" let-row><ng-container [ngTemplateOutlet]="controls" [ngTemplateOutletContext]="{$implicit:row}" /></ng-template>
  </ui-virtual-list>
 }@else{
  <ui-virtual-data-table caption="Tab対象が疎な表" tableId="sparse-tab-table" [rows]="rows()" [radioGroups]="radioGroups" [columns]="columns" keyField="id" [height]="360" [itemHeight]="itemHeight()" [overscan]="overscan()" [sortable]="false" [disabled]="disabled()" [cellTemplates]="{name:controls}" />
 }
 <button type="button" data-sparse-boundary="after">一覧の後</button>
 `,styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}.sparse-tab-controls{display:flex;gap:var(--ui-space-control-gap);min-inline-size:0;}.sparse-tab-controls>.ui-field-control{flex:1;min-inline-size:0;max-inline-size:100%;}.sparse-tab-controls>[data-sparse-control=negative]{max-inline-size:var(--ui-size-icon);min-inline-size:0;}`})
export class RuntimeSparseTab{
 readonly kind=input<'list'|'table'>('list');
 readonly rows=input<readonly SparseTabRow[]>([]);
 readonly mixed=input(false);
 readonly radioName=input('sparse-virtual-radio');
 readonly overscan=input(2);
 readonly disabled=input(false);
 readonly itemHeight=input<number|null>(null);
 private readonly radioSelection=signal<number|undefined>(undefined);
 readonly radioGroups=computed(()=>{const members=this.rows().filter(row=>row.mode==='radio'||row.mode==='checkedradio');const selected=this.radioSelection()??members.find(row=>row.mode==='checkedradio')?.id;return members.length?[{name:this.radioName(),value:selected===undefined?null:String(selected),members:members.map(row=>({key:row.id,value:String(row.id),disabled:this.disabled()}))}]:[];});
 radioChecked(row:SparseTabRow):boolean{return this.radioSelection()===undefined?row.mode==='checkedradio':this.radioSelection()===row.id;}
 radioChange(row:SparseTabRow,event:Event):void{if((event.target as HTMLInputElement).checked)this.radioSelection.set(row.id);}
 private readonly drafts=signal<ReadonlyMap<number,string>>(new Map());
 readonly columns:readonly TableColumn<SparseTabRow>[]=[{id:'name',field:'name',header:'申請',minWidth:100},{id:'amount',field:'amount',header:'金額',minWidth:80}];
 readonly list=viewChild(VirtualList);
 readonly table=viewChild(VirtualDataTable);
 draft(row:SparseTabRow):string{return this.drafts().get(row.id)??row.name;}
 save(row:SparseTabRow,event:Event):void{const value=(event.target as HTMLInputElement).value;this.drafts.update(prior=>new Map(prior).set(row.id,value));}
}
