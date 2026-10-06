import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,expect} from '@playwright/test';
const directory=resolve('masonry-followup');
const report={kind:'Independent actual native follow-up; no product changes',rootCommit:'53a785824b86a34ada3ee8619f710fad57117634',port:null,browser:null,results:[],runtimeErrors:[],consoleErrors:[],cleanup:null};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname;if(pathname==='/favicon.ico')return res.writeHead(204).end();const file=resolve(directory,'dist','.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(resolve(directory,'dist')+'/'))return res.writeHead(403).end();const data=await readFile(file);res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.css':'text/css','.html':'text/html','.map':'application/json'}[extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});report.port=server.address().port;
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 for(const profile of ['guided','dense']){
  const context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>report.runtimeErrors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))report.consoleErrors.push(m.type()+': '+m.text());});
  for(let repetition=0;repetition<8;repetition++){
   const result={profile,repetition,passed:false};report.results.push(result);
   await page.goto('http://127.0.0.1:'+report.port+'/');
   await expect(page.getByRole('heading',{name:'一覧・選択・スクロール・移動',exact:true})).toBeVisible();
   await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
   await page.waitForFunction(()=>Boolean(globalThis.__masonryFixture));
   const masonry=page.locator('ui-masonry');
   const heights=await masonry.locator('li').evaluateAll(rows=>rows.map(row=>row.getBoundingClientRect().height));expect(new Set(heights).size).toBeGreaterThan(1);result.heights=heights;
   // Observe actual native click after Angular's registered handler. This listener
   // reads the public fixture signal and native DOM only; no values are mutated.
   await page.locator('#masonry-columns').evaluate(button=>{
    const list=document.querySelector('ui-masonry ul');
    const snapshot=phase=>({phase,time:performance.now(),requested:globalThis.__masonryFixture.masonryColumns(),computed:getComputedStyle(list).columnCount,inline:list.style.columnCount});
    globalThis.__masonryObservations=[];
    new MutationObserver(()=>globalThis.__masonryObservations.push(snapshot('native-style-mutation'))).observe(list,{attributes:true,attributeFilter:['style']});
    button.addEventListener('click',()=>{globalThis.__masonryObservations.push(snapshot('after-registered-native-click-handler'));requestAnimationFrame(()=>globalThis.__masonryObservations.push(snapshot('next-animation-frame')));},{once:true});
   });
   await page.locator('#masonry-columns').click();
   result.immediate=await masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnCount);
   await expect.poll(()=>masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnCount)).toBe('2');
   result.afterPoll=await masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnCount);
   result.observations=await page.evaluate(()=>globalThis.__masonryObservations);
   const gap=await masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnGap);result.previousGap=gap;
   await page.locator('#masonry-gap').click();await expect.poll(()=>masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnGap)).not.toBe(gap);result.changedGap=await masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnGap);
   await page.setViewportSize({width:320,height:900});await page.locator('#masonry-breakpoints').click();await expect.poll(()=>masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnCount)).toBe('1');
   result.narrow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(result.narrow.scroll).toBeLessThanOrEqual(result.narrow.client+1);
   result.passed=true;console.log('PASS '+profile+' repetition '+repetition+' immediate='+result.immediate+' observed='+JSON.stringify(result.observations));
   await page.setViewportSize({width:1280,height:720});
  }
  await context.close();
 }
}catch(error){report.results.push({name:'native-failure',passed:false,error:String(error?.stack??error)});console.error(error);}finally{
 if(browser)await browser.close();await new Promise(done=>server.close(done));report.cleanup={browserClosed:!browser?.isConnected(),serverListening:server.listening};await writeFile(resolve(directory,'native-observations.json'),JSON.stringify(report,null,2)+'\n');
}
const failed=report.results.filter(r=>!r.passed).length+report.runtimeErrors.length+report.consoleErrors.length;
console.log(JSON.stringify({actualPassed:report.results.filter(r=>r.passed).length,failed,runtime:report.runtimeErrors.length,console:report.consoleErrors.length,cleanup:report.cleanup}));process.exitCode=failed?1:0;
