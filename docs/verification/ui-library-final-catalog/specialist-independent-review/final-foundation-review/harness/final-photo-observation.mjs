import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium,expect} from '@playwright/test';
const evidence=new URL('../evidence/',import.meta.url),server=JSON.parse(await fs.readFile(new URL('server.json',evidence),'utf8'));
const browser=await chromium.launch({channel:'chromium'}),rows=[];
await fs.mkdir(new URL('final-photo-tiles/',evidence),{recursive:true});
try {for(const profile of ['guided','dense'])for(const direction of ['ltr','rtl']) {
 const context=await browser.newContext({viewport:{width:320,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const row={profile,direction,width:320,font:'200%',startedAt:new Date().toISOString(),frames:[]};
 try {
 await page.goto(`http://127.0.0.1:${server.port}/direct-consumer/index.html`);await page.getByLabel('Review profile',{exact:true}).selectOption(profile);await page.getByLabel('Review direction',{exact:true}).selectOption(direction);await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const svg=page.locator('#review-chart .ui-specialist-surface svg');
 for(const kind of ['line','gauge']) {
 await page.getByLabel('Review chart kind',{exact:true}).selectOption(kind);
 if(kind==='gauge'){await page.getByLabel('Review chart data',{exact:true}).selectOption('precision');await page.getByLabel('Review locale',{exact:true}).selectOption('de-DE');await page.getByLabel('Review number precision',{exact:true}).selectOption('2');await expect(svg).toContainText('2,12');}
 await expect(svg).toBeVisible();const targets=kind==='line'?['縦座標','横座標','Heat cells']:['0,00','50,00','100,00','Cell0','2,12'];
 for(let i=0;i<targets.length;i++) {
 const text=targets[i],node=svg.locator('text').filter({hasText:new RegExp('^'+text.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'$')}).first();
 await expect(node).toBeVisible();await node.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));await expect.poll(()=>node.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el.ownerSVGElement.contains(hit);})).toBe(true);
 const observed=await node.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),region=el.closest('.ui-specialist-plot-scroll');return{text:el.textContent,font:s.fontSize,rect:{x:r.x,y:r.y,width:r.width,height:r.height},glyphHitIsOwnSVG:el.ownerSVGElement.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),region:{label:region.getAttribute('aria-label'),left:region.scrollLeft,client:region.clientWidth,scroll:region.scrollWidth,direction:getComputedStyle(region).direction},document:{width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},tableDirection:getComputedStyle(el.closest('ui-chart').querySelector('table')).direction};});
 const path=new URL(`final-photo-tiles/${profile}-320-${direction}-${kind}-anchor${i}.png`,evidence);await page.screenshot({path:path.pathname,fullPage:false});const bytes=await fs.readFile(path);row.frames.push({...observed,path:path.pathname,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 }
 row.observationComplete=true;
 }catch(e){row.observationComplete=false;row.failure=String(e);}
 finally{row.errors=errors;row.endedAt=new Date().toISOString();rows.push(row);await context.close();await fs.writeFile(new URL('final-photo-observation.json',evidence),JSON.stringify({scope:'native 320/font200 visual tiles reached through actual current scroll state; observed native frame reachability, not additional product test count',rows},null,2)+'\n');console.log(JSON.stringify({profile,direction,frames:row.frames.length,complete:row.observationComplete,errors,failure:row.failure}));}
 }}finally{await browser.close();}
if(rows.some(r=>!r.observationComplete||r.errors.length))process.exitCode=1;
