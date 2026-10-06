import fs from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {auditSvgPaint} from './svg-paint-audit.mjs';
const evidence=new URL('../evidence/',import.meta.url),rows=[],browser=await chromium.launch({channel:'chromium'});
const configurations=['guided','dense'].flatMap(profile=>[1280,320].flatMap(width=>['ltr','rtl'].map(direction=>({profile,width,direction,font:width===320?'200%':'100%'}))));
const select=async(page,name,value)=>page.getByLabel(name,{exact:true}).selectOption(value);
async function settled(svg){await svg.evaluate(async svg=>{await document.fonts.ready;let stable=0,last='';for(let i=0;i<120&&stable<8;i++){await new Promise(requestAnimationFrame);const current=svg.outerHTML;if(current===last)stable++;else{stable=0;last=current;}}if(stable<8)throw Error('SVG not settled');});}
try{
 for(const configuration of configurations){
  if(process.env.PAINT_CONFIG&&process.env.PAINT_CONFIG!==`${configuration.profile}-${configuration.width}-${configuration.direction}`)continue;
  for(const [locale,precision,data] of [['ar-EG','2','precision'],['ja-JP','9','precision'],['de-DE','2','precision'],['ar-EG','2','edge']]){
   if(process.env.PAINT_ONE==='1'&&(configuration.width!==320||configuration.direction!=='rtl'||locale!=='ar-EG'||data!=='precision'))continue;
   const context=await browser.newContext({viewport:{width:configuration.width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],row={...configuration,locale,precision,data,startedAt:new Date().toISOString()};
   page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto('http://127.0.0.1:5344/');await select(page,'Review profile',configuration.profile);await select(page,'Review direction',configuration.direction);await page.evaluate(font=>document.documentElement.style.fontSize=font,configuration.font);await select(page,'Review chart kind','gauge');await select(page,'Review chart data',data);await select(page,'Review locale',locale);await select(page,'Review number precision',precision);
    const number=new Intl.NumberFormat(locale,{minimumFractionDigits:precision==='2'?2:0,maximumFractionDigits:Number(precision)}),values=data==='edge'?[0,9999999999999.875]:[2.123456789,5.987654321,9.555555555],expectedValues=values.map(value=>number.format(value));
    const svg=page.locator('#review-chart .ui-specialist-surface svg');await expect(svg).toContainText(expectedValues[0]);await settled(svg);
    row.paint=await svg.evaluate(auditSvgPaint);const name=`${configuration.profile}-${configuration.width}-${configuration.direction}-${locale}-${precision}-${data}`;
    await fs.writeFile(new URL(name+'.png',evidence),Buffer.from(row.paint.png.split(',')[1],'base64'));delete row.paint.png;await fs.writeFile(new URL(name+'.svg',evidence),row.paint.sourceSvg);delete row.paint.sourceSvg;
    row.expectedValues=expectedValues;row.ticks=Array.from({length:11},(_,index)=>({text:number.format(index*10),count:row.paint.labels.filter(l=>l.text===number.format(index*10)).length}));
    expect(row.ticks.every(t=>t.count===values.length),'All 11 complete native gauge ticks').toBe(true);
    for(const expected of expectedValues)expect(row.paint.labels.map(l=>l.text).join(''),'Full Intl display '+expected).toContain(expected);
    expect(row.paint.labels.every(l=>l.inkPixels>0),'Every native text has independent glyph ink').toBe(true);
    expect(row.paint.totalExactMismatchPixels,'Every alpha>0 pixel matches reference exactly').toBe(0);
    expect(row.paint.originalStrictMismatchPixels,'Original strict paint invariant').toBe(0);
    expect(row.paint.expandedReferenceAlphaMismatch,'Expanded independent raster preserves exact alpha plane').toBe(0);
    expect(row.paint.clippedInkPixels,'Expanded glyph ink fits original SVG').toBe(0);
    expect(row.paint.inkIntersections,'No glyph pixel belongs to multiple labels').toEqual([]);
    expect(row.paint.labels.flatMap(l=>l.clips),'No glyph clip/filter/mask omitted by reference').toEqual([]);
    expect(row.paint.labels.every(l=>l.contrast.allOpaque),'Every native glyph pixel has actual opaque background').toBe(true);
    expect(row.paint.minimumContrastRatio,'Actual full background under every glyph meets 4.5:1').toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Local overflow preserves page width').toBe(true);
    const source=JSON.parse(await page.locator('#chart-source').textContent());expect(source[0].points.map(p=>p.value)).toEqual(data==='edge'?[0,9999999999999.875,null]:values);
    const table=page.locator('#review-chart table');expect(await table.evaluate(el=>getComputedStyle(el).direction),'Surrounding typed data follows application RTL').toBe(configuration.direction);for(const expected of expectedValues)await expect(table).toContainText(expected);
    if(data==='edge'){
     await expect(table).toContainText('Full original point label must remain available through the typed data table even when gauge SVG title is truncated');await expect(table).toContainText('未取得');
     const axe=await new AxeBuilder({page}).include('#review-chart').analyze();row.axe={violations:axe.violations,incomplete:axe.incomplete};expect(axe.violations).toEqual([]);row.AX=await page.locator('#review-chart figure').ariaSnapshot();
    }
    const button=page.locator('#review-chart').getByRole('button',{name:'Cell1を選択',exact:true});await button.focus();await button.press('Enter');await expect(page.locator('#chart-selection')).toHaveText('series/two');row.keyboardSelection=await page.locator('#chart-selection').textContent();
    await page.getByLabel('Review chart disabled',{exact:true}).check();await expect(button).toBeDisabled();await page.getByLabel('Review chart disabled',{exact:true}).uncheck();await page.getByLabel('Review chart busy',{exact:true}).check();await expect(button).toBeDisabled();await page.getByLabel('Review chart busy',{exact:true}).uncheck();
    const region=page.locator('#review-chart .ui-specialist-plot-scroll');row.scroll=await region.evaluate(el=>({client:el.clientWidth,width:el.scrollWidth,role:el.getAttribute('role'),name:el.getAttribute('aria-label'),direction:getComputedStyle(el).direction}));if(row.scroll.width>row.scroll.client){await region.evaluate(el=>el.scrollLeft=0);await region.focus();await region.press('ArrowRight');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);row.scroll.afterNativeKeyboard=await region.evaluate(el=>el.scrollLeft);}
    const draft=page.locator('#retained-draft');await draft.fill('محفوظ draft 001');const handle=await draft.elementHandle();const originalRaw=await page.locator('#chart-source').textContent();await select(page,'Review locale',locale==='de-DE'?'ar-EG':'de-DE');await select(page,'Review direction',configuration.direction==='rtl'?'ltr':'rtl');await select(page,'Review profile',configuration.profile==='guided'?'dense':'guided');await expect(draft).toHaveValue('محفوظ draft 001');expect(await draft.evaluate(el=>getComputedStyle(el).direction),'Retained input adopts new application direction').toBe(configuration.direction==='rtl'?'ltr':'rtl');expect(await handle.evaluate(el=>el.isConnected),'Original input DOM retained').toBe(true);await expect(page.locator('#chart-source')).toHaveText(originalRaw);await expect(page.locator('#chart-selection')).toHaveText('series/two');row.draftAndSelectionPreserved=true;
    row.passed=true;
   }catch(error){row.passed=false;row.failure=String(error);}
   finally{row.errors=errors;row.endedAt=new Date().toISOString();rows.push(row);await context.close();await fs.writeFile(new URL('candidate-paint-native.json',evidence),JSON.stringify({browser:browser.version(),rows,allExpected:rows.every(r=>r.passed&&r.errors.length===0)},null,2)+'\n');console.log(JSON.stringify({config:configuration,locale,precision,data,passed:row.passed,exactMismatches:row.paint?.totalExactMismatchPixels,ink:row.paint?.totalInkPixels,contrast:row.paint?.minimumContrastRatio,failure:row.failure,errors}));}
  }
 }
}finally{await browser.close();}
if(rows.some(r=>!r.passed||r.errors.length))process.exitCode=1;
