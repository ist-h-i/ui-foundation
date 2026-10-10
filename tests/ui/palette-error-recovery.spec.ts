import type {Locator, Page} from '@playwright/test';
import {test, expect} from './catalog-test';

async function doubleSemanticText(page:Page):Promise<void> {
 await page.evaluate(()=>{
  const main=document.querySelector<HTMLElement>('main')!;
  for(const name of ['body','small','heading']) {
   const probe=document.createElement('span');probe.style.fontSize=`var(--ui-text-${name})`;main.append(probe);
   const size=parseFloat(getComputedStyle(probe).fontSize);probe.remove();main.style.setProperty(`--ui-text-${name}`,`${size*2}px`);
  }
 });
}

/** Visibility assertions include clipping and sticky occlusion, rather than only DOM visibility. */
async function exposed(locator:Locator,part:'whole'|'prefix'|'suffix'='whole'):Promise<boolean> {
 return locator.evaluate((element,part)=>{
  const nodes:Text[]=[];const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode())if(node.textContent?.trim())nodes.push(node as Text);
  if(!nodes.length)return false;
  const range=document.createRange();
  if(part==='prefix'){range.setStart(nodes[0]!,0);range.setEnd(nodes[0]!,Math.min(8,nodes[0]!.length));}
  else if(part==='suffix'){const node=nodes.at(-1)!;range.setStart(node,Math.max(0,node.length-8));range.setEnd(node,node.length);}
  else range.selectNodeContents(element);
  const lines=Array.from(range.getClientRects()).filter(rect=>rect.width>0&&rect.height>0);
  // The first/last text line remains readable even when the sampled words
  // wrap onto several lines inside a deliberately local scrolling region.
  const rects=part==='prefix'?lines.slice(0,1):part==='suffix'?lines.slice(-1):lines;
  return rects.length>0&&rects.every(rect=>{
   if(rect.left<0||rect.right>innerWidth+1||rect.top<0||rect.bottom>innerHeight+1)return false;
   for(let parent:Element|null=element;parent;parent=parent.parentElement){
    const style=getComputedStyle(parent),box=parent.getBoundingClientRect();
    if(/auto|scroll|hidden|clip/.test(style.overflowY)&&(rect.top<box.top+parent.clientTop-1||rect.bottom>box.top+parent.clientTop+parent.clientHeight+1))return false;
    if(/auto|scroll|hidden|clip/.test(style.overflowX)&&(rect.left<box.left+parent.clientLeft-1||rect.right>box.left+parent.clientLeft+parent.clientWidth+1))return false;
   }
   const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   return hit===element||element.contains(hit);
  });
 },part);
}

/** Keyboard scrolling animates natively, including with reduced motion enabled. */
async function scrollError(page:Page,error:Locator,key:'PageDown'|'End'|'PageUp') {
 const observation=await error.evaluateHandle(element=>{
  const owner=()=>{for(let current:Element|null=element;current;current=current.parentElement)if(current.scrollHeight>current.clientHeight+1&&/auto|scroll/.test(getComputedStyle(current).overflowY))return current;return null;};
  const initial=owner();if(!initial)throw new Error('Error text has no keyboard scrolling area.');
  const state={started:false,ended:false,before:initial.scrollTop};let target:Element|null=null;
  const scroll=(event:Event)=>{if(event.target===owner()){target=event.target as Element;state.started=true;state.ended=false;}};
  const end=(event:Event)=>{if(state.started&&event.target===target)state.ended=true;};
  document.addEventListener('scroll',scroll,true);document.addEventListener('scrollend',end,true);
  return {state,cleanup:()=>{document.removeEventListener('scroll',scroll,true);document.removeEventListener('scrollend',end,true);},result:()=>({before:state.before,after:target?.scrollTop,owner:target?.className,client:target?.clientHeight,scroll:target?.scrollHeight,focus:document.activeElement?.getAttribute('role')})};
 });
 try {
  await page.keyboard.press(key);
  // A few unchanged animation frames can precede a native key scroll. Wait
  // for a real movement and its native completion before sending another key.
  await expect.poll(()=>observation.evaluate(value=>value.state.started&&value.state.ended),{message:`${key} scroll completes before the next keyboard operation`}).toBe(true);
  return {key,...await observation.evaluate(value=>value.result())};
 }finally{await observation.evaluate(value=>value.cleanup());await observation.dispose();}
}

for(const profile of ['guided','dense'])test.describe(`palette error recovery ${profile}`,()=>{
 test.beforeEach(async({page})=>{
  await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/catalog/navigation');await page.locator('main select').first().selectOption(profile);await doubleSemanticText(page);
 });

 for(const response of ['async','pointer'])test(`${response} error exposes its beginning, retry and retained Enter target at 200% text`,async({page},testInfo)=>{
  await page.getByTestId('palette-anchor').click();
  const palette=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=palette.getByRole('combobox'),error=palette.getByRole('alert'),retry=palette.getByRole('button',{name:'選択中のコマンドを再試行',exact:true});
  const name=palette.locator('[role=option][aria-selected=true] .ui-palette-label > span').first();
  await search.fill('保存');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');
  await search.press('Enter');await expect(palette).toHaveAttribute('aria-busy','true');
  if(response==='async')await page.getByTestId('command-fail').dispatchEvent('click');else await page.getByTestId('command-fail').click();
  await expect(error).toContainText('実行できませんでした');await expect(palette).toHaveAttribute('aria-busy','false');
  await testInfo.attach('recovery-layout',{body:JSON.stringify(await palette.evaluate(element=>({focus:document.activeElement?.id,parts:Array.from(element.querySelectorAll('.ui-palette-controls,[role=alert],button,[role=option][aria-selected=true]')).filter(part=>part.getClientRects().length).map(part=>({text:part.textContent,rect:part.getBoundingClientRect().toJSON()}))})),null,2),contentType:'application/json'});
  await expect.poll(async()=>({errorBeginning:await exposed(error,'prefix'),retry:await exposed(retry),name:await exposed(name)})).toEqual({errorBeginning:true,retry:true,name:true});
  await expect(search).toHaveValue('保存');await expect(name).toHaveText('確認内容を保存');
  await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');
  if(response==='async'){
   await expect(search).toBeFocused();await search.press('Tab');await expect(error).toBeFocused();
   await page.keyboard.press('Tab');await expect(retry).toBeFocused();await page.keyboard.press('Enter');
  }else await retry.click();
  await expect(page.getByTestId('command-count')).toHaveText('2');await expect(page.getByTestId('command-result')).toHaveText('saveの実行を要求');
  await expect(search).toBeFocused();await expect.poll(()=>search.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('solid');
  await expect.poll(()=>search.evaluate(element=>{const box=element.getBoundingClientRect(),dialog=element.closest('dialog')!.getBoundingClientRect();return box.left>=Math.max(0,dialog.left)&&box.right<=Math.min(innerWidth,dialog.right)&&box.top>=Math.max(0,dialog.top)&&box.bottom<=Math.min(innerHeight,dialog.bottom);})).toBe(true);
  await expect(search).toHaveValue('保存');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');
  await search.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('2');
  await page.getByTestId('command-fail').dispatchEvent('click');await search.focus();await search.press('Enter');
  await expect(page.getByTestId('command-count')).toHaveText('3');await expect(page.getByTestId('command-result')).toHaveText('saveの実行を要求');
 });

 for(const height of [900,720])test(`long error at ${height}px starts at the beginning and is fully keyboard reachable without changing its query or command`,async({page},testInfo)=>{
  await page.setViewportSize({width:320,height});await page.getByLabel('長いコマンドエラー',{exact:true}).check();await page.getByTestId('palette-anchor').click();
  const palette=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=palette.getByRole('combobox'),error=palette.getByRole('alert'),retry=palette.getByRole('button',{name:'選択中のコマンドを再試行',exact:true});
  await search.fill('保存');await search.press('Enter');await expect(palette).toHaveAttribute('aria-busy','true');await page.getByTestId('command-fail').dispatchEvent('click');
  await expect(error).toContainText('エラーの先頭。');await expect.poll(()=>exposed(error,'prefix')).toBe(true);await expect(search).toBeFocused();
  await search.press('Tab');await expect(error).toBeFocused();
  const steps=[await scrollError(page,error,'PageDown'),await scrollError(page,error,'End')];
  expect(steps[0]!.after,'PageDown advances through the retained error text').toBeGreaterThan(steps[0]!.before);
  // A short viewport scrolls the error and retry together. End reaches retry;
  // PageUp exposes the last text line before continuing to the retry button.
  if(!await exposed(error,'suffix')){
   const retryElement=await retry.elementHandle();
   const shared=await error.evaluate((element,retry)=>{for(let current:Element|null=element;current;current=current.parentElement)if(current.scrollHeight>current.clientHeight+1&&/auto|scroll/.test(getComputedStyle(current).overflowY))return current.contains(retry);return false;},retryElement);
   expect(shared,'End may pass the error ending only when retry shares its scrolling area').toBe(true);
   steps.push(await scrollError(page,error,'PageUp'));
  }
  await testInfo.attach('native-error-scroll',{body:JSON.stringify({profile,height,steps},null,2),contentType:'application/json'});
  await expect(error).toBeFocused();await expect(search).toHaveValue('保存');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');
  await expect.poll(()=>exposed(error,'suffix')).toBe(true);await page.keyboard.press('Tab');await expect(retry).toBeFocused();await expect.poll(()=>exposed(retry)).toBe(true);
  await page.keyboard.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('2');await expect(page.getByTestId('command-result')).toHaveText('saveの実行を要求');
  await expect(search).toBeFocused();await expect.poll(()=>search.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('solid');
  await expect.poll(()=>search.evaluate(element=>{const box=element.getBoundingClientRect(),dialog=element.closest('dialog')!.getBoundingClientRect();return box.left>=Math.max(0,dialog.left)&&box.right<=Math.min(innerWidth,dialog.right)&&box.top>=Math.max(0,dialog.top)&&box.bottom<=Math.min(innerHeight,dialog.bottom);})).toBe(true);
  await expect(search).toHaveValue('保存');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');
  await page.getByTestId('command-fail').dispatchEvent('click');await expect.poll(()=>exposed(error,'prefix')).toBe(true);
  await search.fill('該当する操作なし');await expect(palette).toContainText('該当するコマンドはありません。');await expect(retry).toBeDisabled();await expect.poll(()=>exposed(error,'prefix')).toBe(true);
  await search.fill('保存');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');await expect(search).toHaveValue('保存');
  await page.keyboard.press('Escape');await expect(palette).toBeHidden();await page.getByTestId('palette-anchor').click();await expect(search).toBeFocused();
  await expect.poll(()=>exposed(error,'prefix')).toBe(true);await expect(search).toHaveValue('保存');await search.press('Enter');
  await expect(page.getByTestId('command-count')).toHaveText('3');await expect(page.getByTestId('command-result')).toHaveText('saveの実行を要求');
 });
});
