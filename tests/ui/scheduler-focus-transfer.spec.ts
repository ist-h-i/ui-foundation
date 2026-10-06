import {test,expect} from './catalog-test';

for(const profile of ['guided','dense']){
 for(const action of ['close','complete'] as const){
  test(`queued scheduler ${action} preserves synchronous application focus transfer: ${profile}`,async({page},info)=>{
   await page.goto('/catalog/scheduler');
   await page.locator('#profile').selectOption(profile);
   await page.locator('#schedule-view').selectOption('day');
   const event=page.locator('ui-scheduler [data-scheduler-event="fold"]');
   const memo=page.locator('#booking-note');
   await memo.fill('完了後も保持するメモ');
   const original=await memo.elementHandle();
   await event.locator('[data-move-editor]').click();
   const start=page.locator('#schedule-start-fold');
   await expect(start).toBeVisible();
   await start.focus();
   // App callbacks can transfer focus synchronously before Angular renders the close.
   // Invoke only public native actions, then observe the resulting DOM and app state.
   const before=await page.evaluate(action=>{
    const section=document.getElementById('schedule-move-fold')!;
    const buttons=Array.from(section.querySelectorAll<HTMLButtonElement>('button'));
    const label=action==='close'?'移動入力を閉じる':'移動を要求';
    buttons.find(button=>button.textContent?.trim()===label)!.click();
    if(action==='complete')(document.getElementById('move-complete') as HTMLButtonElement).click();
    const target=action==='close'?document.getElementById('after'):document.getElementById('booking-note');
    (target as HTMLElement).focus();
    return {focus:document.activeElement?.id,result:document.getElementById('result')?.textContent};
   },action);
   await expect(start).not.toBeVisible();
   await expect(action==='close'?page.locator('#after'):memo).toBeFocused();
   if(action==='complete')await expect(page.locator('#result')).toHaveText('true');
   await expect(memo).toHaveValue('完了後も保持するメモ');
   expect(await memo.evaluate((element,old)=>element===old,original)).toBe(true);
   await info.attach('synchronous-focus-transfer',{body:JSON.stringify({profile,action,before,after:await page.evaluate(()=>document.activeElement?.id)}),contentType:'application/json'});
  });
 }
}
