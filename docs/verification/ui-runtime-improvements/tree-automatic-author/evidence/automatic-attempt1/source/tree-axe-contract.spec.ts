import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {test,expect} from './catalog-test';
import {assertExposedText,clippedText,graphicalPaint,popupContract} from './tree-axe-contract-helpers';

const head='申請管理本部と長い部署名ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for(const profile of ['guided','dense'])test.describe('tree automated incomplete contracts '+profile,()=>{
 test.beforeEach(async({page})=>{
  await page.goto('/catalog/trees');await expect(page.getByRole('heading',{name:'階層の選択と組織の確認',exact:true})).toBeVisible();
  await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  await page.setViewportSize({width:320,height:720});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#rtl').check();
 });
 test('DOM/ARIA/native AX references, keyboard, clipped text and nested Escape',async({page},testInfo)=>{
  const evidence:Record<string,unknown>={profile,viewport:{width:320,height:720},fontSize:'200%',rtl:true,reducedMotion:true};
  const snapshot=async(state:string)=>{
   const open={closed:'', 'tree-select-open':'multi','cascader-open':'cascade'}[state];
   const values=[];for(const id of ['cascade','single','multi'])values.push(await popupContract(page,id,id===open));evidence[state]=values;
   await writeFile(testInfo.outputPath('contracts-'+state+'.json'),JSON.stringify(values,null,2));
  };
  await snapshot('closed');
  await page.locator('#multi').focus();await page.keyboard.press('ArrowDown');await expect(page.locator('#multi-popup')).toBeVisible();await expect(page.locator('#multi-search')).toBeFocused();
  await snapshot('tree-select-open');await page.keyboard.press('ArrowDown');await expect(page.locator('#multi-tree-item-head')).toBeFocused();
  await page.keyboard.press('End');await page.keyboard.press('Space');await page.locator('#multi-popup').getByRole('button',{name:'選択を完了',exact:true}).click();await expect(page.locator('#multi-model')).toContainText('last');await expect(page.locator('#multi')).toBeFocused();
  await page.locator('#cascade').focus();await page.keyboard.press('Enter');const popup=page.locator('#cascade-popup');await expect(popup).toBeVisible();await expect(popup.getByRole('button',{name:head,exact:true})).toBeFocused();
  await page.keyboard.press('ArrowLeft');await expect(popup.getByRole('button',{name:'企画部',exact:true})).toBeFocused();await page.keyboard.press('ArrowLeft');await expect(popup.getByRole('button',{name:'企画第一課',exact:true})).toBeFocused();
  await page.keyboard.press('Enter');await popup.getByRole('button',{name:'この経路で確定',exact:true}).click();await expect(page.locator('#cascade-model')).toContainText('a1');
  await page.locator('#cascade').click();await expect(popup).toBeVisible();await snapshot('cascader-open');
  const selectors=['#cascade-popup > p:nth-child(1)','#cascade-popup > .ui-tree-popup-state'];
  const before=[];for(const selector of selectors)before.push(await clippedText(page,selector));
  await writeFile(testInfo.outputPath('clipped-text-before.json'),JSON.stringify(before,null,2));
  await page.screenshot({path:testInfo.outputPath('cascader-clipping-before.png')});
  const box=await popup.boundingBox();assert(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.wheel(0,-100000);await expect.poll(()=>popup.evaluate(element=>element.scrollTop)).toBe(0);
  const after=[];for(const selector of selectors){const value=await clippedText(page,selector);after.push(value);}
  await writeFile(testInfo.outputPath('clipped-text-after-top.json'),JSON.stringify(after,null,2));
  const textContrasts=after.map(value=>assertExposedText(value));
  await page.screenshot({path:testInfo.outputPath('cascader-clipping-after.png')});evidence.clipping={before,after,textContrasts,nativeWheel:true};
  await page.keyboard.press('Escape');await expect(popup).not.toBeVisible();await expect(page.locator('#cascade')).toBeFocused();
  await page.locator('#show-dialog').click();const parent=page.getByRole('dialog',{name:'提出先を確認',exact:true});await expect(parent).toBeVisible();
  await page.locator('#modal-cascade').focus();await page.keyboard.press('ArrowDown');await expect(page.locator('#modal-cascade-popup')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#modal-cascade-popup')).not.toBeVisible();await expect(parent).toBeVisible();await expect(page.locator('#modal-cascade')).toBeFocused();
  await page.keyboard.press('Escape');await expect(parent).not.toBeVisible();await expect(page.locator('#show-dialog')).toBeFocused();
  evidence.parentEscape={childFirst:true,parentSecond:true,ownedFocusReturned:true};
  await writeFile(testInfo.outputPath('automatic-contracts.json'),JSON.stringify(evidence,null,2));
 });
 test('glyphs have checked semantics and actual foreground/background paint',async({page},testInfo)=>{
  const evidence:Record<string,unknown>={profile};const glyphs=[];
  for(const id of ['head','lazy','last'])glyphs.push(await graphicalPaint(page,'#departments-item-'+id+' > .ui-tree-row > .ui-tree-check',testInfo,'departments-'+id));
  const item=page.locator('#departments-item-head');await item.focus();await page.keyboard.press('Space');await expect(item).toHaveAttribute('aria-checked','true');
  const checked=await graphicalPaint(page,'#departments-item-head > .ui-tree-row > .ui-tree-check',testInfo,'checked');assert.equal(checked.css.text?.trim(),'☑');
  await item.focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('#departments-item-alpha')).toBeVisible();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowLeft');await expect(page.locator('#departments-item-a1')).toBeVisible();
  await page.locator('#departments-item-a1').focus();await page.keyboard.press('Space');await expect(item).toHaveAttribute('aria-checked','mixed');
  const mixed=await graphicalPaint(page,'#departments-item-head > .ui-tree-row > .ui-tree-check',testInfo,'mixed');assert.equal(mixed.css.text?.trim(),'◩');assert.notEqual(checked.screenshotSha256,mixed.screenshotSha256);
  evidence.glyphs=glyphs;evidence.checked=checked;evidence.mixed=mixed;evidence.treeAriaSnapshot=await page.locator('#departments').ariaSnapshot();
  await page.locator('#multi').click();await expect(page.locator('#multi-popup')).toBeVisible();const popupGlyphs=[];
  for(const id of ['head','lazy'])popupGlyphs.push(await graphicalPaint(page,'#multi-tree-item-'+id+' > .ui-tree-row > .ui-tree-check',testInfo,'multi-'+id));
  evidence.popupGlyphs=popupGlyphs;await page.keyboard.press('Escape');await expect(page.locator('#multi')).toBeFocused();
  await writeFile(testInfo.outputPath('automatic-paint.json'),JSON.stringify(evidence,null,2));
 });
 test('automatic reference and graphical contrast detectors reject broken contracts',async({page},testInfo)=>{
  const control=page.locator('#multi'),original=await control.getAttribute('aria-controls');
  await control.evaluate(element=>element.setAttribute('aria-controls','nonexistent-tree-popup'));
  await assert.rejects(()=>popupContract(page,'multi',false),/aria-controls must reference exactly one real element/);
  await control.evaluate((element,value)=>element.setAttribute('aria-controls',value!),original);
  const selector='#departments-item-head > .ui-tree-row > .ui-tree-check',glyph=page.locator(selector),style=await glyph.getAttribute('style');
  await glyph.evaluate(element=>(element as HTMLElement).style.color='rgb(255, 255, 255)');
  await assert.rejects(()=>graphicalPaint(page,selector,testInfo,'broken'),/contrast >=3:1/);
  await glyph.evaluate((element,value)=>value===null?element.removeAttribute('style'):element.setAttribute('style',value),style);
  await popupContract(page,'multi',false);
  await writeFile(testInfo.outputPath('detector-negative-probes.json'),JSON.stringify({profile,missingPopupRejected:true,lowContrastRejected:true,actualOriginalRestored:true},null,2));
 });
});
