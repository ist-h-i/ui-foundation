import type {Locator,Page} from '@playwright/test';
import {test,expect,contexts,ready,environment,settle,host,destroy,record} from './css-override-test';

type Part={node:Text;text:string;range:Range;lines:number};
type Probe=HTMLElement&{__tourParts?:Part[];__tourWheel?:{trusted:boolean;inside:boolean;delta:number}[];__tourListener?:EventListener};

async function targetMatches(highlight:Locator,target:Locator){
 const expected=await target.boundingBox();expect(expected).not.toBeNull();
 await expect.poll(()=>highlight.evaluate((el,box)=>{const actual=el.getBoundingClientRect();return Math.max(Math.abs(actual.left-box!.x),Math.abs(actual.top-box!.y),Math.abs(actual.right-box!.x-box!.width),Math.abs(actual.bottom-box!.y-box!.height));},expected)).toBeLessThanOrEqual(1);
 return {target:expected,highlight:await highlight.boundingBox()};
}

/** Read every actual Text Range line; wheel delivery and native scrolling are separate observations. */
async function everyTextLine(page:Page,popup:Locator,label:string){
 const plan=await popup.evaluate(el=>{
  const parts:Part[]=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode()))if(node.textContent?.trim()){
   const text=node as Text,range=document.createRange();range.selectNodeContents(text);
   parts.push({node:text,text:text.data,range,lines:[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).length});
  }
  const probe=el as Probe;probe.__tourParts=parts;probe.__tourWheel=[];
  if(probe.__tourListener)el.removeEventListener('wheel',probe.__tourListener);probe.__tourListener=event=>{const wheel=event as WheelEvent;probe.__tourWheel!.push({trusted:wheel.isTrusted,inside:wheel.target instanceof Node&&el.contains(wheel.target),delta:wheel.deltaY});};el.addEventListener('wheel',probe.__tourListener,{passive:true});
  return {parts:parts.map((p,index)=>({index,text:p.text,lines:p.lines})),expected:parts.flatMap((p,index)=>Array.from({length:p.lines},(_,line)=>index+':'+line))};
 });
 expect(plan.parts.length).toBeGreaterThan(0);expect(plan.expected.length).toBeGreaterThan(0);for(const part of plan.parts)expect(part.lines).toBeGreaterThan(0);
 const read=()=>popup.evaluate(el=>{
  const parts=(el as Probe).__tourParts!,r=el.getBoundingClientRect(),clip={left:Math.max(0,r.left+el.clientLeft),right:Math.min(innerWidth,r.left+el.clientLeft+el.clientWidth),top:Math.max(0,r.top+el.clientTop),bottom:Math.min(innerHeight,r.top+el.clientTop+el.clientHeight)};
  const lines=parts.flatMap((p,index)=>{
   const effective={...clip};for(let ancestor=p.node.parentElement;ancestor&&ancestor!==el;ancestor=ancestor.parentElement){const s=getComputedStyle(ancestor),b=ancestor.getBoundingClientRect();if(/^(auto|scroll|hidden|clip)$/.test(s.overflowX)){effective.left=Math.max(effective.left,b.left+ancestor.clientLeft);effective.right=Math.min(effective.right,b.left+ancestor.clientLeft+ancestor.clientWidth);}if(/^(auto|scroll|hidden|clip)$/.test(s.overflowY)){effective.top=Math.max(effective.top,b.top+ancestor.clientTop);effective.bottom=Math.min(effective.bottom,b.top+ancestor.clientTop+ancestor.clientHeight);}}
   return [...p.range.getClientRects()].filter(b=>b.width>0&&b.height>0).map((b,line)=>({id:index+':'+line,rect:b.toJSON(),clip:effective,inside:b.left>=effective.left-1&&b.right<=effective.right+1&&b.top>=effective.top-1&&b.bottom<=effective.bottom+1}));
  });
  return {lines,changed:parts.flatMap((p,index)=>!p.node.isConnected||p.node.data!==p.text?[index]:[]),counts:parts.map(p=>[...p.range.getClientRects()].filter(r=>r.width>0&&r.height>0).length),top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight};
 });
 const wheel=async(delta:number)=>{
  const box=(await popup.boundingBox())!,point={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(point.x,point.y);
  expect(await popup.evaluate((el,p)=>{const hit=document.elementFromPoint(p.x,p.y);return !!hit&&el.contains(hit);},point)).toBe(true);
  const before=await popup.evaluate(el=>(el as Probe).__tourWheel!.length);await page.mouse.wheel(0,delta);
  await expect.poll(()=>popup.evaluate(el=>(el as Probe).__tourWheel!.length)).toBeGreaterThan(before);
  const delivered=await popup.evaluate((el,index)=>(el as Probe).__tourWheel!.slice(index),before);expect(delivered.length).toBeGreaterThan(0);
  for(const event of delivered){expect(event.trusted).toBe(true);expect(event.inside).toBe(true);expect(Math.sign(event.delta)).toBe(Math.sign(delta));}await settle(page);
 };
 let state=await read();if(state.top>0){await wheel(-100000);await expect.poll(()=>popup.evaluate(el=>el.scrollTop)).toBe(0);}
 state=await read();expect(state.total,'the long fixture genuinely requires native vertical scrolling').toBeGreaterThan(state.height);const step=state.height-Math.max(...state.lines.map(line=>line.rect.height))-8;expect(step).toBeGreaterThan(0);
 const reached=new Map<string,unknown>(),frames:unknown[]=[],budget=Math.ceil(state.total/step)+4;
 for(let sample=0;sample<budget;sample++){
  state=await read();expect(state.changed).toEqual([]);expect(state.counts).toEqual(plan.parts.map(p=>p.lines));
  for(const line of state.lines)if(line.inside&&!reached.has(line.id))reached.set(line.id,{sample,top:state.top,...line});
  frames.push({sample,top:state.top,visible:state.lines.filter(line=>line.inside).map(line=>line.id)});
  if(state.top+state.height>=state.total-1)break;
  const before=state.top;await wheel(step);await expect.poll(()=>popup.evaluate(el=>el.scrollTop)).toBeGreaterThan(before);
 }
 const missing=plan.expected.filter(id=>!reached.has(id));await record('tour-every-text-range-'+label,{plan,frames,reached:[...reached.values()],missing,wheels:await popup.evaluate(el=>(el as Probe).__tourWheel),terminal:state});
 expect(missing,'every nonempty Text Range line reaches the full effective clip').toEqual([]);expect(reached.size).toBe(plan.expected.length);expect(await popup.evaluate(el=>(el as Probe).__tourWheel!.length)).toBeGreaterThan(0);
 expect(state.top+state.height).toBeGreaterThanOrEqual(state.total-1);
}

async function everyAction(page:Page,popup:Locator,label:string){
 const enabled=popup.locator('button:not(:disabled)'),count=await enabled.count();expect(count).toBeGreaterThan(0);
 const targets=await enabled.elementHandles();await popup.evaluate(el=>(el as HTMLElement).focus());const observations=[];
 for(const [index,target]of targets.entries()){
  await page.keyboard.press('Tab');expect(await target.evaluate(el=>el===document.activeElement),'native Tab visits enabled action '+index).toBe(true);
  const metric=await target.evaluate(node=>{const el=node as Element;
   const r=el.getBoundingClientRect(),s=getComputedStyle(el),extent=Math.max(0,parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset)),popup=el.closest<HTMLElement>('[popover]')!,clip={left:0,right:innerWidth,top:0,bottom:innerHeight},ancestors=[];
   for(let a=el.parentElement;a;a=a.parentElement){const css=getComputedStyle(a),b=a.getBoundingClientRect(),x=a===popup||/^(auto|scroll|hidden|clip)$/.test(css.overflowX),y=a===popup||/^(auto|scroll|hidden|clip)$/.test(css.overflowY);if(x){clip.left=Math.max(clip.left,b.left+a.clientLeft);clip.right=Math.min(clip.right,b.left+a.clientLeft+a.clientWidth);}if(y){clip.top=Math.max(clip.top,b.top+a.clientTop);clip.bottom=Math.min(clip.bottom,b.top+a.clientTop+a.clientHeight);}ancestors.push({tag:a.tagName,x,y,box:b.toJSON()});if(a===popup)break;}
   const range=document.createRange();range.selectNodeContents(el);return {text:el.textContent,visible:el.matches(':focus-visible'),outline:parseFloat(s.outlineWidth),ring:{left:r.left-extent,right:r.right+extent,top:r.top-extent,bottom:r.bottom+extent},clip,ancestors,textRects:[...range.getClientRects()].filter(b=>b.width>0&&b.height>0).map(b=>b.toJSON()),hit:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
  });
  expect(metric.visible).toBe(true);expect(metric.outline).toBeGreaterThan(0);expect(metric.hit).toBe(true);expect(metric.textRects.length).toBeGreaterThan(0);
  for(const box of [metric.ring,...metric.textRects]){expect(box.left).toBeGreaterThanOrEqual(metric.clip.left-1);expect(box.right).toBeLessThanOrEqual(metric.clip.right+1);expect(box.top).toBeGreaterThanOrEqual(metric.clip.top-1);expect(box.bottom).toBeLessThanOrEqual(metric.clip.bottom+1);}observations.push({index,...metric});
 }
 await record('tour-all-enabled-native-tab-'+label,{count,observations});for(const target of targets)await target.dispose();return count;
}

for(const context of contexts)test(`tour reassessment ${context.name}: same-instance highlight, every message line, all native actions and retained target editor`,async({page})=>{
 test.setTimeout(120000);await ready(page,context);
 const message=Array.from({length:20},(_,i)=>`${i+1}番目の確認事項：申請内容と保存先を確認してください。入力した内容は案内を移動しても保持されます。Review the complete request before continuing.`).join(' ');
 const id=await page.evaluate(message=>{
  const scope=document.createElement('section');scope.id='tour-reassessment-targets';scope.style.cssText='padding-block-start:180px;min-block-size:2400px;';
  const label=document.createElement('label');label.textContent='申請の下書き';const input=document.createElement('input');input.id='tour-retained-draft';input.className='ui-field-control';input.setAttribute('aria-label','案内中も保持する申請');input.value='初期の申請';label.append(input);
  const second=document.createElement('button');second.type='button';second.id='tour-review-target';second.textContent='申請内容を確認する';second.style.marginBlockStart='24px';scope.append(label,second);document.querySelector('#runtime-slot')!.append(scope);
  input.focus();return (window as any).__runtime.create('Tour',{controlId:'reassessment-tour',open:false,steps:[{id:'draft',title:'申請内容を確認する',message,target:input},{id:'review',title:'保存先を確認する',message,target:second,placement:'top-end'}]});
 },message);
 const node=host(page,id),popup=node.locator('.ui-tour-popup'),highlight=node.locator('.ui-tour-highlight'),editor=page.getByRole('textbox',{name:'案内中も保持する申請',exact:true}),second=page.locator('#tour-review-target');
 const original=await editor.elementHandle();expect(original).not.toBeNull();await editor.fill('案内中も保持する下書き');
 await page.evaluate(id=>(window as any).__runtime.update(id,{open:true}),id);await expect(popup).toBeVisible();await expect(popup.getByRole('heading')).toHaveText('申請内容を確認する');
 const geometry=[{phase:'initial',...await targetMatches(highlight,editor)}];
 await everyTextLine(page,popup,context.name+'-draft');expect(await everyAction(page,popup,context.name+'-draft')).toBe(2);
 // Tour is nonmodal. Establish native keyboard focus on its business target before changing the environment.
 let focused=false;for(let tries=0;tries<12;tries++){await page.keyboard.press('Tab');if(await editor.evaluate(el=>el===document.activeElement)){focused=true;break;}}expect(focused,'native Tab can return to the nonmodal business editor').toBe(true);
 const changed=contexts.find(candidate=>candidate.profile!==context.profile&&candidate.font!==context.font&&candidate.dir!==context.dir)!;expect(changed).toBeTruthy();
 await environment(page,changed);await expect(editor).toBeFocused();await expect(editor).toHaveValue('案内中も保持する下書き');expect(await original!.evaluate(el=>el===document.querySelector('#tour-retained-draft'))).toBe(true);
 geometry.push({phase:'same-instance-environment',...await targetMatches(highlight,editor)});
 await page.evaluate(()=>scrollBy({top:60,behavior:'instant'}));await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);geometry.push({phase:'window-scroll',...await targetMatches(highlight,editor)});
 await everyTextLine(page,popup,context.name+'-changed');expect(await everyAction(page,popup,context.name+'-changed')).toBe(2);
 // Native Tab is the only means used to enter an action; Enter exercises the real next-step handler.
 await popup.evaluate(el=>(el as HTMLElement).focus());await page.keyboard.press('Tab');await expect(popup.getByRole('button',{name:'次へ',exact:true})).toBeFocused();await page.keyboard.press('Enter');
 await expect(popup.getByRole('heading')).toHaveText('保存先を確認する');geometry.push({phase:'next-step',...await targetMatches(highlight,second)});
 await everyTextLine(page,popup,context.name+'-review');expect(await everyAction(page,popup,context.name+'-review')).toBe(3);
 await expect(editor).toHaveValue('案内中も保持する下書き');expect(await original!.evaluate(el=>el===document.querySelector('#tour-retained-draft'))).toBe(true);
 await expect(popup.getByRole('button',{name:'案内を閉じる',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(popup).toBeHidden();await expect(highlight).toHaveCount(0);await expect(editor).toBeFocused();
 await record('tour-reassessment-geometry-'+context.name,{context,changed,geometry,events:await page.evaluate(id=>(window as any).__runtime.inspect(id).events,id)});
 await destroy(page,id);await original!.dispose();await page.locator('#tour-reassessment-targets').evaluate(el=>el.remove());
});
