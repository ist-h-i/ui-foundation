import {test,expect} from './catalog-test';
import type {Locator,Page} from '@playwright/test';
import {readNativeAudioState,readNativeVideoState} from './media-test-dom';

async function narrow(page:Page):Promise<void>{
 await page.setViewportSize({width:320,height:900});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
}

async function visibleFocus(target:Locator):Promise<void>{
 await expect(target).toBeFocused();
 await expect.poll(()=>target.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('solid');
 await expect.poll(()=>target.evaluate(element=>parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThan(0);
}

async function readableFocus(target:Locator):Promise<void>{
 await visibleFocus(target);
 await expect.poll(()=>target.evaluate(element=>{
  const box=element.getBoundingClientRect(),style=getComputedStyle(element),margin=parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset);
  const range=document.createRange();range.selectNodeContents(element);const glyph=range.getBoundingClientRect();
  const hit=document.elementFromPoint((glyph.left+glyph.right)/2,(glyph.top+glyph.bottom)/2);
  return box.left-margin>=-.5&&box.right+margin<=innerWidth+.5&&box.top-margin>=-.5&&box.bottom+margin<=innerHeight+.5&&glyph.left>=-.5&&glyph.right<=innerWidth+.5&&glyph.top>=-.5&&glyph.bottom<=innerHeight+.5&&!!hit&&(element===hit||element.contains(hit));
 }),{message:'the owned focus target, its full text and outline remain inside the viewport'}).toBe(true);
}

async function openMedia(page:Page,profile:'guided'|'dense'):Promise<void>{
 await page.goto('/catalog/media');
 await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>!!window.__mediaCatalog&&!!window.__mediaApplication)).toBe(true);
 if(profile==='dense')await page.getByRole('button',{name:'プロファイル guided',exact:true}).click();
 await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
 await narrow(page);
}

async function recordClip(page:Page,durationMs=350):Promise<Buffer>{
 const encoded=await page.evaluate(async durationMs=>{
  const canvas=document.createElement('canvas');canvas.width=100;canvas.height=80;
  const context=canvas.getContext('2d');if(!context)throw new Error('Expected a native canvas context');
  const stream=canvas.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks:Blob[]=[];
  recorder.ondataavailable=event=>chunks.push(event.data);
  const result=new Promise<string>(resolve=>{recorder.onstop=()=>{
   stream.getTracks().forEach(track=>track.stop());
   const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]!);
   reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));
  };});
  recorder.start();let frame=0;const paint=()=>{context.fillStyle=frame++%2?'blue':'navy';context.fillRect(0,0,100,80);};paint();const animation=setInterval(paint,100);
  await new Promise(resolve=>setTimeout(resolve,durationMs));clearInterval(animation);recorder.stop();return result;
 },durationMs);
 return Buffer.from(encoded,'base64');
}

async function delayActualPlay(page:Page,kind:'audio'|'video'='audio'):Promise<void>{
 await expect.poll(()=>page.getByTestId(kind).locator(kind).evaluate(element=>(element as HTMLMediaElement).readyState)).toBeGreaterThan(0);
 await page.evaluate(kind=>{
  const media=document.querySelector(`[data-testid=${kind}] ${kind}`);
  if(!(media instanceof HTMLMediaElement))throw new TypeError('Expected a native media element');
  const nativePlay=media.play.bind(media),nativePause=media.pause.bind(media);
  const probe={calls:0,pauses:0,pending:[] as Array<()=>void>};window.nativePlayProbe=probe;
  media.pause=()=>{probe.pauses++;nativePause();};
  // Playback itself is native. Only its successful Promise completion is held.
  media.play=()=>{probe.calls++;return nativePlay().then(()=>new Promise<void>(resolve=>probe.pending.push(resolve)));};
 },kind);
}

async function releaseNativePlay(page:Page):Promise<void>{
 await page.evaluate(()=>{const release=window.nativePlayProbe.pending.shift();if(!release)throw new Error('Expected a held native play completion');release();});
}

for(const profile of ['guided','dense'] as const){
 test(profile+': native video reload keeps owned busy/error focus and preserves external focus through real recovery',async({page,context})=>{
  await openMedia(page,profile);
  const video=page.getByTestId('video'),player=video.locator('ui-video-player'),status=player.locator('[data-media-status]'),picker=video.getByLabel('動画ファイル',{exact:true});
  await picker.setInputFiles({name:'invalid-focus.webm',mimeType:'video/webm',buffer:Buffer.from('invalid native media')});
  await expect(status).toContainText('メディアを取得できません。');
  const clip=await recordClip(page),pattern='**/focus-retry-video.webm';
  let hold=false,recover=false;const held:Array<()=>void>=[];
  const release=()=>{hold=false;held.splice(0).forEach(resolve=>resolve());};
  await context.route(pattern,async route=>{
   if(hold)await new Promise<void>(resolve=>held.push(resolve));
   await route.fulfill({status:200,contentType:'video/webm',body:recover?clip:Buffer.from('invalid native media')});
  });
  try{
   await page.evaluate(()=>window.__mediaCatalog.videoSrc.set('/assets/focus-retry-video.webm'));
   await expect(video.locator('video')).toHaveAttribute('src','/assets/focus-retry-video.webm');
   await expect(status).toContainText('メディアを取得できません。');
   const retry=player.getByRole('button',{name:'メディアを再取得',exact:true});
   hold=true;await retry.focus();await page.keyboard.press('Enter');
   await expect.poll(()=>held.length).toBe(1);
   await expect(player).toHaveAttribute('aria-busy','true');
   await expect(status).toHaveText('読み込んでいます。');await readableFocus(status);
   release();await expect(status).toContainText('メディアを取得できません。');await readableFocus(retry);

   hold=true;await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);
   await expect(status).toBeFocused();await picker.focus();release();
   await expect(status).toContainText('メディアを取得できません。');await expect(picker).toBeFocused();

   hold=true;recover=true;await retry.focus();await page.keyboard.press('Enter');
   await expect.poll(()=>held.length).toBe(1);await expect(status).toBeFocused();release();
   await expect.poll(()=>video.locator('video').evaluate(readNativeVideoState).then(state=>state.readyState)).toBeGreaterThan(0);
   await expect.poll(()=>video.locator('video').evaluate(readNativeVideoState).then(state=>state.videoWidth)).toBe(100);
   await expect(player).toHaveAttribute('aria-busy','false');await expect(retry).toHaveCount(0);
   await expect(status).toHaveText('一時停止または停止中');await readableFocus(status);

   // The public File input replaces the source with a real recorded clip.
   await picker.focus();await picker.setInputFiles({name:'recorded-focus.webm',mimeType:'video/webm',buffer:clip});
   await expect.poll(()=>video.locator('video').evaluate(readNativeVideoState).then(state=>state.videoWidth)).toBe(100);
   await expect(video.locator('video')).toHaveAttribute('src',/^blob:/);await expect(picker).toBeFocused();
   await expect(status).not.toContainText('メディアを取得できません。');
  }finally{release();await context.unroute(pattern);}
 });

 test(profile+': actual play completion restores owned focus and cannot replace a newer play or external input focus',async({page})=>{
  await openMedia(page,profile);await delayActualPlay(page);
  const audio=page.getByTestId('audio'),player=audio.locator('ui-audio-player'),status=player.locator('[data-media-status]'),play=player.getByRole('button',{name:'再生',exact:true}),pause=player.getByRole('button',{name:'一時停止',exact:true}),stop=player.getByRole('button',{name:'停止',exact:true});
  await play.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
  await expect.poll(()=>audio.locator('audio').evaluate(readNativeAudioState).then(state=>state.paused)).toBe(false);
  await expect(pause).toBeDisabled();await readableFocus(status);await expect(status).toHaveText('再生中');
  await releaseNativePlay(page);await expect(pause).toBeEnabled();await readableFocus(pause);

  await stop.focus();await page.keyboard.press('Enter');await play.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
  await stop.focus();await page.keyboard.press('Enter');await play.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(2);
  const pauses=await page.evaluate(()=>window.nativePlayProbe.pauses);
  await releaseNativePlay(page);await expect(pause).toBeDisabled();await expect(status).toBeFocused();
  expect(await page.evaluate(()=>window.nativePlayProbe.pauses)).toBe(pauses);
  await releaseNativePlay(page);await expect(pause).toBeFocused();

  await stop.click();await play.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
  const volume=audio.getByLabel('音量',{exact:true});await volume.focus();await releaseNativePlay(page);
  await expect(pause).toBeEnabled();await expect(volume).toBeFocused();

 });

 for(const interruption of ['hidden','disabled','source','destroy'] as const)test(profile+': pending native playback '+interruption+' preserves external focus and interrupts only its owner',async({page})=>{
   await openMedia(page,profile);await delayActualPlay(page);
   await page.getByTestId('audio').getByRole('button',{name:'再生',exact:true}).focus();await page.keyboard.press('Enter');
   await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
   let outside:Locator;
   if(interruption==='hidden')outside=page.getByRole('button',{name:'媒体を表示・非表示',exact:true});
   else if(interruption==='disabled')outside=page.getByRole('button',{name:/^無効 /});
   else if(interruption==='destroy')outside=page.getByRole('button',{name:'媒体を生成・破棄',exact:true});
   else outside=page.getByRole('button',{name:/^RTL /});
   await outside.focus();
   if(interruption==='source'){
    await page.evaluate(()=>window.__mediaCatalog.audioSrc.set('/assets/media/tone.wav?focus-replaced'));
    await expect(page.getByTestId('audio').locator('audio')).toHaveAttribute('src','/assets/media/tone.wav?focus-replaced');
   }else await page.keyboard.press('Enter');
   if(interruption==='hidden')await expect(page.getByTestId('audio')).toBeHidden();
   if(interruption==='disabled')await expect(page.getByTestId('audio').getByRole('button',{name:/^(再生|一時停止)$/})).toBeDisabled();
   if(interruption==='destroy')await expect(page.locator('ui-audio-player')).toHaveCount(0);
   await releaseNativePlay(page);await expect(outside).toBeFocused();
   if(interruption!=='destroy')await expect.poll(()=>page.getByTestId('audio').locator('audio').evaluate(readNativeAudioState).then(state=>state.paused)).toBe(true);

 });

 test(profile+': native formula retry keeps busy/failure focus, preserves input and external focus, and recovers with the real worker',async({page,context})=>{
  const pattern='**/invalid-library-worker.mjs';let hold=false,recover=false;const held:Array<()=>void>=[];
  const release=()=>{hold=false;held.splice(0).forEach(resolve=>resolve());};
  await context.route(pattern,async route=>{
   if(hold)await new Promise<void>(resolve=>held.push(resolve));
   if(recover){
    const url=new URL('/assets/sheet-formula.worker.js',route.request().url()).href;
    await route.fulfill({response:await route.fetch({url})});
   }else await route.fulfill({status:200,contentType:'text/javascript',body:"postMessage({type:'sheet-ready',version:999});"});
  });
  try{
   await page.goto('/catalog/sheet-locale');await page.getByRole('combobox',{name:'プロファイル',exact:true}).selectOption(profile);await narrow(page);
   const sheet=page.locator('ui-spreadsheet'),status=sheet.locator('[data-calculation-status]'),formula=sheet.locator('[data-sheet-cell="0,2"]'),source=page.locator('#sheet-source'),worker=page.getByRole('combobox',{name:'計算worker',exact:true});
   await expect(formula).toHaveValue('5');const original=await source.textContent();
   await worker.selectOption('/assets/invalid-library-worker.mjs');await expect(status).toHaveText('The calculation could not be confirmed.');
   await expect(formula).toHaveValue('=SUM(A1:B1)');
   const retry=sheet.getByRole('button',{name:'数式の計算を再試行',exact:true});
   hold=true;await retry.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);
   await expect(retry).toBeDisabled();await expect(status).toHaveText('数式を計算しています。');await readableFocus(status);
   await expect(source).toHaveText(original!);release();
   await expect(status).toHaveText('The calculation could not be confirmed.');await readableFocus(retry);

   hold=true;await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);
   const cell=sheet.locator('[data-sheet-cell="0,0"]');await cell.focus();release();
   await expect(status).toHaveText('The calculation could not be confirmed.');await expect(cell).toBeFocused();await expect(cell).toHaveValue('2');

   hold=true;await retry.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);
   const outside=page.getByRole('button',{name:'辞書を切り替え',exact:true});await outside.focus();release();
   await expect(status).toHaveText('The calculation could not be confirmed.');await expect(outside).toBeFocused();

   hold=true;recover=true;await retry.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);
   await expect(status).toBeFocused();release();await expect(formula).toHaveValue('5');
   await expect(status).toHaveText('計算済み');await expect(retry).toBeDisabled();await readableFocus(status);await expect(source).toHaveText(original!);

   recover=false;await worker.selectOption('/assets/sheet-formula.worker.js');await expect(formula).toHaveValue('5');
   await worker.selectOption('/assets/invalid-library-worker.mjs');await expect(status).toHaveText('The calculation could not be confirmed.');
   hold=true;await retry.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);
   await worker.focus();await worker.selectOption('/assets/sheet-formula.worker.js');await expect(formula).toHaveValue('5');
   release();await expect(worker).toBeFocused();await expect(status).toHaveText('計算済み');await expect(source).toHaveText(original!);
  }finally{release();await context.unroute(pattern);}
 });

 test(profile+': native condition save retains pending focus, returns owned failure to Save and preserves external focus and stale-result ownership',async({page})=>{
  await page.goto('/catalog/choices');await page.getByRole('combobox',{name:'表示設定',exact:true}).selectOption(profile);await narrow(page);
  await page.locator('#restore-nested').click();
  const builder=page.locator('ui-filter-builder'),save=builder.getByRole('button',{name:'条件を保存',exact:true}),status=builder.locator('[data-filter-status]'),model=page.locator('#filter-model'),requests=page.locator('#filter-request-count'),result=page.locator('#filter-result');
  const original=await model.textContent(),editor=builder.locator('#filter-word-value'),handle=await editor.elementHandle();
  await save.focus();await page.keyboard.press('Enter');
  await expect(requests).toHaveText('1');await expect(builder.locator('section')).toHaveAttribute('aria-busy','true');
  await expect(save).toBeDisabled();await expect(status).toHaveText('保存結果を確認しています。');await readableFocus(status);await expect(model).toHaveText(original!);
  // Public fixture response controls do not move focus when dispatching a result.
  await page.locator('#filter-fail').dispatchEvent('click');await expect(result).toHaveText('true');
  await expect(builder.getByRole('alert')).toHaveText('条件を保存できません。');await readableFocus(save);

  await page.keyboard.press('Enter');await expect(requests).toHaveText('2');await expect(status).toBeFocused();
  await page.keyboard.press('Enter');await expect(requests).toHaveText('2');
  await page.locator('#filter-old').dispatchEvent('click');await expect(result).toHaveText('false');
  await expect(builder.locator('section')).toHaveAttribute('aria-busy','true');await expect(status).toBeFocused();
  const outside=page.locator('#outside');await outside.focus();const externalScroll=await page.evaluate(()=>scrollY);await page.locator('#filter-fail').dispatchEvent('click');
  await expect(result).toHaveText('true');await expect(outside).toBeFocused();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(externalScroll);

  await save.focus();await page.keyboard.press('Enter');await expect(requests).toHaveText('3');
  await page.locator('#filter-approve').dispatchEvent('click');await expect(result).toHaveText('true');
  await expect(status).toHaveText('条件を保存しました。');await readableFocus(status);await expect(save).toBeDisabled();
  await expect(model).toHaveText(original!);expect(await editor.evaluate((element,previous)=>element===previous,handle)).toBe(true);

  await editor.fill('新しい下書き');await save.focus();await page.keyboard.press('Enter');await expect(requests).toHaveText('4');
  const reset=page.locator('#reset-filter');await reset.focus();await page.keyboard.press('Enter');
  await page.locator('#filter-approve').dispatchEvent('click');await expect(result).toHaveText('false');await expect(reset).toBeFocused();
  const replaced=await model.textContent();expect(JSON.parse(replaced!).children).toEqual([]);

  await save.focus();await page.keyboard.press('Enter');await expect(requests).toHaveText('5');
  const disable=page.getByRole('button',{name:'フォームの無効状態を切替',exact:true});await disable.focus();await page.keyboard.press('Enter');
  await page.locator('#filter-fail').dispatchEvent('click');await expect(result).toHaveText('true');await expect(disable).toBeFocused();await expect(save).toBeDisabled();await expect(model).toHaveText(replaced!);
  await page.keyboard.press('Enter');await expect(save).toBeEnabled();

  await save.focus();await page.keyboard.press('Enter');await expect(requests).toHaveText('6');
  const hide=page.locator('#hide-filter');await hide.focus();await page.keyboard.press('Enter');await expect(builder).toHaveCount(0);
  await page.locator('#filter-approve').dispatchEvent('click');await expect(result).toHaveText('false');await expect(hide).toBeFocused();
  await page.keyboard.press('Enter');await expect(builder).toBeVisible();await expect(hide).toBeFocused();await expect(model).toHaveText(replaced!);
 });
}

for(const profile of ['guided','dense'] as const)test(profile+': actual video playback keeps its pending status and completed action visible without stealing an external input',async({page})=>{
 test.setTimeout(60_000);await openMedia(page,profile);const video=page.getByTestId('video'),player=video.locator('ui-video-player'),picker=video.getByLabel('動画ファイル',{exact:true});
 await picker.setInputFiles({name:'native-focus-play.webm',mimeType:'video/webm',buffer:await recordClip(page,5000)});
 await expect.poll(()=>video.locator('video').evaluate(readNativeVideoState).then(state=>state.videoWidth)).toBe(100);
 await delayActualPlay(page,'video');
 const play=player.getByRole('button',{name:'再生',exact:true}),pause=player.getByRole('button',{name:'一時停止',exact:true}),stop=player.getByRole('button',{name:'停止',exact:true}),status=player.locator('[data-media-status]');
 await play.focus();await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
 await expect.poll(()=>video.locator('video').evaluate(element=>{if(!(element instanceof HTMLVideoElement))throw new TypeError('Expected a native video element');return element.paused;})).toBe(false);await expect(pause).toBeDisabled();await readableFocus(status);
 const volume=video.getByLabel('音量',{exact:true});await volume.focus();const externalScroll=await page.evaluate(()=>scrollY);await releaseNativePlay(page);
 await expect(pause).toBeEnabled();await expect(volume).toBeFocused();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(externalScroll);
 await stop.focus();await page.keyboard.press('Enter');await play.focus();await page.keyboard.press('Enter');
 await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);await readableFocus(status);
 await releaseNativePlay(page);await expect(pause).toBeEnabled();await readableFocus(pause);
});
