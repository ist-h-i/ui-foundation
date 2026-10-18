import type {Locator, Page} from '@playwright/test';
import {test,expect,contexts,ready as runtimeReady,host,create,update,settle,record,destroy} from './css-override-test';

const near=(actual:number,expected:number,label:string)=>expect(Math.abs(actual-expected),label).toBeLessThanOrEqual(1);
async function ready(page:Page,context:typeof contexts[number]){
 await runtimeReady(page,context);
 await page.locator('#runtime-slot').evaluate(el=>{const node=el as HTMLElement;node.style.padding='calc(var(--ui-border-focus) + var(--ui-border-focus-offset))';node.style.boxSizing='border-box';});
 await settle(page);
}
async function nativeFocus(page:Page,target:Locator){
 await page.locator('#runtime-anchor').focus();
 for(let i=0;i<20;i++){await page.keyboard.press('Tab');if(await target.evaluate(el=>el===document.activeElement))break;}
 await expect(target).toBeFocused();
 const metric=await target.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),reach=Math.max(0,parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset));let left=0,right=innerWidth,top=0,bottom=innerHeight;for(let p=el.parentElement;p;p=p.parentElement){const ps=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(ps.overflowX)){left=Math.max(left,b.left+p.clientLeft);right=Math.min(right,b.left+p.clientLeft+p.clientWidth);}if(/auto|scroll|hidden|clip/.test(ps.overflowY)){top=Math.max(top,b.top+p.clientTop);bottom=Math.min(bottom,b.top+p.clientTop+p.clientHeight);}}return {keyboard:el.matches(':focus-visible'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,rect:r.toJSON(),clip:{left,right,top,bottom},reach,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el};});
 expect(metric.keyboard).toBe(true);expect(metric.width).toBeGreaterThan(0);expect(metric.style).not.toBe('none');expect(metric.hit).toBe(true);
 expect(metric.rect.left-metric.reach).toBeGreaterThanOrEqual(metric.clip.left-1);expect(metric.rect.right+metric.reach).toBeLessThanOrEqual(metric.clip.right+1);expect(metric.rect.top-metric.reach).toBeGreaterThanOrEqual(metric.clip.top-1);expect(metric.rect.bottom+metric.reach).toBeLessThanOrEqual(metric.clip.bottom+1);
 await record('warning-layout-native-focus',metric);
}
async function intrinsic(editor:Locator){
 return editor.evaluate(el=>{const original=el as HTMLTextAreaElement,style=getComputedStyle(original),clone=original.cloneNode() as HTMLTextAreaElement;
  clone.removeAttribute('id');clone.removeAttribute('name');clone.setAttribute('aria-hidden','true');clone.tabIndex=-1;
  for(const property of Array.from(style))clone.style.setProperty(property,style.getPropertyValue(property));
  clone.style.cssText+=';position:absolute;visibility:hidden;pointer-events:none;height:auto;block-size:auto;max-height:none;max-block-size:none;';clone.style.width=original.getBoundingClientRect().width+'px';clone.value=original.value;document.body.append(clone);
  const natural=clone.scrollHeight+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);clone.remove();return {natural,actual:original.getBoundingClientRect().height,max:style.maxBlockSize,client:original.clientHeight,scroll:original.scrollHeight,rows:original.rows,value:original.value};
 });
}

for(const context of contexts){
 test(`warning recheck textarea hidden latest ${context.name}: controlled and CVA values rows caps autoResize survive reveal`,async({page})=>{
  await ready(page,context);
  const id=await create(page,'Textarea',{controlId:'warning-hidden-textarea',label:'非表示中に届く説明',autoResize:true,rows:2,maxHeight:180}),node=host(page,id),editor=node.locator('textarea');
  const original=await editor.elementHandle(),long='後から届いた申請内容を確認する ABCDEFGHIJ\n'.repeat(30);
  await editor.fill('最初の下書き');
  await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(editor).toBeHidden();
  await page.evaluate(async({id,long})=>{const api=(window as any).__runtime;await Promise.resolve();api.update(id,{value:'先に届く短い説明',rows:3,autoResize:false,maxHeight:null});await Promise.resolve();api.update(id,{value:long,rows:4,autoResize:true,maxHeight:180});},{id,long});
  await expect(editor).toHaveValue(long);await expect(editor).toHaveAttribute('rows','4');
  await node.evaluate(el=>(el as HTMLElement).hidden=false);
  await expect.poll(async()=>Math.abs((await intrinsic(editor)).actual-180)).toBeLessThanOrEqual(1);expect((await intrinsic(editor)).natural).toBeGreaterThan(180);
  expect(await original!.evaluate(el=>el===document.querySelector('#warning-hidden-textarea'))).toBe(true);
  await nativeFocus(page,editor);await editor.press(process.platform==='darwin'?'Meta+ArrowDown':'Control+End');await expect.poll(()=>editor.evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-1)).toBe(true);
  await node.evaluate(el=>(el as HTMLElement).hidden=true);
  await page.evaluate(async id=>{const api=(window as any).__runtime;api.update(id,{value:undefined,rows:2,maxHeight:null,autoResize:false});api.instance(id).writeValue('古いCVAの説明');api.render(id);await Promise.resolve();api.instance(id).writeValue('最新CVA');api.update(id,{autoResize:true});},id);
  await expect(editor).toHaveValue('最新CVA');await node.evaluate(el=>(el as HTMLElement).hidden=false);
  await expect.poll(async()=>{const m=await intrinsic(editor);return Math.abs(m.actual-m.natural);}).toBeLessThanOrEqual(1);
  expect((await intrinsic(editor)).actual).toBeLessThan(180);expect(await original!.evaluate(el=>el===document.querySelector('#warning-hidden-textarea'))).toBe(true);
  await update(page,id,{autoResize:false,rows:5});await expect(editor).toHaveAttribute('rows','5');expect(await editor.evaluate(el=>(el as HTMLElement).style.height)).toBe('');
  const nativeRows=await editor.evaluate(el=>{const original=el as HTMLTextAreaElement,clone=original.cloneNode(true) as HTMLTextAreaElement;clone.removeAttribute('id');clone.style.position='absolute';clone.style.visibility='hidden';clone.style.width=original.getBoundingClientRect().width+'px';clone.value=original.value;original.parentElement!.append(clone);const actual=original.getBoundingClientRect().height,expected=clone.getBoundingClientRect().height;clone.remove();return {actual,expected};});near(nativeRows.actual,nativeRows.expected,'autoResize false uses native rows height');
  await update(page,id,{autoResize:true});await expect.poll(async()=>{const m=await intrinsic(editor);return Math.abs(m.actual-m.natural);}).toBeLessThanOrEqual(1);await nativeFocus(page,editor);
  await record('warning-hidden-textarea-latest',{context,final:await intrinsic(editor),nativeRows});await original!.dispose();await destroy(page,id);
 });

 test(`warning recheck textarea queued cleanup ${context.name}: actual observer requested frame is canceled before destroy`,async({page})=>{
  await ready(page,context);
  await page.evaluate(()=>{
   const w=window as any,OriginalResize=w.ResizeObserver,OriginalMutation=w.MutationObserver,originalRAF=window.requestAnimationFrame.bind(window),originalCancel=window.cancelAnimationFrame.bind(window);
   const state:any={creating:false,inOwnedCallback:false,armed:false,observers:[],requested:[],canceled:[],executed:[]};
   const wrap=(Original:any,kind:string)=>class{private observer:any;private entry:any;constructor(callback:any){this.entry={kind,owned:state.creating,disconnects:0};state.observers.push(this.entry);this.observer=new Original((...args:any[])=>{const previous=state.inOwnedCallback;state.inOwnedCallback=this.entry.owned;try{callback(...args);}finally{state.inOwnedCallback=previous;}});}observe(...args:any[]){return this.observer.observe(...args);}unobserve(...args:any[]){return this.observer.unobserve(...args);}takeRecords(){return this.observer.takeRecords();}disconnect(){this.entry.disconnects++;return this.observer.disconnect();}};
   w.ResizeObserver=wrap(OriginalResize,'resize');w.MutationObserver=wrap(OriginalMutation,'mutation');
   window.requestAnimationFrame=callback=>{let id=0;const owned=state.armed&&state.inOwnedCallback;id=originalRAF(time=>{if(owned)state.executed.push(id);callback(time);});if(owned)state.requested.push(id);return id;};
   window.cancelAnimationFrame=id=>{if(state.requested.includes(id))state.canceled.push(id);originalCancel(id);};
   state.restore=()=>{w.ResizeObserver=OriginalResize;w.MutationObserver=OriginalMutation;window.requestAnimationFrame=originalRAF;window.cancelAnimationFrame=originalCancel;};w.__warningTextareaCleanup=state;
  });
  let id:number|undefined;
  try{
   id=await page.evaluate(()=>{const s=(window as any).__warningTextareaCleanup;s.creating=true;try{return (window as any).__runtime.create('Textarea',{controlId:'warning-cleanup-textarea',label:'破棄する説明',rows:2,autoResize:true}) as number;}finally{s.creating=false;}});
   await expect(host(page,id).locator('textarea')).toBeVisible();await settle(page);
   const observation=await page.evaluate(async id=>{const w=window as any,s=w.__warningTextareaCleanup,api=w.__runtime;s.armed=true;document.querySelector<HTMLElement>(`[data-runtime-id="${id}"]`)!.hidden=true;await Promise.resolve();await Promise.resolve();const pending=s.requested.filter((request:number)=>!s.executed.includes(request));api.destroy(id);return {pending,requested:[...s.requested],canceled:[...s.canceled],executed:[...s.executed],observers:s.observers.filter((entry:any)=>entry.owned),errors:api.inspect(id).errors};},id);
   expect(observation.pending.length,'native MutationObserver must have scheduled a frame before destroy').toBeGreaterThan(0);for(const pending of observation.pending)expect(observation.canceled).toContain(pending);
   expect(observation.observers.some((entry:any)=>entry.kind==='resize')).toBe(true);expect(observation.observers.some((entry:any)=>entry.kind==='mutation')).toBe(true);for(const observer of observation.observers)expect(observer.disconnects).toBeGreaterThan(0);expect(observation.errors).toEqual([]);
   await settle(page);await expect(host(page,id)).toHaveCount(0);
   const after=await page.evaluate(id=>{const w=window as any;return {executed:w.__warningTextareaCleanup.executed,errors:w.__runtime.inspect(id).errors};},id);for(const pending of observation.pending)expect(after.executed).not.toContain(pending);expect(after.errors).toEqual([]);await record('warning-textarea-real-observer-cleanup',{context,observation,after});
  }finally{await page.evaluate(id=>{const w=window as any;if(id!==undefined)w.__runtime.destroy(id);w.__warningTextareaCleanup.restore();delete w.__warningTextareaCleanup;},id);}
 });

 for(const mode of ['fieldset','group'] as const)test(`warning recheck form composition ${context.name} ${mode}: real grid inherited labels legend hint disabled and retained controls`,async({page})=>{
  await ready(page,context);const id=await create(page,'RuntimeWarningLayout',{mode,columns:2,labelPosition:'inline',labelWidth:80}),node=host(page,id),group=node.getByRole('group',{name:mode==='fieldset'?'直接fieldsetの申請':'部品を合成した申請',exact:true}),layout=mode==='fieldset'?group:node.locator('.ui-form-layout'),editor=node.getByRole('textbox'),check=node.getByRole('checkbox'),after=node.locator('[data-warning-after]');
  const editorNode=await editor.elementHandle(),checkNode=await check.elementHandle();await editor.fill('合成しても保持する下書き');await check.check();
  for(const columns of [2,1])for(const labelPosition of ['inline','above'] as const){
   await update(page,id,{columns,labelPosition});
   const metric=await layout.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),fields=[...el.querySelectorAll<HTMLElement>(':scope > ui-form-field')],probe=document.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;inline-size:var(--ui-space-field);';el.append(probe);const gap=probe.getBoundingClientRect().width;probe.remove();return {small:matchMedia('(max-width:40rem)').matches,display:s.display,rawTracks:s.gridTemplateColumns,tracks:s.gridTemplateColumns.split(' ').filter(value=>/^\d+(?:\.\d+)?px$/.test(value)).map(Number.parseFloat),gap:parseFloat(s.columnGap),expectedGap:gap,contentWidth:r.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),fields:fields.map(field=>{const f=getComputedStyle(field),b=field.getBoundingClientRect();return {width:b.width,left:b.left,right:b.right,top:b.top,display:f.display,tracks:f.gridTemplateColumns.split(' ').map(Number.parseFloat),gap:parseFloat(f.columnGap),checkbox:!!field.querySelector('input[type=checkbox]')};})};});
   expect(metric.display).toBe('grid');expect(metric.fields).toHaveLength(2);const count=metric.small?1:columns;if(mode==='group')expect(metric.tracks).toHaveLength(count);near(metric.gap,metric.expectedGap,'FormLayout uses resolved field gap');const width=(metric.contentWidth-(count-1)*metric.gap)/count;
   // Native fieldset exposes the computed repeat() grammar on its anonymous content box; field rectangles below prove actual used tracks.
   if(mode==='group')for(const track of metric.tracks)near(track,width,'div actual grid tracks');for(const field of metric.fields){near(field.width,width,'direct native-control field width');expect(field.left).toBeGreaterThanOrEqual(-1);expect(field.right).toBeLessThanOrEqual(context.width+1);if(field.checkbox){expect(field.tracks).toHaveLength(2);near(field.tracks[0]!,Math.min(80,field.width*.4),'checkbox inline label track');near(field.tracks[1]!,field.width-field.gap-field.tracks[0]!,'checkbox control track');}else{expect(field.display).toBe(!metric.small&&labelPosition==='inline'?'grid':'block');if(field.display==='grid'){expect(field.tracks).toHaveLength(2);near(field.tracks[0]!,Math.min(80,field.width*.4),'inherited text label track');}}}
   if(count===1)expect(metric.fields[1]!.top).toBeGreaterThan(metric.fields[0]!.top);else near(metric.fields[0]!.top,metric.fields[1]!.top,'two fields share row');await expect(editor).toHaveValue('合成しても保持する下書き');await expect(check).toBeChecked();await record('warning-form-layout-'+mode+'-'+columns+'-'+labelPosition,metric);
  }
  const hintId=mode==='fieldset'?'warning-direct-hint':'warning-composed-group-hint';await expect(group).toHaveAttribute('aria-describedby',hintId);await expect(node.locator('#'+hintId)).toHaveText('内容を確認して入力してください');await update(page,id,{hint:'更新された補助説明'});await expect(node.locator('#'+hintId)).toHaveText('更新された補助説明');await update(page,id,{hint:''});await expect(group).not.toHaveAttribute('aria-describedby');await expect(node.locator('#'+hintId)).toHaveCount(0);
  await page.locator('#runtime-anchor').click();await update(page,id,{disabled:true});await expect(editor).toBeDisabled();await expect(check).toBeDisabled();expect(await editor.evaluate(el=>(el as HTMLInputElement).disabled)).toBe(false);expect(await editor.evaluate(el=>el.matches(':disabled'))).toBe(true);
  await page.keyboard.press('Tab');await expect(after).toBeFocused();await update(page,id,{disabled:false});await expect(editor).toBeEnabled();await nativeFocus(page,editor);await page.keyboard.press('Tab');await expect(check).toBeFocused();await check.press('Space');await expect(check).not.toBeChecked();await check.press('Space');await expect(check).toBeChecked();
  await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(editor).toBeHidden();await node.evaluate(el=>(el as HTMLElement).hidden=false);await expect(editor).toHaveValue('合成しても保持する下書き');await expect(check).toBeChecked();expect(await editorNode!.evaluate((el,mode)=>el===document.querySelector(mode==='fieldset'?'#warning-direct-text':'#warning-group-text'),mode)).toBe(true);expect(await checkNode!.evaluate((el,mode)=>el===document.querySelector(mode==='fieldset'?'#warning-direct-check':'#warning-group-check'),mode)).toBe(true);
  await nativeFocus(page,editor);await editorNode!.dispose();await checkNode!.dispose();await destroy(page,id);
 });

 test(`warning recheck mixed unit panel maxima ${context.name}: oversized calc lengths obey viewport bounds with retained native input`,async({page})=>{
  await ready(page,context);
  for(const kind of ['Drawer','BottomSheet'] as const)for(const edge of kind==='Drawer'?['left','bottom'] as const:['bottom'] as const){
   const id=await create(page,'CSSPanelRuntime',{kind,label:'混合単位の表示境界',open:true,modal:false,edge,width:240,height:400,...(kind==='BottomSheet'?{stages:[.4,1],stage:1}:{})}),node=host(page,id),dialog=node.locator('dialog'),editor=dialog.getByRole('textbox');await expect(dialog).toBeVisible();await editor.fill('大きな指定でも保持する入力');const original=await editor.elementHandle();
   await dialog.evaluate((el,kind)=>{const node=el as HTMLElement;node.style.setProperty('--ui-panel-width','calc(120vw + 2rem)','important');node.style.setProperty(kind==='BottomSheet'?'--ui-sheet-height':'--ui-panel-height','calc(125dvh + 1em)','important');},kind);
   await settle(page);
   const metric=await dialog.evaluate((el,{kind,edge})=>{const actual=el as HTMLDialogElement,style=getComputedStyle(actual),native=document.createElement('dialog');native.inert=true;native.setAttribute('aria-hidden','true');native.style.cssText='position:fixed;visibility:hidden;pointer-events:none;box-sizing:border-box;margin:0;padding:0;border:0;max-width:100vw;max-height:100dvh;';native.style.fontSize=style.fontSize;native.style.minWidth=style.minWidth;native.style.minHeight=style.minHeight;native.style.width='min(calc(120vw + 2rem),100vw)';native.style.height='min(calc(125dvh + 1em),100dvh)';if(edge==='left'){native.style.left='0';native.style.top='0';}else{native.style.left='0';native.style.right='0';native.style.bottom='0';native.style.marginInline='auto';}actual.parentElement!.append(native);native.show();const result={kind,edge,actual:actual.getBoundingClientRect().toJSON(),native:native.getBoundingClientRect().toJSON(),viewport:{width:innerWidth,height:innerHeight},rawWidth:style.getPropertyValue('--ui-panel-width'),rawHeight:style.getPropertyValue(kind==='BottomSheet'?'--ui-sheet-height':'--ui-panel-height')};native.close();native.remove();return result;},{kind,edge});
   near(metric.actual.width,metric.viewport.width,'oversized calc width is viewport-clamped');near(metric.actual.height,metric.viewport.height,'oversized calc height is viewport-clamped');for(const axis of ['left','right','top','bottom','width','height'] as const)near(metric.actual[axis],metric.native[axis],'independent native mixed-unit '+axis);await expect(editor).toHaveValue('大きな指定でも保持する入力');expect(await original!.evaluate(el=>el===document.querySelector('[data-runtime-id] dialog input'))).toBe(true);await nativeFocus(page,editor);await record('warning-mixed-unit-panel-maxima',metric);await original!.dispose();await destroy(page,id);
  }
 });
}
