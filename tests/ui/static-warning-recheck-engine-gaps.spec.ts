import type {Locator,Page,Route} from '@playwright/test';
import {test as base,expect,contexts,ready,create,host,update,settle,record,destroy} from './css-override-test';

type Failure={type:string;phase:string;text:string;url:string};
type Diagnostic=ReturnType<typeof diagnostics>;
const journals=new WeakMap<Page,Diagnostic>();
// Keep the shared lifecycle fixture, replacing only its error collector with the
// exact-resource and native-disposal checks needed by these deliberate failures.
const test=base.extend({runtimeErrors:async({page},use)=>{const journal=diagnostics(page);journals.set(page,journal);await use([]);await journal.check('final');}});
function diagnostics(page:Page){
 const uncaught:string[]=[],messages:Failure[]=[],failedUrls=new Set<string>();let phase='operation',disposalArmed=false;
 page.on('pageerror',error=>uncaught.push(error.message));
 page.on('console',message=>{if(message.type()==='warning'||message.type()==='error')messages.push({type:message.type(),phase,text:message.text(),url:message.location().url});});
 const check=async(label:string)=>{
  expect(uncaught,'uncaught page errors').toEqual([]);
  const disposal=disposalArmed?await page.evaluate(()=>(window as any).__engineGapDisposal):null;
  if(disposal){expect(disposal.events.filter((event:any)=>event.type==='remove')).toHaveLength(1);expect(disposal.events.find((event:any)=>event.type==='remove').removed).toBe(true);}
  const ownedDisposal=(message:Failure)=>test.info().project.name==='firefox'&&message.type==='warning'&&message.phase==='controlled-map-disposal'&&disposal?.scriptUrls.includes(message.url)&&message.text.startsWith('[JavaScript Warning: "WebGL context was lost." {file: "'+message.url+'" line: ')&&/ line: [0-9]+\}\]$/.test(message.text)&&disposal.events.some((event:any)=>event.type==='webglcontextlost'&&event.trusted&&event.contextLost)&&disposal.events.some((event:any)=>event.type==='remove'&&event.removed&&event.contextLost);
  const unexpected=messages.filter(message=>!([...failedUrls].some(url=>message.url===url||message.text.includes(url))&&/503|failed|failure|load|fetch|network|ajax|HTTP/i.test(message.text))&&!ownedDisposal(message));
  await record('engine-gap-diagnostics-'+label,{failedUrls:[...failedUrls],messages,disposal,unexpected});
  expect(unexpected,'warnings/errors outside exact rejected resources or proven native disposal').toEqual([]);
 };
 return {failedUrls,check,async armDisposal(id:number){
  await check('before-disposal');
  await page.evaluate(id=>{const map=(window as any).__runtime.instance(id).map,canvas=map.getCanvas(),gl=map.painter.context.gl,journal={scriptUrls:performance.getEntriesByType('resource').map(resource=>resource.name).filter(url=>/\/chunks\/maplibre-gl-[^/]+\.js$/.test(url)),events:[] as any[]};(window as any).__engineGapDisposal=journal;canvas.addEventListener('webglcontextlost',(event:Event)=>journal.events.push({type:event.type,trusted:event.isTrusted,contextLost:gl.isContextLost()}));map.once('remove',()=>journal.events.push({type:'remove',removed:map._removed,contextLost:gl.isContextLost()}));},id);
  disposalArmed=true;phase='controlled-map-disposal';
 }};
}

const mapContext=contexts[1];
for(const outcome of ['resolve','reject'] as const)for(const order of ['delivery-first','destroy-first'] as const)test(`engine gaps Map module B: actual ${outcome} ${order} latest inputs`,async({page})=>{
 test.setTimeout(120000);await ready(page,mapContext);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),requests:string[]=[],workerRequests:string[]=[];const diagnostics=journals.get(page)!;
 page.on('request',request=>{if(request.url().includes('worker'))workerRequests.push(request.url());});
 const handler=async(route:Route)=>{const url=route.request().url();requests.push(url);await gate;if(outcome==='reject'){diagnostics.failedUrls.add(url);await route.fulfill({status:503,contentType:'text/javascript',body:'// Deliberate Map module HTTP503.'});}else await route.continue();};await page.route('**/chunks/maplibre-gl-*.js',handler);
 try{
  const id=await create(page,'MapView',{workerUrl:'/engine-gap-obsolete-worker-never.js',camera:{center:[40,20],zoom:1},regions:regions('old'),markers:[{id:'marker-old',label:'古いマーカー',coordinate:[40,20]}],baseStyle:baseStyle('old-base')}),node=host(page,id);await expect.poll(()=>requests.length).toBeGreaterThan(0);await watchOutputs(page,[id]);
  const instance=await page.evaluateHandle(id=>(window as any).__runtime.instance(id),id),retained=await node.elementHandle();
  await page.evaluate(({id,latestRegions,latestStyle,remove})=>{const api=(window as any).__runtime;api.update(id,{workerUrl:'/assets/maplibre/maplibre-gl-worker.mjs',camera:{center:[0,0],zoom:3},regions:latestRegions,markers:[{id:'marker-latest',label:'最新のマーカー',coordinate:[15,15]}],selected:'latest',baseStyle:latestStyle});if(remove)api.destroy(id);},{id,latestRegions:regions('latest'),latestStyle:baseStyle('latest-base'),remove:order==='destroy-first'});
  const pendingDestroyed=order==='destroy-first'?await mapState(page,id):null;release();
  const terminal=await page.evaluate(urls=>Promise.all(urls.map(url=>import(url).then(()=>({url,result:'resolved'}),()=>({url,result:'rejected'})))),[...new Set(requests)]);expect(terminal).toHaveLength(1);expect(terminal[0]!.result).toBe(outcome==='resolve'?'resolved':'rejected');await settle(page);
  let rendered:unknown=null,newestScene:unknown=null;
  if(order==='delivery-first'){
   if(outcome==='resolve'){
    await mapLoaded(page,id,'latest-base');rendered=await page.evaluate(id=>{const instance=(window as any).__runtime.instance(id),map=instance.map;return {layers:map.getStyle().layers.map((layer:any)=>layer.id),camera:{center:map.getCenter().toArray(),zoom:map.getZoom()},ids:[...new Set(map.queryRenderedFeatures(map.project([0,0]),{layers:['ui-regions']}).map((feature:any)=>feature.properties.uiId))],markers:[...instance.engineMarkers.keys()]};},id);
    expect(rendered).toEqual({layers:['latest-base','ui-regions','ui-region-outline'],camera:{center:[0,0],zoom:3},ids:['latest'],markers:['marker-latest']});await expect(node.getByRole('alert')).toHaveCount(0);expect(workerRequests.some(url=>url.endsWith('/assets/maplibre/maplibre-gl-worker.mjs'))).toBe(true);
   }else{
    await expect(node.getByRole('alert')).toContainText('地図を描画できません');expect((await mapState(page,id)).map).toBe(false);await expect(node.locator('canvas')).toHaveCount(0);await expect(node.locator('p[role="status"]')).toHaveCount(0);
   }
   await expect(node.getByRole('button',{name:'領域 latestの領域',exact:true})).toHaveAttribute('aria-pressed','true');const fallback=node.getByRole('list',{name:'マーカーと領域',exact:true});await expect(fallback).not.toContainText('古いマーカー');
   // A second distinct update is delivered after the native import has settled,
   // so both sides of the module/input ordering have observable value oracles.
   await update(page,id,{camera:{center:[10,5],zoom:4},regions:regions('newest'),markers:[{id:'marker-newest',label:'配信後のマーカー',coordinate:[-15,-15]}],selected:'newest',baseStyle:baseStyle('newest-base')});
   if(outcome==='resolve'){
    await mapLoaded(page,id,'newest-base');newestScene=await page.evaluate(id=>{const instance=(window as any).__runtime.instance(id),map=instance.map;return {layers:map.getStyle().layers.map((layer:any)=>layer.id),camera:{center:map.getCenter().toArray(),zoom:map.getZoom()},ids:[...new Set(map.queryRenderedFeatures(map.project([0,0]),{layers:['ui-regions']}).map((feature:any)=>feature.properties.uiId))],markers:[...instance.engineMarkers.keys()]};},id);expect(newestScene).toEqual({layers:['newest-base','ui-regions','ui-region-outline'],camera:{center:[10,5],zoom:4},ids:['newest'],markers:['marker-newest']});await expect(node.getByRole('alert')).toHaveCount(0);
   }else{await expect(node.getByRole('alert')).toContainText('地図を描画できません');expect((await mapState(page,id)).map).toBe(false);await expect(node.locator('p[role="status"]')).toHaveCount(0);}
   await expect(node.getByRole('button',{name:'領域 newestの領域',exact:true})).toHaveAttribute('aria-pressed','true');await expect(fallback).not.toContainText('最新のマーカー');await fallback.getByRole('button',{name:'配信後のマーカー',exact:true}).press('Enter');expect((await inspect(page,id)).events.at(-1)).toEqual({name:'selectionChange',value:'marker-newest'});expect(await instance.evaluate(value=>value.selected())).toBe('newest');if(outcome==='resolve')await diagnostics.armDisposal(id);await destroy(page,id);
  }else{
   expect(await mapState(page,id)).toEqual(pendingDestroyed);expect(pendingDestroyed!.destroyed).toBe(true);expect(pendingDestroyed!.map).toBe(false);expect(pendingDestroyed!.error).toBeNull();expect(pendingDestroyed!.loading).toBe(true);expect(await emissions(page,[id])).toEqual([{id,events:[]}]);await expect(node).toHaveCount(0);expect(await retained!.evaluate(el=>el.querySelectorAll('canvas').length)).toBe(0);expect(workerRequests).toEqual([]);
  }
  expect(workerRequests.some(url=>url.endsWith('/engine-gap-obsolete-worker-never.js'))).toBe(false);const after=await mapState(page,id),outputAfter=await emissions(page,[id]);await settle(page);expect(await mapState(page,id)).toEqual(after);expect(await emissions(page,[id])).toEqual(outputAfter);expect((await inspect(page,id)).errors).toEqual([]);
  await record('map-native-module-delivery-order',{context:mapContext,outcome,order,requests,workerRequests,terminal,rendered,newestScene,after,outputAfter,scope:'Actual MapLibre module resolve/HTTP503. Latest inputs before delivery and distinct new inputs after terminal delivery are verified for surviving owners; destroy-first does not launch a worker.'});await instance.dispose();await retained!.dispose();
 }finally{release();await page.unroute('**/chunks/maplibre-gl-*.js',handler);}
});
const regions=(revision:string)=>[{id:revision,label:'領域 '+revision,rings:[[[-8,-8],[8,-8],[8,8],[-8,8],[-8,-8]]]}];
const series=(revision:string)=>[{id:'series-'+revision,label:'系列 '+revision,points:[{id:'point-'+revision,label:'値 '+revision,value:revision==='newest'?93:revision==='latest'?87:25}]}];
const tasks=(revision:string)=>[{id:'task-'+revision,label:'工程 '+revision,start:revision==='newest'?'2026-10-15':revision==='latest'?'2026-10-08':'2026-10-01',end:revision==='newest'?'2026-10-21':revision==='latest'?'2026-10-14':'2026-10-07',progress:revision==='newest'?65:revision==='latest'?75:25,dependencies:[]}];
const baseStyle=(id:string)=>({version:8,sources:{},layers:[{id,type:'background',paint:{'background-color':'#ffffff'}}]});
async function inspect(page:Page,id:number){return page.evaluate(id=>(window as any).__runtime.inspect(id),id);}
async function watchOutputs(page:Page,ids:number[]){
 await page.evaluate(ids=>{const runtime=(window as any).__runtime,all=(window as any).__engineGapEmissions??={};for(const id of ids){all[id]=[];const instance=runtime.instance(id);for(const name of ['selectionChange','cameraChange','taskChange','hiddenSeriesChange','scaleChange']){const output=instance[name];if(!output)continue;const emit=output.emit;output.emit=function(value:unknown){all[id].push({name,value});return emit.call(this,value);};}}},ids);
}
async function emissions(page:Page,ids:number[]){return page.evaluate(ids=>ids.map(id=>({id,events:(window as any).__engineGapEmissions[id]})),ids);}
async function commitGantt(page:Page,input:Locator){
 await input.evaluate(el=>{const events:any[]=[],listener=(event:Event)=>events.push({type:event.type,trusted:event.isTrusted,value:(el as HTMLInputElement).value}),target=el.ownerDocument.createElement('input');target.type='text';target.setAttribute('aria-label','競合後のGantt確定先');el.ownerDocument.querySelector('#runtime-anchor')!.insertAdjacentElement('afterend',target);(window as any).__engineGapCommit={events,listener,target};for(const type of ['change','blur'])el.addEventListener(type,listener);});
 try{await input.fill('90');const target=page.getByRole('textbox',{name:'競合後のGantt確定先',exact:true});await target.click();await expect(target).toBeFocused();const events=await input.evaluate(()=>(window as any).__engineGapCommit.events);expect(events.filter((event:any)=>event.type==='change')).toEqual([{type:'change',trusted:true,value:'90'}]);expect(events.some((event:any)=>event.type==='blur'&&event.trusted)).toBe(true);await record('engine-gap-native-gantt-commit',events);}finally{await input.evaluate(el=>{const control=(window as any).__engineGapCommit;for(const type of ['change','blur'])el.removeEventListener(type,control.listener);control.target.remove();});}
}
async function mapState(page:Page,id:number){return page.evaluate(id=>{const instance=(window as any).__runtime.instance(id),map=instance.map;return {destroyed:instance.destroyed,map:!!map,loading:instance.loading(),ready:instance.ready(),error:instance.renderError(),layers:map?.getStyle()?.layers?.map((layer:any)=>layer.id)??[],regions:map?.getSource('ui-regions')?.serialize()?.data??null};},id);}
async function mapLoaded(page:Page,id:number,label:string){
 await expect.poll(()=>page.evaluate(({id,label})=>{const map=(window as any).__runtime.instance(id).map;return !!map?.isStyleLoaded()&&!!map.getLayer(label)&&!!map.getLayer('ui-regions');},{id,label})).toBe(true);
 await page.evaluate(id=>new Promise<void>(resolve=>{const map=(window as any).__runtime.instance(id).map;if(map.loaded())resolve();else {map.once('idle',()=>resolve());map.triggerRepaint();}}),id);
}
async function pendingSource(page:Page,path:string,status:200|503){
 let release!:()=>void,seen!:()=>void,finished!:()=>void;
 const gate=new Promise<void>(resolve=>release=resolve),requested=new Promise<void>(resolve=>seen=resolve),terminal=new Promise<void>(resolve=>finished=resolve),receipts:{url:string;released:boolean;cancelled:boolean}[]=[];
 const handler=async(route:Route)=>{const receipt={url:route.request().url(),released:false,cancelled:false};receipts.push(receipt);if(status===503)journals.get(page)!.failedUrls.add(receipt.url);seen();await gate;try{await route.fulfill({status,contentType:'application/json',body:status===503?'{"error":"test-owned obsolete response"}':JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[60,60]}}]})});receipt.released=true;}catch(error){if(!route.request().failure()&&!page.isClosed())throw error;receipt.cancelled=true;}finally{finished();}};
 await page.context().route('**'+path,handler);
 return {requested,receipts,async release(){release();await terminal;},async cleanup(){release();await page.context().unroute('**'+path,handler);}};
}
function sourceStyle(page:Page,path:string,label:string){return {version:8,sources:{external:{type:'geojson',data:new URL(path,page.url()).href}},layers:[{id:label,type:'background',paint:{'background-color':'#ffffff'}},{id:'obsolete-data',type:'circle',source:'external',paint:{'circle-radius':2,'circle-opacity':0}}]};}

for(const c of contexts.filter(context=>context.name==='A'||context.name==='B')){
 for(const status of [200,503] as const)for(const order of ['response-first','replacement-first'] as const)test(`engine gaps Map ${c.name}: obsolete ${status} ${order}`,async({page})=>{
  test.setTimeout(120000);await ready(page,c);const path=`/engine-gap-${c.name}-${status}-${order}.geojson`,pending=await pendingSource(page,path,status);
  try{
   const id=await create(page,'MapView',{workerUrl:'/assets/maplibre/maplibre-gl-worker.mjs',camera:{center:[0,0],zoom:3},regions:regions('old'),baseStyle:sourceStyle(page,path,'obsolete-base')}),node=host(page,id);
   await pending.requested;expect((await mapState(page,id)).map).toBe(true);
   if(order==='response-first'){
    await pending.release();
    if(status===503)await expect(node.getByRole('alert')).toContainText('一覧を確認');else await mapLoaded(page,id,'obsolete-base');
   }
   await update(page,id,{baseStyle:baseStyle('latest-base'),regions:regions('latest'),selected:'latest'});await mapLoaded(page,id,'latest-base');
   const before=await inspect(page,id);if(order==='replacement-first')await pending.release();await settle(page);await mapLoaded(page,id,'latest-base');
   const state=await mapState(page,id);expect(state.layers).toContain('latest-base');expect(state.layers).not.toContain('obsolete-base');expect(state.layers).not.toContain('obsolete-data');expect(state.regions.features.map((feature:any)=>feature.properties.uiId)).toEqual(['latest']);expect(state.loading).toBe(false);
   const rendered=await page.evaluate(id=>{const map=(window as any).__runtime.instance(id).map;return [...new Set(map.queryRenderedFeatures(map.project([0,0]),{layers:['ui-regions']}).map((feature:any)=>feature.properties.uiId))];},id);expect(rendered).toEqual(['latest']);
   expect((await inspect(page,id)).events).toEqual(before.events);await expect(node.getByRole('button',{name:'領域 latestの領域',exact:true})).toHaveAttribute('aria-pressed','true');
   if(status===503&&order==='response-first')await expect(node.getByRole('alert')).toContainText('一覧を確認');else await expect(node.getByRole('alert')).toHaveCount(0);
   await node.getByRole('button',{name:'領域 latestの領域',exact:true}).press('Enter');expect((await inspect(page,id)).events.at(-1)).toEqual({name:'selectionChange',value:'latest'});
   await record('map-obsolete-response-order',{context:c,status,order,receipts:pending.receipts,state,rendered,scope:'Native MapLibre worker source response. Obsolete replacement-first requests may be natively aborted; no backend cancellation guarantee is inferred.'});
   await journals.get(page)!.armDisposal(id);await destroy(page,id);
  }finally{await pending.cleanup();}
 });
 for(const order of ['failure-first','destroy-first'] as const)test(`engine gaps Map ${c.name}: pending 503 ${order} and synchronous final inputs`,async({page})=>{
  test.setTimeout(120000);await ready(page,c);const path=`/engine-gap-destroy-${c.name}-${order}.geojson`,pending=await pendingSource(page,path,503);
  try{
   const id=await create(page,'MapView',{workerUrl:'/assets/maplibre/maplibre-gl-worker.mjs',camera:{center:[0,0],zoom:3},regions:regions('old'),baseStyle:sourceStyle(page,path,'pending-base')});await pending.requested;
   if(order==='failure-first'){await pending.release();await expect(host(page,id).getByRole('alert')).toContainText('一覧を確認');}
   const instance=await page.evaluateHandle(id=>(window as any).__runtime.instance(id),id),node=await host(page,id).elementHandle(),before=await inspect(page,id);await watchOutputs(page,[id]);await journals.get(page)!.armDisposal(id);
   await page.evaluate(({id,latest})=>{const api=(window as any).__runtime;api.update(id,{regions:latest,selected:'latest'});api.destroy(id);},{id,latest:regions('latest')});
   const afterDestroy=await mapState(page,id);if(order==='destroy-first')await pending.release();await settle(page);await settle(page);
   expect(await mapState(page,id)).toEqual(afterDestroy);expect(afterDestroy.map).toBe(false);expect(afterDestroy.destroyed).toBe(true);expect((await inspect(page,id)).events).toEqual(before.events);expect((await inspect(page,id)).errors).toEqual([]);expect(await emissions(page,[id])).toEqual([{id,events:[]}]);await expect(host(page,id)).toHaveCount(0);expect(await node!.evaluate(el=>el.querySelectorAll('canvas').length)).toBe(0);expect(await instance.evaluate(value=>value.engineMarkers.size)).toBe(0);
   await record('map-destroy-response-order',{context:c,order,receipts:pending.receipts,afterDestroy,scope:'Latest public inputs and destroy happen in one browser task; real held HTTP503 finishes before or after that task.'});await node!.dispose();await instance.dispose();
  }finally{await pending.cleanup();}
 });
 for(const outcome of ['resolve','reject'] as const)for(const order of ['delivery-first','destroy-first'] as const)test(`engine gaps modules ${c.name}: actual ${outcome} ${order} latest input and disposal`,async({page})=>{
  test.setTimeout(120000);await ready(page,c);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),requests:string[]=[];const diagnostics=journals.get(page)!;
  const handler=async(route:Route)=>{const url=route.request().url();requests.push(url);await gate;if(outcome==='reject'){diagnostics.failedUrls.add(url);await route.fulfill({status:503,contentType:'text/javascript',body:'// Deliberate fixture module HTTP503.'});}else await route.continue();};await page.route('**/chunks/*.js',handler);
  try{
   const chart=await create(page,'Chart',{series:series('old')}),gantt=await create(page,'Gantt',{tasks:tasks('old')}),removed=await create(page,'Chart',{series:series('removed')}),removedGantt=await create(page,'Gantt',{tasks:tasks('removed')});await expect.poll(()=>requests.length).toBeGreaterThan(0);
   const removedInstances=await page.evaluateHandle(({removed,removedGantt})=>[(window as any).__runtime.instance(removed),(window as any).__runtime.instance(removedGantt)],{removed,removedGantt});await watchOutputs(page,[chart,gantt,removed,removedGantt]);
   await page.evaluate(({chart,gantt,latestSeries,latestTasks})=>{const api=(window as any).__runtime;api.update(chart,{series:[]});api.update(gantt,{tasks:[]});api.update(chart,{series:latestSeries});api.update(gantt,{tasks:latestTasks,scale:'week'});},{chart,gantt,latestSeries:series('latest'),latestTasks:tasks('latest')});
   if(order==='destroy-first')await page.evaluate(({removed,removedGantt,finalSeries,finalTasks})=>{const api=(window as any).__runtime;api.update(removed,{series:finalSeries});api.update(removedGantt,{tasks:finalTasks});api.destroy(removed);api.destroy(removedGantt);},{removed,removedGantt,finalSeries:series('final'),finalTasks:tasks('final')});
   release();
   if(outcome==='resolve')await expect.poll(()=>page.evaluate(({chart,gantt})=>{const api=(window as any).__runtime;return [chart,gantt].every(id=>{const engine=api.instance(id).chart;return !!engine&&!engine.isDisposed()&&engine.getZr().animation.isFinished();});},{chart,gantt})).toBe(true);
   else {await expect(host(page,chart).getByRole('alert')).toContainText('データ表で確認');await expect(host(page,gantt).getByRole('alert')).toContainText('タスク表で確認');}
   // Observe native import completion, including catch continuations for destroyed
   // owners, rather than treating a pair of animation frames as network delivery.
   const terminal=await page.evaluate(urls=>Promise.all(urls.map(url=>import(url).then(()=>({url,result:'resolved'}),()=>({url,result:'rejected'})))),[...new Set(requests)]);expect(terminal.length).toBeGreaterThan(0);expect(terminal.every(value=>value.result===(outcome==='resolve'?'resolved':'rejected'))).toBe(true);await settle(page);
   if(order==='delivery-first'){
    const mounted=await removedInstances.evaluate(instances=>instances.map((instance:any)=>!!instance.chart));
    if(outcome==='resolve')expect(mounted).toEqual([true,true]);
    await page.evaluate(({removed,removedGantt,finalSeries,finalTasks})=>{const api=(window as any).__runtime;api.update(removed,{series:finalSeries});api.update(removedGantt,{tasks:finalTasks});api.destroy(removed);api.destroy(removedGantt);},{removed,removedGantt,finalSeries:series('final'),finalTasks:tasks('final')});
   }
   const destroyedState=await removedInstances.evaluate(instances=>instances.map((instance:any)=>({destroyed:instance.destroyed,chartPresent:!!instance.chart,disposed:instance.chart?.isDisposed()??null,error:instance.renderError(),loading:instance.loading?.()??null})));expect(destroyedState.every(value=>value.destroyed&&(!value.chartPresent||value.disposed))).toBe(true);
   if(order==='destroy-first')expect(destroyedState).toEqual([{destroyed:true,chartPresent:false,disposed:null,error:null,loading:true},{destroyed:true,chartPresent:false,disposed:null,error:null,loading:null}]);
   for(const id of [removed,removedGantt]){await expect(host(page,id)).toHaveCount(0);expect((await inspect(page,id)).events).toEqual([]);expect((await inspect(page,id)).errors).toEqual([]);}expect(await emissions(page,[chart,gantt,removed,removedGantt])).toEqual([chart,gantt,removed,removedGantt].map(id=>({id,events:[]})));
   await expect(host(page,chart).locator('tbody')).toContainText('値 latest');await expect(host(page,chart).locator('tbody')).toContainText('87');await expect(host(page,chart).locator('tbody')).not.toContainText('値 old');await expect(host(page,gantt).locator('tbody')).toContainText('工程 latest');await expect(host(page,gantt).locator('tbody')).not.toContainText('工程 old');await expect(host(page,gantt).getByRole('spinbutton',{name:'工程 latest 進捗を編集',exact:true})).toHaveValue('75');
   let options:unknown=null;
   if(outcome==='resolve'){
    options=await page.evaluate(({chart,gantt})=>{const api=(window as any).__runtime,a=api.instance(chart).chart.getOption(),b=api.instance(gantt).chart.getOption();return {chart:a.series[0].data.map((point:any)=>({id:point.id,name:point.name,value:point.value})),gantt:b.yAxis[0].data,progress:b.series[0].data.map((point:any)=>point[3]),dates:b.series[0].data.map((point:any)=>[point[0],point[1]])};},{chart,gantt});expect(options).toEqual({chart:[{id:'point-latest',name:'値 latest',value:87}],gantt:['工程 latest'],progress:[75],dates:[[Date.parse('2026-10-08T00:00:00Z'),Date.parse('2026-10-15T00:00:00Z')]]});
   }else {await expect(host(page,chart).locator('.ui-specialist-surface svg')).toHaveCount(0);await expect(host(page,gantt).locator('.ui-specialist-surface svg')).toHaveCount(0);}
   const optionsBeforePostDeliveryUpdate=options;
   await page.evaluate(({chart,gantt,newestSeries,newestTasks})=>{const api=(window as any).__runtime;api.update(chart,{series:newestSeries});api.update(gantt,{tasks:newestTasks,scale:'month'});},{chart,gantt,newestSeries:series('newest'),newestTasks:tasks('newest')});await settle(page);
   await expect(host(page,chart).locator('tbody')).toContainText('値 newest');await expect(host(page,chart).locator('tbody')).toContainText('93');await expect(host(page,chart).locator('tbody')).not.toContainText('値 latest');await expect(host(page,gantt).locator('tbody')).toContainText('工程 newest');await expect(host(page,gantt).locator('tbody')).not.toContainText('工程 latest');await expect(host(page,gantt).getByRole('spinbutton',{name:'工程 newest 進捗を編集',exact:true})).toHaveValue('65');await expect(host(page,gantt).getByLabel('工程 newest 開始',{exact:true})).toHaveValue('2026-10-15');await expect(host(page,gantt).getByLabel('工程 newest 終了',{exact:true})).toHaveValue('2026-10-21');
   if(outcome==='resolve'){
    options=await page.evaluate(({chart,gantt})=>{const api=(window as any).__runtime,a=api.instance(chart).chart.getOption(),b=api.instance(gantt).chart.getOption();return {chart:a.series[0].data.map((point:any)=>({id:point.id,name:point.name,value:point.value})),gantt:b.yAxis[0].data,progress:b.series[0].data.map((point:any)=>point[3]),dates:b.series[0].data.map((point:any)=>[point[0],point[1]])};},{chart,gantt});expect(options).toEqual({chart:[{id:'point-newest',name:'値 newest',value:93}],gantt:['工程 newest'],progress:[65],dates:[[Date.parse('2026-10-15T00:00:00Z'),Date.parse('2026-10-22T00:00:00Z')]]});await expect(host(page,chart).getByRole('alert')).toHaveCount(0);await expect(host(page,gantt).getByRole('alert')).toHaveCount(0);
   }else{await expect(host(page,chart).getByRole('alert')).toContainText('データ表で確認');await expect(host(page,gantt).getByRole('alert')).toContainText('タスク表で確認');await expect(host(page,chart).locator('.ui-specialist-surface svg')).toHaveCount(0);await expect(host(page,gantt).locator('.ui-specialist-surface svg')).toHaveCount(0);}
   await host(page,chart).getByRole('button',{name:'値 newestを選択',exact:true}).press('Enter');expect((await inspect(page,chart)).events.at(-1)).toEqual({name:'selectionChange',value:{seriesId:'series-newest',pointId:'point-newest'}});expect(await page.evaluate(id=>(window as any).__runtime.instance(id).selected(),chart)).toBeNull();
   await commitGantt(page,host(page,gantt).getByRole('spinbutton',{name:'工程 newest 進捗を編集',exact:true}));await expect.poll(async()=>(await inspect(page,gantt)).events.at(-1)).toMatchObject({name:'taskChange',value:{taskId:'task-newest',previous:{progress:65},progress:90}});expect(await page.evaluate(id=>(window as any).__runtime.instance(id).tasks()[0].progress,gantt)).toBe(65);
   await settle(page);expect(await removedInstances.evaluate(instances=>instances.map((instance:any)=>({destroyed:instance.destroyed,chartPresent:!!instance.chart,disposed:instance.chart?.isDisposed()??null,error:instance.renderError(),loading:instance.loading?.()??null})))).toEqual(destroyedState);expect(await emissions(page,[removed,removedGantt])).toEqual([removed,removedGantt].map(id=>({id,events:[]})));
   await record('native-module-delivery-orders',{context:c,outcome,order,requests,terminal,destroyedState,optionsBeforePostDeliveryUpdate,options,scope:'Real bundled modules and native import completion. Surviving owners receive distinct public inputs before and after delivery; removed-owner final update and destroy share one browser task. Arbitrary backend timing is outside this finite contract.'});await destroy(page,chart);await destroy(page,gantt);await removedInstances.dispose();
  }finally{release();await page.unroute('**/chunks/*.js',handler);}
 });
}
