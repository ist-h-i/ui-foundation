# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagram-validation.spec.ts >> dense: Diagram rejects negative x without changing the reachable canvas and supports correction
- Location: tests/ui/diagram-validation.spec.ts:20:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByLabel('提出 横位置', { exact: true })
Expected: "true"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByLabel('提出 横位置', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('提出 横位置', { exact: true })
    14 × locator resolved to <input type="number" aria-label="提出 横位置" _ngcontent-ng-c2091704700=""/>
       - unexpected value "null"

```

```yaml
- spinbutton "提出 横位置": "-50"
```

# Test source

```ts
  1  | import {test,expect} from './catalog-test';
  2  | import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';
  3  | 
  4  | for(const profile of profiles){
  5  |  for(const [description,raw] of [['empty',''],['whitespace','   ']] as const){
  6  |   test(profile+': Diagram rejects '+description+' label and retains the named canvas node, raw input and native focus path',async({page},info)=>{
  7  |    await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
  8  |    const editor=page.locator('#flow tbody tr').first().locator('input').nth(0);await expect(editor).toHaveAttribute('aria-label','提出 ラベル');await editor.fill(raw);await editor.press('Tab');
  9  |    await expect(editor).toHaveValue(raw);await expect(editor).toHaveAttribute('aria-invalid','true');
  10 |    await expect(page.locator('#flow [role=alert]')).toContainText('ノードのラベルを入力してください。');
  11 |    await expect(page.locator('#flow .ui-diagram-node').getByText('提出',{exact:true})).toHaveCount(1);
  12 |    await expect(page.getByLabel('提出 横位置',{exact:true})).toBeFocused();
  13 |    await editor.fill('  更新した提出  ');await editor.press('Tab');
  14 |    await expect(page.locator('#flow .ui-diagram-node').first()).toHaveText('  更新した提出  ');await expect(page.locator('#flow [role=alert]')).toHaveCount(0);
  15 |    await expect(editor).not.toHaveAttribute('aria-invalid','true');
  16 |    await info.attach('corrected-label',{body:JSON.stringify({profile,raw,modelLabel:await page.locator('#flow .ui-diagram-node').first().textContent()}),contentType:'application/json'});
  17 |   });
  18 |  }
  19 |  for(const axis of ['x','y'] as const){
  20 |   test(profile+': Diagram rejects negative '+axis+' without changing the reachable canvas and supports correction',async({page},info)=>{
  21 |    await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
  22 |    const editor=page.getByLabel(axis==='x'?'提出 横位置':'提出 縦位置',{exact:true}),node=page.locator('#flow .ui-diagram-node').first();
  23 |    const previous=await node.evaluate(element=>({left:(element as HTMLElement).style.left,top:(element as HTMLElement).style.top}));
> 24 |    await editor.fill('-50');await editor.press('Tab');await expect(editor).toHaveValue('-50');await expect(editor).toHaveAttribute('aria-invalid','true');
     |                                                                                                                    ^ Error: expect(locator).toHaveAttribute(expected) failed
  25 |    await expect(page.locator('#flow [role=alert]')).toContainText('位置は0〜1000000の範囲で入力してください。');
  26 |    expect(await node.evaluate(element=>({left:(element as HTMLElement).style.left,top:(element as HTMLElement).style.top}))).toEqual(previous);
  27 |    await editor.fill('0');await editor.press('Tab');await expect(editor).toHaveValue('0');await expect(page.locator('#flow [role=alert]')).toHaveCount(0);await expect(editor).not.toHaveAttribute('aria-invalid','true');
  28 |    await node.focus();await node.press(axis==='x'?'ArrowLeft':'ArrowUp');await expect(editor).toHaveValue('0');await expect(node).toBeFocused();
  29 |    await node.press(axis==='x'?'ArrowRight':'ArrowDown');expect(Number(await editor.inputValue())).toBeGreaterThan(0);
  30 |    await info.attach('preserved-canvas-before-correction',{body:JSON.stringify({profile,axis,previous}),contentType:'application/json'});
  31 |   });
  32 |  }
  33 | }
  34 | 
```