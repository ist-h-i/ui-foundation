# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: media-regressions.spec.ts >> open Lightbox named zoomed image scrolling surface passes actual axe in both profiles at 320px 200% RTL
- Location: tests/ui/media-regressions.spec.ts:145:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('dialog:modal').getByRole('img', { name: '青い写真' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('dialog:modal').getByRole('img', { name: '青い写真' }) with timeout 5000ms
  - waiting for locator('dialog:modal').getByRole('img', { name: '青い写真' })

```

```yaml
- main:
  - heading "添付・画像・メディアの操作" [level=1]
  - button "プロファイル guided"
  - button "RTL true"
  - button "無効 false"
  - button "媒体を表示・非表示"
  - button "媒体を生成・破棄"
  - heading "ファイル受付" [level=2]
  - text: 申請の添付ファイル
  - button "申請の添付ファイル"
  - paragraph: "形式: .txt,image/png。1件 1,000 Bまで。複数選択可。合計 3件まで"
  - paragraph: ここへファイルをドロップできます。
  - button "ファイルを選択"
  - status
  - status: 添付ファイル 0件
  - list:
    - listitem: ファイルはありません。
  - button "進捗40%"
  - button "結果不明"
  - button "個別失敗"
  - button "アプリで完了"
  - paragraph: "0"
  - heading "画像" [level=2]
  - figure:
    - img "申請画像"
  - button "画像取得失敗・復旧"
  - button "画像ビューアーを開く"
  - dialog "画像ビューアー":
    - button "前の画像" [disabled]
    - button "次の画像"
    - text: 拡大率
    - slider "拡大率": "100"
    - button "右へ90度回転"
    - button "表示をリセット"
    - status: 1 / 3 · 100% · 0度
    - region "画像表示領域":
      - figure:
        - img "赤い写真"
    - paragraph: 申請1の添付
    - status
  - heading "ギャラリー" [level=2]
  - region "添付写真":
    - button "自動送りを開始"
    - button "前へ"
    - button "次へ"
    - group "1 / 3":
      - figure "申請1の添付":
        - img "赤い写真"
        - text: 申請1の添付
    - paragraph: 1 / 3
    - group "表示する画像":
      - 'button "画像1を表示: 赤い写真"': "1"
      - 'button "画像2を表示: 青い写真"': "2"
      - 'button "画像3を表示: 緑の写真"': "3"
  - button "外部自動送り切替"
  - heading "画像比較" [level=2]
  - figure "赤い写真 / 青い写真":
    - img "赤い写真"
    - img "青い写真"
    - text: 赤い写真 / 青い写真
  - text: 比較境界
  - slider "比較境界": "50"
  - button "比較方向を変更"
  - heading "画像切抜き" [level=2]
  - text: 切抜くファイル
  - button "切抜くファイル"
  - paragraph: 提出写真
  - paragraph: 画像の座標で範囲を指定するか、画像上で始点から終点へドラッグします。
  - text: 比率
  - combobox "比率" [disabled]:
    - option "自由" [selected]
    - option "1:1"
    - option "4:3"
    - option "16:9"
  - text: X
  - spinbutton "X" [disabled]: "0"
  - text: "Y"
  - spinbutton "Y" [disabled]: "0"
  - text: 幅
  - spinbutton "幅" [disabled]: "0"
  - text: 高さ
  - spinbutton "高さ" [disabled]: "0"
  - button "右へ90度回転" [disabled]
  - button "範囲をリセット" [disabled]
  - button "切抜きを確定" [disabled]
  - status: 画像を選択してください。 · 回転 0度
  - heading "PDF" [level=2]
  - paragraph: 申請資料
  - button "前のページ" [disabled]
  - text: ページ
  - spinbutton "ページ": "1"
  - button "次のページ"
  - text: 拡大率
  - combobox "拡大率":
    - option "50%"
    - option "100%" [selected]
    - option "150%"
    - option "200%"
    - option "300%"
  - button "PDFをダウンロード"
  - status: ページを表示しました。 · 1 / 2
  - region "申請資料のページ表示":
    - img "申請資料 1ページ。文字内容は下のページの文字を開いて確認できます。"
  - group: ページの文字
  - button "PDF表示対象を変更"
  - heading "音声" [level=2]
  - paragraph: 音声添付
  - button "再生"
  - button "停止"
  - text: 音量
  - slider "音量": "100"
  - text: 再生速度
  - combobox "再生速度":
    - option "0.5倍"
    - option "1倍" [selected]
    - option "1.5倍"
    - option "2倍"
  - text: 字幕
  - combobox "字幕":
    - option "字幕なし" [selected]
    - option "日本語字幕"
  - status: 一時停止または停止中
  - group: 文字起こし
  - heading "動画" [level=2]
  - text: 動画ファイル
  - button "動画ファイル"
  - paragraph: 動画添付
  - button "再生"
  - button "停止"
  - text: 音量
  - slider "音量": "100"
  - text: 再生速度
  - combobox "再生速度":
    - option "0.5倍"
    - option "1倍" [selected]
    - option "1.5倍"
    - option "2倍"
  - text: 字幕
  - combobox "字幕":
    - option "字幕なし" [selected]
    - option "日本語字幕"
  - button "全画面"
  - status
  - paragraph: メディアを取得できません。表示対象と形式を確認して再試行してください。
  - button "メディアを再取得"
  - heading "機械可読コード" [level=2]
  - text: コード内容
  - textbox "コード内容": UI123456
  - figure "申請参照用QRコード":
    - img "申請参照用QRコード"
    - text: 申請参照用QRコード
    - paragraph: UI123456
  - figure "申請番号のバーコード":
    - region "申請番号のバーコード":
      - img "申請番号のバーコード"
    - text: 申請番号のバーコード
    - paragraph: UI123456
```

# Test source

```ts
  85  |  await expect(audio.locator('.ui-media-caption')).toHaveText('確認用の字幕です。');
  86  |  await page.evaluate(()=>(window as any).__mediaCatalog.captions.set([]));
  87  |  await expect.poll(()=>audio.locator('audio').evaluate(media=>media.textTracks.length)).toBe(0);
  88  |  await expect(select).toHaveValue('');await expect(audio.locator('.ui-media-caption')).toHaveCount(0);
  89  |  observations.push({case:'caption removal',trackCount:await audio.locator('audio').evaluate(media=>media.textTracks.length),selection:await select.inputValue(),cueCount:await audio.locator('.ui-media-caption').count()});
  90  |  await page.evaluate(()=>(window as any).__mediaCatalog.captions.set([{id:'second',src:'/assets/media/replacement.vtt',language:'ja',label:'別の字幕'}]));
  91  |  await select.selectOption('second');await expect(audio.locator('.ui-media-caption')).toHaveText('差し替えた確認字幕です。');
  92  |  let release:(()=>void)|undefined;
  93  |  await page.route('**/replacement-two.vtt?held',async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue();});
  94  |  await page.evaluate(()=>(window as any).__mediaCatalog.captions.set([{id:'second',src:'/assets/media/replacement-two.vtt?held',language:'ja',label:'更新字幕'}]));
  95  |  await expect.poll(()=>!!release).toBe(true);
  96  |  await expect(select).toHaveValue('second');await expect(audio.locator('.ui-media-caption')).toHaveCount(0);
  97  |  observations.push({case:'same ID new src while actual VTT request pending',selection:await select.inputValue(),cueCount:await audio.locator('.ui-media-caption').count()});
  98  |  release!();await expect(audio.locator('.ui-media-caption')).toHaveText('二つ目の確認字幕です。');
  99  |  await page.evaluate(()=>(window as any).__mediaCatalog.captions.set([{id:'other',src:'/assets/media/sample.vtt',language:'ja',label:'先頭の字幕'},{id:'second',src:'/assets/media/replacement-two.vtt?held',language:'ja',label:'更新字幕'}]));
  100 |  await expect(select).toHaveValue('second');
  101 |  await expect.poll(()=>audio.locator('audio').evaluate(media=>Array.from(media.textTracks,track=>track.mode))).toEqual(['disabled','showing']);
  102 |  await expect(audio.locator('.ui-media-caption')).toHaveText('二つ目の確認字幕です。');
  103 |  observations.push({case:'real replacement loaded and reordered',selection:await select.inputValue(),modes:await audio.locator('audio').evaluate(media=>Array.from(media.textTracks,track=>track.mode)),cue:await audio.locator('.ui-media-caption').textContent()});
  104 |  await audio.locator('audio').evaluate(media=>{const elements=media.querySelectorAll('track');elements[0].track.mode='showing';elements[1].track.mode='disabled';});
  105 |  await expect.poll(()=>audio.locator('audio').evaluate(media=>Array.from(media.textTracks,track=>track.mode))).toEqual(['disabled','showing']);
  106 |  await expect(select).toHaveValue('second');await expect(audio.locator('.ui-media-caption')).toHaveText('二つ目の確認字幕です。');
  107 |  observations.push({case:'native mode change cannot replace explicit selection owner',selection:await select.inputValue(),modes:await audio.locator('audio').evaluate(media=>Array.from(media.textTracks,track=>track.mode))});
  108 |  await select.selectOption('other');await expect(audio.locator('.ui-media-caption')).toHaveText('確認用の字幕です。');
  109 |  await select.selectOption('');await expect(audio.locator('.ui-media-caption')).toHaveCount(0);
  110 |  await expect.poll(()=>audio.locator('audio').evaluate(media=>Array.from(media.textTracks,track=>track.mode))).toEqual(['disabled','disabled']);
  111 |  observations.push({case:'native labelled select explicitly changes and clears caption owner',selection:await select.inputValue(),modes:await audio.locator('audio').evaluate(media=>Array.from(media.textTracks,track=>track.mode)),cueCount:await audio.locator('.ui-media-caption').count()});
  112 |  await evidence('media-caption-reconciliation',observations);
  113 | });
  114 | 
  115 | test('PDF empty/loading/loaded/error named scrolling surface passes actual axe in guided/dense 320px 200% RTL',async({page})=>{
  116 |  const observations:unknown[]=[];
  117 |  await open(page);const pdf=page.getByTestId('pdf');
  118 |  await page.setViewportSize({width:320,height:1000});
  119 |  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';(window as any).__mediaCatalog.rtl.set(true);});
  120 |  for(const profile of ['guided','dense']){
  121 |   await page.evaluate(profile=>(window as any).__mediaCatalog.profile.set(profile),profile);
  122 |   await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  123 |   await page.evaluate(()=>(window as any).__mediaCatalog.pdfSrc.set(null));
  124 |   await expect(pdf.getByRole('status')).toContainText('PDFを選択してください。');
  125 |   let analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'empty',violations:analysis.violations});
  126 |   let release:(()=>void)|undefined;
  127 |   const target='**/sample.pdf?pending-'+profile;
  128 |   await page.route(target,async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue();});
  129 |   await page.evaluate(profile=>(window as any).__mediaCatalog.pdfSrc.set('/assets/media/sample.pdf?pending-'+profile),profile);
  130 |   await expect.poll(()=>!!release).toBe(true);
  131 |   await expect(pdf.getByRole('status')).toContainText('PDFを読込み中です。');
  132 |   analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'loading actual held request',violations:analysis.violations});
  133 |   release!();await expect(pdf.locator('canvas')).toBeVisible();
  134 |   analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'loaded actual PDF.js canvas',violations:analysis.violations});
  135 |   await pdf.getByRole('region',{name:'申請資料のページ表示'}).focus();
  136 |   await page.keyboard.press('ArrowDown');
  137 |   await page.evaluate(()=>(window as any).__mediaCatalog.pdfSrc.set('/assets/media/invalid.pdf'));
  138 |   await expect(pdf.getByText(/PDFを読み込めません/)).toBeVisible();
  139 |   analysis=await new AxeBuilder({page}).include('ui-pdf-viewer').analyze();expect(analysis.violations).toEqual([]);observations.push({profile,state:'invalid PDF error',violations:analysis.violations});
  140 |   await page.unroute(target);
  141 |  }
  142 |  await evidence('pdf-named-region-axe',observations);
  143 | });
  144 | 
  145 | test('open Lightbox named zoomed image scrolling surface passes actual axe in both profiles at 320px 200% RTL',async({page})=>{
  146 |  await open(page);await page.setViewportSize({width:320,height:1000});
  147 |  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';(window as any).__mediaCatalog.rtl.set(true);});
  148 |  const observations:unknown[]=[];
  149 |  for(const profile of ['guided','dense']){
  150 |   await page.evaluate(profile=>(window as any).__mediaCatalog.profile.set(profile),profile);
  151 |   await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  152 |   await page.getByRole('button',{name:'画像ビューアーを開く'}).click();
  153 |   const dialog=page.locator('dialog:modal');await expect(dialog).toBeVisible();
  154 |   const position=parseInt((await dialog.getByRole('status').first().textContent())!,10);
  155 |   for(let index=1;index<position;index++)await dialog.getByRole('button',{name:'前の画像',exact:true}).click();
  156 |   await dialog.getByLabel('拡大率',{exact:true}).focus();await page.keyboard.press('End');
  157 |   const viewport=dialog.getByRole('region',{name:'画像表示領域'});
  158 |   await expect.poll(()=>dialog.locator('ui-image img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  159 |   for(const rotation of [0,90,180,270]){
  160 |    if(rotation)await dialog.getByRole('button',{name:'右へ90度回転',exact:true}).click();
  161 |    await expect(dialog.getByRole('status').first()).toContainText('400% · '+rotation+'度');
  162 |    await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
  163 |    const start=await viewport.evaluate(node=>{
  164 |     node.scrollTop=0;node.scrollLeft=0;
  165 |     const view=node.getBoundingClientRect(),image=node.querySelector('ui-image img')!.getBoundingClientRect(),canvas=node.querySelector('.ui-image-canvas')!.getBoundingClientRect();
  166 |     return {left:image.left-view.left,top:image.top-view.top,imageWidth:image.width,imageHeight:image.height,canvasWidth:canvas.width,canvasHeight:canvas.height,clientWidth:node.clientWidth,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,scrollHeight:node.scrollHeight};
  167 |    });
  168 |    expect(start.left).toBeGreaterThanOrEqual(-1);expect(start.top).toBeGreaterThanOrEqual(-1);
  169 |    expect(start.imageWidth).toBeCloseTo(start.canvasWidth,0);expect(start.imageHeight).toBeCloseTo(start.canvasHeight,0);
  170 |    await viewport.focus();await page.keyboard.press('ArrowRight');
  171 |    await expect.poll(()=>viewport.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
  172 |    await settledScroll(viewport);await expect(viewport).toBeFocused();
  173 |    if(start.scrollHeight>start.clientHeight){await page.keyboard.press('ArrowDown');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);await settledScroll(viewport);}
  174 |    const end=await viewport.evaluate(node=>{
  175 |     node.scrollTop=node.scrollHeight;node.scrollLeft=node.scrollWidth;
  176 |     const view=node.getBoundingClientRect(),image=node.querySelector('ui-image img')!.getBoundingClientRect();
  177 |     return {right:image.right-view.left,bottom:image.bottom-view.top,clientWidth:node.clientWidth,clientHeight:node.clientHeight,scrollLeft:node.scrollLeft,scrollTop:node.scrollTop};
  178 |    });
  179 |    expect(end.right).toBeLessThanOrEqual(end.clientWidth+1);expect(end.bottom).toBeLessThanOrEqual(end.clientHeight+1);
  180 |    const analysis=await new AxeBuilder({page}).include('dialog').analyze();expect(analysis.violations).toEqual([]);
  181 |    observations.push({profile,rotation,zoom:4,start,end,violations:analysis.violations});
  182 |   }
  183 |   await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();
  184 |   await dialog.locator('.ui-image-viewport').focus();await page.keyboard.press('ArrowLeft');
> 185 |   await expect(dialog.getByRole('img',{name:'青い写真'})).toBeVisible();
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  186 |   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  187 |   await expect(page.locator('#viewer-trigger')).toBeFocused();
  188 |  }
  189 |  await evidence('lightbox-rotation-geometry',observations);
  190 | });
  191 | 
  192 | test('desktop 100% Lightbox rotation retains all four image edges in both profiles with native scrolling',async({page})=>{
  193 |  await open(page);const observations:unknown[]=[];
  194 |  for(const profile of ['guided','dense']){
  195 |   await page.evaluate(profile=>(window as any).__mediaCatalog.profile.set(profile),profile);
  196 |   await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  197 |   await page.getByRole('button',{name:'画像ビューアーを開く'}).click();const dialog=page.locator('dialog:modal');
  198 |   await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();await expect.poll(()=>dialog.locator('ui-image img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  199 |   const viewport=dialog.getByRole('region',{name:'画像表示領域'});
  200 |   for(const rotation of [0,90,180,270]){
  201 |    if(rotation)await dialog.getByRole('button',{name:'右へ90度回転',exact:true}).click();
  202 |    await expect(dialog.getByRole('status').first()).toContainText('100% · '+rotation+'度');
  203 |    const geometry=await viewport.evaluate(node=>{
  204 |     node.scrollTop=0;node.scrollLeft=0;const view=node.getBoundingClientRect(),image=node.querySelector('ui-image img')!.getBoundingClientRect(),canvas=node.querySelector('.ui-image-canvas')!.getBoundingClientRect();
  205 |     const start={top:image.top-view.top,left:image.left-view.left,width:image.width,height:image.height,canvasWidth:canvas.width,canvasHeight:canvas.height};
  206 |     node.scrollTop=node.scrollHeight;node.scrollLeft=node.scrollWidth;const end=node.querySelector('ui-image img')!.getBoundingClientRect();
  207 |     return {start,end:{bottom:end.bottom-view.top,right:end.right-view.left},clientWidth:node.clientWidth,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,scrollHeight:node.scrollHeight};
  208 |    });
  209 |    expect(geometry.start.top).toBeGreaterThanOrEqual(-1);expect(geometry.start.left).toBeGreaterThanOrEqual(-1);
  210 |    expect(geometry.start.width).toBeCloseTo(geometry.start.canvasWidth,0);expect(geometry.start.height).toBeCloseTo(geometry.start.canvasHeight,0);
  211 |    expect(geometry.end.bottom).toBeLessThanOrEqual(geometry.clientHeight+1);expect(geometry.end.right).toBeLessThanOrEqual(geometry.clientWidth+1);
  212 |    if(rotation===90)await page.screenshot({path:test.info().outputPath('lightbox-desktop-'+profile+'-90.png')});
  213 |    observations.push({profile,rotation,zoom:1,geometry});
  214 |   }
  215 |   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  216 |  }
  217 |  await evidence('lightbox-desktop-rotation-geometry',observations);
  218 | });
  219 | 
  220 | test('Gallery pointer Stop intent survives focus pause; explicit keyboard/touch Start and reduced-motion resume retain control',async({page,browser})=>{
  221 |  const observations:unknown[]=[];
  222 |  await open(page);await page.clock.install();const gallery=page.getByTestId('gallery'),control=gallery.locator('button').first();
  223 |  await page.getByRole('button',{name:'プロファイル guided'}).focus();await page.mouse.move(0,0);
  224 |  await page.evaluate(()=>(window as any).__mediaCatalog.autoplay.set(true));await expect(control).toHaveText('自動送りを停止');
  225 |  await control.click();await page.mouse.move(0,0);await expect(control).toHaveAttribute('aria-pressed','false');
  226 |  const stopped=await gallery.locator('[aria-current=true]').textContent();await page.clock.runFor(1100);
  227 |  expect(await gallery.locator('[aria-current=true]').textContent()).toBe(stopped);
  228 |  observations.push({case:'native mouse Stop/focus order',pressed:await control.getAttribute('aria-pressed'),indexBefore:stopped,indexAfter:await gallery.locator('[aria-current=true]').textContent(),timerAdvanceMs:1100});
  229 |  await control.focus();await control.press('Space');await expect(control).toHaveAttribute('aria-pressed','true');
  230 |  await page.clock.runFor(400);expect(await gallery.locator('[aria-current=true]').textContent()).not.toBe(stopped);
  231 |  await gallery.getByRole('button',{name:'次へ',exact:true}).focus();await expect(control).toHaveAttribute('aria-pressed','false');
  232 |  await page.getByRole('button',{name:'プロファイル guided'}).focus();await page.mouse.move(0,0);
  233 |  const focusedStop=await gallery.locator('[aria-current=true]').textContent();
  234 |  await page.emulateMedia({reducedMotion:'reduce'});await page.emulateMedia({reducedMotion:'no-preference'});
  235 |  await page.clock.runFor(1100);await expect(control).toHaveAttribute('aria-pressed','false');
  236 |  expect(await gallery.locator('[aria-current=true]').textContent()).toBe(focusedStop);
  237 |  observations.push({case:'focus Stop retained after reduce/no-preference',pressed:await control.getAttribute('aria-pressed'),indexBefore:focusedStop,indexAfter:await gallery.locator('[aria-current=true]').textContent(),timerAdvanceMs:1100});
  238 |  await page.emulateMedia({reducedMotion:'reduce'});await control.focus();await control.press('Enter');
  239 |  await expect(control).toHaveAttribute('aria-pressed','true');await page.clock.runFor(400);
  240 |  expect(await gallery.locator('[aria-current=true]').textContent()).not.toBe(focusedStop);
  241 |  observations.push({case:'native Enter explicit Start under reduced motion',pressed:await control.getAttribute('aria-pressed'),indexBefore:focusedStop,indexAfter:await gallery.locator('[aria-current=true]').textContent(),timerAdvanceMs:400});
  242 |  const touch=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:900},baseURL:new URL(page.url()).origin});
  243 |  try{const touchPage=await touch.newPage();const touchErrors:string[]=[];touchPage.on('pageerror',error=>touchErrors.push(error.message));touchPage.on('console',message=>{if(message.type()==='error'||message.type()==='warning')touchErrors.push(message.type()+': '+message.text());});await open(touchPage);await touchPage.clock.install();
  244 |   const touchGallery=touchPage.getByTestId('gallery'),touchControl=touchGallery.locator('button').first();
  245 |   await touchPage.evaluate(()=>(window as any).__mediaCatalog.autoplay.set(true));await expect(touchControl).toHaveText('自動送りを停止');
  246 |   await touchControl.tap();await expect(touchControl).toHaveAttribute('aria-pressed','false');
  247 |   const touchStopped=await touchGallery.locator('[aria-current=true]').textContent();await touchPage.clock.runFor(1100);
  248 |   expect(await touchGallery.locator('[aria-current=true]').textContent()).toBe(touchStopped);
  249 |   await touchControl.tap();await expect(touchControl).toHaveAttribute('aria-pressed','true');await touchPage.clock.runFor(400);
  250 |   const touchStarted=await touchGallery.locator('[aria-current=true]').textContent();expect(touchStarted).not.toBe(touchStopped);
  251 |   await touchGallery.getByRole('button',{name:'次へ',exact:true}).tap();await expect(touchControl).toHaveAttribute('aria-pressed','false');
  252 |   expect(await touchGallery.locator('[aria-current=true]').textContent()).not.toBe(touchStopped);
  253 |   observations.push({case:'actual mobile touch Stop then Start advances and Next alternative',pressedAfterNextFocus:await touchControl.getAttribute('aria-pressed'),indexBefore:touchStopped,indexAfterStart:touchStarted,indexAfter:await touchGallery.locator('[aria-current=true]').textContent(),touchContext:true,mobileContext:true});expect(touchErrors,'mobile touch catalog runtime errors and warnings').toEqual([]);
  254 |  }finally{await touch.close();}
  255 |  await evidence('gallery-stop-intent',observations);
  256 | });
  257 | 
```