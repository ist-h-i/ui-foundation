import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
import type { CheckException } from '../../src/check/types.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
const border = ':host::before{border-block-start:var(--ui-border-control) var(--local-line) var(--ui-color-border)}';
const size = '.table{min-inline-size:calc(var(--local-columns) * var(--ui-size-table-column-min))}';
const component = (styles: string[], template = '') => `@Component({selector:'app-test',template:${JSON.stringify(template)},styles:${JSON.stringify(styles)}})class App{}`;
async function scan(source: string, files: Record<string, string> = {}, exceptions: CheckException[] = []) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-sibling-style-'));
  try {
    await mkdir(resolve(root, 'app'));
    for (const [name, content] of Object.entries({ 'app.ts': `import{Component,HostBinding}from'@angular/core';${source};throw new Error('Never execute application code');`, ...files })) await writeFile(resolve(root, 'app', name), content);
    const input = parseConfig(example); input.checks = { source_roots: ['app'], approved_components: [], exceptions };
    const config = resolveConfig(input);
    return await checkSources({ root, config, policy: createSourcePolicy(config) });
  } finally { await rm(root, { recursive: true, force: true }); }
}

for (const [name, source, files] of [
  ['inline arrays in either order', component([border, ':host{--local-line:17px}'])],
  ['external CSS files', `@Component({selector:'app-test',template:'',styleUrls:['writer.css','consumer.css']})class App{}`, { 'writer.css': ':host{--local-line:17px}', 'consumer.css': border }],
  ['mixed inline and external SCSS', component([border]).replace('styles:', "styleUrl:'writer.scss',styles:"), { 'writer.scss': ':host{--local-line:17px}' }],
  ['imported shared consumer', `import{shared}from'./shared';@Component({selector:'app-test',template:'<table class="table"></table>',styles:[shared,'.table{--local-columns:17px}']})class App{}`, { 'shared.ts': `export const shared=${JSON.stringify(size)}` }],
  ['nested alias and conditional writer', component([border, ':host{--local-line:var(--other-line)}', '@media all{:host{--other-line:17px}}'])],
] as [string, string, Record<string, string>?][]) test(`sibling styles inspect ${name} as candidates`, async () => {
  const result = await scan(source, files);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(d => d.rule === 'literal-token' && d.source.includes('17px')), JSON.stringify(result));
  assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'), 'sibling candidates never close external writer coverage');
  const issue = result.diagnostics.find(d => d.rule === 'literal-token')!;
  assert.ok(issue.line > 0 && issue.column > 0);
  assert.equal(issue.file, files?.['consumer.css'] ? 'app/consumer.css' : files?.['shared.ts'] ? 'app/shared.ts' : 'app/app.ts');
});

test('sibling legal keywords and numeric factors remain warning-only', async () => {
  for (const [consumer, writer, template] of [[border, ':host{--local-line:solid}', ''], [size, '.table{--local-columns:3}', '<table class="table"></table>']]) {
    const result = await scan(component([consumer, writer], template));
    assert.equal(result.valid, true, JSON.stringify(result));
    assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('sibling sheets never borrow unrelated owners, native subjects, or pseudo values', async () => {
  for (const source of [
    component([border]) + `@Component({selector:'app-other',template:'',styles:[':host{--local-line:17px}']})class Other{}`,
    component([border, 'button{--local-line:17px}'], '<button></button>'),
    component([border, ':host::after{--local-line:17px}']),
    component(['.good{padding:var(--gap)}', '.bad{--gap:17px}'], '<p class="good"></p><p class="bad"></p>'),
    component([border, ':host{--local-line:solid}', 'button{--other-line:17px}']),
  ]) {
    const result = await scan(source);
    assert.equal(result.valid, true, JSON.stringify(result));
    assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('sibling registered non-inheriting aliases do not flow from host to pseudo', async () => {
  const result = await scan(component([border, ':host{--local-line:17px}', '@property --local-line{syntax:"*";inherits:false}']));
  assert.equal(result.valid, true, JSON.stringify(result));
  assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'));
});

test('sibling recursive aliases preserve per-application host values', async () => {
  const result = await scan(`@Component({selector:'app-child',template:'',styles:[':host{padding:var(--gap)}',':host.good{--gap:var(--value)}'],host:{'[style.--value]':'value()'}})class Child{value=()=> 'var(--ui-space-page)'}@Component({selector:'app-test',imports:[Child],template:'<app-child class="good" style="--value:var(--ui-space-page)"></app-child><app-child class="bad" style="--value:17px"></app-child>'})class App{}`);
  assert.equal(result.valid, true, JSON.stringify(result));
  assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'));
});

test('sibling host qualifiers keep the matching application and host compute origin', async () => {
  for (const selector of [':host.good', ':host(.good)']) for (const bad of [false, true]) {
    const source = `@Component({selector:'app-child',template:'',styles:[':host{padding:var(--gap)}',${JSON.stringify(selector+'{--gap:var(--end)}')}]})class Child{}@Component({selector:'app-root',imports:[Child],template:'<app-child class="good" style="--end:${bad ? '19px' : '0'}"></app-child><app-child class="bad" style="--end:17px"></app-child>'})class App{}`;
    const result = await scan(source);
    assert.equal(result.valid, !bad, JSON.stringify(result));
    assert.equal(result.diagnostics.some(d => d.message.includes('Concrete value 19px')), bad);
    assert.ok(!result.diagnostics.some(d => d.message.includes('Concrete value 17px')));
    assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'));
  }
});

test('unused Sass declaration bodies do not supply sibling or same-sheet alias writers', async () => {
  for (const block of ['@mixin unused', '@function unused()']) for (const separate of [false, true]) {
    const sheet = `${block}{:host{--local-line:17px}}`;
    const result = await scan(`@Component({selector:'app-test',template:'',styleUrl:'writer.scss',styles:${JSON.stringify(separate ? [border] : [])}})class App{}`, { 'writer.scss': sheet + (separate ? '' : border) });
    assert.equal(result.valid, true, JSON.stringify(result));
    assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'));
    assert.ok(!result.diagnostics.some(d => d.message.includes('Concrete value 17px')));
  }
});

test('sibling native compound selectors require facts on the same receiving element', async () => {
  for (const [selector, template, bad] of [
    ['.good.special','<p class="good"></p><p class="special"></p>',false],
    ['.good.special','<p class="good special"></p>',true],
    ['.good#chosen','<p class="good"></p><p id="chosen"></p>',false],
    ['.good#chosen','<p class="good" id="chosen"></p>',true],
    ['.good:not(.special)','<p class="good special"></p>',false],
    ['.good:not(.special)','<p class="good"></p>',true],
  ] as [string,string,boolean][]) {
    const result=await scan(component(['.good{padding:var(--gap)}',`${selector}{--gap:17px}`],template));
    assert.equal(result.valid,!bad,JSON.stringify(result));
    assert.equal(result.diagnostics.some(d=>d.rule==='literal-token'),bad);
    assert.ok(result.diagnostics.some(d=>d.rule==='unresolved'));
  }
});

test('a fixed geometry exception never absorbs a sibling alias override', async () => {
  const source=(value:string)=>component(['.table{min-inline-size:calc(var(--local-columns) * max(var(--ui-size-table-column-min),8em))}',`.table{--local-columns:${value}}`],'<table class="table"></table>');
  const before=await scan(source('3'));
  const geometry=before.diagnostics.find(d=>d.rule==='literal-token'&&d.message.includes('8em'))!;
  assert.ok(geometry);
  const exception:CheckException={file:geometry.file,rule:geometry.rule,source:geometry.source,line:geometry.line,column:geometry.column,reason:'Finite test of the minimum readable table column floor.'};
  const allowed=await scan(source('3'),{},[exception]);
  assert.equal(allowed.valid,true,JSON.stringify(allowed));assert.equal(allowed.exceptions.length,1);
  const changed=await scan(source('17px'),{},[exception]);
  assert.equal(changed.valid,false,JSON.stringify(changed));
  assert.ok(changed.diagnostics.some(d=>d.rule==='literal-token'&&d.source.includes('--local-columns=17px')));
  assert.equal(changed.exceptions.length,0,'an ambiguous old exception must not approve either diagnostic');
  assert.ok(changed.diagnostics.some(d=>d.rule==='exception-error'),'multiple matches reject the old approval');
});
