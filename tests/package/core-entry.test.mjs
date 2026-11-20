import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { assertFrozenCandidate, prepareCandidate } from '../../scripts/package-verification/candidate.mjs';
import { checkoutIsolation, run } from '../../scripts/package-verification/run.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');

test('the packed core, forms and locale example compile and bundle without specialist dependencies', { timeout: 360_000 }, async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-core-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = resolve(root, 'app');
  await mkdir(resolve(app, 'src'), { recursive: true });
  const execute = (file, args, cwd) => run(file, args, { cwd, signal: t.signal });
  const candidate = await prepareCandidate({ repository, root, execute });
  const profile = checkoutIsolation(repository);
  const isolated = (file, args) => execute('/usr/bin/sandbox-exec', ['-p', profile, file, ...args], app);
  const versions = candidate.manifest.devDependencies;
  const dependencies = [
    '@angular/cdk', '@angular/common', '@angular/compiler', '@angular/compiler-cli', '@angular/core',
    '@angular/forms', '@angular/platform-browser', '@babel/core', '@lucide/angular', 'esbuild', 'rxjs', 'typescript',
  ];
  const appManifest = {
    private: true,
    type: 'module',
  };
  async function install(devDependencies) {
    await writeFile(resolve(app, 'package.json'), JSON.stringify({ ...appManifest, devDependencies }));
    await cp(resolve(repository, 'package-lock.json'), resolve(app, 'package-lock.json'));
    await isolated('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', candidate.tarball]);
  }
  await install(Object.fromEntries(dependencies.map(name => [name, versions[name]])));
  const specialistPackages = ['maplibre-gl', 'pdfjs-dist', 'fast-formula-parser'];
  for (const name of specialistPackages) {
    await assert.rejects(readFile(resolve(app, 'node_modules', name, 'package.json')), { code: 'ENOENT' });
  }
  const cli = (...args) => isolated(process.execPath, [`node_modules/${candidate.manifest.name}/dist/cli.js`, ...args]);
  await cli('init');
  await cli('sync');
  await cp(resolve(app, 'node_modules', candidate.manifest.name, 'skills/ui-development/references/examples/locale-adapter.ts'), resolve(app, 'locale-adapter.ts'));
  await writeFile(resolve(app, 'src/main.ts'), `
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ActionControl, Card, provideUiIcons, provideUiLocale } from '../.ui/generated/angular/core';
import { createLocaleAdapter } from '../locale-adapter';

@Component({
  selector: 'app-root',
  imports: [ActionControl, Card],
  template: '<ui-card cardId="example" title="Example"><button type="button" uiAction (click)="openForm()">Open form</button></ui-card>',
})
export class App {
  async openForm() {
    const { Form } = await import('./form');
    await bootstrapApplication(Form);
  }
}
void bootstrapApplication(App, { providers: [provideUiIcons(), provideUiLocale(createLocaleAdapter().options)] });
`);
  await writeFile(resolve(app, 'src/form.ts'), `
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FieldControl, FormField, TextInput } from '../.ui/generated/angular/forms';

@Component({
  selector: 'app-form',
  imports: [FieldControl, FormField, TextInput, ReactiveFormsModule],
  template: '<ui-form-field controlId="name" label="Name"><input uiFieldControl /></ui-form-field><ui-text-input controlId="note" label="Note" [formControl]="note" />',
})
export class Form { readonly note = new FormControl<string | null>(''); }
`);
  const check = () => cli('check', '--require-source-checks');
  await check();
  const tokensPath = resolve(app, '.ui/generated/tokens.css');
  const tokens = await readFile(tokensPath, 'utf8');
  await writeFile(tokensPath, tokens + '\n/* local edit */\n');
  await assert.rejects(check(), /tokens\.css/);
  await writeFile(tokensPath, tokens);
  await check();
  await writeFile(resolve(app, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', lib: ['ES2022', 'DOM'],
      strict: true, experimentalDecorators: true, skipLibCheck: true, noEmitOnError: true, rootDir: '.', outDir: 'compiled',
    },
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, compilationMode: 'full' },
    include: ['src/**/*.ts'],
  }));
  await cp(resolve(repository, 'scripts/package-verification/core-bundle.mjs'), resolve(app, 'core-bundle.mjs'));
  async function compileAndBundle() {
    await isolated(process.execPath, ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'tsconfig.json']);
    return JSON.parse(await isolated(process.execPath, ['core-bundle.mjs']));
  }
  const output = await compileAndBundle();
  t.diagnostic(JSON.stringify({ entry: 'core', ...output }));
  assert.ok(output.initialJavaScriptBytes > 0);
  assert.ok(output.lazyFormJavaScriptBytes > 0);
  assert.ok(output.initialCssBytes > 0);
  assert.deepEqual(output.specialistInputs, []);
  assert.deepEqual(output.specialistOutputs, []);

  // Compare the two entries with the same app and compiler options. The full
  // entry still has the documented specialist type dependencies.
  await install(versions);
  for (const name of ['main.ts', 'form.ts']) {
    const path = resolve(app, 'src', name);
    await writeFile(path, (await readFile(path, 'utf8')).replace(/\.ui\/generated\/angular\/(core|forms)\b/g, '.ui/generated/angular/index'));
  }
  const full = await compileAndBundle();
  t.diagnostic(JSON.stringify({ entry: 'index', ...full, specialistInputs: full.specialistInputs.length }));
  assert.ok(full.specialistInputs.some(path => path.includes('/maplibre-gl/')));
  assert.ok(full.totalBytes > output.totalBytes, 'the full entry must emit more bytes in this fixture');
  await assertFrozenCandidate(candidate);
});
