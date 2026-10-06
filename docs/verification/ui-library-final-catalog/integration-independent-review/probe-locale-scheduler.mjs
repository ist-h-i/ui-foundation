import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
const report={kind:'Independent public Scheduler owned/raw locale lifetime + Diff native selection + Json raw diagnostics',sourceSha256:{},checks:[],runtime:[],console:[],profiles:[],cleanup:null};
for(const name of ['locale.ts','scheduler-controller.ts','scheduler-view.ts','diff-json.ts'])report.sourceSha256[name]=createHash('sha256').update(await readFile('repository/templates/angular/'+name)).digest('hex');
function check(name,actual,expected){const passed=JSON.stringify(actual)===JSON.stringify(expected);report.checks.push({name,actual,expected,passed});console.log((passed?'PASS ':'FAIL ')+name+' actual='+JSON.stringify(actual)+' expected='+JSON.stringify(expected));}
const hits=[];const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://own').pathname;if(name==='/favicon.ico')return res.writeHead(204).end();hits.push(name);const file=resolve('dist-locale-scheduler','.'+(name==='/'?'/index.html':name));if(!file.startsWith(resolve('dist-locale-scheduler')+'/'))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':{'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html'}[extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 for(const profile of ['guided','dense']){
  const context=await browser.newContext({viewport:{width:1000,height:1050}}),page=await context.newPage();page.on('pageerror',e=>report.runtime.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))report.console.push(m.type()+': '+m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(p=>window.__localeSchedulerReview.profile.set(p),profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);await expect(page.locator('ui-diff-viewer .cm-content')).toHaveCount(2);await expect(page.locator('[data-move-editor]')).toBeEnabled();
  await page.locator('[data-move-editor]').click();const zone=page.locator('[id="native-scheduler-zone-raw%2Devent"]'),request=page.locator('.ui-scheduler-actions button').filter({hasText:/^Request move$/}),status=page.locator('.ui-scheduler-move > p[role=status]');
  await zone.fill('Invalid/Zone');await request.click();await expect(status).toHaveText('Invalid move zone');await zone.focus();await zone.evaluate(el=>{window.__schedulerZone=el;el.setSelectionRange(3,8);});
  const before=await page.evaluate(()=>({events:window.__localeSchedulerReview.events(),requests:window.__localeSchedulerReview.requests().length,allow:window.__localeSchedulerReview.allowCalls()})),beforeHits=hits.length;
  await page.evaluate(()=>window.__localeSchedulerReview.change(2));await expect(status).toHaveText('Invalid move zone v2');
  check('Scheduler held library diagnostic follows dictionary '+profile,await status.innerText(),'Invalid move zone v2');
  check('Scheduler dictionary retains native draft/focus/caret '+profile,await zone.evaluate(el=>({same:el===window.__schedulerZone,focused:el===document.activeElement,value:el.value,start:el.selectionStart,end:el.selectionEnd})),{same:true,focused:true,value:'Invalid/Zone',start:3,end:8});
  check('Scheduler dictionary invokes no I/O/request/authorization '+profile,{hits:hits.slice(beforeHits),snapshot:await page.evaluate(()=>({events:window.__localeSchedulerReview.events(),requests:window.__localeSchedulerReview.requests().length,allow:window.__localeSchedulerReview.allowCalls()}))},{hits:[],snapshot:before});
  await zone.fill('UTC');await expect(page.locator('.ui-scheduler-move [role=alert]')).toHaveCount(0);await page.waitForTimeout(100);
  check('Scheduler editing clears previously held owned diagnostic '+profile,await status.innerText(),'');
  // Independent native recovery checks cover all three message-clearing writers.
  await zone.fill('Invalid/Zone');await request.click();await expect(status).toHaveText('Invalid move zone v2');
  const start=page.locator('[id="native-scheduler-start-raw%2Devent"]');await start.fill('2026-10-06T10:30');await expect(status).toHaveText('');
  check('Scheduler native date writer clears old owned message '+profile,await status.innerText(),'');await start.fill('2026-10-06T10:00');
  await request.click();await expect(status).toHaveText('Invalid move zone v2');
  const resource=page.locator('.ui-scheduler-move fieldset fieldset input[type=checkbox]');await resource.uncheck();await expect(status).toHaveText('');
  check('Scheduler native resource writer clears old owned message '+profile,await status.innerText(),'');await resource.check();await zone.fill('UTC');

  await request.click();await expect(page.locator('#request-count')).toHaveText('1');await expect(status).toHaveText('Move pending v2');
  const requested=await page.evaluate(()=>window.__localeSchedulerReview.requests()[0]);
  check('Scheduler emits raw app key/DTO and explicit move target '+profile,{key:requested.event.id,payload:requested.event.data,target:requested.target,eventUnchanged:await page.evaluate(()=>window.__localeSchedulerReview.events()[0].start)},{key:'raw-event',payload:{raw:'Application payload'},target:{localStart:'2026-10-06T10:00',localEnd:'2026-10-06T11:00:00',timeZone:'UTC',startDisambiguation:'reject',endDisambiguation:'reject',resourceIds:['raw-room']},eventUnchanged:'2026-10-06T10:00:00+00:00'});
  check('Scheduler accepts matching app failMove acknowledgement '+profile,await page.evaluate(()=>{const app=window.__localeSchedulerReview;return app.scheduler().failMove(app.requests()[0].requestId,'移動結果を確認しています。');}),true);
  await expect(status).toHaveText('移動結果を確認しています。');await page.evaluate(()=>window.__localeSchedulerReview.change(3));await page.waitForTimeout(100);
  check('Scheduler raw app failure matching dictionary key stays opaque '+profile,await status.innerText(),'移動結果を確認しています。');
  const contents=page.locator('ui-diff-viewer .cm-content');await expect(contents.nth(1)).toHaveAttribute('aria-label','App diff After v3');await page.locator('ui-diff-viewer input[type=search]').fill('alpha');await page.locator('ui-diff-viewer button').filter({hasText:/^Next after match$/}).click();
  await contents.nth(1).evaluate(el=>{window.__diffNative=el;});const selectionBefore=await page.evaluate(()=>({text:window.getSelection()?.toString(),focused:document.activeElement===window.__diffNative,doc:window.__diffNative.textContent}));const modelBefore=await page.evaluate(()=>window.__localeSchedulerReview.json().model());
  await page.evaluate(()=>window.__localeSchedulerReview.change(4));await expect(contents.nth(1)).toHaveAttribute('aria-label','App diff After v4');
  check('Diff vendor labels follow current dictionary '+profile,await contents.evaluateAll(el=>el.map(x=>x.getAttribute('aria-label'))),['App diff Before v4','App diff After v4']);
  check('Diff native focus/selection/doc/DOM retained '+profile,await page.evaluate(()=>({same:document.querySelectorAll('ui-diff-viewer .cm-content')[1]===window.__diffNative,text:window.getSelection()?.toString(),focused:document.activeElement===window.__diffNative,doc:window.__diffNative.textContent})),{same:true,...selectionBefore});
  const match=/^(\w+) at (\d+)$/.exec(modelBefore.error);check('Json UI localizes code/offset without changing raw model '+profile,{display:await page.locator('ui-json-viewer [role=alert]').innerText(),model:await page.evaluate(()=>window.__localeSchedulerReview.json().model()),source:await page.evaluate(()=>window.__localeSchedulerReview.jsonSource)},{display:match?'Parse v4 '+match[1]+'; offset '+match[2]:modelBefore.error,model:modelBefore,source:'{"raw": }'});
  
  await page.evaluate(()=>{const app=window.__localeSchedulerReview;app.scheduler().resetMoves();app.events.update(rows=>rows.map(row=>({...row,start:'not-an-ISO-instant'})));});
  const structural=page.locator('ui-scheduler .ui-scheduler-error[role=alert]');await expect(structural).toHaveCount(1);
  check('Scheduler invalid event structural diagnostic follows explicit dictionary '+profile,await structural.innerText(),'Invalid event instant');
  await page.evaluate(()=>window.__localeSchedulerReview.diagnosticsVersion(2));await expect(structural).toHaveText('Invalid event instant v2');
  check('Scheduler held structural event error follows live dictionary '+profile,await structural.innerText(),'Invalid event instant v2');

  await page.evaluate(()=>window.__localeSchedulerReview.breakZone());const configurationProblem=page.locator('ui-scheduler > section > p.ui-scheduler-error[role=alert]');await expect(configurationProblem).toHaveCount(1);
  check('Scheduler invalid configuration diagnostic follows explicit dictionary '+profile,await configurationProblem.innerText(),'Display locale and zone required v2');
  await page.evaluate(()=>window.__localeSchedulerReview.diagnosticsVersion(3));await expect(configurationProblem).toHaveText('Display locale and zone required v3');
  check('Scheduler held configuration error follows live dictionary '+profile,await configurationProblem.innerText(),'Display locale and zone required v3');
  check('Scheduler dictionary retains invalid raw source and prior request '+profile,await page.evaluate(()=>{const app=window.__localeSchedulerReview;return {start:app.events()[0].start,key:app.events()[0].id,data:app.events()[0].data,requests:app.requests().length,priorStart:app.requests()[0].event.start};}),{start:'not-an-ISO-instant',key:'raw-event',data:{raw:'Application payload'},requests:1,priorStart:'2026-10-06T10:00:00+00:00'});
  await page.evaluate(()=>window.__localeSchedulerReview.restoreStructure());await expect(structural).toHaveCount(0);await expect(page.locator('[data-move-editor]')).toBeEnabled();
  check('Scheduler native structure recovers without additional move request '+profile,await page.locator('#request-count').innerText(),'1');

report.profiles.push({profile,requested,selectionBefore,rawJsonModel:modelBefore});await page.screenshot({path:'evidence/locale-scheduler-'+profile+'.png',fullPage:true});await context.close();
 }
}catch(e){report.setupFailure=String(e.stack??e);console.log(report.setupFailure);}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));report.cleanup={browserClosed:!browser?.isConnected(),serverListening:server.listening};await writeFile('evidence/locale-scheduler-native.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(x=>!x.passed).length,runtime:report.runtime.length,console:report.console.length,cleanup:report.cleanup}));process.exitCode=report.setupFailure||report.checks.some(x=>!x.passed)||report.runtime.length||report.console.length?1:0;
