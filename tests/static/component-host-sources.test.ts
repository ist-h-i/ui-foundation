import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
const dimension = '.consumer{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}';
const divider = ':host::before{border-block-start:var(--ui-border-control) var(--local-columns) var(--ui-color-border)}';
async function scan(body: string, files: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-component-sources-'));
  try {
    await mkdir(resolve(root, 'app'));
    for (const [name, text] of Object.entries({ 'app.ts': `import{Component,Directive,ViewEncapsulation}from'@angular/core';${body}\nthrow new Error('Application must never execute');`, ...files })) await writeFile(resolve(root, 'app', name), text);
    const input = parseConfig(example);
    input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
    const config = resolveConfig(input);
    return await checkSources({ root, config, policy: createSourcePolicy(config) });
  } finally { await rm(root, { recursive: true, force: true }); }
}
function app(template: string, styles: string[], childStyles = [dimension], childTemplate = '<table class="consumer" style="--end:17px"></table>', extra = '', childMetadata = '') {
  return `${extra}@Component({selector:'app-child',template:${JSON.stringify(childTemplate)},styles:${JSON.stringify(childStyles)}${childMetadata}})class Child{}
@Component({selector:'app-parent',imports:[Child${extra ? ',Supply' : ''}],template:${JSON.stringify(template)},styles:${JSON.stringify(styles)}})class Parent{flag!:boolean}`;
}
const concrete = (report: Awaited<ReturnType<typeof scan>>, value = '19px') => report.diagnostics.some(d => d.rule === 'literal-token' && d.message.includes(`Concrete value ${value} `));
const unknown = (report: Awaited<ReturnType<typeof scan>>) => assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), JSON.stringify(report));

for (const [name, template, styles, bad] of [
  ['ancestor CSS', '<section class="parent"><app-child></app-child></section>', ['.parent{--local-columns:19px}'], true],
  ['ancestor inline', '<section style="--local-columns:19px"><app-child></app-child></section>', [], true],
  ['ancestor binding', '<section [style.--local-columns]="flag ? \'19px\' : \'3\'"><app-child></app-child></section>', [], true],
  ['same element parent CSS', '<app-child class="receiving"></app-child>', ['app-child.receiving{--local-columns:19px}'], true],
  ['unrelated ancestor', '<section class="parent"></section><app-child></app-child>', ['.parent{--local-columns:19px}'], false],
  ['parent stylesheet cannot style child internals', '<app-child></app-child>', ['.consumer{--local-columns:19px}'], false],
  ['template lexical ancestor', '<section class="parent"><ng-template><app-child></app-child></ng-template></section>', ['.parent{--local-columns:19px}'], false],
  ['transparent container', '<section class="parent"><ng-container><app-child></app-child></ng-container></section>', ['.parent{--local-columns:19px}'], true],
  ['registered inheritance barrier', '<section class="parent"><app-child></app-child></section>', ['.parent{--local-columns:19px}', '@property --local-columns{syntax:"*";inherits:false;initial-value:3}'], false],
] as [string, string, string[], boolean][]) test(`component host supply: ${name}`, async () => {
  const report = await scan(app(template, styles));
  assert.equal(concrete(report), bad, JSON.stringify(report));
  assert.equal(report.valid, !bad, JSON.stringify(report));
  unknown(report);
});

test('parent computed aliases keep parent dependencies across child host and pseudo consumers', async () => {
  for (const childStyles of [[dimension], [divider], [divider.replace('border-block-start', 'border-inline-start')]]) for (const bad of [false, true]) {
    const report = await scan(app(`<section class="parent" style="--end:${bad ? '19px' : '0'}"><app-child style="--end:17px"></app-child></section>`, ['.parent{--local-columns:var(--end)}'], childStyles));
    assert.equal(concrete(report), bad, JSON.stringify(report));
    assert.ok(!concrete(report, '17px'), JSON.stringify(report));
    unknown(report);
  }
});

test('same physical host resolves parent CSS dependencies without borrowing child internals', async () => {
  for (const bad of [false, true]) {
    const report = await scan(app(`<app-child class="receiving" style="--local-columns:var(--end)"></app-child>`, [`app-child.receiving{--end:${bad ? '19px' : '0'}}`]));
    assert.equal(concrete(report), bad, JSON.stringify(report));
    assert.ok(!concrete(report, '17px'), JSON.stringify(report)); unknown(report);
  }
});

test('coapplied directive values flow across the receiving host only', async () => {
  const supply = `@Directive({selector:'[supply]',host:{style:'--local-columns:var(--end)'}})class Supply{}`;
  for (const bad of [false, true]) {
    const report = await scan(app(`<section supply style="--end:${bad ? '19px' : '0'}"><app-child></app-child></section>`, [], [dimension], undefined, supply));
    assert.equal(concrete(report), bad, JSON.stringify(report));
    assert.ok(!concrete(report, '17px'), JSON.stringify(report)); unknown(report);
  }
});

test('parent instances remain distinct through a child template shared by both', async () => {
  for (const bad of [false, true]) {
    const source = app('<section class="parent"><app-child></app-child></section>', ['.parent{--local-columns:var(--bridge)}']);
    const report = await scan(`${source}@Component({selector:'app-root',imports:[Parent],template:'<app-parent style="--bridge:var(--end);--end:${bad ? '19px' : '0'}"></app-parent><app-parent style="--bridge:0;--end:17px"></app-parent>'})class Root{}`);
    assert.equal(concrete(report), bad, JSON.stringify(report));
    assert.ok(!concrete(report, '17px'), JSON.stringify(report)); unknown(report);
  }
});

test('CSS supply crosses ShadowDom hosts without applying parent scoped rules to internals', async () => {
  for (const bad of [false, true]) {
    const report = await scan(app('<section class="parent"><app-child></app-child></section>', [bad ? '.parent{--local-columns:19px}' : '.consumer{--local-columns:19px}'], [dimension], undefined, '', ',encapsulation:ViewEncapsulation.ShadowDom'));
    assert.equal(concrete(report), bad, JSON.stringify(report)); unknown(report);
  }
});

test('external parent SCSS and global ancestor candidates preserve their compute origin', async () => {
  for (const external of [false, true]) {
    const source = app('<section class="parent" style="--end:19px"><app-child></app-child></section>', []);
    const report = await scan(external ? source.replace('styles:[]})class Parent', "styles:[],styleUrl:'writer.scss'})class Parent") : source,
      external ? { 'writer.scss': '.parent{--local-columns:var(--end)}' } : { 'global.css': '.parent{--local-columns:var(--end)}' });
    assert.ok(concrete(report), JSON.stringify(report));
    assert.ok(!concrete(report, '17px'), JSON.stringify(report)); unknown(report);
  }
});

test('cross-host inheritance does not combine mutually exclusive parent class facts', async () => {
  for (const combined of [false, true]) {
    const classes = combined ? "flag ? 'left right' : 'none'" : "flag ? 'left' : 'right'";
    const report = await scan(app(`<section class="parent" [class]="${classes}" style="--end:0"><app-child></app-child></section>`, ['.parent.left{--local-columns:var(--end)}']), { 'global.css': '.parent.right{--end:19px}' });
    assert.equal(concrete(report), combined, JSON.stringify(report));
    assert.ok(!concrete(report, '17px'), JSON.stringify(report)); unknown(report);
  }
});

test('recursive component supply graphs stop without mixing sibling values or executing code', async () => {
  const report = await scan(`@Component({selector:'app-recursive',imports:[Recursive],template:'<app-recursive></app-recursive><table class="consumer"></table>',styles:[${JSON.stringify(dimension)}]})class Recursive{}`);
  assert.equal(report.valid, true, JSON.stringify(report)); unknown(report);
});

test('an absent parent writer does not invalidate existing owner-local alias coverage', async () => {
  const report = await scan(app('<app-child></app-child>', [], [':host{--local-ink:var(--ui-color-text);color:var(--local-ink)}'], ''));
  assert.deepEqual(report.diagnostics, [], JSON.stringify(report));
});

test('same physical host selector branches stay paired with the parent source and consumer condition', async () => {
  for (const [binding, selector, writers, bad] of [
    [`[class]="flag ? 'left' : 'right'"`, ':host(.left)', '.left{--local-gap:0}.right{--local-gap:19px}', false],
    [`[class]="flag ? 'left right' : 'none'"`, ':host(.left)', '.left{--local-gap:0}.right{--local-gap:19px}', true],
    [`[ngClass]="flag ? ['left'] : ['right']"`, ':host(.left)', '.left{--local-gap:0}.right{--local-gap:19px}', false],
    [`[id]="flag ? 'left' : 'right'"`, ':host(#left)', '#left{--local-gap:0}#right{--local-gap:19px}', false],
    [`class="left"`, ':host(.left)', '.left{--local-gap:19px}.right{--local-gap:0}', true],
    [`[class]="flag ? 'left' : 'right'"`, ':host(.left)', '.left{--local-gap:var(--end);--end:0}.right{--end:19px}', false],
  ] as [string, string, string, boolean][]) {
    const report = await scan(app(`<app-child ${binding}></app-child>`, [writers], [`${selector}{padding:var(--local-gap)}`], ''));
    assert.equal(concrete(report), bad, JSON.stringify(report)); unknown(report);
  }
});

test('parent-link budget counts selector combinations before expanding multiple parent instances', async () => {
  const flags = Array.from({ length: 31 }, (_, n) => 'f' + n);
  const choices = flags.reduceRight((tail, flag, n) => `${flag} ? 'v${n}' : ${tail}`, "'v31'");
  const template = `<app-child [class]="${choices}"></app-child>`;
  const parent = `@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)}})class Parent{${flags.map(flag => flag + '!:boolean;').join('')}}`;
  for (const badFirst of [false, true]) {
    const children = Array.from({ length: 5 }, (_, n) => `<app-parent style="--local-gap:${n === (badFirst ? 0 : 4) ? '19px' : '0'}"></app-parent>`).join('');
    const report = await scan(`@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}${parent}@Component({selector:'app-root',imports:[Parent],template:${JSON.stringify(children)}})class Root{}`);
    assert.equal(concrete(report), badFirst, JSON.stringify(report)); unknown(report);
  }
});

test('detached template views do not inherit component host supply', async () => {
  for (const [childTemplate, writer, bad, unconfirmed] of [
    ['<ng-template><table class="consumer"></table></ng-template>', 'app-child{--local-columns:19px}', false, true],
    ['<ng-container><table class="consumer"></table></ng-container>', 'app-child{--local-columns:19px}', true, true],
    ['<ng-template><table class="consumer" style="--local-columns:19px"></table></ng-template>', '', true, false],
    ['<ng-template><section class="inner"><table class="consumer"></table></section></ng-template>', '', true, true],
  ] as [string, string, boolean, boolean][]) {
    const report = await scan(app('<app-child></app-child>', [writer], [dimension, '.inner{--local-columns:19px}'], childTemplate));
    assert.equal(concrete(report), bad, JSON.stringify(report));
    assert.equal(report.diagnostics.some(d => d.rule === 'unresolved'), unconfirmed, JSON.stringify(report));
  }
});

test('embedded component applications keep own CSS supply while dropping lexical host inheritance', async () => {
  for (const [writer, bad] of [[':host{--local-columns:19px}', false], ['app-child{--local-columns:19px}', true]] as const) {
    const report = await scan(app('<ng-template><app-child></app-child></ng-template>', [writer]));
    assert.equal(concrete(report), bad, JSON.stringify(report)); unknown(report);
  }
});

test('detached native consumers cannot borrow owner host CSS or host inline application values', async () => {
  for (const global of [false, true]) {
    const report = await scan(app('<app-child style="--local-columns:19px"></app-child>', [], [':host{--local-columns:19px}', ...(global ? [] : [dimension])], '<ng-template><table class="consumer"></table></ng-template>'), global ? { 'global.css': dimension } : {});
    assert.ok(!concrete(report), JSON.stringify(report)); unknown(report);
  }
});

test('document global selectors respect shadow trees while host inheritance and own sheets remain candidates', async () => {
  for (const [mode, global, own, bad] of [
    ['ShadowDom', '.parent{--local-gap:19px}', '', false],
    ['Emulated', '.parent{--local-gap:19px}', '', true],
    ['ShadowDom', 'app-parent{--local-gap:19px}', '', true],
    ['ShadowDom', 'app-child{--local-gap:19px}', '', false],
    ['ShadowDom', '', '.parent{--local-gap:19px}', true],
  ] as [string, string, string, boolean][]) {
    const source = `@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-parent',encapsulation:ViewEncapsulation.${mode},imports:[Child],template:'<section class="parent"><app-child></app-child></section>',styles:[${JSON.stringify(own)}]})class Parent{}`;
    const report = await scan(source, { 'global.css': global });
    assert.equal(concrete(report), bad, JSON.stringify(report)); unknown(report);
  }
});

test('document global consumers cannot borrow native values from a shadow tree', async () => {
  for (const shadow of [false, true]) {
    const source = `@Component({selector:'app-child',template:'<table class="consumer" style="--local-gap:19px"></table>'})class Child{}@Component({selector:'app-parent',encapsulation:ViewEncapsulation.${shadow ? 'ShadowDom' : 'Emulated'},imports:[Child],template:'<app-child></app-child>'})class Parent{}`;
    const report = await scan(source, { 'global.css': '.consumer{padding:var(--local-gap)}' });
    assert.equal(concrete(report), !shadow, JSON.stringify(report)); unknown(report);
  }
});

test('Angular shared None styles can still supply inside a standard ShadowDom root', async () => {
  const source = `@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-theme',encapsulation:ViewEncapsulation.None,template:'',styles:['.parent{--local-gap:19px}']})class Theme{}@Component({selector:'app-parent',encapsulation:ViewEncapsulation.ShadowDom,imports:[Child],template:'<section class="parent"><app-child></app-child></section>'})class Parent{}@Component({selector:'app-root',imports:[Parent,Theme],template:'<app-theme></app-theme><app-parent></app-parent>'})class Root{}`;
  const report = await scan(source); assert.ok(concrete(report), JSON.stringify(report)); unknown(report);
});

test('truncated parent supply keeps Unknown beside closed owner-local semantic aliases', async () => {
  const alias = ':host{--local-gap:var(--ui-space-field);padding:var(--local-gap)}';
  const flags = Array.from({ length: 31 }, (_, n) => 'f' + n);
  const choices = flags.reduceRight((tail, flag, n) => `${flag} ? 'v${n}' : ${tail}`, "'v31'");
  const template = `<app-child [class]="${choices}"></app-child>`;
  const members = flags.map(flag => flag + '!:boolean;').join('');
  const child = `@Component({selector:'app-child',template:'',styles:[${JSON.stringify(alias)}]})class Child{}`;
  const missing = (report: Awaited<ReturnType<typeof scan>>) => assert.ok(report.diagnostics.some(d => d.rule === 'unresolved' && d.message.includes('--local-gap')), JSON.stringify(report));
  for (const multipleOwners of [false, true]) for (const first of [false, true]) {
    let source = child;
    if (multipleOwners) {
      for (let n = 0; n < 5; n++) source += `@Component({selector:'app-parent${n}',imports:[Child],template:${JSON.stringify(template)},styles:[${JSON.stringify(n === (first ? 0 : 4) ? 'app-child{--local-gap:19px}' : '')}]})class Parent${n}{${members}}`;
      source += `@Component({selector:'app-root',imports:[Parent0,Parent1,Parent2,Parent3,Parent4],template:'${Array.from({ length: 5 }, (_, n) => `<app-parent${n}></app-parent${n}>`).join('')}'})class Root{}`;
    } else {
      source += `@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)},styles:[':host(.late){--local-gap:19px}']})class Parent{${members}}@Component({selector:'app-root',imports:[Parent],template:'${Array.from({ length: 5 }, (_, n) => `<app-parent${n === (first ? 0 : 4) ? ' class="late"' : ''}></app-parent>`).join('')}'})class Root{}`;
    }
    const report = await scan(source); assert.equal(concrete(report), first, JSON.stringify(report)); missing(report);
  }
  const recursive = await scan(`@Component({selector:'app-recursive',imports:[Recursive],template:'<app-recursive></app-recursive>',styles:[${JSON.stringify(alias)}]})class Recursive{}`);
  assert.equal(recursive.valid, true, JSON.stringify(recursive)); missing(recursive);
  const definitions = [child];
  for (let n = 0; n < 12; n++) definitions.push(`@Component({selector:'app-parent${n}',imports:[${n ? 'Parent' + (n - 1) : 'Child'}],template:'<${n ? 'app-parent' + (n - 1) : 'app-child'}></${n ? 'app-parent' + (n - 1) : 'app-child'}>'})class Parent${n}{}`);
  for (const reverse of [false, true]) {
    const report = await scan((reverse ? [...definitions].reverse() : definitions).join(''));
    assert.equal(report.valid, true, JSON.stringify(report)); missing(report);
  }
});

test('document CSS reachability survives supply depth limits and declaration order', async () => {
  for (const length of [3, 12]) for (const shadow of [false, true]) for (const reverse of [false, true]) {
    const definitions = [`@Component({selector:'app-child',template:'<p class="consumer"></p>',styles:['.consumer{padding:var(--local-gap)}']})class Child{}`];
    for (let n = 0; n < length; n++) {
      const lower = n ? 'Parent' + (n - 1) : 'Child', tag = n ? 'app-parent' + (n - 1) : 'app-child';
      definitions.push(`@Component({selector:'app-parent${n}',imports:[${lower}],template:'<${tag}></${tag}>'${shadow && n === length - 1 ? ',encapsulation:ViewEncapsulation.ShadowDom' : ''}})class Parent${n}{}`);
    }
    const report = await scan((reverse ? definitions.reverse() : definitions).join(''), { 'global.css': '.consumer{--local-gap:19px}' });
    assert.equal(concrete(report), !shadow, JSON.stringify({ length, shadow, reverse, report })); unknown(report);
  }
});

test('unknown and detached document locations do not become proven document CSS supply', async () => {
  for (const detached of [false, true]) {
    const template = detached ? '<ng-template><app-child></app-child></ng-template>' : '<app-child></app-child>';
    const source = `@Component({selector:'app-child',template:'<p class="consumer"></p>',styles:['.consumer{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)}${detached ? '' : ',encapsulation:unknownMode()'}})class Parent{}`;
    const report = await scan(source, { 'global.css': '.consumer{--local-gap:19px}' });
    assert.equal(concrete(report), false, JSON.stringify(report)); unknown(report);
  }
});

test('foreign shared stylesheet supply requires a confirmed Angular shared-style tree', async () => {
  for (const [mode, bad] of [['ViewEncapsulation.Emulated', true], ['ViewEncapsulation.ShadowDom', true], ['ViewEncapsulation.ExperimentalIsolatedShadowDom', false], ['unknownMode()', false]] as const) {
    const source = `@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{}@Component({selector:'app-theme',encapsulation:ViewEncapsulation.None,template:'',styles:['.parent{--local-gap:19px}']})class Theme{}@Component({selector:'app-parent',imports:[Child],encapsulation:${mode},template:'<section class="parent"><app-child></app-child></section>'})class Parent{}@Component({selector:'app-root',imports:[Theme,Parent],template:'<app-theme></app-theme><app-parent></app-parent>'})class Root{}`;
    const report = await scan(source); assert.equal(concrete(report), bad, JSON.stringify(report)); unknown(report);
  }
});

test('detached native placement does not prove document or shared stylesheet reachability', async () => {
  for (const shared of [false, true]) for (const detached of [false, true]) {
    const container = detached ? 'ng-template' : 'ng-container';
    const theme = shared ? `@Component({selector:'app-theme',encapsulation:ViewEncapsulation.None,template:'',styles:['.consumer{--local-gap:19px}']})class Theme{}` : '';
    const source = `${theme}@Component({selector:'app-root',${shared ? 'imports:[Theme],' : ''}template:'${shared ? '<app-theme></app-theme>' : ''}<${container}><p class="consumer"></p></${container}>',styles:['.consumer{padding:var(--local-gap)}']})class Root{}`;
    const report = await scan(source, shared ? {} : { 'global.css': '.consumer{--local-gap:19px}' });
    assert.equal(concrete(report), !detached, JSON.stringify(report)); unknown(report);
  }
});
