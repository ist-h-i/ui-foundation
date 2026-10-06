import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,extname,sep} from 'node:path';
import {inflateSync} from 'node:zlib';

const out='/tmp/ui-foundation-collections-contrast-audit';
const snapshot=out+'/snapshot-main-8d01adc';
const assets=snapshot+'/dist/fixture-app';
const require=createRequire(snapshot+'/package.json');
const {chromium,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const sourceHead='8d01adc6497addd97428507a0d3239dbe093a6a9';
const original=JSON.parse(await readFile(snapshot+'/docs/verification/ui-library-collections-2026-10-06.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left});

function decodePNG(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),depth=bytes[24],type=bytes[25],interlace=bytes[28];
  assert.equal(depth,8);assert.equal(interlace,0);assert.ok([2,6].includes(type));
  const channels=type===6?4:3,idat=[];let offset=8;
  while(offset<bytes.length){const length=bytes.readUInt32BE(offset),kind=bytes.subarray(offset+4,offset+8).toString();if(kind==='IDAT')idat.push(bytes.subarray(offset+8,offset+8+length));offset+=12+length;}
  const data=inflateSync(Buffer.concat(idat)),stride=width*channels,pixels=Buffer.alloc(height*stride);let src=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=data[src++];for(let x=0;x<stride;x++){const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;const delta=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;assert.ok(Number.isFinite(delta));pixels[y*stride+x]=(data[src++]+delta)&255;}}
  return {width,height,pixel:(x,y)=>{if(x<0||x>=width||y<0||y>=height)return null;const i=y*stride+x*channels;return [...pixels.subarray(i,i+3),channels===4?pixels[i+3]:255];}};
}
const rgba=value=>{const n=value.match(/[\d.]+/g)?.map(Number);assert.ok(n&&n.length>=3,'Unknown computed CSS color: '+value);return [n[0],n[1],n[2],n[3]??1];};
const composite=(fg,bg)=>[...fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3])),1];
const luminance=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const la=luminance(a),lb=luminance(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);};

const measureNodes=()=>{
  const R=r=>({x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left});
  const intersection=(a,b)=>{const left=Math.max(a.left,b.left),top=Math.max(a.top,b.top),right=Math.min(a.right,b.right),bottom=Math.min(a.bottom,b.bottom);return {left,top,right:Math.max(left,right),bottom:Math.max(top,bottom),x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};};
  const who=e=>e?{tag:e.tagName,id:e.id,class:e.className,role:e.getAttribute('role'),ariaLabel:e.getAttribute('aria-label'),text:e.textContent?.trim().slice(0,100)}:null;
  return ['0994','0995','0996'].flatMap(number=>{
    const row=document.querySelector('[data-list-value="option'+number+'"]');
    if(!row)return [{value:'option'+number,missing:true}];
    return [...row.querySelectorAll(':scope>span')].map((node,index)=>{
      const style=getComputedStyle(node),box=R(node.getBoundingClientRect()),range=document.createRange();range.selectNodeContents(node);const textRects=[...range.getClientRects()].map(R);
      const ancestors=[],clipLimits=[];let clip={left:0,top:0,right:innerWidth,bottom:innerHeight,x:0,y:0,width:innerWidth,height:innerHeight};
      for(let e=node;e;e=e.parentElement){
        const cs=getComputedStyle(e),r=e.getBoundingClientRect(),entry={...who(e),rect:R(r),backgroundColor:cs.backgroundColor,backgroundImage:cs.backgroundImage,opacity:cs.opacity,filter:cs.filter,mixBlendMode:cs.mixBlendMode,overflowX:cs.overflowX,overflowY:cs.overflowY,clipPath:cs.clipPath,color:cs.color};ancestors.push(entry);
        if(e!==node&&(['auto','scroll','hidden','clip'].includes(cs.overflowX)||['auto','scroll','hidden','clip'].includes(cs.overflowY))){
          const bounds={left:['auto','scroll','hidden','clip'].includes(cs.overflowX)?r.left+e.clientLeft:-Infinity,right:['auto','scroll','hidden','clip'].includes(cs.overflowX)?r.left+e.clientLeft+e.clientWidth:Infinity,top:['auto','scroll','hidden','clip'].includes(cs.overflowY)?r.top+e.clientTop:-Infinity,bottom:['auto','scroll','hidden','clip'].includes(cs.overflowY)?r.top+e.clientTop+e.clientHeight:Infinity};
          clip=intersection(clip,bounds);clipLimits.push({...who(e),bounds:{...bounds},intersection:{...clip}});
        }
      }
      const visible=intersection(box,clip),area=box.width*box.height,visibleArea=visible.width*visible.height,center={x:box.x+box.width/2,y:box.y+box.height/2};
      const samplePoints=visibleArea>0?[{x:Math.floor(visible.left+3),y:Math.floor((visible.top+visible.bottom)/2)},{x:Math.floor(visible.left+5),y:Math.floor(visible.top+2)}].filter(p=>p.x>=visible.left&&p.x<visible.right&&p.y>=visible.top&&p.y<visible.bottom).map(p=>{const hit=document.elementFromPoint(p.x,p.y);return {...p,hit:who(hit),hitOwn:hit===node||node.contains(hit)};}):[];
      const centerHit=center.x>=0&&center.x<innerWidth&&center.y>=0&&center.y<innerHeight?document.elementFromPoint(center.x,center.y):null;
      const viewport=row.closest('cdk-virtual-scroll-viewport');const vr=viewport.getBoundingClientRect();const viewportClip={left:vr.left+viewport.clientLeft,top:vr.top+viewport.clientTop,right:vr.left+viewport.clientLeft+viewport.clientWidth,bottom:vr.top+viewport.clientTop+viewport.clientHeight};const withinViewport=intersection(box,viewportClip);
      return {value:'option'+number,kind:index===0?'group':'label',selector:'#'+row.id+' > '+(index===0?'.ui-listbox-group[aria-hidden="true"]':'span:nth-child(2)'),nodeId:row.id,text:node.textContent,ariaHidden:node.getAttribute('aria-hidden'),row:{...who(row),rect:R(row.getBoundingClientRect()),selected:row.getAttribute('aria-selected'),disabled:row.getAttribute('aria-disabled'),active:row.classList.contains('ui-listbox-option--active')},computed:{color:style.color,backgroundColor:style.backgroundColor,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight,opacity:style.opacity,textShadow:style.textShadow},rect:box,textRects,visibleRect:visible,visibleTextRects:textRects.map(r=>intersection(r,clip)),visibilityFraction:area?visibleArea/area:0,viewportPaintedArea:withinViewport.width*withinViewport.height,classification:withinViewport.width*withinViewport.height===0?'outside-virtual-viewport-buffer':visibleArea===0?'outside-page-viewport':visibleArea>=area-.5?'fully-visible':'partially-clipped',ancestors,clipLimits,logicalRectCenterHit:who(centerHit),logicalRectCenterHitsOwn:centerHit===node||node.contains(centerHit),samplePoints,viewport:{rect:R(vr),scrollTop:viewport.scrollTop,clientHeight:viewport.clientHeight,scrollHeight:viewport.scrollHeight,clientWidth:viewport.clientWidth,scrollWidth:viewport.scrollWidth},deliveredFontSizeAt100Percent:index===0?(document.querySelector('main').dataset.uiProfile==='guided'?16:14):(document.querySelector('main').dataset.uiProfile==='guided'?18:16)};
    });
  });
};

const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://127.0.0.1').pathname,file=resolve(assets,'.'+(pathname==='/'||pathname.startsWith('/catalog')?'/index.html':decodeURIComponent(pathname)));if(!file.startsWith(assets+sep)){res.writeHead(403).end();return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
let browser;const states=[],occurrences=[],actions=[],pictures=[];
const report={sourceHead,originalSourceHead:original.runtimeHead,originalProofSha256:hash(await readFile(snapshot+'/docs/verification/ui-library-collections-2026-10-06.json')),startedAtUTC:new Date().toISOString(),port:5335,assets:{},states,occurrences,actions,pictures,method:{contrastThreshold:4.5,user200PercentDoesNotReduceThreshold:true,alpha:'Compute CSS foreground/background alpha compositing; record every ancestor. Observed opacity1/no images/filter/mix-blend required for complete pair judgment.',pixelReading:'Read original lossless Chromium PNG bytes; no image changes. Count exact foreground RGB and sample background in clipped painted region.',originalReportsUnmodified:true}};
for(const name of ['index.html','main.js','styles.css'])report.assets[name]=hash(await readFile(assets+'/'+name));
try{
  await new Promise((yes,no)=>{server.once('error',no);server.listen(5335,'127.0.0.1',yes);});
  browser=await chromium.launch({channel:'chromium',headless:true});report.browserVersion=browser.version();
  for(const profile of ['guided','dense']){
    const context=await browser.newContext({viewport:{width:320,height:900},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const cdp=await context.newCDPSession(page);
    const frames=()=>page.evaluate(()=>new Promise(resolve=>{let n=12;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);}));
    const keyboard=async key=>{actions.push({profile,type:'native-page-keyboard',key});await page.keyboard.press(key);};
    const button=async id=>{actions.push({profile,type:'native-locator-click',id});await page.locator('#'+id).click();};
    const box=page.getByRole('listbox',{name:'確認する候補',exact:true}),viewport=page.locator('ui-listbox cdk-virtual-scroll-viewport');
    const state=async(name,scan=true)=>{
      await frames();const nodes=await page.evaluate(measureNodes),path=out+'/images/'+profile+'-'+name+'.png';await page.screenshot({path});const pngBytes=await readFile(path),png=decodePNG(pngBytes);
      for(const node of nodes){
        if(node.missing)continue;
        const simple=node.ancestors.every(a=>Number(a.opacity)===1&&a.backgroundImage==='none'&&a.filter==='none'&&a.mixBlendMode==='normal')&&node.computed.textShadow==='none';
        let bg=[255,255,255,1];for(const ancestor of [...node.ancestors].reverse())bg=composite(rgba(ancestor.backgroundColor),bg);
        const foreground=rgba(node.computed.color),fg=composite(foreground,bg),ratio=contrast(fg,bg);
        node.contrast={foregroundCSS:node.computed.color,foregroundRGBA:foreground,effectiveForegroundRGB:fg.slice(0,3),effectiveBackgroundRGB:bg.slice(0,3),ratio,threshold:4.5,completeAlphaModelForObservedStyles:simple,meetsMinimum:simple&&ratio>=4.5,appliesToCurrentPaint:node.visibilityFraction>0};
        node.samplePoints=node.samplePoints.map(point=>({...point,pixelRGBA:png.pixel(point.x,point.y)}));
        const r=node.visibleRect;let exactForegroundPixels=0,exactBackgroundPixels=0,totalPixels=0;
        for(let y=Math.max(0,Math.ceil(r.top));y<Math.min(png.height,Math.floor(r.bottom));y++)for(let x=Math.max(0,Math.ceil(r.left));x<Math.min(png.width,Math.floor(r.right));x++){const pixel=png.pixel(x,y);totalPixels++;if(pixel.slice(0,3).every((v,i)=>v===Math.round(fg[i])))exactForegroundPixels++;if(pixel.slice(0,3).every((v,i)=>v===Math.round(bg[i])))exactBackgroundPixels++;}
        node.actualPNG={exactForegroundPixels,exactBackgroundPixels,totalPixels};
      }
      const fullAX=(await cdp.send('Accessibility.getFullAXTree')).nodes,axRows=[];
      await cdp.send('DOM.getDocument');
      for(const node of nodes.filter(n=>!n.missing&&n.kind==='label')){
        const doc=await cdp.send('DOM.getDocument');const found=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#'+node.nodeId});if(!found.nodeId)continue;const described=await cdp.send('DOM.describeNode',{nodeId:found.nodeId});const ax=fullAX.find(n=>n.backendDOMNodeId===described.node.backendNodeId),parent=fullAX.find(n=>n.nodeId===ax?.parentId);
        axRows.push({value:node.value,backendDOMNodeId:described.node.backendNodeId,ignored:ax?.ignored,nodeId:ax?.nodeId,role:ax?.role?.value,name:ax?.name?.value,properties:ax?.properties,parent:parent?{nodeId:parent.nodeId,role:parent.role?.value,name:parent.name?.value}:null});
      }
      const live=await box.evaluate(e=>({role:e.getAttribute('role'),name:e.getAttribute('aria-labelledby'),activeId:e.getAttribute('aria-activedescendant'),owns:e.getAttribute('aria-owns'),invalid:e.getAttribute('aria-invalid'),focused:document.activeElement===e,activeLabel:document.getElementById(e.getAttribute('aria-activedescendant'))?.getAttribute('aria-label'),renderedOptions:e.querySelectorAll('[role=option]').length}));
      const model=await page.locator('#selection-model').textContent(),entry={profile,name,capturedAtUTC:new Date().toISOString(),nodes,model,host:live,page:{scrollY:await page.evaluate(()=>scrollY),font:await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),dir:await page.locator('main').getAttribute('dir'),width:320,height:900,reducedMotion:'reduce',overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)},AX:{listboxes:fullAX.filter(n=>!n.ignored&&n.role?.value==='listbox').map(n=>({nodeId:n.nodeId,role:n.role.value,name:n.name?.value,properties:n.properties})),rows:axRows},image:{path,sha256:hash(pngBytes),width:png.width,height:png.height},errors:[...errors]};
      if(scan){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();const axePath=out+'/logs/'+profile+'-'+name+'-axe.json';await writeFile(axePath,JSON.stringify(axe,null,2)+'\n');entry.axe={version:axe.testEngine.version,path:axePath,violations:axe.violations,incomplete:axe.incomplete,passesColorContrast:axe.passes.find(r=>r.id==='color-contrast')};assert.deepEqual(axe.violations,[]);}
      assert.deepEqual(errors,[]);assert.equal(entry.page.overflow,false);assert.equal(entry.AX.listboxes.length,1);assert.ok(nodes.every(n=>!n.missing));
      states.push(entry);pictures.push({...entry.image,profile,state:name});console.log(JSON.stringify({profile,state:name,model,active:live.activeLabel,nodes:nodes.map(n=>({value:n.value,kind:n.kind,class:n.classification,ratio:n.contrast?.ratio,pixels:n.actualPNG?.exactForegroundPixels})),axeIncomplete:entry.axe?.incomplete.filter(r=>r.id==='color-contrast').flatMap(r=>r.nodes).length??null}));
      return entry;
    };
    await page.goto('http://127.0.0.1:5335/catalog/collections');await expect(page.locator('main')).toBeVisible();await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await page.getByLabel('RTL',{exact:true}).check();await frames();await box.focus();await keyboard('End');await expect(box).toHaveAttribute('aria-activedescendant',/31-30-30-30$/);await page.locator('ui-listbox').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
    const normal=await state('narrow-listbox');
    await button('listbox-invalid');await expect(page.locator('#selection-model')).toHaveText(/gone/);const invalid=await state('invalid-preserved-cva');
    for(const originalIndex of profile==='guided'?[1,2]:[8,9]){
      const old=original.drawing.axe[originalIndex],fresh=old.state==='narrow-listbox'?normal:invalid;
      const sourceNodes=old.incomplete.find(rule=>rule.id==='color-contrast').nodes;
      sourceNodes.forEach((oldNode,nodeIndex)=>{const number=oldNode.target[0].match(/6f-70-74-69-6f-6e-30-39-39-(34|35|36)/)?.[1],value='option099'+({'34':'4','35':'5','36':'6'}[number]),kind=oldNode.target[0].includes('.ui-listbox-group')?'group':'label';const node=fresh.nodes.find(n=>n.value===value&&n.kind===kind);assert.ok(node);const freshAxe=fresh.axe.incomplete.find(rule=>rule.id==='color-contrast')?.nodes.find(n=>n.target.includes(oldNode.target[0]));occurrences.push({occurrenceId:'axe-'+originalIndex+'-node-'+nodeIndex,originalAxeIndex:originalIndex,originalNodeIndex:nodeIndex,profile,state:old.state,originalSelector:oldNode.target[0],originalSummary:oldNode.summary,value,kind,freshSelector:node.selector,freshAxeIncompleteMatched:!!freshAxe,freshAxeSummary:freshAxe?.failureSummary,nodeMeasurement:node,originalImage:original.drawing.images.find(i=>i.profile===profile&&i.name==='listbox-320-200-rtl')?.path,independentImage:fresh.image});});
    }
    await box.focus();for(let n=0;n<6;n++)await keyboard('ArrowUp');await expect(box).toHaveAttribute('aria-activedescendant',/30-39-39-34$/);await viewport.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    await keyboard('Space');await expect(page.locator('#selection-model')).toHaveText(/gone/);const fullInvalid=await state('fully-visible-invalid');assert.ok(fullInvalid.nodes.every(n=>n.visibilityFraction>.999));
    await button('listbox-reset');await box.focus();await expect(page.locator('#selection-model')).toHaveText('[]');await keyboard('Space');await keyboard('ArrowDown');await keyboard('Space');await keyboard('ArrowUp');await viewport.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const first=await state('fully-visible-selected-0994-0995');assert.deepEqual(JSON.parse(first.model),['option0994','option0995']);assert.ok(first.nodes.every(n=>n.visibilityFraction>.999));
    await keyboard('Space');await keyboard('ArrowDown');await keyboard('ArrowDown');await keyboard('Space');await keyboard('ArrowUp');await keyboard('ArrowUp');await viewport.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const second=await state('fully-visible-selected-0995-0996');assert.deepEqual(JSON.parse(second.model),['option0995','option0996']);assert.ok(second.nodes.every(n=>n.visibilityFraction>.999));
    const vr=await viewport.boundingBox(),rowHeight=await page.locator('[data-list-value=option0994]').evaluate(e=>e.getBoundingClientRect().height);await page.mouse.move(vr.x+vr.width/2,vr.y+vr.height/2);actions.push({profile,type:'native-page-wheel',deltaY:rowHeight/2});await page.mouse.wheel(0,rowHeight/2);await frames();const partial=await state('native-wheel-partial-clip');assert.ok(partial.nodes.some(n=>n.visibilityFraction>0&&n.visibilityFraction<.999));
    for(const entry of [fullInvalid,first,second])for(const node of entry.nodes){assert.equal(node.contrast.completeAlphaModelForObservedStyles,true);assert.equal(node.contrast.meetsMinimum,true);assert.ok(node.actualPNG.exactForegroundPixels>0);assert.ok(node.samplePoints.some(p=>p.hitOwn));}
    await context.close();
  }
  assert.equal(occurrences.length,24);report.finishedAtUTC=new Date().toISOString();report.result='completed';report.actualExitCode=0;report.summary={originalOccurrences:24,freshOriginalIncompleteMatched:occurrences.filter(o=>o.freshAxeIncompleteMatched).length,originalClassification:occurrences.reduce((r,o)=>(r[o.nodeMeasurement.classification]=(r[o.nodeMeasurement.classification]??0)+1,r),{}),visibleMeasurements:states.flatMap(s=>s.nodes).filter(n=>n.visibilityFraction>0).length,minContrast:Math.min(...states.flatMap(s=>s.nodes.map(n=>n.contrast.ratio))),images:pictures.length,axeStates:states.filter(s=>s.axe).length,violations:states.flatMap(s=>s.axe?.violations??[]).length};
}catch(error){report.finishedAtUTC=new Date().toISOString();report.result='harness-or-product-failure';report.actualExitCode=1;report.error={name:error.name,message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
finally{if(browser)await browser.close();if(server.listening)await new Promise(yes=>server.close(yes));report.ownBrowserAndServerClosed=true;await writeFile(out+'/contrast-browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,actualExitCode:report.actualExitCode,summary:report.summary,error:report.error,serverClosed:report.ownBrowserAndServerClosed}));}
