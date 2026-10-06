import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const phase=process.argv[2]??'initial';
const destination='/tmp/ui-foundation-media-gauge-independent-review/evidence/'+phase+'-live';
await mkdir(destination,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const findings=[];
try{
 for(const profile of ['guided','dense'])for(const narrow of [false,true]){
  const name=profile+(narrow?'-320-200-rtl':'-1280-ltr');
  const context=await browser.newContext({viewport:{width:narrow?320:1280,height:900}});
  const page=await context.newPage(),requests=[],errors=[];
  page.on('request',request=>requests.push({url:request.url(),resource:request.resourceType()}));
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   const counter={workers:0,bitmaps:0};window.__independentResources=counter;
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker{constructor(...args){super(...args);counter.workers++;}};
   const decode=window.createImageBitmap.bind(window);
   window.createImageBitmap=(...args)=>{counter.bitmaps++;return decode(...args);};
  });
  await page.goto('http://127.0.0.1:5342/catalog/media');
  await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();
  await expect(page.getByTestId('pdf').locator('canvas')).toBeVisible();
  await expect.poll(()=>page.getByTestId('audio').locator('audio').evaluate(node=>node.readyState)).toBeGreaterThan(0);
  if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided'}).click();
  if(narrow){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'RTL false'}).click();}
  const loadedStatus=await page.getByTestId('pdf').getByRole('status').innerText();
  await page.getByTestId('audio').getByRole('button',{name:'停止',exact:true}).click();
  const stoppedStatus=await page.getByTestId('audio').getByRole('status').innerText();
  await page.evaluate(()=>window.__mediaCatalog.switchDictionary(true));
  await expect(page.getByTestId('audio').getByRole('button',{name:'Stop',exact:true})).toBeVisible();
  const liveStatuses={pdfBefore:loadedStatus,pdfAfter:await page.getByTestId('pdf').getByRole('status').innerText(),audioBefore:stoppedStatus,audioAfter:await page.getByTestId('audio').getByRole('status').innerText()};
  await page.evaluate(()=>window.__mediaCatalog.switchDictionary(false));
  await expect(page.getByTestId('audio').getByRole('button',{name:'停止',exact:true})).toBeVisible();
  await page.getByTestId('pdf').getByRole('button',{name:'PDF表示対象を変更'}).click();
  await expect(page.getByTestId('pdf').locator('.ui-media-error')).toBeVisible();
  await page.evaluate(()=>{
   const app=window.__mediaCatalog;
   app.compareAfter.set({id:'missing',src:'/assets/media/missing-compare.png',alt:'Original after'});
   app.audioSrc.set('/assets/media/missing-audio.wav');app.barcodeCode.set('');
  });
  await page.getByTestId('codes').getByLabel('コード内容').fill('');
  await page.getByTestId('crop').getByLabel('切抜くファイル').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from([1,2,3,4])});
  for(const [id,selector] of [['compare','ui-image-compare .ui-media-error'],['audio','ui-audio-player .ui-media-error'],['crop','ui-image-cropper .ui-media-error'],['codes','ui-qr-code .ui-media-error'],['codes','ui-barcode .ui-media-error']])await expect(page.getByTestId(id).locator(selector)).toBeVisible();
  await expect.poll(()=>page.getByTestId('audio').locator('audio').evaluate(node=>node.readyState)).toBe(0);
  await page.getByTestId('audio').getByRole('button',{name:'停止',exact:true}).click();
  const slider=page.getByTestId('compare').getByRole('slider');
  await slider.focus();await page.keyboard.press('Home');
  const increment=await slider.evaluate(node=>getComputedStyle(node).direction==='rtl'?'ArrowLeft':'ArrowRight');
  for(let i=0;i<67;i++)await page.keyboard.press(increment);
  await expect(slider).toHaveValue('67');
  const state=async()=>({
   compare:await slider.getAttribute('aria-valuetext'),
   compareError:await page.getByTestId('compare').locator('ui-image-compare .ui-media-error').innerText(),
   pdf:await page.getByTestId('pdf').locator('ui-pdf-viewer .ui-media-error').innerText(),
   audio:await page.getByTestId('audio').locator('ui-audio-player .ui-media-error').innerText(),
   audioStatus:await page.getByTestId('audio').getByRole('status').innerText(),
   crop:await page.getByTestId('crop').locator('ui-image-cropper .ui-media-error').innerText(),
   qr:await page.getByTestId('codes').locator('ui-qr-code .ui-media-error').innerText(),
   barcode:await page.getByTestId('codes').locator('ui-barcode .ui-media-error').innerText(),
   resources:await page.evaluate(()=>({...window.__independentResources})),
   value:await slider.inputValue(),focused:await slider.evaluate(node=>node===document.activeElement),
   scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth),
   galleryRole:await page.locator('ui-gallery').getAttribute('aria-roledescription'),
   slideRole:await page.locator('ui-gallery [role=group]').first().getAttribute('aria-roledescription'),
   applicationAlt:await page.getByTestId('compare').locator('img').last().getAttribute('alt')
  });
  const before=await state();const requestStart=requests.length;
  await page.evaluate(()=>{window.__independentSlider=document.activeElement;window.__mediaCatalog.switchDictionary(true);});
  await expect(page.getByTestId('compare').getByRole('slider',{name:'Comparison boundary'})).toBeVisible();
  await page.waitForTimeout(200);
  const after=await state();
  const afterSwitchRequests=requests.slice(requestStart);
  const expected={compare:'After image 67% shown',compareError:'After image unavailable.',pdf:'PDF unavailable. Check source, worker and assets; retry.',audio:'Media unavailable. Check source and format; retry.',audioStatus:'Stopped.',crop:'Image unavailable. Check format and reselect.',qr:'QR unavailable. Check content and size.',barcode:'Barcode unavailable. Check format, digits and size.',galleryRole:'carousel',slideRole:'slide',applicationAlt:'Original after'};
  const failures=Object.entries(expected).filter(([key,value])=>after[key]!==value).map(([key,value])=>({key,expected:value,actual:after[key]}));
  if(!liveStatuses.pdfAfter.includes('Page displayed.'))failures.push({key:'loadedPdfStatus',expected:'Page displayed.',actual:liveStatuses.pdfAfter});
  if(after.value!==before.value||!after.focused)failures.push({key:'preservation',before,after});
  if(afterSwitchRequests.length||JSON.stringify(before.resources)!==JSON.stringify(after.resources))failures.push({key:'resourceReacquisition',afterSwitchRequests,before:before.resources,after:after.resources});
  const axe=await new AxeBuilder({page}).include('main').analyze();
  await writeFile(destination+'/'+name+'-axe.json',JSON.stringify(axe,null,2));
  await writeFile(destination+'/'+name+'-ax.txt',await page.locator('main').ariaSnapshot());
  await page.screenshot({path:destination+'/'+name+'.png',fullPage:true});
  await page.getByTestId('compare').screenshot({path:destination+'/'+name+'-compare.png'});
  await page.getByTestId('pdf').screenshot({path:destination+'/'+name+'-pdf.png'});
  const result={name,profile,narrow,before,after,expected,liveStatuses,failures,afterSwitchRequests,domRetained:await slider.evaluate(node=>node===window.__independentSlider),pageErrors:errors,axe:{violations:axe.violations.map(({id,nodes})=>({id,nodes:nodes.map(node=>node.target)})),incomplete:axe.incomplete.map(({id,nodes})=>({id,nodes:nodes.map(node=>node.target)}))}};
  findings.push(result);await writeFile(destination+'/observations.json',JSON.stringify(findings,null,2));
  console.log(name+': translation failures='+failures.length+'; reacquisition='+afterSwitchRequests.length+'; axe violations='+axe.violations.length+' incomplete='+axe.incomplete.length);
  await context.close();
 }
}finally{await browser.close();}
const exit=findings.some(item=>item.failures.length||item.pageErrors.length||item.axe.violations.length)?1:0;
const sourceGuard=[];
for(const name of ['file-upload.ts','image-media.ts','image-cropper.ts','crop-adapter.ts','pdf-viewer.ts','pdf-adapter.ts','media-player.ts','media-model.ts','media-style.ts','media-dom.ts','barcode.ts','locale.ts','index.ts'])sourceGuard.push({path:'templates/angular/'+name,sha256:createHash('sha256').update(await readFile('templates/angular/'+name)).digest('hex')});
await writeFile(destination+'/exit.json',JSON.stringify({exit,conditions:findings.length,initialBaseFreezeSHA256:createHash('sha256').update(await readFile('/tmp/ui-foundation-media-gauge-independent-review/initial-source-freeze.json')).digest('hex'),sourceGuard},null,2));
process.exitCode=exit;
