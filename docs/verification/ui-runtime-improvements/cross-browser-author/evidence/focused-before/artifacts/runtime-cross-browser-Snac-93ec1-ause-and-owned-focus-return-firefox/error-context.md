# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runtime-cross-browser.spec.ts >> Snackbar guided: exact timeout, OFF, overlapping pause and owned focus return
- Location: tests/cross-browser/runtime-cross-browser.spec.ts:63:2

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  locator('ui-snackbar').filter({ hasText: '申請を保存しました' }).locator('.ui-snackbar')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" locator('ui-snackbar').filter({ hasText: '申請を保存しました' }).locator('.ui-snackbar') with timeout 5000ms
  - waiting for locator('ui-snackbar').filter({ hasText: '申請を保存しました' }).locator('.ui-snackbar')
    13 × locator resolved to <div class="ui-snackbar" data-severity="success" _ngcontent-ng-c1651151827="" data-position="bottom-center">…</div>
       - unexpected value "visible"

```

```yaml
- status: 申請を保存しました
- button "内容を確認"
- 'button "通知を閉じる: 申請を保存しました"': 閉じる
```

# Test source

```ts
  1  | import {test,expect} from './runtime-test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import type {Page,TestInfo} from '@playwright/test';
  4  | type Profile='guided'|'dense';
  5  | const other=(profile:Profile):Profile=>profile==='guided'?'dense':'guided';
  6  | async function narrow(page:Page){await page.setViewportSize({width:320,height:800});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');}
  7  | async function foundation(page:Page,profile:Profile){
  8  |  await page.goto('/catalog/foundation');await expect(page.locator('#range-status')).toHaveText('VALID');await narrow(page);
  9  |  await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'ja-JP',direction:'rtl',timeZone:'UTC',dateInputFormat:'dd/MM/yyyy'});},profile);
  10 |  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);await expect(page.locator('main')).toHaveAttribute('dir','rtl');
  11 | }
  12 | async function catalog(page:Page,profile:Profile){await page.goto('/catalog');await page.locator('#catalog-profile').selectOption(profile);await narrow(page);await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');}
  13 | async function evidence(page:Page,info:TestInfo,selector:string){
  14 |  const target=page.locator(selector),geometry=await target.evaluate(element=>{const r=element.getBoundingClientRect(),style=getComputedStyle(element);return {x:r.x,right:r.right,width:r.width,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,direction:style.direction,profile:element.closest('[data-ui-profile]')?.getAttribute('data-ui-profile')};});
  15 |  await info.attach('native-geometry',{body:JSON.stringify(geometry,null,2),contentType:'application/json'});
  16 |  expect(geometry.documentWidth,'320px/200% document overflow').toBeLessThanOrEqual(321);
  17 |  const accessibility=await new AxeBuilder({page}).include(selector).analyze();await info.attach('axe-target',{body:JSON.stringify(accessibility),contentType:'application/json'});expect(accessibility.violations).toEqual([]);
  18 |  await info.attach('aria-target',{body:await target.ariaSnapshot(),contentType:'text/plain'});
  19 | }
  20 | for(const profile of ['guided','dense'] as const){
  21 |  test(`Card ${profile}: collapse/body visibility, profile and input identity`,async({page},info)=>{
  22 |   await catalog(page,profile);const input=page.getByRole('textbox',{name:'Card内メモ',exact:true}),card=page.locator('ui-card').filter({has:page.locator('#verification-card-content')});await input.fill('再開する未保存の下書き');await input.evaluate(element=>(window as any).__crossCardInput=element);
  23 |   const inside=page.getByRole('button',{name:'本文から折り畳む',exact:true});await inside.focus();await inside.press('Enter');await expect(input).toBeHidden();const expand=page.getByRole('button',{name:'展開: 申請内容',exact:true});await expect(expand).toBeFocused();await expand.press('Enter');await expect(input).toHaveValue('再開する未保存の下書き');expect(await input.evaluate(element=>element===(window as any).__crossCardInput)).toBe(true);
  24 |   await page.locator('#catalog-profile').selectOption(other(profile));await expect(page.locator('main')).toHaveAttribute('data-ui-profile',other(profile));await expect(input).toHaveValue('再開する未保存の下書き');expect(await input.evaluate(element=>element===(window as any).__crossCardInput)).toBe(true);
  25 |   const hide=page.getByRole('button',{name:'本文を隠す',exact:true});await hide.focus();await hide.press('Enter');await expect(input).toBeHidden();await expect(page.getByRole('button',{name:'折り畳む: 申請内容',exact:true})).toBeFocused();await page.getByLabel('Card本文',{exact:true}).check();await expect(input).toHaveValue('再開する未保存の下書き');expect(await input.evaluate(element=>element===(window as any).__crossCardInput)).toBe(true);
  26 |   await page.getByLabel('Card取得中',{exact:true}).check();await expect(card.locator('article')).toHaveAttribute('aria-busy','true');await expect(card.getByRole('status')).toHaveText('内容を読み込んでいます。');await expect(input).toHaveValue('再開する未保存の下書き');await evidence(page,info,'ui-card:has(#verification-card-content)');
  27 |  });
  28 |  test(`Menu ${profile}: recursive RTL keys, disabled intent, Tab exit and parent focus`,async({page},info)=>{
  29 |   await catalog(page,profile);const trigger=page.getByRole('button',{name:'申請の操作',exact:true}),root=page.locator('#recursive-menu');await trigger.focus();await trigger.press('ArrowDown');const file=root.getByRole('menuitem',{name:'ファイル',exact:true});await expect(file).toBeFocused();await file.press('ArrowLeft');const next=root.getByRole('menuitem',{name:'新規',exact:true});await expect(next).toBeFocused();await next.press('ArrowLeft');await expect(root.getByRole('menuitem',{name:'申請を作成',exact:true})).toBeFocused();await evidence(page,info,'#recursive-menu');
  30 |   await page.keyboard.press('Escape');await expect(next).toBeFocused();await page.keyboard.press('Escape');await expect(file).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(root).toBeHidden();
  31 |   await trigger.press('ArrowUp');await expect(root.getByRole('menuitem',{name:'実行不可',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByTestId('menu-selected')).toHaveText('Menu選択: ');await expect(root).toBeVisible();await page.keyboard.press('Home');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Menuの次の操作',exact:true})).toBeFocused();await expect(root).toBeHidden();
  32 |  });
  33 |  test(`DateRange ${profile}: invalid draft, locale/profile, keyboard calendar and focus`,async({page},info)=>{
  34 |   await foundation(page,profile);const range=page.locator('#range-case'),start=range.locator('input').first(),picker=range.locator('ui-date-picker').first();
  35 |   await start.fill('31/02/2026');await start.focus();await start.evaluate(element=>{(window as any).__crossDateEditor=element;(element as HTMLInputElement).setSelectionRange(2,5);});
  36 |   await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'en-US',direction:'rtl',timeZone:'UTC',dateInputFormat:'yyyy-MM-dd'});},other(profile));
  37 |   await expect(start).toHaveValue('31/02/2026');await expect(start).toHaveAttribute('placeholder','dd/MM/yyyy');await expect(start).toBeFocused();expect(await start.evaluate(element=>element===(window as any).__crossDateEditor)).toBe(true);expect(await start.evaluate(element=>[(element as HTMLInputElement).selectionStart,(element as HTMLInputElement).selectionEnd])).toEqual([2,5]);
  38 |   await expect(page.locator('#range-status')).toHaveText('INVALID');await expect(page.locator('#range-value')).toHaveText('{"start":"2026-02-01","end":"2026-02-07"}');
  39 |   await start.fill('02/02/2026');await expect(start).toHaveValue('2026-02-02');await expect(page.locator('#range-status')).toHaveText('VALID');
  40 |   const trigger=picker.getByRole('button',{name:'期間の開始日のカレンダーを開く',exact:true});await trigger.focus();await trigger.press('Enter');const popup=page.locator('dialog:modal');await expect(popup).toBeVisible();const day=popup.locator('button[data-date="2026-02-03"]');await day.focus();await day.press('Enter');await expect(popup).toHaveCount(0);await expect(start).toHaveValue('2026-02-03');await expect(trigger).toBeFocused();
  41 |   await evidence(page,info,'#range-case');
  42 |  });
  43 |  test(`Composer ${profile}: pending/reset keeps input and CodeMirror native editing`,async({page},info)=>{
  44 |   await foundation(page,profile);const textarea=page.locator('#composer-case textarea');await textarea.fill('保持するnative下書き');await textarea.focus();await textarea.evaluate(element=>{(window as any).__crossComposer=element;(element as HTMLTextAreaElement).setSelectionRange(2,6);});
  45 |   await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'de-DE',direction:'rtl',dateInputFormat:'dd/MM/yyyy',timeZone:'UTC',messages:{メッセージを入力:'Draft message',送信:'Send'}});},other(profile));
  46 |   await expect(page.locator('#root-locale .ui-input-format')).toContainText('1.234,5');await expect(textarea).toHaveValue('保持するnative下書き');await expect(textarea).toBeFocused();expect(await textarea.evaluate(element=>element===(window as any).__crossComposer)).toBe(true);expect(await textarea.evaluate(element=>[(element as HTMLTextAreaElement).selectionStart,(element as HTMLTextAreaElement).selectionEnd])).toEqual([2,6]);
  47 |   const submit=page.locator('#composer-case button[type=submit]');await expect(submit).toHaveText('Send');await submit.focus();await submit.press('Enter');await expect(page.locator('#composer-intents')).toHaveText('1');await expect(textarea).toBeDisabled();
  48 |   expect(await page.evaluate(()=>{const app=(window as any).__stage.newForms();return app.composer().markSendUnknown(app.requests()[0].requestId);})).toBe(true);await expect(textarea).toHaveValue('保持するnative下書き');await expect(submit).toBeDisabled();
  49 |   await page.evaluate(()=>(window as any).__stage.newForms().composerControl.reset('保持するnative下書き'));await expect(submit).toBeEnabled();expect(await page.evaluate(()=>{const app=(window as any).__stage.newForms();return app.composer().completeSend(app.requests()[0].requestId,true);})).toBe(false);
  50 |   await evidence(page,info,'#composer-case');
  51 |   const code=page.locator('[data-editor=code] .cm-content');await code.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('const crossBrowser = 7;');await expect(page.locator('#code-value')).toHaveText('const crossBrowser = 7;');await code.evaluate(element=>(window as any).__crossCode=element);await page.evaluate(profile=>(window as any).__stage.profile.set(profile),profile);await expect(code).toBeFocused();expect(await code.evaluate(element=>element===(window as any).__crossCode)).toBe(true);await expect(page.locator('#code-value')).toHaveText('const crossBrowser = 7;');
  52 |   await info.attach('codemirror-native',{body:JSON.stringify({value:await page.locator('#code-value').textContent(),sameEditor:true,focused:true}),contentType:'application/json'});
  53 |  });
  54 |  test(`Dialog ${profile}: busy/veto, nested RTL Menu, retained input and close return`,async({page},info)=>{
  55 |   await catalog(page,profile);const opener=page.getByRole('button',{name:'編集Dialogを開く',exact:true});await opener.focus();await opener.press('Enter');const dialog=page.getByRole('dialog',{name:'申請の編集',exact:true}),input=dialog.getByRole('textbox',{name:'Dialogの入力',exact:true});await expect(input).toBeFocused();expect(await dialog.evaluate(element=>element.matches(':modal'))).toBe(true);await input.fill('閉じ戻っても保持');await input.evaluate(element=>(window as any).__crossDialogInput=element);
  56 |   // Scoped profile is an application-controlled DOM scope; the native modal background stays inert.
  57 |   await dialog.evaluate((element,profile)=>element.setAttribute('data-ui-profile',profile),other(profile));await expect(input).toHaveValue('閉じ戻っても保持');await expect(input).toBeFocused();expect(await input.evaluate(element=>element===(window as any).__crossDialogInput)).toBe(true);
  58 |   await dialog.getByLabel('終了保留を解除',{exact:true}).check();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(page.getByTestId('dialog-held')).toHaveText('終了保留: 1');await dialog.getByLabel('終了保留を解除',{exact:true}).uncheck();await dialog.getByLabel('処理中',{exact:true}).check();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'ダイアログを閉じる',exact:true})).toBeDisabled();await dialog.getByLabel('処理中',{exact:true}).uncheck();
  59 |   const menu=dialog.getByRole('button',{name:'Dialog内Menu',exact:true});await menu.focus();await menu.press('ArrowDown');const file=page.locator('#dialog-menu').getByRole('menuitem',{name:'ファイル',exact:true});await expect(file).toBeFocused();await file.press('ArrowLeft');await expect(page.locator('#dialog-menu').getByRole('menuitem',{name:'新規',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(file).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(dialog).toBeVisible();
  60 |   await evidence(page,info,'dialog[open]');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByTestId('dialog-result')).toHaveText('終了: escape / ');
  61 |   await opener.press('Enter');await expect(input).toHaveValue('閉じ戻っても保持');expect(await input.evaluate(element=>element===(window as any).__crossDialogInput)).toBe(true);await dialog.getByRole('button',{name:'編集を確定',exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByTestId('dialog-result')).toHaveText('終了: confirm / saved');
  62 |  });
  63 |  test(`Snackbar ${profile}: exact timeout, OFF, overlapping pause and owned focus return`,async({page},info)=>{
  64 |   await catalog(page,profile);await page.clock.install({time:new Date('2026-10-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-06T12:00:01Z'));await page.mouse.move(0,0);const opener=page.getByRole('button',{name:'単独通知を表示',exact:true}),notice=page.locator('ui-snackbar').filter({hasText:'申請を保存しました'}).locator('.ui-snackbar');
  65 |   await opener.focus();await opener.press('Enter');await page.clock.runFor(20);await expect(notice).toBeVisible();await page.clock.runFor(4950);await expect(notice).toBeVisible();await page.clock.runFor(100);await expect(notice).toBeHidden();await expect(page.getByTestId('notice-dismiss')).toContainText('timeout');
  66 |   await page.getByLabel('通知を自動消去',{exact:true}).uncheck();await page.locator('#notice-seconds').fill('0');await opener.focus();await opener.press('Enter');await page.clock.runFor(20);await page.clock.runFor(60000);await expect(notice).toBeVisible();
  67 |   // Axe owns asynchronous timers. Resume only while autoDismiss=OFF, then pause again before timed assertions.
  68 |   await page.clock.resume();await evidence(page,info,'ui-snackbar');await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
  69 |   await notice.getByRole('button',{name:'内容を確認',exact:true}).focus();await page.keyboard.press('Enter');await page.clock.runFor(20);await expect(notice).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByTestId('notice-dismiss')).toHaveText('単独通知: action / 操作: 1');
> 70 |   await page.getByLabel('通知を自動消去',{exact:true}).check();await page.locator('#notice-seconds').fill('5');await opener.focus();await opener.press('Enter');await page.clock.runFor(20);await page.clock.runFor(2000);await notice.hover();await notice.getByRole('button',{name:'内容を確認',exact:true}).focus();await page.clock.runFor(10000);await page.mouse.move(0,0);await page.clock.runFor(10000);await expect(notice).toBeVisible();await opener.focus();await page.clock.runFor(2900);await expect(notice).toBeVisible();await page.clock.runFor(100);await expect(notice).toBeHidden();
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ^ Error: expect(locator).toBeHidden() failed
  71 |  });
  72 | }
  73 | 
```