import type {Locator,Page} from '@playwright/test';
import {test,expect,contexts,ready,environment,settle,create,host,update,destroy,record} from './css-override-test';

const boundedContexts=contexts;
const near=(actual:number,expected:number,label:string)=>expect(Math.abs(actual-expected),label).toBeLessThanOrEqual(1);

async function utilityMetric(node:Locator){return node.evaluate(root=>{
 const table=root.querySelector('table')!,cols=[...table.querySelectorAll<HTMLTableColElement>('colgroup col')],headers=[...table.querySelectorAll<HTMLElement>('thead tr:first-child>th')],body=[...table.querySelectorAll<HTMLElement>('tbody tr[data-row-key]:not([hidden])')][0]!,footer=table.querySelector('tfoot tr:last-child')!;
 const probe=document.createElement('span');probe.style.cssText='display:block;position:absolute;visibility:hidden;inline-size:var(--ui-size-table-column-min)';root.append(probe);const minimum=probe.getBoundingClientRect().width;probe.remove();
 const edge=(el:Element)=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};};
 return {minimum,table:edge(table),inlineWidth:parseFloat((table as HTMLElement).style.inlineSize),cols:cols.map(col=>({inline:parseFloat(col.style.width),actual:col.getBoundingClientRect().width})),headers:headers.map(el=>({text:el.textContent?.trim(),id:el.dataset['columnId']??null,...edge(el)})),body:[...body.children].map(edge),footer:[...footer.children].map(edge)};
 });}
async function utilityCheck(node:Locator,enabled:boolean,label:string){
 const count=enabled?6:2;
 await expect.poll(async()=>{const m=await utilityMetric(node);return m.cols.length===count&&m.cols.every((col,i)=>Math.abs(col.inline-(enabled&&[0,1,4,5].includes(i)?m.minimum:i===(enabled?2:0)?160:100))<=1);},{message:label+': each actual utility binding takes the independently measured semantic width'}).toBe(true);
 const m=await utilityMetric(node);expect(m.headers).toHaveLength(count);expect(m.body).toHaveLength(count);expect(m.footer).toHaveLength(count);
 expect(m.headers.map(h=>h.id)).toEqual(enabled?[null,null,'name','amount',null,null]:['name','amount']);
 if(enabled){expect(m.headers[1]!.text).toBe('詳細');expect(m.headers[4]!.text).toBe('操作');expect(m.headers[5]!.text).toBe('行編集');}
 near(m.inlineWidth,260+(enabled?4*m.minimum:0),label+' table inline width');
 // A col has no CSSOM rectangle in WebKit. The rendered header cell is the actual column box;
 // retain col rectangles as diagnostics while asserting every visible column and both downstream edges.
 for(let i=0;i<count;i++){near(m.headers[i]!.width,m.cols[i]!.inline,label+' rendered column width '+i);for(const row of [m.body,m.footer]){near(row[i]!.left,m.headers[i]!.left,label+' left edge '+i);near(row[i]!.right,m.headers[i]!.right,label+' right edge '+i);}}
 await record(label,m);
}

async function stackMetric(node:Locator){return node.evaluate(root=>{
 const vp=root.querySelector<HTMLElement>('.ui-data-table__viewport')!,table=vp.querySelector('table')!,thead=table.querySelector('thead')!,tfoot=table.querySelector('tfoot')!,rows=[...table.querySelectorAll<HTMLElement>('tbody tr[data-row-key]')],fixed=rows.filter(row=>row.hasAttribute('data-fixed-row')),s=getComputedStyle(vp),head=thead.classList.contains('ui-data-table__head--sticky')?thead.getBoundingClientRect().height:0,foot=tfoot.classList.contains('ui-data-table__footer--sticky')?tfoot.getBoundingClientRect().height:0;
 const measured=fixed.map(row=>({key:Number(row.dataset['rowKey']),side:row.dataset['fixedRow']!,height:row.getBoundingClientRect().height,offset:parseFloat(getComputedStyle(row).getPropertyValue('inset-block-'+row.dataset['fixedRow']))}));
 const start=head+measured.filter(row=>row.side==='start').reduce((sum,row)=>sum+row.height,0),end=foot+measured.filter(row=>row.side==='end').reduce((sum,row)=>sum+row.height,0),body=Math.max(...rows.filter(row=>!row.hasAttribute('data-fixed-row')).map(row=>row.getBoundingClientRect().height));
 const probe=document.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;block-size:var(--ui-size-control);inline-size:1px';root.append(probe);const control=probe.getBoundingClientRect().height;probe.remove();
 return {head,foot,start,end,body,control,rows:measured,scrollStart:parseFloat(s.scrollPaddingBlockStart),scrollEnd:parseFloat(s.scrollPaddingBlockEnd),max:s.maxBlockSize==='none'?null:parseFloat(s.maxBlockSize),bounded:vp.classList.contains('ui-data-table__viewport--bounded')};
 });}
async function checkStacks(node:Locator,label:string){
 await expect.poll(async()=>{const m=await stackMetric(node);return Math.abs(m.start-m.scrollStart)<=1&&Math.abs(m.end-m.scrollEnd)<=1&&m.rows.every((row,i)=>{const prior=row.side==='start'?m.rows.slice(0,i):m.rows.slice(i+1),expected=(row.side==='start'?m.head:m.foot)+prior.filter(p=>p.side===row.side).reduce((sum,p)=>sum+p.height,0);return Math.abs(row.offset-expected)<=1;})&&(!m.bounded||m.max!==null&&m.max>=m.start+m.end+Math.max(m.body,m.control)-1);},{message:label+': observer refreshes both measured stacks and the viewport budget'}).toBe(true);
 await record(label,await stackMetric(node));
}
async function growAfterFrame(page:Page,node:Locator,key:number,height:number){
 // No fixture inputs or explicit render call: this models a deferred projected resource changing its own DOM.
 await node.locator(`[data-warning-grow="${key}"]`).evaluate((el,height)=>new Promise<void>(resolve=>requestAnimationFrame(()=>{(el as HTMLElement).style.height=height+'px';resolve();})),height);await settle(page);
}
async function retainedFocusMetric(editor:Locator){return editor.evaluate(async element=>{
 const input=element as HTMLInputElement,box=input.getBoundingClientRect(),style=getComputedStyle(input),width=parseFloat(style.outlineWidth)||0,offset=parseFloat(style.outlineOffset)||0,extent=Math.max(0,width+offset),ring={left:box.left-extent,right:box.right+extent,top:box.top-extent,bottom:box.bottom+extent},clip={left:0,right:innerWidth,top:0,bottom:innerHeight},ancestors=[];
 for(let parent=input.parentElement;parent;parent=parent.parentElement){const css=getComputedStyle(parent),x=/auto|scroll|hidden|clip/.test(css.overflowX),y=/auto|scroll|hidden|clip/.test(css.overflowY);if(!x&&!y)continue;const bounds=await new Promise<DOMRectReadOnly>(resolve=>{const observer=new IntersectionObserver(entries=>{observer.disconnect();resolve(entries[0]!.rootBounds!);},{root:parent});observer.observe(input);});if(x){clip.left=Math.max(clip.left,bounds.left);clip.right=Math.min(clip.right,bounds.right);}if(y){clip.top=Math.max(clip.top,bounds.top);clip.bottom=Math.min(clip.bottom,bounds.bottom);}ancestors.push({tag:parent.tagName,class:parent.className,x,y,clip:bounds.toJSON()});}
 const inset=Math.min(box.width/2,box.height/2,Math.max(3,...[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius,style.borderBottomRightRadius].map(value=>parseFloat(value)||0))),hits=[box.left+inset,(box.left+box.right)/2,box.right-inset].flatMap(x=>[box.top+inset,(box.top+box.bottom)/2,box.bottom-inset].map(y=>{const hit=document.elementFromPoint(x,y);return {x,y,tag:hit?.tagName,owned:hit===input||!!hit&&input.contains(hit)};})),ownRow=input.closest('tr'),overlays=[...input.closest('.ui-data-table__viewport')!.querySelectorAll<HTMLElement>('thead.ui-data-table__head--sticky,tfoot.ui-data-table__footer--sticky,tr[data-fixed-row]')].filter(node=>node!==ownRow).map(node=>{const r=node.getBoundingClientRect();return {tag:node.tagName,key:node.dataset['rowKey'],box:r.toJSON(),overlapX:Math.min(ring.right,r.right)-Math.max(ring.left,r.left),overlapY:Math.min(ring.bottom,r.bottom)-Math.max(ring.top,r.top)};}),contained=ring.left>=clip.left-1&&ring.right<=clip.right+1&&ring.top>=clip.top-1&&ring.bottom<=clip.bottom+1,uncovered=overlays.every(overlay=>overlay.overlapX<=1||overlay.overlapY<=1),focused=input===document.activeElement,visible=input.matches(':focus-visible');
 return {focused,visible,value:input.value,outline:{width,offset,style:style.outlineStyle},box:box.toJSON(),ring,clip,ancestors,hits,overlays,contained,uncovered,pass:focused&&visible&&width>0&&style.outlineStyle!=='none'&&contained&&uncovered&&hits.every(hit=>hit.owned)};
 });}
async function checkRetainedFocus(editor:Locator,label:string){try{await expect.poll(async()=>(await retainedFocusMetric(editor)).pass,{message:label+': retained input keeps its complete outline and nine unobscured hit points after asynchronous growth'}).toBe(true);}finally{await record(label,await retainedFocusMetric(editor));}}

for(const context of boundedContexts){
 test(`warning utility widths ${context.name}: selection detail action and row-edit branches each use the semantic width`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeWarningUtilityTable',{}),node=host(page,id);await expect(node.getByRole('alert')).toHaveCount(0);await utilityCheck(node,true,'utility-initial-'+context.name);
  await environment(page,context.name==='A'?contexts[1]:contexts[0]);await utilityCheck(node,true,'utility-environment-'+context.name);
  await update(page,id,{enabled:false});await utilityCheck(node,false,'utility-disabled-'+context.name);await update(page,id,{enabled:true});await utilityCheck(node,true,'utility-restored-'+context.name);await destroy(page,id);
 });

 test(`warning async fixed rows ${context.name}: projected DOM-only growth and shrink update stacks before sticky toggles`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeWarningAsyncTable',{}),node=host(page,id),editor=node.getByRole('textbox',{name:'遅延行の入力 10',exact:true});await expect(editor).toBeVisible();await checkStacks(node,'async-initial-'+context.name);
  const original=await editor.elementHandle();await editor.fill('遅延後も保持する下書き');await expect(editor).toBeFocused();
  const before=await stackMetric(node);await growAfterFrame(page,node,0,240);await growAfterFrame(page,node,19,220);await checkStacks(node,'async-grown-'+context.name);const grown=await stackMetric(node);expect(grown.rows.find(row=>row.key===0)!.height).toBeGreaterThan(before.rows.find(row=>row.key===0)!.height+30);expect(grown.rows.find(row=>row.key===19)!.height).toBeGreaterThan(before.rows.find(row=>row.key===19)!.height+30);await expect(editor).toHaveValue('遅延後も保持する下書き');expect(await original!.evaluate(el=>el===document.querySelector('input[aria-label="遅延行の入力 10"]'))).toBe(true);await expect(editor).toBeFocused();await checkRetainedFocus(editor,'async-grown-retained-ring-'+context.name);
  await growAfterFrame(page,node,0,80);await growAfterFrame(page,node,19,80);await checkStacks(node,'async-shrunk-'+context.name);
  for(const patch of [{stickyHeader:false,stickyFooter:false},{stickyHeader:true,stickyFooter:false},{stickyHeader:true,stickyFooter:true}]){await update(page,id,patch);await checkStacks(node,'async-sticky-'+JSON.stringify(patch)+'-'+context.name);await expect(editor).toHaveValue('遅延後も保持する下書き');}
  const outside=page.locator('#runtime-anchor');await outside.focus();await expect(outside).toBeFocused();await growAfterFrame(page,node,0,260);await checkStacks(node,'async-outside-focus-'+context.name);await expect(outside).toBeFocused();await expect(editor).toHaveValue('遅延後も保持する下書き');expect(await original!.evaluate(el=>el===document.querySelector('input[aria-label="遅延行の入力 10"]'))).toBe(true);await record('async-outside-focus-'+context.name,{outsideFocused:await outside.evaluate(el=>el===document.activeElement),draft:await editor.inputValue(),stacks:await stackMetric(node)});
  await destroy(page,id);await original!.dispose();
 });

 test(`warning print resolved styles ${context.name}: source root rem calc tokens preserve numeric font padding and borders in iframe`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeP2Print',{}),node=host(page,id);
  await node.evaluate(root=>{
   const scope=root as HTMLElement;scope.style.setProperty('--print-unit','1rem');for(const [name,value]of Object.entries({'font-body':'serif','text-body':'calc(var(--print-unit) + .2rem)','leading-body':'1.8','weight-control':'700','space-page':'var(--print-unit)','space-table-y':'.4rem','space-table-x':'calc(var(--print-unit) + 2px)','border-control':'.125rem','color-border':'rgb(61, 71, 81)','color-text':'rgb(21, 31, 41)','color-surface':'rgb(241, 246, 251)'}))scope.style.setProperty('--ui-'+name,value);
   const reference=document.createElement('div');reference.dataset['warningPrintReference']='';reference.style.cssText='margin:0;padding:var(--ui-space-page);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);background:var(--ui-color-surface)';
   const table=document.createElement('table');table.style.cssText='border-collapse:collapse;inline-size:100%';const row=table.insertRow(),cell=row.insertCell();cell.textContent='解決された印刷寸法';cell.style.cssText='border:var(--ui-border-control) solid var(--ui-color-border);padding:var(--ui-space-table-y) var(--ui-space-table-x);text-align:start;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere';reference.append(table);scope.append(reference);
  });
  await page.evaluate(id=>{const scope=document.querySelector(`[data-runtime-id="${id}"]`)!,frame=(window as any).__runtime.instance(id).create(scope)as HTMLIFrameElement;frame.hidden=false;frame.style.width=Math.min(innerWidth,800)+'px';frame.style.height='650px';frame.dataset['warningPrintFrame']='';},id);await settle(page);
  const metric=await node.evaluate(root=>{
   const reference=root.querySelector<HTMLElement>('[data-warning-print-reference]')!,frame=document.querySelector<HTMLIFrameElement>('[data-warning-print-frame]')!,target=frame.contentDocument!,read=(body:HTMLElement,cell:HTMLElement,view:Window)=>{const b=view.getComputedStyle(body),c=view.getComputedStyle(cell);return {fontFamily:b.fontFamily,fontSize:parseFloat(b.fontSize),lineHeight:parseFloat(b.lineHeight),pagePadding:parseFloat(b.paddingBlockStart),cellPaddingBlock:parseFloat(c.paddingBlockStart),cellPaddingInline:parseFloat(c.paddingInlineStart),border:parseFloat(c.borderTopWidth),color:b.color,background:b.backgroundColor,direction:b.direction};},names=['font-body','text-body','leading-body','weight-control','space-page','space-table-y','space-table-x','border-control','color-border','color-text','color-surface'];
   return {sourceRootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),targetRootFont:parseFloat(frame.contentWindow!.getComputedStyle(target.documentElement).fontSize),source:read(reference,reference.querySelector('td')!,window),target:read(target.body,target.querySelector('td')!,frame.contentWindow!),sourceTokens:names.map(name=>getComputedStyle(root).getPropertyValue('--ui-'+name).trim()),targetTokens:names.map(name=>frame.contentWindow!.getComputedStyle(target.documentElement).getPropertyValue('--ui-'+name).trim()),cells:[...target.querySelectorAll<HTMLElement>('th,td')].map(cell=>({width:cell.clientWidth,scrollWidth:cell.scrollWidth,height:cell.clientHeight,scrollHeight:cell.scrollHeight}))};
  });
  await record('print-resolved-'+context.name,metric);expect(metric.targetTokens).toEqual(metric.sourceTokens);expect(metric.sourceTokens.every(Boolean)).toBe(true);expect(metric.sourceTokens.every(value=>!value.includes('var(')),'computed source tokens resolve the local dependency before copying').toBe(true);near(metric.targetRootFont,metric.sourceRootFont,'print root preserves the source rem basis');
  for(const key of ['fontSize','lineHeight','pagePadding','cellPaddingBlock','cellPaddingInline','border']as const)near(metric.target[key],metric.source[key],'print '+key+' respects the source scope');
  for(const key of ['fontFamily','color','background','direction']as const)expect(metric.target[key]).toBe(metric.source[key]);
  near(metric.source.fontSize,metric.sourceRootFont*1.2,'independent source rem font');near(metric.source.cellPaddingInline,metric.sourceRootFont+2,'independent source calc padding');for(const cell of metric.cells){expect(cell.scrollWidth).toBeLessThanOrEqual(cell.width+1);expect(cell.scrollHeight).toBeLessThanOrEqual(cell.height+1);}
  await destroy(page,id);await expect(page.locator('[data-warning-print-frame]')).toHaveCount(0);
 });
}
