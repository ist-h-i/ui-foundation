import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {createSourcePolicy} from '../../src/check/policy.ts';
import {checkSources} from '../../src/check/scanner.ts';
const example=await readFile(new URL('../../examples/ui.config.example.yaml',import.meta.url),'utf8');
async function scan(source:string,files:Record<string,string>={}){
 const root=await mkdtemp(resolve(tmpdir(),'ui-css-inherited-'));
 try{
  await mkdir(resolve(root,'app'));
  for(const[name,content]of Object.entries({'app.ts':source,...files}))await writeFile(resolve(root,'app',name),content);
  const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);
  return await checkSources({root,config,policy:createSourcePolicy(config)});
 }finally{await rm(root,{recursive:true,force:true});}
}
// Each case has an actual template ancestry or an explicit negative boundary.
const cases=[
  {
    "name": "css-table-same-ancestor-bad",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".parent{--local-columns:17px}.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "css-table-split-ancestor-bad",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:17px}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "css-table-ancestor-good",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:3}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "css-table-unrelated-node",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"></section><table class=\\\"consumer\\\"></table>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:17px}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "css-table-registered",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:17px}\",\"@property --local-columns{syntax:\\\"*\\\";inherits:false}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "css-divider-same-ancestor-bad",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".parent{--local-columns:17px}.consumer::before{border-block-start:var(--ui-border-control) var(--local-columns) var(--ui-color-border)}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "css-divider-split-ancestor-bad",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer::before{border-block-start:var(--ui-border-control) var(--local-columns) var(--ui-color-border)}\",\".parent{--local-columns:17px}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "css-divider-ancestor-good",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer::before{border-block-start:var(--ui-border-control) var(--local-columns) var(--ui-color-border)}\",\".parent{--local-columns:solid}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "css-divider-unrelated-node",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"></section><table class=\\\"consumer\\\"></table>\",styles:[\".consumer::before{border-block-start:var(--ui-border-control) var(--local-columns) var(--ui-color-border)}\",\".parent{--local-columns:17px}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "css-divider-registered",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer::before{border-block-start:var(--ui-border-control) var(--local-columns) var(--ui-color-border)}\",\".parent{--local-columns:17px}\",\"@property --local-columns{syntax:\\\"*\\\";inherits:false}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "recursive-ancestor-bad",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\" style=\\\"--end:17px\\\"><table class=\\\"consumer\\\" style=\\\"--end:0\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:var(--end)}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "recursive-child-must-not-supply",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\" style=\\\"--end:0\\\"><table class=\\\"consumer\\\" style=\\\"--end:17px\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:var(--end)}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "inline-ancestor-positive",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section style=\\\"--local-columns:17px\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\"\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "template-boundary",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><ng-template><table class=\\\"consumer\\\"></table></ng-template></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:17px}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "transparent-container",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><ng-container><table class=\\\"consumer\\\"></table></ng-container></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\".parent{--local-columns:17px}\"]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "other-owner",
    "source": "import{Component,Directive}from'@angular/core';@Component({selector:'app-case',template:\"<section class=\\\"parent\\\"><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\",\"\"]})class Case{flag!:boolean}@Component({selector:'app-other',template:\"\",styles:[\".parent{--local-columns:17px}\"]})class Other{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  },
  {
    "name": "directive-same-node",
    "source": "import{Component,Directive}from'@angular/core';@Directive({selector:'[supply]',host:{'[style.--local-columns]':\"'17px'\"}})class Supply{}@Component({selector:'app-case',template:\"<table supply class=\\\"consumer\\\"></table>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\"],imports:[Supply]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "directive-ancestor",
    "source": "import{Component,Directive}from'@angular/core';@Directive({selector:'[supply]',host:{'[style.--local-columns]':\"'17px'\"}})class Supply{}@Component({selector:'app-case',template:\"<section supply><table class=\\\"consumer\\\"></table></section>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\"],imports:[Supply]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": true
  },
  {
    "name": "directive-unrelated",
    "source": "import{Component,Directive}from'@angular/core';@Directive({selector:'[supply]',host:{'[style.--local-columns]':\"'17px'\"}})class Supply{}@Component({selector:'app-case',template:\"<section supply></section><table class=\\\"consumer\\\"></table>\",styles:[\".consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}\"],imports:[Supply]})class Case{flag!:boolean};throw new Error('Application must never execute');",
    "expectedCandidate": false
  }
];
for(const item of cases)test(`CSS supply: ${item.name}`,async()=>{
 const report=await scan(item.source);
 assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'&&d.source.includes('--local-columns=')&&d.message.includes('Concrete value 17px')),item.expectedCandidate,JSON.stringify(report));
 assert.equal(report.valid,!item.expectedCandidate,JSON.stringify(report));
 assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'),'inheritance is candidate evidence, not closed coverage');
});

test('CSS ancestor expressions retain distinct receiving applications',async()=>{
 for(const bad of [false,true]){
  const source=`import{Component}from'@angular/core';@Component({selector:'app-child',template:'<section class="parent"><table class="consumer" style="--end:17px"></table></section>',styles:['.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}','.parent{--local-columns:var(--bridge)}']})class Child{}@Component({selector:'app-root',imports:[Child],template:'<app-child style="--bridge:var(--end);--end:${bad?'19px':'0'}"></app-child><app-child style="--bridge:0;--end:17px"></app-child>'})class App{}throw new Error('Never execute application');`;
  const report=await scan(source);
  assert.equal(report.valid,!bad,JSON.stringify(report));
  assert.equal(report.diagnostics.some(d=>d.message.includes('Concrete value 19px')),bad,JSON.stringify(report));
  assert.ok(!report.diagnostics.some(d=>d.message.includes('Concrete value 17px')),JSON.stringify(report));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('CSS ancestor candidates inspect external SCSS and imported shared consumers',async()=>{
 for(const shared of [false,true]){
  const consumer='.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}';
  const source=`import{Component}from'@angular/core';${shared?"import{shared}from'./shared';":''}@Component({selector:'app-test',template:'<section class="parent"><table class="consumer"></table></section>',styleUrl:'writer.scss',styles:${shared?'[shared]':JSON.stringify([consumer])}})class App{}throw new Error('Never execute application');`;
  const report=await scan(source,{'writer.scss':'.parent{--local-columns:17px}',...(shared?{'shared.ts':`export const shared=${JSON.stringify(consumer)}`}:{})});
  assert.equal(report.valid,false,JSON.stringify(report));
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.source.includes('--local-columns=17px')));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('CSS ancestor compound facts and directive dependencies stay on the actual ancestor',async()=>{
 const table='.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}';
 for(const [selector,template,bad]of [
  ['.parent.special','<section class="parent"><table class="consumer"></table></section><aside class="special"></aside>',false],
  ['.parent.special','<section class="parent special"><table class="consumer"></table></section>',true],
  ['.parent:not(.special)','<section class="parent special"><table class="consumer"></table></section>',false],
  ['.parent:not(.special)','<section class="parent"><table class="consumer"></table></section>',true],
 ]as[string,string,boolean][]){
  const source=`import{Component}from'@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)},styles:${JSON.stringify([table,selector+'{--local-columns:17px}'])}})class App{}`;
  const report=await scan(source);assert.equal(report.valid,!bad,JSON.stringify(report));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 for(const bad of [false,true]){
  const source=`import{Component,Directive}from'@angular/core';@Directive({selector:'[supply]',host:{style:'--local-columns:var(--end)'}})class Supply{}@Component({selector:'app-test',imports:[Supply],template:'<section supply style="--end:${bad?'19px':'0'}"><table class="consumer" style="--end:17px"></table></section>',styles:[${JSON.stringify(table)}]})class App{}`;
  const report=await scan(source);assert.equal(report.valid,!bad,JSON.stringify(report));assert.ok(!report.diagnostics.some(d=>d.message.includes('Concrete value 17px')),JSON.stringify(report));
 }
});

test('CSS ancestor selector alternatives never combine mutually exclusive facts',async()=>{
 for(const combined of [false,true]){
  const classes=combined?"flag ? 'left right' : 'none'":"flag ? 'left' : 'right'";
  const template=`<section class="parent" [class]="${classes}" style="--end:0"><table class="consumer"></table></section>`;
  const source=`import{Component}from'@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)},styles:['.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}','.parent.left{--local-columns:var(--end)}']})class App{flag!:boolean}`;
  const report=await scan(source,{'global.css':'.parent.right{--end:17px}'});
  assert.equal(report.valid,!combined,JSON.stringify(report));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
