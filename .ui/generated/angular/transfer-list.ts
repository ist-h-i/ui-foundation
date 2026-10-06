import {NgTemplateOutlet} from '@angular/common';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,contentChild,DestroyRef,Directive,effect,ElementRef,forwardRef,inject,input,output,signal,TemplateRef,untracked,viewChild,viewChildren} from '@angular/core';
import {NG_VALIDATORS,NG_VALUE_ACCESSOR,type AbstractControl,type ValidationErrors,type Validator} from '@angular/forms';
import {Dir} from '@angular/cdk/bidi';
import {CdkDrag,CdkDragHandle,CdkDropList,type CdkDragDrop,type CdkDragStart} from '@angular/cdk/drag-drop';
import {ActionControl} from './action-control';
import {ValueControl} from './value-control';
import {OverlayRegistry} from './overlay';
import {installCollectionFocus} from './collection-runtime';
import type {CollectionKey} from './collection-model';
import {reorderTransfer,transferBatch,transferConfigurationProblem,transferSelectionProblem,transferStructureProblem,type TransferChange,type TransferOptions,type TransferReason,type TransferReorder,type TransferSide,type TransferValue} from './transfer-model';

export interface TransferItemContext<T>{$implicit:T;key:CollectionKey;label:string;side:TransferSide;index:number;pageIndex:number;count:number;checked:boolean;selected:boolean;}
@Directive({selector:'ng-template[uiTransferItem]',standalone:true})
export class TransferItem<T extends object>{
 readonly of=input.required<readonly T[]>({alias:'uiTransferItemOf'});
 readonly template=inject<TemplateRef<TransferItemContext<T>>>(TemplateRef);
 static ngTemplateContextGuard<T extends object>(_directive:TransferItem<T>,_context:unknown):_context is TransferItemContext<T>{return true;}
}
interface TransferZone{side:TransferSide;keys:readonly CollectionKey[];}
interface TransferDrag<T>{item:T;key:CollectionKey;side:TransferSide;}
interface TransferSnapshot<T>{items:readonly T[];value:TransferValue;keys:readonly CollectionKey[];rows:readonly {item:T;key:CollectionKey;label:string;disabled:boolean;hidden:boolean}[];source:readonly CollectionKey[];target:readonly CollectionKey[];maximum:number|null;canTransfer:((change:TransferChange<T>)=>boolean)|null;canReorder:((change:TransferReorder<T>)=>boolean)|null;reorderable:boolean;direction:'ltr'|'rtl';}
interface KeyboardTransfer<T>{snapshot:TransferSnapshot<T>;key:CollectionKey;from:TransferSide;to:TransferSide;targetKey:CollectionKey|null;origin:HTMLElement;}
interface PointerTransfer<T>{snapshot:TransferSnapshot<T>;drag:CdkDrag<TransferDrag<T>>;key:CollectionKey;side:TransferSide;cancelled:boolean;moved:boolean;}

/** Native checkbox scopes edit an ordered CVA collection; application policies own movement boundaries. */
@Component({selector:'ui-transfer-list,ui-pick-list',standalone:true,imports:[NgTemplateOutlet,ActionControl,CdkDrag,CdkDragHandle,CdkDropList,Dir],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TransferList),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>TransferList),multi:true}],
 host:{tabindex:'-1','[attr.aria-label]':'label()','(focusout)':'leave($event)'},
 template:`
 <div [id]="controlId()" role="group" [attr.aria-labelledby]="controlId()+'-label'" [attr.aria-describedby]="described()" [attr.aria-invalid]="!!valueProblem()||!!error()" [attr.aria-busy]="busy()" [dir]="direction()">
  <span class="ui-transfer-label" [id]="controlId()+'-label'">{{label()}}@if(required()){<span>（必須）</span>}</span>
  <p [id]="controlId()+'-instructions'">{{keyboard()?'左右キーで移動先、上下キーで選択済みの位置を選び、Enterで確定、Escapeで取消。':'チェックした表示中の項目を一括移動できます。移動ハンドル、追加・削除、上下ボタンはキーボードでも操作できます。'}}</p>
  @if(configurationProblem()){<p role="alert">{{configurationProblem()}}</p>}@else{
  <div class="ui-transfer-panes">
   <fieldset><legend>{{sourceLabel()}} · {{source().length}}件表示</legend>
    @if(searchable()){<label class="ui-transfer-search">候補を検索<input data-collection-control class="ui-field-control" type="search" [value]="sourceQuery()" [disabled]="blocked()" (input)="search('source',$event)"></label>}
    <label class="ui-transfer-all"><input data-collection-control type="checkbox" [checked]="allChecked('source')" [indeterminate]="someChecked('source')" [disabled]="editsBlocked()||!eligible('source').length" (change)="checkAll('source',$event)">表示中の有効な候補をすべて選択</label>
    <button data-collection-control uiAction [disabled]="editsBlocked()||!scope('source').length||!!keyboard()" (click)="moveScope('source')">一括追加</button>
    <ul cdkDropList #sourceList="cdkDropList" [id]="controlId()+'-source'" [cdkDropListData]="sourceZone()" [cdkDropListConnectedTo]="[targetList]" [cdkDropListDisabled]="editsBlocked()||!!keyboard()" [cdkDropListSortingDisabled]="true" [cdkDropListEnterPredicate]="enterPredicate" (cdkDropListDropped)="drop($event)">
    @for(item of source();track key(item);let index=$index){
     <li cdkDrag [cdkDragData]="dragData(item,'source')" [cdkDragDisabled]="editsBlocked()||itemDisabled(item)||!!keyboard()" [cdkDragPreviewContainer]="'parent'" [cdkDragStartDelay]="{touch:150,mouse:0}" [attr.data-transfer-key]="key(item)" data-transfer-side="source" (cdkDragStarted)="startPointer($event)" (cdkDragEnded)="endPointer()">
      <ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{$implicit:item,side:'source',index}" />
      <div class="ui-transfer-actions"><button data-collection-control uiAction cdkDragHandle [disabled]="editsBlocked()||itemDisabled(item)" [attr.aria-pressed]="keyboard()?.key===key(item)" [attr.aria-describedby]="controlId()+'-instructions'" [attr.aria-label]="itemLabel(item)+'の移動位置を選ぶ'" (click)="startKeyboard(item,'source',$event)" (keydown)="keyboardKey($event)">移動</button><button data-collection-control uiAction [disabled]="editsBlocked()||itemDisabled(item)||!!keyboard()" [attr.aria-label]="itemLabel(item)+'を追加'" (click)="moveKeys([key(item)],'target','button')">追加</button></div>
     </li>
    }@empty{<li class="ui-transfer-empty">{{sourceQuery()?'条件に一致する候補はありません。':'追加できる候補はありません。'}}</li>}
    </ul>
   </fieldset>
   <fieldset><legend>{{targetLabel()}} · {{selectedKeys().length}}件選択 · {{target().length}}件表示</legend>
    @if(searchable()){<label class="ui-transfer-search">選択済みを検索<input data-collection-control class="ui-field-control" type="search" [value]="targetQuery()" [disabled]="blocked()" (input)="search('target',$event)"></label>}
    <label class="ui-transfer-all"><input data-collection-control type="checkbox" [checked]="allChecked('target')" [indeterminate]="someChecked('target')" [disabled]="editsBlocked()||!eligible('target').length" (change)="checkAll('target',$event)">表示中の有効な選択をすべて選択</label>
    <button data-collection-control uiAction [disabled]="editsBlocked()||!scope('target').length||!!keyboard()" (click)="moveScope('target')">一括削除</button>
    <ul cdkDropList #targetList="cdkDropList" [id]="controlId()+'-target'" [cdkDropListData]="targetZone()" [cdkDropListConnectedTo]="[sourceList]" [cdkDropListDisabled]="editsBlocked()||!!keyboard()" [cdkDropListSortingDisabled]="!reorderable()" [cdkDropListEnterPredicate]="enterPredicate" [cdkDropListSortPredicate]="sortPredicate" (cdkDropListDropped)="drop($event)">
    @for(item of target();track key(item);let index=$index){
     <li cdkDrag [cdkDragData]="dragData(item,'target')" [cdkDragDisabled]="editsBlocked()||itemDisabled(item)||!!keyboard()" [cdkDragPreviewContainer]="'parent'" [cdkDragStartDelay]="{touch:150,mouse:0}" [attr.data-transfer-key]="key(item)" data-transfer-side="target" (cdkDragStarted)="startPointer($event)" (cdkDragEnded)="endPointer()">
      <ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{$implicit:item,side:'target',index}" />
      <div class="ui-transfer-actions"><button data-collection-control uiAction cdkDragHandle [disabled]="editsBlocked()||itemDisabled(item)" [attr.aria-pressed]="keyboard()?.key===key(item)" [attr.aria-describedby]="controlId()+'-instructions'" [attr.aria-label]="itemLabel(item)+'の移動位置を選ぶ'" (click)="startKeyboard(item,'target',$event)" (keydown)="keyboardKey($event)">移動</button><button data-collection-control uiAction [disabled]="editsBlocked()||itemDisabled(item)||!!keyboard()" [attr.aria-label]="itemLabel(item)+'を削除'" (click)="moveKeys([key(item)],'source','button')">削除</button>
      @if(reorderable()){<button data-collection-control uiAction [disabled]="editsBlocked()||itemDisabled(item)||index===0||!!keyboard()" [attr.aria-label]="itemLabel(item)+'を上へ'" (click)="moveRelative(item,-1)">上へ</button><button data-collection-control uiAction [disabled]="editsBlocked()||itemDisabled(item)||index===target().length-1||!!keyboard()" [attr.aria-label]="itemLabel(item)+'を下へ'" (click)="moveRelative(item,1)">下へ</button>}</div>
     </li>
    }@empty{<li class="ui-transfer-empty">{{targetQuery()?'条件に一致する選択はありません。':'表示する選択はありません。'}}</li>}
    </ul>
   </fieldset>
  </div>}
  @if(hint()){<p [id]="controlId()+'-hint'">{{hint()}}</p>}
  @if(valueProblem()){<p [id]="controlId()+'-problem'" role="alert">{{valueProblem()}}</p>}
  @if(structureProblem()){<p>保持している値：{{displayValue()}}</p>}
  @if(error()){<p [id]="controlId()+'-error'" role="alert">{{error()}}</p>}
  <p role="status" aria-atomic="true">{{feedback()}}</p>
 </div>
 <ng-template #content let-item let-side="side" let-index="index">
  <label class="ui-transfer-row-label"><input data-collection-control type="checkbox" [checked]="marked(side).includes(key(item))" [disabled]="editsBlocked()||itemDisabled(item)" (change)="check(side,item,$event)"><span>{{itemLabel(item)}}@if(itemDisabled(item)){<span class="ui-transfer-state">（変更不可）</span>}</span></label>
  @if(itemTemplate()){<div class="ui-transfer-content"><ng-container [ngTemplateOutlet]="itemTemplate()!.template" [ngTemplateOutletContext]="context(item,side,index)" /></div>}
 </ng-template>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}.ui-transfer-label{display:block;font-weight:var(--ui-weight-control);}.ui-transfer-panes{display:flex;flex-wrap:wrap;gap:var(--ui-space-field);min-inline-size:0;}fieldset{flex:1 1 var(--ui-size-grid-item);min-inline-size:0;padding:0;border:0;margin:0;}legend{max-inline-size:100%;font-weight:var(--ui-weight-control);overflow-wrap:anywhere;}.ui-transfer-search{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-y);}.ui-transfer-search input{box-sizing:border-box;min-inline-size:0;max-inline-size:100%;inline-size:100%;}.ui-transfer-all,.ui-transfer-row-label{display:flex;align-items:start;gap:var(--ui-space-control-gap);min-inline-size:0;min-block-size:var(--ui-size-control);overflow-wrap:anywhere;}.ui-transfer-all input,.ui-transfer-row-label input{flex:0 0 auto;accent-color:var(--ui-color-action);inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);}input:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}ul{list-style:none;margin-block:var(--ui-space-control-y);padding:0;min-inline-size:0;min-block-size:var(--ui-size-control);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);background:var(--ui-color-surface);}li{min-inline-size:0;box-sizing:border-box;padding:var(--ui-space-control-y) var(--ui-space-control-x);color:var(--ui-color-text);overflow-wrap:anywhere;}li+li{border-block-start:var(--ui-border-control) solid var(--ui-color-border);}.ui-transfer-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}.ui-transfer-content{min-inline-size:0;overflow-wrap:anywhere;}.ui-transfer-state,.ui-transfer-empty{color:var(--ui-color-muted);}.cdk-drag-placeholder{visibility:hidden;}.cdk-drag-preview{box-sizing:border-box;background:var(--ui-color-surface);color:var(--ui-color-text);border:var(--ui-border-focus) solid var(--ui-color-focus);border-radius:var(--ui-radius-control);}p{overflow-wrap:anywhere;margin-block:var(--ui-space-control-gap);}p[role=alert]{color:var(--ui-color-danger);}`})
export class TransferList<T extends object> extends ValueControl<TransferValue> implements Validator{
 protected readonly emptyValue=null;
 readonly items=input.required<readonly T[]>();readonly keyField=input.required<Extract<keyof T,string>>();readonly labelField=input.required<Extract<keyof T,string>>();readonly disabledField=input<Extract<keyof T,string>|null>(null);readonly hiddenField=input<Extract<keyof T,string>|null>(null);
 readonly sourceLabel=input('候補');readonly targetLabel=input('選択済み');readonly searchable=input(true,{transform:booleanAttribute});readonly reorderable=input(true,{transform:booleanAttribute});readonly maxSelected=input<number|null>(null);readonly locale=input('ja-JP');
 readonly canTransfer=input<((change:TransferChange<T>)=>boolean)|null>(null);readonly canReorder=input<((move:TransferReorder<T>)=>boolean)|null>(null);readonly transferred=output<TransferChange<T>>();readonly reordered=output<TransferReorder<T>>();
 protected readonly itemTemplate=contentChild<TransferItem<T>>(TransferItem);protected readonly sourceQuery=signal('');protected readonly targetQuery=signal('');protected readonly sourceMarked=signal<readonly CollectionKey[]>([]);protected readonly targetMarked=signal<readonly CollectionKey[]>([]);protected readonly feedback=signal('');protected readonly keyboard=signal<KeyboardTransfer<T>|null>(null);protected readonly direction=signal<'ltr'|'rtl'>('ltr');
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private readonly destroy=inject(DestroyRef);private readonly overlays=inject(OverlayRegistry);private readonly sourceList=viewChild<CdkDropList<TransferZone>>('sourceList');private readonly targetList=viewChild<CdkDropList<TransferZone>>('targetList');private readonly drags=viewChildren(CdkDrag);private pointer:PointerTransfer<T>|null=null;private pointerEpoch=0;private pointerActive=false;private operationStop:(()=>void)|null=null;private validatorChanged:()=>void=()=>{};
 private readonly options=computed<TransferOptions<T>>(()=>({items:this.items(),key:item=>this.key(item),label:item=>this.itemLabel(item),disabled:item=>this.itemDisabled(item),hidden:item=>this.itemHidden(item)}));
 protected readonly configurationProblem=computed(()=>{if(!this.controlId().trim()||!this.label().trim()||!this.sourceLabel().trim()||!this.targetLabel().trim())return '移動欄の識別子と説明を指定してください。';try{new Intl.Collator(this.locale());}catch{return '検索の言語を確認してください。';}return transferConfigurationProblem(this.options(),this.maxSelected());});
 protected readonly structureProblem=computed(()=>this.configurationProblem()?null:transferStructureProblem(this.options(),this.current()));
 protected readonly valueProblem=computed(()=>this.configurationProblem()??transferSelectionProblem(this.options(),this.current(),this.required(),this.maxSelected()));
 protected readonly editsBlocked=computed(()=>this.blocked()||this.readonly()||!!this.configurationProblem()||!!this.structureProblem());
 protected readonly selectedKeys=computed<readonly CollectionKey[]>(()=>Array.isArray(this.current())?this.current() as readonly CollectionKey[]:[]);
 protected readonly source=computed(()=>this.configurationProblem()?[]:this.items().filter(item=>!this.selectedKeys().includes(this.key(item))&&!this.itemHidden(item)&&this.matches(item,this.sourceQuery())));
 protected readonly target=computed(()=>{if(this.configurationProblem())return [];const map=new Map(this.items().map(item=>[this.key(item),item]));return [...new Set(this.selectedKeys())].flatMap(key=>{const item=map.get(key);return item&&!this.itemHidden(item)&&this.matches(item,this.targetQuery())?[item]:[];});});
 protected readonly sourceZone=computed<TransferZone>(()=>({side:'source',keys:this.source().map(item=>this.key(item))}));protected readonly targetZone=computed<TransferZone>(()=>({side:'target',keys:this.target().map(item=>this.key(item))}));
 protected readonly described=computed(()=>[this.descriptionIds(),this.controlId()+'-instructions',this.valueProblem()?this.controlId()+'-problem':null].filter(Boolean).join(' ')||null);
 protected coerce(value:unknown):TransferValue{return value===undefined?null:value as TransferValue;}
 override writeValue(value:unknown):void{this.invalidatePending();this.sourceMarked.set([]);this.targetMarked.set([]);super.writeValue(value);}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null{const problem=this.configurationProblem()??transferSelectionProblem(this.options(),control.value,this.required(),this.maxSelected());return problem?{transferList:problem}:null;}
 protected key(item:T):CollectionKey{return item[this.keyField()] as CollectionKey;}
 protected itemLabel(item:T):string{return item[this.labelField()] as string;}
 protected itemDisabled(item:T):boolean{return this.disabledField()===null?false:(item[this.disabledField()!]??false) as boolean;}
 protected itemHidden(item:T):boolean{return this.hiddenField()===null?false:(item[this.hiddenField()!]??false) as boolean;}
 private matches(item:T,query:string):boolean{return this.itemLabel(item).toLocaleLowerCase(this.locale()).includes(query.toLocaleLowerCase(this.locale()));}
 protected displayValue():string{try{return JSON.stringify(this.current())??String(this.current());}catch{return '値を文字列として表示できません。フォームをresetして修復できます。';}}
 protected context(item:T,side:TransferSide,pageIndex:number):TransferItemContext<T>{return {$implicit:item,key:this.key(item),label:this.itemLabel(item),side,index:side==='source'?this.items().indexOf(item):this.selectedKeys().indexOf(this.key(item)),pageIndex,count:side==='source'?this.items().length:this.selectedKeys().length,checked:this.marked(side).includes(this.key(item)),selected:side==='target'};}
 protected dragData(item:T,side:TransferSide):TransferDrag<T>{return {item,key:this.key(item),side};}
 protected marked(side:TransferSide):readonly CollectionKey[]{return side==='source'?this.sourceMarked():this.targetMarked();}
 protected eligible(side:TransferSide):readonly T[]{return (side==='source'?this.source():this.target()).filter(item=>!this.itemDisabled(item));}
 protected scope(side:TransferSide):readonly CollectionKey[]{return this.eligible(side).map(item=>this.key(item)).filter(key=>this.marked(side).includes(key));}
 protected allChecked(side:TransferSide):boolean{return !!this.eligible(side).length&&this.eligible(side).every(item=>this.marked(side).includes(this.key(item)));}
 protected someChecked(side:TransferSide):boolean{return !!this.scope(side).length&&!this.allChecked(side);}
 protected check(side:TransferSide,item:T,event:Event):void{if(this.editsBlocked()||this.itemDisabled(item))return;const key=this.key(item),values=this.marked(side),next=(event.target as HTMLInputElement).checked?[...values.filter(value=>value!==key),key]:values.filter(value=>value!==key);(side==='source'?this.sourceMarked:this.targetMarked).set(next);this.feedback.set('');}
 protected checkAll(side:TransferSide,event:Event):void{if(this.editsBlocked())return;const eligible=this.eligible(side).map(item=>this.key(item)),values=this.marked(side);(side==='source'?this.sourceMarked:this.targetMarked).set((event.target as HTMLInputElement).checked?[...values,...eligible.filter(key=>!values.includes(key))]:values.filter(key=>!eligible.includes(key)));this.feedback.set('');}
 protected search(side:TransferSide,event:Event):void{if(this.blocked())return;this.invalidatePending();(side==='source'?this.sourceQuery:this.targetQuery).set((event.target as HTMLInputElement).value);this.feedback.set('');}
 protected leave(event:FocusEvent):void{if(!(event.relatedTarget instanceof Node)||!this.element.contains(event.relatedTarget))this.touch();}
 protected moveScope(side:TransferSide):void{this.moveKeys(this.scope(side),side==='source'?'target':'source','button');}
 protected moveKeys(keys:readonly CollectionKey[],to:TransferSide,reason:TransferReason,beforeKey:CollectionKey|null=null):boolean{
  if(this.destroy.destroyed||this.editsBlocked())return false;
  const snapshot=this.snapshot(),previousValue=this.current(),result=transferBatch(this.options(),previousValue,keys,to,this.maxSelected(),this.canTransfer(),reason,beforeKey);
  if(!this.matchesSnapshot(snapshot)){this.feedback.set('候補が更新されたため、移動していません。');return false;}
  if(result.problem){this.feedback.set(result.problem);return false;}if(result.value===previousValue)return false;
  this.commit(result.value);const moved=new Set(keys);this.sourceMarked.update(values=>values.filter(key=>!moved.has(key)));this.targetMarked.update(values=>values.filter(key=>!moved.has(key)));this.touch();this.transferred.emit({items:snapshot.items,keys:[...keys],from:to==='target'?'source':'target',to,previousValue,value:result.value!,reason});this.feedback.set(keys.length+'件を'+(to==='target'?'追加':'削除')+'しました。');return true;
 }
 protected moveRelative(item:T,offset:number):void{const index=this.target().findIndex(row=>this.key(row)===this.key(item)),other=this.target()[index+offset];if(other)this.moveOrder(this.key(item),this.key(other),'button');}
 private moveOrder(key:CollectionKey,targetKey:CollectionKey,reason:TransferReason):boolean{
  if(this.destroy.destroyed||this.editsBlocked()||!this.reorderable())return false;const snapshot=this.snapshot(),previousValue=this.current(),result=reorderTransfer(this.options(),previousValue,key,targetKey,this.canReorder(),reason);
  if(!this.matchesSnapshot(snapshot)){this.feedback.set('候補が更新されたため、順序を変更していません。');return false;}if(result.problem){this.feedback.set(result.problem);return false;}if(result.value===previousValue)return false;
  const item=this.items().find(item=>this.key(item)===key)!;this.commit(result.value);this.touch();this.reordered.emit({items:snapshot.items,item,key,fromIndex:snapshot.keys.indexOf(key),toIndex:result.value!.indexOf(key),previousValue:previousValue!,value:result.value!,reason});this.feedback.set(this.itemLabel(item)+'を'+(result.value!.indexOf(key)+1)+'番目へ移動しました。');return true;
 }
 private snapshot():TransferSnapshot<T>{return {items:this.items(),value:this.current(),keys:[...this.selectedKeys()],rows:this.items().map(item=>({item,key:this.key(item),label:this.itemLabel(item),disabled:this.itemDisabled(item),hidden:this.itemHidden(item)})),source:[...this.sourceZone().keys],target:[...this.targetZone().keys],maximum:this.maxSelected(),canTransfer:this.canTransfer(),canReorder:this.canReorder(),reorderable:this.reorderable(),direction:this.direction()};}
 private matchesSnapshot(snapshot:TransferSnapshot<T>):boolean{
  if(this.destroy.destroyed||this.editsBlocked()||snapshot.items!==this.items()||snapshot.value!==this.current()||snapshot.maximum!==this.maxSelected()||snapshot.canTransfer!==this.canTransfer()||snapshot.canReorder!==this.canReorder()||snapshot.reorderable!==this.reorderable()||snapshot.direction!==this.direction())return false;
  const equal=(a:readonly CollectionKey[],b:readonly CollectionKey[])=>a.length===b.length&&a.every((key,index)=>key===b[index]);if(!equal(snapshot.keys,this.selectedKeys())||!equal(snapshot.source,this.sourceZone().keys)||!equal(snapshot.target,this.targetZone().keys)||snapshot.rows.length!==this.items().length)return false;
  try{return snapshot.rows.every((row,index)=>row.item===this.items()[index]&&row.key===this.key(row.item)&&row.label===this.itemLabel(row.item)&&row.disabled===this.itemDisabled(row.item)&&row.hidden===this.itemHidden(row.item));}catch{return false;}
 }
 private startOperation():void{this.stopOperation();this.operationStop=this.overlays.register({kind:'operation',element:this.element,anchor:this.element,dismiss:reason=>{this.invalidatePending();this.feedback.set(reason==='escape'?'移動を取り消しました。':'表示領域を離れたため移動を取り消しました。');}});}
 private stopOperation():void{this.operationStop?.();this.operationStop=null;}
 /** Call before a synchronous app update when an old same-turn completion must be rejected. */
 invalidatePending():void{if(this.pointer)this.pointer.cancelled=true;this.keyboard.set(null);this.stopOperation();}
 protected startPointer(event:CdkDragStart<TransferDrag<T>>):void{if(this.editsBlocked()){return;}this.invalidatePending();this.pointerEpoch++;this.pointerActive=true;this.pointer={snapshot:this.snapshot(),drag:event.source,key:event.source.data.key,side:event.source.data.side,cancelled:false,moved:false};this.startOperation();this.feedback.set('移動中です。Escapeで取り消し、指を離すと終了します。');}
 protected endPointer():void{this.pointerActive=false;this.stopOperation();const epoch=this.pointerEpoch;queueMicrotask(()=>{if(this.destroy.destroyed||epoch!==this.pointerEpoch)return;const pointer=this.pointer;if(pointer?.cancelled)for(const drag of this.drags())drag.reset();this.pointer=null;if(pointer?.cancelled)this.feedback.set('移動を取り消しました。');else if(!pointer?.moved)this.feedback.set('位置は変わりませんでした。');});}
 private validPointer(drag:CdkDrag<TransferDrag<T>>):boolean{const pointer=this.pointer;return !!pointer&&!pointer.cancelled&&drag===pointer.drag&&drag.data.key===pointer.key&&drag.data.side===pointer.side&&this.matchesSnapshot(pointer.snapshot);}
 readonly enterPredicate=(drag:CdkDrag<TransferDrag<T>>,drop:CdkDropList<TransferZone>):boolean=>{if(!this.validPointer(drag)||drop!==this.sourceList()&&drop!==this.targetList())return false;const to=drop===this.targetList()?'target':'source';if(to===this.pointer!.side)return true;const result=transferBatch(this.options(),this.current(),[this.pointer!.key],to,this.maxSelected(),this.canTransfer(),'pointer');return result.problem===null;};
 readonly sortPredicate=(index:number,drag:CdkDrag<TransferDrag<T>>,drop:CdkDropList<TransferZone>):boolean=>{if(!this.validPointer(drag)||drop!==this.targetList()||!this.reorderable())return false;if(this.pointer!.side==='source')return true;const targetKey=this.pointer!.snapshot.target[index];return targetKey!==undefined&&reorderTransfer(this.options(),this.current(),this.pointer!.key,targetKey,this.canReorder(),'pointer').problem===null;};
 protected drop(event:CdkDragDrop<TransferZone,TransferZone,TransferDrag<T>>):void{
  const pointer=this.pointer;if(!pointer||!event.isPointerOverContainer||!this.validPointer(event.item))return;
  const from=event.previousContainer===this.sourceList()?'source':event.previousContainer===this.targetList()?'target':null,to=event.container===this.sourceList()?'source':event.container===this.targetList()?'target':null;
  if(!from||!to||from!==pointer.side||event.previousContainer.data.side!==from||event.container.data.side!==to||!Number.isSafeInteger(event.previousIndex)||pointer.snapshot[from==='source'?'source':'target'][event.previousIndex]!==pointer.key){pointer.cancelled=true;this.feedback.set('移動対象が更新されたため、移動を取り消しました。');return;}
  const destination=pointer.snapshot[to==='source'?'source':'target'];
  if(!Number.isSafeInteger(event.currentIndex)||event.currentIndex<0||event.currentIndex>destination.length||from===to&&event.currentIndex===destination.length)return;
  if(from===to){if(to==='target'&&this.reorderable()){const targetKey=pointer.snapshot.target[event.currentIndex];if(targetKey!==undefined)pointer.moved=this.moveOrder(pointer.key,targetKey,'pointer');}}
  else{const before=to==='target'?(pointer.snapshot.target[event.currentIndex]??null):null;pointer.moved=this.moveKeys([pointer.key],to,'pointer',before);}
 }
 protected startKeyboard(item:T,side:TransferSide,event:Event):void{if(this.editsBlocked()||this.itemDisabled(item)||this.pointerActive)return;const current=this.keyboard();if(current?.key===this.key(item)&&current.from===side){this.finishKeyboard();return;}this.keyboard.set({snapshot:this.snapshot(),key:this.key(item),from:side,to:side,targetKey:side==='target'?this.key(item):null,origin:event.currentTarget as HTMLElement});this.startOperation();this.feedback.set(this.itemLabel(item)+'の移動先を選んでいます。');}
 protected keyboardKey(event:KeyboardEvent):void{
  const draft=this.keyboard();if(!draft||event.target!==draft.origin||event.defaultPrevented||event.isComposing||event.keyCode===229)return;
  if(event.key==='Tab'){this.invalidatePending();return;}if(event.key==='Enter'||event.key===' '){event.preventDefault();this.finishKeyboard();return;}
  let next={...draft};if(event.key==='ArrowLeft'||event.key==='ArrowRight'){next.to=event.key===(this.direction()==='rtl'?'ArrowLeft':'ArrowRight')?'target':'source';next.targetKey=next.to==='target'?(draft.from==='target'?draft.key:null):null;}
  else if(next.to==='target'&&(event.key==='ArrowUp'||event.key==='ArrowDown'||event.key==='Home'||event.key==='End')){const keys=draft.snapshot.target,index=next.targetKey===null?keys.length:keys.indexOf(next.targetKey);const position=event.key==='Home'?0:event.key==='End'?keys.length-1:Math.max(0,Math.min(keys.length-(draft.from==='target'?1:0),index+(event.key==='ArrowUp'?-1:1)));next.targetKey=keys[position]??null;}
  else return;event.preventDefault();if(!this.matchesSnapshot(draft.snapshot)){this.invalidatePending();this.feedback.set('候補が更新されたため、移動を取り消しました。');return;}this.keyboard.set(next);const position=next.targetKey===null?this.selectedKeys().length+1:this.selectedKeys().indexOf(next.targetKey)+1;this.feedback.set('仮の移動先：'+(next.to==='source'?this.sourceLabel():this.targetLabel()+'の'+position+'番目')+'。Enterで確定します。');
 }
 private finishKeyboard():void{const draft=this.keyboard();if(!draft)return;this.keyboard.set(null);this.stopOperation();if(!this.matchesSnapshot(draft.snapshot)){this.feedback.set('候補が更新されたため、移動を取り消しました。');return;}if(draft.from!==draft.to)this.moveKeys([draft.key],draft.to,'keyboard',draft.to==='target'?draft.targetKey:null);else if(draft.to==='target'&&draft.targetKey!==null)this.moveOrder(draft.key,draft.targetKey,'keyboard');else this.feedback.set('位置は変わりませんでした。');}
 constructor(){super();installCollectionFocus();this.destroy.onDestroy(()=>{this.pointerEpoch++;this.pointer=null;this.keyboard.set(null);this.stopOperation();});
  effect(()=>{this.configurationProblem();this.required();this.items();this.maxSelected();this.validatorChanged();});
  afterRenderEffect(onCleanup=>{const update=()=>this.direction.set(this.element.ownerDocument.defaultView?.getComputedStyle(this.element).direction==='rtl'?'rtl':'ltr');update();const observer=new MutationObserver(update);for(let ancestor:HTMLElement|null=this.element;ancestor;ancestor=ancestor.parentElement)observer.observe(ancestor,{attributes:true,attributeFilter:['dir','class','style','data-ui-profile']});onCleanup(()=>observer.disconnect());});
  afterRenderEffect(()=>{this.current();this.sourceZone();this.targetZone();this.editsBlocked();this.maxSelected();this.canTransfer();this.canReorder();this.reorderable();this.direction();untracked(()=>{if(this.keyboard()&&!this.matchesSnapshot(this.keyboard()!.snapshot)||this.pointerActive&&this.pointer&&!this.matchesSnapshot(this.pointer.snapshot)){this.invalidatePending();this.feedback.set('候補の更新により、移動を取り消しました。');}});});
 }
}
