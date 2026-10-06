import {test,expect} from './catalog-test';
import AxeBuilder from '@axe-core/playwright';

for(const profile of ['guided','dense'])test(`Barcode ${profile}: retains module pixels and locally scrolls at 320px, 200% and RTL`,async({page})=>{
 await page.goto('/catalog/media');
 await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();
 const barcode=page.locator('ui-barcode'),canvas=barcode.locator('canvas');
 await expect.poll(()=>canvas.evaluate(node=>{
  try{return (window as any).__mediaDecodeCanvas(node,'code128');}catch{return null;}
 })).toBe('UI123456');
 if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided',exact:true}).click();
 await page.setViewportSize({width:320,height:900});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.getByRole('button',{name:'RTL false',exact:true}).click();
 const viewport=barcode.getByRole('region',{name:'申請番号のバーコード',exact:true});
 const dimensions=await canvas.evaluate(node=>({raster:node.width,display:node.getBoundingClientRect().width}));
 expect(dimensions).toEqual({raster:400,display:400});
 const limits=await viewport.evaluate(node=>({width:node.clientWidth,content:node.scrollWidth}));
 expect(limits.content).toBe(400);expect(limits.width).toBeLessThan(400);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await viewport.focus();
 for(let i=0;i<16;i++)await page.keyboard.press('ArrowRight');
 await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBeGreaterThanOrEqual(limits.content-limits.width-1);
 await expect(viewport).toBeFocused();
 await viewport.hover();await page.mouse.wheel(-600,0);
 await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBe(0);
 await expect.poll(()=>canvas.evaluate(node=>{
  try{return (window as any).__mediaDecodeCanvas(node,'code128');}catch{return null;}
 })).toBe('UI123456');
 const analysis=await new AxeBuilder({page}).include('ui-barcode').analyze();
 expect(analysis.violations).toEqual([]);
 await test.info().attach('barcode-responsive-observations',{body:JSON.stringify({profile,dimensions,limits,violations:analysis.violations,incomplete:analysis.incomplete},null,2),contentType:'application/json'});
});
