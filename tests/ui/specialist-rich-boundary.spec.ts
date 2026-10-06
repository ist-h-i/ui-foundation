import {test,expect} from './catalog-test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';

test.use({reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});

for(const profile of profiles){
 test(profile+': native HTML paste rejects unsafe URLs before DOM and CVA publication, then safe editing recovers',async({page})=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'RichText');
  const editor=page.locator('#rich .ui-rich-editor'),value=page.locator('[data-rich-value]');
  await editor.fill('貼付け前の下書き');await expect(value).toContainText('貼付け前の下書き');
  const before=await value.textContent();
  await editor.evaluate(node=>{(globalThis as any).__richBoundaryElement=node;});
  const html='<p><a href="javascript:globalThis.__richUnsafeExecution=1">危険なリンク</a></p>';
  await page.evaluate(async html=>{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob(['危険なリンク'],{type:'text/plain'})})]);},html);
  await editor.focus();await editor.press('ControlOrMeta+A');await editor.press('ControlOrMeta+V');
  await expect(page.locator('#rich [role=alert]')).toContainText('元の内容は保持');
  await expect(editor.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(value).toHaveText(before??'');await expect(editor).toHaveText('貼付け前の下書き');
  await expect(editor).toHaveAttribute('contenteditable','true');await expect(editor).toBeFocused();
  expect(await editor.evaluate(node=>(globalThis as any).__richBoundaryElement===node)).toBe(true);
  expect(await page.evaluate(()=>(globalThis as any).__richUnsafeExecution??0)).toBe(0);
  await editor.fill('拒否後も編集を続ける');await expect(value).toContainText('拒否後も編集を続ける');
  await expect(page.locator('#rich [role=alert]')).toHaveCount(0);
  const safe='<p><a href="https://example.test/guide">安全なリンク</a></p>';
  await page.evaluate(async html=>{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob(['安全なリンク'],{type:'text/plain'})})]);},safe);
  await editor.focus();await editor.press('ControlOrMeta+A');await editor.press('ControlOrMeta+V');
  await expect(editor.locator('a')).toHaveAttribute('href','https://example.test/guide');await expect(value).toContainText('https://example.test/guide');
  await page.getByRole('button',{name:'元に戻す',exact:true}).click();await expect(editor.locator('a')).toHaveCount(0);
  await page.getByRole('button',{name:'やり直す',exact:true}).click();await expect(editor.locator('a')).toHaveAttribute('href','https://example.test/guide');
 });
}
