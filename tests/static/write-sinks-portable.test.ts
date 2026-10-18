import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { parseConfig } from '../../src/config.ts';
import { syncProject } from '../../src/sync.ts';

test('copied CLI checks reexported HostBinding and compound writes without application dependencies', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-portable-writes-'));
  const producer = await mkdtemp(resolve(tmpdir(), 'ui-producer-writes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.after(() => rm(producer, { recursive: true, force: true }));
  const config = parseConfig(await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8'));
  config.output = 'foundation';
  config.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  for (const folder of [root, producer]) await writeFile(resolve(folder, 'ui.config.yaml'), stringify(config));
  await syncProject({ root: producer });
  await cp(resolve(producer, 'foundation'), resolve(root, 'foundation'), { recursive: true });
  await mkdir(resolve(root, 'app'));
  await writeFile(resolve(root, 'app/barrel.ts'), "export {HostBinding as Bind} from '@angular/core';");
  await writeFile(resolve(root, 'app/star.ts'), "export * from '@angular/core';");
  await writeFile(resolve(root, 'app/local.ts'), 'export const Bind=(_name:string)=>()=>{};');
  await writeFile(resolve(root, 'app/local-barrel.ts'), "export {Bind} from './local';");
  await assert.rejects(access(resolve(root, 'node_modules')));
  const owner = (members: string, imports = "import {HostBinding as Bind} from '@angular/core';") => `import {Component} from '@angular/core';${imports}@Component({selector:'app-test',template:''})class App{${members}}`;
  const keyOrigin = (selector: string) => `import{Component,HostBinding}from'@angular/core';declare const flag:boolean;declare const input:string;const key=flag?'class':'id';
@Component({selector:'app-child',template:'',styles:[':host(${selector}){--local-origin:12px}:host{padding:var(--local-gap)}']})class Child{@HostBinding(key)readonly active=input;}
@Component({selector:'app-parent',imports:[Child],template:'<app-child></app-child>',styles:['app-child.left{--local-gap:var(--local-origin)}']})class Parent{}`;
  const cases = [
    { name: 'barrel alias', source: owner("@Bind('style.color')readonly ink='red';", "import {Bind} from './barrel';"), code: 1, literal: true },
    { name: 'barrel namespace', source: owner("@hooks.Bind('style.color')readonly ink='red';", "import * as hooks from './barrel';"), code: 1, literal: true },
    { name: 'unavailable wildcard declaration', source: owner("@Bind('style.color')readonly ink='red';", "import {HostBinding as Bind} from './star';"), code: 0, unknown: true },
    { name: 'finite keys', source: owner("@Bind(flag?'attr.title':'style.color')readonly ink='red';") + 'declare const flag:boolean;', code: 1, literal: true },
    { name: 'unknown key', source: owner("@Bind(key())readonly ink='red';") + 'declare function key():string;', code: 0, unknown: true },
    { name: 'logical DOM write', source: "document.body.style.color||='red';", code: 1, literal: true },
    { name: 'appended cssText', source: "document.body.style.cssText+=';color:red';", code: 1, literal: true, unknown: true },
    { name: 'bitwise value', source: 'document.body.style.left=`${~0}px`;', code: 1, literal: true },
    { name: 'storage update', source: 'let n=0;document.body.style.left=`${++n}px`;', code: 0, unknown: true },
    { name: 'direct storage update', source: 'document.body.style.opacity++;--document.body.style.opacity;', code: 0, unknown: true },
    { name: 'optional host writer', source: "import{Component,HostBinding}from'@angular/core';declare const flag:boolean;const key=flag?'attr.title':'style.--local-gap';@Component({selector:'app-test',template:'',styles:[':host{padding:var(--local-gap)}']})class App{@HostBinding(key)readonly gap='var(--ui-space-page)'}", code: 0, unknown: true },
    { name: 'exclusive host selectors', source: "import{Component,HostBinding}from'@angular/core';declare const flag:boolean;const key=flag?'class.left':'id';@Component({selector:'app-test',template:'',styles:[':host(.left#active){--local-gap:12px}:host{padding:var(--local-gap)}']})class App{@HostBinding(key)readonly value='active'}", code: 0, unknown: true },
    { name: 'unknown host key origin separation', source: keyOrigin('#active'), code: 0, unknown: true },
    { name: 'unknown host key reachable origin', source: keyOrigin('.left'), code: 1, literal: true, unknown: true },
    { name: 'business writer coverage', source: "import{Component}from'@angular/core';@Component({selector:'app-test',template:'',styles:[':host{--local-gap:var(--ui-space-page);padding:var(--local-gap)}']})class App{}const business={style:{} as Record<string,string>};declare const key:string;business.style[key]||='business';", code: 0, clear: true },
    { name: 'safe barrel value', source: owner("@Bind('style.color')readonly ink='var(--ui-color-text)';", "import {Bind} from './barrel';"), code: 0, clear: true },
    { name: 'business decorator', source: owner("@Bind('style.color')readonly ink='red';", "import {Bind} from './local-barrel';"), code: 0, clear: true },
    { name: 'business style attribute', source: owner("@Bind('attr.style.color')readonly data='red';"), code: 0, clear: true },
    { name: 'business class attribute', source: owner("@Bind('attr.class.p-4')readonly data=true;"), code: 0, clear: true },
  ];
  for (const item of cases) {
    await writeFile(resolve(root, 'app/app.ts'), item.source + "\nthrow new Error('Never execute application source');");
    const run = spawnSync(process.execPath, ['foundation/check-ui.cjs', '--config', 'ui.config.yaml', '--format', 'json'], { cwd: root, encoding: 'utf8', timeout: 60_000, env: { ...process.env, NODE_PATH: '' } });
    assert.equal(run.status, item.code, `${item.name}: ${run.stdout}${run.stderr}`);
    const report = JSON.parse(run.stdout);
    if (item.literal) assert.ok(report.diagnostics.some((d: { rule: string; severity: string }) => d.rule === 'literal-token' && d.severity === 'error'), item.name);
    if (item.unknown) assert.ok(report.diagnostics.some((d: { rule: string }) => d.rule === 'unresolved'), item.name);
    if (item.clear) assert.deepEqual(report.diagnostics, [], item.name);
  }
});
