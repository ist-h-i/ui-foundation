import {runWithLifecycleCleanup} from './runtime-lifecycle';
import {type Page} from '@playwright/test';
import {test,expect,contexts,ready,environment,settle,create,host,destroy,record,update} from './css-override-test';

type Kind='list'|'table';
type Mode='controls'|'none'|'hidden'|'disabled'|'negative'|'radio'|'checkedradio';
const rows=(count:number,stops:readonly number[])=>Array.from({length:count},(_,id)=>({id,name:`申請 ${id}`,amount:id,mode:(stops.includes(id)?'controls':(['none','hidden','disabled','negative'] as const)[id%4]) as Mode}));
interface Sample{active:string;range:{start:number;end:number};dom:number[];limit:number;maxLive:number;key:{active:string;trusted:boolean;backwards:boolean;cancelled:boolean};}
interface Expected{active:string;backwards:boolean;cancelled:boolean;}
/** Captures identities/ranges only. Native keyboard IPC is the only work between keys. */
async function install(page:Page,id:number,kind:Kind){await page.evaluate(({id,kind})=>{
 const root=document.querySelector<HTMLElement>(`[data-runtime-id="${id}"]`)!,instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table(),viewport=component.viewport(),element=viewport.elementRef.nativeElement as HTMLElement;
 const index=(row:Element)=>kind==='list'?Number(row.getAttribute('aria-posinset'))-1:Number(row.getAttribute('aria-rowindex'))-2;
 const identify=(node:Element|null):string=>{
  if(!node)return 'null';if(node===document.body)return 'BODY';if(node===element)return 'viewport';const boundary=node.getAttribute('data-sparse-boundary');if(boundary)return boundary;
  const row=node.closest('.ui-virtual-row,[data-virtual-row-key]');if(root.contains(node)&&row)return `row:${index(row)}:${node===row?'row':node.getAttribute('data-sparse-control')??('cell'+node.getAttribute('aria-colindex'))}`;
  return node.id||'external:'+node.tagName;
 };
 let event:KeyboardEvent|null=null,key={active:'',trusted:false,backwards:false,cancelled:false};const events:Sample[]=[];
 // Reconstruct row-node membership in mutation order, including rows created and
 // removed in one keydown. This reads no layout and does not wait for a frame.
 const selector='.ui-virtual-row,[data-virtual-row-key]',live=new Set<Element>(element.querySelectorAll(selector));let tracking=false,maxLive=live.size;
 const rowNodes=(node:Node):Element[]=>node instanceof Element?[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]:[];
 const mutations=(records:MutationRecord[])=>{for(const mutation of records){for(const node of mutation.removedNodes)for(const row of rowNodes(node))live.delete(row);for(const node of mutation.addedNodes)for(const row of rowNodes(node))live.add(row);if(tracking)maxLive=Math.max(maxLive,live.size);}};
 const observer=new MutationObserver(mutations);observer.observe(element,{childList:true,subtree:true});
 const read=():Sample=>({active:identify(document.activeElement),range:viewport.getRenderedRange(),dom:[...element.querySelectorAll('.ui-virtual-row,[data-virtual-row-key]')].filter(row=>row.closest('cdk-virtual-scroll-viewport')===element).map(index),limit:Math.ceil(viewport.getViewportSize()/component.rowSize())+2*(component.overscan()+1)+2,maxLive,key:{...key,cancelled:event?.defaultPrevented??false}});
 const down=(next:KeyboardEvent)=>{if(next.key==='Tab'){mutations(observer.takeRecords());tracking=true;maxLive=live.size;event=next;key={active:identify(document.activeElement),trusted:next.isTrusted,backwards:next.shiftKey,cancelled:next.defaultPrevented};}},up=(next:KeyboardEvent)=>{if(next.key==='Tab'){mutations(observer.takeRecords());events.push(read());tracking=false;}};document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);
 (window as any).__sparseTab={read,drain:()=>events.splice(0),dispose:()=>{observer.disconnect();document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);}};
 },{id,kind});}
async function burst(page:Page,expected:readonly Expected[],log:Sample[]){
 for(const key of expected)await page.keyboard.press(key.backwards?'Shift+Tab':'Tab');
 const samples:Sample[]=await page.evaluate(()=>(window as any).__sparseTab.drain());log.push(...samples);expect(samples.length,'one keyup per trusted Tab').toBe(expected.length);
 for(const [index,key] of expected.entries()){
  const sample=samples[index]!;expect(sample.key.trusted).toBe(true);expect(sample.key.backwards).toBe(key.backwards);expect(sample.key.cancelled,'the browser keeps its native Tab default').toBe(key.cancelled);
  expect(sample.active,`Tab from ${sample.key.active}; range ${sample.range.start}..${sample.range.end}; DOM ${sample.dom}`).toBe(key.active);
  expect(sample.maxLive,'transient row creation during a keydown stays bounded').toBeLessThanOrEqual(sample.limit);expect(sample.dom.length,'sparse scanning keeps the live row DOM bounded').toBeLessThanOrEqual(sample.limit);expect(sample.range.end-sample.range.start,'sparse scanning keeps the rendered range bounded').toBeLessThanOrEqual(sample.limit);
 }
}
const key=(active:string,backwards=false,cancelled=false):Expected=>({active,backwards,cancelled});
async function paint(page:Page,id:number,kind:Kind,label:string){
 const metric=await page.evaluate(({id,kind})=>{const instance=(window as any).__runtime.instance(id),component=kind==='list'?instance.list():instance.table(),viewport=component.viewport(),element=viewport.elementRef.nativeElement as HTMLElement,active=document.activeElement as HTMLElement,box=active.getBoundingClientRect(),bounds=element.getBoundingClientRect(),range=viewport.getRenderedRange(),ownedWindow=element.querySelector<HTMLElement>('.ui-virtual-window')!,cdk=element.querySelector<HTMLElement>('.cdk-virtual-scroll-content-wrapper')!,left=Math.max(box.left,bounds.left+element.clientLeft,0),right=Math.min(box.right,bounds.left+element.clientLeft+element.clientWidth,innerWidth),top=Math.max(box.top,bounds.top+element.clientTop,0),bottom=Math.min(box.bottom,bounds.top+element.clientTop+element.clientHeight,innerHeight),hit=right>left&&bottom>top?document.elementFromPoint((left+right)/2,(top+bottom)/2):null;return {range,firstDom:Math.min(...[...element.querySelectorAll('.ui-virtual-row,[data-virtual-row-key]')].filter(row=>row.closest('cdk-virtual-scroll-viewport')===element).map(row=>kind==='list'?Number(row.getAttribute('aria-posinset'))-1:Number(row.getAttribute('aria-rowindex'))-2)),rowSize:component.rowSize(),windowOffset:parseFloat(getComputedStyle(ownedWindow).paddingBlockStart)||0,cdkOffset:new DOMMatrixReadOnly(getComputedStyle(cdk).transform).m42,visible:element.contains(active)&&right>left&&bottom>top,painted:hit===active||!!hit&&active.contains(hit),active:active.outerHTML,box:box.toJSON(),bounds:bounds.toJSON()};},{id,kind});
 await record(label,metric);expect(metric.visible,label+': the native focused control intersects its viewport').toBe(true);expect(metric.painted,label+': the focused control owns its visible center hit point').toBe(true);expect(Math.abs(metric.windowOffset-metric.firstDom*metric.rowSize)).toBeLessThanOrEqual(1);expect(metric.cdkOffset).toBe(0);
}
async function dispose(page:Page){if(!page.isClosed())await page.evaluate(()=>(window as any).__sparseTab.dispose());}

/** Listener-free row with identical CSS: browsers may add overflow-container
 * stops or omit links according to native keyboard settings. Setup only. */
async function nativeRowOrder(page:Page,id:number,kind:Kind='list'):Promise<string[]>{
 await host(page,id).evaluate(root=>{
  const source=root.querySelector<HTMLElement>('cdk-virtual-scroll-viewport')!,row=source.querySelector<HTMLElement>('.ui-virtual-row,[data-virtual-row-key]')!,reference=document.createElement('div'),before=document.createElement('button'),after=document.createElement('button'),viewport=source.cloneNode(false) as HTMLElement,copy=row.cloneNode(true) as HTMLElement;
  reference.id='sparse-row-reference';reference.style.width=source.getBoundingClientRect().width+'px';before.type=after.type='button';before.textContent='参照の前';after.textContent='参照の後';viewport.append(copy);reference.append(before,viewport,after);root.before(reference);
  const inert=root.getAttribute('inert');root.setAttribute('inert','');const trace:{active:string;trusted:boolean;cancelled:boolean}[]=[];let key:KeyboardEvent|null=null,done=false;
  const down=(event:KeyboardEvent)=>{if(event.key==='Tab')key=event;},up=(event:KeyboardEvent)=>{if(event.key!=='Tab'||done)return;const active=document.activeElement;let name=active===viewport?'viewport':active===after?'after':active===copy?'row':active instanceof Element&&copy.contains(active)?active.getAttribute('data-sparse-control')??'cell'+active.getAttribute('aria-colindex'):'outside';trace.push({active:name,trusted:event.isTrusted,cancelled:key?.defaultPrevented??false});if(active===after)done=true;};
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);(window as any).__sparseRowReference={trace,dispose:()=>{document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);reference.remove();if(inert===null)root.removeAttribute('inert');else root.setAttribute('inert',inert);(window as any).__sparseTab.drain();}};before.focus();
 });
 let trace:{active:string;trusted:boolean;cancelled:boolean}[]=[];
 try{for(let index=0;index<12;index++)await page.keyboard.press('Tab');trace=await page.evaluate(()=>(window as any).__sparseRowReference.trace);}
 finally{await page.evaluate(()=>(window as any).__sparseRowReference.dispose());}
 expect(trace[0]?.active).toBe('viewport');expect(trace.at(-1)?.active).toBe('after');for(const key of trace){expect(key.trusted).toBe(true);expect(key.cancelled).toBe(false);}const order=trace.slice(1,-1).map(key=>key.active);expect(order).toContain('main');expect(order.indexOf('select')).toBeGreaterThan(order.indexOf('main'));expect(order).not.toContain('negative');expect(order).not.toContain('disabled');expect(order).not.toContain('hidden');
 if(kind==='table'){expect(order.filter(control=>/^cell[12]$/.test(control)),'both standard cells remain mandatory Tab stops').toEqual(['cell1','cell2']);expect(order.indexOf('cell1')).toBeLessThan(order.indexOf('main'));expect(order.indexOf('cell2')).toBeGreaterThan(order.indexOf('select'));}
 await record('sparse-native-row-reference',trace);return order;
}

// The gaps cover all four representations of a row with no sequential target:
// no control, hidden input, disabled button, and negative-tabindex input.
test('sparse native Tab list: A-D skips 498-row gaps in both directions and retains keyed drafts',async({page,lifecycle})=>{
 await ready(page,contexts[0]);const id=await create(page,'RuntimeSparseTab',{rows:rows(1000,[0,499,999]),mixed:true}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{for(const context of contexts){
  await environment(page,context);await update(page,id,{itemHeight:context.width===320?220:null,overscan:context.width===320?0:2});const order=await nativeRowOrder(page,id),main=order.indexOf('main'),row=(id:number)=>order.map(control=>key(`row:${id}:${control}`)),beforeMain=(id:number)=>row(id).slice(0,main+1),afterMain=(id:number)=>row(id).slice(main+1),reverse=(keys:Expected[])=>[...keys].reverse().map(next=>key(next.active,true));await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),...beforeMain(0)],log);
  await page.keyboard.insertText('先頭の保存 '+context.name);const first=await node.locator('.ui-virtual-row[aria-posinset="1"] [data-sparse-control="main"]').inputValue();
  await burst(page,[...afterMain(0),...row(499),...beforeMain(999)],log);await paint(page,id,'list',context.name+'-forward-long-gaps');
  await page.keyboard.insertText('末尾の保存 '+context.name);const last=await node.locator('.ui-virtual-row[aria-posinset="1000"] [data-sparse-control="main"]').inputValue();await burst(page,[...afterMain(999),key('after')],log);
  await burst(page,[...reverse(row(999)),...reverse(row(499)),...reverse(row(0).slice(main))],log);await paint(page,id,'list',context.name+'-backward-long-gaps');expect(await node.locator('.ui-virtual-row[aria-posinset="1"] [data-sparse-control="main"]').inputValue(),'recycled first row restores its key-owned draft').toBe(first);
  await burst(page,[...afterMain(0),...row(499),...beforeMain(999)],log);expect(await node.locator('.ui-virtual-row[aria-posinset="1000"] [data-sparse-control="main"]').inputValue(),'recycled final row restores its key-owned draft').toBe(last);
  await burst(page,[...reverse(row(999).slice(0,main)),...reverse(row(499)),...reverse(row(0)),key('viewport',true),key('before',true)],log);
 }},async()=>{try{await record('sparse-list-A-D-native-keyups',log);}finally{await dispose(page);}});await destroy(page,id);
});

/** Clone a complete collection without Angular or virtual-scroll listeners. The
 * same engine decides whether an overflowing row is a sequential Tab target. */
async function nativeScrollingOrder(page:Page,id:number,count:number,projected:boolean,isolated:{index:number;html:string}|null=null){
 await host(page,id).evaluate((root,{count,projected,isolated})=>{
  const source=root.querySelector<HTMLElement>('cdk-virtual-scroll-viewport')!,first=source.querySelector<HTMLElement>('[data-ui-virtual-index="0"]')!,empty=source.querySelector<HTMLElement>('[data-ui-virtual-index="1"]')!,reference=document.createElement('div'),viewport=source.cloneNode(false) as HTMLElement;
  reference.id='sparse-scrolling-reference';reference.style.width=source.getBoundingClientRect().width+'px';
  const before=document.createElement('button'),after=document.createElement('button');before.textContent='参照の前';after.textContent='参照の後';before.dataset['sparseBoundary']='before';after.dataset['sparseBoundary']='after';
  const isolatedTemplate=document.createElement('template');if(isolated)isolatedTemplate.innerHTML=isolated.html;
  for(let index=0;index<count;index++){
   const row=(isolated?.index===index?isolatedTemplate.content.firstElementChild!:index===0||index===count-1?first:empty).cloneNode(true) as HTMLElement;row.dataset['uiVirtualIndex']=String(index);row.setAttribute('aria-posinset',String(index+1));
   if(projected&&!isolated&&index>0&&index<count-1){
    const scroller=row.querySelector<HTMLElement>('[data-sparse-control="scroll"]')!,state=(index-1)%5;
    if(state===1)scroller.tabIndex=-1;else if(state===2)scroller.hidden=true;else if(state===3)scroller.inert=true;else if(state===4){const button=document.createElement('button');for(const attribute of scroller.attributes)button.setAttribute(attribute.name,attribute.value);button.disabled=true;button.textContent=scroller.textContent;scroller.replaceWith(button);}
   }
   viewport.append(row);
  }
  reference.append(before,viewport,after);root.before(reference);root.setAttribute('inert','');
  const identify=(node:Element|null):string=>{if(node===viewport)return 'viewport';if(node===before)return 'before';if(node===after)return 'after';const row=node?.closest<HTMLElement>('[data-ui-virtual-index]');return row?`row:${row.dataset['uiVirtualIndex']}:${node===row?'row':node?.getAttribute('data-sparse-control')}`:'outside';};
  const trace:{active:string;trusted:boolean;backwards:boolean;cancelled:boolean}[]=[];let down:KeyboardEvent|null=null;
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Tab')down=event;},keyup=(event:KeyboardEvent)=>{if(event.key==='Tab')trace.push({active:identify(document.activeElement),trusted:event.isTrusted,backwards:event.shiftKey,cancelled:down?.defaultPrevented??false});};
  document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',keyup,true);
  const metric=(element:HTMLElement)=>({tabindex:element.getAttribute('tabindex'),tabIndex:element.tabIndex,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,overflow:getComputedStyle(element).overflow,hidden:element.hidden,inert:element.inert,disabled:element.matches(':disabled')});
  const metrics=[...viewport.querySelectorAll<HTMLElement>('[data-ui-virtual-index]')].map(row=>{const scroller=row.querySelector<HTMLElement>('[data-sparse-control="scroll"]');return {index:Number(row.dataset['uiVirtualIndex']),...metric(row),focusableChildren:row.querySelectorAll('input,button,[tabindex]').length,scroller:scroller?metric(scroller):null};});
  (window as any).__sparseScrollingReference={metrics,trace,focus:(index:number)=>viewport.querySelector<HTMLElement>(`[data-ui-virtual-index="${index}"] [data-sparse-control="main"]`)!.focus(),dispose:()=>{document.removeEventListener('keydown',keydown,true);document.removeEventListener('keyup',keyup,true);reference.remove();root.removeAttribute('inert');(window as any).__sparseTab.drain();}};
  (window as any).__sparseScrollingReference.focus(0);
 },{count,projected,isolated});
 const trace:{active:string;trusted:boolean;backwards:boolean;cancelled:boolean}[]=[];
 try{
  for(const backwards of [false,true]){
   if(backwards)await page.evaluate((count:number)=>(window as any).__sparseScrollingReference.focus(count-1),count);
   for(let index=0;index<count+4;index++){
    await page.keyboard.press(backwards?'Shift+Tab':'Tab');
    const sample=await page.evaluate(()=>(window as any).__sparseScrollingReference.trace.at(-1));trace.push(sample);
    if(sample.active===`row:${backwards?0:count-1}:main`)break;
   }
  }
  const metrics=await page.evaluate(()=>(window as any).__sparseScrollingReference.metrics);await record('implicit-scrolling-native-reference',{metrics,trace});
  for(const sample of trace){expect(sample.trusted).toBe(true);expect(sample.cancelled).toBe(false);}
  expect(trace.filter(sample=>!sample.backwards).at(-1)?.active).toBe(`row:${count-1}:main`);expect(trace.filter(sample=>sample.backwards).at(-1)?.active).toBe('row:0:main');
  const candidateRow=metrics[isolated?.index??1],candidate=projected?candidateRow.scroller:candidateRow;expect(candidate.tabindex).toBeNull();expect(candidate.scrollHeight).toBeGreaterThan(candidate.clientHeight);
  if(projected){expect(candidateRow.scrollHeight,'only the projected element overflows').toBeLessThanOrEqual(candidateRow.clientHeight);for(const sample of trace){const match=/^row:(\d+):scroll$/.exec(sample.active);if(match){if(isolated)expect(Number(match[1])).toBe(isolated.index);else expect([0,4],'negative, hidden and inert scrollers do not enter the native sequence; disabled scrollers follow the engine oracle').toContain((Number(match[1])-1)%5);}}}
  else expect(metrics[1].focusableChildren).toBe(0);
  return trace;
 }finally{await page.evaluate(()=>(window as any).__sparseScrollingReference.dispose());}
}

for(const projected of [false,true])test(`sparse native Tab implicit scrolling: ${projected?'projected scrollers and native guards':'overflowing rows'} match the native reference in both directions`,async({page,browser,lifecycle})=>{
 await page.setViewportSize({width:320,height:1000});await page.goto('/catalog/static-runtime');await expect.poll(()=>page.evaluate(()=>typeof(window as any).__runtime?.create)).toBe('function');
 const count=20,states=[undefined,'negative','hidden','inert','disabled'],data=Array.from({length:count},(_,id)=>({id,name:id===0||id===count-1?`申請 ${id}`:'長い内容を行内で読み進めるための文章。'.repeat(300),amount:id,mode:id===0||id===count-1?'controls':projected?'scroll':'none',scrollState:projected?states[(id-1)%states.length]:undefined}));
 const id=await create(page,'RuntimeSparseTab',{rows:data,itemHeight:220,overscan:0}),node=host(page,id),log:Sample[]=[];
 await expect.poll(()=>node.locator(`[data-ui-virtual-index="1"]${projected?' [data-sparse-control="scroll"]':''}`).evaluate(row=>row.scrollHeight>row.clientHeight)).toBe(true);await install(page,id,'list');
 await record('implicit-scrolling-engine',{name:browser.browserType().name(),version:browser.version(),userAgent:await page.evaluate(()=>navigator.userAgent)});
 await runWithLifecycleCleanup(lifecycle,async()=>{
  const native=await nativeScrollingOrder(page,id,count,projected);
  for(const backwards of [false,true]){
   if(backwards)await page.evaluate(({id,count})=>(window as any).__runtime.instance(id).list().scrollToOffset((count-1)*220),{id,count});
   await node.locator(`[data-ui-virtual-index="${backwards?count-1:0}"] [data-sparse-control="main"]`).focus();
   const sequence=native.filter(sample=>sample.backwards===backwards).map(sample=>key(sample.active,backwards));await burst(page,sequence,log);
  }
 },async()=>{try{await record('implicit-scrolling-virtual-native-keyups',log);}finally{await dispose(page);}});
 await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(node).toHaveCount(0);
});

test('sparse native Tab implicit scrolling: isolated disabled scroller across 498-row gaps matches the native engine',async({page,browser,lifecycle})=>{
 await page.setViewportSize({width:320,height:1000});await page.goto('/catalog/static-runtime');await expect.poll(()=>page.evaluate(()=>typeof(window as any).__runtime?.create)).toBe('function');
 const count=1000,index=499,data=Array.from({length:count},(_,id)=>({id,name:id===index?'長い内容を行内で読み進めるための文章。'.repeat(300):`申請 ${id}`,amount:id,mode:id===0||id===count-1?'controls':id===index?'scroll':'none',scrollState:id===index?'disabled':undefined}));
 const id=await create(page,'RuntimeSparseTab',{rows:data,itemHeight:220,overscan:0}),node=host(page,id),log:Sample[]=[];
 await expect(node.locator('[data-ui-virtual-index="0"]')).toHaveCount(1);await page.evaluate(({id,index})=>(window as any).__runtime.instance(id).list().scrollToOffset(index*220),{id,index});
 const isolated=node.locator(`[data-ui-virtual-index="${index}"]`);await expect.poll(()=>isolated.locator('[data-sparse-control="scroll"]').evaluate(element=>element.scrollHeight>element.clientHeight)).toBe(true);const html=await isolated.evaluate(row=>row.outerHTML);
 await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToOffset(0),id);await expect(node.locator('[data-ui-virtual-index="0"]')).toHaveCount(1);await install(page,id,'list');
 await record('implicit-scrolling-engine',{name:browser.browserType().name(),version:browser.version(),userAgent:await page.evaluate(()=>navigator.userAgent)});
 await runWithLifecycleCleanup(lifecycle,async()=>{
  const native=await nativeScrollingOrder(page,id,count,true,{index,html});
  for(const backwards of [false,true]){
   if(backwards)await page.evaluate(({id,count})=>(window as any).__runtime.instance(id).list().scrollToOffset((count-1)*220),{id,count});
   await node.locator(`[data-ui-virtual-index="${backwards?count-1:0}"] [data-sparse-control="main"]`).focus();await burst(page,native.filter(sample=>sample.backwards===backwards).map(sample=>key(sample.active,backwards)),log);
  }
 },async()=>{try{await record('implicit-scrolling-virtual-native-keyups',log);}finally{await dispose(page);}});
 await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(node).toHaveCount(0);
});

test('sparse native Tab list: leading and trailing empty rows preserve true entry and exit',async({page,lifecycle})=>{
 await ready(page,contexts[2]);const id=await create(page,'RuntimeSparseTab',{rows:rows(1000,[123,511,876]),itemHeight:220,overscan:0}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{
  await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),key('row:123:main'),key('row:511:main'),key('row:876:main')],log);await paint(page,id,'list','leading-trailing-forward');await burst(page,[key('after'),key('row:876:main',true),key('row:511:main',true),key('row:123:main',true)],log);await paint(page,id,'list','leading-trailing-backward');await burst(page,[key('viewport',true),key('before',true)],log);
  // A data replacement at the same instance changes the valid stop set. Outside
  // focus remains outside; a fresh entry must not reuse the old stop cache.
  await node.locator('[data-sparse-boundary="after"]').focus();await update(page,id,{rows:rows(1000,[77,700])});await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToOffset(0),id);await settle(page);expect(await page.evaluate(()=>document.activeElement?.getAttribute('data-sparse-boundary'))).toBe('after');
  await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),key('row:77:main'),key('row:700:main'),key('after'),key('row:700:main',true),key('row:77:main',true),key('viewport',true),key('before',true)],log);
 },async()=>{try{await record('sparse-list-leading-trailing-native-keyups',log);}finally{await dispose(page);}});await destroy(page,id);
});

test('sparse native Tab list: A-D all-empty projections exit once without a hidden or disabled stop',async({page,lifecycle})=>{
 await ready(page,contexts[0]);const id=await create(page,'RuntimeSparseTab',{rows:rows(1000,[])}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{for(const context of contexts){await environment(page,context);await update(page,id,{itemHeight:context.width===320?220:null,overscan:context.width===320?0:2});await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),key('after'),key('viewport',true),key('before',true)],log);}}
 ,async()=>{try{await record('sparse-list-all-empty-native-keyups',log);}finally{await dispose(page);}});await destroy(page,id);
});

test('sparse native Tab table: standard cells remain stops in rows whose projected controls are empty',async({page,lifecycle})=>{
 await ready(page,contexts[0]);const count=40,stops=[0,19,39],id=await create(page,'RuntimeSparseTab',{kind:'table',rows:rows(count,stops),mixed:true}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'table');
 await runWithLifecycleCleanup(lifecycle,async()=>{for(const context of contexts){await environment(page,context);await update(page,id,{itemHeight:context.width===320?220:null,overscan:context.width===320?0:2});const order=await nativeRowOrder(page,id,'table');await node.locator('[data-sparse-boundary="before"]').focus();
  const sequence=Array.from({length:count},(_,index)=>order.filter(control=>stops.includes(index)||/^cell[12]$/.test(control)).map(control=>key(`row:${index}:${control}`))).flat();
  await burst(page,[key('viewport'),...sequence],log);await paint(page,id,'table',context.name+'-sparse-table-forward');await burst(page,[key('after'),...[...sequence].reverse().map(next=>key(next.active,true))],log);await paint(page,id,'table',context.name+'-sparse-table-backward');await burst(page,[key('viewport',true),key('before',true)],log);
 }},async()=>{try{await record('sparse-table-A-D-native-keyups',log);}finally{await dispose(page);}});await destroy(page,id);
});

test('sparse native Tab guards: consumed and composing or modified keys do not start scanning; outside focus survives removal',async({page,lifecycle})=>{
 await ready(page,contexts[2]);const id=await create(page,'RuntimeSparseTab',{rows:rows(1000,[0,999]),itemHeight:220,overscan:0}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{
  await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),key('row:0:main')],log);await page.locator('[data-sparse-control="main"]').evaluate(element=>element.addEventListener('keydown',event=>event.preventDefault(),{once:true}));await burst(page,[key('row:0:main',false,true)],log);
  const guards=await page.evaluate(id=>{const viewport=(window as any).__runtime.instance(id).list().viewport(),target=document.activeElement as HTMLElement;return [{isComposing:true},{keyCode:229},{altKey:true},{ctrlKey:true},{metaKey:true}].map(init=>{const before=JSON.stringify(viewport.getRenderedRange()),event=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true,...init});target.dispatchEvent(event);return {init,cancelled:event.defaultPrevented,sameActive:document.activeElement===target,sameRange:JSON.stringify(viewport.getRenderedRange())===before};});},id);
  for(const guard of guards){expect(guard.cancelled).toBe(false);expect(guard.sameActive).toBe(true);expect(guard.sameRange).toBe(true);}await record('sparse-guard-synthetic-handler-delegation',guards);
  await burst(page,[key('row:999:main')],log);await paint(page,id,'list','guard-release-can-cross-gap');await node.locator('[data-sparse-boundary="after"]').focus();await update(page,id,{rows:[],disabled:true});expect(await page.evaluate(()=>document.activeElement?.getAttribute('data-sparse-boundary'))).toBe('after');await page.locator('#runtime-anchor').focus();
 },async()=>{try{await record('sparse-guard-native-keyups',log);}finally{await dispose(page);}});await destroy(page,id);expect(await page.evaluate(()=>document.activeElement?.id)).toBe('runtime-anchor');
});


// A checked native radio makes the unchecked member of its named group absent
// from sequential focus navigation. An unvirtualized reference fixes that oracle.
test('sparse native Tab radio group: forward skips an unchecked member while its checked peer is retained',async({page,lifecycle})=>{
 await ready(page,contexts[0]);const data=rows(1000,[499]);data[0]!.mode='checkedradio';data[1]!.mode='radio';
 const id=await create(page,'RuntimeSparseTab',{rows:data,itemHeight:220,overscan:0,radioName:'sparse-virtual-reference-group'}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{
  await page.evaluate(()=>{const reference=document.createElement('div');reference.id='sparse-native-reference';reference.innerHTML='<button id="sparse-reference-before">前</button><input id="sparse-reference-radio-0" aria-label="参照選択済み" type="radio" name="sparse-native-reference-group" checked><input id="sparse-reference-radio-1" aria-label="参照未選択" type="radio" name="sparse-native-reference-group"><input id="sparse-reference-input-499" aria-label="参照入力"><button id="sparse-reference-after">後</button>';document.querySelector('#runtime-slot')!.before(reference);});
  for(const context of [contexts[0],contexts[2]]){
   await environment(page,context);
   await page.locator('#sparse-reference-before').focus();await burst(page,[key('sparse-reference-radio-0'),key('sparse-reference-input-499'),key('sparse-reference-after'),key('sparse-reference-input-499',true),key('sparse-reference-radio-0',true),key('sparse-reference-before',true)],log);
   await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToOffset(0),id);await settle(page);await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),key('row:0:radio'),key('row:499:main')],log);await paint(page,id,'list',context.name+'-radio-group-forward');
   await burst(page,[key('after')],log);
  }
 },async()=>{try{await record('sparse-radio-reference-and-virtual-native-keyups',log);}finally{await dispose(page);}});
 await page.locator('#sparse-native-reference').evaluate(element=>element.remove());await destroy(page,id);
});

// The controlled group retains selection while its checked row is recycled.
test('sparse native Tab radio group: reverse cross-row movement preserves the canonical selection',async({page,lifecycle})=>{
 await ready(page,contexts[0]);const data=rows(1000,[499]);data[0]!.mode='checkedradio';data[1]!.mode='radio';
 const id=await create(page,'RuntimeSparseTab',{rows:data,itemHeight:220,overscan:0}),node=host(page,id),log:Sample[]=[];await settle(page);await install(page,id,'list');
 await runWithLifecycleCleanup(lifecycle,async()=>{
  await node.locator('[data-sparse-boundary="before"]').focus();await burst(page,[key('viewport'),key('row:0:radio'),key('row:499:main'),key('after'),key('row:499:main',true)],log);
  await burst(page,[key('row:0:radio',true)],log);
 },async()=>{try{await record('controlled-reverse-cross-row-radio',log);}finally{await dispose(page);}});
 await destroy(page,id);
});
