import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
const evidence=new URL('../evidence/',import.meta.url),rows=[];
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:process.cwd(),env:{...process.env,UI_FIXTURE_PORT:'52050'},stdio:['ignore','pipe','pipe']});
const serverExit=new Promise(resolve=>server.once('exit',(code,signal)=>resolve({code,signal,pid:server.pid})));
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('Own server exited before readiness')));});
 browser=await chromium.launch({channel:'chromium'});
 for(const profile of ['guided','dense']) {
 const context=await browser.newContext({viewport:{width:320,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),row={profile,direction:'rtl',width:320,font:'200%',locale:'ar-EG',startedAt:new Date().toISOString()},errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
 await page.goto('http://127.0.0.1:52050/direct-consumer/index.html');await page.getByLabel('Review profile',{exact:true}).selectOption(profile);await page.getByLabel('Review direction',{exact:true}).selectOption('rtl');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('Review chart kind',{exact:true}).selectOption('gauge');await page.getByLabel('Review chart data',{exact:true}).selectOption('precision');await page.getByLabel('Review locale',{exact:true}).selectOption('ar-EG');await page.getByLabel('Review number precision',{exact:true}).selectOption('2');
 const svg=page.locator('#review-chart .ui-specialist-surface svg');await expect(svg).toContainText(new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2}).format(2.123456789));
 row.observation=await svg.evaluate(async svg=>{
 await document.fonts.ready;const ns='http://www.w3.org/2000/svg',width=svg.width.baseVal.value,height=svg.height.baseVal.value,styles=['font-family','font-size','font-weight','font-style','font-variant','font-stretch','dominant-baseline','text-anchor','direction','unicode-bidi','letter-spacing','word-spacing','fill','stroke','stroke-width','opacity'];
 const full=svg.cloneNode(true);full.setAttribute('xmlns',ns);full.setAttribute('width',String(width));full.setAttribute('height',String(height));full.style.position='static';full.style.direction=getComputedStyle(svg).direction;
 const nodes=Array.from(svg.querySelectorAll('text')).filter(el=>el.textContent?.trim());const allOriginal=Array.from(svg.querySelectorAll('text')),allCloned=Array.from(full.querySelectorAll('text'));for(let i=0;i<allOriginal.length;i++)for(const key of styles)allCloned[i].style.setProperty(key,getComputedStyle(allOriginal[i]).getPropertyValue(key));
 const raster=async root=>{const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'})),image=new Image();try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Native SVG Image raster failed'));image.src=url;});return image;}finally{URL.revokeObjectURL(url);}};
 const actual=await raster(full),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(actual,0,0);const png=canvas.toDataURL('image/png'),labels=[];
 for(const node of nodes){
  const box=node.getBBox(),matrix=node.getCTM(),points=[new DOMPoint(box.x,box.y),new DOMPoint(box.x+box.width,box.y),new DOMPoint(box.x,box.y+box.height),new DOMPoint(box.x+box.width,box.y+box.height)].map(p=>p.matrixTransform(matrix)),left=Math.floor(Math.min(...points.map(p=>p.x)))-2,top=Math.floor(Math.min(...points.map(p=>p.y)))-2,w=Math.ceil(Math.max(...points.map(p=>p.x)))-left+2,h=Math.ceil(Math.max(...points.map(p=>p.y)))-top+2;
  const computed=getComputedStyle(node);
  const reference=full.cloneNode(true),referenceText=reference.querySelectorAll('text')[allOriginal.indexOf(node)];
  for(const other of [...reference.querySelectorAll('text')])if(other!==referenceText)other.remove();
  for(const paint of [...reference.querySelectorAll('path,rect,line,ellipse,polygon,image,circle,polyline,use')])if(!paint.closest('defs'))paint.remove();
  reference.style.background='transparent';reference.style.backgroundColor='transparent';
  const image=await raster(reference),mask=document.createElement('canvas');mask.width=width;mask.height=height;const maskCtx=mask.getContext('2d');maskCtx.drawImage(image,0,0);const expected=maskCtx.getImageData(left,top,w,h).data,observed=ctx.getImageData(left,top,w,h).data;let solid=0,mismatch=0;const examples=[];
  for(let i=0;i<expected.length;i+=4){if(expected[i+3]<250)continue;solid++;const delta=Math.max(Math.abs(expected[i]-observed[i]),Math.abs(expected[i+1]-observed[i+1]),Math.abs(expected[i+2]-observed[i+2]));if(delta>24){mismatch++;if(examples.length<5)examples.push({pixel:i/4,expected:Array.from(expected.slice(i,i+4)),actual:Array.from(observed.slice(i,i+4)),delta});}}
  labels.push({text:node.textContent,computedFill:computed.fill,font:computed.fontSize,bounds:{left,top,width:w,height:h},solidGlyphPixels:solid,actualCompositeMismatchPixels:mismatch,examples});
 }
 return{width,height,png,labels,method:'Entire actual native SVG including background rectangles/clipPaths/decals rasterized by the same real Chromium Image/Canvas; per-label solid alpha mask uses the exact same entire native SVG root, original transform attributes, width/height and raster plane with all other rendered paints removed; original nodes and definitions retained; compared with complete composite at identical pixel grid; no product drawing edited'};
 });
 const png=Buffer.from(row.observation.png.split(',')[1],'base64');delete row.observation.png;const path=new URL(`final-photo-tiles/${profile}-320-rtl-ar-EG-native-plane-complete-SVG.png`,evidence);await fs.writeFile(path,png);row.observation.image=path.pathname;row.observation.totalSolidPixels=row.observation.labels.reduce((n,r)=>n+r.solidGlyphPixels,0);row.observation.totalMismatchPixels=row.observation.labels.reduce((n,r)=>n+r.actualCompositeMismatchPixels,0);row.observationComplete=row.observation.totalMismatchPixels===0&&row.observation.labels.every(r=>r.solidGlyphPixels>0);
 }catch(e){row.observationComplete=false;row.failure=String(e);}
 finally{row.errors=errors;row.endedAt=new Date().toISOString();rows.push(row);await context.close();await fs.writeFile(new URL('actual-svg-native-plane-observation.json',evidence),JSON.stringify({scope:'Corrected same-original-transform actual painted-glyph occlusion check for narrow Arabic radial tick font-bbox warnings; original32 logs preserved',rows},null,2)+'\n');console.log(JSON.stringify({profile,completed:row.observationComplete,solidPixels:row.observation?.totalSolidPixels,mismatchPixels:row.observation?.totalMismatchPixels,failure:row.failure,errors}));}
 }
}finally{if(browser)await browser.close();server.kill('SIGTERM');const stopped=await serverExit;await fs.writeFile(new URL('actual-svg-native-plane-owned-cleanup.json',evidence),JSON.stringify({time:new Date().toISOString(),ownServer:stopped,root5187Touched:false,browserCloseAwaited:true},null,2)+'\n');}
if(rows.some(r=>!r.observationComplete||r.errors.length))process.exitCode=1;
