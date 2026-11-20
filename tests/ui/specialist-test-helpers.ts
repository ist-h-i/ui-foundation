import {readFile} from 'node:fs/promises';
import type {Page} from '@playwright/test';
import {expect} from './catalog-test';

export const profiles=['guided','dense'] as const;
export type SpecialistProfile=typeof profiles[number];
export const specialistSurfaces={Chart:'chart',Map:'map',Gantt:'gantt',Kanban:'kanban',Spreadsheet:'sheet',RichText:'rich',Markdown:'markdown',Code:'code','Diff / JSON':'diff',FileExplorer:'files',Diagram:'flow',Chat:'chat'} as const;
export type SpecialistSurface=keyof typeof specialistSurfaces;
const observedWorkers=new WeakMap<Page,string[]>();

/** Each caller starts an actual fresh catalog, without private Angular inspection. */
export async function openSpecialistCatalog(page:Page,profile:SpecialistProfile):Promise<void>{
 const workers:string[]=[];observedWorkers.set(page,workers);page.on('worker',worker=>workers.push(worker.url()));
 await page.goto('/catalog/specialist');
 await expect(page.getByRole('heading',{name:'グラフ・地図・編集・会話',exact:true})).toBeVisible();
 await changeSpecialistProfile(page,profile);
 await expect(page.locator('#chart > ui-chart svg')).toBeVisible();
}

export async function changeSpecialistProfile(page:Page,profile:SpecialistProfile):Promise<void>{
 const main=page.locator('main[data-ui-profile]');
 if(await main.getAttribute('data-ui-profile')!==profile)await page.getByRole('button',{name:/プロファイル:/}).click();
 await expect(main).toHaveAttribute('data-ui-profile',profile);
}

export async function openSpecialistSurface(page:Page,name:SpecialistSurface):Promise<void>{
 await page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name,exact:true}).click();
 const section=page.locator('#'+specialistSurfaces[name]);await expect(section).toBeVisible();
 switch(name){
  case 'Map':await expect(section.locator('[data-map-ready]')).toHaveAttribute('data-map-ready','true');break;
  case 'Gantt':await expect(section.locator('.ui-specialist-surface svg')).toBeVisible();break;
  case 'Spreadsheet':await expect(section.locator('[data-sheet-cell="0,2"]')).not.toHaveValue('');await expect(section).not.toContainText('計算しています');break;
  case 'RichText':await expect(section.locator('.ui-rich-editor')).toBeVisible();break;
  case 'Markdown':case 'Code':await expect(section.locator('.cm-content')).toBeVisible();break;
  case 'Diff / JSON':await expect(section.locator('.cm-mergeView')).toBeVisible();break;
  case 'Diagram':await expect(section.locator('.ui-diagram-node').first()).toBeVisible();break;
 }
}

export function specialistWorkerUrls(page:Page):readonly string[]{return observedWorkers.get(page)??[];}

/** Real browser image load via a test-owned HTTP route; no writes to shared dist. */
export async function installSpecialistImage(page:Page):Promise<void>{
 const body=await readFile(new URL('../fixtures/specialist-image.png',import.meta.url));
 await page.route('**/specialist-image.png',route=>route.fulfill({status:200,contentType:'image/png',body}));
}

/** Prepare meaningful post-interaction states before each independent axe scan. */
export async function prepareSpecialistAccessibilityState(page:Page,name:SpecialistSurface):Promise<void>{
 await openSpecialistSurface(page,name);
 switch(name){
  case 'Chart':await page.getByRole('button',{name:'承認を選択',exact:true}).press('Space');break;
  case 'Map':await page.getByRole('button',{name:'対象区域の領域',exact:true}).press('Space');await page.locator('#map').getByRole('button',{name:'拡大',exact:true}).click();break;
  case 'Gantt':await page.getByLabel('時間軸').selectOption('week');await page.getByLabel('承認 進捗を編集',{exact:true}).fill('40');await page.getByLabel('承認 進捗を編集',{exact:true}).press('Tab');await page.getByLabel('承認 開始',{exact:true}).fill('2026-10-09');await page.getByLabel('承認 開始',{exact:true}).press('Tab');break;
  case 'Kanban':await page.getByRole('button',{name:'申請Bを前へ',exact:true}).press('Enter');await page.getByLabel('申請Aの移動先').selectOption('doing');break;
  case 'Spreadsheet':await page.getByLabel('読み込むCSV').fill('"11","2","=SUM(A1:B1)"\n"001","3","=C1*2"');await page.getByRole('button',{name:'CSVを読み込む',exact:true}).click();await expect(page.locator('[data-sheet-cell="1,2"]')).toHaveValue('26');break;
  case 'RichText':{
   const editor=page.locator('#rich .ui-rich-editor');await editor.fill('編集中の説明');await editor.press('ControlOrMeta+A');await page.getByRole('button',{name:'太字',exact:true}).click();
   const origin=new URL(page.url()).origin;await page.getByLabel('リンク・画像URL').fill(origin+'/');await page.getByRole('button',{name:'リンクを設定',exact:true}).click();
   await installSpecialistImage(page);await page.getByLabel('リンク・画像URL').fill(origin+'/specialist-image.png');await page.getByLabel('画像の代替説明').fill('確認用画像');await page.getByRole('button',{name:'画像を挿入',exact:true}).click();await expect.poll(()=>editor.getByRole('img',{name:'確認用画像'}).evaluate(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0)).toBe(true);break;
  }
  case 'Markdown':await page.locator('#markdown .cm-content').fill('# 更新した案内\n\n**確認**を続けます。');await expect(page.locator('#markdown ui-markdown-preview h1')).toHaveText('更新した案内');break;
  case 'Code':await page.locator('#code .cm-content').fill('applicationTotal');await page.getByLabel('言語',{exact:true}).selectOption('typescript');break;
  case 'Diff / JSON':await page.getByLabel('差分を検索',{exact:true}).fill('total');await page.getByRole('button',{name:'"nested" 展開',exact:true}).click();await page.getByLabel('JSONを検索',{exact:true}).fill('false');break;
  case 'FileExplorer':await page.locator('[data-explorer-id=root]').press('ArrowRight');await page.getByLabel('ファイルを検索',{exact:true}).fill('説明');await page.getByLabel('表示方式',{exact:true}).selectOption('grid');await page.locator('[data-explorer-id=txt]').press('Space');await page.getByLabel('新しい名前',{exact:true}).fill('保持する名前.txt');await page.getByRole('button',{name:'名前変更を要求',exact:true}).click();await expect(page.locator('#files [role=alert]')).toContainText('保存を拒否');break;
  case 'Diagram':await page.getByRole('button',{name:'ノードを追加',exact:true}).click();await page.getByLabel('接続元',{exact:true}).selectOption('b');await page.getByLabel('接続先',{exact:true}).selectOption('a');await page.getByRole('button',{name:'接続する',exact:true}).click();await page.getByRole('button',{name:'自動配置',exact:true}).click();await page.locator('#flow').getByRole('button',{name:'拡大',exact:true}).click();break;
  case 'Chat':{
   const composer=page.locator('ui-message-composer');await composer.getByRole('textbox').fill('保持する会話下書き');await composer.getByLabel('添付ファイル',{exact:true}).setInputFiles({name:'証憑.txt',mimeType:'text/plain',buffer:Buffer.from('fixture attachment')});await composer.getByRole('button',{name:'送信',exact:true}).click();await page.getByRole('button',{name:'送信失敗を反映',exact:true}).click();await page.getByRole('button',{name:'申請者のメッセージを再送',exact:true}).first().click();await page.getByRole('button',{name:'過去のメッセージを読み込む',exact:true}).click();await page.getByRole('button',{name:'履歴読込み失敗を反映',exact:true}).click();await page.getByRole('button',{name:'過去のメッセージを読み込む',exact:true}).click();await page.getByRole('button',{name:'履歴読込み成功を反映',exact:true}).click();await expect(composer.getByRole('textbox')).toHaveValue('保持する会話下書き');break;
  }
 }
}
