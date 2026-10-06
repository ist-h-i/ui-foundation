import {test,expect} from './catalog-test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page:Page,profile:'guided'|'dense'):Promise<void>{
 await page.goto('/catalog/diagram-critic');
 await expect(page.getByRole('heading',{name:'独立 Diagram consumer',exact:true})).toBeVisible();
 if(profile==='dense')await page.getByRole('button',{name:'profile guided',exact:true}).click();
 await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
 await expect(page.locator('#primary .ui-diagram-node')).toHaveCount(2);
 await expect.poll(()=>page.locator('#primary .ui-diagram-node').first().evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThan(0);
}
const model=(page:Page)=>page.locator('#app-model').getAttribute('data-json');
const appNode=async(page:Page):Promise<{id:string;label:string;x:number;y:number}>=>JSON.parse((await model(page))!).nodes[0];

for(const profile of ['guided','dense'] as const){
 test(profile+': independent public Diagram consumer keeps isolated errors, live locale, external fields and controlled data',async({page},info)=>{
  await open(page,profile);
  const main=page.locator('#primary'),secondary=page.locator('#secondary');
  const row=main.locator('tbody tr').first(),label=row.locator('input').nth(0),x=row.locator('input').nth(1),y=row.locator('input').nth(2);
  const canvas=main.locator('.ui-diagram-node').first();await canvas.click();await expect(page.locator('#selected')).toHaveText('a');
  const before=await model(page);await label.fill('\u3000');await label.press('Tab');
  await expect(label).toHaveValue('\u3000');await expect(label).toHaveAttribute('aria-invalid','true');expect(await model(page)).toBe(before);await expect(page.locator('#app-model')).toHaveText('0 requests');await expect(canvas).toHaveText('提出 α');
  const other=secondary.locator('tbody tr').first().locator('input').nth(0);await other.fill('');await other.press('Tab');await expect(other).toHaveAttribute('aria-invalid','true');
  const firstId=await label.getAttribute('aria-describedby'),secondId=await other.getAttribute('aria-describedby');expect(firstId).toBeTruthy();expect(secondId).toBeTruthy();expect(firstId).not.toBe(secondId);
  await expect(main.locator('[id="'+firstId+'"]')).toHaveAttribute('role','alert');await expect(secondary.locator('[id="'+secondId+'"]')).toHaveAttribute('role','alert');
  await label.focus();await label.evaluate(element=>{if(!(element instanceof HTMLInputElement))throw new Error('Expected native input');element.setSelectionRange(1,1);});const handle=await label.elementHandle();
  await page.getByRole('button',{name:'locale',exact:true}).evaluate(element=>{if(!(element instanceof HTMLButtonElement))throw new Error('Expected native button');element.click();});
  await expect(main.getByRole('alert')).toContainText('Label is required.');await expect(label).toBeFocused();await expect(label).toHaveValue('\u3000');await expect(canvas).toHaveText('提出 α');expect(await model(page)).toBe(before);
  await page.getByRole('button',{name:/^profile /}).evaluate(element=>{if(!(element instanceof HTMLButtonElement))throw new Error('Expected native button');element.click();});await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile==='guided'?'dense':'guided');
  await expect(label).toBeFocused();expect(await handle!.evaluate(element=>element===document.querySelector('#primary tbody tr input'))).toBe(true);expect(await label.evaluate(element=>{if(!(element instanceof HTMLInputElement))throw new Error('Expected native input');return element.selectionStart;})).toBe(1);
  await label.fill('  α 修正  ');await label.press('Tab');await expect.poll(async()=>(await appNode(page)).label).toBe('  α 修正  ');await expect(main.getByRole('alert')).toHaveCount(0);await expect(secondary.getByRole('alert')).toHaveCount(1);await expect(canvas).toHaveText('  α 修正  ');
  await x.fill('-0.5');await x.press('Tab');await expect(x).toHaveAttribute('aria-invalid','true');await expect(x).toHaveValue('-0.5');const unchanged=await model(page);
  await page.getByRole('button',{name:'app y',exact:true}).click();await expect(y).toHaveValue('123.5');await expect(x).toHaveValue('-0.5');await expect(x).toHaveAttribute('aria-invalid','true');expect((await appNode(page)).x).toBe(12.5);
  for(const state of ['readonly','busy','disabled']){const checkbox=page.getByLabel(state,{exact:true});await checkbox.check();await expect(x).toBeDisabled();await expect(x).toHaveValue('-0.5');await checkbox.uncheck();await expect(x).toBeEnabled();await expect(x).toHaveValue('-0.5');}
  await x.fill('0.125');await x.press('Tab');await expect.poll(async()=>(await appNode(page)).x).toBe(.125);await expect(main.getByRole('alert')).toHaveCount(0);await expect(x).not.toHaveAttribute('aria-invalid','true');
  await label.fill('');await label.press('Tab');await expect(label).toHaveAttribute('aria-invalid','true');await page.getByRole('button',{name:'app label',exact:true}).click();await expect(label).toHaveValue('APP 更新');await expect(label).not.toHaveAttribute('aria-invalid','true');await expect(main.getByRole('alert')).toHaveCount(0);
  await label.fill(' ');await label.press('Tab');await page.getByRole('button',{name:'app remove',exact:true}).click();await expect(main.locator('.ui-diagram-node')).toHaveCount(1);await expect(main.getByRole('alert')).toHaveCount(0);await page.getByRole('button',{name:'reset',exact:true}).click();await expect(label).toHaveValue('提出 α');await expect(label).not.toHaveAttribute('aria-invalid','true');
  await page.getByRole('button',{name:'app invalid',exact:true}).click();await expect(main.getByRole('alert')).toContainText('Invalid application coordinates.');await expect(main.locator('.ui-diagram-node')).toHaveCount(0);await expect(main.locator('tbody tr')).toHaveCount(2);await expect(x).toBeDisabled();expect((await appNode(page)).x).toBe(-4);await expect(page.locator('#app-model')).toHaveText('0 requests');
  await page.getByRole('button',{name:'reset',exact:true}).click();await expect(main.locator('.ui-diagram-node')).toHaveCount(2);await expect(x).toBeEnabled();
  await info.attach('independent-model-and-error-observations',{body:JSON.stringify({profile,initialModel:before,modelAfterNegativeDraft:unchanged,isolatedErrorIds:[firstId,secondId],finalModel:await model(page),publicConsumer:true}),contentType:'application/json'});
 });

 test(profile+': independent public Diagram consumer preserves bounded physical keyboard movement and named editors in narrow RTL',async({page},info)=>{
  await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await open(page,profile);await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.getByRole('button',{name:'direction ltr',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('dir','rtl');
  const main=page.locator('#primary'),row=main.locator('tbody tr').first(),x=row.locator('input').nth(1),y=row.locator('input').nth(2),label=row.locator('input').nth(0),node=main.locator('.ui-diagram-node').first();
  await x.fill('0');await x.press('Tab');await expect.poll(async()=>(await appNode(page)).x).toBe(0);const atZero=await model(page);await node.focus();await node.press('ArrowLeft');await node.press('ArrowLeft');await expect(node).toBeFocused();expect(await model(page)).toBe(atZero);
  await node.press('Shift+ArrowRight');await expect.poll(async()=>(await appNode(page)).x).toBeGreaterThan(0);await expect(node).toBeFocused();
  await x.fill('1000000');await x.press('Tab');await expect.poll(async()=>(await appNode(page)).x).toBe(1000000);const atMaximum=await model(page);await node.focus();await node.press('ArrowRight');await node.press('ArrowRight');expect(await model(page)).toBe(atMaximum);await expect(node).toBeFocused();
  await y.fill('-1');await y.press('Tab');await expect(y).toHaveValue('-1');await expect(y).toHaveAttribute('aria-invalid','true');expect(await model(page)).toBe(atMaximum);await y.fill('0');await y.press('Tab');await expect.poll(async()=>(await appNode(page)).y).toBe(0);
  await page.getByRole('button',{name:'reset',exact:true}).click();await expect(x).toHaveValue('12.5');await label.fill('');await label.press('Tab');await expect(label).toHaveAttribute('aria-invalid','true');await label.focus();await label.scrollIntoViewIfNeeded();await expect(label).toBeFocused();
  const hit=await label.evaluate(element=>{const r=element.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===element;});expect(hit).toBe(true);
  const snapshot=await main.ariaSnapshot();expect(snapshot).toContain('textbox "提出 α ラベル"');expect(snapshot).toContain('ノードのラベルを入力してください。');expect(snapshot).toContain('region "独立フローの編集"');
  const result=await new AxeBuilder({page}).include('#primary').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await info.attach('independent-narrow-axe',{body:JSON.stringify(result),contentType:'application/json'});expect(result.violations).toEqual([]);
  const geometry=await page.evaluate(()=>({pageClientWidth:document.documentElement.clientWidth,pageScrollWidth:document.documentElement.scrollWidth,regions:Array.from(document.querySelectorAll('#primary [role=region]'),element=>({label:element.getAttribute('aria-label'),scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,tabindex:element.getAttribute('tabindex')}))}));expect(geometry.pageScrollWidth).toBeLessThanOrEqual(geometry.pageClientWidth+1);
  await info.attach('independent-narrow-raw',{body:JSON.stringify({profile,geometry,hit,model:await model(page),aria:snapshot,axeIncomplete:result.incomplete.length}),contentType:'application/json'});await info.attach('independent-narrow-image',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 });
}
