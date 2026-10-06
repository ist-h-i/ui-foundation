import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,extname} from 'node:path';
import {chromium,expect} from '@playwright/test';
const after=process.env.REVIEW_AFTER==='1';
const sha=path=>readFile(path).then(bytes=>createHash('sha256').update(bytes).digest('hex'));
const report={kind:'Independent public Card five-slot native narrow RTL 200% geometry; source CSS only',baseCommit:'60cd513e86099dffc756c10402a5262f466a34d0',afterSource:after,sourceSha256:await sha('repository/templates/angular/card.ts'),profiles:[],checks:[],runtime:[],console:[],cleanup:null,domCssOverride:false};
const check=(name,actual,expected)=>report.checks.push({name,actual,expected,passed:JSON.stringify(actual)===JSON.stringify(expected)});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://own').pathname;if(name==='/favicon.ico')return res.writeHead(204).end();res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[extname(name==='/'?'/index.html':name)]??'application/octet-stream'}).end(await readFile(resolve('dist-consumer','.'+(name==='/'?'/index.html':name))));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 for(const profile of ['guided','dense']){
  const page=await browser.newPage({viewport:{width:320,height:900}});
  page.on('pageerror',error=>report.runtime.push({profile,message:error.message}));
  page.on('console',msg=>{if(['error','warning'].includes(msg.type()))report.console.push({profile,type:msg.type(),message:msg.text()});});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(p=>{const app=window.__independentReview;app.changeSettings();app.profile.set(p);document.documentElement.style.fontSize='200%';},profile);
  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  await page.evaluate(()=>document.fonts.ready);
  const editor=page.locator('#card-editor');await editor.scrollIntoViewIfNeeded();
  await editor.fill('APP 保存 raw draft');await editor.focus();
  await editor.evaluate(el=>{window.__cardRetainedInput=el;el.setSelectionRange(2,6);});
  const other=profile==='guided'?'dense':'guided';
  await page.evaluate(p=>window.__independentReview.profile.set(p),other);
  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',other);
  await page.evaluate(p=>window.__independentReview.profile.set(p),profile);
  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  const geometry=await page.evaluate(()=>{
   const el=document.querySelector('#card-editor'),chain=[];
   for(let n=el;n&&n.nodeType===1;n=n.parentElement){const r=n.getBoundingClientRect(),s=getComputedStyle(n);chain.push({tag:n.tagName,id:n.id,class:n.className,left:r.left,right:r.right,width:r.width,display:s.display,grid:s.gridTemplateColumns,min:s.minInlineSize,max:s.maxInlineSize,padding:s.padding,box:s.boxSizing,font:s.fontSize});}
   return {chain,document:{client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},input:{value:el.value,same:el===window.__cardRetainedInput,focused:el===document.activeElement,start:el.selectionStart,end:el.selectionEnd},areas:Array.from(document.querySelectorAll('ui-card [data-card-area]')).map(n=>({area:n.dataset.cardArea,hidden:n.hidden}))};
  });
  const input=geometry.chain.find(n=>n.id==='card-editor'),body=geometry.chain.find(n=>n.class==='ui-card__body'),content=geometry.chain.find(n=>n.class==='ui-card__content');
  check('Card public five areas present '+profile,geometry.areas.map(n=>({area:n.area,hidden:n.hidden})),['header','media','body','footer','actions'].map(area=>({area,hidden:false})));
  check('Card raw input identity focus draft caret across profile '+profile,geometry.input,{value:'APP 保存 raw draft',same:true,focused:true,start:2,end:6});
  if(after){
   check('Card grid track body bounds fit content '+profile,{bodyWithinContent:body.left>=content.left-.5&&body.right<=content.right+.5,trackFits:Math.abs(parseFloat(content.grid)-content.width)<1},{bodyWithinContent:true,trackFits:true});
   check('Card native caller max100 input remains reachable '+profile,{inputWithinBody:input.left>=body.left-.5&&input.right<=body.right+.5,inputWithinViewport:input.left>=0&&input.right<=320,max:input.max},{inputWithinBody:true,inputWithinViewport:true,max:'100%'});
  }
  report.profiles.push({profile,geometry,productPassClaim:after});
  await page.screenshot({path:'evidence/card-slot-'+(after?'after-source':'before-source')+'-'+profile+'.png',fullPage:true});await page.close();
 }
 check('Card no native runtime or console errors',{runtime:report.runtime,console:report.console},{runtime:[],console:[]});
}finally{
 if(browser)await browser.close();await new Promise(done=>server.close(done));report.cleanup={browserClosed:!browser?.isConnected(),serverListening:server.listening};
 await writeFile('evidence/card-slot-'+(after?'after-source':'before-source')+'-geometry.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));if(report.checks.some(c=>!c.passed)||report.runtime.length||report.console.length)process.exitCode=1;
