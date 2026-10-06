import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const buildProof=JSON.parse(await readFile('evidence/build-results.json','utf8')),cliProof=JSON.parse(await readFile('evidence/final-cli-results.json','utf8'));assert.equal(buildProof.consumerSourceSha256,createHash('sha256').update(await readFile('consumer.ts')).digest('hex'));assert.equal(buildProof.generatedManifestSha256,cliProof.generatedManifestSha);
const browser=await chromium.launch({channel:'chromium'}),results=[];
const messages=prefix=>({
 '比較前の画像を取得できません。':prefix+'Compare load failed',
 '比較後の画像を取得できません。':prefix+'Compare after failed',
 '比較後の画像を':prefix+'After ','%表示':'% shown',
 '比較後の画像を50%表示':prefix+'After 50%',
 '比較後の画像を{value}%表示':prefix+'After {value}%',
 '比較後の画像を{position}%表示':prefix+'After {position}%',
 'メディアを取得できません。表示対象と形式を確認して再試行してください。':prefix+'Media load failed',
 'メディアを再取得':prefix+'Media retry',
 '一時停止または停止中':prefix+'Media paused',
 'PDFを読み込めません。表示対象とworker・補助ファイルの配信設定を確認して再試行してください。':prefix+'PDF load failed',
 'PDFを再取得':prefix+'PDF retry',
 'PDFを選択してください。':prefix+'Choose PDF',
 '画像を読み込めません。形式とデータを確認して選び直してください。':prefix+'Crop load failed',
 '画像を選択してください。':prefix+'Choose image',
 'この形式・内容・サイズではバーコードを作成できません。形式の桁数とサイズを確認してください。':prefix+'Barcode generation failed',
 // These are app labels; dictionary entries must not replace them.
 '音声説明':prefix+'Must not translate app audio label','申請番号':prefix+'Must not translate app barcode label','写真切抜き':prefix+'Must not translate app crop label',
});
try{for(const profile of ['guided','dense']){
 const context=await browser.newContext({viewport:{width:1100,height:1000}}),page=await context.newPage();const errors=[],warnings=[],resources=[],workers=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push({type:m.type(),text:m.text()});});page.on('request',r=>resources.push(r.url()));page.on('worker',w=>workers.push(w.url()));
 const result={profile,checks:[],errors,warnings};
 try{
  await page.goto('http://127.0.0.1:5343/media');await expect.poll(()=>page.evaluate(()=>!!window.consumer)).toBe(true);await page.evaluate(profile=>document.documentElement.setAttribute('data-ui-profile',profile),profile);
  const pdf=page.locator('#pdf'),audio=page.locator('ui-audio-player'),compare=page.locator('ui-image-compare'),crop=page.locator('ui-image-cropper'),barcode=page.locator('ui-barcode'),picker=page.locator('#upload input[type=file]');
  await expect(pdf.locator('canvas')).toBeVisible({timeout:20000});await expect.poll(()=>barcode.locator('canvas').evaluate(e=>e.width)).toBe(320);await expect.poll(()=>page.locator('ui-qr-code canvas').evaluate(e=>e.width)).toBe(256);
  await page.setViewportSize({width:320,height:1000});const codeViewport=barcode.locator('.ui-media-code-viewport');await expect(codeViewport).toHaveAttribute('role','region');await expect(codeViewport).toHaveAttribute('aria-label','申請番号');await expect(codeViewport).toHaveAttribute('tabindex','0');
  const barcodeGeometry=await barcode.evaluate(e=>{const viewport=e.querySelector('.ui-media-code-viewport'),canvas=e.querySelector('canvas');return {viewportWidth:viewport.clientWidth,scrollWidth:viewport.scrollWidth,canvasWidth:canvas.width,paintWidth:canvas.getBoundingClientRect().width,canvasMaxInlineSize:getComputedStyle(canvas).maxInlineSize,regionDirection:getComputedStyle(viewport).direction,documentWidth:document.documentElement.clientWidth,documentScrollWidth:document.documentElement.scrollWidth};});
  assert.ok(barcodeGeometry.scrollWidth>barcodeGeometry.viewportWidth);assert.equal(barcodeGeometry.paintWidth,barcodeGeometry.canvasWidth);assert.equal(barcodeGeometry.canvasMaxInlineSize,'none');assert.equal(barcodeGeometry.regionDirection,'ltr');assert.ok(barcodeGeometry.documentScrollWidth<=barcodeGeometry.documentWidth+1);
  await codeViewport.focus();await codeViewport.press('ArrowRight');await expect.poll(()=>codeViewport.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);await expect(codeViewport).toBeFocused();result.checks.push({component:'barcode real narrow intrinsic canvas and named keyboard scroll region',prefix:'native ',actual:barcodeGeometry,pass:true});await barcode.screenshot({path:'evidence/barcode-native-narrow-'+profile+'.png'});
  await page.setViewportSize({width:1100,height:1000});await picker.setInputFiles({name:'keep.txt',mimeType:'text/plain',buffer:Buffer.from('one')});
  const handles={pdf:await pdf.locator('canvas').elementHandle(),audio:await audio.locator('audio').elementHandle(),compare:await compare.locator('input').elementHandle(),crop:await crop.locator('canvas').elementHandle(),barcode:await barcode.locator('canvas').elementHandle(),picker:await picker.elementHandle()};
  await page.evaluate(()=>{const a=window.consumer;a.compareBefore.set({...a.images[0],src:'/assets/media/invalid-image.dat'});a.cropFile.set(new File(['not a PNG'],'invalid.png',{type:'image/png'}));a.audioSource.set('/assets/media/invalid-audio.dat');a.pdfSource.set('/assets/media/invalid.pdf');a.barcodeFormat.set('EAN13');a.barcodeValue.set('invalid');});
  const targets=[['compare',compare.locator('.ui-media-error'),'Compare load failed'],['audio',audio.locator('.ui-media-error'),'Media load failed'],['pdf',pdf.locator('.ui-media-error'),'PDF load failed'],['crop',crop.locator('.ui-media-error'),'Crop load failed'],['barcode',barcode.locator('.ui-media-error'),'Barcode generation failed']];
  for(const [,target]of targets)await expect(target).toBeVisible({timeout:20000});
  const before=Object.fromEntries(await Promise.all(targets.map(async([name,target])=>[name,await target.innerText()])));await compare.locator('input').focus();const resourceCount=resources.length,workerCount=workers.length;
  const observations=[];
  for(const prefix of ['D1 ','D2 ']){
   await page.evaluate(messages=>window.consumer.locale.set({locale:'tr-TR',direction:'rtl',messages}),messages(prefix));
   await expect(page.locator('main')).toHaveAttribute('lang','tr-TR');await expect(page.locator('main')).toHaveAttribute('dir','rtl');
   // Wait for an existing pure UI message to change before inspecting retained diagnostics.
   await expect(pdf.locator('.ui-media-error + button')).toHaveText(prefix+'PDF retry');
   const text=Object.fromEntries(await Promise.all(targets.map(async([name,target])=>[name,await target.innerText()])));
   for(const [name,,expected]of targets)result.checks.push({component:name,prefix,expected:prefix+expected,actual:text[name],pass:text[name]===prefix+expected});
   const aria=await compare.locator('input').getAttribute('aria-valuetext');result.checks.push({component:'compare aria-valuetext',prefix,actual:aria,pass:aria?.includes(prefix)&&aria.includes('50')});
   await expect(compare.locator('input')).toBeFocused();observations.push({prefix,text,aria,resourcesAfterLocale:resources.length,workersAfterLocale:workers.length,focusedRangeRetained:true});
   if(prefix==='D2 '){await pdf.screenshot({path:'evidence/media-locale-pdf-'+profile+'.png'});await audio.screenshot({path:'evidence/media-locale-audio-'+profile+'.png'});await barcode.screenshot({path:'evidence/media-locale-barcode-'+profile+'.png'});}
  }
  const range=compare.locator('input');await expect(range).toHaveAttribute('dir','ltr');assert.equal(await range.evaluate(e=>getComputedStyle(e).direction),'ltr');assert.equal(await compare.locator('label').evaluate(e=>getComputedStyle(e).direction),'rtl');
  await range.press('ArrowRight');await expect(range).toHaveValue('51');await expect(compare.locator('.ui-image-compare-line')).toHaveCSS('left',/px$/);assert.equal(await compare.locator('.ui-image-compare-line').evaluate(e=>e.style.left),'51%');assert.equal(await compare.locator('img').last().evaluate(e=>e.style.clipPath),'inset(0px 49% 0px 0px)');
  result.checks.push({component:'compare native physical ArrowRight',prefix:'D2 ',actual:'range51 / line left51% / crop49%',pass:true});
  await range.press('ArrowLeft');await expect(range).toHaveValue('50');await expect(range).toHaveAttribute('aria-valuetext','D2 After 50%');result.checks.push({component:'compare native physical ArrowLeft and localized ARIA',prefix:'D2 ',actual:'range50 / D2 After 50%',pass:true});await compare.screenshot({path:'evidence/media-locale-compare-physical-'+profile+'.png'});
  for(const [name,selector]of [['pdf','#pdf canvas'],['audio','ui-audio-player audio'],['compare','ui-image-compare input'],['crop','ui-image-cropper canvas'],['barcode','ui-barcode canvas'],['picker','#upload input[type=file]']])assert.equal(await page.locator(selector).evaluate((e,old)=>e===old,handles[name]),true,name+' DOM retained');
  assert.equal(resources.length,resourceCount,'locale change must not repeat network acquisition');assert.equal(workers.length,workerCount,'locale change must not create a new PDF worker');
  await expect(page.locator('#file-value')).toHaveText('keep.txt');await expect(page.locator('#file-status')).toHaveText('VALID');await expect(audio.locator('p').first()).toHaveText('音声説明');await expect(barcode.locator('figcaption')).toHaveText('申請番号');await expect(crop.locator('p').first()).toHaveText('写真切抜き');
  // Establish real empty/paused states under one dictionary, then change only the dictionary.
  await page.evaluate(()=>{const a=window.consumer;a.pdfSource.set(null);a.cropFile.set(null);a.audioSource.set('/assets/media/tone.wav?locale-recovery');});
  await expect(pdf.getByRole('status')).toContainText('D2 Choose PDF');await expect(crop.locator('.ui-crop-status')).toContainText('D2 Choose image');await expect(audio.getByRole('status')).toHaveText('D2 Media paused');
  const statusResourceCount=resources.length,statusWorkerCount=workers.length;
  await page.evaluate(messages=>window.consumer.locale.set({locale:'de-DE',direction:'ltr',messages}),messages('D3 '));await expect(page.locator('main')).toHaveAttribute('lang','de-DE');
  const states=[['pdf empty status',pdf.getByRole('status'),'D3 Choose PDF'],['crop empty status',crop.locator('.ui-crop-status'),'D3 Choose image'],['media paused status',audio.getByRole('status'),'D3 Media paused']];
  for(const [component,target,expected]of states){const actual=await target.innerText();result.checks.push({component,prefix:'D3 ',expected,actual,pass:actual.includes(expected)});}
  assert.equal(resources.length,statusResourceCount,'dictionary-only status change must not reload assets');assert.equal(workers.length,statusWorkerCount,'dictionary-only status change must not restart worker');
  // Real replacement image acquisition checks whether the existing error describes the current source.
  await page.evaluate(()=>window.consumer.compareBefore.set(window.consumer.images[0]));await expect.poll(()=>compare.locator('img').first().evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
  result.compareRecovery={nativeImageDecoded:true,currentSource:await compare.locator('img').first().getAttribute('src'),errorText:await compare.locator('.ui-media-error').allTextContents()};
  result.before=before;result.observations=observations;result.sameDom=true;result.noReload=true;result.fileCvaRetained=true;result.appLabelsRetained=true;result.resources=resources;result.workers=workers;
  await page.screenshot({path:'evidence/media-locale-'+profile+'.png',fullPage:true});assert.deepEqual(errors,[]);
  result.pass=result.checks.every(x=>x.pass);
 }catch(error){result.pass=false;result.error=String(error);result.stack=error.stack;await page.screenshot({path:'evidence/media-locale-failure-'+profile+'.png'});}finally{results.push(result);await context.close();console.log(JSON.stringify({profile,pass:result.pass,failed:result.checks.filter(x=>!x.pass).map(x=>x.component),error:result.error}));}
}}finally{await browser.close();const input=JSON.parse(await readFile('evidence/input-final.json','utf8'));const sources={};for(const path of ['image-media.ts','media-player.ts','pdf-viewer.ts','image-cropper.ts','barcode.ts'])sources[path]=createHash('sha256').update(await readFile('templates/angular/'+path)).digest('hex');await writeFile('evidence/media-locale-results.json',JSON.stringify({inputSha256:input.sha256,sources,results},null,2)+'\n');}
process.exitCode=results.every(x=>x.pass)?0:1;
