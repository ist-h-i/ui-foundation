import {test,expect} from '@playwright/test';
for(const m of [{name:'A',profile:'guided',width:1280,font:'100%',dir:'ltr'},{name:'B',profile:'dense',width:320,font:'200%',dir:'rtl'}]){
 test(`data-grid-hierarchy-level R019 ${m.name}: validated logical indent, invalid hidden bindings and recovery`,async({page},info)=>{
  await page.setViewportSize({width:m.width,height:900});await page.emulateMedia({reducedMotion:m.name==='B'?'reduce':'no-preference'});await page.goto('/catalog/static-runtime');await expect.poll(()=>page.evaluate(()=>typeof (window as any).__runtime?.create)).toBe('function');await page.evaluate(m=>{document.documentElement.style.fontSize=m.font;document.documentElement.dir=m.dir;document.documentElement.setAttribute('data-ui-profile',m.profile);},m);
  const id=await page.evaluate(()=>(window as any).__runtime.create('DataGrid',{gridId:'runtime-grid',keyField:'id',caption:'階層行',columns:[{id:'name',field:'name',header:'氏名',type:'text'}],rows:[{id:'row',name:'保持する申請'}],treeRows:[{id:'row',parentId:null,level:1,position:1,setSize:1,branch:false,expanded:false}]}));const host=page.locator(`[data-runtime-id="${id}"]`),span=host.locator('.ui-data-grid__hierarchy');
  expect(await page.evaluate(id=>(window as any).__runtime.inspect(id).errors,id)).toEqual([]);
  const measurements=[];
  for(const level of [1,2,32,100]){
   await page.evaluate(({id,level})=>(window as any).__runtime.update(id,{treeRows:[{id:'row',parentId:null,level,position:1,setSize:1,branch:false,expanded:false}]}),{id,level});
   const measured=await span.evaluate(n=>{const s=getComputedStyle(n),td=n.closest('td')!,t=getComputedStyle(td);const probe=document.createElement('div');probe.style.width='var(--ui-space-control-x)';td.append(probe);const unit=probe.getBoundingClientRect().width;probe.remove();return {padding:parseFloat(s.paddingInlineStart),unit,direction:s.direction,cellPadding:parseFloat(t.paddingInlineStart),cellBorder:parseFloat(t.borderInlineStartWidth)};});
   expect(Math.abs(measured.padding-(level-1)*measured.unit)).toBeLessThanOrEqual(1);expect(measured.direction).toBe(m.dir);measurements.push({level,...measured});
  }
  await host.locator('[data-grid-cell]').focus();
  for(const invalid of [0,-1,1.5,NaN,Infinity]){
   await page.evaluate(({id,level})=>(window as any).__runtime.update(id,{treeRows:[{id:'row',parentId:null,level,position:1,setSize:1,branch:false,expanded:false}]}),{id,level:invalid});await expect(host.getByRole('alert')).toBeVisible();await expect(host.locator('.ui-data-grid__viewport')).toBeHidden();
   await expect(span,'invalid metadata must not instantiate the style producer even behind hidden viewport').toHaveCount(0);
   await page.evaluate(id=>(window as any).__runtime.update(id,{treeRows:[{id:'row',parentId:null,level:2,position:1,setSize:1,branch:false,expanded:false}]}),id);await expect(host.getByRole('alert')).toHaveCount(0);await expect(span).toHaveCount(1);await expect(host.getByRole('gridcell')).toContainText('保持する申請');
  }
  await info.attach('hierarchy-measurements',{body:JSON.stringify(measurements),contentType:'application/json'});await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(host).toHaveCount(0);
 });
}

const riskMatrix = [
 {name:'C',profile:'guided',width:320,font:'200%',dir:'ltr',reduce:false},
 {name:'D',profile:'dense',width:1280,font:'100%',dir:'rtl',reduce:true},
] as const;
async function prepareRisk(page:import('@playwright/test').Page,m:typeof riskMatrix[number]){
 await page.setViewportSize({width:m.width,height:900});await page.emulateMedia({reducedMotion:m.reduce?'reduce':'no-preference'});
 await page.goto('/catalog/static-runtime');await expect.poll(()=>page.evaluate(()=>typeof (window as any).__runtime?.create)).toBe('function');
 await page.evaluate(m=>{document.documentElement.style.fontSize=m.font;document.documentElement.dir=m.dir;document.documentElement.setAttribute('data-ui-profile',m.profile);},m);
}
async function checkKeyboardCell(cell:import('@playwright/test').Locator){
 await expect(cell).toBeFocused();
 const metric=await cell.evaluate(n=>{const style=getComputedStyle(n),box=n.getBoundingClientRect(),viewport=n.closest('.ui-data-grid__viewport')!,v=viewport.getBoundingClientRect();const text=n.querySelector(':scope > span:last-child')!;const range=document.createRange();range.selectNodeContents(text);return {focusVisible:n.matches(':focus-visible'),outline:parseFloat(style.outlineWidth),outlineStyle:style.outlineStyle,box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},viewport:{left:v.left,right:v.right,top:v.top,bottom:v.bottom},text:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),scrollWidth:viewport.scrollWidth,clientWidth:viewport.clientWidth};});
 expect(metric.focusVisible).toBe(true);expect(metric.outline).toBeGreaterThan(0);expect(metric.outlineStyle).not.toBe('none');
 expect(Math.min(metric.box.right,metric.viewport.right)-Math.max(metric.box.left,metric.viewport.left)).toBeGreaterThan(0);expect(Math.min(metric.box.bottom,metric.viewport.bottom)-Math.max(metric.box.top,metric.viewport.top)).toBeGreaterThan(0);
 expect(metric.text.length).toBeGreaterThan(0);for(const rect of metric.text){expect(rect.left).toBeGreaterThanOrEqual(metric.box.left-1);expect(rect.right).toBeLessThanOrEqual(metric.box.right+1);expect(rect.top).toBeGreaterThanOrEqual(metric.box.top-1);expect(rect.bottom).toBeLessThanOrEqual(metric.box.bottom+1);}
 await test.info().attach('R019-keyboard-text-ring',{body:JSON.stringify(metric),contentType:'application/json'});
}
for(const m of riskMatrix){
 test(`data-grid-hierarchy-level R019 ${m.name}: canonical UI IDと業務キーを区別しkeyboard展開・選択・復旧`,async({page},info)=>{
  await prepareRisk(page,m);
  const id=await page.evaluate(()=>(window as any).__runtime.create('TreeGrid',{
   gridId:'owning-tree',keyField:'key',caption:'親子関係を測る',selectionMode:'multiple',editable:false,
   columns:[{id:'name',field:'name',header:'名称',type:'text'}],
   nodes:[{id:'ui-parent',label:'親',data:{key:100,name:'親の業務行'},children:[{id:'ui-child',label:'子',data:{key:200,name:'子の長い業務行全文を保持する'}}]}],
  }));
  const host=page.locator(`[data-runtime-id="${id}"]`),cells=host.locator('[data-grid-cell]');
  const applyLatest=async(name:string,input:string)=>page.evaluate(({id,name,input})=>{
   const api=(window as any).__runtime,event=api.inspect(id).events.filter((e:any)=>e.name===name).at(-1);
   if(!event)throw new Error('Expected controlled output '+name);api.update(id,{[input]:event.value});return event.value;
  },{id,name,input});
  await expect(host.getByRole('alert')).toHaveCount(0);await expect(cells).toHaveCount(1);
  await cells.first().focus();await cells.first().press(m.dir==='rtl'?'ArrowLeft':'ArrowRight');
  expect(await applyLatest('expandedIdsChange','expandedIds')).toEqual(['ui-parent']);await expect(cells).toHaveCount(2);
  await cells.first().press('ArrowDown');await expect(cells.nth(1)).toBeFocused();await checkKeyboardCell(cells.nth(1));await cells.nth(1).press('Space');
  expect(await applyLatest('selectedIdsChange','selectedIds')).toEqual(['ui-child']);await expect(host.locator('tr[data-row-key="200"]')).toHaveAttribute('aria-selected','true');
  await cells.nth(1).press(m.dir==='rtl'?'ArrowRight':'ArrowLeft');await expect(cells.first()).toBeFocused();
  await cells.first().press(m.dir==='rtl'?'ArrowRight':'ArrowLeft');expect(await applyLatest('expandedIdsChange','expandedIds')).toEqual([]);await expect(cells).toHaveCount(1);
  for(const kind of ['duplicate','cycle','children-type','missing-data']){
   await page.evaluate(({id,kind})=>{
    const root:any={id:'ui-parent',label:'親',data:{key:100,name:'親の業務行'}};
    root.children=kind==='cycle'?[root]:kind==='children-type'?{}:[{id:kind==='duplicate'?'ui-parent':'ui-child',label:'子',...(kind==='missing-data'?{}:{data:{key:200,name:'子の行'}})}];
    (window as any).__runtime.update(id,{nodes:[root]});
   },{id,kind});
   await expect(host.getByRole('alert')).toBeVisible();await expect(host.locator('.ui-data-grid__hierarchy')).toHaveCount(0);await expect(cells).toHaveCount(0);
   await page.evaluate(id=>(window as any).__runtime.update(id,{nodes:[{id:'ui-parent',label:'親',data:{key:100,name:'親の業務行'},children:[{id:'ui-child',label:'子',data:{key:200,name:'子の長い業務行全文を保持する'}}]}],expandedIds:['ui-parent']}),id);
   await expect(host.getByRole('alert')).toHaveCount(0);await expect(cells).toHaveCount(2);await cells.first().focus();await cells.first().press('ArrowDown');await expect(cells.nth(1)).toBeFocused();await expect(cells.nth(1)).toContainText('子の長い業務行全文を保持する');await checkKeyboardCell(cells.nth(1));
  }
  const child=host.locator('tr[data-row-key="200"] .ui-data-grid__hierarchy');
  const metric=await child.evaluate(n=>{const s=getComputedStyle(n),td=n.closest('td')!,t=getComputedStyle(td),probe=document.createElement('div');probe.style.width='var(--ui-space-control-x)';td.append(probe);const unit=probe.getBoundingClientRect().width;probe.remove();return {padding:parseFloat(s.paddingInlineStart),unit,direction:s.direction,cellPadding:parseFloat(t.paddingInlineStart),cellBorder:parseFloat(t.borderInlineStartWidth)};});
  expect(Math.abs(metric.padding-metric.unit)).toBeLessThanOrEqual(1);expect(metric.direction).toBe(m.dir);
  expect(await page.evaluate(id=>(window as any).__runtime.inspect(id).errors,id)).toEqual([]);
  await info.attach('R019-risk-hierarchy-controls',{body:JSON.stringify({context:m,metric,events:await page.evaluate(id=>(window as any).__runtime.inspect(id).events,id)}),contentType:'application/json'});
  await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(host).toHaveCount(0);
 });
}

test('data-grid-hierarchy-level R019 最大safe integer: supported depth外はstyle前に拒否して復旧',async({page},info)=>{
 await prepareRisk(page,riskMatrix[0]);
 const id=await page.evaluate(()=>(window as any).__runtime.create('DataGrid',{
  gridId:'max-level-grid',keyField:'businessKey',caption:'最大階層境界',editable:false,rowSelection:'multiple',
  columns:[{id:'name',field:'name',header:'名称',type:'text'}],rows:[{businessKey:7,name:'最大階層でも保持する行全文'}],
  // The parent can be outside the visible row slice; UI ID need not equal the business key.
  treeRows:[{id:'ui-leaf',parentId:'outside-visible-slice',level:2,position:1,setSize:1,branch:false,expanded:false}],
 }));
 const host=page.locator(`[data-runtime-id="${id}"]`),span=host.locator('.ui-data-grid__hierarchy'),cell=host.locator('[data-grid-cell]');
 await expect(host.getByRole('alert')).toHaveCount(0);await expect(span).toHaveCount(1);await cell.focus();await cell.press('Space');
 expect(await page.evaluate(id=>(window as any).__runtime.inspect(id).events.filter((e:any)=>e.name==='selectedKeysChange').at(-1)?.value,id)).toEqual([7]);
 for(const level of [101,Number.MAX_SAFE_INTEGER]){
  await page.evaluate(({id,level})=>(window as any).__runtime.update(id,{treeRows:[{id:'ui-leaf',parentId:'outside-visible-slice',level,position:1,setSize:1,branch:false,expanded:false}]}),{id,level});
  await expect(host.getByRole('alert')).toBeVisible();await expect(span).toHaveCount(0);await expect(host.locator('.ui-data-grid__viewport')).toBeHidden();
  await info.attach('R019-upper-bound-guard',{body:JSON.stringify({input:level,rejected:true}),contentType:'application/json'});
 }
 await page.evaluate(id=>(window as any).__runtime.update(id,{treeRows:[{id:'ui-leaf',parentId:'outside-visible-slice',level:2,position:1,setSize:1,branch:false,expanded:false}]}),id);
 await expect(host.getByRole('alert')).toHaveCount(0);await expect(cell).toContainText('最大階層でも保持する行全文');await cell.focus();await expect(cell).toBeFocused();
 await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(host).toHaveCount(0);
});

test('data-grid-hierarchy-level R019 TreeGrid owning graph: supported depth100と101拒否・復旧',async({page},info)=>{
 await prepareRisk(page,riskMatrix[1]);
 const id=await page.evaluate(()=>{
  let node:any={id:'depth-100',label:'深さ100',data:{key:100,name:'末端の全文'}};
  for(let depth=99;depth>=1;depth--)node={id:'depth-'+depth,label:'深さ'+depth,data:{key:depth,name:'階層'+depth},children:[node]};
  return (window as any).__runtime.create('TreeGrid',{gridId:'depth-grid',caption:'対応する最大深さ',keyField:'key',editable:false,columns:[{id:'name',field:'name',header:'名称',type:'text'}],nodes:[node],expandedIds:Array.from({length:99},(_,i)=>'depth-'+(i+1))});
 });
 const host=page.locator(`[data-runtime-id="${id}"]`);await expect(host.getByRole('alert')).toHaveCount(0);await expect(host.locator('[data-grid-cell]')).toHaveCount(100);
 const leaf=host.locator('tr[data-row-key="100"]'),metric=await leaf.locator('.ui-data-grid__hierarchy').evaluate(n=>{
  const s=getComputedStyle(n),td=n.closest('td')!,probe=document.createElement('div');probe.style.width='var(--ui-space-control-x)';td.append(probe);const unit=probe.getBoundingClientRect().width;probe.remove();return {padding:parseFloat(s.paddingInlineStart),unit};
 });
 expect(Math.abs(metric.padding-99*metric.unit)).toBeLessThanOrEqual(1);await expect(leaf).toHaveAttribute('aria-level','100');
 await page.evaluate(id=>{
  let node:any={id:'depth-101',label:'深さ101',data:{key:101,name:'上限外'}};
  for(let depth=100;depth>=1;depth--)node={id:'depth-'+depth,label:'深さ'+depth,data:{key:depth,name:'階層'+depth},children:[node]};
  (window as any).__runtime.update(id,{nodes:[node]});
 },id);
 await expect(host.getByRole('alert')).toBeVisible();await expect(host.locator('.ui-data-grid__hierarchy')).toHaveCount(0);
 await page.evaluate(id=>(window as any).__runtime.update(id,{nodes:[{id:'restored',label:'復旧',data:{key:1,name:'復旧した全文'}}],expandedIds:[]}),id);
 await expect(host.getByRole('alert')).toHaveCount(0);await expect(host.locator('[data-grid-cell]')).toHaveCount(1);await host.locator('[data-grid-cell]').focus();await expect(host.locator('[data-grid-cell]')).toBeFocused();
 expect(await page.evaluate(id=>(window as any).__runtime.inspect(id).errors,id)).toEqual([]);
 await info.attach('R019-supported-depth',{body:JSON.stringify({depth:100,metric,depth101Rejected:true}),contentType:'application/json'});
 await page.evaluate(id=>(window as any).__runtime.destroy(id),id);await expect(host).toHaveCount(0);
});
