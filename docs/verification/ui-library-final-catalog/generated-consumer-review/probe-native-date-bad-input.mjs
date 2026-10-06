import {chromium,expect} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chromium'});
const observations=[];
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5343/foundation');const start=page.locator('#range input').first();
 await page.evaluate(()=>window.consumer.locale.set({locale:'en-US',dateInputFormat:'native'}));await expect(start).toHaveAttribute('type','date');
 for(const keys of [['Home','Backspace'],['ArrowLeft','Backspace'],['ArrowLeft','ArrowLeft','Backspace'],['ControlOrMeta+A','Backspace','1']]){
  await page.evaluate(()=>window.consumer.range.reset({start:'2026-02-01',end:'2026-02-07'}));await start.focus();for(const key of keys)await start.press(key);
  const before=await start.evaluate(e=>({value:e.value,badInput:e.validity.badInput,type:e.type,status:window.consumer.range.status,model:window.consumer.range.value}));
  observations.push({keys,before});
  if(before.badInput){
   const handle=await start.elementHandle();await page.evaluate(()=>window.consumer.locale.set({locale:'ja-JP',dateInputFormat:'dd/MM/yyyy'}));
   await expect(start).toHaveAttribute('type','date');await expect(page.locator('#range-status')).toHaveText('INVALID');await expect(start).toBeFocused();
   assert.equal(await start.evaluate((e,old)=>e===old,handle),true);assert.equal(await start.evaluate(e=>e.validity.badInput),true);assert.deepEqual(await page.evaluate(()=>window.consumer.range.value),before.model);
   const retained=await start.evaluate(e=>({value:e.value,badInput:e.validity.badInput,type:e.type,status:window.consumer.range.status,model:window.consumer.range.value}));
   await page.screenshot({path:'evidence/date-native-bad-input-retained.png'});
   await page.locator('#range ui-date-picker').first().getByRole('button',{name:'申請期間の開始日をクリア',exact:true}).click();await expect(start).toHaveAttribute('type','text');await expect(start).toHaveValue('');assert.equal(await page.evaluate(()=>!!window.consumer.range.errors?.dateRangeDraft),false);
   observations.at(-1).retained=retained;observations.at(-1).clearAdoptsConfiguredFormat=true;break;
  }
 }
 assert.ok(observations.some(x=>x.retained),'actual native keyboard partial date must be observed, without faking validity');
 const result={sourceSha256:createHash('sha256').update(await readFile('templates/angular/date-input.ts')).digest('hex'),observations,actualNativeBadInputObserved:true};await writeFile('evidence/date-native-bad-input.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
