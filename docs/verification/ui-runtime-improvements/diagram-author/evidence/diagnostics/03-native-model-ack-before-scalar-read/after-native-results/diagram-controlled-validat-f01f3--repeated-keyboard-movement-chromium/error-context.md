# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagram-controlled-validation.spec.ts >> dense: Diagram rejects empty/excessive coordinates, preserves fractional edits and bounds repeated keyboard movement
- Location: tests/ui/diagram-controlled-validation.spec.ts:27:2

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-diagram-requests]')
Expected: "3"
Received: "4"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('[data-diagram-requests]') with timeout 5000ms
  - waiting for locator('[data-diagram-requests]')
    14 × locator resolved to <output data-diagram-requests="">4</output>
       - unexpected value "4"

```

```yaml
- status: "4"
```

# Test source

```ts
  1  | import {test,expect} from './catalog-test';
  2  | import type {Page} from '@playwright/test';
  3  | import AxeBuilder from '@axe-core/playwright';
  4  | import {profiles} from './specialist-test-helpers';
  5  | 
  6  | async function open(page:Page,profile:string):Promise<void>{
  7  |  await page.goto('/catalog/diagram-validation');await expect(page.getByRole('heading',{name:'フロー編集の検証',exact:true})).toBeVisible();
  8  |  if(profile==='dense')await page.getByRole('button',{name:'プロファイル: guided',exact:true}).click();
  9  |  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);await expect(page.locator('.ui-diagram-node')).toHaveCount(2);
  10 | }
  11 | const model=(page:Page)=>page.locator('[data-diagram-model]').getAttribute('data-value');
  12 | 
  13 | for(const profile of profiles){
  14 |  test(profile+': Diagram rejection retains app model, selection, raw input, focused DOM and live locale/profile presentation',async({page})=>{
  15 |   await open(page,profile);const node=page.locator('.ui-diagram-node').first(),editor=page.locator('tbody tr').first().locator('input').nth(0);
  16 |   await node.click();await expect(page.locator('[data-diagram-selected]')).toHaveText('a');const before=await model(page);
  17 |   await editor.fill('   ');await editor.press('Tab');await expect(editor).toHaveAttribute('aria-invalid','true');await expect(page.locator('[data-diagram-requests]')).toHaveText('0');expect(await model(page)).toBe(before);
  18 |   await editor.focus();await editor.evaluate((element:HTMLInputElement)=>element.setSelectionRange(1,1));const handle=await editor.elementHandle();
  19 |   await page.getByRole('button',{name:/プロファイル:/}).evaluate((button:HTMLButtonElement)=>button.click());
  20 |   await expect(editor).toHaveValue('   ');await expect(editor).toBeFocused();expect(await handle!.evaluate(element=>element===document.querySelector('tbody tr input'))).toBe(true);expect(await editor.evaluate((element:HTMLInputElement)=>element.selectionStart)).toBe(1);
  21 |   await page.getByRole('button',{name:'検証文言を切替',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());
  22 |   await expect(page.getByRole('alert')).toContainText('Enter a node label.');await expect(editor).toBeFocused();await expect(editor).toHaveValue('   ');await expect(node).toHaveText('提出');await expect(node).toHaveAttribute('aria-pressed','true');expect(await model(page)).toBe(before);
  23 |   const description=await editor.getAttribute('aria-describedby');expect(description).toBeTruthy();await expect(page.locator('[id="'+description+'"]')).toContainText('Enter a node label.');
  24 |   await editor.fill('  完了  ');await editor.press('Tab');await expect(page.getByRole('alert')).toHaveCount(0);await expect(node).toHaveText('  完了  ');await expect(page.locator('[data-diagram-requests]')).toHaveText('1');
  25 |  });
  26 | 
  27 |  test(profile+': Diagram rejects empty/excessive coordinates, preserves fractional edits and bounds repeated keyboard movement',async({page})=>{
  28 |   await open(page,profile);const row=page.locator('tbody tr').first(),x=row.locator('input').nth(1),node=page.locator('.ui-diagram-node').first();const before=await model(page);
  29 |   for(const raw of ['', '-1','1000000.01']){await x.fill(raw);await x.press('Tab');await expect(x).toHaveValue(raw);await expect(x).toHaveAttribute('aria-invalid','true');expect(await model(page)).toBe(before);await expect(page.locator('[data-diagram-requests]')).toHaveText('0');}
  30 |   await x.fill('0.125');await x.press('Tab');await expect(x).toHaveValue('0.125');await expect(page.getByRole('alert')).toHaveCount(0);expect(JSON.parse((await model(page))!).nodes[0].x).toBe(.125);
  31 |   await x.fill('0');await x.press('Tab');const count=await page.locator('[data-diagram-requests]').textContent();await node.focus();for(let index=0;index<8;index++)await node.press('ArrowLeft');await expect(x).toHaveValue('0');await expect(node).toBeFocused();await expect(page.locator('[data-diagram-requests]')).toHaveText(count!);
  32 |   await node.press('Shift+ArrowRight');expect(Number(await x.inputValue())).toBeGreaterThan(0);
> 33 |   await x.fill('1000000');await x.press('Tab');const upperCount=await page.locator('[data-diagram-requests]').textContent();await node.focus();for(let index=0;index<4;index++)await node.press('ArrowRight');await expect(x).toHaveValue('1000000');await expect(page.locator('[data-diagram-requests]')).toHaveText(upperCount!);
     |                                                                                                                                                                                                                                                                                                            ^ Error: expect(locator).toHaveText(expected) failed
  34 |  });
  35 | 
  36 |  test(profile+': Diagram external values retire stale validation and removed-node drafts do not return after app reset',async({page})=>{
  37 |   await open(page,profile);const row=page.locator('tbody tr').first(),label=row.locator('input').nth(0),x=row.locator('input').nth(1);
  38 |   await label.fill('');await label.press('Tab');await x.fill('-10');await x.press('Tab');await expect(label).toHaveAttribute('aria-invalid','true');await expect(x).toHaveAttribute('aria-invalid','true');
  39 |   await page.getByRole('button',{name:'外部モデルを更新',exact:true}).click();await expect(label).toHaveValue('外部から更新');await expect(x).toHaveValue('64');await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('[data-diagram-requests]')).toHaveText('0');
  40 |   await page.getByRole('button',{name:'元のモデルへ戻す',exact:true}).click();await expect(label).toHaveValue('提出');await expect(x).toHaveValue('16');await expect(label).not.toHaveAttribute('aria-invalid','true');await expect(x).not.toHaveAttribute('aria-invalid','true');
  41 |   await label.fill(' ');await label.press('Tab');await page.getByRole('button',{name:'対象ノードを外部除去',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.ui-diagram-node')).toHaveCount(1);
  42 |   await page.getByRole('button',{name:'元のモデルへ戻す',exact:true}).click();await expect(label).toHaveValue('提出');await expect(label).not.toHaveAttribute('aria-invalid','true');await expect(page.getByRole('alert')).toHaveCount(0);
  43 |  });
  44 | 
  45 |  test(profile+': Diagram rejects invalid external models before canvas rendering and recovers without publishing edits',async({page})=>{
  46 |   await open(page,profile);
  47 |   for(const [button,diagnostic] of [['外部の空ラベル','Node labels must not be empty'],['外部の負座標','Node coordinates are invalid']]){
  48 |    await page.getByRole('button',{name:button!,exact:true}).click();await expect(page.getByRole('alert')).toContainText(diagnostic!);await expect(page.locator('.ui-diagram-node')).toHaveCount(0);await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.locator('tbody input').first()).toBeDisabled();await expect(page.locator('[data-diagram-requests]')).toHaveText('0');
  49 |    await page.getByRole('button',{name:'元のモデルへ戻す',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.ui-diagram-node')).toHaveCount(2);await expect(page.locator('tbody input').first()).toBeEnabled();
  50 |   }
  51 |  });
  52 | 
  53 |  test(profile+': Diagram retains rejected raw edits through readonly, busy and disabled states and rejects repeated invalid commits',async({page})=>{
  54 |   await open(page,profile);const x=page.locator('tbody tr').first().locator('input').nth(1);await x.fill('-50');await x.press('Tab');const before=await model(page),handle=await x.elementHandle();
  55 |   for(const state of ['読取り専用','処理中','操作抑止']){
  56 |    const control=page.getByLabel(state,{exact:true});await control.check();await expect(x).toBeDisabled();await expect(x).toHaveValue('-50');expect(await model(page)).toBe(before);await control.uncheck();await expect(x).toBeEnabled();await expect(x).toHaveValue('-50');expect(await handle!.evaluate(element=>element===document.querySelector('tbody tr input[type=number]'))).toBe(true);
  57 |   }
  58 |   for(const raw of ['-51','-52','-53','-54']){await x.fill(raw);await x.press('Tab');await expect(x).toHaveAttribute('aria-invalid','true');}
  59 |   expect(await model(page)).toBe(before);await expect(page.locator('[data-diagram-requests]')).toHaveText('0');const message=await page.getByRole('alert').textContent();expect(message!.split('位置は0〜1000000の範囲で入力してください。').length).toBe(2);
  60 |   await x.fill('24');await x.press('Tab');await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('[data-diagram-requests]')).toHaveText('1');
  61 |  });
  62 | 
  63 |  test(profile+': Diagram invalid-edit feedback remains named and reachable at 320px, 200 percent, RTL and reduced motion',async({page},info)=>{
  64 |   await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await open(page,profile);
  65 |   await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'方向: LTR',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('dir','rtl');
  66 |   const label=page.locator('tbody tr').first().locator('input').nth(0);await label.fill('');await label.press('Tab');await expect(label).toHaveAttribute('aria-invalid','true');await label.focus();await expect(label).toBeFocused();
  67 |   const snapshot=await page.locator('ui-flow-editor').ariaSnapshot();expect(snapshot).toContain('ノードのラベルを入力してください。');expect(snapshot).toContain('textbox "提出 ラベル"');
  68 |   await label.scrollIntoViewIfNeeded();const box=await label.boundingBox();expect(box).not.toBeNull();expect(await label.evaluate(element=>{const r=element.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===element;})).toBe(true);
  69 |   const result=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await info.attach('diagram-axe-after-invalid-edit',{body:JSON.stringify(result),contentType:'application/json'});expect(result.violations).toEqual([]);
  70 |   await info.attach('diagram-invalid-edit-narrow',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  71 |  });
  72 | }
  73 | 
```