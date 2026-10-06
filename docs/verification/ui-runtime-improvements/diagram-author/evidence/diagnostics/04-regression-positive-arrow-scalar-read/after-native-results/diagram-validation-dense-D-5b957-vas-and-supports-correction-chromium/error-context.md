# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagram-validation.spec.ts >> dense: Diagram rejects negative x without changing the reachable canvas and supports correction
- Location: tests/ui/diagram-validation.spec.ts:20:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "グラフ・地図・編集・会話" [level=1] [ref=e4]
  - generic [ref=e5]:
    - 'button "プロファイル: dense" [ref=e6] [cursor=pointer]'
    - 'button "方向: LTR" [ref=e7] [cursor=pointer]'
    - generic [ref=e8]:
      - text: 操作抑止
      - checkbox "操作抑止" [ref=e9]
    - generic [ref=e10]:
      - text: 処理中
      - checkbox "処理中" [ref=e11]
    - button "専門部品を破棄" [ref=e12] [cursor=pointer]
    - generic [ref=e13]:
      - text: 読取り専用
      - checkbox "読取り専用" [ref=e14]
  - navigation "専門部品" [ref=e15]:
    - button "Chart" [ref=e16] [cursor=pointer]
    - button "Map" [ref=e17] [cursor=pointer]
    - button "Gantt" [ref=e18] [cursor=pointer]
    - button "Kanban" [ref=e19] [cursor=pointer]
    - button "Spreadsheet" [ref=e20] [cursor=pointer]
    - button "RichText" [ref=e21] [cursor=pointer]
    - button "Markdown" [ref=e22] [cursor=pointer]
    - button "Code" [ref=e23] [cursor=pointer]
    - button "Diff / JSON" [ref=e24] [cursor=pointer]
    - button "FileExplorer" [ref=e25] [cursor=pointer]
    - button "Diagram" [ref=e26] [cursor=pointer]
    - button "Chat" [ref=e27] [cursor=pointer]
  - generic [ref=e28]:
    - heading "ノードと接続の編集" [level=2] [ref=e29]
    - region "承認フロー" [ref=e31]:
      - paragraph [ref=e32]: 承認フロー
      - generic [ref=e33]:
        - button "拡大" [ref=e34] [cursor=pointer]
        - button "縮小" [ref=e35] [cursor=pointer]
        - button "自動配置" [ref=e36] [cursor=pointer]
        - status [ref=e37]: 拡大率 1
      - region "承認フローの図" [ref=e38]:
        - generic [ref=e39]:
          - img [aria-hidden]:
            - generic: 確認
          - button "提出" [active] [ref=e40] [cursor=pointer]
          - button "承認" [ref=e41] [cursor=pointer]
      - region "承認フローの編集" [ref=e42]:
        - table [ref=e43]:
          - caption [ref=e44]: ノードのラベルと配置
          - rowgroup [ref=e45]:
            - row [ref=e46]:
              - columnheader "ノード" [ref=e47]
              - columnheader "横位置" [ref=e48]
              - columnheader "縦位置" [ref=e49]
              - columnheader "操作" [ref=e50]
          - rowgroup [ref=e51]:
            - row [ref=e52]:
              - cell [ref=e53]:
                - textbox "提出 ラベル" [ref=e54]: 提出
              - cell [ref=e55]:
                - spinbutton "提出 横位置" [ref=e56]: "8"
              - cell [ref=e57]:
                - spinbutton "提出 縦位置" [ref=e58]: "16"
              - cell [ref=e59]:
                - button "提出を削除" [ref=e60] [cursor=pointer]
            - row [ref=e61]:
              - cell [ref=e62]:
                - textbox "承認 ラベル" [ref=e63]: 承認
              - cell [ref=e64]:
                - spinbutton "承認 横位置" [ref=e65]: "300"
              - cell [ref=e66]:
                - spinbutton "承認 縦位置" [ref=e67]: "100"
              - cell [ref=e68]:
                - button "承認を削除" [ref=e69] [cursor=pointer]
      - generic [ref=e70]:
        - generic [ref=e71]:
          - text: 接続元
          - combobox "接続元" [ref=e72]:
            - option "選択" [selected]
            - option "提出"
            - option "承認"
        - generic [ref=e73]:
          - text: 接続先
          - combobox "接続先" [ref=e74]:
            - option "選択" [selected]
            - option "提出"
            - option "承認"
        - button "接続する" [disabled] [ref=e75]
        - button "ノードを追加" [ref=e76] [cursor=pointer]
      - list "接続" [ref=e77]:
        - listitem [ref=e78]:
          - button "提出 → 承認 確認" [ref=e79] [cursor=pointer]
          - button "接続を削除" [ref=e80] [cursor=pointer]
    - status [ref=e81]: 2 nodes / 1 edges
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
  24 |    await editor.fill('-50');await editor.press('Tab');await expect(editor).toHaveValue('-50');await expect(editor).toHaveAttribute('aria-invalid','true');
  25 |    await expect(page.locator('#flow [role=alert]')).toContainText('位置は0〜1000000の範囲で入力してください。');
  26 |    expect(await node.evaluate(element=>({left:(element as HTMLElement).style.left,top:(element as HTMLElement).style.top}))).toEqual(previous);
  27 |    await editor.fill('0');await editor.press('Tab');await expect(editor).toHaveValue('0');await expect(page.locator('#flow [role=alert]')).toHaveCount(0);await expect(editor).not.toHaveAttribute('aria-invalid','true');
  28 |    await node.focus();await node.press(axis==='x'?'ArrowLeft':'ArrowUp');await expect(editor).toHaveValue('0');await expect(node).toBeFocused();
> 29 |    await node.press(axis==='x'?'ArrowRight':'ArrowDown');expect(Number(await editor.inputValue())).toBeGreaterThan(0);
     |                                                                                                    ^ Error: expect(received).toBeGreaterThan(expected)
  30 |    await info.attach('preserved-canvas-before-correction',{body:JSON.stringify({profile,axis,previous}),contentType:'application/json'});
  31 |   });
  32 |  }
  33 | }
  34 | 
```