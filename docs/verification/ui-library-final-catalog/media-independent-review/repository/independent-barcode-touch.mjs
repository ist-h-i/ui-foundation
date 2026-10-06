import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const destination='../evidence/barcode-touch';await mkdir(destination,{recursive:true});const browser=await chromium.launch({channel:'chromium'}),rows=[];
try{
 for(const profile of ['guided','dense']){
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:320,height:900},deviceScaleFactor:1});const page=await context.newPage();
  await page.goto('http://127.0.0.1:5342/catalog/media');await page.waitForSelector('ui-barcode canvas');
  if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided'}).tap();await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'RTL false'}).tap();
  const viewport=page.locator('ui-barcode .ui-media-code-viewport');await viewport.scrollIntoViewIfNeeded();const geometry=await viewport.evaluate(node=>({clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,canvasWidth:node.querySelector('canvas').getBoundingClientRect().width,tabIndex:node.tabIndex,role:node.getAttribute('role'),label:node.getAttribute('aria-label')}));expect(geometry.canvasWidth).toBe(400);expect(geometry.scrollWidth).toBe(400);
  const session=await context.newCDPSession(page),box=await viewport.boundingBox(),y=box.y+box.height/2;
  const swipe=async(right)=>{const from=right?box.x+box.width-16:box.x+16,to=right?box.x+16:box.x+box.width-16;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y,id:1}]});for(let i=1;i<=6;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/6,y,id:1}]});await page.waitForTimeout(30);}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await swipe(true);await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBe(geometry.scrollWidth-geometry.clientWidth);const right=await viewport.evaluate(node=>node.scrollLeft);
  await swipe(false);await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBe(0);const left=await viewport.evaluate(node=>node.scrollLeft);
  const axe=await new AxeBuilder({page}).include('ui-barcode').analyze();await writeFile(destination+'/'+profile+'-axe.json',JSON.stringify(axe,null,2));await viewport.screenshot({path:destination+'/'+profile+'-visible-part.png'});
  const row={profile,geometry,nativeTouch:{right,left},pageWidth:await page.evaluate(()=>document.documentElement.scrollWidth),ariaSnapshot:await viewport.ariaSnapshot(),axe:{violations:axe.violations.map(item=>item.id),incomplete:axe.incomplete.map(item=>item.id)}};expect(row.pageWidth).toBeLessThanOrEqual(320);expect(row.axe.violations).toEqual([]);rows.push(row);await writeFile(destination+'/observations.json',JSON.stringify(rows,null,2));console.log(profile+': native touch reaches both bounds; canvas400; pageWidth='+row.pageWidth);await session.detach();await context.close();
 }
}finally{await browser.close();}
await writeFile(destination+'/exit.json',JSON.stringify({exit:0,conditions:rows.length},null,2));
