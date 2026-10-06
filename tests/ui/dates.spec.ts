import AxeBuilder from '@axe-core/playwright';
import type {Page} from '@playwright/test';
import {test,expect} from './catalog-test';
async function values(page:Page){return JSON.parse((await page.getByTestId('date-values').textContent())??'{}') as Record<string,unknown>;}
async function expectValues(page:Page,value:Record<string,unknown>){await expect.poll(()=>values(page)).toMatchObject(value);}
for(const profile of ['guided','dense']){
 test.describe(`dates ${profile}`,()=>{
  test.use({timezoneId:'America/Los_Angeles'});
  test.beforeEach(async({page})=>{await page.goto('/catalog');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);});
  test('civil date is unchanged in a DST timezone and native invalid/disabled dates can be repaired',async({page})=>{
   const date=page.locator('#event-date');await date.fill('2026-03-08');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expectValues(page,{date:'2026-03-08'});await expect(page.locator('ui-date-picker').filter({has:date})).toContainText('2026年3月8日');
   await date.fill('2026-10-03');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expect(date).toHaveAttribute('aria-invalid','true');await date.fill('2026-10-04');await expect(date).not.toHaveAttribute('aria-invalid');
   await page.getByRole('button',{name:'予定日をクリア',exact:true}).click();await expect(date).toBeFocused();await expectValues(page,{date:null});await expect(date).toHaveAttribute('aria-invalid','true');
  });
  test('calendar opens on the selected date, keyboard crosses month, unavailable days never commit, Escape restores focus',async({page})=>{
   const trigger=page.getByRole('button',{name:'予定日のカレンダーを開く',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'予定日の日付を選択',exact:true});
   await expect(dialog.locator('button[data-date="2026-10-05"]')).toBeFocused();await page.keyboard.press('ArrowLeft');await expect(dialog.locator('button[data-date="2026-10-04"]')).toBeFocused();
   await page.keyboard.press('ArrowLeft');const blocked=dialog.locator('button[data-date="2026-10-03"]');await expect(blocked).toHaveAttribute('aria-disabled','true');await blocked.press('Enter');await expectValues(page,{date:'2026-10-05'});await expect(dialog).toBeVisible();
   await page.keyboard.press('PageDown');await expect(dialog.locator('button[data-date="2026-11-03"]')).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
   await trigger.click();await dialog.locator('button[data-date="2026-10-05"]').press('ArrowRight');await page.keyboard.press('Enter');await expect(dialog).toBeHidden();await expectValues(page,{date:'2026-10-06'});await expect(trigger).toBeFocused();
   await page.locator('date-catalog').getByLabel('日付の初期表示を3月にする',{exact:true}).check();await page.getByRole('button',{name:'予定日をクリア',exact:true}).click();await trigger.click();await expect(dialog.locator('button[data-date="2026-03-01"]')).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  });
  test('rapid calendar keys continue across render boundaries and commit the logical destination',async({page})=>{
   const trigger=page.getByRole('button',{name:'予定日のカレンダーを開く',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'予定日の日付を選択',exact:true});const day=dialog.locator('button[data-date="2026-10-05"]');await expect(day).toBeFocused();
   await day.evaluate(element=>{element.dispatchEvent(new KeyboardEvent('keydown',{key:'PageDown',bubbles:true,cancelable:true}));const target=document.activeElement!;target.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));});
   await expectValues(page,{date:'2026-11-06'});await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  });
  test('explicit edit formats retain invalid drafts, clear/reset repair them and parse without guessing',async({page})=>{
   const date=page.locator('#event-date');await page.getByLabel('日付の入力書式',{exact:true}).selectOption('dd/MM/yyyy');await expect(date).toHaveValue('05/10/2026');
   await date.fill('31/02/2026');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expect(date).toHaveAttribute('aria-invalid','true');await expect(date).toHaveValue('31/02/2026');await expectValues(page,{date:'2026-10-05'});
   await date.fill('01/02/2026');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expectValues(page,{date:'2026-02-01'});await expect(date).not.toHaveAttribute('aria-invalid');
   await date.fill('不正な日付');await page.locator('date-catalog').getByRole('button',{name:'日付を初期化',exact:true}).click();await expect(date).toHaveValue('05/10/2026');
   await date.fill('31/02/2026');await date.press('Tab');await page.getByLabel('日付の入力書式',{exact:true}).selectOption('native');await expect(date).toHaveValue('31/02/2026');await expect(date).toHaveAttribute('type','text');await expect(date).toHaveAttribute('aria-invalid','true');await expectValues(page,{date:'2026-10-05'});await page.locator('date-catalog').getByRole('button',{name:'日付を初期化',exact:true}).click();await expect(date).toHaveAttribute('type','date');await expect(date).toHaveValue('2026-10-05');await expect(date).not.toHaveAttribute('aria-invalid');
  });
  test('range order/max duration/interior disabled days are validated; valid presets and multiple months work',async({page})=>{
   const range=page.locator('ui-date-range-picker');await range.locator('#event-range-start').fill('2026-10-01');await range.locator('#event-range-end').fill('2026-10-05');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expect(range).toContainText('選択できる範囲と入力内容を確認してください。');
   await expect(range.getByRole('button',{name:'選択不可日を含む期間',exact:true})).toBeDisabled();await range.getByRole('button',{name:'翌週の平日',exact:true}).click();await expectValues(page,{range:{start:'2026-10-05',end:'2026-10-09'}});
   await expect(range.locator('.ui-range-calendars > ui-calendar')).toHaveCount(2);await expect(range.locator('.ui-range-calendars > ui-calendar').nth(0)).toContainText('2026年10月');await expect(range.locator('.ui-range-calendars > ui-calendar').nth(1)).toContainText('2026年11月');
   await range.locator('#event-range-end').fill('2026-10-20');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expect(range).toContainText('選択できる範囲と入力内容を確認してください。');
   await range.getByRole('button',{name:'期間をクリア',exact:true}).click();await expectValues(page,{range:{start:null,end:null}});
  });
  test('a malformed range draft invalidates the parent without discarding the last range; preset, clear and reset repair it',async({page})=>{
   const range=page.locator('ui-date-range-picker'),start=page.locator('#event-range-start'),outside=page.locator('date-catalog').getByLabel('月曜から表示',{exact:true});
   await range.getByRole('button',{name:'翌週の平日',exact:true}).click();await expect(page.getByTestId('date-status')).toHaveText('日付: 有効');
   await start.click();await start.press('Backspace');expect(await start.evaluate(e=>(e as HTMLInputElement).validity.badInput)).toBe(true);await expect(page.getByTestId('date-status')).toHaveText('日付: 要確認');await expectValues(page,{range:{start:'2026-10-05',end:'2026-10-09'}});
   await outside.focus();await expect(range).toContainText('選択できる範囲と入力内容を確認してください。');await range.getByRole('button',{name:'翌週の平日',exact:true}).click();await expect(start).toHaveValue('2026-10-05');await expect(page.getByTestId('date-status')).toHaveText('日付: 有効');
   await page.getByLabel('日付の入力書式',{exact:true}).selectOption('dd/MM/yyyy');await start.fill('31/02/2026');await expect(page.getByTestId('date-status')).toHaveText('日付: 要確認');
   await range.getByRole('button',{name:'期間をクリア',exact:true}).click();await expect(start).toHaveValue('');await expect(page.getByTestId('date-status')).toHaveText('日付: 有効');
   await start.fill('不正');await page.locator('date-catalog').getByRole('button',{name:'日付を初期化',exact:true}).click();await expect(start).toHaveValue('');await expect(page.getByTestId('date-status')).toHaveText('日付: 有効');
  });
  test('datetime step uses the min date and time, agreeing with native validity',async({page})=>{
   await page.locator('date-catalog').getByLabel('日時を9:10起点の15分間隔にする',{exact:true}).check();const date=page.locator('#event-datetime'),outside=page.locator('date-catalog').getByLabel('月曜から表示',{exact:true});
   await date.fill('2026-10-05T09:25');await outside.focus();expect(await date.evaluate(e=>(e as HTMLInputElement).validity.stepMismatch)).toBe(false);await expect(date).not.toHaveAttribute('aria-invalid');
   await date.fill('2026-10-05T09:30');await outside.focus();expect(await date.evaluate(e=>(e as HTMLInputElement).validity.stepMismatch)).toBe(true);await expect(date).toHaveAttribute('aria-invalid','true');
   await date.fill('2026-10-06T09:25');await outside.focus();expect(await date.evaluate(e=>(e as HTMLInputElement).validity.stepMismatch)).toBe(false);await expect(date).not.toHaveAttribute('aria-invalid');
  });
  test('time intervals/12-hour display, explicit local timezone, month/year bounds and disable retain values',async({page})=>{
   const root=page.locator('date-catalog'),time=page.locator('#event-time');await time.fill('09:10');await page.locator('date-catalog').getByLabel('月曜から表示',{exact:true}).focus();await expect(time).toHaveAttribute('aria-invalid','true');await time.fill('13:15');await expect(time).not.toHaveAttribute('aria-invalid');await expect(root.locator('ui-time-picker')).toContainText('午後');
   await page.locator('#event-datetime').fill('2026-11-01T01:30');await expectValues(page,{datetime:'2026-11-01T01:30'});await expect(root.locator('ui-date-time-picker')).toContainText('Asia/Tokyo の現地日時');
   await page.locator('#event-month').fill('2027-01');await root.getByLabel('月曜から表示',{exact:true}).focus();await expect(page.locator('#event-month')).toHaveAttribute('aria-invalid','true');await page.locator('#event-month').fill('2026-12');
   await page.locator('#event-year').fill('2031');await root.getByLabel('月曜から表示',{exact:true}).focus();await expect(page.locator('#event-year')).toHaveAttribute('aria-invalid','true');await page.locator('#event-year').fill('2030');
   await root.getByRole('button',{name:'日付入力を無効にする',exact:true}).click();await expect(time).toBeDisabled();await root.getByRole('button',{name:'日付入力を有効にする',exact:true}).click();await expect(time).toHaveValue('13:15');
  });
  test('week starts/year months, day templates and RTL keyboard stay accessible at 320px/200%',async({page})=>{
   const root=page.locator('date-catalog'),calendar=page.locator('ui-calendar').filter({has:page.locator('#inline-calendar-heading')});await root.getByLabel('月曜から表示',{exact:true}).check();await expect(calendar.locator('thead th').first()).toHaveAttribute('abbr','月曜日');
   await root.getByRole('button',{name:'年の月一覧を切替',exact:true}).click();await expect(calendar.getByRole('button',{name:'1月',exact:true})).toBeVisible();await calendar.getByRole('button',{name:'1月',exact:true}).click();await expect(calendar).toContainText('2026年1月');
   await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('RTL',{exact:true}).check();
   const day=calendar.locator('button[data-date="2026-01-28"]');await day.focus();await day.press('End');await expect(calendar.locator('button[data-date="2026-02-01"]')).toBeFocused();
   const dateText=await day.evaluate(element=>{const node=element.querySelector('span')?.firstChild??element.firstChild;const range=document.createRange();range.selectNodeContents(node!);return Array.from(range.getClientRects()).map(r=>r.top);});expect(new Set(dateText).size).toBe(1);
   const region=calendar.getByRole('region',{name:'予定カレンダーの日付一覧',exact:true});expect(await region.evaluate(element=>element.scrollWidth>element.clientWidth)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  });
 });
}
