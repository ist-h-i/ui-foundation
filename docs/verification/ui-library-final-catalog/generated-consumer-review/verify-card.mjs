import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const input=JSON.parse(await readFile('evidence/input-final.json','utf8'));
const build=JSON.parse(await readFile('evidence/build-results.json','utf8'));
assert.equal(hash(await readFile('consumer.ts')),build.consumerSourceSha256);
assert.equal(hash(await readFile('.ui/generated/manifest.json')),build.generatedManifestSha256);
assert.equal(input.files['templates/angular/card.ts'],'916a650260fa1ca1269a48d95569813f215ced09ff8e81761bc2288f87fd5eb8');
const browser=await chromium.launch({channel:'chromium'}),results=[];
try{for(const profile of ['guided','dense']){
 const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),errors=[],warnings=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(['warning','error'].includes(message.type()))warnings.push(message.text());});
 const result={profile,errors,warnings,observations:[],pass:false};
 try{
  await page.goto('http://127.0.0.1:5343/card');await expect.poll(()=>page.evaluate(()=>!!window.consumer)).toBe(true);
  await page.evaluate(profile=>window.consumer.profile.set(profile),profile);
  const card=page.locator('ui-card'),note=card.getByRole('textbox',{name:'提出のメモ',exact:true}),native=await note.elementHandle();
  await note.fill('入力内容と選択位置を保持');await note.press('Home');await note.press('Shift+ArrowRight');await note.press('Shift+ArrowRight');
  const initialSelection=await note.evaluate(element=>({start:element.selectionStart,end:element.selectionEnd}));result.initialSelection=initialSelection;
  await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const direction of ['ltr','rtl']){
   const selection=await note.evaluate(element=>({start:element.selectionStart,end:element.selectionEnd}));
   await page.evaluate(direction=>window.consumer.locale.set({locale:'ja-JP',direction}),direction);
   await expect(page.locator('main')).toHaveAttribute('dir',direction);await expect(card.locator('[data-card-area]:visible')).toHaveCount(5);
   const bounds=await card.evaluate(node=>{
    const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};};
    return {card:rect(node),content:rect(node.querySelector('.ui-card__content')),input:rect(node.querySelector('input')),areas:[...node.querySelectorAll('[data-card-area]')].map(element=>({area:element.getAttribute('data-card-area'),...rect(element)})),documentWidth:document.documentElement.clientWidth,documentScrollWidth:document.documentElement.scrollWidth,gridColumns:getComputedStyle(node.querySelector('.ui-card__content')).gridTemplateColumns};
   });
   for(const r of [bounds.card,bounds.input,...bounds.areas]){assert.ok(r.left>=-1,JSON.stringify(r));assert.ok(r.right<=321,JSON.stringify(r));}
   for(const r of bounds.areas.filter(r=>r.area!=='header'))assert.ok(Math.abs(r.width-bounds.content.width)<=1,JSON.stringify(r));
   assert.ok(bounds.documentScrollWidth<=bounds.documentWidth+1);
   await expect(note).toBeFocused();assert.equal(await note.evaluate((element,previous)=>element===previous,native),true);await expect(note).toHaveValue('入力内容と選択位置を保持');const selectionAfterLocale=await note.evaluate(element=>({start:element.selectionStart,end:element.selectionEnd}));assert.deepEqual(selectionAfterLocale,selection);await expect(page.locator('#card-value')).toHaveText('入力内容と選択位置を保持');
   await note.click();await expect(note).toBeFocused();await note.press('End');await note.press('Shift+ArrowLeft');
   const analysis=await new AxeBuilder({page}).include('ui-card').analyze();assert.deepEqual(analysis.violations,[]);
   result.observations.push({direction,bounds,selectionBeforeLocale:selection,selectionAfterLocale,sameDom:true,nativePointerReachable:true,draftAndCvaRetained:true,keyboardSelection:true,violations:analysis.violations,incomplete:analysis.incomplete});
   await card.screenshot({path:'evidence/card-narrow-'+profile+'-'+direction+'.png'});
   await note.press('Home');await note.press('Shift+ArrowRight');await note.press('Shift+ArrowRight');
  }
  await card.locator('#card-action').click();await expect(page.locator('#card-actions')).toHaveText('1');
  await card.locator('#card-collapse').click();await expect(note).toBeHidden();const toggle=card.getByRole('button',{name:'展開: 提出内容',exact:true});await expect(toggle).toBeFocused();await toggle.press('Enter');await expect(note).toBeVisible();await expect(note).toHaveValue('入力内容と選択位置を保持');assert.equal(await note.evaluate((element,previous)=>element===previous,native),true);
  result.collapseFocusAndDraftRetained=true;assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);result.pass=true;
 }catch(error){result.failure=String(error);throw error;}finally{results.push(result);await context.close();}
}}finally{await browser.close();await writeFile('evidence/card-results.json',JSON.stringify({inputSha256:input.sha256,sourceSha256:input.files['templates/angular/card.ts'],consumerSourceSha256:build.consumerSourceSha256,generatedManifestSha256:build.generatedManifestSha256,results},null,2)+'\n');}
console.log(JSON.stringify({profiles:results.length,pass:results.every(result=>result.pass),geometryStates:results.reduce((sum,result)=>sum+result.observations.length,0)}));
