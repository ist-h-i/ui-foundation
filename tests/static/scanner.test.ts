import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
import type { ChecksConfig, SourceReport } from '../../src/check/types.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const example = await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8');
const checks = (): ChecksConfig => ({ source_roots: ['app'], approved_components: [], exceptions: [] });

async function fixture(t: TestContext, files: Record<string, string>, settings = checks()) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-static-scanner-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = parseConfig(example);
  input.checks = settings;
  const config = resolveConfig(input);
  for (const [file, content] of Object.entries(files)) {
    await mkdir(dirname(resolve(root, file)), { recursive: true });
    await writeFile(resolve(root, file), content);
  }
  const scan = () => checkSources({ root, config, policy: createSourcePolicy(config) });
  return { root, config, scan };
}

const errors = (report: SourceReport) => report.diagnostics.filter(item => item.severity === 'error');
const warnings = (report: SourceReport) => report.diagnostics.filter(item => item.severity === 'warning');
const component = (template: string, extra = '') => `import {Component} from '@angular/core';
@Component({selector:'app-test',standalone:true,template:${JSON.stringify(template)}${extra}})
export class App { condition = true; value!: string; }`;

test('finite conditional results and fixed class names do not warn about activation', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': component('<p [style.color]="value ? \'var(--ui-color-text)\' : \'var(--ui-color-muted)\'" [class.ui-local]="value" [class]="value ? \'ui-local\' : \'\'"></p>', ',styles:[".ui-local{color:var(--ui-color-text)}"]') });
  const report = await scan();
  assert.deepEqual(report.diagnostics, []);
  const bad = await fixture(t, { 'app/app.ts': component('<p [style.color]="value ? \'red\' : \'var(--ui-color-text)\'" [class.p-4]="value"></p>') });
  const denied = await bad.scan();
  assert.equal(errors(denied).length, 2);
  assert.equal(warnings(denied).length, 0);
});

test('Angular shorthand metadata inspects local const styles and their source positions', async t => {
  const source = `import {Component} from '@angular/core';\nconst styles = '.local{color:red}';\nconst template = '<p class="local"></p>';\n@Component({selector:'app-test',template,styles}) class App {}`;
  const { scan } = await fixture(t, { 'app/app.ts': source });
  const report = await scan();
  assert.equal(warnings(report).length, 0);
  assert.equal(errors(report).length, 1);
  assert.equal(errors(report)[0].rule, 'literal-token');
  assert.equal(errors(report)[0].line, 2);
});

test('readonly Angular computed syntax resolves finite outputs without invoking application code', async t => {
  const source = `import {Component,computed,input} from '@angular/core';
@Component({selector:'app-test',template:'<p [style.line-height]="leading()" [style.color]="color()"></p>'})
class App { readonly mode=input('body'); readonly leading=computed(()=>this.mode()==='heading'?'var(--ui-leading-heading)':'var(--ui-leading-body)');readonly color=computed(()=>this.mode()==='danger'?'red':'var(--ui-color-text)'); }
throw new Error('Application code must never execute');`;
  const { scan } = await fixture(t, { 'app/app.ts': source });
  const report = await scan();
  assert.equal(errors(report).length, 1);
  assert.equal(errors(report)[0].rule, 'literal-token');
  assert.equal(warnings(report).length, 0);
  const opaque = await fixture(t, { 'app/app.ts': `import {Component,input} from '@angular/core';const computed=(f:()=>string)=>()=> 'red'; @Component({selector:'app-test',template:'<p [style.color]="color()"></p>'})class App { readonly color=computed(()=> 'var(--ui-color-text)');readonly external=input('var(--ui-color-text)'); }` });
  assert.ok(warnings(await opaque.scan()).length > 0);
  const shadowed = await fixture(t, { 'app/app.ts': `import {Component,computed} from '@angular/core';function factory(){const computed=(f:()=>string)=>()=> 'red';@Component({selector:'app-test',template:'<p [style.color]="color()"></p>'})class App{readonly color=computed(()=> 'var(--ui-color-text)');}return App;}` });
  assert.ok(warnings(await shadowed.scan()).length > 0);
});

test('finite for-of names narrow DOM sinks but copied computed values stay unconfirmed', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `const source=getComputedStyle(document.body);for(const name of ['--ui-color-text','--ui-space-page'])document.documentElement.style.setProperty(name,source.getPropertyValue(name));` });
  const report = await scan();
  assert.equal(errors(report).length, 0);
  assert.ok(warnings(report).every(d => !d.message.includes('property cannot')));
  assert.equal(warnings(report).length, 1);
});

test('mutable scalar/object/HostBinding initializers do not certify their defaults', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `import {Component,HostBinding} from '@angular/core';
let color='var(--ui-color-text)';color='red';document.body.style.color=color;
const theme={color:'var(--ui-color-text)'};theme.color='red';document.body.style.color=theme.color;
@Component({selector:'app-test',template:''})class App {@HostBinding('style.color') color='var(--ui-color-text)';change(){this.color='red';}}` });
  const report = await scan();
  assert.ok(errors(report).some(d => d.message.includes('red')));
  assert.ok(warnings(report).length >= 3);
});

test('CSS aliases respect custom-property writes in external templates and unknown style bags', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `import {Component} from '@angular/core';@Component({selector:'app-test',templateUrl:'../view.html',styles:[':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}']})class App{value!:string}`, 'view.html': '<p [style.--local-gap]="value"></p>' });
  assert.ok(warnings(await scan()).some(d => d.message.includes('--local-gap')));
  const good = await fixture(t, { 'app/app.ts': component('<p></p>', ',styles:[":host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}"]') });
  assert.deepEqual((await good.scan()).diagnostics, []);
  const opaque = await fixture(t, { 'app/app.ts': component('<p [ngStyle]="value"></p>', ',styles:[":host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}"]') });
  assert.ok(warnings(await opaque.scan()).some(d => d.message.includes('--local-gap')));
  const partial = await fixture(t, { 'app/app.ts': component('<p [ngStyle]="condition ? {color: \'var(--ui-color-text)\'} : value"></p>', ',styles:[":host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}"]') });
  assert.ok(warnings(await partial.scan()).some(d => d.message.includes('--local-gap')));
});

test('private helper/owned Map names resolve only closed call and mutation provenance', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `class Attributes { private readonly owned=new Map<string,string>();private apply(name:string,value:string){document.body.setAttribute(name,value);this.owned.set(name,value);}paint(){this.apply('lang','ja');this.apply('dir','rtl');}restore(){for(const [name,value] of this.owned)document.body.setAttribute(name,value);}}` });
  assert.deepEqual((await scan()).diagnostics, []);
  const escaped = await fixture(t, { 'app/app.ts': `class Attributes {private apply(name:string,value:string){document.body.setAttribute(name,value);}paint(){const callback=this.apply;callback('style','color:red');}}` });
  assert.ok(warnings(await escaped.scan()).some(d => d.message.includes('attribute name')));
  const changed = await fixture(t, { 'app/app.ts': `class Attributes {private apply(name:string,value:string){name=getName();document.body.setAttribute(name,value);}paint(){this.apply('lang','ja');}}` });
  assert.ok(warnings(await changed.scan()).some(d => d.message.includes('attribute name')));
});

test('computed fields retain unknown after reassignment or Angular input ownership', async t => {
  const variants = [
    `readonly color=computed(()=> 'var(--ui-color-text)');constructor(){this.color=computed(()=>getColor());}`,
    `@Input() readonly color=computed(()=> 'var(--ui-color-text)');`,
    `readonly color=computed(()=> 'var(--ui-color-text)');`,
  ];
  for (let index = 0; index < variants.length; index++) {
    const metadata = index === 2 ? `,inputs:['color: ink']` : '';
    const source = `import {Component,computed,Input} from '@angular/core';@Component({selector:'app-test',template:'<p [style.color]="color()"></p>'${metadata}})class App{${variants[index]}paint(){document.body.style.color=this.color();}}`;
    const { scan } = await fixture(t, { 'app/app.ts': source });
    const report = await scan();
    assert.equal(report.status, 'warnings', source);
    assert.equal(warnings(report).length, 2, source);
  }
  const scalar = await fixture(t, { 'app/app.ts': `import {Component} from '@angular/core';@Component({selector:'app-test',inputs:['color'],template:'<p [style.color]="color"></p>'})class App{readonly color='var(--ui-color-text)';}` });
  assert.equal(warnings(await scalar.scan()).length, 1);
});

test('nested writes, object escapes and inferred parameter mutations retain unknown', async t => {
  const variants = [
    `const theme={inner:{color:'var(--ui-color-text)'}};theme.inner.color='red';document.body.style.color=theme.inner.color;`,
    `const theme={inner:{color:'var(--ui-color-text)'}};const alias=theme.inner;alias.color='red';document.body.style.color=theme.inner.color;`,
    `const theme={width:0};theme.width++;document.body.style.width=''+theme.width+'px';`,
    `const paint=(style:{color:string})=>{style.color='red';document.body.style.color=style.color;};paint({color:'var(--ui-color-text)'});`,
    `const paint=(width:number)=>{width++;document.body.style.width=''+width+'px';};paint(0);`,
  ];
  for (const source of variants) {
    const { scan } = await fixture(t, { 'app/app.ts': source });
    assert.ok(warnings(await scan()).length > 0, source);
  }
  const stable = await fixture(t, { 'app/app.ts': `const theme={inner:{color:'var(--ui-color-text)'}};document.body.style.color=theme.inner.color;` });
  assert.deepEqual((await stable.scan()).diagnostics, []);
});

test('assignment patterns write their targets but computed keys remain reads', async t => {
  const variants = [
    `const theme={color:'var(--ui-color-text)'};({color:theme.color}={color:'red'});document.body.style.color=theme.color;`,
    `const theme={color:'var(--ui-color-text)'};[theme.color]=['red'];document.body.style.color=theme.color;`,
    `const paint=(style:{color:string})=>{({color:style.color}={color:'red'});document.body.style.color=style.color;};paint({color:'var(--ui-color-text)'});`,
    `const paint=(style:{color:string})=>{[style.color]=['red'];document.body.style.color=style.color;};paint({color:'var(--ui-color-text)'});`,
  ];
  for (const source of variants) {
    const { scan } = await fixture(t, { 'app/app.ts': source });
    assert.ok(warnings(await scan()).length > 0, source);
  }
  const read = await fixture(t, { 'app/app.ts': `const theme={color:'var(--ui-color-text)'};const target:any={};({[theme.color]:target.value}={});document.body.style.color=theme.color;` });
  assert.deepEqual((await read.scan()).diagnostics, []);
});

test('computed signals stay unknown when their instance escapes or receives indirect writes', async t => {
  const variants = [
    `Object.assign(this,{color:()=> 'red'});`,
    `mutate(this);`,
    `const alias=this;alias.color=()=> 'red';`,
    `return this;`,
    `this['color']=()=> 'red';`,
    `const mutate=()=>Object.assign(this,{color:()=> 'red'});mutate();`,
  ];
  for (const mutation of variants) {
    const source = `import {Component,computed} from '@angular/core';@Component({selector:'app-test',template:'<p [style.color]="color()"></p>'})class App{readonly color=computed(()=> 'var(--ui-color-text)');change(){${mutation}}paint(){document.body.style.color=this.color();}}`;
    const { scan } = await fixture(t, { 'app/app.ts': source });
    const report = await scan();
    assert.equal(warnings(report).length, 2, mutation);
  }
  const scoped = await fixture(t, { 'app/app.ts': `import {Component,computed} from '@angular/core';@Component({selector:'app-test',template:'<p [style.color]="color()"></p>'})class App{readonly color=computed(()=> 'var(--ui-color-text)');change(){function other(){mutate(this);}const otherObject={change(){mutate(this);}};class Nested{change(){mutate(this);}}}static change(){mutate(this);}}` });
  assert.deepEqual((await scoped.scan()).diagnostics, []);
  const staticOwner = await fixture(t, { 'app/app.ts': `import {computed} from '@angular/core';class App{static readonly color=computed(()=> 'var(--ui-color-text)');static paint(){Object.assign(this,{color:()=> 'red'});document.body.style.color=this.color();}}` });
  assert.equal(warnings(await staticOwner.scan()).length, 1);
});

test('exported helpers and mutable objects are not certified from same-file references', async t => {
  for (const declaration of [`export const paint`, `const paint`]) {
    const extra = declaration.startsWith('export') ? '' : `export {paint};`;
    const { scan } = await fixture(t, {
      'app/app.ts': `${declaration}=(color:string)=>{document.body.style.color=color;};paint('var(--ui-color-text)');${extra}`,
      'app/other.ts': `import {paint} from './app';paint('red');`,
    });
    assert.ok(warnings(await scan()).length > 0);
  }
  const mutable = await fixture(t, {
    'app/app.ts': `export const theme={color:'var(--ui-color-text)'};document.body.style.color=theme.color;`,
    'app/other.ts': `import {theme} from './app';theme.color='red';`,
  });
  assert.ok(warnings(await mutable.scan()).length > 0);
});

test('Map.set returned receivers cannot hide chained or escaping mutations', async t => {
  const chained = await fixture(t, { 'app/app.ts': `export class Attributes{private readonly owned=new Map<string,string>();paint(){this.owned.set('lang','ja').set('style','color:red');}restore(){for(const [name,value] of this.owned)document.body.setAttribute(name,value);}}` });
  assert.ok(warnings(await chained.scan()).some(d => d.message.includes('attribute name')));
  const escaped = await fixture(t, { 'app/app.ts': `class Attributes{private readonly owned=new Map<string,string>();paint(){const alias=this.owned.set('lang','ja');alias.set(getName(),'red');}restore(){for(const [name,value] of this.owned)document.body.setAttribute(name,value);}}` });
  assert.ok(warnings(await escaped.scan()).some(d => d.message.includes('attribute name')));
  const closed = await fixture(t, { 'app/app.ts': `export class Attributes{private readonly owned=new Map<string,string>();private apply(name:string){this.owned.set(name,'ja');}paint(){this.apply('lang');}restore(){for(const [name,value] of this.owned)document.body.setAttribute(name,value);}}` });
  assert.deepEqual((await closed.scan()).diagnostics, []);
});

test('all token categories reject fixed values and accept their semantic variables', async t => {
  const cases = [
    ['color', '#abc', 'var(--ui-color-text)'],
    ['font-family', 'Arial', 'var(--ui-font-body)'],
    ['font-size', '18px', 'var(--ui-text-body)'],
    ['line-height', '1.5', 'var(--ui-leading-body)'],
    ['font-weight', '500', 'var(--ui-weight-body)'],
    ['padding-inline', '12px', 'var(--ui-space-control-x)'],
    ['border-radius', '8px', 'var(--ui-radius-control)'],
    ['min-width', '240px', 'var(--ui-size-dialog)'],
    ['border-width', '2px', 'var(--ui-border-control)'],
    ['transition-duration', '300ms', 'var(--ui-motion-duration)'],
    ['transition-timing-function', 'ease-in', 'var(--ui-motion-easing)'],
    ['opacity', '0.5', 'var(--ui-opacity-watermark)'],
  ];
  for (const [property, literal, semantic] of cases) {
    await t.test(property, async tt => {
      const bad = await fixture(tt, { 'app/style.css': `.bad { ${property}: ${literal}; }` });
      const report = await bad.scan();
      assert.equal(report.valid, false, JSON.stringify(report));
      const finding = errors(report).find(item => item.rule === 'literal-token');
      assert.ok(finding, JSON.stringify(report));
      bad.config.checks!.exceptions = [{ file: finding.file, rule: finding.rule, source: finding.source, reason: `Reviewed ${property} requirement for this isolated fixture` }];
      const exceptionReport = await bad.scan();
      assert.equal(exceptionReport.valid, true, JSON.stringify(exceptionReport));
      assert.equal(exceptionReport.exceptions.length, 1);
      const good = await fixture(tt, { 'app/style.css': `.good { ${property}: ${semantic}; }` });
      assert.equal((await good.scan()).valid, true);
    });
  }
});

test('CSS shorthands, nested functions and fallback literals are checked individually', async t => {
  const { scan } = await fixture(t, { 'app/styles.css': `
.card {
  padding: 0 var(--ui-space-page) 5px;
  border: var(--ui-border-control) solid #abc;
  margin-block: calc(var(--ui-space-page) + 6px);
  color: var(--ui-color-text, red);
  background: linear-gradient(var(--ui-color-surface), #def);
  transition: opacity var(--ui-motion-duration) ease-in;
}` });
  const report = await scan();
  assert.equal(report.valid, false);
  for (const literal of ['5px', '#abc', '6px', 'red', '#def', 'ease-in']) {
    assert.ok(errors(report).some(item => item.source.includes(literal)), `${literal}: ${JSON.stringify(report)}`);
  }
  assert.ok(errors(report).every(item => item.line > 0 && item.column > 0 && item.message && item.suggestion));
  assert.ok(report.checked > 0);
});

test('primitive references, unknown roles and wrong-purpose semantic roles fail', async t => {
  const { scan } = await fixture(t, { 'app/styles.css': `.a { color: var(--ui-p-ink); }
.b { color: var(--ui-color-nonexistent); }
.c { padding: var(--ui-color-text); }` });
  const report = await scan();
  for (const rule of ['primitive-reference', 'unknown-token', 'token-category']) {
    assert.ok(errors(report).some(item => item.rule === rule), JSON.stringify(report));
  }
});

test('reset values, zero and property-appropriate structural keywords are accepted', async t => {
  const { scan } = await fixture(t, { 'app/styles.css': `.layout {
display: grid; position: relative; box-sizing: border-box;
width: auto; max-width: none; height: fit-content;
margin: 0 auto; padding: 0; color: inherit;
border: 0; font: inherit; opacity: initial;
}` });
  assert.equal((await scan()).valid, true);
});

test('inline/external templates and styles report source coordinates', async t => {
  const { scan } = await fixture(t, {
    'app/inline.ts': component('<p style="color: #aabbcc">Inline</p>', ',styles:[".inline { margin: 4px; }"]'),
    'app/external.ts': `import {Component} from '@angular/core';
@Component({selector:'app-external',templateUrl:'./view.html',styleUrls:['./view.scss']}) export class External {}`,
    'app/view.html': '<section style="padding: 11px">External</section>',
    'app/view.scss': '.external { font-size: 19px; }',
  });
  const report = await scan();
  assert.equal(report.valid, false);
  for (const file of ['app/inline.ts', 'app/view.html', 'app/view.scss']) {
    assert.ok(errors(report).some(item => item.file === file), JSON.stringify(report));
  }
});

test('safe constant evaluation follows aliases, concatenation and arrays without executing code', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `import {Component} from '@angular/core';
const COLOR = '#ab' + 'c'; const DECLARATION = '.box { color: ' + COLOR + '; }';
const STYLES = [DECLARATION]; const TEMPLATE = '<div class="' + 'md:hover:p-4' + '">Test</div>';
@Component({selector:'app-test',styles:STYLES,template:TEMPLATE}) export class App {}` });
  const report = await scan();
  assert.equal(report.valid, false);
  assert.ok(errors(report).some(item => item.source.includes('#abc')), JSON.stringify(report));
  assert.ok(errors(report).some(item => item.source.includes('p-4')), JSON.stringify(report));
});

test('shared imported styles report one original source finding while repeated rules in one literal remain ambiguous', async t => {
  const { root, config, scan } = await fixture(t, {
    'app/shared.ts': '// Shared declaration\nexport const SHARED = `.box { padding: 12px; }`;',
    'app/first.ts': `import {Component} from '@angular/core'; import {SHARED} from './shared'; @Component({selector:'app-first',template:'',styles:[SHARED]}) export class First {}`,
    'app/second.ts': `import {Component} from '@angular/core'; import {SHARED as ALIAS} from './shared'; @Component({selector:'app-second',template:'',styles:[ALIAS]}) export class Second {}`,
  });
  const report = await scan();
  const findings = errors(report).filter(item => item.rule === 'literal-token');
  assert.equal(findings.length, 1, JSON.stringify(report));
  assert.equal(findings[0].file, 'app/shared.ts');
  assert.equal(findings[0].line, 2);
  await writeFile(resolve(root, 'app/shared.ts'), '// Shared declaration\nexport const SHARED = `.box { padding: 12px; }\n.box { padding: 12px; }`;');
  const repeated = await scan();
  const duplicates = errors(repeated).filter(item => item.rule === 'literal-token');
  assert.equal(duplicates.length, 2, JSON.stringify(repeated));
  assert.equal(duplicates[0].source, duplicates[1].source);
  config.checks!.exceptions = [{ file: 'app/shared.ts', rule: 'literal-token', source: duplicates[0].source, reason: 'Repeated source needs coordinates' }];
  assert.ok(errors(await scan()).some(item => item.rule === 'exception-error'));
});

test('Tailwind variants and arbitrary values fail while semantic utilities and local classes pass', async t => {
  const bad = await fixture(t, { 'app/app.ts': component('<p class="sm:hover:p-4 md:text-red-500 rounded-[8px]">Bad</p>') });
  const report = await bad.scan();
  for (const utility of ['p-4', 'text-red-500', 'rounded-[8px]']) {
    assert.ok(errors(report).some(item => item.source.includes(utility)), JSON.stringify(report));
  }
  const good = await fixture(t, {
    'app/app.ts': component('<p class="md:hover:p-page text-color-text text-size-body font-family-body local">Good</p>'),
    'app/style.css': '.local { padding: var(--ui-space-page); color: var(--ui-color-text); }',
  });
  assert.equal((await good.scan()).valid, true);
});

test('only parsed CSS class selectors grant local utility names, including later inline metadata', async t => {
  for (const css of ['/* .bg-red-500 */', `.holder { content: '.bg-red-500'; }`, `[data-theme=".bg-red-500"] {}`]) {
    const { scan } = await fixture(t, { 'app/app.ts': component('<p class="bg-red-500">Must fail</p>'), 'app/styles.css': css });
    const report = await scan();
    assert.equal(report.valid, false, JSON.stringify(report));
    assert.ok(errors(report).some(item => item.rule === 'literal-token' && item.source.includes('bg-red-500')));
  }
  const { scan } = await fixture(t, { 'app/app.ts': component('<p class="text-custom">Semantic custom style</p>', `,styles:[".text-custom { color: var(--ui-color-text); }"]`) });
  assert.equal((await scan()).valid, true);
});

test('host and style/class bindings inspect known literals even within dynamic branches', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': component(
    `<p [style.color]="condition ? '#abc' : value" [style.padding.px]="8" [class]="condition ? 'p-4' : value">Bound</p>`,
    `,host:{'[style.border-radius]':"condition ? '7px' : value",'[class]':"condition ? 'text-red-500' : value"}`,
  ) });
  const report = await scan();
  for (const literal of ['#abc', '8', 'p-4', '7px', 'text-red-500']) {
    assert.ok(errors(report).some(item => item.source.includes(literal)), `${literal}: ${JSON.stringify(report)}`);
  }
  assert.ok(warnings(report).length > 0, JSON.stringify(report));
});

test('DOM style sinks and renderer calls are inspected without scanning unrelated business data', async t => {
  const { scan } = await fixture(t, { 'app/dom.ts': `
import {Renderer2} from '@angular/core';
const data = {color:'#abc', padding:'4px', class:'p-4'};
// color: #aabbcc; class="text-red-500"
function paint(el: HTMLElement, renderer: Renderer2) {
 el.style.color = '#def';
 el.style.setProperty('padding-inline', '9px');
 renderer.setStyle(el, 'border-radius', '6px');
}
` });
  const report = await scan();
  for (const literal of ['#def', '9px', '6px']) {
    assert.ok(errors(report).some(item => item.source.includes(literal)), JSON.stringify(report));
  }
  assert.ok(errors(report).every(item => !item.source.includes('#abc') && !item.source.includes('4px')));
});

test('typed DOM and Renderer2 attribute style writes are inspected without business-method false positives', async t => {
  const bad = await fixture(t, { 'app/dom.ts': `import {Renderer2} from '@angular/core';
function paint(el: HTMLElement, svg: SVGElement, renderer: Renderer2, attribute: string) {
 el.setAttribute('style', 'color:red');
 svg.setAttribute('fill', '#abc');
 const button = document.createElement('button'); button.setAttribute('style', 'padding:8px');
 const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('stroke', '#def');
 renderer.setAttribute(el, 'style', 'padding:12px');
 el.setAttribute(attribute, 'unknown');
}` });
  const badReport = await bad.scan();
  for (const source of ['color:red', 'fill:#abc', 'padding:12px', 'padding:8px', 'stroke:#def']) assert.ok(errors(badReport).some(item => item.source.includes(source)), JSON.stringify(badReport));
  assert.ok(warnings(badReport).some(item => item.message.includes('attribute name')));
  const good = await fixture(t, { 'app/dom.ts': `
const business = { setAttribute(name: string, value: string) { return name + value; } };
function paint(el: Element) {
 el.setAttribute('style', 'color:var(--ui-color-text)');
 el.setAttribute('title', 'Red product');
 business.setAttribute('style', 'color:red');
}` });
  const goodReport = await good.scan();
  assert.equal(goodReport.valid, true, JSON.stringify(goodReport));
  assert.ok(goodReport.checked > 0);
  assert.equal(errors(goodReport).length, 0);
});

test('host attr.style and attr.class bindings share style/class inspection', async t => {
  const bad = await fixture(t, { 'app/app.ts': `import {Component,HostBinding} from '@angular/core';
@Component({selector:'app-test',template:'',host:{'[attr.style]':"'padding:12px'",'[attr.class]':"'p-4'"}})
export class App { @HostBinding('attr.style') style = 'color:red'; @HostBinding('attr.class') classes = 'text-red-500'; }` });
  const report = await bad.scan();
  for (const source of ['padding:12px', 'p-4', 'color:red', 'text-red-500']) assert.ok(errors(report).some(item => item.source.includes(source)), JSON.stringify(report));
  const good = await fixture(t, { 'app/app.ts': `import {Component,HostBinding} from '@angular/core';
@Component({selector:'app-test',template:'',host:{'[attr.style]':"'color:var(--ui-color-text)'"}})
export class App { @HostBinding('attr.style') style = 'color:var(--ui-color-text)'; }` });
  assert.equal((await good.scan()).valid, true);
});

test('incomplete dynamic string suffixes warn without inventing violations, while concrete arithmetic pieces fail', async t => {
  const { root, scan } = await fixture(t, { 'app/dom.ts': `declare const el: HTMLElement; declare const value: number;
el.style.width = value + 'px';
el.style.transform = 'scale(' + value + ')';` });
  const dynamic = await scan();
  assert.equal(dynamic.valid, true, JSON.stringify(dynamic));
  assert.ok(warnings(dynamic).length > 0);
  assert.equal(errors(dynamic).length, 0);
  await writeFile(resolve(root, 'app/dom.ts'), `declare const el: HTMLElement; declare const value: number;
el.style.width = 'calc(12ch * ' + value + ')';`);
  const concrete = await scan();
  assert.equal(concrete.valid, false, JSON.stringify(concrete));
  assert.ok(errors(concrete).some(item => item.rule === 'literal-token' && item.source.includes('12ch')));
  assert.ok(!errors(concrete).some(item => item.rule === 'parse-error'));
});

test('one dynamic binding aggregates speculative prefix expansions but finite branches retain their values', async t => {
  const { config, scan } = await fixture(t, { 'app/app.ts': component(
    `<p [style.width]="'calc(12ch * '+value+')'">Dynamic arithmetic</p>`,
  ) });
  const report = await scan();
  const concrete = errors(report).filter(item => item.rule === 'literal-token' && item.message.includes('12ch'));
  assert.equal(concrete.length, 1, JSON.stringify(report));
  assert.ok(concrete[0].source.includes('[style.width]'));
  assert.ok(concrete[0].source.endsWith('width:(dynamic expression; fixed 12ch)'));
  config.checks!.exceptions = [{ file: concrete[0].file, rule: concrete[0].rule, source: concrete[0].source, reason: 'Data-driven arithmetic uses a justified character width', line: concrete[0].line, column: concrete[0].column }];
  assert.equal((await scan()).valid, true);
  const finite = await fixture(t, { 'app/app.ts': component(`<p [style.color]="condition ? 'red' : 'blue'">Finite alternatives</p>`) });
  const branches = errors(await finite.scan()).filter(item => item.rule === 'literal-token');
  assert.equal(branches.length, 2);
  assert.ok(branches.some(item => item.source.endsWith('color:red')));
  assert.ok(branches.some(item => item.source.endsWith('color:blue')));
});

test('dynamic bindings and unexpanded Sass report warnings; warning-only scans succeed', async t => {
  const { scan } = await fixture(t, {
    'app/app.ts': component('<p [style.color]="value" [class]="value">Dynamic</p>'),
    'app/style.scss': '.sass { color: $palette; @include surface(); }',
  });
  const report = await scan();
  assert.equal(report.valid, true, JSON.stringify(report));
  assert.equal(report.status, 'warnings');
  assert.ok(warnings(report).some(item => item.file === 'app/app.ts'));
  assert.ok(warnings(report).some(item => item.file === 'app/style.scss'));
});

test('native HTML, local Angular declarations and generated component declarations are permitted', async t => {
  const generated = `import {Component} from '@angular/core';
@Component({selector:'ui-approved',template:''}) export class Approved {}`;
  const { root, config } = await fixture(t, {
    'app/app.ts': `import {Component,Directive} from '@angular/core';
@Directive({selector:'[localMark]'}) export class LocalMark {}
@Component({selector:'local-card',template:''}) export class LocalCard {}
@Component({selector:'app-test',template:'<main><local-card localMark></local-card><ui-approved></ui-approved><button>Save</button></main>'}) export class App {}`,
  });
  const policy = createSourcePolicy(config, new Map([[`${config.output}/angular/approved.ts`, generated]]));
  assert.equal((await checkSources({ root, config, policy })).valid, true);
});

const foreign = `import * as i0 from '@angular/core';
export declare class ForeignCard { static ɵcmp: i0.ɵɵComponentDeclaration<ForeignCard, "foreign-card", never, {}, {}, never, never, true, never>; }
export declare class ForeignMark { static ɵdir: i0.ɵɵDirectiveDeclaration<ForeignMark, "[foreignMark]", never, {}, {}, never, never, true, never>; }
export declare class ForeignModule { static ɵmod: i0.ɵɵNgModuleDeclaration<ForeignModule, [typeof ForeignCard, typeof ForeignMark], never, [typeof ForeignCard, typeof ForeignMark]>; }`;

test('foreign Ivy component/directive and NgModule exports require module/public-export approvals', async t => {
  const files = {
    'node_modules/foreign-ui/package.json': JSON.stringify({ name: 'foreign-ui', types: 'index.d.ts' }),
    'node_modules/foreign-ui/index.d.ts': foreign,
    'app/reexports.ts': `export {ForeignCard as PublicCard,ForeignMark,ForeignModule} from 'foreign-ui';`,
    'app/app.ts': `import {Component} from '@angular/core'; import {PublicCard as Card,ForeignModule} from './reexports';
@Component({selector:'app-test',imports:[Card,ForeignModule],template:'<foreign-card foreignMark></foreign-card>'}) export class App {}`,
  };
  const denied = await fixture(t, files);
  const report = await denied.scan();
  assert.equal(report.valid, false, JSON.stringify(report));
  assert.ok(errors(report).some(item => item.rule === 'unapproved-component' && item.source.includes('foreign-card')));
  assert.ok(errors(report).some(item => item.rule === 'unapproved-component' && item.source.includes('foreignMark')));
  denied.config.checks!.approved_components = [
    { module: 'different-library', export: 'ForeignCard', reason: 'Matching export from a different library is insufficient' },
    { module: 'foreign-ui', export: 'DifferentMark', reason: 'Matching library with a different export is insufficient' },
  ];
  const wrongIdentity = await denied.scan();
  assert.equal(errors(wrongIdentity).filter(item => item.rule === 'unapproved-component').length, 2, JSON.stringify(wrongIdentity));
  const settings = checks();
  settings.approved_components = [
    { module: 'foreign-ui', export: 'ForeignCard', reason: 'Approved third-party card' },
    { module: 'foreign-ui', export: 'ForeignMark', reason: 'Approved third-party directive' },
  ];
  const allowed = await fixture(t, files, settings);
  const approvedReport = await allowed.scan();
  assert.equal(approvedReport.valid, true, JSON.stringify(approvedReport));
});

test('asterisk microsyntax matches foreign structural directive selectors without passing AST values to CSS selectors', async t => {
  const { config, scan } = await fixture(t, {
    'node_modules/foreign-ui/package.json': JSON.stringify({ name: 'foreign-ui', types: 'index.d.ts' }),
    'node_modules/foreign-ui/index.d.ts': `import * as i0 from '@angular/core';
export declare class ForeignRepeat { static ɵdir: i0.ɵɵDirectiveDeclaration<ForeignRepeat, "[foreignRepeat][foreignRepeatOf]", never, {foreignRepeatOf:"foreignRepeatOf"}, {}, never, never, true, never>; }`,
    'app/app.ts': `import {Component} from '@angular/core'; import {ForeignRepeat} from 'foreign-ui';
@Component({selector:'app-test',imports:[ForeignRepeat],template:'<p *foreignRepeat="let row of rows">{{row}}</p>'}) export class App { rows = ['First']; }`,
  });
  const denied = await scan();
  assert.equal(denied.valid, false, JSON.stringify(denied));
  assert.ok(errors(denied).some(item => item.rule === 'unapproved-component' && item.source.includes('*foreignRepeat')));
  assert.ok(!errors(denied).some(item => item.rule === 'parse-error'));
  config.checks!.approved_components = [{ module: 'foreign-ui', export: 'ForeignRepeat', reason: 'Reviewed structural collection directive' }];
  const approved = await scan();
  assert.equal(approved.valid, true, JSON.stringify(approved));
});

test('Angular common/forms NgModules permit their exported builtins, structural directives and ng-container', async t => {
  const { root, scan } = await fixture(t, {
    'app/app.ts': `import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule,ReactiveFormsModule,FormControl} from '@angular/forms';
@Component({selector:'app-test',imports:[CommonModule,FormsModule,ReactiveFormsModule],template:'<ng-container *ngIf="shown"><p *ngFor="let row of rows">{{row}}</p><input [(ngModel)]="name"><input [formControl]="control"></ng-container>'})
export class App { shown = true; rows = ['First']; name = ''; control = new FormControl(''); }`,
  });
  await symlink(resolve(repository, 'node_modules'), resolve(root, 'node_modules'));
  const report = await scan();
  assert.equal(report.valid, true, JSON.stringify(report));
  assert.ok(report.checked > 1, JSON.stringify(report));
  assert.ok(!report.diagnostics.some(item => item.rule === 'unapproved-component'));
});

test('reasoned exact exceptions suppress one matching violation and reject stale/ambiguous matches', async t => {
  const { config, root, scan } = await fixture(t, { 'app/style.css': '.chart { color: #abc; }' });
  const original = (await scan()).diagnostics.find(item => item.rule === 'literal-token');
  assert.ok(original);
  config.checks!.exceptions = [{ file: original.file, rule: original.rule, source: original.source, reason: 'Color encodes an externally defined data series' }];
  const accepted = await scan();
  assert.equal(accepted.valid, true, JSON.stringify(accepted));
  assert.equal(accepted.exceptions.length, 1);
  await writeFile(resolve(root, 'app/style.css'), '.chart { color: #abc; }\n.other { color: #abc; }');
  const distinct = await scan();
  assert.equal(distinct.valid, false);
  assert.equal(distinct.exceptions.length, 1);
  assert.ok(errors(distinct).some(item => item.rule === 'literal-token' && item.source.includes('.other')));
  assert.ok(!errors(distinct).some(item => item.rule === 'exception-error'));
  await writeFile(resolve(root, 'app/style.css'), '.chart { color: var(--ui-color-text); }');
  const stale = await scan();
  assert.ok(errors(stale).some(item => item.rule === 'exception-error'), JSON.stringify(stale));
  await writeFile(resolve(root, 'app/style.css'), '.chart { color: #abc; }\n.chart { color: #abc; }');
  const ambiguous = await scan();
  assert.ok(errors(ambiguous).some(item => item.rule === 'exception-error'), JSON.stringify(ambiguous));
});

test('exceptions cannot hide parser failures or suppress the same finding twice', async t => {
  const { config, root, scan } = await fixture(t, { 'app/style.css': '.chart { color: #abc; }' });
  const finding = (await scan()).diagnostics.find(item => item.rule === 'literal-token');
  assert.ok(finding);
  const exception = { file: finding.file, rule: finding.rule, source: finding.source, reason: 'Data series color' };
  config.checks!.exceptions = [exception, { ...exception, reason: 'Duplicated exception' }];
  const duplicate = await scan();
  assert.equal(duplicate.valid, false);
  assert.ok(errors(duplicate).some(item => item.rule === 'exception-error'));
  await writeFile(resolve(root, 'app/style.css'), '.chart { color: #abc;');
  config.checks!.exceptions = [{ file: 'app/style.css', rule: 'parse-error', source: '.chart', reason: 'Parser failure is not suppressible' }];
  const syntax = await scan();
  assert.equal(syntax.valid, false);
  assert.ok(errors(syntax).some(item => item.rule === 'parse-error'));
  assert.ok(errors(syntax).some(item => item.rule === 'exception-error'));
});

test('optional exception coordinates disambiguate repeated sources and reject stale positions', async t => {
  for (const css of ['.chart { color: #abc; }\n.chart { color: #abc; }', '.chart { color: #abc; } .chart { color: #abc; }']) {
    const { config, scan } = await fixture(t, { 'app/style.css': css });
    const original = await scan();
    const findings = errors(original).filter(item => item.rule === 'literal-token');
    assert.equal(findings.length, 2);
    assert.equal(findings[0].source, findings[1].source);
    const exception = { file: findings[0].file, rule: findings[0].rule, source: findings[0].source, reason: 'Reviewed the first data-series occurrence' };
    config.checks!.exceptions = [exception];
    const ambiguous = await scan();
    assert.ok(errors(ambiguous).some(item => item.rule === 'exception-error'));
    config.checks!.exceptions = [{ ...exception, line: findings[0].line, column: findings[0].column }];
    const exact = await scan();
    assert.equal(exact.exceptions.length, 1, JSON.stringify(exact));
    assert.equal(exact.exceptions[0].line, findings[0].line);
    assert.equal(exact.exceptions[0].column, findings[0].column);
    assert.equal(errors(exact).filter(item => item.rule === 'literal-token').length, 1);
    assert.ok(!errors(exact).some(item => item.rule === 'exception-error'));
    config.checks!.exceptions = [{ ...exception, line: findings[0].line, column: 999 }];
    const stale = await scan();
    assert.ok(errors(stale).some(item => item.rule === 'exception-error'));
  }
});

test('unsupported application expressions are never executed while scanning', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `import {Component} from '@angular/core';
const TEMPLATE = (() => { throw new Error('Application evaluation must not run'); })();
@Component({selector:'app-test',template:TEMPLATE}) export class App {}` });
  const report = await scan();
  assert.equal(report.valid, true, JSON.stringify(report));
  assert.ok(warnings(report).some(item => item.rule === 'unresolved'));
});

test('missing and empty source roots, missing external resources and malformed input fail closed', async t => {
  const cases: Record<string, Record<string, string>> = {
    missing: {},
    empty: { 'app/readme.md': 'No inspectable sources' },
    external: { 'app/app.ts': `import {Component} from '@angular/core'; @Component({selector:'app-test',templateUrl:'./missing.html'}) export class App {}` },
    css: { 'app/style.css': '.bad { color: #abc;' },
    ts: { 'app/app.ts': '@Component({ template: ' },
    html: { 'app/view.html': '<p><span></p>' },
  };
  for (const [name, files] of Object.entries(cases)) {
    await t.test(name, async tt => {
      const { scan } = await fixture(tt, files);
      const report = await scan();
      assert.equal(report.valid, false, JSON.stringify(report));
      assert.ok(errors(report).length > 0);
    });
  }
});

test('symlink sources and external resource escapes are rejected', async t => {
  const { root, scan } = await fixture(t, { 'app/app.ts': component('Safe') });
  await writeFile(resolve(root, 'outside.css'), '.outside { color: #abc; }');
  await symlink(resolve(root, 'outside.css'), resolve(root, 'app/link.css'));
  const linked = await scan();
  assert.equal(linked.valid, false, JSON.stringify(linked));
  assert.ok(errors(linked).some(item => item.rule === 'source-error'));
  await rm(resolve(root, 'app/link.css'));
  await writeFile(resolve(root, 'app/app.ts'), `import {Component} from '@angular/core'; @Component({selector:'app-test',templateUrl:'../../outside.html'}) export class App {}`);
  const escaped = await scan();
  assert.equal(escaped.valid, false, JSON.stringify(escaped));
});

test('tsconfig extends cannot read outside the root or through a nested source symlink', async t => {
  const outside = await mkdtemp(resolve(tmpdir(), 'ui-config-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const outsideConfig = resolve(outside, 'base.json');
  await writeFile(outsideConfig, JSON.stringify({ compilerOptions: { target: 'ES2022' } }));
  const previousRead = ts.sys.readFile, previousFsRead = fsSync.readFileSync; const outsideReads: string[] = []; const aliasPaths = new Set<string>();
  ts.sys.readFile = (file, encoding) => { if (resolve(file) === outsideConfig) outsideReads.push(file); return previousRead(file, encoding); };
  fsSync.readFileSync = new Proxy(previousFsRead, { apply(target, receiver, args) { if (typeof args[0] === 'string' && (resolve(args[0]) === outsideConfig || aliasPaths.has(resolve(args[0])))) outsideReads.push(args[0]); return Reflect.apply(target, receiver, args); } });
  t.after(() => { ts.sys.readFile = previousRead; fsSync.readFileSync = previousFsRead; });
  const settings = checks(); settings.tsconfig = 'tsconfig.json';
  const direct = await fixture(t, { 'app/app.ts': 'export const value = true;', 'tsconfig.json': '{}' }, settings);
  await writeFile(resolve(direct.root, 'tsconfig.json'), JSON.stringify({ extends: relative(direct.root, outsideConfig) }));
  const denied = await direct.scan();
  assert.equal(denied.valid, false, JSON.stringify(denied));
  assert.ok(errors(denied).some(item => item.rule === 'source-error'));
  assert.deepEqual(outsideReads, []);
  const nested = await fixture(t, {
    'app/app.ts': 'export const value = true;',
    'tsconfig.json': JSON.stringify({ extends: './configs/base.json' }),
    'configs/base.json': JSON.stringify({ extends: './linked.json' }),
  }, settings);
  aliasPaths.add(resolve(nested.root, 'configs/linked.json'));
  await symlink(outsideConfig, resolve(nested.root, 'configs/linked.json'));
  const linked = await nested.scan();
  assert.equal(linked.valid, false, JSON.stringify(linked));
  assert.ok(errors(linked).some(item => item.rule === 'source-error'));
  assert.deepEqual(outsideReads, []);
});

test('explicit TypeScript resolution options outside the root fail before reading outside source', async t => {
  const outside = await mkdtemp(resolve(tmpdir(), 'ui-resolution-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const outsideSource = resolve(outside, 'outside.ts'); await writeFile(outsideSource, 'export const value = true;');
  const previousFsRead = fsSync.readFileSync; const outsideReads: string[] = [];
  fsSync.readFileSync = new Proxy(previousFsRead, { apply(target, receiver, args) { if (typeof args[0] === 'string' && resolve(args[0]) === outsideSource) outsideReads.push(args[0]); return Reflect.apply(target, receiver, args); } });
  t.after(() => { fsSync.readFileSync = previousFsRead; });
  for (const options of [{ baseUrl: outside }, { typeRoots: [outside] }, { paths: { external: [outsideSource] } }]) {
    const settings = checks(); settings.tsconfig = 'tsconfig.json';
    const { scan } = await fixture(t, { 'app/app.ts': 'export const value = true;', 'tsconfig.json': JSON.stringify({ compilerOptions: options }) }, settings);
    const report = await scan();
    assert.equal(report.valid, false, JSON.stringify(report));
    assert.ok(errors(report).some(item => item.rule === 'source-error'));
  }
  assert.deepEqual(outsideReads, []);
});

test('TypeScript import resolution denies outside application source before reading its contents', async t => {
  const outside = await mkdtemp(resolve(tmpdir(), 'ui-source-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const outsideSource = resolve(outside, 'outside.ts');
  await writeFile(outsideSource, `export const CSS = '.outside { color: #abc; }';`);
  const previousRead = ts.sys.readFile, previousFsRead = fsSync.readFileSync; const outsideReads: string[] = []; const aliasPaths = new Set<string>();
  ts.sys.readFile = (file, encoding) => { if (resolve(file) === outsideSource) outsideReads.push(file); return previousRead(file, encoding); };
  fsSync.readFileSync = new Proxy(previousFsRead, { apply(target, receiver, args) { if (typeof args[0] === 'string' && (resolve(args[0]) === outsideSource || aliasPaths.has(resolve(args[0])))) outsideReads.push(args[0]); return Reflect.apply(target, receiver, args); } });
  t.after(() => { ts.sys.readFile = previousRead; fsSync.readFileSync = previousFsRead; });
  const { root, scan } = await fixture(t, { 'app/app.ts': '' });
  const sourceImport = relative(resolve(root, 'app'), outsideSource);
  await writeFile(resolve(root, 'app/app.ts'), `import {CSS} from ${JSON.stringify(sourceImport)}; export const value = CSS;`);
  const report = await scan();
  assert.equal(report.valid, false, JSON.stringify(report));
  assert.ok(errors(report).some(item => item.rule === 'source-error'));
  assert.deepEqual(outsideReads, []);
  await mkdir(resolve(root, 'shared'));
  await writeFile(resolve(root, 'shared/bridge.ts'), `export {CSS} from ${JSON.stringify(relative(resolve(root, 'shared'), outsideSource))};`);
  await writeFile(resolve(root, 'app/app.ts'), `import {CSS} from '../shared/bridge'; export const value = CSS;`);
  const transitive = await scan();
  assert.equal(transitive.valid, false, JSON.stringify(transitive));
  assert.ok(errors(transitive).some(item => item.rule === 'source-error'));
  assert.deepEqual(outsideReads, []);
  const linkedSource = resolve(root, 'shared/linked.ts'); aliasPaths.add(linkedSource);
  await symlink(outsideSource, linkedSource);
  await writeFile(resolve(root, 'app/app.ts'), `import {CSS} from '../shared/linked'; export const value = CSS;`);
  const linked = await scan();
  assert.equal(linked.valid, false, JSON.stringify(linked));
  assert.ok(errors(linked).some(item => item.rule === 'source-error'));
  assert.deepEqual(outsideReads, []);
});

test('installed JavaScript dependency entries are readable metadata but cannot link outside their dependency root', async t => {
  const settings = checks(); settings.tsconfig = 'tsconfig.json';
  const { root, scan } = await fixture(t, {
    'tsconfig.json': JSON.stringify({ compilerOptions: { allowJs: true, maxNodeModuleJsDepth: 1, module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2022' } }),
    'app/app.ts': `import {value} from 'plain-js'; export const output = value;`,
    'node_modules/plain-js/package.json': JSON.stringify({ name: 'plain-js', main: './index.js' }),
    'node_modules/plain-js/index.js': `exports.value = true; throw new Error('Dependency code must not execute');`,
  }, settings);
  const entry = resolve(root, 'node_modules/plain-js/index.js');
  const canonicalEntry = fsSync.realpathSync(entry);
  const initialRead = fsSync.readFileSync; const metadataReads: string[] = [];
  fsSync.readFileSync = new Proxy(initialRead, { apply(target, receiver, args) { if (typeof args[0] === 'string' && [entry, canonicalEntry].includes(resolve(args[0]))) metadataReads.push(args[0]); return Reflect.apply(target, receiver, args); } });
  try { assert.equal((await scan()).valid, true); assert.ok(metadataReads.length > 0); } finally { fsSync.readFileSync = initialRead; }
  const outside = await mkdtemp(resolve(tmpdir(), 'ui-dependency-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const outsideSource = resolve(outside, 'outside.js'); await writeFile(outsideSource, 'exports.value = true;');
  const canonicalOutsideSource = fsSync.realpathSync(outsideSource);
  await rm(entry); await symlink(outsideSource, entry);
  const previousFsRead = fsSync.readFileSync; const outsideReads: string[] = [];
  fsSync.readFileSync = new Proxy(previousFsRead, { apply(target, receiver, args) { if (typeof args[0] === 'string' && [outsideSource, canonicalOutsideSource, entry, canonicalEntry].includes(resolve(args[0]))) outsideReads.push(args[0]); return Reflect.apply(target, receiver, args); } });
  t.after(() => { fsSync.readFileSync = previousFsRead; });
  const report = await scan();
  assert.equal(report.valid, false, JSON.stringify(report));
  assert.ok(errors(report).some(item => item.rule === 'source-error'));
  assert.deepEqual(outsideReads, []);
});

test('legacy configuration explicitly reports static checks as not configured', async t => {
  const { root, config } = await fixture(t, { 'app/style.css': '.bad { color: #abc; }' });
  delete config.checks;
  const report = await checkSources({ root, config, policy: createSourcePolicy(config) });
  assert.equal(report.status, 'not_configured');
  assert.equal(report.valid, true);
  assert.equal(report.files, 0);
});

test('component class approvals respect inline/external encapsulation and explicit global styles', async t => {
  const css = '.bg-red-500 { background: var(--ui-color-surface); }';
  const source = (styles: string, mode = '', secondStyles = '') => `import {Component,ViewEncapsulation} from '@angular/core';
@Component({selector:'first-view',template:'<p class="bg-red-500" data-owner="first"></p>',${styles}${mode}}) export class First {}
@Component({selector:'second-view',template:'<p class="bg-red-500" data-owner="second"></p>'${secondStyles}}) export class Second {}`;
  for (const [name, style, mode, extra, valid] of [
    ['inline emulated', `styles:[${JSON.stringify(css)}]`, '', {}, false],
    ['inline shadow', `styles:[${JSON.stringify(css)}]`, ',encapsulation:ViewEncapsulation.ShadowDom', {}, false],
    ['external emulated', `styleUrl:'./scoped.css'`, '', { 'app/scoped.css': css }, false],
    ['external shadow', `styleUrl:'./scoped.css'`, ',encapsulation:ViewEncapsulation.ShadowDom', { 'app/scoped.css': css }, false],
    ['inline None', `styles:[${JSON.stringify(css)}]`, ',encapsulation:ViewEncapsulation.None', {}, true],
    ['external None', `styleUrl:'./scoped.css'`, ',encapsulation:ViewEncapsulation.None', { 'app/scoped.css': css }, true],
    ['global source CSS', 'styles:[]', '', { 'app/global.css': css }, true],
  ] as Array<[string, string, string, Record<string, string>, boolean]>) {
    await t.test(name, async tt => {
      const { scan } = await fixture(tt, { 'app/app.ts': source(style, mode), ...extra });
      const report = await scan(); assert.equal(report.valid, valid, JSON.stringify(report));
      if (!valid) { assert.ok(errors(report).some(item => item.source.includes('data-owner="second"'))); assert.ok(!errors(report).some(item => item.source.includes('data-owner="first"'))); }
    });
  }
  const shared = await fixture(t, { 'app/app.ts': source(`styleUrl:'./scoped.css'`, '', `,styleUrl:'./scoped.css'`), 'app/scoped.css': css });
  assert.equal((await shared.scan()).valid, true);
  const mixed = await fixture(t, { 'app/app.ts': source(`styleUrl:'./scoped.css'`, '', `,styleUrl:'./scoped.css',encapsulation:ViewEncapsulation.None`) + `\n@Component({selector:'third-view',template:'<p class="bg-red-500"></p>'}) export class Third {}`, 'app/scoped.css': css });
  assert.equal((await mixed.scan()).valid, true);
  const unknown = await fixture(t, { 'app/app.ts': source(`styles:[${JSON.stringify(css)}]`, ',encapsulation:getMode()') });
  const unknownReport = await unknown.scan(); assert.equal(unknownReport.valid, false); assert.ok(warnings(unknownReport).some(item => item.message.includes('encapsulation')));
});

test('component-local classes apply to bindings, host bindings and owned DOM writes but not sibling/free-function sinks', async t => {
  const source = `import {Component,HostBinding} from '@angular/core';
@Component({selector:'owner-view',template:${JSON.stringify(`<p [class.bg-red-500]="true" [ngClass]="['bg-red-500']"></p>`)},styles:['.bg-red-500{background:var(--ui-color-surface)}'],host:{class:'bg-red-500'}})
export class Owner { @HostBinding('attr.class') classes='bg-red-500'; paint(el:HTMLElement) { el.setAttribute('class','bg-red-500'); } }
@Component({selector:'other-view',template:'<p [class.bg-red-500]="true" data-owner="other"></p>',host:{class:'bg-red-500'}})
export class Other { @HostBinding('attr.class') classes='bg-red-500'; paint(el:HTMLElement) { el.setAttribute('class','bg-red-500'); } }
export function outside(el:HTMLElement) { el.setAttribute('class','bg-red-500'); }`;
  const { scan } = await fixture(t, { 'app/app.ts': source }); const report = await scan();
  assert.equal(report.valid, false); assert.ok(errors(report).length >= 5, JSON.stringify(report));
  assert.ok(!errors(report).some(item => item.line === 2 || item.line === 3), JSON.stringify(report));
});

test('false class expressions do not apply classes while unresolved object entries remain inspected', async t => {
  const inactive = await fixture(t, { 'app/app.ts': component(`<p [class.p-4]="false" [ngClass]="{'p-4':false,'text-red-500':null,'rounded-2xl':0,'m-4':''}"></p>`) });
  assert.equal((await inactive.scan()).valid, true);
  const unknown = await fixture(t, { 'app/app.ts': component(`<p [ngClass]="{'p-4':value}"></p>`) });
  const report = await unknown.scan(); assert.equal(report.valid, false); assert.ok(warnings(report).length > 0);
});

test('definite short circuits and constant conditionals do not apply unreachable classes', async t => {
  const inactive = await fixture(t, { 'app/app.ts': component(`<p [class]="false && 'p-4'" [ngClass]="false ?? 'p-4'"></p><p [class]="true ? 'local' : 'p-4'"></p><p [class]="!true && 'p-4'"></p>`) });
  assert.equal((await inactive.scan()).valid, true);
  const dom = await fixture(t, { 'app/dom.ts': `export {}; declare const el:HTMLElement; const inactive=false && 'p-4'; const absent=false ?? 'p-4'; const safe=true ? 'local' : 'p-4'; el.setAttribute('class',inactive); el.setAttribute('class',absent); el.setAttribute('class',safe);` });
  assert.equal((await dom.scan()).valid, true);
  const active = await fixture(t, { 'app/app.ts': component(`<p [class]="true && 'p-4'"></p><p [class]="false || 'p-4'"></p><p [class]="null ?? 'p-4'"></p><p [class]="value && 'p-4'"></p>`) });
  const report = await active.scan(); assert.equal(report.valid, false); assert.equal(errors(report).length, 4); assert.ok(warnings(report).length > 0);
});

test('DOM style operations inspect every finite property name and preserve unresolved names', async t => {
  const { scan } = await fixture(t, { 'app/dom.ts': `import {Renderer2} from '@angular/core'; export {}; declare const flag:boolean, el:HTMLElement;
const property=flag?'display':'color';
el.style.setProperty(property,'red');
el.style[property]='red';
function paint(renderer:Renderer2){renderer.setStyle(el,property,'red');}
const dynamic=flag?'padding':getProperty(); el.style.setProperty(dynamic,'12px');` });
  const report = await scan(); assert.equal(report.valid, false);
  assert.equal(errors(report).filter(item => item.source === 'color:red').length, 3, JSON.stringify(report));
  assert.ok(errors(report).some(item => item.source === 'padding:12px'));
  assert.equal(warnings(report).filter(item => item.message.includes('property')).length, 1, JSON.stringify(report));
});

test('readonly false HostBinding classes remain inactive', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `import {Component,HostBinding} from '@angular/core'; @Component({selector:'app-test',template:''}) export class App { @HostBinding('class.p-4') readonly active=false; }` });
  assert.equal((await scan()).valid, true);
});

test('undefined is nullish for class/style fallbacks and clears direct bindings', async t => {
  const denied = await fixture(t, { 'app/app.ts': component(`<p [class]="undefined ?? 'p-4'" [style]="undefined ?? 'color:red'"></p>`) });
  const report = await denied.scan(); assert.equal(report.valid, false); assert.equal(errors(report).length, 2);
  const allowed = await fixture(t, { 'app/app.ts': component(`<p [class]="undefined" [style.color]="undefined"></p>`) });
  assert.equal((await allowed.scan()).valid, true);
  const dom = await fixture(t, { 'app/dom.ts': `export {};declare const el:HTMLElement;const property=undefined ?? 'color';el.style.setProperty(property,'red');` });
  assert.equal((await dom.scan()).valid, false);
  const shadow = await fixture(t, { 'app/dom.ts': `export {};declare const el:HTMLElement;const undefined='p-4';el.setAttribute('class',undefined ?? 'local');` });
  assert.equal((await shadow.scan()).valid, false);
});

test('computed cssText keys inspect the stylesheet just like dot assignments', async t => {
  const { scan } = await fixture(t, { 'app/dom.ts': `export {};declare const el:HTMLElement;const name='cssText';el.style['cssText']='color:red';el.style[name]='padding:12px';` });
  const report = await scan(); assert.equal(report.valid, false); assert.equal(errors(report).length, 2, JSON.stringify(report));
});

test('confirmed Angular pipes from aliases, namespaces, reexports and Ivy metadata are non-UI imports', async t => {
  const core = `export declare function Component(value:any):ClassDecorator; export declare function Pipe(value:any):ClassDecorator; export type ɵɵPipeDeclaration<T,N extends string,S extends boolean> = {};`;
  const { scan } = await fixture(t, {
    'node_modules/@angular/core/package.json': JSON.stringify({ name: '@angular/core', types: 'index.d.ts' }),
    'node_modules/@angular/core/index.d.ts': core,
    'node_modules/foreign-pipes/package.json': JSON.stringify({ name: 'foreign-pipes', types: 'index.d.ts' }),
    'node_modules/foreign-pipes/index.d.ts': `import * as i0 from '@angular/core'; export declare class IvyPipe { static ɵpipe:i0.ɵɵPipeDeclaration<IvyPipe,'ivy',true>; }`,
    'app/decorators.ts': `export {Pipe as ReexportedPipe} from '@angular/core';`,
    'app/app.ts': `import {Component,Pipe as Decorate} from '@angular/core'; import * as ng from '@angular/core'; import {ReexportedPipe} from './decorators'; import {IvyPipe} from 'foreign-pipes';
@Decorate({name:'aliased',standalone:true}) export class Aliased {}
@ng.Pipe({name:'namespaced',standalone:true}) export class Namespaced {}
@ReexportedPipe({name:'reexported',standalone:true}) export class Reexported {}
export class Unknown { static ɵpipe = 'business'; }
@Component({selector:'app-test',template:'',imports:[Aliased,Namespaced,Reexported,IvyPipe,Unknown]}) export class App {}`,
  });
  const report = await scan(); assert.equal(report.valid, true); const metadataWarnings = warnings(report).filter(item => item.message.includes('Imported Angular'));
  assert.equal(metadataWarnings.length, 1, JSON.stringify(report)); assert.ok(metadataWarnings[0].source.startsWith('Unknown'));
});

test('DOM style and Renderer2 guards use native member provenance instead of business type names', async t => {
  const business = await fixture(t, { 'app/business.ts': `export class CSSStyleDeclaration { color='business'; cssText='business'; setProperty(name:string,value:string) { return name+value; } }
const record=new CSSStyleDeclaration(); record.color='red'; record.cssText='padding:12px'; record.setProperty('padding','12px');
const renderer={setStyle(el:HTMLElement,name:string,value:string){return name+value;}};
export function update(el:HTMLElement){ renderer.setStyle(el,'color','red'); }` });
  assert.equal((await business.scan()).valid, true);
  const native = await fixture(t, { 'app/native.ts': `export {}; type Alias=CSSStyleDeclaration; class Derived extends CSSStyleDeclaration {}
function paint(el:HTMLElement, style:Alias|CSSStyleProperties, derived:Derived){ el.style.color='red'; style.setProperty('padding','12px'); derived.color='blue'; }` });
  const report = await native.scan(); assert.equal(report.valid, false); assert.ok(errors(report).length >= 3, JSON.stringify(report));
});

test('nested decorated declarations are inspected and native dimensions do not inspect business Angular inputs', async t => {
  const nested = await fixture(t, { 'app/app.ts': `import {Component} from '@angular/core'; export function factory(){ @Component({selector:'nested-view',template:'',styles:['a{color:red}']}) class Nested {} return Nested; }` });
  assert.equal((await nested.scan()).valid, false);
  const native = await fixture(t, { 'app/app.ts': component(`<img width="200"><svg [attr.height]="50"></svg>`) });
  const report = await native.scan(); assert.equal(report.valid, false); assert.ok(errors(report).some(item => item.source.includes('width:200'))); assert.ok(errors(report).some(item => item.source.includes('height:50')));
  const structural = await fixture(t, { 'app/app.ts': `import {Component,Directive,Input} from '@angular/core';
@Directive({selector:'[businessSizing]'}) export class Business { @Input() width=0; }
@Component({selector:'custom-view',template:''}) export class Custom { @Input() width=0; }
@Component({selector:'app-test',imports:[Business,Custom],template:'<img width="100%"><svg height="0"></svg><custom-view [width]="200"></custom-view><img businessSizing [width]="200">'}) export class App {}` });
  assert.equal((await structural.scan()).valid, true);
});

test('foreign static class selectors match Angular compiler conditions, not runtime class bindings', async t => {
  const files = {
    'node_modules/foreign-ui/package.json': JSON.stringify({ name: 'foreign-ui', types: 'index.d.ts' }),
    'node_modules/foreign-ui/index.d.ts': `import * as i0 from '@angular/core'; export declare class Mark { static ɵdir:i0.ɵɵDirectiveDeclaration<Mark,'.foreign',never,{}, {},never,never,true,never>; }`,
    'app/app.ts': `import {Component} from '@angular/core'; import {Mark} from 'foreign-ui'; @Component({selector:'app-test',imports:[Mark],template:'<p class="foreign"></p>'}) export class App {}`,
  };
  const { root, scan } = await fixture(t, files); assert.equal((await scan()).valid, false);
  await writeFile(resolve(root, 'app/app.ts'), `import {Component} from '@angular/core'; import {Mark} from 'foreign-ui'; @Component({selector:'app-test',imports:[Mark],template:'<p [class.foreign]="true"></p>'}) export class App {}`);
  assert.equal((await scan()).valid, true);
});
