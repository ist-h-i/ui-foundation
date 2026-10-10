import {test,expect} from './catalog-test';
import type {Locator} from '@playwright/test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';

async function readableCell(cell:Locator){
 await expect(cell).toBeFocused();
 await expect.poll(()=>cell.evaluate(element=>{
  const input=element as HTMLInputElement,region=element.closest('.ui-specialist-scroll')!,clip=region.getBoundingClientRect(),box=element.getBoundingClientRect(),style=getComputedStyle(element);
  const outline=parseFloat(style.outlineWidth)+Math.max(0,parseFloat(style.outlineOffset));
  const left=Math.max(0,clip.left),right=Math.min(innerWidth,clip.right),top=Math.max(0,clip.top),bottom=Math.min(innerHeight,clip.bottom);
  const hits=[box.left+2,(box.left+box.right)/2,box.right-2].map(x=>document.elementFromPoint(x,(box.top+box.bottom)/2));
  return box.left-outline>=left-.5&&box.right+outline<=right+.5&&box.top-outline>=top-.5&&box.bottom+outline<=bottom+.5
   &&style.outlineStyle==='solid'&&parseFloat(style.outlineWidth)>0&&hits.every(hit=>hit===input||!!hit&&input.contains(hit));
 }),{message:'the selected cell and its complete focus outline remain visible and are not covered by another frozen cell'}).toBe(true);
}

for(const profile of profiles)for(const text of [100,200])for(const direction of ['ltr','rtl'])for(const width of [320,1280])
test(`Spreadsheet ${profile} ${width}px text${text} ${direction}: frozen rows and columns keep keyboard destinations readable`,async({page},info)=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Spreadsheet');
 await page.setViewportSize({width,height:900});await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',text);
 if(direction==='rtl')await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
 await page.keyboard.press('Tab');
 const sheet=page.locator('#sheet ui-spreadsheet'),a=sheet.getByRole('textbox',{name:'A1',exact:true});
 await a.focus();await page.keyboard.press('Home');await readableCell(a);await expect(a).toHaveValue('2');
 const forward=direction==='rtl'?'ArrowLeft':'ArrowRight',backward=direction==='rtl'?'ArrowRight':'ArrowLeft';
 for(const [name,value] of [['B1','3'],['C1','5'],['D1','10']]){
  await page.keyboard.press(forward);const cell=sheet.getByRole('textbox',{name,exact:true});await readableCell(cell);await expect(cell).toHaveValue(value);
  await expect(sheet).toContainText(`選択 ${name} / 値 ${value}`);
 }
 await page.keyboard.press(backward);const c=sheet.getByRole('textbox',{name:'C1',exact:true});await readableCell(c);
 await page.keyboard.press('Enter');await expect(c).toHaveValue('=SUM(A1:B1)');await c.fill('=A1+B1');await page.keyboard.press('Enter');await expect(c).toHaveValue('5');await readableCell(c);
 await page.keyboard.press('ArrowDown');await readableCell(sheet.getByRole('textbox',{name:'C2',exact:true}));
 await page.keyboard.press('ArrowUp');await readableCell(c);await page.keyboard.press('Home');await readableCell(a);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await info.attach('sheet-focus',{body:JSON.stringify(await sheet.locator('[data-sheet-cell]').evaluateAll(cells=>cells.map(cell=>({address:cell.getAttribute('aria-label'),value:(cell as HTMLInputElement).value,focused:cell.ownerDocument.activeElement===cell,box:cell.getBoundingClientRect().toJSON()})))),contentType:'application/json'});
});

for(const profile of profiles)for(const direction of ['ltr','rtl'])
test(`Spreadsheet ${profile} text200 ${direction}: vertical keyboard scrolling and width changes preserve the selected cell`,async({page},info)=>{
 await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Spreadsheet');
 const csv=Array.from({length:20},()=>['2','3','=SUM(A1:B1)','=C1*2'].map(value=>'"'+value+'"').join(',')).join('\n');
 await page.getByLabel('読み込むCSV',{exact:true}).fill(csv);await page.getByRole('button',{name:'CSVを読み込む',exact:true}).click();
 const sheet=page.locator('#sheet ui-spreadsheet'),c20=sheet.getByRole('textbox',{name:'C20',exact:true});await expect(c20).toHaveValue('5');
 await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 if(direction==='rtl')await page.getByRole('button',{name:'方向: LTR',exact:true}).click();await page.keyboard.press('Tab');
 const a=sheet.getByRole('textbox',{name:'A1',exact:true});await a.focus();await page.keyboard.press('Home');
 const forward=direction==='rtl'?'ArrowLeft':'ArrowRight';await page.keyboard.press(forward);await page.keyboard.press(forward);
 for(let row=2;row<=20;row++){await page.keyboard.press('ArrowDown');await readableCell(sheet.getByRole('textbox',{name:'C'+row,exact:true}));}
 await expect(sheet).toContainText('選択 C20 / 値 5');await expect(c20).toHaveValue('5');
 await page.setViewportSize({width:1280,height:900});await readableCell(c20);await expect(c20).toHaveValue('5');
 await page.setViewportSize({width:320,height:900});await readableCell(c20);await expect(c20).toHaveValue('5');
 await page.getByRole('button',{name:'CSVを書き出す',exact:true}).click();await expect(page.getByLabel('書き出した内容',{exact:true})).toHaveValue(csv);
 await info.attach('sheet-vertical-scroll',{body:JSON.stringify(await sheet.locator('.ui-specialist-scroll').evaluate(element=>({scrollLeft:element.scrollLeft,scrollTop:element.scrollTop,width:element.clientWidth,height:element.clientHeight}))),contentType:'application/json'});
});
