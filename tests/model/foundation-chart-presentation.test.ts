import {test} from 'node:test';import assert from 'node:assert/strict';
import {chartOptions} from '../../.ui/generated/angular/chart-options';
import {chartLocaleProblem} from '../../.ui/generated/angular/specialist-model';
import type {SpecialistTheme} from '../../.ui/generated/angular/specialist-browser';
const theme:SpecialistTheme={text:'#000',muted:'#555',surface:'#fff',background:'#eee',border:'#999',action:'#00f',onAction:'#fff',success:'#080',danger:'#900',focus:'#00f',font:'sans-serif',codeFont:'monospace',fontSize:16,controlSize:44,gap:8,radius:4,borderWidth:1,mapRegionOpacity:.25,reducedMotion:true};
const series=[{id:'a',label:'App label',points:[{id:'p',label:'Unmodified data',value:1234.5}]}];
test('chart numeric view format reaches axes and gauge without converting application points or labels',()=>{
 const presentation={locale:'de-DE',timeZone:null,numberOptions:{minimumFractionDigits:2,maximumFractionDigits:2},dateTimeOptions:{}};
 const options=chartOptions('bar',series,{label:'App X',type:'category'},{label:'App Y',type:'value'},true,null,theme,false,[],presentation) as any;
 assert.equal(options.yAxis.axisLabel.formatter(1234.5),'1.234,50');assert.equal(options.xAxis.axisLabel.formatter,undefined);assert.equal(options.xAxis.name,'App X');assert.equal((options.series as any[])[0].data[0].value,1234.5);assert.equal(series[0].points[0].value,1234.5);
 const gauge=chartOptions('gauge',series,{label:'X',type:'category'},{label:'Y',type:'value'},false,null,theme,false,[],presentation) as any;
 assert.equal(gauge.series[0].detail.formatter(1234.5),'1.234,50');
});
test('chart time formatter requires explicit zone and uses app date options rather than host timezone',()=>{
 const presentation={locale:'en-US',timeZone:'UTC',numberOptions:{},dateTimeOptions:{hour:'2-digit' as const,minute:'2-digit' as const,hourCycle:'h23' as const}};
 const options=chartOptions('line',series,{label:'Clock',type:'time'},{label:'Y',type:'value'},false,null,theme,false,[],presentation) as any;
 assert.equal(options.xAxis.axisLabel.formatter(Date.parse('2026-10-06T01:00:00Z')),'01:00');assert.equal(chartLocaleProblem('en-US',null,{},presentation.dateTimeOptions,true),'時間軸のタイムゾーンを明示してください。');assert.equal(chartLocaleProblem('en-US',null,{},presentation.dateTimeOptions,false),null);assert.match(chartLocaleProblem('bad_locale','UTC',{},presentation.dateTimeOptions,true)!,/書式/);assert.match(chartLocaleProblem('en-US','UTC',{}, {timeZone:'Asia/Tokyo'},true)!,/独立/);
});
test('each chart axis keeps its own numeric or time presentation',()=>{
 const presentation={locale:'en-US',timeZone:'UTC',numberOptions:{minimumFractionDigits:2,maximumFractionDigits:2},dateTimeOptions:{hour:'2-digit' as const,minute:'2-digit' as const,hourCycle:'h23' as const}};
 const options=chartOptions('scatter',series,{label:'Amount',type:'value'},{label:'Clock',type:'time'},false,null,theme,false,[],presentation) as any;
 assert.equal(options.xAxis.axisLabel.formatter(1234.5),'1,234.50');
 assert.equal(options.yAxis.axisLabel.formatter(Date.parse('2026-10-06T01:00:00Z')),'01:00');
});
