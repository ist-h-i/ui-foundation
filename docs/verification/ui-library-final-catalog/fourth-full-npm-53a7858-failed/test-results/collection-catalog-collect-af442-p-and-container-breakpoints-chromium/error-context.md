# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collection-catalog.spec.ts >> collection catalog dense >> masonry has real unequal row heights and configurable columns, gap and container breakpoints
- Location: tests/ui/collection-catalog.spec.ts:19:2

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "2"
Received: "4"
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "一覧・選択・スクロール・移動" [level=1] [ref=e4]
  - generic [ref=e5]:
    - generic [ref=e6]:
      - text: 表示設定
      - combobox "表示設定" [ref=e7]:
        - option "guided"
        - option "dense" [selected]
    - generic [ref=e8]:
      - checkbox "RTL" [ref=e9]
      - text: RTL
    - generic [ref=e10]:
      - checkbox "処理中" [ref=e11]
      - text: 処理中
    - generic [ref=e12]:
      - checkbox "読取り専用" [ref=e13]
      - text: 読取り専用
    - button "外側の操作" [ref=e14] [cursor=pointer]
  - generic [ref=e16]:
    - region "記録の行" [ref=e17]:
      - heading "記録と操作" [level=2] [ref=e18]
      - list "記録の一覧" [ref=e20]:
        - listitem [ref=e21]:
          - generic [ref=e26]:
            - generic [ref=e27]: 記録10
            - generic [ref=e28]: 確認する最初の記録
        - listitem [ref=e29]:
          - generic [ref=e34]:
            - generic [ref=e35]: 記録2
            - generic [ref=e36]: 補助情報を残す記録
        - listitem [ref=e37]:
          - generic [ref=e42]:
            - generic [ref=e43]: 別の記録
            - generic [ref=e44]: 種類が異なる記録
      - list "操作付きの記録" [ref=e46]:
        - listitem [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]: 記録10 / 確認する最初の記録
            - button "記録10を確認" [ref=e50] [cursor=pointer]:
              - generic [ref=e51]: 確認
        - listitem [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e54]: 記録2 / 補助情報を残す記録
            - button "記録2を確認" [ref=e55] [cursor=pointer]:
              - generic [ref=e56]: 確認
        - listitem [ref=e57]:
          - generic [ref=e58]:
            - generic [ref=e59]: 別の記録 / 種類が異なる記録
            - button "別の記録を確認" [ref=e60] [cursor=pointer]:
              - generic [ref=e61]: 確認
      - button "区切りを切替" [ref=e62] [cursor=pointer]
      - status [ref=e64]: "0"
    - region "検索と配置" [ref=e65]:
      - heading "検索と表示形式" [level=2] [ref=e66]
      - generic "検索できる記録" [ref=e67]:
        - region "検索できる記録" [ref=e68]:
          - generic [ref=e69]:
            - generic [ref=e70]:
              - text: 検索
              - searchbox "検索" [ref=e71]
            - generic [ref=e72]:
              - text: 並び順
              - combobox "並び順" [ref=e73]:
                - option "元の順" [selected]
                - option "昇順"
                - option "降順"
            - button "リスト表示" [pressed] [ref=e74] [cursor=pointer]
            - button "グリッド表示" [ref=e76] [cursor=pointer]
          - status [ref=e78]: 5件
          - list [ref=e79]:
            - listitem [ref=e80]:
              - generic [ref=e81]:
                - text: 記録10
                - textbox "記録10のメモ" [ref=e82]
              - text: 0 / 0
            - listitem [ref=e83]:
              - generic [ref=e84]:
                - text: 記録2
                - textbox "記録2のメモ" [ref=e85]
              - text: 1 / 1
          - navigation "一覧のページ" [ref=e86]:
            - button "前へ" [disabled] [ref=e87]
            - generic [ref=e89]: 1 / 3 ページ
            - button "次へ" [ref=e90] [cursor=pointer]
            - generic [ref=e92]:
              - text: 表示件数
              - combobox "表示件数" [ref=e93]:
                - option "2件" [selected]
                - option "3件"
                - option "5件"
      - generic [ref=e94]:
        - button "範囲外のページ" [ref=e95] [cursor=pointer]
        - button "検索とソートを切替" [ref=e97] [cursor=pointer]
        - button "ページ送りを切替" [ref=e99] [cursor=pointer]
        - button "検索を戻す" [ref=e101] [cursor=pointer]
        - button "記録を減らす" [ref=e103] [cursor=pointer]
      - generic [ref=e105]: "{ \"query\": \"\", \"sort\": \"none\", \"page\": 1, \"pageSize\": 2, \"layout\": \"list\" }"
    - region "高さの異なる記録" [ref=e106]:
      - heading "高さの異なる記録" [level=2] [ref=e107]
      - list "高さの異なる一覧" [ref=e109]:
        - listitem [ref=e110]:
          - generic [ref=e111]: 記録10
          - generic [ref=e112]: 確認する最初の記録
        - listitem [ref=e113]:
          - generic [ref=e114]: 記録2
          - generic [ref=e115]: 補助情報を残す記録補助情報を残す記録補助情報を残す記録補助情報を残す記録補助情報を残す記録補助情報を残す記録
        - listitem [ref=e116]:
          - generic [ref=e117]: 別の記録
          - generic [ref=e118]: 種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録種類が異なる記録
      - generic [ref=e119]:
        - button "列数を切替" [active] [ref=e120] [cursor=pointer]
        - button "間隔を切替" [ref=e122] [cursor=pointer]
        - button "幅別の列数" [ref=e124] [cursor=pointer]
    - region "候補を選択" [ref=e126]:
      - heading "候補を選択" [level=2] [ref=e127]
      - generic "確認する候補" [ref=e128]:
        - generic [ref=e130]:
          - text: 候補を検索
          - searchbox "候補を検索" [ref=e131]
        - generic [ref=e132]:
          - button "表示中をすべて選択" [ref=e133] [cursor=pointer]
          - button "表示中の選択を解除" [ref=e135] [cursor=pointer]
        - listbox "確認する候補" [ref=e137]:
          - generic [ref=e138]:
            - group "前半の候補" [ref=e139]:
              - option "候補0003" [ref=e140] [cursor=pointer]:
                - generic [aria-hidden] [ref=e141]: 前半の候補
              - option "候補0004" [ref=e143] [cursor=pointer]:
                - generic [aria-hidden] [ref=e144]: 前半の候補
              - option "候補0005" [disabled] [ref=e146]:
                - generic [aria-hidden] [ref=e147]: 前半の候補
              - option "候補0006" [ref=e149] [cursor=pointer]:
                - generic [aria-hidden] [ref=e150]: 前半の候補
              - option "候補0007" [ref=e152] [cursor=pointer]:
                - generic [aria-hidden] [ref=e153]: 前半の候補
              - option "候補0008" [ref=e155] [cursor=pointer]:
                - generic [aria-hidden] [ref=e156]: 前半の候補
            - option "候補0001" [selected] [ref=e158] [cursor=pointer]
            - option "候補0002" [ref=e160] [cursor=pointer]
        - status [ref=e163]: 2件選択
      - generic [ref=e164]:
        - button "候補の長いラベルを切替" [ref=e165] [cursor=pointer]
        - button "選択方式を切替" [ref=e167] [cursor=pointer]
        - button "候補の仮想化を切替" [ref=e169] [cursor=pointer]
        - button "不正な選択を復元" [ref=e171] [cursor=pointer]
        - button "選択をreset" [ref=e173] [cursor=pointer]
        - button "選択の無効状態を切替" [ref=e175] [cursor=pointer]
        - button "選択上限を切替" [ref=e177] [cursor=pointer]
        - button "候補を差替え" [ref=e179] [cursor=pointer]
        - button "高さの有効状態を切替" [ref=e181] [cursor=pointer]
        - button "識別子を変更" [ref=e183] [cursor=pointer]
        - button "必須を切替" [ref=e185] [cursor=pointer]
        - button "候補の作成状態を切替" [ref=e187] [cursor=pointer]
      - generic [ref=e189]: "[ \"option0001\", \"option0700\" ]"
      - status [ref=e190]: "true"
    - region "長い一覧" [ref=e191]:
      - heading "長い一覧" [level=2] [ref=e192]
      - generic "1000件の記録" [ref=e193]:
        - list "1000件の記録" [ref=e194]:
          - generic [ref=e195]:
            - listitem [ref=e196]:
              - generic [ref=e197]:
                - generic [ref=e198]: 長い記録1
                - textbox "長い記録1の仮想メモ" [ref=e199]
            - listitem [ref=e200]:
              - generic [ref=e201]:
                - generic [ref=e202]: 長い記録2
                - textbox "長い記録2の仮想メモ" [ref=e203]
            - listitem [ref=e204]:
              - generic [ref=e205]:
                - generic [ref=e206]: 長い記録3
                - textbox "長い記録3の仮想メモ" [ref=e207]
            - listitem [ref=e208]:
              - generic [ref=e209]:
                - generic [ref=e210]: 長い記録4
                - textbox "長い記録4の仮想メモ" [ref=e211]
            - listitem [ref=e212]:
              - generic [ref=e213]:
                - generic [ref=e214]: 長い記録5
                - textbox "長い記録5の仮想メモ" [ref=e215]
            - listitem [ref=e216]:
              - generic [ref=e217]:
                - generic [ref=e218]: 長い記録6
                - textbox "長い記録6の仮想メモ" [ref=e219]
            - listitem [ref=e220]:
              - generic [ref=e221]:
                - generic [ref=e222]: 長い記録7
                - textbox "長い記録7の仮想メモ" [ref=e223]
            - listitem [ref=e224]:
              - generic [ref=e225]:
                - generic [ref=e226]: 長い記録8
                - textbox "長い記録8の仮想メモ" [ref=e227]
      - generic [ref=e229]:
        - button "行テンプレートを切替" [ref=e230] [cursor=pointer]
        - button "長いラベルを切替" [ref=e232] [cursor=pointer]
        - button "先頭へ" [ref=e234] [cursor=pointer]
        - button "末尾へ" [ref=e236] [cursor=pointer]
        - button "位置を指定" [ref=e238] [cursor=pointer]
        - button "仮想領域の高さを切替" [ref=e240] [cursor=pointer]
        - button "先読みを切替" [ref=e242] [cursor=pointer]
        - button "先頭の行を除去" [ref=e244] [cursor=pointer]
        - button "長い一覧の作成状態を切替" [ref=e246] [cursor=pointer]
      - generic [ref=e248]: "{ \"start\": 0, \"end\": 8 }"
      - generic [ref=e249]: "{ \"offset\": 0, \"index\": 0 }"
      - status
    - region "位置を移動" [ref=e250]:
      - heading "位置を移動" [level=2] [ref=e251]
      - generic "記録の順序" [ref=e252]:
        - region "記録の順序" [ref=e253]:
          - paragraph [ref=e254]: 移動ボタンで位置を変えられます。ハンドルを押すとキーボードで仮の位置を選べます。
          - list [ref=e255]:
            - listitem [ref=e256]:
              - generic [ref=e257]: 記録10
              - generic [ref=e258]:
                - button "記録10の移動位置を選ぶ" [ref=e259] [cursor=pointer]:
                  - generic [ref=e260]: 移動
                - button "記録10を上へ" [disabled] [ref=e261]:
                  - generic [ref=e262]: 上へ
                - button "記録10を下へ" [ref=e263] [cursor=pointer]:
                  - generic [ref=e264]: 下へ
            - listitem [ref=e265]:
              - generic [ref=e266]: 記録2
              - generic [ref=e267]:
                - button "記録2の移動位置を選ぶ" [ref=e268] [cursor=pointer]:
                  - generic [ref=e269]: 移動
                - button "記録2を上へ" [ref=e270] [cursor=pointer]:
                  - generic [ref=e271]: 上へ
                - button "記録2を下へ" [disabled] [ref=e272]:
                  - generic [ref=e273]: 下へ
            - listitem [ref=e274]:
              - generic [ref=e275]: 別の記録
              - generic [ref=e276]:
                - button "別の記録の移動位置を選ぶ" [ref=e277] [cursor=pointer]:
                  - generic [ref=e278]: 移動
                - button "別の記録を上へ" [ref=e279] [cursor=pointer]:
                  - generic [ref=e280]: 上へ
                - button "別の記録を下へ" [disabled] [ref=e281]:
                  - generic [ref=e282]: 下へ
          - status
      - generic [ref=e283]:
        - button "順序を戻す" [ref=e284] [cursor=pointer]
        - button "移動方向を切替" [ref=e286] [cursor=pointer]
        - button "移動許可を切替" [ref=e288] [cursor=pointer]
        - button "移動許可の未確定" [ref=e290] [cursor=pointer]
        - button "移動許可の障害" [ref=e292] [cursor=pointer]
        - button "移動中に一覧を差替え" [ref=e294] [cursor=pointer]
        - button "Dialog内の移動" [ref=e296] [cursor=pointer]
      - status [ref=e298]: 1,2,3
      - generic [ref=e299]: "null"
    - region "追加取得" [ref=e300]:
      - heading "追加取得" [level=2] [ref=e301]
      - generic [ref=e302]:
        - checkbox "自動追加取得" [ref=e303]
        - text: 自動追加取得
      - generic "追加取得する記録" [ref=e305]:
        - region "追加取得する記録" [ref=e306]:
          - list
          - button "さらに読み込む" [ref=e308] [cursor=pointer]
      - generic [ref=e310]:
        - button "取得を完了して追加" [ref=e311] [cursor=pointer]
        - button "空応答を完了" [ref=e313] [cursor=pointer]
        - button "取得を失敗" [ref=e315] [cursor=pointer]
        - button "古い取得結果" [ref=e317] [cursor=pointer]
        - button "待機中の取得を失効" [ref=e319] [cursor=pointer]
        - button "取得をreset" [ref=e321] [cursor=pointer]
        - button "取得の終端を切替" [ref=e323] [cursor=pointer]
        - button "追加取得の作成状態を切替" [ref=e325] [cursor=pointer]
      - status [ref=e327]: "0"
      - status
      - status [ref=e328]: "0"
```

# Test source

```ts
  1  | import AxeBuilder from '@axe-core/playwright';
  2  | import type {Page} from '@playwright/test';
  3  | import {test,expect} from './catalog-test';
  4  | async function overflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);}
  5  | async function optionOwns(page:Page){
  6  |  const session=await page.context().newCDPSession(page);const {nodes}=await session.send('Accessibility.getFullAXTree');await session.detach();
  7  |  const list=nodes.find(node=>!node.ignored&&node.role?.value==='listbox'&&node.name?.value==='確認する候補');expect(list).toBeDefined();
  8  |  const byId=new Map(nodes.map(node=>[node.nodeId,node]));const descendants:string[]=[];const visit=(id:string)=>{expect(descendants).not.toContain(id);descendants.push(id);for(const child of byId.get(id)?.childIds??[])visit(child);};visit(list!.nodeId);
  9  |  const options=descendants.map(id=>byId.get(id)!).filter(node=>!node.ignored&&node.role?.value==='option');
  10 |  const names=await page.locator('ui-listbox [role=option]').evaluateAll(elements=>elements.map(e=>e.getAttribute('aria-label')).sort());expect(options.map(n=>n.name?.value).sort()).toEqual(names);
  11 |  for(const group of descendants.map(id=>byId.get(id)!).filter(node=>!node.ignored&&node.role?.value==='group')){expect(group.name?.value).toBeTruthy();const ids:string[]=[];const walk=(id:string)=>{const n=byId.get(id)!;if(!n.ignored&&n.role?.value==='option')ids.push(String(n.name?.value));for(const child of n.childIds??[])walk(child);};walk(group.nodeId);expect(ids.length).toBeGreaterThan(0);}
  12 |  const active=await page.getByRole('listbox',{name:'確認する候補'}).getAttribute('aria-activedescendant');if(active)expect(await page.locator('[id="'+active+'"][role=option]').count()).toBe(1);
  13 | }
  14 | for(const profile of ['guided','dense'])test.describe(`collection catalog ${profile}`,()=>{
  15 |  test.beforeEach(async({page})=>{await page.goto('/catalog/collections');await expect(page.getByRole('heading',{name:'一覧・選択・スクロール・移動'})).toBeVisible();await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);});
  16 |  test('native lists retain auxiliary information, icons, real row actions and separators',async({page})=>{const list=page.locator('ui-list').first();await expect(list.getByRole('listitem')).toHaveCount(3);await expect(list.locator('ui-icon')).toHaveCount(3);await expect(list).toContainText('補助情報を残す記録');await page.getByRole('button',{name:'記録2を確認',exact:true}).click();await expect(page.locator('#row-action')).toHaveText('2');await page.locator('#separators').click();await expect(list.getByRole('list')).toHaveAttribute('data-separators','false');});
  17 |  test('data view filters, naturally sorts, paginates and keeps the same editor across layouts',async({page})=>{const view=page.locator('ui-data-view');const editor=view.getByRole('textbox',{name:'記録10のメモ'}),handle=await editor.elementHandle();await editor.fill('保持した入力');await view.getByRole('button',{name:'グリッド表示',exact:true}).click();await expect(editor).toHaveValue('保持した入力');expect(await editor.evaluate((node,old)=>node===old,handle)).toBe(true);await view.getByRole('combobox',{name:'並び順',exact:true}).selectOption('asc');await expect(view.locator('li').first()).toContainText('記録1');await view.getByRole('button',{name:'次へ',exact:true}).click();await expect(view.locator('li').first()).toContainText('2 / 0');await view.getByRole('searchbox',{name:'検索',exact:true}).fill('記録20');await expect(view.locator('li')).toHaveCount(1);await expect(view).toContainText('1件');await view.getByRole('button',{name:'検索を解除',exact:true}).click();await expect(view.locator('li')).toHaveCount(2);});
  18 |  test('out-of-range pages publish normalized app state and disabled features ignore stored conditions',async({page})=>{const view=page.locator('ui-data-view');await page.locator('#view-bad-page').click();await expect(page.locator('#view-state')).toContainText('"page": 3');await expect(view.locator('li')).toHaveCount(1);await page.locator('#view-remove').click();await expect(page.locator('#view-state')).toContainText('"page": 1');await page.locator('#view-reset').click();await view.getByRole('searchbox').fill('missing');await expect(view).toContainText('条件に一致する項目はありません。');await page.locator('#view-features').click();await page.locator('#view-pager').click();await expect(view.locator('li')).toHaveCount(5);await expect(page.locator('#view-state')).toContainText('"query": "missing"');await expect(view.getByRole('alert')).toHaveCount(0);});
> 19 |  test('masonry has real unequal row heights and configurable columns, gap and container breakpoints',async({page})=>{const masonry=page.locator('ui-masonry');const heights=await masonry.locator('li').evaluateAll(rows=>rows.map(row=>row.getBoundingClientRect().height));expect(new Set(heights).size).toBeGreaterThan(1);await page.locator('#masonry-columns').click();expect(await masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnCount)).toBe('2');const gap=await masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnGap);await page.locator('#masonry-gap').click();await expect.poll(()=>masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnGap)).not.toBe(gap);await page.setViewportSize({width:320,height:900});await page.locator('#masonry-breakpoints').click();await expect.poll(()=>masonry.locator('ul').evaluate(e=>getComputedStyle(e).columnCount)).toBe('1');await overflow(page);});
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  20 |  test('virtual grouped listbox exposes one real AX option ownership and keeps active refs after repeated selection',async({page})=>{const box=page.getByRole('listbox',{name:'確認する候補',exact:true});await box.focus();await expect(box).toHaveAttribute('aria-activedescendant',/.+/);await optionOwns(page);expect(await page.locator('ui-listbox [role=option]').count()).toBeLessThan(30);await page.keyboard.press('Space');await expect(page.locator('#selection-model')).not.toContainText('option0001');await expect(box).toHaveAttribute('aria-activedescendant',/.+/);await page.keyboard.press('Space');await expect(box).toHaveAttribute('aria-activedescendant',/.+/);await page.keyboard.press('End');await expect(page.locator('ui-listbox [role=option]').last()).toHaveAttribute('data-list-value','option1000');await expect(box).toHaveAttribute('aria-activedescendant',/.+/);await optionOwns(page);await page.locator('#listbox-id').dispatchEvent('click');await expect(box).toHaveAttribute('id','listbox-new');await expect(box).toHaveAttribute('aria-activedescendant',/^listbox-new-option-/);await optionOwns(page);});
  21 |  test('search and scoped deselection preserve hidden selections and individual disabled options',async({page})=>{const box=page.getByRole('listbox',{name:'確認する候補',exact:true});await page.locator('ui-listbox').getByRole('searchbox').fill('候補0001');await page.locator('ui-listbox').getByRole('button',{name:'表示中の選択を解除'}).click();await expect(page.locator('#selection-model')).toContainText('option0700');await expect(page.locator('#selection-model')).not.toContainText('option0001');await page.locator('ui-listbox').getByRole('searchbox').fill('候補0005');await expect(page.getByRole('option',{name:'候補0005',exact:true})).toHaveAttribute('aria-disabled','true');await box.focus();await page.keyboard.press('Space');await expect(page.locator('#selection-model')).toContainText('option0700');await page.locator('ui-listbox').getByRole('searchbox').fill('no candidates');await expect(page.locator('ui-listbox').getByRole('option')).toHaveCount(0);await expect(box).not.toHaveAttribute('aria-activedescendant',/.+/);await optionOwns(page);});
  22 |  test('restored selection and geometry errors preserve values until real reset or configuration repair',async({page})=>{await page.locator('#listbox-invalid').click();await expect(page.locator('#selection-valid')).toHaveText('false');await expect(page.locator('#selection-model')).toContainText('gone');await page.locator('#listbox-height').click();await expect(page.locator('ui-listbox')).toContainText('候補の高さと先読み件数');await expect(page.locator('#selection-model')).toContainText('gone');await page.locator('#listbox-height').click();await expect(page.locator('#selection-valid')).toHaveText('false');await page.locator('#listbox-reset').click();await expect(page.locator('#selection-valid')).toHaveText('true');await page.locator('#listbox-height').click();await expect(page.locator('#selection-valid')).toHaveText('false');await page.locator('#listbox-height').click();await expect(page.locator('#selection-valid')).toHaveText('true');await page.locator('#listbox-mode').click();await page.getByRole('listbox',{name:'確認する候補'}).focus();await page.keyboard.press('Home');await page.keyboard.press('Space');await expect(page.locator('#selection-model')).toHaveText('"option0001"');});
  23 |  test('public listbox viewport bounds long labels while native selection and AX ownership survive RTL',async({page})=>{
  24 |   await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('#listbox-long-labels').click();
  25 |   const list=page.locator('ui-listbox'),box=page.getByRole('listbox',{name:'確認する候補',exact:true});
  26 |   for(const rtl of [false,true]){
  27 |    await page.getByLabel('RTL',{exact:true}).setChecked(rtl);await box.focus();await page.keyboard.press('Home');
  28 |    await expect.poll(()=>box.evaluate(element=>Array.from(element.querySelectorAll<HTMLElement>('[role=option]')).every(option=>Math.abs(option.getBoundingClientRect().width-element.clientWidth)<=1))).toBe(true);
  29 |    const dimensions=await box.evaluate(element=>({width:element.clientWidth,scrollWidth:element.scrollWidth,labels:Array.from(element.querySelectorAll<HTMLElement>('[role=option]>span')).slice(0,2).map(span=>({width:span.clientWidth,scrollWidth:span.scrollWidth,ellipsis:getComputedStyle(span).textOverflow}))}));
  30 |    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width+1);expect(dimensions.labels).toHaveLength(2);
  31 |    for(const label of dimensions.labels){expect(label.scrollWidth).toBeGreaterThan(label.width);expect(label.ellipsis).toBe('ellipsis');}
  32 |    await page.locator('#listbox-reset').dispatchEvent('click');await box.focus();await page.keyboard.press('Home');await page.keyboard.press('Space');await expect(page.locator('#selection-model')).toContainText('option0001');await optionOwns(page);await overflow(page);
  33 |   }
  34 |   await page.locator('#listbox-virtual').click();await expect(list.locator('cdk-virtual-scroll-viewport')).toHaveCount(0);await expect.poll(()=>box.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);await optionOwns(page);await overflow(page);
  35 |  });
  36 |  test('virtual viewport reaches 1000th row with bounded DOM and restores app-owned editor values',async({page})=>{const list=page.locator('ui-virtual-list'),viewport=list.locator('cdk-virtual-scroll-viewport');await list.getByRole('textbox',{name:'長い記録1の仮想メモ'}).fill('キーで保持');expect(await list.getByRole('listitem').count()).toBeLessThan(30);await page.locator('#virtual-end').click();await expect(list.getByRole('listitem').last()).toHaveAttribute('aria-posinset','1000');await expect(list.getByRole('listitem').last()).toHaveAttribute('aria-setsize','1000');await viewport.focus();await page.keyboard.press('Home');await expect(list.getByRole('listitem').first()).toHaveAttribute('aria-posinset','1');await expect(list.getByRole('textbox',{name:'長い記録1の仮想メモ'})).toHaveValue('キーで保持');await page.keyboard.press('PageDown');await expect.poll(()=>viewport.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);await page.locator('#virtual-offset').click();await expect.poll(()=>viewport.evaluate(e=>e.scrollTop)).toBe(160);});
  37 |  test('public viewport width bounds long default labels and retains projected editor across resize and profiles',async({page})=>{
  38 |   const list=page.locator('ui-virtual-list'),viewport=list.locator('cdk-virtual-scroll-viewport');
  39 |   await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  40 |   await page.locator('#virtual-content').click();await page.locator('#virtual-labels').click();
  41 |   for(const rtl of [false,true]){
  42 |    await page.getByLabel('RTL',{exact:true}).setChecked(rtl);await viewport.scrollIntoViewIfNeeded();
  43 |    await expect.poll(()=>viewport.evaluate(element=>Array.from(element.querySelectorAll<HTMLElement>('.ui-virtual-row')).every(row=>Math.abs(row.getBoundingClientRect().width-element.clientWidth)<=1))).toBe(true);
  44 |    const dimensions=await viewport.evaluate(element=>({width:element.clientWidth,scrollWidth:element.scrollWidth,labels:Array.from(element.querySelectorAll<HTMLElement>('.ui-virtual-row>span')).slice(0,2).map(span=>({width:span.clientWidth,scrollWidth:span.scrollWidth,ellipsis:getComputedStyle(span).textOverflow}))}));
  45 |    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width+1);expect(dimensions.labels).toHaveLength(2);
  46 |    for(const label of dimensions.labels){expect(label.scrollWidth).toBeGreaterThan(label.width);expect(label.ellipsis).toBe('ellipsis');}
  47 |    await overflow(page);
  48 |   }
  49 |   await page.locator('#virtual-labels').click();await page.locator('#virtual-content').click();
  50 |   const editor=list.getByRole('textbox',{name:'長い記録1の仮想メモ'});await editor.fill('幅を変えても保持');const original=await editor.elementHandle();
  51 |   for(const width of [640,320]){
  52 |    await page.setViewportSize({width,height:900});await expect.poll(()=>viewport.evaluate(element=>Math.abs(element.querySelector('.ui-virtual-row')!.getBoundingClientRect().width-element.clientWidth))).toBeLessThanOrEqual(1);
  53 |    expect(await editor.evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThan(await viewport.evaluate(element=>element.clientWidth*.6));
  54 |    expect(await editor.evaluate((element,prior)=>element===prior,original!)).toBe(true);await expect(editor).toHaveValue('幅を変えても保持');
  55 |   }
  56 |   await editor.focus();await page.getByRole('combobox',{name:'表示設定',exact:true}).evaluate((element,value)=>{(element as HTMLSelectElement).value=value;element.dispatchEvent(new Event('change',{bubbles:true}));},profile==='guided'?'dense':'guided');
  57 |   await expect(editor).toBeFocused();expect(await editor.evaluate((element,prior)=>element===prior,original!)).toBe(true);await expect(editor).toHaveValue('幅を変えても保持');
  58 |   await expect.poll(()=>viewport.evaluate(element=>Math.abs(element.querySelector('.ui-virtual-row')!.getBoundingClientRect().width-element.clientWidth))).toBeLessThanOrEqual(1);
  59 |   await overflow(page);
  60 |  });
  61 |  test('virtual row removal preserves owned focus at viewport and never steals external focus',async({page})=>{const list=page.locator('ui-virtual-list'),editor=list.getByRole('textbox',{name:'長い記録1の仮想メモ'});await editor.focus();await page.locator('#virtual-end').dispatchEvent('click');await expect(list.locator('cdk-virtual-scroll-viewport')).toBeFocused();await page.locator('#outside').focus();await page.locator('#virtual-start').dispatchEvent('click');await expect(page.locator('#outside')).toBeFocused();});
  62 |  test('virtual geometry recovery retains owned focus locally and keeps external focus',async({page})=>{const list=page.locator('ui-virtual-list');await list.getByRole('textbox',{name:'長い記録1の仮想メモ'}).focus();await page.locator('#virtual-geometry').dispatchEvent('click');await expect(list.getByRole('alert')).toBeVisible();await expect(list).toBeFocused();await page.locator('#virtual-geometry').dispatchEvent('click');await list.locator('cdk-virtual-scroll-viewport').focus();await page.locator('#virtual-geometry').dispatchEvent('click');await expect(list).toBeFocused();await page.locator('#outside').focus();await page.locator('#virtual-geometry').dispatchEvent('click');await expect(page.locator('#outside')).toBeFocused();});
  63 |  test('profile measurement preserves the front index and overscan changes actual bounded rows',async({page})=>{const list=page.locator('ui-virtual-list'),viewport=list.locator('cdk-virtual-scroll-viewport');await page.locator('#virtual-offset').click();const index=await viewport.evaluate(e=>e.scrollTop/(e.querySelector('.ui-virtual-row')?.getBoundingClientRect().height??1));await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect.poll(()=>viewport.evaluate(e=>e.scrollTop/(e.querySelector('.ui-virtual-row')?.getBoundingClientRect().height??1))).toBeCloseTo(index,1);const count=await list.getByRole('listitem').count();await page.locator('#virtual-overscan').click();await expect.poll(()=>list.getByRole('listitem').count()).toBeGreaterThan(count);expect(await list.getByRole('listitem').count()).toBeLessThan(40);});
  64 |  test('settled 200% geometry keeps the logical front index and last row visible',async({page})=>{const list=page.locator('ui-virtual-list'),viewport=list.locator('cdk-virtual-scroll-viewport');await page.locator('#virtual-end').click();await expect(list.getByRole('listitem').last()).toHaveAttribute('aria-posinset','1000');const before=await viewport.evaluate(e=>({index:e.scrollTop/(e.querySelector('.ui-virtual-row')?.getBoundingClientRect().height??1),row:e.querySelector('.ui-virtual-row')?.getBoundingClientRect().height??0}));await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(()=>list.locator('.ui-virtual-row').first().evaluate(e=>e.getBoundingClientRect().height)).toBeCloseTo(before.row*2,1);await page.evaluate(()=>new Promise<void>(resolve=>{let frames=12;const next=()=>{if(--frames===0)resolve();else requestAnimationFrame(next);};requestAnimationFrame(next);}));await expect.poll(()=>viewport.evaluate(e=>e.scrollTop/(e.querySelector('.ui-virtual-row')?.getBoundingClientRect().height??1))).toBeCloseTo(before.index,1);await viewport.scrollIntoViewIfNeeded();await expect(list.getByRole('listitem').last()).toBeInViewport();});
  65 |  test('native movement and cancelable keyboard drafts honor boundaries, snapshots and callback failure',async({page})=>{const list=page.locator('ui-sortable-list').first();await list.getByRole('button',{name:'記録10を下へ',exact:true}).click();await expect(page.locator('#order-model')).toHaveText('2,1,3');await page.locator('#order-reset').click();const handle=list.getByRole('button',{name:'記録10の移動位置を選ぶ',exact:true});await handle.click();await page.keyboard.press('ArrowDown');await expect(page.locator('#order-model')).toHaveText('1,2,3');await page.keyboard.press('Escape');await expect(page.locator('#order-model')).toHaveText('1,2,3');await handle.click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#order-model')).toHaveText('2,1,3');await page.locator('#order-throw').click();await expect(list.getByRole('button',{name:'記録2を下へ',exact:true})).toBeDisabled();await page.locator('#order-throw').click();await page.locator('#order-unknown').click();await expect(list.getByRole('button',{name:'記録2を下へ',exact:true})).toBeDisabled();await page.locator('#order-unknown').click();await list.getByRole('button',{name:'記録2の移動位置を選ぶ',exact:true}).click();await page.locator('#order-replace').dispatchEvent('click');await expect(list).toContainText('一覧の更新により');await page.keyboard.press('Enter');await expect(page.locator('#order-model')).toHaveText('1,2');});
  66 |  test('real pointer drop commits after CDK ended and cancelled or stale drops never publish an update',async({page})=>{const list=page.locator('ui-sortable-list').first();const handle=list.getByRole('button',{name:'記録10の移動位置を選ぶ',exact:true});await handle.scrollIntoViewIfNeeded();const first=await handle.boundingBox(),second=await list.locator('li').nth(1).boundingBox();await page.mouse.move(first!.x+first!.width/2,first!.y+first!.height/2);await page.mouse.down();await page.mouse.move(second!.x+first!.width/2,second!.y+second!.height/2,{steps:12});await page.mouse.up();await expect(page.locator('#order-model')).toHaveText('2,1,3');await page.locator('#order-reset').click();const source=await handle.boundingBox(),target=await list.locator('li').nth(1).boundingBox();await page.mouse.move(source!.x+source!.width/2,source!.y+source!.height/2);await page.mouse.down();await page.mouse.move(target!.x+source!.width/2,target!.y+target!.height/2,{steps:12});await page.keyboard.press('Escape');await page.mouse.up();await expect(page.locator('#order-model')).toHaveText('1,2,3');});
  67 |  test('source cancellation cleans drag geometry before restored rows and wrapped RTL movement',async({page})=>{const list=page.locator('ui-sortable-list').first(),handle=list.getByRole('button',{name:'記録10の移動位置を選ぶ',exact:true});await handle.scrollIntoViewIfNeeded();const first=await handle.boundingBox(),second=await list.locator('li').nth(1).boundingBox();await page.mouse.move(first!.x+first!.width/2,first!.y+first!.height/2);await page.mouse.down();await page.mouse.move(second!.x+first!.width/2,second!.y+second!.height/2,{steps:12});await page.locator('#order-replace').dispatchEvent('click');await expect(page.locator('#order-model')).toHaveText('1,2');await page.mouse.up();await page.locator('#order-reset').click();await expect(page.locator('#order-model')).toHaveText('1,2,3');await expect.poll(()=>list.locator('li').evaluateAll(rows=>rows.every((row,index)=>index===0||row.getBoundingClientRect().top>=rows[index-1].getBoundingClientRect().bottom))).toBe(true);await page.locator('#order-horizontal').click();await page.getByLabel('RTL',{exact:true}).check();await page.setViewportSize({width:320,height:900});await expect.poll(()=>list.locator('li').evaluateAll(rows=>rows.every((row,index)=>rows.slice(0,index).every(other=>{const a=row.getBoundingClientRect(),b=other.getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;})))).toBe(true);await overflow(page);});
  68 |  test('move operation yields handled child Escape and IME, then closes before its parent Dialog',async({page})=>{await page.locator('#order-dialog').click();const dialog=page.getByRole('dialog',{name:'Dialog内の移動'}),list=dialog.locator('ui-sortable-list');await list.getByRole('button',{name:'記録10の移動位置を選ぶ'}).click();const child=dialog.getByRole('textbox',{name:'記録10の子入力'});await child.fill('子の取消');await page.keyboard.press('Escape');await expect(child).toHaveValue('');await expect(list.getByRole('button',{name:'記録10の移動位置を選ぶ'})).toHaveAttribute('aria-pressed','true');await child.dispatchEvent('keydown',{key:'Escape',isComposing:true,keyCode:229,bubbles:true,cancelable:true});await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(list.getByRole('button',{name:'記録10の移動位置を選ぶ'})).toHaveAttribute('aria-pressed','false');await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();});
  69 |  test('manual loading gates burst, retains failure, retries and rejects reset/destroyed original-host replies',async({page})=>{const list=page.locator('ui-infinite-scroll');await list.getByRole('button',{name:'さらに読み込む',exact:true}).click();await expect(page.locator('#load-count')).toHaveText('1');await expect(list.getByRole('button')).toBeDisabled();await page.locator('#load-fail').click();await expect(list).toContainText('取得できません。');await list.getByRole('button',{name:'再試行',exact:true}).click();await page.locator('#load-old').click();await expect(page.locator('#load-result')).toHaveText('false');await page.locator('#load-complete').click();await expect(page.locator('#loaded-count')).toHaveText('1');await list.getByRole('button',{name:'さらに読み込む',exact:true}).click();await page.locator('#load-reset').click();await page.locator('#load-complete').click();await expect(page.locator('#load-result')).toHaveText('false');await list.getByRole('button',{name:'さらに読み込む',exact:true}).click();await page.locator('#load-hide').click();await page.locator('#load-complete').click();await expect(page.locator('#load-result')).toHaveText('false');});
  70 |  test('native intersection continues visible batches only after actual version progress and stops at end',async({page})=>{await page.getByLabel('自動追加取得',{exact:true}).check();await page.locator('ui-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator('#load-count')).toHaveText('1');await page.locator('#load-empty').click();await expect(page.locator('ui-infinite-scroll').getByRole('button')).toBeEnabled();await expect(page.locator('#load-count')).toHaveText('1');await page.locator('ui-infinite-scroll').getByRole('button').click();await expect(page.locator('#load-count')).toHaveText('2');await page.locator('#load-complete').click();await expect(page.locator('#load-count')).toHaveText('3');await page.locator('#load-finished').click();await page.locator('#load-complete').click();await expect(page.locator('ui-infinite-scroll')).toContainText('すべての項目');await expect(page.locator('#load-count')).toHaveText('3');});
  71 |  test('idle invalidation re-arms the real offscreen intersection observer without changing query or content',async({page})=>{const root=page.locator('.scroll-root'),list=page.locator('ui-infinite-scroll');await list.locator('ul').evaluate(element=>{const row=document.createElement('li');row.textContent='監視対象より前の長い投影内容';row.style.blockSize='1000px';element.append(row);});await page.getByLabel('自動追加取得',{exact:true}).check();await root.scrollIntoViewIfNeeded();await root.evaluate(element=>element.scrollTop=0);await page.evaluate(()=>new Promise<void>(resolve=>{let frames=12;const next=()=>{if(--frames===0)resolve();else requestAnimationFrame(next);};requestAnimationFrame(next);}));await expect(page.locator('#load-count')).toHaveText('0');await page.locator('#load-invalidate').click();await root.scrollIntoViewIfNeeded();await root.evaluate(element=>element.scrollTop=element.scrollHeight);await expect(page.locator('#load-count')).toHaveText('1');await expect(list.getByRole('button')).toBeDisabled();await page.locator('#load-empty').click();await expect(page.locator('#load-count')).toHaveText('1');});
  72 |  test('switching a keyboard draft resolves the new handle by canonical key',async({page})=>{const list=page.locator('ui-sortable-list').first();await list.getByRole('button',{name:'記録10の移動位置を選ぶ',exact:true}).click();await page.keyboard.press('ArrowDown');const second=list.getByRole('button',{name:'記録2の移動位置を選ぶ',exact:true});await second.click();await page.keyboard.press('ArrowUp');await page.evaluate(()=>new Promise<void>(resolve=>{let frames=8;const next=()=>{if(--frames===0)resolve();else requestAnimationFrame(next);};requestAnimationFrame(next);}));await expect(second).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#order-model')).toHaveText('2,1,3');await expect(page.locator('#movement-model')).toContainText('"fromIndex": 1');await expect(page.locator('#movement-model')).toContainText('"id": 2');});
  73 |  test('search from a distant group brings its unchanged active option into the new viewport',async({page})=>{const box=page.getByRole('listbox',{name:'確認する候補',exact:true});await box.focus();await page.keyboard.press('End');await expect(box).toHaveAttribute('aria-activedescendant',/.+/);await page.locator('ui-listbox').getByRole('searchbox').fill('後半の候補');await box.focus();await expect(box).toHaveAttribute('aria-activedescendant',/.+/);const active=await box.getAttribute('aria-activedescendant');const row=page.locator('[id="'+active+'"]');await expect(row).toBeInViewport();await page.keyboard.press('Home');await expect(page.getByRole('option',{name:'候補0501',exact:true})).toBeInViewport();await expect(box).toHaveAttribute('aria-activedescendant',/35-30-31$/);await optionOwns(page);await page.keyboard.press('Space');await expect(page.locator('#selection-model')).not.toContainText('option0501');await page.locator('#listbox-reset').dispatchEvent('click');await box.focus();await page.keyboard.press('Space');await expect(page.locator('#selection-model')).toContainText('option0501');});
  74 |  test('own native controls fall back locally when removed or disabled, and external focus stays outside',async({page})=>{const view=page.locator('ui-data-view'),search=view.getByRole('searchbox');await search.focus();await expect(search).toBeFocused();await page.locator('#view-features').dispatchEvent('click');await expect(view).toBeFocused();await page.locator('#view-reset').click();const boxSearch=page.locator('ui-listbox').getByRole('searchbox');await boxSearch.focus();await expect(boxSearch).toBeFocused();await page.getByLabel('処理中',{exact:true}).dispatchEvent('click');await expect(boxSearch).toBeDisabled();await expect(page.locator('ui-listbox')).toBeFocused();await page.getByLabel('処理中',{exact:true}).click();await expect(boxSearch).toBeEnabled();await page.locator('#outside').focus();await page.getByLabel('処理中',{exact:true}).dispatchEvent('click');await expect(page.locator('#outside')).toBeFocused();});
  75 |  test('nonvirtual groups and native Tab use the same single composite focus and selection contract',async({page})=>{await page.locator('#listbox-virtual').click();const list=page.locator('ui-listbox'),box=page.getByRole('listbox',{name:'確認する候補',exact:true});await expect(list.getByRole('option')).toHaveCount(1000);await expect(list.getByRole('group')).toHaveCount(2);await box.focus();await page.keyboard.press('End');await expect(page.getByRole('option',{name:'候補1000',exact:true})).toBeInViewport();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expect(box).toHaveAttribute('aria-activedescendant',/36$/);await page.keyboard.press('Tab');await expect(page.locator('#listbox-long-labels')).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#listbox-mode')).toBeFocused();await optionOwns(page);});
  76 |  test('narrow 200% RTL profiles retain group row labels without overlapping and pass axe',async({page})=>{await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('RTL',{exact:true}).check();const box=page.getByRole('listbox',{name:'確認する候補',exact:true});await box.focus();await page.keyboard.press('End');await expect(box).toHaveAttribute('aria-activedescendant',/.+/);const overlaps=await page.locator('ui-listbox [role=option]').evaluateAll(rows=>rows.some(row=>{const spans=Array.from(row.querySelectorAll('span'));if(spans.length<2)return false;const a=spans[0].getBoundingClientRect(),b=spans[1].getBoundingClientRect();return a.bottom>b.top+.5||b.bottom>row.getBoundingClientRect().bottom+.5;}));expect(overlaps).toBe(false);await overflow(page);await optionOwns(page);const result=await new AxeBuilder({page}).analyze();expect(result.violations).toEqual([]);});
  77 | });
  78 | 
```