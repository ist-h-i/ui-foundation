import {test,expect} from './catalog-test';

for(const profile of ['guided','dense']) {
 test(`column conditions ${profile}: selected text and complete native dates remain readable at 320px text 200% RTL`,async({page},info)=>{
  await page.goto('/catalog');await page.locator('#catalog-profile').selectOption(profile);
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('checkbox',{name:'RTL',exact:true}).check();
  const table=page.locator('ui-data-table');await table.locator('.ui-data-table__filters > summary').click();
  const status=table.getByLabel('状態の条件',{exact:true});await status.selectOption('承認済み');
  const geometry=await status.evaluate(select=>{const element=select as HTMLSelectElement,style=getComputedStyle(element),context=document.createElement('canvas').getContext('2d')!;context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;return {text:context.measureText(element.selectedOptions[0]!.label).width,available:element.clientWidth-parseFloat(style.paddingInlineStart)-parseFloat(style.paddingInlineEnd)};});
  expect(geometry.text).toBeLessThanOrEqual(geometry.available);
  const date=table.getByLabel('申請日の条件',{exact:true});await date.fill('2026-10-01');await expect(date).toHaveValue('2026-10-01');
  await expect(date).toHaveAttribute('aria-describedby',/-date-preview-0$/);const preview=page.locator('#'+await date.getAttribute('aria-describedby'));await expect(preview).toHaveText('入力した日付: 2026-10-01');await expect(preview).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await info.attach('closed-select-readable',{body:JSON.stringify(geometry),contentType:'application/json'});
 });

 test(`table editors ${profile}: date remains identified at text 200% and grid dates retain one readable line`,async({page})=>{
  await page.goto('/catalog/tables');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);await page.setViewportSize({width:390,height:844});
  const grid=page.locator('ui-data-grid').first();
  const text=grid.locator('ui-cell-editor .ui-table-editor__display > span').filter({hasText:/2026-10-01/}).first();
  const lines=await text.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);return [...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0).map(rect=>({left:rect.left,right:rect.right,top:rect.top}));});
  expect(lines).toHaveLength(1);
  const bounds=await text.evaluate(element=>({right:element.getBoundingClientRect().right,editLeft:element.parentElement!.querySelector('button')!.getBoundingClientRect().left}));expect(bounds.right).toBeLessThanOrEqual(bounds.editLeft);
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  const editor=page.locator('ui-row-editor').first();await editor.getByRole('button',{name:'編集',exact:true}).click();
  const date=editor.locator('input[type=date]');await date.fill('2026-10-03');
  const described=(await date.getAttribute('aria-describedby'))!.split(' ');const preview=editor.locator('[id="'+described.find(id=>id.endsWith('-date-preview'))+'"]');
  await expect(preview).toHaveText('入力した日付: 2026-10-03');await expect(date).toHaveValue('2026-10-03');
  const native=await date.elementHandle();await page.getByLabel('表示設定',{exact:true}).selectOption(profile==='guided'?'dense':'guided');await expect(date).toHaveValue('2026-10-03');expect(await date.evaluate((element,old)=>element===old,native)).toBe(true);
 });

 test(`flow inputs ${profile}: adjacent cell editors never overlap at mobile and text 200% RTL`,async({page})=>{
  await page.goto('/catalog/specialist');if(profile==='dense')await page.getByRole('button',{name:/プロファイル:/}).click();await page.getByRole('button',{name:'Diagram',exact:true}).click();
  const flow=page.locator('ui-flow-editor');
  for(const state of [{width:390,font:'100%',rtl:false},{width:320,font:'200%',rtl:true}]){
   await page.setViewportSize({width:state.width,height:844});await page.evaluate(font=>document.documentElement.style.fontSize=font,state.font);
   if(state.rtl)await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
   const boxes=await flow.locator('tbody input').evaluateAll(inputs=>inputs.map(input=>{const rect=input.getBoundingClientRect(),cell=input.closest('td')!.getBoundingClientRect();return {left:rect.left,right:rect.right,cellLeft:cell.left,cellRight:cell.right};}));
   for(const box of boxes){expect(box.left).toBeGreaterThanOrEqual(box.cellLeft);expect(box.right).toBeLessThanOrEqual(box.cellRight);}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  }
  const label=flow.locator('[data-diagram-node-editor]').first(),native=await label.elementHandle();await label.fill('受付の内容を確認');await label.press('Tab');await expect(label).toHaveValue('受付の内容を確認');expect(await label.evaluate((element,old)=>element===old,native)).toBe(true);
 });

 test(`palette ${profile}: long error leaves retained Enter target uncovered at 320px text 200%`,async({page})=>{
  await page.goto('/catalog/navigation');await page.locator('main select').first().selectOption(profile);await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByLabel('長いコマンドエラー',{exact:true}).check();await page.getByTestId('palette-anchor').click();
  const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox');await search.fill('保存');await search.press('Enter');await page.getByTestId('command-fail').dispatchEvent('click');
  const name=dialog.locator('[role=option][aria-selected=true] .ui-palette-label > span').first();
  await expect.poll(()=>name.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const rect=[...range.getClientRects()].find(rect=>rect.width>0&&rect.height>0)!,recovery=element.closest('dialog')!.querySelector('.ui-palette-recovery')!.getBoundingClientRect();const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return rect.top>=recovery.bottom&&rect.bottom<=innerHeight&&(hit===element||element.contains(hit));})).toBe(true);
  await expect(search).toHaveValue('保存');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');await search.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('2');
 });
}
