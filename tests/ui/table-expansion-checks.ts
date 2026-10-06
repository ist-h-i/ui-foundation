import {expect} from './catalog-test';
import type {RegisterTableStory,TableProfile} from './table-expansion-helpers';
import type {Locator} from '@playwright/test';
import {readFile} from 'node:fs/promises';

export function tableChecks(run:RegisterTableStory,profile:TableProfile):void{
  for(const direction of ['ltr','rtl'] as const)for(const side of ['start','end'] as const){
    run(`native-pinned-footer-${side}-${direction}-${profile}`,async(page,{writeFile,evidencePath})=>{
      await page.setViewportSize({width:640,height:850});
      await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
      if(direction==='rtl')await page.getByLabel('RTL',{exact:true}).check();
      await page.getByRole('button',{name:'全列幅を320pxにする',exact:true}).click();
      const host=page.locator('ui-data-table[tableid="native-table"]'),table=host.locator('table'),viewport=host.getByRole('region',{name:'拡張申請一覧の表領域',exact:true});
      await host.locator('.ui-data-table__columns > summary').click();
      await host.getByLabel('固定: 金額',{exact:true}).selectOption(side);
      await host.locator('.ui-data-table__columns > summary').click();
      const header=table.locator('thead th[data-column-id="amount"]'),id=await header.getAttribute('id')!,body=table.locator(`tbody tr[data-row-key="1"] td[headers~="${id}"]`),footer=table.locator(`tfoot td[headers~="${id}"]`);
      await expect(footer).toHaveCSS('position','sticky');
      await expect(footer).toContainText('合計: 68,000');
      await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeGreaterThan(800);
      await viewport.scrollIntoViewIfNeeded();
      const bounds=(await viewport.boundingBox())!;
      await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
      const delta=(direction==='rtl'?-1:1)*(side==='start'?1000:64);
      await page.mouse.wheel(delta,0);
      await expect.poll(()=>viewport.evaluate(node=>Math.abs(node.scrollLeft))).toBeGreaterThan(side==='start'?800:32);
      const box=(locator:Locator)=>locator.evaluate(node=>{const r=node.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom};});
      const geometry={profile,direction,side,scrollLeft:await viewport.evaluate(node=>node.scrollLeft),viewport:await box(viewport),header:await box(header),body:await box(body),footer:await box(footer),aggregate:await box(footer.locator('.ui-data-table__aggregate'))};
      await writeFile(`evidence/pinned-footer-${side}-${direction}-${profile}.json`,JSON.stringify(geometry,null,2)+'\n');
      expect(Math.abs(geometry.header.left-geometry.body.left)).toBeLessThan(2);
      expect(Math.abs(geometry.header.left-geometry.footer.left)).toBeLessThan(2);
      expect(Math.abs(geometry.header.right-geometry.footer.right)).toBeLessThan(2);
      const edge=(side==='start')===(direction==='ltr')?'left':'right';
      expect(Math.abs(geometry.header[edge]-geometry.viewport[edge])).toBeLessThan(2);
      expect(geometry.aggregate.left).toBeGreaterThanOrEqual(geometry.viewport.left);
      expect(geometry.aggregate.right).toBeLessThanOrEqual(geometry.viewport.right);
    });
  }

  run(`native-table-${profile}`,async(page,{writeFile,evidencePath})=>{
    await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
    const host=page.locator('ui-data-table[tableid="native-table"]'),table=host.locator('table'),viewport=host.getByRole('region',{name:'拡張申請一覧の表領域'});
    await expect(table.locator('thead tr')).toHaveCount(3);
    await expect(table.locator('thead th[scope="colgroup"]')).toHaveCount(3);
    const amount=table.locator('tbody tr[data-row-key="1"] td').nth(2);
    const relation=await amount.evaluate(cell=>cell.getAttribute('headers')!.split(' ').map(id=>document.getElementById(id)?.textContent?.trim()));
    expect(relation).toEqual(['申請の情報','申請の詳細','金額']);
    await expect(table.locator('tfoot')).toContainText('金額 合計: 68,000 (既知 14件・未取得 1件)');
    await viewport.evaluate(node=>node.scrollTop=300);
    await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(200);
    const geometry=await table.evaluate(node=>{const box=(el:Element)=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height};};return{viewport:box(node.parentElement!),header:box(node.querySelector('thead')!),start:[...node.querySelectorAll('[data-fixed-row="start"]')].map(box),end:box(node.querySelector('[data-fixed-row="end"]')!),footer:box(node.querySelector('tfoot')!)};});
    await writeFile(`evidence/sticky-${profile}.json`,JSON.stringify(geometry,null,2)+'\n');
    expect(Math.abs(geometry.start[0].top-geometry.header.bottom)).toBeLessThan(2);
    expect(Math.abs(geometry.start[1].top-geometry.start[0].bottom)).toBeLessThan(2);
    expect(geometry.end.bottom).toBeLessThanOrEqual(geometry.footer.top+2);
    await host.locator('.ui-data-table__columns > summary').click();
    await host.getByLabel('固定: 申請名',{exact:true}).selectOption('start');await expect(table.locator('thead th[data-column-id="name"]')).toHaveCSS('position','sticky');
    await host.getByLabel('固定: 部署',{exact:true}).selectOption('end');
    await viewport.evaluate(node=>node.scrollLeft=300);
    const name=table.locator('thead th[data-column-id="name"]'),department=table.locator('thead th[data-column-id="department"]');
    await expect(name).toHaveCSS('position','sticky');await expect(department).toHaveCSS('position','sticky');
    await page.getByLabel('RTL',{exact:true}).check();
    await expect(name).toHaveCSS('direction','rtl');
    await host.getByRole('button',{name:'列の設定を戻す',exact:true}).click();
    await host.getByRole('checkbox',{name:'承認',exact:true}).uncheck();
    await expect(table.locator('thead th[scope="col"] [aria-label^="承認で並べ替え"]')).toHaveCount(0);
    const search=host.getByRole('searchbox');await search.fill('存在しない条件');
    await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(0);
    await page.getByLabel('サーバー処理',{exact:true}).check();
    await expect(table.locator('tbody tr[data-row-key]')).toHaveCount(15);
    await expect(table.locator('tfoot')).toContainText('68,000');
  });

  run(`native-edit-${profile}`,async(page,{writeFile,evidencePath})=>{
    await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
    await page.getByLabel('表の編集方式',{exact:true}).selectOption('cell');
    await page.getByLabel('表を部署でグループ化',{exact:true}).check();
    const host=page.locator('ui-data-table[tableid="native-table"]'),target=host.locator('tr[data-row-key="10"]'),editor=target.locator('td').nth(1).locator('ui-cell-editor');
    await editor.getByRole('button',{name:'編集',exact:true}).click();const input=editor.getByRole('textbox');await input.fill('グループを閉じても保持');await input.evaluate(node=>node.setAttribute('data-retained','same'));
    const group=host.locator('tr.ui-data-table__group button').first();await group.click();await expect(target).toBeHidden();await group.click();await expect(input).toHaveValue('グループを閉じても保持');await expect(input).toHaveAttribute('data-retained','same');
    await editor.getByRole('button',{name:'保存',exact:true}).click();await expect(input).toHaveAttribute('readonly','');await page.getByRole('button',{name:'待機した要求を失敗',exact:true}).click();await expect(input).toHaveValue('グループを閉じても保持');
    await page.getByLabel('保存の応答',{exact:true}).selectOption('complete');await editor.getByRole('button',{name:'保存',exact:true}).click();await expect(target).toContainText('グループを閉じても保持');
    await page.getByLabel('表の編集方式',{exact:true}).selectOption('row');
    await target.getByRole('button',{name:'編集: グループを閉じても保持',exact:true}).click();
    const rowEditor=host.locator('ui-row-editor').filter({has:page.getByRole('region',{name:'グループを閉じても保持の行編集',exact:true})});
    await rowEditor.getByLabel('金額',{exact:true}).fill('-');await expect(rowEditor.getByRole('button',{name:'保存',exact:true})).toBeDisabled();
    await rowEditor.getByLabel('申請名 (必須)',{exact:true}).fill('取消する名前');await rowEditor.getByRole('button',{name:'取消',exact:true}).click();await expect(target).toContainText('グループを閉じても保持');
    await target.getByRole('button',{name:'編集: グループを閉じても保持',exact:true}).click();await rowEditor.getByLabel('金額',{exact:true}).fill('75');await rowEditor.getByRole('button',{name:'保存',exact:true}).click();await expect(target).toContainText('75');
    const more=host.locator('ui-infinite-scroll');await more.getByRole('button',{name:'さらに読み込む',exact:true}).click();await expect(page.getByTestId('load-count')).toHaveText('追加要求: 1');await expect(more.getByRole('button',{name:'さらに読み込む',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'追加取得を失敗',exact:true}).click();await more.getByRole('button',{name:'再試行',exact:true}).click();await expect(page.getByTestId('load-count')).toHaveText('追加要求: 2');await page.getByRole('button',{name:'追加取得を確定',exact:true}).click();await expect(host.locator('tbody tr[data-row-key]')).toHaveCount(16);await page.getByRole('button',{name:'追加取得を終端',exact:true}).click();await expect(more).toContainText('すべての項目を表示しています。');await expect(more.getByRole('button')).toHaveCount(0);
  });

  run(`native-cell-retention-${profile}`,async(page,{writeFile,evidencePath})=>{
    await page.getByLabel('表示設定',{exact:true}).selectOption(profile);await page.getByLabel('表の編集方式',{exact:true}).selectOption('cell');const host=page.locator('ui-data-table[tableid="native-table"]'),target=host.locator('tr[data-row-key="1"]'),editor=target.locator('ui-cell-editor').first(),input=editor.getByRole('textbox'),search=host.getByRole('searchbox');
    await editor.getByRole('button',{name:'編集',exact:true}).click();await input.fill('検索と列非表示の保留でも同じ入力');await input.evaluate(node=>node.setAttribute('data-native-retained','same-cell'));await search.fill('存在しない条件');await expect(host).toContainText('先に編集を保存するか取り消すまで保留しています。');await expect(search).toBeFocused();await expect(target).toBeVisible();await expect(input).toHaveValue('検索と列非表示の保留でも同じ入力');await expect(input).toHaveAttribute('data-native-retained','same-cell');await host.getByRole('button',{name:'検索を解除',exact:true}).click();await expect(host).not.toContainText('先に編集を保存するか取り消すまで保留しています。');
    await host.locator('.ui-data-table__columns > summary').click();const visibility=host.getByRole('checkbox',{name:'申請名',exact:true});await visibility.uncheck();await expect(visibility).not.toBeChecked();await expect(host.locator('thead th[data-column-id="name"]')).toBeVisible();await expect(input).toHaveAttribute('data-native-retained','same-cell');await editor.getByRole('button',{name:'保存',exact:true}).click();await expect(input).toHaveAttribute('readonly','');await page.getByRole('button',{name:'待機した要求を失敗',exact:true}).click();await expect(input).toHaveValue('検索と列非表示の保留でも同じ入力');await input.focus();await page.keyboard.press('Escape');await expect(host.locator('thead th[data-column-id="name"]')).toHaveCount(0);await expect(host.getByRole('region',{name:'拡張申請一覧の表領域',exact:true})).toBeFocused();await visibility.check();await expect(target).toContainText('備品購入');
    await editor.getByRole('button',{name:'編集',exact:true}).click();await input.fill('検索の保留中に保存する値');await editor.getByRole('button',{name:'保存',exact:true}).click();await search.fill('存在しない条件');await expect(target).toBeVisible();await expect(input).toHaveAttribute('readonly','');const confirm=page.getByRole('button',{name:'待機した要求を確定',exact:true});await confirm.click();await expect(confirm).toBeFocused();await expect(host.locator('tbody tr[data-row-key]')).toHaveCount(0);await host.getByRole('button',{name:'検索を解除',exact:true}).click();await expect(target).toContainText('検索の保留中に保存する値');
  });

  run(`native-row-retention-${profile}`,async(page,{writeFile,evidencePath})=>{
    await page.getByLabel('表示設定',{exact:true}).selectOption(profile);await page.getByRole('button',{name:'5件ずつページ表示',exact:true}).click();await page.getByLabel('表の編集方式',{exact:true}).selectOption('row');const host=page.locator('ui-data-table[tableid="native-table"]'),target=host.locator('tr[data-row-key="1"]'),editor=host.locator('ui-row-editor').filter({has:page.getByRole('region',{name:'備品購入の行編集',exact:true})});await expect(host.locator('tbody tr[data-row-key]')).toHaveCount(5);await target.getByRole('button',{name:'編集: 備品購入',exact:true}).click();const input=editor.getByLabel('申請名 (必須)',{exact:true});await input.fill('ページを移動する前の下書き');await input.evaluate(node=>node.setAttribute('data-native-retained','same-row'));await host.getByRole('button',{name:'次のページ',exact:true}).click();await expect(host).toContainText('先に編集を保存するか取り消すまで保留しています。');await expect(input).toHaveValue('ページを移動する前の下書き');await expect(input).toHaveAttribute('data-native-retained','same-row');await input.focus();await page.keyboard.press('Escape');await expect(target).toHaveCount(0);await expect(host.getByRole('region',{name:'拡張申請一覧の表領域',exact:true})).toBeFocused();await host.getByRole('button',{name:'最初のページ',exact:true}).click();
    await target.getByRole('button',{name:'編集: 備品購入',exact:true}).click();await input.fill('ページ変更の保留中に保存');await editor.getByRole('button',{name:'保存',exact:true}).click();await host.getByRole('button',{name:'次のページ',exact:true}).click();await expect(input).toHaveAttribute('readonly','');await page.getByRole('button',{name:'待機した要求を失敗',exact:true}).click();await expect(input).toHaveValue('ページ変更の保留中に保存');await editor.getByRole('button',{name:'保存',exact:true}).click();const confirm=page.getByRole('button',{name:'待機した要求を確定',exact:true});await confirm.click();await expect(confirm).toBeFocused();await expect(target).toHaveCount(0);await host.getByRole('button',{name:'最初のページ',exact:true}).click();await expect(target).toContainText('ページ変更の保留中に保存');
    await target.getByRole('button',{name:'編集: ページ変更の保留中に保存',exact:true}).click();const savedEditor=host.locator('ui-row-editor').filter({has:page.getByRole('region',{name:'ページ変更の保留中に保存の行編集',exact:true})});const savedInput=savedEditor.getByLabel('申請名 (必須)',{exact:true});await savedInput.fill('列条件の保留でも保持');await page.getByLabel('表の列条件',{exact:true}).check();const amount=host.locator('ui-column-filter').filter({has:page.getByRole('group',{name:'金額の列条件',exact:true})});await amount.getByLabel('金額の比較方法',{exact:true}).selectOption('gte');await amount.getByLabel('金額の条件',{exact:true}).fill('999999');await expect(host).toContainText('先に編集を保存するか取り消すまで保留しています。');await expect(savedInput).toHaveValue('列条件の保留でも保持');await savedEditor.getByRole('button',{name:'取消',exact:true}).click();await expect(host.locator('tbody tr[data-row-key]')).toHaveCount(0);await expect(host).not.toContainText('先に編集を保存するか取り消すまで保留しています。');
  });

  run(`table-output-${profile}`,async(page,{writeFile,evidencePath})=>{
    await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
    const host=page.locator('ui-data-table[tableid="native-table"]');await host.getByRole('checkbox',{name:'行を選択: 備品購入',exact:true}).check();await host.getByRole('checkbox',{name:'行を選択: 未取得',exact:true}).check();
    await host.getByRole('searchbox').fill('備品購入');await expect(host.locator('tbody tr[data-row-key]')).toHaveCount(1);await host.getByLabel('出力対象',{exact:true}).selectOption('selected');await host.getByRole('button',{name:'表をコピー',exact:true}).click();await expect(page.getByTestId('native-output')).toHaveText('copy:selected:2');
    const clipboard=await page.evaluate(()=>navigator.clipboard.readText());expect(clipboard.split('\r\n')).toHaveLength(3);expect(clipboard).toContain('備品購入\t0\t2026-10-01\tいいえ\t総務');expect(clipboard).toContain('未取得\t未取得\t未取得\t未取得\t経理');
    const downloadPromise=page.waitForEvent('download');await host.getByRole('button',{name:'CSVを出力',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('stage-requests.csv');const contents=await readFile((await download.path())!,'utf8');expect(contents.charCodeAt(0)).toBe(0xFEFF);expect(contents).toContain('備品購入,0,2026-10-01,いいえ,総務');await writeFile(`evidence/export-${profile}.csv`,contents);
    // Chrome's print call is exercised; a real printer result remains app/user-owned.
    await host.getByRole('button',{name:'表を印刷',exact:true}).click();await expect(page.getByTestId('native-output')).toHaveText('print:selected:2');const frame=page.locator('iframe[title="印刷対象の申請の印刷"]');await expect(frame).toHaveCount(1);
    const rendered=await frame.evaluate((node:HTMLIFrameElement)=>({rows:node.contentDocument!.querySelectorAll('table tr').length,headers:[...node.contentDocument!.querySelectorAll('th')].map(cell=>cell.textContent),profileSpace:node.contentDocument!.documentElement.style.getPropertyValue('--ui-space-table-y'),cellSpace:node.contentWindow!.getComputedStyle(node.contentDocument!.querySelector('td')!).paddingBlockStart}));expect(rendered.rows).toBe(3);expect(rendered.headers).toEqual(['申請名','金額','申請日','承認','部署']);expect(rendered.profileSpace).not.toBe('');await writeFile(`evidence/print-${profile}.json`,JSON.stringify(rendered,null,2)+'\n');
  });

  run(`virtual-table-${profile}`,async(page,{writeFile,evidencePath})=>{
    await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
    const host=page.locator('ui-data-table[tableid="virtual-table"]'),virtual=host.locator('ui-virtual-data-table'),viewport=virtual.locator('cdk-virtual-scroll-viewport');
    await expect(virtual.getByRole('table')).toHaveAttribute('aria-rowcount','1001');await expect.poll(()=>virtual.locator('[data-virtual-row-key]').count()).toBeGreaterThan(1);expect(await virtual.locator('[data-virtual-row-key]').count()).toBeLessThan(25);
    await virtual.getByRole('checkbox',{name:'行を選択: 仮想申請 1',exact:true}).check();
    await page.getByRole('button',{name:'仮想表の500番目へ',exact:true}).click();await expect(page.getByTestId('virtual-position')).toHaveText('仮想位置: 499');await expect(virtual.locator('[data-virtual-row-key="number:500"]')).toBeVisible();expect(await virtual.locator('[data-virtual-row-key]').count()).toBeLessThan(25);
    const before=await viewport.evaluate(node=>({offset:node.scrollTop,height:node.querySelector('[data-virtual-row-key]')!.getBoundingClientRect().height}));await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect.poll(()=>viewport.evaluate(node=>Math.floor(node.scrollTop/node.querySelector('[data-virtual-row-key]')!.getBoundingClientRect().height))).toBe(499);
    const after=await viewport.evaluate(node=>({offset:node.scrollTop,height:node.querySelector('[data-virtual-row-key]')!.getBoundingClientRect().height}));expect(after.height).not.toBe(before.height);await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(()=>viewport.evaluate(node=>Math.abs(node.scrollTop-node.querySelector('[data-virtual-row-key]')!.getBoundingClientRect().height*499))).toBeLessThan(1);await viewport.focus();await page.keyboard.press('End');await expect(virtual.locator('[data-virtual-row-key="number:1000"]')).toBeVisible();await page.keyboard.press('Home');await expect(virtual.getByRole('checkbox',{name:'行を選択: 仮想申請 1',exact:true})).toBeChecked();
    // Fixed-size default text uses a single line. Long values remain native-scrollable from their cell Tab entry.
    await host.locator('.ui-data-table__columns > summary').click();const dateWidth=host.getByRole('slider',{name:/列幅: 申請日/});await dateWidth.focus();await page.keyboard.press('Home');await expect(dateWidth).toHaveValue('128');await host.locator('.ui-data-table__columns > summary').click();
    const dateCell=virtual.locator('[data-virtual-row-key="number:1"] .ui-virtual-table__cell').nth(2);await expect(dateCell).toContainText('2026-10-01');await expect.poll(()=>dateCell.evaluate(node=>node.getBoundingClientRect().width)).toBe(128);const textGeometry=await dateCell.evaluate(node=>({scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,whiteSpace:getComputedStyle(node.querySelector('span')!).whiteSpace}));expect(textGeometry.whiteSpace).toBe('nowrap');expect(textGeometry.scrollHeight).toBeLessThanOrEqual(textGeometry.clientHeight+1);expect(textGeometry.scrollWidth).toBeGreaterThan(textGeometry.clientWidth);await dateCell.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>dateCell.evaluate(node=>Math.abs(node.scrollLeft))).toBeGreaterThan(0);await writeFile(`evidence/virtual-text-${profile}.json`,JSON.stringify(textGeometry,null,2)+'\n');
    await host.getByRole('searchbox').fill('仮想申請 999');await expect(virtual.getByRole('table')).toHaveAttribute('aria-rowcount','2');await expect(virtual.locator('[data-virtual-row-key]')).toHaveCount(1);await expect(virtual).toContainText('仮想申請 999');await host.getByRole('button',{name:'検索を解除',exact:true}).click();await expect(virtual.getByRole('table')).toHaveAttribute('aria-rowcount','1001');
    await host.locator('.ui-data-table__columns > summary').click();const widths=await host.locator('input[type="range"]').evaluateAll((nodes:HTMLInputElement[])=>nodes.map(node=>Number(node.min)));expect(widths.every(value=>value>=128)).toBe(true);
    await writeFile(`evidence/virtual-${profile}.json`,JSON.stringify({initialRows:1000,renderedCount:await virtual.locator('[data-virtual-row-key]').count(),before,after,widths},null,2)+'\n');await virtual.screenshot({path:evidencePath(`evidence/virtual-${profile}.png`)});
  });
}
