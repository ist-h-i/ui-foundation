import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
import { checkCSS } from '../../src/check/styles.ts';
import type { SourceDiagnostic, StyleContext } from '../../src/check/types.ts';

const border = 'var(--ui-border-control) var(--ui-divider-style) var(--ui-color-border)';
const table = 'calc(var(--ui-specialist-columns) * max(var(--ui-size-table-column-min),calc(8em + var(--ui-space-table-x) * 2)))';
function run(css: string, overrides: Partial<StyleContext> = {}) {
  const diagnostics: SourceDiagnostic[] = [];
  const context: StyleContext = {
    policy: { schema_version: 1, configuration_hash: '', generated_components: [], semantic: {
      '--ui-border-control': { category: 'border', type: 'length' }, '--ui-color-border': { category: 'color', type: 'color' },
      '--ui-size-table-column-min': { category: 'size', type: 'length' }, '--ui-space-table-x': { category: 'space', type: 'length' },
    } },
    componentStyles: true, customPropertyWrites: new Set(['--ui-divider-style', '--ui-specialist-columns']),
    emit: d => diagnostics.push(d), checked: () => {}, ...overrides,
  };
  checkCSS(css, { file: 'app.ts', text: css, offset: 0 }, context);
  return diagnostics;
}
const host = (values: readonly string[] = ['solid', 'dashed', 'dotted'], complete = true) => ({ name: '--ui-divider-style', selector: ':host', values, complete });
const native = (values: readonly string[] = ['3', '4', '5'], complete = true) => ({ name: '--ui-specialist-columns', selector: '.ui-specialist-data-table', values, complete });

test('complete owner host producers reach only the owner host and its pseudo-elements', () => {
  const css = `:host::before,:host::after{border-block-start:${border}}:host([data-orientation="vertical"])::before{border-inline-start:${border}}`;
  assert.deepEqual(run(css, { scopedCustomProperties: [host()] }), []);
  assert.ok(run(`.child{border:${border}}`, { scopedCustomProperties: [host()] }).some(d => d.rule === 'unresolved'));
  assert.ok(run(css, { componentStyles: false, scopedCustomProperties: [host()] }).some(d => d.rule === 'unresolved'));
  assert.ok(run(css).some(d => d.rule === 'unresolved'));
});

test('native shared CSS resolves coefficients while preserving the separate 8em literal violation', () => {
  const css = `.ui-specialist-data-table{min-inline-size:${table}}`;
  assert.deepEqual(run(css, { scopedCustomProperties: [native()] }).map(d => d.rule), ['literal-token']);
  assert.ok(run(`.unrelated{min-inline-size:${table}}`, { scopedCustomProperties: [native()] }).some(d => d.rule === 'unresolved'));
});

test('unknown writers, incomplete supply, reset and empty values never establish coverage', () => {
  const css = `:host::before{border:${border}}`;
  for (const record of [host(['solid'], false), host([]), host(['solid', 'unset']), host(['inherit'])]) {
    assert.ok(run(css, { scopedCustomProperties: [record] }).some(d => d.rule === 'unresolved'), JSON.stringify(record));
  }
  assert.ok(run(css, { customPropertyWrites: 'unknown', scopedCustomProperties: [host()] }).some(d => d.rule === 'unresolved'));
  assert.ok(run(css, { customPropertyWrites: undefined, scopedCustomProperties: [host()] }).some(d => d.rule === 'unresolved'));
  assert.ok(run(css, { scopedCustomProperties: [host(), host(['solid'], false)] }).some(d => d.rule === 'unresolved'));
});

test('known bad candidates are inspected even when writer coverage is incomplete', () => {
  const css = `:host::before{border:${border}}`;
  for (const [value, rule] of [['var(--ui-p-red)', 'primitive-reference'], ['red', 'literal-token'], ['var(--ui-size-table-column-min)', 'token-category'], ['var(--ui-color-missing)', 'unknown-token']]) {
    const diagnostics = run(css, { scopedCustomProperties: [host(['solid', value], false)] });
    assert.ok(diagnostics.some(d => d.rule === 'unresolved'), value);
    assert.ok(diagnostics.some(d => d.rule === rule), value);
  }
});

test('conditional local resets, inheritance registration, selector uncertainty and Sass retain unknown', () => {
  assert.ok(run(`:host([data-reset]){--ui-divider-style:unset}:host::before{border:${border}}`, { scopedCustomProperties: [host()] }).some(d => d.rule === 'unresolved'));
  assert.ok(run(`@property --ui-divider-style{syntax:"*";inherits:false;initial-value:solid}:host::before{border:${border}}`, { scopedCustomProperties: [host()] }).some(d => d.rule === 'unresolved'));
  const uncertain = run(`:host:has(.child)::before{border:${border}}`, { scopedCustomProperties: [host(['solid', 'var(--ui-p-red)'])] });
  assert.ok(uncertain.some(d => d.rule === 'unresolved'));
  assert.ok(uncertain.some(d => d.rule === 'primitive-reference'));
  const nativeUncertain = run(`.ui-specialist-data-table:has(.child){min-inline-size:${table}}`, { scopedCustomProperties: [native(['var(--ui-p-red)'])] });
  assert.ok(nativeUncertain.some(d => d.rule === 'unresolved'));
  assert.ok(nativeUncertain.some(d => d.rule === 'primitive-reference'));
  const diagnostics: SourceDiagnostic[] = [];
  checkCSS(`:host::before{border:${border}}`, { file: 'app.scss', text: '', offset: 0 }, { policy: { schema_version: 1, configuration_hash: '', semantic: {}, generated_components: [] }, componentStyles: true, customPropertyWrites: new Set(['--ui-divider-style']), scopedCustomProperties: [host()], emit: d => diagnostics.push(d), checked: () => {} }, true);
  assert.ok(diagnostics.some(d => d.rule === 'unresolved'));
});

test('source scanner connects actual owner host bindings and all native consumers to shared CSS', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-scoped-alias-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, 'app'));
  const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
  const input = parseConfig(example); input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  const config = resolveConfig(input);
  const scan = () => checkSources({ root, config, policy: createSourcePolicy(config) });
  const file = resolve(root, 'app/app.ts');
  const hostSource = (extra = '') => `import {Component} from '@angular/core';@Component({selector:'app-divider',template:'',host:{'[style.--ui-divider-style]':'kind'},styles:[\`:host::before{border-block-start:${border}}\`]})class Divider{readonly kind='solid'}${extra}`;
  await writeFile(file, hostSource());
  assert.ok(!(await scan()).diagnostics.some(d => d.rule === 'unresolved' && d.source.includes('border-block-start')), 'finite unconditional owner host producer');
  await writeFile(file, hostSource().replace("readonly kind='solid'", "readonly kind='solid';constructor(){unknownConsumer(this)}"));
  assert.ok((await scan()).diagnostics.some(d => d.rule === 'unresolved' && d.source.includes('border-block-start')), 'escaped scalar owner is not a closed producer');
  await writeFile(file,hostSource("Object.assign(document.body.style,{position:'absolute',width:unknownSize()});"));
  assert.ok(!(await scan()).diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')), 'closed non-custom assignment keys cannot remove or replace a custom property');
  await writeFile(file, hostSource(`document.body.style.setProperty('--ui-divider-style',readRuntime());`));
  assert.ok((await scan()).diagnostics.some(d => d.rule === 'unresolved' && d.source.includes('border-block-start')), 'unattributed DOM writer');
  for(const mutation of ["document.body.style.removeProperty('--ui-divider-style');","document.body.style['removeProperty']('--ui-divider-style');","const clear=document.body.style.removeProperty.bind(document.body.style);clear('--ui-divider-style');","const key='removeProperty';document.body.style[key]('--ui-divider-style');","const styles=document.body.style;opaque(styles);","const {style}=document.body;opaque(style);","const {removeProperty}=document.body.style;unknown(removeProperty);","const styles=document.body.style;delete styles['--ui-divider-style'];","const styles=document.body.style;styles['--ui-divider-style']='red';","Object.assign(document.body.style,{'--ui-divider-style':'red'});","document.body.style.cssText='';","document.body.style['cssText']='';","Object.assign=opaque();Object.assign(document.body.style,{position:'absolute'});","document.body.style.cssText='color:var(--ui-color-text)';", "document.body.removeAttribute('style');","document.body.setAttributeNS(null,'style','');","document.body.removeAttributeNS(null,'style');","Object.assign(document.body,{style:''});","document.body.style='';","document.body.toggleAttribute('style');","document.body.setAttributeNode(document.createAttribute('style'));","document.body.getAttributeNode('style')!.value='--ui-divider-style:red';","document.body.getAttributeNode('style')!.textContent='--ui-divider-style:red';","document.body.attributes.removeNamedItem('style');","Object.assign(document.body.style,{cssText:'--ui-divider-style:red'});","document.body.innerHTML=opaque();","document.body.insertAdjacentHTML('beforeend',opaque());","external(document.body.attributes);","external(document.body.getAttributeNode('style'));","external(document.querySelector('app-divider'));","declare function consume(value:any):void;consume(document.querySelector('app-divider'));","declare function consume(value:Element|null):void;consume(document.querySelector('app-divider'));","const sheet=new CSSStyleSheet();sheet.insertRule('app-divider{--ui-divider-style:red}');", "delete document.body.style['--ui-divider-style'];", "declare const renderer:any;renderer.removeStyle(document.body,'--ui-divider-style');"]){
    await writeFile(file,hostSource(mutation));assert.ok((await scan()).diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')),mutation);
  }
  for (const mutation of [
    "Object.assign((document.body as any).style,{cssText:'--ui-divider-style:red'});",
    "Object.assign((document.body as any).style,{'--ui-divider-style':'red'});",
    "(document.body as any).getAttributeNode('style').value='--ui-divider-style:red';",
    "const element=document.body as any;Object.assign(element.style,{cssText:'--ui-divider-style:red'});",
    "const element=document.body as {style:any};element.style.setProperty('--ui-divider-style','red');",
  ]) {
    await writeFile(file,hostSource(mutation));
    const result=await scan();
    assert.ok(result.diagnostics.some(d=>d.rule==='unresolved'&&d.source.includes('border-block-start')),mutation);
    assert.ok(result.diagnostics.some(d=>d.rule==='literal-token'),'known violating cast DOM value: '+mutation);
  }
  await writeFile(file,hostSource("document.body.setAttributeNS(null,'style','--ui-divider-style:red');"));
  assert.ok((await scan()).diagnostics.some(d=>d.rule==='literal-token'),'known namespace replacement remains a known violating candidate');
  await writeFile(file, hostSource(`import{Directive}from'@angular/core';@Directive({selector:'[other]',host:{'[style.--ui-divider-style]':'kind'}})class Other{readonly kind='solid'}`));
  assert.ok((await scan()).diagnostics.some(d => d.rule === 'unresolved' && d.source.includes('border-block-start')), 'separate directive writer cannot certify host');

  await writeFile(resolve(root, 'app/shared.css'), `.table{min-inline-size:${table}}`);
  const owners = (extraTemplate = '', extraMembers = '') => `import{Component}from'@angular/core';` + [3,4,5].map(count => `@Component({selector:'app-table-${count}',template:\`<table class="table" style="--ui-specialist-columns:${count}"></table>${count === 3 ? extraTemplate : ''}\`,styleUrl:'shared.css'})class Table${count}{${count === 3 ? extraMembers : ''}}`).join('');
  await writeFile(file, owners());
  let report = await scan();
  assert.ok(!report.diagnostics.some(d => d.file === 'app/shared.css' && d.rule === 'unresolved'), 'each shared stylesheet owner supplies every native matching node');
  assert.ok(report.diagnostics.some(d => d.file === 'app/shared.css' && d.rule === 'literal-token'), '8em retains its independent literal diagnostic');
  for (const [extraTemplate, extraMembers] of [
    ['<table class="table"></table>', ''],
    ['<table class="table" [style.--ui-specialist-columns]="flag ? 3 : null"></table>', 'flag!:boolean'],
    ['<table class="table" [ngStyle]="bag"></table>', 'bag=readRuntime()'],
    ['<table class="table" style="--ui-specialist-columns:unset"></table>', ''],
  ]) {
    await writeFile(file, owners(extraTemplate, extraMembers));
    report = await scan();
    assert.ok(report.diagnostics.some(d => d.file === 'app/shared.css' && d.rule === 'unresolved'), extraTemplate);
  }
  await writeFile(file, owners() + `@Component({selector:'app-unused',template:'<p>unused</p>',styleUrl:'shared.css'})class Unused{}`);
  assert.ok((await scan()).diagnostics.some(d => d.file === 'app/shared.css' && d.rule === 'unresolved'), 'an owner without a proven native consumer cannot borrow another owner producer');
  await writeFile(file, owners('<table class="table" style="--ui-specialist-columns:var(--ui-p-red)"></table>'));
  report = await scan();
  assert.ok(report.diagnostics.some(d => d.file === 'app/shared.css' && d.rule === 'primitive-reference'), 'known bad inline producer remains inspected');
});
