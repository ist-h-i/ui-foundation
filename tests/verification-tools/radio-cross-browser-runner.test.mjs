import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {parseCrossBrowserOptions} from '../../scripts/run-cross-browser.mjs';

const repository=fileURLToPath(new URL('../../',import.meta.url));

test('suite selection is explicit, preserves Playwright filters and rejects ambiguous input',()=>{
 assert.deepEqual(parseCrossBrowserOptions([]),{suite:'runtime',filters:[]});
 assert.deepEqual(parseCrossBrowserOptions(['--grep','native Tab','--suite=virtual-radio']),{suite:'virtual-radio',filters:['--grep','native Tab']});
 assert.deepEqual(parseCrossBrowserOptions(['--suite','runtime','--project=webkit']),{suite:'runtime',filters:['--project=webkit']});
 for(const args of [['--suite='],['--suite'],['--suite=other'],['--suite= virtual-radio'],['--suite=runtime','--suite=virtual-radio'],['--suite','virtual-radio','--suite=virtual-radio']]){
  assert.throws(()=>parseCrossBrowserOptions(args),/suite/i,JSON.stringify(args));
 }
 for(const filter of ['-c','--config=other.ts','--retries=1','--repeat-each=2','--pass-with-no-tests','--ignore-snapshots'])assert.throws(()=>parseCrossBrowserOptions([filter]),/overridden/);
});

function config(suite,platform){
 const source=`${platform?`Object.defineProperty(process,'platform',{value:${JSON.stringify(platform)}});`:''} const {default:config}=await import('./playwright.cross-browser.config.ts'); console.log(JSON.stringify(config));`;
 const env={...process.env,UI_CROSS_BROWSER_URL:'http://127.0.0.1:12345',UI_CROSS_BROWSER_ENGINES:'chromium,firefox,webkit'};
 delete env.UI_CROSS_BROWSER_SUITE;
 if(suite!==undefined)env.UI_CROSS_BROWSER_SUITE=suite;
 return spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',source],{cwd:repository,env,encoding:'utf8',timeout:30_000});
}

test('config keeps runtime default and scopes keyboard launcher to macOS radio WebKit',()=>{
 const runtime=config(undefined,'darwin');assert.equal(runtime.status,0,runtime.stderr);
 const original=JSON.parse(runtime.stdout);assert.equal(original.testDir,'./tests/cross-browser');assert.equal(original.testMatch,'runtime-cross-browser.spec.ts');assert.equal(original.timeout,45_000);
 assert.equal(original.projects.find(project=>project.name==='webkit').use.launchOptions,undefined);
 const radio=config('virtual-radio','darwin');assert.equal(radio.status,0,radio.stderr);
 const selected=JSON.parse(radio.stdout);assert.equal(selected.testDir,'./tests/ui');assert.deepEqual(selected.testMatch,['virtual-radio.spec.ts','virtual-sparse-tab.spec.ts','virtual-fast-tab.spec.ts']);assert.equal(selected.timeout,90_000);
 const launch=selected.projects.find(project=>project.name==='webkit').use.launchOptions;
 assert.equal(launch.executablePath,join(repository,'scripts/webkit-keyboard-launcher.sh'));assert.ok(launch.env.UI_RADIO_WEBKIT_EXECUTABLE.endsWith('/pw_run.sh'));assert.equal(launch.args,undefined);
 for(const name of ['chromium','firefox'])assert.deepEqual(selected.projects.find(project=>project.name===name),original.projects.find(project=>project.name===name));
 const linux=config('virtual-radio','linux');assert.equal(linux.status,0,linux.stderr);assert.equal(JSON.parse(linux.stdout).projects.find(project=>project.name==='webkit').use.launchOptions,undefined);
 for(const invalid of ['','other','runtime,virtual-radio',' virtual-radio']){const result=config(invalid);assert.notEqual(result.status,0);assert.match(result.stderr,/UI_CROSS_BROWSER_SUITE/);}
});

test('WebKit launcher preserves each argument and appends only process preference arguments',async t=>{
 const temporary=await mkdtemp(join(tmpdir(),'ui-radio-launcher-'));t.after(()=>rm(temporary,{recursive:true,force:true}));
 const capture=join(temporary,'argv.json'),executable=join(temporary,'capture executable');
 await writeFile(executable,`#!${process.execPath}\nrequire('node:fs').writeFileSync(process.env.CAPTURE,JSON.stringify(process.argv.slice(2)));\n`,{mode:0o755});
 const args=['--inspector-pipe','argument with spaces','literal$argument'];
 const result=spawnSync(join(repository,'scripts/webkit-keyboard-launcher.sh'),args,{env:{...process.env,UI_RADIO_WEBKIT_EXECUTABLE:executable,CAPTURE:capture},encoding:'utf8',timeout:10_000});
 assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(await readFile(capture,'utf8')),[...args,'-AppleKeyboardUIMode','2']);
 const env={...process.env};delete env.UI_RADIO_WEBKIT_EXECUTABLE;
 const missing=spawnSync(join(repository,'scripts/webkit-keyboard-launcher.sh'),[],{env,encoding:'utf8'});assert.notEqual(missing.status,0);
});
