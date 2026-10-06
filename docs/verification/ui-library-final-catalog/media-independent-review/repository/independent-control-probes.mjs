import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const phase=process.argv[2]??'final';
const destination='/tmp/ui-foundation-media-gauge-independent-review/evidence/independent-controls-'+phase;
await mkdir(destination,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),observations=[];
const file=(name,size=8)=>({name,mimeType:'text/plain',buffer:Buffer.alloc(size,65)});
const decode=async(page,selector,format)=>page.locator(selector).evaluate((canvas,format)=>{try{return window.__mediaDecodeCanvas(canvas,format);}catch(error){return {error:String(error)};}},format);
const renderedDecode=async(page,selector,format,path)=>{
 const png=await page.locator(selector).screenshot({path});
 return page.evaluate(async({encoded,format})=>{const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(encoded),character=>character.charCodeAt(0))],{type:'image/png'}));const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();try{return {decoded:window.__mediaDecodeCanvas(canvas,format),width:canvas.width,height:canvas.height};}catch(error){return {error:String(error),width:canvas.width,height:canvas.height};}},{encoded:png.toString('base64'),format});
};
try{
 for(const profile of ['guided','dense'])for(const narrow of [false,true]){
  const name=profile+(narrow?'-320-200-rtl':'-1280-ltr');
  const progress={name};const checkpoint=async(key,value)=>{progress[key]=value;await writeFile(destination+'/'+name+'-progress.json',JSON.stringify(progress,null,2));};
  const page=await browser.newPage({viewport:{width:narrow?320:1280,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5342/catalog/media');await expect(page.getByTestId('pdf').locator('canvas')).toBeVisible();
  if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided'}).click();
  if(narrow){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'RTL false'}).click();}
  const app=page.getByTestId('independent'),dropzone=app.locator('ui-dropzone'),picker=dropzone.getByLabel('Independent accepted draft',{exact:true});
  const chooserPromise=page.waitForEvent('filechooser');await dropzone.getByRole('button',{name:'ファイルを選択'}).click();await (await chooserPromise).setFiles(file('committed.txt'));
  await expect(app.getByTestId('draft-names')).toHaveText('committed.txt');
  await page.evaluate(()=>{const app=window.__mediaCatalog;window.__independentPreviousDraft=app.attachmentDraft.value;});
  await picker.setInputFiles([file('accepted-new.txt'),file('oversize.txt',17)]);
  await expect(dropzone.getByText('oversize.txt: 容量の上限を超えています。')).toBeVisible();
  await expect(app.getByTestId('draft-names')).toHaveText('committed.txt');
  const rejection=await page.evaluate(()=>{const app=window.__mediaCatalog;return {sameArray:app.attachmentDraft.value===window.__independentPreviousDraft,fileIdentity:app.attachmentDraft.value[0]===app.independentAttempts[0].file,committedBytes:app.attachmentDraft.value[0].size,pickerCleared:document.querySelector('#independent-picker').value==='',attempts:app.independentAttempts.map(({id,requestId,file})=>({id,requestId,name:file.name,bytes:file.size})),rejected:app.independentSelection().rejected.map(item=>({name:item.file.name,reason:item.reason}))};});
  expect(rejection.sameArray).toBe(true);expect(rejection.fileIdentity).toBe(true);expect(rejection.pickerCleared).toBe(true);
  await checkpoint('rejection',rejection);
  const old=await page.evaluate(()=>{const app=window.__mediaCatalog,item=app.independentAttempts[0];app.independentResponse(item,'failed');return {id:item.id,requestId:item.requestId};});
  await dropzone.getByRole('button',{name:'committed.txtを再試行'}).click();
  const retry=await page.evaluate(old=>{const app=window.__mediaCatalog,current=app.independentUploads().find(item=>item.id===old.id);app.independentResponse(old,'success');return {old,current:{id:current.id,requestId:current.requestId,name:current.name,status:current.status},sameFile:current.file===app.independentAttempts[0].file,oldAccepted:app.independentResponses.at(-1).accepted,after:app.independentUploads().find(item=>item.id===old.id).status};},old);
  expect(retry.current.requestId).toBeGreaterThan(old.requestId);expect(retry.sameFile).toBe(true);expect(retry.oldAccepted).toBe(false);expect(retry.after).toBe('uploading');
  await checkpoint('retry',retry);
  const list=app.locator('ui-attachment-list');await list.getByRole('button',{name:'accepted-new.txtの送信を取消'}).click();
  await list.getByRole('button',{name:'accepted-new.txtを削除'}).focus();await page.keyboard.press('Enter');await expect(list.locator('.ui-media-list-status')).toBeFocused();
  await page.evaluate(()=>{const app=window.__mediaCatalog,item=app.independentUploads()[0];app.independentResponse(item,'failed');app.switchDictionary(true);});
  await expect(dropzone.getByText('Application retryable failure')).toBeVisible();
  const rawApplicationError=await dropzone.getByText('Application retryable failure').innerText();
  await expect(dropzone.getByText('oversize.txt: File size limit exceeded.')).toBeVisible();
  await checkpoint('liveRejection',{text:await dropzone.getByText('oversize.txt: File size limit exceeded.').innerText(),draftRetained:await page.evaluate(()=>window.__mediaCatalog.attachmentDraft.value===window.__independentPreviousDraft),rawApplicationError});
  await page.evaluate(()=>window.__mediaCatalog.switchDictionary(false));
  const bitmap=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const context=canvas.getContext('2d');context.fillStyle='red';context.fillRect(0,0,80,80);context.fillStyle='yellow';context.fillRect(80,0,80,80);return canvas.toDataURL('image/png').split(',')[1];});
  const crop=page.getByTestId('crop');await crop.getByLabel('切抜くファイル').setInputFiles({name:'source-pixels.png',mimeType:'image/png',buffer:Buffer.from(bitmap,'base64')});
  const confirm=crop.getByRole('button',{name:'切抜きを確定'});await expect(confirm).toBeEnabled();
  await crop.locator('.ui-crop-frame').scrollIntoViewIfNeeded();const box=await crop.locator('.ui-crop-frame').boundingBox();
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.25);await page.mouse.down();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.75,{steps:8});await page.mouse.up();
  await confirm.click();await expect(crop.getByTestId('crop-size')).toBeVisible();
  const cropPixels=await page.evaluate(async()=>{const output=window.__mediaCatalog.cropOutput(),bitmap=await createImageBitmap(output.blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();return {width:output.width,height:output.height,sourceBounds:output.sourceBounds,rotation:output.rotation,type:output.blob.type,left:Array.from(context.getImageData(Math.floor(canvas.width*.25),Math.floor(canvas.height/2),1,1).data),right:Array.from(context.getImageData(Math.floor(canvas.width*.75),Math.floor(canvas.height/2),1,1).data)};});
  expect(cropPixels.left).toEqual([255,0,0,255]);expect(cropPixels.right).toEqual([255,255,0,255]);expect(cropPixels.type).toBe('image/png');
  await checkpoint('cropPixels',cropPixels);
  await crop.getByRole('button',{name:'右へ90度回転'}).click();await crop.getByRole('combobox',{name:'比率',exact:true}).selectOption('1');await confirm.click();
  await expect(crop.getByTestId('crop-size')).toContainText('80×80');
  const rotated=await page.evaluate(()=>{const value=window.__mediaCatalog.cropOutput();return {width:value.width,height:value.height,rotation:value.rotation,requestId:value.requestId,sourceBounds:value.sourceBounds};});expect(rotated.rotation).toBe(90);
  await crop.screenshot({path:destination+'/'+name+'-crop.png'});
  const pdf=page.getByTestId('pdf');await pdf.getByText('ページの文字',{exact:true}).click();await expect(pdf.locator('.ui-pdf-text')).toContainText('First PDF page');
  const pdfPixels=await pdf.locator('canvas').evaluate(canvas=>{const bytes=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;let dark=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i]<100&&bytes[i+1]<100&&bytes[i+2]<100)dark++;return {width:canvas.width,height:canvas.height,dark};});expect(pdfPixels.dark).toBeGreaterThan(100);
  await pdf.getByRole('button',{name:'次のページ'}).click();await expect(pdf.locator('.ui-pdf-text')).toContainText('Second PDF page');
  await pdf.getByRole('combobox',{name:'拡大率',exact:true}).selectOption('2');await expect.poll(()=>pdf.locator('canvas').evaluate(node=>node.width)).toBe(pdfPixels.width*2);
  const viewport=pdf.locator('.ui-pdf-viewport');await viewport.focus();const geometry=await viewport.evaluate(node=>({scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,top:node.scrollTop,left:node.scrollLeft,focused:node===document.activeElement}));
  expect(geometry.focused).toBe(true);
  if(geometry.scrollHeight>geometry.clientHeight){await page.keyboard.press('ArrowDown');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(geometry.top);}
  else if(geometry.scrollWidth>geometry.clientWidth){await page.keyboard.press(narrow?'ArrowLeft':'ArrowRight');await expect.poll(()=>viewport.evaluate(node=>Math.abs(node.scrollLeft))).toBeGreaterThan(Math.abs(geometry.left));}
  await checkpoint('pdfGeometry',{before:geometry,after:await viewport.evaluate(node=>({top:node.scrollTop,left:node.scrollLeft}))});
  const downloadPromise=page.waitForEvent('download');await pdf.getByRole('button',{name:'PDFをダウンロード'}).click();const download=await downloadPromise,downloadBytes=await readFile(await download.path());expect(downloadBytes.subarray(0,5).toString()).toBe('%PDF-');await writeFile(destination+'/'+name+'-download.pdf',downloadBytes);
  const sourceVariants=[];
  for(const mode of ['Blob','Uint8Array']){
   await page.evaluate(async mode=>{const canvas=document.querySelector('ui-pdf-viewer canvas'),state={visibleAfterHidden:false};window.__pdfVisibilityCycle=state;const observer=new MutationObserver(records=>{if(records.some(record=>record.oldValue!==null)&&!canvas.hidden){state.visibleAfterHidden=true;observer.disconnect();}});observer.observe(canvas,{attributes:true,attributeFilter:['hidden'],attributeOldValue:true});const bytes=new Uint8Array(await (await fetch('/assets/media/sample.pdf')).arrayBuffer());window.__mediaCatalog.pdfSrc.set(mode==='Blob'?new Blob([bytes],{type:'application/pdf'}):bytes);},mode);
   await expect.poll(()=>page.evaluate(()=>window.__pdfVisibilityCycle.visibleAfterHidden)).toBe(true);
   await expect(pdf.locator('canvas')).toBeVisible();await expect(pdf.locator('.ui-pdf-text')).toContainText('Second PDF page');
   sourceVariants.push(await page.evaluate(mode=>{const source=window.__mediaCatalog.pdfSrc();return {mode,isNative:mode==='Blob'?source instanceof Blob:source instanceof Uint8Array,bytes:source instanceof Blob?source.size:source.byteLength};},mode));
  }
  await pdf.screenshot({path:destination+'/'+name+'-pdf.png'});
  const codes=page.getByTestId('codes');await codes.getByLabel('コード内容').fill('Independent UI123456');await expect.poll(()=>decode(page,'ui-qr-code canvas','qr')).toBe('Independent UI123456');
  const qrRendered=await renderedDecode(page,'ui-qr-code canvas','qr',destination+'/'+name+'-qr-rendered.png');
  const barcodeViewport=page.locator('ui-barcode .ui-media-code-viewport');await expect(barcodeViewport).toHaveAttribute('role','region');await expect(barcodeViewport).toHaveAttribute('tabindex','0');await expect(barcodeViewport).toHaveAttribute('aria-label','申請番号のバーコード');
  const barcodeGeometry=await barcodeViewport.evaluate(node=>({clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,canvasWidth:node.querySelector('canvas').getBoundingClientRect().width,rawWidth:node.querySelector('canvas').width,direction:getComputedStyle(node).direction,scrollLeft:node.scrollLeft}));
  expect(barcodeGeometry.canvasWidth).toBe(400);expect(barcodeGeometry.rawWidth).toBe(400);expect(barcodeGeometry.direction).toBe('ltr');
  await barcodeViewport.focus();const scrollActions=[];
  if(barcodeGeometry.scrollWidth>barcodeGeometry.clientWidth){
   for(let i=0;i<8;i++)await page.keyboard.press('ArrowRight');await expect.poll(()=>barcodeViewport.evaluate(node=>node.scrollLeft)).toBe(barcodeGeometry.scrollWidth-barcodeGeometry.clientWidth);scrollActions.push({action:'native-keyboard-right',left:await barcodeViewport.evaluate(node=>node.scrollLeft)});
   for(let i=0;i<8;i++)await page.keyboard.press('ArrowLeft');await expect.poll(()=>barcodeViewport.evaluate(node=>node.scrollLeft)).toBe(0);scrollActions.push({action:'native-keyboard-left',left:0});
   await barcodeViewport.hover();await page.mouse.wheel(500,0);await expect.poll(()=>barcodeViewport.evaluate(node=>node.scrollLeft)).toBe(barcodeGeometry.scrollWidth-barcodeGeometry.clientWidth);scrollActions.push({action:'native-wheel-right',left:await barcodeViewport.evaluate(node=>node.scrollLeft)});
   await page.mouse.wheel(-500,0);await expect.poll(()=>barcodeViewport.evaluate(node=>node.scrollLeft)).toBe(0);scrollActions.push({action:'native-wheel-left',left:0});
  }
  await barcodeViewport.screenshot({path:destination+'/'+name+'-barcode-visible-part.png'});
  const barcodeRendered=narrow?{scope:'Visible part is clipped; full-code decode not claimed',canvasWidth:barcodeGeometry.canvasWidth}:await renderedDecode(page,'ui-barcode canvas','code128',destination+'/'+name+'-code128-rendered.png');
  await checkpoint('barcodeViewport',{geometry:barcodeGeometry,scrollActions,ariaSnapshot:await barcodeViewport.ariaSnapshot()});
  await checkpoint('renderedDecodes',{qrRendered,barcodeRendered});
  const qr=[];
  for(const correction of ['L','M','Q','H'])for(const size of [128,256,512]){
   await page.evaluate(({size,correction})=>{const app=window.__mediaCatalog;app.qrSize.set(size);app.qrCorrection.set(correction);},{size,correction});
   await expect.poll(()=>page.locator('ui-qr-code canvas').evaluate(node=>node.width)).toBe(size);await expect.poll(()=>decode(page,'ui-qr-code canvas','qr')).toBe('Independent UI123456');qr.push({size,correction,decoded:'Independent UI123456'});await checkpoint('qr',qr);
  }
  const barcodes=[];
  for(const [format,value,reader,expected] of [['CODE128','UI123456','code128','UI123456'],['CODE39','MEDIA42','CODE39','MEDIA42'],['EAN13','5901234123457','EAN13','5901234123457'],['EAN8','96385074','EAN8','96385074'],['UPC','012345678905','UPC','012345678905'],['ITF','12345678','ITF','12345678'],['ITF14','10012345678902','ITF14','10012345678902'],['MSI','123456',null,null],['pharmacode','12345',null,null],['codabar','A1234B','codabar','A1234B']]){
   await page.evaluate(({format,value})=>{const app=window.__mediaCatalog;app.barcodeFormat.set(format);app.barcodeCode.set(value);app.barcodeSize.set(600);},{format,value});
   await expect(page.locator('ui-barcode .ui-media-code-value')).toHaveText(value);
   await page.locator('ui-barcode canvas').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await expect(page.locator('ui-barcode canvas')).toBeVisible();await expect.poll(()=>page.locator('ui-barcode canvas').evaluate(node=>node.width)).toBe(600);
   let decoded=null;if(reader){await expect.poll(()=>decode(page,'ui-barcode canvas',reader)).toBe(expected);decoded=await decode(page,'ui-barcode canvas',reader);}
   const raster=await page.locator('ui-barcode canvas').evaluate(canvas=>{const bytes=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;let black=0,white=0,other=0;for(let i=0;i<bytes.length;i+=4){if(bytes[i]===0&&bytes[i+1]===0&&bytes[i+2]===0&&bytes[i+3]===255)black++;else if(bytes[i]===255&&bytes[i+1]===255&&bytes[i+2]===255&&bytes[i+3]===255)white++;else other++;}return {width:canvas.width,height:canvas.height,black,white,other};});
   expect(raster.black).toBeGreaterThan(0);expect(raster.white).toBeGreaterThan(0);expect(raster.other).toBe(0);barcodes.push({format,value,decoded,reader:reader??'Independent decoder unavailable',raster});await checkpoint('barcodes',barcodes);
  }
  const row={name,profile,narrow,rejection,retry,rawApplicationError,cropPixels,rotated,pdfPixels,sourceVariants,download:{bytes:downloadBytes.length,sha256:createHash('sha256').update(downloadBytes).digest('hex')},qrRendered,barcodeRendered,barcodeGeometry,scrollActions,qr,barcodes,errors,scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth)};
  observations.push(row);await writeFile(destination+'/observations.json',JSON.stringify(observations,null,2));console.log(name+': native intake/crop/PDF complete; QR '+qr.length+' decoded; Barcode '+barcodes.filter(item=>item.decoded).length+'/10 independent decoded; rendered Code128 '+JSON.stringify(barcodeRendered));
  await page.close();
 }
}finally{await browser.close();}
const failures=observations.flatMap(row=>[...row.errors,...(row.qrRendered.decoded!=='Independent UI123456'?[row.name+' rendered QR cannot decode']:[]),...(!row.narrow&&row.barcodeRendered.decoded!=='UI123456'?[row.name+' rendered Code128 cannot decode']:[]),...(row.narrow&&row.scrollWidth>320?[row.name+' page overflow']:[])]);
await writeFile(destination+'/exit.json',JSON.stringify({exit:failures.length?1:0,conditions:observations.length,failures,incomplete:['No independent MSI/pharmacode decoder installed; actual raster checked, decoding not claimed']},null,2));
process.exitCode=failures.length?1:0;
