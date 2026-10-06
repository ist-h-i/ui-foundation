import {test,expect} from './catalog-test';

for(const profile of ['guided','dense'])test(`Scheduler ${profile}: changing date, resource or zone clears the preceding owned status`,async({page})=>{
 await page.goto('/catalog/scheduler');
 await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();
 await page.locator('#profile').selectOption(profile);
 await page.locator('#schedule-view').selectOption('day');
 const card=page.locator('ui-scheduler [data-scheduler-event="fold"]');
 await card.locator('[data-move-editor]').click();
 const editor=card.locator('.ui-scheduler-move'),zone=editor.getByLabel('移動先タイムゾーン',{exact:true}),status=editor.getByRole('status');
 const memo=page.locator('#booking-note'),memoNode=await memo.elementHandle();
 await memo.fill('移動先を修復しても保持するメモ');
 await zone.fill('');
 const reject=async()=>{
  await editor.getByRole('button',{name:'移動を要求',exact:true}).click();
  await expect(status).not.toHaveText('');
  await expect(page.locator('#request-count')).toHaveText('0');
 };
 await reject();
 await editor.getByLabel('開始の現地日時',{exact:true}).fill('2026-11-01T00:31');
 await expect(status).toHaveText('');
 await expect(editor.getByRole('alert')).toBeVisible();
 await reject();
 await editor.getByLabel('西会議室',{exact:true}).check();
 await expect(status).toHaveText('');
 await reject();
 await zone.fill('UTC');
 await expect(status).toHaveText('');
 await expect(editor.getByRole('alert')).toHaveCount(0);
 await expect(zone).toBeFocused();
 await expect(memo).toHaveValue('移動先を修復しても保持するメモ');
 expect(await memo.evaluate((node,previous)=>node===previous,memoNode)).toBe(true);
 await expect(page.locator('#request-count')).toHaveText('0');
});
