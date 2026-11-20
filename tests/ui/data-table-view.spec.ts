import AxeBuilder from '@axe-core/playwright';
import {test,expect} from './catalog-test';
for (const profile of ['guided','dense']) {
 test.describe(`data table ${profile}`,()=>{
  test.beforeEach(async({page})=>{await page.goto('/catalog');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);});
  test('search is scoped, cleared and disabled without losing its saved value',async({page})=>{
   const table=page.locator('ui-data-table');const search=table.getByRole('searchbox',{name:'全体検索',exact:true});
   await search.fill('備品');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await expect(table.locator('tbody')).not.toContainText('出張旅費');
   await search.fill('2026');await expect(table.locator('tbody')).toContainText('条件に一致する結果はありません。');
   await page.getByLabel('全体検索を有効にする').uncheck();await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await page.getByLabel('全体検索を有効にする').check();await expect(search).toHaveValue('2026');
   await table.getByRole('button',{name:'検索を解除',exact:true}).click();await expect(search).toHaveValue('');
  });
  test('typed sort cycles asc/desc/removed and supports a second sort key',async({page})=>{
   const table=page.locator('ui-data-table');const amount=table.getByRole('button',{name:'金額で並べ替え',exact:true});
   await amount.click();await expect(table.locator('tbody tr[data-row-key]').first()).toHaveAttribute('data-row-key','6');
   await expect(table.locator('th[data-column-id="amount"]')).toHaveAttribute('aria-sort','ascending');
   await table.getByRole('button',{name:/金額で並べ替え/}).click();await expect(table.locator('tbody tr[data-row-key]').first()).toHaveAttribute('data-row-key','1');
   await table.getByRole('button',{name:/金額で並べ替え/}).click();await expect(table.locator('th[data-column-id="amount"]')).not.toHaveAttribute('aria-sort');
   await page.getByLabel('複数列ソート').check();await amount.click();await table.getByRole('button',{name:'申請日で並べ替え',exact:true}).click();
   await expect(table.getByRole('button',{name:/申請日で並べ替え/})).toContainText('↑2');
   await page.getByLabel('ソートを有効にする').uncheck();await expect(table.locator('thead tr').first()).toContainText('金額');await expect(table.getByRole('button',{name:/で並べ替え/})).toHaveCount(0);
  });
  test('number/date/select filters operate and disabling filtering restores source rows',async({page})=>{
   const table=page.locator('ui-data-table');await table.locator('.ui-data-table__filters > summary').click();await table.getByLabel('金額の条件',{exact:true}).fill('2000');
   await table.getByLabel('金額の比較方法',{exact:true}).selectOption('gte');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await table.getByLabel('申請日の条件',{exact:true}).fill('2026-10-02');await table.getByLabel('申請日の比較方法',{exact:true}).selectOption('before');
   await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(1);await expect(table.locator('tbody')).toContainText('備品購入');
   await table.getByLabel('状態の条件',{exact:true}).selectOption('確認中');await expect(table.locator('tbody')).toContainText('条件に一致する結果はありません。');
   await page.getByLabel('列フィルターを有効にする').uncheck();await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
  });
  test('comparison chosen before its value is retained and stale pages recover when filters return',async({page})=>{
   const table=page.locator('ui-data-table');await table.locator('.ui-data-table__filters > summary').click();const compare=table.getByLabel('金額の比較方法',{exact:true});
   await compare.selectOption('gte');await expect(compare).toHaveValue('gte');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await table.getByLabel('金額の条件',{exact:true}).fill('2000');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await page.getByLabel('列フィルターを有効にする').uncheck();await table.getByRole('button',{name:'最後のページ'}).click();
   await page.getByLabel('列フィルターを有効にする').check();await table.locator('.ui-data-table__filters > summary').click();await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await expect(table.getByRole('navigation')).toContainText('1 / 1 ページ');await expect(table.locator('tbody')).not.toContainText('条件に一致する結果はありません。');
   const dates=table.getByLabel('申請日の比較方法',{exact:true});await dates.selectOption('before');await expect(dates).toHaveValue('before');
   await table.getByLabel('申請日の条件',{exact:true}).fill('2026-10-02');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(1);
  });
  test('rendered column geometry respects min and max in both automatic width modes',async({page})=>{
   for(const fit of ['content','available']){
    await page.getByLabel('自動幅の方式',{exact:true}).selectOption(fit);
    await page.getByLabel('列幅の境界条件',{exact:true}).selectOption('minimum');
    const header=page.locator('th[data-column-id="name"]');
    await expect.poll(async()=>header.evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(399);
    expect(await header.evaluate(element=>element.getBoundingClientRect().width)).toBeLessThanOrEqual(451);
    await page.getByLabel('列幅の境界条件',{exact:true}).selectOption('maximum');
    await expect.poll(async()=>header.evaluate(element=>element.getBoundingClientRect().width)).toBeLessThanOrEqual(101);
    expect(await header.evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(79);
   }
  });
  test('first/last/page size and pagination OFF control the actual rendered records',async({page})=>{
   const table=page.locator('ui-data-table');const nav=table.getByRole('navigation',{name:'申請一覧のページ'});
   await expect(nav).toContainText('1 / 3 ページ · 6件');await expect(nav.getByRole('button',{name:'最初のページ'})).toBeDisabled();
   await nav.getByRole('button',{name:'最後のページ'}).click();await expect(table.locator('tbody tr[data-row-key]').first()).toHaveAttribute('data-row-key','5');
   await expect(nav.getByRole('button',{name:'次のページ'})).toBeDisabled();await nav.getByRole('button',{name:'最初のページ'}).click();
   await nav.getByLabel('表示件数',{exact:true}).selectOption('4');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(4);
   await expect(nav).toContainText('1 / 2 ページ');await page.getByLabel('ページ送りを有効にする').uncheck();await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(6);await expect(nav).toHaveCount(0);
  });
  test('column hide/order/pin/resize can be saved, restored and reset using keyboard alternatives',async({page})=>{
   const table=page.locator('ui-data-table');await table.locator('.ui-data-table__columns > summary').click();
   await table.getByLabel('金額',{exact:true}).uncheck();await expect(table.locator('th[data-column-id="amount"]')).toHaveCount(0);
   await table.getByRole('button',{name:'申請日の列移動: 列を前へ移動',exact:true}).click();await expect(table.locator('th[data-column-id]').nth(1)).toHaveAttribute('data-column-id','date');
   await table.getByLabel('固定: 申請名',{exact:true}).selectOption('start');await table.getByLabel('固定: 状態',{exact:true}).selectOption('end');
   await expect(table.locator('th[data-column-id="name"]')).toHaveCSS('position','sticky');
   const range=table.getByRole('slider',{name:/列幅: 申請名/});await range.focus();await page.keyboard.press('End');await expect(range).toHaveValue('500');
   await page.getByRole('button',{name:'表示状態を保存',exact:true}).click();await table.getByRole('button',{name:'列の設定を戻す',exact:true}).click();
   await expect(table.locator('th[data-column-id="amount"]')).toHaveCount(1);await page.getByRole('button',{name:'表示状態を復元',exact:true}).click();
   await expect(table.locator('th[data-column-id="amount"]')).toHaveCount(0);await expect(range).toHaveValue('500');
  });
  test('selection is page scoped, skips ineligible rows, retains other pages and reports mixed state',async({page})=>{
   const table=page.locator('ui-data-table');await table.getByRole('checkbox',{name:'このページをすべて選択',exact:true}).check();await expect(page.getByTestId('selected')).toHaveText('選択: 1,2');
   await table.getByRole('button',{name:'次のページ',exact:true}).click();await expect(table.getByRole('checkbox',{name:'行を選択: 会議室予約',exact:true})).toBeDisabled();
   await table.getByRole('checkbox',{name:'このページをすべて選択',exact:true}).check();await expect(page.getByTestId('selected')).toHaveText('選択: 1,2,4');
   await table.getByRole('button',{name:'最初のページ',exact:true}).click();await table.getByRole('checkbox',{name:'行を選択: 備品購入',exact:true}).uncheck();
   await expect(table.getByRole('checkbox',{name:'このページをすべて選択',exact:true})).toHaveJSProperty('indeterminate',true);
   await page.getByLabel('行選択',{exact:true}).selectOption('single');await table.getByRole('radio',{name:'行を選択: 備品購入',exact:true}).check();await expect(page.getByTestId('selected')).toHaveText('選択: 1');
  });
  test('custom cells, details and profile switching preserve edited inputs and actions',async({page})=>{
   const table=page.locator('ui-data-table');await expect(table.locator('tbody strong').first()).toHaveText('備品購入');
   const detail=table.getByRole('button',{name:'詳細: 備品購入',exact:true});await detail.click();const input=table.getByLabel('メモ: 備品購入',{exact:true});await input.fill('保持する入力');
   await detail.click();await expect(input).toBeHidden();await detail.click();await expect(input).toHaveValue('保持する入力');
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect(input).toHaveValue('保持する入力');
   await table.locator('tbody tr[data-row-key]').first().getByRole('button',{name:'確認する',exact:true}).dblclick();await expect(page.getByTestId('row-action')).toHaveText('操作: inspect:1');
  });
  test('loading/updating block query changes, error retries, partial missing remains visible',async({page})=>{
   const table=page.locator('ui-data-table');const search=table.getByRole('searchbox',{name:'全体検索',exact:true});await search.fill('旅費');
   await page.getByLabel('一覧の状態',{exact:true}).selectOption('updating');await expect(search).toBeDisabled();await expect(table).toContainText('前回の結果を表示します。');await expect(table).toContainText('出張旅費');
   await page.getByLabel('一覧の状態',{exact:true}).selectOption('error');await expect(search).toHaveValue('旅費');await table.getByRole('button',{name:'一覧を再取得',exact:true}).click();await expect(search).toBeEnabled();
   await page.getByLabel('一覧の状態',{exact:true}).selectOption('partial');await expect(table.locator('tbody')).toContainText('未取得');
   await page.getByLabel('一覧の状態',{exact:true}).selectOption('loading');await expect(table.getByRole('button',{name:/で並べ替え/}).first()).toBeDisabled();
  });
  test('server mode forwards query state and never locally filters/sorts/paginates its supplied page',async({page})=>{
   await page.getByLabel('サーバー処理').check();const table=page.locator('ui-data-table');
   await table.getByRole('searchbox',{name:'全体検索',exact:true}).fill('存在しない条件');await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(2);
   await table.getByRole('button',{name:'金額で並べ替え',exact:true}).click();await expect(table.locator('tbody tr[data-row-key]').first()).toHaveAttribute('data-row-key','1');
   await table.getByRole('button',{name:'次のページ',exact:true}).click();await expect(table).toContainText('2 / 20 ページ');await expect(page.getByTestId('requests')).toHaveText('状態変更: 3');
  });
  test('320px, 200% text and RTL keep overflow inside the table and fixed columns on the correct side',async({page})=>{
   await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('RTL',{exact:true}).check();
   const table=page.locator('ui-data-table');await table.locator('.ui-data-table__columns > summary').click();await table.getByLabel('固定: 申請名',{exact:true}).selectOption('start');
   const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);
   const header=table.locator('th[data-column-id="name"]');await expect(header).toHaveCSS('right','0px');
   await table.getByRole('region',{name:'申請一覧の表領域'}).focus();await page.keyboard.press('ArrowLeft');await expect(table.getByRole('region')).toBeFocused();
  });
  test('native table headers, normal and partial states have no automatic axe violations',async({page})=>{
   expect((await new AxeBuilder({page}).include('ui-data-table').analyze()).violations).toEqual([]);await page.getByLabel('一覧の状態',{exact:true}).selectOption('partial');
   expect((await new AxeBuilder({page}).include('ui-data-table').analyze()).violations).toEqual([]);
  });
 });
}
