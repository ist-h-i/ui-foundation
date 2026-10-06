import {test,expect} from './catalog-test';
import AxeBuilder from '@axe-core/playwright';

for(const profile of ['guided','dense'])test(`Card ${profile}: horizontal slots remain within the narrow viewport in both text directions`,async({page})=>{
 await page.goto('/catalog');
 await page.locator('#catalog-profile').selectOption(profile);
 const card=page.locator('ui-card').filter({has:page.locator('#verification-card-content')});
 const input=card.getByRole('textbox',{name:'Card内メモ',exact:true}),native=await input.elementHandle();
 await input.fill('幅が変わっても保持する入力');
 await page.getByLabel('Card横向き',{exact:true}).check();
 await page.setViewportSize({width:320,height:900});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const observations:unknown[]=[];
 for(const rtl of [false,true]){
  await page.getByLabel('RTL',{exact:true}).setChecked(rtl);
  await expect(card.locator('[data-card-area]:visible')).toHaveCount(5);
  const bounds=await card.evaluate(node=>{
   const rect=(element:Element)=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};};
   return {card:rect(node),content:rect(node.querySelector('.ui-card__content')!),input:rect(node.querySelector('input')!),areas:[...node.querySelectorAll('[data-card-area]')].map(element=>({area:element.getAttribute('data-card-area'),...rect(element)}))};
  });
  for(const rect of [bounds.card,bounds.input,...bounds.areas]){
   expect(rect.left).toBeGreaterThanOrEqual(-1);expect(rect.right).toBeLessThanOrEqual(321);
  }
  for(const area of bounds.areas.filter(area=>area.area!=='header'))expect(area.width).toBeCloseTo(bounds.content.width,0);
  await input.click();await expect(input).toBeFocused();
  expect(await input.evaluate((element,previous)=>element===previous,native)).toBe(true);
  await expect(input).toHaveValue('幅が変わっても保持する入力');
  const analysis=await new AxeBuilder({page}).include('ui-card').analyze();expect(analysis.violations).toEqual([]);
  observations.push({rtl,bounds,violations:analysis.violations,incomplete:analysis.incomplete});
 }
 await test.info().attach('card-narrow-slot-geometry',{body:JSON.stringify(observations,null,2),contentType:'application/json'});
});
