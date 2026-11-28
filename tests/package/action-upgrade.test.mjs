import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { transformAsync } from '@babel/core';
import { needsLinking } from '@angular/compiler-cli/linker';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { chromium, expect } from '@playwright/test';
import { build } from 'esbuild';
import { assertFrozenCandidate, prepareCandidate } from '../../scripts/package-verification/candidate.mjs';
import { checkoutIsolation, run } from '../../scripts/package-verification/run.mjs';

const repository = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const publicPackage = '@hiroshi.inoue/ui-foundation@0.2.0';
const publicIntegrity = 'sha512-u2VaaRMPKhdgOkNjyPwEg+DjkukCJmgHf0B2YZ4ZQIITr7rhDVxR4w/kwb6sufgGUbwntkXKwfCAkopQ7MrgQw==';

async function snapshot(root, directory) {
  const files = {};
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) Object.assign(files, await snapshot(root, path));
    else files[path] = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
  }
  return files;
}

const legacySource = `
import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ActionControl, ActionLink, Card, type ActionVariant } from '../.ui/generated/angular/core';
import { Stack } from '../.ui/generated/angular/layout';

@Component({
  selector: 'upgrade-app',
  imports: [ActionControl, ActionLink, Card, Stack],
  template: \`
    <main [attr.data-ui-profile]="profile()">
      <button uiAction (click)="profile.set(profile() === 'guided' ? 'dense' : 'guided')">Switch profile</button>
      <ui-stack gap="normal" aria-label="Field spacing">Before<br>After</ui-stack>
      <ui-stack gap="wide" aria-label="Section spacing">
        <ui-card cardId="draft" title="Draft">
          <button uiAction [variant]="variant" (click)="actions.update(increment)">{{ labels[variant] }}</button>
          <button uiAction variant="primary">Review draft</button>
          <a uiAction href="#result">Read result</a>
        </ui-card>
        <p id="result" role="status">{{ actions() }}</p>
      </ui-stack>
    </main>
  \`,
})
export class App {
  readonly variant: ActionVariant = 'danger';
  readonly labels: Record<ActionVariant,string> = { primary:'Review', secondary:'Back', danger:'Delete draft' };
  readonly profile = signal('guided');
  readonly actions = signal(0);
  readonly increment = (value: number) => value + 1;
}
void bootstrapApplication(App);
`;

test('the public 0.2.0 app can update unchanged, migrate its danger action, and recover its previous output', { timeout: 360_000 }, async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-action-upgrade-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = resolve(root, 'consumer');
  await mkdir(resolve(app, 'src'), { recursive: true });
  const execute = (file, args, cwd) => run(file, args, { cwd, signal: t.signal });
  const candidate = await prepareCandidate({ repository, root, execute });
  const profile = checkoutIsolation(repository);
  const isolated = (file, args) => execute('/usr/bin/sandbox-exec', ['-p', profile, file, ...args], app);
  const previous = resolve(root, 'public');
  await mkdir(previous);
  const [pack] = JSON.parse(await execute('npm', ['pack', publicPackage, '--json', '--ignore-scripts', '--pack-destination', previous], root));
  const publicTarball = resolve(previous, pack.filename);
  const digest = createHash('sha512').update(await readFile(publicTarball)).digest('base64');
  assert.equal(`sha512-${digest}`, publicIntegrity);
  assert.notEqual(createHash('sha256').update(await readFile(publicTarball)).digest('hex'), candidate.sha256);
  const versions = candidate.manifest.devDependencies;
  const names = ['@angular/common', '@angular/compiler', '@angular/compiler-cli', '@angular/core', '@angular/forms', '@angular/platform-browser', 'typescript', 'rxjs'];
  await writeFile(resolve(app, 'package.json'), JSON.stringify({
    private: true, type: 'module', dependencies: Object.fromEntries(names.map(name => [name, versions[name]])),
  }));
  await cp(resolve(repository, 'package-lock.json'), resolve(app, 'package-lock.json'));
  await isolated('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund']);
  await assert.rejects(readFile(resolve(app, 'node_modules/tailwindcss/package.json')), { code: 'ENOENT' });
  let archiveBytes;
  const install = async tarball => {
    await isolated('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--no-save', tarball]);
    const installed = await readFile(resolve(app, 'node_modules', candidate.manifest.name, 'templates/angular/action-control.ts'));
    if (tarball === publicTarball) { archiveBytes ??= installed; assert.deepEqual(installed, archiveBytes); }
    else assert.notDeepEqual(installed, archiveBytes);
  };
  const cli = (...args) => isolated(process.execPath, [`node_modules/${candidate.manifest.name}/dist/cli.js`, ...args]);
  const config = resolve(app, 'ui.config.yaml');
  const source = resolve(app, 'src/main.ts');
  await writeFile(source, legacySource);
  await writeFile(resolve(app, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', lib: ['ES2022', 'DOM'],
      strict: true, experimentalDecorators: true, skipLibCheck: true, noEmitOnError: true, rootDir: '.', outDir: 'compiled',
    },
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, compilationMode: 'full' },
    include: ['src/**/*.ts'],
  }));
  const browser = await chromium.launch({ channel: 'chromium' });
  t.after(() => browser.close());
  const verify = async migrated => {
    await cli('check', '--require-source-checks');
    await isolated(process.execPath, ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'tsconfig.json']);
    const generated = resolve(app, '.ui/generated');
    const { outputFiles } = await build({
      entryPoints: [resolve(app, 'compiled/src/main.js')], bundle: true, format: 'esm', target: 'es2022',
      write: false, define: { ngDevMode: 'false' },
      plugins: [{ name: 'angular-linker', setup(builder) {
        builder.onLoad({ filter: /\.mjs$/ }, async ({ path }) => {
          const text = await readFile(path, 'utf8');
          if (!needsLinking(path, text)) return;
          const linked = await transformAsync(text, { filename: path, configFile: false, babelrc: false, plugins: [linkerPlugin] });
          assert.ok(linked?.code);
          return { loader: 'js', contents: linked.code };
        });
      }}],
    });
    const css = (await Promise.all(['tokens.css', 'angular/styles.css'].map(path => readFile(resolve(generated, path), 'utf8')))).join('\n');
    const server = createServer((request, response) => {
      if (request.url === '/css') response.writeHead(200, { 'Content-Type': 'text/css' }).end(css);
      else if (request.url === '/app') response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(outputFiles[0].text);
      else response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><link rel="stylesheet" href="/css"><upgrade-app></upgrade-app><script type="module" src="/app"></script></html>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport:{width:320,height:800}, reducedMotion:'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      const states = [];
      for (const region of ['guided','dense']) {
        await expect(page.locator('main')).toHaveAttribute('data-ui-profile', region);
        const action = page.getByRole('button', {name:'Delete draft'});
        if (migrated) {
          await expect(action).toHaveAttribute('data-emphasis', 'primary');
          await expect(action).toHaveAttribute('data-tone', 'danger');
        } else {
          await expect(action).toHaveAttribute('data-variant', 'danger');
          await expect(action).not.toHaveAttribute('data-emphasis');
        }
        const appearance = locator => locator.evaluate(el => {
          const css = getComputedStyle(el);
          return [css.color, css.backgroundColor, css.borderTopColor, css.fontSize, css.rowGap];
        });
        const field = page.locator('ui-stack[aria-label="Field spacing"]');
        const section = page.locator('ui-stack[aria-label="Section spacing"]');
        const heading = page.getByRole('heading', { name:'Draft', level:2 });
        const controls = [action, page.getByRole('button',{name:'Review draft'}), page.getByRole('link',{name:'Read result'})];
        const resting = await Promise.all([...controls, field, section, heading].map(appearance));
        const hover = [];
        for (const control of controls) {
          await control.hover();
          hover.push(await appearance(control));
        }
        await action.press('Enter');
        await action.press('Space');
        await expect(page.getByRole('status')).toHaveText(region === 'guided' ? '2' : '4');
        states.push({ resting, hover });
        await page.mouse.move(0, 0);
        await page.getByRole('button',{name:'Switch profile'}).click();
      }
      assert.deepEqual(errors, []);
      return states;
    } finally {
      await page.close();
      await new Promise(resolve => server.close(resolve));
    }
  };
  const outputs = async () => ({ ...await snapshot(app,'.ui'), ...await snapshot(app,'.agents') });
  await install(publicTarball);
  await cli('init');
  await cli('sync');
  const previousConfig = await readFile(config);
  const previousOutput = await outputs();
  const before = await verify(false);
  await install(candidate.tarball);
  await cli('sync', '--dry-run');
  assert.deepEqual(await outputs(), previousOutput);
  await cli('sync');
  assert.deepEqual(await readFile(config), previousConfig);
  assert.equal(await readFile(source, 'utf8'), legacySource);
  assert.deepEqual(await verify(false), before, 'existing bindings, heading size and spacing must stay equivalent');
  const upgraded = await outputs();
  await cli('sync');
  assert.deepEqual(await outputs(), upgraded);
  const migrated = legacySource.replace('[variant]="variant"', 'emphasis="primary" tone="danger"');
  await writeFile(source, migrated);
  assert.deepEqual(await verify(true), before, 'the equivalent new API must retain danger styling and native keyboard activation');
  await writeFile(source, legacySource);
  await install(publicTarball);
  await cli('sync');
  assert.deepEqual(await outputs(), previousOutput);
  assert.deepEqual(await readFile(config), previousConfig);
  assert.deepEqual(await verify(false), before);
  await assertFrozenCandidate(candidate);
  t.diagnostic(JSON.stringify({ publicPackage, publicIntegrity, candidate_sha256:candidate.sha256, states:before }));
});
