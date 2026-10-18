import type {Locator,Page} from '@playwright/test';
import {test as sharedTest,expect,contexts,ready,environment,settle,create,host,update,destroy,record} from './css-override-test';

// These cases own a rendered WebKit browser so disposal closes that owner.
// Native context-only close stalls in the full device scenario (recorded separately).
// Keep default tracing, UI assertions, active runtime destruction and diagnostics.
const test=sharedTest.extend({context:async({context,browserName,playwright,launchOptions,headless,channel,trace},use,testInfo)=>{
 const owner=browserName==='webkit'?await playwright.webkit.launch({...launchOptions,headless,channel}):null;
 let actual=context,used=false;
 const mode=typeof trace==='string'?trace:trace.mode;
 const capturing=mode==='on'||mode==='retain-on-failure'||mode==='retain-on-failure-and-retries'
  ||mode==='on-first-retry'&&testInfo.retry===1||mode==='on-all-retries'&&testInfo.retry>0
  ||mode==='retain-on-first-failure'&&testInfo.retry===0;
 const errors:string[]=[];
 const pageError=(error:Error)=>errors.push(error.message),consoleMessage=(message:import('@playwright/test').ConsoleMessage)=>{if(message.type()==='warning'||message.type()==='error')errors.push(message.type()+': '+message.text());};
 try{
  if(owner)actual=await owner.newContext(); // Playwright Test applies the same public context options.
  actual.on('page',page=>{page.on('pageerror',pageError);page.on('console',consoleMessage);});
  used=true;await use(actual);
 }finally{
  try{
   if(used&&capturing){
    const tracePath=testInfo.outputPath('managed-trace.zip');await actual.tracing.stopChunk({path:tracePath});await testInfo.attach('trace',{path:tracePath,contentType:'application/zip'});
    await actual.tracing.startChunk({title:'managed fixture cleanup'});
   }
  }finally{
   if(owner){
    const connectedBeforeCleanup=owner.isConnected(),started=performance.now();await owner.close();
    expect(connectedBeforeCleanup,'owned browser survives assertion and trace work').toBe(true);expect(owner.isConnected()).toBe(false);expect(owner.contexts()).toHaveLength(0);
    await testInfo.attach('managed-owned-browser-close',{body:JSON.stringify({phase:'fixture-cleanup',connectedBeforeCleanup,browserConnected:owner.isConnected(),remainingContexts:owner.contexts().length,elapsedMs:performance.now()-started}),contentType:'application/json'});
   }
   expect(errors,'managed browser diagnostics including cleanup').toEqual([]);
  }
 }
}});

async function grow(page:Page,node:Locator,key:number,height:number){
 await node.locator(`[data-warning-grow="${key}"]`).evaluate((el,height)=>new Promise<void>(resolve=>requestAnimationFrame(()=>{(el as HTMLElement).style.height=height+'px';resolve();})),height);await settle(page);
}
async function geometry(editor:Locator){return editor.evaluate(el=>{
 const input=el as HTMLInputElement,vp=input.closest<HTMLElement>('.ui-data-table__viewport')!,table=vp.querySelector('table')!,row=input.closest('tr'),box=input.getBoundingClientRect(),style=getComputedStyle(input),ring=style.outlineStyle==='none'?0:Math.max(0,(parseFloat(style.outlineWidth)||0)+(parseFloat(style.outlineOffset)||0)),bounds=vp.getBoundingClientRect();
 const overlays=[...table.querySelectorAll<HTMLElement>(':scope > thead.ui-data-table__head--sticky,:scope > tfoot.ui-data-table__footer--sticky,:scope > tbody > tr[data-fixed-row]')].filter(node=>node!==row).map(node=>({side:node.dataset['fixedRow']??(node.tagName==='THEAD'?'start':'end'),box:node.getBoundingClientRect().toJSON()}));
 const top=Math.max(bounds.top+vp.clientTop,...overlays.filter(o=>o.side==='start').map(o=>o.box.bottom)),bottom=Math.min(bounds.top+vp.clientTop+vp.clientHeight,...overlays.filter(o=>o.side==='end').map(o=>o.box.top));
 return {focused:document.activeElement===input,value:input.value,selection:[input.selectionStart,input.selectionEnd,input.selectionDirection],outline:ring,box:box.toJSON(),top,bottom,scrollTop:vp.scrollTop,overlays,contained:box.top-ring>=top-1&&box.bottom+ring<=bottom+1};
 });}
async function retained(editor:Locator,original:Awaited<ReturnType<Locator['elementHandle']>>,label:string){
 try{await expect.poll(async()=>{const m=await geometry(editor);return m.focused&&m.contained;},{message:label+': native draft and complete focus outline remain in the unobscured body band'}).toBe(true);}finally{await record(label,await geometry(editor));}
 await expect(editor).toHaveValue('維持される管理下書き');expect(await original!.evaluate((el,label)=>el===document.querySelector(`[data-warning-draft="${label}"]`),label.split(':')[0]!)).toBe(true);
 const m=await geometry(editor);expect(m.selection.slice(0,2)).toEqual([0,'維持される管理下書き'.length]);
}

for(const context of contexts){
 test(`managed projected initial ${context.name}: focus alone reveals an ordinary input without native scrolling`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeP2NativeEditors',{}),node=host(page,id),editor=node.getByRole('textbox',{name:'申請 10',exact:true});await settle(page);
  // Isolate the table's focus response after geometry has settled. Suppressing
  // native focus scrolling makes the missing focus-trigger deterministic.
  const immediate=await editor.evaluate(el=>{const input=el as HTMLInputElement,vp=input.closest<HTMLElement>('.ui-data-table__viewport')!;vp.scrollTop=0;input.focus({preventScroll:true});input.select();const r=input.getBoundingClientRect(),s=getComputedStyle(input);return {focused:document.activeElement===input,value:input.value,selection:[input.selectionStart,input.selectionEnd],scrollTop:vp.scrollTop,hits:[r.left+2,(r.left+r.right)/2,r.right-2].map(x=>document.elementFromPoint(x,(r.top+r.bottom)/2)===input),focusVisible:input.matches(':focus-visible'),outlineStyle:s.outlineStyle};});
  await record('projected-focus-immediate-'+context.name,immediate);expect(immediate.focused).toBe(true);expect(immediate.scrollTop).toBeGreaterThan(0);expect(immediate.hits).toEqual([true,true,true]);expect(immediate.value).toBe('保持 10');expect(immediate.selection).toEqual([0,'保持 10'.length]);expect(immediate.focusVisible).toBe(true);expect(immediate.outlineStyle).not.toBe('none');const metric=await geometry(editor);expect(metric.contained).toBe(true);await record('projected-focus-band-'+context.name,metric);await destroy(page,id);
 });
 for(const mode of ['cell','row']as const){
 test(`managed table ${context.name} ${mode}: async fixed stacks preserve owned draft identity native selection and focus`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeWarningManagedTable',{mode}),node=host(page,id),row=node.locator('tbody > tr[data-row-key="10"]');
  if(mode==='cell')await row.locator('ui-cell-editor').getByRole('button',{name:'編集',exact:true}).click();else await row.getByRole('button',{name:'編集: 保持 10',exact:true}).click();
  const managed=node.locator(mode==='cell'?'ui-cell-editor[aria-label="氏名・保持 10"]':'ui-row-editor[aria-label="保持 10の行編集"]'),editor=managed.getByRole('textbox',{name:'氏名',exact:true}),label=`managed-${context.name}-${mode}`;
  await editor.fill('維持される管理下書き');await editor.press('ControlOrMeta+A');await editor.evaluate((el,label)=>(el as HTMLElement).dataset['warningDraft']=label,label);const original=await editor.elementHandle();
  await grow(page,node,0,240);await grow(page,node,19,220);await retained(editor,original,label+':grown');
  await grow(page,node,0,80);await grow(page,node,19,80);await retained(editor,original,label+':shrunk');
  for(const patch of [{stickyHeader:false,stickyFooter:false},{stickyHeader:true,stickyFooter:false},{stickyHeader:true,stickyFooter:true}]){await update(page,id,patch);await retained(editor,original,label+':sticky-'+JSON.stringify(patch));}
  await environment(page,context.name==='A'||context.name==='C'?contexts[1]:contexts[0]);await retained(editor,original,label+':environment');
  const outside=page.locator('#runtime-anchor');await outside.focus();await grow(page,node,0,260);await expect(outside).toBeFocused();await expect(editor).toHaveValue('維持される管理下書き');expect(await original!.evaluate(el=>el.isConnected)).toBe(true);await record(label+'-external-focus',{outsideFocused:await outside.evaluate(el=>el===document.activeElement),draft:await editor.inputValue()});
  // The full control cannot fit this deliberately constrained band. Repeated observer/render
  // passes must preserve native focus and stop rather than alternate between opposite edges.
  await editor.focus();await editor.press('ControlOrMeta+A');const previousMaximum=await node.locator('.ui-data-table__viewport').evaluate(el=>{const style=(el as HTMLElement).style,previous={value:style.getPropertyValue('max-block-size'),priority:style.getPropertyPriority('max-block-size')};style.setProperty('max-block-size','300px','important');return previous;});await editor.evaluate(el=>(el as HTMLElement).style.height='600px');await settle(page);
  const samples=await editor.evaluate(el=>new Promise<number[]>(resolve=>{const vp=el.closest<HTMLElement>('.ui-data-table__viewport')!,values:number[]=[];const next=()=>{values.push(vp.scrollTop);if(values.length===10)resolve(values);else requestAnimationFrame(next);};requestAnimationFrame(next);}));
  expect(Math.max(...samples)-Math.min(...samples),'oversized focused editor does not oscillate').toBeLessThanOrEqual(1);await expect(editor).toBeFocused();await expect(editor).toHaveValue('維持される管理下書き');await record(label+'-oversized',{samples,metric:await geometry(editor)});
  await editor.evaluate(el=>(el as HTMLElement).style.removeProperty('height'));await node.locator('.ui-data-table__viewport').evaluate((el,previous)=>{const style=(el as HTMLElement).style;if(previous.value)style.setProperty('max-block-size',previous.value,previous.priority);else style.removeProperty('max-block-size');},previousMaximum);await settle(page);await retained(editor,original,label+':restored-after-oversized');
  await destroy(page,id);await original!.dispose();
 });
}
 test(`managed table ${context.name}: a foreign nested owner keeps its own focus and scroll responsibility`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeWarningManagedTable',{}),node=host(page,id);
  await node.locator('[data-warning-grow="10"]').evaluate(el=>{const table=document.createElement('table');table.setAttribute('data-table-owner','');table.setAttribute('aria-label','独立した入れ子表');const input=document.createElement('input');input.setAttribute('aria-label','入れ子の入力');input.value='独立した下書き';table.insertRow().insertCell().append(input);el.append(table);input.focus({preventScroll:true});const vp=el.closest<HTMLElement>('.ui-data-table__viewport')!;vp.style.overflowAnchor='none';vp.scrollTop=0;let descriptor:PropertyDescriptor|undefined;for(let proto=Object.getPrototypeOf(vp);proto&&!descriptor;proto=Object.getPrototypeOf(proto))descriptor=Object.getOwnPropertyDescriptor(proto,'scrollTop');const writes:number[]=[];(vp as any).__warningForeignScrollWrites=writes;Object.defineProperty(vp,'scrollTop',{configurable:true,get(){return descriptor!.get!.call(vp);},set(value:number){writes.push(value);descriptor!.set!.call(vp,value);}});});
  const foreign=node.getByRole('textbox',{name:'入れ子の入力'});await expect(foreign).toBeFocused();await grow(page,node,0,240);await grow(page,node,19,220);await expect(foreign).toBeFocused();await expect(foreign).toHaveValue('独立した下書き');
  const metric=await foreign.evaluate(el=>({scrollTop:el.closest<HTMLElement>('.ui-data-table__viewport')!.scrollTop,writes:(el.closest('.ui-data-table__viewport') as any).__warningForeignScrollWrites as number[],nearestOwner:el.closest('[data-table-owner]')?.getAttribute('aria-label'),focused:document.activeElement===el}));expect(metric.writes,'outer table must not write a reveal offset for a foreign nested owner; native scrolling remains observable').toEqual([]);expect(metric.nearestOwner).toBe('独立した入れ子表');await record('managed-foreign-owner-'+context.name,metric);await destroy(page,id);
 });
}

for(const mode of ['cell','row']as const){
 test(`managed fixed-origin B ${mode}: resizing never treats the fixed source as an ordinary body row`,async({page})=>{
  await ready(page,contexts[1]);const id=await create(page,'RuntimeWarningManagedTable',{mode}),node=host(page,id),source=node.locator('tbody > tr[data-row-key="0"]');await expect(source).toHaveAttribute('data-fixed-row','start');
  if(mode==='cell')await source.locator('ui-cell-editor').getByRole('button',{name:'編集',exact:true}).click();else await source.getByRole('button',{name:'編集: 保持 0',exact:true}).click();
  const editor=node.locator(mode==='cell'?'ui-cell-editor[aria-label="氏名・保持 0"]':'ui-row-editor[aria-label="保持 0の行編集"]').getByRole('textbox',{name:'氏名',exact:true});await editor.fill('固定行の独立した下書き');await editor.press('ControlOrMeta+A');const original=await editor.elementHandle();
  const before=await editor.evaluate(el=>{const vp=el.closest<HTMLElement>('.ui-data-table__viewport')!;vp.style.overflowAnchor='none';vp.scrollTop=100;let descriptor:PropertyDescriptor|undefined;for(let proto=Object.getPrototypeOf(vp);proto&&!descriptor;proto=Object.getPrototypeOf(proto))descriptor=Object.getOwnPropertyDescriptor(proto,'scrollTop');const writes:number[]=[];(vp as any).__warningScrollWrites=writes;Object.defineProperty(vp,'scrollTop',{configurable:true,get(){return descriptor!.get!.call(vp);},set(value:number){writes.push(value);descriptor!.set!.call(vp,value);}});return {scrollTop:vp.scrollTop};});expect(before.scrollTop).toBeGreaterThan(0);
  await grow(page,node,19,220);await grow(page,node,0,240);await expect(editor).toBeFocused();await expect(editor).toHaveValue('固定行の独立した下書き');expect(await original!.evaluate(el=>el.isConnected&&document.activeElement===el)).toBe(true);
  const after=await editor.evaluate(el=>{const input=el as HTMLInputElement,vp=el.closest<HTMLElement>('.ui-data-table__viewport')!;return {scrollTop:vp.scrollTop,writes:(vp as any).__warningScrollWrites as number[],selection:[input.selectionStart,input.selectionEnd]};});expect(after.writes,'fixed source owns its scroll boundary, including a separate expansion row').toEqual([]);expect(after.scrollTop).toBe(before.scrollTop);expect(after.selection).toEqual([0,'固定行の独立した下書き'.length]);await record('managed-fixed-origin-'+mode,{before,after,sourceFixed:await source.getAttribute('data-fixed-row')});await destroy(page,id);await original!.dispose();
 });
}
