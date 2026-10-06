import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {Page, TestInfo} from '@playwright/test';

type Rgb = readonly [number, number, number];
const rgb = (value:string):Rgb => {
 const parts=value.match(/^rgba?\(([^)]+)\)$/)?.[1]?.split(/[,\s]+/).filter(Boolean).map(Number);
 assert(parts && parts.length>=3 && parts.every(Number.isFinite),'Unsupported computed color: '+value);
 assert(parts.length===3 || parts[3]===1,'Color alpha requires a separate compositor: '+value);
 return [parts[0]!,parts[1]!,parts[2]!];
};
const luminance=(value:Rgb):number=>value.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i]!,0);
export const contrast=(foreground:Rgb,background:Rgb):number=>{const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};

export async function checkedContract(page:Page,id:string,expected:'false'|'true'|'mixed'){
 const locator=page.locator('#'+id);assert.equal(await locator.getAttribute('aria-checked'),expected);
 const aria=await locator.ariaSnapshot();let ax:unknown={available:false,browser:page.context().browser()?.browserType().name()};
 if(page.context().browser()?.browserType().name()==='chromium'){
  const session=await page.context().newCDPSession(page);
  try{
   await session.send('DOM.enable');await session.send('Accessibility.enable');const {root}=await session.send('DOM.getDocument');
   const item=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id});const described=await session.send('DOM.describeNode',{nodeId:item.nodeId});
   const tree=await session.send('Accessibility.getPartialAXTree',{nodeId:item.nodeId,fetchRelatives:false});
   const owner=tree.nodes.find(node=>node.backendDOMNodeId===described.node.backendNodeId);assert(owner && !owner.ignored);assert.equal(owner.role?.value,'treeitem');
   assert.equal(String(owner.properties?.find(property=>property.name==='checked')?.value.value),expected,'Native AX checked state must match the programmatic tree state');
   const graphic=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id+' .ui-tree-check'});
   const graphicTree=await session.send('Accessibility.getPartialAXTree',{nodeId:graphic.nodeId,fetchRelatives:false});
   assert(graphicTree.nodes[0]?.ignored,'Decorative painted glyph must not create a duplicate AX control');
   ax={available:true,item:owner,decorativeGlyph:graphicTree.nodes};
  }finally{await session.detach();}
 }
 return {id,expected,aria,ax};
}

export async function popupContract(page:Page,id:string,expanded:boolean){
 const dom=await page.locator('#'+id).evaluate((element,expected)=>{
  const input=element as HTMLInputElement,ids=(input.getAttribute('aria-controls')??'').trim().split(/\s+/).filter(Boolean);
  const targets=ids.map(id=>({id,matches:[...document.querySelectorAll('[id]')].filter(node=>node.id===id)}));
  const target=targets[0]?.matches[0] as HTMLElement|undefined;
  const label=(input.labels?[...input.labels].map(label=>label.textContent?.trim()).join(' '):'');
  return {id:input.id,role:input.getAttribute('role'),haspopup:input.getAttribute('aria-haspopup'),expanded:input.getAttribute('aria-expanded'),readOnly:input.readOnly,label,ids,targetCounts:targets.map(target=>target.matches.length),targetRole:target?.getAttribute('role'),targetOpen:target?.matches(':popover-open'),focusWithinTarget:!!target?.contains(document.activeElement),expected};
 },expanded);
 assert.equal(dom.role,'combobox');assert.equal(dom.haspopup,'dialog');assert.equal(dom.expanded,String(expanded));
 assert(dom.label,'Combobox must have a native label');assert.equal(dom.ids.length,1,'One dialog reference is required');
 assert.deepEqual(dom.targetCounts,[1],'aria-controls must reference exactly one real element');
 assert.equal(dom.targetRole,'dialog');assert.equal(dom.targetOpen,expanded);
 const aria=await page.locator('#'+id).ariaSnapshot();assert(aria.includes('combobox'),'ARIA snapshot must expose combobox');
 let ax:unknown={available:false,browser:page.context().browser()?.browserType().name()};
 if(page.context().browser()?.browserType().name()==='chromium'){
  const session=await page.context().newCDPSession(page);
  try{
   await session.send('DOM.enable');await session.send('Accessibility.enable');
   const {root}=await session.send('DOM.getDocument');
   const control=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id});
   const popup=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+dom.ids[0]});
   const controlNode=await session.send('DOM.describeNode',{nodeId:control.nodeId});
   const popupNode=await session.send('DOM.describeNode',{nodeId:popup.nodeId});
   const controlTree=await session.send('Accessibility.getPartialAXTree',{nodeId:control.nodeId,fetchRelatives:false});
   const popupTree=await session.send('Accessibility.getPartialAXTree',{nodeId:popup.nodeId,fetchRelatives:false});
   const owner=controlTree.nodes.find(node=>node.backendDOMNodeId===controlNode.node.backendNodeId);
   const target=popupTree.nodes.find(node=>node.backendDOMNodeId===popupNode.node.backendNodeId);
   assert(owner && !owner.ignored,'Combobox must be present in native AX tree');assert.equal(owner.role?.value,'combobox');assert(owner.name?.value);
   assert.equal(owner.properties?.find(property=>property.name==='expanded')?.value.value,expanded);
   if(expanded){
    assert(target && !target.ignored);assert.equal(target.role?.value,'dialog');assert(target.name?.value);
    const refs=owner.properties?.find(property=>property.name==='controls')?.value.relatedNodes??[];
    assert(refs.some(reference=>reference.backendDOMNodeId===popupNode.node.backendNodeId),'Native AX controls must reference the open dialog');
   }else assert(!target || target.ignored,'Closed popup must be absent/ignored in native AX tree');
   ax={available:true,control:owner,popup:target,controlTree:controlTree.nodes,popupTree:popupTree.nodes};
  }finally{await session.detach();}
 }
 return {dom,aria,ax};
}

export async function graphicalPaint(page:Page,selector:string,testInfo:TestInfo,key:string){
 const locator=page.locator(selector);assert.equal(await locator.count(),1,'One graphical node must be measured');
 await locator.scrollIntoViewIfNeeded();
 const css=await locator.evaluate(element=>{
  const style=getComputedStyle(element),backgrounds=[];let background='';
  for(let parent:Element|null=element;parent;parent=parent.parentElement){
   const paint=getComputedStyle(parent);
   if(paint.backgroundImage!=='none'||paint.filter!=='none'||paint.mixBlendMode!=='normal'||Number(paint.opacity)!==1)throw new Error('Background compositor requires explicit additional analysis');
   backgrounds.push({tag:parent.tagName,id:parent.id,color:paint.backgroundColor});
   if(paint.backgroundColor!=='rgba(0, 0, 0, 0)' && paint.backgroundColor!=='transparent'){background=paint.backgroundColor;break;}
  }
  if(!background)throw new Error('No deterministic opaque background');
  const rect=element.getBoundingClientRect();
  return {text:element.textContent,ariaHidden:element.getAttribute('aria-hidden'),foreground:style.color,background,backgrounds,fontFamily:style.fontFamily,fontSize:style.fontSize,textShadow:style.textShadow,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
 });
 assert.equal(css.ariaHidden,'true');assert(css.text?.trim());assert.equal(css.textShadow,'none');
 const foreground=rgb(css.foreground),background=rgb(css.background),ratio=contrast(foreground,background);
 assert(ratio>=3,'Required graphical indication needs contrast >=3:1, observed '+ratio);
 const path=testInfo.outputPath('paint-'+key+'.png');
 const image=await locator.screenshot({path,animations:'disabled',caret:'hide'});
 const painted=await page.evaluate(async({data,foreground,background})=>{
  const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('2D canvas unavailable');context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,histogram:Record<string,number>={},inkMask:number[]=[];let foregroundCorePixels=0,backgroundPixels=0;
  const distance=(rgb:number[],reference:readonly number[])=>Math.max(...rgb.map((value,i)=>Math.abs(value-reference[i]!)));
  for(let i=0;i<pixels.length;i+=4){const color=[pixels[i]!,pixels[i+1]!,pixels[i+2]!],key=color.join(',');histogram[key]=(histogram[key]??0)+1;if(pixels[i+3]!==255)throw new Error('Unexpected transparent screenshot pixel');if(distance(color,foreground)<=12)foregroundCorePixels++;if(distance(color,background)<=2)backgroundPixels++;inkMask.push(distance(color,background)>32?1:0);}
  return {width:canvas.width,height:canvas.height,foregroundCorePixels,backgroundPixels,histogram,inkMask};
 },{data:image.toString('base64'),foreground,background});
 assert(painted.foregroundCorePixels>0,'Screenshot must contain painted glyph foreground core pixels');
 assert(painted.backgroundPixels>0,'Screenshot must contain the observed background');
 let fonts:unknown={available:false};
 if(page.context().browser()?.browserType().name()==='chromium'){
  const session=await page.context().newCDPSession(page);
  try{
   await session.send('DOM.enable');await session.send('CSS.enable');const {root}=await session.send('DOM.getDocument');
   const node=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector});const result=await session.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
   assert(result.fonts.some(font=>font.glyphCount>0),'An actual platform font must paint the glyph');fonts={available:true,fonts:result.fonts};
  }finally{await session.detach();}
 }
 const inkGeometrySha256=createHash('sha256').update(String(painted.width)+'x'+String(painted.height)+':').update(Buffer.from(painted.inkMask)).digest('hex');
 return {selector,css,contrast:ratio,requiredContrast:3,painted,fonts,inkGeometrySha256,screenshot:path,screenshotSha256:createHash('sha256').update(image).digest('hex')};
}

export async function clippedText(page:Page,selector:string){
 return page.locator(selector).evaluate(element=>{
  const style=getComputedStyle(element),rect=element.getBoundingClientRect(),clips=[];
  let left=0,top=0,right=innerWidth,bottom=innerHeight,background='';
  for(let parent:Element|null=element;parent;parent=parent.parentElement){
   const s=getComputedStyle(parent),r=parent.getBoundingClientRect();
   if(!background && s.backgroundColor!=='rgba(0, 0, 0, 0)' && s.backgroundColor!=='transparent')background=s.backgroundColor;
   if(parent!==element && /auto|scroll|hidden|clip/.test(s.overflowY+' '+s.overflowX)){
    const box={left:r.left+parent.clientLeft,top:r.top+parent.clientTop,right:r.left+parent.clientLeft+parent.clientWidth,bottom:r.top+parent.clientTop+parent.clientHeight};
    left=Math.max(left,box.left);top=Math.max(top,box.top);right=Math.min(right,box.right);bottom=Math.min(bottom,box.bottom);clips.push({tag:parent.tagName,id:parent.id,overflowX:s.overflowX,overflowY:s.overflowY,scrollTop:parent.scrollTop,box});
   }
  }
  const range=document.createRange();range.selectNodeContents(element);const fragments=[...range.getClientRects()].map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}));
  const visible=fragments.map(r=>{const x1=Math.max(r.left,left),y1=Math.max(r.top,top),x2=Math.min(r.right,right),y2=Math.min(r.bottom,bottom),area=Math.max(0,x2-x1)*Math.max(0,y2-y1),x=(x1+x2)/2,y=(y1+y2)/2;const hit=area>0?document.elementFromPoint(x,y):null;return {...r,visibleArea:area,fullArea:r.width*r.height,hitOwned:!!hit&&(hit===element||element.contains(hit)),hit:hit?{tag:hit.tagName,id:hit.id}:null};});
  return {selector:element.id,text:element.textContent,foreground:style.color,background,fontSize:style.fontSize,fontWeight:style.fontWeight,rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom},clips,visible};
 });
}
export function assertExposedText(value:Awaited<ReturnType<typeof clippedText>>){
 assert(value.visible.length>0);assert(value.visible.every(part=>part.fullArea===0||part.visibleArea>=part.fullArea-.5),'Every text fragment must fit its clipping region');
 assert(value.visible.every(part=>part.fullArea===0||part.hitOwned),'Visible text fragment hit-tests must belong to the same paragraph');
 const ratio=contrast(rgb(value.foreground),rgb(value.background));assert(ratio>=4.5,'Text contrast must be >=4.5:1');return ratio;
}
