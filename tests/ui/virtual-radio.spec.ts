import {attachPageLifecycle,runWithLifecycleCleanup} from './runtime-lifecycle';
import {type Page} from '@playwright/test';
import {test,expect,contexts,ready,create,host,settle,record,destroy,update} from './css-override-test';

interface Row{id:number;kind:'radio'|'text'|'empty';checked?:boolean;hidden?:boolean;disabled?:boolean;group?:string;form?:string;}
interface Sample{active:string;trusted:boolean;cancelled:boolean;backwards:boolean;checked:number[];live:number;limit:number;}
const data=(selection:number|null=0):Row[]=>Array.from({length:1000},(_,id)=>({id,kind:id<2?'radio':id===499?'text':'empty',...(selection===id?{checked:true}:{})}));
const forward=['Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab'];
async function instrument(page:Page,id:number){await page.evaluate(id=>{
 const root=document.querySelector<HTMLElement>(`[data-runtime-id="${id}"]`)!,component=(window as any).__runtime.instance(id),viewport=root.querySelector('cdk-virtual-scroll-viewport,[data-radio-native-viewport]'),samples:any[]=[],arrows:any[]=[],rowLimit=component.virtual()?Math.ceil((viewport as HTMLElement).clientHeight/220)+4:0;let event:KeyboardEvent|null=null,arrowEvent:KeyboardEvent|null=null;
 const identify=(node:Element|null)=>{if(node===viewport)return 'viewport';if(!node)return 'null';if(node.matches('.ui-virtual-table__cell'))return 'cell:'+node.closest('[data-ui-virtual-index]')?.getAttribute('data-ui-virtual-index');if(root.contains(node))return node.getAttribute('data-radio-boundary')??(node.hasAttribute('data-radio-control')?'row:'+node.getAttribute('data-radio-control'):node.tagName);return 'outside';};
 const sample=()=>({active:identify(document.activeElement),trusted:event?.isTrusted??false,cancelled:event?.defaultPrevented??false,backwards:event?.shiftKey??false,checked:[...root.querySelectorAll<HTMLInputElement>('[data-radio-control]')].filter(input=>input.type==='radio'&&input.checked).map(input=>Number(input.getAttribute('data-radio-control'))),live:root.querySelectorAll('.ui-virtual-row,[data-virtual-row-key]').length,limit:rowLimit});
 const down=(next:KeyboardEvent)=>{if(next.key==='Tab')event=next;if(next.key.startsWith('Arrow')){arrowEvent=next;arrows.push({phase:'before',key:next.key,...sample(),groups:component.radioGroups()});}},up=(next:KeyboardEvent)=>{if(next.key==='Tab')samples.push(sample());if(next.key.startsWith('Arrow'))arrows.push({phase:'after',key:next.key,...sample(),trusted:next.isTrusted,cancelled:arrowEvent?.defaultPrevented??false,groups:component.radioGroups()});};document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);
 (window as any).__radioProbe={drain:()=>samples.splice(0),sample,arrows,dispose:()=>{document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);}};
 },id);}
async function keys(page:Page,sequence:readonly string[]):Promise<Sample[]>{for(const key of sequence)await page.keyboard.press(key);const samples:Sample[]=await page.evaluate(()=>(window as any).__radioProbe.drain());expect(samples).toHaveLength(sequence.length);for(const sample of samples){expect(sample.trusted).toBe(true);expect(sample.cancelled,'Tab remains a browser default').toBe(false);if(sample.limit)expect(sample.live,'live radio rows remain bounded').toBeLessThanOrEqual(sample.limit);}return samples;}
async function dispose(page:Page){if(!page.isClosed())await page.evaluate(()=>(window as any).__radioProbe?.dispose());}
async function withProjection(page:Page,virtual:boolean,inputs:Record<string,unknown>,action:(id:number)=>Promise<void>){const id=await create(page,'RuntimeRadio',{...inputs,virtual,owner:virtual?'virtual-radio-owner':'native-radio-owner',otherOwner:virtual?'virtual-other-owner':'native-other-owner'});await settle(page);await instrument(page,id);const journal=attachPageLifecycle(page,page.context(),page.context().browser()!);try{await runWithLifecycleCleanup(journal,()=>action(id),async()=>{try{if(!page.isClosed())await record('radio-action-state',await page.evaluate(id=>({arrows:(window as any).__radioProbe.arrows,events:(window as any).__runtime.instance(id).events,tableRequests:(window as any).__runtime.instance(id).tableRequests}),id));}finally{await dispose(page);await destroy(page,id);}});}finally{try{await journal.flush((name,options)=>test.info().attach(name,options),'radio-action-lifecycle');}finally{journal.dispose();}}}
const identities=(samples:Sample[])=>samples.map(sample=>sample.active);

interface RadioEvent{type:string;id:number;checked:boolean;trusted:boolean;}
async function arrowKeys(page:Page,sequence:readonly string[]):Promise<void>{
 for(const key of sequence)await page.keyboard.press(key);
 const samples=await page.evaluate(()=>(window as any).__radioProbe.arrows.filter((sample:any)=>sample.phase==='after'));
 expect(samples).toHaveLength(sequence.length);for(const sample of samples){expect(sample.trusted).toBe(true);expect(sample.cancelled,'Arrow remains a browser default').toBe(false);if(sample.limit)expect(sample.live).toBeLessThanOrEqual(sample.limit);}
}
async function radioState(page:Page,id:number):Promise<{active:number;checked:boolean;events:RadioEvent[]}>{return page.evaluate(id=>({active:Number(document.activeElement?.getAttribute('data-radio-control')),checked:(document.activeElement as HTMLInputElement)?.checked,events:[...(window as any).__runtime.instance(id).events]}),id);}
function changes(events:readonly RadioEvent[]):number[]{expect(events.length).toBeGreaterThan(0);expect(events.length%2).toBe(0);for(let i=0;i<events.length;i+=2){expect(events[i]).toEqual({type:'input',id:events[i+1]!.id,checked:true,trusted:true});expect(events[i+1]).toEqual({type:'change',id:events[i]!.id,checked:true,trusted:true});}return events.filter(event=>event.type==='change').map(event=>event.id);}


test('cross-row radio checked entry survives reverse recycling',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  await host(page,id).locator('[data-radio-boundary="before"]').focus();const samples=await keys(page,forward);runs.push(samples);
  expect(identities(samples)).toEqual(['viewport','row:0','row:499','after','row:499','row:0','viewport','before']);
  expect(samples[1]!.checked).toContain(0);expect(samples[5]!.checked).toContain(0);expect(samples[5]!.checked).not.toContain(1);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id),'navigation creates no selection events').toEqual([]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-checked-reference-and-virtual',runs);
});

test('cross-row radio without selection uses the native direction-specific entry',async({page})=>{
 await ready(page,contexts[2]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data(null)},async id=>{
  await host(page,id).locator('[data-radio-boundary="before"]').focus();const samples=await keys(page,forward);runs.push(samples);
  expect(identities(samples).slice(0,5)).toEqual(['viewport','row:0','row:499','after','row:499']);expect(['row:0','row:1']).toContain(samples[5]!.active);expect(identities(samples).slice(6)).toEqual(['viewport','before']);expect(samples[1]!.checked).toEqual([]);expect(samples[5]!.checked).toEqual([]);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual([]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-unselected-native-direction-entry',runs);
});

for(const interaction of ['Space','click'] as const)test(`cross-row radio ${interaction} selection persists across recycling`,async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  const node=host(page,id);await node.locator('[data-radio-control="1"]').focus();if(interaction==='click')await node.locator('[data-radio-control="1"]').click();else await page.keyboard.press('Space');expect(await node.locator('[data-radio-control="1"]').isChecked()).toBe(true);expect(await node.locator('[data-radio-control="0"]').isChecked()).toBe(false);
  const samples=await keys(page,['Tab','Tab','Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab','Tab','Tab']);runs.push(samples);
  expect(identities(samples)).toEqual(['row:499','after','row:499','row:1','viewport','before','viewport','row:1']);expect(samples[3]!.checked).toContain(1);expect(samples[7]!.checked).toContain(1);expect(samples[7]!.checked).not.toContain(0);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id),'only the actual Space changes selection').toEqual([{type:'input',id:1,checked:true,trusted:true},{type:'change',id:1,checked:true,trusted:true}]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-space-reference-and-virtual',runs);
});

test('cross-row radio click then immediate reverse Tab preserves the native starting point',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  const node=host(page,id);await node.locator('[data-radio-control="1"]').click();
  const samples=await keys(page,['Shift+Tab','Shift+Tab','Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab']);runs.push(samples);
  expect(identities(samples)).toContain('viewport');expect(identities(samples)).toContain('row:499');expect(identities(samples)).toContain('after');
  for(const sample of samples)if(sample.active==='row:1')expect(sample.checked).toContain(1);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).radioGroups()[0].value,id)).toBe('1');
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual([{type:'input',id:1,checked:true,trusted:true},{type:'change',id:1,checked:true,trusted:true}]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-click-reverse-native-reference',runs);
});

for(const label of ['explicit','wrapped'] as const)test(`cross-row radio ${label} label click keeps the same-engine native Tab starting point`,async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  const node=host(page,id);await node.locator('[data-radio-control="1"]').evaluate((radio,kind)=>{
   const input=radio as HTMLInputElement;input.id='radio-label-target';const label=document.createElement('label');label.setAttribute('data-radio-label','');label.textContent='選択するラベル';input.after(label);if(kind==='explicit')label.htmlFor=input.id;else label.append(input);
  },label);
  await node.locator('[data-radio-label]').click({position:{x:10,y:5}});
  const samples=await keys(page,['Tab','Tab','Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab','Tab','Tab']);runs.push(samples);
  expect(identities(samples)).toContain('row:499');expect(identities(samples)).toContain('row:1');
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).radioGroups()[0].value,id)).toBe('1');
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual([{type:'input',id:1,checked:true,trusted:true},{type:'change',id:1,checked:true,trusted:true}]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-'+label+'-label-native-reference',runs);
});

test('cross-row radio group identity includes its native form owner',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true]){
  const rows=data();rows[1]!.checked=true;rows[1]!.form=virtual?'virtual-other-owner':'native-other-owner';
  await withProjection(page,virtual,{rows,otherChecked:false},async id=>{await host(page,id).locator('[data-radio-boundary="before"]').focus();const samples=await keys(page,['Tab','Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab']);runs.push(samples);expect(identities(samples)).toEqual(['viewport','row:0','row:1','row:499','after','row:499','row:1','row:0','viewport','before']);});
 }expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-form-owner-reference-and-virtual',runs);
});

for(const unavailable of ['hidden','disabled'] as const)test(`cross-row radio ${unavailable} checked peer follows the native reference`,async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true]){const rows=data();rows[0]![unavailable]=true;await withProjection(page,virtual,{rows},async id=>{
  await host(page,id).locator('[data-radio-boundary="before"]').focus();const samples=await keys(page,forward);runs.push(samples);expect(samples.map(sample=>sample.active)).not.toContain('row:0');expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual([]);
 });}expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record(`radio-${unavailable}-checked-native-reference`,runs);
});

test('cross-row radio controlled data replacement and reset use the current consumer selection',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  const node=host(page,id);await node.locator('[data-radio-boundary="before"]').focus();await keys(page,['Tab','Tab','Tab','Tab']);
  await update(page,id,{rows:data(1)});if(virtual){await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToOffset(0),id);await settle(page);}
  await node.locator('[data-radio-boundary="before"]').focus();const first=await keys(page,['Tab','Tab']);expect(identities(first)).toEqual(['viewport','row:1']);
  await node.locator('[data-radio-control="0"]').focus();await page.keyboard.press('Space');expect(await node.locator('[data-radio-control="0"]').isChecked()).toBe(true);
  await node.locator('[data-radio-reset]').click();await settle(page);await node.locator('[data-radio-boundary="before"]').focus();const reset=await keys(page,['Tab','Tab']);expect(identities(reset)).toEqual(['viewport','row:1']);expect(reset[1]!.checked).toContain(1);expect(reset[1]!.checked).not.toContain(0);runs.push([...first,...reset]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-replacement-and-reset-native-reference',runs);
});

test('cross-row radio native arrows at distant endpoints preserve the same-engine selection and events',async({page})=>{
 await ready(page,contexts[0]);const runs:{samples:Sample[];state:Awaited<ReturnType<typeof radioState>>}[]=[];
 const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':id===999?'text':'empty',...(id===0?{checked:true}:{})}));
 for(const virtual of [false,true])await withProjection(page,virtual,{rows},async id=>{
  const node=host(page,id);await node.locator('[data-radio-boundary="before"]').focus();expect(identities(await keys(page,['Tab','Tab']))).toEqual(['viewport','row:0']);
  await arrowKeys(page,['ArrowRight','ArrowRight','ArrowRight','ArrowLeft']);const state=await radioState(page,id),selected=changes(state.events).at(-1)!;expect(state.active).toBe(selected);expect(state.checked).toBe(true);
  const samples=await keys(page,['Tab','Tab','Shift+Tab','Shift+Tab']);runs.push({samples,state});expect(identities(samples)).toEqual(['row:999','after','row:999','row:'+selected]);expect(samples[3]!.checked).toContain(selected);
 });expect(runs[1]!.state).toEqual(runs[0]!.state);expect(identities(runs[1]!.samples)).toEqual(identities(runs[0]!.samples));await record('radio-native-arrow-endpoint-reference-and-virtual',runs);
});

test('cross-row radio offscreen selection, member reorder and selected removal use current keyed membership',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  const node=host(page,id);await node.locator('[data-radio-boundary="before"]').focus();await keys(page,['Tab','Tab','Tab','Tab']);
  await update(page,id,{rows:data(1)});const selected=await keys(page,['Shift+Tab','Shift+Tab']);expect(identities(selected)).toEqual(['row:499','row:1']);expect(selected[1]!.checked).toContain(1);
  const reordered=data(1);[reordered[0],reordered[1]]=[reordered[1]!,reordered[0]!];await node.locator('[data-radio-boundary="after"]').focus();await update(page,id,{rows:reordered});const moved=await keys(page,['Shift+Tab','Shift+Tab']);expect(identities(moved)).toEqual(['row:499','row:1']);
  await node.locator('[data-radio-boundary="after"]').focus();await update(page,id,{rows:reordered.filter(row=>row.id!==1)});const removed=await keys(page,['Shift+Tab','Shift+Tab']);expect(identities(removed)).toEqual(['row:499','row:0']);expect(removed[1]!.checked).toEqual([]);runs.push([...selected,...moved,...removed]);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id),'external state changes and navigation do not synthesize selection events').toEqual([]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-offscreen-reorder-remove-native-reference',runs);
});

test('cross-row radio consumer rejection restores checked state without synthetic changes',async({page})=>{
 await ready(page,contexts[0]);await withProjection(page,true,{rows:data(),acceptChanges:false},async id=>{
  const node=host(page,id);await node.locator('[data-radio-control="1"]').focus();await page.keyboard.press('Space');
  await expect(node.locator('[data-radio-control="0"]')).toBeChecked();await expect(node.locator('[data-radio-control="1"]')).not.toBeChecked();
  const samples=await keys(page,['Tab','Tab','Shift+Tab','Shift+Tab']);expect(identities(samples)).toEqual(['row:499','after','row:499','row:0']);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual([{type:'input',id:1,checked:true,trusted:true},{type:'change',id:1,checked:true,trusted:true}]);
 });
});

test('cross-row radio multiple options in one row follow DOM order even with reverse metadata order',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[],states:Awaited<ReturnType<typeof radioState>>[]=[];
 const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':id===999?'text':'empty'}));
 for(const virtual of [false,true])await withProjection(page,virtual,{rows,sameRowPair:true},async id=>{
  const node=host(page,id);await node.locator('[data-radio-boundary="before"]').focus();const entry=await keys(page,['Tab','Tab']);expect(identities(entry)).toEqual(['viewport','row:10000']);
  await arrowKeys(page,['ArrowLeft','ArrowRight','ArrowRight','ArrowRight']);const state=await radioState(page,id),selected=changes(state.events).at(-1)!;states.push(state);
  const samples=await keys(page,['Tab','Tab','Shift+Tab','Shift+Tab']);runs.push(samples);expect(identities(samples)).toEqual(['row:999','after','row:999','row:'+selected]);expect(state.checked).toBe(true);expect(state.active).toBe(selected);
 });expect(states[1]).toEqual(states[0]);expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-same-row-DOM-order-reference',{runs,states});
});

for(const wrapper of [false,true])test(`cross-row radio ${wrapper?'wrapper':'table'} built-in single selection preserves native arrows and canonical value after recycling`,async({page})=>{
 await ready(page,contexts[0]);const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':'empty',...(id===0?{checked:true}:{})}));let selected=0,requests:number[][]=[];
 await withProjection(page,false,{rows},async id=>{await host(page,id).locator('[data-radio-control="0"]').focus();await arrowKeys(page,['ArrowRight','ArrowRight','ArrowRight','ArrowLeft']);const native=await radioState(page,id);requests=changes(native.events).map(value=>[value]);selected=native.active;expect(native.checked).toBe(true);expect(selected).toBe(requests.at(-1)![0]);await record('table-single-native-oracle',native);});
 await withProjection(page,true,{rows,table:true,wrapper},async id=>{
  const node=host(page,id);await node.locator('input[type="radio"][value="number:0"]').focus();await arrowKeys(page,['ArrowRight','ArrowRight','ArrowRight','ArrowLeft']);
  await expect(node.locator('input[type="radio"][value="number:'+selected+'"]')).toBeFocused();await expect(node.locator('input[type="radio"][value="number:'+selected+'"]')).toBeChecked();
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).tableRequests,id)).toEqual(requests);
  await node.locator('[data-radio-boundary="after"]').focus();await page.evaluate(id=>(window as any).__runtime.instance(id).tableApi().scrollToOffset(0),id);await settle(page);await expect(node.locator('input[type="radio"][value="number:0"]')).not.toBeChecked();
  await page.evaluate(({id,selected})=>(window as any).__runtime.instance(id).tableApi().scrollToIndex(selected),{id,selected});await settle(page);await expect(node.locator('input[type="radio"][value="number:'+selected+'"]')).toBeChecked();expect(await page.evaluate(()=>document.activeElement?.getAttribute('data-radio-boundary'))).toBe('after');
 });
});

test('cross-row radio rapid native arrows in RTL match the nonvirtual reference',async({page})=>{
 await ready(page,contexts[1]);const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':'empty',...(id===0?{checked:true}:{})})),runs:unknown[]=[];
 for(const virtual of [false,true])await withProjection(page,virtual,{rows},async id=>{
  await host(page,id).locator('[data-radio-boundary="before"]').focus();expect(identities(await keys(page,['Tab','Tab']))).toEqual(['viewport','row:0']);
  await arrowKeys(page,['ArrowRight','ArrowRight','ArrowRight','ArrowLeft']);
  const state=await page.evaluate(id=>({active:document.activeElement?.getAttribute('data-radio-control'),checked:(document.activeElement as HTMLInputElement)?.checked,events:(window as any).__runtime.instance(id).events,arrows:(window as any).__radioProbe.arrows}),id);
  changes(state.events);expect(state.checked).toBe(true);expect(state.active).toBe(String(state.events.at(-1).id));
  for(const arrow of state.arrows.filter((arrow:any)=>arrow.phase==='after')){expect(arrow.trusted).toBe(true);expect(arrow.cancelled).toBe(false);if(arrow.limit)expect(arrow.live).toBeLessThanOrEqual(arrow.limit);}
  runs.push({active:state.active,events:state.events});
 });expect(runs[1]).toEqual(runs[0]);await record('radio-RTL-native-arrow-reference',runs);
});


test('cross-row radio wrapper projected groups preserve live selection and reverse entry',async({page})=>{
 await ready(page,contexts[0]);const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':id===999?'text':'empty',...(id===0?{checked:true}:{})}));
 let native!:Awaited<ReturnType<typeof radioState>>;await withProjection(page,false,{rows},async id=>{await host(page,id).locator('[data-radio-control="0"]').focus();await arrowKeys(page,['ArrowRight','ArrowRight','ArrowRight','ArrowLeft']);native=await radioState(page,id);changes(native.events);});
 await withProjection(page,true,{rows,wrapper:true,wrapperProjection:true},async id=>{
  const node=host(page,id);await node.locator('[data-radio-control="0"]').focus();
  await arrowKeys(page,['ArrowRight','ArrowRight','ArrowRight','ArrowLeft']);
  await expect(node.locator('[data-radio-control="'+native.active+'"]')).toBeFocused();await expect(node.locator('[data-radio-control="'+native.active+'"]')).toBeChecked();
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual(native.events);
  expect(identities(await keys(page,['Tab','Tab','Shift+Tab','Shift+Tab']))).toEqual(['cell:'+(native.active+1),'cell:'+(native.active+2),'cell:'+(native.active+1),'row:'+native.active]);
 });
});


test('cross-row radio reverse entry from a different native radio group skips its unchecked peers',async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 for(const variant of ['checked','unselected','first','negative','disabled','hidden'])for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
  const node=host(page,id);
  await node.locator('[data-radio-boundary="after"]').evaluate((after,variant)=>{for(const last of [false,true]){const radio=document.createElement('input');radio.type='radio';radio.name='independent-boundary-group';radio.checked=variant==='disabled'||variant==='hidden'?!last:last&&variant!=='unselected';if(!last&&variant==='disabled')radio.disabled=true;if(!last&&variant==='hidden')radio.hidden=true;if(last&&variant==='negative')radio.tabIndex=-1;radio.setAttribute('data-radio-boundary',last?'external-last':'external-first');radio.setAttribute('aria-label',last?'別groupの後方':'別groupの前方');after.before(radio);}},variant);
  await node.locator(variant==='first'?'[data-radio-boundary="external-first"]':'[data-radio-boundary="external-last"]').focus();
  const samples=await keys(page,['Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab']);runs.push(samples);
  expect(identities(samples)).toContain('row:499');expect(identities(samples)).toContain('row:0');expect(samples.find(sample=>sample.active==='row:0')!.checked).toContain(0);
 });for(let i=0;i<runs.length;i+=2)expect(identities(runs[i+1]!)).toEqual(identities(runs[i]!));await record('radio-external-group-reverse-reference',runs);
});


for(const start of ['cold reverse','last focused'] as const)test(`cross-row radio unselected ${start} follows the same-engine native entry`,async({page})=>{
 await ready(page,contexts[0]);const runs:Sample[][]=[];
 const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':id===999?'text':'empty'}));
 for(const virtual of [false,true])await withProjection(page,virtual,{rows},async id=>{
  const node=host(page,id);
  if(start==='last focused'){
   if(virtual){await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToIndex(333),id);await settle(page);}
   await node.locator('[data-radio-control="333"]').focus();
  }else await node.locator('[data-radio-boundary="after"]').focus();
  const samples=await keys(page,start==='cold reverse'?['Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab']:['Tab','Tab','Shift+Tab','Shift+Tab']);runs.push(samples);
  expect(identities(samples).slice(0,start==='cold reverse'?1:3)).toEqual(start==='cold reverse'?['row:999']:['row:999','after','row:999']);
  expect(['row:0','row:333','row:666']).toContain(samples[start==='cold reverse'?1:3]!.active);for(const sample of samples)expect(sample.checked).toEqual([]);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).events,id)).toEqual([]);
 });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-unselected-'+start,{runs});
});

test('cross-row radio vertical native arrows preserve endpoint behavior and selection',async({page})=>{
 await ready(page,contexts[0]);const runs:Awaited<ReturnType<typeof radioState>>[]=[];
 const rows:Row[]=Array.from({length:1000},(_,id)=>({id,kind:[0,333,666].includes(id)?'radio':'empty',...(id===0?{checked:true}:{})}));
 for(const virtual of [false,true])await withProjection(page,virtual,{rows},async id=>{
  await host(page,id).locator('[data-radio-control="0"]').focus();await arrowKeys(page,['ArrowUp','ArrowDown','ArrowDown','ArrowDown','ArrowUp']);const state=await radioState(page,id);expect(state.active).toBe(changes(state.events).at(-1));expect(state.checked).toBe(true);runs.push(state);
 });expect(runs[1]).toEqual(runs[0]);await record('radio-vertical-native-arrows',runs);
});

test('cross-row radio model removal restores owned tabindex and preserves later consumer attributes',async({page})=>{
 await ready(page,contexts[0]);
 for(const consumer of [null,'7'])await withProjection(page,true,{rows:Array.from({length:1000},(_,id)=>({id,kind:[0,333].includes(id)?'radio':id===499?'text':'empty',...(id===333?{checked:true}:{})}))},async id=>{
  // Keep the checked member offscreen so the visible peer is suppressed.
  const node=host(page,id);await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToIndex(499),id);await settle(page);await page.evaluate(id=>(window as any).__runtime.instance(id).list().scrollToOffset(0),id);await settle(page);
  const radio=node.locator('[data-radio-control="0"]');await expect(radio).toHaveAttribute('tabindex','-1');
  if(consumer!==null)await radio.evaluate((radio,value)=>radio.setAttribute('tabindex',value),consumer);
  await update(page,id,{registered:false});expect(await radio.getAttribute('tabindex')).toBe(consumer);
 });
});

test('cross-row radio reverse entry past an unavailable checked external group matches native',async({page})=>{
 await ready(page,contexts[0]);
 for(const unavailable of ['hidden','disabled']){
  const runs:Sample[][]=[];
  for(const virtual of [false,true])await withProjection(page,virtual,{rows:data()},async id=>{
   const node=host(page,id);await node.locator('[data-radio-boundary="after"]').evaluate((after,unavailable)=>{for(const checked of [true,false]){const radio=document.createElement('input');radio.type='radio';radio.name='independent-unavailable-group';radio.checked=checked;radio.hidden=checked&&unavailable==='hidden';radio.disabled=checked&&unavailable==='disabled';radio.setAttribute('data-radio-boundary','external-'+String(checked));radio.setAttribute('aria-label','別group');after.before(radio);}},unavailable);
   await node.locator('[data-radio-boundary="after"]').focus();const samples=await keys(page,['Shift+Tab','Shift+Tab','Shift+Tab','Shift+Tab']);runs.push(samples);expect(identities(samples)).toContain('row:499');expect(identities(samples)).toContain('row:0');
  });expect(identities(runs[1]!)).toEqual(identities(runs[0]!));await record('radio-external-unavailable-'+unavailable,runs);
 }
});
