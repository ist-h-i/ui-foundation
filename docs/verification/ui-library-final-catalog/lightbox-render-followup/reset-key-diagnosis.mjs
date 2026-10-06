import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const destination='evidence/native-reset-key';await mkdir(destination,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),rows=[];
try{
 for(const rate of [1,6])for(const profile of ['guided','dense'])for(const guarded of [false,true]){
  const name=profile+'-cpu'+rate+(guarded?'-guarded':'-original'),context=await browser.newContext({viewport:{width:320,height:1000}}),page=await context.newPage();
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  await page.goto('http://127.0.0.1:5342/catalog/media');
  await page.evaluate(profile=>{document.documentElement.style.fontSize='200%';window.__mediaCatalog.rtl.set(true);window.__mediaCatalog.profile.set(profile);},profile);
  await expect(page.locator('main')).toHaveAttribute('dir','rtl');await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  await page.getByRole('button',{name:'画像ビューアーを開く'}).click();const dialog=page.locator('dialog:modal'),viewport=dialog.getByRole('region',{name:'画像表示領域'}),zoom=dialog.getByLabel('拡大率',{exact:true});
  await expect(dialog).toBeVisible();await expect.poll(()=>dialog.locator('ui-image img').evaluate(node=>node.naturalWidth)).toBeGreaterThan(0);
  await dialog.evaluate(node=>{
   const capture=(kind,event)=>{const viewport=node.querySelector('.ui-image-viewport'),image=node.querySelector('ui-image'),slider=node.querySelector('input[type=range]');return {kind,time:performance.now(),eventKey:event?.key,eventTarget:event?.target?.tagName,eventTargetClass:event?.target?.className,eventDefaultPrevented:event?.defaultPrevented,activeTag:document.activeElement?.tagName,activeClass:document.activeElement?.className,sliderValue:slider.value,status:node.querySelector('[role=status]').textContent,dialogDirection:getComputedStyle(node).direction,viewportFocused:document.activeElement===viewport,clientWidth:viewport.clientWidth,scrollWidth:viewport.scrollWidth,scrollLeft:viewport.scrollLeft,canvasStyle:node.querySelector('.ui-image-canvas').getAttribute('style'),imageStyle:image.getAttribute('style'),imageAlt:image.querySelector('img')?.alt};};
   window.__lightboxDiagnosis={events:[],capture};
   node.addEventListener('keydown',event=>window.__lightboxDiagnosis.events.push(capture('keydown-capture',event)),true);
   document.addEventListener('keydown',event=>{if(node.contains(event.target))window.__lightboxDiagnosis.events.push(capture('keydown-bubble',event));});
   node.addEventListener('click',event=>{if(event.target.closest('button')?.textContent.includes('表示をリセット'))window.__lightboxDiagnosis.events.push(capture('reset-click-capture',event));},true);
   document.addEventListener('click',event=>{if(node.contains(event.target)&&event.target.closest('button')?.textContent.includes('表示をリセット'))window.__lightboxDiagnosis.events.push(capture('reset-click-bubble',event));});
   const observer=new MutationObserver(()=>window.__lightboxDiagnosis.events.push(capture('dom-mutation')));observer.observe(node,{subtree:true,attributes:true,characterData:true,childList:true});
  });
  const samples=[];
  for(let repetition=0;repetition<4;repetition++){
   if(repetition){await dialog.getByRole('button',{name:'前の画像',exact:true}).click();await expect(dialog.getByRole('img',{name:'赤い写真'})).toBeVisible();}
   await zoom.focus();await page.keyboard.press('End');await expect(dialog.getByRole('status').first()).toContainText('400% · 0度');
   for(let i=0;i<3;i++){await dialog.getByRole('button',{name:'右へ90度回転',exact:true}).click();await expect(dialog.getByRole('status').first()).toContainText('400% · '+(i+1)*90+'度');}
   await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
   await viewport.evaluate(node=>{node.scrollLeft=node.scrollWidth;node.scrollTop=node.scrollHeight;});
   await page.evaluate(()=>window.__lightboxDiagnosis.events=[]);
   await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();
   if(guarded){await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);}
   await viewport.focus();await page.keyboard.press('ArrowLeft');
   await expect.poll(()=>zoom.inputValue()).toBe('100');
   await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   const after=await page.evaluate(()=>window.__lightboxDiagnosis.capture('after-native-key'));
   const events=await page.evaluate(()=>window.__lightboxDiagnosis.events);
   const observed=after.imageAlt==='青い写真';
   let recovery=null;
   if(!observed){await viewport.focus();await page.keyboard.press('ArrowLeft');await expect(dialog.getByRole('img',{name:'青い写真'})).toBeVisible();recovery=await page.evaluate(()=>window.__lightboxDiagnosis.capture('after-same-key-rendered'));
   }else await expect(dialog.getByRole('img',{name:'青い写真'})).toBeVisible();
   samples.push({repetition,guarded,observedBlueAfterFirstNativeKey:observed,after,events,recovery});
   await writeFile(destination+'/'+name+'.json',JSON.stringify(samples,null,2));
   if(guarded)expect(observed).toBe(true);
  }
  await dialog.screenshot({path:destination+'/'+name+'.png'});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.locator('#viewer-trigger')).toBeFocused();
  await context.tracing.stop({path:destination+'/'+name+'-trace.zip'});
  rows.push({name,rate,profile,guarded,samples});await writeFile(destination+'/observations.json',JSON.stringify(rows,null,2));
  console.log(name+': first-native-key blue '+samples.filter(item=>item.observedBlueAfterFirstNativeKey).length+'/'+samples.length);
  await context.close();
 }
}finally{await browser.close();}
await writeFile(destination+'/exit.json',JSON.stringify({exit:0,conditions:rows.length,guardedChecks:rows.filter(row=>row.guarded).reduce((n,row)=>n+row.samples.length,0),originalReproductions:rows.filter(row=>!row.guarded).reduce((n,row)=>n+row.samples.filter(x=>!x.observedBlueAfterFirstNativeKey).length,0),stress:'CPU rate6 applies only to isolated own page via public CDP; CPU1 is normal.'},null,2));
