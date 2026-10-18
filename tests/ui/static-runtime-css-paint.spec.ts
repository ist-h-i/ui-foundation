import {type Locator} from '@playwright/test';
import {test,expect,contexts,ready,environment,create,host,update,set,clear,settle,record,destroy,hiddenReveal} from './css-override-test';

/** Resolve only the semantic length. The requested scale/count arithmetic is independent of component CSS. */
async function avatarMeasure(node:Locator,scale:number,count:number|null){
 return node.evaluate((el,{scale,count})=>{
  const text=el.querySelector<HTMLElement>('.ui-avatar-fallback')!,style=getComputedStyle(text),hostStyle=getComputedStyle(el),box=el.getBoundingClientRect();
  const semantic=document.createElement('span');semantic.style.fontSize='var(--ui-text-avatar)';el.append(semantic);
  const expectedFont=count===null?parseFloat(hostStyle.fontSize):parseFloat(getComputedStyle(semantic).fontSize)*scale*.76/count;semantic.remove();
  const probe=document.createElement('span');probe.textContent=text.textContent;Object.assign(probe.style,{position:'fixed',visibility:'hidden',display:'inline-block',whiteSpace:'nowrap',fontFamily:style.fontFamily,fontWeight:style.fontWeight,fontSize:expectedFont+'px',lineHeight:'1'});el.append(probe);
  const range=document.createRange();range.selectNodeContents(text);const glyph=range.getBoundingClientRect();range.selectNodeContents(probe);const reference=range.getBoundingClientRect();probe.remove();
  const inner={left:box.left+parseFloat(hostStyle.borderLeftWidth),right:box.right-parseFloat(hostStyle.borderRightWidth),top:box.top+parseFloat(hostStyle.borderTopWidth),bottom:box.bottom-parseFloat(hostStyle.borderBottomWidth)};
  return {text:text.textContent,font:parseFloat(style.fontSize),expectedFont,glyph:glyph.toJSON(),reference:{width:reference.width,height:reference.height},inner,fit:glyph.left>=inner.left-1&&glyph.right<=inner.right+1&&glyph.top>=inner.top-1&&glyph.bottom<=inner.bottom+1,property:(el as HTMLElement).style.getPropertyValue('--ui-avatar-graphemes'),computedProperty:hostStyle.getPropertyValue('--ui-avatar-graphemes').trim(),priority:(el as HTMLElement).style.getPropertyPriority('--ui-avatar-graphemes')};
 },{scale,count});
}
async function avatarCheck(node:Locator,scale:number,count:number|null,requireFit:boolean,label:string){
 const m=await avatarMeasure(node,scale,count);await record(label,m);
 expect(Math.abs(m.font-m.expectedFont),'font arithmetic / native inherited fallback').toBeLessThanOrEqual(.02);
 expect(Math.abs(m.glyph.width-m.reference.width),'actual text matches independent native glyph width').toBeLessThanOrEqual(1);
 expect(Math.abs(m.glyph.height-m.reference.height),'actual text matches independent native glyph height').toBeLessThanOrEqual(1);
 if(requireFit)expect(m.fit,'all four glyph edges fit inside Avatar borders').toBe(true);
 return m;
}

type Pair={ink:string;surface:string};
const pairs:Record<string,Pair>={info:{ink:'text',surface:'background'},success:{ink:'success',surface:'success-surface'},warning:{ink:'warning',surface:'warning-surface'},error:{ink:'danger',surface:'error-surface'}};
const severities=['info','success','warning','error'] as const;
/** Foreground is compared on each real text consumer; transparent backgrounds are composited through ancestors. */
async function feedbackMeasure(node:Locator,pair:Pair|null){
 return node.evaluate((el,pair)=>{
  const frame=el.querySelector<HTMLElement>('.ui-feedback-frame')!;
  const probe=document.createElement('span');
  if(pair){probe.style.color=`var(--ui-color-${pair.ink})`;probe.style.backgroundColor=`var(--ui-color-${pair.surface})`;}
  else {probe.style.setProperty('--reference-invalid','bogus-colour');probe.style.color='var(--reference-invalid)';probe.style.backgroundColor='var(--reference-invalid)';}
  el.append(probe);const reference=getComputedStyle(probe),expected={color:reference.color,background:reference.backgroundColor};probe.remove();
  const rgba=(value:string)=>value.match(/[\d.]+/g)!.map(Number);
  const paint=(target:Element)=>{const chain:Element[]=[];for(let n:Element|null=target;n;n=n.parentElement)chain.push(n);let result=[255,255,255];for(const n of chain.reverse()){const c=rgba(getComputedStyle(n).backgroundColor),alpha=c[3]??1;result=result.map((v,i)=>c[i]!*alpha+v*(1-alpha));}return result;};
  const luminance=(rgb:number[])=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i]!,0);
  const background=paint(frame),bgLuminance=luminance(background);
  const consumers=[frame,frame.querySelector('h2')!,frame.querySelector('.ui-feedback-message')!].map((consumer,i)=>{const s=getComputedStyle(consumer),fg=luminance(rgba(s.color).slice(0,3));return {kind:['frame','title','message'][i],color:s.color,background:s.backgroundColor,contrast:(Math.max(fg,bgLuminance)+.05)/(Math.min(fg,bgLuminance)+.05)};});
  return {expected,consumers,effectiveBackground:background,properties:['--ui-feedback-ink','--ui-feedback-surface'].map(p=>({property:p,value:(el as HTMLElement).style.getPropertyValue(p),priority:(el as HTMLElement).style.getPropertyPriority(p)}))};
 },pair);
}
async function feedbackCheck(node:Locator,pair:Pair|null,contrast:'pass'|'fail'|'native',label:string){
 const m=await feedbackMeasure(node,pair);await record(label,m);
 for(const consumer of m.consumers){expect(consumer.color,consumer.kind+' foreground').toBe(m.expected.color);if(contrast==='pass')expect(consumer.contrast,consumer.kind+' normal-text contrast').toBeGreaterThanOrEqual(4.5);if(contrast==='fail')expect(consumer.contrast,consumer.kind+' deliberately unsuitable pair remains unsuitable').toBeLessThan(4.5);}
 expect(m.consumers[0]!.background,'frame background').toBe(m.expected.background);
 // Descendant title/message have transparent native backgrounds and paint on the frame.
 for(const consumer of m.consumers.slice(1))expect(consumer.background).toBe('rgba(0, 0, 0, 0)');
 return m;
}

for(const context of contexts)test.describe(`CSS paint ${context.name}`,()=>{
 test('display-css-cascade R065 Avatar own8 and input name/size/environment changes measure glyph fit and independent font',async({page})=>{
  await ready(page,context);const id=await create(page,'Avatar',{name:'👨‍👩‍👧‍👦 é',size:'medium'}),node=host(page,id);
  await avatarCheck(node,1,2,true,'avatar-normal-two');
  // Author stylesheet priority is a CSS cascade override; sharing the producer's inline storage is a different contract.
  const override=await page.addStyleTag({content:`[data-runtime-id="${id}"]{--ui-avatar-graphemes:8!important;}`});
  for(const [size,scale] of [['small',.75],['medium',1],['large',1.25]] as const){await update(page,id,{size});await avatarCheck(node,scale,8,true,'avatar-own-eight-'+size);}
  await update(page,id,{name:'ﬃ ﬃ',locale:'en-US'});const changed=await avatarCheck(node,1.25,8,true,'avatar-name-count-change-own-eight');expect(changed.text).toBe('FFIFFI');expect(changed.property).toBe('6');expect(changed.computedProperty).toBe('8');
  const other=contexts.find(c=>c.profile!==context.profile&&c.width!==context.width)!;await environment(page,other);await avatarCheck(node,1.25,8,true,'avatar-environment-update');
  await hiddenReveal(page,node);await avatarCheck(node,1.25,8,true,'avatar-reveal');
  await override.evaluate(el=>el.parentNode!.removeChild(el));await update(page,id,{name:'Alice Brown'});await avatarCheck(node,1.25,2,true,'avatar-normal-input-restored');
  await destroy(page,id);
 });
 test('display-css-cascade R065 Avatar inherit unset initial bogus consumer and native fallback are finite scoped expectations',async({page})=>{
  await ready(page,context);const id=await create(page,'Avatar',{name:'Alice Brown',size:'small'}),node=host(page,id),parent=page.locator('#runtime-slot');
  await set(parent,'--ui-avatar-graphemes','8');await avatarCheck(node,.75,2,true,'avatar-own-isolates-parent');
  for(const value of ['inherit','unset','initial','bogus-count']){await set(node,'--ui-avatar-graphemes',value);await settle(page);await avatarCheck(node,.75,value==='inherit'||value==='unset'?8:null,value==='inherit'||value==='unset','avatar-keyword-'+value);}
  // No assertion promotes invalid fallback glyph clipping into a safe-fallback contract.
  await set(node,'--ui-avatar-graphemes','8');await hiddenReveal(page,node);await avatarCheck(node,.75,8,true,'avatar-keywords-recover-reveal');await destroy(page,id);await clear(parent,'--ui-avatar-graphemes');
 });
 for(const component of ['Alert','ResultState'])test(`feedback-css-cascade R077 R078 ${component} all severity and important state pair consumers contrast keywords updates reveal destroy`,async({page})=>{
  await ready(page,context);const stateInput=component==='Alert'?'severity':'status',id=await create(page,component,{title:'確認する状態',message:'結果を確認し、必要なら再試行できます。',[stateInput]:'info'}),node=host(page,id),parent=page.locator('#runtime-slot');
  for(const state of severities){await update(page,id,{[stateInput]:state});await feedbackCheck(node,pairs[state]!,'pass',component+'-normal-'+state);}
  const override=pairs.success!;await set(node,'--ui-feedback-ink','var(--ui-color-'+override.ink+')');await set(node,'--ui-feedback-surface','var(--ui-color-'+override.surface+')');
  for(const state of severities){await update(page,id,{[stateInput]:state,title:'更新された状態 '+state,message:'更新した本文でも同じ色ペアを確認します。'});const m=await feedbackCheck(node,override,'pass',component+'-important-'+state);for(const p of m.properties)expect(p.priority).toBe('important');}
  const other=contexts.find(c=>c.profile!==context.profile&&c.width!==context.width)!;await environment(page,other);await feedbackCheck(node,override,'pass',component+'-environment-update');await hiddenReveal(page,node);await feedbackCheck(node,override,'pass',component+'-reveal');
  await set(parent,'--ui-feedback-ink','var(--ui-color-warning)');await set(parent,'--ui-feedback-surface','var(--ui-color-warning-surface)');
  for(const value of ['inherit','unset','initial','bogus-colour']){await set(node,'--ui-feedback-ink',value);await set(node,'--ui-feedback-surface',value);await settle(page);await feedbackCheck(node,value==='inherit'||value==='unset'?pairs.warning!:value==='initial'?pairs.info!:null,value==='bogus-colour'?'native':'pass',component+'-keyword-'+value);}
  await set(node,'--ui-feedback-ink','var(--ui-color-background)');await set(node,'--ui-feedback-surface','var(--ui-color-background)');await feedbackCheck(node,{ink:'background',surface:'background'},'fail',component+'-unsuitable-pair');
  await clear(parent,'--ui-feedback-ink');await clear(parent,'--ui-feedback-surface');await clear(node,'--ui-feedback-ink');await clear(node,'--ui-feedback-surface');await update(page,id,{[stateInput]:'success'});await feedbackCheck(node,pairs.success!,'pass',component+'-normal-recovered');await destroy(page,id);
 });
});
