import {test,expect} from './catalog-test';
import type {Locator} from '@playwright/test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';

async function expectCurrentColumns(board:Locator,summary:Locator){
 const model=Object.fromEntries((await summary.innerText()).split(',').map(entry=>entry.split(':')));
 for(const card of await board.locator('[data-board-card]').all()){
  const id=(await card.getAttribute('data-board-card'))!;
  await expect(card.locator('select'),`${id} shows its app-owned column`).toHaveValue(model[id]!);
  const selected=await card.locator('option:checked').innerText();
  await expect(card.locator('..').locator('..').locator('h3').first()).toHaveText(new RegExp(`^${selected} \\(`));
 }
}

for(const profile of profiles)test(`Kanban ${profile}: current destination matches its column after initial render, native moves and recreation`,async({page})=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Kanban');
 const board=page.locator('#kanban ui-kanban'),summary=page.locator('[data-board-cards]');
 await expectCurrentColumns(board,summary);
 const completed=page.getByLabel('申請Cの移動先',{exact:true});
 // Closed native select popups do not commit CDP ArrowUp input in this macOS
 // headless Chromium; the same behavior occurs in an isolated HTML select.
 await expect(completed).toHaveValue('done');await completed.selectOption('doing');
 await expect(completed).toHaveValue('doing');await expectCurrentColumns(board,summary);
 await page.getByLabel('申請Aの移動先',{exact:true}).selectOption('doing');await expectCurrentColumns(board,summary);
 const doingOrder=board.locator('[data-board-card="a"]').locator('..').locator('[data-board-card]');
 await expect(doingOrder.first()).toHaveAttribute('data-board-card','c');
 await page.getByRole('button',{name:'申請Aを前へ',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(doingOrder.first()).toHaveAttribute('data-board-card','a');await expectCurrentColumns(board,summary);
 await expect(page.getByLabel('申請Bの移動先',{exact:true}).locator('option[value=doing]')).toHaveJSProperty('disabled',true);
 await page.getByLabel('申請Bの移動先',{exact:true}).selectOption('done');await expectCurrentColumns(board,summary);
 await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.getByRole('button',{name:/プロファイル:/}).click();await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
 await expectCurrentColumns(board,summary);
 const retained=await summary.innerText();
 for(const label of ['処理中','読取り専用','操作抑止']){
  await page.getByLabel(label,{exact:true}).check();
  for(const select of await board.locator('select').all())await expect(select).toBeDisabled();
  await expect(summary).toHaveText(retained);await expectCurrentColumns(board,summary);
  await page.getByLabel(label,{exact:true}).uncheck();
 }
 await page.getByRole('button',{name:'専門部品を破棄',exact:true}).click();await expect(board).toHaveCount(0);
 await page.getByRole('button',{name:'専門部品を再生成',exact:true}).click();
 await expect(summary).toHaveText(retained);await expectCurrentColumns(board,summary);
});

for(const profile of profiles)test(`Kanban ${profile}: boundary reorders keep focus on the moved card and Tab continues within it`,async({page})=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Kanban');
 const board=page.locator('#kanban ui-kanban'),summary=page.locator('[data-board-cards]');
 await page.getByLabel('申請Bの移動先',{exact:true}).selectOption('todo');
 const card=board.locator('[data-board-card="b"]'),heading=card.locator('h3');
 const before=card.getByRole('button',{name:'申請Bを前へ',exact:true}),after=card.getByRole('button',{name:'申請Bを後へ',exact:true});
 const order=card.locator('..').locator('[data-board-card]');
 for(const key of ['Enter','Space']){
  if(key==='Space'){
   await page.setViewportSize({width:320,height:900});
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');
   await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
  }
  await before.focus();await page.keyboard.press(key);
  await expect(order.first()).toHaveAttribute('data-board-card','b');await expect(before).toBeDisabled();
  await expect(heading).toBeFocused();await expectCurrentColumns(board,summary);
  await page.keyboard.press('Tab');await expect(after).toBeFocused();
  await page.keyboard.press(key);
  await expect(order.last()).toHaveAttribute('data-board-card','b');await expect(after).toBeDisabled();
  await expect(heading).toBeFocused();await expectCurrentColumns(board,summary);
  await page.keyboard.press('Tab');await expect(before).toBeFocused();
 }
});

async function readableBoardFocus(target:Locator){
 await expect(target).toBeFocused();
 await expect.poll(()=>target.evaluate(element=>{
  const board=element.closest('.ui-board')!,clip=board.getBoundingClientRect(),box=element.getBoundingClientRect(),style=getComputedStyle(element);
  const range=document.createRange();range.selectNodeContents(element);const glyph=range.getBoundingClientRect();
  const left=Math.max(0,clip.left),right=Math.min(innerWidth,clip.right),top=Math.max(0,clip.top),bottom=Math.min(innerHeight,clip.bottom);
  const center=document.elementFromPoint((glyph.left+glyph.right)/2,(glyph.top+glyph.bottom)/2);
  return box.left>=left-.5&&box.right<=right+.5&&box.top>=top-.5&&box.bottom<=bottom+.5&&glyph.left>=left-.5&&glyph.right<=right+.5&&glyph.top>=top-.5&&glyph.bottom<=bottom+.5&&style.outlineStyle==='solid'&&parseFloat(style.outlineWidth)>0&&!!center&&(element===center||element.contains(center));
 }),{message:'the focused card action and its complete text are readable inside the board viewport'}).toBe(true);
}

for(const profile of profiles)test(`Kanban ${profile}: cross-column and boundary focus reveals the complete card heading in its local viewport`,async({page},info)=>{
 test.setTimeout(90_000);
 const observations=[];
 for(const text of [100,200])for(const direction of ['ltr','rtl']){
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Kanban');
  await page.setViewportSize({width:320,height:900});await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',text);
  if(direction==='rtl')await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('dir',direction);
  await page.keyboard.press('Tab');
  const board=page.locator('#kanban ui-kanban'),summary=page.locator('[data-board-cards]');
  for(const id of ['c','a']){
   const select=board.locator(`[data-board-card="${id}"] select`);await select.focus();await select.selectOption('doing');
   const heading=board.locator(`[data-board-card="${id}"] h3`);await expect(heading).toBeFocused();
   observations.push({profile,text,direction,step:'cross-'+id,geometry:await heading.evaluate(element=>({heading:element.getBoundingClientRect().toJSON(),board:element.closest('.ui-board')!.getBoundingClientRect().toJSON(),scrollLeft:element.closest('.ui-board')!.scrollLeft}))});
   await readableBoardFocus(heading);await expectCurrentColumns(board,summary);
  }
  const card=board.locator('[data-board-card="a"]'),heading=card.locator('h3'),before=card.getByRole('button',{name:'申請Aを前へ',exact:true}),after=card.getByRole('button',{name:'申請Aを後へ',exact:true});
  const order=card.locator('..').locator('[data-board-card]');
  await before.focus();await page.keyboard.press('Enter');await expect(order.first()).toHaveAttribute('data-board-card','a');await expect(before).toBeDisabled();await readableBoardFocus(heading);
  await page.keyboard.press('Tab');await readableBoardFocus(after);
  await page.keyboard.press('Space');await expect(order.last()).toHaveAttribute('data-board-card','a');await expect(after).toBeDisabled();await readableBoardFocus(heading);
  await page.keyboard.press('Tab');await expect(before).toBeFocused();await expectCurrentColumns(board,summary);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await info.attach('board-focus-readability',{body:JSON.stringify(observations),contentType:'application/json'});
});
