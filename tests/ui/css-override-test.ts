import {attachPageLifecycle} from './runtime-lifecycle';
import {test as base,expect,type Page,type Locator} from '@playwright/test';
export {expect};
export const test=base.extend<{runtimeErrors:string[];lifecycle:ReturnType<typeof attachPageLifecycle>}>({lifecycle:[async({page,context,browser},use,testInfo)=>{const journal=attachPageLifecycle(page,context,context.browser()??browser);try{await use(journal);}finally{for(const error of testInfo.errors)journal.recordError('primary',error);journal.setPhase('diagnostic');try{await journal.flush((name,options)=>testInfo.attach(name,options));}finally{journal.dispose();}}},{auto:true}],runtimeErrors:[async({page},use)=>{const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')errors.push(message.type()+': '+message.text());});await use(errors);expect(errors,'CSS override browser errors').toEqual([]);},{auto:true}]});
export const contexts=[
 {name:'A',profile:'guided',width:1280,font:'100%',dir:'ltr',motion:'no-preference'},
 {name:'B',profile:'dense',width:320,font:'200%',dir:'rtl',motion:'reduce'},
 {name:'C',profile:'guided',width:320,font:'200%',dir:'ltr',motion:'no-preference'},
 {name:'D',profile:'dense',width:1280,font:'100%',dir:'rtl',motion:'reduce'},
] as const;
export type Context=typeof contexts[number];
export async function settle(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
export async function environment(page:Page,context:Context){
 await page.setViewportSize({width:context.width,height:1000});await page.emulateMedia({reducedMotion:context.motion});
 await page.evaluate(c=>{document.documentElement.style.fontSize=c.font;document.documentElement.dir=c.dir;const main=document.querySelector<HTMLElement>('main')!;main.setAttribute('data-ui-profile',c.profile);main.style.padding='0';},context);await settle(page);
}
export async function ready(page:Page,context:Context){await page.goto('/catalog/static-runtime');await expect.poll(()=>page.evaluate(()=>typeof(window as any).__runtime?.create)).toBe('function');await environment(page,context);}
export const host=(page:Page,id:number)=>page.locator(`[data-runtime-id="${id}"]`);
export async function create(page:Page,name:string,inputs:Record<string,unknown>,projection?:string){return page.evaluate(({name,inputs,projection})=>(window as any).__runtime.create(name,inputs,projection),{name,inputs,projection});}
export async function update(page:Page,id:number,inputs:Record<string,unknown>){await page.evaluate(({id,inputs})=>(window as any).__runtime.update(id,inputs),{id,inputs});await settle(page);}
export async function set(target:Locator,property:string,value:string,priority='important'){await target.evaluate((el,{property,value,priority})=>(el as HTMLElement).style.setProperty(property,value,priority),{property,value,priority});}
export async function clear(target:Locator,property:string){await target.evaluate((el,p)=>(el as HTMLElement).style.removeProperty(p),property);}
export async function record(name:string,data:unknown){await test.info().attach(name,{body:JSON.stringify(data,null,2),contentType:'application/json'});}
export async function destroy(page:Page,id:number){const before=await page.evaluate(id=>{const runtime=(window as any).__runtime,snapshot=structuredClone(runtime.inspect(id));runtime.destroy(id);return snapshot;},id);expect(before.errors).toEqual([]);await settle(page);await expect(host(page,id)).toHaveCount(0);const after=await page.evaluate(id=>(window as any).__runtime.inspect(id),id);expect(after.errors).toEqual([]);expect(after.events).toEqual(before.events);}
export async function hiddenReveal(page:Page,node:Locator){await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(node).toBeHidden();await node.evaluate(el=>(el as HTMLElement).hidden=false);await expect(node).toBeVisible();await settle(page);}
