# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sheet-locale-errors.spec.ts >> guided: formula worker structural errors follow the live locale while app error and formula source stay unchanged
- Location: tests/ui/sheet-locale-errors.spec.ts:4:41

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('プロファイル', { exact: true })

```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "計算エラーの言語境界" [level=1] [ref=e4]
  - generic [ref=e5]:
    - text: プロファイル
    - combobox "プロファイル" [ref=e6]:
      - option "guided" [selected]
      - option "dense"
  - generic [ref=e7]:
    - text: 計算worker
    - combobox "計算worker" [ref=e8]:
      - option "実数式worker" [selected]
      - option "構造エラー"
      - option "アプリ提供エラー"
  - button "辞書を切り替え" [ref=e9]
  - region "保持する数式" [ref=e11]:
    - paragraph [ref=e12]: 保持する数式
    - status [ref=e13]: 計算済み
    - paragraph [ref=e14]: 矢印でセルを選択。Enter / F2で編集し、Enterで変更を要求、Escapeで編集を戻します。Shift＋矢印は範囲選択。
    - status [ref=e15]: 選択 A1 / 値 2
    - region "保持する数式のセル" [ref=e16]:
      - grid "保持する数式" [ref=e17]:
        - rowgroup [ref=e18]:
          - row [ref=e19]:
            - columnheader "行" [ref=e20]
            - columnheader "A" [ref=e21]
            - columnheader "B" [ref=e22]
            - columnheader "C" [ref=e23]
        - rowgroup [ref=e24]:
          - row [ref=e25]:
            - rowheader "1" [ref=e26]
            - gridcell [selected] [ref=e27]:
              - textbox "A1" [ref=e28]: "2"
            - gridcell [ref=e29]:
              - textbox "B1" [ref=e30]: "3"
            - gridcell [ref=e31]:
              - textbox "C1" [ref=e32]: "5"
    - generic [ref=e33]:
      - button "数式の計算を再試行" [disabled] [ref=e34]
      - button "CSVを書き出す" [ref=e35] [cursor=pointer]
      - button "数式を含むJSONを書き出す" [ref=e36] [cursor=pointer]
    - generic [ref=e37]:
      - text: 読み込むCSV
      - textbox "読み込むCSV" [ref=e38]
    - button "CSVを読み込む" [ref=e39] [cursor=pointer]
  - status [ref=e40]: "{ \"rows\": [ [ 2, 3, \"=SUM(A1:B1)\" ] ] }"
```

# Test source

```ts
  1  | import {test,expect} from './catalog-test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | for(const profile of ['guided','dense'])test(profile+': formula worker structural errors follow the live locale while app error and formula source stay unchanged',async({page,context},info)=>{
  5  |  await context.route('**/invalid-library-worker.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:"postMessage({type:'sheet-ready',version:999});"}));
  6  |  await context.route('**/app-domain-worker.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:"onmessage=event=>postMessage({requestId:event.data.requestId,results:null,error:'The application refused this calculation.'});postMessage({type:'sheet-ready',version:1});"}));
> 7  |  await page.goto('/catalog/sheet-locale');await page.getByLabel('プロファイル',{exact:true}).selectOption(profile);
     |                                                                                        ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  8  |  const sheet=page.locator('ui-spreadsheet'),status=sheet.getByRole('status').first(),source=page.locator('#sheet-source');
  9  |  await expect(sheet.locator('[data-sheet-cell="0,2"]')).toHaveValue('5');const original=await source.textContent();
  10 |  await page.getByLabel('計算worker',{exact:true}).selectOption('/assets/invalid-library-worker.mjs');
  11 |  await expect(status).toHaveText('The calculation could not be confirmed.');await expect(source).toHaveText(original!);
  12 |  await page.getByRole('button',{name:'辞書を切り替え',exact:true}).click();await expect(status).toHaveText('Die Berechnung konnte nicht bestätigt werden.');
  13 |  await expect(page.locator('main')).toHaveAttribute('lang','de-DE');await expect(source).toHaveText(original!);
  14 |  await page.getByLabel('計算worker',{exact:true}).selectOption('/assets/app-domain-worker.mjs');await expect(status).toHaveText('The application refused this calculation.');
  15 |  await page.getByRole('button',{name:'辞書を切り替え',exact:true}).click();await expect(status).toHaveText('The application refused this calculation.');await expect(source).toHaveText(original!);
  16 |  await page.getByLabel('計算worker',{exact:true}).selectOption('/assets/sheet-formula.worker.js');await expect(sheet.locator('[data-sheet-cell="0,2"]')).toHaveValue('5');await expect(source).toHaveText(original!);
  17 |  const axe=await new AxeBuilder({page}).include('ui-spreadsheet').analyze();await info.attach('sheet-locale-errors-axe',{body:JSON.stringify(axe),contentType:'application/json'});expect(axe.violations).toEqual([]);
  18 |  await info.attach('sheet-locale-recovered',{body:await sheet.screenshot(),contentType:'image/png'});
  19 | });
  20 | 
```