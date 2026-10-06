# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: media-lifetime.spec.ts >> native crop discards stale encoding on hide/source replacement/destroy; app revokes replaced and destroyed Blob URLs
- Location: tests/ui/media-lifetime.spec.ts:55:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 5
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "添付・画像・メディアの操作" [level=1] [ref=e4]
  - generic [ref=e5]:
    - button "プロファイル guided" [ref=e6] [cursor=pointer]
    - button "RTL false" [ref=e8] [cursor=pointer]
    - button "無効 false" [ref=e10] [cursor=pointer]
    - button "媒体を表示・非表示" [ref=e12] [cursor=pointer]
    - button "媒体を生成・破棄" [active] [ref=e14] [cursor=pointer]
```

# Test source

```ts
  1   | import {test,expect} from './catalog-test';import type {Page} from '@playwright/test';
  2   | 
  3   | async function open(page:Page){
  4   |  await page.goto('/catalog/media');
  5   |  await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!(window as any).__mediaCatalog&&!!(window as any).__mediaApplication)).toBe(true);
  6   |  await expect(page.getByTestId('pdf').locator('canvas')).toBeVisible();
  7   | }
  8   | async function png(page:Page,width:number,height:number,color:string){
  9   |  const bytes=await page.evaluate(({width,height,color})=>{
  10  |   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  11  |   const context=canvas.getContext('2d')!;context.fillStyle=color;context.fillRect(0,0,width,height);
  12  |   return canvas.toDataURL('image/png').split(',')[1]!;
  13  |  },{width,height,color});
  14  |  return Buffer.from(bytes,'base64');
  15  | }
  16  | 
  17  | test('native crop closes stale decoded Bitmaps during rapid replacement and destruction',async({page})=>{
  18  |  await open(page);
  19  |  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  20  |  await page.evaluate(()=>{
  21  |   const original=window.createImageBitmap.bind(window);
  22  |   const probe={pending:[] as Array<{name:string;release:()=>void}>,closed:[] as string[]};
  23  |   (window as any).cropDecodeProbe=probe;
  24  |   window.createImageBitmap=((...args:any[])=>{
  25  |    const file=args[0];
  26  |    return (original as any)(...args).then((bitmap:ImageBitmap)=>{
  27  |     if(!(file instanceof File))return bitmap;
  28  |     const close=bitmap.close.bind(bitmap);
  29  |     bitmap.close=()=>{probe.closed.push(file.name);close();};
  30  |     return new Promise<ImageBitmap>(resolve=>probe.pending.push({name:file.name,release:()=>resolve(bitmap)}));
  31  |    });
  32  |   }) as typeof createImageBitmap;
  33  |  });
  34  |  const crop=page.getByTestId('crop'),picker=crop.getByLabel('切抜くファイル');
  35  |  await picker.setInputFiles({name:'old.png',mimeType:'image/png',buffer:await png(page,100,50,'red')});
  36  |  await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.pending.length)).toBe(1);
  37  |  await picker.setInputFiles({name:'current.png',mimeType:'image/png',buffer:await png(page,200,100,'blue')});
  38  |  await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.pending.length)).toBe(2);
  39  |  await page.evaluate(()=>(window as any).cropDecodeProbe.pending[1].release());
  40  |  await expect(crop.getByRole('button',{name:'切抜きを確定'})).toBeEnabled();
  41  |  await expect.poll(()=>crop.locator('ui-image-cropper canvas').evaluate(node=>node.width)).toBe(200);
  42  |  await page.evaluate(()=>(window as any).cropDecodeProbe.pending[0].release());
  43  |  await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.closed)).toEqual(['old.png']);
  44  |  expect(await crop.locator('ui-image-cropper canvas').evaluate(node=>node.width)).toBe(200);
  45  |  await picker.setInputFiles({name:'destroy-pending.png',mimeType:'image/png',buffer:await png(page,100,300,'green')});
  46  |  await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.pending.length)).toBe(3);
  47  |  await page.getByRole('button',{name:'媒体を生成・破棄'}).click();
  48  |  await page.evaluate(()=>(window as any).cropDecodeProbe.pending[2].release());
  49  |  await expect.poll(()=>page.evaluate(()=>(window as any).cropDecodeProbe.closed)).toEqual(['old.png','current.png','destroy-pending.png']);
  50  |  await expect(page.locator('ui-image-cropper')).toHaveCount(0);
  51  |  expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput())).toBeNull();
  52  |  expect(errors).toEqual([]);
  53  | });
  54  | 
  55  | test('native crop discards stale encoding on hide/source replacement/destroy; app revokes replaced and destroyed Blob URLs',async({page})=>{
  56  |  await open(page);
  57  |  await page.evaluate(()=>{
  58  |   const originalCreate=URL.createObjectURL.bind(URL),originalRevoke=URL.revokeObjectURL.bind(URL);
  59  |   const probe={created:[] as string[],revoked:[] as string[],pending:[] as Array<()=>void>,delay:false};
  60  |   (window as any).cropEncodingProbe=probe;
  61  |   URL.createObjectURL=blob=>{const url=originalCreate(blob);probe.created.push(url);return url;};
  62  |   URL.revokeObjectURL=url=>{probe.revoked.push(url);originalRevoke(url);};
  63  |   const original=HTMLCanvasElement.prototype.toBlob;
  64  |   HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){
  65  |    original.call(this,blob=>{if(probe.delay&&type==='image/png')probe.pending.push(()=>callback(blob));else callback(blob);},type,quality);
  66  |   };
  67  |  });
  68  |  const crop=page.getByTestId('crop'),picker=crop.getByLabel('切抜くファイル'),confirm=crop.getByRole('button',{name:'切抜きを確定'});
  69  |  await picker.setInputFiles({name:'source.png',mimeType:'image/png',buffer:await png(page,100,300,'red')});
  70  |  await expect(confirm).toBeEnabled();
  71  |  const frame=crop.locator('.ui-crop-frame');const box=await frame.boundingBox();
  72  |  expect(box!.width/box!.height).toBeCloseTo(1/3,2);
  73  |  await confirm.click();await expect(crop.getByTestId('crop-size')).toContainText('100×300');
  74  |  await confirm.click();
  75  |  await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.created.length)).toBe(2);
  76  |  expect(await page.evaluate(()=>{const p=(window as any).cropEncodingProbe;return p.revoked.includes(p.created[0]);})).toBe(true);
  77  |  const currentRequest=await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId);
  78  |  await page.evaluate(()=>(window as any).cropEncodingProbe.delay=true);
  79  |  await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.pending.length)).toBe(1);
  80  |  await page.getByRole('button',{name:'媒体を表示・非表示'}).click();
  81  |  await expect(crop).toBeHidden();
  82  |  await page.evaluate(()=>(window as any).cropEncodingProbe.pending.shift()());
  83  |  expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId)).toBe(currentRequest);
  84  |  await page.getByRole('button',{name:'媒体を表示・非表示'}).click();
  85  |  await expect(confirm).toBeEnabled();
  86  |  await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.pending.length)).toBe(1);
  87  |  await picker.setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:await png(page,200,100,'blue')});
  88  |  await expect(confirm).toBeEnabled();
  89  |  await page.evaluate(()=>(window as any).cropEncodingProbe.pending.shift()());
  90  |  expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId)).toBe(currentRequest);
  91  |  await confirm.click();await expect.poll(()=>page.evaluate(()=>(window as any).cropEncodingProbe.pending.length)).toBe(1);
  92  |  await page.getByRole('button',{name:'媒体を生成・破棄'}).click();
  93  |  await page.evaluate(()=>(window as any).cropEncodingProbe.pending.shift()());
> 94  |  expect(await page.evaluate(()=>(window as any).__mediaCatalog.cropOutput().requestId)).toBe(currentRequest);
      |                                                                                         ^ Error: expect(received).toBe(expected) // Object.is equality
  95  |  expect(await page.evaluate(()=>(window as any).cropEncodingProbe.created.length)).toBe(2);
  96  |  await page.evaluate(()=>(window as any).__mediaApplication.destroy());
  97  |  expect(await page.evaluate(()=>{const p=(window as any).cropEncodingProbe;return p.created.every((url:string)=>p.revoked.includes(url));})).toBe(true);
  98  | });
  99  | 
  100 | test('PDF worker startup failure reports an error and terminates its native Worker',async({page})=>{
  101 |  await page.addInitScript(()=>{
  102 |   const Original=Worker;const workers:{terminated:number}[]=[];(window as any).mediaWorkerProbe=workers;
  103 |   window.Worker=class extends Original {
  104 |    private probe={terminated:0};
  105 |    constructor(url:string|URL,options?:WorkerOptions){super(url,options);workers.push(this.probe);}
  106 |    override terminate(){this.probe.terminated++;super.terminate();}
  107 |   };
  108 |  });
  109 |  await page.route('**/pdf.worker.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:"throw new Error('intentional fixture worker startup failure');"}));
  110 |  await page.goto('/catalog/media');
  111 |  await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!(window as any).__mediaCatalog&&!!(window as any).__mediaApplication)).toBe(true);
  112 |  await expect(page.getByTestId('pdf').getByText(/PDFを読み込めません/)).toBeVisible();
  113 |  await expect.poll(()=>page.evaluate(()=>(window as any).mediaWorkerProbe.every((worker:any)=>worker.terminated>0))).toBe(true);
  114 |  await page.unroute('**/pdf.worker.mjs');
  115 |  await page.getByTestId('pdf').getByRole('button',{name:'PDFを再取得'}).click();
  116 |  await expect(page.getByTestId('pdf').locator('canvas')).toBeVisible();
  117 |  await page.getByRole('button',{name:'媒体を生成・破棄'}).click();
  118 |  await expect.poll(()=>page.evaluate(()=>(window as any).mediaWorkerProbe.every((worker:any)=>worker.terminated>0))).toBe(true);
  119 | });
  120 | 
```