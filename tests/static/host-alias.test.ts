import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
test('HostBinding custom-property writers inspect finite values and retain unknown coverage when needed', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-host-alias-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, 'app'));
  const input = parseConfig(example);
  input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  const config = resolveConfig(input);
  const scan = () => checkSources({ root, config, policy: createSourcePolicy(config) });
  for (const binding of ["@HostBinding('style.--local-gap') readonly gap='12px'", "@HostBinding('style') readonly bag='--local-gap:12px'", "@HostBinding('style.--local-gap') get gap(){return readRuntime()}", "@HostBinding(runtimeKey()) readonly gap='12px'"]) {
    await writeFile(resolve(root, 'app/app.ts'), `import {Component,HostBinding} from '@angular/core';@Component({selector:'app-test',template:'',styles:[':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}']})class App{${binding}}`);
    const report = await scan();
    if (binding === "@HostBinding('style.--local-gap') readonly gap='12px'") assert.ok(!report.diagnostics.some(d => d.rule === 'unresolved'), 'complete finite host producer is fully inspected');
    else assert.ok(report.diagnostics.some(d => d.rule === 'unresolved'), binding);
    if (binding.includes('readonly') && !binding.includes('runtimeKey')) assert.ok(report.diagnostics.some(d => d.rule === 'literal-token'), binding);
  }
  await writeFile(resolve(root, 'app/app.ts'), `import {Component} from '@angular/core';@Component({selector:'app-test',template:\`<div [ngStyle]="{'--local-gap':flag ? '12px' : 'var(--ui-space-page)'}"></div>\`,styles:[':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}']})class App{flag!:boolean}`);
  const childWriter = await scan();
  assert.ok(!childWriter.diagnostics.some(d => d.rule === 'literal-token'), 'a native child cannot write its host custom property');
  assert.ok(childWriter.diagnostics.some(d => d.rule === 'unresolved'), 'the known native writer does not certify host coverage');
  // Shared sheets are inspected with each owner's writers, not only the first owner.
  await writeFile(resolve(root, 'app/shared.css'), ':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}');
  await writeFile(resolve(root, 'app/app.ts'), `import {Component,HostBinding} from '@angular/core';@Component({selector:'app-one',template:'',styleUrl:'shared.css'})class One{} @Component({selector:'app-two',template:'',styleUrl:'shared.css'})class Two{@HostBinding('style.--local-gap') readonly gap='12px'}`);
  assert.ok((await scan()).diagnostics.some(d => d.file === 'app/shared.css' && d.rule === 'literal-token'));
});

test('loop assignment patterns and inherited instance mutators retain unknown values', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-loop-mutation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, 'app'));
  const input = parseConfig(example); input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  const config = resolveConfig(input);
  for (const mutation of ["for({color:theme.color} of [{color:'red'}]){}", "for([theme.color] of [['red']]){}", "for(theme.color in {red:true}){}"]) {
    await writeFile(resolve(root, 'app/app.ts'), `const theme={color:'var(--ui-color-text)'};${mutation};document.body.style.color=theme.color;`);
    const report = await checkSources({ root, config, policy: createSourcePolicy(config) });
    assert.ok(report.diagnostics.some(d => d.severity === 'warning'), mutation);
  }
  await writeFile(resolve(root, 'app/app.ts'), `import{Component,computed}from'@angular/core';class Base{change(){Object.assign(this,{ink:()=> 'red'})}}@Component({selector:'app-test',template:'<p [style.color]="ink()"></p>'})class App extends Base{readonly ink=computed(()=> 'var(--ui-color-text)')}`);
  assert.ok((await checkSources({ root, config, policy: createSourcePolicy(config) })).diagnostics.some(d => d.severity === 'warning'));
});
