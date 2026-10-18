import {test,expect,type Page,type Locator} from '@playwright/test';
import {contexts,ready,create,host,update,settle} from './css-override-test';

const errors=(page:Page,id:number)=>page.evaluate(id=>(window as any).__runtime.inspect(id).errors as string[],id);
const raw=(node:Locator)=>node.evaluate(el=>({inline:(el as HTMLElement).style.cssText,rect:el.getBoundingClientRect().toJSON()}));
async function render(page:Page,id:number){await page.evaluate(id=>(window as any).__runtime.render(id),id);await settle(page);}
async function remove(page:Page,id:number){const n=(await errors(page,id)).length;await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(host(page,id)).toHaveCount(0);expect((await errors(page,id)).length).toBe(n);}
test.beforeEach(async({page})=>{
 const consoleErrors:string[]=[],pageErrors:string[]=[];
 page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')consoleErrors.push(message.text());});
 page.on('pageerror',e=>pageErrors.push(e.message));
 (page as any).__guardErrors={consoleErrors,pageErrors};
});
test.afterEach(async({page},info)=>{
 const log=(page as any).__guardErrors as {consoleErrors:string[];pageErrors:string[]};
 await info.attach('observed-errors',{body:JSON.stringify(log),contentType:'application/json'});
 expect(log.pageErrors).toEqual([]);
 for(const message of log.consoleErrors)expect(message).toMatch(/^runtime-harness: (Panel pixel sizes must be positive finite numbers or null for semantic defaults\.|BottomSheet stage must be an existing index\.|Skeleton dimensions must be positive\.|Spinner size must be positive\.)$/);
});
for(const c of contexts){
 test(`reassessment guard isolation ${c.name} TableContainer height and maximum`,async({page},info)=>{
  await ready(page,c);const id=await create(page,'TableContainer',{label:'独立した寸法検査',height:120,maxHeight:150},'<div>保持する表の内容</div>'),node=host(page,id),observations=[];
  for(const key of ['height','maxHeight'])for(const bad of [0,-1,NaN,Infinity]){
   await update(page,id,{height:120,maxHeight:150});
   await update(page,id,{[key]:bad});
   for(let pass=0;pass<3;pass++){
    if(pass)await render(page,id);
    await expect(node.getByRole('alert')).toBeVisible();
    expect(await node.evaluate(el=>({height:(el as HTMLElement).style.blockSize,max:(el as HTMLElement).style.maxBlockSize}))).toEqual({height:'',max:''});
   }
   await update(page,id,{caption:'無関係の説明 '+key});await expect(node.getByRole('alert')).toBeVisible();
   expect(await node.evaluate(el=>({height:(el as HTMLElement).style.blockSize,max:(el as HTMLElement).style.maxBlockSize}))).toEqual({height:'',max:''});
   observations.push({key,bad:String(bad),rejected:await raw(node)});
   await update(page,id,{[key]:key==='height'?120:150});await expect(node.getByRole('alert')).toHaveCount(0);expect(Math.abs((await node.boundingBox())!.height-120)).toBeLessThanOrEqual(1);
  }
  expect(await errors(page,id)).toEqual([]);await info.attach('independent-guards',{body:JSON.stringify(observations),contentType:'application/json'});await remove(page,id);
 });
 test(`reassessment guard isolation ${c.name} Drawer width and height`,async({page},info)=>{
  await ready(page,c);const id=await create(page,'Drawer',{label:'独立したDrawer寸法',open:true,modal:false,width:280,height:600}),node=host(page,id),observations=[];
  for(const key of ['width','height'])for(const bad of [0,-1,NaN,Infinity]){
   const before=await node.evaluate(el=>({width:(el as HTMLElement).style.getPropertyValue('--ui-panel-width'),height:(el as HTMLElement).style.getPropertyValue('--ui-panel-height')})),n=(await errors(page,id)).length;
   await update(page,id,{[key]:bad});await expect.poll(()=>errors(page,id).then(a=>a.length)).toBeGreaterThan(n);
   for(let pass=0;pass<2;pass++){await render(page,id);expect(await node.evaluate(el=>({width:(el as HTMLElement).style.getPropertyValue('--ui-panel-width'),height:(el as HTMLElement).style.getPropertyValue('--ui-panel-height')}))).toEqual(before);}
   await update(page,id,{label:'保持中 '+key});expect(await node.evaluate(el=>({width:(el as HTMLElement).style.getPropertyValue('--ui-panel-width'),height:(el as HTMLElement).style.getPropertyValue('--ui-panel-height')}))).toEqual(before);
   observations.push({key,bad:String(bad),before,after:await raw(node)});
   await update(page,id,{[key]:key==='width'?280:600});await expect.poll(()=>node.evaluate(el=>getComputedStyle(el).height)).toBe('600px');
  }
  await info.attach('independent-guards',{body:JSON.stringify(observations),contentType:'application/json'});await remove(page,id);
 });
 test(`reassessment guard isolation ${c.name} BottomSheet height and stage`,async({page},info)=>{
  await ready(page,c);const id=await create(page,'BottomSheet',{label:'独立したSheet寸法',open:true,modal:false,height:600,stages:[.4,.7,1],stage:1}),node=host(page,id),observations=[];
  for(const key of ['height','stage'])for(const bad of key==='height'?[0,-1,NaN,Infinity]:[-1,.5,3,NaN,Infinity]){
   const before=await node.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ui-sheet-height')),n=(await errors(page,id)).length;
   await update(page,id,{[key]:bad});expect((await errors(page,id)).length).toBeGreaterThan(n);
   for(let pass=0;pass<2;pass++){await render(page,id);expect(await node.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ui-sheet-height'))).toBe(before);}
   await update(page,id,{label:'保持中 '+key});expect(await node.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ui-sheet-height'))).toBe(before);
   observations.push({key,bad:String(bad),before,after:await raw(node)});await update(page,id,{[key]:key==='height'?600:1});await expect.poll(()=>node.evaluate(el=>getComputedStyle(el).height)).toBe('420px');
  }
  await info.attach('independent-guards',{body:JSON.stringify(observations),contentType:'application/json'});await remove(page,id);
 });
 test(`reassessment guard isolation ${c.name} Spinner and separate Skeleton dimensions`,async({page},info)=>{
  await ready(page,c);const observations=[];
  for(const variant of ['spinner','width','height','diameter']){
   const spinner=variant==='spinner',id=await create(page,spinner?'Spinner':'Skeleton',spinner?{label:'独立したSpinner寸法',size:36}:{shape:variant==='diameter'?'circle':'rectangle',width:100,height:32,diameter:72,rows:1}),node=host(page,id),surface=node.locator(spinner?'svg':'.ui-skeleton-line').first(),key=spinner?'size':variant,valid=spinner?36:variant==='width'?100:variant==='height'?32:72;
   await expect(surface).toBeVisible();
   for(const bad of [0,-1,NaN,Infinity]){
    const before=(await raw(surface)).inline,n=(await errors(page,id)).length;
    await update(page,id,{[key]:bad});expect((await errors(page,id)).length).toBeGreaterThan(n);
    for(let pass=0;pass<2;pass++){await render(page,id);expect((await raw(surface)).inline).toBe(before);}
    await update(page,id,spinner?{label:'無関係なSpinner説明'}:{motion:false});expect((await raw(surface)).inline).toBe(before);
    observations.push({variant,bad:String(bad),before,after:await raw(surface)});await update(page,id,{[key]:valid});
    const r=await surface.evaluate(el=>{const s=getComputedStyle(el);return {width:parseFloat(s.width),height:parseFloat(s.height)};});expect(Math.abs(r.width-(spinner?36:variant==='diameter'?72:100))).toBeLessThanOrEqual(1);expect(Math.abs(r.height-(spinner?36:variant==='diameter'?72:32))).toBeLessThanOrEqual(1);
   }
   await remove(page,id);
  }
  await info.attach('independent-guards',{body:JSON.stringify(observations),contentType:'application/json'});
 });
}
