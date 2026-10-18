import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
async function scan(t: TestContext, host: string, template: string, css: string, members = '', files: Record<string, string> = {}, global = false) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-host-metadata-origin-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, 'app'));
  const input = parseConfig(example);
  input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  const config = resolveConfig(input);
  const source = `import{Component,HostBinding,ViewEncapsulation}from'@angular/core';@Component({selector:'app-owner',${global ? 'encapsulation:ViewEncapsulation.None,' : ''}host:${host},template:${JSON.stringify(template)},styles:[${JSON.stringify(css)}]})class Owner{flag!:boolean;tail!:string;${members}}throw new Error('Do not execute application code');`;
  for (const [name, text] of Object.entries({ 'app.ts': source, ...files })) await writeFile(resolve(root, 'app', name), text);
  return checkSources({ root, config, policy: createSourcePolicy(config) });
}
const gap = 'padding:var(--local-gap)';
const host = (value: string) => JSON.stringify({ style: `--local-host:var(--local-other);--local-other:${value}` });
const child = '<table class="consumer" style="--local-gap:var(--local-host);--local-other:17px"></table>';
const errors = (report: Awaited<ReturnType<typeof scan>>) => report.diagnostics.filter(d => d.severity === 'error');

test('host metadata alias expressions retain the host compute origin through native and pseudo consumers', async t => {
  for (const selector of ['.consumer', '.consumer::before', ':host::before']) {
    const template = selector.startsWith(':host') ? '' : child;
    const css = selector.startsWith(':host') ? `:host::before{--local-other:17px;--local-gap:var(--local-host);${gap}}` : `${selector}{${gap}}`;
    const report = await scan(t, host('0'), template, css);
    assert.deepEqual(errors(report), [], selector);
    if (!selector.startsWith(':host')) assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), 'native inheritance/cascade remains unconfirmed');
  }
});

test('host metadata and HostBinding forms keep expressions out of the unscoped value pool', async t => {
  const forms = [
    [host('0'), ''],
    [JSON.stringify({ '[style.--local-host]': "'var(--local-other)'", '[style.--local-other]': '0' }), ''],
    [JSON.stringify({ '[style]': "'--local-host:var(--local-other);--local-other:0'" }), ''],
    [JSON.stringify({ '[ngStyle]': "{'--local-host':'var(--local-other)','--local-other':'0'}" }), ''],
    ['{}', "@HostBinding('style.--local-host') readonly h='var(--local-other)';@HostBinding('style.--local-other') readonly v='0';"],
    ['{}', "@HostBinding('style') readonly bag='--local-host:var(--local-other);--local-other:0';"],
  ];
  for (const [metadata, members] of forms) {
    const report = await scan(t, metadata, child, `.consumer{${gap}}`, members);
    assert.deepEqual(errors(report), [], metadata + members);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('host expressions inspect known host violations and never substitute safe descendant values', async t => {
  for (const [value, rule] of [['19px', 'literal-token'], ['var(--ui-p-red)', 'primitive-reference'], ['var(--ui-size-control)', 'token-category'], ['var(--ui-space-missing)', 'unknown-token']]) {
    const report = await scan(t, host(value), child.replace('17px', '0'), `.consumer{${gap}}`);
    assert.ok(errors(report).some(d => d.rule === rule && d.source.includes(gap)), JSON.stringify(report.diagnostics));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('host expressions resolve host CSS definitions rather than native stylesheet or template values', async t => {
  for (const css of [
    `:host{--local-other:0}.consumer{--local-other:17px;${gap}}`,
    `:host{--local-other:0}.consumer{${gap}}.sibling{--local-other:17px}`,
  ]) {
    const report = await scan(t, JSON.stringify({ style: '--local-host:var(--local-other)' }), child, css);
    assert.deepEqual(errors(report), []);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
  const bad = await scan(t, host('0'), child.replace('17px', '0'), `:host{--local-other:19px}.consumer{${gap}}`);
  assert.ok(errors(bad).some(d => d.rule === 'literal-token' && d.source.includes(gap)), 'known CSS host override remains inspected');
});

test('host alias chains, dynamic branches, cycles and missing producers retain conservative coverage', async t => {
  for (const metadata of [
    JSON.stringify({ style: '--local-host:var(--local-middle);--local-middle:var(--local-other);--local-other:0' }),
    JSON.stringify({ '[style.--local-host]': "flag ? 'var(--local-other)' : tail", '[style.--local-other]': "'0'" }),
    JSON.stringify({ style: '--local-host:var(--local-other);--local-other:var(--local-host)' }),
    JSON.stringify({ style: '--local-host:var(--local-missing)' }),
  ]) {
    const report = await scan(t, metadata, child, `.consumer{${gap}}`);
    assert.deepEqual(errors(report), [], metadata);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('registered properties do not gain assumed host inheritance; direct host writers are still inspected', async t => {
  for (const name of ['--local-host', '--local-other']) {
    const registration = `@property ${name}{syntax:'*';inherits:false;initial-value:0}`;
    const report = await scan(t, host(name === '--local-host' ? '19px' : '0'), child, registration + `.consumer{${gap}}`);
    assert.deepEqual(errors(report), []);
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
  const direct = await scan(t, host('19px'), '', `@property --local-host{syntax:'*';inherits:false;initial-value:0}:host{padding:var(--local-host)}`);
  assert.ok(errors(direct).some(d => d.rule === 'literal-token'));
  assert.ok(direct.diagnostics.some(d => d.rule === 'unresolved'));
});

test('global host writers retain their compute origin', async t => {
  const report = await scan(t, JSON.stringify({ style: '--local-host:var(--local-other);--local-other:0' }), child, `.consumer{${gap}}`, '', { 'global.css': 'app-owner{--local-host:var(--local-other)}' });
  assert.deepEqual(errors(report), []);
  assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
});

test('external templates and styles retain host expression origins', async t => {
  const report = await scan(t, '{}', '', '', '', {
    'external.ts': `import{Component}from'@angular/core';@Component({selector:'app-external',host:${host('0')},templateUrl:'./external.html',styleUrl:'./external.css'})class External{}`,
    'external.html': child,
    'external.css': `.consumer{${gap}}`,
  });
  assert.deepEqual(errors(report), []);
  assert.ok(report.diagnostics.some(d => d.file === 'app/external.css' && d.rule === 'unresolved'));
});

test('parent templates and coapplied directives compute receiving host aliases before inheritance', async t => {
  for (const value of ['0', '19px']) for (const directive of [false, true]) {
    const report = await scan(t, '{}', '', '', '', {
      'receivers.ts': `import{Component,Directive}from'@angular/core';
@Directive({selector:'[supply]',host:${host(value)}})class Supply{}
@Component({selector:'app-receiver',template:${JSON.stringify(child)},styles:[${JSON.stringify(`.consumer{${gap}}`)}]})class Receiver{}
@Component({selector:'app-parent',imports:[Receiver,Supply],template:${JSON.stringify(directive ? '<app-receiver supply></app-receiver>' : `<app-receiver style="--local-host:var(--local-other);--local-other:${value}"></app-receiver>`)}})class Parent{}`,
    });
    assert.equal(errors(report).some(d => d.rule === 'literal-token' && d.source.includes(gap)), value === '19px', JSON.stringify(report.diagnostics));
    assert.ok(!errors(report).some(d => d.message.includes('Concrete value 17px')));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('global encapsulation retains host metadata candidates without borrowing child values', async t => {
  for (const value of ['0', '19px']) {
    const report = await scan(t, host(value), child, `.consumer{${gap}}`, '', {}, true);
    assert.equal(errors(report).some(d => d.rule === 'literal-token'), value === '19px', JSON.stringify(report.diagnostics));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('mixed dynamic host candidates retain whole invalid branches beside unresolved fragments', async t => {
  const metadata = JSON.stringify({ '[style.--local-host]': "flag ? 'var(--local-other)' : tail + 'px'", '[style.--local-other]': "flag ? '19px' : tail + 'px'" });
  const report = await scan(t, metadata, child.replace('17px', '0'), `.consumer{${gap}}`);
  assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.message.includes('19px') && d.source.includes(gap)));
  assert.ok(!errors(report).some(d => d.message.includes('Concrete value px')));
  assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
});

test('global component sheets inspect actual host tag, class and compound CSS definitions', async t => {
  const metadata = JSON.stringify({ class: 'host', id: 'owner', style: '--local-host:var(--local-other)' });
  for (const selector of ['app-owner', '.host', 'app-owner.host', '#owner', 'app-owner#owner']) {
    const report = await scan(t, metadata, '<div class="host" id="owner" style="--local-other:17px"></div>', `${selector}{--local-other:19px;padding:var(--local-host)}`, '', {}, true);
    assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.message.includes('19px')), selector + JSON.stringify(report.diagnostics));
    assert.ok(!errors(report).some(d => d.message.includes('Concrete value 17px')));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('global host CSS alias chains keep all host facts and exclude same-selector native writers', async t => {
  const template = '<app-owner class="host" style="--local-end:17px"></app-owner>';
  for (const value of ['0', '19px']) for (const registered of [false, true]) for (const own of [false, true]) {
    const metadata = JSON.stringify({ class: 'host', style: `--local-host:var(--local-other)${own ? ';--local-end:' + value : ''}` });
    const css = (registered ? '@property --local-end{syntax:"*";inherits:false;initial-value:0}' : '') + `app-owner{--local-other:var(--local-end);padding:var(--local-host)}` + (own ? '' : `.host{--local-end:${value}}`);
    const report = await scan(t, metadata, template, css, '', {}, true);
    assert.equal(errors(report).some(d => d.rule === 'literal-token' && d.message.includes('19px')), value === '19px', JSON.stringify(report.diagnostics));
    assert.ok(!errors(report).some(d => d.message.includes('Concrete value 17px')));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('external global host sheets retain known CSS dependency candidates across alias recursion', async t => {
  const report = await scan(t, '{}', '', '', '', {
    'external.ts': `import{Component,ViewEncapsulation}from'@angular/core';@Component({selector:'app-external',encapsulation:ViewEncapsulation.None,host:{class:'host',style:'--local-host:var(--local-other)'},template:'<app-external class="host" style="--local-end:17px"></app-external>',styleUrl:'./external.css'})class External{}`,
    'external.css': 'app-external{--local-other:var(--local-end);padding:var(--local-host)}.host{--local-end:19px}',
  });
  assert.ok(errors(report).some(d => d.file === 'app/external.css' && d.rule === 'literal-token' && d.message.includes('19px')), JSON.stringify(report.diagnostics));
  assert.ok(!errors(report).some(d => d.message.includes('Concrete value 17px')));
  assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
});

test('global host selector bindings retain possible CSS values without borrowing native writers', async t => {
  const base = { style: '--local-host:var(--local-other)' };
  const forms: [string, string, string][] = [
    [JSON.stringify({ ...base, '[class]': "'active'" }), '', '.active'],
    [JSON.stringify({ ...base, '[class.active]': 'flag' }), '', '.active'],
    [JSON.stringify({ ...base, '[ngClass]': "['active']" }), '', '.active'],
    [JSON.stringify({ ...base, '[attr.class]': "'active'" }), '', '.active'],
    [JSON.stringify(base), "@HostBinding('class') readonly classes='active';", '.active'],
    [JSON.stringify(base), "@HostBinding('class.active') readonly active=true;", '.active'],
    [JSON.stringify({ ...base, '[id]': "'active'" }), '', '#active'],
    [JSON.stringify({ ...base, '[attr.id]': "'active'" }), '', '#active'],
    [JSON.stringify(base), "@HostBinding('id') readonly identity='active';", '#active'],
  ];
  for (const [metadata, members, selector] of forms) {
    const report = await scan(t, metadata, '<div class="active" id="active" style="--local-other:17px"></div>', `${selector}{--local-other:19px;padding:var(--local-host)}`, members, {}, true);
    assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.message.includes('19px')), metadata + members + JSON.stringify(report.diagnostics));
    assert.ok(!errors(report).some(d => d.message.includes('Concrete value 17px')));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
    const safe = await scan(t, metadata, '<div class="active" id="active" style="--local-other:17px"></div>', `${selector}{--local-other:0;padding:var(--local-host)}`, members, {}, true);
    assert.deepEqual(errors(safe), []);
    const scoped = await scan(t, metadata, '<div class="active" id="active" style="--local-other:17px"></div>', `${selector}{--local-other:19px;padding:var(--local-host)}`, members);
    assert.deepEqual(errors(scoped), [], 'encapsulated native rules do not define host dependencies');
  }
  for (const directive of [false, true]) {
    const report = await scan(t, '{}', '', '', '', {
      'applied.ts': `import{Component,Directive,ViewEncapsulation}from'@angular/core';
@Directive({selector:'[active]',host:{'[class]':"'active'"}})class Active{}
@Component({selector:'app-child',encapsulation:ViewEncapsulation.None,host:${JSON.stringify(base)},template:'<div class="active" style="--local-other:17px"></div>',styles:['.active{--local-other:19px;padding:var(--local-host)}']})class Child{}
@Component({selector:'app-parent',imports:[Child,Active],template:${JSON.stringify(directive ? '<app-child active></app-child>' : '<app-child [class]="\'active\'"></app-child>')}})class Parent{}`,
    });
    assert.ok(errors(report).some(d => d.rule === 'literal-token' && d.message.includes('19px')), JSON.stringify(report.diagnostics));
    assert.ok(!errors(report).some(d => d.message.includes('Concrete value 17px')));
  }
});

test('registered global host writers are own candidates while descendants and pseudos remain unconfirmed', async t => {
  const metadata = JSON.stringify({ style: '--local-gap:19px' });
  const registration = '@property --local-gap{syntax:"*";inherits:false;initial-value:0}';
  for (const selector of ['app-owner', '.consumer', 'app-owner::before']) {
    const report = await scan(t, metadata, '<table class="consumer"></table>', registration + `${selector}{${gap}}`, '', {}, true);
    assert.equal(errors(report).some(d => d.rule === 'literal-token'), selector === 'app-owner', JSON.stringify(report.diagnostics));
    assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'));
  }
  const nativeAlias = await scan(t, JSON.stringify({ class: 'consumer', style: '--local-gap:19px' }), '<table class="consumer" style="--local-use:var(--local-gap);--local-gap:0"></table>', registration + '.consumer{padding:var(--local-use)}', '', {}, true);
  assert.deepEqual(errors(nativeAlias), [], 'an identified native alias cannot become an own-host registered-property consumer');
  assert.ok(nativeAlias.diagnostics.some(d => d.rule === 'unresolved'));
});
