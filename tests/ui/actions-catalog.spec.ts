import AxeBuilder from '@axe-core/playwright';
import type { Locator } from '@playwright/test';
import {test,expect} from './catalog-test';
async function colorFromToken(control: Locator, token: string): Promise<string> {
 return control.evaluate((element,role)=>{
  const probe=document.createElement('span');
  probe.style.color='var(--ui-color-'+role+')';
  element.append(probe);
  const color=getComputedStyle(probe).color;
  probe.remove();
  return color;
 },token);
}

for(const profile of ['guided','dense'])test.describe('操作 '+profile,()=>{
 test.beforeEach(async({page})=>{await page.goto('/catalog/actions');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);});
 test('コピー先に渡した内容だけに完了を表示する', async ({page}) => {
   const draft = page.getByLabel('コピーする下書き', {exact: true});
   const copy = page.locator('ui-copy-button').getByRole('button');
   const status = page.locator('ui-copy-button').getByRole('status');
   const finish = page.getByRole('button', {name: '保留したコピーを完了', exact: true});
   await page.getByLabel('コピー経路', {exact: true}).selectOption('pending');
   await draft.fill('A');
   await copy.click();
   await expect(copy).toBeDisabled();
   await draft.fill('B');
   await draft.fill('A');
   await finish.click();
   await expect(copy).toBeEnabled();
   await expect(status).toBeEmpty();
   await expect(page.getByTestId('copy-result')).toContainText('実行 1 / 成功 0 / 失敗 0');
   await copy.click();
   await finish.click();
   await expect(status).toHaveText('コピーしました。');
   await draft.fill('次の下書き');
   await expect(status).toBeEmpty();
 });
 test('Buttonは種類、サイズ、全幅、icon位置とnative submit/resetを反映',async({page})=>{const primary=page.getByRole('button',{name:/^確認して申請する/});await expect(primary).toHaveAttribute('data-variant','primary');await page.getByLabel('操作のサイズ',{exact:true}).selectOption('small');await expect(primary).toHaveAttribute('data-size','small');const small=await primary.evaluate(el=>({font:parseFloat(getComputedStyle(el).fontSize),height:el.getBoundingClientRect().height}));expect(small.height).toBeGreaterThanOrEqual(44);await page.getByLabel('操作のサイズ',{exact:true}).selectOption('large');await expect(primary).toHaveAttribute('data-size','large');expect(await primary.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(small.font);await page.getByLabel('幅いっぱいに表示',{exact:true}).check();await expect(primary).toHaveAttribute('data-width','full');expect(await primary.evaluate(el=>el.getBoundingClientRect().width/(el.parentElement!.getBoundingClientRect().width))).toBeGreaterThan(0.98);const positions=()=>primary.evaluate(el=>({icon:el.querySelector('.ui-action-icon')!.getBoundingClientRect().x,label:el.querySelector('.ui-action-label')!.getBoundingClientRect().x}));expect((await positions()).icon).toBeLessThan((await positions()).label);await page.getByLabel('アイコンを末尾に表示',{exact:true}).check();await expect.poll(async()=>{const p=await positions();return p.icon>p.label;}).toBe(true);await primary.click();await page.getByRole('button',{name:'送信',exact:true}).click();await page.getByRole('button',{name:'入力を戻す',exact:true}).click();await expect(page.getByTestId('action-result')).toHaveText('操作 1 / 遷移 0');await expect(page.getByTestId('native-result')).toHaveText('送信 1 / 戻す 1');});
 test('disabled/busyは手動dispatchも抑止しLinkは外部表示と安全なrelを保持',async({page})=>{const primary=page.getByRole('button',{name:/^確認して申請する/}),link=page.getByRole('link',{name:/参照資料/});await expect(link).toHaveAttribute('href','#action-result');await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','nofollow noopener noreferrer');await link.click();await expect(page.getByTestId('action-result')).toHaveText('操作 0 / 遷移 1');await page.getByLabel('処理中にする',{exact:true}).check();await expect(primary).toBeDisabled();await expect(primary).toHaveAttribute('aria-busy','true');await expect(link).not.toHaveAttribute('href');await primary.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));await link.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));await expect(page.getByTestId('action-result')).toHaveText('操作 0 / 遷移 1');await page.getByLabel('処理中にする',{exact:true}).uncheck();await page.getByLabel('操作を無効にする',{exact:true}).check();await expect(primary).toBeDisabled();await expect(link).toHaveAttribute('aria-disabled','true');});
 test('IconButtonとToggleは説明を保ち、Space/Enterで選択し処理中は抑止',async({page})=>{const icon=page.getByRole('button',{name:'確認済み',exact:true}),toggle=page.getByRole('button',{name:'履歴を固定',exact:true});await expect(icon).toHaveAttribute('data-shape','round');await expect(icon).toHaveAttribute('aria-pressed','false');await icon.press('Space');await expect(icon).toHaveAttribute('aria-pressed','true');await toggle.press('Enter');await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(toggle).toContainText('固定中');await expect(toggle).toHaveAccessibleName('履歴を固定');await toggle.press('Space');await expect(toggle).toHaveAttribute('aria-pressed','false');await expect(toggle).toContainText('未固定');await page.getByLabel('処理中にする',{exact:true}).check();await expect(toggle).toBeDisabled();await toggle.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));await expect(toggle).toHaveAttribute('aria-pressed','false');});
 test('選択中のIcon/Toggle/Segmentedは検査済みsurfaceに背景を持ち、祖先背景へ透過しない',async({page})=>{const icon=page.getByRole('button',{name:'確認済み',exact:true}),toggle=page.getByRole('button',{name:'履歴を固定',exact:true});await icon.click();await toggle.click();await expect(icon).toHaveAttribute('aria-pressed','true');await expect(toggle).toHaveAttribute('aria-pressed','true');const selected=page.locator('ui-segmented-control .ui-segment[data-selected="true"]');for(const target of [icon,toggle,selected]){const colors=await target.evaluate(el=>{const expected=document.createElement('span');expected.style.backgroundColor='var(--ui-color-surface)';el.append(expected);const surface=getComputedStyle(expected).backgroundColor;expected.remove();return {surface,background:getComputedStyle(el).backgroundColor};});expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');expect(colors.background).toBe(colors.surface);}});
 test('明示した操作の強調度・危険性と選択状態を独立して表現する',async({page})=>{
  const region=page.getByRole('region',{name:'操作の強調度と危険性の検証'});
  for(const [emphasis,normal,danger] of [['primary','通常の主操作','危険な主操作'],['secondary','通常の副操作','危険な副操作'],['tertiary','通常の補助操作','危険な補助操作']]){
   for(const [tone,label] of [['normal',normal],['danger',danger]]){
    const button=region.getByRole('button',{name:label,exact:true});await expect(button).toHaveAttribute('data-emphasis',emphasis);await expect(button).toHaveAttribute('data-tone',tone);
    const expected=emphasis==='primary'?(tone==='danger'?'--ui-color-on-danger':'--ui-color-on-action'):tone==='danger'?'--ui-color-danger':emphasis==='tertiary'?'--ui-color-link':'--ui-color-text';
    expect(await button.evaluate((el,role)=>{const probe=document.createElement('span');probe.style.color='var('+role+')';el.append(probe);const matches=getComputedStyle(el).color===getComputedStyle(probe).color;probe.remove();return matches;},expected)).toBe(true);
   }
  }
  const icon=region.getByRole('button',{name:'強調度指定の選択操作',exact:true});
  const toggle=region.getByRole('button',{name:'危険な選択操作',exact:true});
  const before=await toggle.evaluate(el=>getComputedStyle(el).color);
  await icon.press('Space');await expect(icon).toHaveAttribute('aria-pressed','true');await expect(icon).not.toHaveCSS('box-shadow','none');
  await toggle.press('Enter');await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(toggle).not.toHaveCSS('box-shadow','none');await expect(toggle).toHaveCSS('color',before);
  await page.getByLabel('操作を無効にする',{exact:true}).check();
  await expect(icon).toBeDisabled();
  await expect(icon).not.toHaveCSS('box-shadow','none');
  await expect(icon).toHaveCSS('color',await colorFromToken(icon,'muted'));
  await page.getByLabel('操作を無効にする',{exact:true}).uncheck();
  await page.getByLabel('処理中にする',{exact:true}).check();
  for(const button of [icon,toggle]){
   await expect(button).toBeDisabled();
   await expect(button).toHaveAttribute('aria-pressed','true');
   await expect(button).not.toHaveCSS('box-shadow','none');
  }
  await page.emulateMedia({forcedColors:'active'});
  const selectionRing=(button:Locator)=>button.evaluate(el=>getComputedStyle(el,'::after').borderTopStyle);
  const borderWidth=(button:Locator)=>button.evaluate(el=>parseFloat(getComputedStyle(el).borderTopWidth));
  const primaryIcon=region.getByRole('button',{name:'主操作の選択ボタン',exact:true});
  for(const button of [primaryIcon,icon,toggle]){
   await expect(button).toHaveAttribute('aria-pressed','true');
   expect(await selectionRing(button)).toBe('solid');
  }
  expect(await borderWidth(primaryIcon)).toBeGreaterThan(await borderWidth(toggle));
  await expect(toggle).toHaveCSS('border-top-style','solid');
  await expect(icon).toHaveCSS('border-top-style','none');
  await toggle.dispatchEvent('click');await expect(toggle).toHaveAttribute('aria-pressed','true');
  for(const [primaryName,secondaryName,tertiaryName] of [
   ['通常の主操作','通常の副操作','通常の補助操作'], ['危険な主操作','危険な副操作','危険な補助操作'],
  ]){
   const primary=region.getByRole('button',{name:primaryName,exact:true});
   const secondary=region.getByRole('button',{name:secondaryName,exact:true});
   const tertiary=region.getByRole('button',{name:tertiaryName,exact:true});
   await expect(primary).toHaveCSS('border-top-style','solid');
   await expect(secondary).toHaveCSS('border-top-style','solid');
   expect(await borderWidth(primary)).toBeGreaterThan(await borderWidth(secondary));
   await expect(tertiary).toHaveCSS('border-top-style','none');
   await expect(tertiary.locator('.ui-action-label')).toHaveCSS('text-decoration-line','underline');
  }
 });
 test('新旧スタイルのhover、active、無効化と動的な移行を検証する',async({page})=>{
  const region=page.getByRole('region',{name:'操作の強調度と危険性の検証'});
  const primary=page.getByRole('button',{name:'確認して申請する',exact:true});
  const danger=page.getByRole('button',{name:'下書きを削除する',exact:true});
  const secondary=page.getByRole('button',{name:'送信',exact:true});
  const pressed=region.getByRole('button',{name:'既存の下書きを削除する',exact:true});
  const inspect=async (control:Locator,variant:string,foreground:string,background:string,hover:string)=>{
   await expect(control).toHaveAttribute('data-variant',variant);
   await expect(control).not.toHaveAttribute('data-emphasis');
   await expect(control).toHaveCSS('color',await colorFromToken(control,foreground));
   await expect(control).toHaveCSS('background-color',await colorFromToken(control,background));
   await control.hover();
   await expect(control).toHaveCSS('background-color',await colorFromToken(control,hover));
   await page.mouse.down();
   try{await expect(control).not.toHaveCSS('box-shadow','none');}
   finally{await page.mouse.up();}
  };
  await inspect(primary,'primary','on-action','action','action-hover');
  await inspect(secondary,'secondary','text','surface','background');
  await inspect(danger,'danger','on-danger','danger','danger-hover');
  const appearance=[['通常の主操作','action','action-hover'],['通常の副操作','surface','background'],['通常の補助操作','surface','background'],['危険な主操作','danger','danger-hover'],['危険な副操作','surface','error-surface'],['危険な補助操作','surface','error-surface']];
  for(const [label,background,hover] of appearance){
   const control=region.getByRole('button',{name:label,exact:true});
   await expect(control).toHaveCSS('background-color',await colorFromToken(control,background));
   expect(await control.evaluate(el=>Math.min(el.getBoundingClientRect().height,el.getBoundingClientRect().width))).toBeGreaterThanOrEqual(44);
   await control.hover();await expect(control).toHaveCSS('background-color',await colorFromToken(control,hover));
  }
  const link=region.getByRole('link',{name:'処理結果へ移動',exact:true});
  await expect(link).toHaveAttribute('data-emphasis','tertiary');
  await expect(link.locator('.ui-action-label')).toHaveCSS('text-decoration-line','underline');
  await link.press('Space');expect(new URL(page.url()).hash).toBe('');
  await link.press('Enter');expect(new URL(page.url()).hash).toBe('#action-result');
  await expect(pressed).not.toHaveAttribute('data-tone');
  await region.getByRole('button',{name:'補助操作へ変更',exact:true}).click();
  await expect(pressed).toHaveAttribute('data-emphasis','tertiary');
  await expect(pressed).toHaveAttribute('data-tone','danger');
  await expect(pressed).not.toHaveAttribute('data-action-tone-conflict');
  await region.getByRole('button',{name:'通常トーンを指定',exact:true}).click();
  await expect(pressed).toHaveAttribute('data-action-tone-conflict','true');
  await expect(pressed).toHaveAttribute('data-tone','danger');
  await page.getByLabel('操作を無効にする',{exact:true}).check();
  await expect(pressed).toBeDisabled();
  await expect(pressed).toHaveCSS('color',await colorFromToken(pressed,'muted'));
  await expect(pressed).toHaveCSS('background-color',await colorFromToken(pressed,'disabled-surface'));
  await page.getByLabel('操作を無効にする',{exact:true}).uncheck();
  await region.getByRole('button',{name:'旧指定へ戻す',exact:true}).click();
  await expect(pressed).toHaveAttribute('data-variant','danger');
  await expect(pressed).not.toHaveAttribute('data-emphasis');
 });
 test('危険な確認では取消に初期フォーカスを置き、EnterとEscapeで安全に戻る',async({page})=>{
  const trigger=page.getByRole('button',{name:'削除の確認を開く',exact:true});
  const confirmation=page.getByRole('dialog',{name:'下書き削除の確認',exact:true});
  const confirm=confirmation.getByRole('button',{name:'下書きを削除',exact:true});
  const cancel=confirmation.getByRole('button',{name:'削除を取りやめる',exact:true});
  await trigger.press('Enter');
  await expect(confirm).toHaveAttribute('data-tone','danger');
  await expect(cancel).not.toHaveAttribute('data-tone');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId('confirm-result')).toHaveText('cancel');
  await expect(trigger).toBeFocused();
  await trigger.press('Space');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('confirm-result')).toHaveText('escape');
  await expect(trigger).toBeFocused();
 });
 test('通常の確認は投影autofocusを保ち、開いた後のtone変更はフォーカスを動かさない',async({page})=>{
  const trigger=page.getByRole('button',{name:'通常の確認を開く',exact:true});
  await trigger.press('Enter');
  const dialog=page.getByRole('dialog',{name:'下書き削除の確認',exact:true});
  await expect(dialog.getByRole('textbox',{name:'確認事項',exact:true})).toBeFocused();
  const change=dialog.getByRole('button',{name:'危険トーンへ変更',exact:true});
  await change.press('Enter');
  await expect(dialog.getByRole('button',{name:'下書きを削除',exact:true})).toHaveAttribute('data-tone','danger');
  await expect(change).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
 });
 test('メニューの危険性は実行項目に付き、展開と無効化を保つ',async({page})=>{
  const menu=page.getByRole('menubar',{name:'下書きの管理',exact:true});
  const discard=menu.getByRole('menuitem',{name:'編集中の下書きを破棄',exact:true});
  await expect(discard).toHaveAttribute('data-tone','danger');
  await discard.press('Enter');
  await expect(page.getByTestId('danger-menu-result')).toHaveText('discard-root');
  const history=menu.getByRole('menuitem',{name:'下書きの履歴',exact:true});
  await expect(history).not.toHaveAttribute('data-tone');
  await history.press('ArrowDown');
  const parent=page.getByRole('menuitem',{name:'過去の下書き',exact:true});
  const disabled=page.getByRole('menuitem',{name:'ロック中の履歴を削除',exact:true});
  await expect(parent).not.toHaveAttribute('data-tone');
  await expect(disabled).toHaveAttribute('aria-disabled','true');
  await expect(disabled).toHaveCSS('color',await colorFromToken(disabled,'muted'));
  await disabled.press('Enter');
  await expect(page.getByTestId('danger-menu-result')).toHaveText('discard-root');
  await parent.press('ArrowRight');
  const command=page.getByRole('menuitem',{name:'選んだ履歴を削除',exact:true});
  await expect(command).toHaveAttribute('data-tone','danger');
  await command.press('Enter');
  await expect(page.getByTestId('danger-menu-result')).toHaveText('discard-child');
 });
 test('ButtonGroupの共通サイズ、連結border、方向がnative操作へ適用',async({page})=>{const group=page.getByRole('group',{name:'表示する情報',exact:true});await expect(group).toHaveCSS('display','flex');await expect(group).toHaveCSS('flex-wrap','wrap');await page.getByLabel('操作のサイズ',{exact:true}).selectOption('large');await expect(group).toHaveAttribute('data-size','large');const large=await group.getByRole('button',{name:'概要',exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize));await page.getByLabel('操作のサイズ',{exact:true}).selectOption('small');expect(await group.getByRole('button',{name:'概要',exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(large);await page.getByLabel('連結して表示',{exact:true}).check();await expect(group).toHaveAttribute('data-connected','true');await expect(group).toHaveCSS('flex-wrap','nowrap');expect(await group.getByRole('button',{name:'申請内容',exact:true}).evaluate(el=>getComputedStyle(el).borderInlineStartWidth)).toBe('0px');await page.getByLabel('操作群を縦方向にする',{exact:true}).check();await expect(group).toHaveAttribute('data-direction','vertical');expect(await group.evaluate(el=>getComputedStyle(el).flexDirection)).toBe('column');expect(await group.getByRole('button',{name:'申請内容',exact:true}).evaluate(el=>getComputedStyle(el).borderBlockStartWidth)).toBe('0px');});
 test('SegmentedControlはnative radio、複数checkbox、CVA touched/required/disableを接続',async({page})=>{const segments=page.locator('ui-segmented-control'),summary=segments.getByRole('radio',{name:'概要',exact:true}),history=segments.getByRole('radio',{name:'履歴',exact:true});await expect(summary).toBeChecked();await summary.press('ArrowRight');await expect(history).toBeChecked();await expect(page.getByTestId('segment-value')).toContainText('"history" / 有効');await page.getByRole('button',{name:'選択を初期化',exact:true}).click();await expect(page.getByTestId('segment-value')).toContainText('null / 要確認');await history.check();await page.getByLabel('複数の表示を選ぶ',{exact:true}).check();await segments.getByRole('checkbox',{name:'概要',exact:true}).check();await expect(page.getByTestId('segment-value')).toContainText('["history","summary"] / 有効');await expect(segments.getByRole('checkbox',{name:'利用不可',exact:true})).toBeDisabled();await page.getByRole('button',{name:'選択をformから無効にする',exact:true}).click();await expect(segments.getByRole('checkbox',{name:'概要',exact:true})).toBeDisabled();await page.getByRole('button',{name:'選択をformから有効にする',exact:true}).click();await expect(segments.getByRole('checkbox',{name:'概要',exact:true})).toBeChecked();await segments.getByRole('checkbox',{name:'履歴',exact:true}).uncheck();await page.getByRole('button',{name:'選択を初期化',exact:true}).focus();await expect(page.getByTestId('segment-value')).toContainText('操作済み');});
 test('SegmentedControlの均等幅/縦配置は実寸を変え、profile切替でも選択保持',async({page})=>{const segments=page.locator('ui-segmented-control'),labels=segments.locator('.ui-segment');const widths=await labels.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);await segments.getByRole('radio',{name:'履歴',exact:true}).check();await page.getByLabel('選択肢を縦方向にする',{exact:true}).check();await expect(segments.locator('.ui-segments')).toHaveAttribute('data-direction','vertical');const ys=await labels.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));expect(ys[1]).toBeGreaterThan(ys[0]!);await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect(segments.getByRole('radio',{name:'履歴',exact:true})).toBeChecked();});
 test('SplitButton主操作と再帰補助メニュー、保持設定、busyが動作',async({page})=>{const split=page.locator('ui-split-button');await split.getByRole('button',{name:'下書きを保存',exact:true}).click();await expect(page.getByTestId('action-result')).toHaveText('操作 1 / 遷移 0');await split.getByRole('button',{name:'保存の補助操作',exact:true}).click();await page.getByRole('menuitem',{name:'テンプレートから作成',exact:true}).click();await page.getByRole('menuitem',{name:'前回の申請',exact:true}).click();await expect(page.getByTestId('split-result')).toHaveText('選択: previous');await expect(split.getByRole('button',{name:'保存の補助操作',exact:true})).toBeFocused();await page.getByLabel('選択後もメニューを保持',{exact:true}).check();await split.getByRole('button',{name:'保存の補助操作',exact:true}).click();await page.getByRole('menuitem',{name:'内容を出力',exact:true}).click();await expect(page.getByRole('menu',{name:'保存の補助操作',exact:true})).toBeVisible();await page.keyboard.press('Escape');await page.getByLabel('処理中にする',{exact:true}).check();await expect(split.getByRole('button',{name:/^下書きを保存/})).toBeDisabled();await expect(split.getByRole('button',{name:'保存の補助操作',exact:true})).toBeDisabled();});
 test('Toolbarは実幅で退避、再帰Menuで選択、端へfocusを移す',async({page})=>{const toolbar=page.getByRole('toolbar',{name:'申請の操作',exact:true});await expect(toolbar.getByRole('button',{name:'最新の申請を取得',exact:true})).toBeVisible();await toolbar.getByRole('button',{name:'最新の申請を取得',exact:true}).focus();await page.getByLabel('操作帯の幅',{exact:true}).evaluate(el=>{(el as HTMLSelectElement).value='160';el.dispatchEvent(new Event('change',{bubbles:true}));});const more=toolbar.getByRole('button',{name:'その他の操作',exact:true});await expect(more).toBeFocused();await expect(toolbar.getByRole('button',{name:'最新の申請を取得',exact:true})).toBeHidden();await more.press('ArrowDown');await page.getByRole('menuitem',{name:'選択した申請を編集',exact:true}).click();await expect(page.getByTestId('toolbar-result')).toHaveText('操作: edit');await expect(more).toBeFocused();await page.getByLabel('操作帯の幅',{exact:true}).selectOption('1000');await expect(toolbar.getByRole('button',{name:'最新の申請を取得',exact:true})).toBeVisible();await toolbar.getByRole('button',{name:'最新の申請を取得',exact:true}).press('End');expect(await toolbar.locator('button:focus').count()).toBe(1);await toolbar.locator('button:focus').press('Home');await expect(toolbar.getByRole('button',{name:'最新の申請を取得',exact:true})).toBeFocused();});
 test('Toolbarの危険操作は幅測定と退避先でも同じ意味と操作IDを維持する',async({page})=>{
  const toolbar=page.getByRole('toolbar',{name:'申請の操作',exact:true});
  await page.getByLabel('退避せず折り返す',{exact:true}).check();
  const action=toolbar.getByRole('button',{name:'申請を保管',exact:true});
  await expect(action).toHaveAttribute('data-emphasis','tertiary');await expect(action).toHaveAttribute('data-tone','danger');
  const measured=page.locator('[data-measure-item="archive"]');await expect(measured).toHaveAttribute('data-emphasis','tertiary');await expect(measured).toHaveAttribute('data-tone','danger');
  await page.getByLabel('操作帯の幅',{exact:true}).selectOption('160');
  await page.getByLabel('退避せず折り返す',{exact:true}).uncheck();
  await toolbar.getByRole('button',{name:'その他の操作',exact:true}).click();
  const overflow=page.getByRole('menuitem',{name:'申請を保管',exact:true});
  await expect(overflow).toHaveAttribute('data-tone','danger');
  await overflow.click();await expect(page.getByTestId('toolbar-result')).toHaveText('操作: archive');
 });
 test('ToolbarのMore/選択中popupが広幅へ戻ると可視操作へfocusを移す',async({page})=>{const toolbar=page.getByRole('toolbar',{name:'申請の操作',exact:true});await page.getByLabel('操作帯の幅',{exact:true}).selectOption('160');const more=toolbar.getByRole('button',{name:'その他の操作',exact:true});await more.focus();await page.getByLabel('退避せず折り返す',{exact:true}).evaluate(el=>{(el as HTMLInputElement).checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});await expect(toolbar.getByRole('button',{name:'最新の申請を取得',exact:true})).toBeFocused();await page.getByLabel('退避せず折り返す',{exact:true}).uncheck();await more.press('ArrowDown');const edit=page.getByRole('menuitem',{name:'選択した申請を編集',exact:true});await edit.focus();await page.getByLabel('退避せず折り返す',{exact:true}).evaluate(el=>{(el as HTMLInputElement).checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});await expect(toolbar.getByRole('button',{name:'選択した申請を編集',exact:true})).toBeFocused();await expect(page.getByRole('menu',{name:'その他の操作',exact:true})).toBeHidden();});
 test('別Toolbarへfocusしたまま他の幅/profile/項目が変わってもfocusを奪わない',async({page})=>{const separate=page.getByRole('toolbar',{name:'別の操作帯',exact:true}).getByRole('button',{name:'別領域の確認',exact:true});await separate.focus();await page.getByLabel('操作帯の幅',{exact:true}).evaluate(el=>{(el as HTMLSelectElement).value='160';el.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.getByRole('toolbar',{name:'申請の操作',exact:true}).getByRole('button',{name:'その他の操作',exact:true})).toBeVisible();await expect(separate).toBeFocused();await page.getByLabel('表示設定',{exact:true}).evaluate((el,profile)=>{(el as HTMLSelectElement).value=profile;el.dispatchEvent(new Event('change',{bubbles:true}));},profile==='guided'?'dense':'guided');await expect(separate).toBeFocused();await page.getByTestId('replace-toolbar').dispatchEvent('click');await expect(page.getByRole('menuitem',{name:'新しい操作A',exact:true})).toHaveCount(0);await expect(separate).toBeFocused();});
 test('Toolbar全件差替えと選択肢削除は可視操作へ戻り、form入力を保持する',async({page})=>{const toolbar=page.getByRole('toolbar',{name:'申請の操作',exact:true});await toolbar.getByRole('button',{name:'最新の申請を取得',exact:true}).focus();await page.getByTestId('replace-toolbar').dispatchEvent('click');await expect(toolbar.getByRole('button',{name:'新しい操作A',exact:true})).toBeFocused();const segments=page.locator('ui-segmented-control');await segments.getByRole('radio',{name:'履歴',exact:true}).check();await page.getByTestId('replace-segments').dispatchEvent('click');await expect(segments.getByRole('radio',{name:'新しい概要',exact:true})).toBeFocused();await expect(page.getByTestId('segment-value')).toContainText('"history" / 要確認');});
 test('ToolbarはRTL/縦方向のrovingと区切り、折返し、固定を制御',async({page})=>{const toolbar=page.getByRole('toolbar',{name:'申請の操作',exact:true});await page.getByLabel('退避せず折り返す',{exact:true}).check();await expect(toolbar).toHaveAttribute('data-overflow','wrap');await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');const first=toolbar.getByRole('button',{name:'最新の申請を取得',exact:true}),second=toolbar.getByRole('button',{name:'選択した申請を編集',exact:true});await first.press('ArrowLeft');await expect(second).toBeFocused();await page.getByLabel('操作帯を縦方向にする',{exact:true}).check();await expect(toolbar).toHaveAttribute('aria-orientation','vertical');await first.press('ArrowDown');await expect(second).toBeFocused();await expect(toolbar.getByRole('separator')).toHaveAttribute('aria-orientation','horizontal');await page.getByLabel('操作帯を固定',{exact:true}).check();await expect.poll(()=>page.locator('ui-toolbar').filter({has:page.getByRole('toolbar',{name:'申請の操作',exact:true})}).evaluate(el=>getComputedStyle(el).position)).toBe('sticky');});
 test('CopyButtonは実Clipboard APIを書き、成功と2秒の結果表示を制御',async({page})=>{await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));const text='検証する下書き '+profile;await page.getByLabel('コピーする下書き',{exact:true}).fill(text);await page.clock.runFor(20);await page.getByRole('button',{name:'下書きをコピー',exact:true}).click();await page.clock.runFor(20);const status=page.locator('ui-copy-button').getByRole('status');await expect(status).toHaveText('コピーしました。');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(text);await expect(page.getByTestId('copy-result')).toContainText('実行 1 / 成功 1 / 失敗 0');const finished=Number(await page.getByTestId('copy-result').getAttribute('data-finished-at'));await page.clock.runFor(Math.max(0,finished+1999-await page.evaluate(()=>Date.now())));await expect(status).toHaveText('コピーしました。');await page.clock.runFor(21);await expect(status).toBeEmpty();});
 test('コピー拒否は下書きを保持して再試行し、保留中の連打とdestroy後の結果を抑止',async({page})=>{await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));await page.getByLabel('コピー経路',{exact:true}).selectOption('reject');const button=page.locator('ui-copy-button').getByRole('button'),status=page.locator('ui-copy-button').getByRole('status');await button.click();await page.clock.runFor(20);await expect(status).toContainText('コピーできませんでした');await expect(page.getByLabel('コピーする下書き',{exact:true})).toHaveValue('確認中の申請');await page.clock.runFor(2020);await expect(status).toBeEmpty();await page.getByLabel('コピー経路',{exact:true}).selectOption('pending');await button.evaluate(el=>{(el as HTMLButtonElement).click();el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});await page.clock.runFor(20);await expect(button).toBeDisabled();await expect(page.getByTestId('copy-result')).toContainText('実行 2 / 成功 0 / 失敗 1');await page.getByRole('button',{name:'保留したコピーを完了',exact:true}).click();await page.clock.runFor(20);await expect(status).toHaveText('コピーしました。');await expect(page.getByTestId('copy-result')).toContainText('実行 2 / 成功 1 / 失敗 1');await button.click();await page.clock.runFor(20);await page.getByLabel('コピー操作を表示',{exact:true}).uncheck();await page.clock.runFor(20);await expect(page.locator('ui-copy-button')).toBeHidden();await page.getByRole('button',{name:'保留したコピーを完了',exact:true}).click();await page.clock.runFor(20);await expect(page.getByTestId('copy-result')).toContainText('実行 3 / 成功 1 / 失敗 1');await page.getByLabel('コピー操作を表示',{exact:true}).check();await page.clock.runFor(20);await expect(page.locator('ui-copy-button').getByRole('status')).toBeEmpty();});
 test('FloatingActionは固定位置と補助展開、選択、閉じ戻りを制御',async({page})=>{await page.getByLabel('固定操作を表示',{exact:true}).check();const floating=page.locator('ui-speed-dial');await expect(floating).toHaveAttribute('data-position','bottom-end');await floating.getByRole('button',{name:'申請を追加',exact:true}).click();await expect(page.getByTestId('action-result')).toHaveText('操作 1 / 遷移 0');await page.getByLabel('固定操作の位置',{exact:true}).selectOption('top-start');await page.getByLabel('補助操作の展開方向',{exact:true}).selectOption('right');await expect(floating).toHaveAttribute('data-position','top-start');await expect(floating).toHaveAttribute('data-direction','right');const trigger=floating.getByRole('button',{name:'追加の補助操作',exact:true});await trigger.click();await page.getByRole('menuitem',{name:'内容を出力',exact:true}).click();await expect(page.getByTestId('split-result')).toHaveText('選択: export');await expect(trigger).toBeFocused();await page.getByLabel('固定操作を表示',{exact:true}).uncheck();await expect(floating).toBeHidden();});
 test('320px/200%/RTL/reduced motionで操作は範囲内にありaxe違反なし',async({page})=>{await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.emulateMedia({reducedMotion:'reduce'});await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');await page.getByLabel('幅いっぱいに表示',{exact:true}).check();await page.getByLabel('連結して表示',{exact:true}).check();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByRole('button',{name:/^確認して申請する/}).focus();expect(await page.getByRole('button',{name:/^確認して申請する/}).evaluate(el=>el.getBoundingClientRect().width<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);});
});
