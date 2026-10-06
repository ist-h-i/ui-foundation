import {test,expect} from './catalog-test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {profiles} from './specialist-test-helpers';

async function open(page:Page,profile:string):Promise<void>{
 await page.goto('/catalog/diagram-validation');await expect(page.getByRole('heading',{name:'フロー編集の検証',exact:true})).toBeVisible();
 if(profile==='dense')await page.getByRole('button',{name:'プロファイル: guided',exact:true}).click();
 await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);await expect(page.locator('.ui-diagram-node')).toHaveCount(2);
}
const model=(page:Page)=>page.locator('[data-diagram-model]').getAttribute('data-value');

for(const profile of profiles){
 test(profile+': Diagram rejection retains app model, selection, raw input, focused DOM and live locale/profile presentation',async({page})=>{
  await open(page,profile);const node=page.locator('.ui-diagram-node').first(),editor=page.locator('tbody tr').first().locator('input').nth(0);
  await node.click();await expect(page.locator('[data-diagram-selected]')).toHaveText('a');const before=await model(page);
  await editor.fill('   ');await editor.press('Tab');await expect(editor).toHaveAttribute('aria-invalid','true');await expect(page.locator('[data-diagram-requests]')).toHaveText('0');expect(await model(page)).toBe(before);
  await editor.focus();await editor.evaluate((element:HTMLInputElement)=>element.setSelectionRange(1,1));const handle=await editor.elementHandle();
  await page.getByRole('button',{name:/プロファイル:/}).evaluate((button:HTMLButtonElement)=>button.click());
  await expect(editor).toHaveValue('   ');await expect(editor).toBeFocused();expect(await handle!.evaluate(element=>element===document.querySelector('tbody tr input'))).toBe(true);expect(await editor.evaluate((element:HTMLInputElement)=>element.selectionStart)).toBe(1);
  await page.getByRole('button',{name:'検証文言を切替',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());
  await expect(page.getByRole('alert')).toContainText('Enter a node label.');await expect(editor).toBeFocused();await expect(editor).toHaveValue('   ');await expect(node).toHaveText('提出');await expect(node).toHaveAttribute('aria-pressed','true');expect(await model(page)).toBe(before);
  const description=await editor.getAttribute('aria-describedby');expect(description).toBeTruthy();await expect(page.locator('[id="'+description+'"]')).toContainText('Enter a node label.');
  await editor.fill('  完了  ');await editor.press('Tab');await expect(page.getByRole('alert')).toHaveCount(0);await expect(node).toHaveText('  完了  ');await expect(page.locator('[data-diagram-requests]')).toHaveText('1');
 });

 test(profile+': Diagram rejects empty/excessive coordinates, preserves fractional edits and bounds repeated keyboard movement',async({page})=>{
  await open(page,profile);const row=page.locator('tbody tr').first(),x=row.locator('input').nth(1),node=page.locator('.ui-diagram-node').first();const before=await model(page);
  for(const raw of ['', '-1','1000000.01']){await x.fill(raw);await x.press('Tab');await expect(x).toHaveValue(raw);await expect(x).toHaveAttribute('aria-invalid','true');expect(await model(page)).toBe(before);await expect(page.locator('[data-diagram-requests]')).toHaveText('0');}
  await x.fill('0.125');await x.press('Tab');await expect(x).toHaveValue('0.125');await expect(page.getByRole('alert')).toHaveCount(0);expect(JSON.parse((await model(page))!).nodes[0].x).toBe(.125);
  await x.fill('0');await x.press('Tab');await expect.poll(async()=>JSON.parse((await model(page))!).nodes[0].x).toBe(0);const count=await page.locator('[data-diagram-requests]').textContent();await node.focus();for(let index=0;index<8;index++)await node.press('ArrowLeft');await expect(x).toHaveValue('0');await expect(node).toBeFocused();await expect(page.locator('[data-diagram-requests]')).toHaveText(count!);
  await node.press('Shift+ArrowRight');await expect.poll(async()=>Number(await x.inputValue())).toBeGreaterThan(0);await expect.poll(async()=>JSON.parse((await model(page))!).nodes[0].x).toBeGreaterThan(0);
  await x.fill('1000000');await x.press('Tab');await expect.poll(async()=>JSON.parse((await model(page))!).nodes[0].x).toBe(1000000);const upperCount=await page.locator('[data-diagram-requests]').textContent();await node.focus();for(let index=0;index<4;index++)await node.press('ArrowRight');await expect(x).toHaveValue('1000000');await expect(page.locator('[data-diagram-requests]')).toHaveText(upperCount!);
 });

 test(profile+': Diagram external values retire stale validation and removed-node drafts do not return after app reset',async({page})=>{
  await open(page,profile);const row=page.locator('tbody tr').first(),label=row.locator('input').nth(0),x=row.locator('input').nth(1);
  await label.fill('');await label.press('Tab');await x.fill('-10');await x.press('Tab');await expect(label).toHaveAttribute('aria-invalid','true');await expect(x).toHaveAttribute('aria-invalid','true');
  await page.getByRole('button',{name:'外部モデルを更新',exact:true}).click();await expect(label).toHaveValue('外部から更新');await expect(x).toHaveValue('64');await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('[data-diagram-requests]')).toHaveText('0');
  await page.getByRole('button',{name:'元のモデルへ戻す',exact:true}).click();await expect(label).toHaveValue('提出');await expect(x).toHaveValue('16');await expect(label).not.toHaveAttribute('aria-invalid','true');await expect(x).not.toHaveAttribute('aria-invalid','true');
  await label.fill(' ');await label.press('Tab');await page.getByRole('button',{name:'対象ノードを外部除去',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.ui-diagram-node')).toHaveCount(1);
  await page.getByRole('button',{name:'元のモデルへ戻す',exact:true}).click();await expect(label).toHaveValue('提出');await expect(label).not.toHaveAttribute('aria-invalid','true');await expect(page.getByRole('alert')).toHaveCount(0);
 });

 test(profile+': Diagram rejects invalid external models before canvas rendering and recovers without publishing edits',async({page})=>{
  await open(page,profile);
  for(const [button,diagnostic] of [['外部の空ラベル','Node labels must not be empty'],['外部の負座標','Node coordinates are invalid']]){
   await page.getByRole('button',{name:button!,exact:true}).click();await expect(page.getByRole('alert')).toContainText(diagnostic!);await expect(page.locator('.ui-diagram-node')).toHaveCount(0);await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.locator('tbody input').first()).toBeDisabled();await expect(page.locator('[data-diagram-requests]')).toHaveText('0');
   await page.getByRole('button',{name:'元のモデルへ戻す',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.ui-diagram-node')).toHaveCount(2);await expect(page.locator('tbody input').first()).toBeEnabled();
  }
 });

 test(profile+': Diagram retains rejected raw edits through readonly, busy and disabled states and rejects repeated invalid commits',async({page})=>{
  await open(page,profile);const x=page.locator('tbody tr').first().locator('input').nth(1);await x.fill('-50');await x.press('Tab');const before=await model(page),handle=await x.elementHandle();
  for(const state of ['読取り専用','処理中','操作抑止']){
   const control=page.getByLabel(state,{exact:true});await control.check();await expect(x).toBeDisabled();await expect(x).toHaveValue('-50');expect(await model(page)).toBe(before);await control.uncheck();await expect(x).toBeEnabled();await expect(x).toHaveValue('-50');expect(await handle!.evaluate(element=>element===document.querySelector('tbody tr input[type=number]'))).toBe(true);
  }
  for(const raw of ['-51','-52','-53','-54']){await x.fill(raw);await x.press('Tab');await expect(x).toHaveAttribute('aria-invalid','true');}
  expect(await model(page)).toBe(before);await expect(page.locator('[data-diagram-requests]')).toHaveText('0');const message=await page.getByRole('alert').textContent();expect(message!.split('位置は0〜1000000の範囲で入力してください。').length).toBe(2);
  await x.fill('24');await x.press('Tab');await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('[data-diagram-requests]')).toHaveText('1');
 });

 test(profile+': Diagram invalid-edit feedback remains named and reachable at 320px, 200 percent, RTL and reduced motion',async({page},info)=>{
  await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await open(page,profile);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'方向: LTR',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('dir','rtl');
  const label=page.locator('tbody tr').first().locator('input').nth(0);await label.fill('');await label.press('Tab');await expect(label).toHaveAttribute('aria-invalid','true');await label.focus();await expect(label).toBeFocused();
  const snapshot=await page.locator('ui-flow-editor').ariaSnapshot();expect(snapshot).toContain('ノードのラベルを入力してください。');expect(snapshot).toContain('textbox "提出 ラベル"');
  await label.scrollIntoViewIfNeeded();const box=await label.boundingBox();expect(box).not.toBeNull();expect(await label.evaluate(element=>{const r=element.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===element;})).toBe(true);
  const result=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await info.attach('diagram-axe-after-invalid-edit',{body:JSON.stringify(result),contentType:'application/json'});expect(result.violations).toEqual([]);
  await info.attach('diagram-invalid-edit-narrow',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 });
}
