import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test,type TestContext} from 'node:test';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {createSourcePolicy} from '../../src/check/policy.ts';
import {checkSources} from '../../src/check/scanner.ts';

const repository=fileURLToPath(new URL('../../',import.meta.url));
const example=await readFile(resolve(repository,'examples/ui.config.example.yaml'),'utf8');
const original=`protected indent(level:number){if(typeof level!=='number'||!Number.isSafeInteger(level)||level<1||level>100)throw new Error();return 'calc(var(--ui-space-control-x) * '+(level-1)+')';}`;
async function scan(t:TestContext,exposure:string,body=original,call='indent(external())'){
 const root=await mkdtemp(resolve(tmpdir(),'ui-method-replacement-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);
 const source=`import{Component,input}from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify('<p [style.padding-inline-start]="'+call+'"></p>')}})class App{readonly external=input<number>();${body}}${exposure}`;
 await mkdir(resolve(root,'app'));await writeFile(resolve(root,'app/app.ts'),source);
 return checkSources({root,config,policy:createSourcePolicy(config)});
}

test('direct owner method replacement candidates retain forbidden literals and Unknown',async t=>{
 for(const exposure of [
  "function replace(instance:App){instance.indent=()=> '17px';}",
  "function replace(instance:App){(instance as any).indent=()=> '17px';}",
  "function replace(instance:App){const alias=instance;(alias as any)['indent']=function(){return '17px';};}",
 ]){
  const report=await scan(t,exposure);
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),JSON.stringify(report.diagnostics));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const own=await scan(t,'',original+"constructor(){(this as any).indent=()=> '17px';}");
 assert.ok(own.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),JSON.stringify(own.diagnostics));assert.ok(own.diagnostics.some(d=>d.rule==='unresolved'));
});

test('replacement functions preserve semantic-token violations and complete return alternatives',async t=>{
 for(const [value,rule]of [['var(--ui-p-red)','primitive-reference'],['var(--ui-color-text)','token-category'],['var(--ui-space-missing)','unknown-token']]as const){
  const report=await scan(t,`function replace(instance:App){(instance as any).indent=()=> '${value}';}`);
  assert.ok(report.diagnostics.some(d=>d.rule===rule),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const mixed=await scan(t,"function replace(instance:App){(instance as any).indent=level=>level?'aliceblue':opaque()+'px';}");
 assert.ok(mixed.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('aliceblue')),JSON.stringify(mixed.diagnostics));assert.ok(mixed.diagnostics.some(d=>d.rule==='unresolved'));
});

test('exact constructor receivers and const aliases retain candidates without closing Unknown',async t=>{
 for(const exposure of [
  "(new App() as any).indent=()=> '17px';",
  "const instance=new App();(instance as any).indent=()=> '17px';",
  "const Constructor=App;const instance=new Constructor();const alias=instance;(alias as any).indent=()=> '17px';",
 ]){
  const report=await scan(t,exposure);assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 for(const value of ['var(--ui-space-field)','var(--ui-p-red)']){
  const report=await scan(t,`const instance=new App();(instance as any).indent=()=> '${value}';`);
  assert.equal(report.diagnostics.some(d=>d.rule==='primitive-reference'),value==='var(--ui-p-red)',JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 for(const exposure of [
  "class Other{indent=()=> 'var(--ui-space-field)';}const instance=new Other();(instance as any).indent=()=> '17px';",
  "class Other{indent=()=> 'var(--ui-space-field)';}const instance=new (Other as unknown as typeof App)();(instance as any).indent=()=> '17px';",
  "class Other{indent=()=> 'var(--ui-space-field)';}const Constructor=Other as unknown as typeof App;const instance=new Constructor();(instance as any).indent=()=> '17px';",
  "class Other{indent=()=> 'var(--ui-space-field)';}App=Other as any;const instance=new App();(instance as any).indent=()=> '17px';",
 ]){
  const report=await scan(t,exposure);assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
 }
});

test('allowed and opaque replacements never close the method domain',async t=>{
 for(const replacement of ["()=> 'var(--ui-space-field)'","()=>opaque()","level=>level===1?'var(--ui-space-field)':opaque()","async()=> '17px'","function*(){yield '17px';}"]){
  const report=await scan(t,`function replace(instance:App){(instance as any).indent=${replacement};}`);
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('homonyms, forged receiver casts and numeric guard returns do not become CSS candidates',async t=>{
 for(const exposure of [
  "class Other{indent=()=> 'var(--ui-space-field)';}function replace(instance:Other){instance.indent=()=> '17px';}",
  "class Other{indent=()=> 'var(--ui-space-field)';}function replace(instance:Other){(instance as unknown as App).indent=()=> '17px';}",
  "class Other{indent=()=> 'var(--ui-space-field)';}function replace(instance:Other){const alias=instance as unknown as App;alias.indent=()=> '17px';}",
  "function replace(instance:any){(instance as App).indent=()=> '17px';}",
  "Number.isSafeInteger=()=> '17px' as any;",
 ]){
  const report=await scan(t,exposure);assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
 }
 const nested=await scan(t,'',original+"constructor(){function nested(this:{indent:()=>string}){this.indent=()=> '17px';}}");
 assert.equal(nested.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(nested.diagnostics));
});

test('unsupported mutation forms preserve Unknown without receiver or callable guesses',async t=>{
 for(const exposure of [
  "function replace(instance:App,key:string){(instance as any)[key]=()=> '17px';}",
  "function replace(instance:App){(instance as any).indent=externalFactory();}",
 ]){
  const report=await scan(t,exposure);assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
 }
});

test('rebound receiver parameters and constructor aliases never borrow the original owner type',async t=>{
 for(const exposure of [
  "class Other{indent=()=> '0';}function replace(instance:App){instance=new Other() as any;(instance as any).indent=()=> '17px';}",
  "class Other{indent=()=> '0';}function replace(instance:App){[instance]=[new Other() as any];const alias=instance;(alias as any).indent=()=> '17px';}",
  "class Other{indent=()=> '0';}function replace(instance:App){for(instance of [new Other() as any]){(instance as any).indent=()=> '17px';}}",
  "class Other{indent=()=> '0';}const instance=new App();(instance as any)=new Other();(instance as any).indent=()=> '17px';",
  "class Other{indent=()=> '0';}const Factory=App;(Factory as any)=Other;const instance=new Factory();(instance as any).indent=()=> '17px';",
 ]){
  const report=await scan(t,exposure);
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('type-only this parameters never shift runtime positional argument values',async t=>{
 for(const bad of [false,true]){
  const call=`indent('${bad?'17px':'0'}','${bad?'0':'17px'}')`;
  const replacement=await scan(t,"function replace(instance:App){(instance as any).indent=function(this:App,first:string,second:string){return first;};}",original,call);
  assert.equal(replacement.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),bad,JSON.stringify(replacement));
  assert.ok(replacement.diagnostics.some(d=>d.rule==='unresolved'));
  for(const [body,extra]of [
   ['protected indent(this:App,first:string,second:string){return first;}',''],
   ['protected indent(first:string,second:string){return read(first,second);}','function read(this:App,first:string,second:string){return first;}'],
  ]){
   const report=await scan(t,extra,body,call);
   assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),bad,JSON.stringify(report));
  }
 }
});
