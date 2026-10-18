import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
const declaration = 'padding:var(--local-gap)';
const selectors = ['.consumer', 'table.consumer', 'table#target', 'table.consumer:not(.special)'];
const source = (template: string, css: string, extra = '') => `import{Component}from'@angular/core';@Component({selector:'app-table',template:${JSON.stringify(template)},styles:[${JSON.stringify(css)}]})class Table{flag!:boolean;tail!:string;classes!:string;identity!:string;${extra}}throw new Error('Application code must not execute');`;
async function scan(t: TestContext, contents: string, files: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-native-template-scope-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = parseConfig(example);
  input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  const config = resolveConfig(input);
  await mkdir(resolve(root, 'app'));
  for (const [name, text] of Object.entries({ 'app.ts': contents, ...files })) await writeFile(resolve(root, 'app', name), text);
  return checkSources({ root, config, policy: createSourcePolicy(config) });
}
const errors = (report: Awaited<ReturnType<typeof scan>>) => report.diagnostics.filter(d => d.severity === 'error');

test('native fixed and mixed writers cannot contaminate a sibling through shared tag, class or id anchors', async t => {
  for (const writer of [
    'style="--local-gap:17px"',
    '[style.--local-gap]="\'17px\'"',
    '[style.--local-gap]="flag ? \'17px\' : tail + \'px\'"',
    '[ngStyle]="{\'--local-gap\':\'17px\'}"',
    '[style]="\'--local-gap:17px\'"',
  ]) for (const selector of selectors) {
    const report = await scan(t, source(`<table class="special shared" ${writer}></table><table class="consumer shared" id="target"></table>`, `${selector}{${declaration}}`));
    assert.deepEqual(errors(report), [], writer + ' / ' + selector);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved' && d.source.includes(declaration)));
  }
});

test('native same-subject candidates retain fixed violations beside dynamic fragments', async t => {
  for (const [value, rule] of [
    ['17px', 'literal-token'], ['var(--ui-p-red)', 'primitive-reference'],
    ['var(--ui-size-control)', 'token-category'], ['var(--ui-space-missing)', 'unknown-token'],
  ]) {
    const report = await scan(t, source(`<table class="consumer" [style.--local-gap]="flag ? '${value}' : tail + 'px'"></table>`, `table.consumer{${declaration}}`));
    assert.ok(errors(report).some(d => d.rule === rule && d.source.includes(declaration)), JSON.stringify(report.diagnostics));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('every native matching subject must supply a closed value before simple-selector coverage is certified', async t => {
  const first = '<table class="consumer" style="--local-gap:var(--ui-space-field)"></table>';
  assert.deepEqual((await scan(t, source(first + first, `.consumer{${declaration}}`))).diagnostics, []);
  for (const second of [
    '<table class="consumer"></table>',
    '<table class="consumer" style="--local-gap:inherit"></table>',
    '<table class="consumer" style="--local-gap:unset"></table>',
    '<table class="consumer" [style.--local-gap]="flag ? \'var(--ui-space-field)\' : null"></table>',
    '<table class="consumer" [ngStyle]="readRuntime()"></table>',
    '<table [class]="classes"></table>',
  ]) {
    const report = await scan(t, source(first + second, `.consumer{${declaration}}`));
    assert.equal(report.valid, true, JSON.stringify(report.diagnostics));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), second);
  }
});

test('dynamic class and id facts preserve possible native candidates without borrowing another tag', async t => {
  for (const [binding, kind] of [['[class]="classes"', 'class'], ['[ngClass]="classes"', 'class'], ['[id]="identity"', 'id'], ['[attr.id]="identity"', 'id'], ['[class.consumer]="flag"', 'class']]) {
    const template = `<table ${binding} [style.--local-gap]="flag ? '17px' : tail + 'px'"></table>`;
    for (const selector of kind === 'class' ? ['table.consumer', '.consumer'] : ['table#target', '#target']) {
      const report = await scan(t, source(template, `${selector}{${declaration}}`));
      assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.source.includes(declaration)), binding + ' / ' + selector);
      assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
    }
    const unrelated = await scan(t, source(template + '<div class="consumer"></div>', `div.consumer{${declaration}}`));
    assert.deepEqual(errors(unrelated), [], binding);
    const fixedOther = await scan(t, source(template, `${kind === 'class' ? '#target' : '.consumer'}{${declaration}}`));
    assert.deepEqual(errors(fixedOther), [], binding + ' does not change the other selector domain');
  }
});

test('complex native consumers keep known terminal candidates but never infer ancestry or selector coverage', async t => {
  for (const selector of ['table.consumer[data-active]', '.parent table.consumer', 'table.consumer:nth-child(2)', 'table.consumer:is(.extra, #target)']) {
    const wrong = await scan(t, source('<table class="special" [style.--local-gap]="flag ? \'17px\' : tail + \'px\'"></table><table class="consumer"></table>', `${selector}{${declaration}}`));
    assert.deepEqual(errors(wrong), [], selector);
    const same = await scan(t, source('<table class="consumer" [style.--local-gap]="flag ? \'17px\' : tail + \'px\'"></table>', `${selector}{${declaration}}`));
    assert.ok(errors(same).some(d => d.rule === 'literal-token' && d.source.includes(declaration)), selector);
    assert.ok(same.diagnostics.some(d => d.rule === 'unresolved'), selector);
  }
});

test('external templates and shared styles retain owner-local native candidates', async t => {
  const contents = `import{Component}from'@angular/core';@Component({selector:'app-one',templateUrl:'one.html',styleUrl:'shared.css'})class One{flag!:boolean;tail!:string;}@Component({selector:'app-two',templateUrl:'two.html',styleUrl:'shared.css'})class Two{}`;
  const files = { 'one.html': '<table class="special" style="--local-gap:17px"></table><table class="consumer"></table>', 'two.html': '<table class="consumer" style="--local-gap:var(--ui-space-field)"></table>', 'shared.css': `table.consumer{${declaration}}` };
  const report = await scan(t, contents, files);
  assert.deepEqual(errors(report), []);
  assert.ok(report.diagnostics.some(d => d.rule === 'unresolved' && d.file === 'app/shared.css'));
  const same = await scan(t, contents, { ...files, 'one.html': files['one.html'].replace('class="special"', 'class="consumer"') });
  assert.ok(errors(same).some(d => d.rule === 'literal-token' && d.file === 'app/shared.css'));
});

test('native constants do not leak into host consumers, while actual host values can still inherit to children', async t => {
  const child = await scan(t, source('<table class="special" style="--local-gap:17px"></table>', `:host{${declaration}}`));
  assert.deepEqual(errors(child), []);
  assert.ok(child.diagnostics.some(d => d.rule === 'unresolved'));
  const host = await scan(t, `import{Component}from'@angular/core';@Component({selector:'app-test',host:{style:'--local-gap:17px'},template:'<table class="consumer"></table>',styles:['.consumer{${declaration}}']})class App{}`);
  assert.ok(errors(host).some(d => d.rule === 'literal-token' && d.source.includes(declaration)));
});

test('native ancestor candidates follow actual template descendants but not adjacent branches', async t => {
  for (const writer of ['style="--local-gap:17px"', '[style.--local-gap]="flag ? \'17px\' : tail + \'px\'"']) {
    for (const middle of ['<section><table class="consumer"></table></section>', '@if(flag){<table class="consumer"></table>}']) {
      const report = await scan(t, source(`<div ${writer}>${middle}</div><table class="outside"></table>`, `.consumer{${declaration}}.outside{${declaration}}`));
      assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.source.startsWith('.consumer')), JSON.stringify(report.diagnostics));
      assert.ok(!errors(report).some(d => d.source.startsWith('.outside')), JSON.stringify(report.diagnostics));
      assert.ok(report.diagnostics.some(d => d.rule === 'unresolved' && d.source.startsWith('.consumer')));
    }
  }
});

test('anchor-free and functional native consumers retain possible values without certifying scope', async t => {
  for (const selector of ['[data-active]', ':hover', '*', ':is(.consumer,.special)', ':has(.child)', ':has(+ .child)']) {
    const report = await scan(t, source('<table class="special" style="--local-gap:17px"></table>', `${selector}{${declaration}}`));
    assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.source.includes(declaration)), selector);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), selector);
  }
});

test('nonrendering Angular containers cannot supply native values or block real ancestry', async t => {
  for (const tag of ['ng-container', 'ng-template']) {
    const ignored = await scan(t, source(`<${tag} style="--local-gap:99px"><table class="consumer"></table></${tag}>`, `.consumer{${declaration}}`));
    assert.deepEqual(errors(ignored), [], tag);
    assert.ok(ignored.diagnostics.some(d => d.rule === 'unresolved'));
    const inherited = await scan(t, source(`<div style="--local-gap:17px"><${tag} style="--local-gap:99px"><table class="consumer"></table></${tag}></div>`, `.consumer{${declaration}}`));
    assert.equal(errors(inherited).some(d => d.message.includes('17px') && d.source.includes(declaration)), tag === 'ng-container', tag);
    assert.ok(!errors(inherited).some(d => d.message.includes('99px')), tag);
  }
});

test('registered properties keep ancestor inheritance unknown while own native writers remain inspectable', async t => {
  const registration = '@property --local-gap{syntax:"<length>";inherits:false;initial-value:0px}';
  const template = '<div style="--local-gap:17px"><table class="consumer"></table></div>';
  const consumer = `.consumer{${declaration}}`;
  for (const [contents, files] of [
    [source(template, registration + consumer), {}],
    [source(template, consumer), { 'global.css': registration }],
    [source(template, consumer) + `@Component({selector:'app-registry',template:'',styles:[${JSON.stringify(registration)}]})class Registry{}`, {}],
  ] as const) {
    const report = await scan(t, contents, files);
    assert.deepEqual(errors(report), []);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
  const own = await scan(t, source('<table class="consumer" style="--local-gap:17px"></table>', registration + consumer));
  assert.ok(errors(own).some(d => d.rule === 'literal-token' && d.source.includes(declaration)));
  assert.ok(own.diagnostics.some(d => d.rule === 'unresolved'));
});

test('nested native aliases retain the compute node instead of rejoining matching siblings', async t => {
  const first = '<table class="consumer" style="--local-gap:var(--local-other);--local-other:var(--ui-space-field)"></table>';
  const sibling = '<table class="consumer" style="--local-gap:var(--ui-space-field);--local-other:17px"></table>';
  const safe = await scan(t, source(first + sibling, `.consumer{${declaration}}`));
  assert.deepEqual(errors(safe), []);
  const bad = await scan(t, source(first.replace('--local-other:var(--ui-space-field)', '--local-other:17px') + sibling, `.consumer{${declaration}}`));
  assert.ok(errors(bad).some(d => d.message.includes('17px') && d.source.includes(declaration)));
  const missing = await scan(t, source(first + sibling.replace('--local-gap:var(--ui-space-field);', ''), `.consumer{${declaration}}`));
  assert.deepEqual(errors(missing), []);
  assert.ok(missing.diagnostics.some(d => d.rule === 'unresolved'));
});

test('inherited alias expressions resolve at their ancestor rather than substitute descendant values', async t => {
  for (const value of ['0', 'var(--ui-space-field)', '17px']) {
    const report = await scan(t, source(`<div class="parent" style="--local-gap:var(--local-other);--local-other:${value}"><table class="consumer" style="--local-other:99px"></table></div>`, `.consumer{${declaration}}`));
    assert.equal(errors(report).some(d => d.message.includes('17px')), value === '17px', JSON.stringify(report.diagnostics));
    assert.ok(!errors(report).some(d => d.message.includes('99px')), JSON.stringify(report.diagnostics));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('registered native-origin values do not transfer to pseudo-elements, but direct pseudo writers are inspected', async t => {
  const registration = '@property --local-gap{syntax:"<length>";inherits:false;initial-value:0px}';
  for (const pseudo of ['::before', ':before', '::after', '::marker', '::BEFORE']) {
    const consumer = `.consumer${pseudo}{${declaration}}`;
    const report = await scan(t, source('<table class="consumer" style="--local-gap:17px"></table>', registration + consumer));
    assert.deepEqual(errors(report), [], pseudo);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), pseudo);
    const direct = await scan(t, source('<table class="consumer"></table>', registration + consumer.replace(declaration, '--local-gap:17px;' + declaration)));
    assert.ok(errors(direct).some(d => d.rule === 'literal-token' && d.source.includes(declaration)), pseudo);
  }
});

test('native to pseudo aliases compute before inheritance and never substitute pseudo-local values', async t => {
  const template = '<table class="consumer" style="--local-gap:var(--local-other);--local-other:0"></table>';
  const safe = await scan(t, source(template, `.consumer::before{--local-other:17px;${declaration}}`));
  assert.deepEqual(errors(safe), []);
  const bad = await scan(t, source(template.replace('--local-other:0', '--local-other:17px'), `.consumer::before{--local-other:0;${declaration}}`));
  assert.ok(errors(bad).some(d => d.message.includes('17px') && d.source.includes(declaration)));
});

test('CSS alias definitions distinguish native elements and each pseudo-element', async t => {
  const template = '<table class="consumer"></table>';
  for (const css of [
    `.consumer::before{--local-gap:17px}.consumer{${declaration}}`,
    `.consumer::before{--local-gap:17px}.consumer::after{${declaration}}`,
    `@property --local-gap{syntax:"<length>";inherits:false;initial-value:0px}.consumer{--local-gap:17px}.consumer::before{${declaration}}`,
  ]) {
    const report = await scan(t, source(template, css));
    assert.deepEqual(errors(report), [], css);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), css);
  }
  const same = await scan(t, source(template, `.consumer:before{--local-gap:17px}.consumer::BEFORE{${declaration}}`));
  assert.ok(errors(same).some(d => d.rule === 'literal-token'));
});

test('recursive native alias resolution uses combined origin facts for CSS definitions and keeps uncertain matches open', async t => {
  const own = '<table class="consumer" id="safe" style="--local-gap:var(--local-other);--local-other:0"></table>';
  const sibling = '<table class="special" id="other"></table>';
  for (const selector of ['table.special', 'table#other', '.special', '#other', 'table:not(.consumer)']) {
    const report = await scan(t, source(own + sibling, `${selector}{--local-other:17px}.consumer{${declaration}}`));
    assert.deepEqual(errors(report), [], selector);
    const same = await scan(t, source(own.replace('class="consumer" id="safe"', 'class="consumer special" id="other"'), `${selector === 'table:not(.consumer)' ? 'table.consumer' : selector}{--local-other:17px}.consumer{${declaration}}`));
    assert.ok(errors(same).some(d => d.message.includes('17px') && d.source.includes(declaration)), selector);
  }
  const dynamic = await scan(t, source('<table [class]="classes" style="--local-gap:var(--local-other)"></table>', `.consumer{--local-other:17px;${declaration}}`));
  assert.ok(errors(dynamic).some(d => d.message.includes('17px')));
  assert.ok(dynamic.diagnostics.some(d => d.rule === 'unresolved'));
});

test('native and ancestor aliases retain host CSS inheritance without borrowing descendant variables', async t => {
  for (const template of [
    '<table class="consumer" style="--local-gap:var(--local-other)"></table>',
    '<div style="--local-gap:var(--local-other)"><table class="consumer"></table></div>',
  ]) {
    const bad = await scan(t, source(template, `:host{--local-other:17px}.consumer{${declaration}}`));
    assert.ok(errors(bad).some(d => d.message.includes('17px') && d.source.includes(declaration)));
    const registered = await scan(t, source(template, `@property --local-other{syntax:"<length>";inherits:false;initial-value:0px}:host{--local-other:17px}.consumer{${declaration}}`));
    assert.deepEqual(errors(registered), []);
    assert.ok(registered.diagnostics.some(d => d.rule === 'unresolved'));
  }
  const hostExpression = await scan(t, source('<table class="consumer" style="--local-gap:var(--local-host);--local-other:17px"></table>', `:host{--local-host:var(--local-other);--local-other:0}.consumer{${declaration}}`));
  assert.deepEqual(errors(hostExpression), []);
});
