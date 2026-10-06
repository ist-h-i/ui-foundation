import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const buildProof=JSON.parse(await readFile('evidence/build-results.json','utf8')),cliProof=JSON.parse(await readFile('evidence/final-cli-results.json','utf8'));assert.equal(buildProof.consumerSourceSha256,createHash('sha256').update(await readFile('consumer.ts')).digest('hex'));assert.equal(buildProof.generatedManifestSha256,cliProof.generatedManifestSha);
const browser=await chromium.launch({channel:'chromium'}),results=[];
const key='移動先のタイムゾーンを明示してください。';
try{for(const profile of ['guided','dense']){
 const context=await browser.newContext({viewport:{width:1100,height:1000}}),page=await context.newPage();const errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push({type:m.type(),text:m.text()});});
 const result={profile,checks:[],errors,warnings};
 try{
  await page.goto('http://127.0.0.1:5343/schedule');await expect.poll(()=>page.evaluate(()=>!!window.consumer)).toBe(true);await page.evaluate(profile=>document.documentElement.setAttribute('data-ui-profile',profile),profile);
  const scheduler=page.locator('ui-scheduler'),editor=scheduler.locator('.ui-scheduler-move'),zone=page.locator('#schedule-zone-meeting');
  await scheduler.locator('[data-move-editor]').click();await expect(editor).toBeVisible();await expect(zone).toHaveValue('Asia/Tokyo');
  const original=await page.evaluate(()=>window.consumer.events());const handle=await zone.elementHandle();
  await zone.fill('');await editor.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(editor.getByRole('alert')).toHaveText(key);await expect(editor.getByRole('status')).toHaveText(key);
  assert.equal(await page.evaluate(()=>window.consumer.moves().length),0);await zone.focus();
  for(const prefix of ['D1 ','D2 ']){
   await page.evaluate(({key,prefix})=>window.consumer.locale.set({locale:'tr-TR',direction:'rtl',messages:{[key]:prefix+'Specify target timezone'}}),{key,prefix});
   await expect(page.locator('main')).toHaveAttribute('lang','tr-TR');await expect(editor.getByRole('alert')).toHaveText(prefix+'Specify target timezone');await expect(editor.getByRole('status')).toHaveText(prefix+'Specify target timezone');
   await expect(zone).toHaveValue('');await expect(zone).toBeFocused();assert.equal(await zone.evaluate((e,old)=>e===old,handle),true);
   result.checks.push({name:'existing library diagnostic and cached status follow '+prefix,pass:true});
  }
  await zone.fill('Asia/Tokyo');await expect(editor.getByRole('alert')).toHaveCount(0);
  const afterRepair=await editor.getByRole('status').innerText();result.checks.push({name:'editing clears cached error status',expected:'',actual:afterRepair,pass:afterRepair===''});
  await editor.screenshot({path:'evidence/scheduler-locale-after-repair-'+profile+'.png'});
  await zone.fill('');await editor.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('D2 Specify target timezone');
  const start=page.locator('#schedule-start-meeting');await start.fill('2026-10-06T10:30');await expect(editor.getByRole('status')).toHaveText('');await expect(editor.getByRole('alert')).toHaveText('D2 Specify target timezone');await expect(zone).toHaveValue('');
  result.checks.push({name:'native datetime edit clears cached status while retaining other invalid draft',pass:true});await start.fill('2026-10-06T10:00');await zone.fill('Asia/Tokyo');await expect(editor.getByRole('alert')).toHaveCount(0);
  await zone.fill('');await editor.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('D2 Specify target timezone');
  const resource=editor.locator('fieldset fieldset input[type=checkbox]').first();await resource.check();await expect(resource).toBeChecked();await expect(editor.getByRole('status')).toHaveText('');await expect(editor.getByRole('alert')).toHaveText('D2 Specify target timezone');await expect(zone).toHaveValue('');
  result.checks.push({name:'native resource checkbox clears cached status while retaining other invalid draft',pass:true});await resource.uncheck();await zone.fill('Asia/Tokyo');
  await editor.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(zone).toBeDisabled();
  const request=await page.evaluate(()=>window.consumer.moves().at(-1));assert.equal(request.event.data.amount,7);assert.equal(request.target.timeZone,'Asia/Tokyo');assert.equal(request.target.localStart,await start.inputValue());
  assert.equal(await page.evaluate(({id,key})=>window.consumer.scheduler().failMove(id,key),{id:request.requestId,key}),true);await expect(zone).toBeEnabled();await expect(editor.getByRole('status')).toHaveText(key);
  await page.evaluate(key=>window.consumer.locale.set({locale:'de-DE',messages:{[key]:'D3 Must not translate app failure'}}),key);await expect(page.locator('main')).toHaveAttribute('lang','de-DE');await expect(editor.getByRole('status')).toHaveText(key);
  result.checks.push({name:'app failure matching dictionary key remains raw',pass:true});
  await editor.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(zone).toBeDisabled();assert.equal(await page.evaluate(id=>window.consumer.scheduler().failMove(id,'old acknowledgement'),request.requestId),false);
  const second=await page.evaluate(()=>window.consumer.moves().at(-1));assert.ok(second.requestId>request.requestId);assert.deepEqual(await page.evaluate(()=>window.consumer.events()),original);
  assert.equal(await page.evaluate(id=>window.consumer.scheduler().failMove(id,'業務上の移動を拒否しました。'),second.requestId),true);await expect(zone).toHaveValue('Asia/Tokyo');await expect(zone).toBeEnabled();
  result.checks.push({name:'retry gets new request; stale result refused; source event unchanged',pass:true});
  result.requests=[request,second];result.sameDom=true;result.focusRetainedAcrossLocale=true;result.appEventsUnchanged=true;
  await editor.screenshot({path:'evidence/scheduler-locale-'+profile+'.png'});assert.deepEqual(errors,[]);result.pass=result.checks.every(check=>check.pass);
  const eventProblem='予定の日時には有効なオフセット付きISO文字列を指定してください。元の予定を保持しています。',layoutProblem='表示日・表示方式・週の開始日・一覧の日数を確認してください。';
  const requestCount=await page.evaluate(()=>window.consumer.moves().length);
  await page.evaluate(({original,eventProblem,layoutProblem})=>{window.consumer.locale.set({locale:'en-US',messages:{[eventProblem]:'D4 Invalid event ISO; original retained',[layoutProblem]:'D4 Invalid display date'}});window.consumer.events.set([{...original[0],start:'invalid-ISO'}]);},{original,eventProblem,layoutProblem});
  const eventAlert=scheduler.locator('.ui-scheduler-event > .ui-scheduler-error');await expect(eventAlert).toHaveText('D4 Invalid event ISO; original retained');assert.equal(await page.evaluate(()=>window.consumer.events()[0].start),'invalid-ISO');await expect(scheduler.locator('h3').filter({hasText:'確認会'})).toBeVisible();
  await page.evaluate(({eventProblem,layoutProblem})=>window.consumer.locale.set({locale:'de-DE',messages:{[eventProblem]:'D5 Invalid event ISO; original retained',[layoutProblem]:'D5 Invalid display date'}}),{eventProblem,layoutProblem});await expect(eventAlert).toHaveText('D5 Invalid event ISO; original retained');
  result.checks.push({name:'pure-model structural event diagnostic follows live dictionary without modifying app event',pass:true});
  await scheduler.screenshot({path:'evidence/scheduler-structural-event-'+profile+'.png'});
  await page.evaluate(original=>{window.consumer.events.set(original);window.consumer.date.set('invalid-date');},original);const layoutAlert=scheduler.locator('.ui-scheduler > .ui-scheduler-error');await expect(layoutAlert).toHaveText('D5 Invalid display date');assert.equal(await page.evaluate(()=>window.consumer.date()),'invalid-date');
  await page.evaluate(({eventProblem,layoutProblem})=>window.consumer.locale.set({locale:'tr-TR',messages:{[eventProblem]:'D6 Invalid event ISO',[layoutProblem]:'D6 Invalid display date'}}),{eventProblem,layoutProblem});await expect(layoutAlert).toHaveText('D6 Invalid display date');assert.deepEqual(await page.evaluate(()=>window.consumer.events()),original);assert.equal(await page.evaluate(()=>window.consumer.moves().length),requestCount);
  result.checks.push({name:'pure-model structural layout diagnostic follows live dictionary without modifying app date/events/requests',pass:true});await scheduler.screenshot({path:'evidence/scheduler-structural-layout-'+profile+'.png'});result.structuralAppValuesRetained=true;assert.deepEqual(errors,[]);result.pass=result.checks.every(check=>check.pass);
 }catch(error){result.pass=false;result.error=String(error);result.stack=error.stack;await page.screenshot({path:'evidence/scheduler-locale-failure-'+profile+'.png'});}finally{results.push(result);await context.close();console.log(JSON.stringify({profile,pass:result.pass,failed:result.checks.filter(check=>!check.pass),error:result.error}));}
}}finally{await browser.close();const input=JSON.parse(await readFile('evidence/input-final.json','utf8')),sources={};for(const name of ['locale.ts','scheduler.ts','scheduler-controller.ts','scheduler-view.ts'])sources[name]=createHash('sha256').update(await readFile('templates/angular/'+name)).digest('hex');const controller=await readFile('templates/angular/scheduler-controller.ts','utf8'),sourceReview=['changedDate','changeDraft','moveResource'].map(method=>({method,messageTextCleared:controller.split('\n').find(line=>line.includes('protected '+method+'('))?.includes('messageText:undefined')===true,classification:'source review; native timezone/datetime/resource writers also exercised independently'}));await writeFile('evidence/scheduler-locale-results.json',JSON.stringify({inputSha256:input.sha256,sources,results,sourceReview},null,2)+'\n');}
process.exitCode=results.every(result=>result.pass)?0:1;
