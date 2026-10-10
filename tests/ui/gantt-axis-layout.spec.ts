import {test,expect} from './catalog-test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';
import type {Locator} from '@playwright/test';

test.use({reducedMotion:'reduce'});

async function textGeometry(surface:Locator){
 return surface.evaluate(root=>{
  const box=root.getBoundingClientRect();
  return {width:box.width,height:box.height,font:getComputedStyle(root).fontSize,direction:getComputedStyle(root).direction,texts:Array.from(root.querySelectorAll('svg text')).map(text=>{
   const rect=text.getBoundingClientRect();return {text:text.textContent,x:rect.x-box.x,y:rect.y-box.y,width:rect.width,height:rect.height,font:getComputedStyle(text).fontSize};
  })};
 });
}

function assertReadable(geometry:Awaited<ReturnType<typeof textGeometry>>){
 expect(geometry.direction).toBe('ltr');
 expect(geometry.texts.length).toBeGreaterThanOrEqual(3);
 expect([...new Set(geometry.texts.map(text=>text.font))],'axis fonts follow the current semantic text size').toEqual([geometry.font]);
 for(const rect of geometry.texts){
  expect(rect.x,rect.text+' stays inside the plot').toBeGreaterThanOrEqual(-1);
  expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x+rect.width).toBeLessThanOrEqual(geometry.width+1);
  expect(rect.y+rect.height).toBeLessThanOrEqual(geometry.height+1);
 }
 for(let first=0;first<geometry.texts.length;first++)for(let second=first+1;second<geometry.texts.length;second++){
  const a=geometry.texts[first]!,b=geometry.texts[second]!;
  expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,a.text+' and '+b.text+' do not overlap').toBe(true);
 }
}

async function waitForScrollStop(region:Locator):Promise<number>{
 return region.evaluate(root=>new Promise<number>((resolve,reject)=>{
  let previous=root.scrollLeft,unchanged=0;const started=performance.now();
  const frame=()=>{
   const current=root.scrollLeft;unchanged=current===previous?unchanged+1:0;previous=current;
   if(unchanged>=6){resolve(current);return;}
   if(performance.now()-started>2000){reject(new Error('Gantt native scrolling did not settle'));return;}
   requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
 }));
}

async function edgeCharacters(region:Locator){
 return region.evaluate(root=>{
  const bounds=root.getBoundingClientRect();
  return {left:root.scrollLeft,client:root.clientWidth,scroll:root.scrollWidth,characters:Array.from(root.querySelectorAll<SVGTextElement>('svg text')).flatMap((element,index)=>{
   const matrix=element.getScreenCTM()!;
   return (['first','last'] as const).map(edge=>{
    const character=element.getExtentOfChar(edge==='first'?0:element.getNumberOfChars()-1);
    const corners=[[character.x,character.y],[character.x+character.width,character.y],[character.x,character.y+character.height],[character.x+character.width,character.y+character.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
    const left=Math.min(...corners.map(point=>point.x))-bounds.left,right=Math.max(...corners.map(point=>point.x))-bounds.left;
    return {id:index+':'+edge,text:element.textContent,edge,left,right,visible:left>=-1&&right<=root.clientWidth+1};
   });
  })};
 });
}

async function scanEdgesWithKeyboard(region:Locator){
 await region.focus();await waitForScrollStop(region);
 await region.evaluate(root=>root.scrollTo({left:0,behavior:'instant'}));await waitForScrollStop(region);
 const first=await edgeCharacters(region),states=[first],seen=new Set(first.characters.filter(character=>character.visible).map(character=>character.id));
 // Scan the complete labels through the native keyboard viewport. A final
 // tick may precede the plot boundary, and long dates need several positions.
 const maximumSteps=Math.ceil(first.scroll-first.client)+1;
 for(let step=0;seen.size<first.characters.length&&step<maximumSteps;step++){
  const previous=states.at(-1)!;
  if(previous.left+previous.client>=previous.scroll-1)break;
  await region.press('ArrowRight');await waitForScrollStop(region);
  const current=await edgeCharacters(region);states.push(current);
  for(const character of current.characters)if(character.visible)seen.add(character.id);
  if(current.left<=previous.left)break;
 }
 const end=states.at(-1)!;
 await region.press('ArrowLeft');await waitForScrollStop(region);
 const back=await edgeCharacters(region);
 return {states,back,movedRight:end.left>first.left,movedLeft:back.left<end.left,unreachable:first.characters.filter(character=>!seen.has(character.id))};
}

for(const profile of profiles){
 test(profile+': Gantt date/task labels remain readable across widths, text sizes and scales with keyboard scroll',async({page},info)=>{
  test.setTimeout(90_000);
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Gantt');
  const gantt=page.locator('#gantt ui-gantt'),surface=gantt.locator('.ui-specialist-surface'),region=gantt.locator('.ui-specialist-plot-scroll');
  const evidence=[];
  for(const {width,zoom} of [{width:320,zoom:200},{width:1440,zoom:100},{width:320,zoom:100},{width:1440,zoom:200}]){
   await page.setViewportSize({width,height:900});await page.evaluate(zoom=>document.documentElement.style.fontSize=zoom+'%',zoom);
   for(const scale of ['day','week','month']){
    await gantt.getByLabel('時間軸',{exact:true}).selectOption(scale);
    await expect.poll(async()=>surface.locator('svg text').first().evaluate(text=>getComputedStyle(text).fontSize)).toBe(await surface.evaluate(root=>getComputedStyle(root).fontSize));
    const geometry=await textGeometry(surface);
    await info.attach(profile+'-'+width+'-'+zoom+'-'+scale,{body:JSON.stringify(geometry),contentType:'application/json'});
    await info.attach(profile+'-'+width+'-'+zoom+'-'+scale+'-plot',{body:await surface.screenshot(),contentType:'image/png'});
    assertReadable(geometry);
    await expect(region).toHaveAttribute('role','region');await expect(region).toHaveAttribute('aria-label','申請処理の工程の図');await expect(region).toHaveAttribute('tabindex','0');
    const size=await region.evaluate(root=>({client:root.clientWidth,scroll:root.scrollWidth}));
    let keyboard=null;
    if(width===320){
     expect(size.scroll).toBeGreaterThan(size.client);
     keyboard=await scanEdgesWithKeyboard(region);
     await info.attach(profile+'-'+width+'-'+zoom+'-'+scale+'-keyboard',{body:JSON.stringify(keyboard),contentType:'application/json'});
     expect(keyboard.movedRight,'native ArrowRight scrolls the plot').toBe(true);expect(keyboard.movedLeft,'native ArrowLeft scrolls the plot').toBe(true);
     expect(keyboard.unreachable,'every rendered label first/last character is fully reachable through native keyboard scrolling').toEqual([]);
    }
    await expect(gantt.locator('table')).toContainText('提出');await expect(gantt.locator('table')).toContainText('承認');await expect(gantt.locator('table')).toContainText('未取得');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    evidence.push({width,zoom,scale,geometry,size,keyboard});
   }
  }
  await page.getByRole('button',{name:'方向: LTR',exact:true}).click();await expect(region).toHaveCSS('direction','ltr');
  await page.setViewportSize({width:320,height:900});
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';const owner=document.querySelector('main')!;owner.style.setProperty('--ui-text-body','2.125rem');owner.style.setProperty('--ui-space-control-gap','1.125rem');owner.style.setProperty('--ui-leading-body','1.75');});
  await expect.poll(()=>surface.locator('svg text').first().evaluate(text=>getComputedStyle(text).fontSize)).toBe('68px');
  const overridden=await textGeometry(surface);assertReadable(overridden);evidence.push({overridden});
  const progress=gantt.getByLabel('承認 進捗を編集',{exact:true});await progress.fill('120');await progress.press('Tab');await expect(gantt.locator('[role=alert]')).toContainText('入力内容は保持');await expect(progress).toHaveValue('120');
  await gantt.getByLabel('時間軸',{exact:true}).selectOption('day');await expect(progress).toHaveValue('120');await progress.fill('40');await progress.press('Tab');await expect(gantt.locator('progress').last()).toHaveAttribute('value','40');
  await page.getByLabel('読取り専用',{exact:true}).check();await expect(progress).toHaveAttribute('readonly','');await page.getByLabel('処理中',{exact:true}).check();await expect(progress).toBeDisabled();await expect(gantt.getByLabel('時間軸',{exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'専門部品を破棄',exact:true}).click();await expect(gantt).toHaveCount(0);await page.getByRole('button',{name:'専門部品を再生成',exact:true}).click();await expect(surface.locator('svg')).toBeVisible();
  await info.attach('gantt-responsive-evidence',{body:JSON.stringify(evidence),contentType:'application/json'});
 });
}

test('Gantt keeps inherited civil-date formatting and editable ISO values after locale and semantic-token changes',async({page})=>{
 await page.goto('/catalog/foundation');
 await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'de-DE',timeZone:'UTC',dateInputFormat:'dd/MM/yyyy',civilDateOptions:{year:'numeric',month:'2-digit',day:'2-digit'}}));
 const gantt=page.locator('#gantt-inherited'),surface=gantt.locator('.ui-specialist-surface'),date=gantt.locator('input[type=date]').first();
 await expect(surface.locator('svg')).toContainText('06.10.2026');await expect(date).toHaveValue('2026-10-06');await date.evaluate(element=>(window as any).__ganttDate=element);
 await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await expect.poll(()=>surface.locator('svg text').first().evaluate(text=>getComputedStyle(text).fontSize)).toBe(await surface.evaluate(root=>getComputedStyle(root).fontSize));assertReadable(await textGeometry(surface));
 await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'en-US',timeZone:'Asia/Tokyo',dateInputFormat:'dd/MM/yyyy',civilDateOptions:{year:'numeric',month:'2-digit',day:'2-digit'}}));
 await expect(surface.locator('svg')).toContainText('10/06/2026');expect(await date.evaluate(element=>element===(window as any).__ganttDate)).toBe(true);await expect(date).toHaveValue('2026-10-06');assertReadable(await textGeometry(surface));
});
