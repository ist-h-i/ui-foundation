# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tree-axe-contract.spec.ts >> tree automated incomplete contracts dense >> glyphs have checked semantics and actual foreground/background paint
- Location: tests/ui/tree-axe-contract.spec.ts:45:2

# Error details

```
AssertionError: Expected values to be strictly equal:

'▣' !== '◩'

```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "階層の選択と組織の確認" [level=1] [ref=e4]
  - status [ref=e5]: INVALID
  - generic [ref=e6]:
    - generic [ref=e7]: 表示設定
    - combobox "表示設定" [ref=e8]:
      - option "手順を確認"
      - option "一覧を比較" [selected]
    - generic [ref=e9]:
      - checkbox "右から左" [checked] [ref=e10]
      - text: 右から左
    - generic [ref=e11]:
      - checkbox "読み取り専用" [ref=e12]
      - text: 読み取り専用
    - generic [ref=e13]:
      - checkbox "処理中" [ref=e14]
      - text: 処理中
    - button "formの無効切替" [ref=e15]
    - button "nullable reset" [ref=e16]
  - region "階層とチェック" [ref=e17]:
    - heading "階層の展開・選択・チェック" [level=2] [ref=e18]
    - button "外部から全て折り畳む" [ref=e19]
    - button "外部から階層を差し替え" [ref=e20]
    - generic [ref=e21]:
      - paragraph [ref=e22]: 上下で移動、左右で展開・親へ戻る。Spaceでまとめて処理する部署を変更。Enterで詳細を表示する部署を選択。
      - tree "申請の部署" [ref=e23]:
        - treeitem "申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZ" [checked=mixed] [expanded] [level=1] [ref=e24]:
          - generic [ref=e25] [cursor=pointer]:
            - button "申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZを折り畳む" [ref=e26]: −
            - generic [aria-hidden] [ref=e27]: ▣
            - generic [ref=e28]: 申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZ
          - group [ref=e29]:
            - treeitem "企画部" [checked=mixed] [expanded] [level=2] [ref=e30]:
              - generic [ref=e31] [cursor=pointer]:
                - button "企画部を折り畳む" [ref=e32]: −
                - generic [aria-hidden] [ref=e33]: ▣
                - generic [ref=e34]: 企画部
              - group [ref=e35]:
                - treeitem "企画第一課" [active] [level=3] [ref=e36]:
                  - generic [ref=e37] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e38]: ・
                    - generic [aria-hidden] [ref=e39]: ☐
                    - generic [ref=e40]: 企画第一課
                - treeitem "企画第二課" [checked] [level=3] [ref=e41]:
                  - generic [ref=e42] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e43]: ・
                    - generic [aria-hidden] [ref=e44]: ☑
                    - generic [ref=e45]: 企画第二課
            - treeitem "運用部" [checked] [level=2] [ref=e46]:
              - generic [ref=e47] [cursor=pointer]:
                - generic [aria-hidden] [ref=e48]: ・
                - generic [aria-hidden] [ref=e49]: ☑
                - generic [ref=e50]: 運用部
            - treeitem "停止部署" [disabled] [level=2] [ref=e51]:
              - generic [ref=e52]:
                - button "停止部署を展開" [disabled] [ref=e53]: ＋
                - generic [aria-hidden] [ref=e54] [cursor=pointer]: ☐
                - generic [ref=e55]: 停止部署
        - treeitem "支社（未取得）" [level=1] [ref=e56]:
          - generic [ref=e57] [cursor=pointer]:
            - button "支社（未取得）を展開" [ref=e58]: ＋
            - generic [aria-hidden] [ref=e59]: ☐
            - generic [ref=e60]: 支社（未取得）
        - treeitem "独立部署" [level=1] [ref=e61]:
          - generic [ref=e62] [cursor=pointer]:
            - generic [aria-hidden] [ref=e63]: ・
            - generic [aria-hidden] [ref=e64]: ☐
            - generic [ref=e65]: 独立部署
    - generic [ref=e66]:
      - checkbox "親子チェックを連動" [checked] [ref=e67]
      - text: 親子チェックを連動
    - status [ref=e68]: "[]"
    - status [ref=e69]: "[ \"a2\", \"beta\" ]"
  - region "階層経路" [ref=e70]:
    - heading "階層の経路を選ぶ" [level=2] [ref=e71]
    - generic [ref=e72]:
      - checkbox "途中階層の選択を許可" [ref=e73]
      - text: 途中階層の選択を許可
    - generic [ref=e76]:
      - generic [ref=e77]: 申請先の経路 必須
      - combobox "申請先の経路 必須" [ref=e78] [cursor=pointer]
      - generic [ref=e79]:
        - button "申請先の経路を選ぶ" [ref=e80] [cursor=pointer]
        - button "申請先の経路をクリア" [disabled] [ref=e81]
      - status [ref=e82]: 末端の項目を選択してください。
    - status [ref=e83]: "[]"
    - status [ref=e84]: "{ \"required\": true }"
    - button "禁止の途中経路を復元" [ref=e85]
  - region "ツリー選択" [ref=e86]:
    - heading "単一と複数のツリー選択" [level=2] [ref=e87]
    - generic [ref=e90]:
      - generic [ref=e91]: 代表部署 必須
      - combobox "代表部署 必須" [ref=e92] [cursor=pointer]
      - generic [ref=e93]:
        - button "代表部署を選ぶ" [ref=e94] [cursor=pointer]
        - button "代表部署をクリア" [disabled] [ref=e95]
      - list "代表部署の選択済み項目"
      - status [ref=e96]: 0 件選択
    - generic [ref=e99]:
      - generic [ref=e100]: 対象部署 必須
      - combobox "対象部署 必須" [ref=e101] [cursor=pointer]
      - generic [ref=e102]:
        - button "対象部署を選ぶ" [ref=e103] [cursor=pointer]
        - button "対象部署をクリア" [disabled] [ref=e104]
      - list "対象部署の選択済み項目"
      - status [ref=e105]: 0 件選択
    - button "親の選択を復元" [ref=e106]
    - button "無効な選択を復元" [ref=e107]
    - button "未取得の選択を復元" [ref=e108]
    - button "検索を切り替え" [ref=e109]
    - status [ref=e110]: "[]"
    - status [ref=e111]: "[]"
    - status [ref=e112]: "false"
    - status [ref=e113]: "{ \"required\": true }"
    - button "削除済みの選択を復元" [ref=e114]
    - button "単一へ複数値を復元" [ref=e115]
  - region "子項目の取得" [ref=e116]:
    - heading "子項目の取得と再試行" [level=2] [ref=e117]
    - generic [ref=e118]:
      - button "最新の要求を失敗" [ref=e119]
      - button "最新の要求へ子項目" [ref=e120]
      - button "最初の旧要求へ子項目" [ref=e121]
      - button "要求を明示失効" [ref=e122]
    - status [ref=e123]: "0"
    - status
    - status [ref=e124]: "null"
    - status [ref=e125]: "0"
  - region "組織図" [ref=e126]:
    - heading "親子関係を確認する" [level=2] [ref=e127]
    - text: 組織図の方向
    - combobox "組織図の方向" [ref=e128]:
      - option "上から下" [selected]
      - option "下から上"
      - option "左から右"
      - option "右から左"
    - button "外部から組織図を折り畳む" [ref=e129]
    - button "未取得の組織を接続" [ref=e130]
    - button "取得した子組織を接続" [ref=e131]
    - region "申請管理の組織" [ref=e133]:
      - list [ref=e134]:
        - listitem [ref=e135]:
          - generic [ref=e136]:
            - strong [ref=e137]: 申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZ
            - paragraph [ref=e138]: HQ / 1 階層
            - text: 申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZのメモ
            - textbox "申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZのメモ" [ref=e139]: 本部の初期メモ
            - button "申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZの子組織を折り畳む" [expanded] [ref=e140] [cursor=pointer]: 子組織を折り畳む
          - list "申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZの子組織" [ref=e141]:
            - listitem [ref=e142]:
              - generic [ref=e143]:
                - strong [ref=e144]: 企画部
                - paragraph [ref=e145]: P / 2 階層
                - text: 企画部のメモ
                - textbox "企画部のメモ" [ref=e146]: 企画の初期メモ
                - button "企画部の子組織を折り畳む" [expanded] [ref=e147] [cursor=pointer]: 子組織を折り畳む
              - list "企画部の子組織" [ref=e148]:
                - listitem [ref=e149]:
                  - generic [ref=e150]:
                    - strong [ref=e151]: 企画第一課
                    - paragraph [ref=e152]: P1 / 3 階層
                    - text: 企画第一課のメモ
                    - textbox "企画第一課のメモ" [ref=e153]: 第一課の初期メモ
                - listitem [ref=e154]:
                  - generic [ref=e155]:
                    - strong [ref=e156]: 企画第二課
                    - paragraph [ref=e157]: P2 / 3 階層
                    - text: 企画第二課のメモ
                    - textbox "企画第二課のメモ" [ref=e158]: 第二課の初期メモ
            - listitem [ref=e159]:
              - generic [ref=e160]:
                - strong [ref=e161]: 運用部
                - paragraph [ref=e162]: O / 2 階層
                - text: 運用部のメモ
                - textbox "運用部のメモ" [ref=e163]: 運用の初期メモ
            - listitem [ref=e164]:
              - generic [ref=e165]:
                - strong [ref=e166]: 停止部署
                - paragraph [ref=e167]: / 2 階層
                - text: 停止部署のメモ
                - textbox "停止部署のメモ" [ref=e168]
                - button "停止部署の子組織を展開" [disabled] [ref=e169]: 子組織を展開
        - listitem [ref=e170]:
          - generic [ref=e171]:
            - strong [ref=e172]: 独立部署
            - paragraph [ref=e173]: I / 1 階層
            - text: 独立部署のメモ
            - textbox "独立部署のメモ" [ref=e174]: 独立の初期メモ
  - region "modal内の選択" [ref=e175]:
    - heading "modal内の階層選択" [level=2] [ref=e176]
    - button "ダイアログを開く" [ref=e177]
  - region "native回帰" [ref=e178]:
    - heading "アプリの操作を含む階層" [level=2] [ref=e179]
    - button "native投影を表示" [ref=e180]
    - button "特殊IDの階層" [ref=e181]
    - button "全候補を外部除去" [ref=e182]
    - status [ref=e183]: "0"
    - status [ref=e184]: "0"
    - status [ref=e185]: "[]"
    - status [ref=e186]: "[]"
    - paragraph [ref=e187]: nativeリンクの目的地
  - button "確認を続ける" [ref=e188]
```

# Test source

```ts
  1  | import assert from 'node:assert/strict';
  2  | import {writeFile} from 'node:fs/promises';
  3  | import {test,expect} from './catalog-test';
  4  | import {assertExposedText,clippedText,graphicalPaint,popupContract} from './tree-axe-contract-helpers';
  5  | 
  6  | const head='申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  7  | for(const profile of ['guided','dense'])test.describe('tree automated incomplete contracts '+profile,()=>{
  8  |  test.beforeEach(async({page})=>{
  9  |   await page.goto('/catalog/trees');await expect(page.getByRole('heading',{name:'階層の選択と組織の確認',exact:true})).toBeVisible();
  10 |   await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  11 |   await page.setViewportSize({width:320,height:720});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#rtl').check();
  12 |  });
  13 |  test('DOM/ARIA/native AX references, keyboard, clipped text and nested Escape',async({page},testInfo)=>{
  14 |   const evidence:Record<string,unknown>={profile,viewport:{width:320,height:720},fontSize:'200%',rtl:true,reducedMotion:true};
  15 |   const snapshot=async(state:string)=>{
  16 |    const open={closed:'', 'tree-select-open':'multi','cascader-open':'cascade'}[state];
  17 |    const values=[];for(const id of ['cascade','single','multi'])values.push(await popupContract(page,id,id===open));evidence[state]=values;
  18 |    await writeFile(testInfo.outputPath('contracts-'+state+'.json'),JSON.stringify(values,null,2));
  19 |   };
  20 |   await snapshot('closed');
  21 |   await page.locator('#multi').focus();await page.keyboard.press('ArrowDown');await expect(page.locator('#multi-popup')).toBeVisible();await expect(page.locator('#multi-search')).toBeFocused();
  22 |   await snapshot('tree-select-open');await page.keyboard.press('ArrowDown');await expect(page.locator('#multi-tree-item-head')).toBeFocused();
  23 |   await page.keyboard.press('End');await page.keyboard.press('Space');await page.locator('#multi-popup').getByRole('button',{name:'選択を完了',exact:true}).click();await expect(page.locator('#multi-model')).toContainText('last');await expect(page.locator('#multi')).toBeFocused();
  24 |   await page.locator('#cascade').focus();await page.keyboard.press('Enter');const popup=page.locator('#cascade-popup');await expect(popup).toBeVisible();await expect(popup.getByRole('button',{name:head,exact:true})).toBeFocused();
  25 |   await page.keyboard.press('ArrowLeft');await expect(popup.getByRole('button',{name:'企画部',exact:true})).toBeFocused();await page.keyboard.press('ArrowLeft');await expect(popup.getByRole('button',{name:'企画第一課',exact:true})).toBeFocused();
  26 |   await page.keyboard.press('Enter');await popup.getByRole('button',{name:'この経路で確定',exact:true}).click();await expect(page.locator('#cascade-model')).toContainText('a1');
  27 |   await page.locator('#cascade').click();await expect(popup).toBeVisible();await snapshot('cascader-open');
  28 |   const selectors=['#cascade-popup > p:nth-child(1)','#cascade-popup > .ui-tree-popup-state'];
  29 |   const before=[];for(const selector of selectors)before.push(await clippedText(page,selector));
  30 |   await writeFile(testInfo.outputPath('clipped-text-before.json'),JSON.stringify(before,null,2));
  31 |   await page.screenshot({path:testInfo.outputPath('cascader-clipping-before.png')});
  32 |   const box=await popup.boundingBox();assert(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  33 |   await page.mouse.wheel(0,-100000);await expect.poll(()=>popup.evaluate(element=>element.scrollTop)).toBe(0);
  34 |   const after=[];for(const selector of selectors){const value=await clippedText(page,selector);after.push(value);}
  35 |   await writeFile(testInfo.outputPath('clipped-text-after-top.json'),JSON.stringify(after,null,2));
  36 |   const textContrasts=after.map(value=>assertExposedText(value));
  37 |   await page.screenshot({path:testInfo.outputPath('cascader-clipping-after.png')});evidence.clipping={before,after,textContrasts,nativeWheel:true};
  38 |   await page.keyboard.press('Escape');await expect(popup).not.toBeVisible();await expect(page.locator('#cascade')).toBeFocused();
  39 |   await page.locator('#show-dialog').click();const parent=page.getByRole('dialog',{name:'提出先を確認',exact:true});await expect(parent).toBeVisible();
  40 |   await page.locator('#modal-cascade').focus();await page.keyboard.press('ArrowDown');await expect(page.locator('#modal-cascade-popup')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#modal-cascade-popup')).not.toBeVisible();await expect(parent).toBeVisible();await expect(page.locator('#modal-cascade')).toBeFocused();
  41 |   await page.keyboard.press('Escape');await expect(parent).not.toBeVisible();await expect(page.locator('#show-dialog')).toBeFocused();
  42 |   evidence.parentEscape={childFirst:true,parentSecond:true,ownedFocusReturned:true};
  43 |   await writeFile(testInfo.outputPath('automatic-contracts.json'),JSON.stringify(evidence,null,2));
  44 |  });
  45 |  test('glyphs have checked semantics and actual foreground/background paint',async({page},testInfo)=>{
  46 |   const evidence:Record<string,unknown>={profile};const glyphs=[];
  47 |   for(const id of ['head','lazy','last'])glyphs.push(await graphicalPaint(page,'#departments-item-'+id+' > .ui-tree-row > .ui-tree-check',testInfo,'departments-'+id));
  48 |   const item=page.locator('#departments-item-head');await item.focus();await page.keyboard.press('Space');await expect(item).toHaveAttribute('aria-checked','true');
  49 |   const checked=await graphicalPaint(page,'#departments-item-head > .ui-tree-row > .ui-tree-check',testInfo,'checked');assert.equal(checked.css.text?.trim(),'☑');
  50 |   await item.focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('#departments-item-alpha')).toBeVisible();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowLeft');await expect(page.locator('#departments-item-a1')).toBeVisible();
  51 |   await page.locator('#departments-item-a1').focus();await page.keyboard.press('Space');await expect(item).toHaveAttribute('aria-checked','mixed');
> 52 |   const mixed=await graphicalPaint(page,'#departments-item-head > .ui-tree-row > .ui-tree-check',testInfo,'mixed');assert.equal(mixed.css.text?.trim(),'◩');assert.notEqual(checked.screenshotSha256,mixed.screenshotSha256);
     |                                                                                                                           ^ AssertionError: Expected values to be strictly equal:
  53 |   evidence.glyphs=glyphs;evidence.checked=checked;evidence.mixed=mixed;evidence.treeAriaSnapshot=await page.locator('#departments').ariaSnapshot();
  54 |   await page.locator('#multi').click();await expect(page.locator('#multi-popup')).toBeVisible();const popupGlyphs=[];
  55 |   for(const id of ['head','lazy'])popupGlyphs.push(await graphicalPaint(page,'#multi-tree-item-'+id+' > .ui-tree-row > .ui-tree-check',testInfo,'multi-'+id));
  56 |   evidence.popupGlyphs=popupGlyphs;await page.keyboard.press('Escape');await expect(page.locator('#multi')).toBeFocused();
  57 |   await writeFile(testInfo.outputPath('automatic-paint.json'),JSON.stringify(evidence,null,2));
  58 |  });
  59 |  test('automatic reference and graphical contrast detectors reject broken contracts',async({page},testInfo)=>{
  60 |   const control=page.locator('#multi'),original=await control.getAttribute('aria-controls');
  61 |   await control.evaluate(element=>element.setAttribute('aria-controls','nonexistent-tree-popup'));
  62 |   await assert.rejects(()=>popupContract(page,'multi',false),/aria-controls must reference exactly one real element/);
  63 |   await control.evaluate((element,value)=>element.setAttribute('aria-controls',value!),original);
  64 |   const selector='#departments-item-head > .ui-tree-row > .ui-tree-check',glyph=page.locator(selector),style=await glyph.getAttribute('style');
  65 |   await glyph.evaluate(element=>(element as HTMLElement).style.color='rgb(255, 255, 255)');
  66 |   await assert.rejects(()=>graphicalPaint(page,selector,testInfo,'broken'),/contrast >=3:1/);
  67 |   await glyph.evaluate((element,value)=>value===null?element.removeAttribute('style'):element.setAttribute('style',value),style);
  68 |   await popupContract(page,'multi',false);
  69 |   await writeFile(testInfo.outputPath('detector-negative-probes.json'),JSON.stringify({profile,missingPopupRejected:true,lowContrastRejected:true,actualOriginalRestored:true},null,2));
  70 |  });
  71 | });
  72 | 
```