import {test,expect} from './catalog-test';
import {openSpecialistCatalog,profiles} from './specialist-test-helpers';
import {observeNativeSheetWorkers,nativeSheetEvents,attachNativeSheetEvidence,liveNativeSheetWorkerTargets} from './sheet-native-test-helpers';

test.use({reducedMotion:'reduce'});
const workerPath='**/assets/sheet-formula.worker.js';
async function openSheet(page:import('@playwright/test').Page,profile:'guided'|'dense'){
 await openSpecialistCatalog(page,profile);await page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Spreadsheet',exact:true}).click();await expect(page.locator('#sheet')).toBeVisible();
}
const cellA=(page:import('@playwright/test').Page)=>page.locator('[data-sheet-cell="0,0"]');
const cellC=(page:import('@playwright/test').Page)=>page.locator('[data-sheet-cell="0,2"]');
const status=(page:import('@playwright/test').Page)=>page.locator('#sheet ui-spreadsheet p[role=status]').first();
const retry=(page:import('@playwright/test').Page)=>page.getByRole('button',{name:'数式の計算を再試行',exact:true});
for(const profile of profiles){
 test(profile+': real split formula worker cold-start fetch above 2.5s succeeds after readiness',async({page,context},info)=>{
  const closed=await observeNativeSheetWorkers(page);let delayMs=0;
  await context.route(workerPath,async route=>{const started=performance.now();await new Promise(resolve=>setTimeout(resolve,2750));delayMs=performance.now()-started;await route.continue();});
  await openSheet(page,profile);await expect(cellC(page)).toHaveValue('5');await expect(status(page)).toHaveText('計算済み');
  const events=await nativeSheetEvents(page),construct=events.find(event=>event.kind==='construct')!,ready=events.find(event=>event.kind==='message'&&(event.data as any)?.type==='sheet-ready')!,post=events.find(event=>event.kind==='post')!,result=events.find(event=>event.kind==='message'&&Array.isArray((event.data as any)?.results))!;
  expect(delayMs).toBeGreaterThanOrEqual(2500);expect(ready.at-construct.at).toBeGreaterThan(2500);expect(post.at).toBeGreaterThanOrEqual(ready.at);expect(result.at-ready.at).toBeLessThan(2000);expect((result.data as any).results[0][2].value).toBe(5);
  await expect.poll(async()=>(await liveNativeSheetWorkerTargets(page)).length).toBe(0);expect(events.some(event=>event.kind==='terminate')).toBe(true);await attachNativeSheetEvidence(page,info,{profile,delayMs,closed,readyAfterMs:ready.at-construct.at,calculationMs:result.at-ready.at});
 });
 test(profile+': real worker without readiness fails within startup bound; retry keeps raw formula and unaccepted editor',async({page,context},info)=>{
  const closed=await observeNativeSheetWorkers(page);await context.route(workerPath,route=>route.fulfill({status:200,contentType:'text/javascript',body:"addEventListener('message',()=>{});"}));
  await openSheet(page,profile);const a=cellA(page);await a.press('Enter');await a.fill('88');
  await expect(status(page)).toContainText('計算の準備が時間内に終わりませんでした',{timeout:12_000});await expect(a).toHaveValue('88');await expect(cellC(page)).toHaveValue('=SUM(A1:B1)');
  const failed=await nativeSheetEvents(page),start=failed.find(event=>event.kind==='construct')!,end=failed.find(event=>event.kind==='terminate')!;expect(end.at-start.at).toBeGreaterThanOrEqual(9900);expect(end.at-start.at).toBeLessThan(12_000);expect(failed.filter(event=>event.kind==='post')).toHaveLength(0);await expect.poll(async()=>(await liveNativeSheetWorkerTargets(page)).length).toBe(0);
  await context.unroute(workerPath);await retry(page).click();await expect(cellC(page)).toHaveValue('5');await expect(status(page)).toHaveText('計算済み');await expect(a).toHaveValue('88');await expect(retry(page)).toBeDisabled();
  await page.getByRole('button',{name:'CSVを書き出す',exact:true}).click();await expect(page.getByLabel('書き出した内容')).toHaveValue(/^"2","3","=SUM\(A1:B1\)"/);await a.press('Enter');await expect(a).toHaveValue('88');await a.press('Escape');await expect(a).toHaveValue('2');await attachNativeSheetEvidence(page,info,{profile,closed,startupFailureMs:end.at-start.at,draftBeforeCancel:'88',sourceAfterCancel:'2'});
 });
 test(profile+': real worker stalls after readiness and calculation is bounded separately; explicit retry succeeds',async({page,context},info)=>{
  const closed=await observeNativeSheetWorkers(page);await context.route(workerPath,route=>route.fulfill({status:200,contentType:'text/javascript',body:"addEventListener('message',()=>{while(true){}});postMessage({type:'sheet-ready',version:1});"}));
  await openSheet(page,profile);await expect(status(page)).toContainText('計算が時間内に終わりませんでした');await expect(cellC(page)).toHaveValue('=SUM(A1:B1)');const failed=await nativeSheetEvents(page),ready=failed.find(event=>event.kind==='message'&&(event.data as any)?.type==='sheet-ready')!,end=failed.find(event=>event.kind==='terminate')!;expect(end.at-ready.at).toBeGreaterThanOrEqual(1900);expect(end.at-ready.at).toBeLessThan(4000);expect(failed.filter(event=>event.kind==='post')).toHaveLength(1);await expect.poll(async()=>(await liveNativeSheetWorkerTargets(page)).length).toBe(0);
  await context.unroute(workerPath);await retry(page).click();await expect(cellC(page)).toHaveValue('5');await expect(status(page)).toHaveText('計算済み');await attachNativeSheetEvidence(page,info,{profile,closed,calculationFailureMs:end.at-ready.at});
 });
 test(profile+': real worker script error remains a failure and terminates; retry preserves draft and source',async({page,context},info)=>{
  const closed=await observeNativeSheetWorkers(page);await context.route(workerPath,route=>route.fulfill({status:200,contentType:'text/javascript',body:"throw new Error('intentional owned sheet worker fault');"}));await openSheet(page,profile);
  await expect(status(page)).toContainText('数式の計算を開始できませんでした');await expect(cellC(page)).toHaveValue('=SUM(A1:B1)');const a=cellA(page);await a.press('Enter');await a.fill('88');const failed=await nativeSheetEvents(page);expect(failed.some(event=>event.kind==='error')).toBe(true);expect(failed.filter(event=>event.kind==='terminate')).toHaveLength(1);await expect.poll(async()=>(await liveNativeSheetWorkerTargets(page)).length).toBe(0);
  await context.unroute(workerPath);await retry(page).click();await expect(cellC(page)).toHaveValue('5');await expect(a).toHaveValue('88');await a.press('Enter');await a.press('Escape');await expect(a).toHaveValue('2');await attachNativeSheetEvidence(page,info,{profile,closed,scriptErrorObserved:true});
 });
 test(profile+': a held actual native parser reply is rejected after a newer sheet request',async({page},info)=>{
  const closed=await observeNativeSheetWorkers(page,true);await openSheet(page,profile);await expect.poll(async()=>{const events=await nativeSheetEvents(page);return events.some(event=>event.kind==='held-native-reply');}).toBe(true);
  const a=cellA(page);await a.press('Enter');await a.fill('4');await a.press('Enter');await expect(cellC(page)).toHaveValue('7');await expect.poll(async()=>{const events=await nativeSheetEvents(page);return events.some(event=>event.kind==='delivered-held-native-reply');}).toBe(true);await expect(cellC(page)).toHaveValue('7');
  const events=await nativeSheetEvents(page),held=events.find(event=>event.kind==='held-native-reply')!,delivered=events.find(event=>event.kind==='delivered-held-native-reply')!;expect((held.data as any).results[0][2].value).toBe(5);expect(events.some(event=>event.id===held.id&&event.kind==='terminate'&&event.at<delivered.at)).toBe(true);await expect.poll(async()=>(await liveNativeSheetWorkerTargets(page)).length).toBe(0);await attachNativeSheetEvidence(page,info,{profile,closed,actualHeldValue:5,retainedNewValue:7,deliveryControl:'only timing of an actual native result; no synthetic success payload'});
 });
}
