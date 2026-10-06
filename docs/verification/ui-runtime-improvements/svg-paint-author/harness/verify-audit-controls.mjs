import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {auditSvgPaint} from './svg-paint-audit.mjs';

// Negative controls mutate a detached diagnostic copy, never the product or its positive evidence.
const source=new URL('../evidence/permanent-full34/guided-1280-ltr-ar-EG-2-precision.svg',import.meta.url);
const bytes=await fs.readFile(source),svgSource=bytes.toString();
const browser=await chromium.launch({channel:'chromium'}),context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
const output={source:source.pathname,sourceSha256:createHash('sha256').update(bytes).digest('hex'),scope:'Real browser raster negative controls on independent diagnostic copies; no product mutation',controls:[]};
async function load(){await page.setContent('<!doctype html><html><body style="margin:0">'+svgSource+'</body></html>');await page.evaluate(()=>document.fonts.ready);}
function summary(paint){return{labels:paint.labels.length,ink:paint.totalInkPixels,exactMismatches:paint.totalExactMismatchPixels,expandedAlphaMismatch:paint.expandedReferenceAlphaMismatch,clippedInk:paint.clippedInkPixels,minimumContrast:paint.minimumContrastRatio};}
try{
 await load();const baseline=await page.locator('svg').evaluate(auditSvgPaint);
 assert.equal(baseline.totalExactMismatchPixels,0);assert.equal(baseline.expandedReferenceAlphaMismatch,0);assert.equal(baseline.clippedInkPixels,0);assert.ok(baseline.minimumContrastRatio>=4.5);
 output.controls.push({name:'unmodified-native-plane',expected:'zero differences; contrast >= 4.5',observed:summary(baseline),passed:true});

 await load();await page.locator('svg').evaluate(svg=>{const node=[...svg.querySelectorAll('text')].find(n=>n.textContent==='٦٠٫٠٠');const b=node.getBBox(),m=node.getCTM(),p=[new DOMPoint(b.x,b.y),new DOMPoint(b.x+b.width,b.y),new DOMPoint(b.x,b.y+b.height),new DOMPoint(b.x+b.width,b.y+b.height)].map(p=>p.matrixTransform(m));const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',String(Math.min(...p.map(p=>p.x))-1));rect.setAttribute('y',String(Math.min(...p.map(p=>p.y))-1));rect.setAttribute('width',String(Math.max(...p.map(p=>p.x))-Math.min(...p.map(p=>p.x))+2));rect.setAttribute('height',String(Math.max(...p.map(p=>p.y))-Math.min(...p.map(p=>p.y))+2));rect.setAttribute('fill','white');svg.append(rect);});
 const overpaint=await page.locator('svg').evaluate(auditSvgPaint);assert.ok(overpaint.totalExactMismatchPixels>0,'Later drawing must fail exact paint');
 output.controls.push({name:'later-white-overpaint',expected:'exact mismatches > 0',observed:summary(overpaint),passed:true});

 await load();await page.locator('svg').evaluate(svg=>{[...svg.querySelectorAll('text')].find(n=>n.textContent==='٦٠٫٠٠').style.fill='rgb(255, 255, 255)';});
 const contrast=await page.locator('svg').evaluate(auditSvgPaint);assert.equal(contrast.minimumContrastRatio,1,'White text on actual white background must fail 4.5');
 output.controls.push({name:'white-on-white',expected:'minimum contrast 1 < 4.5',observed:summary(contrast),passed:true});

 await load();const clippedWidth=await page.locator('svg').evaluate(svg=>{const positions=[...svg.querySelectorAll('text')].map(n=>{const b=n.getBBox(),m=n.getCTM(),p=[new DOMPoint(b.x,b.y),new DOMPoint(b.x+b.width,b.y),new DOMPoint(b.x,b.y+b.height),new DOMPoint(b.x+b.width,b.y+b.height)].map(p=>p.matrixTransform(m));return{left:Math.min(...p.map(p=>p.x)),right:Math.max(...p.map(p=>p.x))};}).sort((a,b)=>b.right-a.right);const width=Math.floor((positions[0].left+positions[0].right)/2);svg.setAttribute('width',String(width));return width;});
 const clipping=await page.locator('svg').evaluate(auditSvgPaint);assert.ok(clipping.clippedInkPixels>0,'Zero-origin expansion must detect right-edge glyph clipping');
 output.controls.push({name:'right-edge-viewport-clipping',expected:'expanded-reference clipped ink > 0',viewportWidth:clippedWidth,observed:summary(clipping),passed:true});

 await load();const tickCountBefore=await page.locator('svg text').evaluateAll(nodes=>nodes.filter(n=>n.textContent==='١٠٫٠٠').length);assert.equal(tickCountBefore,3);
 await page.locator('svg').evaluate(svg=>{[...svg.querySelectorAll('text')].find(n=>n.textContent==='١٠٫٠٠').remove();});
 const tickCountAfter=await page.locator('svg text').evaluateAll(nodes=>nodes.filter(n=>n.textContent==='١٠٫٠٠').length);assert.equal(tickCountAfter,2);assert.notEqual(tickCountAfter,3);
 output.controls.push({name:'missing-one-of-three-required-ticks',expected:'count differs from independent series count 3',observed:{before:tickCountBefore,after:tickCountAfter},passed:true});
 output.allExpected=true;
}finally{
 await context.close();await browser.close();output.ownBrowserClosed=true;
 await fs.writeFile(new URL('../evidence/audit-negative-controls.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
}
console.log(JSON.stringify(output));
