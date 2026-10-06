import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const evidence=new URL('../evidence/',import.meta.url),rows=[];
const browser=await chromium.launch({channel:'chromium'});
try{
 for(const profile of ['guided','dense']){
  const context=await browser.newContext({viewport:{width:1000,height:1000}}),page=await context.newPage();
  try{
   await page.setContent('<!doctype html><html><body></body></html>');
   const source=await fs.readFile(new URL(profile+'-computed.svg',evidence),'utf8');
   const result=await page.evaluate(async source=>{
    const ns='http://www.w3.org/2000/svg',svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
    document.body.append(document.importNode(svg,true));const live=document.body.querySelector('svg');await document.fonts.ready;
    const width=Number(svg.getAttribute('width')),height=Number(svg.getAttribute('height')),texts=[...live.querySelectorAll('text')],paints=[...live.querySelectorAll('path,rect,line,ellipse,polygon,image,circle,polyline,use')].filter(el=>!el.closest('defs'));
    const bbox=node=>{const b=node.getBBox(),m=node.getCTM(),ps=[new DOMPoint(b.x,b.y),new DOMPoint(b.x+b.width,b.y),new DOMPoint(b.x,b.y+b.height),new DOMPoint(b.x+b.width,b.y+b.height)].map(p=>p.matrixTransform(m));return{x:Math.floor(Math.min(...ps.map(p=>p.x)))-2,y:Math.floor(Math.min(...ps.map(p=>p.y)))-2,right:Math.ceil(Math.max(...ps.map(p=>p.x)))+2,bottom:Math.ceil(Math.max(...ps.map(p=>p.y)))+2};};
    const geometries=texts.map(bbox),paintGeometries=paints.map(bbox),ordered=[...live.querySelectorAll('*')];
    const raster=async root=>{const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('SVG raster failed'));image.src=url;});const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,width,height).data;}finally{URL.revokeObjectURL(url);}};
    const removePaints=(root,predicate)=>{for(const el of [...root.querySelectorAll('path,rect,line,ellipse,polygon,image,circle,polyline,use')])if(!el.closest('defs')&&predicate(el))el.remove();};
    const full=await raster(svg),noStrokeRoot=svg.cloneNode(true);removePaints(noStrokeRoot,el=>el.hasAttribute('stroke')&&el.getAttribute('stroke')!=='none');const noStrokes=await raster(noStrokeRoot);
    const onlyTextRoot=svg.cloneNode(true);removePaints(onlyTextRoot,()=>true);const onlyText=await raster(onlyTextRoot);
    const background=[...svg.querySelectorAll('rect')].find(el=>Number(el.getAttribute('width'))>=width-1&&Number(el.getAttribute('height'))>=height-1);if(!background)throw Error('Native background missing');
    const labels=[];
    for(let index=0;index<texts.length;index++){
     const reference=svg.cloneNode(true),target=reference.querySelectorAll('text')[index];for(const el of [...reference.querySelectorAll('text')])if(el!==target)el.remove();removePaints(reference,()=>true);
     const mask=await raster(reference);reference.insertBefore(background.cloneNode(true),reference.firstChild);const expected=await raster(reference),b=geometries[index],solid=[],ink=[];
     for(let y=Math.max(0,b.y);y<Math.min(height,b.bottom);y++)for(let x=Math.max(0,b.x);x<Math.min(width,b.right);x++){const p=(y*width+x)*4;if(mask[p+3]>0)ink.push(p);if(mask[p+3]>=250)solid.push(p);}
     const delta=(p,data)=>Math.max(...[0,1,2].map(c=>Math.abs(expected[p+c]-data[p+c]))),mismatches=data=>solid.filter(p=>delta(p,data)>24),failed=mismatches(full),strokeFailures=mismatches(noStrokes);
     const contributors=[];
     if(failed.length){
      const candidates=paints.map((el,i)=>({el,i,b:paintGeometries[i]})).filter(({el,b:pb})=>el.hasAttribute('stroke')&&ordered.indexOf(el)>ordered.indexOf(texts[index])&&pb.x<b.right&&pb.right>b.x&&pb.y<b.bottom&&pb.bottom>b.y);
      for(const {el,i} of candidates){const reduced=svg.cloneNode(true),all=[...reduced.querySelectorAll('path,rect,line,ellipse,polygon,image,circle,polyline,use')].filter(el=>!el.closest('defs'));all[i].remove();const pixels=await raster(reduced),remaining=mismatches(pixels).length;if(remaining<failed.length)contributors.push({paintIndex:i,domIndex:ordered.indexOf(el),tag:el.tagName,attributes:Object.fromEntries([...el.attributes].map(a=>[a.name,a.value])),removedMismatchPixels:failed.length-remaining,remainingMismatchPixels:remaining,bounds:paintGeometries[i]});}
     }
     labels.push({index,text:texts[index].textContent,bounds:b,inkPixels:ink.length,solidPixels:solid.length,strictMismatchPixels:failed.length,noStrokesMismatchPixels:strokeFailures.length,contributorCount:contributors.length,contributors,examples:failed.slice(0,8).map(p=>({x:(p/4)%width,y:Math.floor(p/4/width),expected:Array.from(expected.slice(p,p+4)),actual:Array.from(full.slice(p,p+4)),withoutStrokes:Array.from(noStrokes.slice(p,p+4)),textOnly:Array.from(onlyText.slice(p,p+4))}))});
    }
    return{width,height,labels,totalSolidPixels:labels.reduce((n,r)=>n+r.solidPixels,0),strictMismatchPixels:labels.reduce((n,r)=>n+r.strictMismatchPixels,0),noStrokesMismatchPixels:labels.reduce((n,r)=>n+r.noStrokesMismatchPixels,0),allMismatchAttributableToLaterStrokes:labels.every(r=>r.noStrokesMismatchPixels===0&&r.contributors.reduce((n,c)=>n+c.removedMismatchPixels,0)===r.strictMismatchPixels)};
   },source);
   rows.push({profile,result});console.log(JSON.stringify({profile,strict:result.strictMismatchPixels,noStrokes:result.noStrokesMismatchPixels,attributable:result.allMismatchAttributableToLaterStrokes,contributors:result.labels.flatMap(r=>r.contributors).length}));
  }finally{await context.close();}
 }
}finally{await browser.close();}
await fs.writeFile(new URL('paint-classification.json',evidence),JSON.stringify({method:'Independent serialized exact native SVG controls; same Chromium renderer, root dimensions and original transforms; exact causal removal of individual later stroke paints. Original strict alpha>=250/RGBdelta>24 invariant retained.',rows},null,2)+'\n');
if(rows.some(row=>!row.result.allMismatchAttributableToLaterStrokes))process.exitCode=1;
