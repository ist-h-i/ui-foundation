# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagram-controlled-validation.spec.ts >> guided: Diagram rejects empty/excessive coordinates, preserves fractional edits and bounds repeated keyboard movement
- Location: tests/ui/diagram-controlled-validation.spec.ts:27:2

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "フロー編集の検証" [level=1] [ref=e4]
  - generic [ref=e5]:
    - 'button "プロファイル: guided" [ref=e6]'
    - 'button "方向: LTR" [ref=e7]'
    - generic [ref=e8]:
      - text: 読取り専用
      - checkbox "読取り専用" [ref=e9]
    - generic [ref=e10]:
      - text: 処理中
      - checkbox "処理中" [ref=e11]
    - generic [ref=e12]:
      - text: 操作抑止
      - checkbox "操作抑止" [ref=e13]
    - button "検証文言を切替" [ref=e14]
    - button "外部モデルを更新" [ref=e15]
    - button "元のモデルへ戻す" [ref=e16]
    - button "外部の空ラベル" [ref=e17]
    - button "外部の負座標" [ref=e18]
    - button "対象ノードを外部除去" [ref=e19]
  - region "申請フロー" [ref=e22]:
    - paragraph [ref=e23]: 申請フロー
    - generic [ref=e24]:
      - button "拡大" [ref=e25] [cursor=pointer]
      - button "縮小" [ref=e26] [cursor=pointer]
      - button "自動配置" [ref=e27] [cursor=pointer]
      - status [ref=e28]: 拡大率 1
    - region "申請フローの図" [ref=e29]:
      - generic [ref=e30]:
        - img [aria-hidden]:
          - generic: 確認
        - button "提出" [active] [ref=e31] [cursor=pointer]
        - button "承認" [ref=e32] [cursor=pointer]
    - region "申請フローの編集" [ref=e33]:
      - table [ref=e34]:
        - caption [ref=e35]: ノードのラベルと配置
        - rowgroup [ref=e36]:
          - row [ref=e37]:
            - columnheader "ノード" [ref=e38]
            - columnheader "横位置" [ref=e39]
            - columnheader "縦位置" [ref=e40]
            - columnheader "操作" [ref=e41]
        - rowgroup [ref=e42]:
          - row [ref=e43]:
            - cell [ref=e44]:
              - textbox "提出 ラベル" [ref=e45]: 提出
            - cell [ref=e46]:
              - spinbutton "提出 横位置" [ref=e47]: "48"
            - cell [ref=e48]:
              - spinbutton "提出 縦位置" [ref=e49]: "16"
            - cell [ref=e50]:
              - button "提出を削除" [ref=e51] [cursor=pointer]
          - row [ref=e52]:
            - cell [ref=e53]:
              - textbox "承認 ラベル" [ref=e54]: 承認
            - cell [ref=e55]:
              - spinbutton "承認 横位置" [ref=e56]: "300"
            - cell [ref=e57]:
              - spinbutton "承認 縦位置" [ref=e58]: "100"
            - cell [ref=e59]:
              - button "承認を削除" [ref=e60] [cursor=pointer]
    - generic [ref=e61]:
      - generic [ref=e62]:
        - text: 接続元
        - combobox "接続元" [ref=e63]:
          - option "選択" [selected]
          - option "提出"
          - option "承認"
      - generic [ref=e64]:
        - text: 接続先
        - combobox "接続先" [ref=e65]:
          - option "選択" [selected]
          - option "提出"
          - option "承認"
      - button "接続する" [disabled] [ref=e66]
      - button "ノードを追加" [ref=e67] [cursor=pointer]
    - list "接続" [ref=e68]:
      - listitem [ref=e69]:
        - button "提出 → 承認 確認" [ref=e70] [cursor=pointer]
        - button "接続を削除" [ref=e71] [cursor=pointer]
  - status [ref=e72]: 2 nodes / 1 edges
  - status [ref=e73]: "3"
  - status [ref=e74]: なし
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
> 32 |   await node.press('Shift+ArrowRight');expect(Number(await x.inputValue())).toBeGreaterThan(0);
     |                                                                             ^ Error: expect(received).toBeGreaterThan(expected)
  33 |   await x.fill('1000000');await x.press('Tab');const upperCount=await page.locator('[data-diagram-requests]').textContent();await node.focus();for(let index=0;index<4;index++)await node.press('ArrowRight');await expect(x).toHaveValue('1000000');await expect(page.locator('[data-diagram-requests]')).toHaveText(upperCount!);
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