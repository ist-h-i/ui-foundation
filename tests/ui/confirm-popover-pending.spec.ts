import {test,expect} from './catalog-test';

for(const profile of ['guided','dense'])for(const input of ['pointer','keyboard'])test(`confirm ${profile} guards trusted ${input} then Escape before busy binding renders`,async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>{
  const state={frame:0,events:[] as {type:string;key:string;trusted:boolean;at:number;frame:number;busy:string|null}[]};
  (window as unknown as {confirmInput:typeof state}).confirmInput=state;
  const frame=()=>{state.frame++;requestAnimationFrame(frame);};requestAnimationFrame(frame);
  for(const type of ['click','keydown'])document.addEventListener(type,event=>{
   const key=(event as KeyboardEvent).key??'',target=event.target as Element;
   if(target?.closest('#floating-confirm')||key==='Escape')state.events.push({type,key,trusted:event.isTrusted,at:performance.now(),frame:state.frame,busy:document.querySelector('#floating-confirm')?.getAttribute('aria-busy')??null});
  },true);
 });
 await page.goto('/catalog/floating');await page.locator('main select').first().selectOption(profile);
 const popup=page.locator('#floating-confirm'),confirm=popup.getByRole('button',{name:'確認する',exact:true}),results=[];
 for(let attempt=0;attempt<6;attempt++){
  await page.getByTestId('confirm-anchor').click();await expect(popup).toBeVisible();
  await popup.getByRole('textbox').fill('同じ入力を保持');await confirm.focus();
  const box=(await confirm.boundingBox())!;
  await page.evaluate(()=>(window as unknown as {confirmInput:{events:unknown[]}}).confirmInput.events=[]);
  if(input==='pointer')await page.mouse.click(box.x+box.width/2,box.y+box.height/2);else await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(popup).toHaveAttribute('aria-busy','true');await expect(page.getByTestId('confirm-requests')).toHaveText(String(attempt+1));
  results.push({attempt,open:await popup.isVisible(),reason:await page.getByTestId('confirm-reason').textContent(),events:await page.evaluate(()=>(window as unknown as {confirmInput:{events:unknown[]}}).confirmInput.events)});
  await page.getByTestId('confirm-success').dispatchEvent('click');await expect(popup).toBeHidden();await expect(popup).toHaveAttribute('aria-busy','false');
 }
 await testInfo.attach('trusted-input-frames',{body:JSON.stringify(results,null,2),contentType:'application/json'});
 expect(results.map(result=>result.open),'a pending request must remain open before the app busy binding catches up').toEqual(Array(6).fill(true));
});

for(const profile of ['guided','dense'])test.describe(`confirm local pending ${profile}`,()=>{
 test.beforeEach(async({page})=>{await page.goto('/catalog/floating');await page.locator('main select').first().selectOption(profile);});
 test('same task duplicate confirms and Escape wait for app busy, then error permits retry',async({page})=>{
  const popup=page.locator('#floating-confirm');await page.getByTestId('confirm-anchor').click();await popup.getByRole('textbox').fill('再試行にも残る入力');
  const confirm=popup.getByRole('button',{name:'確認する',exact:true});
  await confirm.evaluate(element=>{(element as HTMLButtonElement).click();(element as HTMLButtonElement).click();element.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));});
  await expect(page.getByTestId('confirm-requests')).toHaveText('1');await expect(popup).toBeVisible();await expect(popup).toHaveAttribute('aria-busy','true');
  await page.getByTestId('confirm-failure').dispatchEvent('click');await expect(confirm).toBeEnabled();await expect(popup.getByRole('textbox')).toHaveValue('再試行にも残る入力');
  await confirm.click();await expect(page.getByTestId('confirm-requests')).toHaveText('2');await page.getByTestId('confirm-success').dispatchEvent('click');await expect(popup).toBeHidden();await expect(page.getByTestId('confirm-reason')).toHaveText('confirm');
 });
 test('a handler without busy releases the local guard after rendering and leaves cancellation available',async({page})=>{
  await page.getByRole('combobox',{name:'確認後の応答',exact:true}).selectOption('idle');await page.getByTestId('confirm-anchor').click();
  const popup=page.locator('#floating-confirm'),confirm=popup.getByRole('button',{name:'確認する',exact:true});await confirm.click();
  await expect(page.getByTestId('confirm-requests')).toHaveText('1');await expect(popup).toHaveAttribute('aria-busy','false');await expect(confirm).toBeEnabled();await expect(confirm).toBeFocused();
  await popup.getByRole('button',{name:'取消',exact:true}).press('Enter');await expect(popup).toBeHidden();await expect(page.getByTestId('confirm-reason')).toHaveText('cancel');
 });
 test('synchronous app completion bypasses the local guard and reopening starts without pending',async({page})=>{
  await page.getByRole('combobox',{name:'確認後の応答',exact:true}).selectOption('complete');const anchor=page.getByTestId('confirm-anchor');await anchor.click();
  const popup=page.locator('#floating-confirm');await popup.getByRole('textbox').fill('完了後も残る入力');await popup.getByRole('button',{name:'確認する',exact:true}).click();
  await expect(popup).toBeHidden();await expect(page.getByTestId('confirm-requests')).toHaveText('1');await expect(page.getByTestId('confirm-reason')).toHaveText('confirm');await expect(anchor).toBeFocused();
  await anchor.click();await expect(popup.getByRole('textbox')).toHaveValue('完了後も残る入力');await expect(popup.getByRole('button',{name:'確認する',exact:true})).toBeEnabled();await page.keyboard.press('Escape');await expect(popup).toBeHidden();
 });
 test('anchor loss after confirmation forces cleanup while the app remains busy',async({page})=>{
  await page.getByTestId('confirm-anchor').click();const popup=page.locator('#floating-confirm');
  await popup.getByRole('button',{name:'確認する',exact:true}).evaluate(element=>{element.addEventListener('click',()=>{document.querySelector<HTMLElement>('[data-testid=confirm-anchor]')!.hidden=true;},{once:true});});
  await popup.getByRole('button',{name:'確認する',exact:true}).click();await expect(page.getByTestId('confirm-requests')).toHaveText('1');await expect(popup).toBeHidden();await expect(popup).toHaveAttribute('aria-busy','true');
  await expect(page.getByTestId('confirm-reason')).toHaveText(/scope-exit|target-unavailable/);await page.getByTestId('confirm-success').dispatchEvent('click');
  await page.getByTestId('confirm-anchor').evaluate(element=>(element as HTMLElement).hidden=false);await page.getByTestId('confirm-anchor').click();await expect(popup.getByRole('button',{name:'取消',exact:true})).toBeEnabled();await page.keyboard.press('Escape');await expect(popup).toBeHidden();
 });
 test('Angular destruction in the confirmation task clears pending and recreates a usable popup',async({page})=>{
  await page.getByRole('combobox',{name:'確認後の応答',exact:true}).selectOption('idle');await page.getByTestId('confirm-anchor').click();const popup=page.locator('#floating-confirm');
  await popup.getByRole('button',{name:'確認する',exact:true}).evaluate(element=>{element.addEventListener('click',()=>document.querySelector<HTMLButtonElement>('[data-testid=confirm-destroy]')!.click(),{once:true});});
  await popup.getByRole('button',{name:'確認する',exact:true}).click();await expect(page.getByTestId('confirm-requests')).toHaveText('1');await expect(popup).toHaveCount(0);
  await page.getByTestId('confirm-destroy').click();await page.getByTestId('confirm-anchor').click();await expect(popup).toBeVisible();await expect(popup).toHaveAttribute('aria-busy','false');
  await expect(popup.getByRole('button',{name:'確認する',exact:true})).toBeEnabled();await popup.getByRole('button',{name:'取消',exact:true}).click();await expect(popup).toBeHidden();await expect(page.getByTestId('confirm-requests')).toHaveText('1');
 });
});
