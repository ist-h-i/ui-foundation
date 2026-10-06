import {test,expect} from './catalog-test';

for(const profile of ['guided','dense'] as const){
 test(`Composer explicit reset discards only previous request failure and keeps native draft: ${profile}`,async({page},info)=>{
  await page.goto('/catalog/foundation');
  await expect(page.locator('#composer-case textarea')).toBeVisible();
  await page.evaluate(profile=>(window as any).__stage.profile.set(profile),profile);
  const composer=page.locator('#composer-case'),input=composer.locator('textarea'),submit=composer.locator('button[type="submit"]');
  const original=await input.elementHandle();
  await input.fill('以前の申請');
  await submit.click();
  const rejected=await page.evaluate(()=>{const form=(window as any).__stage.newForms();return form.composer().failSend(form.requests().at(-1).requestId,'以前の申請は保存できませんでした。');});
  expect(rejected).toBe(true);
  await expect(composer.locator('[role="alert"]')).toHaveText('以前の申請は保存できませんでした。');
  await page.evaluate(()=>{(window as any).__stage.newForms().composerControl.reset('新しい申請');});
  await expect(input).toHaveValue('新しい申請');
  await expect(page.locator('#composer-value')).toHaveText('新しい申請');
  await expect(composer.locator('[role="alert"]')).toHaveCount(0);
  expect(await input.evaluate((element,old)=>element===old,original)).toBe(true);
  const oldAccepted=await page.evaluate(()=>{const form=(window as any).__stage.newForms();return form.composer().completeSend(form.requests()[0].requestId,true);});
  expect(oldAccepted).toBe(false);
  await expect(input).toHaveValue('新しい申請');
  await submit.click();
  expect(await page.evaluate(()=>{const form=(window as any).__stage.newForms();return form.composer().failSend(form.requests().at(-1).requestId,'現在の申請は再確認が必要です。');})).toBe(true);
  await expect(composer.locator('[role="alert"]')).toHaveText('現在の申請は再確認が必要です。');
  // Even the same-value reset is an explicit new form epoch.
  await page.evaluate(()=>{const form=(window as any).__stage.newForms();form.composerControl.reset(form.composerControl.value);});
  await expect(composer.locator('[role="alert"]')).toHaveCount(0);
  await expect(input).toHaveValue('新しい申請');
  await info.attach('explicit-reset-result',{body:JSON.stringify({profile,rejected,oldAccepted,nativeRetained:await input.evaluate((element,old)=>element===old,original)}),contentType:'application/json'});
 });
}
