import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse, stringify } from 'yaml';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const run = (file, args, cwd) => execFileSync(file, args, { cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } });

test('packed CLI works offline without checkout dependencies and preserves generation/check boundaries', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  run(process.execPath, ['--import', 'tsx', 'scripts/build-package.ts'], repository);
  const [pack] = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', root], repository));
  const paths = pack.files.map(file => file.path);
  const manifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
  assert.equal(manifest.private, true, 'preparation must not enable registry publication');
  assert.equal(manifest.name, '@hiroshi.inoue/ui-foundation');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.version, '0.1.0-beta.1');
  assert.deepEqual(manifest.publishConfig, { registry: 'https://registry.npmjs.org/', access: 'public', tag: 'beta' });
  assert.equal(manifest.bin['ui-foundation'], 'dist/cli.js');
  for (const name of ['LICENSE', 'dist/cli.js', 'dist/check-ui.cjs', 'dist/CLI-NOTICE.txt', 'dist/CHECKER-NOTICE.txt', 'dist/CLI-DEPENDENCIES.json',
    'dist/checker-lib/lib.es2022.d.ts', 'templates/angular/index.ts', 'skills/ui-development/SKILL.md',
    'examples/ui.config.example.yaml', 'assets/pdf-source/FONT-MAPPING.json', 'assets/third-party/THIRD-PARTY-NOTICES.txt',
    'assets/third-party/FOUNDATION-NOTICES.txt', 'docs/ui-library-api.json', 'docs/ui-library-matrix.json', 'docs/adr/0001-overlay-escape.md']) {
    assert.ok(paths.includes(name), `missing package resource: ${name}`);
  }
  for (const path of paths) assert.ok(/^(?:package\.json|README\.md|LICENSE|dist\/(?:cli\.js|check-ui\.cjs|CLI-NOTICE\.txt|CHECKER-NOTICE\.txt|CLI-DEPENDENCIES\.json|checker-lib\/[^/]+\.d\.ts)|templates\/angular\/.*|skills\/ui-development\/.*|examples\/ui\.config\.example\.yaml|assets\/(?:pdf-source|third-party)\/.*|docs\/(?:[^/]+\.md|adr\/[^/]+\.md|ui-library-(?:api|matrix)\.json))$/.test(path), `unexpected packed file: ${path}`);
  const consumer = resolve(root, 'consumer'); await mkdir(consumer);
  await writeFile(resolve(consumer, 'package.json'), '{"private":true,"type":"module"}');
  run('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false', resolve(root, pack.filename)], consumer);
  const installed = resolve(consumer, 'node_modules', manifest.name);
  const installedMetadata = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
  assert.equal(installedMetadata.license, manifest.license);
  assert.equal(installedMetadata.version, manifest.version);
  const ownLicense = await readFile(resolve(repository, 'LICENSE'));
  assert.deepEqual(await readFile(resolve(installed, 'LICENSE')), ownLicense);
  assert.ok(!installedMetadata.dependencies || Object.keys(installedMetadata.dependencies).length === 0);
  const upstreamNotice = await readFile(resolve(repository, 'node_modules/typescript/ThirdPartyNoticeText.txt'), 'utf8');
  for (const name of ['CLI-NOTICE.txt', 'CHECKER-NOTICE.txt']) {
    assert.ok((await readFile(resolve(installed, 'dist', name), 'utf8')).includes(upstreamNotice), `TypeScript third-party notice missing from ${name}`);
  }
  const bin = resolve(consumer, 'node_modules/.bin/ui-foundation');
  const cli = (...args) => run(bin, args, consumer);
  assert.match(cli('--help'), /Usage: ui-foundation/);
  cli('init');
  await assert.rejects(async () => cli('init'), /already exists/i);
  await mkdir(resolve(consumer, 'src'));
  await writeFile(resolve(consumer, 'src/app.ts'), 'export const title: string = "Example";\n');
  cli('sync', '--dry-run');
  await assert.rejects(readFile(resolve(consumer, '.ui/generated/manifest.json')), { code: 'ENOENT' });
  cli('sync');
  assert.match(cli('sync'), /current/);
  const valid = JSON.parse(cli('check', '--format', 'json'));
  assert.equal(valid.valid, true);
  assert.ok(!valid.source.diagnostics.some(item => /standard libraries are unavailable/.test(item.message)));
  const generated = resolve(consumer, '.ui/generated');
  for (const path of ['.ui/generated/UI-FOUNDATION-LICENSE.txt', '.agents/skills/project-ui/UI-FOUNDATION-LICENSE.txt']) {
    assert.deepEqual(await readFile(resolve(consumer, path)), ownLicense, path);
  }
  assert.ok((await readFile(resolve(generated, 'CHECKER-NOTICE.txt'), 'utf8')).includes(upstreamNotice));
  const sourceConsumer = resolve(root, 'source-consumer'); await mkdir(sourceConsumer);
  await cp(resolve(consumer, 'ui.config.yaml'), resolve(sourceConsumer, 'ui.config.yaml'));
  run(process.execPath, ['--import', resolve(repository, 'node_modules/tsx/dist/loader.mjs'), resolve(repository, 'src/cli.ts'), 'sync'], sourceConsumer);
  assert.equal(await readFile(resolve(generated, 'manifest.json'), 'utf8'), await readFile(resolve(sourceConsumer, '.ui/generated/manifest.json'), 'utf8'), 'packaged generation must match source generation byte for byte');
  const original = await readFile(resolve(consumer, 'ui.config.yaml'), 'utf8');
  const changed = parse(original); changed.context.product = 'Changed application';
  await writeFile(resolve(consumer, 'ui.config.yaml'), stringify(changed));
  assert.throws(() => cli('check', '--format', 'json'));
  cli('sync');
  assert.equal(JSON.parse(cli('check', '--format', 'json')).valid, true);
  await writeFile(resolve(consumer, 'ui.config.yaml'), original);
  cli('sync');
  const tokens = await readFile(resolve(generated, 'tokens.css'), 'utf8');
  await writeFile(resolve(generated, 'tokens.css'), tokens + '\n/* manual edit */\n');
  assert.throws(() => cli('check'));
  assert.throws(() => cli('sync'));
  await writeFile(resolve(generated, 'tokens.css'), tokens);
  // Copy only generated output to an app with no package or node_modules.
  const standalone = resolve(root, 'standalone'); await mkdir(standalone);
  await cp(generated, resolve(standalone, '.ui/generated'), { recursive: true });
  await cp(resolve(consumer, 'ui.config.yaml'), resolve(standalone, 'ui.config.yaml'));
  await mkdir(resolve(standalone, 'src'));
  await writeFile(resolve(standalone, 'src/app.ts'), 'document.body.style.color = "#123456";\n');
  const checker = resolve(standalone, '.ui/generated/check-ui.cjs');
  assert.throws(() => run(process.execPath, [checker, '--format', 'json'], standalone));
  await writeFile(resolve(standalone, 'src/app.ts'), 'document.body.style.color = window.location.hash;\n');
  const warning = JSON.parse(run(process.execPath, [checker, '--format', 'json'], standalone));
  assert.ok(warning.diagnostics.some(item => item.severity === 'warning'));
  assert.equal(warning.diagnostics.filter(item => item.severity === 'error').length, 0);
  t.diagnostic(`tarball ${pack.filename}: ${paths.length} files, ${pack.size} bytes; offline clean install and standalone checker verified`);
});
