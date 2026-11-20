import AxeBuilder from '@axe-core/playwright';
import type {Page} from '@playwright/test';
import {test,expect} from './catalog-test';
async function values(page:Page){return JSON.parse(await page.getByTestId('structured-values').innerText()) as Record<string,unknown>;}
async function expectValues(page:Page,expected:Record<string,unknown>){await expect.poll(()=>values(page)).toMatchObject(expected);}
async function addTag(page:Page,value:string){await page.locator('#structured-tags').fill(value);await page.locator('ui-tag-input').getByRole('button',{name:'追加',exact:true}).click();}
for(const profile of ['guided','dense'])test.describe(`structured forms ${profile}`,()=>{
 test.beforeEach(async({page})=>{await page.goto('/catalog/forms');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);});
 test('FormField keeps its requirement token and its projected input across narrow reflow',async({page})=>{
  const input=page.locator('#native-field');
  const field=page.locator('ui-form-field').filter({has:input});
  const label=field.locator('.ui-form-field-label');
  const requirement=label.locator('.ui-form-field-requirement');
  await expect(requirement).toHaveText('任意');
  const gap=await requirement.evaluate(node=>{
   const probe=document.createElement('span');
   probe.style.marginInlineStart='var(--ui-space-control-gap)';
   node.append(probe);
   const value=getComputedStyle(probe).marginInlineStart;
   probe.remove();
   return value;
  });
  expect(parseFloat(gap)).toBeGreaterThan(0);
  await expect(requirement).toHaveCSS('margin-inline-start',gap);
  await expect(field).toHaveCSS('display','grid');
  await input.fill('配置切替前の入力');
  await page.setViewportSize({width:320,height:800});
  await expect(field).toHaveCSS('display','block');
  await label.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('配置切替前の入力');
 });
 test('mask inserts its fixed separator while retaining leading zeros in the form value',async({page})=>{
  const editor=page.locator('#structured-mask');await editor.pressSequentially('00123');await expect(editor).toHaveValue('001-23');await expectValues(page,{mask:'00123'});await expect(editor).not.toHaveAttribute('aria-invalid');await expect(page.locator('ui-masked-input').first()).toContainText('___-__');
 });
 test('formatted full input and invalid drafts are kept without silently replacing the accepted identifier',async({page})=>{
  const editor=page.locator('#structured-mask');await editor.fill('001-23');await expectValues(page,{mask:'00123'});await editor.fill('001-2X');await expect(editor).toHaveValue('001-2X');await expectValues(page,{mask:'00123'});await expect(editor).toHaveAttribute('aria-invalid','true');await expect(page.getByTestId('structured-status')).toContainText('要確認');
  await editor.fill('000-99');await expect(editor).not.toHaveAttribute('aria-invalid');await expectValues(page,{mask:'00099'});
 });
 test('backspace crosses a mask separator once and leaves a repairable incomplete value',async({page})=>{
  const editor=page.locator('#structured-mask');await editor.fill('00123');await editor.evaluate(element=>(element as HTMLInputElement).setSelectionRange(4,4));await editor.press('Backspace');await expect(editor).toHaveValue('002-3');await expectValues(page,{mask:'0023'});expect(await editor.evaluate(element=>(element as HTMLInputElement).selectionStart)).toBe(2);await editor.press('1');await expect(editor).toHaveValue('001-23');
 });
 test('incomplete mask is retained by default and cleared only with the explicit blur option',async({page})=>{
  const editor=page.locator('#structured-mask');await editor.fill('12');await editor.press('Tab');await expect(editor).toHaveValue('12');await expectValues(page,{mask:'12'});await expect(page.locator('ui-masked-input').first()).toContainText('入力が途中です。');
  await page.getByLabel('途中の書式入力を離脱時にクリア',{exact:true}).check();await expect(page.getByText('整理番号の途中入力は離脱時にクリアします。',{exact:true})).toBeVisible();await editor.focus();await editor.press('Tab');await expect(page.locator('#structured-otp')).toBeFocused();await expect(editor).toHaveValue('');await expectValues(page,{mask:''});
 });
 test('letter masks preserve Unicode graphemes and IME drafts until composition ends',async({page})=>{
  const editor=page.locator('#letter-mask');await editor.dispatchEvent('compositionstart',{bubbles:true});await editor.fill('山田01');await expect(editor).toHaveValue('山田01');await editor.dispatchEvent('compositionend',{data:'山田01',bubbles:true});await expect(editor).toHaveValue('山田-01');await expect(editor).not.toHaveAttribute('aria-invalid');await editor.fill('e\u0301山01');await expect(editor).toHaveValue('e\u0301山-01');
 });
 test('decomposed Hangul and Indic conjuncts occupy one letter slot without losing the original code points',async({page})=>{
  const editor=page.locator('#letter-mask');for(const letter of ['가','क्ष','क्‍ष']){await editor.fill(letter+'山01');await expect(editor).toHaveValue(letter+'山-01');await expect(editor).not.toHaveAttribute('aria-invalid');}await editor.fill('가山X1');await expect(editor).toHaveValue('가山X1');await expect(editor).toHaveAttribute('aria-invalid','true');
 });
 test('OTP exposes native completion and exact type while retaining invalid and overlong codes',async({page})=>{
  const editor=page.locator('#structured-otp');await expect(editor).toHaveAttribute('type','text');await expect(editor).toHaveAttribute('autocomplete','one-time-code');await expect(editor).toHaveAttribute('inputmode','numeric');await expect(editor).not.toHaveAttribute('maxlength');await editor.fill('001234');await expectValues(page,{otp:'001234'});await expect(editor).not.toHaveAttribute('aria-invalid');
  for(const value of ['0012345','0012X4']){await editor.fill(value);await expect(editor).toHaveValue(value);await expectValues(page,{otp:value});await expect(editor).toHaveAttribute('aria-invalid','true');}
  await page.locator('#letter-otp').fill('a01B');await expect(page.locator('#letter-otp')).not.toHaveAttribute('aria-invalid');
 });
 test('whole-code paste separators are removed only when explicitly configured; excess remains visible',async({page})=>{
  const editor=page.locator('#structured-otp');await page.getByLabel('貼付けの空白とハイフンを除く',{exact:true}).check();await editor.focus();
  await editor.evaluate(element=>{const input=element as HTMLInputElement;input.setSelectionRange(0,input.value.length);const data=new DataTransfer();data.setData('text/plain','001-234');input.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});await expect(editor).toHaveValue('001234');await expectValues(page,{otp:'001234'});
  await editor.evaluate(element=>{const input=element as HTMLInputElement;input.setSelectionRange(0,input.value.length);const data=new DataTransfer();data.setData('text/plain','001-2345');input.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});await expect(editor).toHaveValue('0012345');await expect(editor).toHaveAttribute('aria-invalid','true');
 });
 test('tag add/remove operates on the collection and returns focus to its actual native editor',async({page})=>{
  await addTag(page,'申請');await addTag(page,'確認');await expectValues(page,{tags:['申請','確認']});await expect(page.locator('#structured-tags')).not.toHaveAttribute('required');await page.locator('ui-tag-input').getByRole('button',{name:'申請を削除（1件目）',exact:true}).click();await expect(page.locator('#structured-tags')).toBeFocused();await expectValues(page,{tags:['確認']});
 });
 test('tag duplicate and count limits retain the rejected draft and values for repair',async({page})=>{
  await addTag(page,'Alpha');await addTag(page,'alpha');await expect(page.locator('#structured-tags')).toHaveValue('alpha');await expect(page.locator('ui-tag-input')).toContainText('同じ項目は追加できません。');await expectValues(page,{tags:['Alpha']});
  await page.getByLabel('タグの重複を許可',{exact:true}).check();await page.locator('ui-tag-input').getByRole('button',{name:'追加',exact:true}).click();await addTag(page,'確認');await addTag(page,'4件目');await expectValues(page,{tags:['Alpha','alpha','確認']});await expect(page.locator('#structured-tags')).toHaveValue('4件目');await expect(page.locator('ui-tag-input')).toContainText('最大件数に達しています。');
 });
 test('candidate-only tags retain unavailable and restored invalid tokens so users can delete them',async({page})=>{
  await page.getByLabel('タグを自由入力',{exact:true}).uncheck();await addTag(page,'候補外');await expectValues(page,{tags:[]});await expect(page.locator('#structured-tags')).toHaveValue('候補外');await expect(page.locator('ui-tag-input')).toContainText('候補から項目を選んでください。');
  await page.getByRole('button',{name:'上限超過と重複を復元',exact:true}).click();await expect(page.locator('ui-tag-input li')).toHaveCount(4);await expectValues(page,{tags:['申請','申請','承認','確認']});await expect(page.getByTestId('structured-status')).toContainText('要確認');await page.locator('ui-tag-input').getByRole('button',{name:'申請を削除（1件目）',exact:true}).click();await expectValues(page,{tags:['申請','承認','確認']});
 });
 test('IME Enter leaves a tag draft unconfirmed and ordinary Enter adds without submitting',async({page})=>{
  const editor=page.locator('#structured-tags');await editor.fill('申請');await editor.dispatchEvent('keydown',{key:'Enter',isComposing:true,bubbles:true});await expectValues(page,{tags:[]});await expect(editor).toHaveValue('申請');await editor.press('Enter');await expectValues(page,{tags:['申請']});await expect(page.getByTestId('structured-status')).toContainText('送信 0');
 });
 test('CVA disable and native group disable preserve all data and can be enabled again',async({page})=>{
  await page.locator('#structured-mask').fill('00123');await addTag(page,'申請');await page.getByRole('button',{name:'フォームの無効状態を切替',exact:true}).click();await expect(page.locator('#structured-mask')).toBeDisabled();await expect(page.locator('#structured-tags')).toBeDisabled();await expect(page.getByRole('radio',{name:'オンライン',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'フォームの無効状態を切替',exact:true}).click();await page.getByLabel('グループを無効にする',{exact:true}).check();await expect(page.locator('#structured-otp')).toBeDisabled();await page.getByLabel('グループを無効にする',{exact:true}).uncheck();await expect(page.locator('#structured-mask')).toBeEnabled();await expectValues(page,{mask:'00123',tags:['申請']});
 });
 test('read-only fields keep invalid drafts and prevent add/delete while reset clears drafts through CVA',async({page})=>{
  await page.locator('#structured-mask').fill('00123');await page.locator('#structured-mask').fill('bad');await addTag(page,'申請');await page.locator('#structured-tags').fill('未確定');await page.getByLabel('読取り専用',{exact:true}).check();await expect(page.locator('#structured-mask')).toHaveJSProperty('readOnly',true);await expect(page.locator('ui-tag-input').getByRole('button',{name:'追加',exact:true})).toBeDisabled();await expect(page.locator('#structured-mask')).toHaveValue('bad');
  await page.getByRole('button',{name:'フォームを初期化',exact:true}).click();await expect(page.locator('#structured-mask')).toHaveValue('');await expect(page.locator('#structured-tags')).toHaveValue('');await expectValues(page,{mask:'',tags:[]});
 });
 test('native radio arrows skip disabled choices, initialize from forms and keep values across direction changes',async({page})=>{
  const online=page.getByRole('radio',{name:'オンライン',exact:true}),office=page.getByRole('radio',{name:'窓口',exact:true});await expect(online).toBeChecked();await online.focus();await online.press('ArrowDown');await expect(office).toBeChecked();await expect(office).toBeFocused();await expectValues(page,{radio:'office'});await page.getByLabel('選択肢と操作を横並びにする',{exact:true}).check();await expect(office).toBeChecked();await expect(page.locator('.ui-radio-group__options')).toHaveAttribute('data-direction','horizontal');
 });
 test('checkbox columns and direction retain selected values and the selection limit',async({page})=>{
  const group=page.locator('ui-checkbox-group');await group.getByRole('checkbox',{name:'山田',exact:true}).check();await group.getByRole('checkbox',{name:'佐藤',exact:true}).check();await expect(group.getByRole('checkbox',{name:'田中',exact:true})).toBeDisabled();await expectValues(page,{checks:['a','b']});await page.getByLabel('選択肢と操作を横並びにする',{exact:true}).check();await expect(group.locator('.ui-options')).toHaveCSS('display','flex');await expectValues(page,{checks:['a','b']});
 });
 test('labels switch placement without re-creating the input or losing its value',async({page})=>{
  const editor=page.locator('#structured-mask');await editor.fill('00123');const handle=await editor.elementHandle();await page.getByLabel('横並びのラベル',{exact:true}).check();await expect(editor).toHaveValue('001-23');expect(await editor.evaluate((element,other)=>element===other,handle)).toBe(true);const label=page.locator('label[for="structured-mask"]');const fieldBox=(await editor.boundingBox())!,labelBox=(await label.boundingBox())!;expect(labelBox.x).toBeLessThan(fieldBox.x);await label.click();await expect(editor).toBeFocused();await expect(editor).toHaveAttribute('aria-describedby',/structured-mask-hint/);
 });
 test('textarea responds to container width, profiles and hidden restoration without losing input',async({page})=>{
  const editor=page.locator('#structured-note'),text='説明を保持して表示幅に合わせて折り返します。'.repeat(30);await editor.fill(text);const original=(await editor.boundingBox())!.height;await page.getByRole('button',{name:'補足の幅を切替',exact:true}).click();await expect.poll(async()=>(await editor.boundingBox())!.height).toBeGreaterThan(original);expect((await editor.boundingBox())!.height).toBeLessThanOrEqual(501);
  await page.getByRole('button',{name:'補足の表示を切替',exact:true}).click();await expect(editor).toBeHidden();await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await page.getByRole('button',{name:'補足の表示を切替',exact:true}).click();await expect(editor).toHaveValue(text);expect(await editor.evaluate(element=>element.clientHeight>=element.scrollHeight-2||element.clientHeight>=490)).toBe(true);
 });
 test('current search response matches both query and request ID when a query repeats',async({page})=>{
  const editor=page.locator('#structured-search'),options=page.locator('#structured-search-suggestions option');await editor.fill('申請');await expect(page.getByTestId('structured-requests')).toContainText('"requestId":1');await page.getByRole('button',{name:'現在の検索応答',exact:true}).click();await expect(options).toHaveCount(1);
  await editor.fill('確認');await expect(page.getByTestId('structured-requests')).toContainText('"requestId":2');await editor.fill('申請');await expect(options).toHaveCount(0);await expect(page.getByTestId('structured-requests')).toContainText('"requestId":3');await page.getByRole('button',{name:'古い検索応答',exact:true}).click();await expect(options).toHaveCount(0);await page.getByRole('button',{name:'現在の検索応答',exact:true}).click();await expect(options).toHaveCount(1);await editor.press('Enter');await expect(page.getByTestId('structured-requests')).toContainText('"requestId":4');await expect(options).toHaveCount(0);
 });
 test('combobox uses a typed candidate template in the native top layer and Escape preserves editor focus',async({page})=>{
  const editor=page.locator('#structured-combo');await editor.fill('営業');const popup=page.locator('#structured-combo-list');await expect(popup).toBeVisible();expect(await popup.evaluate(element=>element.matches(':popover-open'))).toBe(true);await expect(popup.getByRole('option',{name:/営業部/})).toContainText('コード sales');await editor.press('ArrowDown');await expect(editor).toHaveAttribute('aria-activedescendant','structured-combo-option-sales');await editor.press('Escape');await expect(popup).toBeHidden();await expect(editor).toBeFocused();await editor.press('ArrowDown');await editor.press('Enter');await expect(editor).toHaveValue('営業部');
 });
 test('combobox outside close and modal scope keep focus with the intended operation',async({page})=>{
  const editor=page.locator('#structured-combo');await editor.fill('総務');await page.getByTestId('outside').click();await expect(page.locator('#structured-combo-list')).toBeHidden();await expect(page.getByTestId('outside')).toBeFocused();await page.getByRole('button',{name:'候補入りDialogを開く',exact:true}).click();const dialog=page.getByRole('dialog',{name:'部署を選択',exact:true}),inside=page.locator('#dialog-combo');await inside.fill('総務');await expect(dialog.locator('[role="listbox"]')).toBeVisible();await inside.press('ArrowDown');await inside.press('Enter');await expect(inside).toHaveValue('総務部');await inside.focus();await inside.press('ArrowDown');await inside.press('Escape');await expect(dialog).toBeVisible();await inside.press('Escape');await expect(dialog).toBeHidden();
 });
 test('form actions use native submit/reset, keep busy inputs and emit cancel as intent',async({page})=>{
  await page.locator('#structured-otp').fill('001234');await addTag(page,'申請');await page.getByRole('button',{name:'送信',exact:true}).click();await expect(page.getByTestId('structured-status')).toContainText('送信 1');await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.getByTestId('structured-status')).toContainText('取消 1');await expectValues(page,{otp:'001234',tags:['申請']});
  await page.getByRole('button',{name:'操作の処理中を切替',exact:true}).click();await expect(page.getByRole('button',{name:'送信 処理中',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'入力を戻す',exact:true})).toBeDisabled();await expectValues(page,{otp:'001234',tags:['申請']});await page.getByRole('button',{name:'操作の処理中を切替',exact:true}).click();await page.getByRole('button',{name:'入力を戻す',exact:true}).click();await expectValues(page,{otp:'',tags:[],radio:'online'});
 });
 test('form busy keeps its own focus and restores the same action without taking outside focus',async({page})=>{
  const actions=page.locator('ui-form-actions'),submit=actions.getByRole('button',{name:'送信',exact:true}),trigger=page.getByRole('button',{name:'操作の処理中を切替',exact:true});await submit.focus();await trigger.dispatchEvent('click');await expect(actions).toBeFocused();await trigger.dispatchEvent('click');await expect(submit).toBeFocused();await page.getByTestId('outside').focus();await trigger.dispatchEvent('click');await expect(page.getByTestId('outside')).toBeFocused();await trigger.dispatchEvent('click');await expect(page.getByTestId('outside')).toBeFocused();
 });
 test('same-value search reset cancels its pending debounce instead of emitting an obsolete request',async({page})=>{
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:01:00Z'));await page.locator('#structured-search').fill('確認');await page.getByRole('button',{name:'同じ検索値をreset',exact:true}).click();await page.clock.fastForward(100);await page.clock.runFor(20);await expect(page.getByTestId('structured-requests')).toHaveText('[]');await page.locator('#structured-search').press('Enter');await page.clock.runFor(20);await expect(page.getByTestId('structured-requests')).toContainText('"requestId":1');
 });
 test('a mixed mask deletion preserves the invalid draft and can be repaired at the same caret',async({page})=>{
  const editor=page.locator('#letter-mask');await editor.fill('山田01');await editor.evaluate(element=>(element as HTMLInputElement).setSelectionRange(1,1));await editor.press('Backspace');await expect(editor).toHaveValue('田-01');await expect(editor).toHaveAttribute('aria-invalid','true');await page.keyboard.insertText('山');await expect(editor).toHaveValue('山田-01');await expect(editor).not.toHaveAttribute('aria-invalid');
 });
 test('restored token replacement moves only its own affected focus to the editor',async({page})=>{
  await addTag(page,'申請');const remove=page.locator('ui-tag-input').getByRole('button',{name:'申請を削除（1件目）',exact:true}),restore=page.getByRole('button',{name:'上限超過と重複を復元',exact:true});await remove.focus();await restore.dispatchEvent('click');await expect(page.locator('#structured-tags')).toBeFocused();await expect(page.locator('#structured-tags')).toHaveAttribute('aria-invalid','true');await page.getByTestId('outside').focus();await restore.dispatchEvent('click');await expect(page.getByTestId('outside')).toBeFocused();
 });
 test('320px, text zoom and RTL retain keyboard operations, local scrolling and accessible names',async({page})=>{
  await page.setViewportSize({width:320,height:800});await page.getByLabel('RTL',{exact:true}).check();await page.getByLabel('横並びのラベル',{exact:true}).check();await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#structured-otp').fill('001234');await addTag(page,'非常に長い識別名を保持します'.repeat(3));await page.locator('#structured-combo').fill('総務');await page.locator('#structured-combo').press('ArrowDown');await page.locator('#structured-combo').press('Enter');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const result=await new AxeBuilder({page}).analyze();expect(result.violations).toEqual([]);await expectValues(page,{otp:'001234'});
 });
});
