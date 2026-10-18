import {expect,type Page,type TestInfo} from '@playwright/test';
interface NativeInputSample {key:string;trusted:boolean;text:string;anchor:number|null;focus:number|null;doc:string;head:number;}

/** Native key bursts contain no layout reads, artificial delay or RAF wait. */
export async function verifyCodeEditorNativeInput(page:Page,profile:'guided'|'dense',info:TestInfo,scrollRace=false){
 if(scrollRace)await page.addInitScript(()=>{
  let pending=false,count=0;
  const before=(event:InputEvent)=>{pending=event.isTrusted&&event.inputType==='insertText'&&event.target instanceof Element&&event.target.matches('[data-editor=code] .cm-content');};
  document.addEventListener('beforeinput',before,true);
  // Created before CM's observer. Native DOM input is untouched; only scroll
  // delivery is controlled to exercise the stale-selection flush ordering.
  const observer=new MutationObserver(records=>{const content=document.activeElement;if(!pending||!content?.matches('[data-editor=code] .cm-content')||!records.some(record=>content.contains(record.target)))return;pending=false;count++;content.closest('.cm-editor')!.querySelector('.cm-scroller')!.dispatchEvent(new Event('scroll'));});
  observer.observe(document,{subtree:true,characterData:true,childList:true});
  (window as any).__codeScrollRace={count:()=>count,dispose:()=>{observer.disconnect();document.removeEventListener('beforeinput',before,true);}};
 });
 await page.setViewportSize({width:320,height:800});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/catalog/foundation');
 await expect(page.locator('#range-status')).toHaveText('VALID');
 await page.evaluate(profile=>{document.documentElement.style.fontSize='200%';const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'de-DE',direction:'rtl',dateInputFormat:'dd/MM/yyyy',timeZone:'UTC'});},profile);
 const host=page.locator('[data-editor=code]'),code=host.locator('.cm-content'),editor=host.locator('.cm-editor'),output=page.locator('#code-value');
 await expect(code).toHaveAttribute('contenteditable','true');await expect(host.getByRole('status')).toHaveCount(0);await code.focus();await expect(code).toBeFocused();await expect(editor).toHaveClass(/cm-focused/);
 const initialClass=await editor.getAttribute('class');
 if(scrollRace)await expect.poll(()=>host.evaluate(element=>(window as any).ng.getComponent(element.querySelector('ui-code-editor')).editor.inView)).toBe(true);
 await code.evaluate(content=>{
  const view=(window as any).ng.getComponent(content.closest('ui-code-editor')).editor;
  const samples:NativeInputSample[]=[];
  const listener=(event:KeyboardEvent)=>{if(event.target===content&&event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){const selection=document.getSelection();samples.push({key:event.key,trusted:event.isTrusted,text:content.textContent??'',anchor:selection?.anchorOffset??null,focus:selection?.focusOffset??null,doc:view.state.doc.toString(),head:view.state.selection.main.head});}};
  document.addEventListener('keyup',listener,true);
  (window as any).__codeNativeInput={read:()=>samples.splice(0),dispose:()=>document.removeEventListener('keyup',listener,true)};
 });
 for(let index=0;index<16;index++){
  const expected=`const crossBrowser${index} = ${index+7};`;
  await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(expected);
  const samples:NativeInputSample[]=await page.evaluate(()=>(window as any).__codeNativeInput.read());
  const classes=await editor.getAttribute('class');
  await info.attach(`native-editor-burst-${index}`,{body:JSON.stringify({profile,expected,samples,initialClass,classes},null,2),contentType:'application/json'});
  await expect(output).toHaveText(expected);await expect(code).toHaveText(expected);
  expect(samples).toHaveLength(expected.length);
  samples.forEach((sample,offset)=>{const prefix=expected.slice(0,offset+1);expect(sample.trusted).toBe(true);expect(sample.text).toBe(prefix);expect(sample.doc).toBe(prefix);expect(sample.head).toBe(prefix.length);});
  // A doc-only change must not replace the editor's styling configuration.
  expect(classes).toBe(initialClass);
 }
 if(scrollRace){const count=await page.evaluate(()=>(window as any).__codeScrollRace.count());await info.attach('controlled-scroll-delivery',{body:JSON.stringify({count,scrollDeliveryControlled:true,nativeInputUntouched:true}),contentType:'application/json'});expect(count).toBeGreaterThan(0);}
 await page.evaluate(()=>(window as any).__stage.newForms().codeControl.setValue('const external = 9;'));
 await expect(code).toHaveText('const external = 9;');await expect(output).toHaveText('const external = 9;');await expect(code).toBeFocused();expect(await editor.getAttribute('class')).toBe(initialClass);
 await page.evaluate(()=>(window as any).__stage.newForms().readonly.set(true));await expect(code).toHaveAttribute('contenteditable','false');await expect(code).toHaveAttribute('aria-readonly','true');
 await page.keyboard.type('ignored');await expect(output).toHaveText('const external = 9;');
 await page.evaluate(()=>(window as any).__stage.newForms().readonly.set(false));await expect(code).toHaveAttribute('contenteditable','true');
 await page.evaluate(()=>(window as any).__stage.newForms().codeControl.disable());await expect(code).toHaveAttribute('contenteditable','false');await expect(code).toHaveAttribute('aria-disabled','true');
 await page.evaluate(()=>(window as any).__stage.newForms().codeControl.enable());await expect(code).toHaveAttribute('contenteditable','true');await expect(code).toHaveAttribute('aria-disabled','false');
 // Simulate an engine callback queued before CVA disabling, after the draft effect settled.
 await page.evaluate(()=>{const app=(window as any).__stage.newForms(),component=(window as any).ng.getComponent(document.querySelector('[data-editor=code] ui-code-editor'));app.codeControl.disable();const view=component.editor;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:'late rejected engine change'}});});
 await expect(code).toHaveAttribute('contenteditable','false');await expect(output).toHaveText('const external = 9;');await expect(code).toHaveText('const external = 9;');
 await page.evaluate(()=>(window as any).__codeNativeInput.dispose());
 if(scrollRace)await page.evaluate(()=>(window as any).__codeScrollRace.dispose());
}
