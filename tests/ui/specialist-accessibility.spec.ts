import AxeBuilder from '@axe-core/playwright';
import {test,expect} from './catalog-test';
import {profiles,openSpecialistCatalog,prepareSpecialistAccessibilityState,specialistSurfaces,type SpecialistSurface} from './specialist-test-helpers';

test.use({reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
for(const profile of profiles){
 for(const surface of Object.keys(specialistSurfaces) as SpecialistSurface[]){
  test(profile+': specialist axe / 320px / 200% / RTL / reduced motion - '+surface,async({page},info)=>{
   await openSpecialistCatalog(page,profile);
   await prepareSpecialistAccessibilityState(page,surface);
   await page.setViewportSize({width:320,height:800});
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');
   await page.getByRole('button',{name:'方向: LTR',exact:true}).click();
   await expect(page.locator('main[data-ui-profile]')).toHaveAttribute('dir','rtl');
   expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
   const report=await new AxeBuilder({page}).analyze();
   const dimensions=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   await info.attach('specialist-axe',{body:JSON.stringify({profile,surface,violations:report.violations,dimensions}),contentType:'application/json'});
   await info.attach('specialist-320-200-rtl',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
   expect(report.violations).toEqual([]);
   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+1);
  });
 }
}
