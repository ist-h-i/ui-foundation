# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specialist-chart-explorer.spec.ts >> guided: FileExplorer retires owned focus on controlled disable or removal and leaves outside focus intact
- Location: tests/ui/specialist-chart-explorer.spec.ts:101:2

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('#files ui-file-explorer')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" locator('#files ui-file-explorer') with timeout 5000ms
  - waiting for locator('#files ui-file-explorer')
    14 × locator resolved to <ui-file-explorer label="添付管理" tabindex="-1" role="region" aria-label="添付管理の操作領域" _nghost-ng-c1049613845="" data-ui-collection-scope="">…</ui-file-explorer>
       - unexpected value "inactive"

```

```yaml
- region "添付管理の操作領域":
  - region "添付管理"
```

# Test source

```ts
  11  |    await page.getByLabel('グラフの種別').selectOption(kind);
  12  |    const legend=chart.locator('svg text').getByText('今回',{exact:true});
  13  |    await expect(legend).toBeVisible();
  14  |    const legendBox=await legend.boundingBox();expect(legendBox).not.toBeNull();
  15  |    for(const name of ['受付','承認','差戻し']){
  16  |     // Scatter and heatmap use numeric coordinate categories instead of point labels.
  17  |     const label=chart.locator('svg text').getByText(name,{exact:true});
  18  |     if(await label.count()){
  19  |      const box=await label.boundingBox();expect(box).not.toBeNull();
  20  |      expect(legendBox!.y+legendBox!.height<=box!.y||box!.y+box!.height<=legendBox!.y||legendBox!.x+legendBox!.width<=box!.x||box!.x+box!.width<=legendBox!.x,'legend does not cover '+name).toBe(true);
  21  |     }
  22  |    }
  23  |   }
  24  |   await page.getByLabel('グラフの種別').selectOption('gauge');
  25  |   const titles=chart.locator('svg text'),observations=[];
  26  |   for(const [name,value] of [['受付','12'],['承認','7'],['差戻し','3']]){
  27  |    const title=titles.getByText(name!,{exact:true}),detail=titles.getByText(value!,{exact:true});
  28  |    await expect(title).toBeVisible();await expect(detail).toBeVisible();
  29  |    const titleBox=await title.boundingBox(),detailBox=await detail.boundingBox();expect(titleBox).not.toBeNull();expect(detailBox).not.toBeNull();
  30  |    expect(titleBox!.y+titleBox!.height<=detailBox!.y||detailBox!.y+detailBox!.height<=titleBox!.y,'gauge title and value remain distinct').toBe(true);
  31  |    observations.push({name,value,titleBox,detailBox});
  32  |   }
  33  |   for(let a=0;a<observations.length;a++)for(let b=a+1;b<observations.length;b++){
  34  |    const first=observations[a]!.titleBox!,second=observations[b]!.titleBox!;
  35  |    expect(first.x+first.width<=second.x||second.x+second.width<=first.x||first.y+first.height<=second.y||second.y+second.height<=first.y,'gauge labels do not overlap').toBe(true);
  36  |   }
  37  |   // Gauge titles are silent in ECharts; select the real filled pointer, then the keyboard alternative.
  38  |   const svg=chart.locator('svg');await svg.scrollIntoViewIfNeeded();
  39  |   const pointer=await svg.evaluate(svg=>{
  40  |    const title=Array.from(svg.querySelectorAll('text')).find(node=>node.textContent==='承認')!.getBoundingClientRect();
  41  |    const candidates=Array.from(svg.querySelectorAll('path')).filter(path=>{const box=path.getBoundingClientRect();return box.width>4&&box.width<100&&box.height>4&&box.height<100&&getComputedStyle(path).fill!=='none'&&Math.abs(box.x+box.width/2-(title.x+title.width/2))<100;});
  42  |    for(const path of candidates){const total=path.getTotalLength();let x=0,y=0;for(let index=0;index<100;index++){const point=path.getPointAtLength(total*index/100);x+=point.x/100;y+=point.y/100;}const local=new DOMPoint(x,y);if(!path.isPointInFill(local))continue;const point=local.matrixTransform(path.getScreenCTM()!);if(document.elementFromPoint(point.x,point.y)===path)return {x:point.x,y:point.y};}
  43  |    return null;
  44  |   });
  45  |   expect(pointer,'native rendered gauge pointer').not.toBeNull();await page.mouse.click(pointer!.x,pointer!.y);await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  46  |   await chart.getByRole('button',{name:'差戻しを選択',exact:true}).press('Space');await expect(page.locator('[data-chart-selection]')).toHaveText('three');
  47  |   await info.attach('gauge-label-value-geometry',{body:JSON.stringify(observations),contentType:'application/json'});
  48  |   await info.attach('gauge-readable-points',{body:await chart.screenshot(),contentType:'image/png'});
  49  |  });
  50  | 
  51  |  test(profile+': rich text formatting and Markdown display controls expose their named groups',async({page})=>{
  52  |   await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'RichText');
  53  |   const group=page.getByRole('group',{name:'申請の説明の書式',exact:true});await expect(group).toBeVisible();await expect(group.getByRole('button',{name:'太字',exact:true})).toBeVisible();
  54  |   expect(await group.ariaSnapshot()).toContain('group "申請の説明の書式"');
  55  |   await openSpecialistSurface(page,'Markdown');
  56  |   const display=page.getByRole('group',{name:'Markdownの表示',exact:true});await expect(display).toBeVisible();await expect(display.getByRole('button',{name:'プレビュー',exact:true})).toBeVisible();
  57  |   expect(await display.ariaSnapshot()).toContain('group "Markdownの表示"');
  58  |  });
  59  | 
  60  |  test(profile+': heatmap paints real cells, rejects an incompatible explicit axis, and restores the same data',async({page},info)=>{
  61  |   await openSpecialistCatalog(page,profile);
  62  |   await page.getByLabel('グラフの種別').selectOption('heatmap');
  63  |   const chart=page.locator('#chart > ui-chart');
  64  |   const cells=()=>chart.locator('svg path').evaluateAll(paths=>paths.map(path=>({fill:path.getAttribute('fill'),d:path.getAttribute('d'),width:path.getBoundingClientRect().width,height:path.getBoundingClientRect().height})).filter(path=>/^rgb\(/.test(path.fill??'')&&!!path.d&&path.width>8&&path.height>8));
  65  |   await expect(chart.locator('[role=alert]')).toHaveCount(0);
  66  |   await expect.poll(async()=>(await cells()).length).toBeGreaterThanOrEqual(3);
  67  |   const before=await cells();
  68  |   await page.getByRole('button',{name:'承認を選択',exact:true}).press('Space');
  69  |   await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  70  |   await page.getByLabel('数値軸',{exact:true}).check();
  71  |   await expect(chart.locator('[role=alert]')).toContainText('横軸・縦軸とも区分軸');
  72  |   await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  73  |   await expect(chart.locator('table')).toContainText('承認');
  74  |   await page.getByLabel('数値軸',{exact:true}).uncheck();
  75  |   await expect(chart.locator('[role=alert]')).toHaveCount(0);
  76  |   await expect.poll(async()=>(await cells()).length).toBeGreaterThanOrEqual(3);
  77  |   await expect(page.locator('[data-chart-selection]')).toHaveText('two');
  78  |   await info.attach('heatmap-real-cell-geometry',{body:JSON.stringify({before,recovered:await cells()}),contentType:'application/json'});
  79  |   await info.attach('heatmap-real-cells',{body:await chart.screenshot(),contentType:'image/png'});
  80  |  });
  81  | 
  82  |  test(profile+': FileExplorer skips a disabled first item and guards a selected item after controlled disable without losing its name',async({page})=>{
  83  |   await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'FileExplorer');
  84  |   const host=page.locator('#files ui-file-explorer'),root=page.locator('[data-explorer-id=root]');
  85  |   await page.getByLabel('先頭に無効項目を追加',{exact:true}).check();
  86  |   await expect(page.locator('[data-explorer-id=disabled-first]')).toBeDisabled();
  87  |   await page.getByLabel('表示方式',{exact:true}).focus();await page.keyboard.press('Tab');
  88  |   await expect(root).toBeFocused();await root.press('ArrowRight');await root.press('ArrowDown');
  89  |   const csv=page.locator('[data-explorer-id=csv]');await expect(csv).toBeFocused();await csv.press('Space');
  90  |   await expect(page.locator('[data-file-selection]')).toHaveText('csv');
  91  |   const draft=page.getByLabel('新しい名前',{exact:true});await draft.fill('保持する証憑名.txt');
  92  |   await page.getByLabel('選択した証憑を無効にする',{exact:true}).check();
  93  |   for(const name of ['開く','ダウンロード','削除を要求','名前変更を要求','フォルダー作成を要求'])await expect(host.getByRole('button',{name,exact:true})).toBeDisabled();
  94  |   await expect(draft).toHaveValue('保持する証憑名.txt');await expect(page.locator('[data-file-selection]')).toHaveText('csv');
  95  |   await expect(page.locator('[data-file-operation]')).toHaveText('なし');
  96  |   await page.getByLabel('選択した証憑を無効にする',{exact:true}).uncheck();
  97  |   await host.getByRole('button',{name:'開く',exact:true}).click();await expect(page.locator('[data-file-operation]')).toHaveText('open');
  98  |   await expect(draft).toHaveValue('保持する証憑名.txt');
  99  |  });
  100 | 
  101 |  test(profile+': FileExplorer retires owned focus on controlled disable or removal and leaves outside focus intact',async({page})=>{
  102 |   await openSpecialistCatalog(page,profile);await openSpecialistSurface(page,'FileExplorer');
  103 |   const host=page.locator('#files ui-file-explorer'),root=page.locator('[data-explorer-id=root]'),csv=page.locator('[data-explorer-id=csv]');
  104 |   await root.press('ArrowRight');await csv.focus();
  105 |   // A controlled app input update while the user remains in the collection.
  106 |   // The DOM click triggers the real Angular input binding without moving focus.
  107 |   await page.getByLabel('選択した証憑を無効にする',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
  108 |   await expect(csv).toBeDisabled();await expect(host).toBeFocused();await expect(host).toHaveAttribute('aria-label','添付管理の操作領域');
  109 |   await page.getByLabel('選択した証憑を無効にする',{exact:true}).uncheck();await csv.focus();
  110 |   await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
> 111 |   await expect(csv).toHaveCount(0);await expect(host).toBeFocused();await expect(root).toHaveAttribute('tabindex','0');
      |                                                       ^ Error: expect(locator).toBeFocused() failed
  112 |   await page.getByLabel('証憑を取り除く',{exact:true}).uncheck();
  113 |   const outside=page.getByRole('navigation',{name:'専門部品'}).getByRole('button',{name:'Code',exact:true});await outside.focus();
  114 |   await page.getByLabel('証憑を取り除く',{exact:true}).evaluate((input:HTMLInputElement)=>input.click());
  115 |   await expect(csv).toHaveCount(0);await expect(outside).toBeFocused();
  116 |  });
  117 | }
  118 | 
```