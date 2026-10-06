import {test,expect} from './catalog-test';
import {profiles,openSpecialistCatalog,openSpecialistSurface,specialistWorkerUrls} from './specialist-test-helpers';

test.use({reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
for(const profile of profiles){
 test(profile+': explicit public MapLibre worker URL, shared ESM MIME and actual canvas consumer',async({page},info)=>{
  const requests:string[]=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Map');
  const origin=new URL(page.url()).origin,workerPath='/assets/maplibre/maplibre-gl-worker.mjs',sharedPath='/assets/maplibre/maplibre-gl-shared.mjs';
  await expect.poll(()=>specialistWorkerUrls(page).includes(origin+workerPath)).toBe(true);
  const workerResponse=await page.request.get(workerPath),sharedResponse=await page.request.get(sharedPath);
  expect(workerResponse.status()).toBe(200);expect(sharedResponse.status()).toBe(200);
  expect(workerResponse.headers()['content-type']).toMatch(/(?:text|application)\/(?:javascript|ecmascript)/i);
  expect(sharedResponse.headers()['content-type']).toMatch(/(?:text|application)\/(?:javascript|ecmascript)/i);
  expect(await workerResponse.text()).toContain('./maplibre-gl-shared.mjs');
  expect(requests).not.toContain('/maplibre-gl-worker.mjs');
  await page.locator('#map ui-map').getByRole('button',{name:'東京',exact:true}).last().press('Space');await expect(page.locator('[data-map-selection]')).toHaveText('tokyo');
  await page.getByRole('button',{name:'対象区域の領域',exact:true}).press('Space');await expect(page.locator('[data-map-selection]')).toHaveText('area');
  await page.locator('#map').getByRole('button',{name:'拡大',exact:true}).press('Enter');await expect(page.locator('#map output').first()).toHaveText('拡大率 12');
  await info.attach('public-worker-observation',{body:JSON.stringify({profile,workerUrls:specialistWorkerUrls(page),workerPath,sharedPath,workerMime:workerResponse.headers()['content-type'],sharedMime:sharedResponse.headers()['content-type'],selected:'area',zoom:12}),contentType:'application/json'});
  await info.attach('map-canvas',{body:await page.locator('#map canvas').screenshot(),contentType:'image/png'});
 });
 test(profile+': missing formula worker preserves original CSV/cells and recovers with real recalculation',async({context},info)=>{
  const broken=await context.newPage(),pageErrors:string[]=[],consoleErrors:string[]=[],failedRequests:string[]=[];
  broken.on('pageerror',error=>pageErrors.push(error.message));broken.on('console',message=>{if(message.type()==='error'||message.type()==='warning')consoleErrors.push(message.type()+': '+message.text());});
  broken.on('requestfailed',request=>failedRequests.push(new URL(request.url()).pathname));
  try{
   await broken.route('**/assets/sheet-formula.worker.js',route=>route.abort('failed'));
   await openSpecialistCatalog(broken,profile);await broken.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Spreadsheet',exact:true}).click();
   await expect(broken.locator('#sheet')).toBeVisible();await expect(broken.locator('#sheet')).toContainText('数式の計算を開始できませんでした');
   await expect(broken.locator('[data-sheet-cell="0,2"]')).toHaveValue('=SUM(A1:B1)');await expect(broken.locator('[data-sheet-cell="0,0"]')).toHaveValue('2');
   await broken.getByRole('button',{name:'CSVを書き出す',exact:true}).click();await expect(broken.getByLabel('書き出した内容')).toHaveValue(/=SUM\(A1:B1\)/);
   await broken.unroute('**/assets/sheet-formula.worker.js');const a=broken.locator('[data-sheet-cell="0,0"]');await a.press('Enter');await a.fill('3');await a.press('Enter');
   await expect(broken.locator('[data-sheet-cell="0,2"]')).toHaveValue('6');
   expect(failedRequests).toContain('/assets/sheet-formula.worker.js');expect(pageErrors).toEqual([]);
   const unexpected=consoleErrors.filter(message=>!/^error: Failed to load resource: net::ERR_FAILED(?:\s|$)/.test(message));
   expect(unexpected,'only the deliberately aborted worker network error is allowed').toEqual([]);
   await info.attach('formula-worker-failure-and-recovery',{body:JSON.stringify({profile,failedRequests,pageErrors,consoleErrors,rawFormulaPreserved:true,recalculated:6}),contentType:'application/json'});
  }finally{await broken.close();}
 });
}
