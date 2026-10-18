import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chartOptions,gaugeLayout} from '../../.ui/generated/angular/chart-options.ts';
import {chartAxisProblem} from '../../.ui/generated/angular/specialist-model.ts';
import type {SpecialistTheme} from '../../.ui/generated/angular/specialist-browser.ts';
import {readSpecialistTheme} from '../../templates/angular/specialist-browser.ts';

const theme:SpecialistTheme={surface:'#fff',background:'#eee',text:'#111',muted:'#555',border:'#999',action:'#123456',onAction:'#fff',success:'#086',danger:'#c11',focus:'#269',font:'sans-serif',codeFont:'monospace',fontSize:16,gap:12,controlSize:44,radius:4,borderWidth:1,mapRegionOpacity:.25,reducedMotion:true};
test('specialist theme reads measured semantic border widths and numeric region opacity on each refresh',()=>{
 const descriptors=new Map(['getComputedStyle','matchMedia'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const tokens=new Map([['--ui-opacity-map-region',' .25 ']]),lengths=new Map([['text-body',16],['size-control',44],['space-control-gap',12],['radius-control',4],['border-control',1]]);
 const measured:string[]=[],probes:{removed:boolean}[]=[];
 const host={ownerDocument:{createElement:()=>{const probe={style:{cssText:'',inlineSize:''},removed:false,getBoundingClientRect:()=>{const name=probe.style.inlineSize.slice('var(--ui-'.length,-1);measured.push(name);return {width:lengths.get(name)};},remove:()=>{probe.removed=true;}};probes.push(probe);return probe;}},append:()=>{}} as unknown as HTMLElement;
 Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({getPropertyValue:(key:string)=>tokens.get(key)??''})});
 Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:true})});
 try{
  const initial=readSpecialistTheme(host);assert.equal(initial.borderWidth,1);assert.equal(initial.mapRegionOpacity,.25);
  lengths.set('border-control',3);tokens.set('--ui-opacity-map-region','.6');
  const changed=readSpecialistTheme(host);assert.equal(changed.borderWidth,3);assert.equal(changed.mapRegionOpacity,.6);assert.equal(changed.fontSize,16);assert.equal(changed.controlSize,44);
  tokens.set('--ui-opacity-map-region','0');assert.equal(readSpecialistTheme(host).mapRegionOpacity,0);
  tokens.delete('--ui-opacity-map-region');assert.ok(Number.isNaN(readSpecialistTheme(host).mapRegionOpacity));
  assert.equal(measured.filter(name=>name==='border-control').length,4);assert.ok(probes.every(probe=>probe.removed));
 }finally{for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
test('heatmap category coordinates preserve negative values, sparse numeric positions and explicit missing data',()=>{
 const series=[{id:'measure',label:'観測',points:[{id:'a',label:'A',x:10,y:20,value:-5},{id:'b',label:'B',x:-10,y:10,value:7},{id:'missing',label:'未取得',x:30,y:20,value:null}]}];
 const options=chartOptions('heatmap',series,{label:'X',type:'category'},{label:'Y',type:'category'},true,null,theme) as any;
 assert.deepEqual(options.xAxis.data,['-10','10','30']);assert.deepEqual(options.yAxis.data,['10','20']);
 assert.equal(options.xAxis.boundaryGap,true);assert.equal(options.yAxis.boundaryGap,true);
 assert.deepEqual(options.series[0].data.map((point:any)=>point.value),[['10','20',-5],['-10','10',7]]);
 assert.equal(options.visualMap.min,-5);assert.equal(options.visualMap.max,7);
 const compact=chartOptions('heatmap',series,{label:'X',type:'category'},{label:'Y',type:'category'},false,null,theme,true) as any;
 assert.equal(compact.xAxis.type,'category');assert.equal(compact.yAxis.type,'category');assert.deepEqual(compact.series[0].data,options.series[0].data);
});
test('heatmap rejects explicit value and time axes while other chart kinds retain their valid numeric axes',()=>{
 const category={label:'区分',type:'category' as const},value={label:'値',type:'value' as const},time={label:'日時',type:'time' as const};
 assert.equal(chartAxisProblem(category,category,'heatmap'),null);
 assert.match(chartAxisProblem(value,category,'heatmap')!,/区分軸/);assert.match(chartAxisProblem(category,time,'heatmap')!,/区分軸/);
 assert.equal(chartAxisProblem(value,value,'scatter'),null);assert.equal(chartAxisProblem(time,value,'line'),null);
});

test('multiple gauge points have independent positions and preserve original application selection keys',()=>{
 const series=[{id:'measure',label:'観測',points:[{id:'a',label:'A',value:2},{id:'b',label:'B',value:5},{id:'c',label:'C',value:9},{id:'missing',label:'未取得',value:null}]}];
 const options=chartOptions('gauge',series,{label:'X',type:'category'},{label:'値',type:'value'},true,{seriesId:'measure',pointId:'b'},theme) as any;
 assert.equal(options.series.length,3);assert.equal(new Set(options.series.map((series:any)=>JSON.stringify(series.center))).size,3);
 assert.equal(new Set(options.series.map((series:any)=>series.id)).size,3);
 assert.deepEqual(options.series.map((series:any)=>series.data[0].value),[2,5,9]);
 assert.ok(options.series.every((series:any)=>series.data.length===1&&series.data[0].applicationSeriesId==='measure'));
 assert.equal(options.series[1].data[0].selected,true);
 const hidden=chartOptions('gauge',series,{label:'X',type:'category'},{label:'値',type:'value'},false,null,theme,false,['measure']) as any;
 assert.deepEqual(hidden.series,[]);
});


test('gauge layout reserves separate dial, title and full value rows as text grows and columns collapse',()=>{
 const normal=gaugeLayout(3,theme,{width:1120,lineHeight:25.6},3);
 const enlarged={...theme,fontSize:32};
 const narrow=gaugeLayout(3,enlarged,{width:256,lineHeight:51.2},3);
 const longValue=gaugeLayout(3,enlarged,{width:256,lineHeight:51.2},40);
 assert.equal(normal.columns,2);assert.equal(normal.rows,2);assert.equal(narrow.columns,1);
 assert.ok(narrow.height>normal.height);assert.ok(longValue.detailHeight>narrow.detailHeight);assert.ok(longValue.height>narrow.height);
 for(const layout of [normal,narrow,longValue]){
  assert.ok(layout.titleOffset-layout.lineHeight/2>layout.radius);
  assert.ok(layout.detailOffset-layout.detailHeight/2>layout.titleOffset+layout.lineHeight/2);
  for(let index=0;index<3;index++){
   const [x,y]=layout.center(index);assert.ok(x-layout.radius>=0);assert.ok(y-layout.radius>=0);
   assert.ok(y+layout.detailOffset+layout.detailHeight/2<=layout.height);
  }
 }
 assert.equal(gaugeLayout(0,enlarged,{width:256,lineHeight:51.2}).height,0);
});
test('responsive gauges keep zero, long names, full large formatted values, missing rows and application keys',()=>{
 const series=[{id:'raw/series',label:'系列の完全名称',points:[{id:'zero',label:'ゼロの完全名称',value:0},{id:'large',label:'長い日本語の名称とContinuousEnglishLabel'.repeat(3),value:1234567890123.5},{id:'missing',label:'未取得を保持',value:null}]}];
 const snapshot=structuredClone(series),presentation={locale:'de-DE',timeZone:null,numberOptions:{minimumFractionDigits:2,maximumFractionDigits:2},dateTimeOptions:{}};
 const options=chartOptions('gauge',series,{label:'X',type:'category'},{label:'Y',type:'value'},true,{seriesId:'raw/series',pointId:'large'}, {...theme,fontSize:32},false,[],presentation,{width:256,lineHeight:51.2}) as any;
 assert.equal(options.series.length,2);assert.deepEqual(options.series.map((item:any)=>item.data[0].value),[0,1234567890123.5]);
 assert.deepEqual(options.series.map((item:any)=>item.data[0].id),['zero','large']);assert.ok(options.series.every((item:any)=>item.data[0].applicationSeriesId==='raw/series'));
 assert.equal(options.series[1].data[0].name,series[0].points[1].label);assert.equal(options.series[1].data[0].selected,true);
 assert.equal(options.series[1].detail.formatter(1234567890123.5),'1.234.567.890.123,50');assert.equal(options.series[0].detail.formatter(0),'0,00');
 assert.equal(options.series[0].splitNumber,10);assert.equal(options.series[0].axisLabel.formatter(100),'100,00');assert.equal(options.series[0].axisLabel.fontSize,32);assert.equal(options.animation,false);
 assert.deepEqual(series,snapshot);
 const hidden=chartOptions('gauge',series,{label:'X',type:'category'},{label:'Y',type:'value'},true,null,theme,false,['raw/series'],presentation,{width:256,lineHeight:51.2}) as any;
 assert.deepEqual(hidden.series,[]);
});


test('every gauge tick reserves semantic separation from major/minor strokes and the full native pointer extent',()=>{
 const measureText=(label:string)=>[...label].length*10.5;
 const geometry={width:1120,lineHeight:25.6,textHeight:22,measureText};
 const labels=Array.from({length:11},(_,index)=>String(index*10));
 const halfExtent=Math.max(...labels.map(label=>Math.hypot(measureText(label),geometry.textHeight)))/2;
 const series=[{id:'s',label:'App series',points:[{id:'p',label:'App point',value:10}]}];
 const options=chartOptions('gauge',series,{label:'X',type:'category'},{label:'Y',type:'value',min:0,max:100},false,null,theme,false,[],undefined,geometry) as any;
 const gauge=options.series[0],labelCenter=gauge.radius-gauge.splitLine.length-gauge.splitLine.distance-gauge.axisLabel.distance;
 const majorInner=gauge.radius-gauge.axisLine.lineStyle.width-gauge.splitLine.distance-gauge.splitLine.length;
 const minorInner=gauge.radius-gauge.axisLine.lineStyle.width-gauge.axisTick.distance-gauge.axisTick.length;
 assert.ok(labelCenter+halfExtent<majorInner);assert.ok(labelCenter+halfExtent<minorInner);
 assert.ok(gauge.pointer.length>0);assert.ok(gauge.pointer.length<labelCenter-halfExtent);
 assert.ok(labelCenter-halfExtent-gauge.pointer.length>=theme.gap);
 assert.equal(gauge.splitNumber,10);assert.equal(gauge.axisTick.show,undefined);
 assert.deepEqual(gauge.data[0].value,10);assert.equal(gauge.data[0].id,'p');
});
