import {test,expect,contexts,ready,create,host,settle,update,destroy,record,type Context} from './css-override-test';
import type {Locator} from '@playwright/test';

const choices=()=>Array.from({length:1000},(_,index)=>({value:String(index),label:`候補 ${index}`,group:index<500?'Alpha':'Beta',disabled:index===498}));
async function ownership(box:Locator,value:string|null,selected:boolean,virtual:boolean){
 await expect.poll(()=>box.evaluate((element,{value,selected,virtual})=>{
  const active=element.getAttribute('aria-activedescendant'),row=active?document.getElementById(active):null;
  const options=[...element.querySelectorAll<HTMLElement>('[role=option]')],own=(element.getAttribute('aria-owns')??'').split(' ').filter(Boolean);
  const flattened=own.flatMap(id=>{const group=document.getElementById(id);return group?.getAttribute('role')==='group'?(group.getAttribute('aria-owns')??'').split(' ').filter(Boolean):[id];});
  return {value:row?.getAttribute('data-list-value')??null,selected:row?.getAttribute('aria-selected')??null,activeValid:value===null?active===null:!!row&&element.contains(row)&&document.querySelectorAll(`[id="${active}"]`).length===1,
   owned:virtual?flattened.length===options.length&&new Set(flattened).size===flattened.length&&options.every(option=>flattened.includes(option.id))&&own.every(id=>element.contains(document.getElementById(id))):own.length===0,
   unique:options.every(option=>document.querySelectorAll(`[id="${option.id}"]`).length===1),expected:{value,selected,virtual}};
 },{value,selected,virtual})).toEqual({value,selected:value===null?null:String(selected),activeValid:true,owned:true,unique:true,expected:{value,selected,virtual}});
}
async function model(page:Parameters<typeof ready>[0],id:number){return page.evaluate(id=>{const runtime=(window as any).__runtime,component=runtime.instance(id);return {value:component.value(),current:component.current(),events:runtime.inspect(id).events};},id);}
async function fixture(page:Parameters<typeof ready>[0],context:Context){await ready(page,context);const id=await create(page,'Listbox',{options:choices(),controlId:'gap-listbox',label:'検索する候補',virtual:true,searchable:true,height:360,overscan:2,value:'999'});return {id,node:host(page,id),box:host(page,id).getByRole('listbox'),search:host(page,id).getByRole('searchbox')};}

for(const context of contexts){
 test(`warning gaps Listbox search ${context.name}: filtered selection, empty result and clear preserve controlled model`,async({page})=>{
  const {id,node,box,search}=await fixture(page,context);await box.focus();await ownership(box,'999',true,true);
  await search.fill('Alpha');await expect(search).toBeFocused();await box.focus();await page.keyboard.press('End');await ownership(box,'499',false,true);await page.keyboard.press('ArrowUp');await ownership(box,'497',false,true);await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await ownership(box,'499',false,true);expect(await model(page,id)).toEqual({value:'999',current:'999',events:[{name:'valueChange',value:'499'}]});
  await update(page,id,{value:'499'});await ownership(box,'499',true,true);
  await search.fill('一致しない検索');await expect(node.getByText('条件に一致する候補はありません。')).toBeVisible();await ownership(box,null,false,true);expect(await model(page,id)).toEqual({value:'499',current:'499',events:[{name:'valueChange',value:'499'}]});
  await search.fill('');await box.focus();await ownership(box,'499',true,true);await expect(node.getByRole('alert')).toHaveCount(0);await record('listbox-search-controlled',await model(page,id));await destroy(page,id);
 });
 test(`warning gaps Listbox virtual switch ${context.name}: same instance retains value and selection requests`,async({page})=>{
  const {id,node,box,search}=await fixture(page,context);await search.fill('Beta');await box.focus();await ownership(box,'999',true,true);const identity=await page.evaluate(id=>{(window as any).__gapListboxInstance=(window as any).__runtime.instance(id);return true;},id);expect(identity).toBe(true);
  for(const virtual of [false,true,false,true]){
   await update(page,id,{virtual});await expect(node).toBeFocused();await expect(node).toHaveAttribute('aria-label','検索する候補');await page.keyboard.press('Tab');await expect(search).toBeFocused();await page.keyboard.press('Tab');await expect(box).toBeFocused();await ownership(box,'999',true,virtual);await page.keyboard.press('Home');await page.keyboard.press('Enter');await ownership(box,'500',false,virtual);
   expect(await page.evaluate(id=>(window as any).__runtime.instance(id)===(window as any).__gapListboxInstance,id)).toBe(true);
   expect((await model(page,id)).current).toBe('999');await page.keyboard.press('End');await ownership(box,'999',true,virtual);
  }
  expect(await model(page,id)).toEqual({value:'999',current:'999',events:Array.from({length:4},()=>({name:'valueChange',value:'500'}))});await search.focus();await update(page,id,{virtual:false});await expect(search).toBeFocused();await page.locator('#runtime-anchor').focus();await update(page,id,{virtual:true});await expect(page.locator('#runtime-anchor')).toBeFocused();await search.fill('');await box.focus();await ownership(box,'999',true,true);await record('listbox-switch-controlled',await model(page,id));await destroy(page,id);
 });
 test(`warning gaps Listbox destruction ${context.name}: trusted input destroys with queued DOM sync and typeahead`,async({page})=>{
  const {id,node,box,search}=await fixture(page,context);await box.focus();await ownership(box,'999',true,true);await page.keyboard.press('x');
  await node.evaluate((element,id)=>{const runtime=(window as any).__runtime,component=runtime.instance(id),view=element.ownerDocument.defaultView!,cancel=view.cancelAnimationFrame.bind(view),clear=view.clearTimeout.bind(view),requested:number[]=[],timers:number[]=[];const late:any[]=[];const probe={trusted:false,pending:null as number|null,timer:null as number|null,cancelled:requested,timers,before:null as any,late,dispose(){view.cancelAnimationFrame=cancel;view.clearTimeout=clear;}};(window as any).__listboxDestroyProbe=probe;
   view.cancelAnimationFrame=(frame:number)=>{requested.push(frame);cancel(frame);};view.clearTimeout=(timer:Parameters<typeof view.clearTimeout>[0])=>{if(typeof timer==='number')timers.push(timer);clear(timer);};
   element.addEventListener('input',event=>{probe.trusted=event.isTrusted;runtime.update(id,{options:Array.from({length:20},(_,index)=>({value:String(index),label:`更新 ${index}`,group:'更新'}))});probe.pending=component.domFrame;probe.timer=component.typeaheadTimer??null;probe.before=structuredClone(runtime.inspect(id));runtime.destroy(id);const observer=new MutationObserver(records=>late.push(...records.map(record=>({type:record.type,attribute:record.attributeName}))));observer.observe(element,{subtree:true,attributes:true,childList:true});const dispose=probe.dispose;probe.dispose=()=>{observer.disconnect();dispose();};},{once:true});
  },id);
  await search.fill('更新');await settle(page);await expect(node).toHaveCount(0);
  const result=await page.evaluate(id=>{const p=(window as any).__listboxDestroyProbe,runtime=(window as any).__runtime;return {trusted:p.trusted,pending:p.pending,timer:p.timer,timerCancelled:p.timers.includes(p.timer),cancelled:p.cancelled.includes(p.pending),before:p.before,after:runtime.inspect(id),late:p.late};},id);
  expect(result.trusted).toBe(true);expect(typeof result.pending).toBe('number');expect(typeof result.timer).toBe('number');expect(result.timerCancelled).toBe(true);expect(result.cancelled).toBe(true);expect(result.before.errors).toEqual([]);expect(result.after.errors).toEqual([]);expect(result.after.events).toEqual(result.before.events);expect(result.after.applicationErrors).toEqual([]);expect(result.late).toEqual([]);await record('listbox-destroy-queued-native-input',result);await page.evaluate(()=>(window as any).__listboxDestroyProbe.dispose());
 });
}
