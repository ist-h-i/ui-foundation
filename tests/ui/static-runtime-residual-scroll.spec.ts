import {type Locator,type Page} from '@playwright/test';
import {test,expect,contexts,ready,environment,settle,create,update,host,destroy,record} from './css-override-test';

async function current(nav:Locator,label:string){await expect(nav.locator('[aria-current="location"]')).toHaveText(label);expect(await nav.locator('[aria-current="location"]').count()).toBe(1);}
async function popupBounds(node:Locator){const metric=await node.evaluate(e=>{const r=e.getBoundingClientRect();return {box:r.toJSON(),viewport:{width:innerWidth,height:innerHeight},scroll:e.scrollHeight,client:e.clientHeight,width:e.scrollWidth,clientWidth:e.clientWidth};});expect(metric.box.width).toBeGreaterThan(0);expect(metric.box.height).toBeGreaterThan(0);expect(metric.box.left).toBeGreaterThanOrEqual(-1);expect(metric.box.right).toBeLessThanOrEqual(metric.viewport.width+1);expect(metric.box.top).toBeGreaterThanOrEqual(-1);expect(metric.box.bottom).toBeLessThanOrEqual(metric.viewport.height+1);expect(metric.width).toBeLessThanOrEqual(metric.clientWidth+1);return metric;}
async function textEndpoint(node:Locator,ending:boolean){return node.evaluate((e,ending)=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);const nodes:Text[]=[];let n:Node|null;while((n=walker.nextNode()))if(n.textContent?.trim())nodes.push(n as Text);const text=ending?nodes.at(-1)!:nodes[0]!,range=document.createRange();range.setStart(text,ending?Math.max(0,text.length-1):0);range.setEnd(text,ending?text.length:1);const r=range.getBoundingClientRect(),p=e.getBoundingClientRect(),clip={left:p.left+e.clientLeft,right:p.left+e.clientLeft+e.clientWidth,top:p.top+e.clientTop,bottom:p.top+e.clientTop+e.clientHeight};return {text:text.textContent,rect:r.toJSON(),clip,inside:r.left>=clip.left-1&&r.right<=clip.right+1&&r.top>=clip.top-1&&r.bottom<=clip.bottom+1};},ending);}
async function actionVisible(action:Locator,popup:Locator){await expect(action).toBeFocused();const f=await action.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),p=el.closest('[popover]')!,pr=p.getBoundingClientRect(),extent=Math.max(0,parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset)),range=document.createRange();range.selectNodeContents(el);return {focus:el.matches(':focus-visible'),outline:parseFloat(s.outlineWidth),rect:r.toJSON(),ring:{left:r.left-extent,right:r.right+extent,top:r.top-extent,bottom:r.bottom+extent},clip:{left:Math.max(0,pr.left+p.clientLeft),right:Math.min(innerWidth,pr.left+p.clientLeft+p.clientWidth),top:Math.max(0,pr.top+p.clientTop),bottom:Math.min(innerHeight,pr.top+p.clientTop+p.clientHeight)},text:[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>r.toJSON()),hit:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),ancestorClips:(()=>{const clips=[];for(let a=el.parentElement;a&&a!==p;a=a.parentElement){const style=getComputedStyle(a),box=a.getBoundingClientRect(),x=/^(auto|scroll|hidden|clip)$/.test(style.overflowX),y=/^(auto|scroll|hidden|clip)$/.test(style.overflowY);if(x||y)clips.push({x,y,left:box.left+a.clientLeft,right:box.left+a.clientLeft+a.clientWidth,top:box.top+a.clientTop,bottom:box.top+a.clientTop+a.clientHeight});}return clips;})()};});for(const clip of f.ancestorClips){if(clip.x){f.clip.left=Math.max(f.clip.left,clip.left);f.clip.right=Math.min(f.clip.right,clip.right);}if(clip.y){f.clip.top=Math.max(f.clip.top,clip.top);f.clip.bottom=Math.min(f.clip.bottom,clip.bottom);}}expect(f.focus).toBe(true);expect(f.outline).toBeGreaterThan(0);expect(f.ring.left).toBeGreaterThanOrEqual(f.clip.left-1);expect(f.ring.right).toBeLessThanOrEqual(f.clip.right+1);expect(f.ring.top).toBeGreaterThanOrEqual(f.clip.top-1);expect(f.ring.bottom).toBeLessThanOrEqual(f.clip.bottom+1);for(const r of f.text){expect(r.left).toBeGreaterThanOrEqual(f.clip.left-1);expect(r.right).toBeLessThanOrEqual(f.clip.right+1);expect(r.top).toBeGreaterThanOrEqual(f.clip.top-1);expect(r.bottom).toBeLessThanOrEqual(f.clip.bottom+1);}expect(f.hit).toBe(true);await popupBounds(popup);return f;}

type TextProbePart={node:Text;value:string;range:Range;lineCount:number};
type WheelObservation={trusted:boolean;deltaY:number;inside:boolean;target:{tag:string;id:string}|null;scrollTop:number};
type TextProbeHost=HTMLElement&{__residualTextParts?:TextProbePart[];__residualWheels?:WheelObservation[];__residualWheelListener?:(event:WheelEvent)=>void};
async function fullPopupText(page:Page,popup:Locator,kind:string,contextName:string){
 const plan=await popup.evaluate(el=>{
  const parts:TextProbePart[]=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode()))if(node.textContent?.trim()){const text=node as Text,range=document.createRange();range.selectNodeContents(text);parts.push({node:text,value:text.data,range,lineCount:[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).length});}
  const host=el as TextProbeHost;host.__residualTextParts=parts;
  if(host.__residualWheelListener)host.removeEventListener('wheel',host.__residualWheelListener);host.__residualWheels=[];
  host.__residualWheelListener=event=>{const target=event.target as Element|null;host.__residualWheels!.push({trusted:event.isTrusted,deltaY:event.deltaY,inside:!!target&&host.contains(target),target:target?{tag:target.tagName,id:target.id}:null,scrollTop:host.scrollTop});};host.addEventListener('wheel',host.__residualWheelListener,{passive:true});
  return {parts:parts.map((p,index)=>({index,text:p.value,lineCount:p.lineCount})),expected:parts.flatMap((p,index)=>Array.from({length:p.lineCount},(_,line)=>index+':'+line)),scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};
 });
 await record('popup-text-range-plan-'+kind+'-'+contextName,plan);
 expect(plan.parts.length,'nonempty popup Text nodes').toBeGreaterThan(0);expect(plan.expected.length,'nonempty rendered Text Range lines').toBeGreaterThan(0);for(const part of plan.parts)expect(part.lineCount,'nonempty text must produce rendered Range lines: '+part.index).toBeGreaterThan(0);
 const read=()=>popup.evaluate(el=>{
  const parts=(el as TextProbeHost).__residualTextParts!;
  const clipFor=(node:Element)=>{const clip={left:0,right:innerWidth,top:0,bottom:innerHeight},ancestors=[];for(let a:Element|null=node;a;a=a.parentElement){const s=getComputedStyle(a),r=a.getBoundingClientRect(),x=a===el||/^(auto|scroll|hidden|clip)$/.test(s.overflowX),y=a===el||/^(auto|scroll|hidden|clip)$/.test(s.overflowY);if(x||y){const box={left:r.left+a.clientLeft,right:r.left+a.clientLeft+a.clientWidth,top:r.top+a.clientTop,bottom:r.top+a.clientTop+a.clientHeight};if(x){clip.left=Math.max(clip.left,box.left);clip.right=Math.min(clip.right,box.right);}if(y){clip.top=Math.max(clip.top,box.top);clip.bottom=Math.min(clip.bottom,box.bottom);}ancestors.push({tag:a.tagName,class:a.className,overflowX:s.overflowX,overflowY:s.overflowY,x,y,box});}if(a===el)break;}return {clip,ancestors};};
  const changed=parts.flatMap((p,index)=>!p.node.isConnected||p.node.data!==p.value?[index]:[]),counts=parts.map(p=>[...p.range.getClientRects()].filter(r=>r.width>0&&r.height>0).length),lines=parts.flatMap((p,index)=>{const geometry=clipFor(p.node.parentElement!),rects=[...p.range.getClientRects()].filter(r=>r.width>0&&r.height>0);return rects.map((r,line)=>({id:index+':'+line,rect:r.toJSON(),...geometry,inside:r.left>=geometry.clip.left-1&&r.right<=geometry.clip.right+1&&r.top>=geometry.clip.top-1&&r.bottom<=geometry.clip.bottom+1}));});
  return {changed,counts,lines,scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};
 });
 const reached=new Map<string,unknown>(),frames:unknown[]=[];let state=await read(),failure:unknown;
 const deliveredWheel=async(delta:number,phase:string)=>{
  const box=(await popup.boundingBox())!,point={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(point.x,point.y);await settle(page);
  const hit=await popup.evaluate((el,point)=>{const target=document.elementFromPoint(point.x,point.y);return {inside:!!target&&el.contains(target),target:target?{tag:target.tagName,id:target.id}:null,popup:el.getBoundingClientRect().toJSON(),scrollTop:el.scrollTop,window:{x:scrollX,y:scrollY}};},point);frames.push({phase,point,hit,delta});expect(hit.inside,'each native wheel targets the current popup padding/descendants').toBe(true);
  const before=await popup.evaluate(el=>(el as TextProbeHost).__residualWheels!.length);await page.mouse.wheel(0,delta);await expect.poll(()=>popup.evaluate(el=>(el as TextProbeHost).__residualWheels!.length),'trusted native wheel delivery before subsequent wheel').toBeGreaterThan(before);
  const delivered=await popup.evaluate((el,before)=>(el as TextProbeHost).__residualWheels!.slice(before),before);expect(delivered.length).toBeGreaterThan(0);for(const event of delivered){expect(event.trusted).toBe(true);expect(event.inside).toBe(true);expect(Math.sign(event.deltaY)).toBe(Math.sign(delta));}frames.push({phase,delivered});await settle(page);
 };
 try{
  // Skip an unnecessary upward event at an already-zero scrollTop. Otherwise
  // observe delivery and native completion before issuing a downward event.
  if(state.scrollTop>0){await deliveredWheel(-100000,'reset-top');await expect.poll(()=>popup.evaluate(el=>el.scrollTop)).toBe(0);await settle(page);}else frames.push({phase:'reset-top',skippedAlreadyAtZero:true});
  state=await read();const maxLine=Math.max(...state.lines.map(l=>l.rect.height)),step=state.clientHeight-maxLine-8;expect(step,'a rendered text line fits the popup scrollport').toBeGreaterThan(0);const budget=Math.ceil(state.scrollHeight/step)+4;
  for(let sample=0;sample<budget;sample++){
   state=await read();expect(state.changed,'fixed Text nodes/data remain connected and unchanged').toEqual([]);expect(state.counts,'the current-environment Range line set stays fixed while scrolling').toEqual(plan.parts.map(p=>p.lineCount));expect(new Set(state.lines.map(l=>l.id)).size).toBe(plan.expected.length);
   for(const line of state.lines)if(line.inside&&!reached.has(line.id))reached.set(line.id,{sample,scrollTop:state.scrollTop,...line});
   frames.push({sample,scrollTop:state.scrollTop,visible:state.lines.filter(l=>l.inside).map(l=>l.id),reached:reached.size});
   if(reached.size===plan.expected.length||state.scrollTop+state.clientHeight>=state.scrollHeight-1)break;
   const before=state.scrollTop;await deliveredWheel(step,'body-sample-'+sample);await expect.poll(()=>popup.evaluate(el=>el.scrollTop)).toBeGreaterThan(before);await settle(page);
  }
 }catch(error){failure=error;state=await read();}
 const wheelEvents=await popup.evaluate(el=>{const host=el as TextProbeHost;if(host.__residualWheelListener)host.removeEventListener('wheel',host.__residualWheelListener);host.__residualWheelListener=undefined;return host.__residualWheels;});
 const missing=plan.expected.filter(id=>!reached.has(id));await record('popup-every-text-range-'+kind+'-'+contextName,{plan,frames,wheelEvents,reached:[...reached.values()],missing,terminal:{scrollTop:state.scrollTop,scrollHeight:state.scrollHeight,clientHeight:state.clientHeight},failure:failure instanceof Error?failure.message:failure??null});if(failure)throw failure;expect(missing,'each nonempty popup Text Range line reaches the complete effective ancestor clip').toEqual([]);expect(reached.size).toBe(plan.expected.length);
}
async function everyPopupFocusable(page:Page,popup:Locator,kind:string,contextName:string){
 const candidates=await popup.locator('button,input,select,textarea,a[href],[tabindex]').elementHandles(),targets=[];
 for(const handle of candidates)if(await handle.evaluate(el=>{const e=el as HTMLElement,s=getComputedStyle(e);return e.tabIndex>=0&&!e.matches(':disabled')&&!e.closest('[hidden],[inert]')&&e.getClientRects().length>0&&s.visibility!=='hidden'&&s.display!=='none';}))targets.push(handle);
 expect(targets.length,'one retained editor and two required popup actions').toBe(3);await expect(popup.getByRole('textbox',{name:'保持するpopup入力'})).toHaveCount(1);
 const names=kind==='ConfirmPopover'?['確認する','取消']:['閉じる','全文確認後の操作'];for(const name of names)await expect(popup.getByRole('button',{name,exact:true})).toHaveCount(1);
 await popup.evaluate(el=>(el as HTMLElement).focus());const evidence=[];
 for(const [index,handle] of targets.entries()){await page.keyboard.press('Tab');expect(await handle.evaluate(el=>el===document.activeElement),'native Tab enters the fixed enabled/visible DOM-order control '+index).toBe(true);const action=popup.locator(':focus');await expect(action).toHaveCount(1);evidence.push({index,control:await handle.evaluate(node=>{const el=node as HTMLElement;return {tag:el.tagName,name:el.getAttribute('aria-label')??el.textContent,value:el instanceof HTMLInputElement?el.value:null};}),geometry:await actionVisible(action,popup)});}
 await record('popup-all-native-focusables-'+kind+'-'+contextName,{expected:names,controls:evidence});
}

for(const c of contexts){
 test(`residual anchor manual scroll ${c.name}: window/local current threshold, end, hidden targets and same-instance environment`,async({page})=>{
  await ready(page,c);
  for(const local of [false,true]){
   const id=await page.evaluate(local=>{const slot=document.querySelector('#runtime-slot')!,root=document.createElement('div');root.id='residual-scroll-root';root.style.cssText=local?'block-size:400px;overflow:auto;scroll-padding-block-start:calc(10% + 12px);border:2px solid transparent;':'display:block';slot.append(root);if(!local)document.documentElement.style.scrollPaddingBlockStart='calc(10% + 12px)';const entries=[0,1,2].map(i=>{const section=document.createElement('section'),target=document.createElement('h2');section.style.blockSize='700px';target.style.margin='0';target.id='residual-target-'+i;target.textContent='保持する見出し '+i;section.append(target);root.append(section);return{id:String(i),label:'見出し '+i,target};});return(window as any).__runtime.create('AnchorNavigation',{label:'手動位置追従',items:entries,scrollRoot:local?root:null,offset:17,behavior:'auto',updateHash:false});},local);
   const nav=host(page,id).getByRole('navigation');
   const evidence=[];
   for(const targetIndex of [0,1,2,1]){
    const position=await page.evaluate(({local,targetIndex})=>{const root=document.querySelector<HTMLElement>('#residual-scroll-root')!,target=document.querySelector<HTMLElement>('#residual-target-'+targetIndex)!,height=local?root.clientHeight:document.documentElement.clientHeight,padding=height*.1+12,line=(local?root.getBoundingClientRect().top+root.clientTop:0)+padding+17,top=target.getBoundingClientRect().top;const destination=(local?root.scrollTop:scrollY)+top-line+8;if(local)root.scrollTo({top:destination,behavior:'instant'});else scrollTo({top:destination,behavior:'instant'});return{targetIndex,padding,line,destination};},{local,targetIndex});
    await current(nav,'見出し '+targetIndex);evidence.push(position);
   }
   const before=await page.evaluate(id=>(window as any).__runtime.inspect(id).events.filter((e:any)=>e.name==='selected').length,id);
   await page.evaluate(local=>{const r=document.querySelector<HTMLElement>('#residual-scroll-root')!;if(local)r.scrollTop=r.scrollHeight;else scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});},local);await current(nav,'見出し 2');
   await environment(page,contexts[(contexts.indexOf(c)+1)%4]!);
   const changedGeometry=await page.evaluate(local=>{const root=document.querySelector<HTMLElement>('#residual-scroll-root')!,height=local?root.clientHeight:document.documentElement.clientHeight,line=(local?root.getBoundingClientRect().top+root.clientTop:0)+height*.1+12+17,positions=[0,1,2].map(i=>document.querySelector('#residual-target-'+i)!.getBoundingClientRect().top),atEnd=local?root.scrollTop+root.clientHeight>=root.scrollHeight-1:scrollY+innerHeight>=document.documentElement.scrollHeight-1;const passed=positions.map((top,i)=>({top,i})).filter(x=>x.top<=line+1);return {line,positions,atEnd,expected:atEnd?2:passed.at(-1)?.i??0};},local);
   await current(nav,'見出し '+changedGeometry.expected);await record('stationary-current-after-environment',{local,context:c,...changedGeometry});
   await page.evaluate(local=>{const r=document.querySelector<HTMLElement>('#residual-scroll-root')!;if(local)r.scrollTop=r.scrollHeight;else scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});},local);await current(nav,'見出し 2');
   await page.locator('#residual-target-2').evaluate(e=>(e as HTMLElement).hidden=true);await current(nav,'見出し 1');
   await page.locator('#residual-target-2').evaluate(e=>(e as HTMLElement).hidden=false);await current(nav,'見出し 2');
   expect(await page.evaluate(id=>(window as any).__runtime.inspect(id).events.filter((e:any)=>e.name==='selected').length,id)).toBe(before);
   await record('manual-scroll-current',{context:c,local,evidence,events:await page.evaluate(id=>(window as any).__runtime.inspect(id).events,id)});await destroy(page,id);await page.locator('#residual-scroll-root').evaluate(e=>e.remove());await page.evaluate(()=>{document.documentElement.style.removeProperty('scroll-padding-block-start');scrollTo(0,0);});await environment(page,c);
  }
 });
 test(`residual Sticky window terminal ${c.name}: top/bottom native reference and containing block end after environment update`,async({page})=>{
  await ready(page,c);
  const id=await create(page,'StickyRegion',{edge:'top',offset:17},'<button class="ui-action" type="button">保持する固定操作</button>');
  await host(page,id).evaluate(e=>{const slot=e.parentElement!,before=document.createElement('div'),after=document.createElement('div'),scope=document.createElement('div'),native=document.createElement('div');before.style.blockSize='1200px';after.style.blockSize='2000px';scope.id='residual-sticky-scope';scope.style.cssText='position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;block-size:1800px;border:2px solid transparent;';native.id='residual-sticky-native';native.style.cssText='display:block;position:sticky;top:17px;align-self:start;';native.innerHTML=e.innerHTML;slot.append(before,scope,after);const column=document.createElement('div'),nativeColumn=document.createElement('div');for(const col of [column,nativeColumn]){col.style.blockSize='100%';const spacer=document.createElement('div');spacer.className='residual-sticky-before';col.append(spacer);}scope.append(column,nativeColumn);column.append(e);nativeColumn.append(native);});
  const region=host(page,id),reference=page.locator('#residual-sticky-native'),measure=async()=>region.evaluate(e=>{const r=e.getBoundingClientRect(),n=document.querySelector('#residual-sticky-native')!.getBoundingClientRect(),scope=document.querySelector<HTMLElement>('#residual-sticky-scope')!,s=scope.getBoundingClientRect();return{actual:r.toJSON(),native:n.toJSON(),scope:s.toJSON(),scopeInnerTop:s.top+scope.clientTop,scopeInnerBottom:s.top+scope.clientTop+scope.clientHeight,scrollY,viewport:innerHeight};});
  const evidence=[];
  for(const edge of ['top','bottom'] as const){
   await update(page,id,{edge,offset:17});await reference.evaluate((e,edge)=>{const n=e as HTMLElement;n.style.top=edge==='top'?'17px':'';n.style.bottom=edge==='bottom'?'17px':'';},edge);
   // Independent flow space permits the native bottom-sticky pinned interval.
   await page.locator('.residual-sticky-before').evaluateAll((nodes,edge)=>nodes.forEach(e=>(e as HTMLElement).style.blockSize=edge==='bottom'?'900px':'0px'),edge);
   for(const context of [c,contexts[(contexts.indexOf(c)+1)%4]!]){
    await environment(page,context);await settle(page);const origin=await measure(),scopeStart=origin.scopeInnerTop+origin.scrollY,scopeEnd=origin.scopeInnerBottom+origin.scrollY,stickyHeight=origin.actual.height,offset=17;
    const terminal=edge==='top'?scopeEnd-stickyHeight-offset:scopeStart+stickyHeight-origin.viewport+offset;
    const samples=edge==='top'?[{phase:'pinned',top:scopeStart+Math.min(300,(scopeEnd-scopeStart-stickyHeight)/2)},{phase:'before-end',top:terminal-24},{phase:'at-end',top:terminal},{phase:'after-end',top:terminal+24}]:[{phase:'pinned',top:terminal+450},{phase:'before-end',top:terminal+24},{phase:'at-end',top:terminal},{phase:'after-end',top:terminal-24},{phase:'after-natural-end',top:terminal+924}];
    const group=[];
    for(const sample of samples){
     expect(sample.top).toBeGreaterThanOrEqual(0);await page.evaluate(top=>scrollTo({top,behavior:'instant'}),sample.top);await settle(page);const g=await measure();expect(Math.abs(g.scrollY-sample.top)).toBeLessThanOrEqual(1);expect(Math.abs(g.actual.top-g.native.top)).toBeLessThanOrEqual(1);expect(Math.abs(g.actual.height-g.native.height)).toBeLessThanOrEqual(1);expect(g.actual.top).toBeGreaterThanOrEqual(g.scopeInnerTop-1);expect(g.actual.bottom).toBeLessThanOrEqual(g.scopeInnerBottom+1);
     const expectedTop=edge==='top'?Math.min(offset,g.scopeInnerBottom-stickyHeight):Math.max(g.scopeInnerTop,Math.min(scopeStart+900-g.scrollY,g.viewport-offset-stickyHeight));expect(Math.abs(g.actual.top-expectedTop)).toBeLessThanOrEqual(1);
     group.push({edge,context,phase:sample.phase,requestedScroll:sample.top,scopeStart,scopeEnd,stickyHeight,terminal,expectedTop,...g});
    }
    await record('window-sticky-derived-terminal-'+edge+'-'+context.name,{origin,samples,group});
    expect(group.some(g=>g.phase==='pinned'&&Math.abs(edge==='top'?g.actual.top-offset:g.actual.bottom-(g.viewport-offset))<=1)).toBe(true);
    expect(group.some(g=>g.phase==='after-end'&&Math.abs(edge==='top'?g.actual.bottom-g.scopeInnerBottom:g.actual.top-g.scopeInnerTop)<=1&&(edge==='top'?g.actual.top<offset:g.actual.bottom>g.viewport-offset))).toBe(true);
    evidence.push(...group);
   }
   await environment(page,c);
  }
  await record('window-sticky-terminal-native',{context:c,evidence});await destroy(page,id);await page.evaluate(()=>scrollTo({top:3000,behavior:'instant'}));await settle(page);await expect(region).toHaveCount(0);
 });
 test(`residual oversized candidate popup ${c.name}: Combobox/TreeSelect oversized anchor clamp, full candidates and environment update`,async({page})=>{
  await ready(page,c);
  const labels=Array.from({length:18},(_,i)=>`候補 ${i}：全文を確認する ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 日本語の説明を保持する`);
  for(const kind of ['Combobox','TreeSelect']){
   const controlId='residual-candidates-'+kind,id=await create(page,kind,{controlId,label:'幅を超える候補 '+kind,...(kind==='Combobox'?{options:labels.map((label,i)=>({value:String(i),label}))}:{nodes:labels.map((label,i)=>({id:String(i),label}))})}),node=host(page,id),editor=node.locator('#'+controlId),popup=node.locator('#'+controlId+(kind==='Combobox'?'-list':'-popup'));
   // Deliberately oversized app anchor; it is not a recommended input layout.
   // The independently asserted contract here is the popup viewport clamp.
   await editor.evaluate(e=>{const n=e as HTMLElement;n.style.setProperty('position','fixed');n.style.setProperty('left','16px');n.style.setProperty('top','180px');n.style.setProperty('inline-size',(innerWidth+120)+'px','important');n.style.setProperty('max-inline-size','none','important');});
   await editor.press('ArrowDown');await expect(popup).toBeVisible();
   const observations=[];
   for(const context of [c,contexts[(contexts.indexOf(c)+1)%4]!]){
    await environment(page,context);await editor.evaluate(e=>(e as HTMLElement).style.setProperty('inline-size',(innerWidth+120)+'px','important'));await settle(page);expect((await editor.boundingBox())!.width).toBeGreaterThan(context.width);
    observations.push(await popupBounds(popup));
    if(kind==='Combobox'){
     await editor.press('End');await expect(editor).toHaveAttribute('aria-activedescendant',controlId+'-option-17');
    }else{
     const search=popup.locator('input[type=search]');await search.press('ArrowDown');await page.keyboard.press('End');await expect(popup.getByRole('treeitem').last()).toBeFocused();
    }
    const candidate=kind==='Combobox'?popup.getByRole('option').last():popup.getByRole('treeitem').last().locator('.ui-tree-label');await expect(candidate).toHaveText(labels[17]!);
    const allLines=async()=>candidate.evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const p=e.closest('[popover]')!,pr=p.getBoundingClientRect(),clip={left:pr.left+p.clientLeft,right:pr.left+p.clientLeft+p.clientWidth,top:pr.top+p.clientTop,bottom:pr.top+p.clientTop+p.clientHeight};return {text:e.textContent,rects:[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>r.toJSON()),clip};});
    const initial=await allLines();for(const r of initial.rects){expect(r.left).toBeGreaterThanOrEqual(initial.clip.left-1);expect(r.right).toBeLessThanOrEqual(initial.clip.right+1);}
    expect(initial.text?.trim()).toBe(labels[17]!);
    const fullHeight=Math.max(...initial.rects.map(r=>r.bottom))-Math.min(...initial.rects.map(r=>r.top));
    if(fullHeight<=initial.clip.bottom-initial.clip.top){for(const r of initial.rects){expect(r.top).toBeGreaterThanOrEqual(initial.clip.top-1);expect(r.bottom).toBeLessThanOrEqual(initial.clip.bottom+1);}}
    const reached=[];
    for(let index=0;index<initial.rects.length;index++){
     const geometry=await allLines(),line=geometry.rects[index]!;if(line.top<geometry.clip.top-1||line.bottom>geometry.clip.bottom+1){const box=(await popup.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,(line.top+line.bottom-geometry.clip.top-geometry.clip.bottom)/2);}
     await expect.poll(async()=>{const g=await allLines(),r=g.rects[index]!;return r.top>=g.clip.top-1&&r.bottom<=g.clip.bottom+1;}).toBe(true);const g=await allLines();reached.push({index,line:g.rects[index],clip:g.clip});
    }
    await record('oversized-anchor-candidate',{kind,context,initial,fullHeight,reached,geometry:await popupBounds(popup)});
   }
   if(kind==='TreeSelect'){
    const caps=[];
    for(const maximum of ['120px','none','50%']){
     await popup.evaluate((e,value)=>(e as HTMLElement).style.maxInlineSize=value,maximum);
     await editor.evaluate((e,width)=>(e as HTMLElement).style.setProperty('inline-size',width+'px','important'),await page.evaluate(()=>innerWidth+121));await settle(page);
     const expected=maximum==='120px'?120:await page.evaluate(()=>innerWidth);await expect.poll(()=>popup.evaluate(e=>Number.parseFloat((e as HTMLElement).style.minInlineSize))).toBe(expected);
     caps.push(await popup.evaluate(e=>({maximum:(e as HTMLElement).style.maxInlineSize,nativeMaximum:getComputedStyle(e).maxInlineSize,minimum:(e as HTMLElement).style.minInlineSize,width:e.getBoundingClientRect().width,viewport:innerWidth})));
     await editor.evaluate((e,width)=>(e as HTMLElement).style.setProperty('inline-size',width+'px','important'),await page.evaluate(()=>innerWidth+120));await settle(page);
    }
    await popup.evaluate(e=>(e as HTMLElement).style.removeProperty('max-inline-size'));await editor.evaluate((e,width)=>(e as HTMLElement).style.setProperty('inline-size',width+'px','important'),await page.evaluate(()=>innerWidth+121));await settle(page);await popupBounds(popup);await record('native-maximum-strict-px-caps',{context:c,caps});
   }
   await page.keyboard.press('Escape');await expect(popup).toBeHidden();await expect(editor).toBeFocused();await record('oversized-anchor-popup-clamp',{kind,context:c,observations});await destroy(page,id);
  }
 });
 for(const kind of ['Popover','HoverCard','ConfirmPopover','Tooltip'])test(`residual long popup ${c.name} ${kind}: bounded top layer, full text endpoints, native scroll/focus and retained environment`,async({page})=>{
  test.setTimeout(180000);await ready(page,c);const id=await create(page,'RuntimeResidualScroll',{kind,open:true}),wrapper=host(page,id),popup=wrapper.locator('[popover]');await expect(popup).toBeVisible();await expect(popup).toHaveJSProperty('popover','manual');expect(await popup.evaluate(e=>e.matches(':popover-open'))).toBe(true);const observations=[await popupBounds(popup)];expect(observations[0]!.scroll).toBeGreaterThan(observations[0]!.client);
  const editor=kind==='Tooltip'?null:wrapper.getByRole('textbox',{name:'保持するpopup入力'}),draft='更新後も保持する下書き';
  if(editor){await editor.fill(draft);await editor.evaluate(e=>(e as HTMLElement).dataset['retained']='same');}
  const retainedEditor=editor?await editor.elementHandle():null;
  for(const context of [c,contexts[(contexts.indexOf(c)+1)%4]!]){
   if(editor)await editor.focus();else await wrapper.locator('.anchor').focus();
   await environment(page,context);
   if(editor){expect(await editor.evaluate((e,retained)=>e===retained,retainedEditor)).toBe(true);await expect(editor).toHaveValue(draft);await expect(editor).toBeFocused();await expect(editor).toHaveAttribute('data-retained','same');}else await expect(wrapper.locator('.anchor')).toBeFocused();
   const content=await page.evaluate(id=>{const fixture=(window as any).__runtime.instance(id);return {rows:fixture.rows as string[],message:fixture.longMessage as string};},id);
   if(kind!=='Tooltip'){expect(content.rows).toHaveLength(24);await expect(popup.locator('.long')).toHaveCount(24);expect(await popup.locator('.long').allTextContents()).toEqual(content.rows);}
   if(kind==='Tooltip'||kind==='ConfirmPopover')expect(await popup.textContent()).toContain(content.message);
   await fullPopupText(page,popup,kind,context.name);
   await popupBounds(popup);await popup.evaluate(e=>e.scrollTop=0);await settle(page);const first=await textEndpoint(popup,false);expect(first.inside).toBe(true);
   const box=(await popup.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,100000);await expect.poll(()=>popup.evaluate(e=>e.scrollTop+e.clientHeight>=e.scrollHeight-1)).toBe(true);
   const last=await textEndpoint(popup,true);expect(last.inside).toBe(true);observations.push({...await popupBounds(popup),first,last} as any);
   if(kind!=='Tooltip'){
    await everyPopupFocusable(page,popup,kind,context.name);await expect(editor!).toHaveValue(draft);await expect(editor!).toHaveAttribute('data-retained','same');expect(await editor!.evaluate((e,retained)=>e===retained,retainedEditor)).toBe(true);
   }else{await expect(wrapper.locator('.anchor')).toHaveAttribute('aria-describedby','residual-tooltip');}
  }
  await record('long-popup-full-text',{kind,context:c,observations});await page.keyboard.press('Escape');await expect(popup).toBeHidden();if(kind!=='Tooltip')await expect(wrapper.locator('.anchor')).toBeFocused();await destroy(page,id);await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
 });
}
