import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const destination='../evidence/compare-plane-final2';await mkdir(destination,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),rows=[];
try{
 for(const profile of ['guided','dense'])for(const rtl of [false,true]){
  const name=profile+(rtl?'-320-200-rtl':'-1280-ltr'),context=await browser.newContext({viewport:{width:rtl?320:1280,height:900}}),page=await context.newPage();
  await page.goto('http://127.0.0.1:5342/catalog/media');await page.waitForSelector('ui-image-compare input');
  if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided'}).click();
  if(rtl){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'RTL false'}).click();}
  const compare=page.getByTestId('compare'),slider=compare.getByRole('slider');
  const geometry=async()=>compare.evaluate(section=>{const slider=section.querySelector('input'),frame=section.querySelector('.ui-image-compare-frame'),line=section.querySelector('.ui-image-compare-line'),f=frame.getBoundingClientRect(),l=line.getBoundingClientRect();return {value:Number(slider.value),rangeDirection:getComputedStyle(slider).direction,mainDirection:getComputedStyle(section.closest('main')).direction,lineNormalized:(l.left-f.left)/f.width,clip:getComputedStyle(section.querySelector('img:last-of-type')).clipPath,ariaValue:slider.getAttribute('aria-valuetext')};});
  const observations=[];
  for(const point of [.2,.8]){await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();await page.mouse.click(box.x+box.width*point,box.y+box.height/2);const beforeRendered=await geometry();await expect.poll(async()=>{const current=await geometry();return Math.abs(current.lineNormalized-current.value/100);}).toBeLessThan(.02);const state=await geometry();expect(Math.abs(state.value/100-point)).toBeLessThan(.04);observations.push({action:'native-pointer',physicalPoint:point,beforeRendered,...state});}
  await slider.focus();
  for(const [key,value] of [['Home',0],['End',100],['Home',0],['ArrowRight',1]]){await page.keyboard.press(key);await expect(slider).toHaveValue(String(value));const beforeRendered=await geometry();await expect.poll(async()=>Math.abs((await geometry()).lineNormalized-value/100)).toBeLessThan(.02);const state=await geometry();observations.push({action:'native-keyboard',key,beforeRendered,...state});}
  expect((await geometry()).rangeDirection).toBe('ltr');expect((await geometry()).mainDirection).toBe(rtl?'rtl':'ltr');
  await writeFile(destination+'/'+name+'-geometry.json',JSON.stringify(observations,null,2));
  const axe=await new AxeBuilder({page}).include('ui-gallery').analyze();await writeFile(destination+'/'+name+'-gallery-axe.json',JSON.stringify(axe,null,2));
  await compare.screenshot({path:destination+'/'+name+'.png'});
  const row={name,observations,galleryRole:await page.locator('ui-gallery .ui-media-actions[aria-label]').getAttribute('role'),axe:{violations:axe.violations.map(item=>item.id),incomplete:axe.incomplete.map(item=>item.id)},scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth)};
  expect(row.galleryRole).toBe('group');expect(row.axe.violations).toEqual([]);expect(row.axe.incomplete).not.toContain('aria-prohibited-attr');if(rtl)expect(row.scrollWidth).toBeLessThanOrEqual(320);
  rows.push(row);await writeFile(destination+'/observations.json',JSON.stringify(rows,null,2));console.log(name+': physical pointer + keyboard aligned; Gallery aria-prohibited-attr clear; incomplete='+row.axe.incomplete.join(','));await context.close();
 }
}finally{await browser.close();}
await writeFile(destination+'/exit.json',JSON.stringify({exit:0,conditions:rows.length},null,2));
