import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
import type { ChecksConfig, SourceDiagnostic, SourceReport } from '../../src/check/types.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const example = await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8');
const checks = (): ChecksConfig => ({ source_roots: ['app'], approved_components: [], exceptions: [] });
const sentinel = "\nthrow new Error('Application fixture must never execute');\n";
const coreFiles = {
  'node_modules/@angular/core/package.json': JSON.stringify({ name: '@angular/core', types: 'index.d.ts' }),
  'node_modules/@angular/core/index.d.ts': 'export declare function Component(value:any):ClassDecorator; export declare function HostBinding(name?:string):PropertyDecorator;',
};

async function fixture(t: TestContext, files: Record<string, string>, settings = checks()) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-write-sinks-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = parseConfig(example);
  input.checks = settings;
  const config = resolveConfig(input);
  for (const [file, content] of Object.entries({ ...coreFiles, ...files })) {
    await mkdir(dirname(resolve(root, file)), { recursive: true });
    await writeFile(resolve(root, file), content + (file.startsWith('app/') && file.endsWith('.ts') ? sentinel : ''));
  }
  const scan = () => checkSources({ root, config, policy: createSourcePolicy(config) });
  return { root, config, scan };
}

const diagnosticsAt = (report: SourceReport, file: string) => report.diagnostics.filter(item => item.file === file);
const errors = (items: readonly SourceDiagnostic[]) => items.filter(item => item.severity === 'error');
const unresolved = (items: readonly SourceDiagnostic[]) => items.filter(item => item.rule === 'unresolved' && item.severity === 'warning');
const summary = (items: readonly SourceDiagnostic[]) => JSON.stringify(items, null, 2);
function literal(items: readonly SourceDiagnostic[], source: string) {
  assert.ok(items.some(item => item.rule === 'literal-token' && item.severity === 'error' && item.source === source), summary(items));
}
const component = (members: string, prefix = '', styles = '') => `import {Component,HostBinding} from '@angular/core';
${prefix}
@Component({selector:'app-test',template:''${styles ? `,styles:[${JSON.stringify(styles)}]` : ''}})
class App { ${members} }`;
const dom = (body: string) => `export {}; declare const el:HTMLElement; ${body}`;

test('HostBinding uses Angular symbol identity through reexports and respects shadows', async t => {
  const cases = [
    ['direct-alias', `import {Component,HostBinding as Bind} from '@angular/core'; @Component({selector:'direct-alias',template:''}) class App { @Bind('style.color') readonly ink='red'; }`, true],
    ['direct-namespace', `import {Component} from '@angular/core'; import * as ng from '@angular/core'; @Component({selector:'direct-namespace',template:''}) class App { @ng.HostBinding('style.color') readonly ink='red'; }`, true],
    ['barrel-alias', `import {Component} from '@angular/core'; import {Bind as Decorate} from './barrel'; @Component({selector:'barrel-alias',template:''}) class App { @Decorate('style.color') readonly ink='red'; }`, true],
    ['barrel-namespace', `import {Component} from '@angular/core'; import * as hooks from './barrel'; @Component({selector:'barrel-namespace',template:''}) class App { @hooks.Bind('style.color') readonly ink='red'; }`, true],
    ['local-function', `import {Component} from '@angular/core'; const HostBinding=(_name:string)=>()=>{}; @Component({selector:'local-function',template:''}) class App { @HostBinding('style.color') readonly ink='red'; }`, false],
    ['named-shadow', `import {Component,HostBinding} from '@angular/core'; function factory(){ const HostBinding=(_name:string)=>()=>{}; @Component({selector:'named-shadow',template:''}) class App { @HostBinding('style.color') readonly ink='red'; } return App; }`, false],
    ['namespace-shadow', `import {Component} from '@angular/core'; import * as ng from '@angular/core'; function factory(){ const ng={HostBinding:(_name:string)=>()=>{}}; @Component({selector:'namespace-shadow',template:''}) class App { @ng.HostBinding('style.color') readonly ink='red'; } return App; }`, false],
  ] as const;
  const { scan } = await fixture(t, {
    'app/barrel.ts': "export {HostBinding as Bind} from '@angular/core';",
    ...Object.fromEntries(cases.map(([name, source]) => [`app/${name}.ts`, source])),
  });
  const report = await scan();
  for (const [name, , angular] of cases) await t.test(name, () => {
    const items = diagnosticsAt(report, `app/${name}.ts`);
    if (angular) { literal(items, 'color:red'); assert.equal(errors(items).length, 1, summary(items)); }
    else assert.deepEqual(items, []);
  });
});

test('HostBinding checks every finite key, noarg defaults and unresolved keys', async t => {
  const cases: Array<{ name: string; source: string; expected: string[]; unknown?: boolean; clear?: boolean }> = [
    { name: 'title-before-style', source: component("@HostBinding(key) readonly ink='red';", "declare const flag:boolean;const key=flag?'attr.title':'style.color';"), expected: ['color:red'] },
    { name: 'two-style-candidates', source: component("@HostBinding(key) readonly ink='red';", "declare const flag:boolean;const key=flag?'style.color':'style.background-color';"), expected: ['color:red', 'background-color:red'] },
    { name: 'title-before-css', source: component("@HostBinding(key) readonly styles='color:red';", "declare const flag:boolean;const key=flag?'attr.title':'attr.style';"), expected: ['color:red'] },
    { name: 'title-before-class-bag', source: component("@HostBinding(key) readonly classes='p-4';", "declare const flag:boolean;const key=flag?'attr.title':'class';"), expected: [] },
    { name: 'title-before-class-toggle', source: component("@HostBinding(key) readonly active=true;", "declare const flag:boolean;const key=flag?'attr.title':'class.p-4';"), expected: [] },
    { name: 'title-before-unit-style', source: component('@HostBinding(key) readonly width=12;', "declare const flag:boolean;const key=flag?'attr.title':'style.width.px';"), expected: ['width:12px'] },
    { name: 'partial-key', source: component("@HostBinding(key) readonly ink='red';", "declare const flag:boolean;declare function runtimeKey():string;const key=flag?'style.color':runtimeKey();"), expected: ['color:red'], unknown: true },
    { name: 'unknown-key', source: component("@HostBinding(runtimeKey()) readonly ink='red';", 'declare function runtimeKey():string;'), expected: [], unknown: true },
    { name: 'noarg-style', source: component("@HostBinding() readonly style='color:red';"), expected: ['color:red'] },
    { name: 'noarg-title', source: component("@HostBinding() readonly title='red';"), expected: [], clear: true },
    { name: 'business-style-attribute', source: component("@HostBinding('attr.style.color') readonly data='red';"), expected: [], clear: true },
    { name: 'business-class-attribute', source: component("@HostBinding('attr.class.p-4') readonly data=true;"), expected: [], clear: true },
    { name: 'undefined-key', source: component("@HostBinding(undefined) readonly style='color:red';"), expected: [], unknown: true },
    { name: 'finite-safe-keys', source: component("@HostBinding(key) readonly ink='var(--ui-color-text)';", "declare const flag:boolean;const key=flag?'attr.title':'style.color';"), expected: [], clear: true },
    { name: 'finite-inactive-class', source: component("@HostBinding(key) readonly active=false;", "declare const flag:boolean;const key=flag?'attr.title':'class.p-4';"), expected: [], clear: true },
  ];
  const { scan } = await fixture(t, Object.fromEntries(cases.map(item => [`app/${item.name}.ts`, item.source])));
  const report = await scan();
  for (const item of cases) await t.test(item.name, () => {
    const items = diagnosticsAt(report, `app/${item.name}.ts`);
    for (const source of item.expected) literal(items, source);
    if (item.name === 'title-before-class-bag' || item.name === 'title-before-class-toggle') {
      assert.ok(errors(items).some(diagnostic => diagnostic.source.includes('p-4')), summary(items));
    }
    if (item.unknown) assert.ok(unresolved(items).length > 0, summary(items));
    else if (item.clear) assert.deepEqual(items, []);
    else assert.equal(unresolved(items).length, 0, summary(items));
  });
});

test('finite HostBinding custom-property keys keep their host consumer provenance', async t => {
  const { scan } = await fixture(t, {
    'app/app.ts': component("@HostBinding(key) readonly gap='12px';", "declare const flag:boolean;const key=flag?'attr.title':'style.--local-gap';", ':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}'),
  });
  const report = await scan();
  assert.ok(errors(report.diagnostics).some(item => item.rule === 'literal-token' && item.source === ':host{padding:var(--local-gap)} :: --local-gap=12px' && item.message.includes('12px')), summary(report.diagnostics));
  assert.ok(unresolved(report.diagnostics).length > 0, 'a key alternative can omit the custom-property writer');
});

test('direct DOM storage updates retain unknown values and writer coverage', async t => {
  const { scan } = await fixture(t, {
    'app/app.ts': dom("el.style.opacity++;--el.style.opacity;el.style['width']++;++el.style['--local-gap'];declare const key:string;el.style[key]++;"),
    'app/owner.ts': component('', '', ':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}'),
  });
  const report = await scan();
  assert.equal(unresolved(diagnosticsAt(report, 'app/app.ts')).length, 5, summary(report.diagnostics));
  assert.ok(unresolved(diagnosticsAt(report, 'app/owner.ts')).length > 0, summary(report.diagnostics));
});

test('optional HostBinding keys never certify a missing custom-property supplier', async t => {
  for (const [key, expectedUnknown] of [["flag?'attr.title':'style.--local-gap'", true], ["flag?'style.--other':'style.--local-gap'", true], ["flag?'style.--local-gap':'style.--local-gap'", false]] as const) await t.test(key, async tt => {
    const { scan } = await fixture(tt, { 'app/app.ts': component("@HostBinding(key) readonly gap='var(--ui-space-page)';", `declare const flag:boolean;const key=${key};`, ':host{padding:var(--local-gap)}') });
    const report = await scan();
    assert.equal(errors(report.diagnostics).length, 0, summary(report.diagnostics));
    assert.equal(unresolved(report.diagnostics).length > 0, expectedUnknown, summary(report.diagnostics));
  });
});

test('HostBinding key selector alternatives never manufacture simultaneous class or id facts', async t => {
  for (const [key, value, selector, members, bad] of [
    ["flag?'class.left':'class.right'", 'true', '.left.right', '', false],
    ["flag?'class.left':'id'", "'active'", '.left#active', '', false],
    ["flag?'class.left':'attr.title'", 'true', '.left', '', true],
    ["flag?'class.left':'class.right'", 'true', '.left#fixed', "@HostBinding('id') readonly identity='fixed';", true],
  ] as const) await t.test(selector, async tt => {
    const { scan } = await fixture(tt, { 'app/app.ts': component(`@HostBinding(key) readonly value=${value};${members}`, `declare const flag:boolean;const key=${key};`, `:host(${selector}){--local-gap:12px}:host{padding:var(--local-gap)}`) });
    const report = await scan();
    assert.equal(errors(report.diagnostics).some(item => item.message.includes('12px')), bad, summary(report.diagnostics));
  });
});

test('business style mutations do not contaminate component CSS writer coverage', async t => {
  for (const key of ["const key='--local-gap';", 'declare const key:string;']) await t.test(key, async tt => {
    const { scan } = await fixture(tt, {
      'app/app.ts': `export {};const business={style:{} as Record<string,string>};${key}business.style[key]||='business';business.style[key]++;`,
      'app/owner.ts': component('', '', ':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}'),
    });
    assert.deepEqual((await scan()).diagnostics, []);
  });
});

test('HostBinding key variants retain incoming host computation origins and instance separation', async t => {
  for (const [template, bad, styles] of [
    ['<app-child style="--local-gap:var(--local-origin);--local-origin:12px"></app-child>', true, ''],
    ['<app-child style="--local-origin:12px"></app-child><app-child style="--local-gap:var(--local-origin);--local-origin:0"></app-child>', false, ''],
    ['<app-child></app-child>', true, 'app-child.left{--local-gap:var(--local-origin);--local-origin:12px}'],
    ['<app-child></app-child>', false, 'app-child.left#right{--local-gap:var(--local-origin);--local-origin:12px}'],
  ] as const) await t.test(template, async tt => {
    const { scan } = await fixture(tt, { 'app/app.ts': `import{Component,HostBinding}from'@angular/core';declare const flag:boolean;const key=flag?'class.left':'id';
@Component({selector:'app-child',template:'<span style="--local-origin:0"></span>',styles:[':host{padding:var(--local-gap)}']})class Child{@HostBinding(key)readonly active='right';}
@Component({selector:'app-parent',imports:[Child],template:${JSON.stringify(template)},styles:[${JSON.stringify(styles)}]})class Parent{}` });
    const report = await scan();
    assert.equal(errors(report.diagnostics).some(item => item.message.includes('12px')), bad, summary(report.diagnostics));
  });
});

test('HostBinding key variant products are bounded and report incomplete coverage', async t => {
  const bindings = Array.from({ length: 8 }, (_, i) => `@HostBinding(flag?'class.option-${i}-left':'class.option-${i}-right')readonly active${i}=true;`).join('');
  const { scan } = await fixture(t, { 'app/app.ts': component(bindings, 'declare const flag:boolean;') });
  const report = await scan();
  assert.equal(errors(report.diagnostics).length, 0, summary(report.diagnostics));
  assert.ok(unresolved(report.diagnostics).some(item => item.message.includes('128')), summary(report.diagnostics));
});

test('one directive matched through two selectors keeps one HostBinding key choice', async t => {
  for (const [selector, bad] of [['.left.right', false], ['.left', true]] as const) await t.test(selector, async tt => {
    const { scan } = await fixture(tt, { 'app/app.ts': `import{Component,Directive,HostBinding}from'@angular/core';declare const flag:boolean;const key=flag?'class.left':'class.right';
@Directive({selector:'[first],[second]'})class Choice{@HostBinding(key)readonly active=true;}
@Component({selector:'app-parent',imports:[Choice],template:'<div class="consumer" first second></div>',styles:[${JSON.stringify(`${selector}{--local-gap:12px}.consumer{padding:var(--local-gap)}`)}]})class Parent{}` });
    const report = await scan();
    assert.equal(errors(report.diagnostics).some(item => item.message.includes('12px')), bad, summary(report.diagnostics));
  });
});

test('DOM compound assignments inspect finite candidates without certifying the old value', async t => {
  const cases: Array<{ name: string; source: string; literal?: string; unknown?: boolean; clear?: boolean }> = [];
  for (const [operator, label] of [['||=', 'or'], ['&&=', 'and'], ['??=', 'nullish']] as const) {
    cases.push({ name: `${label}-dot`, source: dom(`el.style.color ${operator} 'red';`), literal: 'color:red' });
    cases.push({ name: `${label}-computed`, source: dom(`const property='color';el.style[property] ${operator} 'red';`), literal: 'color:red' });
  }
  cases.push(
    { name: 'cssText-append-dot', source: dom("el.style.cssText += ';color:red';"), literal: 'color:red', unknown: true },
    { name: 'cssText-append-computed', source: dom("const property='cssText';el.style[property] += ';color:red';"), literal: 'color:red', unknown: true },
    { name: 'unknown-logical-key', source: dom("declare function runtimeKey():string;el.style[runtimeKey()] ||= 'red';"), unknown: true },
    { name: 'unknown-append-key', source: dom("declare function runtimeKey():string;el.style[runtimeKey()] += 0;"), unknown: true },
    { name: 'unknown-receiver', source: "export {};declare const el:any;el.style.color ||= 'red';", unknown: true },
    { name: 'business-style', source: `export {}; class CSSStyleDeclaration {color='business';cssText='business';width='';opacity=1;}
const business={style:new CSSStyleDeclaration()}; const color='color';const css='cssText';
business.style.color ||= 'red';business.style[color] &&= 'red';business.style.color ??= 'red';
business.style.cssText += ';color:red';business.style[css] += ';padding:12px';business.style.opacity *= 0;`, clear: true },
    { name: 'plain-assignment-safe', source: dom("el.style.color='var(--ui-color-text)';el.style.width='0px';"), clear: true },
  );
  for (const [operator, label, rhs] of [['+=', 'add', '0'], ['-=', 'subtract', '0'], ['*=', 'multiply', '0'], ['/=', 'divide', '1'], ['%=', 'remainder', '1']] as const) {
    cases.push({ name: `arithmetic-${label}`, source: dom(`el.style.width ${operator} ${rhs};`), unknown: true });
  }
  const { scan } = await fixture(t, Object.fromEntries(cases.map(item => [`app/${item.name}.ts`, item.source])));
  const report = await scan();
  for (const item of cases) await t.test(item.name, () => {
    const items = diagnosticsAt(report, `app/${item.name}.ts`);
    if (item.literal) literal(items, item.literal);
    if (item.unknown) assert.ok(unresolved(items).length > 0, summary(items));
    if (item.clear) assert.deepEqual(items, []);
  });
});

test('custom-property compound writes keep the CSS override contract open', async t => {
  for (const [name, mutation, fixed] of [
    ['property-add', "el.style['--local-gap'] += 'var(--ui-space-field)';", false],
    ['property-logical', "el.style['--local-gap'] ||= 'var(--ui-space-field)';", false],
    ['cssText-add', "el.style.cssText += ';--local-gap:var(--ui-space-field)';", false],
    ['property-logical-literal', "el.style['--local-gap'] ||= '12px';", true],
    // Appended cssText is a fragment of an unknown existing value. It opens
    // consumer coverage but is not certified as a complete alias producer.
    ['cssText-add-literal', "el.style.cssText += ';--local-gap:12px';", false],
  ] as const) await t.test(name, async tt => {
    const { scan } = await fixture(tt, {
      'app/app.ts': dom(mutation),
      'app/consumer.css': '.consumer{--local-gap:var(--ui-space-page);padding:var(--local-gap)}',
      'app/owner.ts': `import {Component} from '@angular/core';@Component({selector:'app-owner',template:'<div class="consumer"></div>',styles:['.consumer{--local-gap:var(--ui-space-page);padding:var(--local-gap)}']})class Owner{}`,
    });
    const report = await scan();
    const consumer = diagnosticsAt(report, 'app/consumer.css');
    assert.ok(unresolved(consumer).some(item => item.message.includes('--local-gap')), summary(report.diagnostics));
    // A DOM receiver with no selector does not acquire the global sheet's
    // computation origin. Component consumers still inspect its known values.
    if (fixed) assert.ok(errors(diagnosticsAt(report, 'app/owner.ts')).some(item => item.rule === 'literal-token' && item.message.includes('12px')), summary(report.diagnostics));
  });
});

test('HostBinding key identity stays separate from unknown class values across both host views', async t => {
  for (const [name, key, value, selector, members, bad] of [
    ['dynamic value', "flag?'class':'id'", 'input', '#active', '', false],
    ['finite value', "flag?'class':'id'", "other?'left':'active'", '#active', '', false],
    ['reverse key order', "flag?'id':'class'", 'input', '#active', '', false],
    ['optional business key', "flag?'class':other?'id':'attr.title'", 'input', '#active', '', false],
    ['reachable dynamic value', "flag?'class':'id'", 'input', '.left', '', true],
    ['reachable finite value', "flag?'class':'id'", "other?'left':'active'", '.left', '', true],
    ['independent class binding', "flag?'class':'id'", 'input', '#active', "@HostBinding('class.left')readonly left=true;", true],
  ] as const) await t.test(name, async tt => {
    const { scan } = await fixture(tt, { 'app/app.ts': `import{Component,HostBinding}from'@angular/core';declare const flag:boolean,other:boolean;declare const input:string;const key=${key};
@Component({selector:'app-child',template:'',styles:[${JSON.stringify(`:host(${selector}){--local-origin:12px}:host{padding:var(--local-gap)}`)}]})class Child{@HostBinding(key)readonly active=${value};${members}}
@Component({selector:'app-parent',imports:[Child],template:'<app-child></app-child>',styles:['app-child.left{--local-gap:var(--local-origin)}']})class Parent{}` });
    const report = await scan();
    assert.equal(errors(report.diagnostics).some(item => item.message.includes('12px')), bad, summary(report.diagnostics));
    assert.ok(unresolved(report.diagnostics).length > 0, summary(report.diagnostics));
  });
});

test('unknown HostBinding values cannot borrow another component instance origin', async t => {
  const { scan } = await fixture(t, { 'app/app.ts': `import{Component,HostBinding}from'@angular/core';declare const flag:boolean;declare const input:string;const key=flag?'class':'id';
@Component({selector:'app-child',template:'',styles:[':host{padding:var(--local-gap)}']})class Child{@HostBinding(key)readonly active=input;}
@Component({selector:'app-parent',imports:[Child],template:'<app-child style="--local-origin:12px"></app-child><app-child style="--local-gap:var(--local-origin);--local-origin:0"></app-child>'})class Parent{}` });
  const report = await scan();
  assert.equal(errors(report.diagnostics).length, 0, summary(report.diagnostics));
  assert.ok(unresolved(report.diagnostics).length > 0, summary(report.diagnostics));
});

test('unary numeric evaluation never proves bitwise-not or updates to be zero by identity', async t => {
  const cases: Array<{ name: string; expression: string; prefix?: string; mode: 'nonzero-or-unknown' | 'zero-or-unknown' | 'literal' | 'clear' }> = [
    { name: 'bitwise-not-zero', expression: '~0', mode: 'nonzero-or-unknown' },
    { name: 'bitwise-not-one', expression: '~1', mode: 'nonzero-or-unknown' },
    { name: 'bitwise-not-minus-one', expression: '~(-1)', mode: 'zero-or-unknown' },
    { name: 'prefix-increment', expression: '++value', prefix: 'let value=0;', mode: 'nonzero-or-unknown' },
    { name: 'prefix-decrement', expression: '--value', prefix: 'let value=0;', mode: 'nonzero-or-unknown' },
    { name: 'postfix-increment', expression: 'value++', prefix: 'let value=0;', mode: 'nonzero-or-unknown' },
    { name: 'postfix-decrement', expression: 'value--', prefix: 'let value=0;', mode: 'nonzero-or-unknown' },
    { name: 'unary-plus-zero', expression: '+0', mode: 'clear' },
    { name: 'unary-minus-zero', expression: '-0', mode: 'clear' },
    { name: 'unary-plus-nonzero', expression: '+12', mode: 'literal' },
    { name: 'unary-minus-nonzero', expression: '-12', mode: 'literal' },
  ];
  const { scan } = await fixture(t, Object.fromEntries(cases.map(item => [`app/${item.name}.ts`, dom(`${item.prefix ?? ''}el.style.width=\`\${${item.expression}}px\`;`)])));
  const report = await scan();
  for (const item of cases) await t.test(item.name, () => {
    const items = diagnosticsAt(report, `app/${item.name}.ts`);
    if (item.mode === 'nonzero-or-unknown') {
      assert.ok(items.some(diagnostic => diagnostic.rule === 'literal-token' && diagnostic.severity === 'error') || unresolved(items).length > 0, summary(items));
    } else if (item.mode === 'zero-or-unknown') {
      assert.equal(errors(items).length, 0, summary(items));
      assert.ok(items.every(diagnostic => diagnostic.rule === 'unresolved' && diagnostic.severity === 'warning'), summary(items));
    } else if (item.mode === 'literal') {
      literal(items, `width:${item.expression.startsWith('-') ? '-12' : '12'}px`);
      assert.equal(unresolved(items).length, 0, summary(items));
    } else assert.deepEqual(items, []);
  });
});
