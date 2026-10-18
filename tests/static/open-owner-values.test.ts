import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {test,type TestContext} from 'node:test';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {createSourcePolicy} from '../../src/check/policy.ts';
import {checkSources} from '../../src/check/scanner.ts';

const example=await readFile(new URL('../../examples/ui.config.example.yaml',import.meta.url),'utf8');
const guarded=`protected indent(level:number){if(typeof level!=='number'||!Number.isSafeInteger(level)||level<1||level>100)throw new Error();return 'calc(var(--ui-space-control-x) * '+(level-1)+')';}`;
async function scan(t:TestContext,body:string,exposure='',property='padding-inline-start',binding?:string){
 const root=await mkdtemp(resolve(tmpdir(),'ui-open-owner-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const configInput=parseConfig(example);configInput.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(configInput);
 await mkdir(resolve(root,'app'));await writeFile(resolve(root,'app/app.ts'),`import {Component,input,viewChild,inject} from '@angular/core';@Component({selector:'app-test',template:'<p ${binding??`[style.${property}]="indent(external())"`}></p>'})class App{readonly external=input<number>();${body}}${exposure}`);
 return checkSources({root,config,policy:createSourcePolicy(config)});
}
const exposures=[
 'function mutate(instance:App){opaque(instance);}',
 "@Component({selector:'app-parent',imports:[App],template:'<app-test />'})class Parent{child=viewChild(App);}",
 "@Component({selector:'app-parent',template:''})class Parent{child=inject(App);}",
 "function mutate(instance:App){(instance as any).indent=()=> 'var(--ui-space-field)';}",
 'const Constructor=App;opaque(new Constructor());',
];
test('exposed methods retain known invalid returns alongside the unknown replacement domain',async t=>{
 for(const exposure of exposures){
  const report=await scan(t,"protected indent(level:number){if(level)return '17px';return opaque();}",exposure);
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),JSON.stringify(report.diagnostics));
  assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('Angular and TypeScript class arrays retain complete returns from exposed methods',async t=>{
 for(const wrapped of [false,true])for(const arrayReturn of [false,true]){
  const value="level?'text-[aliceblue]':opaque()+'-'",body=`protected indent(level:number){return ${arrayReturn?'['+value+']':value};}`;
  const report=await scan(t,body,exposures[0],'',`[ngClass]="${wrapped?'[indent(external())]':'indent(external())'}"`);
  assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('aliceblue')),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const allowed=await scan(t,"protected indent(level:number){return [level?'p-control-x':opaque()+'-'];}",exposures[0],'','[ngClass]="[indent(external())]"');assert.equal(allowed.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(allowed.diagnostics));assert.ok(allowed.diagnostics.some(d=>d.rule==='unresolved'));
});
test('exposed methods preserve token namespace violations and all literal alternatives',async t=>{
 for(const [value,rule]of [['var(--ui-p-red)','primitive-reference'],['var(--ui-color-text)','token-category'],['var(--ui-space-missing)','unknown-token']]as const){
  const report=await scan(t,`protected indent(level:number){return level?'${value}':'var(--ui-space-field)';}`,exposures[0]);
  assert.ok(report.diagnostics.some(d=>d.rule===rule),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('a real bounded hierarchy body remains unknown for exposed owners and unsafe native guards',async t=>{
 assert.deepEqual((await scan(t,guarded)).diagnostics,[]);
 for(const exposure of [...exposures,'Number.isSafeInteger=()=>true;','const native=Number;opaque(native);']){
  const report=await scan(t,guarded,exposure);assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(report.diagnostics));
 }
});
test('method parameter reassignment, recursion and unsupported bodies never become closed',async t=>{
 for(const body of [
  "protected indent(level:number){level=opaque();return level?'17px':opaque();}",
  "protected indent(level:number){if(level)return '17px';return this.indent(level);}",
  "protected async indent(level:number){return 'var(--ui-space-field)';}",
  "protected *indent(level:number){yield 'var(--ui-space-field)';}",
 ]){
  const report=await scan(t,body,exposures[0]);assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
});
test('whole method returns retain their violations beside partial concatenations',async t=>{
 for(const value of ['aliceblue','rebeccapurple','px','17px']){
  const report=await scan(t,`protected indent(level:number){return level?'${value}':opaque()+'px';}`,exposures[0]);assert.ok(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes(value)),JSON.stringify(report.diagnostics));assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'));
 }
 const fragments=await scan(t,"protected indent(level:number){return level?'solid':'sol'+opaque();}",exposures[0],'border');assert.equal(fragments.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(fragments.diagnostics));assert.ok(fragments.diagnostics.some(d=>d.rule==='unresolved'));
});
