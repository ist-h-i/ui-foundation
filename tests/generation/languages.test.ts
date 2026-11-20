import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {parseConfig} from '../../src/config.ts';
import {initProject,syncProject} from '../../src/sync.ts';
const repository=fileURLToPath(new URL('../../',import.meta.url));
const generatedModule=(root:string,file:string)=>pathToFileURL(resolve(root,'.ui/generated/angular',file)).href;
test('init defaults to English and explicitly supports Japanese without changing token values',async t=>{
 const configs=[];
 for(const language of [undefined,'ja'] as const){
  const root=await mkdtemp(resolve(tmpdir(),'ui-language-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await initProject({root,...(language?{language}:{})});
  const config=parseConfig(await readFile(resolve(root,'ui.config.yaml'),'utf8'));configs.push(config);
  assert.match(config.context.product,language?/申請/:/Application/);
  assert.equal(config.default_language,language??'en');
  await syncProject({root});
  const runtime=await import(generatedModule(root,'locale-model.ts'));
  const {resolveUiMessage}=await import(generatedModule(root,'stable-messages.ts'));
  assert.equal(runtime.defaultUiLocale.locale,language?'ja-JP':'en-US');
  assert.equal(resolveUiMessage({id:'uiFoundation.dialog.closeAction'},runtime.defaultUiLocale.locale),language?'閉じる':'Close');
  assert.equal(runtime.defaultUiLocale.timeZone,null);
  const skill=await readFile(resolve(root,'.agents/skills/project-ui/SKILL.md'),'utf8');
  assert.match(skill,/# Project UI development/);assert.match(skill,/references\/examples\/locale-adapter.ts/);
  for(const file of ['SKILL.en.md','SKILL.ja.md'])await assert.rejects(readFile(resolve(root,'.agents/skills/project-ui',file)),{code:'ENOENT'});
  assert.match(await readFile(resolve(root,'.agents/skills/project-ui/project-context.md'),'utf8'),/# Project UI configuration/);
  const context=await readFile(resolve(root,'.agents/skills/project-ui/project-context.md'),'utf8');
  assert.doesNotMatch(context.split('```json')[0], /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, 'AI instruction prose is English; app context in JSON keeps its own language');
  assert.ok(context.includes(config.context.product), 'app-authored context is preserved');
 }
 assert.deepEqual(configs[0].primitives,configs[1].primitives);
 assert.deepEqual(configs[0].semantic,configs[1].semantic);
 for(const id of Object.keys(configs[0].profiles))assert.deepEqual(configs[0].profiles[id].semantic,configs[1].profiles[id].semantic);
});
test('CLI rejects unsupported or misplaced language before creating configuration',async t=>{
 const root=await mkdtemp(resolve(tmpdir(),'ui-language-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const args of [['init','--language','fr'],['init','--language'],['sync','--language','en']]){
  assert.throws(()=>execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),resolve(repository,'src/cli.ts'),...args],{cwd:root,stdio:'pipe'}));
  await assert.rejects(readFile(resolve(root,'ui.config.yaml')),{code:'ENOENT'});
 }
 execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),resolve(repository,'src/cli.ts'),'init','--language','ja'],{cwd:root});
 assert.match(await readFile(resolve(root,'ui.config.yaml'),'utf8'),/申請管理/);
});

test('existing YAML without a language retains Japanese across sync and explicit changes leave tokens untouched',async t=>{
 const root=await mkdtemp(resolve(tmpdir(),'ui-legacy-language-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const {writeFile}=await import('node:fs/promises');
 const source=(await readFile(resolve(repository,'examples/ui.config.example.yaml'),'utf8')).replace(/\nchecks:\n[\s\S]*$/,'\n').replace(/\ndefault_language: ja\n/g,'\n');
 assert.equal(parseConfig(source).default_language,undefined);
 await writeFile(resolve(root,'ui.config.yaml'),source);await syncProject({root});
 const runtime=await import(generatedModule(root,'locale-model.ts'));
 const {resolveUiMessage}=await import(generatedModule(root,'stable-messages.ts'));
 assert.equal(runtime.defaultUiLocale.locale,'ja-JP');assert.equal(resolveUiMessage({id:'uiFoundation.dialog.closeAction'},runtime.defaultUiLocale.locale),'閉じる');
 const tokens=await readFile(resolve(root,'.ui/generated/tokens.css'));
 await writeFile(resolve(root,'ui.config.yaml'),source+'\ndefault_language: en\n');
 await syncProject({root});
 assert.match(await readFile(resolve(root,'.ui/generated/angular/locale-defaults.ts'),'utf8'),/"en"/);
 assert.deepEqual(await readFile(resolve(root,'.ui/generated/tokens.css')),tokens);
 const entry=generatedModule(root,'locale-model.ts'),messages=generatedModule(root,'stable-messages.ts');
 const state=JSON.parse(execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),'--input-type=module','-e',`import {defaultUiLocale} from ${JSON.stringify(entry)}; import {resolveUiMessage} from ${JSON.stringify(messages)}; console.log(JSON.stringify([defaultUiLocale.locale,resolveUiMessage({id:'uiFoundation.dialog.closeAction'},defaultUiLocale.locale)]));`],{cwd:root,encoding:'utf8'}));
 assert.deepEqual(state,['en-US','Close']);

});
