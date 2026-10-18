import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { parseConfig } from '../../src/config.ts';
import { renderCheckerBundle } from '../../src/check/bundle.ts';
import { syncProject } from '../../src/sync.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const example = await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8');

async function consumer(t: TestContext, source: string) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-static-portable-'));
  const producer = await mkdtemp(resolve(tmpdir(), 'ui-static-producer-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.after(() => rm(producer, { recursive: true, force: true }));
  const config = parseConfig(example);
  config.output = 'foundation';
  config.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  await mkdir(resolve(root, 'app'));
  await writeFile(resolve(root, 'app/app.ts'), source);
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  await writeFile(resolve(producer, 'ui.config.yaml'), stringify(config));
  await syncProject({ root: producer });
  await cp(resolve(producer, 'foundation'), resolve(root, 'foundation'), { recursive: true });
  const run = () => spawnSync(process.execPath, ['foundation/check-ui.cjs', '--config', 'ui.config.yaml', '--format', 'json'], { cwd: root, encoding: 'utf8', timeout: 60_000, env: { ...process.env, NODE_PATH: '' } });
  return { root, config, run };
}

test('bundled checker is deterministic', async () => {
  const first = await renderCheckerBundle();
  assert.equal(await renderCheckerBundle(), first);
  assert.ok(first.length > 1000);
});

test('copied CLI resolves finite computed/shorthand/local aliases and keeps mutable values unconfirmed', async t => {
  const source = `import {Component,computed,input} from '@angular/core';
const styles=':host{--local-ink:var(--ui-color-text);color:var(--local-ink)}';
@Component({selector:'app-test',styles,template:'<p [style.color]="ink()" [class.local]="mode()"></p>'})
class App{readonly mode=input(false);readonly ink=computed(()=>this.mode()?'var(--ui-color-text)':'var(--ui-color-muted)');}
class Attributes{private readonly owned=new Map<string,string>();private apply(name:string){document.body.setAttribute(name,'ja');this.owned.set(name,'ja');}paint(){this.apply('lang');}restore(){for(const [name,value]of this.owned)document.body.setAttribute(name,value);}}
throw new Error('Do not execute the application');`;
  const { root, run } = await consumer(t, source);
  const allowed = run();
  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  assert.deepEqual(JSON.parse(allowed.stdout).diagnostics, []);
  await assert.rejects(access(resolve(root, 'node_modules')));
  await writeFile(resolve(root, 'app/app.ts'), source + `\nlet color='var(--ui-color-text)';color='red';document.body.style.color=color;`);
  const changed = run();
  assert.equal(changed.status, 1, changed.stdout + changed.stderr);
  const report = JSON.parse(changed.stdout);
  assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'literal-token'));
  assert.ok(report.diagnostics.some((d: { severity: string }) => d.severity === 'warning'));
});

test('copied CLI preserves runtime barriers and inspects hidden alias overrides', async t => {
  const { root, run } = await consumer(t, 'export {};');
  const cases = [
    { source: `import {Component,HostBinding} from '@angular/core';@Component({selector:'app-test',template:'',styles:[':host{--gap:var(--ui-space-page);padding:var(--gap)}']})class App{@HostBinding('style.--gap') readonly gap='12px'}`, fail: true },
    { source: `import {Component} from '@angular/core';@Component({selector:'app-test',template:'',styles:['.one{--gap:var(--ui-space-page);padding:var(--gap)}.one.active{--gap:12px}']})class App{}`, fail: true },
    { source: `import {Component} from '@angular/core';@Component({selector:'app-test',template:'',styles:['.parent .one{--gap:var(--ui-space-page)}.one{padding:var(--gap)}']})class App{}`, fail: false },
    { source: `import {Component,computed,Input} from '@angular/core';@Component({selector:'app-test',template:'<p [style.color]="ink()"></p>'})class App{@Input() readonly ink=computed(()=> 'var(--ui-color-text)')}`, fail: false },
    { source: `const theme={nested:{color:'var(--ui-color-text)'}};theme.nested.color='red';document.body.style.color=theme.nested.color;`, fail: false },
    { source: `class App{private readonly keys=new Map<string,string>();paint(){this.keys.set('lang','ja').set('style','color:red');}restore(){for(const [name,value]of this.keys)document.body.setAttribute(name,value)}}`, fail: false },
    { source: `const theme={color:'var(--ui-color-text)'};({color:theme.color}={color:'red'});document.body.style.color=theme.color;`, fail: false },
    { source: `import {Component,computed} from '@angular/core';@Component({selector:'app-test',template:'<p [style.color]="ink()"></p>'})class App{readonly ink=computed(()=> 'var(--ui-color-text)');constructor(){Object.assign(this,{ink:()=> 'red'})}}`, fail: false },
    { source: `import {Component} from '@angular/core';@Component({selector:'app-test',template:'',styles:['.one{--gap:var(--ui-space-page);padding:var(--gap)}:is(.one,.active){--gap:12px}']})class App{}`, fail: true },
    // A child writer never propagates upward to its component host.
    { source: `import {Component} from '@angular/core';@Component({selector:'app-test',template:\`<p [ngStyle]="{'--gap':flag ? '12px' : 'var(--ui-space-page)'}"></p>\`,styles:[':host{--gap:var(--ui-space-page);padding:var(--gap)}']})class App{flag!:boolean}`, fail: false },
    { source: `const theme={color:'var(--ui-color-text)'};for({color:theme.color}of[{color:'red'}]){}document.body.style.color=theme.color;`, fail: false },
    { source: `import{Component,computed}from'@angular/core';class Base{change(){Object.assign(this,{ink:()=> 'red'})}}@Component({selector:'app-test',template:'<p [style.color]="ink()"></p>'})class App extends Base{readonly ink=computed(()=> 'var(--ui-color-text)')}`, fail: false },
    { source: `import{Component}from'@angular/core';@Component({selector:'app-test',template:'',styles:['.one{--gap:var(--ui-space-page);padding:var(--gap)}:is(.other,*){--gap:12px!important}']})class App{}`, fail: true },
    { source: `import{Component}from'@angular/core';@Component({selector:'app-test',template:'',styles:['p{--gap:var(--ui-space-page);padding:var(--gap)}button:is(.nested,*){--gap:12px!important}']})class App{}`, fail: false },
  ];
  for (const item of cases) {
    await writeFile(resolve(root, 'app/app.ts'), item.source);
    const result = run(); const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.length > 0, item.source);
    if (item.fail) { assert.equal(result.status, 1); assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'literal-token')); }
    else {
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.ok(report.diagnostics.every((d: { severity: string }) => d.severity === 'warning'), result.stdout);
    }
  }
});

test('copied consumer runs without checkout dependencies and accepts semantic usage', async t => {
  const { root, run } = await consumer(t, `import {Component} from '@angular/core';
@Component({selector:'app-test',template:'<ui-card><p style="color: var(--ui-color-text)">Content</p></ui-card>'}) export class App {}`);
  await assert.rejects(access(resolve(root, 'node_modules')));
  const result = run();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.ok(report.files > 0);
  assert.ok(report.checked > 0);
});

test('portable CLI fails each token-category violation and reports file, location and repair', async t => {
  const properties = ['color:#abc', 'font-family:Arial', 'font-size:18px', 'line-height:1.3', 'font-weight:500', 'padding:4px', 'border-radius:8px', 'width:200px', 'border-width:2px', 'transition-duration:300ms', 'transition-timing-function:ease-in', 'opacity:.5'];
  const { root, run } = await consumer(t, 'export const content = "business data";');
  for (const declaration of properties) {
    await writeFile(resolve(root, 'app/app.ts'), `import {Component} from '@angular/core'; @Component({selector:'app-test',template:'<p style="${declaration}">Content</p>'}) export class App {}`);
    const result = run();
    assert.equal(result.status, 1, `${declaration}: ${result.stderr}${result.stdout}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.valid, false);
    assert.ok(report.diagnostics.some((item: { severity: string; file: string; line: number; column: number; suggestion: string }) => item.severity === 'error' && item.file === 'app/app.ts' && item.line > 0 && item.column > 0 && item.suggestion));
  }
});

test('portable warning-only scan exits zero and identifies unconfirmed bindings', async t => {
  const { run } = await consumer(t, `import {Component} from '@angular/core';
@Component({selector:'app-test',template:'<p [style.color]="value">Content</p>'}) export class App { value!: string; }`);
  const result = run();
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.status, 'warnings');
  assert.ok(report.diagnostics.some((item: { severity: string }) => item.severity === 'warning'));
});

test('copied CLI inspects corner bindings, track utilities and gradient payloads', async t => {
  const template = `<div [style.border-top-left-radius]="'12px'" class="md:grid-cols-[200px_1fr] md:auto-cols-[200px] hover:bg-linear-[45deg,red,blue]"></div>`;
  const { root, run } = await consumer(t, `import {Component} from '@angular/core'; @Component({selector:'app-test',template:${JSON.stringify(template)}}) export class App {}`);
  const denied = run();
  assert.equal(denied.status, 1, denied.stderr + denied.stdout);
  const report = JSON.parse(denied.stdout);
  for (const source of ['border-top-left-radius', 'md:grid-cols-[200px_1fr]', 'md:auto-cols-[200px]', 'hover:bg-linear-[45deg,red,blue]']) {
    assert.ok(report.diagnostics.some((item: { rule: string; source: string }) => item.rule === 'literal-token' && item.source.includes(source)), source);
  }
  const semantic = `<div [style.border-top-left-radius]="'var(--ui-radius-control)'" class="md:grid-cols-[var(--ui-size-dialog)_1fr] auto-cols-fr bg-linear-[45deg,var(--ui-color-surface),var(--ui-color-text)]"></div>`;
  await writeFile(resolve(root, 'app/app.ts'), `import {Component} from '@angular/core'; @Component({selector:'app-test',template:${JSON.stringify(semantic)}}) export class App {}`);
  const allowed = run();
  assert.equal(allowed.status, 0, allowed.stderr + allowed.stdout);
  assert.equal(JSON.parse(allowed.stdout).valid, true);
});

test('copied CLI keeps component class approvals local and distinguishes pipes and business models', async t => {
  const local = `import {Component,Pipe} from '@angular/core';
@Pipe({name:'format',standalone:true}) class FormatPipe { transform(value:string){return value;} }
@Component({selector:'app-a',imports:[FormatPipe],template:'<div class="bg-red-500">{{"ok"|format}}</div>',styles:['.bg-red-500{background-color:var(--ui-color-surface)}']}) class A {}`;
  const other = `@Component({selector:'app-b',template:'<div class="bg-red-500"></div>'}) class B {}`;
  const { root, run } = await consumer(t, `${local}\n${other}`);
  const denied = run();
  assert.equal(denied.status, 1, denied.stderr + denied.stdout);
  const report = JSON.parse(denied.stdout);
  assert.equal(report.diagnostics.filter((item: { rule: string }) => item.rule === 'literal-token').length, 1);
  await writeFile(resolve(root, 'app/app.ts'), `${local}\nexport class CSSStyleDeclaration { color='business'; } const record=new CSSStyleDeclaration();record.color='red';`);
  const allowed = run();
  assert.equal(allowed.status, 0, allowed.stderr + allowed.stdout);
  const approved = JSON.parse(allowed.stdout);
  assert.equal(approved.valid, true);
  assert.deepEqual(approved.diagnostics, []);
});

test('minified copied CLI resolves Angular binding ASTs and checks DOM cssText aliases', async t => {
  const app = (template: string) => `import {Component} from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)}})class App{}`;
  const { root, run } = await consumer(t, app(`<p [class.p-4]="false" [ngClass]="false && 'p-4'"></p>`));
  const inactive = run(); assert.equal(inactive.status, 0, inactive.stdout + inactive.stderr); assert.deepEqual(JSON.parse(inactive.stdout).diagnostics, []);
  await writeFile(resolve(root, 'app/app.ts'), app(`<p [style.color]="'red'"></p>`));
  const style = run(); assert.equal(style.status, 1, style.stdout + style.stderr); assert.ok(JSON.parse(style.stdout).diagnostics.some((item: { message: string }) => item.message.includes('red in color')));
  await writeFile(resolve(root, 'app/app.ts'), app(`<p [class]="undefined ?? 'p-4'"></p>`));
  const fallback = run(); assert.equal(fallback.status, 1, fallback.stdout + fallback.stderr);
  await writeFile(resolve(root, 'app/app.ts'), `export {};declare const flag:boolean,el:HTMLElement;const property=flag?'display':'color';el.style.setProperty(property,'red');el.style['cssText']='padding:12px';`);
  const dom = run(); assert.equal(dom.status, 1, dom.stdout + dom.stderr);
  const report = JSON.parse(dom.stdout); assert.ok(report.diagnostics.some((item: { source: string }) => item.source === 'color:red')); assert.ok(report.diagnostics.some((item: { source: string }) => item.source.includes('padding:12px')));
});

test('portable checker resolves DOM standard-library types without installed TypeScript or Angular dependencies', async t => {
  const { root, run } = await consumer(t, `declare const el: HTMLElement; el.style.padding = '12px';`);
  const denied = run();
  assert.equal(denied.status, 1, denied.stderr + denied.stdout);
  const report = JSON.parse(denied.stdout);
  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some((item: { rule: string; source: string }) => item.rule === 'literal-token' && item.source.includes('padding') && item.source.includes('12px')));
  await writeFile(resolve(root, 'app/app.ts'), `declare const el: HTMLElement; el.style.padding = 'var(--ui-space-page)';`);
  const allowed = run();
  assert.equal(allowed.status, 0, allowed.stderr + allowed.stdout);
  const approved = JSON.parse(allowed.stdout);
  assert.equal(approved.valid, true);
  assert.ok(approved.checked > 0);
});

test('portable CLI rejects stale policy after configuration changes and malformed source', async t => {
  const { root, config, run } = await consumer(t, `export const content = 'Safe';`);
  config.context.product = 'Changed after generation';
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  const stale = run();
  assert.equal(stale.status, 1, stale.stderr + stale.stdout);
  assert.match(stale.stderr + stale.stdout, /policy|config|同期|configuration/i);
  await syncProject({ root });
  await writeFile(resolve(root, 'app/app.ts'), '@Component({ template: ');
  const broken = run();
  assert.equal(broken.status, 1, broken.stderr + broken.stdout);
  const report = JSON.parse(broken.stdout);
  assert.ok(report.diagnostics.some((item: { rule: string }) => item.rule === 'parse-error'));
});


test('copied CLI honors explicit Tailwind types and unhinted variable defaults', async t => {
  const app = (classes: string) => `import {Component} from '@angular/core';@Component({selector:'app-test',template:'<p class="${classes}"></p>'})class App{}`;
  const { root, run } = await consumer(t, app(''));
  const violations = ['text-(color:--ui-text-body)', 'text-[color:var(--ui-text-body)]', 'border-(color:--ui-border-control)', 'decoration-(color:--ui-border-control)', 'font-(number:--ui-font-body)', 'font-(family-name:--ui-weight-body)', 'stroke-(color:--ui-border-control)', 'text-(--ui-text-body)', 'border-(--ui-border-control)', 'font-(--ui-font-body)', 'text-(length:--ui-color-text)', 'border-(length:--ui-color-text)'];
  await writeFile(resolve(root, 'app/app.ts'), app(violations.join(' ')));
  const denied = run(); assert.equal(denied.status, 1, denied.stdout + denied.stderr);
  const report = JSON.parse(denied.stdout);
  for (const source of violations) assert.ok(report.diagnostics.some((item: { rule: string; source: string }) => item.rule === 'token-category' && item.source.endsWith(` :: ${source}`)), source);
  await writeFile(resolve(root, 'app/app.ts'), app('text-(color:--ui-color-text) text-(length:--ui-text-body) border-(color:--ui-color-text) border-(length:--ui-border-control) decoration-(color:--ui-color-text) decoration-(length:--ui-border-control) font-(family-name:--ui-font-body) stroke-(number:--ui-border-control)'));
  const allowed = run(); assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr); assert.deepEqual(JSON.parse(allowed.stdout).diagnostics, []);
});


test('copied CLI inspects logical spacing, geometry and inferred math utilities', async t => {
  const app=(classes:string)=>`import {Component} from '@angular/core';@Component({selector:'app-test',template:'<p class="${classes}"></p>'})class App{}`;
  const deniedClasses=['text-(percentage:--ui-color-text)','text-[calc(var(--ui-color-text)*2)]','md:hover:translate-z-[12px]','scroll-pbs-[12px]','translate-z-(--ui-p-ink)','scroll-pbs-(--ui-color-text)','perspective-(--ui-color-text)','transform-[translateX(12px)]','scale-x-(--ui-color-text)','backdrop-opacity-50'];
  const {root,run}=await consumer(t,app(deniedClasses.join(' ')));const denied=run();assert.equal(denied.status,1,denied.stdout+denied.stderr);
  const report=JSON.parse(denied.stdout);for(const source of deniedClasses)assert.ok(report.diagnostics.some((item:{severity:string;source:string})=>item.severity==='error'&&item.source.endsWith(` :: ${source}`)),source);
  await writeFile(resolve(root,'app/app.ts'),app('text-(percentage:--ui-text-body) text-[calc(var(--ui-text-body)*2)] border-[calc(var(--ui-border-control)*2)] stroke-[calc(var(--ui-border-control)*2)] decoration-[calc(var(--ui-border-control)*2)] ring-[calc(var(--ui-border-control)*2)] translate-z-(--ui-size-icon) scroll-pbs-(--ui-space-page) perspective-(--ui-size-dialog) scale-x-100'));
  const allowed=run();assert.equal(allowed.status,0,allowed.stdout+allowed.stderr);assert.deepEqual(JSON.parse(allowed.stdout).diagnostics,[]);
});


test('copied compiler-backed CLI rejects family and percentage violations without structural false positives', async t => {
  const app=(classes:string)=>`import {Component} from '@angular/core';@Component({selector:'app-test',template:'<p class="${classes}"></p>'})class App{}`;
  const deniedClasses=['divide-x-[var(--ui-color-text)]','decoration-(percentage:--ui-color-text)','decoration-(number:--ui-border-control)','outline-(percentage:--ui-color-text)','mask-(percentage:--ui-color-text)','opacity-1','zoom-1','text-color-text/1','drop-shadow-[0_0_var(--ui-opacity-watermark)]'];
  const {root,run}=await consumer(t,app(deniedClasses.join(' ')));const denied=run();assert.equal(denied.status,1,denied.stdout+denied.stderr);
  const report=JSON.parse(denied.stdout);for(const source of deniedClasses)assert.ok(report.diagnostics.some((item:{severity:string;source:string})=>item.severity==='error'&&item.source.endsWith(` :: ${source}`)),source);
  await writeFile(resolve(root,'app/app.ts'),app('divide-y-(--ui-border-control) decoration-(number:--ui-color-text) decoration-(percentage:--ui-border-control) outline-(percentage:--ui-border-control) mask-(percentage:--ui-size-icon) aspect-square aspect-video object-fill object-top-left origin-top-left mask-radial-at-top-right mask-top-left transform-gpu text-[color-mix(in_oklab,var(--ui-color-text)_calc(0%),transparent)] drop-shadow-[0_0_var(--ui-space-page)_var(--ui-color-text)]'));
  const allowed=run();assert.equal(allowed.status,0,allowed.stdout+allowed.stderr);assert.deepEqual(JSON.parse(allowed.stdout).diagnostics,[]);
});


test('copied CLI preserves unknown modifiers and distinguishes function argument purposes', async t => {
  const app=(template:string)=>`import {Component} from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)}})class App{}`;
  const unknowns='text-[var(--ui-color-text)]/[var(--tw-business)] bg-[var(--ui-color-text)]/(--tw-business) text-[length:var(--ui-text-body)]/[var(--tw-business)]';
  const {root,run}=await consumer(t,app(`<p class="${unknowns}"></p>`));const warning=run();assert.equal(warning.status,0,warning.stdout+warning.stderr);const unconfirmed=JSON.parse(warning.stdout);assert.equal(unconfirmed.status,'warnings');assert.equal(unconfirmed.diagnostics.filter((item:{rule:string})=>item.rule==='unresolved').length,3);
  await writeFile(resolve(root,'app/app.ts'),app('<p style="background:color-mix(in srgb,var(--ui-space-page),transparent);background-image:linear-gradient(var(--ui-space-page),var(--ui-color-text))" class="text-[length:var(--ui-text-body)]/[var(--tw-business,12px)] min-[900px]:w-size-icon"></p>'));
  const denied=run();assert.equal(denied.status,1,denied.stdout+denied.stderr);const report=JSON.parse(denied.stdout);assert.ok(report.diagnostics.some((item:{rule:string})=>item.rule==='token-category'));assert.ok(report.diagnostics.some((item:{rule:string})=>item.rule==='literal-token'));
  await writeFile(resolve(root,'app/app.ts'),app('<p class="text-[var(--ui-color-text)]/[var(--ui-opacity-watermark)]" style="background:color-mix(in srgb,var(--ui-color-text) calc(var(--ui-opacity-watermark)*100%),transparent);color:rgb(from var(--ui-color-text) r g b / var(--ui-opacity-watermark))"></p>'));
  const allowed=run();assert.equal(allowed.status,0,allowed.stdout+allowed.stderr);assert.deepEqual(JSON.parse(allowed.stdout).diagnostics,[]);
});

test('copied CLI inspects named container thresholds without consumer dependencies', async t => {
  const app = (classes: string) => `import {Component} from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify(`<p class="${classes}"></p>`)}})class App{}`;
  const { root, run } = await consumer(t, app('@min-[40rem]/sidebar:p-[var(--ui-space-page)]'));
  await assert.rejects(access(resolve(root, 'node_modules')));
  for (const variant of ['@min-', '@max-', '@']) {
    const utility = `${variant}[40rem]/sidebar:p-[var(--ui-space-page)]`;
    await writeFile(resolve(root, 'app/app.ts'), app(utility));
    const result = run();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.ok(JSON.parse(result.stdout).diagnostics.some((item: { rule: string; source: string }) => item.rule === 'literal-token' && item.source.includes(utility)), result.stdout);
  }
  await writeFile(resolve(root, 'app/app.ts'), app('@min-[var(--ui-size-dialog)]/sidebar:p-[var(--ui-space-page)]'));
  const semantic = run();
  assert.equal(semantic.status, 0, semantic.stdout + semantic.stderr);
  assert.deepEqual(JSON.parse(semantic.stdout).diagnostics, []);
  await writeFile(resolve(root, 'app/app.ts'), app('@min-[var(--runtime-width)]/sidebar:p-[var(--ui-space-page)]'));
  const dynamic = run();
  assert.equal(dynamic.status, 0, dynamic.stdout + dynamic.stderr);
  assert.equal(JSON.parse(dynamic.stdout).status, 'warnings');
});

test('copied CLI checks compound thresholds and requires an exact reasoned exception', async t => {
  const app = (classes: string) => `import {Component} from '@angular/core';@Component({selector:'app-test',template:${JSON.stringify(`<p class="${classes}"></p>`)}})class App{}`;
  const { root, config, run } = await consumer(t, app('not-@min-[40rem]/sidebar:p-[var(--ui-space-page)]'));
  for (const variant of ['not-@min-[40rem]/sidebar', 'not-@max-[40rem]/sidebar', 'not-@[40rem]/sidebar', 'not-min-[900px]', 'not-not-min-[900px]']) {
    const utility = `${variant}:p-[var(--ui-space-page)]`;
    await writeFile(resolve(root, 'app/app.ts'), app(utility));
    const result = run();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.ok(JSON.parse(result.stdout).diagnostics.some((item: { rule: string; source: string }) => item.rule === 'literal-token' && item.source.includes(utility)));
  }
  await writeFile(resolve(root, 'app/app.ts'), app('not-@min-[var(--ui-size-dialog)]/sidebar:p-[var(--ui-space-page)]'));
  const semantic = run();
  assert.equal(semantic.status, 0, semantic.stdout + semantic.stderr);
  assert.deepEqual(JSON.parse(semantic.stdout).diagnostics, []);
  await writeFile(resolve(root, 'app/app.ts'), app('not-@min-[var(--runtime-width)]/sidebar:p-[var(--ui-space-page)]'));
  const dynamic = run();
  assert.equal(dynamic.status, 0, dynamic.stdout + dynamic.stderr);
  assert.equal(JSON.parse(dynamic.stdout).status, 'warnings');
  const utility = 'not-@min-[40rem]/sidebar:p-[var(--ui-space-page)]';
  await writeFile(resolve(root, 'app/app.ts'), app(utility));
  const denied = JSON.parse(run().stdout);
  config.checks!.exceptions = [{ file: 'app/app.ts', rule: 'literal-token', source: denied.diagnostics[0].source, reason: 'Fixed container threshold for the layout fixture.' }];
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  const bundle = await readFile(resolve(root, 'foundation/check-ui.cjs'), 'utf8');
  await syncProject({ root });
  assert.equal(await readFile(resolve(root, 'foundation/check-ui.cjs'), 'utf8'), bundle);
  await assert.rejects(access(resolve(root, 'node_modules')));
  const excepted = run();
  assert.equal(excepted.status, 0, excepted.stdout + excepted.stderr);
  assert.equal(JSON.parse(excepted.stdout).exceptions.length, 1);
});

test('copied CLI runs guarded helper, symbolic class and scoped alias analysis without application execution', async t => {
  const source = `import{Component,computed,input}from'@angular/core';
function space(v:unknown){if(!['var(--ui-space-field)'].includes(v as string))throw new Error();return v;}
@Component({selector:'app-test',host:{'[style.--local-line]':'line'},template:'<code [attr.class]="classes()" [style.gap]="gap()" [style.padding]="indent(level())"></code>',styles:[':host::before{border:var(--ui-border-control) var(--local-line) var(--ui-color-border)}']})class App{
readonly source=input<string>();readonly level=input<number>();readonly language=input<string|null>();readonly line='solid';readonly gap=computed(()=>space(this.source()));
readonly checked=computed(()=>{const value=this.language();if(value==null||value==='')return '';if(typeof value!=='string'||!/^[a-zA-Z0-9_+-]+$/.test(value))throw new Error();return value;});readonly classes=computed(()=>this.checked()?'language-'+this.checked():null);
protected indent(level:number){if(!Number.isSafeInteger(level)||level<1||level>100)throw new Error();return 'calc(var(--ui-space-control-x) * '+(level-1)+')';}}
@Component({selector:'app-columns',template:'<table class="table" style="--local-columns:3"></table>',styles:['.table{min-inline-size:calc(var(--ui-size-table-column-min) * var(--local-columns))}']})class Columns{}
throw new Error('Application must never execute');`;
  const {root,run}=await consumer(t,source); await assert.rejects(access(resolve(root,'node_modules')));
  let result=run();assert.equal(result.status,0,result.stdout+result.stderr);assert.deepEqual(JSON.parse(result.stdout).diagnostics,[]);
  await writeFile(resolve(root,'app/app.ts'),source.replace("['var(--ui-space-field)']","['var(--ui-space-field)','17px']"));result=run();assert.equal(result.status,1,result.stdout);assert.ok(JSON.parse(result.stdout).diagnostics.some((d:{rule:string,message:string})=>d.rule==='literal-token'&&d.message.includes('17px')));
  await writeFile(resolve(root,'app/app.ts'),source.replace("if(!['var(--ui-space-field)'].includes(v as string))throw new Error();",''));result=run();assert.equal(result.status,0,result.stdout);assert.ok(JSON.parse(result.stdout).diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));
  await writeFile(resolve(root,'app/app.ts'),source+'RegExp.prototype.exec=()=>[];');result=run();assert.equal(result.status,0,result.stdout);assert.ok(JSON.parse(result.stdout).diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));
  await writeFile(resolve(root,'app/app.ts'),source+"document.body.style.setProperty('--local-columns',unknownValue());");result=run();assert.equal(result.status,0,result.stdout);assert.ok(JSON.parse(result.stdout).diagnostics.some((d:{rule:string,source:string})=>d.rule==='unresolved'&&d.source.includes('min-inline-size')));
});


test('copied CLI bounds strict indexed search without executing code or trusting Array methods',async t=>{
 const source=`import{Component,computed,input}from'@angular/core';
 function keyword(value:unknown,allowed:readonly string[]){if(typeof value!=='string')throw new Error('must be '+allowed.join(', '));for(let index=0;index<allowed.length;index++){const candidate=allowed[index];if(candidate===value)return candidate;}throw new Error('must be '+allowed.join(', '));}
 @Component({selector:'app-test',template:'<p [style.text-align]="alignment()"></p>'})class App{readonly value=input<string>();readonly alignment=computed(()=>keyword(this.value(),['start','center','end']));}
 Array.prototype.includes=()=>true;throw new Error('application must not execute');`;
 const {root,run}=await consumer(t,source);
 const positive=run();assert.equal(positive.status,0,positive.stdout+positive.stderr);assert.deepEqual(JSON.parse(positive.stdout).diagnostics,[]);
 await assert.rejects(access(resolve(root,'node_modules')));
 await writeFile(resolve(root,'app/app.ts'),source.replace("['start','center','end']","['start','17px']").replace('[style.text-align]','[style.gap]'));
 const bad=run();assert.equal(bad.status,1,bad.stdout+bad.stderr);assert.ok(JSON.parse(bad.stdout).diagnostics.some((d:any)=>d.rule==='literal-token'&&d.source.includes('17px')));
 await writeFile(resolve(root,'app/app.ts'),source.replace('candidate===value','candidate==value'));
 const unresolved=run();assert.equal(unresolved.status,0,unresolved.stdout+unresolved.stderr);assert.ok(JSON.parse(unresolved.stdout).diagnostics.some((d:any)=>d.rule==='unresolved'));
});

test('copied CLI certifies finite renderer branches without trusting an exposed computed owner',async t=>{
 const source=(binding:string,property='object-fit')=>`import{Component,computed,input}from'@angular/core';@Component({selector:'app-test',template:${JSON.stringify('<p [style.'+property+']="'+binding+'"></p>')}})class App{readonly external=input<string>();protected readonly value=computed(()=>this.external());}function replace(instance:App){(instance as any).value=()=> 'red';}throw new Error('Never execute consumer code');`;
 const finite="value() === 'cover' ? 'cover' : value() === 'fill' ? 'fill' : value() === 'none' ? 'none' : value() === 'scale-down' ? 'scale-down' : 'contain'";
 const {root,run}=await consumer(t,source(finite));await assert.rejects(access(resolve(root,'node_modules')));
 const positive=run();assert.equal(positive.status,0,positive.stdout+positive.stderr);assert.deepEqual(JSON.parse(positive.stdout).diagnostics,[]);
 await writeFile(resolve(root,'app/app.ts'),source("value() === 'cover' ? '17px' : 'var(--ui-space-field)'",'gap'));
 const bad=run();assert.equal(bad.status,1,bad.stdout+bad.stderr);assert.ok(JSON.parse(bad.stdout).diagnostics.some((d:{rule:string;message:string})=>d.rule==='literal-token'&&d.message.includes('17px')));
 await writeFile(resolve(root,'app/app.ts'),source("value() === 'cover' ? 'cover' : value()"));
 const unknown=run();assert.equal(unknown.status,0,unknown.stdout+unknown.stderr);assert.equal(JSON.parse(unknown.stdout).diagnostics.filter((d:{rule:string})=>d.rule==='unresolved').length,1);
});

test('copied CLI retains exposed method violations and coapplied or global alias writers',async t=>{
 const method=(value:string)=>`import{Component,input}from'@angular/core';@Component({selector:'app-test',template:'<p [style.gap]="gap(external())"></p>'})class App{readonly external=input<boolean>();protected gap(value:boolean){return value?'${value}':'var(--ui-space-field)';}}function expose(instance:App){opaque(instance);}throw new Error('application must not execute');`;
 const divider=`import{Component,Directive}from'@angular/core';@Component({selector:'app-divider',template:'',host:{'[style.--local-line]':\`'solid'\`},styles:[':host::before{border:var(--ui-border-control) var(--local-line) var(--ui-color-border)}']})class Divider{}`;
 const {root,run}=await consumer(t,method('17px'));await assert.rejects(access(resolve(root,'node_modules')));
 const verify=(fail:boolean,rule?:string)=>{const result=run();assert.equal(result.status,fail?1:0,result.stdout+result.stderr);const report=JSON.parse(result.stdout);assert.ok(report.diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));if(rule)assert.ok(report.diagnostics.some((d:{rule:string})=>d.rule===rule),result.stdout);return report;};
 verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),method('aliceblue').replace("'aliceblue':'var(--ui-space-field)'","'aliceblue':opaque()+'px'"));verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),method('text-[aliceblue]').replace('[style.gap]="gap(external())"','[ngClass]="[gap(external())]"').replace("'text-[aliceblue]':'var(--ui-space-field)'","'text-[aliceblue]':opaque()+'-'"));verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),method('var(--ui-space-field)'));verify(false);
 await writeFile(resolve(root,'app/app.ts'),divider+`@Directive({selector:'[other]',host:{'[style.--local-line]':\`'17px'\`}})class Other{}@Component({selector:'app-parent',imports:[Divider,Other],template:'<app-divider other />'})class Parent{}throw new Error('application must not execute');`);verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),divider+`@Directive({selector:'[other]',host:{'[style.--local-line]':\`flag ? '17px' : top+'px'\`}})class Other{flag!:boolean;top!:number;}@Component({selector:'app-parent',imports:[Divider,Other],template:'<app-divider other />'})class Parent{}throw new Error('application must not execute');`);verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),divider+`@Component({selector:'app-parent',imports:[Divider],template:'<app-divider class="special" />'})class Parent{}`);await writeFile(resolve(root,'app/global.css'),'.special{--local-line:17px!important}');verify(true,'literal-token');
 await writeFile(resolve(root,'app/global.css'),'');await writeFile(resolve(root,'app/app.ts'),divider+`@Directive({selector:'[other]',host:{'[style.--local-line]':\`flag ? 'aliceblue' : top+'px'\`}})class Other{flag!:boolean;top!:number;}@Component({selector:'app-parent',imports:[Divider,Other],template:'<app-divider other />'})class Parent{}`);verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),divider+`@Directive({selector:'[other]',host:{class:'special'}})class Other{}@Component({selector:'app-parent',imports:[Divider,Other],template:'<app-divider other />'})class Parent{}`);await writeFile(resolve(root,'app/global.css'),'.special{--local-line:17px!important}');verify(true,'literal-token');
 await writeFile(resolve(root,'app/app.ts'),`import{Component}from'@angular/core';@Component({selector:'app-table',template:'<table class="special"></table><table class="consumer" style="--local-line:var(--ui-space-field)"></table>',styles:['table.consumer{padding:var(--local-line)}']})class Table{}`);verify(false);
 await writeFile(resolve(root,'app/global.css'),'');await writeFile(resolve(root,'app/app.ts'),`import{Component,Directive}from'@angular/core';@Directive({selector:'[other]',host:{'[style.--local-line]':\`'17px'\`}})class Other{}@Component({selector:'app-table',imports:[Other],template:'<table other class="special"></table><table class="consumer"></table>',styles:['table.consumer{border:var(--ui-border-control) var(--local-line) var(--ui-color-border)}']})class Table{}`);verify(false);
 await writeFile(resolve(root,'app/app.ts'),divider);await writeFile(resolve(root,'app/global.css'),'app-divider{--local-line:var(--ui-size-control)!important}');verify(true,'token-category');
 await writeFile(resolve(root,'app/global.css'),'app-divider{--local-line:inherit!important}');verify(false);
});

test('copied CLI keeps native template subjects separate while retaining dynamic and inherited candidates',async t=>{
 const css='padding:var(--local-gap)';
 const source=(template:string,styles=`table.consumer{${css}}`)=>`import{Component}from'@angular/core';@Component({selector:'app-table',template:${JSON.stringify(template)},styles:[${JSON.stringify(styles)}]})class Table{flag!:boolean;tail!:string;classes!:string;}throw new Error('Application code must not execute');`;
 const writer='<table class="special" style="--local-gap:17px"></table>';
 const {root,run}=await consumer(t,source(writer+'<table class="consumer" id="target"></table>'));
 await assert.rejects(access(resolve(root,'node_modules')));
 const verify=async(text:string,bad:boolean)=>{
  await writeFile(resolve(root,'app/app.ts'),text);const result=run();assert.equal(result.status,bad?1:0,result.stdout+result.stderr);
  const report=JSON.parse(result.stdout);assert.ok(report.diagnostics.some((d:any)=>d.rule==='unresolved'));
  assert.equal(report.diagnostics.some((d:any)=>d.rule==='literal-token'&&d.source.includes(css)),bad,result.stdout);
  return report;
 };
 for(const selector of ['.consumer','table.consumer','table#target','table.consumer:not(.special)'])await verify(source(writer+'<table class="consumer" id="target"></table>',`${selector}{${css}}`),false);
 await verify(source('<table class="consumer" [style.--local-gap]="flag ? \'17px\' : tail + \'px\'"></table>'),true);
 await verify(source('<table [class]="classes" style="--local-gap:17px"></table>',`.consumer{${css}}`),true);
 await verify(source('<table [class]="classes" style="--local-gap:17px"></table><div class="consumer"></div>',`div.consumer{${css}}`),false);
 const inherited=await verify(source('<div style="--local-gap:17px"><table class="consumer"></table></div><table class="outside"></table>',`.consumer{${css}}.outside{${css}}`),true);
 assert.ok(!inherited.diagnostics.some((d:any)=>d.rule==='literal-token'&&d.source.startsWith('.outside')));
 for(const value of ['', ' style="--local-gap:unset"'])await verify(source('<table class="consumer" style="--local-gap:var(--ui-space-field)"></table><table class="consumer"'+value+'></table>',`.consumer{${css}}`),false);
 await verify(source('<ng-container style="--local-gap:17px"><table class="consumer"></table></ng-container>',`.consumer{${css}}`),false);
 await verify(source('<div style="--local-gap:17px"><table class="consumer"></table></div>',`@property --local-gap{syntax:"<length>";inherits:false;initial-value:0px}.consumer{${css}}`),false);
 await verify(source('<table class="consumer" style="--local-gap:17px"></table><div class="child"></div>',`table.consumer:has(+ .child){${css}}`),true);
 await verify(source('<table class="consumer" style="--local-gap:var(--local-other);--local-other:var(--ui-space-field)"></table><table class="consumer" style="--local-gap:var(--ui-space-field);--local-other:17px"></table>',`.consumer{${css}}.outside{${css}}`),false);
 await verify(source('<div style="--local-gap:var(--local-other);--local-other:0"><table class="consumer" style="--local-other:17px"></table></div>',`.consumer{${css}}`),false);
 await verify(source('<table class="consumer" style="--local-gap:17px"></table>',`@property --local-gap{syntax:"<length>";inherits:false;initial-value:0px}.consumer::before{${css}}`),false);
 await verify(source('<table class="consumer" style="--local-gap:var(--local-other);--local-other:0"></table>',`.consumer::before{--local-other:17px;${css}}`),false);
 await verify(source('<table class="consumer"></table>',`.consumer::before{--local-gap:17px}.consumer::after{${css}}`),false);
 await verify(source('<table class="consumer" style="--local-gap:var(--local-other);--local-other:0"></table><table class="special"></table>',`table.special{--local-other:17px}.consumer{${css}}`),false);
 await verify(source('<table class="consumer" style="--local-gap:var(--local-other)"></table>',`:host{--local-other:17px}.consumer{${css}}`),true);
});

test('copied CLI preserves host metadata compute origins and actual override violations', async t => {
  const gap = 'padding:var(--local-gap)';
  const source = (value: string, binding = false, registered = false) => `import{Component,HostBinding}from'@angular/core';@Component({selector:'app-owner',host:${binding ? '{}' : JSON.stringify({ style: `--local-host:var(--local-other);--local-other:${value}` })},template:'<table class="consumer" style="--local-gap:var(--local-host);--local-other:17px"></table>',styles:[${JSON.stringify((registered ? '@property --local-host{syntax:"*";inherits:false;initial-value:0}' : '') + `.consumer{${gap}}`)}]})class Owner{${binding ? `@HostBinding('style') readonly bag='--local-host:var(--local-other);--local-other:${value}';` : ''}}throw new Error('Application must not execute');`;
  const noneSource = (value: string) => `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-owner',encapsulation:ViewEncapsulation.None,host:{class:'host',style:'--local-gap:var(--local-other)'},template:'<app-owner class="host" style="--local-end:17px"></app-owner>',styles:[${JSON.stringify(`app-owner{--local-other:var(--local-end);${gap}}.host{--local-end:${value}}`)}]})class Owner{}throw new Error('Application must not execute');`;
  const registeredHost = `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-owner',encapsulation:ViewEncapsulation.None,host:{style:'--local-gap:19px'},template:'<table class="consumer"></table>',styles:['@property --local-gap{syntax:"*";inherits:false;initial-value:0}app-owner{${gap}}']})class Owner{}throw new Error('Application must not execute');`;
  const registeredNative = registeredHost.replace("host:{style:", "host:{class:'consumer',style:").replace('<table class="consumer"></table>', '<table class="consumer" style="--local-use:var(--local-gap);--local-gap:0"></table>').replace('app-owner{'+gap+'}', '.consumer{padding:var(--local-use)}');
  const boundHost = noneSource('19px').replace("class:'host'", `'[class]':"'host'"`);
  const scopedBoundHost = boundHost.replace('ViewEncapsulation.None', 'ViewEncapsulation.Emulated');
  const { root, run } = await consumer(t, source('0'));
  await assert.rejects(access(resolve(root, 'node_modules')));
  for (const [text, rule] of [
    [source('0'), ''], [source('0', true), ''],
    [source('19px'), 'literal-token'], [source('var(--ui-p-red)'), 'primitive-reference'],
    [source('var(--ui-size-control)'), 'token-category'], [source('var(--ui-space-missing)'), 'unknown-token'],
    [source('19px', false, true), ''], [noneSource('0'), ''], [noneSource('19px'), 'literal-token'],
    [boundHost, 'literal-token'], [scopedBoundHost, ''], [registeredHost, 'literal-token'], [registeredNative, ''],
  ]) {
    await writeFile(resolve(root, 'app/app.ts'), text);
    const result = run();
    assert.equal(result.status, rule ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: any) => d.rule === 'unresolved'));
    assert.ok(!report.diagnostics.some((d: any) => d.message.includes('Concrete value 17px')));
    if (rule) assert.ok(report.diagnostics.some((d: any) => d.rule === rule && d.source.includes(gap)), result.stdout);
    else assert.ok(!report.diagnostics.some((d: any) => d.severity === 'error'), result.stdout);
  }
  await writeFile(resolve(root, 'app/app.ts'), source('0'));
  await writeFile(resolve(root, 'app/global.css'), 'app-owner{--local-other:23px!important}');
  const override = run();
  assert.equal(override.status, 1, override.stdout + override.stderr);
  assert.ok(JSON.parse(override.stdout).diagnostics.some((d: any) => d.rule === 'literal-token' && d.message.includes('23px') && d.source.includes(gap)));
});

test('copied CLI preserves application identities, host binding candidates and finite selector coexistence', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root, 'node_modules')));
  const app = (template: string, host = '{}', style = ':host{padding:var(--local-gap)}') => `import{Component,HostBinding}from'@angular/core';@Component({selector:'app-child',template:'',host:${host},styles:[${JSON.stringify(style)}]})class Child{}@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)}})class Parent{}\nthrow new Error('Do not execute application code');`;
  const instances = (value: string) => app(`<app-child style="--local-gap:var(--local-other);--local-other:${value}"></app-child><app-child style="--local-gap:0;--local-other:17px"></app-child>`);
  const bound = (value: string, classes = "'active'") => app('', JSON.stringify({'[class]':classes,style:`--local-gap:var(--local-other);--local-other:${value}`}), '');
  const cases = [
    {source:instances('0'),css:'',fail:false},
    {source:instances('19px'),css:'',fail:true},
    ...['0','19px','var(--ui-p-red)','var(--ui-color-text)','var(--ui-space-missing)'].map(value => ({source:bound(value),css:'.active{padding:var(--local-gap)}',fail:value!=='0'})),
    {source:bound('0',"flag ? 'left' : 'right'"),css:'.left{padding:var(--local-gap)}.right{--local-other:19px}',fail:false},
    {source:bound('0',"flag ? 'left right' : 'none'"),css:'.left{padding:var(--local-gap)}.right{--local-other:19px}',fail:true},
    {source:app('',JSON.stringify({'[class]':"flag ? 'left' : 'right'",style:'--local-gap:var(--local-other);--local-other:0'})),css:'.left.right{--local-other:19px}',fail:false},
    {source:app('',JSON.stringify({'[class]':"flag ? 'left right' : 'none'",style:'--local-gap:var(--local-other);--local-other:0'})),css:'.left.right{--local-other:19px}',fail:true},
    {source:app('<app-child style="--local-gap:var(--local-other)"></app-child><app-child style="--local-gap:0;--local-other:17px"></app-child>'),css:'',fail:false},
    ...[false,true].map(combined => ({source:`import{Component}from'@angular/core';@Component({selector:'app-a.left,app-b.right',host:{style:'--local-gap:var(--local-other);--local-other:0'},template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-parent',imports:[Child],template:'<app-a class="left${combined ? ' right' : ''}"></app-a><app-b class="right"></app-b>'})class Parent{}`,css:'.left.right{--local-other:19px}',fail:combined})),
    ...[false,true].map(combined => ({source:`import{Component}from'@angular/core';@Component({selector:'app-native',template:${JSON.stringify(`<div class="consumer" [class]="${combined ? "flag ? 'left right' : 'none'" : "flag ? 'left' : 'right'"}" style="--local-gap:var(--local-other);--local-other:0"></div>`)},styles:['.consumer{padding:var(--local-gap)}']})class Native{flag!:boolean}`,css:'.left.right{--local-other:19px}',fail:combined})),
  ];
  for (const item of cases) {
    await writeFile(resolve(root, 'app/app.ts'), item.source);
    await writeFile(resolve(root, 'app/global.css'), item.css);
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, item.fail ? 1 : 0, item.source + '\n' + item.css + '\n' + result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: {rule:string}) => d.rule === 'unresolved'), result.stdout);
    assert.equal(report.diagnostics.some((d: {severity:string}) => d.severity === 'error'), item.fail, result.stdout);
    assert.ok(!report.diagnostics.some((d: {message:string}) => d.message.includes('Concrete value 17px ')), result.stdout);
  }
});

test('copied CLI inspects sibling stylesheet candidates without closing external override domains', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root, 'node_modules')));
  const border = ':host::before{border-block-start:var(--ui-border-control) var(--local-line) var(--ui-color-border)}';
  const source = (writer: string, unrelated = false) => `import{Component}from'@angular/core';@Component({selector:'app-test',template:'',styles:[${JSON.stringify(border)}${unrelated ? '' : ',' + JSON.stringify(writer)}]})class App{}${unrelated ? `@Component({selector:'app-other',template:'',styles:[${JSON.stringify(writer)}]})class Other{}` : ''};throw new Error('Never execute application code');`;
  for (const [text, files, rule] of [
    ...[['17px','literal-token'],['var(--ui-p-red)','primitive-reference'],['var(--ui-size-control)','token-category'],['var(--ui-border-missing)','unknown-token'],['solid','']].map(([value, rule]) => [source(`:host{--local-line:${value}}`), {}, rule]),
    [source(':host{--local-line:17px}', true), {}, ''],
    [`import{Component}from'@angular/core';@Component({selector:'app-test',template:'',styleUrls:['writer.scss','consumer.css']})class App{}`, { 'writer.scss': ':host{--local-line:17px}', 'consumer.css': border }, 'literal-token'],
  ] as [string, Record<string,string>, string][]) {
    for (const filename of ['writer.scss','consumer.css']) await rm(resolve(root,'app',filename), { force: true });
    await writeFile(resolve(root,'app/app.ts'), text);
    for (const [filename, content] of Object.entries(files)) await writeFile(resolve(root,'app',filename),content);
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, rule ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: {rule:string}) => d.rule === 'unresolved'));
    if (rule) assert.ok(report.diagnostics.some((d: {rule:string;source:string}) => d.rule === rule && d.source.includes('border-block-start:')), result.stdout);
    else assert.ok(report.diagnostics.every((d: {severity:string}) => d.severity === 'warning'), result.stdout);
  }
});

test('copied CLI inspects known synchronous method replacements while retaining Unknown', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root,'node_modules')));
  const app = `import{Component,input}from'@angular/core';@Component({selector:'app-test',template:'<p [style.padding-inline-start]="indent(level())"></p>'})class App{readonly level=input<number>();protected indent(value:number){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1||value>100)throw new Error();return 'calc(var(--ui-space-control-x) * '+(value-1)+')';}}`;
  for (const [text, rule] of [
    ...[['17px','literal-token'],['var(--ui-p-red)','primitive-reference'],['var(--ui-color-text)','token-category'],['var(--ui-space-missing)','unknown-token'],['var(--ui-space-field)','']].map(([value,rule]) => [`function replace(instance:App){(instance as any).indent=()=> '${value}';}`,rule]),
    ["const instance=new App();(instance as any).indent=()=> '17px';",'literal-token'],
    ["class Other{indent=()=> '0';}function replace(instance:Other){(instance as unknown as App).indent=()=> '17px';}",''],
    ["function replace(instance:App){(instance as any).indent=async()=> '17px';}",''],
    ["class Other{indent=()=> '0';}function replace(instance:App){instance=new Other() as any;(instance as any).indent=()=> '17px';}",''],
  ]) {
    await writeFile(resolve(root,'app/app.ts'), app + text + ";throw new Error('Never execute application');");
    const result=run(); assert.equal(result.error,undefined);
    assert.equal(result.status, rule ? 1 : 0, result.stdout+result.stderr);
    const report=JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: {rule:string}) => d.rule==='unresolved'));
    if(rule) assert.ok(report.diagnostics.some((d: {rule:string})=>d.rule===rule),result.stdout);
    else assert.ok(report.diagnostics.every((d: {severity:string})=>d.severity==='warning'),result.stdout);
  }
});

test('copied CLI erases TypeScript this parameters when binding replacement arguments', async t => {
  const { root, run } = await consumer(t, 'export {};');
  for (const bad of [false,true]) {
    const template=`<p [style.padding]="indent('${bad?'17px':'0'}','${bad?'0':'17px'}')"></p>`;
    await writeFile(resolve(root,'app/app.ts'),`import{Component}from'@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)}})class App{protected indent(first:string,second:string){return first;}}function replace(instance:App){(instance as any).indent=function(this:App,first:string,second:string){return first;};}throw new Error('Never execute application code');`);
    const result=run();assert.equal(result.error,undefined);assert.equal(result.status,bad?1:0,result.stdout+result.stderr);
    const report=JSON.parse(result.stdout);assert.ok(report.diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));
    assert.equal(report.diagnostics.some((d:{rule:string;message:string})=>d.rule==='literal-token'&&d.message.includes('17px')),bad,result.stdout);
  }
});

test('copied CLI tracks immutable callable sources and native Object.assign replacements',async t=>{
 const {root,run}=await consumer(t,'export {};');await assert.rejects(access(resolve(root,'node_modules')));
 const base=`import{Component}from'@angular/core';@Component({selector:'app-test',template:'<p [style.padding]="indent()"></p>'})class App{protected indent(){return '0';}}`;
 for(const [extra,bad]of [
  ["const paint=()=> '17px';const alias=paint;function change(instance:App){(instance as any).indent=alias;}",true],
  ["function paint(){return '17px';}function change(instance:App){Object.assign(instance,{indent:paint});}",true],
  ["const indent=()=> 'var(--ui-space-field)';function change(instance:App){Object.assign(instance,{indent});}",false],
  ["let paint=()=> '17px';paint=()=> '0';function change(instance:App){(instance as any).indent=paint;}",false],
  ["function paint(){return '17px';}(paint satisfies any)=()=> '0';function change(instance:App){(instance as any).indent=paint;}",false],
  ["function change(instance:App){Object.assign(instance,{indent:paint});const paint=()=> '17px';}",false],
  ["function change(instance:App,Object:any){Object.assign(instance,{indent:()=> '17px'});}",false],
  ["class Other{}function change(instance:App){instance=new Other() as any;Object.assign(instance,{indent:()=> '17px'});}",false],
 ]as[string,boolean][]){
  await writeFile(resolve(root,'app/app.ts'),base+extra+"throw new Error('Never execute application');");
  const result=run();assert.equal(result.error,undefined);assert.equal(result.status,bad?1:0,result.stdout+result.stderr);
  const report=JSON.parse(result.stdout);assert.ok(report.diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));
  assert.equal(report.diagnostics.some((d:{severity:string})=>d.severity==='error'),bad,result.stdout);
 }
});

test('copied CLI tracks real ancestor CSS and directive supply without borrowing child values',async t=>{
 const {root,run}=await consumer(t,'export {};');await assert.rejects(access(resolve(root,'node_modules')));
 const table='.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}';
 await writeFile(resolve(root,'app/consumer.css'),table);
 for(const [template,writer,bad]of [
  ['<section class="parent"><table class="consumer"></table></section>','.parent{--local-columns:17px}',true],
  ['<section class="parent"><table class="consumer"></table></section>','.parent{--local-columns:3}',false],
  ['<section class="parent"></section><table class="consumer"></table>','.parent{--local-columns:17px}',false],
  ['<section class="parent"><table class="consumer"></table></section>','@property --local-columns{syntax:"*";inherits:false}.parent{--local-columns:17px}',false],
  ['<section class="parent" style="--end:0"><table class="consumer" style="--end:17px"></table></section>','.parent{--local-columns:var(--end)}',false],
  ['<section class="parent" style="--end:19px"><table class="consumer" style="--end:0"></table></section>','.parent{--local-columns:var(--end)}',true],
 ]as[string,string,boolean][]){
  await writeFile(resolve(root,'app/writer.scss'),writer);
  await writeFile(resolve(root,'app/app.ts'),`import{Component}from'@angular/core';@Component({selector:'app-test',template:${JSON.stringify(template)},styleUrls:['writer.scss','consumer.css']})class App{}throw new Error('Never execute application');`);
  const result=run();assert.equal(result.error,undefined);assert.equal(result.status,bad?1:0,result.stdout+result.stderr);
  const report=JSON.parse(result.stdout);assert.ok(report.diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));
  assert.equal(report.diagnostics.some((d:{severity:string})=>d.severity==='error'),bad,result.stdout);
 }
 await rm(resolve(root,'app/writer.scss'));await rm(resolve(root,'app/consumer.css'));
 for(const bad of [false,true]){
  const template=`<section supply style="--end:${bad?'19px':'0'}"><table class="consumer" style="--end:17px"></table></section>`;
  await writeFile(resolve(root,'app/app.ts'),`import{Component,Directive}from'@angular/core';@Directive({selector:'[supply]',host:{style:'--local-columns:var(--end)'}})class Supply{}@Component({selector:'app-test',imports:[Supply],template:${JSON.stringify(template)},styles:[${JSON.stringify(table)}]})class App{}`);
  const result=run();assert.equal(result.error,undefined);assert.equal(result.status,bad?1:0,result.stdout+result.stderr);
  const report=JSON.parse(result.stdout);assert.ok(report.diagnostics.some((d:{rule:string})=>d.rule==='unresolved'));
  assert.ok(!report.diagnostics.some((d:{message:string})=>d.message.includes('Concrete value 17px')),result.stdout);
 }
});

test('copied CLI keeps cross-component CSS origins and synchronous call timing', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root, 'node_modules')));
  const child = `@Component({selector:'app-child',template:'<table class="consumer" style="--end:17px"></table>',styles:['.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}']})class Child{}`;
  const cssCase = (value: string, template = '<section class="parent"><app-child style="--end:17px"></app-child></section>') => `import{Component}from'@angular/core';${child}@Component({selector:'app-root',imports:[Child],template:${JSON.stringify(template)},styles:['.parent{--local-columns:var(--end);--end:${value}}']})class Root{}`;
  const method = `import{Component}from'@angular/core';@Component({selector:'app-test',template:'<p [style.padding]="indent()"></p>'})class App{protected indent(){return '0';}}`;
  const conditionalHost = (binding: string, selector: string, writers: string) => `import{Component}from'@angular/core';@Component({selector:'app-child',template:'',styles:['${selector}{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-root',imports:[Child],template:${JSON.stringify('<app-child ' + binding + '></app-child>')},styles:[${JSON.stringify(writers)}]})class Root{flag!:boolean}`;
  for (const [source, bad] of [
    [cssCase('19px'), true],
    [cssCase('0'), false],
    [cssCase('19px', '<section class="parent"></section><app-child></app-child>'), false],
    [cssCase('19px', '<section class="parent"><ng-template><app-child></app-child></ng-template></section>'), false],
    [`import{Component}from'@angular/core';${child}@Component({selector:'app-root',imports:[Child],template:'<app-child class="receiving" style="--local-columns:var(--end)"></app-child>',styles:['app-child.receiving{--end:19px}']})class Root{}`, true],
    [method + "function replace(instance:App){(()=>{Object.assign(instance,{indent:replacement});})();const replacement=()=> '17px';}", false],
    [method + "function replace(instance:App){const replacement=()=> '17px';(()=>{Object.assign(instance,{indent:replacement});})();}", true],
    [method + "function replace(instance:App){opaque(()=>{Object.assign(instance,{indent:replacement});});const replacement=()=> '17px';}", true],
    [conditionalHost(`[class]="flag ? 'left' : 'right'"`, ':host(.left)', '.left{--local-gap:0}.right{--local-gap:19px}'), false],
    [conditionalHost(`[class]="flag ? 'left right' : 'none'"`, ':host(.left)', '.left{--local-gap:0}.right{--local-gap:19px}'), true],
    [conditionalHost(`[id]="flag ? 'left' : 'right'"`, ':host(#left)', '#left{--local-gap:0}#right{--local-gap:19px}'), false],
    [`import{Component}from'@angular/core';@Component({selector:'app-child',template:'<ng-template><table class="consumer"></table></ng-template>',styles:['.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}']})class Child{}@Component({selector:'app-root',imports:[Child],template:'<app-child></app-child>',styles:['app-child{--local-columns:19px}']})class Root{}`, false],
  ] as [string, boolean][]) {
    await writeFile(resolve(root, 'app/app.ts'), source + ";throw new Error('Application must never execute');");
    const result = run();
    assert.equal(result.error, undefined);
    assert.equal(result.status, bad ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string }) => d.severity === 'error'), bad, result.stdout);
    if (source.includes('app-child')) assert.ok(!report.diagnostics.some((d: { message: string }) => d.message.includes('Concrete value 17px')), result.stdout);
  }
});

test('copied CLI respects document CSS shadow boundaries and preserves untracked parent supply', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root, 'node_modules')));
  for (const [mode, selector, bad] of [['ShadowDom', '.parent', false], ['Emulated', '.parent', true], ['ShadowDom', 'app-parent', true], ['ShadowDom', 'app-child', false]] as [string, string, boolean][]) {
    await writeFile(resolve(root, 'app/app.ts'), `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-parent',imports:[Child],encapsulation:ViewEncapsulation.${mode},template:'<section class="parent"><app-child></app-child></section>'})class Parent{}throw new Error('Never execute application');`);
    await writeFile(resolve(root, 'app/global.css'), `${selector}{--local-gap:19px}`);
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, bad ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string }) => d.severity === 'error'), bad, result.stdout);
  }
  for (const shadow of [false, true]) for (const reverse of [false, true]) {
    const definitions = [`@Component({selector:'app-child',template:'<p class="consumer"></p>',styles:['.consumer{padding:var(--local-gap)}']})class Child{}`];
    for (let n = 0; n < 12; n++) {
      const lower = n ? 'Parent' + (n - 1) : 'Child', tag = n ? 'app-parent' + (n - 1) : 'app-child';
      definitions.push(`@Component({selector:'app-parent${n}',imports:[${lower}],template:'<${tag}></${tag}>'${shadow && n === 11 ? ',encapsulation:ViewEncapsulation.ShadowDom' : ''}})class Parent${n}{}`);
    }
    await writeFile(resolve(root, 'app/app.ts'), `import{Component,ViewEncapsulation}from'@angular/core';${(reverse ? definitions.reverse() : definitions).join('')}throw new Error('Never execute application');`);
    await writeFile(resolve(root, 'app/global.css'), '.consumer{--local-gap:19px}');
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, shadow ? 0 : 1, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string }) => d.severity === 'error'), !shadow, result.stdout);
    assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), result.stdout);
  }
  await rm(resolve(root, 'app/global.css'));
  for (const [mode, bad] of [['ViewEncapsulation.Emulated', true], ['ViewEncapsulation.ShadowDom', true], ['ViewEncapsulation.ExperimentalIsolatedShadowDom', false], ['unknownMode()', false]] as const) {
    await writeFile(resolve(root, 'app/app.ts'), `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-theme',encapsulation:ViewEncapsulation.None,template:'',styles:['.parent{--local-gap:19px}']})class Theme{}@Component({selector:'app-parent',imports:[Child],encapsulation:${mode},template:'<section class="parent"><app-child></app-child></section>'})class Parent{}@Component({selector:'app-root',imports:[Theme,Parent],template:'<app-theme></app-theme><app-parent></app-parent>'})class Root{}throw new Error('Never execute application');`);
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, bad ? 1 : 0, result.stdout + result.stderr);
    assert.ok(JSON.parse(result.stdout).diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), result.stdout);
  }
  for (const shared of [false, true]) for (const detached of [false, true]) {
    const container = detached ? 'ng-template' : 'ng-container';
    await writeFile(resolve(root, 'app/app.ts'), `import{Component,ViewEncapsulation}from'@angular/core';${shared ? "@Component({selector:'app-theme',encapsulation:ViewEncapsulation.None,template:'',styles:['.consumer{--local-gap:19px}']})class Theme{}" : ''}@Component({selector:'app-root',${shared ? 'imports:[Theme],' : ''}template:'${shared ? '<app-theme></app-theme>' : ''}<${container}><p class="consumer"></p></${container}>',styles:['.consumer{padding:var(--local-gap)}']})class Root{}throw new Error('Never execute application');`);
    if (!shared) await writeFile(resolve(root, 'app/global.css'), '.consumer{--local-gap:19px}');
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, detached ? 0 : 1, result.stdout + result.stderr);
    assert.ok(JSON.parse(result.stdout).diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), result.stdout);
    if (!shared) await rm(resolve(root, 'app/global.css'));
  }
  const flags = Array.from({ length: 31 }, (_, n) => 'f' + n);
  const choices = flags.reduceRight((tail, flag, n) => `${flag} ? 'v${n}' : ${tail}`, "'v31'");
  const template = `<app-child [class]="${choices}"></app-child>`;
  for (const first of [false, true]) {
    let source = `import{Component}from'@angular/core';@Component({selector:'app-child',template:'',styles:[':host{--local-gap:var(--ui-space-field);padding:var(--local-gap)}']})class Child{}`;
    for (let n = 0; n < 5; n++) source += `@Component({selector:'app-parent${n}',imports:[Child],template:${JSON.stringify(template)},styles:[${JSON.stringify(n === (first ? 0 : 4) ? 'app-child{--local-gap:19px}' : '')}]})class Parent${n}{${flags.map(flag => flag + '!:boolean;').join('')}}`;
    source += `@Component({selector:'app-root',imports:[Parent0,Parent1,Parent2,Parent3,Parent4],template:'${Array.from({ length: 5 }, (_, n) => `<app-parent${n}></app-parent${n}>`).join('')}'})class Root{}throw new Error('Never execute application');`;
    await writeFile(resolve(root, 'app/app.ts'), source);
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, first ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.diagnostics.some((d: { rule: string; message: string }) => d.rule === 'unresolved' && d.message.includes('--local-gap')), result.stdout);
  }
});

test('copied CLI follows same-host CSS layers and repeated aliases at distinct compute origins', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root, 'node_modules')));
  const host = (child: string, parent: string, template = '<app-child></app-child>', extra = '') => `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-child',template:'',styles:[${JSON.stringify(child)}]${extra}})class Child{}@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)},styles:[${JSON.stringify(parent)}]})class Parent{flag!:boolean}`;
  const cases: [string, boolean, boolean?][] = [];
  for (const value of ['0', '19px']) {
    cases.push([host(`:host{--b:${value}}`, 'app-child{padding:var(--b)}'), value === '19px']);
    cases.push([host(':host{--b:var(--c);padding:var(--a)}', `app-child{--a:var(--b);--c:${value}}`), value === '19px']);
  }
  for (const value of ['var(--ui-color-text)', 'red']) cases.push([`import{Component}from'@angular/core';@Component({selector:'app-root',template:'<section class="parent"><p class="child"></p></section>',styles:['@property --a{syntax:"<color>";inherits:false;initial-value:transparent}.parent{--a:${value};--b:var(--a)}.child{--a:var(--b);color:var(--a)}']})class Root{}`, value === 'red']);
  cases.push([host(':host{--b:var(--a);padding:var(--a)}', 'app-child{--a:var(--b)}'), false]);
  for (const combined of [false, true]) cases.push([host(':host(.left){--b:0}:host(.right){--b:19px}', 'app-child.left{--a:var(--b);padding:var(--a)}', `<app-child [class]="${combined ? "flag ? 'left right' : 'none'" : "flag ? 'left' : 'right'"}"></app-child>`), combined]);
  cases.push([host(':host{--b:19px}', 'app-child{padding:var(--b)}', undefined, ',encapsulation:unknownMode()'), false]);
  cases.push([host(':host{--b:19px;padding:var(--a)}', 'app-child{--a:var(--b)}', '<ng-template><app-child></app-child></ng-template>'), false]);
  for (const [selector, applies] of [[':host(.left)', true], [':host:not(.left)', false], [':host(#owner)', true], [':host:not(#owner)', false]] as const) {
    cases.push([host(`${selector}{--b:19px}`, 'app-child{padding:var(--a)}', '<app-child class="left" id="owner"></app-child>', `,host:{'[style.--a]':"'var(--b)'"}`), applies]);
  }
  for (const value of ['0', '19px']) cases.push([host('', 'app-child{--a:var(--b);padding:var(--a)}', undefined, `,encapsulation:ViewEncapsulation.None,host:{'[style.--b]':${JSON.stringify(JSON.stringify(value))}}`), value === '19px']);
  for (const selector of ['app-child.left', 'app-child.right']) cases.push([host(`${selector}{--b:19px}`, 'app-child{padding:var(--a)}', '<app-child class="left"></app-child>', `,encapsulation:ViewEncapsulation.None,host:{'[style.--a]':"'var(--b)'"}`), selector === 'app-child.left']);
  for (const value of ['0', '19px']) cases.push([host(`:host{--b:${value}}`, 'app-child{--a:var(--b);padding:var(--a)}').replace('})class Parent', ',encapsulation:ViewEncapsulation.None})class Parent'), value === '19px']);
  cases.push([host(':host{--b:19px}', 'app-child{--b:var(--ui-space-field);padding:var(--b)}').replace('})class Parent', ',encapsulation:ViewEncapsulation.None})class Parent'), true]);
  for (const value of ['0', '19px']) cases.push([host(':host{--a:var(--b)}', '.leaf{padding:var(--a)}', `<app-child style="--b:${value}"><span class="leaf" style="--b:17px"></span></app-child>`).replace("template:''", "template:'<ng-content></ng-content>'"), value === '19px']);
  cases.push([host(':host{--a:19px}', '@property --a{syntax:"*";inherits:false;initial-value:0}.leaf{padding:var(--a)}', '<app-child><span class="leaf"></span></app-child>').replace("template:''", "template:'<ng-content></ng-content>'"), false]);
  cases.push([host('', 'app-child{padding:var(--a)}', '<app-child style="--a:var(--ui-space-field)"></app-child>'), false, false]);
  cases.push([host('', 'app-child{padding:var(--a)}', '<app-child [style.--a]="gap"></app-child>').replace('flag!:boolean', "readonly gap='var(--ui-space-field)';flag!:boolean"), false, false]);
  cases.push([host('', 'app-child{padding:var(--a)}', '<app-child style="--a:19px"></app-child>'), true, false]);
  cases.push([host(':host{--a:19px}', 'app-child{padding:var(--a)}', '<app-child style="--a:var(--ui-space-field)"></app-child>'), true]);
  cases.push([host('', 'app-child{padding:var(--a)}', '<app-child style="--a:var(--ui-space-field)"></app-child>', `,host:{'[style.--a]':"'19px'"}`), true]);
  for (const [source, bad, unresolved = true] of cases) {
    await writeFile(resolve(root, 'app/app.ts'), source + ";throw new Error('Never execute application');");
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, bad ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.valid, !bad, result.stdout);
    assert.equal(report.diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), unresolved, result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string }) => d.severity === 'error'), bad, result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string; message: string }) => d.severity === 'error' && d.message.includes('Concrete value 17px ')), false, result.stdout);
  }
});

test('copied CLI follows child-host inheritance from global and None consumers without borrowing leaf values', async t => {
  const { root, run } = await consumer(t, 'export {};');
  await assert.rejects(access(resolve(root, 'node_modules')));
  const app = (value: string, none: boolean, options: { childExtra?: string; leaf?: string; host?: string; css?: string; parentCSS?: string; template?: string } = {}) => {
    const css = options.css ?? '.leaf{padding:var(--a)}';
    const leaf = options.leaf ?? '<p class="leaf" style="--b:17px"></p>';
    const template = options.template ?? `<app-child style="--b:${value}"></app-child>`;
    return { source: `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-child',template:${JSON.stringify(leaf)},styles:[${JSON.stringify(options.host ?? ':host{--a:var(--b)}')}]${options.childExtra ?? ''}})class Child{}@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)},styles:${JSON.stringify([...(options.parentCSS ? [options.parentCSS] : []), ...(none ? [css] : [])])}${none ? ',encapsulation:ViewEncapsulation.None' : ''}})class Parent{flag!:boolean}`, css: none ? '' : css };
  };
  const cases: { source: string; css: string; bad: boolean }[] = [];
  for (const none of [false, true]) {
    for (const value of ['var(--ui-space-field)', '19px']) cases.push({ ...app(value, none), bad: value === '19px' });
    cases.push({ ...app('19px', none, { childExtra: ',encapsulation:ViewEncapsulation.ShadowDom' }), bad: none });
    cases.push({ ...app('19px', none, { childExtra: ',encapsulation:unknownMode()' }), bad: false });
    cases.push({ ...app('19px', none, { leaf: '<ng-template><p class="leaf" style="--b:17px"></p></ng-template>' }), bad: false });
    cases.push({ ...app('19px', none, { css: '@property --a{syntax:"*";inherits:false;initial-value:0}.leaf::before{padding:var(--a)}' }), bad: false });
    cases.push({ ...app('19px', none, { css: '.leaf::before{padding:var(--a)}' }), bad: true });
    cases.push({ ...app('0', none, { host: ':host(.left){--a:var(--b)}', template: '<app-child class="left" style="--b:0"></app-child><app-child class="right" style="--b:19px"></app-child>' }), bad: false });
    cases.push({ ...app('19px', none, { host: ':host{--a:var(--b)}', parentCSS: 'app-child{--b:var(--c)}', template: '<app-child style="--c:19px"></app-child>', leaf: '<p class="leaf" style="--c:17px"></p>' }), bad: true });
    for (const writer of ['host-css', 'global-css', 'metadata']) cases.push({ ...app('19px', none, {
      host: writer === 'host-css' ? ':host{--a:19px}' : writer === 'global-css' ? 'app-child{--a:19px}' : '',
      childExtra: ',encapsulation:ViewEncapsulation.None' + (writer === 'metadata' ? ',host:{style:"--a:19px"}' : ''),
    }), bad: writer !== 'host-css' });
  }
  const nestedShadow = (raw = false, outerDetached = false, innerDetached = false, mode = 'ViewEncapsulation.ShadowDom') => {
    const leaf = `<p class="leaf" style="${raw ? '--a:19px;' : ''}--b:17px"></p>`;
    const template = outerDetached ? '<ng-template><app-child></app-child></ng-template>' : '<app-child></app-child>';
    return { source: `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-child',template:${JSON.stringify(innerDetached ? `<ng-template>${leaf}</ng-template>` : leaf)},styles:${JSON.stringify(raw ? [] : [':host{--a:19px}'])},encapsulation:${mode}})class Child{}@Component({selector:'app-parent',template:${JSON.stringify(template)},imports:[Child],encapsulation:unknownMode()})class Parent{}@Component({selector:'app-theme',template:'',styles:['.leaf{padding:var(--a)}'],encapsulation:ViewEncapsulation.None})class Theme{}@Component({selector:'app-root',template:'<app-theme></app-theme><app-parent></app-parent>',imports:[Theme,Parent]})class Root{}`, css: '' };
  };
  cases.push({ ...nestedShadow(), bad: true }, { ...nestedShadow(true), bad: true }, { ...nestedShadow(false, true), bad: true },
    { ...nestedShadow(false, false, true), bad: false }, { ...nestedShadow(false, false, false, 'ViewEncapsulation.ExperimentalIsolatedShadowDom'), bad: false });
  for (const entry of cases) {
    await writeFile(resolve(root, 'app/app.ts'), entry.source + ";throw new Error('Never execute application');");
    await writeFile(resolve(root, 'app/global.css'), entry.css);
    const result = run(); assert.equal(result.error, undefined);
    assert.equal(result.status, entry.bad ? 1 : 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.valid, !entry.bad, result.stdout);
    assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string; message: string }) => d.severity === 'error' && d.message.includes('Concrete value 19px ')), entry.bad, result.stdout);
    assert.equal(report.diagnostics.some((d: { severity: string; message: string }) => d.severity === 'error' && d.message.includes('Concrete value 17px ')), false, result.stdout);
  }
});
