import {test,expect} from './catalog-test';
import type {Locator} from '@playwright/test';

async function exposedName(name:Locator):Promise<boolean>{
 return name.evaluate(element=>{
  const range=document.createRange();range.selectNodeContents(element);
  const lines=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
  const dialog=element.closest('dialog')!,controls=dialog.querySelector('.ui-palette-controls')!,recovery=dialog.querySelector('.ui-palette-recovery');
  const covered=Math.max(controls.getBoundingClientRect().bottom,recovery?.getBoundingClientRect().bottom??0);
  return lines.length>0&&lines.every(rect=>{
   if(rect.top<covered||rect.bottom>innerHeight||rect.left<0||rect.right>innerWidth)return false;
   for(let parent:Element|null=element;parent;parent=parent.parentElement){const style=getComputedStyle(parent),box=parent.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(style.overflowY)&&(rect.top<box.top+parent.clientTop-1||rect.bottom>box.top+parent.clientTop+parent.clientHeight+1))return false;}
   const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return hit===element||element.contains(hit);
  });
 });
}

for(const profile of ['guided','dense']){
 test(`ColumnFilter ${profile}: both match meanings remain readable and changing them retains the native date`,async({page})=>{
  await page.goto('/catalog/tables');await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('checkbox',{name:'RTL',exact:true}).check();
  const column=page.locator('ui-column-filter').filter({has:page.locator('legend',{hasText:'申請日の列条件'})}),date=column.locator('input[type=date]').first();await date.fill('2026-10-01');const native=await date.elementHandle();await column.getByRole('button',{name:'申請日の条件を追加',exact:true}).click();
  const match=column.getByRole('combobox',{name:'条件の結合: 申請日',exact:true});
  for(const value of ['and','or']){
   await match.selectOption(value);
   const fits=await match.evaluate(select=>{const element=select as HTMLSelectElement,style=getComputedStyle(element),context=document.createElement('canvas').getContext('2d')!;context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;return context.measureText(element.selectedOptions[0]!.label).width<=element.clientWidth-parseFloat(style.paddingInlineStart)-parseFloat(style.paddingInlineEnd);});expect(fits).toBe(true);
   const help=column.locator('[id="'+await match.getAttribute('aria-describedby')+'"]');await expect(help).toHaveText(value==='or'?'1つ以上に一致する行を表示':'全条件に一致する行を表示');await expect(date).toHaveValue('2026-10-01');expect(await date.evaluate((element,old)=>element===old,native)).toBe(true);
  }
 });

 for(const rtl of [false,true])test(`Palette ${profile} ${rtl?'RTL':'LTR'}: every selected command stays exposed after a long failure, resizing and arrow navigation`,async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/catalog/navigation');await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await page.getByRole('checkbox',{name:'RTL',exact:true}).setChecked(rtl);await page.getByLabel('長いコマンドエラー',{exact:true}).check();await page.getByTestId('palette-anchor').click();
  const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox'),name=dialog.locator('[role=option][aria-selected=true] .ui-palette-label > span').first();const native=await search.elementHandle();
  await search.fill('確認');await search.press('Enter');await expect(dialog).toHaveAttribute('aria-busy','true');await page.getByTestId('command-fail').dispatchEvent('click');await expect.poll(()=>exposedName(name)).toBe(true);
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(()=>exposedName(name)).toBe(true);
  await search.press('ArrowDown');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');await expect.poll(()=>exposedName(name)).toBe(true);await expect(name).toHaveText('確認内容を保存');await search.press('ArrowDown');await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-history');await expect.poll(()=>exposedName(name)).toBe(true);await expect(name).toHaveText('承認履歴を確認');
  await search.press('ArrowUp');await expect.poll(()=>exposedName(name)).toBe(true);await expect(search).toHaveAttribute('aria-activedescendant','catalog-palette-command-save');await expect(search).toHaveValue('確認');expect(await search.evaluate((element,old)=>element===old,native)).toBe(true);await expect(search).toBeFocused();
  await search.press('Enter');await expect(page.getByTestId('command-count')).toHaveText('2');
 });

 test(`FormDialog ${profile}: unsaved choices and held save retry keep their focus visible at text 200% RTL`,async({page})=>{
  await page.goto('/catalog');await page.locator('#catalog-profile').selectOption(profile);await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('checkbox',{name:'RTL',exact:true}).check();await page.getByRole('button',{name:'FormDialogを開く',exact:true}).click();
  const form=page.getByRole('dialog',{name:'申請名を編集',exact:true}),field=form.getByRole('textbox',{name:'Dialog内の申請名'}),save=form.getByRole('button',{name:'保存',exact:true}),keep=form.getByRole('button',{name:'編集を続ける',exact:true}),discard=form.getByRole('button',{name:'保存せずに閉じる',exact:true});await field.fill('未保存の入力内容');const native=await field.elementHandle();await page.keyboard.press('Escape');await expect(keep).toBeFocused();
  const visible=(button:Locator)=>button.evaluate(element=>{const rect=element.getBoundingClientRect(),dialog=element.closest('dialog')!.getBoundingClientRect();return rect.top>=Math.max(0,dialog.top)&&rect.bottom<=Math.min(innerHeight,dialog.bottom);});await expect.poll(()=>visible(keep)).toBe(true);
  await keep.press('Tab');await expect(discard).toBeFocused();await expect.poll(()=>visible(discard)).toBe(true);
  await page.clock.pauseAt(new Date());await save.focus();await save.press('Enter');await page.clock.runFor(20);const status=form.getByRole('status').filter({hasText:'保存しています。'});await expect(status).toBeFocused();await page.clock.runFor(120);await expect(save).toBeFocused();await expect.poll(()=>visible(save)).toBe(true);await expect(keep).toBeVisible();await expect(field).toHaveValue('未保存の入力内容');
  await save.press('Enter');await page.clock.runFor(20);await field.focus();await page.clock.runFor(120);await expect(field).toBeFocused();await expect(field).toHaveValue('未保存の入力内容');expect(await field.evaluate((element,old)=>element===old,native)).toBe(true);
 });
}

for(const profile of ['guided','dense'])for(const wide of [false,true])test(`Palette ${profile} close stays visible, vetoable and blocked while saving at ${wide?'320px text200 RTL':'390px'}`,async({page})=>{
 await page.goto('/catalog/navigation');await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await page.setViewportSize({width:wide?320:390,height:844});if(wide){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('checkbox',{name:'RTL',exact:true}).check();}await page.getByLabel('長いコマンドエラー',{exact:true}).check();
 await page.evaluate(()=>{const scope=window as unknown as {ng:{getComponent(element:Element):{closeRequested:{subscribe(listener:(request:{reason:string;preventDefault():void})=>void):void}}};holdClose:boolean;closeReasons:string[]};scope.holdClose=true;scope.closeReasons=[];scope.ng.getComponent(document.querySelector('ui-command-palette')!).closeRequested.subscribe(request=>{scope.closeReasons.push(request.reason);if(scope.holdClose)request.preventDefault();});});
 const opener=page.getByTestId('palette-anchor');await opener.click();const dialog=page.getByRole('dialog',{name:'業務のコマンド',exact:true}),search=dialog.getByRole('combobox'),close=dialog.getByRole('button',{name:'ダイアログを閉じる',exact:true}),native=await search.elementHandle();
 const exposed=()=>close.evaluate(element=>{const rect=element.getBoundingClientRect(),dialog=element.closest('dialog')!.getBoundingClientRect();const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return rect.top>=Math.max(0,dialog.top)+2&&rect.bottom<=Math.min(innerHeight,dialog.bottom)-2&&rect.left>=dialog.left&&rect.right<=dialog.right&&(hit===element||element.contains(hit));});
 await expect(search).toBeFocused();await search.press('Shift+Tab');await expect(close).toBeFocused();await expect.poll(exposed).toBe(true);await close.press('Enter');await expect(dialog).toBeVisible();await expect(close).toBeFocused();
 await close.press('Tab');await expect(search).toBeFocused();await search.fill('保存');await search.press('Enter');await expect(dialog).toHaveAttribute('aria-busy','true');await expect(close).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
 await page.getByTestId('command-fail').dispatchEvent('click');await expect(dialog).toHaveAttribute('aria-busy','false');await search.focus();await search.press('Shift+Tab');await expect(close).toBeFocused();await expect.poll(exposed).toBe(true);await expect(search).toHaveValue('保存');expect(await search.evaluate((element,old)=>element===old,native)).toBe(true);
 await page.evaluate(()=>{(window as unknown as {holdClose:boolean}).holdClose=false;});await close.press('Enter');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();expect(await page.evaluate(()=>(window as unknown as {closeReasons:string[]}).closeReasons.filter(reason=>reason==='close-button'))).toHaveLength(2);
});
