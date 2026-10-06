import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const input=JSON.parse(await readFile('evidence/input-final.json','utf8')),build=JSON.parse(await readFile('evidence/build-results.json','utf8'));
assert.equal(createHash('sha256').update(await readFile('consumer.ts')).digest('hex'),build.consumerSourceSha256);
const browser=await chromium.launch({channel:'chromium'}),context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:5343/specialist');await expect(page.locator('h1')).toHaveCount(1);
 const preview=page.locator('main > ui-markdown-preview'),heading=preview.locator('h2');await expect(heading).toHaveText('提出の案内');
 await preview.screenshot({path:'evidence/specialist-harness-heading.png'});
 await writeFile('evidence/harness-heading-render.json',JSON.stringify({inputSha256:input.sha256,consumerSourceSha256:build.consumerSourceSha256,change:'Markdown sample # → ## only',documentH1Count:await page.locator('h1').count(),markdownHeading:await heading.evaluate(element=>({tag:element.tagName,text:element.textContent})),librarySourceChange:false},null,2)+'\n');
 console.log('Actual document h1 count1 / Markdown sample h2 verified.');
}finally{await context.close();await browser.close();}
