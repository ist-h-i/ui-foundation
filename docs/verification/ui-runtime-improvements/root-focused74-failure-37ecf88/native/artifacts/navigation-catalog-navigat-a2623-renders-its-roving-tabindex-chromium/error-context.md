# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation-catalog.spec.ts >> navigation catalog guided >> root Tab exits in both directions before a preceding key renders its roving tabindex
- Location: tests/ui/navigation-catalog.spec.ts:37:2

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 2

  Object {
    "handled": true,
    "tabIndex": -1,
    "tabStops": Array [
      "File",
+     "New",
+     "Cut",
    ],
  }
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "移動先とコマンド" [level=1] [ref=e4]
  - generic [ref=e5]:
    - generic [ref=e6]:
      - text: 表示設定
      - combobox "表示設定" [ref=e7]:
        - option "guided" [selected]
        - option "dense"
    - generic [ref=e8]:
      - checkbox "RTL" [ref=e9]
      - text: RTL
    - button "外側の操作" [ref=e10] [cursor=pointer]
    - status [ref=e12]: "0"
  - generic [ref=e13]:
    - region "リンクの配置" [ref=e14]:
      - heading "画面の移動先" [level=2] [ref=e15]
      - generic [ref=e16]:
        - text: 移動先の方向
        - combobox "移動先の方向" [ref=e17]:
          - option "横" [selected]
          - option "縦"
      - generic [ref=e18]:
        - text: 狭い幅の配置
        - combobox "狭い幅の配置" [ref=e19]:
          - option "折返し" [selected]
          - option "スクロール"
      - navigation "画面の移動" [ref=e20]:
        - list [ref=e21]:
          - listitem [ref=e22]:
            - link "申請一覧" [ref=e23] [cursor=pointer]:
              - /url: "#navigation-intro"
          - listitem [ref=e27]:
            - link "申請内容と承認履歴を詳しく確認する" [ref=e28] [cursor=pointer]:
              - /url: "#navigation-details"
          - listitem [ref=e29]:
            - link "ReviewApplicationDetailsAndApprovalHistoryBeforeContinuing" [ref=e30] [cursor=pointer]:
              - /url: "#navigation-history"
    - region "階層の移動先" [ref=e31]:
      - heading "階層の移動先" [level=2] [ref=e32]
      - button "外部から折畳みを切替" [ref=e33] [cursor=pointer]
      - button "承認の階層を閉じる" [ref=e35] [cursor=pointer]
      - button "確認先を除去" [ref=e37] [cursor=pointer]
      - generic [ref=e39]:
        - text: 移動先の幅
        - spinbutton "移動先の幅" [ref=e40]
      - navigation "階層のナビゲーション" [ref=e42]:
        - button "移動先を折り畳む" [expanded] [ref=e43] [cursor=pointer]:
          - generic [ref=e44]: 折畳み
        - list [ref=e45]:
          - listitem [ref=e46]:
            - group [ref=e47]:
              - generic "申請" [ref=e48] [cursor=pointer]
              - link "申請へ移動" [ref=e53] [cursor=pointer]:
                - /url: "#navigation-intro"
              - list [ref=e54]:
                - listitem [ref=e55]:
                  - group [ref=e56]:
                    - generic "承認の確認" [ref=e57] [cursor=pointer]
                    - list [ref=e59]:
                      - listitem [ref=e60]:
                        - link "申請内容を確認する" [ref=e61] [cursor=pointer]:
                          - /url: "#navigation-details"
                      - listitem [ref=e63]:
                        - link "利用できない移動先" [disabled] [ref=e64]
                - listitem [ref=e66]:
                  - link "承認履歴" [ref=e67] [cursor=pointer]:
                    - /url: "#navigation-history"
    - region "短い移動先" [ref=e69]:
      - heading "よく使う移動先" [level=2] [ref=e70]
      - generic [ref=e71]:
        - checkbox "移動先のラベル" [checked] [ref=e72]
        - text: 移動先のラベル
      - generic [ref=e73]:
        - checkbox "移動先を固定" [ref=e74]
        - text: 移動先を固定
      - generic [ref=e75]:
        - text: 固定する端
        - combobox "固定する端" [ref=e76]:
          - option "下" [selected]
          - option "上"
          - option "左"
          - option "右"
      - navigation "よく使う画面" [ref=e78]:
        - list [ref=e79]:
          - listitem [ref=e80]:
            - link "申請一覧" [ref=e81] [cursor=pointer]:
              - /url: "#navigation-intro"
          - listitem [ref=e86]:
            - link "確認する内容" [ref=e87] [cursor=pointer]:
              - /url: "#navigation-details"
          - listitem [ref=e92]:
            - link "承認履歴" [ref=e93] [cursor=pointer]:
              - /url: "#navigation-history"
    - region "現在地の階層" [ref=e98]:
      - heading "現在地" [level=2] [ref=e99]
      - button "階層の展開を切替" [ref=e100] [cursor=pointer]
      - navigation "現在地の階層" [ref=e102]:
        - list [ref=e103]:
          - listitem [ref=e104]:
            - link "ホーム" [ref=e105] [cursor=pointer]:
              - /url: "#navigation-intro"
          - listitem [ref=e106]:
            - generic [aria-hidden] [ref=e107]: ›
            - group [ref=e108]:
              - generic "省略した階層（6件）" [ref=e109] [cursor=pointer]
          - listitem [ref=e110]:
            - generic [aria-hidden] [ref=e111]: ›
            - link "現在の申請" [ref=e112] [cursor=pointer]:
              - /url: "#navigation-intro"
    - region "並べ替えできるタブ" [ref=e113]:
      - heading "確認する内容" [level=2] [ref=e114]
      - button "タブを戻す" [ref=e115] [cursor=pointer]
      - generic [ref=e117]:
        - checkbox "未保存タブの終了を保留" [ref=e118]
        - text: 未保存タブの終了を保留
      - generic [ref=e119]:
        - text: タブの方向
        - combobox "タブの方向" [ref=e120]:
          - option "横" [selected]
          - option "縦"
      - generic [ref=e121]:
        - checkbox "タブをスクロール" [checked] [ref=e122]
        - text: タブをスクロール
      - button "全タブを除去" [ref=e123] [cursor=pointer]
      - button "選択タブを外部から除去" [ref=e125] [cursor=pointer]
      - generic [ref=e127]:
        - tablist "確認する内容" [ref=e128]:
          - tab "申請" [selected] [ref=e129] [cursor=pointer]
          - tab "確認" [ref=e130] [cursor=pointer]
          - tab "利用できない" [disabled] [ref=e131]
          - tab "履歴" [ref=e132] [cursor=pointer]
          - tab "ReviewApplicationDetailsAndApprovalHistoryBeforeContinuing" [ref=e133] [cursor=pointer]
        - tabpanel "申請" [ref=e134]:
          - generic [ref=e135]:
            - text: 申請のメモ
            - textbox "申請のメモ" [ref=e136]
        - 'group "選択中のタブの操作: 申請" [ref=e137]':
          - button "選択中のタブを前へ" [disabled] [ref=e138]
          - button "選択中のタブを後ろへ" [ref=e140] [cursor=pointer]
          - button "選択中のタブを閉じる" [ref=e142] [cursor=pointer]
      - paragraph
    - region "メニューバー" [ref=e144]:
      - heading "操作のメニュー" [level=2] [ref=e145]
      - button "メニューの前" [ref=e146] [cursor=pointer]
      - button "記号を含む操作ID" [ref=e148] [cursor=pointer]
      - button "File操作を除去" [ref=e150] [cursor=pointer]
      - menubar "編集する操作" [ref=e153]:
        - menuitem "File" [ref=e155] [cursor=pointer]
        - menuitem "Edit" [ref=e158] [cursor=pointer]
        - menuitemcheckbox "View" [ref=e160] [cursor=pointer]:
          - generic [ref=e161]: ○View
        - menuitem "Unavailable" [disabled] [ref=e162]
      - button "メニューの後" [active] [ref=e164] [cursor=pointer]
      - paragraph
    - region "分類した移動先" [ref=e166]:
      - heading "分類した移動先" [level=2] [ref=e167]
      - group [ref=e168]:
        - generic "移動先の起動操作" [ref=e169]
        - button "分類した移動先を開く" [ref=e170] [cursor=pointer]
      - button "起動操作の表示を切替" [ref=e172] [cursor=pointer]
      - button "分類した移動先を除去" [ref=e174] [cursor=pointer]
      - status
    - region "コマンド検索" [ref=e176]:
      - heading "コマンドを探す" [level=2] [ref=e177]
      - button "コマンド検索を開く" [ref=e178] [cursor=pointer]
      - button "コマンドを差し替える" [ref=e180] [cursor=pointer]
      - button "外部から検索を切替" [ref=e182] [cursor=pointer]
      - paragraph [ref=e184]: Control + K で開けます。入力と操作履歴は閉じた後も残ります。
      - paragraph
      - status [ref=e185]: "0"
      - paragraph
    - region "ページ内の移動" [ref=e186]:
      - heading "ページ内の移動" [level=2] [ref=e187]
      - button "ページ内移動を切替" [ref=e188] [cursor=pointer]
      - generic [ref=e190]:
        - text: ページ内移動の固定
        - combobox "ページ内移動の固定" [ref=e191]:
          - option "通常" [selected]
          - option "スクロールに追従"
          - option "固定"
      - generic [ref=e192]:
        - navigation "ページ内の見出し" [ref=e194]:
          - list [ref=e195]:
            - listitem [ref=e196]:
              - link "申請一覧へ" [ref=e197] [cursor=pointer]:
                - /url: "#navigation-intro"
            - listitem [ref=e198]:
              - link "確認内容へ" [ref=e199] [cursor=pointer]:
                - /url: "#navigation-details"
            - listitem [ref=e200]:
              - link "承認履歴へ" [ref=e201] [cursor=pointer]:
                - /url: "#navigation-history"
        - generic [ref=e202]:
          - heading "申請一覧" [level=3] [ref=e203]
          - paragraph [ref=e204]: 申請の一覧を確認する説明です。
          - heading "確認内容" [level=3] [ref=e206]
          - paragraph [ref=e207]: 入力内容と承認の状態を確認できます。
          - heading "承認履歴" [level=3] [ref=e209]
          - paragraph [ref=e210]: これまでの操作を確認できます。
      - paragraph [ref=e212]: intro
      - button "領域内の確認を非表示" [ref=e213] [cursor=pointer]
      - generic [ref=e215]:
        - navigation "領域内の見出し" [ref=e217]:
          - list [ref=e218]:
            - listitem [ref=e219]:
              - link "領域内の最初へ" [ref=e220] [cursor=pointer]:
                - /url: "#local-first"
            - listitem [ref=e221]:
              - link "領域内の確認へ" [ref=e222] [cursor=pointer]:
                - /url: "#local-second"
        - heading "領域内の最初" [level=3] [ref=e223]
        - heading "領域内の確認" [level=3] [ref=e225]
```

# Test source

```ts
  1   | import AxeBuilder from '@axe-core/playwright';
  2   | import {test,expect} from './catalog-test';
  3   | import type {Page} from '@playwright/test';
  4   | async function noPageOverflow(page:Page){const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);}
  5   | for(const profile of ['guided','dense'])test.describe(`navigation catalog ${profile}`,()=>{
  6   |  test.beforeEach(async({page})=>{await page.goto('/catalog/navigation');await expect(page.getByRole('heading',{name:'移動先とコマンド',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);});
  7   |  test('native navigation supports orientation, current page, icons, wrapping and local scrolling',async({page})=>{
  8   |   const nav=page.getByTestId('navigation'),link=nav.getByRole('link',{name:'申請内容と承認履歴を詳しく確認する',exact:true});await expect(nav).toHaveAttribute('data-direction','horizontal');await link.click();await expect(page).toHaveURL(/#navigation-details$/);await expect(link).toHaveAttribute('aria-current','page');await expect(nav.locator('ui-icon svg')).toHaveAttribute('aria-hidden','true');await page.getByRole('combobox',{name:'移動先の方向',exact:true}).selectOption('vertical');await expect(nav).toHaveAttribute('data-direction','vertical');await page.getByRole('combobox',{name:'狭い幅の配置',exact:true}).selectOption('scroll');await expect(nav).toHaveAttribute('data-narrow','scroll');await page.setViewportSize({width:320,height:800});await noPageOverflow(page);await link.focus();await expect(link).toBeFocused();
  9   |  });
  10  |  test('side navigation preserves nested links, native disclosure and current page',async({page})=>{
  11  |   const nav=page.getByRole('navigation',{name:'階層のナビゲーション',exact:true}),parent=nav.locator('summary').filter({hasText:'承認の確認'}),leaf=nav.getByRole('link',{name:'申請内容を確認する',exact:true});await expect(leaf).toHaveAttribute('aria-current','page');await nav.getByRole('link',{name:'申請へ移動',exact:true}).click();await expect(page).toHaveURL(/#navigation-intro$/);await parent.click();await expect(leaf).toBeHidden();await parent.focus();await page.keyboard.press('Enter');await expect(leaf).toBeVisible();await leaf.click();await expect(leaf).toHaveAttribute('aria-current','page');await expect(nav.getByRole('link',{name:'利用できない移動先',exact:true})).toHaveAttribute('aria-disabled','true');await expect(nav.getByText('非表示の移動先')).toHaveCount(0);
  12  |  });
  13  |  test('external collapse, parent close and destination replacement repair only owned focus',async({page})=>{
  14  |   const nav=page.getByRole('navigation',{name:'階層のナビゲーション',exact:true}),leaf=nav.getByRole('link',{name:'申請内容を確認する',exact:true});await leaf.focus();await page.getByTestId('side-close-parent').dispatchEvent('click');await expect(nav.locator('summary').filter({hasText:'承認の確認'})).toBeFocused();await nav.locator('summary').filter({hasText:'承認の確認'}).click();await leaf.focus();await page.getByTestId('side-collapse-external').dispatchEvent('click');await expect(nav.locator('summary').filter({hasText:'申請'})).toBeFocused();await page.getByTestId('side-collapse-external').click();await leaf.focus();await page.getByTestId('side-remove-leaf').dispatchEvent('click');await expect(nav.locator('summary').filter({hasText:'承認の確認'})).toBeFocused();await page.getByTestId('outside').focus();await page.getByTestId('side-collapse-external').dispatchEvent('click');await expect(page.getByTestId('outside')).toBeFocused();
  15  |  });
  16  |  test('rail uses the dedicated profile width and preserves accessible names with an explicit expanded width',async({page})=>{
  17  |   await page.getByLabel('移動先の幅',{exact:true}).fill('280');await page.getByLabel('移動先の幅',{exact:true}).dispatchEvent('change');const nav=page.getByRole('navigation',{name:'階層のナビゲーション',exact:true});await expect.poll(()=>nav.evaluate(element=>element.getBoundingClientRect().width)).toBe(280);await nav.getByRole('button',{name:'移動先を折り畳む',exact:true}).click();await expect.poll(()=>nav.evaluate(element=>element.getBoundingClientRect().width)).toBe(profile==='guided'?72:64);await expect(nav.locator('summary').first()).toHaveAccessibleName('申請');await nav.locator('summary').first().click();await expect(nav.getByRole('link',{name:'申請内容を確認する',exact:true})).toBeVisible();
  18  |  });
  19  |  test('dock changes selection, label visibility and all fixed edges without losing native destinations',async({page})=>{
  20  |   const nav=page.getByRole('navigation',{name:'よく使う画面',exact:true}),link=nav.getByRole('link',{name:'確認する内容',exact:true});await link.click();await expect(link).toHaveAttribute('aria-current','page');await expect(page).toHaveURL(/#navigation-details$/);await page.getByLabel('移動先のラベル',{exact:true}).uncheck();await expect(link).toHaveAccessibleName('確認する内容');await page.getByLabel('移動先を固定',{exact:true}).check();for(const edge of ['top','left','right','bottom']){await page.getByRole('combobox',{name:'固定する端',exact:true}).selectOption(edge);await expect(nav).toHaveAttribute('data-edge',edge);expect(await nav.evaluate(element=>getComputedStyle(element).position)).toBe('fixed');await link.focus();await expect(link).toBeFocused();}await page.getByLabel('移動先を固定',{exact:true}).uncheck();await noPageOverflow(page);
  21  |  });
  22  |  test('breadcrumb folding keeps every intermediate native link reachable and current page visible',async({page})=>{
  23  |   const nav=page.getByRole('navigation',{name:'現在地の階層',exact:true});await expect(nav.getByRole('link',{name:'ホーム',exact:true})).toBeVisible();await expect(nav.getByRole('link',{name:'現在の申請',exact:true})).toHaveAttribute('aria-current','page');await expect(nav.getByRole('link',{name:'業務の階層1',exact:true})).toBeHidden();const summary=nav.locator('summary');await summary.focus();await page.keyboard.press('Space');await expect(nav.getByRole('link')).toHaveCount(8);await expect(nav.getByRole('link',{name:'業務の階層1',exact:true})).toBeVisible();await nav.getByRole('link',{name:'業務の階層3',exact:true}).focus();await page.getByTestId('breadcrumb-fold').dispatchEvent('click');await expect(summary).toBeFocused();await expect(nav.getByRole('link',{name:'現在の申請',exact:true})).toBeVisible();
  24  |  });
  25  |  test('tabs keep manual activation, native panel entry and skip disabled tabs in both orientations',async({page})=>{
  26  |   const tabs=page.getByRole('tablist',{name:'確認する内容',exact:true}),first=tabs.getByRole('tab',{name:'申請',exact:true}),second=tabs.getByRole('tab',{name:'確認',exact:true});await first.focus();await page.keyboard.press('ArrowRight');await expect(second).toBeFocused();await expect(first).toHaveAttribute('aria-selected','true');await page.keyboard.press('Enter');await expect(second).toHaveAttribute('aria-selected','true');await page.keyboard.press('Tab');await expect(page.getByRole('tabpanel',{name:'確認',exact:true})).toBeFocused();await second.focus();await page.keyboard.press('ArrowRight');await expect(tabs.getByRole('tab',{name:'履歴',exact:true})).toBeFocused();await page.getByRole('combobox',{name:'タブの方向',exact:true}).selectOption('vertical');await first.focus();await page.keyboard.press('ArrowDown');await expect(second).toBeFocused();await page.keyboard.press('Space');await expect(second).toHaveAttribute('aria-selected','true');
  27  |  });
  28  |  test('actual tab reordering and closing retain the same native draft editor and support a held close',async({page})=>{
  29  |   const tabs=page.getByRole('tablist',{name:'確認する内容',exact:true}),editor=page.getByRole('textbox',{name:'申請のメモ',exact:true});await editor.fill('順序を変えても下書き');const handle=await editor.elementHandle();const first=tabs.getByRole('tab',{name:'申請',exact:true});await first.focus();await page.keyboard.press('Alt+ArrowRight');await expect(tabs.getByRole('tab').nth(1)).toHaveAccessibleName('申請');await expect(first).toBeFocused();await expect(editor).toHaveValue('順序を変えても下書き');expect(await editor.evaluate((element,other)=>element===other,handle)).toBe(true);await page.getByLabel('未保存タブの終了を保留',{exact:true}).check();await first.focus();await page.keyboard.press('Delete');await expect(first).toBeVisible();await expect(page.getByTestId('tab-result')).toContainText('保留');await page.getByLabel('未保存タブの終了を保留',{exact:true}).uncheck();await first.focus();await page.keyboard.press('Delete');await expect(first).toHaveCount(0);await expect(tabs.getByRole('tab',{name:'履歴',exact:true})).toBeFocused();
  30  |  });
  31  |  test('rapid tab arrows and RTL preserve logical movement while retaining unrelated focus',async({page})=>{
  32  |   const tabs=page.getByRole('tablist',{name:'確認する内容',exact:true}),first=tabs.getByRole('tab',{name:'申請',exact:true});await first.focus();await first.evaluate(element=>{for(let index=0;index<3;index++)element.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));});await expect(tabs.getByRole('tab').last()).toBeFocused();await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');await first.focus();await page.keyboard.press('ArrowLeft');await expect(tabs.getByRole('tab',{name:'確認',exact:true})).toBeFocused();await page.getByTestId('outside').focus();await page.getByTestId('tab-remove-external').dispatchEvent('click');await expect(page.getByTestId('outside')).toBeFocused();
  33  |  });
  34  |  test('menubar root roving, disabled entries, checks and Tab enter/exit work as a composite',async({page})=>{
  35  |   const bar=page.getByRole('menubar',{name:'編集する操作',exact:true}),file=bar.getByRole('menuitem',{name:'File',exact:true});await file.focus();await page.keyboard.press('ArrowRight');await expect(bar.getByRole('menuitem',{name:'Edit',exact:true})).toBeFocused();await page.keyboard.press('ArrowRight');const view=bar.getByRole('menuitemcheckbox',{name:'View',exact:true});await expect(view).toBeFocused();await page.keyboard.press('Space');await expect(view).toHaveAttribute('aria-checked','true');await expect(page.getByTestId('menu-result')).toHaveText('view:true');await page.keyboard.press('ArrowRight');const unavailable=bar.getByRole('menuitem',{name:'Unavailable',exact:true});await expect(unavailable).toBeFocused();await expect(unavailable).toHaveAttribute('aria-disabled','true');await page.keyboard.press('Enter');await expect(page.getByTestId('menu-result')).toHaveText('view:true');await page.keyboard.press('Home');await expect(file).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByTestId('after-menubar')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(file).toBeFocused();
  36  |  });
  37  |  test('root Tab exits in both directions before a preceding key renders its roving tabindex',async({page})=>{
  38  |   const bar=page.getByRole('menubar',{name:'編集する操作',exact:true}),file=bar.getByRole('menuitem',{name:'File',exact:true}),last=bar.getByRole('menuitem',{name:'Unavailable',exact:true});
  39  |   await last.focus();await expect(last).toHaveAttribute('tabindex','0');
  40  |   const forward=await bar.evaluate(element=>{
  41  |    element.ownerDocument.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
  42  |    const active=element.ownerDocument.activeElement as HTMLElement,tabIndex=active.tabIndex,event=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});active.dispatchEvent(event);return{tabIndex,handled:event.defaultPrevented,tabStops:[...element.querySelectorAll<HTMLElement>('[role^=menuitem]')].filter(node=>node.tabIndex===0).map(node=>node.textContent!.trim())};
  43  |   });
> 44  |   expect(forward).toEqual({tabIndex:-1,handled:true,tabStops:['File']});await expect(page.getByTestId('after-menubar')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(file).toBeFocused();
      |                   ^ Error: expect(received).toEqual(expected) // deep equality
  45  |   const backward=await bar.evaluate(element=>{
  46  |    element.ownerDocument.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  47  |    const active=element.ownerDocument.activeElement as HTMLElement,tabIndex=active.tabIndex,event=new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true});active.dispatchEvent(event);return{tabIndex,handled:event.defaultPrevented,tabStops:[...element.querySelectorAll<HTMLElement>('[role^=menuitem]')].filter(node=>node.tabIndex===0).map(node=>node.textContent!.trim())};
  48  |   });
  49  |   expect(backward).toEqual({tabIndex:-1,handled:true,tabStops:['Unavailable']});await expect(page.getByTestId('menubar-remove')).toBeFocused();await page.keyboard.press('Tab');await expect(last).toBeFocused();
  50  |  });
  51  |  test('three-level menubar restores parents and crosses popup boundaries to the next root',async({page})=>{
  52  |   const file=page.getByRole('menubar').getByRole('menuitem',{name:'File',exact:true});await file.focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'New',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'Disabled',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'Export',exact:true})).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.getByRole('menuitem',{name:'Formats',exact:true})).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.getByRole('menuitem',{name:'CSV',exact:true})).toBeFocused();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('menuitem',{name:'Formats',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('menuitem',{name:'Export',exact:true})).toBeFocused();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(page.getByRole('menuitem',{name:'Cut',exact:true})).toBeFocused();await expect(page.locator('#catalog-menubar-file')).toBeHidden();await page.keyboard.press('Tab');await expect(page.getByTestId('after-menubar')).toBeFocused();await expect(page.locator('#catalog-menubar-edit')).toBeHidden();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('menubar').getByRole('menuitem',{name:'Edit',exact:true})).toBeFocused();
  53  |  });
  54  |  test('menubar rapid nested keys, RTL, typeahead and dynamic root removal retain owned focus',async({page})=>{
  55  |   const file=page.getByRole('menubar').getByRole('menuitem',{name:'File',exact:true});await file.focus();await page.keyboard.press('ArrowDown');const first=page.getByRole('menuitem',{name:'New',exact:true});await first.evaluate(element=>{for(const key of ['ArrowDown','ArrowDown','ArrowRight','ArrowRight'])element.ownerDocument.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));});await expect(page.getByRole('menuitem',{name:'CSV',exact:true})).toBeFocused();await page.getByTestId('menubar-remove').dispatchEvent('click');await expect(page.getByRole('menubar').getByRole('menuitem',{name:'Edit',exact:true})).toBeFocused();await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');await page.getByRole('menubar').getByRole('menuitem',{name:'Edit',exact:true}).focus();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('menubar').getByRole('menuitemcheckbox',{name:'View',exact:true})).toBeFocused();await page.keyboard.press('u');await expect(page.getByRole('menubar').getByRole('menuitem',{name:'Unavailable',exact:true})).toBeFocused();
  56  |  });
  57  |  test('mega menu has grouped native destinations, descriptions, nested links and close focus',async({page})=>{
  58  |   const anchor=page.getByTestId('mega-anchor');await anchor.click();const popup=page.locator('#catalog-mega');await expect(popup).toBeVisible();await expect(popup.getByRole('heading',{name:'申請',exact:true})).toBeVisible();await expect(popup).toContainText('入力内容と状態を確認');await expect(popup.getByRole('link',{name:'利用できない履歴',exact:true})).toHaveAttribute('aria-disabled','true');await popup.locator('summary').click();await expect(popup.getByRole('link',{name:'詳しい案内',exact:true})).toBeVisible();await popup.getByRole('link',{name:'確認する内容 入力内容と状態を確認',exact:true}).click();await expect(page).toHaveURL(/#navigation-details$/);await expect(popup).toBeHidden();await anchor.click();await expect(popup).toBeVisible();await page.keyboard.press('Escape');await expect(popup).toBeHidden();await expect(anchor).toBeFocused();await anchor.click();await expect(popup).toBeVisible();await page.getByTestId('outside').click();await expect(popup).toBeHidden();await expect(page.getByTestId('outside')).toBeFocused();
  59  |  });
  60  |  test('palette opening and arrow movement keep search and the active command name visible at enlarged text',async({page})=>{
  61  |   await page.setViewportSize({width:320,height:800});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');await page.getByTestId('palette-anchor').click();
  62  |   const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox');await expect(search).toBeFocused();
  63  |   const visibility=()=>dialog.evaluate(element=>{
  64  |    const input=element.querySelector<HTMLInputElement>('[role=combobox]')!,option=element.ownerDocument.getElementById(input.getAttribute('aria-activedescendant')!)!,name=option.querySelector<HTMLElement>('.ui-palette-label > span')!,list=element.querySelector<HTMLElement>('[role=listbox]')!,d=element.getBoundingClientRect(),l=list.getBoundingClientRect(),i=input.getBoundingClientRect();
  65  |    const clip={left:Math.max(0,d.left,l.left),right:Math.min(innerWidth,d.right,l.right),top:Math.max(0,d.top,l.top),bottom:Math.min(innerHeight,d.bottom,l.bottom)},range=element.ownerDocument.createRange();range.selectNodeContents(name);
  66  |    const namesVisible=[...range.getClientRects()].filter(r=>r.width&&r.height).every(r=>{const point=element.ownerDocument.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.left>=clip.left-1&&r.right<=clip.right+1&&r.top>=clip.top-1&&r.bottom<=clip.bottom+1&&!!point&&option.contains(point);});
  67  |    return{search:i.top>=Math.max(0,d.top)&&i.bottom<=Math.min(innerHeight,d.bottom)&&element.ownerDocument.elementFromPoint(i.left+i.width/2,i.top+i.height/2)===input,name:namesVisible};
  68  |   });
  69  |   await expect.poll(visibility).toEqual({search:true,name:true});for(const key of ['ArrowDown','ArrowDown','ArrowUp','ArrowUp']){await page.keyboard.press(key);await expect.poll(visibility).toEqual({search:true,name:true});}
  70  |   await page.keyboard.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('1');await page.getByTestId('command-fail').click();await expect(dialog.getByRole('alert')).toBeVisible();await expect.poll(visibility).toEqual({search:true,name:true});await search.fill('approval');await expect.poll(visibility).toEqual({search:true,name:true});await page.setViewportSize({width:600,height:800});await expect.poll(visibility).toEqual({search:true,name:true});await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='175%');await expect.poll(visibility).toEqual({search:true,name:true});
  71  |  });
  72  |  test('command palette performs search, exact shortcuts, history, busy prevention and error retry',async({page})=>{
  73  |   const anchor=page.getByTestId('palette-anchor');await anchor.focus();await page.keyboard.press('Control+k');const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox',{name:'コマンドを検索',exact:true});await expect(search).toBeFocused();await search.fill('approval');await expect(dialog.getByRole('option')).toHaveCount(1);await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');await page.keyboard.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('1');await expect(dialog).toHaveAttribute('aria-busy','true');await search.evaluate(element=>{for(let index=0;index<4;index++)element.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));});await expect(page.getByTestId('command-count')).toHaveText('1');await page.getByTestId('command-fail').click();await expect(dialog.getByRole('alert')).toContainText('再試行');await expect(search).toHaveValue('approval');await dialog.getByRole('button',{name:'選択中のコマンドを再試行',exact:true}).click();await expect(page.getByTestId('command-count')).toHaveText('2');await page.getByTestId('command-success').click();await expect(dialog).toBeHidden();await expect(anchor).toBeFocused();await expect(page.getByTestId('command-history')).toHaveText('save');await anchor.click();await expect(search).toHaveValue('approval');await search.fill('');await expect(dialog.getByRole('option').first()).toContainText('確認内容を保存');await page.keyboard.press('Control+Shift+o');await expect(page.getByTestId('command-count')).toHaveText('3');await expect(page.getByTestId('command-result')).toHaveText('openの実行を要求');await page.getByTestId('command-success').click();
  74  |  });
  75  |  test('palette keeps ordinary typing, yields handled/IME keys, retains drafts through replacement and ignores disabled commands',async({page})=>{
  76  |   const anchor=page.getByTestId('palette-anchor');await anchor.focus();await anchor.evaluate(element=>{for(const options of [{key:'k',ctrlKey:true,shiftKey:true},{key:'k',ctrlKey:true,isComposing:true},{key:'k',ctrlKey:true,keyCode:229}])element.dispatchEvent(new KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true}));const handled=new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true});handled.preventDefault();element.dispatchEvent(handled);});await expect(page.getByRole('dialog',{name:'業務のコマンド',exact:true})).toBeHidden();await anchor.click();const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox');await search.fill('利用できない');await page.keyboard.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('0');await search.fill('残す検索');const handle=await search.elementHandle();await page.getByTestId('palette-update').dispatchEvent('click');await expect(search).toHaveValue('残す検索');expect(await search.evaluate((element,other)=>element===other,handle)).toBe(true);await expect(dialog).toContainText('該当するコマンドはありません。');await search.fill('差し替え');await expect(dialog.getByRole('option')).toHaveCount(1);await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(anchor).toBeFocused();await anchor.click();await expect(search).toHaveValue('差し替え');
  77  |  });
  78  |  test('anchor navigation scrolls and focuses actual headings with offsets and releases only owned attributes',async({page})=>{
  79  |   await page.emulateMedia({reducedMotion:'reduce'});const nav=page.getByRole('navigation',{name:'ページ内の見出し',exact:true}),heading=page.locator('#navigation-details');await nav.getByRole('link',{name:'確認内容へ',exact:true}).click();await expect(page).toHaveURL(/#navigation-details$/);await expect(heading).toBeFocused();await expect(nav.getByRole('link',{name:'確認内容へ',exact:true})).toHaveAttribute('aria-current','location');expect(await heading.evaluate(element=>Math.round(element.getBoundingClientRect().top))).toBe(40);await expect(heading).toHaveAttribute('tabindex','-1');await page.getByTestId('anchors-destroy').click();await expect(nav).toHaveCount(0);await expect(heading).not.toHaveAttribute('tabindex');expect(await page.locator('#navigation-intro').evaluate(element=>(element as HTMLElement).style.scrollMarginBlockStart)).toBe('7px');await expect(page.getByTestId('anchors-destroy')).toBeFocused();
  80  |  });
  81  |  test('anchor navigation handles a local scroll root, target disappearance and real fixed/sticky positioning',async({page})=>{
  82  |   const nav=page.getByRole('navigation',{name:'領域内の見出し',exact:true}),heading=page.locator('#local-second');await nav.getByRole('link',{name:'領域内の確認へ',exact:true}).click();await expect(heading).toBeFocused();await expect.poll(()=>heading.evaluate(element=>{const root=element.closest('.local-scroll')!,r=root.getBoundingClientRect();return Math.round(element.getBoundingClientRect().top-r.top-(root as HTMLElement).clientTop);})).toBe(20);await page.getByTestId('anchor-hide').click();await expect(nav.getByRole('link',{name:'領域内の確認へ',exact:true})).toHaveAttribute('aria-disabled','true');await page.getByTestId('anchor-hide').click();await expect(nav.getByRole('link',{name:'領域内の確認へ',exact:true})).not.toHaveAttribute('aria-disabled');const global=page.getByRole('navigation',{name:'ページ内の見出し',exact:true});for(const position of ['sticky','fixed']){await page.getByRole('combobox',{name:'ページ内移動の固定',exact:true}).selectOption(position);expect(await global.evaluate(element=>getComputedStyle(element.parentElement!).position)).toBe(position);}
  83  |  });
  84  |  test('320px and 200% text preserve all navigation labels and constrain popups to the viewport',async({page})=>{
  85  |   await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await noPageOverflow(page);await expect(page.getByRole('navigation',{name:'画面の移動',exact:true})).toContainText('ReviewApplicationDetailsAndApprovalHistoryBeforeContinuing');await page.getByTestId('mega-anchor').click();const mega=page.locator('#catalog-mega');await expect(mega).toBeVisible();const size=(await mega.boundingBox())!;expect(size.x).toBeGreaterThanOrEqual(-1);expect(size.x+size.width).toBeLessThanOrEqual(321);expect(await mega.locator('nav').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);const title=(await mega.getByRole('heading',{name:'業務の移動先',exact:true}).boundingBox())!,close=(await mega.getByRole('button',{name:'閉じる',exact:true}).boundingBox())!;expect(close.y).toBeGreaterThanOrEqual(title.y+title.height-1);await page.keyboard.press('Escape');await page.getByTestId('palette-anchor').click();const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true});await expect(dialog.getByRole('combobox')).toBeFocused();const d=(await dialog.boundingBox())!;expect(d.x).toBeGreaterThanOrEqual(-1);expect(d.x+d.width).toBeLessThanOrEqual(321);expect(d.y+d.height).toBeLessThanOrEqual(801);await noPageOverflow(page);
  86  |   const lastTab=page.getByRole('tab',{name:'ReviewApplicationDetailsAndApprovalHistoryBeforeContinuing',exact:true});expect(await lastTab.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);return range.getClientRects().length;})).toBe(1);
  87  |  });
  88  |  test('final tab removal uses the explicit fallback and leaves no empty tab composite',async({page})=>{
  89  |   await page.getByRole('textbox',{name:'申請のメモ',exact:true}).fill('最後まで保持する入力');await page.getByTestId('tabs-clear').dispatchEvent('click');await expect(page.getByRole('tab')).toHaveCount(0);await expect(page.getByTestId('tabs-fallback')).toBeFocused();await expect(page.getByRole('tablist',{name:'確認する内容',exact:true})).toHaveCount(0);const result=await new AxeBuilder({page}).analyze();expect(result.violations.map(item=>item.id)).toEqual([]);
  90  |  });
  91  |  test('menubar preserves symbolic IDs, leaf radio groups and rapid root movement',async({page})=>{
  92  |   await page.getByTestId('menubar-special').click();const bar=page.getByRole('menubar'),file=bar.getByRole('menuitem',{name:'Special File',exact:true});await file.focus();await file.evaluate(element=>{for(let index=0;index<2;index++)element.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));});const second=bar.getByRole('menuitemradio',{name:'Mode B',exact:true});await expect(second).toBeFocused();await page.keyboard.press('Space');await expect(second).toHaveAttribute('aria-checked','true');await expect(bar.getByRole('menuitemradio',{name:'Mode A',exact:true})).toHaveAttribute('aria-checked','false');await file.focus();await page.keyboard.press('ArrowDown');const item=page.getByRole('menuitem',{name:'Special Command',exact:true});await expect(item).toBeFocused();const controls=(await file.getAttribute('aria-controls'))!;expect(controls).not.toMatch(/\s/);expect(await page.evaluate(id=>document.querySelectorAll('#'+CSS.escape(id)).length,controls)).toBe(1);await page.keyboard.press('Enter');await expect(page.getByTestId('menu-result')).toHaveText('file ? //item # %:command');
  93  |  });
  94  |  test('sticky navigation remains at its offset during real window scrolling',async({page})=>{
  95  |   await page.getByRole('combobox',{name:'ページ内移動の固定',exact:true}).selectOption('sticky');const host=page.getByRole('navigation',{name:'ページ内の見出し',exact:true}).locator('..');await expect(host).toHaveAttribute('data-position','sticky');await page.locator('.anchor-layout').evaluate(element=>window.scrollTo({top:window.scrollY+element.getBoundingClientRect().top+200,behavior:'instant'}));await expect.poll(async()=>Math.round((await host.boundingBox())!.y)).toBe(40);await page.evaluate(()=>window.scrollBy({top:100,behavior:'instant'}));await expect.poll(async()=>Math.round((await host.boundingBox())!.y)).toBe(40);
  96  |  });
  97  |  test('anchor cleanup preserves app replacements to target attributes and unrelated focus',async({page})=>{
  98  |   await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('navigation',{name:'ページ内の見出し',exact:true}).getByRole('link',{name:'確認内容へ',exact:true}).click();const target=page.locator('#navigation-details');await expect(target).toBeFocused();await target.evaluate(element=>{element.setAttribute('tabindex','0');(element as HTMLElement).style.scrollMarginBlockStart='13px';});await page.getByTestId('anchors-destroy').click();await expect(target).toHaveAttribute('tabindex','0');expect(await target.evaluate(element=>(element as HTMLElement).style.scrollMarginBlockStart)).toBe('13px');await expect(page.getByTestId('anchors-destroy')).toBeFocused();
  99  |  });
  100 |  test('anchor release preserves inline priority and application changes to priority only',async({page})=>{
  101 |   const toggle=page.getByTestId('anchors-destroy'),target=page.locator('#navigation-intro');
  102 |   await toggle.click();
  103 |   await expect(page.locator('.anchor-layout ui-anchor-navigation')).toHaveCount(0);
  104 |   await target.evaluate(element=>(element as HTMLElement).style.setProperty('scroll-margin-block-start','7px','important'));
  105 |   await toggle.click();
  106 |   await expect.poll(()=>target.evaluate(element=>(element as HTMLElement).style.scrollMarginBlockStart)).toBe('40px');
  107 |   await toggle.click();
  108 |   await expect.poll(()=>target.evaluate(element=>[(element as HTMLElement).style.scrollMarginBlockStart,(element as HTMLElement).style.getPropertyPriority('scroll-margin-block-start')])).toEqual(['7px','important']);
  109 |   await toggle.click();
  110 |   await expect.poll(()=>target.evaluate(element=>(element as HTMLElement).style.scrollMarginBlockStart)).toBe('40px');
  111 |   await target.evaluate(element=>(element as HTMLElement).style.setProperty('scroll-margin-block-start','40px','important'));
  112 |   await toggle.click();
  113 |   await expect.poll(()=>target.evaluate(element=>[(element as HTMLElement).style.scrollMarginBlockStart,(element as HTMLElement).style.getPropertyPriority('scroll-margin-block-start')])).toEqual(['40px','important']);
  114 |  });
  115 |  test('palette arrows use displayed group order and leave disabled choices unexecuted',async({page})=>{
  116 |   await page.getByTestId('palette-anchor').click();const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox'),options=dialog.getByRole('option');await expect(options).toHaveCount(4);await page.keyboard.press('ArrowUp');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-command-blocked');await page.keyboard.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('0');await page.keyboard.press('ArrowDown');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-open');await page.keyboard.press('ArrowDown');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');await search.evaluate(element=>{for(const params of [{key:'Enter',isComposing:true},{key:'Enter',keyCode:229}])element.dispatchEvent(new KeyboardEvent('keydown',{...params,bubbles:true,cancelable:true}));const handled=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});handled.preventDefault();element.dispatchEvent(handled);});await expect(page.getByTestId('command-count')).toHaveText('0');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  117 |  });
  118 |  test('native disclosure hiding a popup anchor closes it and repairs focus to an explicit fallback',async({page})=>{
  119 |   const anchor=page.getByTestId('mega-anchor'),popup=page.locator('#catalog-mega');await anchor.click();await expect(popup).toBeVisible();await popup.getByRole('link',{name:'申請一覧',exact:true}).focus();await page.getByTestId('mega-collapse').dispatchEvent('click');await expect(popup).toBeHidden();await expect(anchor).toBeHidden();await expect(page.getByTestId('mega-close-reason')).toHaveText('scope-exit');await expect(page.getByTestId('outside')).toBeFocused();await page.getByTestId('mega-collapse').click();await expect(anchor).toBeVisible();await anchor.click();await expect(popup).toBeVisible();await page.keyboard.press('Escape');await expect(anchor).toBeFocused();
  120 |  });
  121 |  test('palette opening shortcut remains inside its overlay scope and yields another native modal',async({page})=>{
  122 |   const palette=page.locator('#catalog-palette');await page.getByTestId('outside').focus();await page.keyboard.press('Control+k');await expect(palette).toBeHidden();await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='foreign-native-modal';const button=document.createElement('button');button.textContent='別の確認操作';dialog.append(button);document.querySelector('ui-overlay-host')!.append(dialog);dialog.showModal();button.focus();});await page.keyboard.press('Control+k');await expect(palette).toBeHidden();await expect(page.locator('#foreign-native-modal')).toBeVisible();await page.evaluate(()=>{const dialog=document.querySelector<HTMLDialogElement>('#foreign-native-modal')!;dialog.close();dialog.remove();});await page.getByTestId('palette-anchor').focus();await page.keyboard.press('Control+k');await expect(palette).toBeVisible();await page.keyboard.press('Escape');await expect(palette).toBeHidden();
  123 |  });
  124 |  test('nested native modal retains its focus and yields palette activation until the inner confirmation closes',async({page})=>{
  125 |   await page.evaluate(()=>{const host=document.querySelector('ui-overlay-host')!,palette=document.querySelector('ui-command-palette')!,marker=document.createComment('palette-origin'),outer=document.createElement('dialog'),inner=document.createElement('dialog'),invoker=document.createElement('button'),confirm=document.createElement('button');palette.before(marker);outer.id='nested-outer';inner.id='nested-inner';invoker.id='nested-invoker';invoker.textContent='外側のコマンド操作';confirm.id='nested-confirm';confirm.textContent='内側の確認操作';inner.append(confirm);outer.append(invoker,palette,inner);host.append(outer);outer.showModal();inner.showModal();confirm.focus();(window as unknown as {restorePalette:()=>void}).restorePalette=()=>{outer.close();marker.replaceWith(palette);outer.remove();};});
  126 |   const palette=page.locator('#catalog-palette');await page.keyboard.press('Control+k');await expect(palette).toBeHidden();await expect(page.locator('#nested-confirm')).toBeFocused();await expect(page.locator('#nested-inner')).toBeVisible();await page.evaluate(()=>{document.querySelector<HTMLDialogElement>('#nested-inner')!.close();document.querySelector<HTMLButtonElement>('#nested-invoker')!.focus();});await page.keyboard.press('Control+k');await expect(palette).toBeVisible();await expect(palette.getByRole('combobox')).toBeFocused();await page.keyboard.press('Escape');await expect(palette).toBeHidden();await expect(page.locator('#nested-invoker')).toBeFocused();await page.evaluate(()=>(window as unknown as {restorePalette:()=>void}).restorePalette());
  127 |  });
  128 |  test('anchor destination follows native disclosure visibility and recovers after reopening',async({page})=>{
  129 |   await page.evaluate(()=>{const target=document.querySelector('#local-second')!,details=document.createElement('details'),summary=document.createElement('summary');details.id='anchor-target-disclosure';details.open=true;summary.textContent='移動先の詳細を切替';target.before(details);details.append(summary,target);});const link=page.getByRole('navigation',{name:'領域内の見出し',exact:true}).getByRole('link',{name:'領域内の確認へ',exact:true}),summary=page.locator('#anchor-target-disclosure>summary');await expect(link).toHaveAttribute('href','#local-second');await summary.click();await expect(page.locator('#local-second')).toBeHidden();await expect(link).toHaveAttribute('aria-disabled','true');await expect(link).not.toHaveAttribute('href',/.+/);await link.focus();await page.keyboard.press('Enter');await expect(page.locator('#local-second')).not.toBeFocused();await summary.click();await expect(link).not.toHaveAttribute('aria-disabled','true');await expect(link).toHaveAttribute('href','#local-second');await link.click();await expect(page.locator('#local-second')).toBeFocused();
  130 |  });
  131 |  test('the page reserves a sticky region at enlarged text so the focused heading stays visible and releases its reservation',async({page})=>{
  132 |   await page.setViewportSize({width:320,height:800});
  133 |   await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  134 |   await page.getByLabel('RTL',{exact:true}).check();
  135 |   await expect(page.locator('main')).toHaveAttribute('dir','rtl');
  136 |   const original=await page.evaluate(()=>document.documentElement.style.scrollPaddingBlockStart);
  137 |   await page.getByRole('combobox',{name:'ページ内移動の固定',exact:true}).selectOption('sticky');
  138 |   const nav=page.locator('.anchor-layout ui-anchor-navigation'),target=page.locator('#navigation-details');
  139 |   await expect.poll(()=>page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart)||0)).toBeGreaterThan(0);
  140 |   await nav.getByRole('link',{name:'確認内容へ',exact:true}).click();
  141 |   await expect(target).toBeFocused();
  142 |   await expect.poll(()=>target.evaluate(element=>{
  143 |    const r=element.getBoundingClientRect(),nav=document.querySelector('.anchor-layout ui-anchor-navigation')!.getBoundingClientRect();
  144 |    const point=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
```