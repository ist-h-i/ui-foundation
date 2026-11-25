import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { closeSync, openSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { assertFrozenCandidate, prepareCandidate } from '../../../scripts/package-verification/candidate.mjs';
import { run as runProcess } from '../../../scripts/package-verification/run.mjs';

const { values: options } = parseArgs({ options: {
  candidate: { type: 'boolean' },
  angular: { type: 'string', default: '22' },
  'angular-node': { type: 'string' },
  workspace: { type: 'string' },
  layout: { type: 'boolean' },
} });
assert.ok(['21', '22', 'both'].includes(options.angular), 'Choose --angular 21, 22 or both.');
assert.ok(options.candidate || options.angular === '22', 'The recorded comparison uses Angular 22.');
assert.ok(options.angular !== 'both' || !options['angular-node'], 'Choose one Angular version when specifying its Node runtime.');
assert.ok(!options.layout || options.candidate, '--layout requires --candidate');
const angularNode = options['angular-node'] ? resolve(options['angular-node']) : process.execPath;
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const patch = fileURLToPath(new URL('./prototype.patch', import.meta.url));
const workspace = options.workspace ? resolve(options.workspace) : await mkdtemp(join(tmpdir(), 'ui-icon-route-'));
await mkdir(workspace, { recursive: true });
const environment = { ...process.env, NG_CLI_ANALYTICS: 'false', NO_COLOR: '1' };
const cli = 'node_modules/@angular/cli/bin/ng.js';
const generator = 'node_modules/@hiroshi.inoue/ui-foundation/dist/cli.js';

const build = {
  builder: '@angular/build:application',
  options: { browser: 'src/main.ts', index: 'src/index.html', tsConfig: 'tsconfig.app.json', outputPath: 'dist', ...(options.layout ? { styles: ['.ui/generated/tokens.css', '.ui/generated/angular/styles.css'] } : {}) },
  configurations: {
    development: { optimization: false, sourceMap: true },
    production: { optimization: true, sourceMap: false, outputHashing: 'all', extractLicenses: false },
  },
};
const serve = {
  builder: '@angular/build:dev-server',
  configurations: { development: { buildTarget: 'probe:build:development' } },
};
const angular = {
  version: 1,
  cli: { analytics: false, cache: { enabled: false, environment: 'all' } },
  projects: { probe: { root: '', sourceRoot: 'src', projectType: 'application', architect: { build, serve } } },
};
const tsconfig = {
  compilerOptions: {
    target: 'ES2022', module: 'preserve', moduleResolution: 'bundler', strict: true,
    experimentalDecorators: true, skipLibCheck: true, lib: ['ES2022', 'DOM'], types: [],
  },
  angularCompilerOptions: { strictTemplates: true },
  files: ['src/main.ts'],
};

// Keep the measured application source stable. Source maps include its exact text.
const shell = `import {Component} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {provideRouter,RouterLink,RouterOutlet} from '@angular/router';

@Component({selector:'app-home',template:'<p id="home">Home</p>'}) class Home {}
@Component({selector:'app-root',imports:[RouterLink,RouterOutlet],providers:[],template:"<a routerLink=\\"/probe\\">Probe</a><router-outlet />"})
class App {}
bootstrapApplication(App,{providers:[provideRouter([{path:'',component:Home},{path:'probe',loadComponent:()=>import('./probe').then(m=>m.Probe)}])]});
`;
const entry = '../.ui/generated/angular/';
const splitShell = shell.replace("@Component({selector:'app-home',template:'<p id=\"home\">Home</p>'})",
  `import {Icon,selected} from '${entry}icons';import {shape} from '${entry}icons/search';
@Component({selector:'app-home',imports:[Icon],providers:[selected(shape)],template:'<p id="home">Home<ui-icon name="search" /></p>'})`);
const searchPath = 'm21 21-4.34-4.34';
const folderPathPrefix = 'M20 20a2 2 0 0 0 2-2V8a2 2';
const cases = {
  empty: { imports: '', provider: '' },
  direct: { imports: `import {Icon,provideUiIcons} from '${entry}icon';`, provider: 'provideUiIcons()' },
  core: { imports: `import {Icon,provideUiIcons} from '${entry}core';`, provider: 'provideUiIcons()' },
  selected: {
    imports: `import {Icon,selected} from '${entry}icons';import {shape} from '${entry}icons/search';`,
    provider: 'selected(shape)',
  },
  defaults: {
    imports: `import {Icon} from '${entry}icons';import {provideUiIcons} from '${entry}icons/defaults';`,
    provider: 'provideUiIcons()',
  },
  split: {
    imports: `import {Icon,selected} from '${entry}icons';import {shape} from '${entry}icons/folder';`,
    provider: 'selected(shape)', name: 'folder',
  },
  layout: {
    imports: `import {Stack,type LayoutSpace} from '${entry}layout';import {Disclosure} from '${entry}disclosure';`,
    components: 'Stack,Disclosure', provider: '',
    content: '<ui-flex gap="normal"><button type="button">First filter</button><button type="button">Second filter</button><button type="button">Third filter</button><button type="button">Fourth filter</button></ui-flex><ui-disclosure title="Stored input"><textarea aria-label="Draft"></textarea></ui-disclosure>',
  },
  basics: {
    imports: `import {ActionControl,ActionLink,Card} from '${entry}core';import {TextInput} from '${entry}forms';`,
    components: 'ActionControl,ActionLink,Card,TextInput', provider: '',
    content: '<button uiAction>Save</button><a uiAction href="/">Home</a><ui-card cardId="card" title="Card" /><ui-text-input controlId="name" label="Name" />',
  },
};
function probe({ imports, provider, name = 'search', components = imports ? 'Icon' : '', content = imports ? `<ui-icon name="${name}" />` : '' }) {
  const template = '<section id="result">' + content + '</section>';
  return `import {Component} from '@angular/core';\n${imports}\n@Component({selector:'app-probe',imports:[${components}],providers:[${provider}],template:${JSON.stringify(template)}})\nexport class Probe {}\n`;
}
function run(cwd, executable, args) {
  execFileSync(executable, args, { cwd, env: environment, stdio: 'inherit' });
}

async function setUp(name, major, candidate) {
  const app = join(workspace, candidate ? 'candidate-angular' + major : name);
  await mkdir(join(app, 'src'), { recursive: true });
  const lock = JSON.parse(gunzipSync(await readFile(new URL(`./angular${major}-lock.json.gz`, import.meta.url))));
  if (name === 'prototype' || candidate) {
    delete lock.packages[''].dependencies['@lucide/angular'];
    delete lock.packages['node_modules/@lucide/angular'];
  }
  if (candidate) {
    delete lock.packages[''].dependencies['@hiroshi.inoue/ui-foundation'];
    delete lock.packages['node_modules/@hiroshi.inoue/ui-foundation'];
  }
  if (options.layout) {
    delete lock.packages[''].dependencies['@angular/cdk'];
    delete lock.packages['node_modules/@angular/cdk'];
  }
  const manifest = { name: lock.name, private: true, dependencies: lock.packages[''].dependencies };
  const compiler = candidate ? {
    ...tsconfig,
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, strictInputAccessModifiers: true, typeCheckHostBindings: true },
  } : tsconfig;
  for (const [file, value] of Object.entries({
    'package.json': manifest, 'package-lock.json': lock, 'angular.json': angular, 'tsconfig.app.json': compiler,
  })) await writeFile(join(app, file), JSON.stringify(value, null, 2) + '\n');
  await writeFile(join(app, 'src/index.html'), '<!doctype html><html><head><meta charset="utf-8"><base href="/"></head><body><app-root></app-root></body></html>\n');
  // Mount the public icon example as the app root for the source check. The
  // performance cases below mount the same example behind an Angular route.
  const selectedApp = probe(cases.selected).replace("selector:'app-probe'", "selector:'app-root'")
    + "import {bootstrapApplication} from '@angular/platform-browser';\nbootstrapApplication(Probe);\n";
  await writeFile(join(app, 'src/main.ts'), candidate ? selectedApp : shell);
  run(app, 'npm', ['ci', '--no-fund', '--no-audit']);
  if (candidate) run(app, 'npm', ['install', '--no-save', '--no-audit', '--no-fund', candidate.tarball]);
  if (name === 'prototype' || candidate) {
    for (const dep of ['angular', 'icons']) {
      await assert.rejects(access(join(app, 'node_modules/@lucide', dep)), { code: 'ENOENT' });
    }
  }
  if (name === 'prototype') {
    const installedPackage = join(app, 'node_modules/@hiroshi.inoue/ui-foundation');
    run(installedPackage, 'git', ['apply', '--check', patch]);
    run(installedPackage, 'git', ['apply', patch]);
  }
  run(app, process.execPath, [generator, 'init', '--language', 'ja']);
  run(app, process.execPath, [generator, 'sync']);
  if (options.layout) {
    for (const dependency of ['@angular/cdk', '@lucide/angular', 'qrcode', 'jsbarcode', 'echarts', '@codemirror/state']) {
      await assert.rejects(access(join(app, 'node_modules', dependency)), { code: 'ENOENT' });
    }
  } else if (candidate) run(app, process.execPath, [generator, 'check']);
  return app;
}

async function measurePage(browser, url, label) {
  const context = await browser.newContext({ serviceWorkers: 'block', ...(label === 'layout' ? { viewport: { width: 320, height: 640 } } : {}) });
  try {
    const page = await context.newPage();
    let phase = 'initial';
    const phases = new Map();
    const responses = [];
    const errors = [];
    page.on('request', request => phases.set(request, phase));
    page.on('response', response => {
      if (/javascript|ecmascript/i.test(response.headers()['content-type'] ?? '')) responses.push(response);
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('#home').waitFor();
    if (label === 'split') await page.locator(`#home svg path[d="${searchPath}"]`).waitFor({ state: 'attached' });
    phase = 'route';
    await page.getByRole('link', { name: 'Probe' }).click();
    await page.locator('#result').waitFor({ state: 'attached' });
    if (label === 'split') {
      await page.locator(`#result svg path[d^="${folderPathPrefix}"]`).waitFor({ state: 'attached' });
    } else if (label === 'layout') {
      const stack = page.locator('ui-flex');
      const rows = await stack.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().top));
      assert.equal(rows.length, 4);
      assert.ok(new Set(rows).size > 1, 'filters must wrap on a narrow screen');
      const summary = page.locator('ui-disclosure summary');
      const draft = page.getByRole('textbox', { name: 'Draft' });
      await summary.press('Enter');
      await draft.fill('Retained input');
      await summary.press('Space');
      await draft.waitFor({ state: 'hidden' });
      await summary.press('Enter');
      assert.equal(await draft.inputValue(), 'Retained input');
    } else if (label === 'basics') {
      for (const selector of ['button[uiAction]', 'a[uiAction]', 'ui-card', 'ui-text-input input']) {
        await page.locator('#result ' + selector).first().waitFor({ state: 'attached' });
      }
      assert.equal(await page.locator('#result ui-icon').count(), 0);
    } else if (label !== 'empty') {
      await page.locator(`#result svg path[d="${searchPath}"]`).waitFor({ state: 'attached' });
      await page.locator('#result svg circle[r="8"]').waitFor({ state: 'attached' });
    }
    await page.waitForLoadState('networkidle');
    assert.deepEqual(errors, []);
    const result = { initial: { total: 0, max: 0 }, route: { total: 0, max: 0 } };
    const folderSeen = new Set();
    for (const response of responses) {
      assert.ok(response.ok(), 'Failed JS response ' + response.url());
      const body = await response.body();
      const size = body.length;
      const responsePhase = phases.get(response.request());
      if (label === 'split' && body.includes(folderPathPrefix)) folderSeen.add(responsePhase);
      const bucket = result[responsePhase];
      bucket.total += size;
      bucket.max = Math.max(bucket.max, size);
    }
    if (label === 'split') assert.deepEqual([...folderSeen], ['route'], 'The lazy icon shape must be sent only after navigation.');
    return result;
  } finally {
    await context.close();
  }
}

async function measureDevelopment(app, label, browser) {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const url = 'http://127.0.0.1:' + port;
  const log = join(app, label + '-serve.log');
  const fd = openSync(log, 'w');
  const server = spawn(angularNode, [cli, 'serve', '--configuration', 'development', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: app, env: environment, stdio: ['ignore', fd, fd],
  });
  closeSync(fd);
  const stopped = once(server, 'exit');
  try {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline && server.exitCode === null) {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) }).catch(() => undefined);
      if (response) {
        await response.body?.cancel();
        if (response.ok) return await measurePage(browser, url, label);
      }
      if ((await readFile(log, 'utf8')).includes('Application bundle generation failed')) break;
      await delay(350);
    }
    const startupLog = await readFile(log, 'utf8');
    throw new Error('Angular dev server failed to start. See ' + log + '\n' + startupLog.slice(0, 4000));
  } finally {
    if (server.exitCode === null && !server.signalCode) server.kill();
    await stopped;
  }
}

async function measureProduction(app, label, major, candidate) {
  const out = 'dist/' + label;
  run(app, angularNode, [cli, 'build', '--configuration', 'production', '--stats-json', '--output-path', out]);
  const statsName = major === '21' ? 'stats.json' : 'browser-stats.json';
  const { inputs, outputs } = JSON.parse(await readFile(join(app, out, statsName), 'utf8'));
  if (candidate) assert.deepEqual(Object.keys(inputs).filter(path => path.includes('/@lucide/')), [], 'Lucide runtime input in candidate');
  function staticFiles(entryPoint) {
    const entry = Object.keys(outputs).find(key => outputs[key].entryPoint === entryPoint);
    assert.ok(entry, entryPoint);
    const files = new Set();
    function visit(key) {
      if (files.has(key)) return;
      files.add(key);
      for (const ref of outputs[key].imports) if (!ref.external && ref.kind !== 'dynamic-import') visit(ref.path);
    }
    visit(entry);
    return files;
  }
  const initial = staticFiles('src/main.ts');
  const route = staticFiles('src/probe.ts');
  for (const key of initial) route.delete(key);
  if (label === 'split') {
    for (const [files, expected, forbidden] of [[initial, searchPath, folderPathPrefix], [route, folderPathPrefix, null]]) {
      const code = (await Promise.all([...files].map(file => readFile(join(app, out, 'browser', file), 'utf8')))).join('\n');
      assert.ok(code.includes(expected), 'Missing shape in its production chunk group: ' + expected);
      if (forbidden) assert.ok(!code.includes(forbidden), 'The lazy icon shape is in an initial production chunk.');
    }
  }
  const bytes = files => [...files].reduce((total, key) => total + outputs[key].bytes, 0);
  return { initial: bytes(initial), route: bytes(route) };
}

console.log('Measurement workspace', workspace);
function enforceBudgets(records) {
  const {empty, selected, defaults} = records;
  const devTotal = record => record.development.initial.total + record.development.route.total;
  const prodTotal = record => record.production.initial + record.production.route;
  const checks = [
    ['selected development JS', devTotal(selected) - devTotal(empty), 100_000],
    ['selected maximum route JS', selected.development.route.max - empty.development.route.max, 100_000],
    ['default development JS', devTotal(defaults) - devTotal(empty), 200_000],
    ['selected production JS', prodTotal(selected) - prodTotal(empty), 20_000],
  ];
  for (const [metric, delta, limit] of checks) {
    console.log(metric, delta, 'bytes above empty; limit', limit);
    assert.ok(delta <= limit, `${metric} grew by ${delta} B (limit ${limit} B)`);
  }
}
const candidate = options.candidate ? await prepareCandidate({
  repository, root: workspace, execute: (file, args, cwd) => runProcess(file, args, { cwd }),
}) : undefined;
const majors = options.angular === 'both' ? ['21', '22'] : [options.angular];
const variants = options.layout ? { candidate: ['layout'] } : candidate ? { candidate: ['empty', 'selected', 'defaults', 'split', 'basics'] }
  : { published: ['empty', 'direct', 'core'], prototype: ['core', 'selected', 'defaults'] };
const browser = await chromium.launch({ channel: 'chromium' });
try {
  for (const major of majors) {
    for (const [name, labels] of Object.entries(variants)) {
      const app = await setUp(name, major, candidate);
      const angularVersion = JSON.parse(await readFile(join(app, 'node_modules/@angular/core/package.json'), 'utf8')).version;
      const nodeVersion = execFileSync(angularNode, ['--version'], { encoding: 'utf8' }).trim();
      const records = {};
      for (const label of labels) {
        await writeFile(join(app, 'src/main.ts'), label === 'split' ? splitShell : shell);
        await writeFile(join(app, 'src/probe.ts'), probe(cases[label]));
        if (label === 'layout') {
          const mainFile = join(app, 'src/main.ts');
          // The source checker fixture covers these components. The Router
          // shell is used for the independent AOT and browser checks below.
          await writeFile(mainFile, "import {bootstrapApplication} from '@angular/platform-browser';\nimport {Probe} from './probe';\nbootstrapApplication(Probe);\n");
          const check = () => JSON.parse(execFileSync(process.execPath, [generator, 'check', '--require-source-checks', '--format', 'json'], { cwd: app, env: environment, encoding: 'utf8' }));
          const findings = report => report.source.diagnostics.filter(diagnostic => diagnostic.rule === 'generated-internal-import');
          const report = check();
          assert.ok(report.valid);
          assert.ok(['passed', 'warnings'].includes(report.source.status));
          assert.deepEqual(findings(report), []);
          const probeFile = join(app, 'src/probe.ts');
          const source = probe(cases.layout);
          await writeFile(probeFile, source + `\nimport type {LayoutSpace as InternalLayoutSpace} from '${entry}layout-model';\n`);
          const internal = findings(check());
          assert.equal(internal.length, 1);
          assert.match(internal[0].suggestion, /angular\/layout'/);
          await writeFile(probeFile, source);
          await writeFile(mainFile, shell);
          run(app, angularNode, ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'tsconfig.app.json', '--noEmit']);
        }
        const development = await measureDevelopment(app, label, browser);
        const production = await measureProduction(app, label, major, candidate);
        const record = { variant: name, entry: label, angular: angularVersion, node: nodeVersion, chromium: browser.version(), development, production };
        if (candidate) record.candidateSha256 = candidate.sha256;
        records[label] = record;
        await writeFile(join(app, label + '.json'), JSON.stringify(record, null, 2) + '\n');
        console.log('Measured', JSON.stringify(record));
      }
      if (candidate && !options.layout) enforceBudgets(records);
    }
  }
  if (candidate) await assertFrozenCandidate(candidate);
} finally {
  await browser.close();
}
