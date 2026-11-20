import {afterEveryRender,ChangeDetectorRef,DestroyRef,Directive,ElementRef,forwardRef,inject,Injectable,input,signal} from '@angular/core';
import {CdkVirtualScrollViewport,VIRTUAL_SCROLL_STRATEGY,type VirtualScrollStrategy} from '@angular/cdk/scrolling';
import {Subject,distinctUntilChanged} from 'rxjs';
import {canFocus} from './focus';
import {VirtualRadios,nativeRadioTabCandidate,type VirtualRadioGroup} from './virtual-radio';
import type {CollectionKey} from './collection-model';

/** Last stable geometry. A list can retain it when its viewport is recreated. */
@Injectable()
export class VirtualScrollPosition {
 itemSize = 0;
 height = 0;
 offset = 0;
}
export interface FocusedVirtualRow { previous: number; next: number; active: Element; }

/** Fixed rows with an application-owned window. CDK's wrapper remains at offset zero. */
@Directive({selector:'cdk-virtual-scroll-viewport[uiVirtualScroll]',standalone:true,providers:[{provide:VIRTUAL_SCROLL_STRATEGY,useExisting:forwardRef(()=>VirtualScroll)}],host:{'(pointerdown)':'point($event)','(focusin)':'focused($event)','(wheel)':'releaseKeyboard()','(focusout)':'leave($event)'}})
export class VirtualScroll implements VirtualScrollStrategy {
 readonly itemSize=input.required<number>({alias:'uiVirtualScroll'});
 private readonly position=inject(VirtualScrollPosition,{optional:true,host:true})??new VirtualScrollPosition();
 readonly overscan=input(3,{alias:'uiVirtualOverscan'});
 readonly radioGroups=input<readonly VirtualRadioGroup[]>([],{alias:'uiVirtualRadioGroups'});
 private readonly radios=new VirtualRadios();
 readonly renderRows=input<(()=>void)|null>(null,{alias:'uiVirtualRender'});
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 constructor(){afterEveryRender(()=>{this.finishPosition();this.syncRadios();});const document=this.element.ownerDocument;const key=(event:KeyboardEvent)=>this.enter(event);document.addEventListener('keydown',key);inject(DestroyRef).onDestroy(()=>document.removeEventListener('keydown',key));}
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
 private readonly changeDetector=inject(ChangeDetectorRef);
 private positionInitialized=false;
 private inputsChanged=false;
 private seekFrame:number|null=null;
 private pendingPosition:{offset:number;measured:number;active:Element|null;revealEditor:boolean}|null=null;
 private keyboard=false;
 private pointerRadio:HTMLInputElement|null=null;
 private readonly index=new Subject<number>();
 readonly scrolledIndexChange=this.index.pipe(distinctUntilChanged());
 attach(viewport:CdkVirtualScrollViewport):void{this.viewport=viewport;this.update();}
 detach():void{this.viewport=null;this.positionInitialized=false;this.clearSeek();this.releaseKeyboard();}
 ngOnDestroy():void{this.clearSeek();this.radios.destroy();this.index.complete();}
 ngOnChanges():void{this.dataChanged();}
 onContentScrolled():void{this.prepared=null;this.rememberPosition();this.update();}
 onDataLengthChanged():void{this.prepared=null;this.update();}
 onContentRendered():void{}
 onRenderedOffsetChanged():void{}
 scrollToIndex(index:number,behavior:ScrollBehavior):void{this.scrollToOffset(index*this.itemSize(),behavior);}
 scrollToOffset(offset:number,behavior:ScrollBehavior):void{
  this.releaseKeyboard();
  this.clearSeek();
  const view=this.element.ownerDocument.defaultView;
  if(view)this.seekFrame=view.requestAnimationFrame(()=>{this.seekFrame=null;});
  this.viewport?.scrollToOffset(offset,behavior);
  this.rememberPosition();
 }
 private clearSeek():void {
  if(this.seekFrame!==null)this.element.ownerDocument.defaultView?.cancelAnimationFrame(this.seekFrame);
  this.seekFrame=null;
 }
 private endKeyboardNavigation():void{this.keyboard=false;this.prepared=null;this.pointerRadio=null;}
 releaseKeyboard():void{this.endKeyboardNavigation();this.pendingPosition=null;}
 private rememberPosition():void {
  const viewport=this.viewport, position=this.position;
  if(viewport && !this.pendingPosition && position.itemSize===this.itemSize() && position.height===this.element.clientHeight) {
   position.offset=viewport.measureScrollOffset();
  }
 }
 reconcilePosition(focus:FocusedVirtualRow|null):void {
  const viewport=this.viewport, size=this.itemSize(), height=this.element.clientHeight;
  if(!viewport || !(size>0))return;
  const inputsChanged=this.inputsChanged;
  this.inputsChanged=false;
  if(!height){
   if(inputsChanged)this.clearSeek();
   if(viewport.getViewportSize()!==height)viewport.checkViewportSize();
   else if(inputsChanged)this.update();
   return;
  }
  const position=this.position, measured=viewport.measureScrollOffset();
  const changed=!this.positionInitialized || position.itemSize!==size || position.height!==height;
  if(this.pendingPosition && Math.abs(measured-this.pendingPosition.measured)>1)this.pendingPosition=null;
  const current=this.pendingPosition?.offset??measured;
  const oldSize=position.itemSize||size, oldHeight=position.height||height;
  // A native seek can precede CDK's scroll event. Use its actual position unless
  // remounting or the growing viewport has already clamped the old end offset.
  const restored=!this.positionInitialized && position.itemSize>0;
  const clamped=changed && measured<position.offset && Math.abs(measured-(this.element.scrollHeight-height))<=1;
  const oldOffset=restored||clamped ? position.offset : current;
  const limit=Math.max(0,viewport.getDataLength()*size-height);
  const bounded=(offset:number)=>Math.min(limit,Math.max(0,offset));
  let target=bounded(changed ? oldOffset/oldSize*size : current);
  // An API seek, or a native position CDK has not yet observed, owns this update
  // even if the old editor still intersects the viewport.
  const moved=focus!==null && focus.previous!==focus.next;
  const nativeSeek=this.positionInitialized && !this.pendingPosition && !clamped && Math.abs(measured-position.offset)>0.5;
  const seeking=this.seekFrame!==null || nativeSeek;
  if(inputsChanged || changed || moved)this.clearSeek();
  const editing=!seeking && focus!==null && (changed || moved)
   && this.editorWasVisible(focus,oldSize,oldOffset,oldHeight);
  const revealEditor=editing && size>height;
  let follow=false;
  if(editing){
   const rowTop=focus.next*size;
   // A fitting row belongs wholly inside the viewport. For a taller row, keep
   // the viewport inside the row, then measure its projected editor after layout.
   const minimum=rowTop-Math.max(0,height-size), maximum=rowTop+Math.max(0,size-height);
   follow=target<minimum || target>maximum || !changed&&!this.indices().includes(focus.next);
   if(follow){
    const requested=(oldOffset/oldSize + focus.next-focus.previous)*size;
    target=bounded(Math.max(minimum,Math.min(maximum,requested)));
   }
  }
  this.positionInitialized=true;
  position.itemSize=size;
  position.height=height;
  position.offset=target;
  if(!changed && !follow && !revealEditor){
   if(inputsChanged)this.update();
   return;
  }
  this.releaseKeyboard();
  if(Math.abs(measured-target)>0.5)viewport.scrollToOffset(target,'instant');
  const applied=viewport.measureScrollOffset();
  // The browser may still clamp to the old CDK spacer until its next render.
  if(Math.abs(target-applied)>1 || revealEditor)this.pendingPosition={offset:target,measured:applied,active:focus && (follow||revealEditor)?focus.active:null,revealEditor};
  if(viewport.getViewportSize()!==height)viewport.checkViewportSize();
  else this.update();
 }
 private editorWasVisible(focus:FocusedVirtualRow,size:number,offset:number,height:number):boolean {
  const top=focus.previous*size;
  if(top>=offset+height || top+size<=offset)return false;
  const row=focus.active.closest('[data-ui-virtual-index]');
  if(!row)return true;
  const rect=focus.active.getBoundingClientRect(), start=top+rect.top-row.getBoundingClientRect().top;
  return start<offset+height && start+rect.height>offset;
 }
 private finishPosition():void {
  const pending=this.pendingPosition, viewport=this.viewport;
  if(!pending||!viewport)return;
  this.pendingPosition=null;
  if((!pending.active||this.element.ownerDocument.activeElement===pending.active) && Math.abs(viewport.measureScrollOffset()-pending.measured)<=1){
   if(Math.abs(viewport.measureScrollOffset()-pending.offset)>0.5)viewport.scrollToOffset(pending.offset,'instant');
   if(pending.revealEditor && pending.active){
    const rect=pending.active.getBoundingClientRect();
    const top=this.element.getBoundingClientRect().top+this.element.clientTop;
    const start=rect.top-top, end=rect.bottom-top-this.element.clientHeight;
    // Move the nearest edge into view. If the editor spans the viewport, leave it in place.
    const nearerStart=Math.min(start,end);
    const delta=nearerStart>0 ? nearerStart : Math.min(0,Math.max(start,end));
    if(Math.abs(delta)>0.5)viewport.scrollToOffset(viewport.measureScrollOffset()+delta,'instant');
   }
  }
  this.rememberPosition();
 }
 point(event:PointerEvent):void{this.releaseKeyboard();const target=event.target,control=target instanceof HTMLInputElement?target:target instanceof Element?target.closest('label')?.control:null;if(control instanceof HTMLInputElement&&control.type==='radio'&&this.radios.isManaged(control))this.pointerRadio=control;}
 focused(event:FocusEvent):void{if(event.target!==this.element&&event.target!==this.pointerRadio)this.pointerRadio=null;}
 // Reconcile the new inputs with the current editor before CDK publishes a range.
 dataChanged():void{this.prepared=null;this.inputsChanged=true;}
 leave(event:FocusEvent):void{
  if(event.relatedTarget instanceof Node && this.element.contains(event.relatedTarget))return;
  this.endKeyboardNavigation();
  // An obsolete editor may blur while an independent resize/seek awaits the new spacer.
  if(this.pendingPosition?.active)this.pendingPosition=null;
 }
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
   if([row,...row.querySelectorAll<HTMLElement>('*')].some(control=>this.isTabStop(control,backwards)))return true;
  }
  return false;
 }
 private isTabStop(control:HTMLElement,backwards:boolean):boolean{
  // Firefox permits native scroll entry on disabled buttons/fieldsets, while
  // disabled editors remain outside sequential navigation. No focus is moved.
  const disabledScroller=this.radios.profile==='firefox'&&(control instanceof HTMLButtonElement||control instanceof HTMLFieldSetElement)&&control.matches(':disabled')&&this.isImplicitScrollStop(control);
  if(!canFocus(control))return disabledScroller;
  // A top-level editing host participates in native Tab even when tabIndex is -1.
  const editing=control.isContentEditable&&!control.parentElement?.isContentEditable&&!control.hasAttribute('tabindex');
  if(control.tabIndex<0&&!editing)return this.isImplicitScrollStop(control);
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
 private isImplicitScrollStop(control:HTMLElement):boolean{
  // Native scroll-container entry is engine-specific and is suppressed by an
  // explicit negative tabindex. Never add tabindex or move focus to emulate it.
  if(control.hasAttribute('tabindex')||this.radios.profile==='webkit'||!control.isConnected||control.closest('[inert],[hidden]')||!control.getClientRects().length)return false;
  const style=control.ownerDocument.defaultView?.getComputedStyle(control);if(!style||style.visibility!=='visible')return false;
  // This also protects the Firefox disabled-scroller exception, for which
  // canFocus intentionally returns false before checking closed details.
  let details=control.closest('details:not([open])');
  while(details){const summary=[...details.children].find(child=>child.tagName==='SUMMARY');if(!summary?.contains(control))return false;details=details.parentElement?.closest('details:not([open])')??null;}
  if(!((/^(auto|scroll)$/.test(style.overflowY)&&control.scrollHeight>control.clientHeight)||(/^(auto|scroll)$/.test(style.overflowX)&&control.scrollWidth>control.clientWidth)))return false;
  // Chromium exposes the scroller only when it has no keyboard-focusable child;
  // Firefox also exposes scrollers that contain such controls.
  return this.radios.profile!=='chromium'||![...control.querySelectorAll<HTMLElement>('*')].some(child=>canFocus(child)&&(child.tabIndex>=0||child.isContentEditable&&!child.parentElement?.isContentEditable&&!child.hasAttribute('tabindex')));
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
  const position=this.position, height=this.element.clientHeight;
  // Input changes are reconciled with the old focused view before notifying CDK of a range.
  if(this.inputsChanged || height>0 && position.itemSize>0 &&
     (!this.positionInitialized || position.itemSize!==size || position.height!==height)){
   this.changeDetector.markForCheck();
   return;
  }
  const count=viewport.getDataLength(),visible=Math.ceil(viewport.getViewportSize()/size),buffer=this.overscan()+1;
  const offset=this.pendingPosition?.offset??viewport.measureScrollOffset();
  const first=Math.min(Math.max(0,count-visible),Math.max(0,Math.floor(offset/size)));
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
