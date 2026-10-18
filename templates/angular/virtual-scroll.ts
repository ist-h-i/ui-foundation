import {afterEveryRender,DestroyRef,Directive,ElementRef,forwardRef,inject,input,signal} from '@angular/core';
import {CdkVirtualScrollViewport,VIRTUAL_SCROLL_STRATEGY,type VirtualScrollStrategy} from '@angular/cdk/scrolling';
import {Subject,distinctUntilChanged} from 'rxjs';
import {canFocus} from './focus';
import {VirtualRadios,nativeRadioTabCandidate,type VirtualRadioGroup} from './virtual-radio';
import type {CollectionKey} from './collection-model';

/** Fixed rows with an application-owned window. CDK's wrapper remains at offset zero. */
@Directive({selector:'cdk-virtual-scroll-viewport[uiVirtualScroll]',standalone:true,providers:[{provide:VIRTUAL_SCROLL_STRATEGY,useExisting:forwardRef(()=>VirtualScroll)}],host:{'(pointerdown)':'point($event)','(focusin)':'focused($event)','(wheel)':'releaseKeyboard()','(focusout)':'leave($event)'}})
export class VirtualScroll implements VirtualScrollStrategy {
 readonly itemSize=input.required<number>({alias:'uiVirtualScroll'});
 readonly overscan=input(3,{alias:'uiVirtualOverscan'});
 readonly radioGroups=input<readonly VirtualRadioGroup[]>([],{alias:'uiVirtualRadioGroups'});
 private readonly radios=new VirtualRadios();
 readonly renderRows=input<(()=>void)|null>(null,{alias:'uiVirtualRender'});
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 constructor(){afterEveryRender(()=>this.syncRadios());const document=this.element.ownerDocument;const key=(event:KeyboardEvent)=>this.enter(event);document.addEventListener('keydown',key);inject(DestroyRef).onDestroy(()=>document.removeEventListener('keydown',key));}
 private enter(event:KeyboardEvent):void{
  const viewport=this.viewport,target=event.target,refresh=this.renderRows();
  if(!viewport||!refresh||!this.radioGroups().length||event.defaultPrevented||event.isComposing||event.keyCode===229||event.key!=='Tab'||event.altKey||event.ctrlKey||event.metaKey||!(target instanceof HTMLElement)||this.element.contains(target)||target.ownerDocument.activeElement!==target)return;
  const scope=target.ownerDocument.querySelector('dialog:modal')??target.ownerDocument.body;
  const raw=[...scope.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex],summary,[contenteditable],audio[controls],video[controls],iframe')].filter(control=>canFocus(control)&&(control.tabIndex>=0||control.isContentEditable&&!control.parentElement?.isContentEditable&&!control.hasAttribute('tabindex')));
  // Positive tabindex changes the document's ordering; this adapter preserves
  // the native zero-tabindex sequence rather than approximating that ordering.
  if(raw.some(candidate=>candidate.tabIndex>0))return;
  // Programmatic focus may start on a negative-tabindex control. Its position
  // still anchors native Tab, and an active radio leaves its whole group.
  if(!raw.includes(target)&&scope.contains(target)){raw.push(target);raw.sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);}
  const candidates=raw.filter(control=>{
   if(!(control instanceof HTMLInputElement)||control.type!=='radio'||!control.name)return true;
   return nativeRadioTabCandidate(control,raw,target,event.shiftKey,this.radios.profile);
  });
  const at=candidates.indexOf(target),next=candidates[at+(event.shiftKey?-1:1)];
  if(at<0||!next||next.closest('cdk-virtual-scroll-viewport')!==this.element||!event.shiftKey)return;
  const base={...viewport.getRenderedRange()},count=viewport.getDataLength(),batch=Math.max(1,Math.ceil(viewport.getViewportSize()/this.itemSize())+2*(this.overscan()+1));
  this.keyboard=true;this.prepared=null;let end=count;
  while(end>0){const start=Math.max(0,end-batch);this.window({start,end},null);refresh();this.syncRadios(true);if(this.viewport!==viewport||!target.isConnected||target.ownerDocument.activeElement!==target)return;if(this.hasStop(count,true))return;end=start;}
  this.window(base,null);refresh();this.syncRadios(true);
 }
 setRowKeys(keys:readonly CollectionKey[]):void{this.radios.setKeys(keys);}
 private syncRadios(backwards=false,arrows=false):void{const element=this.viewport?.elementRef.nativeElement;if(element){this.radios.setGroups(this.radioGroups());this.radios.sync(element,backwards,arrows);}}
 readonly offset=signal(0);
 readonly indices=signal<readonly number[]>([]);
 private prepared:{origin:number;backwards:boolean}|null=null;
 private preparing=false;
 private viewport:CdkVirtualScrollViewport|null=null;
 private keyboard=false;
 private pointerRadio:HTMLInputElement|null=null;
 private readonly index=new Subject<number>();
 readonly scrolledIndexChange=this.index.pipe(distinctUntilChanged());
 attach(viewport:CdkVirtualScrollViewport):void{this.viewport=viewport;this.update();}
 detach():void{this.viewport=null;this.keyboard=false;}
 ngOnDestroy():void{this.radios.destroy();this.index.complete();}
 ngOnChanges():void{this.prepared=null;this.update();}
 onContentScrolled():void{this.prepared=null;this.update();}
 onDataLengthChanged():void{this.prepared=null;this.update();}
 onContentRendered():void{}
 onRenderedOffsetChanged():void{}
 scrollToIndex(index:number,behavior:ScrollBehavior):void{this.releaseKeyboard();this.viewport?.scrollToOffset(index*this.itemSize(),behavior);}
 releaseKeyboard():void{this.keyboard=false;this.prepared=null;this.pointerRadio=null;}
 point(event:PointerEvent):void{this.releaseKeyboard();const target=event.target,control=target instanceof HTMLInputElement?target:target instanceof Element?target.closest('label')?.control:null;if(control instanceof HTMLInputElement&&control.type==='radio'&&this.radios.isManaged(control))this.pointerRadio=control;}
 focused(event:FocusEvent):void{if(event.target!==this.element&&event.target!==this.pointerRadio)this.pointerRadio=null;}
 dataChanged():void{this.prepared=null;}
 leave(event:FocusEvent):void{if(!(event.relatedTarget instanceof Node)||!this.viewport?.elementRef.nativeElement.contains(event.relatedTarget))this.releaseKeyboard();}
 /** Runs in the component's bubbling key handler, after consumer handlers. Never cancels Tab. */
 prepareTab(event:KeyboardEvent,refresh:()=>void):boolean{
  const render=()=>{refresh();this.syncRadios(event.shiftKey);};
  const viewport=this.viewport,target=event.target;
  if(this.preparing||!viewport||!(target instanceof Element)||target.closest('cdk-virtual-scroll-viewport')!==viewport.elementRef.nativeElement)return false;
  const element=viewport.elementRef.nativeElement,pointer=target===element&&this.pointerRadio?.isConnected?this.pointerRadio:null;
  // WebKit can focus the scroll container on a radio click while native
  // sequential navigation still starts at the clicked radio. Preserve that
  // starting point without moving focus or cancelling the browser's Tab.
  const anchor=pointer??target,row=anchor.closest<HTMLElement>('[data-ui-virtual-index]'),origin=row?Number(row.dataset['uiVirtualIndex']):-1,backwards=event.shiftKey;
  this.preparing=true;
  try{
   this.keyboard=true;
   // Keep an already usable leading window intact. Replacing/expanding rows
   // during this keydown can invalidate Firefox's native radio Tab entry.
   if(target===element&&!pointer&&!backwards&&this.radioGroups().length&&viewport.getRenderedRange().start===0){render();if(this.hasStop(-1,false))return true;}
   if(this.prepared?.origin===origin&&this.prepared.backwards===backwards&&this.hasStop(origin,backwards)){render();if(this.hasStop(origin,backwards))return true;}
   if(pointer)this.window({...viewport.getRenderedRange()},origin);else if(target===element&&!backwards&&this.radioGroups().length){const end=Math.min(viewport.getDataLength(),Math.max(1,Math.ceil(viewport.getViewportSize()/this.itemSize())+2*(this.overscan()+1)));this.window({start:0,end},null);}else this.update();render();
   if(!anchor.isConnected||element.ownerDocument.activeElement!==target)return true;
   if(target===element&&!pointer&&backwards||this.hasStop(origin,backwards))return true;
   const base={...viewport.getRenderedRange()},count=viewport.getDataLength(),batch=Math.max(1,Math.ceil(viewport.getViewportSize()/this.itemSize())+2*(this.overscan()+1));
   let cursor=backwards?base.start:base.end;
   while(backwards?cursor>0:cursor<count){
    const range=backwards?{start:Math.max(0,cursor-batch),end:cursor}:{start:cursor,end:Math.min(count,cursor+batch)};
    this.window(range,row?origin:null);render();
    if(this.viewport!==viewport||!anchor.isConnected||element.ownerDocument.activeElement!==target)return true;
    if(this.hasStop(origin,backwards)){this.prepared={origin,backwards};return true;}
    cursor=backwards?range.start:range.end;
   }
   // No further stop: restore the visible window and let native Tab leave normally.
   this.window(base,row?origin:null);render();return true;
  }finally{this.preparing=false;}
 }
 prepareRadioArrow(event:KeyboardEvent,refresh:()=>void):boolean{
  const target=event.target,viewport=this.viewport;
  if(!viewport||!(target instanceof HTMLInputElement)||target.type!=='radio'||target.closest('cdk-virtual-scroll-viewport')!==viewport.elementRef.nativeElement||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return false;
  refresh();this.syncRadios();const neighbours=this.radios.neighbours(target);if(neighbours===null)return false;
  const index=Number(target.closest<HTMLElement>('[data-ui-virtual-index]')?.dataset['uiVirtualIndex']);
  this.keyboard=true;this.prepared=null;this.window({start:index,end:index+1},index,neighbours);refresh();this.syncRadios(false,true);return true;
 }
 private hasStop(origin:number,backwards:boolean):boolean{
  const element=this.viewport?.elementRef.nativeElement;if(!element)return false;
  for(const row of element.querySelectorAll<HTMLElement>('[data-ui-virtual-index]')){
   if(row.closest('cdk-virtual-scroll-viewport')!==element)continue;
   const index=Number(row.dataset['uiVirtualIndex']);if(backwards?index>=origin:index<=origin)continue;
   // Existence only. The browser owns the actual order and focus operation.
   if([...row.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex],summary,[contenteditable],audio[controls],video[controls],iframe')].some(control=>this.isTabStop(control,backwards)))return true;
  }
  return false;
 }
 private isTabStop(control:HTMLElement,backwards:boolean):boolean{
  if(!canFocus(control))return false;
  // A top-level editing host participates in native Tab even when tabIndex is -1.
  const editing=control.isContentEditable&&!control.parentElement?.isContentEditable&&!control.hasAttribute('tabindex');
  if(control.tabIndex<0&&!editing)return false;
  if(control instanceof HTMLInputElement&&control.type==='radio'&&this.radios.isManaged(control))return this.radios.isTabStop(control,backwards);
  if(control instanceof HTMLInputElement&&control.type==='radio'&&control.name){
   const root=control.getRootNode() as Document|ShadowRoot;
   const group=[...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(peer=>peer.name===control.name&&peer.form===control.form);
   const checked=group.find(peer=>peer.checked);
   if(checked)return control===checked;
   // Tab leaves an unchecked group once focus is already in it. Otherwise the
   // browser chooses the first/last eligible member for the travel direction.
   if(group.includes(control.ownerDocument.activeElement as HTMLInputElement))return false;
   const eligible=group.filter(peer=>peer.tabIndex>=0&&canFocus(peer));
   return control===(backwards?eligible.at(-1):eligible[0]);
  }
  return true;
 }
 private window(range:{start:number;end:number},retained:number|null,extra:readonly number[]=[]):void{
  const indices=Array.from({length:range.end-range.start},(_,offset)=>range.start+offset);
  if(retained!==null&&retained>=0&&retained<(this.viewport?.getDataLength()??0)&&!indices.includes(retained))indices.push(retained);
  for(const index of extra)if(index>=0&&index<(this.viewport?.getDataLength()??0)&&!indices.includes(index))indices.push(index);
  indices.sort((a,b)=>a-b);this.indices.set(indices);
  this.offset.set((indices[0]??range.start)*this.itemSize());this.viewport?.setRenderedRange(range);
 }
 private update():void{
  const viewport=this.viewport,size=this.itemSize();if(!viewport||!(size>0)||!Number.isFinite(size))return;
  const count=viewport.getDataLength(),visible=Math.ceil(viewport.getViewportSize()/size),buffer=this.overscan()+1;
  const first=Math.min(Math.max(0,count-visible),Math.max(0,Math.floor(viewport.measureScrollOffset()/size)));
  let start=Math.max(0,first-buffer),end=Math.min(count,first+visible+buffer);
  const element=viewport.elementRef.nativeElement,active=element.ownerDocument.activeElement;
  const row=this.keyboard&&active instanceof Element&&active.closest('cdk-virtual-scroll-viewport')===element?active.closest<HTMLElement>('[data-ui-virtual-index]'):null;
  if(row){
   const index=Number(row.dataset['uiVirtualIndex']),limit=Math.max(3,visible+2*buffer+2);
   if(Number.isSafeInteger(index)&&index>=0&&index<count){start=Math.max(0,Math.min(start,index-1));start=Math.max(start,index-limit+2);end=Math.min(count,Math.max(end,index+2),start+limit);}
  }
  start=Math.min(start,count);end=Math.max(start,end);
  viewport.setTotalContentSize(count*size);
  // The leading layout space and bounded repeater DOM share the same local render.
  this.window({start,end},row?Number(row.dataset['uiVirtualIndex']):null);
  this.index.next(first);
 }
}
