import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
const repository=fileURLToPath(new URL('../../',import.meta.url));
const example=await readFile(resolve(repository,'examples/ui.config.example.yaml'),'utf8');
const fitDomain="fitValue() === 'cover' ? 'cover' : fitValue() === 'fill' ? 'fill' : fitValue() === 'none' ? 'none' : fitValue() === 'scale-down' ? 'scale-down' : 'contain'";
async function scan(t:TestContext,binding:string,exposure:string,property='object-fit'){
 const root=await mkdtemp(resolve(tmpdir(),'ui-final-style-domain-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);
 const template=`<p [style.${property}]="${binding}"></p><p [style.object-fit]="fitValue()"></p>`;
 const source=`import {Component,computed,input,viewChild,inject} from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)}})class App{readonly external=input<string>();protected readonly fitValue=computed(()=>this.external());}${exposure}`;
 const path=resolve(root,'app/app.ts');await mkdir(dirname(path),{recursive:true});await writeFile(path,source);
 return checkSources({root,config,policy:createSourcePolicy(config)});
}
const exposures=[
 'const Constructor=App;opaque(new Constructor());',
 "@Component({selector:'app-parent',imports:[App],template:'<app-test />'})class Parent{readonly child=viewChild(App);}",
 "@Component({selector:'app-parent',template:''})class Parent{readonly child=inject(App);}",
 "@Component({selector:'app-parent',template:''})class Parent{readonly child=inject(App);ngAfterViewInit(){(this.child as any).fitValue=()=> 'red';}}",
 "@Component({selector:'app-parent',imports:[App],template:'<app-test />'})class Parent{readonly child=viewChild(App);ngAfterViewInit(){const child=this.child();if(child)(child as any).fitValue=()=> 'red';}}",
 "type Instance=App;function replace(instance:Instance){(instance as any).fitValue=()=> 'red';}",
 "@Component({selector:'app-parent',template:'<app-test />'})class Parent{child!:App;ngAfterViewInit(){Object.assign(this.child,{fitValue:()=> 'red'});}}",
];
test('Image final binding closes its CSS domain while exposed owner sibling stays unresolved',async t=>{
 const source=await readFile(resolve(repository,'templates/angular/image-media.ts'),'utf8');
 const binding=/\[style\.object-fit\]="([^"]+)"/.exec(source)?.[1];assert.ok(binding);
 for(const exposure of exposures){
  const report=await scan(t,binding,exposure);const unknown=report.diagnostics.filter(d=>d.rule==='unresolved');
  assert.equal(unknown.length,1,JSON.stringify(report.diagnostics));assert.ok(unknown[0]!.source.includes('fitValue()'));
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0);
 }
});
test('closed inline fit alternatives remain finite despite replaced or variable computed values',async t=>{
 for(const exposure of ["function replace(instance:App){(instance as any).fitValue=(()=>{let calls=0;return ()=>++calls%2?'cover':'red';})();}"]){
  const report=await scan(t,fitDomain,exposure);assert.equal(report.diagnostics.filter(d=>d.rule==='unresolved').length,1);
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0);
 }
});
test('a dynamic final branch remains unresolved and known bad literal branches remain errors',async t=>{
 const exposure=exposures[0]!;
 const unknown=await scan(t,"fitValue() === 'cover' ? 'cover' : fitValue()",exposure);
 assert.equal(unknown.diagnostics.filter(d=>d.rule==='unresolved').length,2);
 for(const [property,binding,bad] of [
  ['gap',"fitValue() === 'cover' ? '17px' : 'var(--ui-space-field)'",'17px'],
  ['color',"fitValue() === 'cover' ? 'red' : 'var(--ui-color-text)'",'red'],
 ] as const){
  const report=await scan(t,binding,exposure,property);
  assert.ok(report.diagnostics.some(d=>d.severity==='error'&&d.message.includes(bad)),JSON.stringify(report.diagnostics));
  assert.equal(report.diagnostics.filter(d=>d.rule==='unresolved').length,1);
 }
});
test('final form and grid semantic choices are checked independently from exposed computed fields',async t=>{
 for(const [property,binding] of [
  ['row-gap',"fitValue() === 'none' ? '0' : fitValue() === 'compact' ? 'var(--ui-space-control-gap)' : fitValue() === 'wide' ? 'var(--ui-space-section)' : 'var(--ui-space-field)'"],
  ['column-gap',"fitValue() === 'none' ? '0' : fitValue() === 'compact' ? 'var(--ui-space-control-gap)' : fitValue() === 'wide' ? 'var(--ui-space-section)' : 'var(--ui-space-field)'"],
  ['gap',"fitValue() === 'none' ? '0' : fitValue() === 'compact' ? 'var(--ui-space-control-gap)' : fitValue() === 'wide' ? 'var(--ui-space-section)' : 'var(--ui-space-field)'"],
 ] as const){
  const report=await scan(t,binding,exposures[0]!,property);assert.equal(report.diagnostics.filter(d=>d.rule==='unresolved').length,1);
  assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,0);
 }
});
