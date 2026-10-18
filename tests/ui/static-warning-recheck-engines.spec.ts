import {test, expect, type Page, type Locator} from '@playwright/test';
import {contexts, ready, environment, create, update, host, settle} from './css-override-test';

// All resources in this suite belong to the local fixture. Errors are admitted only
// when they identify an exact rejected resource or proven, controlled Map removal.
type ConsoleFailure = {type:string; phase:string; text:string; url:string};
function diagnostics(page:Page) {
 const pages:string[]=[], consoleErrors:ConsoleFailure[]=[], failedUrls=new Set<string>();
 let phase='operation', disposalArmed=false;
 page.on('pageerror',error=>pages.push(error.message));
 page.on('console',message=>{if(message.type()==='error'||message.type()==='warning') consoleErrors.push({type:message.type(),phase,text:message.text(),url:message.location().url});});
 const check=async(label='final')=>{
  expect(pages,'uncaught page errors').toEqual([]);
  const disposal=disposalArmed?await page.evaluate(()=>(window as any).__warningMapDisposal):null;
  if(disposal){expect(disposal.events.filter((event:any)=>event.type==='remove')).toHaveLength(1);expect(disposal.events.find((event:any)=>event.type==='remove').removed).toBe(true);}
  const isOwnedDisposal=(error:ConsoleFailure)=>test.info().project.name==='firefox'&&error.type==='warning'&&error.phase==='controlled-map-disposal'&&disposal?.scriptUrls.includes(error.url)&&error.text.startsWith('[JavaScript Warning: "WebGL context was lost." {file: "'+error.url+'" line: ')&&/ line: [0-9]+\}\]$/.test(error.text)&&disposal.events.some((event:any)=>event.type==='webglcontextlost'&&event.trusted&&event.contextLost)&&disposal.events.some((event:any)=>event.type==='remove'&&event.removed&&event.contextLost);
  const unexpected=consoleErrors.filter(error=>!([...failedUrls].some(url=>error.url===url||error.text.includes(url)) && /503|failed|failure|load|fetch|network|ajax|HTTP/i.test(error.text))&&!isOwnedDisposal(error));
  await test.info().attach('expected-local-resource-errors-'+label,{body:JSON.stringify({failedUrls:[...failedUrls],consoleErrors,disposal,unexpected},null,2),contentType:'application/json'});
  expect(unexpected,'console errors outside exact rejected resources or proven native map disposal').toEqual([]);
 };
 return {failedUrls,check,async armMapDisposal(id:number){
  // Fail any rendering-phase warning before granting a disposal-specific allowance.
  await check('before-map-disposal');
  await page.evaluate(id=>{const map=(window as any).__runtime.instance(id).map,canvas=map.getCanvas(),gl=map.painter.context.gl;const journal={scriptUrls:performance.getEntriesByType('resource').map(resource=>resource.name).filter(url=>/\/chunks\/maplibre-gl-[^/]+\.js$/.test(url)),events:[] as any[]};(window as any).__warningMapDisposal=journal;canvas.addEventListener('webglcontextlost',(event:Event)=>journal.events.push({type:event.type,trusted:event.isTrusted,contextLost:gl.isContextLost()}));map.once('remove',()=>journal.events.push({type:'remove',removed:map._removed,contextLost:gl.isContextLost()}));},id);
  disposalArmed=true;phase='controlled-map-disposal';
 }};
}
async function commitNumberWithNativeBlur(page:Page,input:Locator,value:string) {
 await input.evaluate(el=>{const events:any[]=[],listener=(event:Event)=>events.push({type:event.type,trusted:event.isTrusted,value:(el as HTMLInputElement).value});const target=el.ownerDocument.createElement('input');target.type='text';target.setAttribute('aria-label','Gantt確定先の参照入力');el.ownerDocument.querySelector('#runtime-anchor')!.insertAdjacentElement('afterend',target);(window as any).__warningGanttCommit={events,listener,target};for(const type of ['input','change','blur','focusout'])el.addEventListener(type,listener);});
 try {
  await input.fill(value);await expect(input).toHaveValue(value);
  const target=page.getByRole('textbox',{name:'Gantt確定先の参照入力',exact:true});await target.click();await expect(target).toBeFocused();
  const events=await input.evaluate(()=>(window as any).__warningGanttCommit.events);
  await test.info().attach('gantt-native-commit',{body:JSON.stringify(events),contentType:'application/json'});
  expect(events.filter((event:any)=>event.type==='change')).toEqual([{type:'change',trusted:true,value}]);
  expect(events.some((event:any)=>event.type==='blur'&&event.trusted&&event.value===value)).toBe(true);
 } finally {await input.evaluate(el=>{const listener=(window as any).__warningGanttCommit.listener;for(const type of ['input','change','blur','focusout'])el.removeEventListener(type,listener);(window as any).__warningGanttCommit.target.remove();});}
}
async function bitmap(page:Page,width:number,height:number) {
 return page.evaluate(({width,height})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d')!;ctx.fillStyle='red';ctx.fillRect(0,0,width/2,height);ctx.fillStyle='blue';ctx.fillRect(width/2,0,width/2,height);return c.toDataURL('image/png');},{width,height});
}
async function decoded(image:Locator,width:number,height:number) {
 await expect.poll(()=>image.evaluate(el=>{const i=el as HTMLImageElement;return i.complete?[i.naturalWidth,i.naturalHeight]:[];})).toEqual([width,height]);
}
async function inspect(page:Page,id:number) {return page.evaluate(id=>(window as any).__runtime.inspect(id),id);}
async function destroy(page:Page,id:number) {await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await settle(page);await expect(host(page,id)).toHaveCount(0);}
const near=(actual:number,expected:number,label:string)=>expect(Math.abs(actual-expected),label).toBeLessThanOrEqual(1);
async function viewerOracle(page:Page,node:Locator,naturalWidth:number,naturalHeight:number,angle:90|270,zoom:number) {
 const viewport=node.locator('.ui-image-viewport');await viewport.scrollIntoViewIfNeeded();await viewport.evaluate(el=>el.scrollTo({left:0,top:0,behavior:'instant'}));await settle(page);
 const m=await node.evaluate(root=>{const vp=root.querySelector<HTMLElement>('.ui-image-viewport')!,canvas=root.querySelector<HTMLElement>('.ui-image-canvas')!,image=canvas.querySelector<HTMLElement>('ui-image')!,native=image.querySelector<HTMLImageElement>('img')!,s=getComputedStyle(vp),matrix=new DOMMatrix(getComputedStyle(image).transform);return {available:vp.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),viewport:vp.getBoundingClientRect().toJSON(),canvas:canvas.getBoundingClientRect().toJSON(),image:image.getBoundingClientRect().toJSON(),native:native.getBoundingClientRect().toJSON(),natural:[native.naturalWidth,native.naturalHeight],matrix:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f]};});
 const w=m.available*zoom,h=w*naturalHeight/naturalWidth;
 expect(m.natural).toEqual([naturalWidth,naturalHeight]);near(m.canvas.width,h,'quarter-turn canvas width');near(m.canvas.height,w,'quarter-turn canvas height');near(m.image.width,h,'transformed image width');near(m.image.height,w,'transformed image height');near(m.image.x+m.image.width/2,m.canvas.x+h/2,'image center x');near(m.image.y+m.image.height/2,m.canvas.y+w/2,'image center y');near(m.native.width,h,'native transformed width');near(m.native.height,w,'native transformed height');
 const expected=angle===90?[0,1,-1,0,h,0]:[0,-1,1,0,0,w];for(let n=0;n<6;n++)expect(Math.abs(m.matrix[n]!-expected[n]!),'independent DOMMatrix '+n).toBeLessThanOrEqual(.01);
 const png=await viewport.screenshot();
 const pixels=await page.evaluate(async({png,viewport,points})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);return points.map(p=>{const x=Math.floor((p.x-viewport.x)*canvas.width/viewport.width),y=Math.floor((p.y-viewport.y)*canvas.height/viewport.height);if(x<0||y<0||x>=canvas.width||y>=canvas.height)throw new Error('Marker falls outside visible viewport');return [...ctx.getImageData(x,y,1,1).data];});},{png:png.toString('base64'),viewport:m.viewport,points:[.25,.75].map(f=>({x:m.canvas.x+expected[0]!*w*f+expected[2]!*h/2+expected[4]!,y:m.canvas.y+expected[1]!*w*f+expected[3]!*h/2+expected[5]!}))});
 expect(pixels).toEqual([[255,0,0,255],[0,0,255,255]]);await test.info().attach('viewer-reopen-independent-geometry-and-pixels',{body:JSON.stringify({m,w,h,angle,zoom,pixels}),contentType:'application/json'});
}
for(const c of contexts) {
 test(`warning recheck CF1 Viewer D089-D093 ${c.name}: hidden environment pending src owner and quarter-turn reopen`,async({page})=>{
  const errors=diagnostics(page);await ready(page,c);const landscape=await bitmap(page,400,200),portrait=await bitmap(page,200,400);
  const id=await create(page,'ImageViewer',{label:'非表示中も最新画像を保持',open:true,zoom:.5,rotation:90,images:[{id:'initial',src:landscape,alt:'最初の横画像'}]}),node=host(page,id),image=node.locator('.ui-image-canvas img');await decoded(image,400,200);await viewerOracle(page,node,400,200,90,.5);
  const instance=await page.evaluateHandle(id=>(window as any).__runtime.instance(id),id);await update(page,id,{open:false});await node.evaluate(el=>(el as HTMLElement).hidden=true);
  const other=contexts.find(x=>x.width!==c.width&&x.profile!==c.profile)!;await environment(page,other);
  const stalePath='/warning-recheck-viewer-stale-'+c.name+'.png',latestPath='/warning-recheck-viewer-latest-'+c.name+'.png';
  let staleRoute:any,latestRoute:any,staleSeen!:()=>void,latestSeen!:()=>void;const staleRequested=new Promise<void>(r=>staleSeen=r),latestRequested=new Promise<void>(r=>latestSeen=r);
  await page.route('**'+stalePath,route=>{staleRoute=route;staleSeen();});await page.route('**'+latestPath,route=>{latestRoute=route;latestSeen();});
  await update(page,id,{images:[{id:'stale',src:stalePath,alt:'遅い旧横画像'}]});await staleRequested;
  await update(page,id,{images:[{id:'latest',src:latestPath,alt:'現在の縦画像'}],rotation:270,zoom:.5});await latestRequested;
  await latestRoute.fulfill({status:200,contentType:'image/png',body:Buffer.from(portrait.split(',')[1]!,'base64')});await decoded(image,200,400);const beforeLate=await inspect(page,id);
  await staleRoute.fulfill({status:200,contentType:'image/png',body:Buffer.from(landscape.split(',')[1]!,'base64')});await settle(page);await decoded(image,200,400);await expect(image).toHaveAttribute('src',latestPath);expect((await inspect(page,id)).events).toEqual(beforeLate.events);
  await node.evaluate(el=>(el as HTMLElement).hidden=false);await update(page,id,{open:true});await expect(node.locator('dialog')).toBeVisible();await expect.poll(()=>node.locator('.ui-image-canvas').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(1);await viewerOracle(page,node,200,400,270,.5);
  expect(await page.evaluate(({id,old})=>(window as any).__runtime.instance(id)===old,{id,old:instance})).toBe(true);await instance.dispose();expect((await inspect(page,id)).events).toEqual(beforeLate.events);await expect(node.getByRole('button',{name:'画像を再取得',exact:true})).toHaveCount(0);
  await destroy(page,id);await errors.check();
 });
}
for(const c of contexts.filter(x=>x.name==='A'||x.name==='B')) {
 test(`warning recheck CF2 Cropper D081-D086 ${c.name}: disabled encode and stale real decode rejection`,async({page})=>{
  const errors=diagnostics(page);await ready(page,c);const png=await bitmap(page,200,100);
  const id=await create(page,'ImageCropper',{label:'出力の所有権',alt:'赤青画像'}),node=host(page,id);
  await page.evaluate(()=>{const original=window.createImageBitmap;const control={rejectors:[] as (()=>void)[],restore:()=>{window.createImageBitmap=original;}};(window as any).__warningCropDecode=control;window.createImageBitmap=((...args:any[]) => (original as any)(...args).catch((error:unknown)=>new Promise((_,reject)=>control.rejectors.push(()=>reject(error))))) as typeof createImageBitmap;});
  try {
   await page.evaluate(id=>(window as any).__runtime.update(id,{file:new File(['broken-native-bitmap'],'broken.png',{type:'image/png'})}),id);await expect.poll(()=>page.evaluate(()=>(window as any).__warningCropDecode.rejectors.length)).toBe(1);
   await page.evaluate(({id,png})=>{const bytes=Uint8Array.from(atob(png.split(',')[1]!),ch=>ch.charCodeAt(0));(window as any).__runtime.update(id,{file:new File([bytes],'latest.png',{type:'image/png'})});},{id,png});
   const confirm=node.getByRole('button',{name:'切抜きを確定',exact:true});await expect(confirm).toBeEnabled();await expect(node.locator('canvas')).toHaveAttribute('width','200');const before=await inspect(page,id);
   await page.evaluate(()=>(window as any).__warningCropDecode.rejectors.shift()());await settle(page);expect((await inspect(page,id)).events).toEqual(before.events);await expect(node.locator('.ui-media-error')).toHaveCount(0);await expect(node.locator('canvas')).toHaveAttribute('width','200');await expect(confirm).toBeEnabled();
   await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;const control={pending:[] as (()=>void)[],restore:()=>{HTMLCanvasElement.prototype.toBlob=original;}};(window as any).__warningCropEncode=control;HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){original.call(this,blob=>control.pending.push(()=>callback(blob)),type,quality);};});
   try {
    await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).__warningCropEncode.pending.length)).toBe(1);await update(page,id,{disabled:true});await page.evaluate(()=>(window as any).__warningCropEncode.pending.shift()());await settle(page);expect((await inspect(page,id)).events.filter((e:any)=>e.name==='confirmed')).toEqual([]);await expect(confirm).toBeDisabled();
    await update(page,id,{disabled:false});await expect(confirm).toBeEnabled();await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).__warningCropEncode.pending.length)).toBe(1);await page.evaluate(()=>(window as any).__warningCropEncode.pending.shift()());await expect.poll(async()=>(await inspect(page,id)).events.filter((e:any)=>e.name==='confirmed').length).toBe(1);
    const output=await page.evaluate(async id=>{const value=(window as any).__runtime.inspect(id).events.find((e:any)=>e.name==='confirmed').value;const image=await createImageBitmap(value.blob),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);const result={width:value.width,height:value.height,pixel:[...ctx.getImageData(25,25,1,1).data],requestId:value.requestId};image.close();return result;},id);expect(output).toEqual({width:200,height:100,pixel:[255,0,0,255],requestId:2});
   } finally {await page.evaluate(()=>(window as any).__warningCropEncode.restore());}
  } finally {await page.evaluate(()=>(window as any).__warningCropDecode.restore());}
  await destroy(page,id);await errors.check();
 });
 test(`warning recheck CF3 Map D116-D120 ${c.name}: real local source failure fallback and valid replacement`,async({page})=>{
  test.setTimeout(120000);const errors=diagnostics(page);await ready(page,c);const path='/warning-recheck-map-failed-'+c.name+'.geojson';let requests=0;
  await page.route('**'+path,async route=>{requests++;errors.failedUrls.add(route.request().url());await route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture source unavailable"}'});});
  const regions=[{id:'r',label:'保持する領域',rings:[[[-8,-8],[8,-8],[8,8],[-8,8],[-8,-8]]]}],markers=[{id:'m',label:'保持するマーカー',coordinate:[15,15]}];
  const id=await create(page,'MapView',{label:'取得失敗から復旧',workerUrl:'/assets/maplibre/maplibre-gl-worker.mjs',camera:{center:[0,0],zoom:3},markers,regions,baseStyle:{version:8,sources:{failed:{type:'geojson',data:path}},layers:[{id:'background',type:'background',paint:{'background-color':'#ffffff'}},{id:'failed-data',type:'fill',source:'failed',paint:{'fill-color':'#123456'}}]}}),node=host(page,id);
  await expect(node.getByRole('alert')).toContainText('一覧を確認');expect(requests).toBeGreaterThan(0);await expect(node.locator('p[role="status"]')).toHaveCount(0);await expect(node.getByRole('list',{name:'マーカーと領域',exact:true}).getByRole('button',{name:'保持するマーカー',exact:true})).toBeEnabled();await node.getByRole('button',{name:'保持する領域の領域',exact:true}).press('Enter');expect((await inspect(page,id)).events.at(-1)).toEqual({name:'selectionChange',value:'r'});
  await node.evaluate(el=>{const s=(el as HTMLElement).style;s.setProperty('--ui-color-success','#10c040');s.setProperty('--ui-color-action','#d02050');s.setProperty('--ui-color-background','#ffffff');s.setProperty('--ui-opacity-map-region','.5');});
  await update(page,id,{selected:'r',baseStyle:{version:8,sources:{},layers:[{id:'current-base',type:'background',paint:{'background-color':'#ffffff'}}]}});
  await expect.poll(()=>page.evaluate(id=>{const m=(window as any).__runtime.instance(id).map;return !!m?.isStyleLoaded()&&!!m.getLayer('current-base')&&!!m.getLayer('ui-regions');},id)).toBe(true);
  await page.evaluate(id=>new Promise<void>(resolve=>{const m=(window as any).__runtime.instance(id).map;m.once('idle',()=>resolve());m.triggerRepaint();}),id);
  const data=await page.evaluate(id=>{const m=(window as any).__runtime.instance(id).map,p=m.project([0,0]);return {fill:m.getPaintProperty('ui-regions','fill-color'),opacity:m.getPaintProperty('ui-regions','fill-opacity'),old:!!m.getLayer('failed-data'),point:{x:p.x,y:p.y}};},id);expect(data.old).toBe(false);expect(data.fill).toEqual(['case',['==',['get','uiId'],'r'],'#10c040','#d02050']);expect(data.opacity).toBe(.5);
  const canvas=node.locator('canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();expect(box).not.toBeNull();const png=await canvas.screenshot();const pixel=await page.evaluate(async({png,point,width,height})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);return [...ctx.getImageData(Math.floor(point.x*c.width/width),Math.floor(point.y*c.height/height),1,1).data];},{png:png.toString('base64'),point:data.point,width:box!.width,height:box!.height});for(let n=0;n<3;n++)expect(Math.abs(pixel[n]!-[136,224,160][n]!)).toBeLessThanOrEqual(4);expect(pixel[3]).toBe(255);
  // The current Map contract preserves the failure explanation. Successful new
  // paint is proven separately; no undocumented error-clearing policy is added.
  await expect(node.getByRole('list',{name:'マーカーと領域',exact:true}).getByRole('button',{name:'保持するマーカー',exact:true})).toBeEnabled();await test.info().attach('map-fallback-and-new-scene',{body:JSON.stringify({requests,data,pixel,remainingAlert:await node.getByRole('alert').allTextContents()}),contentType:'application/json'});await errors.armMapDisposal(id);await destroy(page,id);await errors.check();
 });
 test(`warning recheck CF5 Chart Gantt D009-D011 D077-D079 ${c.name}: rejected real bundled modules preserve raw table`,async({page})=>{
  const errors=diagnostics(page);await ready(page,c);let rejected=0;
  await page.route('**/chunks/*.js',async route=>{rejected++;errors.failedUrls.add(route.request().url());await route.fulfill({status:503,contentType:'text/javascript',body:'// Deliberate local fixture module failure.'});});
  const chart=await create(page,'Chart',{series:[{id:'s',label:'保持する系列',points:[{id:'p',label:'保持する値',value:75}]}]}),gantt=await create(page,'Gantt',{tasks:[{id:'t',label:'保持する工程',start:'2026-10-01',end:'2026-10-07',progress:25,dependencies:[]}]});
  const a=host(page,chart),b=host(page,gantt);await expect(a.getByRole('alert')).toContainText('データ表で確認');await expect(b.getByRole('alert')).toContainText('タスク表で確認');expect(rejected).toBeGreaterThan(0);await expect(a.getByRole('status')).toHaveCount(0);await expect(a.locator('tbody')).toContainText('保持する値');await expect(a.locator('tbody')).toContainText('75');await expect(b.locator('tbody')).toContainText('保持する工程');await expect(b.getByRole('spinbutton',{name:'保持する工程 進捗を編集',exact:true})).toHaveValue('25');await expect(a.locator('.ui-specialist-surface svg')).toHaveCount(0);await expect(b.locator('.ui-specialist-surface svg')).toHaveCount(0);
  await a.getByRole('button',{name:'保持する値を選択',exact:true}).press('Enter');expect((await inspect(page,chart)).events.at(-1)).toEqual({name:'selectionChange',value:{seriesId:'s',pointId:'p'}});await commitNumberWithNativeBlur(page,b.getByRole('spinbutton',{name:'保持する工程 進捗を編集',exact:true}),'90');await expect.poll(async()=>(await inspect(page,gantt)).events.at(-1)).toMatchObject({name:'taskChange',value:{taskId:'t',progress:90}});expect(await page.evaluate(id=>(window as any).__runtime.instance(id).tasks()[0].progress,gantt)).toBe(25);
  expect(await page.evaluate(id=>(window as any).__runtime.instance(id).selected(),chart)).toBeNull();const beforeA=await inspect(page,chart),beforeB=await inspect(page,gantt);await destroy(page,chart);await destroy(page,gantt);expect((await inspect(page,chart)).events).toEqual(beforeA.events);expect((await inspect(page,gantt)).events).toEqual(beforeB.events);await errors.check();
 });
}
