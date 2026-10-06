import {test,expect} from './catalog-test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';

for(const profile of profiles){
 for(const [description,raw] of [['empty',''],['whitespace','   ']] as const){
  test(profile+': Diagram rejects '+description+' label and retains the named canvas node, raw input and native focus path',async({page},info)=>{
   await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
   const editor=page.locator('#flow tbody tr').first().locator('input').nth(0);await expect(editor).toHaveAttribute('aria-label','提出 ラベル');await editor.fill(raw);await editor.press('Tab');
   await expect(editor).toHaveValue(raw);await expect(editor).toHaveAttribute('aria-invalid','true');
   await expect(page.locator('#flow [role=alert]')).toContainText('ノードのラベルを入力してください。');
   await expect(page.locator('#flow .ui-diagram-node').getByText('提出',{exact:true})).toHaveCount(1);
   await expect(page.getByLabel('提出 横位置',{exact:true})).toBeFocused();
   await editor.fill('  更新した提出  ');await editor.press('Tab');
   await expect(page.locator('#flow .ui-diagram-node').first()).toHaveText('  更新した提出  ');await expect(page.locator('#flow [role=alert]')).toHaveCount(0);
   await expect(editor).not.toHaveAttribute('aria-invalid','true');
   await info.attach('corrected-label',{body:JSON.stringify({profile,raw,modelLabel:await page.locator('#flow .ui-diagram-node').first().textContent()}),contentType:'application/json'});
  });
 }
 for(const axis of ['x','y'] as const){
  test(profile+': Diagram rejects negative '+axis+' without changing the reachable canvas and supports correction',async({page},info)=>{
   await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'Diagram');
   const editor=page.getByLabel(axis==='x'?'提出 横位置':'提出 縦位置',{exact:true}),node=page.locator('#flow .ui-diagram-node').first();
   const previous=await node.evaluate(element=>({left:(element as HTMLElement).style.left,top:(element as HTMLElement).style.top}));
   await editor.fill('-50');await editor.press('Tab');await expect(editor).toHaveValue('-50');await expect(editor).toHaveAttribute('aria-invalid','true');
   await expect(page.locator('#flow [role=alert]')).toContainText('位置は0〜1000000の範囲で入力してください。');
   expect(await node.evaluate(element=>({left:(element as HTMLElement).style.left,top:(element as HTMLElement).style.top}))).toEqual(previous);
   await editor.fill('0');await editor.press('Tab');await expect(editor).toHaveValue('0');await expect(page.locator('#flow [role=alert]')).toHaveCount(0);await expect(editor).not.toHaveAttribute('aria-invalid','true');
   await node.focus();await node.press(axis==='x'?'ArrowLeft':'ArrowUp');await expect(editor).toHaveValue('0');await expect(node).toBeFocused();
   await node.press(axis==='x'?'ArrowRight':'ArrowDown');expect(Number(await editor.inputValue())).toBeGreaterThan(0);
   await info.attach('preserved-canvas-before-correction',{body:JSON.stringify({profile,axis,previous}),contentType:'application/json'});
  });
 }
}
