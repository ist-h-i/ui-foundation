import {test,expect} from './catalog-test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';

for(const profile of profiles){
 test(`Specialist ${profile}: sparkline names map to visible series and technical tables scroll locally`,async({page},info)=>{
  await openSpecialistCatalog(page,profile);await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
  const sparkline=page.locator('ui-sparkline'),legend=sparkline.getByRole('list',{name:'凡例',exact:true});await expect(legend.getByRole('listitem')).toHaveCount(2);
  const colors=await sparkline.evaluate(root=>({legend:[...root.querySelectorAll('.ui-sparkline-swatch')].map(mark=>getComputedStyle(mark).borderBlockStartColor),marks:[...root.querySelectorAll('svg path')].flatMap(mark=>[getComputedStyle(mark).fill,getComputedStyle(mark).stroke])}));
  for(const color of colors.legend)expect(colors.marks).toContain(color);
  const chart=page.locator('#chart > ui-chart'),selection=chart.getByRole('button',{name:'承認を選択',exact:true});await selection.focus();await selection.press('Space');await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  const chartGeometry=await chart.locator('table').evaluate(table=>{const local=table.closest('.ui-specialist-scroll')!;return {table:table.getBoundingClientRect().width,viewport:local.clientWidth,scroll:local.scrollWidth,column:table.querySelector('th')!.getBoundingClientRect().width};});
  expect(chartGeometry.scroll).toBeGreaterThan(chartGeometry.viewport);expect(chartGeometry.column).toBeGreaterThan(150);
  await openSpecialistSurface(page,'Diff / JSON');const json=page.locator('ui-json-viewer');await json.getByRole('button',{name:'"nested" を展開',exact:true}).click();await json.getByLabel('JSONを検索',{exact:true}).fill('false');await expect(json.locator('tbody')).toContainText('false');
  expect(await json.locator('table').evaluate(table=>{const local=table.closest('.ui-specialist-scroll')!;return local.scrollWidth>local.clientWidth;})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await info.attach('sparkline-and-table-observation',{body:JSON.stringify({profile,colors,chartGeometry}),contentType:'application/json'});
 });

 test(`Specialist ${profile}: technical source stays LTR while its controls and markdown preview follow RTL`,async({page})=>{
  await openSpecialistCatalog(page,profile);await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
  await openSpecialistSurface(page,'Code');const code=page.locator('#code .cm-content'),draft='const nextTotal = 12;\n// 保持する説明';await code.fill(draft);await page.getByLabel('言語',{exact:true}).selectOption('typescript');await expect(code).toHaveText(draft,{useInnerText:true});
  expect(await code.evaluate(element=>getComputedStyle(element).direction)).toBe('ltr');expect(await page.getByLabel('言語',{exact:true}).evaluate(element=>getComputedStyle(element).direction)).toBe('rtl');
  await page.getByRole('button',{name:/プロファイル:/}).click();await expect(code).toHaveText(draft,{useInnerText:true});expect(await code.evaluate(element=>getComputedStyle(element).direction)).toBe('ltr');
  await openSpecialistSurface(page,'Markdown');expect(await page.locator('#markdown .cm-content').evaluate(element=>getComputedStyle(element).direction)).toBe('ltr');expect(await page.locator('#markdown ui-markdown-preview').evaluate(element=>getComputedStyle(element).direction)).toBe('rtl');
  await openSpecialistSurface(page,'Diff / JSON');for(const editor of await page.locator('ui-diff-viewer .cm-content').all())expect(await editor.evaluate(element=>getComputedStyle(element).direction)).toBe('ltr');
  expect(await page.locator('ui-diff-viewer section').evaluate(element=>getComputedStyle(element).direction)).toBe('rtl');await page.locator('ui-diff-viewer summary').click();
  for(const source of await page.locator('ui-diff-viewer pre').all())expect(await source.evaluate(element=>getComputedStyle(element).direction)).toBe('ltr');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 });

 test(`Chat ${profile}: keyboard send retains draft and owned focus through failure and completion at 320px RTL`,async({page},info)=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Chat');await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
  const composer=page.locator('ui-message-composer'),textbox=composer.getByRole('textbox'),draft='申請の内容と添付を確認して担当者へ連絡してください。';await textbox.fill(draft);await composer.getByLabel('添付ファイル',{exact:true}).setInputFiles({name:'確認資料.txt',mimeType:'text/plain',buffer:Buffer.from('retained attachment')});
  const native=await textbox.elementHandle();await composer.getByRole('button',{name:'送信',exact:true}).focus();await composer.getByRole('button',{name:'送信',exact:true}).press('Enter');
  const status=composer.locator('[data-chat-send-status]');await expect(status).toBeFocused();await expect(status).toHaveText('送信中');await expect(textbox).toBeDisabled();await expect(textbox).toHaveValue(draft);
  await page.getByRole('button',{name:'送信失敗を反映',exact:true}).evaluate(button=>(button as HTMLButtonElement).click());await expect(textbox).toBeFocused();await expect(textbox).toHaveValue(draft);await expect(composer.getByRole('alert')).toContainText('送信に失敗');await expect(composer).toContainText('確認資料.txt');
  expect(await textbox.evaluate((element,previous)=>element===previous,native)).toBe(true);
  await composer.getByRole('button',{name:'送信',exact:true}).focus();await composer.getByRole('button',{name:'送信',exact:true}).press('Space');await expect(status).toBeFocused();await page.getByRole('button',{name:'送信成功を反映',exact:true}).evaluate(button=>(button as HTMLButtonElement).click());await expect(textbox).toBeFocused();await expect(textbox).toHaveValue('');
  const metadata=await page.locator('ui-message-list .ui-message-meta').first().evaluate(element=>({gap:getComputedStyle(element).gap,author:element.querySelector('strong')?.textContent,time:element.querySelector('time')?.textContent,timeDirection:getComputedStyle(element.querySelector('time')!).direction}));
  expect(parseFloat(metadata.gap)).toBeGreaterThan(0);expect(metadata.author).toBeTruthy();expect(metadata.time).toBeTruthy();expect(metadata.timeDirection).toBe('ltr');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);await info.attach('chat-draft-focus-metadata',{body:JSON.stringify({profile,metadata,focused:await textbox.evaluate(element=>element===document.activeElement)}),contentType:'application/json'});
 });

 test(`Chat ${profile}: an app response and synchronous focus transfer preserve external focus`,async({page})=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Chat');const composer=page.locator('ui-message-composer'),textbox=composer.getByRole('textbox'),outside=page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Chat',exact:true});
  await textbox.fill('外部へ移っても保持する下書き');const send=composer.getByRole('button',{name:'送信',exact:true});await send.focus();await send.press('Enter');await expect(composer.locator('[data-chat-send-status]')).toBeFocused();
  await outside.focus();await page.getByRole('button',{name:'送信失敗を反映',exact:true}).evaluate(button=>(button as HTMLButtonElement).click());await expect(outside).toBeFocused();await expect(textbox).toHaveValue('外部へ移っても保持する下書き');
  await send.evaluate(button=>{const target=[...document.querySelectorAll<HTMLElement>('nav[aria-label="専門部品"] button')].find(item=>item.textContent?.trim()==='Chat')!;button.closest('form')!.addEventListener('submit',()=>target.focus(),{once:true});});
  await send.focus();await send.press('Enter');await expect(outside).toBeFocused();await expect(composer.getByRole('button',{name:'送信中',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'送信成功を反映',exact:true}).evaluate(button=>(button as HTMLButtonElement).click());await expect(outside).toBeFocused();await expect(textbox).toHaveValue('');
 });
}
