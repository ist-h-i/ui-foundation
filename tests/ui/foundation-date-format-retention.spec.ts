// Copy into tests/ui/. Uses the existing public Foundation fixture; no fixture change.
import {test,expect} from './catalog-test';

for(const profile of ['guided','dense'] as const){
 test(`DateRange ${profile}: requested format waits for invalid draft repair, clear, or reset`,async({page})=>{
  await page.goto('/catalog/foundation');await expect(page.locator('#range-status')).toHaveText('VALID');
  await page.evaluate(profile=>(window as any).__stage.profile.set(profile),profile);
  const range=page.locator('#range-case'),start=range.locator('input').first(),picker=range.locator('ui-date-picker').first();
  await expect(page.locator('#range-status')).toHaveText('VALID');
  await start.fill('31/02/2026');await start.focus();
  await start.evaluate(element=>{(window as any).__dateFormatEditor=element;(element as HTMLInputElement).setSelectionRange(2,5);});
  for(const format of ['yyyy-MM-dd','native','MM/dd/yyyy','yyyy-MM-dd']){
   await page.evaluate(format=>(window as any).__stage.rootLocale.set({locale:'en-US',timeZone:'UTC',dateInputFormat:format}),format);
   await expect(start).toHaveValue('31/02/2026');await expect(start).toHaveAttribute('type','text');await expect(start).toHaveAttribute('placeholder','dd/MM/yyyy');
   await expect(start).toBeFocused();
   expect(await start.evaluate(element=>element===(window as any).__dateFormatEditor)).toBe(true);
   expect(await start.evaluate(element=>(element as HTMLInputElement).selectionStart)).toBe(2);
   expect(await start.evaluate(element=>(element as HTMLInputElement).selectionEnd)).toBe(5);
   await expect(page.locator('#range-status')).toHaveText('INVALID');
   await expect(page.locator('#range-value')).toHaveText('{"start":"2026-02-01","end":"2026-02-07"}');
  }
  // Correct the draft using its displayed format; then the new configured format applies.
  await start.fill('02/02/2026');await expect(start).toHaveValue('2026-02-02');await expect(page.locator('#range-status')).toHaveText('VALID');
  await expect(page.locator('#range-value')).toHaveText('{"start":"2026-02-02","end":"2026-02-07"}');
  await start.fill('2026-02-30');
  await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'en-US',dateInputFormat:'native'}));
  await expect(start).toHaveValue('2026-02-30');await expect(start).toHaveAttribute('type','text');await expect(page.locator('#range-status')).toHaveText('INVALID');
  await picker.getByRole('button',{name:'Clear 期間 start date',exact:true}).click();
  await expect(start).toHaveValue('');await expect(start).toHaveAttribute('type','date');
  expect(await page.evaluate(()=>!!(window as any).__stage.range.errors?.dateRangeDraft)).toBe(false);
  await expect(page.locator('#range-value')).toHaveText('{"start":null,"end":"2026-02-07"}');
  // Clearing both endpoints restores an optional, empty, valid range.
  await range.getByRole('button',{name:'Clear date range',exact:true}).click();await expect(page.locator('#range-status')).toHaveText('VALID');
  await expect(page.locator('#range-value')).toHaveText('{"start":null,"end":null}');
  await page.evaluate(()=>{const app=(window as any).__stage;app.range.reset(app.initialRange);});
  await expect(start).toHaveValue('2026-02-01');await expect(start).toHaveAttribute('type','date');
  await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'en-US',dateInputFormat:'dd/MM/yyyy'}));
  await start.fill('31/02/2026');
  await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'en-US',dateInputFormat:'yyyy-MM-dd'}));
  await picker.getByRole('button',{name:'Open calendar for 期間 start date',exact:true}).click();
  await page.locator('dialog:modal button[data-date="2026-02-03"]').click();
  await expect(start).toHaveValue('2026-02-03');await expect(page.locator('#range-status')).toHaveText('VALID');
  await expect(page.locator('#range-value')).toHaveText('{"start":"2026-02-03","end":"2026-02-07"}');
  await start.fill('2026-02-30');
  await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'en-US',dateInputFormat:'dd/MM/yyyy'}));
  await page.evaluate(()=>{const app=(window as any).__stage;app.range.reset(app.initialRange);});
  await expect(start).toHaveValue('01/02/2026');await expect(page.locator('#range-status')).toHaveText('VALID');
 });

 test(`DateRange ${profile}: native badInput survives a requested custom format`,async({page})=>{
  await page.goto('/catalog/foundation');await expect(page.locator('#range-status')).toHaveText('VALID');
  await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'en-US',dateInputFormat:'native'});},profile);
  const range=page.locator('#range-case'),start=range.locator('input').first();
  await expect(start).toHaveAttribute('type','date');await start.focus();
  // Real native keyboard editing creates an incomplete date. Do not stub validity.badInput.
  await start.press('Home');await start.press('Backspace');
  expect(await start.evaluate(element=>(element as HTMLInputElement).validity.badInput)).toBe(true);
  await expect(page.locator('#range-status')).toHaveText('INVALID');
  await start.evaluate(element=>(window as any).__nativeDateFormatEditor=element);
  await page.evaluate(()=>(window as any).__stage.rootLocale.set({locale:'ja-JP',dateInputFormat:'dd/MM/yyyy'}));
  await expect(start).toHaveAttribute('type','date');await expect(start).toBeFocused();
  expect(await start.evaluate(element=>element===(window as any).__nativeDateFormatEditor)).toBe(true);
  expect(await start.evaluate(element=>(element as HTMLInputElement).validity.badInput)).toBe(true);
  await expect(page.locator('#range-status')).toHaveText('INVALID');
  await expect(page.locator('#range-value')).toHaveText('{"start":"2026-02-01","end":"2026-02-07"}');
  await range.locator('ui-date-picker').first().getByRole('button',{name:'期間の開始日をクリア',exact:true}).click();
  await expect(start).toHaveAttribute('type','text');await expect(start).toHaveValue('');
  expect(await page.evaluate(()=>!!(window as any).__stage.range.errors?.dateRangeDraft)).toBe(false);
 });
}
