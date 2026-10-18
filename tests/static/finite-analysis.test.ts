import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
const repository = fileURLToPath(new URL('../../', import.meta.url));
const example = await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8');
async function scan(t: TestContext, source: string, helper = '') {
 const root=await mkdtemp(resolve(tmpdir(),'ui-finite-')); t.after(()=>rm(root,{recursive:true,force:true}));
 const input=parseConfig(example); input.checks={source_roots:['app'],approved_components:[],exceptions:[]}; const config=resolveConfig(input);
 for(const [name,text] of Object.entries({'app/app.ts':source,...(helper?{'app/helpers.ts':helper}:{})})){await mkdir(dirname(resolve(root,name)),{recursive:true});await writeFile(resolve(root,name),text);}
 return checkSources({root,config,policy:createSourcePolicy(config)});
}
const component = (body: string, bindings='[style.gap]="value()"')=>`import {Component,computed,input} from '@angular/core'; import {space,keyword} from './helpers'; @Component({selector:'app-test',template:'<p ${bindings}></p>'}) class App {readonly external=input<string>();${body}}`;
const helpers = `const spaces={compact:'var(--ui-space-control-gap)',normal:'var(--ui-space-field)'} as const;
export const space=(value:unknown)=>{if(typeof value!=='string'||!Object.hasOwn(spaces,value))throw new Error('invalid');return spaces[value as keyof typeof spaces];};
export function keyword(value:unknown,allowed:readonly string[]){if(typeof value!=='string'||!allowed.includes(value))throw new Error('invalid');return value;}`;
test('guarded imported helpers and readonly computed blocks resolve actual finite return values',async t=>{
 const report=await scan(t,component(`readonly value=computed(()=>space(this.external()));readonly align=computed(()=>keyword(this.external(),['start','center','end'] as const));readonly fit=computed(()=>{const value=this.external();if(!['contain','cover','fill','none','scale-down'].includes(value!))throw new Error('invalid');return value;});`,'[style.gap]="value()" [style.text-align]="align()" [style.object-fit]="fit()"'),helpers);
 assert.deepEqual(report.diagnostics,[]);
});
test('finite computed lookup and concatenation preserve semantic token outputs',async t=>{
 const report=await scan(t,component(`readonly tone=computed(()=>keyword(this.external(),['neutral','muted']));readonly value=computed(()=>'var(--ui-color-'+({neutral:'text',muted:'muted'}[this.tone()])+')');`,'[style.color]="value()"'),helpers);
 assert.deepEqual(report.diagnostics,[]);
});
test('a known violating return branch remains visible beside unresolved returns',async t=>{
 const report=await scan(t,component(`readonly value=computed(()=>{if(this.external())return 'red';return opaque();});`,'[style.color]="value()"'),helpers);
 assert.ok(report.diagnostics.some(d=>d.severity==='error'&&d.message.includes('red'))); assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
});
test('helper names, type annotations, unguarded input and nonthrowing guards do not certify outputs',async t=>{
 for(const helper of [`export const space=(value:'normal')=>value;`, `export const space=(value:unknown)=>{if(!['var(--ui-space-field)'].includes(value as string))console.log('bad');return value;}`,`export const space=(value:unknown)=>external(value);`]){
 const report=await scan(t,component('readonly value=computed(()=>space(this.external()));'),helper); assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('mutation and escaping finite domains remain unconfirmed and bad branches are inspected',async t=>{
 for(const helper of [`const values=['var(--ui-space-field)'];values.push(getValue());export const space=(value:unknown)=>{if(!values.includes(value as string))throw new Error();return value;}`,`const values=['var(--ui-space-field)'];external(values);export const space=(value:unknown)=>{if(!values.includes(value as string))throw new Error();return value;}`,`export const space=(value:unknown)=>{if(!['var(--ui-space-field)'].includes(value as string))throw new Error();value=getValue();return value;}`]){
 const report=await scan(t,component('readonly value=computed(()=>space(this.external()));'),helper); assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const bad=await scan(t,component('readonly value=computed(()=>space(this.external()));'),'export const space=(value:unknown)=>{if(!["var(--ui-space-field)","17px"].includes(value as string))throw new Error();return value;}'); assert.ok(bad.diagnostics.some(d=>d.severity==='error'&&d.message.includes('17px')));
});
test('bounded safe integer method guards resolve token coefficients without trusting number types',async t=>{
 const method=`protected indent(level:number){if(typeof level!=='number'||!Number.isSafeInteger(level)||level<1||level>100)throw new Error('invalid');return 'calc(var(--ui-space-control-x) * '+(level-1)+')';}`;
 const report=await scan(t,component(method,'[style.padding-inline-start]="indent(external())"'),helpers); assert.deepEqual(report.diagnostics,[]);
 for(const body of [method.replace('!Number.isSafeInteger(level)||',''),method.replace('||level>100',''),method.replace("return 'calc", "level=opaque();return 'calc")]){
  const result=await scan(t,component(body,'[style.padding-inline-start]="indent(external())"'),helpers); assert.ok(result.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('explicit native guard replacement, domain method overrides and cross-file helper writes remain unknown',async t=>{
 for(const mutation of [`Object.hasOwn=()=>true;`,`const alias=Object;alias.hasOwn=()=>true;`,`Array.prototype.includes=()=>true;`,`Object.defineProperty(Array.prototype,'includes',{value:()=>true});`,`Object.getPrototypeOf([]).includes=()=>true;`,`Object.defineProperty(Object.getPrototypeOf([]),'includes',{value:()=>true});`]){
  const report=await scan(t,component('readonly value=computed(()=>space(this.external()));')+mutation,helpers);
  // Array changes affect literal membership; Object changes affect own-key guards.
  const arrayMutation=mutation.includes('Array')||mutation.includes('getPrototypeOf');
  const membership=arrayMutation?await scan(t,component("readonly value=computed(()=>keyword(this.external(),['var(--ui-space-field)']));")+mutation,helpers):report;
  assert.ok(membership.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const result=await scan(t,component('readonly value=computed(()=>space(this.external()));')+`space=()=>opaque();`,helpers); assert.ok(result.diagnostics.some(d=>d.rule==='unresolved'));
 const override=await scan(t,component('readonly value=computed(()=>space(this.external()));'),`const values=['var(--ui-space-field)']; values.includes=()=>true;export const space=(value:unknown)=>{if(!values.includes(value as string))throw new Error();return value;}`); assert.ok(override.diagnostics.some(d=>d.rule==='unresolved'));
});
test('an allowed-array parameter escaped from a const initializer cannot certify later membership',async t=>{
 const report=await scan(t,component("readonly value=computed(()=>space(this.external(),['var(--ui-space-field)']));"),`export const space=(value:unknown,allowed:string[])=>{const unused=external(allowed);if(!allowed.includes(value as string))throw new Error();return value;}`);
 assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
});
test('assignments and returns inside unsupported control flow keep known bad literals',async t=>{
 for(const body of [`if(!['var(--ui-color-text)'].includes(value as string))throw new Error();value='red';return value;`,`while(external()){return 'red';}return value;`]){
  const result=await scan(t,component('readonly value=computed(()=>space(this.external()));','[style.color]="value()"'),`export const space=(value:unknown)=>{${body}}`);
  assert.ok(result.diagnostics.some(d=>d.rule==='unresolved')); assert.ok(result.diagnostics.some(d=>d.severity==='error'&&d.message.includes('red')));
 }
});

test('mixed dynamic fragments retain the precise fixed literal for narrow exceptions',async t=>{
 const report=await scan(t,component(`readonly value=computed(()=>{const v=this.external();if(typeof v==='number')return 'min(100%, '+v+'px)';return '100%';});`,'[style.max-inline-size]="value()"'),helpers);
 assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('100%')&&d.source.includes('100%')));
 assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
});

test('hasOwn cannot narrow coercible object keys without a primitive string guard',async t=>{
 const report=await scan(t,component('readonly value=computed(()=>space(this.external()));'),`const slots={'var(--ui-space-field)':true};export function space(value:unknown){if(!Object.hasOwn(slots,value as PropertyKey))throw new Error();return value;}`);
 assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
});
test('reflective array prototype mutation invalidates membership and native Number callback use stays closed',async t=>{
 const positive=component(`readonly value=computed(()=>{const v=this.external();if(!Number.isSafeInteger(v)||v<1||v>3)throw new Error();return 'calc(var(--ui-space-field) * '+v+')';});`);
 assert.deepEqual((await scan(t,positive+`const numbers=['1','2'].map(Number);`,helpers)).diagnostics,[]);
 for(const mutation of [`Object.assign(Object.getPrototypeOf([]),{includes:()=>true});`,`Object.assign(Object['getPrototypeOf']([]),{includes:()=>true});`,`const key='getPrototypeOf';Object.assign(Object[key]([]),{includes:()=>true});`,`const proto=Object.getPrototypeOf;Object.assign(proto([]),{includes:()=>true});`,`const {getPrototypeOf}=Object;Object.assign(getPrototypeOf([]),{includes:()=>true});`,`const O=Object;O.assign(O.getPrototypeOf([]),{includes:()=>true});`,`const {__proto__:proto}=[];proto.includes=()=>true;`,`const key=['__proto__'][0];Object.assign(([] as any)[key],{includes:()=>true});`,`const key=opaque();Object.assign(([] as any)[key],{includes:()=>true});`,`const receiver=[];const key=opaque();Object.assign(receiver[key],{includes:()=>true});`,`const key=['__proto__'][0];Object.assign((new Array() as any)[key],{includes:()=>true});`,`const key=opaque();Object.assign((Array.of(1) as any)[key],{includes:()=>true});`,`const R=(globalThis as any).Reflect;Object.assign(R.getPrototypeOf([]),{includes:()=>true});`,`Function('Array.prototype.includes=()=>true')();`,`(()=>{}).constructor('Array.prototype.includes=()=>true')();`,`const a=Object.getPrototypeOf([]);Object.defineProperties(a,{includes:{value:()=>true}});`,`[].constructor.prototype.includes=()=>true;`]){
  const report=await scan(t,component(`readonly value=computed(()=>keyword(this.external(),['var(--ui-space-field)']));`)+mutation,helpers);assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 for(const escape of [`external(Number);`,`const xs=['1'];xs.map=external();xs.map(Number);`])assert.ok((await scan(t,positive+escape,helpers)).diagnostics.some(d=>d.rule==='unresolved'));
});

test('arithmetic and concatenation never drop boolean, null or unsupported operand branches',async t=>{
 for(const expression of [`((this.external()?0:true) as any)*17`,`((this.external()?0:true) as any)+16`,`(this.external()?null:true) as any * 17`]){
  const report=await scan(t,component(`readonly value=computed(()=>${expression});`,'[style.gap.px]="value()"'),helpers);
  assert.ok(report.diagnostics.some(d=>d.severity==='error'),expression);
 }
 const unsupported=await scan(t,component(`readonly value=computed(()=>((this.external()?0:{}) as any)*17);`,'[style.gap.px]="value()"'),helpers);
 assert.ok(unsupported.diagnostics.some(d=>d.rule==='unresolved'));
 const concat=await scan(t,component(`readonly value=computed(()=>'p-'+(this.external()?0:true));`,'[attr.class]="value()"'),helpers);
 assert.ok(concat.diagnostics.some(d=>d.severity==='error'));
});

test('unrelated owned class fields do not replace Array intrinsics',async t=>{
 const report=await scan(t,component(`readonly value=computed(()=>keyword(this.external(),['var(--ui-space-field)']));`)+`class View{private map:null|object=null;clear(){this.map=null;}}`,helpers);assert.deepEqual(report.diagnostics,[]);
});


test('cast owner writes and externally constructed instances cannot certify finite computed returns',async t=>{
 const declaration='readonly value=computed(()=>space(this.external()));';
 for(const source of [
  component("constructor(){(this as any).value=()=> 'red';}"+declaration,'[style.color]="value()"'),
  component("constructor(){(this as {value:()=>string}).value=()=> 'red';}"+declaration,'[style.color]="value()"'),
  component(declaration)+"const Constructor=App;opaque(new Constructor());",
  component(declaration)+"function replace(instance:App){Object.assign(instance,{value:()=> 'red'});}",
  component(declaration).replace('{Component,computed,input}', '{Component,computed,input,ViewChild}')+"@Component({selector:'app-parent',imports:[App],template:'<app-test />'})class Parent{@ViewChild(App) child:any;ngAfterViewInit(){Object.assign(this.child,{value:()=> 'red'});}}",

  component(declaration)+"@Component({selector:'app-parent',template:'<app-test />'})class Parent{child!:App;ngAfterViewInit(){Object.assign(this.child,{value:()=> 'red'});}}",

 ])assert.ok((await scan(t,source,helpers)).diagnostics.some(d=>d.rule==='unresolved'));
});


const indexedKeyword = `export function keyword(value:unknown,allowed:readonly string[]){if(typeof value!=='string')throw new Error();for(let index=0;index<allowed.length;index++){const candidate=allowed[index];if(candidate===value)return candidate;}throw new Error();}`;
test('bounded indexed strict search resolves actual finite returns without Array prototype trust',async t=>{
 const source=component("readonly value=computed(()=>keyword(this.external(),['start','center','end']));",'[style.text-align]="value()"')+'Array.prototype.includes=()=>true;';
 assert.deepEqual((await scan(t,source,indexedKeyword)).diagnostics,[]);
 assert.deepEqual((await scan(t,source,indexedKeyword.replaceAll('throw new Error();',"throw new Error('must be '+allowed.join(', '));"))).diagnostics,[], 'uncaught error formatting has no normal return');
 const colors=component("readonly value=computed(()=>keyword('var(--ui-color-text)',['var(--ui-color-text)','red']));",'[style.color]="value()"');
 assert.deepEqual((await scan(t,colors,indexedKeyword)).diagnostics,[],'known input filters nonmatching candidate values');
});
test('bounded search retains bad candidate values and rejects unclosed or changed loop semantics',async t=>{
 const source=component("readonly value=computed(()=>keyword(this.external(),['var(--ui-space-field)','17px']));");
 assert.ok((await scan(t,source,indexedKeyword)).diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')));
 for(const helper of [
  indexedKeyword.replace('index=0','index=1'),indexedKeyword.replace('index<allowed.length','index<=allowed.length'),
  indexedKeyword.replace('index++','index+=2'),indexedKeyword.replace('candidate===value','candidate==value'),
  indexedKeyword.replace('return candidate','return value'),indexedKeyword.replace('const candidate','let candidate'),
  indexedKeyword.replace('const candidate=','opaque(allowed);const candidate='),
  indexedKeyword.replace('if(candidate===value)','if(candidate!==value)'),
  indexedKeyword.replace('for(let index','opaque(allowed);for(let index'),
  indexedKeyword.replace('for(let index',"try{throw opaque(allowed);}catch{}for(let index"),
  indexedKeyword.replace('allowed[index]','other[index]'),
  indexedKeyword.replace('return candidate',"return '17px'"),
 ])assert.ok((await scan(t,source,helper)).diagnostics.some(d=>d.rule==='unresolved'),helper);
 const unknown=component('readonly value=computed(()=>keyword(this.external(),opaque()));');
 assert.ok((await scan(t,unknown,indexedKeyword)).diagnostics.some(d=>d.rule==='unresolved'));
 const oversized=component('readonly value=computed(()=>keyword(this.external(),'+JSON.stringify(Array.from({length:33},()=> 'var(--ui-space-field)'))+'));');
 assert.ok((await scan(t,oversized,indexedKeyword)).diagnostics.some(d=>d.rule==='unresolved'));
});
