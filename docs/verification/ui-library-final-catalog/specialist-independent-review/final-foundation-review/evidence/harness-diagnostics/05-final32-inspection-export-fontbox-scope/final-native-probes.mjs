import fs from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {engineLength} from './engine-length.mjs';
const evidence=new URL('../evidence/',import.meta.url),server=JSON.parse(await fs.readFile(new URL('server.json',evidence),'utf8'));
const browser=await chromium.launch({channel:'chromium'}),rows=[];
const allConfigurations=['guided','dense'].flatMap(profile=>[1280,320].flatMap(width=>['ltr','rtl'].map(direction=>({profile,width,font:width===320?'200%':'100%',direction}))));
const configurations=process.env.REVIEW_ONE==='1'?allConfigurations.slice(0,1):allConfigurations;
const overlap=(a,b)=>({width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))});
const safePicture=value=>value.replaceAll(/[^\w.-]/g,'_');
await fs.mkdir(new URL('drawings/',evidence),{recursive:true});
async function run(name,configuration,fn){
 if(process.env.REVIEW_CASE&&process.env.REVIEW_CASE!==name)return;
 const context=await browser.newContext({viewport:{width:configuration.width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 const row={name,...configuration,startedAt:new Date().toISOString()};
 try{
  await page.goto(`http://127.0.0.1:${server.port}/direct-consumer/index.html`);
  await page.getByLabel('Review profile',{exact:true}).selectOption(configuration.profile);
  await page.getByLabel('Review direction',{exact:true}).selectOption(configuration.direction);
  await page.evaluate(font=>document.documentElement.style.fontSize=font,configuration.font);
  await expect(page.locator('ui-chart figcaption')).toHaveText('Independent chart');
  row.result=await fn(page,configuration);row.passed=true;
 }catch(error){row.passed=false;row.failure=String(error);row.svg=await measureSvg(page).catch(()=>null);await page.screenshot({path:new URL('drawings/'+safePicture(name+'-'+configuration.profile+'-'+configuration.width+'-'+configuration.direction+'-failure')+'.png',evidence).pathname,fullPage:true}).catch(()=>{});}
 finally{row.errors=errors;row.endedAt=new Date().toISOString();rows.push(row);await context.close();await fs.writeFile(new URL('native-probes.json',evidence),JSON.stringify({rows,allExpected:rows.every(row=>row.passed&&row.errors.length===0)},null,2)+'\n');console.log(JSON.stringify({name,configuration,passed:row.passed,failure:row.failure,errors}));}
}
async function inspect(page){await page.getByRole('button',{name:'Review inspect public ECharts',exact:true}).click();await expect(page.locator('#chart-option')).not.toHaveText('');return JSON.parse(await page.locator('#chart-option').textContent());}
async function setKind(page,kind){
 await page.getByLabel('Review chart kind',{exact:true}).selectOption(kind);
 await expect(page.locator('#review-chart ui-chart [role=alert]')).toHaveCount(0);
 await expect.poll(async()=>{const option=await inspect(page);return option.series?.[0]?.type;}).toBe(kind==='area'?'line':kind);
 await expect(page.locator('#review-chart .ui-specialist-surface svg')).toBeVisible();
}
async function measureSvg(page){return page.locator('#review-chart .ui-specialist-surface svg').evaluate(svg=>{
 const rect=value=>({x:value.x,y:value.y,width:value.width,height:value.height});
 return{svg:rect(svg.getBoundingClientRect()),svgWidth:svg.width.baseVal.value,svgHeight:svg.height.baseVal.value,direction:getComputedStyle(svg).direction,texts:Array.from(svg.querySelectorAll('text')).filter(node=>node.textContent?.trim()).map((node,index)=>({index,text:node.textContent,font:getComputedStyle(node).fontSize,direction:getComputedStyle(node).direction,anchor:node.getAttribute('text-anchor'),rect:rect(node.getBoundingClientRect())}))};
});}
function checkDrawing(observation,required){
 for(const text of required)expect(observation.texts.some(item=>item.text===text),'Visible SVG text '+text).toBe(true);
 const svg=observation.svg;
 const clips=observation.texts.map(item=>({text:item.text,index:item.index,left:Math.max(0,svg.x-item.rect.x),right:Math.max(0,item.rect.x+item.rect.width-svg.x-svg.width),top:Math.max(0,svg.y-item.rect.y),bottom:Math.max(0,item.rect.y+item.rect.height-svg.y-svg.height)}));
 const collisions=observation.texts.flatMap((a,index)=>observation.texts.slice(index+1).map(b=>({a:a.text,aIndex:a.index,b:b.text,bIndex:b.index,...overlap(a.rect,b.rect)}))).filter(item=>item.width>1&&item.height>1);
 expect(clips.filter(item=>Math.max(item.left,item.right,item.top,item.bottom)>1),'SVG text is not clipped').toEqual([]);
 expect(collisions,'All axis names/ticks/legend/details remain distinct').toEqual([]);
 return{clips,collisions};
}
async function directionAndReachability(page,names){
 return page.locator('#review-chart ui-chart').evaluate(async(host,names)=>{
  const rect=value=>({x:value.x,y:value.y,width:value.width,height:value.height});const svg=host.querySelector('svg'),surface=host.querySelector('.ui-specialist-surface'),table=host.querySelector('table'),ancestors=[];
  for(let element=svg?.parentElement;element&&element!==host.parentElement;element=element.parentElement){const style=getComputedStyle(element);if(['auto','scroll'].includes(style.overflowX)||['auto','scroll'].includes(style.overflowY))ancestors.push(element);}
  const seen=[];
  for(const name of names){const text=Array.from(svg?.querySelectorAll('text')??[]).find(node=>node.textContent===name);if(!text){seen.push({name,present:false});continue;}text.scrollIntoView({block:'center',inline:'center',behavior:'instant'});await new Promise(requestAnimationFrame);const box=text.getBoundingClientRect(),x=box.x+box.width/2,y=box.y+box.height/2,hit=document.elementFromPoint(x,y);seen.push({name,present:true,rect:rect(box),hit:hit?.tagName??null,reachable:!!hit&&svg.contains(hit)});}
  return{graphicDirection:getComputedStyle(surface).direction,svgDirection:getComputedStyle(svg).direction,tableDirection:getComputedStyle(table).direction,figureDirection:getComputedStyle(host.querySelector('figure')).direction,scrollers:ancestors.map(el=>({tag:el.tagName,role:el.getAttribute('role'),label:el.getAttribute('aria-label'),direction:getComputedStyle(el).direction,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,tabindex:el.getAttribute('tabindex')})),texts:seen,document:{client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}};
 },names);
}
async function nativePlotNavigation(page){
 const regions=page.locator('#review-chart ui-chart [role=region]');
 const observations=[];
 for(let index=0;index<await regions.count();index++){
  const region=regions.nth(index),state=await region.evaluate(el=>({label:el.getAttribute('aria-label'),client:el.clientWidth,scroll:el.scrollWidth,left:el.scrollLeft,direction:getComputedStyle(el).direction}));
  if(state.scroll<=state.client+1)continue;
  expect(state.label?.trim()).toBeTruthy();expect(state.direction).toBe('ltr');
  await region.evaluate(el=>{el.scrollLeft=0;});await region.focus();await expect(region).toBeFocused();await region.press('ArrowRight');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  const afterKeyboard=await region.evaluate(el=>el.scrollLeft);await region.evaluate(el=>{el.scrollLeft=0;});await region.hover();await page.mouse.wheel(120,0);await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  observations.push({...state,afterKeyboard,afterNativeWheel:await region.evaluate(el=>el.scrollLeft)});
 }
 return observations;
}
async function pointerTarget(page,item){
 const svg=page.locator('#review-chart .ui-specialist-surface svg');
 const size=await svg.evaluate(el=>({width:el.width.baseVal.value,height:el.height.baseVal.value}));
 const localCenter={x:engineLength(item.center[0],size.width),y:engineLength(item.center[1],size.height)};
 return svg.evaluate(async(svg,center)=>{
  const globalCenter=new DOMPoint(center.x,center.y).matrixTransform(svg.getScreenCTM());
  const paths=Array.from(svg.querySelectorAll('path')).filter(path=>{const box=path.getBoundingClientRect();return box.width>3&&box.height>3&&getComputedStyle(path).fill!=='none'&&!/[aAcC]/.test(path.getAttribute('d')??'')&&!!path.getAttribute('transform');});
  for(const path of paths){const origin=new DOMPoint(0,0).matrixTransform(path.getScreenCTM());if(Math.hypot(origin.x-globalCenter.x,origin.y-globalCenter.y)>2)continue;const total=path.getTotalLength();let x=0,y=0;for(let index=0;index<200;index++){const p=path.getPointAtLength(total*index/200);x+=p.x/200;y+=p.y/200;}const point=new DOMPoint(x,y);if(!path.isPointInFill(point))continue;path.scrollIntoView({block:'center',inline:'center',behavior:'instant'});await new Promise(requestAnimationFrame);const screen=point.matrixTransform(path.getScreenCTM());const hit=document.elementFromPoint(screen.x,screen.y);if(hit===path)return{x:screen.x,y:screen.y,d:path.getAttribute('d'),transform:path.getAttribute('transform'),nativeHit:true,center};}
  return null;
 },localCenter);
}
async function relation(editor){return editor.evaluate(el=>{const controls=(el.getAttribute('aria-controls')??'').split(/\s+/).filter(Boolean),active=el.getAttribute('aria-activedescendant');return{controls,active,activePresent:!active||!!document.getElementById(active),targets:controls.map(id=>({id,present:!!document.getElementById(id),role:document.getElementById(id)?.getAttribute('role')}))};});}
function validRelation(value){expect(value.targets.every(target=>target.present)).toBe(true);expect(value.activePresent).toBe(true);}
try{
 for(const configuration of configurations){
  await run('five-cartesian-native-layout',configuration,async(page,config)=>{
   const observations=[];
   for(const kind of ['line','bar','area','scatter','heatmap']){
    await setKind(page,kind);const drawing=await measureSvg(page),checks=checkDrawing(drawing,['横座標','縦座標','Heat cells']);
    const reachable=await directionAndReachability(page,['横座標','縦座標','Heat cells']);
    expect(reachable.svgDirection).toBe('ltr');expect(reachable.graphicDirection).toBe('ltr');expect(reachable.tableDirection).toBe(config.direction);expect(reachable.figureDirection).toBe(config.direction);expect(reachable.texts.every(item=>item.reachable)).toBe(true);expect(reachable.document.scroll).toBeLessThanOrEqual(reachable.document.client+1);
    for(const scroller of reachable.scrollers.filter(item=>item.scrollWidth>item.clientWidth+1)){expect(scroller.role).toBe('region');expect(scroller.label?.trim()).toBeTruthy();expect(Number(scroller.tabindex)).toBeGreaterThanOrEqual(0);}
    if(kind==='line'||kind==='bar'||kind==='area')for(const label of ['Cell0','Cell1','Cell2'])expect(drawing.texts.some(item=>item.text===label)).toBe(true);
    await page.locator('#review-chart .ui-specialist-surface').screenshot({path:new URL(`drawings/${config.profile}-${config.width}-${config.direction}-${kind}.png`,evidence).pathname});
    const nativeScroll=await nativePlotNavigation(page);observations.push({kind,drawing,checks,reachable,nativeScroll});
   }
   await page.getByLabel('Review invalid axis',{exact:true}).check();await expect(page.locator('#review-chart ui-chart [role=alert]')).toContainText('横軸・縦軸とも区分軸');await expect(page.locator('#review-chart table')).toContainText('Cell1');await expect(page.locator('#review-chart table')).toContainText('5');await expect(page.locator('#review-chart').getByRole('button',{name:'Cell1を選択',exact:true})).toBeDisabled();await page.getByLabel('Review invalid axis',{exact:true}).uncheck();await expect(page.locator('#review-chart ui-chart [role=alert]')).toHaveCount(0);await expect(page.locator('#review-chart .ui-specialist-surface svg')).toBeVisible();
   return{observations,invalidAxesPreserveSafeRows:true};
  });
  await run('gauge-raw-Intl-pointer-keyboard',configuration,async(page,config)=>{
   await setKind(page,'gauge');await page.getByLabel('Review chart data',{exact:true}).selectOption('precision');const observations=[];
   for(const [locale,precision] of [['ja-JP','9'],['de-DE','2'],['ar-EG','2']]){
    await page.getByLabel('Review locale',{exact:true}).selectOption(locale);await page.getByLabel('Review number precision',{exact:true}).selectOption(precision);
    const expected=[2.123456789,5.987654321,9.555555555].map(value=>new Intl.NumberFormat(locale,{minimumFractionDigits:precision==='2'?2:0,maximumFractionDigits:Number(precision)}).format(value));
    await expect.poll(async()=>{const drawing=await measureSvg(page);return expected.every(text=>drawing.texts.some(item=>item.text===text));}).toBe(true);
    const option=await inspect(page),gauges=option.series.filter(item=>item.type==='gauge');expect(gauges).toHaveLength(3);expect(gauges.map(item=>item.data[0].value)).toEqual([2.123456789,5.987654321,9.555555555]);
    const drawing=await measureSvg(page),checks=checkDrawing(drawing,['Cell0','Cell1','Cell2',...expected]);
    const tickTexts=Array.from({length:11},(_,index)=>new Intl.NumberFormat(locale,{minimumFractionDigits:precision==='2'?2:0,maximumFractionDigits:Number(precision)}).format(index*10));
    for(const item of gauges){expect(item.splitNumber).toBe(10);expect(item.axisLabel.rotate).toBe('radial');expect(typeof item.radius).toBe('number');expect(item.center.every(value=>typeof value==='number')).toBe(true);}
    const tickCounts=tickTexts.map(text=>({text,count:drawing.texts.filter(item=>item.text===text).length}));for(const tick of tickCounts)expect(tick.count,'All 11 complete gauge ticks: '+tick.text).toBe(3);
    const nativeScroll=await nativePlotNavigation(page);
    const selections=[];
    for(const item of gauges){const point=await pointerTarget(page,item);expect(point,'Actual native needle hit for '+item.data[0].id).toBeTruthy();await page.mouse.click(point.x,point.y);await expect(page.locator('#chart-selection')).toHaveText(item.data[0].applicationSeriesId+'/'+item.data[0].id);selections.push({point,actual:await page.locator('#chart-selection').textContent()});}
    await page.locator('#review-chart').getByRole('button',{name:'Cell0を選択',exact:true}).press('Space');await expect(page.locator('#chart-selection')).toHaveText('series/one');
    await page.locator('#review-chart .ui-specialist-surface').screenshot({path:new URL(`drawings/${config.profile}-${config.width}-${config.direction}-gauge-${locale}.png`,evidence).pathname});observations.push({locale,precision,expected,tickCounts,nativeScroll,drawing,checks,selections,raw:gauges.map(item=>({id:item.id,center:item.center,radius:item.radius,data:item.data}))});
   }
   await page.getByLabel('Review chart data',{exact:true}).selectOption('duplicates');await expect.poll(async()=>(await inspect(page)).series.filter(item=>item.type==='gauge').length).toBe(4);const duplicateOption=await inspect(page),duplicate=duplicateOption.series.find(item=>item.data?.[0]?.applicationSeriesId==='second-series'),point=await pointerTarget(page,duplicate);expect(point).toBeTruthy();await page.mouse.click(point.x,point.y);await expect(page.locator('#chart-selection')).toHaveText('second-series/one');
   const count=await page.locator('#chart-selections').textContent();await page.getByLabel('Review chart disabled',{exact:true}).check();await expect(page.locator('#review-chart').getByRole('button',{name:'Other cellを選択',exact:true})).toBeDisabled();await page.mouse.click(point.x,point.y);await expect(page.locator('#chart-selections')).toHaveText(count);await page.getByLabel('Review chart disabled',{exact:true}).uncheck();await page.getByLabel('Review chart busy',{exact:true}).check();await expect(page.locator('#review-chart').getByRole('button',{name:'Other cellを選択',exact:true})).toBeDisabled();await page.mouse.click(point.x,point.y);await expect(page.locator('#chart-selections')).toHaveText(count);await page.getByLabel('Review chart busy',{exact:true}).uncheck();
   await page.getByLabel('Review chart data',{exact:true}).selectOption('edge');await expect.poll(async()=>(await inspect(page)).series.filter(item=>item.type==='gauge').length).toBe(2);
   const edgeOption=await inspect(page),edgeGauges=edgeOption.series.filter(item=>item.type==='gauge');expect(edgeGauges.map(item=>item.data[0].value)).toEqual([0,9999999999999.875]);
   const fullName='Full original point label must remain available through the typed data table even when gauge SVG title is truncated';await expect(page.locator('#review-chart table')).toContainText(fullName);await expect(page.locator('#review-chart table')).toContainText('未取得');
   const edgeLocale=await page.getByLabel('Review locale',{exact:true}).inputValue(),largeFormatted=new Intl.NumberFormat(edgeLocale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(9999999999999.875);await expect(page.locator('#review-chart table')).toContainText(largeFormatted);
   const edgeDrawing=await measureSvg(page),edgeChecks=checkDrawing(edgeDrawing,[]);expect(edgeDrawing.texts.map(item=>item.text).join('')).toContain(largeFormatted);
   const zeroPoint=await pointerTarget(page,edgeGauges[0]);expect(zeroPoint,'zero value actual needle').toBeTruthy();await page.mouse.click(zeroPoint.x,zeroPoint.y);await expect(page.locator('#chart-selection')).toHaveText('series/one');await page.locator('#review-chart').getByRole('button',{name:'Cell1を選択',exact:true}).press('Space');await expect(page.locator('#chart-selection')).toHaveText('series/two');
   const rawBeforeHide=await page.locator('#chart-source').textContent();await page.getByRole('checkbox',{name:'Heat cellsの系列を表示',exact:true}).uncheck();await expect.poll(async()=>(await inspect(page)).series.length).toBe(0);await expect(page.locator('#chart-source')).toHaveText(rawBeforeHide);await expect(page.locator('#review-chart table')).toContainText(fullName);await page.getByRole('checkbox',{name:'Heat cellsの系列を表示',exact:true}).check();await expect.poll(async()=>(await inspect(page)).series.filter(item=>item.type==='gauge').length).toBe(2);
   const gaugeAX=await page.locator('#review-chart figure').ariaSnapshot();expect(gaugeAX).toContain('figure "Independent chart"');expect(gaugeAX).toContain(fullName);const gaugeAxe=await new AxeBuilder({page}).include('#review-chart').analyze();expect(gaugeAxe.violations).toEqual([]);await page.locator('#review-chart .ui-specialist-surface').screenshot({path:new URL(`drawings/${config.profile}-${config.width}-${config.direction}-gauge-edge.png`,evidence).pathname});await page.getByLabel('Review chart data',{exact:true}).selectOption('empty');await expect.poll(async()=>(await inspect(page)).series.length).toBe(0);await expect(page.locator('#review-chart table tbody tr')).toHaveCount(0);
   return{observations,edge:{AX:gaugeAX,axe:{violations:gaugeAxe.violations,incomplete:gaugeAxe.incomplete},raw:edgeGauges.map(item=>item.data[0]),largeFormatted,drawing:edgeDrawing,checks:edgeChecks,zeroNativeNeedle:true,largeNativeKeyboard:true,nullPreservedInTypedTable:true,hiddenKeepsRawAndTypedTable:true,emptyDoesNotInventGauge:true},duplicateIdOriginalSeriesSelection:'second-series/one',disabledBusyPreventCallbacks:true};
  });
  await run('native-AX-editor-group-and-completion-lifecycle',configuration,async(page,config)=>{
   await page.getByLabel('Review section',{exact:true}).selectOption('editors');await expect(page.locator('#rich .ui-rich-editor')).toBeVisible();await expect(page.locator('#rich').getByRole('button',{name:'Bold',exact:true})).toBeEnabled();const groups=[];
   for(const [section,name] of [['rich','Independent document formatting'],['markdown','Markdown modes']]){const group=page.locator('#'+section).getByRole('group',{name,exact:true});await expect(group).toBeVisible();const ax=await group.ariaSnapshot();expect(ax).toContain('group "'+name+'"');groups.push({section,name,ax});}
   await expect(page.locator('#rich').getByRole('button',{name:'Bold',exact:true})).toBeVisible();
   let editor=page.locator('#code .cm-content');await expect(editor).toBeVisible();const observations=[],observe=async name=>{const value=await relation(editor);validRelation(value);observations.push({name,...value});return value;};
   await editor.fill('rev');await editor.press('ControlOrMeta+Space');await expect(page.locator('#code .cm-tooltip-autocomplete')).toBeVisible();let open=await observe('open');expect(open.controls.length).toBeGreaterThan(0);expect(open.targets.some(target=>target.role==='listbox')).toBe(true);await editor.press('Escape');await expect(page.locator('#code .cm-tooltip-autocomplete')).toHaveCount(0);const closed=await observe('Escape');expect(closed.controls).toEqual([]);expect(closed.active).toBeNull();
   await page.getByLabel('Review code language',{exact:true}).selectOption('typescript');await observe('language-closed');await page.getByLabel('Review code readonly',{exact:true}).check();await expect(editor).toHaveAttribute('aria-readonly','true');await observe('readonly-closed');await page.getByLabel('Review code readonly',{exact:true}).uncheck();await page.getByRole('button',{name:'Review form disable code',exact:true}).click();await expect(editor).toHaveAttribute('aria-disabled','true');await observe('CVA-disabled-closed');await page.getByRole('button',{name:'Review form disable code',exact:true}).click();await expect(editor).toHaveAttribute('aria-disabled','false');
   await editor.fill('rev');await editor.press('ControlOrMeta+Space');await expect(page.locator('#code .cm-tooltip-autocomplete')).toBeVisible();open=await observe('open-before-destroy');await page.getByRole('button',{name:'Review remount editors',exact:true}).click();await expect(editor).toHaveCount(0);expect(await page.evaluate(ids=>ids.every(id=>!document.getElementById(id)),open.controls)).toBe(true);await page.getByRole('button',{name:'Review remount editors',exact:true}).click();editor=page.locator('#code .cm-content');await expect(editor).toBeVisible();await observe('remount-closed');await editor.fill('rev');await editor.press('ControlOrMeta+Space');await expect(page.locator('#code .cm-tooltip-autocomplete')).toBeVisible();await observe('remount-open');await page.locator('#code .cm-tooltip-autocomplete [role=option]').first().click();await expect(page.locator('#code-value')).toHaveText('reviewCompletion');await expect(page.locator('#code .cm-tooltip-autocomplete')).toHaveCount(0);expect((await observe('native-option-accept')).controls).toEqual([]);
   const axe=await new AxeBuilder({page}).include('#review-editors').analyze();expect(axe.violations).toEqual([]);await page.locator('#review-editors').screenshot({path:new URL(`drawings/${config.profile}-${config.width}-${config.direction}-editors.png`,evidence).pathname});
   return{groups,observations,axe:{violations:axe.violations,incomplete:axe.incomplete}};
  });
  await run('public-direct-native-worker-sheet-IO',configuration,async(page,config)=>{
   const requests=[];page.on('response',response=>{if(response.url().includes('sheet-formula.worker')||response.url().includes('/direct-consumer/chunks/'))requests.push({url:response.url(),status:response.status(),contentType:response.headers()['content-type']??null,at:performance.now()});});const started=performance.now();
   await page.getByLabel('Review section',{exact:true}).selectOption('sheet');const sheet=page.locator('#review-sheet'),a1=sheet.getByRole('textbox',{name:'A1',exact:true}),c1=sheet.getByRole('textbox',{name:'C1',exact:true});await expect(c1).toHaveValue('5',{timeout:12500});const calculatedAt=performance.now();expect(await c1.getAttribute('aria-invalid')).toBeNull();await expect(page.locator('#sheet-source')).toHaveText('{"rows":[[2,3,"=SUM(A1:B1)"],["001",5,"=C1*2"]]}');
   await a1.press('Enter');await a1.fill('88');await a1.press('Escape');await expect(a1).toHaveValue('2');await expect(c1).toHaveValue('5');await a1.press('Enter');await a1.fill('4');await a1.press('Enter');await expect(c1).toHaveValue('7');await expect(sheet.getByRole('textbox',{name:'C2',exact:true})).toHaveValue('14');
   await sheet.getByRole('button',{name:'数式を含むJSONを書き出す',exact:true}).click();expect(JSON.parse(await page.locator('#sheet-export').textContent())).toEqual({rows:[['4',3,'=SUM(A1:B1)'],['001',5,'=C1*2']]});await sheet.getByRole('button',{name:'CSVを書き出す',exact:true}).click();await expect(page.locator('#sheet-export')).toContainText('=SUM(A1:B1)');await expect(page.locator('#sheet-export')).toContainText('001');
   const beforeA1Source=await page.locator('#sheet-source').textContent();await a1.press(config.direction==='rtl'?'ArrowLeft':'ArrowRight');await expect(sheet.getByRole('textbox',{name:'B1',exact:true})).toBeFocused();await expect(page.locator('#sheet-source')).toHaveText(beforeA1Source);expect(requests.some(request=>request.url.includes('sheet-formula.worker')&&request.status===200&&request.contentType?.includes('javascript'))).toBe(true);return{initialFormula:5,updatedFormula:7,dependentFormula:14,initialDurationMs:calculatedAt-started,requests,source:await page.locator('#sheet-source').textContent(),draftEscapePreservesSource:true,RTLArrowUsesCurrentDirection:true};
  });
 }
}finally{await browser.close();}
if(rows.some(row=>!row.passed||row.errors.length))process.exitCode=1;
