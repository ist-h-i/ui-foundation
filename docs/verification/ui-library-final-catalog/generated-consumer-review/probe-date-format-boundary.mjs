import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({channel:'chromium'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5343/foundation');
 const start=page.locator('#range input').first();await expect(start).toHaveValue('01/02/2026');await start.fill('31/02/2026');await start.focus();await start.evaluate(e=>e.setSelectionRange(2,5));await expect(page.locator('#range-status')).toHaveText('INVALID');
 const before=await page.evaluate(()=>({raw:document.querySelector('#range input').value,status:window.consumer.range.status,value:window.consumer.range.value}));
 await page.evaluate(()=>window.consumer.locale.set({locale:'en-US',timeZone:'UTC',dateInputFormat:'yyyy-MM-dd'}));
 await expect(start).toHaveAttribute('placeholder','yyyy-MM-dd');await expect(start).toHaveValue('2026-02-01');await expect(page.locator('#range-status')).toHaveText('VALID');
 const after=await page.evaluate(()=>({raw:document.querySelector('#range input').value,status:window.consumer.range.status,value:window.consumer.range.value,focused:document.activeElement===document.querySelector('#range input')}));
 const evidence={sourceSha256:createHash('sha256').update(await readFile('templates/angular/date-input.ts')).digest('hex'),before,after,observation:'Changing DI dateInputFormat discarded the invalid raw draft and cleared its Validator without explicit form reset or clear.',normativeVerdict:'Candidate P2; not a passing draft-retention test.'};
 await writeFile('evidence/date-format-draft-loss.json',JSON.stringify(evidence,null,2)+'\n');await page.screenshot({path:'evidence/date-format-draft-loss.png'});console.log(JSON.stringify(evidence));
}finally{await browser.close();}
