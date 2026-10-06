import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,contentChild,DestroyRef,Directive,ElementRef,inject,input,output,signal,TemplateRef,viewChild} from '@angular/core';
import {ActionControl} from './action-control';
import type {TableKey} from './table-model';
export interface GridItemContext<T>{$implicit:T;index:number;selected:boolean}
export interface GridBreakpoint{minWidth:number;columns:number}
@Directive({selector:'ng-template[uiGridItem]',standalone:true})
export class GridItem<T extends object>{readonly of=input.required<readonly T[]>({alias:'uiGridItemOf'});readonly template=inject<TemplateRef<GridItemContext<T>>>(TemplateRef);static ngTemplateContextGuard<T extends object>(_directive:GridItem<T>,_context:unknown):_context is GridItemContext<T>{return true;}}
@Component({selector:'ui-grid-list',standalone:true,imports:[NgTemplateOutlet,ActionControl,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`@if(configurationError()){<p role="alert">{{configurationError()}}</p>}
  @else{<section [attr.aria-label]="label()"><div class="ui-grid-list__actions">@if(selectionMode()==='multiple' && showSelectAll()){<button uiAction [disabled]="blocked()||!eligible().length" (click)="all(true)">{{'一覧をすべて選択' | uiMessage}}</button><button uiAction [disabled]="blocked()||!selectedKeys().length" (click)="all(false)">{{'一覧の選択を解除' | uiMessage}}</button>}</div>
   <ul #grid class="ui-grid-list" [style.grid-template-columns]="'repeat('+resolvedColumns()+', minmax(0,1fr))'" [attr.data-gap]="gap()" [attr.data-item-size]="itemSize()">
    @for(item of items();track key(item);let index=$index){<li [attr.data-item-key]="key(item)" [class.ui-grid-list__item--selected]="selectedKeys().includes(key(item))">
     @if(selectionMode()!=='none'){<label class="ui-grid-list__choice"><input [type]="selectionMode()==='single'?'radio':'checkbox'" [name]="controlId()+'-selection'" [checked]="selectedKeys().includes(key(item))" [disabled]="blocked()||!selectable(item)" (change)="select(item,checked($event))">{{itemLabel(item)}}{{'を選択' | uiMessage}}</label>}
     @if(itemTemplate()){<ng-container [ngTemplateOutlet]="itemTemplate()!.template" [ngTemplateOutletContext]="{$implicit:item,index,selected:selectedKeys().includes(key(item))}" />}
     @else{<span>{{itemLabel(item)}}</span>}
    </li>
   }@empty{<li class="ui-grid-list__empty">{{uiEffective_emptyMessage()}}</li>}</ul>
   <span #measure class="ui-grid-list__measure" aria-hidden="true"></span>
  </section>}`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}section{min-inline-size:0;}.ui-grid-list{display:grid;gap:var(--ui-space-field);padding:0;margin-block:var(--ui-space-control-y);list-style:none;min-inline-size:0;}.ui-grid-list[data-gap="compact"]{gap:var(--ui-space-control-gap);}.ui-grid-list[data-gap="wide"]{gap:var(--ui-space-section);}.ui-grid-list>li{min-inline-size:0;overflow-wrap:anywhere;box-sizing:border-box;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);padding:var(--ui-space-field);background:var(--ui-color-surface);color:var(--ui-color-text);}.ui-grid-list__item--selected{outline:var(--ui-border-control) solid var(--ui-color-focus);}.ui-grid-list__choice{display:flex;align-items:center;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);}.ui-grid-list__choice input{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}.ui-grid-list__choice input:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}.ui-grid-list__actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}.ui-grid-list__measure{position:absolute;visibility:hidden;pointer-events:none;inline-size:var(--ui-size-grid-item);block-size:0;}.ui-grid-list__empty{grid-column:1/-1;}`,
})
export class GridList<T extends object>{
 private readonly uiRuntimeText_GridList=injectUiRuntimeText();

 protected readonly uiText_GridList=injectUiText();
 readonly items=input.required<readonly T[]>();readonly keyField=input.required<Extract<keyof T,string>>();readonly labelField=input.required<Extract<keyof T,string>>();readonly controlId=input.required<string>();readonly label=input.required<string>();
 readonly columns=input<number|null>(null);readonly maxColumns=input(6);readonly breakpoints=input<readonly GridBreakpoint[]>([]);readonly minimumItemWidth=input<number|null>(null);readonly itemSize=input<'small'|'medium'|'large'>('medium');readonly gap=input<'compact'|'normal'|'wide'>('normal');
 readonly selectionMode=input<'none'|'single'|'multiple'>('none');readonly selectedKeys=input<readonly TableKey[]>([]);readonly selectedKeysChange=output<readonly TableKey[]>();readonly disabled=input(false,{transform:booleanAttribute});readonly busy=input(false,{transform:booleanAttribute});readonly itemSelectable=input<((item:T)=>boolean)|null>(null);readonly showSelectAll=input(true,{transform:booleanAttribute});readonly emptyMessage=input<string>();
 protected readonly uiEffective_emptyMessage=uiLocaleComputed(()=>this.emptyMessage()??this.uiText_GridList('表示する項目はありません。'));
 protected readonly blocked=computed(()=>this.disabled()||this.busy());protected readonly itemTemplate=contentChild<GridItem<T>>(GridItem);private readonly grid=viewChild<ElementRef<HTMLElement>>('grid');private readonly measure=viewChild<ElementRef<HTMLElement>>('measure');private readonly width=signal(0);private readonly measuredMinimum=signal(1);private readonly measuredGap=signal(0);
 protected readonly eligible=computed(()=>this.items().filter(item=>this.selectable(item)));
 protected readonly configurationError=computed(()=>{const seen=new Set<TableKey>();for(const item of this.items()){const key=item[this.keyField()];if(typeof key!=='string'&&typeof key!=='number'||typeof key==='number'&&!Number.isFinite(key)||seen.has(key as TableKey))return this.uiRuntimeText_GridList('一覧の項目キーには一意な文字列または有限の数値を指定してください。');seen.add(key as TableKey);}
  const valid=(value:number)=>Number.isSafeInteger(value)&&value>0;if(this.columns()!==null&&!valid(this.columns()!)||!valid(this.maxColumns())||this.minimumItemWidth()!==null&&(!Number.isFinite(this.minimumItemWidth())||this.minimumItemWidth()!<=0)||this.breakpoints().some(item=>!Number.isFinite(item.minWidth)||item.minWidth<0||!valid(item.columns)))return this.uiRuntimeText_GridList('一覧の列数と項目幅を確認してください。');return null;});
 protected readonly resolvedColumns=computed(()=>{const breakpoint=[...this.breakpoints()].sort((a,b)=>b.minWidth-a.minWidth).find(item=>item.minWidth<=this.width());if(breakpoint)return breakpoint.columns;if(this.columns()!==null)return this.columns();const min=(this.minimumItemWidth()??this.measuredMinimum())*(this.itemSize()==='small'?0.75:this.itemSize()==='large'?1.5:1),gap=this.measuredGap();return Math.min(this.maxColumns(),Math.max(1,Math.floor((this.width()+gap)/(min+gap))));});
 protected key(item:T):TableKey{return item[this.keyField()] as TableKey;}protected itemLabel(item:T):string{return String(item[this.labelField()]??'');}protected selectable(item:T):boolean{return this.itemSelectable()?.(item)!==false;}
 protected checked(event:Event):boolean{return (event.target as HTMLInputElement).checked;}
 protected select(item:T,selected:boolean):void{if(this.blocked()||!this.selectable(item))return;const key=this.key(item);this.selectedKeysChange.emit(this.selectionMode()==='single'?[key]:selected?[...new Set([...this.selectedKeys(),key])]:this.selectedKeys().filter(value=>value!==key));}
 protected all(selected:boolean):void{if(this.blocked())return;const keys=this.eligible().map(item=>this.key(item));this.selectedKeysChange.emit(selected?[...new Set([...this.selectedKeys(),...keys])]:this.selectedKeys().filter(key=>!keys.includes(key)));}
 constructor(){const destroy=inject(DestroyRef);let observer:ResizeObserver|undefined;const render=afterRenderEffect(()=>{const element=this.grid()?.nativeElement,measure=this.measure()?.nativeElement;if(!element||!measure)return;const update=()=>{this.width.set(element.getBoundingClientRect().width);this.measuredMinimum.set(measure.getBoundingClientRect().width);this.measuredGap.set(parseFloat(element.ownerDocument.defaultView!.getComputedStyle(element).columnGap)||0);};update();observer?.disconnect();observer=new ResizeObserver(update);observer.observe(element);observer.observe(measure);});destroy.onDestroy(()=>{render.destroy();observer?.disconnect();});}
}
