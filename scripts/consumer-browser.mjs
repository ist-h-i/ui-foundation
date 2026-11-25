import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { transformAsync } from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { needsLinking } from '@angular/compiler-cli/linker';
import { chromium, expect } from '@playwright/test';

// The test supplies its own generated root, compiled with strictTemplates/AOT.
const root = process.argv[2];
assert.ok(root);
const mark=async(stage,profile=null)=>writeFile('/tmp/ui-foundation-consumer-browser-progress.json',JSON.stringify({root,stage,profile,time:new Date().toISOString()}));
await mark('bundle');
const bundle = await build({
  entryPoints: [resolve(root, 'compiled/consumer.js')],
  bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, define:{ngDevMode:'false'},
  plugins: [{name:'angular-linker',setup(builder){
    builder.onLoad({filter:/\.mjs$/},async({path})=>{
      const source=await readFile(path,'utf8');
      if(!needsLinking(path,source))return;
      const linked=await transformAsync(source,{filename:path,babelrc:false,configFile:false,plugins:[linkerPlugin]});
      assert.ok(linked?.code);return {contents:linked.code,loader:'js'};
    });
  }}],
});
const styles = await Promise.all(['foundation/tokens.css','foundation/angular/styles.css'].map(path=>readFile(resolve(root,path),'utf8')));
const assets = new Map([
  ['/','<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/styles.css"></head><body><consumer-app></consumer-app><script type="module" src="/main.js"></script></body></html>'],
  ['/tokens.css',styles[0]],['/styles.css',styles[1]],['/main.js',bundle.outputFiles[0].text],
]);
const server=createServer((request,response)=>{
  const pathname=new URL(request.url??'/','http://127.0.0.1').pathname;
  const source=assets.get(pathname);
  if(source===undefined){response.writeHead(404).end();return;}
  const type=pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html';
  response.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'}).end(source);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();assert.ok(address&&typeof address!=='string');
let browser;
const results=[];
try{
  await mark('launch');
  browser=await chromium.launch({channel:'chromium'});
  for(const profile of ['guided','dense']){
    const page=await browser.newPage({viewport:{width:320,height:720},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text());});
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await mark('forms',profile);
    await page.evaluate(profile=>{document.documentElement.setAttribute('data-ui-profile',profile);document.documentElement.style.fontSize='200%';},profile);
    await expect(page.getByRole('img',{name:'確認',exact:true})).toBeVisible();
    assert.ok(await page.getByRole('img',{name:'確認',exact:true}).locator('path,circle').count());
    await expect(page.getByRole('img',{name:'確認',exact:true})).toHaveAttribute('stroke','rebeccapurple');
    for (const id of ['interop-raw', 'interop-parent']) {
      await expect(page.locator(`#${id} circle`)).toHaveAttribute('r', '3');
    }
    const child = page.locator('#interop-child svg');
    await expect(child).toHaveAttribute('stroke', '#123456');
    await expect(child).toHaveAttribute('stroke-width', '3');
    await expect(child).toHaveAttribute('width', '36');
    await expect(child.locator('rect')).toHaveAttribute('width', '9');
    await expect(child.locator('rect')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    await expect(page.locator('#interop-external svg.lucide-folder path')).toHaveCount(1);
    await expect(page.locator('#interop-selected svg.lucide-folder path')).toHaveCount(1);
    await expect(page.locator('#interop-native-grandchild rect')).toHaveAttribute('width', '9');
    await page.locator('#interop-change').click();
    await expect(page.locator('#interop-selected svg.lucide-local-mark line')).toHaveAttribute('x2', '7');
    await page.locator('#interop-missing').click();
    await expect(page.locator('#interop-missing-result')).toHaveText("Error: Unable to resolve icon 'shared'");
    await expect(page.locator('#interop-selected svg.lucide-folder path')).toHaveCount(1);
    await page.locator('#title').fill('生成先の入力');
    await expect(page.getByTestId('consumer-value')).toHaveText('生成先の入力');
    const cardField=page.getByRole('textbox',{name:'Cardの下書き'});
    await mark('card',profile);
    await cardField.fill('Cardに保持');await page.getByRole('button',{name:'折り畳む: 記録'}).click();await expect(cardField).toBeHidden();
    await page.getByRole('button',{name:'展開: 記録'}).click();await expect(cardField).toHaveValue('Cardに保持');
    await page.getByRole('button',{name:'記録の操作',exact:true}).click();
    await mark('menu',profile);
    try { await expect(page.getByRole('menuitem',{name:'確認',exact:true})).toBeVisible(); }
    catch(error) { console.error(JSON.stringify({errors,menu:await page.locator('ui-menu').evaluate(element=>element.outerHTML),active:await page.evaluate(()=>document.activeElement?.outerHTML)}));await page.screenshot({path:'/tmp/ui-foundation-consumer-menu-failure.png'});throw error; }
    await page.getByRole('menuitem',{name:'確認',exact:true}).press('ArrowRight');
    await page.getByRole('menuitem',{name:'詳細',exact:true}).press('Enter');
    await expect(page.getByTestId('consumer-menu')).toHaveText('detail');
    await mark('dialog',profile);
    const opener=page.getByRole('button',{name:'生成先Dialogを開く'});await opener.click();
    const dialog=page.getByRole('dialog',{name:'記録の確認'});await dialog.getByRole('textbox',{name:'生成先Dialog入力'}).fill('Dialogの下書き');
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();
    await opener.click();await expect(dialog.getByRole('textbox',{name:'生成先Dialog入力'})).toHaveValue('Dialogの下書き');await dialog.getByRole('button',{name:'完了',exact:true}).click();
    await expect(page.getByTestId('consumer-close')).toHaveText('confirm');
    await mark('date',profile);
    await page.locator('#date').fill('2026-10-05');await expect(page.getByTestId('consumer-date')).toHaveText('2026-10-05');
    await page.getByRole('button',{name:'生成先通知を表示'}).click();
    await mark('notification',profile);
    const notice=page.locator('ui-snackbar').filter({hasText:'生成先の通知'});await expect(notice.getByRole('status')).toBeVisible();
    await notice.getByRole('button',{name:'内容を確認'}).click();await expect(notice.getByRole('status')).toBeHidden();
    await mark('layout',profile);
    const panel=page.locator('ui-panel');await page.getByRole('textbox',{name:'生成したPanel入力'}).fill('別出力のPanel');await panel.getByRole('button',{name:'折り畳む: 生成したPanel'}).click();await expect(page.getByRole('textbox',{name:'生成したPanel入力'})).toBeHidden();await panel.getByRole('button',{name:'展開: 生成したPanel'}).click();await expect(page.getByRole('textbox',{name:'生成したPanel入力'})).toHaveValue('別出力のPanel');
    await page.getByRole('textbox',{name:'生成したAccordion入力'}).fill('別出力のAccordion');await page.getByRole('button',{name:'次のAccordion',exact:true}).click();await expect(page.getByRole('textbox',{name:'生成したAccordion入力'})).toBeHidden();await page.getByRole('button',{name:'生成したAccordion',exact:true}).click();await expect(page.getByRole('textbox',{name:'生成したAccordion入力'})).toHaveValue('別出力のAccordion');
    const splitter=page.locator('ui-splitter');await splitter.getByRole('separator').press('ArrowRight');await expect(splitter.getByRole('separator')).toHaveAttribute('aria-valuenow','45');await page.getByRole('textbox',{name:'生成したSplitter入力'}).fill('別出力の分割');await splitter.getByRole('separator').press('Enter');await expect(page.getByRole('textbox',{name:'生成したSplitter入力'})).toBeHidden();await splitter.getByRole('separator').press('Enter');await expect(page.getByRole('textbox',{name:'生成したSplitter入力'})).toHaveValue('別出力の分割');await expect(page.locator('ui-grid')).toHaveAttribute('data-columns','1');
    const scroll=page.getByRole('region',{name:'生成したScroll',exact:true});await scroll.evaluate(element=>element.scrollTo({top:100}));await expect.poll(()=>scroll.evaluate(element=>element.scrollTop)).toBe(100);
    const mediaGeometry=await page.getByTitle('生成した埋込プレビュー',{exact:true}).evaluate(element=>{const media=element.getBoundingClientRect(),host=element.parentElement.getBoundingClientRect();return {media:[media.width,media.height],host:[host.width,host.height],overflow:element.parentElement.scrollHeight-element.parentElement.clientHeight};});assert.ok(Math.abs(mediaGeometry.media[0]-mediaGeometry.host[0])<1&&Math.abs(mediaGeometry.media[1]-mediaGeometry.host[1])<1&&mediaGeometry.overflow<=1);
    await mark('actions',profile);
    const iconButton=page.getByRole('button',{name:'生成した確認',exact:true});await iconButton.press('Space');await expect(iconButton).toHaveAttribute('aria-pressed','true');const toggle=page.getByRole('button',{name:'生成した固定',exact:true});await toggle.press('Enter');await expect(toggle).toHaveAttribute('aria-pressed','true');
    await page.locator('ui-segmented-control').getByRole('radio',{name:'履歴',exact:true}).check();await expect(page.getByTestId('consumer-segment')).toHaveText('history');
    await page.getByRole('button',{name:'生成した保存',exact:true}).click();await page.getByRole('button',{name:'生成した保存補助',exact:true}).click();await page.getByRole('menuitem',{name:'生成した出力',exact:true}).click();await expect(page.getByTestId('consumer-action')).toHaveText('1 / export');
    await page.getByRole('toolbar',{name:'生成した操作帯',exact:true}).getByRole('button',{name:'その他の操作',exact:true}).press('ArrowDown');await page.getByRole('menuitem',{name:'生成した履歴を確認',exact:true}).click();await expect(page.getByTestId('consumer-action')).toHaveText('1 / history');
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.getByRole('button',{name:'生成した内容をコピー',exact:true}).click();await expect(page.getByTestId('consumer-copy')).toHaveText('true');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'生成物だけのコピー');
    await page.getByRole('button',{name:'生成した固定操作を表示',exact:true}).click();await page.getByRole('button',{name:'生成した追加',exact:true}).click();await page.getByRole('button',{name:'生成した補助',exact:true}).click();await page.getByRole('menuitem',{name:'前回を再利用',exact:true}).click();await expect(page.getByTestId('consumer-action')).toHaveText('2 / reuse');await page.getByRole('button',{name:'生成した固定操作を隠す',exact:true}).click();await expect(page.locator('ui-floating-action-button')).toBeHidden();
    await mark('feedback',profile);
    await page.getByRole('button',{name:'生成した結果を確認',exact:true}).click();await expect(page.getByTestId('consumer-feedback')).toHaveText('1');await page.locator('ui-async-region').getByRole('button',{name:'再試行',exact:true}).click();await expect(page.locator('ui-async-region')).toHaveAttribute('data-state','loading');await page.getByRole('button',{name:'生成した取得結果を返す',exact:true}).click();await page.getByRole('textbox',{name:'生成した取得領域の入力',exact:true}).fill('生成した再取得後の入力');
    await page.getByTestId('consumer-alert-busy').dispatchEvent('click');const nestedAlertAction=page.getByRole('button',{name:'生成した入れ子通知の操作',exact:true});await expect(nestedAlertAction).toBeEnabled();await nestedAlertAction.focus();await expect(nestedAlertAction).toBeFocused();await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');await expect(nestedAlertAction).toBeFocused();await nestedAlertAction.press('Enter');await expect(page.getByTestId('consumer-nested-alert')).toHaveText('1');await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');await page.getByTestId('consumer-alert-busy').dispatchEvent('click');
    const alertClose=page.locator('ui-alert').getByRole('button',{name:'通知を閉じる',exact:true});await alertClose.focus();await expect(alertClose).toBeFocused();await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');await expect(alertClose).toHaveCount(0);await expect(page.locator('ui-alert > .ui-feedback-frame > div > .ui-feedback-message')).toBeFocused();await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');
    await page.locator('ui-alert').getByRole('button',{name:'通知を閉じる',exact:true}).click();await expect(page.locator('ui-alert')).toBeHidden();await page.getByRole('button',{name:'生成した記録を追加',exact:true}).click();await page.getByRole('button',{name:'生成した一覧へ戻る',exact:true}).click();await expect(page.getByTestId('consumer-state')).toHaveText('2');
    assert.equal(await page.getByRole('progressbar',{name:'生成した進捗',exact:true}).evaluate(element=>element.position),.2);await page.getByRole('button',{name:'生成した進捗を取消',exact:true}).click();await expect(page.getByTestId('consumer-cancel')).toHaveText('1');await expect(page.getByRole('progressbar',{name:'生成した円形進捗',exact:true})).toHaveAttribute('aria-valuenow','25');await expect(page.locator('ui-skeleton .ui-skeleton-line')).toHaveCount(2);
    const blockedDraft=page.getByRole('textbox',{name:'生成した抑止領域の入力',exact:true});await blockedDraft.fill('生成した保留中の入力');const blockOpener=page.getByRole('button',{name:'生成した領域を抑止',exact:true});await blockOpener.click();await expect(blockOpener).toBeFocused();await expect(page.locator('ui-loading-overlay .ui-loading-content')).toHaveAttribute('inert');await page.getByRole('button',{name:'生成した領域の処理を取消',exact:true}).click();await expect(blockedDraft).toHaveValue('生成した保留中の入力');await expect(blockOpener).toBeFocused();
    await page.getByRole('button',{name:'既読にする: 生成した未読通知',exact:true}).click();await expect(page.getByRole('button',{name:'未読に戻す: 生成した未読通知',exact:true})).toBeVisible();await page.getByRole('button',{name:'削除: 生成した未読通知',exact:true}).click();await expect(page.locator('ui-notification-center [data-notice]')).toHaveCount(0);
    const tourDraft=page.getByRole('textbox',{name:'生成した案内の入力',exact:true});await tourDraft.fill('生成した案内で保持');const tourOpener=page.getByRole('button',{name:'生成した案内を再開',exact:true});await tourOpener.click();await page.getByRole('dialog',{name:'生成した最初の案内',exact:true}).getByRole('button',{name:'次へ',exact:true}).click();await page.keyboard.press('Escape');await expect(tourOpener).toBeFocused();await tourOpener.click();await page.getByRole('dialog',{name:'生成した次の案内',exact:true}).getByRole('button',{name:'案内を完了',exact:true}).click();await expect(page.getByTestId('consumer-tour')).toHaveText('completed');await expect(tourDraft).toHaveValue('生成した案内で保持');
    await expect(page.getByRole('heading',{name:'生成した表示',level:2,exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'生成した件数 123',exact:true})).toHaveText('99+');
    const tag=page.locator('ui-tag');await tag.getByRole('button',{name:'生成したタグ',exact:true}).press('Enter');await expect(tag.getByRole('button',{name:'生成したタグ',exact:true})).toHaveAttribute('aria-pressed','true');await tag.getByRole('button',{name:'生成したタグを削除',exact:true}).press('Enter');await expect(tag).toHaveCount(0);await expect(page.getByRole('button',{name:'生成したタグへ戻る',exact:true})).toBeFocused();
    await expect(page.locator('ui-avatar').first().getByRole('img',{name:'Ada Lovelace',exact:true})).toHaveText('AL');await page.locator('ui-avatar-group summary').press('Enter');await expect(page.locator('ui-avatar-group').getByText('担当者 乙',{exact:true})).toBeVisible();await expect(page.locator('ui-descriptions dd')).toHaveText('生成した値: 0');await expect(page.locator('ui-statistic')).toContainText('比較できません');await expect(page.getByRole('meter',{name:'生成したMeter',exact:true})).toHaveAttribute('optimum','50');await expect(page.getByRole('meter',{name:'生成した区分の値',exact:true})).toHaveAttribute('value','20');
    await expect(page.getByRole('textbox',{name:'生成した説明の入力',exact:true})).toHaveAttribute('aria-describedby','consumer-help');await expect(page.getByRole('region',{name:'生成した表示部品',exact:true}).locator('ui-shortcut-hint kbd')).toHaveText(['⌘','Enter']);await expect(page.locator('code[uiInlineCode]')).toHaveText('value === null');const read=page.locator('ui-read-more');await read.getByRole('button',{name:'全文を表示',exact:true}).press('Enter');await expect(read.getByRole('button',{name:'折り畳む',exact:true})).toHaveAttribute('aria-expanded','true');
    const code=page.locator('ui-code-block pre code');await expect(code).toContainText('"a": 1e999');await page.locator('ui-code-block').getByRole('button',{name:'コードをコピー',exact:true}).click();await expect(page.getByTestId('consumer-display-copy')).toHaveText('true');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),(await code.locator('.ui-code-text').allTextContents()).join('\n'));const water=page.getByRole('textbox',{name:'生成した透かし内の入力',exact:true});await water.fill('入力保持');await page.getByRole('button',{name:'生成した透かし内の操作',exact:true}).press('Enter');await expect(page.getByTestId('consumer-watermark-result')).toHaveText('1');await expect(water).toHaveValue('入力保持');await expect(page.locator('ui-watermark pattern')).toHaveAttribute('height',profile==='guided'?'128':'96');
    await mark('structured forms',profile);
    await expect(page.locator('#consumer-mask')).toHaveValue('001-23');await page.locator('#consumer-mask').fill('000-99');await page.locator('#consumer-otp').fill('001235');await page.locator('#consumer-tokens').fill('確認');await page.locator('#consumer-tokens').press('Enter');await expect(page.getByTestId('consumer-structured')).toContainText('00099 / 001235 / 確認');await page.getByRole('radio',{name:'生成した窓口',exact:true}).check();
    await page.getByRole('button',{name:'生成した入力を取消',exact:true}).click();await page.getByRole('button',{name:'生成した入力を送信',exact:true}).click();await expect(page.getByTestId('consumer-structured')).toContainText('/ 1 / 1');await page.locator('#consumer-custom-combo').fill('総務');await page.locator('#consumer-custom-combo').press('ArrowDown');await expect(page.locator('#consumer-custom-combo-list').getByRole('option')).toContainText('候補コード a');assert.equal(await page.locator('#consumer-custom-combo-list').evaluate(element=>element.matches(':popover-open')),true);await page.locator('#consumer-custom-combo').press('Enter');await expect(page.locator('#consumer-custom-combo')).toHaveValue('総務');await page.getByRole('button',{name:'生成した入力を戻す',exact:true}).click();await expect(page.locator('#consumer-mask')).toHaveValue('');await expect(page.locator('#consumer-tokens')).toHaveValue('');
    await mark('floating panels',profile);
    const popupAnchor=page.getByRole('button',{name:'生成した補助を開く',exact:true}),popup=page.locator('#consumer-popup');await popupAnchor.click();await popup.getByRole('textbox',{name:'生成した浮動入力',exact:true}).fill('生成した下書き');await popup.getByRole('button',{name:'生成した補助を終了',exact:true}).click();await expect(popupAnchor).toBeFocused();await popupAnchor.click();await expect(popup.getByRole('textbox')).toHaveValue('生成した下書き');await page.keyboard.press('Escape');
    const tooltipAnchor=page.getByRole('button',{name:'生成した説明の対象',exact:true});await tooltipAnchor.focus();await expect(page.locator('#consumer-tooltip')).toBeVisible();await expect(tooltipAnchor).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#consumer-tooltip')).toBeHidden();
    await page.getByRole('button',{name:'生成したプレビューを開く',exact:true}).press('Enter');await page.locator('#consumer-hover').getByRole('button',{name:'生成したプレビュー操作',exact:true}).click();await expect(page.getByTestId('consumer-preview')).toHaveText('1');await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'生成した確認を開く',exact:true}).click();await page.locator('#consumer-confirm-popup').getByRole('button',{name:'確認する',exact:true}).click();await expect(page.locator('#consumer-confirm-popup').getByRole('button',{name:'確認する',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(page.locator('#consumer-confirm-popup')).toBeVisible();await page.getByRole('button',{name:'生成した確認の結果を返す',exact:true}).click();await expect(page.getByTestId('consumer-confirm-result')).toHaveText('1 / confirm');
    await page.getByRole('button',{name:'生成したDrawerを開く',exact:true}).click();const drawer=page.getByRole('dialog',{name:'生成した端の領域',exact:true});await drawer.getByRole('textbox').fill('入力を保持');await drawer.getByRole('button',{name:'生成した領域を終了',exact:true}).click();await page.getByRole('button',{name:'生成したDrawerを開く',exact:true}).click();await expect(drawer.getByRole('textbox')).toHaveValue('入力を保持');assert.equal((await drawer.boundingBox()).x,0);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'生成したSheetを開く',exact:true}).click();const sheet=page.getByRole('dialog',{name:'生成した段階領域',exact:true});await sheet.getByRole('textbox').fill('段階を変更しても保持');await sheet.getByRole('slider').focus();await sheet.getByRole('slider').press('End');await expect(sheet.getByRole('slider')).toHaveValue('1');await expect(sheet.getByRole('textbox')).toHaveValue('段階を変更しても保持');await page.keyboard.press('Escape');
    await mark('navigation',profile);
    const nativeNav=page.getByRole('navigation',{name:'生成した画面移動',exact:true});await expect(nativeNav).toHaveAttribute('data-direction','vertical');await expect(nativeNav.getByRole('link')).toHaveAttribute('aria-current','page');await nativeNav.getByRole('link').click();await expect(page).toHaveURL(/#consumer-nav-target$/);
    const sideNav=page.getByRole('navigation',{name:'生成した階層',exact:true});await expect(sideNav.getByRole('link',{name:'生成した子',exact:true})).toHaveAttribute('aria-current','page');await sideNav.getByRole('button',{name:'移動先を折り畳む',exact:true}).click();await expect(sideNav).toHaveAttribute('data-collapsed','true');await sideNav.locator('summary').click();await expect(sideNav.getByRole('link',{name:'生成した子',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'生成した短い移動先',exact:true}).getByRole('link')).toHaveAttribute('aria-current','page');
    const crumbs=page.getByRole('navigation',{name:'生成した現在地',exact:true});await crumbs.locator('summary').press('Enter');await expect(crumbs.getByRole('link',{name:'生成した途中2',exact:true})).toBeVisible();
    await page.getByRole('navigation',{name:'生成したページ内移動',exact:true}).getByRole('link').click();await expect(page.locator('#consumer-nav-target')).toBeFocused();assert.equal(Math.round(await page.locator('#consumer-nav-target').evaluate(element=>element.getBoundingClientRect().top)),24);
    const navTabs=page.getByRole('tablist',{name:'生成した内容タブ',exact:true}),navTab=navTabs.getByRole('tab',{name:'生成した概要',exact:true}),navDraft=page.getByRole('textbox',{name:'生成した概要の入力',exact:true});await navDraft.fill('別の生成先でも保持');const navHandle=await navDraft.elementHandle();await navTab.focus();await navTab.press('Alt+ArrowRight');await expect(navTabs.getByRole('tab').last()).toHaveAccessibleName('生成した概要');await expect(navDraft).toHaveValue('別の生成先でも保持');assert.equal(await navDraft.evaluate((element,other)=>element===other,navHandle),true);await navTab.press('Delete');await expect(navTabs.getByRole('tab',{name:'生成した詳細',exact:true})).toBeFocused();
    const bar=page.getByRole('menubar',{name:'生成した操作バー',exact:true});await bar.getByRole('menuitem',{name:'生成したFile',exact:true}).focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowRight');await expect(page.getByRole('menuitem',{name:'生成したCSV',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByTestId('consumer-nav-menu')).toHaveText('file/export/csv');
    const megaAnchor=page.getByRole('button',{name:'生成した分類を開く',exact:true});await megaAnchor.click();await expect(page.locator('#consumer-mega').getByRole('heading',{name:'生成した分類の見出し',exact:true})).toBeVisible();await expect(page.locator('#consumer-mega').getByRole('link',{name:'生成した分類のリンク',exact:true})).toHaveAttribute('href','#consumer-nav-target');await page.keyboard.press('Escape');await expect(megaAnchor).toBeFocused();
    const commandAnchor=page.getByRole('button',{name:'生成したコマンドを開く',exact:true});await commandAnchor.focus();await page.keyboard.press('Control+Alt+k');const palette=page.getByRole('dialog',{name:'生成したコマンド検索',exact:true}),paletteSearch=palette.getByRole('combobox',{name:'コマンドを検索',exact:true});await expect(paletteSearch).toBeFocused();await paletteSearch.fill('records');await page.keyboard.press('Enter');await expect(palette).toHaveAttribute('aria-busy','true');await expect(page.getByTestId('consumer-nav-commands')).toHaveText('1 / save');await page.keyboard.press('Enter');await expect(page.getByTestId('consumer-nav-commands')).toHaveText('1 / save');await palette.getByRole('button',{name:'生成した実行結果を返す',exact:true}).click();await expect(commandAnchor).toBeFocused();await commandAnchor.click();await expect(paletteSearch).toHaveValue('records');await page.keyboard.press('Escape');
    await mark('choices',profile);
    const choiceSlider=page.locator('#consumer-choice-slider');await choiceSlider.focus();await page.keyboard.press('ArrowRight');await expect(choiceSlider).toHaveValue('22');
    const choiceStart=page.locator('#consumer-choice-range-start'),choiceEnd=page.locator('#consumer-choice-range-end');await choiceStart.focus();await page.keyboard.press('End');await expect(choiceStart).toHaveValue('26');await choiceEnd.focus();await page.keyboard.press('Home');await expect(choiceEnd).toHaveValue('26');
    const choiceKnob=page.locator('#consumer-choice-knob');await choiceKnob.focus();await page.keyboard.press('ArrowRight');await expect(choiceKnob).toHaveValue('55');
    await page.locator('ui-rating').getByRole('radio',{name:'3.5 / 5',exact:true}).check();
    const choiceColor=page.locator('#consumer-choice-color-text');await choiceColor.fill('hsl(');await expect(choiceColor).toHaveValue('hsl(');await expect(choiceColor).toHaveAttribute('aria-invalid','true');await page.locator('ui-color-picker').getByRole('button',{name:'生成した透明な赤',exact:true}).click();await expect(choiceColor).not.toHaveAttribute('aria-invalid','true');
    const choiceEdit=page.locator('ui-inline-edit');await choiceEdit.getByRole('button',{name:'編集',exact:true}).click();await page.locator('#consumer-choice-inline').fill('別生成先の保存値');await page.locator('#consumer-choice-inline').press('Enter');await expect(page.locator('#consumer-choice-inline')).toBeHidden();await expect(choiceEdit).toContainText('別生成先の保存値');await expect(page.getByTestId('consumer-choice-values')).toHaveText(/^22 \/ 26-26 \/ 55 \/ 3\.5 \/ hsla\(0, 100%, 50%, 0\.502\) \/ 別生成先の保存値$/);
    const choiceWizard=page.locator('ui-wizard'),choiceDraft=page.getByRole('textbox',{name:'生成した段階のメモ',exact:true}),choiceHandle=await choiceDraft.elementHandle();await choiceDraft.fill('別生成先も同じDOM');await choiceWizard.getByRole('button',{name:'次へ',exact:true}).click();await expect(choiceWizard.getByRole('heading',{name:'生成した確認段階',exact:true})).toBeFocused();await expect(choiceWizard.getByRole('heading',{name:'生成した省略段階',exact:true})).toBeHidden();await choiceWizard.getByRole('button',{name:'戻る',exact:true}).click();await expect(choiceDraft).toHaveValue('別生成先も同じDOM');assert.equal(await choiceDraft.evaluate((e,old)=>e===old,choiceHandle),true);
    const choiceFilter=page.locator('ui-filter-builder');await choiceFilter.getByRole('button',{name:'条件を追加',exact:true}).click();await choiceFilter.getByRole('textbox',{name:'値',exact:true}).fill('15');await choiceFilter.getByRole('combobox',{name:'演算子',exact:true}).selectOption('gte');await expect(page.getByTestId('consumer-choice-matched')).toHaveText('1');await choiceFilter.getByRole('button',{name:'条件を保存',exact:true}).click();await choiceFilter.getByRole('button',{name:'条件を解除',exact:true}).click();await expect(page.getByTestId('consumer-choice-matched')).toHaveText('2');await choiceFilter.getByRole('button',{name:'保存した条件へ戻す',exact:true}).click();await expect(page.getByTestId('consumer-choice-matched')).toHaveText('1');
    await mark('collections',profile);
    await expect(page.locator('ui-list').getByRole('listitem')).toHaveCount(3);
    const collectionView=page.locator('ui-data-view'),collectionEditor=collectionView.getByRole('textbox',{name:'生成記録1の編集',exact:true}),collectionEditorHandle=await collectionEditor.elementHandle();await collectionEditor.fill('別生成先の入力');await collectionView.getByRole('button',{name:'グリッド表示',exact:true}).click();await expect(collectionEditor).toHaveValue('別生成先の入力');assert.equal(await collectionEditor.evaluate((element,other)=>element===other,collectionEditorHandle),true);await collectionView.getByRole('searchbox').fill('生成記録3');await expect(collectionView.locator('li')).toHaveCount(1);
    const generatedBox=page.getByRole('listbox',{name:'生成した複数候補',exact:true});await generatedBox.focus();await expect(generatedBox).toHaveAttribute('aria-activedescendant',/.+/);await page.keyboard.press('End');await page.keyboard.press('Space');await expect(page.getByTestId('consumer-collection-selection')).toHaveText('a,b');
    const generatedViewport=page.locator('ui-virtual-list cdk-virtual-scroll-viewport');await generatedViewport.focus();await page.keyboard.press('End');await expect(page.locator('ui-virtual-list').getByRole('listitem').last()).toHaveAttribute('aria-posinset','1000');assert.ok(await page.locator('ui-virtual-list').getByRole('listitem').count()<30);await page.keyboard.press('Home');
    const generatedSort=page.locator('ui-sortable-list');await generatedSort.getByRole('button',{name:'生成記録1を下へ',exact:true}).click();await expect(page.getByTestId('consumer-collection-order')).toHaveText('2,1,3');await generatedSort.getByRole('button',{name:'生成記録1の移動位置を選ぶ',exact:true}).click();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await expect(page.getByTestId('consumer-collection-order')).toHaveText('1,2,3');
    const generatedInfinite=page.locator('ui-infinite-scroll').filter({has:page.getByRole('button',{name:'さらに読み込む',exact:true})}).first();await generatedInfinite.getByRole('button').click();await expect(page.getByTestId('consumer-collection-loads')).toHaveText('1');await expect(generatedInfinite.getByRole('button')).toBeDisabled();await page.getByRole('button',{name:'生成した追加取得を完了',exact:true}).click();await expect(generatedInfinite.getByRole('button')).toBeEnabled();
    const generatedTransfer=page.locator('ui-transfer-list');await generatedTransfer.getByRole('checkbox',{name:'生成記録1',exact:true}).check();await generatedTransfer.getByRole('button',{name:'一括追加',exact:true}).click();await expect(page.getByTestId('consumer-collection-transfer')).toHaveText('1');await generatedTransfer.getByRole('button',{name:'生成記録1を削除',exact:true}).click();await expect(page.getByTestId('consumer-collection-transfer')).toHaveText('');
    const generatedTimeline=page.locator('ui-timeline');await expect(generatedTimeline.locator('time')).toHaveAttribute('datetime','2026-10-06T01:00:00.000Z');await expect(generatedTimeline.locator('time')).toContainText('10:00');await generatedTimeline.locator('summary').click();const historyInput=generatedTimeline.getByRole('textbox',{name:'生成した受付の詳細入力',exact:true}),historyInputHandle=await historyInput.elementHandle();await historyInput.fill('詳細を保持');await generatedTimeline.locator('summary').click();await generatedTimeline.locator('summary').click();await expect(historyInput).toHaveValue('詳細を保持');assert.equal(await historyInput.evaluate((element,other)=>element===other,historyInputHandle),true);
    assert.deepEqual(errors,[]);results.push({profile,forms:true,cardRetention:true,recursiveMenu:true,dialogResultFocus:true,civilDate:true,notificationAction:true,layoutRetention:true,splitterKeyboard:true,scroll:true,actionsSelection:true,toolbarOverflow:true,clipboard:true,floatingAction:true,feedbackRecovery:true,nativeProgress:true,loadingRetention:true,notificationReadDelete:true,tourResume:true,displayNativeSemantics:true,displayFormatting:true,displayFocusRetention:true,displayClipboard:true,watermarkInput:true,structuredInputs:true,nativeFormActions:true,typedComboboxPopover:true,floatingPanels:true,tooltipFocus:true,hoverActions:true,confirmationIntent:true,drawerRetention:true,sheetKeyboard:true,nativeNavigation:true,hierarchicalNavigation:true,breadcrumbFolding:true,anchorOffsetFocus:true,tabReorderRetention:true,menubarCommands:true,megaMenuGroups:true,paletteHistoryBusy:true,numericChoiceCva:true,colorRawRecovery:true,inlineAppConfirmation:true,wizardBranchDomRetention:true,recursiveConditions:true,nativeCollectionActions:true,dataViewEditorRetention:true,groupedListboxCva:true,virtualThousandRows:true,cancelableKeyMovement:true,originalHostLoadAck:true,transferCva:true,explicitTimelineZoneRetention:true,consoleErrors:errors});
    await page.close();
  }
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
await mark('complete');
console.log(JSON.stringify({profiles:results,independentOutput:'foundation',runtime:true}));
