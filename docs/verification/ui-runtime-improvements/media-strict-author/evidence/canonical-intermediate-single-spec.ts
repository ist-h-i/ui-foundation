import {test,expect} from './catalog-test';import type {Page,Locator} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type FixtureValue<T>={set(value:T):void};
interface MediaFixtureControls {
 audioSrc:FixtureValue<string>;
 captions:FixtureValue<readonly {id:string;src:string;language:string;label:string}[]>;
 pdfSrc:FixtureValue<string|null>;
 profile:FixtureValue<'guided'|'dense'>;
 rtl:FixtureValue<boolean>;
 autoplay:FixtureValue<boolean>;
 audioPlayer():{stop():void;play():Promise<void>}|undefined;
}
declare global {
 interface Window {
  __mediaCatalog:MediaFixtureControls;
  __mediaApplication:{destroy():void};
  nativePlayProbe:{calls:number;pauses:number;pending:Array<()=>void>};
  nativeReentryProbe:{sequence:string[];playing:number};
  savedNativeAudio:HTMLAudioElement;
 }
}
/** Serialized by Playwright into the browser; reject a mismatched native tag. */
function readNativeAudioState(node:SVGElement|HTMLElement){
 if(!(node instanceof HTMLAudioElement))throw new TypeError('Expected a native audio element');
 return {readyState:node.readyState,currentTime:node.currentTime,paused:node.paused,trackCount:node.textTracks.length,modes:Array.from(node.textTracks,track=>track.mode)};
}
function readNativeImageWidth(node:SVGElement|HTMLElement){
 if(!(node instanceof HTMLImageElement))throw new TypeError('Expected a native image element');
 return node.naturalWidth;
}
async function evidence(name:string,value:unknown){await test.info().attach(name,{body:JSON.stringify(value,null,2),contentType:'application/json'});}
async function settledScroll(viewport:Locator){await viewport.evaluate(node=>new Promise<void>(resolve=>{let left=node.scrollLeft,top=node.scrollTop,stable=0;const frame=()=>{if(left===node.scrollLeft&&top===node.scrollTop)stable++;else{left=node.scrollLeft;top=node.scrollTop;stable=0;}if(stable>=3)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);}));}

async function open(page:Page){
 await page.goto('/catalog/media');await expect(page.getByRole('heading',{name:'添付・画像・メディアの操作'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!window.__mediaCatalog&&!!window.__mediaApplication)).toBe(true);
 await expect.poll(()=>page.getByTestId('audio').locator('audio').evaluate(readNativeAudioState).then(media=>media.readyState)).toBeGreaterThan(0);
}
async function delayNativePlay(page:Page,delayBoth=false){
 await page.evaluate(delayBoth=>{
  const media=document.querySelector('[data-testid=audio] audio');
  if(!(media instanceof HTMLAudioElement))throw new TypeError('Expected a native audio element');
  const nativePlay=media.play.bind(media),nativePause=media.pause.bind(media);
  const probe={calls:0,pauses:0,pending:[] as Array<()=>void>};window.nativePlayProbe=probe;
  media.pause=()=>{probe.pauses++;nativePause();};
  media.play=()=>{
   const call=++probe.calls;
   const actual=nativePlay();
   return call===1||delayBoth?actual.then(()=>new Promise<void>(resolve=>probe.pending.push(resolve))):actual;
  };
 },delayBoth);
}
async function currentTime(page:Page){return page.getByTestId('audio').locator('audio').evaluate(readNativeAudioState).then(media=>media.currentTime);}

test('real play completion ownership: Stop/newPlay/old fulfillment, native playing reentry and current forbidden cleanup',async({page})=>{
 const observations:unknown[]=[];
 // Delay fulfillment only after actual native playback starts. The media state is never faked.
 for(const delayBoth of [false,true]){
  await open(page);await delayNativePlay(page,delayBoth);
  const audio=page.getByTestId('audio'),native=audio.locator('audio');
  await audio.getByRole('button',{name:'再生',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
  await expect.poll(()=>native.evaluate(readNativeAudioState).then(media=>media.paused)).toBe(false);
  await audio.getByRole('button',{name:'停止',exact:true}).click();
  await audio.getByRole('button',{name:'再生',exact:true}).click();
  await expect.poll(()=>native.evaluate(readNativeAudioState).then(media=>media.paused)).toBe(false);
  if(delayBoth)await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(2);
  else await expect(audio.getByRole('button',{name:'一時停止',exact:true})).toBeEnabled();
  const pauses=await page.evaluate(()=>window.nativePlayProbe.pauses);
  await page.evaluate(()=>window.nativePlayProbe.pending[0]());
  await expect.poll(()=>native.evaluate(readNativeAudioState).then(media=>media.paused)).toBe(false);
  expect(await page.evaluate(()=>window.nativePlayProbe.pauses)).toBe(pauses);
  if(delayBoth){await expect(audio.getByRole('button',{name:'一時停止',exact:true})).toBeDisabled();await page.evaluate(()=>window.nativePlayProbe.pending[1]());}
  await expect(audio.getByRole('button',{name:'一時停止',exact:true})).toBeEnabled();
  const time=await currentTime(page);await expect.poll(()=>currentTime(page)).toBeGreaterThan(time);
  observations.push({case:delayBoth?'old completion while newer promise remains pending':'old completion after newer promise fulfilled',paused:await native.evaluate(readNativeAudioState).then(media=>media.paused),oldCompletionPauseCount:await page.evaluate(()=>window.nativePlayProbe.pauses)-pauses,currentTimeBefore:time,currentTimeAfter:await currentTime(page)});
 }
 // No wrapper: the first native playing event invokes the public stop/play methods synchronously.
 await open(page);
 await page.evaluate(()=>{
  const app=window.__mediaCatalog,media=document.querySelector('[data-testid=audio] audio');
  if(!(media instanceof HTMLAudioElement))throw new TypeError('Expected a native audio element');
  const probe={sequence:[] as string[],playing:0};window.nativeReentryProbe=probe;
  media.addEventListener('playing',()=>probe.playing++);
  media.addEventListener('playing',()=>{const player=app.audioPlayer();if(!player)throw new Error('Expected the connected audio player');probe.sequence.push('playing');player.stop();probe.sequence.push('stop');void player.play();probe.sequence.push('new play');},{once:true});
 });
 await page.getByTestId('audio').getByRole('button',{name:'再生',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.nativeReentryProbe.playing)).toBeGreaterThanOrEqual(2);
 expect(await page.evaluate(()=>window.nativeReentryProbe.sequence)).toEqual(['playing','stop','new play']);
 await expect.poll(()=>page.getByTestId('audio').locator('audio').evaluate(readNativeAudioState).then(media=>media.paused)).toBe(false);
 const reentryTime=await currentTime(page);await expect.poll(()=>currentTime(page)).toBeGreaterThan(reentryTime);
 observations.push({case:'native playing event reentry without wrapper',paused:await page.getByTestId('audio').locator('audio').evaluate(readNativeAudioState).then(media=>media.paused),probe:await page.evaluate(()=>window.nativeReentryProbe),currentTimeBefore:reentryTime,currentTimeAfter:await currentTime(page)});
 for(const forbidden of ['hidden','disabled','source','destroy']){
  await open(page);await delayNativePlay(page);
  const audio=page.getByTestId('audio');
  await audio.getByRole('button',{name:'再生',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.nativePlayProbe.pending.length)).toBe(1);
  await page.evaluate(()=>{const media=document.querySelector('[data-testid=audio] audio');if(!(media instanceof HTMLAudioElement))throw new TypeError('Expected a native audio element');window.savedNativeAudio=media;});
  if(forbidden==='hidden'){await page.getByRole('button',{name:'媒体を表示・非表示'}).click();await expect(audio).toBeHidden();}
  if(forbidden==='disabled'){await page.getByRole('button',{name:'無効 false'}).click();await expect(audio.getByRole('button',{name:/^(再生|一時停止)$/})).toBeDisabled();}
  if(forbidden==='source'){await page.evaluate(()=>window.__mediaCatalog.audioSrc.set('/assets/media/tone.wav?replaced'));await expect(audio.locator('audio')).toHaveAttribute('src','/assets/media/tone.wav?replaced');}
  if(forbidden==='destroy'){await page.getByRole('button',{name:'媒体を生成・破棄'}).click();await expect(page.locator('ui-audio-player')).toHaveCount(0);}
  await expect.poll(()=>page.evaluate(()=>window.savedNativeAudio.paused)).toBe(true);
  await page.evaluate(()=>window.nativePlayProbe.pending[0]());
  expect(await page.evaluate(()=>window.savedNativeAudio.paused)).toBe(true);
  if(forbidden==='destroy')expect(await page.evaluate(()=>window.savedNativeAudio.hasAttribute('src'))).toBe(false);
  observations.push({case:'current '+forbidden+' cleanup before and after stale fulfillment',paused:await page.evaluate(()=>window.savedNativeAudio.paused),hasSrc:await page.evaluate(()=>window.savedNativeAudio.hasAttribute('src'))});
 }
 await evidence('media-play-ownership',observations);
});

test('real VTT removal and source replacement reconcile selected caption, native mode and current cue',async({page})=>{
 const observations:unknown[]=[];
 await open(page);const audio=page.getByTestId('audio'),select=audio.getByRole('combobox',{name:'字幕',exact:true});
 await select.selectOption('ja');await audio.getByRole('button',{name:'再生',exact:true}).click();
 await expect(audio.locator('.ui-media-caption')).toHaveText('確認用の字幕です。');
 await page.evaluate(()=>window.__mediaCatalog.captions.set([]));
 await expect.poll(()=>audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.trackCount)).toBe(0);
 await expect(select).toHaveValue('');await expect(audio.locator('.ui-media-caption')).toHaveCount(0);
 observations.push({case:'caption removal',trackCount:await audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.trackCount),selection:await select.inputValue(),cueCount:await audio.locator('.ui-media-caption').count()});
 await page.evaluate(()=>window.__mediaCatalog.captions.set([{id:'second',src:'/assets/media/replacement.vtt',language:'ja',label:'別の字幕'}]));
 await select.selectOption('second');await expect(audio.locator('.ui-media-caption')).toHaveText('差し替えた確認字幕です。');
 let release:(()=>void)|undefined;
 await page.route('**/replacement-two.vtt?held',async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue();});
 await page.evaluate(()=>window.__mediaCatalog.captions.set([{id:'second',src:'/assets/media/replacement-two.vtt?held',language:'ja',label:'更新字幕'}]));
 await expect.poll(()=>!!release).toBe(true);
 await expect(select).toHaveValue('second');await expect(audio.locator('.ui-media-caption')).toHaveCount(0);
 observations.push({case:'same ID new src while actual VTT request pending',selection:await select.inputValue(),cueCount:await audio.locator('.ui-media-caption').count()});
 release!();await expect(audio.locator('.ui-media-caption')).toHaveText('二つ目の確認字幕です。');
 await page.evaluate(()=>window.__mediaCatalog.captions.set([{id:'other',src:'/assets/media/sample.vtt',language:'ja',label:'先頭の字幕'},{id:'second',src:'/assets/media/replacement-two.vtt?held',language:'ja',label:'更新字幕'}]));
 await expect(select).toHaveValue('second');
 await expect.poll(()=>audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.modes)).toEqual(['disabled','showing']);
 await expect(audio.locator('.ui-media-caption')).toHaveText('二つ目の確認字幕です。');
 observations.push({case:'real replacement loaded and reordered',selection:await select.inputValue(),modes:await audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.modes),cue:await audio.locator('.ui-media-caption').textContent()});
 await audio.locator('audio').evaluate(media=>{if(!(media instanceof HTMLAudioElement))throw new TypeError('Expected a native audio element');const elements=media.querySelectorAll('track');elements[0].track.mode='showing';elements[1].track.mode='disabled';});
 await expect.poll(()=>audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.modes)).toEqual(['disabled','showing']);
 await expect(select).toHaveValue('second');await expect(audio.locator('.ui-media-caption')).toHaveText('二つ目の確認字幕です。');
 observations.push({case:'native mode change cannot replace explicit selection owner',selection:await select.inputValue(),modes:await audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.modes)});
 await select.selectOption('other');await expect(audio.locator('.ui-media-caption')).toHaveText('確認用の字幕です。');
 await select.selectOption('');await expect(audio.locator('.ui-media-caption')).toHaveCount(0);
 await expect.poll(()=>audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.modes)).toEqual(['disabled','disabled']);
 observations.push({case:'native labelled select explicitly changes and clears caption owner',selection:await select.inputValue(),modes:await audio.locator('audio').evaluate(readNativeAudioState).then(media=>media.modes),cueCount:await audio.locator('.ui-media-caption').count()});
 await evidence('media-caption-reconciliation',observations);
});

test('PDF empty/loading/loaded/error named scrolling surface passes actual axe in guided/dense 320px 200% RTL',async({page})=>{
 const observations:unknown[]=[];
 await open(page);const pdf=page.getByTestId('pdf');
 await page.setViewportSize({width:320,height:1000});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.__mediaCatalog.rtl.set(true);});
 for(const profile of ['guided','dense'] as const){
  await page.evaluate(profile=>window.__mediaCatalog.profile.set(profile),profile);
  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  await page.evaluate(()=>window.__mediaCatalog.pdfSrc.set(null));
  await expect(pdf.getByRole('status')).toContainText('PDFを選択してください。');
  let analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'empty',violations:analysis.violations});
  let release:(()=>void)|undefined;
  const target='**/sample.pdf?pending-'+profile;
  await page.route(target,async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue();});
  await page.evaluate(profile=>window.__mediaCatalog.pdfSrc.set('/assets/media/sample.pdf?pending-'+profile),profile);
  await expect.poll(()=>!!release).toBe(true);
  await expect(pdf.getByRole('status')).toContainText('PDFを読込み中です。');
  analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'loading actual held request',violations:analysis.violations});
  release!();await expect(pdf.locator('canvas')).toBeVisible();
  analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'loaded actual PDF.js canvas',violations:analysis.violations});
  await pdf.getByRole('region',{name:'申請資料のページ表示'}).focus();
  await page.keyboard.press('ArrowDown');
  await page.evaluate(()=>window.__mediaCatalog.pdfSrc.set('/assets/media/invalid.pdf'));
  await expect(pdf.getByText(/PDFを読み込めません/)).toBeVisible();
  analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'invalid PDF error',violations:analysis.violations});
  await page.unroute(target);
 }
 await evidence('pdf-named-region-axe',observations);
});

test('open Lightbox named zoomed image scrolling surface passes actual axe in both profiles at 320px 200% RTL',async({page})=>{
 await open(page);await page.setViewportSize({width:320,height:1000});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.__mediaCatalog.rtl.set(true);});
 const observations:unknown[]=[];
 for(const profile of ['guided','dense'] as const){
  await page.evaluate(profile=>window.__mediaCatalog.profile.set(profile),profile);
  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  await page.getByRole('button',{name:'画像ビューアーを開く'}).click();
  const dialog=page.locator('dialog:modal');await expect(dialog).toBeVisible();
  const position=parseInt((await dialog.getByRole('status').first().textContent())!,10);
  for(let index=1;index<position;index++)await dialog.getByRole('button',{name:'前の画像',exact:true}).click();
  await dialog.getByLabel('拡大率',{exact:true}).focus();await page.keyboard.press('End');
  const viewport=dialog.getByRole('region',{name:'画像表示領域'});
  await expect.poll(()=>dialog.locator('ui-image img').evaluate(readNativeImageWidth)).toBeGreaterThan(0);
  for(const rotation of [0,90,180,270]){
   if(rotation)await dialog.getByRole('button',{name:'右へ90度回転',exact:true}).click();
   await expect(dialog.getByRole('status').first()).toContainText('400% · '+rotation+'度');
   await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
   const start=await viewport.evaluate(node=>{
    node.scrollTop=0;node.scrollLeft=0;
    const view=node.getBoundingClientRect(),image=node.querySelector('ui-image img')!.getBoundingClientRect(),canvas=node.querySelector('.ui-image-canvas')!.getBoundingClientRect();
    return {left:image.left-view.left,top:image.top-view.top,imageWidth:image.width,imageHeight:image.height,canvasWidth:canvas.width,canvasHeight:canvas.height,clientWidth:node.clientWidth,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,scrollHeight:node.scrollHeight};
   });
   expect(start.left).toBeGreaterThanOrEqual(-1);expect(start.top).toBeGreaterThanOrEqual(-1);
   expect(start.imageWidth).toBeCloseTo(start.canvasWidth,0);expect(start.imageHeight).toBeCloseTo(start.canvasHeight,0);
   await viewport.focus();await page.keyboard.press('ArrowRight');
   await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
   await settledScroll(viewport);await expect(viewport).toBeFocused();
   if(start.scrollHeight>start.clientHeight){await page.keyboard.press('ArrowDown');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);await settledScroll(viewport);}
   const end=await viewport.evaluate(node=>{
    node.scrollTop=node.scrollHeight;node.scrollLeft=node.scrollWidth;
    const view=node.getBoundingClientRect(),image=node.querySelector('ui-image img')!.getBoundingClientRect();
    return {right:image.right-view.left,bottom:image.bottom-view.top,clientWidth:node.clientWidth,clientHeight:node.clientHeight,scrollLeft:node.scrollLeft,scrollTop:node.scrollTop};
   });
   expect(end.right).toBeLessThanOrEqual(end.clientWidth+1);expect(end.bottom).toBeLessThanOrEqual(end.clientHeight+1);
   const analysis=await new AxeBuilder({page}).include('dialog').analyze();expect(analysis.violations).toEqual([]);
   observations.push({profile,rotation,zoom:4,start,end,violations:analysis.violations});
  }
  await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();
  await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  await dialog.locator('.ui-image-viewport').focus();await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('img',{name:'青い写真'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await expect(page.locator('#viewer-trigger')).toBeFocused();
 }
 await evidence('lightbox-rotation-geometry',observations);
});

test('desktop 100% Lightbox rotation retains all four image edges in both profiles with native scrolling',async({page})=>{
 await open(page);const observations:unknown[]=[];
 for(const profile of ['guided','dense'] as const){
  await page.evaluate(profile=>window.__mediaCatalog.profile.set(profile),profile);
  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  await page.getByRole('button',{name:'画像ビューアーを開く'}).click();const dialog=page.locator('dialog:modal');
  await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();await expect.poll(()=>dialog.locator('ui-image img').evaluate(readNativeImageWidth)).toBeGreaterThan(0);
  const viewport=dialog.getByRole('region',{name:'画像表示領域'});
  for(const rotation of [0,90,180,270]){
   if(rotation)await dialog.getByRole('button',{name:'右へ90度回転',exact:true}).click();
   await expect(dialog.getByRole('status').first()).toContainText('100% · '+rotation+'度');
   const geometry=await viewport.evaluate(node=>{
    node.scrollTop=0;node.scrollLeft=0;const view=node.getBoundingClientRect(),image=node.querySelector('ui-image img')!.getBoundingClientRect(),canvas=node.querySelector('.ui-image-canvas')!.getBoundingClientRect();
    const start={top:image.top-view.top,left:image.left-view.left,width:image.width,height:image.height,canvasWidth:canvas.width,canvasHeight:canvas.height};
    node.scrollTop=node.scrollHeight;node.scrollLeft=node.scrollWidth;const end=node.querySelector('ui-image img')!.getBoundingClientRect();
    return {start,end:{bottom:end.bottom-view.top,right:end.right-view.left},clientWidth:node.clientWidth,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,scrollHeight:node.scrollHeight};
   });
   expect(geometry.start.top).toBeGreaterThanOrEqual(-1);expect(geometry.start.left).toBeGreaterThanOrEqual(-1);
   expect(geometry.start.width).toBeCloseTo(geometry.start.canvasWidth,0);expect(geometry.start.height).toBeCloseTo(geometry.start.canvasHeight,0);
   expect(geometry.end.bottom).toBeLessThanOrEqual(geometry.clientHeight+1);expect(geometry.end.right).toBeLessThanOrEqual(geometry.clientWidth+1);
   if(rotation===90)await page.screenshot({path:test.info().outputPath('lightbox-desktop-'+profile+'-90.png')});
   observations.push({profile,rotation,zoom:1,geometry});
  }
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 }
 await evidence('lightbox-desktop-rotation-geometry',observations);
});

test('Gallery pointer Stop intent survives focus pause; explicit keyboard/touch Start and reduced-motion resume retain control',async({page,browser})=>{
 const observations:unknown[]=[];
 await open(page);await page.clock.install();const gallery=page.getByTestId('gallery'),control=gallery.locator('button').first();
 await page.getByRole('button',{name:'プロファイル guided'}).focus();await page.mouse.move(0,0);
 await page.evaluate(()=>window.__mediaCatalog.autoplay.set(true));await expect(control).toHaveText('自動送りを停止');
 await control.click();await page.mouse.move(0,0);await expect(control).toHaveAttribute('aria-pressed','false');
 const stopped=await gallery.locator('[aria-current=true]').textContent();await page.clock.runFor(1100);
 expect(await gallery.locator('[aria-current=true]').textContent()).toBe(stopped);
 observations.push({case:'native mouse Stop/focus order',pressed:await control.getAttribute('aria-pressed'),indexBefore:stopped,indexAfter:await gallery.locator('[aria-current=true]').textContent(),timerAdvanceMs:1100});
 await control.focus();await control.press('Space');await expect(control).toHaveAttribute('aria-pressed','true');
 await page.clock.runFor(400);expect(await gallery.locator('[aria-current=true]').textContent()).not.toBe(stopped);
 await gallery.getByRole('button',{name:'次へ',exact:true}).focus();await expect(control).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'プロファイル guided'}).focus();await page.mouse.move(0,0);
 const focusedStop=await gallery.locator('[aria-current=true]').textContent();
 await page.emulateMedia({reducedMotion:'reduce'});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.clock.runFor(1100);await expect(control).toHaveAttribute('aria-pressed','false');
 expect(await gallery.locator('[aria-current=true]').textContent()).toBe(focusedStop);
 observations.push({case:'focus Stop retained after reduce/no-preference',pressed:await control.getAttribute('aria-pressed'),indexBefore:focusedStop,indexAfter:await gallery.locator('[aria-current=true]').textContent(),timerAdvanceMs:1100});
 await page.emulateMedia({reducedMotion:'reduce'});await control.focus();await control.press('Enter');
 await expect(control).toHaveAttribute('aria-pressed','true');await page.clock.runFor(400);
 expect(await gallery.locator('[aria-current=true]').textContent()).not.toBe(focusedStop);
 observations.push({case:'native Enter explicit Start under reduced motion',pressed:await control.getAttribute('aria-pressed'),indexBefore:focusedStop,indexAfter:await gallery.locator('[aria-current=true]').textContent(),timerAdvanceMs:400});
 const touch=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:900},baseURL:new URL(page.url()).origin});
 try{const touchPage=await touch.newPage();const touchErrors:string[]=[];touchPage.on('pageerror',error=>touchErrors.push(error.message));touchPage.on('console',message=>{if(message.type()==='error'||message.type()==='warning')touchErrors.push(message.type()+': '+message.text());});await open(touchPage);await touchPage.clock.install();
  const touchGallery=touchPage.getByTestId('gallery'),touchControl=touchGallery.locator('button').first();
  await touchPage.evaluate(()=>window.__mediaCatalog.autoplay.set(true));await expect(touchControl).toHaveText('自動送りを停止');
  await touchControl.tap();await expect(touchControl).toHaveAttribute('aria-pressed','false');
  const touchStopped=await touchGallery.locator('[aria-current=true]').textContent();await touchPage.clock.runFor(1100);
  expect(await touchGallery.locator('[aria-current=true]').textContent()).toBe(touchStopped);
  await touchControl.tap();await expect(touchControl).toHaveAttribute('aria-pressed','true');await touchPage.clock.runFor(400);
  const touchStarted=await touchGallery.locator('[aria-current=true]').textContent();expect(touchStarted).not.toBe(touchStopped);
  await touchGallery.getByRole('button',{name:'次へ',exact:true}).tap();await expect(touchControl).toHaveAttribute('aria-pressed','false');
  expect(await touchGallery.locator('[aria-current=true]').textContent()).not.toBe(touchStopped);
  observations.push({case:'actual mobile touch Stop then Start advances and Next alternative',pressedAfterNextFocus:await touchControl.getAttribute('aria-pressed'),indexBefore:touchStopped,indexAfterStart:touchStarted,indexAfter:await touchGallery.locator('[aria-current=true]').textContent(),touchContext:true,mobileContext:true});expect(touchErrors,'mobile touch catalog runtime errors and warnings').toEqual([]);
 }finally{await touch.close();}
 await evidence('gallery-stop-intent',observations);
});
