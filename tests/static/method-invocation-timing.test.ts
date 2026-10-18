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

async function check(t:TestContext,setup:string,bad:boolean,script=false){
 const root=await mkdtemp(resolve(tmpdir(),'ui-method-timing-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(resolve(root,'app'));
 await writeFile(resolve(root,'app/app.ts'),`import{Component}from'@angular/core';@Component({selector:'app-test',template:'<p [style.padding]="indent()"></p>'})${script?'export ':''}class App{protected indent(){return '0';}}${script?'':setup}throw new Error('Never execute application');`);
 if(script)await writeFile(resolve(root,'app/script.ts'),setup);
 const input=parseConfig(example);input.checks={source_roots:['app'],approved_components:[],exceptions:[]};const config=resolveConfig(input);
 const report=await checkSources({root,config,policy:createSourcePolicy(config)});
 assert.equal(report.diagnostics.some(d=>d.rule==='literal-token'&&d.message.includes('17px')),bad,setup+'\n'+JSON.stringify(report.diagnostics));
 assert.equal(report.diagnostics.filter(d=>d.severity==='error').length,bad?1:0,setup+'\n'+JSON.stringify(report.diagnostics));
 assert.ok(report.diagnostics.some(d=>d.rule==='unresolved'),setup+' must retain Unknown');
}

test('synchronously invoked arrows exclude callable reads that must throw before initialization',async t=>{
 for(const write of ['(instance as any).indent=replacement;','Object.assign(instance,{indent:replacement});'])for(const immediate of [
  `(()=>{${write}})();`,
  `(function(){${write}})();`,
  `((()=>{${write}}) as ()=>void)();`,
  `((()=>{${write}}) satisfies ()=>void)();`,
  `(()=>{${write}})?.();`,
  `(()=>{(()=>{${write}})();})();`,
 ])await check(t,`function replace(instance:App){${immediate}const replacement=()=> '17px';}`,false);
});

test('immediate callable alias capture observes initialization order across wrapper frames',async t=>{
 for(const [setup,bad]of [
  ["function replace(instance:App){(()=>{const alias=replacement;(instance as any).indent=alias;})();const replacement=()=> '17px';}",false],
  ["function replace(instance:App){const replacement=()=> '17px';(()=>{const alias=replacement;(instance as any).indent=alias;})();}",true],
  ["function replace(instance:App){(()=>{const replacement=()=> '17px';(instance as any).indent=replacement;})();}",true],
  ["function replace(instance:App){(()=>{(instance as any).indent=replacement;})();function replacement(){return '17px';}}",true],
  ["function replace(instance:App){const replacement=(()=>{(instance as any).indent=replacement;return ()=> '17px';})();}",false],
 ]as[string,boolean][])await check(t,setup,bad);
});

test('unknown and deferred invocation timing never erases known callable candidates',async t=>{
 for(const wrapper of [
  "function later(){(()=>{(instance as any).indent=replacement;})();}opaque(later);",
  "opaque(()=>{(()=>{(instance as any).indent=replacement;})();});",
  "(async()=>{await opaque();(instance as any).indent=replacement;})();",
  "(function*(){(instance as any).indent=replacement;})();",
  "(()=>{(instance as any).indent=replacement;}).call(null);",
  "try{(function later(){opaque(later);(instance as any).indent=replacement;})();}catch{}",
  "try{(function(){opaque(arguments.callee);(instance as any).indent=replacement;})();}catch{}",
  "class Later{setup=(()=>{(instance as any).indent=replacement;})();}opaque(Later);",
 ])await check(t,`function replace(instance:App){${wrapper}const replacement=()=> '17px';}`,true);
});

test('immediate invocation timing preserves after-initialization and semantic-token controls',async t=>{
 for(const write of ['(instance as any).indent=replacement;','Object.assign(instance,{indent:replacement});']){
  await check(t,`function replace(instance:App){const replacement=()=> '17px';(()=>{${write}})();}`,true);
  await check(t,`function replace(instance:App){const replacement=()=> 'var(--ui-space-field)';(()=>{${write}})();}`,false);
 }
});

test('script callbacks with legacy caller reflection keep unknown future invocations open',async t=>{
 for(const wrapper of [
  "(()=>{opaque(captureCaller());(instance as any).indent=replacement;})();",
  "(function(){opaque(captureCaller());(instance as any).indent=replacement;})();",
 ])await check(t,`function captureCaller(){return captureCaller.caller;}function replace(instance:import('./app').App){try{${wrapper}}catch{}const replacement=()=> '17px';}`,true,true);
});
