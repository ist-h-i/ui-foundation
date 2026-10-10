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

for(const profile of ['guided','dense'])test(`scheduler ${profile}: desktop week and narrow RTL selected day stay reachable without moving external focus`,async({page},info)=>{
 await page.setViewportSize({width:1280,height:900});await page.goto('/catalog/scheduler');await page.locator('#profile').selectOption(profile);await page.locator('#schedule-view').selectOption('week');
 const scheduler=page.locator('ui-scheduler'),viewport=scheduler.locator('.ui-scheduler-viewport'),current=scheduler.locator('[data-scheduler-day][aria-current=date]');
 await expect(scheduler.locator('[data-scheduler-day]:visible')).toHaveCount(7);
 const desktop=await viewport.evaluate(root=>{const box=root.getBoundingClientRect();return [...root.querySelectorAll<HTMLElement>('[data-scheduler-day]')].map(day=>{const rect=day.getBoundingClientRect();return {date:day.dataset.schedulerDay,left:rect.left,right:rect.right,inside:rect.left>=box.left-1&&rect.right<=box.right+1};});});
 expect(await scheduler.locator('[data-scheduler-event=fold]').evaluate(event=>event.getBoundingClientRect().width),'event names and actions retain a readable card width').toBeGreaterThanOrEqual(250);
 await expect.poll(()=>current.evaluate(day=>{const rect=day.getBoundingClientRect(),box=day.closest('.ui-scheduler-viewport')!.getBoundingClientRect();return rect.left>=box.left-1&&rect.right<=box.right+1;})).toBe(true);
 await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('#rtl').check();
 await viewport.evaluate(root=>root.scrollTo({left:0}));
 const jump=scheduler.getByRole('button',{name:'表示日へ移動',exact:true});await jump.focus();await jump.press('Enter');await expect(jump).toBeFocused();
 const inside=()=>current.evaluate(day=>{const box=day.getBoundingClientRect(),outer=day.closest('.ui-scheduler-viewport')!.getBoundingClientRect();return box.left>=outer.left-1&&box.right<=outer.right+1;});
 await expect.poll(inside).toBe(true);
 const outside=page.locator('#after');await outside.focus();
 await scheduler.locator('input[type=date]').evaluate(input=>{(input as HTMLInputElement).value='2026-10-30';input.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(current).toHaveAttribute('data-scheduler-day','2026-10-30');await expect.poll(inside).toBe(true);await expect(outside).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await info.attach('week-and-selected-day',{body:JSON.stringify({profile,desktop,selected:await current.getAttribute('data-scheduler-day'),focus:await page.evaluate(()=>document.activeElement?.id)}),contentType:'application/json'});
});
