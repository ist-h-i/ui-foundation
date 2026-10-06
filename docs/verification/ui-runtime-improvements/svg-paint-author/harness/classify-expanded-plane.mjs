import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const evidence=new URL('../evidence/',import.meta.url),browser=await chromium.launch({channel:'chromium'});
try{
 const context=await browser.newContext(),page=await context.newPage();await page.setContent('<html><body></body></html>');
 const result=await page.evaluate(async source=>{
  const ns='http://www.w3.org/2000/svg',root=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
  for(const text of [...root.querySelectorAll('text')])if(text.textContent!=='80'||text.getAttribute('y')!=='254.82612433112453')text.remove();
  if(root.querySelectorAll('text').length!==1){const fresh=new DOMParser().parseFromString(source,'image/svg+xml').documentElement,texts=[...fresh.querySelectorAll('text')],target=texts.find(text=>text.textContent==='80');for(const text of texts)if(text!==target)text.remove();root.replaceChildren(...fresh.childNodes);}
  for(const paint of [...root.querySelectorAll('path,rect,line,ellipse,polygon,image,circle,polyline,use')])if(!paint.closest('defs'))paint.remove();
  const width=Number(root.getAttribute('width')),height=Number(root.getAttribute('height'));
  const raster=async svg=>{const image=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});const c=document.createElement('canvas');c.width=Number(svg.getAttribute('width'));c.height=Number(svg.getAttribute('height'));const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return{width:c.width,height:c.height,pixels:ctx.getImageData(0,0,c.width,c.height).data};}finally{URL.revokeObjectURL(url);}};
  const original=await raster(root),variants=[];
  for(const method of ['viewBox','nestedViewport','translatedGroup','positiveOrigin'])for(const pad of [64, 100, 128, 242]){
   let expanded;
   if(method==='viewBox'){expanded=root.cloneNode(true);expanded.setAttribute('width',String(width+2*pad));expanded.setAttribute('height',String(height+2*pad));expanded.setAttribute('viewBox',`${-pad} ${-pad} ${width+2*pad} ${height+2*pad}`);}
   else if(method==='positiveOrigin'){expanded=root.cloneNode(true);expanded.setAttribute('width',String(width+2*pad));expanded.setAttribute('height',String(height+2*pad));}
   else{expanded=document.createElementNS(ns,'svg');expanded.setAttribute('xmlns',ns);expanded.setAttribute('width',String(width+2*pad));expanded.setAttribute('height',String(height+2*pad));if(method==='nestedViewport'){const nested=root.cloneNode(true);nested.setAttribute('x',String(pad));nested.setAttribute('y',String(pad));nested.style.overflow='visible';expanded.append(nested);}else{const group=document.createElementNS(ns,'g');group.setAttribute('transform',`translate(${pad},${pad})`);group.append(...[...root.childNodes].map(n=>n.cloneNode(true)));expanded.append(group);}}
   const actual=await raster(expanded),offset=method==='positiveOrigin'?0:pad;let mismatches=0,maxDelta=0,inkPresenceChanges=0,totalDelta=0;const examples=[];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=original.pixels[(y*width+x)*4+3],b=actual.pixels[((y+offset)*actual.width+x+offset)*4+3];if(a!==b){mismatches++;const delta=Math.abs(a-b);maxDelta=Math.max(maxDelta,delta);totalDelta+=delta;if((a>0)!==(b>0))inkPresenceChanges++;if(examples.length<5)examples.push({x,y,a,b,delta});}}
   variants.push({method,pad,mismatches,maxDelta,totalDelta,inkPresenceChanges,examples});
  }
  return{width,height,text:root.querySelector('text')?.outerHTML,variants};
 },await fs.readFile(new URL('v2-initial-expanded-reference/guided-320-ltr-ja-JP-9-precision.svg',evidence),'utf8'));
 await fs.writeFile(new URL('expanded-plane-classification.json',evidence),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await context.close();
}finally{await browser.close();}
