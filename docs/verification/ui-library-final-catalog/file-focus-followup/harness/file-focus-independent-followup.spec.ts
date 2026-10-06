import {test,expect} from './catalog-test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';
import type {Page} from '@playwright/test';

async function observe(page:Page):Promise<void>{
 await page.evaluate(()=>{
  const identify=(node:EventTarget|null):string=>node instanceof Element?node.tagName.toLowerCase()+(node.getAttribute('data-explorer-id')?'[data-explorer-id='+node.getAttribute('data-explorer-id')+']':'')+(node instanceof HTMLInputElement?'[type='+node.type+'] '+node.closest('label')?.textContent?.trim():''):(node===null?'null':'other');
  const records:unknown[]=[];(window as any).__focusEvidence=records;
  const record=(type:string,event?:Event)=>{const csv=document.querySelector<HTMLButtonElement>('[data-explorer-id=csv]');records.push({time:performance.now(),type,target:event?identify(event.target):null,relatedTarget:event instanceof FocusEvent?identify(event.relatedTarget):null,active:identify(document.activeElement),csvPresent:!!csv,csvDisabled:csv?.disabled??null,hostFocused:document.activeElement?.matches('#files ui-file-explorer')??false});};
  for(const type of ['focusin','focusout','pointerdown','change'])document.addEventListener(type,event=>record(type,event),true);
  new MutationObserver(()=>record('collection-mutation')).observe(document.querySelector('#files ui-file-explorer')!,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','tabindex']});
  record('installed');
 });
}

for(const profile of profiles){
 test(profile+': independent controlled CSV ownership uses enabled/focused preconditions and retains original retirement contracts',async({page},info)=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'FileExplorer');await observe(page);
  const host=page.locator('#files ui-file-explorer'),root=page.locator('[data-explorer-id=root]'),csv=page.locator('[data-explorer-id=csv]');
  try{
   await root.press('ArrowRight');await expect(csv).toBeEnabled();await csv.focus();await expect(csv).toBeFocused();
   await page.getByLabel('選択した証憑を無効にする',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
   await expect(csv).toBeDisabled();await expect(host).toBeFocused();await expect(host).toHaveAttribute('aria-label','添付管理の操作領域');
   await page.getByLabel('選択した証憑を無効にする',{exact:true}).uncheck();await expect(csv).toBeEnabled();await csv.focus();await expect(csv).toBeFocused();
   await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
   await expect(csv).toHaveCount(0);await expect(host).toBeFocused();await expect(root).toHaveAttribute('tabindex','0');
   await page.getByLabel('証憑を取り除く',{exact:true}).uncheck();await expect(csv).toBeEnabled();
   const outside=page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Code',exact:true});await outside.focus();await expect(outside).toBeFocused();
   await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
   await expect(csv).toHaveCount(0);await expect(outside).toBeFocused();
  }finally{await info.attach('independent-native-focus-events',{body:JSON.stringify(await page.evaluate(()=>(window as any).__focusEvidence),null,2),contentType:'application/json'});}
 });

 test(profile+': native focus of a disabled CSV is a no-op during the real checkbox change, so outside ownership remains outside',async({page},info)=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'FileExplorer');await observe(page);
  const host=page.locator('#files ui-file-explorer'),root=page.locator('[data-explorer-id=root]'),csv=page.locator('[data-explorer-id=csv]'),disable=page.getByLabel('選択した証憑を無効にする',{exact:true});
  try{
   await root.press('ArrowRight');await expect(csv).toBeEnabled();await csv.focus();await expect(csv).toBeFocused();
   await disable.evaluate((input:HTMLInputElement)=>input.click());await expect(csv).toBeDisabled();await expect(host).toBeFocused();
   // This stress probe selects the exact unrendered change boundary. It does not
   // change product state or replace native focus, events, timers or MutationObserver.
   await disable.evaluate((input:HTMLInputElement)=>input.addEventListener('change',()=>{
    const csv=document.querySelector<HTMLButtonElement>('[data-explorer-id=csv]')!;
    const before=document.activeElement;const disabled=csv.disabled;csv.focus();
    (window as any).__disabledFocusAttempt={disabled,csvFocused:document.activeElement===csv,outsideStayed:document.activeElement===before,outsideIsCheckbox:document.activeElement===input,time:performance.now()};
   },{once:true}));
   await disable.uncheck();await expect(csv).toBeEnabled();
   const attempted=await page.evaluate(()=>(window as any).__disabledFocusAttempt);
   expect(attempted).toMatchObject({disabled:true,csvFocused:false,outsideStayed:true,outsideIsCheckbox:true});
   await expect(disable).toBeFocused();
   await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
   await expect(csv).toHaveCount(0);await expect(disable).toBeFocused();await expect(host).not.toBeFocused();
   await info.attach('native-disabled-focus-noop',{body:JSON.stringify(attempted,null,2),contentType:'application/json'});
  }finally{await info.attach('independent-native-focus-events',{body:JSON.stringify(await page.evaluate(()=>(window as any).__focusEvidence),null,2),contentType:'application/json'});}
 });
}
