import {test,expect} from './catalog-test';
import AxeBuilder from '@axe-core/playwright';

for(const profile of ['guided','dense']){
 test(`Scheduler accepted UTF-16 and prefix/suffix IDs preserve labels, focus and raw move IDs: ${profile}`,async({page},info)=>{
  await page.goto('/catalog/scheduler');
  await page.locator('#profile').selectOption(profile);
  await page.locator('#dataset').selectOption('ids');
  await page.locator('#schedule-view').selectOption('day');
  const schedule=page.locator('ui-scheduler');
  const ids=['x','preview-x','fold-fold','\ud800'];
  const cards=schedule.locator('[data-scheduler-event]');
  await expect(cards).toHaveCount(ids.length);
  for(let index=0;index<ids.length;index++)await cards.nth(index).locator('[data-move-editor]').click();
  const controls=await schedule.evaluate(host=>{
   const byId=new Map<string,Element[]>();
   for(const element of host.querySelectorAll('[id]'))byId.set(element.id,[...(byId.get(element.id)??[]),element]);
   const labels=Array.from(host.querySelectorAll<HTMLLabelElement>('label[for]')).map(label=>({for:label.htmlFor,control:label.control?.id??null}));
   return {duplicates:[...byId].filter(([,nodes])=>nodes.length>1).map(([id])=>id),labels};
  });
  expect(controls.duplicates).toEqual([]);
  expect(controls.labels.every(label=>label.control===label.for)).toBe(true);
  for(let index=0;index<ids.length;index++){
   const card=cards.nth(index),start=card.locator('input[type="datetime-local"]').first();
   const startId=await start.getAttribute('id');
   // Native labels use generated DOM IDs; raw accepted business IDs remain on the card/output.
   await card.locator(`label[for="${startId}"]`).click();
   await expect(start).toBeFocused();
   await card.getByRole('button',{name:'移動を要求',exact:true}).click();
   await expect(page.locator('#request-event-id')).toHaveText(JSON.stringify(ids[index]));
   await page.locator('#move-fail').click();
   await expect(start).toBeEnabled();
   await start.focus();
   await page.keyboard.press('Escape');
   await expect(start).not.toBeVisible();
   await expect(card.locator('[data-move-editor]')).toBeFocused();
  }
  const axe=await new AxeBuilder({page}).include('ui-scheduler').analyze();
  expect(axe.violations).toEqual([]);
  await info.attach('raw-id-and-dom-boundaries',{body:JSON.stringify({profile,ids,controls,axe}),contentType:'application/json'});
 });
}
