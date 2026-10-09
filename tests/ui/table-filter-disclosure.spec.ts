import {test,expect} from './catalog-test';
import {readFile} from 'node:fs/promises';
import type {Locator} from '@playwright/test';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {renderTokens} from '../../src/tokens.ts';

async function expectReadableAction(action:Locator){
 for(const state of ['normal','hover','focus']){
  if(state==='hover')await action.hover();
  if(state==='focus')await action.focus();
  const colors=await action.evaluate(element=>{
   const style=getComputedStyle(element);
   const layers:number[][]=[];
   for(let ancestor:Element|null=element;ancestor;ancestor=ancestor.parentElement){
    const value=getComputedStyle(ancestor).backgroundColor;
    const channels=value.match(/[\d.]+/g)?.map(Number);
    if(channels)layers.push([...channels.slice(0,3),channels[3]??1]);
   }
   const background=layers.reverse().reduce((back,layer)=>back.map((channel,index)=>layer[index]*layer[3]+channel*(1-layer[3])),[255,255,255]);
   const luminance=(values:number[])=>{
    const channels=values.map(channel=>channel/255)
     .map(channel=>channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4);
    return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
   };
   const foreground=luminance(style.color.match(/[\d.]+/g)!.slice(0,3).map(Number)),back=luminance(background);
   return{contrast:(Math.max(foreground,back)+0.05)/(Math.min(foreground,back)+0.05),foreground:style.color,background};
  });
  expect.soft(colors.contrast,`${state}: ${JSON.stringify(colors)}`).toBeGreaterThanOrEqual(4.5);
 }
 await expect(action).toBeFocused();
}

for(const profile of ['guided','dense']){
 test.describe(`table layout and filtering ${profile}`,()=>{
  test('bright action backgrounds preserve readable sort and row/cell edit actions',async({page})=>{
   await page.goto('/catalog/tables');
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
   const config=parseConfig(await readFile(new URL('../../examples/ui.config.example.yaml',import.meta.url),'utf8'));
   for(const configuredProfile of Object.values(config.profiles)){
    configuredProfile.semantic['color.action']='white';
    configuredProfile.semantic['color.action-hover']='white';
    configuredProfile.semantic['color.on-action']='ink';
   }
   await page.addStyleTag({content:renderTokens(resolveConfig(config))});
   const host=page.locator('ui-data-table[tableid="native-table"]');
   await expectReadableAction(host.locator('button.ui-data-table__sort').first());
   await page.getByLabel('表の編集方式',{exact:true}).selectOption('row');
   const rowStart=host.getByRole('button',{name:'編集: 備品購入',exact:true});
   await expectReadableAction(rowStart);
   await rowStart.press('Enter');
   const row=host.locator('ui-row-editor').filter({has:page.getByRole('region',{name:'備品購入の行編集',exact:true})});
   await expect(row.getByRole('textbox').first()).toBeVisible();
   await row.getByRole('button',{name:'取消',exact:true}).click();
   await page.getByLabel('表の編集方式',{exact:true}).selectOption('cell');
   const cell=host.locator('tr[data-row-key="1"] ui-cell-editor').first();
   const cellStart=cell.getByRole('button',{name:'編集',exact:true});
   await expectReadableAction(cellStart);
   await cellStart.press('Enter');
   const input=cell.getByRole('textbox');
   await expect(input).toBeFocused();
   await input.fill('明るい主操作色でも編集できる');
   await input.press('Escape');
   await expect(cellStart).toBeFocused();
   await expect(cell).toContainText('備品購入');
  });

  test('closed filters leave data rows visible and sticky headings opaque',async({page})=>{
   await page.goto('/catalog/tables');
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
   await page.getByLabel('表の列条件',{exact:true}).check();
   const host=page.locator('ui-data-table[tableid="native-table"]');
   const disclosure=host.locator('.ui-data-table__filters');
   const summary=disclosure.locator('summary');
   const viewport=host.getByRole('region',{name:'拡張申請一覧の表領域',exact:true});
   await expect(disclosure).not.toHaveAttribute('open');
   await expect(summary).toContainText('適用中 0 列');
   await expect(host.getByLabel('金額の条件',{exact:true})).toBeHidden();
   await expect(host.locator('thead ui-column-filter')).toHaveCount(0);
   await expect(host.locator('thead tr')).toHaveCount(3);
   const initial=await viewport.evaluate(node=>{
    const rect=(element:Element)=>{const r=element.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height};};
    return{viewport:rect(node),header:rect(node.querySelector('thead')!),firstRow:rect(node.querySelector('tbody tr[data-row-key]')!)};
   });
   expect(initial.firstRow.top).toBeGreaterThanOrEqual(initial.header.bottom-1);
   expect(initial.firstRow.bottom).toBeLessThan(initial.viewport.bottom);
   const backgrounds=await host.locator('thead,thead th').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundColor));
   for(const background of backgrounds)expect(background).not.toMatch(/transparent|rgba\([^)]*,\s*0\)/);

   await summary.click();
   await host.getByLabel('金額の比較方法',{exact:true}).selectOption('gte');
   await host.getByLabel('金額の条件',{exact:true}).fill('0');
   await expect(summary).toContainText('適用中 1 列');
   await host.getByLabel('承認の条件',{exact:true}).selectOption('false');
   await expect(summary).toContainText('適用中 2 列');
   await host.getByRole('button',{name:'承認の条件 1 を解除',exact:true}).click();
   await expect(summary).toContainText('適用中 1 列');
   await summary.click();
   await viewport.evaluate(node=>node.scrollTop=300);
   await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(200);
   const scrolled=await viewport.evaluate(node=>{
    const head=node.querySelector('thead')!.getBoundingClientRect();
    const rows=[...node.querySelectorAll('tbody tr[data-row-key]:not([data-fixed-row])')].map(row=>row.getBoundingClientRect());
    return{headHeight:head.height,headBottom:head.bottom,viewportBottom:node.getBoundingClientRect().bottom,visibleRows:rows.filter(row=>row.top>=head.bottom&&row.bottom<=node.getBoundingClientRect().bottom).length};
   });
   expect(scrolled.headHeight).toBeCloseTo(initial.header.height,0);
   expect(scrolled.visibleRows).toBeGreaterThan(0);
   expect(scrolled.headBottom).toBeLessThan(scrolled.viewportBottom);
  });

  test('keyboard disclosure retains valid and incomplete inputs and exposes hidden-column conditions',async({page})=>{
   await page.goto('/catalog');
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
   const host=page.locator('ui-data-table');
   const disclosure=host.locator('.ui-data-table__filters');
   const summary=disclosure.locator('summary');
   await summary.focus();
   await page.keyboard.press('Space');
   await expect(disclosure).toHaveAttribute('open','');
   const amount=host.getByLabel('金額の条件',{exact:true});
   const operator=host.getByLabel('金額の比較方法',{exact:true});
   await operator.selectOption('gte');
   await amount.fill('2000');
   await amount.evaluate(node=>node.setAttribute('data-disclosure-retained','original'));
   await summary.focus();
   await page.keyboard.press('Enter');
   await expect(disclosure).not.toHaveAttribute('open');
   await expect(summary).toBeFocused();
   await page.keyboard.press('Space');
   await expect(amount).toHaveValue('2000');
   await expect(operator).toHaveValue('gte');
   await expect(amount).toHaveAttribute('data-disclosure-retained','original');

   await host.locator('.ui-data-table__columns > summary').click();
   await host.getByLabel('金額',{exact:true}).uncheck();
   await expect(host.locator('th[data-column-id="amount"]')).toHaveCount(0);
   await expect(amount).toBeVisible();
   await expect(summary).toContainText('適用中 1 列');
   await amount.focus();
   await page.keyboard.press(process.platform==='darwin'?'Meta+A':'Control+A');
   await amount.pressSequentially('1e');
   await expect(amount).toHaveAttribute('aria-invalid','true');
   await summary.focus();
   await page.keyboard.press('Space');
   await expect(summary).toBeFocused();
   await page.keyboard.press('Enter');
   await expect(amount).toHaveAttribute('data-disclosure-retained','original');
   await expect(amount).toHaveAttribute('aria-invalid','true');
   expect(await amount.evaluate(node=>(node as HTMLInputElement).validity.badInput)).toBe(true);
   await expect(summary).toContainText('適用中 1 列');
   await host.getByRole('button',{name:'金額の条件 1 を解除',exact:true}).click();
   await expect(summary).toContainText('適用中 0 列');
   await expect(host.locator('tbody tr[data-row-key]')).toHaveCount(2);
  });

  test('320px, 200% text and RTL keep edit targets and column alignment usable',async({page})=>{
   await page.goto('/catalog/tables');
   await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
   await page.setViewportSize({width:320,height:900});
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');
   await page.getByLabel('RTL',{exact:true}).check();
   const grid=page.locator('main > ui-data-grid');
   const first=grid.locator('[data-grid-cell][data-row-index="0"][data-column-index="0"]');
   const edit=first.getByRole('button',{name:'編集',exact:true});
   const target=await edit.boundingBox();
   expect(target!.width).toBeGreaterThanOrEqual(44);
   expect(target!.height).toBeGreaterThanOrEqual(44);
   const alignment=await grid.locator('table').evaluate(table=>{
    const headers=[...table.querySelectorAll('thead th')].map(cell=>cell.getBoundingClientRect());
    return[...table.querySelectorAll('tbody tr')].flatMap(row=>[...row.querySelectorAll('td')].map((cell,index)=>{const r=cell.getBoundingClientRect();return{left:Math.abs(r.left-headers[index].left),width:Math.abs(r.width-headers[index].width)};}));
   });
   for(const cell of alignment){expect(cell.left).toBeLessThan(1);expect(cell.width).toBeLessThan(1);}
   await first.focus();
   await page.keyboard.press('F2');
   await first.getByRole('textbox').fill('狭い表示でも保持する申請名');
   await page.keyboard.press('Escape');
   await expect(first).toBeFocused();
   await expect(first).toContainText('備品購入');
   await page.getByLabel('表の編集方式',{exact:true}).selectOption('row');
   const host=page.locator('ui-data-table[tableid="native-table"]');
   const start=host.getByRole('button',{name:'編集: 備品購入',exact:true});
   const rowTarget=await start.boundingBox();
   expect(rowTarget!.width).toBeGreaterThanOrEqual(44);
   expect(rowTarget!.height).toBeGreaterThanOrEqual(44);
   const rowAlignment=await host.locator('tbody tr[data-row-key]').evaluateAll(rows=>rows.map(row=>{
    const cell=row.querySelector('button[data-table-row-edit-start]')!.parentElement!.getBoundingClientRect();
    const header=[...row.closest('table')!.querySelectorAll('thead th')].find(th=>th.textContent?.trim()==='行編集')!.getBoundingClientRect();
    return{left:Math.abs(cell.left-header.left),width:Math.abs(cell.width-header.width)};
   }));
   for(const cell of rowAlignment){expect(cell.left).toBeLessThan(1);expect(cell.width).toBeLessThan(1);}
   const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);
  });
 });
}
