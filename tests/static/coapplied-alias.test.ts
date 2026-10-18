import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {test,type TestContext} from 'node:test';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {createSourcePolicy} from '../../src/check/policy.ts';
import {checkSources} from '../../src/check/scanner.ts';
import type {CheckException} from '../../src/check/types.ts';
const example=await readFile(new URL('../../examples/ui.config.example.yaml',import.meta.url),'utf8');
const css=':host::before{border-block-start:var(--ui-border-control) var(--local-line) var(--ui-color-border)}';
const divider=`@Component({selector:'app-divider',template:'',host:{'[style.--local-line]':\`'solid'\`},styles:[${JSON.stringify(css)}]})class Divider{}`;
const other=(value:string)=>`@Directive({selector:'[other]',host:{'[style.--local-line]':${JSON.stringify(JSON.stringify(value))}}})class Other{}`;
const consumer=(template:string,imports='[Divider,Other]')=>`@Component({selector:'app-consumer',imports:${imports},template:${JSON.stringify(template)}})class Consumer{}`;
async function scan(t:TestContext,source:string,files:Record<string,string>={},exceptions:CheckException[]=[]){
 const root=await mkdtemp(resolve(tmpdir(),'ui-coapplied-alias-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions};const config=resolveConfig(input);
 await mkdir(resolve(root,'app'));for(const[name,text]of Object.entries({'app.ts':`import {Component,Directive} from '@angular/core';${source}`,...files}))await writeFile(resolve(root,'app',name),text);
 return checkSources({root,config,policy:createSourcePolicy(config)});
}
const payloads=[['red','literal-token'],['17px','literal-token'],['var(--ui-p-red)','primitive-reference'],['var(--ui-size-control)','token-category'],['var(--ui-color-missing)','unknown-token']]as const;
test('coapplied directive host values are inspected by the component host CSS consumer',async t=>{
 for(const[value,rule]of payloads){const report=await scan(t,divider+other(value)+consumer('<app-divider other />'));assert.ok(report.diagnostics.some(d=>d.rule===rule&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));}
});
test('a consumer literal exception cannot absorb an additional literal injected by an alias writer',async t=>{
 const table=`@Component({selector:'app-table',template:'<table class="table" [style.--local-columns]="3"></table>',styles:['.table{min-inline-size:calc(var(--local-columns) * max(var(--ui-size-table-column-min),8em))}']})class Table{}`;
 const before=await scan(t,table);const literal=before.diagnostics.find(d=>d.rule==='literal-token');assert.ok(literal);
 const exception={file:literal.file,rule:literal.rule,source:literal.source,line:literal.line,column:literal.column,reason:'Character measure for the table minimum'};
 assert.equal((await scan(t,table,{},[exception])).valid,true);
 const after=await scan(t,table,{'global.css':'.table{--local-columns:17px!important}'},[exception]);
 assert.equal(after.valid,false);assert.ok(after.diagnostics.some(d=>d.rule==='exception-error'));
 assert.ok(after.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.message.includes('--local-columns')));
});
test('one fixed cap shared by a whole return and partial branch retains one narrow exception diagnostic',async t=>{
 const source=`@Component({selector:'app-cap',template:'<p [style.max-inline-size]="maximum()"></p>'})class Cap{flag!:boolean;top!:number;protected maximum(){return this.flag?'min(100%, var(--ui-size-content))':'min(100%, '+this.top+'px)';}}function expose(instance:Cap){opaque(instance);}`;
 const before=await scan(t,source);const literals=before.diagnostics.filter(d=>d.rule==='literal-token');assert.equal(literals.length,1,JSON.stringify(before.diagnostics));const literal=literals[0]!;assert.ok(literal.source.includes('max-inline-size:(dynamic expression; fixed 100%)'));
 const exception={file:literal.file,rule:literal.rule,source:'max-inline-size:(dynamic expression; fixed 100%)',line:literal.line,column:literal.column,reason:'The parent-width cap, not arbitrary pixel dimensions'};
 const after=await scan(t,source,{},[exception]);assert.equal(after.valid,true);assert.equal(after.exceptions.length,1);assert.ok(after.diagnostics.some(d=>d.rule==='unresolved'));
 const changed=await scan(t,source.replace('min(100%, var(--ui-size-content))','min(100%,17px)'),{},[exception]);assert.equal(changed.valid,false);assert.ok(changed.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),JSON.stringify(changed));assert.equal(changed.exceptions.length,1,'only the fixed 100% remains excepted');
});
test('dynamic unit suffix fragments are not independent alias violations but a complete bad unit remains one',async t=>{
 const source=(binding:string)=>`@Component({selector:'app-offset',template:'',host:{'[style.--local-offset]':${JSON.stringify(binding)}},styles:[':host{max-block-size:calc(100dvh - var(--local-offset))}']})class Offset{top!:number;}`;
 const before=await scan(t,source("top+'px'"));const literals=before.diagnostics.filter(d=>d.rule==='literal-token');assert.equal(literals.length,1,JSON.stringify(before.diagnostics));assert.ok(literals[0]!.message.includes('100dvh'));assert.ok(before.diagnostics.some(d=>d.rule==='unresolved'));
 const literal=literals[0]!;const exception={file:literal.file,rule:literal.rule,source:literal.source,line:literal.line,column:literal.column,reason:'Viewport limit after measured offset'};
 assert.equal((await scan(t,source("top+'px'"),{},[exception])).valid,true);
 const complete=await scan(t,source("'px'"));assert.ok(complete.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('--local-offset=px')));
});
test('mixed dynamic fragments never discard complete invalid branches of reachable alias writers',async t=>{
 const expression="flag ? '17px' : top + 'px'";
 const directive=`@Directive({selector:'[other]',host:{'[style.--local-line]':${JSON.stringify(expression)}}})class Other{flag!:boolean;top!:number;}`;
 const sources=[divider+directive+consumer('<app-divider other />'),divider+`@Component({selector:'app-consumer',imports:[Divider],template:${JSON.stringify(`<app-divider [style.--local-line]="${expression}" />`)}})class Consumer{flag!:boolean;top!:number;}`];
 for(const source of sources){const report=await scan(t,source);assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));assert.equal(report.diagnostics.filter(d=>d.rule==='parse-error').length,0);}
 const fragment=await scan(t,divider+`@Component({selector:'app-consumer',imports:[Divider],template:${JSON.stringify(`<app-divider [style.--local-line]="'calc(17px + ' + top + 'px)'" />`)}})class Consumer{top!:number;}`);
 assert.ok(fragment.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')));assert.equal(fragment.diagnostics.filter(d=>d.rule==='parse-error').length,0,JSON.stringify(fragment.diagnostics));
 const native=await scan(t,directive+`@Component({selector:'app-table',imports:[Other],template:'<table class="table" other></table>',styles:['.table{padding:var(--local-line)}']})class Table{}`);
 assert.ok(native.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('padding:var(--local-line)')),JSON.stringify(native.diagnostics));assert.ok(native.diagnostics.some(d=>d.rule==='unresolved'));assert.equal(native.diagnostics.filter(d=>d.rule==='parse-error').length,0);
});
test('global class and id selectors follow actual imported component host applications',async t=>{
 for(const[attr,selector]of [['class="special"','.special'],['id="special"','#special']]as const){
  const report=await scan(t,divider+consumer(`<app-divider ${attr} />`,'[Divider]'),{'global.css':`${selector}{--local-line:17px!important}`});
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
  const sibling=await scan(t,divider+consumer(`<app-divider /><div ${attr}></div>`,'[Divider]'),{'global.css':`${selector}{--local-line:17px!important}`});assert.equal(sibling.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(sibling.diagnostics));
  const metadataHost=await scan(t,divider.replace('host:{',`host:{${attr.startsWith('class')?"class:'special'":"id:'special'"},`),{'global.css':`${selector}{--local-line:17px!important}`});assert.ok(metadataHost.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('border-block-start')),JSON.stringify(metadataHost.diagnostics));
 }
});
test('complete color and unit alternatives stay complete beside dynamic fragments and style bags',async t=>{
 for(const value of ['aliceblue','rebeccapurple','px'])for(const bag of [false,true]){
  const expression=`flag ? '${value}' : top + 'px'`;
  const template=bag?`<app-divider [ngStyle]="{'--local-line': ${expression}}" />`:`<app-divider [style.--local-line]="${expression}" />`;
  const report=await scan(t,divider+`@Component({selector:'app-consumer',imports:[Divider],template:${JSON.stringify(template)}})class Consumer{flag!:boolean;top!:number;}`);
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes(value)&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 for(const expression of ["flag ? 'solid' : 'sol'+tail", "(flag ? 0 : top+'px') || 'solid'"]){
  const report=await scan(t,divider+`@Component({selector:'app-consumer',imports:[Divider],template:${JSON.stringify(`<app-divider [style.--local-line]="${expression}" />`)}})class Consumer{flag!:boolean;top!:number;tail!:string;}`);
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('global native writers follow alternate selectors of the same node without crossing sibling nodes',async t=>{
 for(const selector of ['.special','#special','table']){
  const table=(applied:boolean)=>`@Component({selector:'app-table',template:${JSON.stringify(applied?'<table class="table special" id="special" [style.--local-columns]="3"></table>':'<table class="table" [style.--local-columns]="3"></table><div class="special" id="special"></div>')},styles:['.table{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}']})class Table{}`;
  const report=await scan(t,table(true),{'global.css':`${selector}{--local-columns:17px!important}`});assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('min-inline-size')),JSON.stringify(report.diagnostics));
  if(selector!=='table'){const sibling=await scan(t,table(false),{'global.css':`${selector}{--local-columns:17px!important}`});assert.equal(sibling.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(sibling.diagnostics));}
 }
});
test('coapplied directive static host class and id facts follow each receiving node only',async t=>{
 for(const[key,selector]of [['class','.special'],['id','#special']]as const){
  const directive=`@Directive({selector:'[other]',host:{${key}:'special'}})class Other{}`;
  const report=await scan(t,divider+directive+consumer('<app-divider other />'),{'global.css':`${selector}{--local-line:17px!important}`});assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));
  const native=await scan(t,directive+`@Component({selector:'app-table',imports:[Other],template:'<table class="table" other [style.--local-columns]="3"></table>',styles:['.table{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}']})class Table{}`,{'global.css':`${selector}{--local-columns:17px!important}`});assert.ok(native.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('min-inline-size')),JSON.stringify(native.diagnostics));
  const sibling=await scan(t,divider+directive+consumer('<app-divider /><div other></div>'),{'global.css':`${selector}{--local-line:17px!important}`});assert.equal(sibling.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(sibling.diagnostics));
 }
});
test('compound native consumers require all same-subject selectors before receiving a global writer',async t=>{
 for(const consumer of ['table.consumer','table#target','table.consumer:not(.special)']){
  const source=(applied:boolean)=>`@Component({selector:'app-table',template:${JSON.stringify(applied?'<table class="consumer special" id="target" style="--local-line:var(--ui-space-field)"></table>':'<table class="special"></table><table class="consumer" id="target" style="--local-line:var(--ui-space-field)"></table>')},styles:[${JSON.stringify(`${consumer}{padding:var(--local-line)}`)}]})class Table{}`;
  const unrelated=await scan(t,source(false),{'global.css':'.special{--local-line:17px!important}'});assert.equal(unrelated.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(unrelated.diagnostics));assert.ok(unrelated.diagnostics.some(d=>d.rule==='unresolved'));
  const same=await scan(t,source(true),{'global.css':'.special{--local-line:17px!important}'});assert.equal(same.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),!consumer.includes(':not'),JSON.stringify(same.diagnostics));
 }
});
test('unmodelled native attribute and ancestry qualifiers retain Unknown without borrowing sibling values',async t=>{
 for(const consumer of ['table[data-consumer]','.parent table.consumer','table.consumer:nth-child(2)']){
  const report=await scan(t,`@Component({selector:'app-table',template:'<table class="special"></table><table class="consumer" style="--local-line:var(--ui-space-field)"></table>',styles:[${JSON.stringify(`${consumer}{padding:var(--local-line)}`)}]})class Table{}`,{'global.css':'.special{--local-line:17px!important}'});
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('coapplied native directive values retain their own compound subject when another node shares the tag',async t=>{
 const directive=`@Directive({selector:'[other]',host:{'[style.--local-line]':\`'17px'\`}})class Other{}`;
 for(const consumer of ['table.consumer','table#target','.consumer','#target'])for(const applied of [false,true]){
  const template=applied?'<table other class="consumer special" id="target"></table>':'<table other class="special"></table><table class="consumer" id="target"></table>';
  const report=await scan(t,directive+`@Component({selector:'app-table',imports:[Other],template:${JSON.stringify(template)},styles:[${JSON.stringify(`${consumer}{border:var(--ui-border-control) var(--local-line) var(--ui-color-border)}`)}]})class Table{}`);
  assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')&&d.source.includes('border:')),applied,JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('parent template style writers cannot falsely certify the receiving component host',async t=>{
 for(const[value,rule]of payloads){const report=await scan(t,divider+consumer(`<app-divider style="--local-line:${value}" />`,'[Divider]'));assert.ok(report.diagnostics.some(d=>d.rule===rule&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));}
});
test('known dynamic-style branches and external templates preserve candidates and unknown coverage',async t=>{
 for(const template of ["<app-divider [style.--local-line]=\"flag ? '17px' : runtime\" />","<app-divider [ngStyle]=\"{'--local-line': flag ? '17px' : runtime}\" />"]){
  const report=await scan(t,divider+`@Component({selector:'app-consumer',imports:[Divider],templateUrl:'consumer.html'})class Consumer{flag!:boolean;runtime!:string;}`,{'consumer.html':template});assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('unrelated or unimported directive writers do not contaminate component host candidates',async t=>{
 for(const[template,imports]of [['<app-divider /><div other></div>','[Divider,Other]'],['<app-divider other />','[Divider]']]as const){
  const report=await scan(t,divider+other('17px')+consumer(template,imports));assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
 }
 assert.deepEqual((await scan(t,divider)).diagnostics,[],'a closed host without another writer retains its proof');
});
test('separate global CSS cannot silently certify a host alias and its matching known values are checked',async t=>{
 for(const[value,rule]of payloads){
  const report=await scan(t,divider,{'global.css':`app-divider{--local-line:${value}!important}`});
  assert.ok(report.diagnostics.some(d=>d.rule===rule&&d.source.includes('border-block-start')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const unrelated=await scan(t,divider,{'global.css':'app-unrelated{--local-line:17px!important}'});
 assert.equal(unrelated.diagnostics.filter(d=>d.severity==='error').length,0);assert.ok(unrelated.diagnostics.some(d=>d.rule==='unresolved'),'unproven global scope must retain uncertainty without borrowing values');
});
test('global native aliases and resets are checked without claiming cascade winners',async t=>{
 const table=`@Component({selector:'app-table',template:'<table class="table" [style.--local-columns]="3"></table>',styles:['.table{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}']})class Table{}`;
 for(const value of ['var(--ui-color-action)','var(--ui-p-red)']){
  const report=await scan(t,table,{'global.css':`.table{--local-columns:${value}!important}`});
  assert.ok(report.diagnostics.some(d=>d.severity==='error'&&d.source.includes('min-inline-size')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 for(const value of ['inherit','unset','initial','revert','revert-layer','solid']){
  const report=await scan(t,divider,{'global.css':`@media(prefers-reduced-motion:reduce){app-divider{--local-line:${value}!important}}`});
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')));assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
 }
});
test('coapplied directive writers reach only matching native table coefficient consumers',async t=>{
 const style='.table{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}';
 for(const[value,rule]of [['var(--ui-p-red)','primitive-reference'],['var(--ui-color-action)','token-category']]as const)for(const applied of [true,false]){
  const report=await scan(t,`@Directive({selector:'[columns]',host:{'[style.--local-columns]':${JSON.stringify(JSON.stringify(value))}}})class Columns{}@Component({selector:'app-table',imports:[Columns],template:${JSON.stringify(applied?'<table class="table" columns [style.--local-columns]="3"></table>':'<table class="table" [style.--local-columns]="3"></table><div columns></div>')},styles:[${JSON.stringify(style)}]})class Table{}`);
  assert.equal(report.diagnostics.some(d=>d.rule===rule&&d.source.includes('min-inline-size')),applied,JSON.stringify(report.diagnostics));
  if(applied)assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('min-inline-size')));
 }
});
test('scoped foreign styles and Sass control scopes never lend unrelated literal candidates',async t=>{
 const scoped=`@Component({selector:'app-unrelated',template:'',styles:[':host{--local-line:17px}']})class Unrelated{}`;
 assert.equal((await scan(t,divider+scoped)).diagnostics.filter(d=>d.severity==='error').length,0);
 const sass=await scan(t,divider,{'global.scss':'@mixin unused {app-divider{--local-line:17px}}'});
 assert.ok(sass.diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')));assert.equal(sass.diagnostics.filter(d=>d.severity==='error'&&d.source.includes('border-block-start')).length,0);
 const registered=await scan(t,divider,{'global.css':'@property --local-line{syntax:"*";inherits:false;initial-value:solid}'});
 assert.ok(registered.diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')));
 const expansion=await scan(t,divider,{'global.scss':'@include externalFactory();'});assert.ok(expansion.diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')));
});
