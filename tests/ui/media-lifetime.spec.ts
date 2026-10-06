import {test,expect} from './catalog-test';import type {Page} from '@playwright/test';

async function open(page:Page){
 await page.goto('/catalog/media');
 await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!(window as any).__mediaCatalog&&!!(window as any).__mediaApplication)).toBe(true);
 await expect(page.getByTestId('pdf').locator('canvas')).toBeVisible();
}
async function png(page:Page,width:number,height:number,color:string){
 const bytes=await page.evaluate(({width,height,color})=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d')!;context.fillStyle=color;context.fillRect(0,0,width,height);
  return canvas.toDataURL('image/png').split(',')[1]!;
 },{width,height,color});
 return Buffer.from(bytes,'base64');
}

test('native crop closes stale decoded Bitmaps during rapid replacement and destruction',async({page})=>{
 await open(page);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(()=>{
  const original=window.createImageBitmap.bind(window);
  const probe={pending:[] as Array<{name:string;release:()=>void}>,closed:[] as string[]};
  (window as any).cropDecodeProbe=probe;
  window.createImageBitmap=((...args:any[])=>{
   const file=args[0];
   return (original as any)(...args).then((bitmap:ImageBitmap)=>{
    if(!(file instanceof File))return bitmap;
    const close=bitmap.close.bind(bitmap);
    bitmap.close=()=>{probe.closed.push(file.name);close();};
    return new Promise<ImageBitmap>(resolve=>probe.pending.push({name:file.name,release:()=>resolve(bitmap)}));
   });
  }) as typeof createImageBitmap;
 });
 const crop=page.getByTestId('crop'),picker=crop.getByLabel('切抜くファイル');
 await picker.setInputFiles({name:'old.png',mimeType:'image/png',buffer:await png(page,100,50,'red')});
 await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.pending.length)).toBe(1);
 await picker.setInputFiles({name:'current.png',mimeType:'image/png',buffer:await png(page,200,100,'blue')});
 await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.pending.length)).toBe(2);
 await page.evaluate(()=>(window as any).cropDecodeProbe.pending[1].release());
 await expect(crop.getByRole('button',{name:'切抜きを確定'})).toBeEnabled();
 await expect.poll(()=>crop.locator('ui-image-cropper canvas').evaluate(node=>node.width)).toBe(200);
 await page.evaluate(()=>(window as any).cropDecodeProbe.pending[0].release());
 await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.closed)).toEqual(['old.png']);
 expect(await crop.locator('ui-image-cropper canvas').evaluate(node=>node.width)).toBe(200);
 await picker.setInputFiles({name:'destroy-pending.png',mimeType:'image/png',buffer:await png(page,100,300,'green')});
 await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.pending.length)).toBe(3);
 await page.getByRole('button',{name:'媒体を生成・破棄'}).click();
 await page.evaluate(()=>(window as any).cropDecodeProbe.pending[2].release());
 await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.closed)).toEqual(['old.png','current.png','destroy-pending.png']);
 await expect(page.locator('ui-image-cropper')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput())).toBeNull();
 expect(errors).toEqual([]);
});

test('native crop discards stale encoding on hide/source replacement/destroy; app revokes replaced and destroyed Blob URLs',async({page})=>{
 await open(page);
 await page.evaluate(()=>{
  const originalCreate=URL.createObjectURL.bind(URL),originalRevoke=URL.revokeObjectURL.bind(URL);
  const probe={created:[] as string[],revoked:[] as string[],pending:[] as Array<()=>void>,delay:false};
  (window as any).cropEncodingProbe=probe;
  URL.createObjectURL=blob=>{const url=originalCreate(blob);probe.created.push(url);return url;};
  URL.revokeObjectURL=url=>{probe.revoked.push(url);originalRevoke(url);};
  const original=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){
   original.call(this,blob=>{if(probe.delay&&type==='image/png')probe.pending.push(()=>callback(blob));else callback(blob);},type,quality);
  };
 });
 const crop=page.getByTestId('crop'),picker=crop.getByLabel('切抜くファイル'),confirm=crop.getByRole('button',{name:'切抜きを確定'});
 await picker.setInputFiles({name:'source.png',mimeType:'image/png',buffer:await png(page,100,300,'red')});
 await expect(confirm).toBeEnabled();
 const frame=crop.locator('.ui-crop-frame');const box=await frame.boundingBox();
 expect(box!.width/box!.height).toBeCloseTo(1/3,2);
 await confirm.click();await expect(crop.getByTestId('crop-size')).toContainText('100×300');
 await confirm.click();
 await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.created.length)).toBe(2);
 expect(await page.evaluate(()=>{const p=(window as any).cropEncodingProbe;return p.revoked.includes(p.created[0]);})).toBe(true);
 const currentRequest=await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId);
 await page.evaluate(()=>(window as any).cropEncodingProbe.delay=true);
 await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.pending.length)).toBe(1);
 await page.getByRole('button',{name:'媒体を表示・非表示'}).click();
 await expect(crop).toBeHidden();
 await page.evaluate(()=>(window as any).cropEncodingProbe.pending.shift()());
 expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId)).toBe(currentRequest);
 await page.getByRole('button',{name:'媒体を表示・非表示'}).click();
 await expect(confirm).toBeEnabled();
 await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.pending.length)).toBe(1);
 await picker.setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:await png(page,200,100,'blue')});
 await expect(confirm).toBeEnabled();
 await page.evaluate(()=>(window as any).cropEncodingProbe.pending.shift()());
 expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId)).toBe(currentRequest);
 await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.pending.length)).toBe(1);
 await page.getByRole('button',{name:'媒体を生成・破棄'}).click();
 await expect(page.locator('ui-image-cropper')).toHaveCount(0);
 await page.evaluate(()=>(window as any).cropEncodingProbe.pending.shift()());
 expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId)).toBe(currentRequest);
 expect(await page.evaluate(()=>(window as any).cropEncodingProbe.created.length)).toBe(2);
 await page.evaluate(()=>(window as any).__mediaApplication.destroy());
 expect(await page.evaluate(()=>{const p=(window as any).cropEncodingProbe;return p.created.every((url:string)=>p.revoked.includes(url));})).toBe(true);
});

test('PDF worker startup failure reports an error and terminates its native Worker',async({page})=>{
 await page.addInitScript(()=>{
  const Original=Worker;const workers:{terminated:number}[]=[];(window as any).mediaWorkerProbe=workers;
  window.Worker=class extends Original {
   private probe={terminated:0};
   constructor(url:string|URL,options?:WorkerOptions){super(url,options);workers.push(this.probe);}
   override terminate(){this.probe.terminated++;super.terminate();}
  };
 });
 await page.route('**/pdf.worker.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:"throw new Error('intentional fixture worker startup failure');"}));
 await page.goto('/catalog/media');
 await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!(window as any).__mediaCatalog&&!!(window as any).__mediaApplication)).toBe(true);
 await expect(page.getByTestId('pdf').getByText(/PDFを読み込めません/)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).mediaWorkerProbe.every((worker:any)=>worker.terminated>0))).toBe(true);
 await page.unroute('**/pdf.worker.mjs');
 await page.getByTestId('pdf').getByRole('button',{name:'PDFを再取得'}).click();
 await expect(page.getByTestId('pdf').locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'媒体を生成・破棄'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mediaWorkerProbe.every((worker:any)=>worker.terminated>0))).toBe(true);
});
