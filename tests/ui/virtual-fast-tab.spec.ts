import {runWithLifecycleCleanup} from './runtime-lifecycle';
import {type Page} from '@playwright/test';
import {test,expect,contexts,ready,environment,settle,create,host,destroy,record,update} from './css-override-test';
import {installPostBurstPaintObserver,type PostBurstIdentityRules} from './post-burst-paint';

// These are the finite attribute/selector inputs of identify below. Class
// membership is guarded by token; cosmetic classes and style are not identity.
const fastTabIdentityRules:PostBurstIdentityRules={
 targetAttributes:['id','data-fast-nested','data-fast-boundary','data-fast-control','role','aria-colindex','aria-posinset','aria-rowindex','data-virtual-row-key'],
 ancestorAttributes:['aria-posinset','aria-rowindex','data-virtual-row-key'],
 classTokens:['ui-virtual-row'],
};

const rows=(count:number)=>Array.from({length:count},(_,id)=>({id,name:`申請 ${id} `+'長い内容と保持する名前 '.repeat(8),amount:id}));
type Kind='list'|'table';
interface Snapshot{time:number;active:string;range:{start:number;end:number};dom:number[];limit:number;key:{time:number;key:string;trusted:boolean;shift:boolean;active:string;cancelled:boolean}|null;}
/** Only identity, public range, and DOM indices: no geometry, polling, or frame wait per key. */
async function installProbe(page:Page,id:number,kind:Kind){const native={ltr:await nativeScrollReference(page,id,kind,1,'ltr'),rtl:await nativeScrollReference(page,id,kind,1,'rtl')};for(const reference of Object.values(native))expect(reference.wheel).toEqual([{trusted:true,cancelled:false}]);await record(kind+'-native-scrollbar-reference',native);await page.evaluate(installPostBurstPaintObserver);await page.evaluate(({id,kind,gutter})=>{
 const root=document.querySelector<HTMLElement>(`[data-runtime-id="${id}"]`)!,instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table(),viewport=component.viewport(),element=viewport.elementRef.nativeElement as HTMLElement;
 const identify=(node:Element|null):string=>{
  if(!node)return 'null';if(node===document.body)return 'BODY';if(node===element)return 'viewport';if(node.matches('cdk-virtual-scroll-viewport'))return 'nested-viewport';if(node.hasAttribute('data-fast-nested'))return 'nested:'+node.getAttribute('data-fast-nested')+':main';
  if(node.matches('.ui-virtual-row')&&node.closest('cdk-virtual-scroll-viewport')!==element)return `nested-row:${Number(node.getAttribute('aria-posinset'))-1}:DIV`;
  const boundary=node.getAttribute('data-fast-boundary');if(boundary)return boundary;
  const row=node.closest<HTMLElement>('.ui-virtual-row,[data-virtual-row-key]');
  if(root.contains(node)&&row){const index=kind==='list'?Number(row.getAttribute('aria-posinset'))-1:Number(row.getAttribute('aria-rowindex'))-2,control=node.getAttribute('data-fast-control')??(node.getAttribute('role')==='cell'?'cell'+node.getAttribute('aria-colindex'):node.tagName==='INPUT'?'main':node.tagName);return `row:${index}:${control}`;}
  return node.id||'external:'+node.tagName;
 };
 // Layout/hit testing belongs to explicit paint observations. The immediate
 // keyup recorder below never invokes it or waits for native scroll completion.
 const paint=(mode:'active'|'first-visible')=>{
  const scrollbar=gutter[getComputedStyle(element).direction as 'ltr'|'rtl'],vp=element.getBoundingClientRect(),viewportBox={left:vp.left+element.clientLeft,top:vp.top+element.clientTop,right:vp.left+element.clientLeft+element.clientWidth-scrollbar.right,bottom:vp.top+element.clientTop+element.clientHeight};viewportBox.left+=scrollbar.left;
  const target=mode==='active'?document.activeElement:[...element.querySelectorAll<HTMLElement>(kind==='list'?'.ui-virtual-row':'[data-virtual-row-key]')].filter(row=>row.closest('cdk-virtual-scroll-viewport')===element).find(row=>{const box=row.getBoundingClientRect();return box.bottom>viewportBox.top&&box.top<viewportBox.bottom;})??null;
  if(!(target instanceof HTMLElement))return null;
  const radius=(style:CSSStyleDeclaration)=>Math.max(...[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius,style.borderBottomRightRadius].flatMap(value=>value.split(' ').map(part=>parseFloat(part)||0)));let maxRadius=radius(getComputedStyle(target));
  const box=target.getBoundingClientRect(),intersection={left:Math.max(box.left,viewportBox.left,0),top:Math.max(box.top,viewportBox.top,0),right:Math.min(box.right,viewportBox.right,innerWidth),bottom:Math.min(box.bottom,viewportBox.bottom,innerHeight)},clips:{tag:string;className:string;contain:string;left:number;top:number;right:number;bottom:number}[]=[];
  for(let parent=target.parentElement;parent;parent=parent.parentElement){
   const style=getComputedStyle(parent),paintContain=/(?:^| )(?:paint|content|strict)(?: |$)/.test(style.contain),clipX=paintContain||/auto|scroll|hidden|clip/.test(style.overflowX),clipY=paintContain||/auto|scroll|hidden|clip/.test(style.overflowY);
   if(!clipX&&!clipY)continue;maxRadius=Math.max(maxRadius,radius(style));const bounds=parent.getBoundingClientRect(),clip={tag:parent.tagName,className:parent.className,contain:style.contain,left:bounds.left+parent.clientLeft,top:bounds.top+parent.clientTop,right:bounds.left+parent.clientLeft+parent.clientWidth,bottom:bounds.top+parent.clientTop+parent.clientHeight};clips.push(clip);
   if(clipX){intersection.left=Math.max(intersection.left,clip.left);intersection.right=Math.min(intersection.right,clip.right);}if(clipY){intersection.top=Math.max(intersection.top,clip.top);intersection.bottom=Math.min(intersection.bottom,clip.bottom);}
  }
  const nonempty=intersection.right>intersection.left&&intersection.bottom>intersection.top,insetX=Math.min(Math.max(4,maxRadius),(intersection.right-intersection.left)/3),insetY=Math.min(4,(intersection.bottom-intersection.top)/4),hits=nonempty?[intersection.left+insetX,(intersection.left+intersection.right)/2,intersection.right-insetX].flatMap(x=>[intersection.top+insetY,(intersection.top+intersection.bottom)/2,intersection.bottom-insetY].map(y=>{const hit=document.elementFromPoint(x,y);return {x,y,tag:hit?.tagName??null,role:hit?.getAttribute('role')??null,label:hit?.getAttribute('aria-label')??null,owned:hit===target||!!hit&&target.contains(hit)};})):[];
  return {mode,target:identify(target),rect:{left:box.left,top:box.top,right:box.right,bottom:box.bottom},intersection,maxRadius,clips,hits,painted:nonempty&&hits.length===9&&hits.every(hit=>hit.owned)};
 };
 let key:Snapshot['key']=null,keyEvent:KeyboardEvent|null=null;const events:Snapshot[]=[];
 const read=():Snapshot=>({time:performance.now(),active:identify(document.activeElement),range:viewport.getRenderedRange(),dom:[...element.querySelectorAll<HTMLElement>(kind==='list'?'.ui-virtual-row':'[data-virtual-row-key]')].filter(row=>row.closest('cdk-virtual-scroll-viewport')===element).map(row=>kind==='list'?Number(row.getAttribute('aria-posinset'))-1:Number(row.getAttribute('aria-rowindex'))-2),limit:Math.ceil(viewport.getViewportSize()/component.rowSize())+2*(component.overscan()+1)+2,key:key?{...key,cancelled:keyEvent?.defaultPrevented??false}:null});
 const keydown=(event:KeyboardEvent)=>{if(event.key==='Tab'){keyEvent=event;key={time:performance.now(),key:event.key,trusted:event.isTrusted,shift:event.shiftKey,active:identify(document.activeElement),cancelled:event.defaultPrevented};}};
 const keyup=(event:KeyboardEvent)=>{if(event.key==='Tab')events.push(read());};
 document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',keyup,true);
 (window as any).__fastTab={snapshot:read,paint,identify,drain:()=>events.splice(0),dispose:()=>{document.removeEventListener('keydown',keydown,true);document.removeEventListener('keyup',keyup,true);}};
 },{id,kind,gutter:{ltr:native.ltr.gutter,rtl:native.rtl.gutter}});}
async function snapshot(page:Page):Promise<Snapshot>{return page.evaluate(()=>(window as any).__fastTab.snapshot());}
interface ExpectedKey{active:string;backwards:boolean;cancelled:boolean;}
const pending=new WeakMap<Page,ExpectedKey[]>();
/** A burst pays only the trusted keyboard IPC: all reads and assertions follow the burst. */
async function tab(page:Page,expected:string,_log:Snapshot[],backwards=false,cancelled=false){
 const plan=pending.get(page)??[];plan.push({active:expected,backwards,cancelled});pending.set(page,plan);await page.keyboard.press(backwards?'Shift+Tab':'Tab');
}
async function flush(page:Page,log:Snapshot[]){
 const events:Snapshot[]=await page.evaluate(()=>(window as any).__fastTab.drain()),plan=pending.get(page)??[];pending.set(page,[]);log.push(...events);
 expect(events.length,'each trusted Tab has one captured keyup').toBe(plan.length);
 for(const [index,expected] of plan.entries()){
  const current=events[index]!;
  // CDK maxBuffer is overscan+1 rows per side; two additional rows cover the
  // active row's adjacent handoff. This bound applies at every keyup, before RAF.
  expect(current.dom.length,'live DOM stays bounded during the burst').toBeLessThanOrEqual(current.limit);expect(current.range.end-current.range.start,'public range stays bounded during the burst').toBeLessThanOrEqual(current.limit);
  expect(current.key?.trusted,'the traversal uses a trusted native key').toBe(true);expect(current.key?.cancelled,'Tab default follows the application handler').toBe(expected.cancelled);expect(current.key?.shift).toBe(expected.backwards);
  expect(current.active,`native ${expected.backwards?'Shift+Tab':'Tab'} from ${current.key?.active}; range ${current.range.start}..${current.range.end}; DOM ${current.dom.join(',')}`).toBe(expected.active);
 }
}
async function disposeProbe(page:Page){if(page.isClosed()){await record('unexpected-page-close',{unexpectedPageClosed:true});return;}await page.evaluate(()=>(window as any).__fastTab.dispose());}

interface NativeScrollReference{top:number;max:number;steps:number[];gutter:{left:number;right:number};wheel:{trusted:boolean;cancelled:boolean}[];}
async function nativeScrollReference(sourcePage:Page,id:number,kind:Kind,gestures:number,direction?:'ltr'|'rtl'):Promise<NativeScrollReference>{
 // A separate native page avoids carrying a browser wheel gesture's scroll
 // latch from a temporary overlay into the application under test.
 const geometry=await sourcePage.evaluate(({id,kind,direction})=>{const instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table(),source=component.viewport().elementRef.nativeElement as HTMLElement,style=getComputedStyle(source);return {width:source.clientWidth,height:source.clientHeight,scrollHeight:source.scrollHeight,direction:direction??style.direction,font:style.font,lineHeight:style.lineHeight};},{id,kind,direction});
 const page=await sourcePage.context().newPage();const size=sourcePage.viewportSize();if(size)await page.setViewportSize(size);
 const steps:number[]=[];
 try{
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.evaluate(geometry=>{const reference=document.createElement('div'),content=document.createElement('div');reference.id='fast-native-scroll-reference';reference.style.cssText=`position:fixed;inset:0 auto auto 0;z-index:2147483647;inline-size:${geometry.width}px;block-size:${geometry.height}px;overflow:auto;border:0;padding:0;box-sizing:content-box;direction:${geometry.direction};font:${geometry.font};line-height:${geometry.lineHeight}`;content.style.cssText=`block-size:${geometry.scrollHeight}px;inline-size:100%;background:white`;reference.append(content);document.body.append(reference);const events:WheelEvent[]=[];reference.addEventListener('wheel',event=>events.push(event));(window as any).__fastNativeScroll={reference,content,events};},geometry);
  const target=await page.locator('#fast-native-scroll-reference').boundingBox();expect(target,'native scroll oracle is rendered').toBeTruthy();
  await page.mouse.move(target!.x+target!.width/2,target!.y+target!.height/2);
  for(let index=0;index<gestures;index++){const before=steps.at(-1)??0;await page.mouse.wheel(0,1_000_000);await expect.poll(()=>page.evaluate(before=>{const {reference}= (window as any).__fastNativeScroll;return reference.scrollTop>before||reference.scrollTop===reference.scrollHeight-reference.clientHeight;},before)).toBe(true);await settle(page);steps.push(await page.evaluate(()=>(window as any).__fastNativeScroll.reference.scrollTop));}
  return await page.evaluate(steps=>{const {reference,content,events}= (window as any).__fastNativeScroll,bounds=reference.getBoundingClientRect(),y=bounds.top+reference.clientHeight/2,owns=(x:number)=>{const hit=document.elementFromPoint(x,y);return hit===content||!!hit&&content.contains(hit);};let left=0,right=0;while(left<reference.clientWidth/2&&!owns(bounds.left+left+.5))left++;while(right<reference.clientWidth/2&&!owns(bounds.left+reference.clientWidth-right-.5))right++;return {top:reference.scrollTop,max:reference.scrollHeight-reference.clientHeight,steps,gutter:{left,right},wheel:events.map((event:WheelEvent)=>({trusted:event.isTrusted,cancelled:event.defaultPrevented}))};},steps);
 }finally{await page.close();await sourcePage.bringToFront();}
}
// Listener-free DOM provides this engine's native stops, including implicit
// scrollable row stops. Actual nested traversal below remains an unpaced burst.
async function nativeNestedSequence(page:Page,id:number,kind:Kind):Promise<string[]>{
 await page.evaluate(({id,kind})=>{const root=document.querySelector(`[data-runtime-id="${id}"]`)!,outer=(kind==='list'?root.querySelector('ui-virtual-list'):root.querySelector('ui-virtual-data-table'))!,nested=outer.querySelector('ui-virtual-list')!,reference=document.createElement('section'),before=document.createElement('button'),after=document.createElement('button');reference.id='fast-native-nested';before.id='fast-native-nested-before';after.id='fast-native-nested-after';reference.append(before,nested.cloneNode(true),after);document.querySelector('#runtime-slot')!.append(reference);},{id,kind});
 const result:string[]=[];try{await page.locator('#fast-native-nested-before').focus();for(let index=0;index<8;index++){await page.keyboard.press('Tab');const stop=await page.evaluate(()=>{const node=document.activeElement!;if(node.id==='fast-native-nested-after')return 'after';if(node.matches('cdk-virtual-scroll-viewport'))return 'nested-viewport';if(node.hasAttribute('data-fast-nested'))return 'nested:'+node.getAttribute('data-fast-nested')+':main';if(node.matches('.ui-virtual-row'))return 'nested-row:'+(Number(node.getAttribute('aria-posinset'))-1)+':DIV';return 'unexpected:'+node.tagName;});if(stop==='after')return result;result.push(stop);}throw new Error('native nested oracle did not exit within all three inputs and optional row stops');}finally{await page.locator('#fast-native-nested').evaluate(node=>node.remove());await page.evaluate(()=>(window as any).__fastTab.drain());}
}

// The original 1000-row/default-height/overscan-2 projection and D → C environment change.
// Setup/End/profile transitions settle separately. Native key bursts remain
// unpaced; their explicit post-burst paint observation has its own bounded phase.
test('fast native Tab original D to C: terminal projected inputs never exit before row 999',async({page,lifecycle})=>{
 await ready(page,contexts[3]);const id=await create(page,'RuntimeReassessmentVirtual',{kind:'list',rows:rows(1000),height:360,itemHeight:null,overscan:2,editors:true}),node=host(page,id),log:Snapshot[]=[];
 await node.evaluate(root=>{const after=document.createElement('button');after.id='fast-original-after';after.textContent='一覧の後';root.after(after);});await settle(page);await installProbe(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{
  for(const context of [contexts[3],contexts[2]]){
   await environment(page,context);await page.locator('#runtime-anchor').focus();await tab(page,'viewport',log);await page.keyboard.press('End');await settle(page);await flush(page,log);
   const terminal=await snapshot(page);expect(terminal.dom.at(-1),'setup must actually render the final row').toBe(999);expect(terminal.range.end).toBe(1000);const terminalPaint=await page.evaluate(()=>(window as any).__fastTab.paint('first-visible'));await record('original-'+context.name+'-End-first-visible-paint',terminalPaint);expect(terminalPaint?.painted,'first visible terminal row is painted and owns its native hit points').toBe(true);
   const start=terminal.dom[0]!;await page.locator('#runtime-anchor').focus();await tab(page,'viewport',log);
   for(let index=start;index<1000;index++)await tab(page,`row:${index}:main`,log);
   await flush(page,log);await geometry(page,id,'list','original-'+context.name+'-forward-burst',log.at(-1)!.active);await tab(page,'fast-original-after',log);await flush(page,log);
  }
 },async()=>{await record('original-D-C-immediate-native-tab',log);await disposeProbe(page);});
 await destroy(page,id);
});

async function geometry(page:Page,id:number,kind:Kind,label:string,expectedIdentity:string){
 const observation=await page.evaluate(({id,kind,expectedIdentity,identityRules})=>window.__observePostBurstPaint({expectedIdentity,identify:(window as any).__fastTab.identify,identityRules,timeoutMs:1000,
  read:()=>{const instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table(),viewport=component.viewport(),element=viewport.elementRef.nativeElement as HTMLElement,wrapper=element.querySelector<HTMLElement>('.ui-virtual-window')!,cdkWrapper=element.querySelector<HTMLElement>('.cdk-virtual-scroll-content-wrapper')!,range=viewport.getRenderedRange(),active=document.activeElement as HTMLElement,box=active.getBoundingClientRect(),bounds=element.getBoundingClientRect(),height=component.rowSize(),nodes=[...element.querySelectorAll<HTMLElement>(kind==='list'?'.ui-virtual-row':'[data-virtual-row-key]')];return {range,height,scrollTop:element.scrollTop,offset:parseFloat(getComputedStyle(wrapper).paddingBlockStart)||0,cdkOffset:new DOMMatrixReadOnly(getComputedStyle(cdkWrapper).transform).m42,rows:nodes.map(row=>({index:kind==='list'?Number(row.getAttribute('aria-posinset'))-1:Number(row.getAttribute('aria-rowindex'))-2,height:row.getBoundingClientRect().height})),active:{top:box.top,bottom:box.bottom},viewport:{top:bounds.top+element.clientTop,bottom:bounds.top+element.clientTop+element.clientHeight},activePaint:(window as any).__fastTab.paint('active'),firstVisiblePaint:(window as any).__fastTab.paint('first-visible')};},
  isReady:metric=>metric.active.top<metric.viewport.bottom&&metric.active.bottom>metric.viewport.top&&metric.activePaint?.painted===true&&metric.firstVisiblePaint?.painted===true,
 }),{id,kind,expectedIdentity,identityRules:fastTabIdentityRules});
 // Record before asserting so a persistent defect keeps its FIRST metric and
 // final failure state. One second bounds native paint readiness only; every
 // exact keyup/range/DOM assertion has already run without any per-key wait.
 await record(label+'-post-burst-paint-observation',observation);expect(observation.outcome,label+': pinned native target becomes painted within the post-burst deadline').toBe('ready');
 const metric=observation.final.metric!;
 expect(metric.range.start,label+': public range begins at first DOM row').toBe(metric.rows[0]?.index);expect(metric.range.end-metric.range.start).toBe(metric.rows.length);expect(Math.abs(metric.offset-metric.range.start*metric.height),label+': owned window follows public range').toBeLessThanOrEqual(1);expect(metric.cdkOffset,label+': CDK wrapper does not add a second offset').toBe(0);
 for(const row of metric.rows)expect(Math.abs(row.height-metric.height),label+': fixed rows match measured size').toBeLessThanOrEqual(1);
 expect(metric.active.top,label+': burst target is above the viewport bottom').toBeLessThan(metric.viewport.bottom);expect(metric.active.bottom,label+': burst target is below the viewport top').toBeGreaterThan(metric.viewport.top);await record(label,metric);expect(metric.activePaint?.painted,label+': focused target owns all center/inset hit samples').toBe(true);expect(metric.firstVisiblePaint?.painted,label+': first visible row is painted and hit testable').toBe(true);
}

type IdentityHistoryControl='restored-target-id'|'restored-target-control'|'restored-target-role'|'restored-target-column'|'restored-target-boundary'|'restored-target-nested'|'restored-ancestor-position'|'restored-ancestor-rowindex'|'restored-ancestor-key'|'restored-ancestor-class';
type PaintControl='ready'|'transient-offscreen'|'transient-occluded'|'persistent-offscreen'|'persistent-occluded'|'changed-focus'|'returned-focus'|'replaced-target'|'changed-identity'|'cosmetic-style-completion'|IdentityHistoryControl;
// These self-contained native DOM producers exercise the oracle contract only.
// They model completion after the FIRST sample; they are not native-scroll
// causal evidence and never add pacing to any application keyboard burst.
async function paintControl(page:Page,control:PaintControl){
 await page.setContent('<!doctype html><html><head><style>html,body{margin:0}#paint-viewport{position:fixed;left:20px;top:20px;width:240px;height:100px;overflow:hidden;border:1px solid black}#paint-viewport input{position:absolute;left:12px;width:160px;height:32px;padding:0;border:0;border-radius:0;box-sizing:border-box;font:16px sans-serif}#paint-other{top:58px}#paint-cover{position:absolute;inset:0;background:white;z-index:3}</style></head><body><section id="paint-viewport" aria-posinset="5" aria-rowindex="6"><div id="paint-row" class="paint-row ui-virtual-row" aria-posinset="1" aria-rowindex="2" data-virtual-row-key="row-a"><input id="paint-target" aria-label="Pinned target"><input id="paint-other" aria-label="Other target"></div><div id="paint-cover" hidden></div></section></body></html>');
 await page.evaluate(installPostBurstPaintObserver);
 await page.evaluate(control=>{const target=document.querySelector<HTMLElement>('#paint-target')!,cover=document.querySelector<HTMLElement>('#paint-cover')!,row=document.querySelector<HTMLElement>('#paint-row')!,viewport=document.querySelector<HTMLElement>('#paint-viewport')!;target.style.top=control==='ready'||control.includes('occluded')?'12px':'160px';cover.hidden=!control.includes('occluded');
  if(control==='restored-target-control')target.setAttribute('data-fast-control','main');
  if(control==='restored-target-role'||control==='restored-target-column'){target.setAttribute('role','cell');target.setAttribute('aria-colindex','1');}
  if(control==='restored-target-boundary')target.setAttribute('data-fast-boundary','before');
  if(control==='restored-target-nested')target.setAttribute('data-fast-nested','0');
  if(control==='restored-ancestor-key'||control==='restored-ancestor-class')viewport.classList.add('ui-virtual-row');
  if(control==='restored-ancestor-key')row.classList.remove('ui-virtual-row');
  if(control==='restored-ancestor-class')row.removeAttribute('data-virtual-row-key');
  target.focus({preventScroll:true});
 },control);
 const observation=await page.evaluate(({control,identityRules})=>{
  const viewport=document.querySelector<HTMLElement>('#paint-viewport')!,target=document.querySelector<HTMLElement>('#paint-target')!,other=document.querySelector<HTMLElement>('#paint-other')!,cover=document.querySelector<HTMLElement>('#paint-cover')!,row=document.querySelector<HTMLElement>('#paint-row')!,producerIdentityHistory:string[]=[];
  const identify=(element:Element|null):string=>{
   if(!element)return 'null';
   if(control==='restored-target-control')return 'control:'+element.getAttribute('data-fast-control');
   if(control==='restored-target-role'||control==='restored-target-column')return element.getAttribute('role')==='cell'?'cell'+element.getAttribute('aria-colindex'):'control:'+element.tagName;
   if(control==='restored-target-boundary')return element.getAttribute('data-fast-boundary')??element.id;
   if(control==='restored-target-nested')return 'nested:'+element.getAttribute('data-fast-nested')+':main';
   if(control.startsWith('restored-ancestor')){const owner=element.closest('.ui-virtual-row,[data-virtual-row-key]');return 'row:'+(control==='restored-ancestor-rowindex'?Number(owner?.getAttribute('aria-rowindex'))-2:Number(owner?.getAttribute('aria-posinset'))-1)+':main';}
   return element.id;
  };
  const result=window.__observePostBurstPaint({expectedIdentity:identify(target),identify,identityRules,timeoutMs:control.startsWith('persistent')?100:1000,
   read:()=>{const active=document.activeElement as HTMLElement,box=active.getBoundingClientRect(),bounds=viewport.getBoundingClientRect(),clip={left:bounds.left+viewport.clientLeft,top:bounds.top+viewport.clientTop,right:bounds.left+viewport.clientLeft+viewport.clientWidth,bottom:bounds.top+viewport.clientTop+viewport.clientHeight},intersection={left:Math.max(0,clip.left,box.left),top:Math.max(0,clip.top,box.top),right:Math.min(innerWidth,clip.right,box.right),bottom:Math.min(innerHeight,clip.bottom,box.bottom)},nonempty=intersection.right>intersection.left&&intersection.bottom>intersection.top;
    const hits=nonempty?[intersection.left+4,(intersection.left+intersection.right)/2,intersection.right-4].flatMap(x=>[intersection.top+4,(intersection.top+intersection.bottom)/2,intersection.bottom-4].map(y=>{const hit=document.elementFromPoint(x,y);return {x,y,hit:hit?.id??null,owned:hit===active||!!hit&&active.contains(hit)};})):[];
    return {target:active.id,active:{left:box.left,top:box.top,right:box.right,bottom:box.bottom},viewport:clip,intersection,hits,painted:nonempty&&hits.length===9&&hits.every(hit=>hit.owned),scrollTop:viewport.scrollTop};
   },isReady:metric=>metric.active.top<metric.viewport.bottom&&metric.active.bottom>metric.viewport.top&&metric.painted,
  });
  // Calling the async observer synchronously captures/clones its initial metric
  // before returning this promise. The producer then runs in a microtask, with
  // no timer or guessed browser timing and no mutation by the observer itself.
  queueMicrotask(()=>{
   if(control==='transient-offscreen')target.style.top='12px';
   if(control==='transient-occluded')cover.hidden=true;
   if(control==='changed-focus'||control==='returned-focus'){target.style.top='12px';other.focus({preventScroll:true});if(control==='returned-focus')target.focus({preventScroll:true});}
   if(control==='replaced-target'){const replacement=target.cloneNode(true) as HTMLElement;replacement.style.top='12px';target.replaceWith(replacement);replacement.focus({preventScroll:true});}
   if(control==='changed-identity'){target.style.top='12px';target.id='different-logical-target';}
   if(control==='cosmetic-style-completion'){target.style.top='12px';target.classList.add('cosmetic\u00a0ui-virtual-row');target.classList.add('paint-ready');row.classList.add('paint-complete');target.setAttribute('aria-label','Completed native target');}
   const changes:Partial<Record<IdentityHistoryControl,{element:HTMLElement;name:string;value:string|null}>>={
    'restored-target-id':{element:target,name:'id',value:'different-logical-target'},
    'restored-target-control':{element:target,name:'data-fast-control',value:'tail'},
    'restored-target-role':{element:target,name:'role',value:'button'},
    'restored-target-column':{element:target,name:'aria-colindex',value:'2'},
    'restored-target-boundary':{element:target,name:'data-fast-boundary',value:'after'},
    'restored-target-nested':{element:target,name:'data-fast-nested',value:'1'},
    'restored-ancestor-position':{element:row,name:'aria-posinset',value:'2'},
    'restored-ancestor-rowindex':{element:row,name:'aria-rowindex',value:'3'},
    'restored-ancestor-key':{element:row,name:'data-virtual-row-key',value:null},
    'restored-ancestor-class':{element:row,name:'class',value:'paint-row'},
   },change=changes[control as IdentityHistoryControl];
   if(change){const before=change.element.getAttribute(change.name);producerIdentityHistory.push(identify(target));if(change.value===null)change.element.removeAttribute(change.name);else change.element.setAttribute(change.name,change.value);producerIdentityHistory.push(identify(target));if(before===null)change.element.removeAttribute(change.name);else change.element.setAttribute(change.name,before);producerIdentityHistory.push(identify(target));target.style.top='12px';}
  });
  return result.then(observation=>({...observation,producerIdentityHistory}));
 },{control,identityRules:fastTabIdentityRules});
 await record('post-burst-paint-control-'+control,observation);return observation;
}

test('post-burst paint observer: an initially painted target needs no wait',async({page})=>{
 const observation=await paintControl(page,'ready');expect(observation.outcome).toBe('ready');expect(observation.attempts).toBe(1);expect(observation.initial.ready).toBe(true);expect(observation.final).toEqual(observation.initial);
});
for(const control of ['transient-offscreen','transient-occluded'] as const)test('post-burst paint observer: '+control+' completion preserves the first metric',async({page})=>{
 const observation=await paintControl(page,control);expect(observation.outcome).toBe('ready');expect(observation.initial.ready).toBe(false);expect(observation.final.ready).toBe(true);expect(observation.attempts).toBeGreaterThan(1);expect(observation.final.sameTarget).toBe(true);expect(observation.final.connected).toBe(true);expect(observation.final.activeIdentity).toBe('paint-target');
 if(control==='transient-offscreen'){expect(observation.initial.metric!.active.top).toBeGreaterThanOrEqual(observation.initial.metric!.viewport.bottom);expect(observation.initial.metric!.hits).toHaveLength(0);}else{expect(observation.initial.metric!.active.top).toBeLessThan(observation.initial.metric!.viewport.bottom);expect(observation.initial.metric!.hits.some(hit=>!hit.owned)).toBe(true);}
 expect(observation.final.metric!.painted).toBe(true);
});
for(const control of ['persistent-offscreen','persistent-occluded'] as const)test('post-burst paint observer: '+control+' remains a bounded failure',async({page})=>{
 const observation=await paintControl(page,control);expect(observation.outcome).toBe('timeout');expect(observation.initial.ready).toBe(false);expect(observation.final.ready).toBe(false);expect(observation.attempts).toBeGreaterThan(1);expect(observation.elapsedMs).toBeGreaterThanOrEqual(observation.timeoutMs);expect(observation.final.sameTarget).toBe(true);expect(observation.targetIssue).toBeNull();
 if(control==='persistent-offscreen'){expect(observation.final.metric!.active.top).toBeGreaterThanOrEqual(observation.final.metric!.viewport.bottom);expect(observation.final.metric!.hits).toHaveLength(0);}else{expect(observation.final.metric!.active.top).toBeLessThan(observation.final.metric!.viewport.bottom);expect(observation.final.metric!.hits.some(hit=>!hit.owned)).toBe(true);}
});
for(const control of ['changed-focus','returned-focus','replaced-target','changed-identity'] as const)test('post-burst paint observer: '+control+' cannot become a passing replacement',async({page})=>{
 const observation=await paintControl(page,control);expect(observation.outcome).toBe('target-changed');expect(observation.initial.ready).toBe(false);expect(observation.final.ready,'even painted geometry cannot excuse a different focus history or target').toBe(true);expect(observation.targetIssue).not.toBeNull();
 if(control==='changed-focus'){expect(observation.final.sameTarget).toBe(false);expect(observation.final.activeIdentity).toBe('paint-other');}
 if(control==='returned-focus'){expect(observation.final.sameTarget).toBe(true);expect(observation.final.activeIdentity).toBe('paint-target');}
 if(control==='replaced-target'){expect(observation.final.sameTarget).toBe(false);expect(observation.final.connected).toBe(false);expect(observation.final.activeIdentity).toBe('paint-target');}
 if(control==='changed-identity'){expect(observation.final.sameTarget).toBe(true);expect(observation.final.connected).toBe(true);expect(observation.final.pinnedIdentity).toBe('different-logical-target');}
});
for(const control of ['restored-target-id','restored-target-control','restored-target-role','restored-target-column','restored-target-boundary','restored-target-nested','restored-ancestor-position','restored-ancestor-rowindex','restored-ancestor-key','restored-ancestor-class'] as const)test('post-burst paint observer: '+control+' history cannot be hidden between frames',async({page})=>{
 const observation=await paintControl(page,control);expect(observation.outcome).toBe('target-changed');expect(observation.initial.ready).toBe(false);expect(observation.final.ready).toBe(true);expect(observation.final.sameTarget).toBe(true);expect(observation.final.connected).toBe(true);expect(observation.final.activeIdentity).toBe(observation.initialIdentity);expect(observation.final.pinnedIdentity).toBe(observation.initialIdentity);expect(observation.targetIssue).toContain('identity');expect(observation.producerIdentityHistory).toHaveLength(3);expect(observation.producerIdentityHistory[0]).toBe(observation.initialIdentity);expect(observation.producerIdentityHistory[1]).not.toBe(observation.initialIdentity);expect(observation.producerIdentityHistory[2]).toBe(observation.initialIdentity);
});
test('post-burst paint observer: cosmetic classes and style completion preserve identity',async({page})=>{
 const observation=await paintControl(page,'cosmetic-style-completion');expect(observation.outcome).toBe('ready');expect(observation.initial.ready).toBe(false);expect(observation.final.ready).toBe(true);expect(observation.final.sameTarget).toBe(true);expect(observation.final.activeIdentity).toBe(observation.initialIdentity);expect(observation.targetIssue).toBeNull();
});

for(const kind of ['list','table'] as const)test(`fast native Tab ${kind}: A-D mixed controls visit every row forward and backward`,async({page,lifecycle})=>{
 // Four same-instance contexts send 1040/2064 native keys. Budget the full
 // matrix as in the cross-browser runner without pacing any key burst.
 test.setTimeout(90_000);
 await ready(page,contexts[0]);const count=64,id=await create(page,'RuntimeFastTab',{kind,rows:rows(count),mixed:true,itemHeight:null}),node=host(page,id),log:Snapshot[]=[];await settle(page);await installProbe(page,id,kind);
 await runWithLifecycleCleanup(lifecycle,async()=>{
  for(const context of contexts){
   await environment(page,context);await update(page,id,{itemHeight:context.name==='C'?220:null,overscan:context.name==='C'?0:2});await node.locator('[data-fast-boundary="before"]').focus();await tab(page,'viewport',log);
   const controls=kind==='list'?['main','tail']:['cell1','main','tail','cell2'];
   for(let index=0;index<count;index++)for(const control of controls)await tab(page,`row:${index}:${control}`,log);
   await flush(page,log);await geometry(page,id,kind,kind+'-'+context.name+'-forward-burst',log.at(-1)!.active);if(context.name==='C')await test.info().attach(kind+'-C-post-forward-painted',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});await tab(page,'after',log);
   for(let index=count-1;index>=0;index--)for(const control of [...controls].reverse())await tab(page,`row:${index}:${control}`,log,true);
   await flush(page,log);await geometry(page,id,kind,kind+'-'+context.name+'-backward-burst',log.at(-1)!.active);await tab(page,'viewport',log,true);await tab(page,'before',log,true);await flush(page,log);
  }
 },async()=>{await record(kind+'-A-D-immediate-native-tab',log);await disposeProbe(page);});
 await destroy(page,id);
});

test('fast native Tab guards: consumed and IME keys preserve state; editors keep native key behavior',async({page,lifecycle})=>{
 await ready(page,contexts[2]);const log:Snapshot[]=[];
 for(const kind of ['list','table'] as const){
  const id=await create(page,'RuntimeFastTab',{kind,rows:rows(1000),mixed:true,itemHeight:null}),node=host(page,id);await settle(page);await installProbe(page,id,kind);
  await runWithLifecycleCleanup(lifecycle,async()=>{
   await node.locator('[data-fast-boundary="before"]').focus();await tab(page,'viewport',log);if(kind==='table')await tab(page,'row:0:cell1',log);await tab(page,'row:0:main',log);await flush(page,log);
   // Compare the same native editor keys with an identical external reference input.
   const native=await page.evaluate(()=>{const source=document.activeElement as HTMLInputElement,reference=source.cloneNode() as HTMLInputElement;reference.id='fast-native-reference';reference.removeAttribute('data-fast-control');reference.removeAttribute('aria-label');document.querySelector('#runtime-slot')!.before(reference);source.setSelectionRange(3,3);return {value:source.value,dir:getComputedStyle(source).direction};});
   const before=await snapshot(page),positions:number[]=[];for(const key of ['ArrowRight','ArrowLeft','ArrowLeft','ArrowRight']){await page.keyboard.press(key);positions.push(await page.evaluate(()=>(document.activeElement as HTMLInputElement).selectionStart??-1));}
   expect((await snapshot(page)).active).toBe('row:0:main');expect((await snapshot(page)).range).toEqual(before.range);
   await page.locator('#fast-native-reference').evaluate((node,native)=>{const input=node as HTMLInputElement;input.value=native.value;input.style.direction=native.dir;input.focus();input.setSelectionRange(3,3);},native);
   const reference:number[]=[];for(const key of ['ArrowRight','ArrowLeft','ArrowLeft','ArrowRight']){await page.keyboard.press(key);reference.push(await page.evaluate(()=>(document.activeElement as HTMLInputElement).selectionStart??-1));}expect(positions,'projected input preserves the browser native caret behavior').toEqual(reference);
   await node.locator('[data-fast-control="main"]').first().focus();await page.locator('#fast-native-reference').evaluate(node=>node.remove());
   await node.locator('[data-fast-control="main"]').first().evaluate(node=>node.addEventListener('keydown',event=>event.preventDefault(),{once:true}));await tab(page,'row:0:main',log,false,true);await flush(page,log);
   await tab(page,'row:0:tail',log);await flush(page,log);
   await page.evaluate(()=>{const source=document.activeElement as HTMLSelectElement,reference=source.cloneNode(true) as HTMLSelectElement;source.selectedIndex=0;reference.selectedIndex=0;reference.id='fast-native-select';reference.removeAttribute('data-fast-control');reference.removeAttribute('aria-label');document.querySelector('#runtime-slot')!.before(reference);});
   const selected:string[]=[];for(const key of ['ArrowDown','Enter','Escape']){await page.keyboard.press(key);selected.push(await page.evaluate(()=>(document.activeElement as HTMLSelectElement).value));}expect((await snapshot(page)).active).toBe('row:0:tail');
   await page.locator('#fast-native-select').focus();const nativeSelected:string[]=[];for(const key of ['ArrowDown','Enter','Escape']){await page.keyboard.press(key);nativeSelected.push(await page.evaluate(()=>(document.activeElement as HTMLSelectElement).value));}expect(selected,'projected select preserves browser native popup/selection behavior').toEqual(nativeSelected);await node.locator('[data-fast-control="tail"]').first().focus();await page.locator('#fast-native-select').evaluate(node=>node.remove());
   // Synthetic dispatch proves handler delegation only: it does not run native
   // Home/End scrolling or an OS/browser-reserved modified Tab default action.
   const guards=await page.evaluate(({id,kind})=>{
    const root=document.querySelector(`[data-runtime-id="${id}"]`)!,instance=(window as any).__runtime.instance(id),viewport=(kind==='list'?instance.list():instance.table()).viewport(),elements=[...root.querySelectorAll<HTMLElement>(kind==='list'?'[data-fast-control=tail]':'[role=cell][aria-colindex="2"]')],target=elements.at(-1)!;target.focus();
    const variants:(KeyboardEventInit&{defaultPrevented?:boolean})[]=[{defaultPrevented:true},{isComposing:true},{keyCode:229},{altKey:true},{ctrlKey:true},{metaKey:true},{key:'Home'},{key:'End'}];return variants.map(init=>{const range={...viewport.getRenderedRange()},active=document.activeElement,event=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true,...init});if(init.defaultPrevented)event.preventDefault();target.dispatchEvent(event);return {init,cancelled:event.defaultPrevented,activeUnchanged:active===document.activeElement,rangeUnchanged:JSON.stringify(range)===JSON.stringify(viewport.getRenderedRange())};});
   },{id,kind});
   for(const guard of guards){expect(guard.cancelled).toBe(!!guard.init.defaultPrevented);expect(guard.activeUnchanged).toBe(true);expect(guard.rangeUnchanged).toBe(true);}await record(kind+'-guard-events',guards);
   // A real nested CDK viewport owns its own native Tab sequence.
   await environment(page,contexts[0]);await update(page,id,{rows:rows(3),nested:true,itemHeight:220});await node.locator('[data-fast-boundary="before"]').focus();await tab(page,'viewport',log);if(kind==='table')await tab(page,'row:0:cell1',log);await tab(page,'row:0:main',log);await flush(page,log);
   const nativeNested=await nativeNestedSequence(page,id,kind);expect(nativeNested.filter(stop=>stop.startsWith('nested:')),'native oracle retains every inner input').toEqual(['nested:0:main','nested:1:main','nested:2:main']);await record(kind+'-native-nested-sequence',nativeNested);await node.locator('[data-fast-control=main]').first().focus();const outerRange=(await snapshot(page)).range;for(const stop of nativeNested)await tab(page,stop,log);await tab(page,'row:0:tail',log);await flush(page,log);expect((await snapshot(page)).range,'inner traversal does not move the outer range').toEqual(outerRange);
   // An external focus owner survives data removal, disabling, and destruction.
   await node.locator('[data-fast-boundary="after"]').focus();await page.evaluate(id=>{const api=(window as any).__runtime;api.update(id,{rows:[],disabled:true});},id);await settle(page);expect((await snapshot(page)).active).toBe('after');
   await page.locator('#runtime-anchor').focus();await disposeProbe(page);await destroy(page,id);expect(await page.evaluate(()=>document.activeElement?.id)).toBe('runtime-anchor');
  },async()=>{await record(kind+'-guard-native-tab',log);});
 }
});

test('fast native Tab release: public offset, trusted wheel, deep shrink and outside focus stay valid',async({page,lifecycle})=>{
 await ready(page,contexts[0]);
 for(const kind of ['list','table'] as const){
  const id=await create(page,'RuntimeFastTab',{kind,rows:rows(1000),mixed:true,itemHeight:null}),node=host(page,id),log:Snapshot[]=[];await settle(page);await installProbe(page,id,kind);
  const scroll=async(offset:'start'|'end')=>{expect(await page.evaluate(({id,kind,offset})=>{const instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table();return component.scrollToOffset(offset==='start'?0:component.rowSize()*1000);},{id,kind,offset}),'public scrollToOffset accepts a valid request').toBe(true);};
  const read=()=>page.evaluate(({id,kind})=>{const instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table(),viewport=component.viewport(),element=viewport.elementRef.nativeElement as HTMLElement;return {...(window as any).__fastTab.snapshot() as Snapshot,top:element.scrollTop,max:element.scrollHeight-element.clientHeight,viewport:element.getBoundingClientRect().toJSON(),window:{width:innerWidth,height:innerHeight},wheel:((window as any).__fastWheelEvents??[]).map((event:any)=>({time:event.time,trusted:event.trusted,cancelled:event.event.defaultPrevented,deltaY:event.deltaY,x:event.x,y:event.y,before:event.before,after:event.nodes.map((node:HTMLElement)=>({tag:node.tagName,role:node.getAttribute('role'),col:node.getAttribute('aria-colindex'),connected:node.isConnected,top:node.scrollTop,height:node.scrollHeight,client:node.clientHeight}))}))};},{id,kind});
  const atEnd=async(stage:string)=>{await expect.poll(async()=>{const current=await read();return current.range.end===1000&&current.dom.at(-1)===999&&current.dom.length>0&&Math.abs(current.top-current.max)<=1;},{message:kind+' '+stage+': far scrolling reaches real final rows after Tab mode'}).toBe(true);};
  const enter=async()=>{await node.locator('[data-fast-boundary="before"]').focus();await tab(page,'viewport',log);if(kind==='table')await tab(page,'row:0:cell1',log);await tab(page,'row:0:main',log);await tab(page,'row:0:tail',log);await flush(page,log);};
  await runWithLifecycleCleanup(lifecycle,async()=>{
   await enter();await scroll('end');await atEnd('public-offset');await expect.poll(async()=>(await read()).active,{message:kind+': removed projected editor falls back to its viewport'}).toBe('viewport');await record(kind+'-public-offset-end',await read());
   await update(page,id,{rows:rows(3)});const shrunk=await read();expect(shrunk.range.start).toBeLessThan(shrunk.range.end);expect(shrunk.range.end).toBeLessThanOrEqual(3);expect(shrunk.dom).toEqual([0,1,2]);expect(shrunk.dom.length).toBeLessThanOrEqual(shrunk.limit);await record(kind+'-deep-shrink',shrunk);
   await update(page,id,{rows:rows(1000)});await scroll('start');await expect.poll(async()=>(await read()).dom[0]).toBe(0);const nativeWheel=await nativeScrollReference(page,id,kind,2);await record(kind+'-native-wheel-progress',nativeWheel);expect(nativeWheel.wheel).toHaveLength(2);expect(nativeWheel.wheel.every(event=>event.trusted&&!event.cancelled)).toBe(true);await enter();
   const viewport=node.locator('cdk-virtual-scroll-viewport');await viewport.evaluate(element=>{const el=element as HTMLElement;(window as any).__fastWheelEvents=[];el.addEventListener('wheel',event=>{const nodes=event.composedPath().filter((node):node is HTMLElement=>node instanceof HTMLElement);(window as any).__fastWheelEvents.push({time:performance.now(),event,trusted:event.isTrusted,deltaY:event.deltaY,x:event.clientX,y:event.clientY,nodes,before:nodes.map(node=>({tag:node.tagName,role:node.getAttribute('role'),col:node.getAttribute('aria-colindex'),top:node.scrollTop,height:node.scrollHeight,client:node.clientHeight,overflow:getComputedStyle(node).overflowY}))});});});
   const target=async(textCell:boolean)=>viewport.evaluate((element,textCell)=>{const el=element as HTMLElement,bounds=el.getBoundingClientRect(),clip={left:Math.max(0,bounds.left+el.clientLeft),top:Math.max(0,bounds.top+el.clientTop),right:Math.min(innerWidth,bounds.left+el.clientLeft+el.clientWidth),bottom:Math.min(innerHeight,bounds.top+el.clientTop+el.clientHeight)};
    if(!textCell)return {...clip,x:clip.left+Math.min(3,(clip.right-clip.left)/4),y:(clip.top+clip.bottom)/2,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,hitOwned:true};
    const cells=[...el.querySelectorAll<HTMLElement>('[role=cell][aria-colindex="2"]')].filter(cell=>cell.closest('cdk-virtual-scroll-viewport')===el).map(cell=>{const box=cell.getBoundingClientRect(),left=Math.max(clip.left,box.left),top=Math.max(clip.top,box.top),right=Math.min(clip.right,box.right),bottom=Math.min(clip.bottom,box.bottom);return {cell,left,top,right,bottom,area:Math.max(0,right-left)*Math.max(0,bottom-top)};}).filter(candidate=>candidate.area>0).sort((a,b)=>b.area-a.area),candidate=cells[0];if(!candidate)return null;const {cell,left,top,right,bottom}=candidate,x=(left+right)/2,y=(top+bottom)/2,hit=document.elementFromPoint(x,y);return {left,top,right,bottom,x,y,scrollHeight:cell.scrollHeight,clientHeight:cell.clientHeight,hitOwned:hit===cell||!!hit&&cell.contains(hit)};
   },textCell);
   if(kind==='table'){
    const firstTarget=await target(false);expect(firstTarget).toBeTruthy();expect(firstTarget!.right).toBeGreaterThan(firstTarget!.left);expect(firstTarget!.bottom).toBeGreaterThan(firstTarget!.top);await page.mouse.move(firstTarget!.x,firstTarget!.y);await page.mouse.wheel(0,1_000_000);await expect.poll(async()=>(await read()).wheel.length).toBe(1);
    const first=await read(),viewportIndex=first.wheel[0]!.before.findIndex((ancestor:any)=>ancestor.tag==='CDK-VIRTUAL-SCROLL-VIEWPORT'),overflow=first.wheel[0]!.before.slice(0,viewportIndex).some((ancestor:any)=>ancestor.height>ancestor.client&&/auto|scroll/.test(ancestor.overflow));if(overflow)await expect.poll(async()=>{const current=await read(),event=current.wheel[0]!;return current.top>0||event.after.slice(0,viewportIndex).some((ancestor:any,index:number)=>ancestor.top>event.before[index].top);},{message:'first editor-cell wheel advances a local scrolling ancestor or the viewport'}).toBe(true);await record('table-first-editor-wheel-diagnostic',{target:firstTarget,localVerticalOverflow:overflow,state:await read()});
   }
   const wheelTarget=await target(kind==='table');expect(wheelTarget,'wheel setup has a visible target').toBeTruthy();expect(wheelTarget!.right,'wheel setup has visible width').toBeGreaterThan(wheelTarget!.left);expect(wheelTarget!.bottom,'wheel setup has visible height').toBeGreaterThan(wheelTarget!.top);expect(wheelTarget!.hitOwned,'wheel targets the painted text cell').toBe(true);if(kind==='table')expect(wheelTarget!.scrollHeight,'text cell has no local vertical overflow').toBeLessThanOrEqual(wheelTarget!.clientHeight);await record(kind+'-wheel-target',wheelTarget);
   for(let gesture=0;gesture<2;gesture++){
    const currentTarget=await target(kind==='table');expect(currentTarget,'each gesture has a visible content target').toBeTruthy();expect(currentTarget!.hitOwned).toBe(true);const before=await read();await page.mouse.move(currentTarget!.x,currentTarget!.y);await page.mouse.wheel(0,1_000_000);await expect.poll(async()=>{const current=await read();return current.top>before.top||Math.abs(current.top-current.max)<=1;},{message:kind+': trusted wheel advances the viewport or retains its real end'}).toBe(true);
    if(Math.abs(nativeWheel.steps[gesture]!-nativeWheel.max)<=1)await atEnd('trusted-wheel native-end');
    else await expect.poll(async()=>{const current=await read();return current.top>0&&current.top<current.max;},{message:kind+': wheel preserves the native partial-progress category'}).toBe(true);
    await expect.poll(async()=>{const current=await read(),height=await page.evaluate(({id,kind})=>{const instance=(window as any).__runtime.instance(id);return (kind==='list'?instance.list():instance.table()).rowSize();},{id,kind}),first=Math.floor(current.top/height),last=Math.min(999,Math.floor((current.top+before.viewport.height-2)/height));return current.range.start<=first&&current.range.end>last&&current.dom.length===current.range.end-current.range.start&&current.dom.every((index:number,offset:number)=>index===current.range.start+offset)&&current.dom.length<=current.limit;},{message:kind+': native wheel scroll position is covered by a contiguous bounded public range'}).toBe(true);
   }
   const released=await read();expect(released.dom,'the two bounded gestures actually evict the original editor row').not.toContain(0);const wheels=released.wheel;expect(wheels.length,'each bounded native wheel gesture is captured').toBe(kind==='table'?3:2);expect(wheels.every((event:any)=>event.trusted&&!event.cancelled),'wheel release uses trusted uncancelled native input').toBe(true);await expect.poll(async()=>(await read()).active,{message:kind+': trusted wheel recycling leaves a viewport fallback'}).toBe('viewport');await record(kind+'-trusted-wheel-end',await read());
   await page.locator('#runtime-anchor').focus();await scroll('start');await expect.poll(async()=>(await read()).dom[0]).toBe(0);expect((await read()).active).toBe('runtime-anchor');await update(page,id,{rows:rows(3),disabled:true});expect((await read()).active).toBe('runtime-anchor');
  },async()=>{if(page.isClosed())await record(kind+'-release-final-state',{unexpectedPageClosed:true});else try{await record(kind+'-release-final-state',{unexpectedPageClosed:false,state:await read()});}catch(error){await record(kind+'-release-final-state-error',String(error));}await record(kind+'-release-native-tab',log);await disposeProbe(page);});
  await destroy(page,id);expect(await page.evaluate(()=>document.activeElement?.id)).toBe('runtime-anchor');
 }
});
