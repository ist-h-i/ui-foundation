import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {access,cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {stringify} from 'yaml';
import {parseConfig,resolveConfig} from '../../src/config.ts';
import {createSourcePolicy} from '../../src/check/policy.ts';
const root=fileURLToPath(new URL('../../',import.meta.url));
const directory=resolve(root,'tests/fixtures/static-checks/warning-followup');
type Diagnostic={file:string;rule:string;line:number;column:number;source:string;severity:string;exception?:string};
type Exception={file:string;rule:'unresolved';source:string;line:number;column:number;reason:string};
type Approval={id:string;reason_ja:string;exception:Exception;diagnostic:Diagnostic;proof_sha256:Record<string,string>;static_value_status:string;universal_runtime_status:string};
const audit=JSON.parse(await readFile(resolve(directory,'geometry-audit.json'),'utf8'));
const approvals:Approval[]=audit.eligible;
const example=await readFile(resolve(root,'examples/ui.config.example.yaml'),'utf8');
const digest=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
const dependencies=new Map<string,string>();
for(const item of approvals)for(const[file,hash]of Object.entries(item.proof_sha256)){assert.ok(!dependencies.has(file)||dependencies.get(file)===hash);dependencies.set(file,hash);}
async function validateDependencies(directory:string){for(const[file,hash]of dependencies)assert.equal(digest(await readFile(resolve(directory,file))),hash,`${file}: audited producer/helper changed`);}
const matches=(d:Diagnostic,e:Exception)=>d.file===e.file&&d.rule===e.rule&&d.line===e.line&&d.column===e.column&&d.source.includes(e.source);

test('only the fourteen audited geometry purposes are configured, retaining Unknown and exact sites',async()=>{
 const config=parseConfig(example);assert.equal(approvals.length,14);assert.equal(new Set(approvals.map(x=>x.id)).size,14);
 const baseline=JSON.parse(await readFile(resolve(root,audit.source_report),'utf8'));
 assert.equal(digest(await readFile(resolve(root,audit.source_report))),audit.source_report_sha256);
 for(const item of approvals){
  assert.equal(item.static_value_status,'Unknown');assert.equal(item.universal_runtime_status,'Unknown');assert.equal(item.exception.reason,item.reason_ja);
  assert.equal(config.checks!.exceptions.filter(e=>e.file===item.exception.file&&e.rule===item.exception.rule&&e.source===item.exception.source&&e.line===item.exception.line&&e.column===item.exception.column&&e.reason===item.exception.reason).length,1,item.id);
  assert.equal(baseline.source.diagnostics.filter((d:Diagnostic)=>matches(d,item.exception)&&d.severity==='warning').length,1,item.id);
 }
 for(const item of audit.rejected)assert.ok(!config.checks!.exceptions.some(e=>e.reason.startsWith(`[${item.id}] `)));
 assert.ok(!config.checks!.exceptions.some(e=>e.file==='templates/angular/anchor-navigation.ts'&&e.rule==='unresolved'&&e.source==="nav{max-block-size:calc(100dvh - var(--ui-anchor-offset))}"),'appearance alias remains unapproved');
 await validateDependencies(root);
});

test('geometry dependency validator rejects drift in all eleven actual owner/helper files',async t=>{
 const fixture=await mkdtemp(resolve(tmpdir(),'ui-geometry-proof-'));t.after(()=>rm(fixture,{recursive:true,force:true}));assert.equal(dependencies.size,11);
 for(const file of dependencies.keys()){await mkdir(dirname(resolve(fixture,file)),{recursive:true});await cp(resolve(root,file),resolve(fixture,file));}
 await validateDependencies(fixture);
 for(const file of dependencies.keys()){
  const target=resolve(fixture,file),old=await readFile(target),changed=Buffer.from(old);changed[0]=changed[0]===32?33:32;
  await writeFile(target,changed);await assert.rejects(validateDependencies(fixture),/audited producer\/helper changed/);await writeFile(target,old);
 }
});

test('copied CLI scopes every geometry approval by file, rule, source and exact position',async t=>{
 const fixture=await mkdtemp(resolve(tmpdir(),'ui-geometry-consumer-'));t.after(()=>rm(fixture,{recursive:true,force:true}));
 await mkdir(resolve(fixture,'foundation'));await cp(resolve(root,'.ui/generated/check-ui.cjs'),resolve(fixture,'foundation/check-ui.cjs'));await cp(resolve(root,'.ui/generated/checker-lib'),resolve(fixture,'foundation/checker-lib'),{recursive:true});
 for(const file of dependencies.keys()){await mkdir(dirname(resolve(fixture,file)),{recursive:true});await cp(resolve(root,file),resolve(fixture,file));}
 await writeFile(resolve(fixture,'templates/never-execute.ts'),`throw new Error('Checker must never execute consumer code');`);
 const config=parseConfig(example);config.output='foundation';
 config.checks!.source_roots=['templates'];delete config.checks!.tsconfig;
 // Declaration-only consumer fixture metadata supplies type/selector identity, with no runtime imports or node_modules.
 await writeFile(resolve(fixture,'templates/angular/core.d.ts'),`declare module '@angular/core'{export declare class ElementRef<T=any>{nativeElement:T;}export declare function inject<T>(token:any):T;}`);
 for(const[file,exportName,selector]of[['icon.ts','Icon','ui-icon'],['display.ts','ShortcutHint','ui-shortcut-hint'],['form-field.ts','FormField','ui-form-field']])await writeFile(resolve(fixture,'templates/angular',file!),`import{Component}from'@angular/core';@Component({selector:'${selector}',template:''})export class ${exportName}{}`);
 const configuredExceptions=config.checks!.exceptions.filter(e=>dependencies.has(e.file));
 config.checks!.exceptions=[];
 const save=async()=>{await writeFile(resolve(fixture,'ui.config.yaml'),stringify(config));await writeFile(resolve(fixture,'foundation/policy.json'),JSON.stringify({source_policy:createSourcePolicy(resolveConfig(config))}));};
 const run=()=>{const result=spawnSync(process.execPath,['foundation/check-ui.cjs','--config','ui.config.yaml','--format','json'],{cwd:fixture,encoding:'utf8',timeout:60_000,env:{...process.env,NODE_PATH:''}});assert.equal(result.error,undefined);return{result,report:JSON.parse(result.stdout)};};
 await assert.rejects(access(resolve(fixture,'node_modules')));
 await save();const uncovered=run();
 const acceptedExceptions=configuredExceptions.filter(e=>uncovered.report.diagnostics.some((d:Diagnostic)=>d.file===e.file&&d.rule===e.rule&&d.source.includes(e.source)&&(e.line===undefined||d.line===e.line)&&(e.column===undefined||d.column===e.column)));
 config.checks!.exceptions=acceptedExceptions;await save();const accepted=run();assert.equal(accepted.result.status,0,accepted.result.stdout+accepted.result.stderr);
 for(const item of approvals)assert.equal(accepted.report.exceptions.filter((d:Diagnostic)=>matches(d,item.exception)&&d.exception===item.exception.reason).length,1,item.id);
 // Exercise each field for all fourteen sites in five CLI scans; assert every original warning and stale matcher individually.
 for(const field of ['file','rule','source','line','column'] as const){
  const changed=approvals.map(item=>{const e=item.exception;return{...e,...(field==='file'?{file:'templates/wrong-file.ts'}:field==='rule'?{rule:'literal-token'}:field==='source'?{source:e.source+' /* stale */'}:field==='line'?{line:e.line+1}:{column:e.column+1})};});
  config.checks!.exceptions=acceptedExceptions.map(e=>changed.find(x=>x.reason===e.reason)??e);await save();
  const rejected=run();assert.equal(rejected.result.status,1,rejected.result.stdout+rejected.result.stderr);
  for(const item of approvals){
   const matcher=changed.find(x=>x.reason===item.exception.reason)!;
   assert.ok(rejected.report.diagnostics.some((d:Diagnostic)=>d.rule==='exception-error'&&d.file===matcher.file&&d.source===matcher.source),`${item.id}: stale ${field}`);
   assert.ok(rejected.report.diagnostics.some((d:Diagnostic)=>matches(d,item.exception)&&d.severity==='warning'),`${item.id}: original warning remains after ${field} mismatch`);
  }
 }
 config.checks!.exceptions=acceptedExceptions;await save();
 // Identical source in another file is never covered by the original file's approvals.
 await cp(resolve(fixture,'templates/angular/anchor-navigation.ts'),resolve(fixture,'templates/same-source.ts'));
 const sibling=run();assert.equal(sibling.report.exceptions.length,accepted.report.exceptions.length,'sibling may not reuse the original file approvals');
 for(const item of approvals.filter(x=>x.exception.file==='templates/angular/anchor-navigation.ts'))assert.ok(sibling.report.diagnostics.some((d:Diagnostic)=>d.file==='templates/same-source.ts'&&d.source.includes(item.exception.source)&&d.rule==='unresolved'));
 await rm(resolve(fixture,'templates/same-source.ts'));
 const literalTarget=resolve(fixture,approvals[0]!.exception.file),literalOriginal=await readFile(literalTarget,'utf8');
 await writeFile(literalTarget,literalOriginal+`\ndocument.body.style.padding='13px';`);
 const literal=run();assert.equal(literal.result.status,1,literal.result.stdout+literal.result.stderr);assert.ok(literal.report.diagnostics.some((d:Diagnostic)=>d.rule==='literal-token'&&d.file===approvals[0]!.exception.file));
 assert.equal(literal.report.exceptions.length,accepted.report.exceptions.length);
 // Removing actual source makes its exact approval stale, even if a sibling retains identical text.
 const target=resolve(fixture,approvals[0]!.exception.file);await cp(target,resolve(fixture,'templates/same-source.ts'));await rm(target);
 const stale=run();assert.equal(stale.result.status,1);assert.ok(stale.report.diagnostics.some((d:Diagnostic)=>d.rule==='exception-error'));
});
