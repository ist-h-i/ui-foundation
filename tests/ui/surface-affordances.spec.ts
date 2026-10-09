import type {Locator} from '@playwright/test';
import {test,expect} from './catalog-test';

async function visibleControl(control:Locator){
 await expect(control).toBeVisible();
 expect(await control.evaluate(element=>{
  const panel=element.closest('dialog')!,clip=panel.getBoundingClientRect(),box=element.getBoundingClientRect();
  const hit=document.elementFromPoint((box.left+box.right)/2,(box.top+box.bottom)/2);
  return box.height>=44&&box.left>=Math.max(0,clip.left)-1&&box.right<=Math.min(innerWidth,clip.right)+1
   &&box.top>=Math.max(0,clip.top)-1&&box.bottom<=Math.min(innerHeight,clip.bottom)+1
   &&!!hit&&(hit===element||element.contains(hit));
 }), 'the complete control is readable and can be reached by pointer within the dialog').toBe(true);
}

for(const profile of ['guided','dense']){
 test(`no-header Dialog ${profile}: a pointer close is available without replacing content focus`,async({page})=>{
  await page.goto('/catalog/floating');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
  const anchor=page.getByTestId('modal-anchor'),dialog=page.getByRole('dialog',{name:'補助内容の確認',exact:true});
  await anchor.click();await expect(page.getByTestId('inside-popup-anchor')).toBeFocused();
  const close=dialog.getByRole('button',{name:'ダイアログを閉じる',exact:true});await visibleControl(close);
  await close.click();await expect(dialog).toBeHidden();await expect(anchor).toBeFocused();
  await anchor.click();await page.getByTestId('inside-popup-anchor').click();await page.locator('#inside-popup').getByRole('textbox').fill('内側の下書きを保持');
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await close.click();await expect(dialog).toBeHidden();await expect(anchor).toBeFocused();
 });

 test(`ConfirmPopover ${profile}: primary confirmation and balanced Japanese heading remain usable`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/catalog/floating');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
  const anchor=page.getByTestId('confirm-anchor'),popup=page.locator('#floating-confirm');await anchor.click();
  const confirm=popup.getByRole('button',{name:'確認する',exact:true}),cancel=popup.getByRole('button',{name:'取消',exact:true});
  await expect(cancel).toBeFocused();
  expect(await confirm.evaluate(element=>getComputedStyle(element).backgroundColor)).not.toBe(await cancel.evaluate(element=>getComputedStyle(element).backgroundColor));
  const counts=await popup.getByRole('heading').evaluate(element=>{
   const text=element.firstChild!,lines=new Map<number,number>();
   for(let i=0;i<(text.textContent??'').length;i++){const range=document.createRange();range.setStart(text,i);range.setEnd(text,i+1);const box=range.getBoundingClientRect();lines.set(box.top,(lines.get(box.top)??0)+1);}
   return [...lines.values()];
  });
  expect(counts.every(count=>count>1),'the Japanese heading must not leave one character on its own line').toBe(true);
  await cancel.click();await expect(popup).toBeHidden();await expect(anchor).toBeFocused();
 });

 test(`AlertDialog ${profile}: acknowledgment uses the primary appearance and keeps its required completion`,async({page})=>{
  await page.goto('/catalog');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
  await page.getByRole('button',{name:'確認Dialogを開く',exact:true}).click();const confirm=page.getByRole('dialog',{name:'提出の確認',exact:true});
  const primary=await confirm.getByRole('button',{name:'確認',exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor);
  await confirm.getByRole('button',{name:'取消',exact:true}).click();
  const anchor=page.getByRole('button',{name:'重要通知を開く',exact:true});await anchor.click();const alert=page.getByRole('alertdialog',{name:'確認が必要な通知',exact:true}),acknowledge=alert.getByRole('button',{name:'確認しました',exact:true});
  expect(await acknowledge.evaluate(element=>getComputedStyle(element).backgroundColor)).toBe(primary);await expect(acknowledge).toBeFocused();
  await page.keyboard.press('Escape');await expect(alert).toBeVisible();await acknowledge.click();await expect(alert).toBeHidden();await expect(anchor).toBeFocused();
 });

 test(`ImageViewer ${profile}: the shared no-header close supports pointer-only completion`,async({page})=>{
  await page.setViewportSize({width:320,height:900});await page.goto('/catalog/media');
  if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided',exact:true}).click();
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');const anchor=page.locator('#viewer-trigger');await anchor.click();
  const dialog=page.getByRole('dialog',{name:'画像ビューアー',exact:true}),close=dialog.getByRole('button',{name:'ダイアログを閉じる',exact:true});
  await visibleControl(close);await close.click();await expect(dialog).toBeHidden();await expect(anchor).toBeFocused();
 });

 for(const direction of ['ltr','rtl'])test(`BottomSheet ${profile} ${direction} 320px text200: purpose, close and draft precede secondary height controls`,async({page},info)=>{
  await page.setViewportSize({width:320,height:900});await page.goto('/catalog/floating');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
  if(direction==='rtl')await page.getByLabel('RTL',{exact:true}).check();await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  const anchor=page.getByTestId('sheet-anchor');await anchor.click();const sheet=page.locator('dialog[uiBottomSheet]'),close=sheet.getByRole('button',{name:'ダイアログを閉じる',exact:true}),editor=sheet.getByRole('textbox',{name:'シートの下書き',exact:true}),range=sheet.getByRole('slider',{name:'表示領域の高さ',exact:true});
  await visibleControl(close);await expect(close).toBeFocused();await page.keyboard.press('Tab');await expect(editor).toBeFocused();await visibleControl(editor);
  await editor.fill('高さを変えても保持');const handle=await editor.elementHandle();await range.press('End');await expect(range).toHaveAttribute('aria-valuetext','3 / 3 (100%)');
  await expect(editor).toHaveValue('高さを変えても保持');expect(await editor.evaluate((element,other)=>element===other,handle)).toBe(true);await expect(range).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await info.attach('sheet-affordance-geometry',{body:JSON.stringify(await sheet.evaluate(element=>({panel:element.getBoundingClientRect().toJSON(),scrollHeight:element.scrollHeight,clientHeight:element.clientHeight}))),contentType:'application/json'});
  await close.click();await expect(sheet).toBeHidden();await expect(anchor).toBeFocused();await expect(page.getByTestId('sheet-reason')).toHaveText('close-button');
 });
}
