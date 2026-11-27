import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse, stringify } from 'yaml';
import { prepareCandidate, assertFrozenCandidate } from '../../scripts/package-verification/candidate.mjs';
import { verifyEnglishDocumentation, verifyReleaseVersionDocumentation } from '../../scripts/package-verification/documentation.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const run = (file, args, cwd) => execFileSync(file, args, { cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } });

test('packed CLI works offline without checkout dependencies and preserves generation/check boundaries', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-package-'));
  let candidate;
  t.after(async () => { try { if (candidate) await assertFrozenCandidate(candidate); } finally { await rm(root, { recursive: true, force: true }); } });
  candidate = await prepareCandidate({ repository, root, execute: run });
  const { paths, manifest } = candidate;
  assert.equal(manifest.private, false, 'the authorized public release candidate must explicitly enable publication');
  assert.equal(manifest.name, '@hiroshi.inoue/ui-foundation');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.version, '0.2.0');
  assert.deepEqual(manifest.publishConfig, { registry: 'https://registry.npmjs.org/', access: 'public', tag: 'release-candidate' });
  assert.equal(manifest.bin['ui-foundation'], 'dist/cli.js');
  for (const name of ['README.md', 'README.ja.md', 'LICENSE', 'dist/cli.js', 'dist/check-ui.cjs', 'dist/CLI-NOTICE.txt', 'dist/CHECKER-NOTICE.txt', 'dist/CLI-DEPENDENCIES.json',
    'dist/checker-lib/lib.es2022.d.ts', 'templates/angular/index.ts', 'templates/angular/stable-messages.ts', 'skills/ui-development/SKILL.md', 'skills/ui-development/references/examples/locale-adapter.ts', 'docs/commands.en.md', 'docs/components.en.md', 'docs/ui-library-consumer-guide.en.md',
    'examples/ui.config.example.yaml', 'examples/ui.config.example.en.yaml', 'assets/pdf-source/FONT-MAPPING.json', 'assets/third-party/THIRD-PARTY-NOTICES.txt',
    'assets/third-party/FOUNDATION-NOTICES.txt', 'docs/ui-library-api.json', 'docs/components.ja.md', 'docs/ui-library-consumer-guide.ja.md', 'docs/npm-beta-readiness.ja.md', 'docs/npm-beta-release-notes.ja.md', 'docs/commands.ja.md']) {
    assert.ok(paths.includes(name), `missing package resource: ${name}`);
  }
  assert.ok(!paths.some(path => /^templates\/.*\.md$/.test(path)), 'template authoring documentation must not be published');
  const allowedDocs = manifest.files.filter(path => path.startsWith('docs/')).sort();
  assert.ok(allowedDocs.every(path => /^docs\/[a-z0-9-]+(?:\.(?:ja|en))?\.(?:md|json)$/.test(path)), 'package documentation must use explicit filenames');
  assert.deepEqual(paths.filter(path => path.startsWith('docs/')).sort(), allowedDocs, 'the tarball documentation must exactly match the explicit allowlist');
  assert.ok(!paths.some(path => /(?:^docs\/adr\/|^docs\/verification\/|^docs\/(?:development|implementation-plan|npm-release-plan|ui-library-matrix)\.)/.test(path)), 'developer records and validation evidence must not be published');
  for (const path of paths) assert.ok(allowedDocs.includes(path) || /^(?:package\.json|README(?:\.ja)?\.md|LICENSE|dist\/(?:cli\.js|check-ui\.cjs|CLI-NOTICE\.txt|CHECKER-NOTICE\.txt|CLI-DEPENDENCIES\.json|checker-lib\/[^/]+\.d\.ts)|templates\/angular\/.*|skills\/ui-development\/.*|examples\/ui\.config\.example(?:\.en)?\.yaml|assets\/(?:pdf-source|third-party)\/.*)$/.test(path), `unexpected packed file: ${path}`);
  const consumer = resolve(root, 'consumer'); await mkdir(consumer);
  await writeFile(resolve(consumer, 'package.json'), '{"private":true,"type":"module"}');
  run('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false', candidate.tarball], consumer);
  const installed = resolve(consumer, 'node_modules', manifest.name);
  await verifyReleaseVersionDocumentation(installed);
  const installedMetadata = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
  assert.equal(installedMetadata.license, manifest.license);
  assert.equal(installedMetadata.version, manifest.version);
  for (const path of ['README.md', 'README.ja.md', ...allowedDocs, 'skills/ui-development/SKILL.md']) {
    assert.deepEqual(await readFile(resolve(installed, path)), await readFile(resolve(repository, path)), `consumer documentation must be current: ${path}`);
  }
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
  assert.match(await readFile(resolve(installed, 'README.md'), 'utf8'), /Angular UI components/);
  assert.match(await readFile(resolve(installed, 'README.md'), 'utf8'), /日本語の概要/);
  assert.doesNotMatch(await readFile(resolve(installed, 'README.md'), 'utf8'), /has not been published/);
  assert.match(installedMetadata.description, /English and Japanese/);
  cli('init');
  cli('init', '--language', 'ja', '--config', 'japanese.yaml');
  await assert.rejects(async () => cli('init'), /already exists/i);
  await mkdir(resolve(consumer, 'src'));
  await writeFile(resolve(consumer, 'src/app.ts'), 'export const title: string = "Example";\n');
  cli('sync', '--dry-run');
  await assert.rejects(readFile(resolve(consumer, '.ui/generated/manifest.json')), { code: 'ENOENT' });

  const tokenSettings = ({ primitives, semantic, profiles, default_profile }) => ({
    primitives,
    semantic,
    profiles: Object.fromEntries(Object.entries(profiles).map(([id, profile]) => [id, profile.semantic])),
    default_profile,
  });
  const expectedTokens = tokenSettings(parse(await readFile(resolve(repository, 'examples/ui.config.repository.yaml'), 'utf8')));
  const expectedChecks = { source_roots: ['src'], approved_components: [], exceptions: [] };
  for (const [language, filename, examplePath, product] of [
    ['ja', 'japanese.yaml', 'examples/ui.config.example.yaml', '申請管理'],
    ['en', 'ui.config.yaml', 'examples/ui.config.example.en.yaml', 'Application management'],
  ]) {
    const initialized = parse(await readFile(resolve(consumer, filename), 'utf8'));
    const packedExample = await readFile(resolve(installed, examplePath), 'utf8');
    const example = parse(packedExample);
    assert.deepEqual(example.checks, expectedChecks);
    assert.deepEqual(initialized.checks, expectedChecks);
    assert.deepEqual(tokenSettings(example), expectedTokens);
    assert.deepEqual(tokenSettings(initialized), expectedTokens);
    assert.equal(initialized.context.product, product);
    assert.equal(initialized.default_language, language);
    cli('sync', '--config', filename);
    assert.deepEqual(await readFile(resolve(consumer, '.agents/skills/project-ui/references', examplePath), 'utf8'), packedExample);
    const defaults = await readFile(resolve(consumer, '.ui/generated/angular/locale-defaults.ts'), 'utf8');
    assert.ok(defaults.includes(`= "${language}";`));
  }
  assert.match(cli('sync'), /current/);
  const documentation = await verifyEnglishDocumentation(installed, resolve(consumer, '.agents/skills/project-ui'));
  t.diagnostic(`Installed and synced English documentation closure: ${JSON.stringify(documentation)}`);
  assert.match(await readFile(resolve(consumer, '.ui/generated/angular/locale-defaults.ts'), 'utf8'), /"en"/);
  const skillDocs = resolve(consumer, '.agents/skills/project-ui/references/docs');
  const generatedDocs = [];
  async function visitSkillDocs(directory, prefix = 'docs') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}/${entry.name}`;
      assert.equal(entry.isSymbolicLink(), false, path);
      if (entry.isDirectory()) await visitSkillDocs(resolve(directory, entry.name), path);
      else generatedDocs.push(path);
    }
  }
  await visitSkillDocs(skillDocs);
  assert.deepEqual(generatedDocs.sort(), allowedDocs, 'generated Skill docs must match the tarball allowlist');
  const valid = JSON.parse(cli('check', '--format', 'json'));
  assert.equal(valid.valid, true);
  assert.ok(!valid.source.diagnostics.some(item => /standard libraries are unavailable/.test(item.message)));
  const generated = resolve(consumer, '.ui/generated');
  for (const directory of [resolve(installed, 'skills/ui-development'), resolve(consumer, '.agents/skills/project-ui')]) {
    const skill = await readFile(resolve(directory, 'SKILL.md'), 'utf8');
    assert.match(skill, /English consumer guide/);
    for (const [, target] of skill.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) await readFile(resolve(directory, target.split('#')[0]));
    for (const name of ['SKILL.en.md', 'SKILL.ja.md']) await assert.rejects(readFile(resolve(directory, name)), { code: 'ENOENT' });
  }
  assert.deepEqual(await readFile(resolve(generated, 'angular/stable-messages.ts')), await readFile(resolve(installed, 'templates/angular/stable-messages.ts')));
  for (const directory of [resolve(installed, 'templates/angular'), resolve(generated, 'angular')]) {
    for (const name of ['locale-en.ts', 'locale-ja.ts']) await assert.rejects(readFile(resolve(directory, name)), { code: 'ENOENT' });
  }
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
  // Only the three files a team checks in reach the second checkout.
  const project = resolve(root, 'team-project');
  const checkout = resolve(root, 'new-checkout');
  const archive = `vendor/${manifest.name.slice(1).replace('/', '-')}-${manifest.version}.tgz`;
  await mkdir(resolve(project, 'vendor'), { recursive: true });
  await writeFile(resolve(project, 'package.json'), JSON.stringify({ private: true }));
  await cp(candidate.tarball, resolve(project, archive));
  run('npm', ['install', '--offline', '--save-dev', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund', './' + archive], project);
  assert.equal(JSON.parse(await readFile(resolve(project, 'package.json'), 'utf8')).devDependencies[manifest.name], 'file:' + archive);
  await mkdir(resolve(checkout, 'vendor'), { recursive: true });
  for (const name of [archive, 'package.json', 'package-lock.json']) await cp(resolve(project, name), resolve(checkout, name));
  run('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', resolve(root, 'new-cache')], checkout);
  assert.equal(JSON.parse(await readFile(resolve(checkout, 'node_modules', manifest.name, 'package.json'), 'utf8')).version, manifest.version);
  t.diagnostic(`tarball ${candidate.origin} sha256=${candidate.sha256}: ${paths.length} files, ${candidate.size} bytes; offline clean install and standalone checker verified`);
});
