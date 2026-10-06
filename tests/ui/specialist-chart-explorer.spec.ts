import {test,expect} from './catalog-test';
import {openSpecialistCatalog,openSpecialistSurface,profiles} from './specialist-test-helpers';

test.use({reducedMotion:'reduce'});

for(const profile of profiles){
 test(profile+': chart legend stays clear of axis labels and each gauge value has an independent readable position',async({page},info)=>{
  await openSpecialistCatalog(page,profile);
  const chart=page.locator('#chart > ui-chart');
  for(const kind of ['line','bar','area','scatter','heatmap']){
   await page.getByLabel('グラフの種別').selectOption(kind);
   const legend=chart.locator('svg text').getByText('今回',{exact:true});
   await expect(legend).toBeVisible();
   const legendBox=await legend.boundingBox();expect(legendBox).not.toBeNull();
   for(const name of ['受付','承認','差戻し']){
    // Scatter and heatmap use numeric coordinate categories instead of point labels.
    const label=chart.locator('svg text').getByText(name,{exact:true});
    if(await label.count()){
     const box=await label.boundingBox();expect(box).not.toBeNull();
     expect(legendBox!.y+legendBox!.height<=box!.y||box!.y+box!.height<=legendBox!.y||legendBox!.x+legendBox!.width<=box!.x||box!.x+box!.width<=legendBox!.x,'legend does not cover '+name).toBe(true);
    }
   }
  }
  await page.getByLabel('グラフの種別').selectOption('gauge');
  const titles=chart.locator('svg text'),observations=[];
  for(const [name,value] of [['受付','12'],['承認','7'],['差戻し','3']]){
   const title=titles.getByText(name!,{exact:true}),detail=titles.getByText(value!,{exact:true});
   await expect(title).toBeVisible();await expect(detail).toBeVisible();
   const titleBox=await title.boundingBox(),detailBox=await detail.boundingBox();expect(titleBox).not.toBeNull();expect(detailBox).not.toBeNull();
   expect(titleBox!.y+titleBox!.height<=detailBox!.y||detailBox!.y+detailBox!.height<=titleBox!.y,'gauge title and value remain distinct').toBe(true);
   observations.push({name,value,titleBox,detailBox});
  }
  for(let a=0;a<observations.length;a++)for(let b=a+1;b<observations.length;b++){
   const first=observations[a]!.titleBox!,second=observations[b]!.titleBox!;
   expect(first.x+first.width<=second.x||second.x+second.width<=first.x||first.y+first.height<=second.y||second.y+second.height<=first.y,'gauge labels do not overlap').toBe(true);
  }
  // Gauge titles are silent in ECharts; select the real filled pointer, then the keyboard alternative.
  const svg=chart.locator('svg');await svg.scrollIntoViewIfNeeded();
  const pointer=await svg.evaluate(svg=>{
   const title=Array.from(svg.querySelectorAll('text')).find(node=>node.textContent==='承認')!.getBoundingClientRect();
   const candidates=Array.from(svg.querySelectorAll('path')).filter(path=>{const box=path.getBoundingClientRect();return box.width>4&&box.width<100&&box.height>4&&box.height<100&&getComputedStyle(path).fill!=='none'&&Math.abs(box.x+box.width/2-(title.x+title.width/2))<100;});
   for(const path of candidates){const total=path.getTotalLength();let x=0,y=0;for(let index=0;index<100;index++){const point=path.getPointAtLength(total*index/100);x+=point.x/100;y+=point.y/100;}const local=new DOMPoint(x,y);if(!path.isPointInFill(local))continue;const point=local.matrixTransform(path.getScreenCTM()!);if(document.elementFromPoint(point.x,point.y)===path)return {x:point.x,y:point.y};}
   return null;
  });
  expect(pointer,'native rendered gauge pointer').not.toBeNull();await page.mouse.click(pointer!.x,pointer!.y);await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  await chart.getByRole('button',{name:'差戻しを選択',exact:true}).press('Space');await expect(page.locator('[data-chart-selection]')).toHaveText('three');
  await info.attach('gauge-label-value-geometry',{body:JSON.stringify(observations),contentType:'application/json'});
  await info.attach('gauge-readable-points',{body:await chart.screenshot(),contentType:'image/png'});
 });

 test(profile+': rich text formatting and Markdown display controls expose their named groups',async({page})=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'RichText');
  const group=page.getByRole('group',{name:'申請の説明の書式',exact:true});await expect(group).toBeVisible();await expect(group.getByRole('button',{name:'太字',exact:true})).toBeVisible();
  expect(await group.ariaSnapshot()).toContain('group "申請の説明の書式"');
  await openSpecialistSurface(page,'Markdown');
  const display=page.getByRole('group',{name:'Markdownの表示',exact:true});await expect(display).toBeVisible();await expect(display.getByRole('button',{name:'プレビュー',exact:true})).toBeVisible();
  expect(await display.ariaSnapshot()).toContain('group "Markdownの表示"');
 });

 test(profile+': heatmap paints real cells, rejects an incompatible explicit axis, and restores the same data',async({page},info)=>{
  await openSpecialistCatalog(page,profile);
  await page.getByLabel('グラフの種別').selectOption('heatmap');
  const chart=page.locator('#chart > ui-chart');
  const cells=()=>chart.locator('svg path').evaluateAll(paths=>paths.map(path=>({fill:path.getAttribute('fill'),d:path.getAttribute('d'),width:path.getBoundingClientRect().width,height:path.getBoundingClientRect().height})).filter(path=>/^rgb\(/.test(path.fill??'')&&!!path.d&&path.width>8&&path.height>8));
  await expect(chart.locator('[role=alert]')).toHaveCount(0);
  await expect.poll(async()=>(await cells()).length).toBeGreaterThanOrEqual(3);
  const before=await cells();
  await page.getByRole('button',{name:'承認を選択',exact:true}).press('Space');
  await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  await page.getByLabel('数値軸',{exact:true}).check();
  await expect(chart.locator('[role=alert]')).toContainText('横軸・縦軸とも区分軸');
  await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  await expect(chart.locator('table')).toContainText('承認');
  await page.getByLabel('数値軸',{exact:true}).uncheck();
  await expect(chart.locator('[role=alert]')).toHaveCount(0);
  await expect.poll(async()=>(await cells()).length).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  await info.attach('heatmap-real-cell-geometry',{body:JSON.stringify({before,recovered:await cells()}),contentType:'application/json'});
  await info.attach('heatmap-real-cells',{body:await chart.screenshot(),contentType:'image/png'});
 });

 test(profile+': FileExplorer skips a disabled first item and guards a selected item after controlled disable without losing its name',async({page})=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'FileExplorer');
  const host=page.locator('#files ui-file-explorer'),root=page.locator('[data-explorer-id=root]');
  await page.getByLabel('先頭に無効項目を追加',{exact:true}).check();
  await expect(page.locator('[data-explorer-id=disabled-first]')).toBeDisabled();
  await page.getByLabel('表示方式',{exact:true}).focus();await page.keyboard.press('Tab');
  await expect(root).toBeFocused();await root.press('ArrowRight');await root.press('ArrowDown');
  const csv=page.locator('[data-explorer-id=csv]');await expect(csv).toBeFocused();await csv.press('Space');
  await expect(page.locator('[data-file-selection]')).toHaveText('csv');
  const draft=page.getByLabel('新しい名前',{exact:true});await draft.fill('保持する証憑名.txt');
  await page.getByLabel('選択した証憑を無効にする',{exact:true}).check();
  for(const name of ['開く','ダウンロード','削除を要求','名前変更を要求','フォルダー作成を要求'])await expect(host.getByRole('button',{name,exact:true})).toBeDisabled();
  await expect(draft).toHaveValue('保持する証憑名.txt');await expect(page.locator('[data-file-selection]')).toHaveText('csv');
  await expect(page.locator('[data-file-operation]')).toHaveText('なし');
  await page.getByLabel('選択した証憑を無効にする',{exact:true}).uncheck();
  await host.getByRole('button',{name:'開く',exact:true}).click();await expect(page.locator('[data-file-operation]')).toHaveText('open');
  await expect(draft).toHaveValue('保持する証憑名.txt');
 });

 test(profile+': FileExplorer retires owned focus on controlled disable or removal and leaves outside focus intact',async({page})=>{
  await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'FileExplorer');
  const host=page.locator('#files ui-file-explorer'),root=page.locator('[data-explorer-id=root]'),csv=page.locator('[data-explorer-id=csv]');
  await root.press('ArrowRight');await csv.focus();
  // A controlled app input update while the user remains in the collection.
  // The DOM click triggers the real Angular input binding without moving focus.
  await page.getByLabel('選択した証憑を無効にする',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
  await expect(csv).toBeDisabled();await expect(host).toBeFocused();await expect(host).toHaveAttribute('aria-label','添付管理の操作領域');
  await page.getByLabel('選択した証憑を無効にする',{exact:true}).uncheck();await csv.focus();
  await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
  await expect(csv).toHaveCount(0);await expect(host).toBeFocused();await expect(root).toHaveAttribute('tabindex','0');
  await page.getByLabel('証憑を取り除く',{exact:true}).uncheck();
  const outside=page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Code',exact:true});await outside.focus();
  await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
  await expect(csv).toHaveCount(0);await expect(outside).toBeFocused();
 });
}
