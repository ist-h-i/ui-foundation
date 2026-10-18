import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
import type { CheckException } from '../../src/check/types.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
const gap = 'padding:var(--local-gap)';
async function scan(t: TestContext, source: string, css = '', exceptions: CheckException[] = []) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-host-applications-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, 'app'));
  const input = parseConfig(example);
  input.checks = { source_roots: ['app'], approved_components: [], exceptions };
  const config = resolveConfig(input);
  await writeFile(resolve(root, 'app/app.ts'), `import{Component,Directive,HostBinding,ViewEncapsulation}from'@angular/core';${source}\nthrow new Error('Application fixture must never execute');`);
  if (css) await writeFile(resolve(root, 'app/global.css'), css);
  return checkSources({ root, config, policy: createSourcePolicy(config) });
}
type Report = Awaited<ReturnType<typeof scan>>;
const errors = (report: Report) => report.diagnostics.filter(d => d.severity === 'error');
function hasLiteral(report: Report, value: string, file?: string) {
  return errors(report).some(d => d.rule === 'literal-token' && d.message.includes(`Concrete value ${value} `) && d.source.includes(gap) && (!file || d.file === file));
}
function unknown(report: Report) {
  assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), JSON.stringify(report.diagnostics));
}
function applications(template: string, css = `:host{${gap}}`, host = '{}', directives = '') {
  return `${directives}@Component({selector:'app-child',host:${host},template:'',styles:[${JSON.stringify(css)}]})class Child{}
@Component({selector:'app-parent',imports:[Child${directives ? ',Supply' : ''}],template:${JSON.stringify(template)}})class Parent{}`;
}

test('separate host applications do not pair an alias with another instance dependency', async t => {
  for (const reverse of [false, true]) {
    const nodes = ['<app-child style="--local-gap:var(--local-other);--local-other:0"></app-child>', '<app-child style="--local-gap:0;--local-other:17px"></app-child>'];
    const report = await scan(t, applications((reverse ? nodes.reverse() : nodes).join('')));
    assert.deepEqual(errors(report), [], JSON.stringify(report.diagnostics));
    unknown(report);
  }
});

test('same-instance bad aliases remain inspectable beside a safe application', async t => {
  const report = await scan(t, applications('<app-child style="--local-gap:var(--local-other);--local-other:17px"></app-child><app-child style="--local-gap:0;--local-other:0"></app-child>'));
  assert.ok(hasLiteral(report, '17px'), JSON.stringify(report.diagnostics));
  unknown(report);
});

test('missing dependencies stay Unknown and cannot borrow values from other applications', async t => {
  for (const alias of ['var(--local-other)', 'var(--local-middle)']) {
    const middle = alias.includes('middle') ? ';--local-middle:var(--local-other)' : '';
    const report = await scan(t, applications(`<app-child style="--local-gap:${alias}${middle}"></app-child><app-child style="--local-gap:0;--local-other:17px"></app-child>`));
    assert.deepEqual(errors(report), [], JSON.stringify(report.diagnostics));
    unknown(report);
  }
});

test('component-own host aliases resolve dependencies from each receiving application', async t => {
  for (const value of ['0', '19px']) {
    const report = await scan(t, applications(`<app-child style="--local-other:0"></app-child><app-child style="--local-other:${value}"></app-child>`, `:host{${gap}}`, JSON.stringify({ style: '--local-gap:var(--local-other)' })));
    assert.equal(hasLiteral(report, '19px'), value === '19px', JSON.stringify(report.diagnostics));
    unknown(report);
  }
});

test('multi-level CSS aliases retain application-local dependencies and inspect CSS overrides', async t => {
  for (const value of ['0', '19px']) {
    const report = await scan(t, applications(`<app-child class="left" style="--local-gap:var(--local-middle);--local-end:${value}"></app-child><app-child style="--local-gap:0;--local-end:17px"></app-child>`), '.left{--local-middle:var(--local-end)}');
    assert.equal(hasLiteral(report, '19px'), value === '19px', JSON.stringify(report.diagnostics));
    assert.ok(!hasLiteral(report, '17px'), JSON.stringify(report.diagnostics));
    unknown(report);
  }
  const override = await scan(t, applications('<app-child style="--local-other:0"></app-child>', `:host{--local-other:19px;${gap}}`, JSON.stringify({ style: '--local-gap:var(--local-other)' })));
  assert.ok(hasLiteral(override, '19px'), 'known CSS candidates remain inspected alongside host bindings');
});

test('coapplied directive writers resolve only on their receiving instance', async t => {
  const directive = `@Directive({selector:'[supply]',host:{style:'--local-gap:var(--local-other)'}})class Supply{}`;
  for (const value of ['0', '19px']) {
    const report = await scan(t, applications(`<app-child supply style="--local-other:${value}"></app-child><app-child style="--local-gap:0;--local-other:17px"></app-child>`, `:host{${gap}}`, '{}', directive));
    assert.equal(hasLiteral(report, '19px'), value === '19px', JSON.stringify(report.diagnostics));
    assert.ok(!hasLiteral(report, '17px'), JSON.stringify(report.diagnostics));
    unknown(report);
  }
});

test('classes and ids from different applications never fabricate compound selector matches', async t => {
  for (const [first, second, selector] of [
    ['class="left"', 'class="right"', '.left.right'],
    ['class="left"', 'id="right"', '.left#right'],
  ]) {
    for (const same of [false, true]) {
      const report = await scan(t, applications(`<app-child ${first}${same ? ' ' + second : ''} style="--local-gap:var(--local-other);--local-other:0"></app-child><app-child ${second} style="--local-gap:0;--local-other:0"></app-child>`, `:host{${gap}}`), `${selector}{--local-other:19px}`);
      assert.equal(hasLiteral(report, '19px'), same, JSON.stringify(report.diagnostics));
      unknown(report);
    }
  }
});

test('registered properties and pseudo consumers preserve the host inheritance barrier', async t => {
  const registration = '@property --local-gap{syntax:"*";inherits:false;initial-value:0}';
  for (const selector of [':host', ':host::before']) {
    const report = await scan(t, applications('<app-child style="--local-gap:19px"></app-child>', `${registration}${selector}{${gap}}`));
    assert.equal(hasLiteral(report, '19px'), selector === ':host', JSON.stringify(report.diagnostics));
    unknown(report);
  }
});

test('separate global CSS sees known and mutable host class/id bindings and retains Unknown', async t => {
  const forms: [Record<string, string>, string, string][] = [
    [{ '[class]': "'active'" }, '', '.active'],
    [{ '[class]': "flag ? 'active' : tail" }, '', '.active'],
    [{ '[class.active]': 'flag' }, '', '.active'],
    [{ '[ngClass]': "['active']" }, '', '.active'],
    [{ '[attr.class]': "'active'" }, '', '.active'],
    [{ '[id]': "'active'" }, '', '#active'],
    [{ '[attr.id]': "flag ? 'active' : tail" }, '', '#active'],
    [{}, "@HostBinding('class') readonly classes='active';", '.active'],
    [{}, "@HostBinding('class.active') active!:boolean;", '.active'],
    [{}, "@HostBinding('id') readonly identity='active';", '#active'],
  ];
  for (const [binding, members, selector] of forms) for (const value of ['0', '19px']) {
    const source = `@Component({selector:'app-owner',host:${JSON.stringify({ ...binding, style: '--local-gap:var(--local-other)' })},template:'<div class="active" id="active" style="--local-other:17px"></div>'})class Owner{flag!:boolean;tail!:string;${members}}`;
    const report = await scan(t, source, `${selector}{--local-other:${value};${gap}}`);
    assert.equal(hasLiteral(report, '19px', 'app/global.css'), value === '19px', JSON.stringify(binding) + members + JSON.stringify(report.diagnostics));
    assert.ok(!hasLiteral(report, '17px'), JSON.stringify(report.diagnostics));
    unknown(report);
  }
});

test('separate global CSS observes parent and coapplied bindings without unrelated selectors', async t => {
  for (const directive of [false, true]) for (const identity of ['class', 'id']) {
    const selector = identity === 'class' ? '.active' : '#active';
    const binding = identity === 'class' ? '[class.active]' : '[attr.id]';
    const expression = identity === 'class' ? 'flag' : "'active'";
    const declaration = directive ? `@Directive({selector:'[supply]',host:${JSON.stringify({ [binding]: expression })}})class Supply{flag!:boolean;}` : '';
    const template = directive ? '<app-child supply></app-child>' : `<app-child ${binding}="${expression}"></app-child>`;
    const source = applications(template, `:host{${gap}}`, JSON.stringify({ style: '--local-gap:var(--local-other)' }), declaration);
    const report = await scan(t, source, `${selector}{--local-other:19px;${gap}}`);
    assert.ok(hasLiteral(report, '19px', 'app/global.css'), JSON.stringify(report.diagnostics));
    unknown(report);
    const unrelated = await scan(t, source, `app-unrelated{--local-other:21px}.unrelated{--local-other:23px}#unrelated{--local-other:25px}${selector}{--local-other:0;${gap}}`);
    assert.deepEqual(errors(unrelated), [], JSON.stringify(unrelated.diagnostics));
    unknown(unrelated);
  }
});

test('finite selector bindings do not enable unrelated classes or ids, while optional names cannot prove negation', async t => {
  for (const binding of [{ '[class]': "'active'" }, { '[class.active]': 'flag' }, { '[ngClass]': "{active:flag}" }, { '[id]': "'active'" }, { '[class.active]': 'false' }]) {
    const source = `@Component({selector:'app-owner',host:${JSON.stringify({ ...binding, style: '--local-gap:var(--local-other)' })},template:'<div class="unrelated" id="unrelated" style="--local-other:17px"></div>'})class Owner{flag!:boolean;}`;
    const report = await scan(t, source, '.unrelated{--local-other:19px}#unrelated{--local-other:21px}app-owner{--local-other:0;padding:var(--local-gap)}');
    assert.deepEqual(errors(report), [], JSON.stringify(report.diagnostics)); unknown(report);
  }
  const optional = await scan(t, `@Component({selector:'app-owner',encapsulation:ViewEncapsulation.None,host:{'[class.active]':'flag',style:'--local-gap:var(--local-other)'},template:'',styles:['app-owner:not(.active){--local-other:19px}app-owner{padding:var(--local-gap)}']})class Owner{flag!:boolean;}`);
  assert.ok(hasLiteral(optional, '19px'), JSON.stringify(optional.diagnostics)); unknown(optional);
});

test('global CSS aliases that enter host dependencies do not cross application selectors', async t => {
  const source = applications('<app-child class="left" style="--local-other:0"></app-child><app-child class="right" style="--local-other:17px"></app-child>', '');
  const report = await scan(t, source, '.left{--local-gap:var(--local-other);padding:var(--local-gap)}');
  assert.deepEqual(errors(report), [], JSON.stringify(report.diagnostics)); unknown(report);
});

test('alias-value exceptions cannot approve a replaced cap or an additional overriding value', async t => {
  const source = (cap: string) => `@Component({selector:'app-owner',host:{'[class]':"'active'",style:'--local-gap:min(var(--ui-size-form-label), ${cap}) minmax(0, 1fr)'},template:''})class Owner{}`;
  const css = '.active{grid-template-columns:var(--local-gap)}';
  const initial = await scan(t, source('40%'), css);
  const issue = initial.diagnostics.find(d => d.rule === 'literal-token'); assert.ok(issue);
  assert.ok(issue.source.includes(' :: --local-gap=min(var(--ui-size-form-label), 40%)'));
  const exception = { file: issue.file, rule: issue.rule, source: issue.source, line: issue.line, column: issue.column, reason: 'Only the reviewed parent-relative 40% label cap.' };
  const allowed = await scan(t, source('40%'), css, [exception]); assert.equal(allowed.valid, true); assert.equal(allowed.exceptions.length, 1); unknown(allowed);
  const replaced = await scan(t, source('19%'), css, [exception]);
  assert.ok(replaced.diagnostics.some(d => d.rule === 'exception-error')); assert.ok(replaced.diagnostics.some(d => d.rule === 'literal-token' && d.message.includes('19%')));
  const override = await scan(t, source('40%'), '.active{--local-gap:17px;grid-template-columns:var(--local-gap)}', [exception]);
  assert.ok(override.diagnostics.some(d => d.rule === 'literal-token' && d.message.includes('17px'))); assert.equal(override.exceptions.length, 0); assert.ok(override.diagnostics.some(d => d.rule === 'exception-error'), 'moving the declaration invalidates the exact location exception');
});


test('finite host selector alternatives preserve coexistence through compound and recursive CSS aliases', async t => {
  for (const [binding, impossible, possible] of [
    [{ '[class]': "flag ? 'left' : 'right'" }, '.left.right', '.left'],
    [{ '[ngClass]': "flag ? {left:true} : {right:true}" }, '.left.right', '.left'],
    [{ '[id]': "flag ? 'left' : 'right'" }, '#left#right', '#left'],
  ] as const) {
    const source = `@Component({selector:'app-owner',host:${JSON.stringify({...binding,style:'--local-gap:var(--local-other);--local-other:0'})},template:'',styles:[':host{${gap}}']})class Owner{flag!:boolean}`;
    const safe = await scan(t, source, `${impossible}{--local-other:19px}`);
    assert.deepEqual(errors(safe), [], JSON.stringify(safe.diagnostics)); unknown(safe);
    const bad = await scan(t, source, `${possible}{--local-other:19px}`);
    assert.ok(hasLiteral(bad, '19px'), JSON.stringify(bad.diagnostics)); unknown(bad);
  }
  for (const combined of [false, true]) {
    const host = JSON.stringify({'[class]':combined ? "flag ? 'left right' : 'none'" : "flag ? 'left' : 'right'",style:'--local-gap:var(--local-other);--local-other:0'});
    const source = `@Component({selector:'app-owner',host:${host},template:''})class Owner{flag!:boolean}`;
    const report = await scan(t, source, `.left{${gap}}.right{--local-other:19px}`);
    assert.equal(hasLiteral(report, '19px'), combined, JSON.stringify(report.diagnostics)); unknown(report);
    const compound = await scan(t, source.replace("template:''", `template:'',styles:[':host{${gap}}']`), '.left.right{--local-other:19px}');
    assert.equal(hasLiteral(compound, '19px'), combined, JSON.stringify(compound.diagnostics)); unknown(compound);
  }
  const additive = await scan(t, `@Component({selector:'app-owner',host:{'[class]':"flag ? 'left' : 'right'",'[class.left]':'true',style:'--local-gap:var(--local-other);--local-other:0'},template:'',styles:[':host{${gap}}']})class Owner{flag!:boolean}`, '.left.right{--local-other:19px}');
  assert.ok(hasLiteral(additive, '19px'), JSON.stringify(additive.diagnostics)); unknown(additive);
});


test('native finite selector branches retain separate identities through foreign CSS and alias recursion', async t => {
  for (const [key, expression, selector] of [
    ['class', "flag ? 'left' : 'right'", '.left.right'],
    ['ngClass', "flag ? {left:true} : {right:true}", '.left.right'],
    ['id', "flag ? 'left' : 'right'", '#left#right'],
  ]) for (const globalConsumer of [false, true]) for (const combined of [false, true]) {
    const selected = combined ? key === 'id' ? "'left'" : "'left right'" : expression;
    const match = combined && key === 'id' ? '#left' : selector;
    const template = `<div class="consumer" [${key}]="${selected}" style="--local-gap:var(--local-other);--local-other:0"></div>`;
    const source = `@Component({selector:'app-owner',template:${JSON.stringify(template)},styles:[${JSON.stringify(globalConsumer ? '' : `.consumer{${gap}}`)}]})class Owner{flag!:boolean}`;
    const report = await scan(t, source, `${match}{--local-other:19px;${globalConsumer ? gap : ''}}`);
    assert.equal(hasLiteral(report, '19px'), combined, JSON.stringify(report.diagnostics)); unknown(report);
  }
  for (const combined of [false, true]) {
    const template = `<div [class]="${combined ? "flag ? 'left right' : 'none'" : "flag ? 'left' : 'right'"}" style="--local-gap:var(--local-other);--local-other:0"></div>`;
    const report = await scan(t, `@Component({selector:'app-owner',template:${JSON.stringify(template)}})class Owner{flag!:boolean}`, `.left{${gap}}.right{--local-other:19px}`);
    assert.equal(hasLiteral(report, '19px'), combined, JSON.stringify(report.diagnostics)); unknown(report);
  }
});

test('the project label-cap exception retains the audited fixed ratio and producer dependencies', async () => {
  const audit = JSON.parse(await readFile(new URL('../fixtures/static-checks/host-applications/form-label-cap-audit.json', import.meta.url), 'utf8'));
  for (const [file, expected] of Object.entries(audit.producer_sha256)) {
    const actual = createHash('sha256').update(await readFile(new URL('../../' + file, import.meta.url))).digest('hex');
    assert.equal(actual, expected, `${file}: re-audit the structural label cap before refreshing the proof`);
  }
  const config = parseConfig(example), issue = audit.new_diagnostic;
  assert.equal(config.checks!.exceptions.filter(e => e.file === issue.file && e.rule === issue.rule && e.line === issue.line && e.column === issue.column && e.source === issue.source).length, 1);
  assert.equal(audit.existing_checkbox_exception.file, 'templates/angular/styles.css');
  assert.equal(audit.existing_checkbox_exception.line, 172);
  assert.ok(audit.existing_checkbox_exception.source.includes('40%'));
});


test('coapplied directive binding names expose native candidates without broadening unrelated class names', async t => {
  for (const key of ['class.active', 'class', 'id']) for (const value of ['0','19px']) for (const same of [false,true]) {
    const selector = key === 'id' ? '#active' : '.active';
    const binding = key === 'class.active' ? 'true' : "'active'";
    const directive = `@Directive({selector:'[supply]',host:${JSON.stringify({['[' + key + ']']:binding,style:`--local-gap:${value}`})}})class Supply{}`;
    const template = same ? '<div supply></div>' : '<div supply></div><p class="consumer"></p>';
    const css = same ? `${selector}{${gap}}` : `.consumer{${gap}}`;
    const report = await scan(t, `${directive}@Component({selector:'app-owner',imports:[Supply],template:${JSON.stringify(template)},styles:[${JSON.stringify(css)}]})class Owner{}`);
    assert.equal(hasLiteral(report,'19px'), same && value === '19px', JSON.stringify(report.diagnostics)); unknown(report);
  }
});


test('Angular selector alternatives do not add another matching branch to actual or fallback hosts', async t => {
  for (const actual of [false,true]) for (const combined of [false,true]) {
    const child = `@Component({selector:'app-a.left,app-b.right',template:'',host:{style:'--local-gap:var(--local-other);--local-other:0'},styles:[':host{${gap}}']})class Child{}`;
    const parent = actual ? `@Component({selector:'app-parent',imports:[Child],template:'<app-a class="left${combined ? ' right' : ''}"></app-a><app-b class="right"></app-b>'})class Parent{}` : '';
    const report = await scan(t, child + parent, `${combined && !actual ? '.left' : '.left.right'}{--local-other:19px}`);
    assert.equal(hasLiteral(report,'19px'), combined, JSON.stringify(report.diagnostics)); unknown(report);
  }
  for (const actualRight of [false,true]) {
    const source = `@Directive({selector:'[supply],.right',host:{style:'--local-gap:var(--local-other);--local-other:0'}})class Supply{}@Component({selector:'app-parent',imports:[Supply],template:'<div class="consumer${actualRight ? ' right' : ''}" supply></div>'})class Parent{}`;
    const report = await scan(t, source, `.consumer{${gap}}.right{--local-other:19px}`);
    assert.equal(hasLiteral(report,'19px'), actualRight, JSON.stringify(report.diagnostics)); unknown(report);
  }
});
