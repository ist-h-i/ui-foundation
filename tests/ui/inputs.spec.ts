import AxeBuilder from '@axe-core/playwright';
import type {Page} from '@playwright/test';
import {test,expect} from './catalog-test';
async function values(page:Page){return JSON.parse((await page.getByTestId('form-values').textContent())??'{}') as Record<string,unknown>;}
async function expectValues(page:Page,expected:Record<string,unknown>){await expect.poll(()=>values(page)).toMatchObject(expected);}
for(const profile of ['guided','dense']){
 test.describe(`inputs ${profile}`,()=>{
  test.beforeEach(async({page})=>{await page.goto('/catalog');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);});
  test('reactive form values, required errors and summary links lead to the native field',async({page})=>{
   const form=page.locator('input-catalog');await form.getByRole('button',{name:'申請内容を確認',exact:true}).click();
   await expect(form.getByRole('alert',{name:'入力内容を確認してください'})).toBeVisible();
   await form.getByRole('button',{name:'件名: 件名を入力してください。',exact:true}).click();await expect(page.locator('#request-title')).toBeFocused();
   await page.locator('#request-title').fill('部品を購入');await page.locator('#request-amount').fill('1234.5');await page.locator('#request-department').selectOption('general');
   await form.getByRole('button',{name:'申請内容を確認',exact:true}).click();await expect(page.getByTestId('form-status')).toContainText('フォーム: 有効');
   await expectValues(page,{title:'部品を購入',amount:1234.5,department:'general'});
   await expect(page.locator('ui-number-input')).toContainText('1,234.50');await expect(page.locator('#request-title')).not.toHaveAttribute('aria-invalid');
  });
  test('CVA disable/enable and readonly retain the entered value, reset clears without user events',async({page})=>{
   const root=page.locator('input-catalog');await page.locator('#request-title').fill('保持する');await page.locator('#request-note').fill('説明も保持');
   await root.getByRole('button',{name:'入力を無効にする',exact:true}).click();await expect(page.locator('#request-title')).toBeDisabled();await expect(page.locator('#request-department')).toBeDisabled();
   await root.getByRole('button',{name:'入力を有効にする',exact:true}).click();await expect(page.locator('#request-title')).toBeEnabled();await expect(page.locator('#request-note')).toHaveValue('説明も保持');
   await root.getByLabel('読取り専用',{exact:true}).check();await expect(page.locator('#request-title')).toHaveJSProperty('readOnly',true);await expect(page.locator('#request-consent')).toBeDisabled();
   await root.getByLabel('読取り専用',{exact:true}).uncheck();await root.getByRole('button',{name:'フォームを初期化',exact:true}).click();
   await expect(page.locator('#request-title')).toHaveValue('');await expect(page.getByTestId('search-requests')).toHaveText('検索: ');
  });
  test('number range/step update and invalid native drafts block the form until repaired',async({page})=>{
   const root=page.locator('input-catalog');const amount=page.locator('#request-amount');await page.locator('#request-title').fill('確認');await page.locator('#request-department').selectOption('general');
   await amount.fill('1000.25');await root.getByRole('button',{name:'申請内容を確認',exact:true}).click();await expect(amount).toHaveAttribute('aria-invalid','true');
   await amount.fill('1000.5');await expect(page.getByTestId('form-status')).toContainText('有効');
   await root.getByRole('button',{name:'金額の上限を変更',exact:true}).click();await expect(page.getByTestId('form-status')).toContainText('要確認');await expect(amount).toHaveAttribute('aria-invalid','true');
   await amount.fill('100');await amount.press('ControlOrMeta+A');await amount.press('e');await expect(amount).toHaveJSProperty('value','');
   expect(await amount.evaluate(element=>(element as HTMLInputElement).validity.badInput)).toBe(true);await expect(page.getByTestId('form-status')).toContainText('要確認');
   await amount.fill('200');await expect(page.getByTestId('form-status')).toContainText('有効');await expectValues(page,{amount:200});
  });
  test('text clear/count, textarea growth and password reveal preserve content across profiles',async({page})=>{
   const title=page.locator('#request-title');await title.fill('入力内容');await expect(page.getByRole('region',{name:'入力部品の検証'}).locator('ui-text-input')).toContainText('4 / 30 文字');
   await page.getByRole('button',{name:'件名をクリア',exact:true}).click();await expect(title).toBeFocused();await expect(title).toHaveValue('');
   const textarea=page.locator('#request-note');const initial=(await textarea.boundingBox())!.height;await textarea.fill(Array.from({length:20},(_,i)=>'説明'+i).join('\n'));
   await expect.poll(async()=>(await textarea.boundingBox())!.height).toBeGreaterThan(initial);expect((await textarea.boundingBox())!.height).toBeLessThanOrEqual(181);
   await page.locator('#request-password').fill('secret-value');await page.getByRole('button',{name:'パスワードを表示',exact:true}).click();await expect(page.locator('#request-password')).toHaveAttribute('type','text');
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect(textarea).toHaveValue(Array.from({length:20},(_,i)=>'説明'+i).join('\n'));
   await page.getByRole('button',{name:'パスワードを隠す',exact:true}).click();await expect(page.locator('#request-password')).toHaveValue('secret-value');
  });
  test('grouped multiple choices enforce limits and keep selections outside the search',async({page})=>{
   const multi=page.locator('ui-multi-select').first();await multi.getByRole('checkbox',{name:'山田',exact:true}).check();await multi.getByRole('checkbox',{name:'佐藤',exact:true}).check();
   await expect(multi.getByRole('checkbox',{name:'田中',exact:true})).toBeDisabled();await expect(multi.getByRole('checkbox',{name:'確認不可',exact:true})).toBeDisabled();
   await multi.getByRole('searchbox',{name:'確認担当者の候補を検索',exact:true}).fill('田中');await expectValues(page,{reviewers:['a','b']});
   await multi.getByRole('button',{name:'山田の選択を解除',exact:true}).click();await expect(multi.getByRole('checkbox',{name:'田中',exact:true})).toBeEnabled();
   await multi.getByRole('button',{name:'表示中をすべて選択',exact:true}).click();await expectValues(page,{reviewers:['b','c']});
   await multi.getByRole('button',{name:'選択を解除',exact:true}).click();await expectValues(page,{reviewers:[]});
  });
  test('unconfirmed combo edits invalidate the previous choice and same-value reset clears drafts',async({page})=>{
   const root=page.locator('input-catalog'),combo=page.locator('#request-owner');await combo.fill('営業');await combo.press('ArrowDown');await combo.press('Enter');await expectValues(page,{owner:'sales'});
   await page.locator('#request-title').fill('確定を確認');await page.locator('#request-amount').fill('100');await page.locator('#request-department').selectOption('general');await expect(page.getByTestId('form-status')).toContainText('フォーム: 有効');
   await combo.fill('総務');await combo.press('Tab');await expectValues(page,{owner:null});await expect(page.locator('ui-combobox')).toContainText('候補を選択するまで入力は確定されません。');
   await expect(page.getByTestId('form-status')).toContainText('要確認');await combo.focus();await combo.press('ArrowDown');await combo.press('Enter');await expect(page.getByTestId('form-status')).toContainText('フォーム: 有効');
   await root.getByRole('button',{name:'フォームを初期化',exact:true}).click();await expect(combo).toHaveValue('');await combo.fill('未確定');await root.getByRole('button',{name:'フォームを初期化',exact:true}).click();await expect(combo).toHaveValue('');
  });
  test('disabled or removed values can be repaired locally and group actions honor updateOn blur',async({page})=>{
   const root=page.locator('input-catalog');await root.getByRole('button',{name:'利用不可の担当者を復元',exact:true}).click();const multi=page.locator('ui-multi-select').first();
   await multi.getByRole('button',{name:'確認不可の選択を解除',exact:true}).click();await expectValues(page,{reviewers:['b','removed']});await multi.getByRole('button',{name:'removedの選択を解除',exact:true}).click();await expectValues(page,{reviewers:['b']});
   const blur=page.locator('#blur-reviewers');await blur.getByRole('button',{name:'選択を解除',exact:true}).click();await root.getByRole('button',{name:'フォームを初期化',exact:true}).focus();await expect(page.getByTestId('blur-values')).toHaveText('離脱時: [] / true');
  });
  test('IME confirmation Enter neither runs a search nor confirms an active combobox option',async({page})=>{
   await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:01:00Z'));
   const search=page.locator('#request-search');await search.dispatchEvent('compositionstart',{bubbles:true});await search.fill('変換途中');await search.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true});await page.clock.fastForward(1000);await page.clock.runFor(20);
   await expect(page.getByTestId('form-status')).toContainText('未確認');expect(await page.getByTestId('search-requests').textContent()).toBe('検索: ');
   await search.dispatchEvent('compositionend',{data:'変換途中',bubbles:true});await page.clock.fastForward(300);await page.clock.runFor(20);await expect(page.getByTestId('search-requests')).toHaveText('検索: 1:変換途中');
   await page.clock.resume();const combo=page.locator('#request-owner');await combo.fill('営業');await expect(combo).toHaveAttribute('aria-expanded','true');await combo.press('ArrowDown');await combo.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true});await expectValues(page,{owner:null});await expect(combo).toHaveAttribute('aria-expanded','true');
  });
  test('native select groups, checkbox mixed and busy switch expose state and preserve values',async({page})=>{
   const root=page.locator('input-catalog');const select=page.locator('#request-department');await select.selectOption('sales');await expectValues(page,{department:'sales'});
   await expect(select.locator('optgroup')).toHaveAttribute('label','社内');await expect(select.locator('option[value="closed"]')).toBeDisabled();await select.selectOption('');await expectValues(page,{department:null});
   await root.getByRole('button',{name:'中間状態を切替',exact:true}).click();await expect(page.locator('#request-consent')).toHaveJSProperty('indeterminate',true);
   await page.locator('#request-consent').check();await expectValues(page,{consent:true});
   await root.getByRole('button',{name:'通知設定の処理中を切替',exact:true}).click();await expect(page.locator('#request-notifications')).toBeDisabled();await expect(page.locator('#request-notifications')).toBeChecked();
   await root.getByRole('button',{name:'通知設定の処理中を切替',exact:true}).click();await page.locator('#request-notifications').uncheck();await expectValues(page,{notifications:false});
  });
  test('combobox keyboard skips disabled choices, Escape/Tab close and stale responses cannot be chosen',async({page})=>{
   const root=page.locator('input-catalog');const combo=page.locator('#request-owner');await combo.fill('営業');await combo.press('ArrowDown');await expect(combo).toHaveAttribute('aria-activedescendant','request-owner-option-sales');
   await combo.press('ArrowDown');await expect(combo).toHaveAttribute('aria-activedescendant','request-owner-option-sales');await combo.press('Enter');await expectValues(page,{owner:'sales'});await expect(combo).toHaveAttribute('aria-expanded','false');
   await page.getByRole('button',{name:'担当部署をクリア',exact:true}).click();await combo.press('ArrowDown');await combo.press('Escape');await expect(combo).toBeFocused();await expect(combo).toHaveAttribute('aria-expanded','false');
   await root.getByLabel('非同期候補',{exact:true}).check();await combo.fill('総務');await root.getByRole('button',{name:'古い候補応答を適用',exact:true}).click();await combo.focus();await expect(page.locator('ui-combobox').getByRole('option')).toHaveCount(0);
   await root.getByRole('button',{name:'現在の候補応答を適用',exact:true}).click();await combo.focus();await combo.press('ArrowDown');await combo.press('Enter');await expectValues(page,{owner:'general'});await expect(combo).toHaveValue('総務部');
   await combo.fill('総務');await root.getByRole('button',{name:'同じ条件の古い応答を適用',exact:true}).click();await combo.focus();await expect(page.locator('ui-combobox').getByRole('option')).toHaveCount(0);await root.getByRole('button',{name:'現在の候補応答を適用',exact:true}).click();await combo.focus();await expect(page.locator('ui-combobox').getByRole('option')).toHaveCount(1);
   await root.getByLabel('自由入力を許可',{exact:true}).check();await expect(page.locator('ui-combobox')).toContainText('自由に入力できます。');await combo.fill('未登録の部署');await expectValues(page,{owner:'未登録の部署'});await combo.press('Tab');await expect(combo).toHaveAttribute('aria-expanded','false');
  });
  test('debounced search emits latest query once; explicit Enter cancels pending duplicate and can repeat',async({page})=>{
   await page.clock.install({time:new Date('2026-10-05T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T10:00:01Z'));const search=page.locator('#request-search');await search.fill('備');await page.clock.fastForward(200);await search.fill('備品');await page.clock.fastForward(299);
   expect(await page.getByTestId('search-requests').textContent()).toBe('検索: ');await page.clock.fastForward(1);await page.clock.runFor(20);await expect(page.getByTestId('search-requests')).toHaveText('検索: 1:備品');
   await search.fill('出張');await search.press('Enter');await page.clock.runFor(20);await expect(page.getByTestId('search-requests')).toHaveText('検索: 1:備品 | 2:出張');await page.clock.fastForward(1000);await expect(page.getByTestId('search-requests')).toHaveText('検索: 1:備品 | 2:出張');
   await search.press('Enter');await page.clock.runFor(20);await expect(page.getByTestId('search-requests')).toHaveText('検索: 1:備品 | 2:出張 | 3:出張');await page.getByRole('button',{name:'検索語をクリア',exact:true}).click();await page.clock.fastForward(300);await page.clock.runFor(20);await expect(search).toBeFocused();await expectValues(page,{search:''});
  });
  test('320px, enlarged RTL form stays within the viewport; errors and combobox pass automatic axe',async({page})=>{
   await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('RTL',{exact:true}).check();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
   await page.locator('input-catalog').getByRole('button',{name:'申請内容を確認',exact:true}).click();expect((await new AxeBuilder({page}).include('input-catalog').analyze()).violations).toEqual([]);
   await page.locator('#request-owner').fill('営業');expect((await new AxeBuilder({page}).include('input-catalog').analyze()).violations).toEqual([]);
  });
 });
}
