import {ChangeDetectionStrategy,Component,computed,signal} from '@angular/core';
import {ActionControl,GridList,GridItem,Icon,provideUiIcons,type TableKey} from '../../.ui/generated/angular/index';
import {LucideFileText} from '@lucide/angular';
interface Item{id:number;name:string;state:string}
@Component({selector:'grid-catalog',standalone:true,imports:[ActionControl,GridList,GridItem,Icon],providers:[provideUiIcons(LucideFileText)],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<section aria-label="グリッドとアイコンの検証"><h2>申請をカード一覧で確認する</h2>
  <label for="grid-columns">グリッド列数</label><select id="grid-columns" class="ui-field-control" [value]="columns()??'auto'" (change)="column($event)"><option value="auto">領域に合わせる</option><option value="1">1</option><option value="3">3</option></select>
  <label for="grid-mode">グリッド選択</label><select id="grid-mode" class="ui-field-control" [value]="mode()" (change)="selection($event)"><option value="none">なし</option><option value="single">単一</option><option value="multiple">複数</option></select>
  <label><input type="checkbox" [checked]="compact()" (change)="compact.set(checked($event))">狭い間隔</label><label><input type="checkbox" [checked]="empty()" (change)="empty.set(checked($event))">空一覧</label><label><input type="checkbox" [checked]="busy()" (change)="busy.set(checked($event))">一覧の処理中</label>
  <ui-grid-list label="申請カード" controlId="request-grid" [items]="visible()" keyField="id" labelField="name" [columns]="columns()" [gap]="compact()?'compact':'normal'" [selectionMode]="mode()" [selectedKeys]="selected()" (selectedKeysChange)="selected.set($event)" [itemSelectable]="eligible" [busy]="busy()">
   <ng-template uiGridItem [uiGridItemOf]="items" let-item let-selected="selected"><h3><ui-icon name="file-text" />{{item.name}}</h3><p>{{item.state}}</p><p>{{selected?'選択中':''}}</p><label>追記: {{item.name}}<input class="ui-field-control" value="保持する入力"></label><button uiAction (click)="action.set(item.id)">申請を開く</button></ng-template>
  </ui-grid-list>
  <p data-testid="grid-selection">選択: {{selected().join(',')}}</p><p data-testid="grid-action">申請: {{action()}}</p>
  <div class="icons"><ui-icon name="circle-check" [decorative]="false" label="確認済み" severity="success" /><ui-icon name="circle-alert" [decorative]="false" label="確認が必要" severity="warning" size="large" /><ui-icon name="search" size="small" /><button uiAction><ui-icon name="plus" />申請を追加</button></div>
 </section>`,styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}h2{font-size:var(--ui-text-heading);}h3{font-size:var(--ui-text-body);display:flex;align-items:center;gap:var(--ui-space-control-gap);}.icons{display:flex;align-items:center;flex-wrap:wrap;gap:var(--ui-space-field);}`})
export class GridCatalog{
 readonly columns=signal<number|null>(null);readonly compact=signal(false);readonly empty=signal(false);readonly busy=signal(false);readonly mode=signal<'none'|'single'|'multiple'>('multiple');readonly selected=signal<readonly TableKey[]>([]);readonly action=signal<number|null>(null);
 readonly items:Item[]=[{id:1,name:'備品購入',state:'下書き'},{id:2,name:'出張旅費',state:'確認中'},{id:3,name:'確認済みの申請',state:'承認済み'}];readonly eligible=(item:Item)=>item.id!==3;readonly visible=computed(()=>this.empty()?[]:this.items);
 checked(event:Event):boolean{return (event.target as HTMLInputElement).checked;}
 column(event:Event):void{const value=(event.target as HTMLSelectElement).value;this.columns.set(value==='auto'?null:Number(value));}
 selection(event:Event):void{const value=(event.target as HTMLSelectElement).value;if(value==='none'||value==='single'||value==='multiple')this.mode.set(value);}
}
