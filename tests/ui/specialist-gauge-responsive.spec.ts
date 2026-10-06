import {test,expect} from './catalog-test';
import {openSpecialistCatalog,profiles} from './specialist-test-helpers';
import type {Locator,Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({reducedMotion:'reduce'});

async function clickRenderedGaugePointer(page:Page,chart:Locator,label:string):Promise<void>{
 const svg=chart.locator('.ui-specialist-surface svg');
 const index=await svg.evaluate((root,label)=>{
  const title=Array.from(root.querySelectorAll('text')).find(node=>node.textContent===label)!.getBoundingClientRect();
  return Array.from(root.querySelectorAll('path')).map((path,index)=>({path,index})).filter(({path})=>!!path.getAttribute('transform')&&!/[aAcC]/.test(path.getAttribute('d')??'')&&getComputedStyle(path).fill!=='none').map(({path,index})=>{
   const origin=new DOMPoint(0,0).matrixTransform(path.getScreenCTM()!);
   return {index,horizontal:Math.abs(origin.x-(title.x+title.width/2)),vertical:title.y-origin.y};
  }).filter(item=>item.horizontal<2&&item.vertical>0).sort((a,b)=>a.vertical-b.vertical||b.index-a.index)[0]?.index??-1;
 },label);
 expect(index,'rendered pointer for '+label).toBeGreaterThanOrEqual(0);
 const pointer=svg.locator('path').nth(index);await pointer.scrollIntoViewIfNeeded();
 const point=await pointer.evaluate((element:SVGPathElement)=>{
  const total=element.getTotalLength();let x=0,y=0;
  for(let index=0;index<200;index++){const point=element.getPointAtLength(total*index/200);x+=point.x/200;y+=point.y/200;}
  const local=new DOMPoint(x,y);if(!element.isPointInFill(local))return null;
  const screen=local.matrixTransform(element.getScreenCTM()!);
  return document.elementFromPoint(screen.x,screen.y)===element?{x:screen.x,y:screen.y}:null;
 });
 expect(point,'native filled pointer hit target for '+label).not.toBeNull();
 await page.mouse.click(point!.x,point!.y);
}

async function textGeometry(surface:Locator){
 return surface.evaluate(root=>{
  const box=root.getBoundingClientRect();return {width:box.width,height:box.height,direction:getComputedStyle(root).direction,texts:Array.from(root.querySelectorAll('svg text')).map(text=>{
   const rect=text.getBoundingClientRect();return {text:text.textContent,x:rect.x-box.x,y:rect.y-box.y,width:rect.width,height:rect.height,font:getComputedStyle(text).fontSize};
  })};
 });
}
function assertReadable(geometry:Awaited<ReturnType<typeof textGeometry>>){
 expect(geometry.direction).toBe('ltr');
 for(const rect of geometry.texts){expect(rect.x).toBeGreaterThanOrEqual(-1);expect(rect.y).toBeGreaterThanOrEqual(-1);expect(rect.x+rect.width).toBeLessThanOrEqual(geometry.width+1);expect(rect.y+rect.height).toBeLessThanOrEqual(geometry.height+1);}
 for(let a=0;a<geometry.texts.length;a++)for(let b=a+1;b<geometry.texts.length;b++){
  const first=geometry.texts[a]!,second=geometry.texts[b]!;
  expect(first.x+first.width<=second.x||second.x+second.width<=first.x||first.y+first.height<=second.y||second.y+second.height<=first.y,first.text+' and '+second.text+' stay separate').toBe(true);
 }
}

for(const profile of profiles){
 test(profile+': chart names, labels and every gauge selection survive 320px, 200% and RTL with native scroll access',async({page},info)=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width:1280,height:900});await openSpecialistCatalog(page,profile);
  const chart=page.locator('#chart > ui-chart'),surface=chart.locator('.ui-specialist-surface'),region=chart.locator('.ui-specialist-plot-scroll');
  const configurations=[];
  for(const size of ['wide','narrow']){
   if(size==='narrow'){
    await page.setViewportSize({width:320,height:900});await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    await expect(page.locator('main[data-ui-profile]')).toHaveAttribute('dir','rtl');
   }
   const font=profile==='guided'?(size==='wide'?18:36):(size==='wide'?16:32);
   for(const kind of ['line','bar','area','scatter','heatmap']){
    await page.getByLabel('グラフの種別').selectOption(kind);
    await expect(surface.locator('svg text').getByText(kind==='heatmap'?'縦座標':'値',{exact:true})).toHaveCSS('font-size',font+'px');
    await expect(surface.locator('svg text').getByText('順番',{exact:true})).toBeVisible();
    await expect(surface.locator('svg text').getByText('今回',{exact:true})).toBeVisible();
    const geometry=await textGeometry(surface);assertReadable(geometry);expect(geometry.texts.every(text=>text.font===font+'px')).toBe(true);
    if(['line','bar','area'].includes(kind))for(const label of ['受付','承認','差戻し'])expect(geometry.texts.some(text=>text.text===label)).toBe(true);
    let scroll=null;
    if(size==='narrow'){
     await region.evaluate(root=>root.scrollLeft=0);await region.focus();await region.press('ArrowRight');
     await expect.poll(()=>region.evaluate(root=>root.scrollLeft)).toBeGreaterThan(0);
     const keyboard=await region.evaluate(root=>root.scrollLeft);await region.hover();await page.mouse.wheel(240,0);
     await expect.poll(()=>region.evaluate(root=>root.scrollLeft)).toBeGreaterThan(keyboard);
     scroll=await region.evaluate(root=>({left:root.scrollLeft,client:root.clientWidth,scroll:root.scrollWidth,role:root.getAttribute('role'),name:root.getAttribute('aria-label')}));
     expect(scroll.role).toBe('region');expect(scroll.name).toBe('申請件数');expect(scroll.scroll).toBeGreaterThan(scroll.client);
     for(const edge of ['left','right']){
      await region.evaluate((root,edge)=>root.scrollLeft=edge==='left'?0:root.scrollWidth,edge);
      const visible=await region.evaluate((root,edge)=>{
       const bounds=root.getBoundingClientRect(),texts=Array.from(root.querySelectorAll('svg text')).map(text=>({text:text.textContent,box:text.getBoundingClientRect()}));
       texts.sort((a,b)=>edge==='left'?a.box.x-b.box.x:(b.box.right-a.box.right));
       const text=texts[0]!;return {text:text.text,left:text.box.left-bounds.left,right:text.box.right-bounds.left,client:root.clientWidth};
      },edge);
      expect(visible.left,visible.text+' remains reachable at '+edge).toBeGreaterThanOrEqual(-1);expect(visible.right).toBeLessThanOrEqual(visible.client+1);
      await info.attach(profile+'-'+kind+'-scroll-'+edge,{body:await region.screenshot(),contentType:'image/png'});
     }
    }
    configurations.push({size,kind,geometry,scroll});
    await info.attach(profile+'-'+size+'-'+kind,{body:await surface.screenshot(),contentType:'image/png'});
   }
   await page.getByLabel('グラフの種別').selectOption('gauge');
   for(const text of ['受付','承認','差戻し','12','7','3'])await expect(surface.locator('svg text').getByText(text,{exact:true})).toHaveCSS('font-size',font+'px');
   const geometry=await textGeometry(surface);assertReadable(geometry);
   for(const value of Array.from({length:11},(_,index)=>String(index*10)))expect(geometry.texts.filter(text=>text.text===value)).toHaveLength(3);
   if(size==='narrow'){
    await region.evaluate(root=>root.scrollLeft=0);await region.focus();await region.press('ArrowRight');
    await expect.poll(()=>region.evaluate(root=>root.scrollLeft)).toBeGreaterThan(0);
    const keyboard=await region.evaluate(root=>root.scrollLeft);await region.hover();await page.mouse.wheel(160,0);
    await expect.poll(()=>region.evaluate(root=>root.scrollLeft)).toBeGreaterThan(keyboard);
    for(const edge of ['left','right']){
     await region.evaluate((root,edge)=>root.scrollLeft=edge==='left'?0:root.scrollWidth,edge);
     await info.attach(profile+'-gauge-scroll-'+edge,{body:await region.screenshot(),contentType:'image/png'});
    }
   }
   for(const [label,id] of [['受付','one'],['承認','two'],['差戻し','three']]){
    await clickRenderedGaugePointer(page,chart,label!);await expect(page.locator('[data-chart-selection]')).toHaveText(id!);
   }
   await chart.getByRole('button',{name:'承認を選択',exact:true}).press('Space');await expect(page.locator('[data-chart-selection]')).toHaveText('two');
   await chart.getByRole('checkbox',{name:'今回の系列を表示',exact:true}).uncheck();await expect(surface.locator('svg text')).toHaveCount(0);
   await expect(chart.locator('table')).toContainText('受付');await expect(chart.locator('table')).toContainText('12');await expect(page.locator('[data-chart-selection]')).toHaveText('two');
   await chart.getByRole('checkbox',{name:'今回の系列を表示',exact:true}).check();await expect(surface.locator('svg text').getByText('承認',{exact:true})).toBeVisible();
   const ax=await chart.ariaSnapshot(),axe=await new AxeBuilder({page}).include('#chart > ui-chart').analyze();expect(ax).toContain('承認を選択');expect(axe.violations).toEqual([]);
   const width=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(width.scroll).toBeLessThanOrEqual(width.client);
   configurations.push({size,kind:'gauge',geometry,ax,violations:axe.violations,incomplete:axe.incomplete,width});
   await info.attach(profile+'-'+size+'-gauge',{body:await surface.screenshot(),contentType:'image/png'});
  }
  await info.attach('responsive-chart-evidence',{body:JSON.stringify(configurations),contentType:'application/json'});
 });
}
