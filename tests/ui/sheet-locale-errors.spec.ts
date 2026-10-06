import {test,expect} from './catalog-test';
import AxeBuilder from '@axe-core/playwright';

for(const profile of ['guided','dense'])test(profile+': formula worker structural errors follow the live locale while app error and formula source stay unchanged',async({page,context},info)=>{
 await context.route('**/invalid-library-worker.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:"postMessage({type:'sheet-ready',version:999});"}));
 await context.route('**/app-domain-worker.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:"onmessage=event=>postMessage({requestId:event.data.requestId,results:null,error:'The application refused this calculation.'});postMessage({type:'sheet-ready',version:1});"}));
 await page.goto('/catalog/sheet-locale');await page.getByRole('combobox',{name:'プロファイル',exact:true}).selectOption(profile);
 const sheet=page.locator('ui-spreadsheet'),status=sheet.getByRole('status').first(),source=page.locator('#sheet-source');
 await expect(sheet.locator('[data-sheet-cell="0,2"]')).toHaveValue('5');const original=await source.textContent();
 await page.getByRole('combobox',{name:'計算worker',exact:true}).selectOption('/assets/invalid-library-worker.mjs');
 await expect(status).toHaveText('The calculation could not be confirmed.');await expect(source).toHaveText(original!);
 await page.getByRole('button',{name:'辞書を切り替え',exact:true}).click();await expect(status).toHaveText('Die Berechnung konnte nicht bestätigt werden.');
 await expect(page.locator('main')).toHaveAttribute('lang','de-DE');await expect(source).toHaveText(original!);
 await page.getByRole('combobox',{name:'計算worker',exact:true}).selectOption('/assets/app-domain-worker.mjs');await expect(status).toHaveText('The application refused this calculation.');
 await page.getByRole('button',{name:'辞書を切り替え',exact:true}).click();await expect(status).toHaveText('The application refused this calculation.');await expect(source).toHaveText(original!);
 await page.getByRole('combobox',{name:'計算worker',exact:true}).selectOption('/assets/sheet-formula.worker.js');await expect(sheet.locator('[data-sheet-cell="0,2"]')).toHaveValue('5');await expect(source).toHaveText(original!);
 const axe=await new AxeBuilder({page}).include('ui-spreadsheet').analyze();await info.attach('sheet-locale-errors-axe',{body:JSON.stringify(axe),contentType:'application/json'});expect(axe.violations).toEqual([]);
 await info.attach('sheet-locale-recovered',{body:await sheet.screenshot(),contentType:'image/png'});
});
