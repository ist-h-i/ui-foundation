import {test,expect} from './catalog-test';
for(const profile of ['guided','dense'])for(const boundary of [
 {zone:'Asia/Tokyo',instant:'2026-09-30T15:30:00Z',day:'2026-10-01',month:'2026年10月',next:'2026年11月'},
 {zone:'America/Los_Angeles',instant:'2026-10-01T06:30:00Z',day:'2026-09-30',month:'2026年9月',next:'2026年10月'},
])test.describe('local defaults '+profile+' '+boundary.zone,()=>{
 test.use({timezoneId:boundary.zone});
 test('empty calendar and range use local today/month; explicit civil values and profile changes retain selection',async({page})=>{
  await page.clock.install({time:new Date(boundary.instant)});
  await page.goto('/catalog');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
  await page.getByLabel('端末日付の既定値を表示',{exact:true}).check();
  const calendar=page.getByTestId('local-calendar'),range=page.getByTestId('local-range');
  await expect(calendar.getByRole('heading')).toHaveText(boundary.month);
  const today=calendar.locator('button[data-date="'+boundary.day+'"]');
  await expect(today).toHaveAttribute('aria-current','date');await expect(today).toHaveAttribute('tabindex','0');
  await expect(range.getByRole('heading').nth(0)).toHaveText(boundary.month);await expect(range.getByRole('heading').nth(1)).toHaveText(boundary.next);
  await expect(page.locator('#inline-calendar-heading')).toHaveText('2026年10月');
  await expect(page.locator('#inline-calendar-heading').locator('..').locator('..').locator('button[aria-current="date"]')).toHaveAttribute('data-date','2026-10-05');
  await today.press('Enter');await expect(page.getByTestId('local-date')).toHaveText(boundary.day);
  await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');
  await expect(page.getByTestId('local-date')).toHaveText(boundary.day);await expect(today.locator('..')).toHaveAttribute('aria-selected','true');
 });
});
