import {Directive,Input,TemplateRef,ViewContainerRef,inject,type EmbeddedViewRef,type TrackByFunction} from '@angular/core';
import {CdkVirtualScrollViewport,type CdkVirtualScrollRepeater} from '@angular/cdk/scrolling';
import {Subject} from 'rxjs';
import {VirtualScroll} from './virtual-scroll';
import type {CollectionKey} from './collection-model';

interface RowContext<T>{$implicit:T;index:number;count:number;gap:number;first:boolean;last:boolean;even:boolean;odd:boolean;}
/** Public CDK repeater with one retained focus row outside the bounded viewport window. */
@Directive({selector:'[uiVirtualRows][uiVirtualRowsOf]',standalone:true})
export class VirtualRows<T> implements CdkVirtualScrollRepeater<T>{
 private readonly viewport=inject(CdkVirtualScrollViewport);
 private readonly scroll=inject(VirtualScroll);
 private readonly template=inject<TemplateRef<RowContext<T>>>(TemplateRef);
 private readonly container=inject(ViewContainerRef);
 private readonly data=new Subject<readonly T[]>();
 readonly dataStream=this.data.asObservable();
 private readonly views=new Map<unknown,EmbeddedViewRef<RowContext<T>>>();
 private items:readonly T[]=[];
 @Input() set uiVirtualRowsOf(items:readonly T[]){this.items=items;this.scroll.dataChanged();this.data.next(items);}
 @Input() uiVirtualRowsTrackBy:TrackByFunction<T>=(_index,item)=>item;
 constructor(){this.viewport.attach(this);}
 ngDoCheck():void{
  if(this.scroll.radioGroups().length)this.scroll.setRowKeys(this.items.map((item,index)=>this.uiVirtualRowsTrackBy(index,item) as CollectionKey));
  const indices=this.scroll.indices().filter(index=>index<this.items.length),desired=indices.map(index=>({index,key:this.uiVirtualRowsTrackBy(index,this.items[index]!)})),keys=new Set(desired.map(row=>row.key));
  for(const [key,view] of this.views){if(!keys.has(key)){this.container.remove(this.container.indexOf(view));this.views.delete(key);}}
  let previous=indices[0]===undefined?-1:indices[0]-1;
  desired.forEach(({index,key},position)=>{
   const context:RowContext<T>={$implicit:this.items[index]!,index,count:this.items.length,gap:(index-previous-1)*this.scroll.itemSize(),first:index===0,last:index===this.items.length-1,even:index%2===0,odd:index%2!==0};previous=index;
   const view=this.views.get(key);
   if(view){Object.assign(view.context,context);if(this.container.indexOf(view)!==position)this.container.move(view,position);}
   else this.views.set(key,this.container.createEmbeddedView(this.template,context,position));
  });
 }
 measureRangeSize(range:{start:number;end:number},orientation:'horizontal'|'vertical'):number{
  if(range.start>=range.end)return 0;
  const rows=new Map<number,HTMLElement>();
  for(const view of this.views.values()){
   const root=view.rootNodes.find((node:unknown)=>node instanceof HTMLElement) as HTMLElement|undefined;
   const row=root?.querySelector<HTMLElement>('[data-ui-virtual-index]');if(row)rows.set(view.context.index,row);
  }
  for(let index=range.start;index<range.end;index++)if(!rows.has(index))throw new Error('Cannot measure a virtual row that is not rendered.');
  const first=rows.get(range.start)!.getBoundingClientRect(),last=rows.get(range.end-1)!.getBoundingClientRect();
  return orientation==='vertical'?last.bottom-first.top:last.right-first.left;
 }
 ngOnDestroy():void{this.viewport.detach();this.data.complete();}
 static ngTemplateContextGuard<T>(_directive:VirtualRows<T>,_context:unknown):_context is RowContext<T>{return true;}
}
