/** Runs in the real browser. References retain the native root, transforms and computed font. */
export async function auditSvgPaint(svg){
 await document.fonts.ready;
 const ns='http://www.w3.org/2000/svg',width=svg.width.baseVal.value,height=svg.height.baseVal.value;
 const styleKeys=['font-family','font-size','font-weight','font-style','font-variant','font-stretch','dominant-baseline','text-anchor','direction','unicode-bidi','letter-spacing','word-spacing','fill','stroke','stroke-width','opacity'];
 const full=svg.cloneNode(true);full.setAttribute('xmlns',ns);full.setAttribute('width',String(width));full.setAttribute('height',String(height));full.style.position='static';full.style.direction=getComputedStyle(svg).direction;
 const originals=[...svg.querySelectorAll('text')],cloned=[...full.querySelectorAll('text')];
 const glyphs=originals.map((node,index)=>{const style=getComputedStyle(node);for(const key of styleKeys)cloned[index].style.setProperty(key,style.getPropertyValue(key));const b=node.getBBox(),m=node.getCTM(),corners=[new DOMPoint(b.x,b.y),new DOMPoint(b.x+b.width,b.y),new DOMPoint(b.x,b.y+b.height),new DOMPoint(b.x+b.width,b.y+b.height)].map(p=>p.matrixTransform(m));const bounds={left:Math.min(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),right:Math.max(...corners.map(p=>p.x)),bottom:Math.max(...corners.map(p=>p.y))};const clips=[];for(let owner=node;owner&&owner!==svg.parentElement;owner=owner.parentElement)for(const key of ['clip-path','mask','filter'])if(getComputedStyle(owner).getPropertyValue(key)!=='none')clips.push({tag:owner.tagName,key,value:getComputedStyle(owner).getPropertyValue(key)});return{index,text:node.textContent,fill:style.fill,opacity:style.opacity,font:style.font,fontSize:style.fontSize,bounds,clips};});
 const raster=async root=>{const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Independent SVG raster failed'));image.src=url;});const canvas=document.createElement('canvas');canvas.width=Number(root.getAttribute('width'));canvas.height=Number(root.getAttribute('height'));const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return{data:ctx.getImageData(0,0,canvas.width,canvas.height).data,png:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height};}finally{URL.revokeObjectURL(url);}};
 const paints='path,rect,line,ellipse,polygon,image,circle,polyline,use';
 const removePaints=root=>{for(const node of [...root.querySelectorAll(paints)])if(!node.closest('defs'))node.remove();};
 const nativeBackground=[...full.querySelectorAll('rect')].find(el=>Number(el.getAttribute('width'))>=width-1&&Number(el.getAttribute('height'))>=height-1);
 if(!nativeBackground)throw Error('Actual opaque SVG background not independently found');
 const actual=await raster(full),backgroundRoot=full.cloneNode(true);for(const text of [...backgroundRoot.querySelectorAll('text')])text.remove();const background=await raster(backgroundRoot);
 const luminance=rgb=>{const cs=rgb.map(v=>{const s=v/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;});return .2126*cs[0]+.7152*cs[1]+.0722*cs[2];};
 const ratio=(a,b)=>{const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(l[0]+.05)/(l[1]+.05);};
 const pad=Math.ceil(Math.max(...glyphs.map(g=>Math.max(g.bounds.right-g.bounds.left,g.bounds.bottom-g.bounds.top)),1))+4,inkOwnership=new Map(),inkIntersections=[],labels=[];
 for(const glyph of glyphs){
  if(!glyph.text?.trim())continue;
  const transparent=full.cloneNode(true),target=transparent.querySelectorAll('text')[glyph.index];for(const other of [...transparent.querySelectorAll('text')])if(other!==target)other.remove();removePaints(transparent);transparent.style.background='transparent';transparent.style.backgroundColor='transparent';
  const mask=await raster(transparent),expanded=transparent.cloneNode(true);expanded.setAttribute('width',String(width+pad*2));expanded.setAttribute('height',String(height+pad*2));expanded.setAttribute('viewBox',`${-pad} ${-pad} ${width+pad*2} ${height+pad*2}`);const unbounded=await raster(expanded);
  const reference=transparent.cloneNode(true);reference.insertBefore(nativeBackground.cloneNode(true),reference.firstChild);const expected=await raster(reference);
  const fg=glyph.fill.match(/[\d.]+/g)?.map(Number);if(!fg||fg.length!==3)throw Error('Unsupported foreground '+glyph.fill);
  let ink=0,solid=0,exactMismatch=0,strictMismatch=0,alphaPlaneMismatch=0,clippedInk=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const backgrounds=new Map(),examples=[];
  for(let y=0;y<unbounded.height;y++)for(let x=0;x<unbounded.width;x++){const alpha=unbounded.data[(y*unbounded.width+x)*4+3];if(alpha>0){const originalX=x-pad,originalY=y-pad;if(originalX<0||originalX>=width||originalY<0||originalY>=height)clippedInk++;}}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const p=(y*width+x)*4,alpha=mask.data[p+3],expandedAlpha=unbounded.data[((y+pad)*unbounded.width+x+pad)*4+3];if(alpha!==expandedAlpha)alphaPlaneMismatch++;
   if(alpha===0)continue;
   ink++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   const previous=inkOwnership.get(p);if(previous!==undefined)inkIntersections.push({x,y,a:previous,b:glyph.index});else inkOwnership.set(p,glyph.index);
   const delta=Math.max(...[0,1,2,3].map(c=>Math.abs(actual.data[p+c]-expected.data[p+c])));
   if(delta!==0){exactMismatch++;if(examples.length<4)examples.push({x,y,alpha,expected:Array.from(expected.data.slice(p,p+4)),actual:Array.from(actual.data.slice(p,p+4)),delta});}
   if(alpha>=250){solid++;if(delta>24)strictMismatch++;}
   const bg=Array.from(background.data.slice(p,p+4)),key=bg.join(',');if(!backgrounds.has(key))backgrounds.set(key,{rgb:bg,ratio:ratio(fg,bg.slice(0,3)),pixels:0});backgrounds.get(key).pixels++;
  }
  const colors=[...backgrounds.values()];labels.push({...glyph,inkPixels:ink,solidPixels:solid,exactMismatchPixels:exactMismatch,originalStrictMismatchPixels:strictMismatch,expandedReferenceAlphaMismatch:alphaPlaneMismatch,clippedInkPixels:clippedInk,inkBounds:ink?{left:minX,top:minY,right:maxX+1,bottom:maxY+1}:null,contrast:{foreground:fg,backgrounds:colors,minRatio:Math.min(...colors.map(c=>c.ratio)),allOpaque:colors.every(c=>c.rgb[3]===255),minimum:4.5},examples});
 }
 const fontBoxIntersections=[];for(let i=0;i<glyphs.length;i++)for(let j=i+1;j<glyphs.length;j++){const a=glyphs[i].bounds,b=glyphs[j].bounds,w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(w>0&&h>0)fontBoxIntersections.push({a:i,b:j,width:w,height:h});}
 return{width,height,png:actual.png,labels,inkIntersections,fontBoxIntersections,sourceSvg:new XMLSerializer().serializeToString(full),method:'All alpha>0 glyph pixels compared exactly (RGBA delta=0) with an independent one-label/native opaque-background reference at the original integer raster plane. Expanded same-plane reference checks clipping. Every glyph pixel background is sampled from an actual full drawing with text removed; no source drawing mutated. Original alpha>=250/delta>24 metrics retained independently.',totalInkPixels:labels.reduce((s,l)=>s+l.inkPixels,0),totalSolidPixels:labels.reduce((s,l)=>s+l.solidPixels,0),totalExactMismatchPixels:labels.reduce((s,l)=>s+l.exactMismatchPixels,0),originalStrictMismatchPixels:labels.reduce((s,l)=>s+l.originalStrictMismatchPixels,0),clippedInkPixels:labels.reduce((s,l)=>s+l.clippedInkPixels,0),expandedReferenceAlphaMismatch:labels.reduce((s,l)=>s+l.expandedReferenceAlphaMismatch,0),minimumContrastRatio:Math.min(...labels.map(l=>l.contrast.minRatio))};
}
