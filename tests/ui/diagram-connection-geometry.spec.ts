import {test,expect} from './catalog-test';
import {readFile} from 'node:fs/promises';
import type {Locator} from '@playwright/test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {renderTokens} from '../../src/tokens.ts';

for(const profile of profiles)test(`Diagram ${profile}: bright action backgrounds keep a selected connection and its arrow visible`,async({page})=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
 const config=parseConfig(await readFile(new URL('../../examples/ui.config.example.yaml',import.meta.url),'utf8'));
 for(const configuredProfile of Object.values(config.profiles)){
  configuredProfile.semantic['color.action']='white';
  configuredProfile.semantic['color.action-hover']='white';
  configuredProfile.semantic['color.on-action']='ink';
 }
 const resolved=resolveConfig(config);
 await page.addStyleTag({content:renderTokens(resolved)});
 const flow=page.locator('#flow ui-flow-editor');
 const control=flow.locator('[data-diagram-edge-control]').first();
 await control.focus();await control.press('Enter');await expect(control).toHaveAttribute('aria-pressed','true');
 const edge=flow.locator('.ui-diagram-edge[data-selected=true]');
 await expect(edge).toHaveCount(1);
 const colors=await edge.evaluate(element=>({stroke:getComputedStyle(element).stroke,width:parseFloat(getComputedStyle(element).strokeWidth),surface:getComputedStyle(element.closest('.ui-diagram-canvas')!).backgroundColor,arrow:getComputedStyle(element.parentElement!.querySelector('.ui-diagram-arrow')!).fill}));
 const rgb=(hex:string)=>`rgb(${[0,2,4].map(offset=>parseInt(hex.slice(1).slice(offset,offset+2),16)).join(', ')})`;
 expect(colors.stroke).toBe(rgb(String(resolved.profiles[profile].semantic['color.text'].value)));
 expect(colors.arrow).toBe(colors.stroke);
 expect(colors.stroke).not.toBe(colors.surface);
 expect(colors.width).toBeGreaterThan(1);
 await expect(control).toBeFocused();
});

async function connectionGeometry(flow:Locator){
 return flow.evaluate(root=>{
  const nodes=Array.from(root.querySelectorAll<HTMLElement>('.ui-diagram-node')).map(element=>element.getBoundingClientRect());
  const path=root.querySelector<SVGPathElement>('.ui-diagram-canvas path')!,matrix=path.getScreenCTM()!;
  const start=path.getPointAtLength(0).matrixTransform(matrix),end=path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
  const from=nodes[0]!,to=nodes[1]!;
  return {start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},nodes:nodes.map(box=>box.toJSON()),errors:[Math.abs(start.x-from.right),Math.abs(start.y-(from.top+from.height/2)),Math.abs(end.x-to.left),Math.abs(end.y-(to.top+to.height/2))]};
 });
}

async function expectConnected(flow:Locator){
 await expect.poll(async()=>Math.max(...(await connectionGeometry(flow)).errors),{message:'SVG connection endpoints coincide with the rendered node edges and centers'}).toBeLessThan(1);
}

async function connectionLabelGeometry(flow:Locator){
 return flow.evaluate(root=>{
  const nodes=Array.from(root.querySelectorAll<HTMLElement>('.ui-diagram-node')).map(node=>node.getBoundingClientRect());
  const canvas=root.querySelector<HTMLElement>('.ui-diagram-canvas')!.getBoundingClientRect();
  const labels=Array.from(root.querySelectorAll<SVGTextElement>('.ui-diagram-canvas text')).filter(label=>label.textContent?.trim()).map(label=>{
   const box=label.getBoundingClientRect();
   const overlaps=nodes.map(node=>({width:Math.max(0,Math.min(box.right,node.right)-Math.max(box.left,node.left)),height:Math.max(0,Math.min(box.bottom,node.bottom)-Math.max(box.top,node.top))}));
   return {text:label.textContent,box:box.toJSON(),overlaps};
  });
  return {labels,canvas:canvas.toJSON(),overlapArea:Math.max(0,...labels.flatMap(label=>label.overlaps.map(overlap=>overlap.width*overlap.height)))};
 });
}

async function expectLabelReadable(flow:Locator){
 await expect.poll(async()=>(await connectionLabelGeometry(flow)).overlapArea,{message:'connection captions remain clear of rendered nodes'}).toBeLessThan(.5);
 const geometry=await connectionLabelGeometry(flow);expect(geometry.labels[0]?.text).toBe('確認');
 for(const {box} of geometry.labels){
  expect(box.width).toBeGreaterThan(0);expect(box.height).toBeGreaterThan(0);
  expect(box.left).toBeGreaterThanOrEqual(geometry.canvas.left-.5);expect(box.right).toBeLessThanOrEqual(geometry.canvas.right+.5);
  expect(box.top).toBeGreaterThanOrEqual(geometry.canvas.top-.5);expect(box.bottom).toBeLessThanOrEqual(geometry.canvas.bottom+.5);
 }
 const label=flow.locator('.ui-diagram-canvas text').first();await label.scrollIntoViewIfNeeded();
 expect(await label.evaluate(element=>{const box=element.getBoundingClientRect(),root=element.closest('.ui-specialist-scroll')!.getBoundingClientRect();return box.left>=root.left-.5&&box.right<=root.right+.5&&box.top>=root.top-.5&&box.bottom<=root.bottom+.5;})).toBe(true);
}

async function expectVisibleNativeFocus(target:Locator){
 await expect(target).toBeFocused();
 expect(await target.evaluate(element=>{const box=element.getBoundingClientRect(),style=getComputedStyle(element);return /^(INPUT|SELECT|BUTTON)$/.test(element.tagName)&&!element.matches(':disabled')&&box.width>0&&box.height>0&&box.left>=-.5&&box.right<=innerWidth+.5&&box.top>=-.5&&box.bottom<=innerHeight+.5&&style.outlineStyle==='solid';})).toBe(true);
}

for(const profile of profiles)test(`Diagram ${profile}: connections follow actual node geometry across viewport, text, zoom, edits and recreation`,async({page},info)=>{
 test.setTimeout(60_000);
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
 const flow=page.locator('#flow ui-flow-editor'),observations=[];
 for(const {width,text} of [{width:1280,text:100},{width:1280,text:200},{width:320,text:200}]){
  await page.setViewportSize({width,height:900});await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',text);
  await expectConnected(flow);observations.push({width,text,geometry:await connectionGeometry(flow)});
 }
 await page.getByRole('button',{name:'方向: LTR',exact:true}).click();await expectConnected(flow);
 await flow.getByRole('button',{name:'拡大',exact:true}).click();await expectConnected(flow);
 const label=flow.locator('tbody tr').first().locator('input').first(),longLabel='申請内容と添付資料を確認して担当者へ回す処理'.repeat(3);
 await label.fill(longLabel);await label.press('Tab');await expect(flow.locator('.ui-diagram-node').first()).toHaveText(longLabel);await expectConnected(flow);await expectLabelReadable(flow);
 await flow.getByRole('button',{name:'自動配置',exact:true}).click();await expectConnected(flow);
 const node=flow.locator('.ui-diagram-node').first();await node.focus();await node.press('Shift+ArrowRight');await expectConnected(flow);
 const x=flow.locator('tbody tr').first().locator('input[type=number]').first();
 await x.fill('-1');await x.press('Tab');await expect(x).toHaveAttribute('aria-invalid','true');await expect(x).toHaveValue('-1');await expectConnected(flow);
 await page.getByRole('button',{name:/プロファイル:/}).click();await expect(x).toHaveValue('-1');await expectConnected(flow);
 await info.attach('connection-geometry',{body:JSON.stringify({profile,observations,edited:await connectionGeometry(flow)}),contentType:'application/json'});
 await page.getByLabel('処理中',{exact:true}).check();await expect(node).toBeDisabled();await expectConnected(flow);await page.getByLabel('処理中',{exact:true}).uncheck();
 await page.getByRole('button',{name:'専門部品を破棄',exact:true}).click();await expect(flow).toHaveCount(0);
 await page.getByRole('button',{name:'専門部品を再生成',exact:true}).click();await expectConnected(flow);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

for(const profile of profiles)test(`Diagram ${profile}: automatic placement reserves readable connection labels beside long nodes`,async({page},info)=>{
 test.setTimeout(60_000);
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
 const flow=page.locator('#flow ui-flow-editor'),longLabel='承認の判断に必要な申請内容と添付資料を確認して担当者へ連絡する処理'.repeat(3);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const targetLabel=flow.locator('tbody tr').nth(1).locator('input').first();
 await targetLabel.fill(longLabel);await targetLabel.press('Tab');await expect(flow.locator('.ui-diagram-node').nth(1)).toHaveText(longLabel);
 const observations=[];
 for(const width of [1280,320]){
  await page.setViewportSize({width,height:900});
  for(const direction of ['ltr','rtl']){
   if(direction==='rtl')await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
   else if((await page.locator('main').getAttribute('dir'))==='rtl')await page.getByRole('button',{name:'方向: RTL',exact:true}).click();
   await flow.getByRole('button',{name:'拡大',exact:true}).click();
   await flow.getByRole('button',{name:'自動配置',exact:true}).click();
   await expectConnected(flow);
   await expect.poll(async()=>(await connectionLabelGeometry(flow)).overlapArea,{message:'the entire connection label stays clear of every node after auto layout'}).toBeLessThan(.5);
   const geometry=await connectionLabelGeometry(flow);expect(geometry.labels[0]?.text).toBe('確認');
   const label=flow.locator('.ui-diagram-canvas text').first();await label.scrollIntoViewIfNeeded();
   expect(await label.evaluate(element=>{const box=element.getBoundingClientRect(),root=element.closest('.ui-specialist-scroll')!.getBoundingClientRect();return box.left>=root.left-.5&&box.right<=root.right+.5&&box.top>=root.top-.5&&box.bottom<=root.bottom+.5;})).toBe(true);
   observations.push({width,direction,geometry});
  }
 }
 await info.attach('connection-label-clearance',{body:JSON.stringify({profile,observations}),contentType:'application/json'});
});

for(const profile of profiles)test(`Diagram ${profile}: manual captions retain full text and connection geometry across text size and direction`,async({page},info)=>{
 test.setTimeout(60_000);
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
 const flow=page.locator('#flow ui-flow-editor'),observations=[];
 await flow.getByRole('button',{name:'拡大',exact:true}).click();
 for(const width of [1280,320])for(const text of [100,200])for(const direction of ['ltr','rtl']){
  await page.setViewportSize({width,height:900});await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',text);
  if((await page.locator('main').getAttribute('dir'))!==direction)await page.getByRole('button',{name:direction==='rtl'?'方向: LTR':'方向: RTL',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('dir',direction);await expectConnected(flow);await expectLabelReadable(flow);
  observations.push({width,text,direction,geometry:await connectionLabelGeometry(flow)});
 }
 const longLabel='承認の判断に必要な申請内容と添付資料を確認して担当者へ連絡する処理'.repeat(3),targetLabel=flow.locator('tbody tr').nth(1).locator('input').first();
 await targetLabel.fill(longLabel);await targetLabel.press('Tab');await expect(flow.locator('.ui-diagram-node').nth(1)).toHaveText(longLabel);
 await expectConnected(flow);await expectLabelReadable(flow);observations.push({longTarget:true,geometry:await connectionLabelGeometry(flow)});
 await page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Kanban',exact:true}).click();
 await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.getByRole('button',{name:/プロファイル:/}).click();
 await openSpecialistSurface(page,'Diagram');await expectConnected(flow);await expectLabelReadable(flow);
 observations.push({shownAfterScopeChange:true,geometry:await connectionLabelGeometry(flow)});
 await info.attach('manual-caption-readability',{body:JSON.stringify({profile,observations}),contentType:'application/json'});
});

for(const profile of profiles)test(`Diagram ${profile}: keyboard removal retains a visible native focus and Tab continues`,async({page},info)=>{
 test.setTimeout(60_000);
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
 await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.getByRole('button',{name:'方向: LTR',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('dir','rtl');
 const flow=page.locator('#flow ui-flow-editor'),edges=flow.getByRole('list',{name:'接続',exact:true});
 await flow.getByRole('button',{name:'ノードを追加',exact:true}).press('Enter');await expect(flow.locator('tbody tr')).toHaveCount(3);
 await flow.getByRole('button',{name:'自動配置',exact:true}).click();
 const removeNode=flow.getByRole('button',{name:'新しいノードを削除',exact:true});await removeNode.focus();await removeNode.press('Enter');
 await expect(flow.locator('tbody tr')).toHaveCount(2);
 const label=flow.getByRole('textbox',{name:'承認 ラベル',exact:true});await expectVisibleNativeFocus(label);
 await label.press('Tab');await expectVisibleNativeFocus(flow.getByRole('spinbutton',{name:'承認 横位置',exact:true}));
 await flow.getByLabel('接続元',{exact:true}).selectOption('b');await flow.getByLabel('接続先',{exact:true}).selectOption('a');
 await flow.getByRole('button',{name:'接続する',exact:true}).press('Space');await expect(edges.locator('li')).toHaveCount(2);
 const removeEdge=edges.getByRole('button',{name:'接続を削除',exact:true}).nth(1);await removeEdge.focus();await removeEdge.press('Enter');
 await expect(edges.locator('li')).toHaveCount(1);const selectedEdge=edges.locator('li').first().getByRole('button').first();await expectVisibleNativeFocus(selectedEdge);
 await selectedEdge.press('Tab');await expectVisibleNativeFocus(edges.getByRole('button',{name:'接続を削除',exact:true}));
 await edges.getByRole('button',{name:'接続を削除',exact:true}).press('Enter');await expect(edges.locator('li')).toHaveCount(0);
 await expectVisibleNativeFocus(flow.getByLabel('接続元',{exact:true}));await flow.getByLabel('接続元',{exact:true}).press('Tab');await expectVisibleNativeFocus(flow.getByLabel('接続先',{exact:true}));
 await info.attach('remove-focus',{body:JSON.stringify(await flow.evaluate(root=>({nodes:root.querySelectorAll('tbody tr').length,edges:root.querySelectorAll('ul li').length,active:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}}))),contentType:'application/json'});
});

for(const profile of profiles)test(`Diagram ${profile}: app-owned removal preserves external focus and blocked controls preserve the model`,async({page})=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
 const flow=page.locator('#flow ui-flow-editor'),external=page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Diagram',exact:true});
 for(const name of ['読取り専用','処理中','操作抑止']){
  await page.getByLabel(name,{exact:true}).check();
  await expect(flow.getByRole('button',{name:'承認を削除',exact:true})).toBeDisabled();await expect(flow.getByRole('button',{name:'接続を削除',exact:true})).toBeDisabled();
  await flow.getByRole('button',{name:'承認を削除',exact:true}).evaluate(element=>(element as HTMLButtonElement).click());
  await expect(flow.locator('tbody tr')).toHaveCount(2);await expect(flow.getByRole('list',{name:'接続',exact:true}).locator('li')).toHaveCount(1);
  await page.getByLabel(name,{exact:true}).uncheck();
  await expect(flow.getByRole('button',{name:'ノードを追加',exact:true})).toBeEnabled();
 }
 await flow.getByRole('button',{name:'ノードを追加',exact:true}).press('Enter');await expect(flow.locator('tbody tr')).toHaveCount(3);
 const nodeRemove=flow.getByRole('button',{name:'新しいノードを削除',exact:true});
 await nodeRemove.evaluate(element=>{const outside=Array.from(document.querySelectorAll<HTMLElement>('nav[aria-label="専門部品"] button')).find(button=>button.textContent?.trim()==='Diagram')!;element.addEventListener('click',()=>outside.focus(),{once:true});});
 await nodeRemove.focus();await nodeRemove.press('Enter');await expect(flow.locator('tbody tr')).toHaveCount(2);await expect(external).toBeFocused();
 const edgeRemove=flow.getByRole('button',{name:'接続を削除',exact:true});
 await edgeRemove.evaluate(element=>{const outside=Array.from(document.querySelectorAll<HTMLElement>('nav[aria-label="専門部品"] button')).find(button=>button.textContent?.trim()==='Diagram')!;element.addEventListener('click',()=>outside.focus(),{once:true});});
 await edgeRemove.focus();await edgeRemove.press('Enter');await expect(flow.getByRole('list',{name:'接続',exact:true}).locator('li')).toHaveCount(0);await expect(external).toBeFocused();
 await page.getByRole('button',{name:'専門部品を破棄',exact:true}).click();await expect(flow).toHaveCount(0);
 await page.getByRole('button',{name:'専門部品を再生成',exact:true}).click();await expect(flow.locator('tbody tr')).toHaveCount(2);await expect(flow.getByRole('list',{name:'接続',exact:true}).locator('li')).toHaveCount(0);
});

for(const profile of profiles)test(`Diagram ${profile}: forward and reverse arrows point into their target and retain semantic paint through zoom and RTL`,async({page},info)=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');const flow=page.locator('#flow ui-flow-editor');
 await flow.getByLabel('接続元',{exact:true}).selectOption('b');await flow.getByLabel('接続先',{exact:true}).selectOption('a');await flow.getByRole('button',{name:'接続する',exact:true}).click();await expect(flow.locator('.ui-diagram-arrow')).toHaveCount(2);
 const observations=[];
 for(const width of [1280,320]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(width===320)await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
  await flow.getByRole('button',{name:'拡大',exact:true}).click();
  const geometry=await flow.evaluate(root=>{
   const nodes=[...root.querySelectorAll<HTMLElement>('.ui-diagram-node')].map(element=>element.getBoundingClientRect()),paths=[...root.querySelectorAll<SVGPathElement>('.ui-diagram-edge')];
   return [...root.querySelectorAll<SVGPolygonElement>('.ui-diagram-arrow')].map((arrow,index)=>{
    const path=paths[index]!,length=path.getTotalLength(),end=path.getPointAtLength(length),prior=path.getPointAtLength(Math.max(0,length-1)),tip=arrow.points.getItem(0),one=arrow.points.getItem(1),two=arrow.points.getItem(2),base={x:(one.x+two.x)/2,y:(one.y+two.y)/2},target=nodes[index===0?1:0]!,screen=tip.matrixTransform(arrow.getScreenCTM()!);
    return {paint:getComputedStyle(arrow).fill,targetError:Math.max(Math.abs(screen.x-(index===0?target.left:target.right)),Math.abs(screen.y-(target.top+target.height/2))),tipError:Math.hypot(tip.x-end.x,tip.y-end.y),direction:(end.x-prior.x)*(tip.x-base.x)+(end.y-prior.y)*(tip.y-base.y)};
   });
  });
  for(const arrow of geometry){expect(arrow.paint).not.toBe('none');expect(arrow.paint).not.toBe('rgba(0, 0, 0, 0)');expect(arrow.targetError).toBeLessThan(1);expect(arrow.tipError).toBeLessThan(.01);expect(arrow.direction).toBeGreaterThan(0);}
  observations.push({width,geometry});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);await info.attach('rendered-direction-arrows',{body:JSON.stringify({profile,observations}),contentType:'application/json'});
});
