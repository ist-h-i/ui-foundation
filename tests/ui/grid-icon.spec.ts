import AxeBuilder from '@axe-core/playwright';
import {test,expect} from './catalog-test';
for(const profile of ['guided','dense']){
 test.describe(`grid and icons ${profile}`,()=>{
  test.beforeEach(async({page})=>{await page.goto('/catalog');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);});
  test('automatic columns use the real container; explicit columns and gap apply without losing inputs',async({page})=>{
   const root=page.locator('grid-catalog'),grid=root.locator('ui-grid-list ul');const input=root.getByRole('textbox',{name:'追記: 備品購入',exact:true});await input.fill('保持した追記');
   await page.setViewportSize({width:1100,height:800});await expect.poll(async()=>grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBeGreaterThan(1);
   await page.setViewportSize({width:320,height:800});await expect.poll(async()=>grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
   await page.setViewportSize({width:1100,height:800});await root.getByLabel('グリッド列数',{exact:true}).selectOption('3');await expect.poll(async()=>grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
   const before=await grid.evaluate(element=>getComputedStyle(element).gap);await root.getByLabel('狭い間隔',{exact:true}).check();await expect.poll(async()=>grid.evaluate(element=>getComputedStyle(element).gap)).not.toBe(before);
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect(input).toHaveValue('保持した追記');
  });
  test('multiple/single/none selection, disabled eligibility, busy and empty states are native and actionable',async({page})=>{
   const root=page.locator('grid-catalog');await root.getByRole('button',{name:'一覧をすべて選択',exact:true}).click();await expect(page.getByTestId('grid-selection')).toHaveText('選択: 1,2');
   await expect(root.getByRole('checkbox',{name:'確認済みの申請を選択',exact:true})).toBeDisabled();await root.getByLabel('グリッド選択',{exact:true}).selectOption('single');await root.getByRole('radio',{name:'備品購入を選択',exact:true}).check();await expect(page.getByTestId('grid-selection')).toHaveText('選択: 1');
   await root.getByLabel('一覧の処理中',{exact:true}).check();await expect(root.getByRole('radio',{name:'備品購入を選択',exact:true})).toBeDisabled();await root.getByLabel('一覧の処理中',{exact:true}).uncheck();
   await root.getByLabel('グリッド選択',{exact:true}).selectOption('none');await expect(root.locator('ui-grid-list input[type=radio],ui-grid-list input[type=checkbox]')).toHaveCount(0);
   await root.locator('li').first().getByRole('button',{name:'申請を開く',exact:true}).click();await expect(page.getByTestId('grid-action')).toHaveText('申請: 1');
   await root.getByLabel('空一覧',{exact:true}).check();await expect(root.locator('ui-grid-list')).toContainText('表示する項目はありません。');
  });
  test('informative icons have names, decorative icons stay hidden, registered custom icons actually draw',async({page})=>{
   const root=page.locator('grid-catalog');const success=root.getByRole('img',{name:'確認済み',exact:true}),warning=root.getByRole('img',{name:'確認が必要',exact:true});
   await expect(success.locator('path,circle')).not.toHaveCount(0);await expect(warning.locator('path,circle')).not.toHaveCount(0);
   await expect(root.locator('ui-icon[name="file-text"] svg path').first()).toBeAttached();await expect(root.locator('ui-icon[name="search"] svg')).toHaveAttribute('aria-hidden','true');
   const small=root.locator('ui-icon[name="search"]'),large=root.locator('ui-icon[name="circle-alert"]');expect((await small.boundingBox())!.width).toBeLessThan((await large.boundingBox())!.width);
   await expect(root.getByRole('button',{name:'申請を追加',exact:true})).toHaveAccessibleName('申請を追加');
  });
  test('RTL enlarged text and a 320px viewport remain bounded and pass automatic accessibility checks',async({page})=>{
   await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('RTL',{exact:true}).check();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  });
 });
}
