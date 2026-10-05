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
    await page.getByRole('button',{name:'生成した固定操作を表示',exact:true}).click();await page.getByRole('button',{name:'生成した追加',exact:true}).click();await page.getByRole('button',{name:'生成した補助',exact:true}).click();await page.getByRole('menuitem',{name:'前回を再利用',exact:true}).click();await expect(page.getByTestId('consumer-action')).toHaveText('2 / reuse');
    await mark('feedback',profile);
    await page.getByRole('button',{name:'生成した結果を確認',exact:true}).click();await expect(page.getByTestId('consumer-feedback')).toHaveText('1');await page.locator('ui-async-region').getByRole('button',{name:'再試行',exact:true}).click();await expect(page.locator('ui-async-region')).toHaveAttribute('data-state','loading');await page.getByRole('button',{name:'生成した取得結果を返す',exact:true}).click();await page.getByRole('textbox',{name:'生成した取得領域の入力',exact:true}).fill('生成した再取得後の入力');
    await page.getByTestId('consumer-alert-busy').dispatchEvent('click');const nestedAlertAction=page.getByRole('button',{name:'生成した入れ子通知の操作',exact:true});await expect(nestedAlertAction).toBeEnabled();await nestedAlertAction.focus();await expect(nestedAlertAction).toBeFocused();await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');await expect(nestedAlertAction).toBeFocused();await nestedAlertAction.press('Enter');await expect(page.getByTestId('consumer-nested-alert')).toHaveText('1');await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');await page.getByTestId('consumer-alert-busy').dispatchEvent('click');
    const alertClose=page.locator('ui-alert').getByRole('button',{name:'通知を閉じる',exact:true});await alertClose.focus();await expect(alertClose).toBeFocused();await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');await expect(alertClose).toHaveCount(0);await expect(page.locator('ui-alert > .ui-feedback-frame > div > .ui-feedback-message')).toBeFocused();await page.getByTestId('consumer-alert-visibility').dispatchEvent('click');
    await page.locator('ui-alert').getByRole('button',{name:'通知を閉じる',exact:true}).click();await expect(page.locator('ui-alert')).toBeHidden();await page.getByRole('button',{name:'生成した記録を追加',exact:true}).click();await page.getByRole('button',{name:'生成した一覧へ戻る',exact:true}).click();await expect(page.getByTestId('consumer-state')).toHaveText('2');
    assert.equal(await page.getByRole('progressbar',{name:'生成した進捗',exact:true}).evaluate(element=>element.position),.2);await page.getByRole('button',{name:'生成した進捗を取消',exact:true}).click();await expect(page.getByTestId('consumer-cancel')).toHaveText('1');await expect(page.getByRole('progressbar',{name:'生成した円形進捗',exact:true})).toHaveAttribute('aria-valuenow','25');await expect(page.locator('ui-skeleton .ui-skeleton-line')).toHaveCount(2);
    const blockedDraft=page.getByRole('textbox',{name:'生成した抑止領域の入力',exact:true});await blockedDraft.fill('生成した保留中の入力');const blockOpener=page.getByRole('button',{name:'生成した領域を抑止',exact:true});await blockOpener.click();await expect(blockOpener).toBeFocused();await expect(page.locator('ui-loading-overlay .ui-loading-content')).toHaveAttribute('inert');await page.getByRole('button',{name:'生成した領域の処理を取消',exact:true}).click();await expect(blockedDraft).toHaveValue('生成した保留中の入力');await expect(blockOpener).toBeFocused();
    await page.getByRole('button',{name:'既読にする: 生成した未読通知',exact:true}).click();await expect(page.getByRole('button',{name:'未読に戻す: 生成した未読通知',exact:true})).toBeVisible();await page.getByRole('button',{name:'削除: 生成した未読通知',exact:true}).click();await expect(page.locator('ui-notification-center [data-notice]')).toHaveCount(0);
    const tourDraft=page.getByRole('textbox',{name:'生成した案内の入力',exact:true});await tourDraft.fill('生成した案内で保持');const tourOpener=page.getByRole('button',{name:'生成した案内を再開',exact:true});await tourOpener.click();await page.getByRole('dialog',{name:'生成した最初の案内',exact:true}).getByRole('button',{name:'次へ',exact:true}).click();await page.keyboard.press('Escape');await expect(tourOpener).toBeFocused();await tourOpener.click();await page.getByRole('dialog',{name:'生成した次の案内',exact:true}).getByRole('button',{name:'案内を完了',exact:true}).click();await expect(page.getByTestId('consumer-tour')).toHaveText('completed');await expect(tourDraft).toHaveValue('生成した案内で保持');
    assert.deepEqual(errors,[]);results.push({profile,forms:true,cardRetention:true,recursiveMenu:true,dialogResultFocus:true,civilDate:true,notificationAction:true,layoutRetention:true,splitterKeyboard:true,scroll:true,actionsSelection:true,toolbarOverflow:true,clipboard:true,floatingAction:true,feedbackRecovery:true,nativeProgress:true,loadingRetention:true,notificationReadDelete:true,tourResume:true,consoleErrors:errors});
    await page.close();
  }
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
await mark('complete');
console.log(JSON.stringify({profiles:results,independentOutput:'foundation',runtime:true}));
