import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
async function scan(body: string, files: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-host-alias-'));
  try {
    await mkdir(resolve(root, 'app'));
    for (const [name, text] of Object.entries({ 'app.ts': `import{Component,HostBinding,ViewEncapsulation}from'@angular/core';${body}\nthrow new Error('Never execute application');`, ...files })) await writeFile(resolve(root, 'app', name), text);
    const input = parseConfig(example); input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
    const config = resolveConfig(input); return await checkSources({ root, config, policy: createSourcePolicy(config) });
  } finally { await rm(root, { recursive: true, force: true }); }
}
const app = (child: string[], parent: string[], template = '<app-child></app-child>', childTemplate = '', extra = '') => `@Component({selector:'app-child',template:${JSON.stringify(childTemplate)},styles:${JSON.stringify(child)}${extra}})class Child{}@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)},styles:${JSON.stringify(parent)}})class Parent{flag!:boolean}`;
const bad = (r: Awaited<ReturnType<typeof scan>>, value = '19px') => r.diagnostics.some(d => d.severity === 'error' && d.message.includes(`Concrete value ${value} `));
const unknown = (r: Awaited<ReturnType<typeof scan>>) => assert.ok(r.diagnostics.some(d => d.rule === 'unresolved'), JSON.stringify(r));

test('same physical host connects parent CSS dependencies to child host CSS', async () => {
  for (const value of ['0', '19px']) for (const consumer of [':host{padding:var(--a)}', ':host::before{border-block-start:var(--ui-border-control) var(--a) var(--ui-color-border)}', '.consumer{min-inline-size:calc(var(--a) * var(--ui-size-table-column-min))}']) {
    const r = await scan(app([`:host{--b:${value}}`, consumer], ['app-child{--a:var(--b)}'], undefined, '<table class="consumer"></table>'));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); unknown(r);
  }
});

test('parent stylesheet consumers inspect child host writers on their actual receiving element', async () => {
  for (const value of ['0', '19px']) {
    const r = await scan(app([`:host{--b:${value}}`], ['app-child{padding:var(--b)}']));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); unknown(r);
  }
});

test('same-host paths may alternate CSS owners without borrowing a child internal node', async () => {
  for (const value of ['0', '19px']) {
    const r = await scan(app([':host{--b:var(--c);padding:var(--a)}', '.inner{--c:17px}'], [`app-child{--a:var(--b);--c:${value}}`], undefined, '<p class="inner"></p>'));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); assert.equal(bad(r, '17px'), false, JSON.stringify(r)); unknown(r);
  }
});

test('parent ancestor computations never borrow receiving child host dependencies', async () => {
  for (const value of ['0', '19px']) {
    const r = await scan(app([':host{--b:17px;padding:var(--a)}'], [`.parent{--a:var(--b);--b:${value}}`], '<section class="parent"><app-child></app-child></section>'));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); assert.equal(bad(r, '17px'), false, JSON.stringify(r)); unknown(r);
  }
});

test('same-host peer lookup retains mutually exclusive class and id branches', async () => {
  for (const [binding, left, right, combined] of [
    [`[class]="flag ? 'left' : 'right'"`, '.left', '.right', false],
    [`[class]="flag ? 'left right' : 'none'"`, '.left', '.right', true],
    [`[id]="flag ? 'left' : 'right'"`, '#left', '#right', false],
  ] as const) {
    const r = await scan(app([`:host(${left}){--b:0}:host(${right}){--b:19px}`], [`app-child${left}{--a:var(--b);padding:var(--a)}`], `<app-child ${binding}></app-child>`));
    assert.equal(bad(r), combined, JSON.stringify(r)); unknown(r);
  }
});

test('a repeated alias name at a different compute origin still inspects registered values', async () => {
  for (const value of ['var(--ui-color-text)', 'red']) {
    const css = `@property --a{syntax:"<color>";inherits:false;initial-value:transparent}.parent{--a:${value};--b:var(--a)}.child{--a:var(--b);color:var(--a)}`;
    const r = await scan(`@Component({selector:'app-root',template:'<section class="parent"><p class="child"></p></section>',styles:[${JSON.stringify(css)}]})class Root{}`);
    assert.equal(bad(r, 'red'), value === 'red', JSON.stringify(r)); unknown(r);
  }
});

test('cross-host same-name lookup keeps the original parent of an inherited expression', async () => {
  for (const value of ['0', '19px']) {
    const r = await scan(app([':host{--a:var(--b);padding:var(--a)}'], [`@property --a{syntax:"*";inherits:false;initial-value:0}.parent{--a:${value};--b:var(--a)}`], '<section class="parent"><app-child></app-child></section>'));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); unknown(r);
  }
});

test('true same-host alias cycles stop and preserve Unknown', async () => {
  for (const cycle of ['--b:var(--a)', '--b:var(--b)']) {
    const r = await scan(app([`:host{${cycle};padding:var(--a)}`], ['app-child{--a:var(--b)}']));
    assert.equal(r.valid, true, JSON.stringify(r)); unknown(r);
  }
});

test('detached peer CSS stays unconfirmed while direct inline candidates remain inspectable', async () => {
  const r = await scan(app([':host{--b:19px;padding:var(--a)}'], ['app-child{--a:var(--b)}'], '<ng-template><app-child></app-child></ng-template>'));
  assert.equal(bad(r), false, JSON.stringify(r)); unknown(r);
  const inline = await scan(app([], ['app-child{padding:var(--b)}'], '<ng-template><app-child style="--b:19px"></app-child></ng-template>'));
  assert.ok(bad(inline), JSON.stringify(inline));
  const absent = await scan(app([':host{--b:19px;padding:var(--a)}'], [':host{--a:var(--b)}'], '<ng-template><app-child></app-child></ng-template>'));
  assert.equal(bad(absent), false, JSON.stringify(absent)); unknown(absent);
});

test('registration blocks inherited peer values to pseudo consumers but not same-element lookup', async () => {
  for (const pseudo of [false, true]) {
    const r = await scan(app(['@property --b{syntax:"*";inherits:false;initial-value:0}:host{--b:19px}'], [`app-child${pseudo ? '::before' : ''}{padding:var(--b)}`]));
    assert.equal(bad(r), !pseudo, JSON.stringify(r)); unknown(r);
  }
});

test('same-host dependencies preserve separate component applications and inline values', async () => {
  for (const value of ['0', '19px']) {
    const r = await scan(app([':host{--b:var(--end)}'], ['app-child.left{--a:var(--b);padding:var(--a)}'], `<app-child class="left" style="--end:${value}"></app-child><app-child class="right" style="--end:17px"></app-child>`));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); assert.equal(bad(r, '17px'), false, JSON.stringify(r)); unknown(r);
  }
});

test('peer source requires a confirmed stylesheet tree and never treats a pseudo as its host', async () => {
  for (const mode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'unknownMode()']) {
    const r = await scan(app([':host{--b:19px}'], ['app-child{padding:var(--b)}'], undefined, '', ',encapsulation:' + mode));
    assert.equal(bad(r), mode !== 'unknownMode()', JSON.stringify(r)); unknown(r);
  }
  const pseudo = await scan(app([':host::before{--b:19px}'], ['app-child{padding:var(--b)}']));
  assert.equal(bad(pseudo), false, JSON.stringify(pseudo)); unknown(pseudo);
  const isolated = await scan(app([':host{--b:19px}'], []) + `@Component({selector:'app-isolated',imports:[Parent],encapsulation:ViewEncapsulation.ExperimentalIsolatedShadowDom,template:'<app-parent></app-parent>',styles:['app-child{padding:var(--b)}']})class Isolated{}`);
  assert.equal(bad(isolated), false, JSON.stringify(isolated)); unknown(isolated);
});

test('external SCSS and unresolved fragments retain definite peer candidates', async () => {
  for (const value of ['0', '19px']) {
    const source = app([`:host{--b:${value}}`], []).replace('styles:[]})class Parent', "styles:[],styleUrl:'parent.scss'})class Parent");
    const r = await scan(source, { 'parent.scss': 'app-child{--a:var(--b);padding:var(--a)}' });
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); unknown(r);
  }
  const r = await scan(app([':host{--b:19px}'], ['app-child{padding:var(--b, var(--missing))}']));
  assert.ok(bad(r), JSON.stringify(r)); unknown(r);
});

test('untracked peer links preserve Unknown even beside a local semantic alias', async () => {
  const flags = Array.from({ length: 31 }, (_, n) => 'f' + n);
  const choices = flags.reduceRight((tail, flag, n) => `${flag} ? 'v${n}' : ${tail}`, "'v31'");
  let source = `@Component({selector:'app-child',template:'',styles:[':host{--a:19px}']})class Child{}`;
  for (let n = 0; n < 5; n++) source += `\n@Component({selector:'app-parent${n}',imports:[Child],template:${JSON.stringify(`<app-child [class]="${choices}"></app-child>`)},styles:['app-child{--a:var(--ui-space-field);padding:var(--a)}']})class Parent${n}{${flags.map(flag => flag + '!:boolean;').join('')}}`;
  const r = await scan(source);
  assert.ok(bad(r), JSON.stringify(r)); unknown(r);
  assert.ok(r.diagnostics.some(d => d.line === 6 && d.rule === 'unresolved'), JSON.stringify(r));
  assert.equal(r.diagnostics.some(d => d.line === 6 && d.severity === 'error'), false, JSON.stringify(r));
});

test('host metadata and HostBinding alias dependencies keep actual host class and id facts', async () => {
  for (const decorator of [false, true]) for (const [selector, applies] of [[':host(.left)', true], [':host:not(.left)', false], [':host(#owner)', true], [':host:not(#owner)', false]] as const) for (const value of ['0', '19px']) {
    const metadata = decorator ? '' : `,host:{'[style.--a]':"'var(--b)'"}`;
    const members = decorator ? `@HostBinding('style.--a')readonly a='var(--b)';` : '';
    const r = await scan(`@Component({selector:'app-child',template:'<p class="leaf" style="--b:17px"></p>'${metadata},styles:[${JSON.stringify(`${selector}{--b:${value}}.leaf{--b:17px}`)}]})class Child{${members}}@Component({selector:'app-parent',imports:[Child],template:'<app-child class="left" id="owner"></app-child>',styles:['app-child{padding:var(--a)}']})class Parent{}`);
    assert.equal(bad(r), applies && value === '19px', JSON.stringify({ decorator, selector, value, r }));
    assert.equal(bad(r, '17px'), false, JSON.stringify(r)); unknown(r);
  }
  for (const [binding, selector, combined] of [
    [`[class]="flag ? 'left' : 'right'"`, '.left', false],
    [`[class]="flag ? 'left right' : 'none'"`, '.left', true],
    [`[id]="flag ? 'left' : 'right'"`, '#left', false],
  ] as const) {
    const right = selector.startsWith('#') ? '#right' : '.right';
    const r = await scan(app([`:host(${selector}){--b:0}:host(${right}){--b:19px}`], [`app-child${selector}{padding:var(--a)}`], `<app-child ${binding}></app-child>`, '', `,host:{'[style.--a]':"'var(--b)'"}`));
    assert.equal(bad(r), combined, JSON.stringify(r)); unknown(r);
  }
  const instances = await scan(app([':host(.right){--b:19px}'], ['app-child.left{padding:var(--a)}'], '<app-child class="left" style="--b:0"></app-child><app-child class="right" style="--b:17px"></app-child>', '', `,host:{'[style.--a]':"'var(--b)'"}`));
  assert.equal(bad(instances), false, JSON.stringify(instances)); assert.equal(bad(instances, '17px'), false, JSON.stringify(instances)); unknown(instances);
});

test('known None host writers feed parent consumers without changing stylesheet reachability', async () => {
  for (const mode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.None', 'unknownMode()']) for (const decorator of [false, true]) for (const value of ['0', '19px']) {
    const metadata = decorator ? '' : `,host:{'[style.--b]':${JSON.stringify(JSON.stringify(value))}}`;
    const members = decorator ? `@HostBinding('style.--b')readonly b=${JSON.stringify(value)};` : '';
    const r = await scan(`@Component({selector:'app-child',template:'',encapsulation:${mode}${metadata}})class Child{${members}}@Component({selector:'app-parent',imports:[Child],template:'<app-child></app-child>',styles:['app-child{--a:var(--b);padding:var(--a)}']})class Parent{}`);
    assert.equal(bad(r), mode !== 'unknownMode()' && value === '19px', JSON.stringify({ mode, decorator, value, r })); unknown(r);
  }
  for (const selector of ['app-child.left', 'app-child.right']) {
    const r = await scan(app([`${selector}{--b:19px}`, '.leaf{--b:17px}'], ['app-child{padding:var(--a)}'], '<app-child class="left"></app-child>', '<p class="leaf"></p>', `,encapsulation:ViewEncapsulation.None,host:{'[style.--a]':"'var(--b)'"}`));
    assert.equal(bad(r), selector === 'app-child.left', JSON.stringify(r)); assert.equal(bad(r, '17px'), false, JSON.stringify(r)); unknown(r);
  }
  for (const mode of ['ViewEncapsulation.ShadowDom', 'ViewEncapsulation.ExperimentalIsolatedShadowDom']) {
    const source = app(['app-child{--b:19px}'], ['app-child{padding:var(--a)}'], undefined, '', `,encapsulation:ViewEncapsulation.None,host:{'[style.--a]':"'var(--b)'"}`).replace("styles:[\"app-child{padding:var(--a)}\"]})class Parent", `styles:["app-child{padding:var(--a)}"],encapsulation:${mode}})class Parent`);
    const r = await scan(source); assert.equal(bad(r), mode === 'ViewEncapsulation.ShadowDom', JSON.stringify(r)); unknown(r);
  }
  const detached = await scan(app(['app-child{--b:19px}'], ['app-child{padding:var(--a)}'], '<ng-template><app-child></app-child></ng-template>', '', `,encapsulation:ViewEncapsulation.None,host:{'[style.--a]':"'var(--b)'"}`));
  assert.equal(bad(detached), false, JSON.stringify(detached)); unknown(detached);
});

test('None parent CSS inspects real native peers as well as a matching host consumer', async () => {
  const parentNone = (source: string) => source.replace('})class Parent', ',encapsulation:ViewEncapsulation.None})class Parent');
  for (const mode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.None']) for (const value of ['0', '19px']) {
    const selector = mode.endsWith('.None') ? 'app-child' : ':host';
    const r = await scan(parentNone(app([`${selector}{--b:${value}}`], ['app-child{--a:var(--b);padding:var(--a)}'], undefined, '', ',encapsulation:' + mode)));
    assert.equal(bad(r), value === '19px', JSON.stringify(r)); assert.equal(r.valid, value !== '19px', JSON.stringify(r)); unknown(r);
  }
  const direct = await scan(parentNone(app([], ['app-child{padding:var(--b)}'], undefined, '', `,host:{'[style.--b]':"'19px'"}`)));
  assert.ok(bad(direct), JSON.stringify(direct)); unknown(direct);
  const overridden = await scan(parentNone(app([':host{--b:19px}'], ['app-child{--b:var(--ui-space-field);padding:var(--b)}'])));
  assert.ok(bad(overridden), JSON.stringify(overridden)); unknown(overridden);
  for (const [binding, combined] of [[`[class]="flag ? 'left' : 'right'"`, false], [`[class]="flag ? 'left right' : 'none'"`, true]] as const) {
    const r = await scan(parentNone(app([':host(.left){--b:0}:host(.right){--b:19px}'], ['app-child.left{padding:var(--b)}'], `<app-child ${binding}></app-child>`)));
    assert.equal(bad(r), combined, JSON.stringify(r)); assert.equal(r.valid, !combined, JSON.stringify(r)); unknown(r);
  }
  for (const hostValue of ['0', '19px']) {
    const childValue = hostValue === '0' ? '19px' : '0';
    const r = await scan(`@Component({selector:'app-child',template:'',host:{'[style.--b]':${JSON.stringify(JSON.stringify(childValue))}}})class Child{}@Component({selector:'app-parent',imports:[Child],encapsulation:ViewEncapsulation.None,host:{class:'consumer','[style.--b]':${JSON.stringify(JSON.stringify(hostValue))}},template:'<app-child class="consumer"></app-child>',styles:['@property --b{syntax:"*";inherits:false;initial-value:0}.consumer{padding:var(--b)}']})class Parent{}`);
    assert.ok(bad(r), JSON.stringify(r)); unknown(r);
  }
});

test('projected descendants inherit peer candidates at the ancestor compute origin', async () => {
  for (const parentMode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.None']) for (const mode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.None']) for (const pseudo of ['', '::before']) for (const value of ['0', '19px']) {
    const selector = mode.endsWith('.None') ? 'app-child' : ':host';
    const source = app([`${selector}{--a:var(--c)}`], [`.leaf${pseudo}{padding:var(--a)}`], `<app-child style="--c:${value}"><span class="leaf" style="--c:17px"></span></app-child>`, '<ng-content></ng-content><p style="--c:17px"></p>', ',encapsulation:' + mode).replace('})class Parent', `,encapsulation:${parentMode}})class Parent`);
    const r = await scan(source); assert.equal(bad(r), value === '19px', JSON.stringify(r)); assert.equal(bad(r, '17px'), false, JSON.stringify(r)); assert.equal(r.valid, value !== '19px', JSON.stringify(r)); unknown(r);
  }
  for (const [template, blocked] of [
    ['<app-child style="--c:0"><span class="leaf"></span></app-child><app-child style="--c:19px"><span></span></app-child>', true],
    ['<app-child style="--c:19px"></app-child><span class="leaf"></span>', true],
    ['<ng-template><app-child style="--c:19px"><span class="leaf"></span></app-child></ng-template>', true],
    ['<app-child style="--c:19px"><span class="leaf"></span></app-child>', false],
  ] as const) {
    const r = await scan(app([':host{--a:var(--c)}'], ['.leaf{padding:var(--a)}'], template, '<ng-content></ng-content>'));
    assert.equal(bad(r), !blocked, JSON.stringify(r)); unknown(r);
  }
  const registered = await scan(app([':host{--a:var(--c)}'], ['@property --a{syntax:"*";inherits:false;initial-value:0}.leaf{padding:var(--a)}'], '<app-child style="--c:19px"><span class="leaf"></span></app-child>', '<ng-content></ng-content>'));
  assert.equal(bad(registered), false, JSON.stringify(registered)); unknown(registered);
  const flags = Array.from({ length: 31 }, (_, n) => 'f' + n);
  const choices = flags.reduceRight((tail, flag, n) => `${flag} ? 'v${n}' : ${tail}`, "'v31'");
  let source = `@Component({selector:'app-child',template:'<ng-content></ng-content>',styles:[':host{--a:19px}']})class Child{}`;
  for (let n = 0; n < 5; n++) source += `\n@Component({selector:'app-parent${n}',imports:[Child],template:${JSON.stringify(`<app-child [class]="${choices}"><span class="leaf"></span></app-child>`)},styles:['.leaf{--a:var(--ui-space-field);padding:var(--a)}']})class Parent${n}{${flags.map(flag => flag + '!:boolean;').join('')}}`;
  const bounded = await scan(source); assert.ok(bad(bounded), JSON.stringify(bounded));
  assert.ok(bounded.diagnostics.some(d => d.line === 6 && d.rule === 'unresolved'), JSON.stringify(bounded));
  assert.equal(bounded.diagnostics.some(d => d.line === 6 && d.severity === 'error'), false, JSON.stringify(bounded));
});

test('incoming-only native values do not reflect as an additional child-own writer', async () => {
  for (const parentMode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.None']) for (const childMode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.None']) for (const binding of [false, true]) for (const value of ['var(--ui-space-field)', '19px']) {
    const template = binding ? '<app-child [style.--a]="gap"></app-child>' : `<app-child style="--a:${value}"></app-child>`;
    const source = app([], ['app-child{padding:var(--a)}'], template, '', ',encapsulation:' + childMode).replace('})class Parent', `,encapsulation:${parentMode}})class Parent`).replace('flag!:boolean', `readonly gap=${JSON.stringify(value)};flag!:boolean`);
    const r = await scan(source); assert.equal(bad(r), value === '19px', JSON.stringify(r)); assert.equal(r.valid, value !== '19px', JSON.stringify(r));
    assert.equal(r.diagnostics.some(d => d.rule === 'unresolved'), false, JSON.stringify({ parentMode, childMode, binding, value, r }));
  }
  for (const metadata of [false, true]) {
    const r = await scan(app(metadata ? [] : [':host{--a:19px}'], ['app-child{padding:var(--a)}'], '<app-child style="--a:var(--ui-space-field)"></app-child>', '', metadata ? `,host:{'[style.--a]':"'19px'"}` : ''));
    assert.ok(bad(r), JSON.stringify(r)); unknown(r);
  }
  const internal = app([':host{--a:var(--b)}'], [], '<app-child style="--b:19px"></app-child>', '<span class="leaf"></span>');
  const global = await scan(internal, { 'global.css': '.leaf{padding:var(--a)}' }); unknown(global);
  const none = await scan(internal.replace('styles:[]})class Parent', 'styles:[".leaf{padding:var(--a)}"],encapsulation:ViewEncapsulation.None})class Parent')); unknown(none);
});
