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
async function scan(t:TestContext,exposure:string,call="indent(external())",files:Record<string,string>={}){
 const root=await mkdtemp(resolve(tmpdir(),'ui-method-source-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);
 const source=`import{Component,input}from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify('<p [style.padding-inline-start]="'+call+'"></p>')}})class App{readonly external=input<number>();protected indent(level:number){if(typeof level!=='number'||!Number.isSafeInteger(level)||level<1||level>100)throw new Error();return 'calc(var(--ui-space-control-x) * '+(level-1)+')';}}${exposure}`;
 await mkdir(resolve(root,'app'));await writeFile(resolve(root,'app/app.ts'),source);
 for(const[name,content]of Object.entries(files))await writeFile(resolve(root,'app',name),content);
 return checkSources({root,config,policy:createSourcePolicy(config)});
}
async function check(t:TestContext,source:string,bad:boolean,call?:string){
 const report=await scan(t,source,call);
 assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),bad,source+'\n'+JSON.stringify(report.diagnostics));
 assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,bad?1:0,source+'\n'+JSON.stringify(report.diagnostics));
 assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'),source+' must retain Unknown');
}

test('const callable chains and named declarations contribute known method return candidates',async t=>{
 for(const value of ['17px','var(--ui-space-field)'])for(const setup of [
  `const replacement=()=> '${value}';const alias=replacement;`,
  `const replacement=function(){return '${value}';};const alias=replacement;`,
  `function replacement(){return '${value}';}const alias=replacement;`,
 ])await check(t,setup+'function replace(instance:App){(instance as any).indent=alias;}',value==='17px');
});

test('native Object.assign data properties retain known candidates and Unknown',async t=>{
 for(const value of ['17px','var(--ui-space-field)'])for(const entry of [
  `indent:()=> '${value}'`,
  `indent:function(){return '${value}';}`,
  'indent:replacement',
  'indent',
  `indent:()=> '17px',indent:replacement`,
 ])await check(t,`function replacement(){return '${value}';}const indent=replacement;function replace(instance:App){Object.assign(instance,{${entry}});}`,value==='17px');
 await check(t,"const replacement=()=> '17px';const instance=new App();const alias=instance;Object['assign'](alias,{indent:replacement});",true);
});

test('callable and receiver identity reject homonyms, casts and changed bindings',async t=>{
 for(const source of [
  "const replacement=()=> '17px';class Other{indent=()=> '0';}function replace(instance:Other){(instance as unknown as App).indent=replacement;}",
  "const replacement=()=> '17px';class Other{indent=()=> '0';}function replace(instance:Other){Object.assign(instance as unknown as App,{indent:replacement});}",
  "const replacement=()=> '17px';class Other{indent=()=> '0';}function replace(instance:App){instance=new Other() as any;Object.assign(instance,{indent:replacement});}",
  "const replacement=()=> '17px';class Other{indent=()=> '0';}const Constructor=Other as unknown as typeof App;Object.assign(new Constructor(),{indent:replacement});",
  "const replacement=()=> '17px';function replace(instance:App){const replacement=()=> 'var(--ui-space-field)';Object.assign(instance,{indent:replacement});}",
  "let replacement=()=> '17px';replacement=()=> 'var(--ui-space-field)';function replace(instance:App){instance.indent=replacement;}",
  "const replacement=()=> '17px';(replacement as any)=()=> 'var(--ui-space-field)';function replace(instance:App){instance.indent=replacement;}",
  "function replacement(){return '17px';}replacement=()=> 'var(--ui-space-field)';function replace(instance:App){Object.assign(instance,{indent:replacement});}",
  "const replacement=()=> '17px';const alias=replacement;(alias as any)=()=> 'var(--ui-space-field)';function replace(instance:App){Object.assign(instance,{indent:alias});}",
 ])await check(t,source,false);
});

test('shadowed, mutated or escaped Object.assign never synthesizes a replacement violation',async t=>{
 for(const prefix of [
  "const Object={assign(...args:any[]){return args[0];}};",
  "Object.assign=(...args:any[])=>args[0];",
  "(Object as any)['assign']=opaque();",
  "const native=Object;opaque(native);",
  "Object.defineProperty(Object,'assign',{value:opaque()});",
 ])await check(t,prefix+"const replacement=()=> '17px';function replace(instance:App){Object.assign(instance,{indent:replacement});}",false);
});

test('opaque factories, async/generator, source spreads and later overwrites remain unsupported',async t=>{
 for(const source of [
  "const replacement=externalFactory();function replace(instance:App){Object.assign(instance,{indent:replacement});}",
  "const replacement=async()=> '17px';function replace(instance:App){instance.indent=replacement as any;}",
  "function* replacement(){yield '17px';}function replace(instance:App){Object.assign(instance,{indent:replacement});}",
  "const replacement=()=> '17px';function replace(instance:App){Object.assign(instance,{indent:replacement,...opaque()});}",
  "const replacement=()=> '17px';function replace(instance:App){Object.assign(instance,{indent:replacement},opaque());}",
  "const replacement=()=> '17px';function replace(instance:App){Object.assign(instance,{get indent(){return replacement;}});}",
  "const replacement=()=> '17px';function replace(instance:App,key:string){Object.assign(instance,{indent:replacement,[key]:opaque()});}",
 ])await check(t,source,false);
});

test('named replacement functions erase this and bind only runtime positional arguments',async t=>{
 for(const bad of [false,true])for(const write of ['instance.indent=alias;','Object.assign(instance,{indent:alias});'])await check(t,
  `function replacement(this:App,first:string,second:string){return first;}const alias=replacement;function replace(instance:App){${write}}`,bad,`indent('${bad?'17px':'0'}','${bad?'0':'17px'}')`);
});

test('Object.assign never copies colon __proto__ setters but retains own shorthand data',async t=>{
 for(const [source,bad]of [
  ["function change(instance:App){Object.assign(instance,{__proto__:()=> '17px'});}",false],
  ["function change(instance:App){Object.assign(instance,{'__proto__':()=> '17px'});}",false],
  ["const __proto__=()=> '17px';function change(instance:App){Object.assign(instance,{__proto__});}",true],
 ]as[string,boolean][]){
  const root=await mkdtemp(resolve(tmpdir(),'ui-method-proto-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(resolve(root,'app'));
  await writeFile(resolve(root,'app/app.ts'),`import{Component}from'@angular/core';@Component({selector:'app-test',template:'<p [style.padding]="__proto__()"></p>'})class App{protected __proto__(){return '0';}}${source}throw new Error('Never execute application');`);
  const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);const report=await checkSources({root,config,policy:createSourcePolicy(config)});
  assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'),bad,JSON.stringify(report));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('callable sources reject definite TDZ reads and retain hoisted or later-executed closures',async t=>{
 for(const source of [
  "function replace(instance:App){(instance as any).indent=replacement;const replacement=()=> '17px';}",
  "function replace(instance:App){Object.assign(instance,{indent:replacement});const replacement=()=> '17px';}",
  "function replace(instance:App){const alias=replacement;const replacement=()=> '17px';(instance as any).indent=alias;}",
  "function replace(instance:App){class Static{static setup=((instance as any).indent=replacement);}const replacement=()=> '17px';}",
  "function replace(instance:App){class Static{static {Object.assign(instance,{indent:replacement});}}const replacement=()=> '17px';}",
 ])await check(t,source,false);
 for(const source of [
  "function replace(instance:App){(instance as any).indent=replacement;function replacement(){return '17px';}}",
  "function replace(instance:App){function later(){(instance as any).indent=replacement;}const replacement=()=> '17px';later();}",
  "function replace(instance:App){class Later{setup=((instance as any).indent=replacement);}const replacement=()=> '17px';new Later();}",
 ])await check(t,source,true);
});

test('re-exported callable aliases retain origin symbols and reject live binding mutation',async t=>{
 for(const changed of [false,true]){
  const report=await scan(t,"import{replacement as paint}from'./barrel';function replace(instance:App){(instance as any).indent=paint;}",undefined,{
   'source.ts':`export function paint(){return '17px';}${changed?"paint=()=> '0';":''}`,
   'barrel.ts':"export{paint as replacement}from'./source';",
  });
  assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),!changed,JSON.stringify(report));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('deferred instance field initialization can read later module constants without guessing static TDZ values',async t=>{
 for(const assign of [false,true]){
  const root=await mkdtemp(resolve(tmpdir(),'ui-method-field-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(resolve(root,'app'));
  await writeFile(resolve(root,'app/app.ts'),`import{Component}from'@angular/core';@Component({selector:'app-test',template:'<p [style.padding]="indent()"></p>'})class App{protected indent(){return '0';}setup=${assign?'Object.assign(this,{indent:replacement})':'((this as any).indent=replacement)'};}const replacement=()=> '17px';new App();throw new Error('Never execute application');`);
  const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);const report=await checkSources({root,config,policy:createSourcePolicy(config)});
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),JSON.stringify(report));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});

test('satisfies wrappers preserve callable and receiver rebinding exclusions',async t=>{
 for(const exposure of [
  "function replacement(){return '17px';}(replacement satisfies any)=()=> '0';function replace(instance:App){(instance as any).indent=replacement;}",
  "const replacement=()=> '17px';(replacement satisfies any)=()=> '0';function replace(instance:App){(instance as any).indent=replacement;}",
  "class Other{}function replace(instance:App){(instance satisfies any)=new Other() as any;Object.assign(instance,{indent:()=> '17px'});}",
  "class Other{}const Factory=App;(Factory satisfies any)=Other;const instance=new Factory();(instance as any).indent=()=> '17px';",
 ])await check(t,exposure,false);
 const guarded=await scan(t,"(Number.isSafeInteger satisfies any)=()=>true;");
 assert.ok(guarded.diagnostics.some(d=>d.rule==='unresolved'),'native mutation remains open');
 assert.ok(!guarded.diagnostics.some(d=>d.severity==='error'));
});
