import fs from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const evidence=new URL('../evidence/',import.meta.url),server=JSON.parse(await fs.readFile(new URL('server.json',evidence),'utf8'));
const input=JSON.parse(await fs.readFile(new URL('pre-final-editor-matrix-native-probes.json',evidence),'utf8'));
const browser=await chromium.launch({channel:'chromium'}),rows=[];
function rgb(value){const match=/^rgba?\(([^)]+)\)$/.exec(value);if(!match)throw new Error('Unsupported computed color '+value);const values=match[1].split(/[,\s]+/).filter(Boolean).map(Number);return{rgb:values.slice(0,3),alpha:values[3]??1};}
function luminance(colors){const values=colors.map(value=>{const c=value/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});return .2126*values[0]+.7152*values[1]+.0722*values[2];}
function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
try{
 for(const original of input.rows.filter(row=>row.result?.axe?.incomplete?.length)){
  const context=await browser.newContext({viewport:{width:original.width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const row={profile:original.profile,width:original.width,direction:original.direction,originalAutomatedIncomplete:original.result.axe.incomplete.map(entry=>({id:entry.id,nodes:entry.nodes.length})),startedAt:new Date().toISOString()};
  try{
   await page.goto(`http://127.0.0.1:${server.port}/direct-consumer/index.html`);await page.getByLabel('Review profile',{exact:true}).selectOption(original.profile);await page.getByLabel('Review direction',{exact:true}).selectOption(original.direction);await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('Review section',{exact:true}).selectOption('editors');await page.getByLabel('Review code language',{exact:true}).selectOption('typescript');await expect(page.locator('#markdown .cm-content')).toBeVisible();await page.locator('#code .cm-content').fill('reviewCompletion');
   const targets=original.result.axe.incomplete.flatMap(entry=>entry.nodes.flatMap(node=>node.target));row.targets=[];
   for(const selector of targets){const locator=page.locator('#review-editors').locator(selector).first();await expect(locator).toBeVisible();const measured=await locator.evaluate(async line=>{
    const styles=[];for(let el=line;el;el=el.parentElement){const s=getComputedStyle(el);styles.push({tag:el.tagName,class:el.className,color:s.color,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity});}
    const scroller=line.closest('.cm-scroller'),contents=[];const walker=document.createTreeWalker(line,NodeFilter.SHOW_TEXT);for(let node=walker.nextNode();node;node=walker.nextNode())if(node.textContent?.trim())contents.push(node);
    const samples=[];
    for(const node of contents){for(const index of [...new Set([0,Math.floor(node.textContent.length/2),node.textContent.length-1])]){
     const range=document.createRange();range.setStart(node,index);range.setEnd(node,index+1);const rangeRect=()=>range.getBoundingClientRect();line.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});await new Promise(requestAnimationFrame);
     for(let attempt=0;attempt<3;attempt++){const r=rangeRect(),s=scroller.getBoundingClientRect();if(r.x>=s.x&&r.right<=s.right)break;scroller.scrollLeft+=(r.x+r.width/2)-(s.x+s.width/2);await new Promise(requestAnimationFrame);}
     const r=rangeRect(),element=node.parentElement,style=getComputedStyle(element),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);let background=null;const chain=[];
     for(let parent=element;parent;parent=parent.parentElement){const s=getComputedStyle(parent);chain.push({background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity});if(!background&&/^rgb\(/.test(s.backgroundColor))background=s.backgroundColor;}
     samples.push({character:node.textContent[index],text:node.textContent,foreground:style.color,background,fontSize:style.fontSize,fontWeight:style.fontWeight,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:hit?.tagName??null,visible:!!hit&&(line===hit||line.contains(hit)),chain});range.detach();
    }}
    return{text:line.textContent,styleChain:styles,scroller:{clientWidth:scroller.clientWidth,scrollWidth:scroller.scrollWidth,direction:getComputedStyle(scroller).direction},samples};
   });
   for(const sample of measured.samples){const foreground=rgb(sample.foreground),background=rgb(sample.background);sample.ratio=ratio(foreground.rgb,background.rgb);sample.conservativeMinimum=4.5;sample.conditionsSupported=foreground.alpha===1&&background.alpha===1&&sample.chain.every(style=>style.image==='none'&&style.opacity==='1');sample.colorMeetsThreshold=sample.conditionsSupported&&sample.ratio>=4.5;}
   row.targets.push({selector,...measured});
   }
   row.observationComplete=row.targets.every(target=>target.samples.length&&target.samples.every(sample=>sample.visible&&sample.conditionsSupported&&sample.colorMeetsThreshold));row.errors=errors;
  }catch(error){row.observationComplete=false;row.failure=String(error);row.errors=errors;}
  finally{row.endedAt=new Date().toISOString();rows.push(row);await context.close();await fs.writeFile(new URL('cm-incomplete-observation.json',evidence),JSON.stringify({source:'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',scope:'independent visible glyph CSS/background and native local scroll observations; automated incomplete is retained, not rewritten',rows},null,2)+'\n');console.log(JSON.stringify({profile:row.profile,direction:row.direction,complete:row.observationComplete,failure:row.failure,targets:row.targets?.length}));}
 }
}finally{await browser.close();}
if(rows.some(row=>!row.observationComplete||row.errors.length))process.exitCode=1;
