import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { devNull, tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse, stringify } from 'yaml';
import { prepareCandidate, assertFrozenCandidate } from '../../scripts/package-verification/candidate.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const run = (file, args, cwd) => execFileSync(file, args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: devNull },
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (cwd, ...args) => run('git', args, cwd);
const skill = '.agents/skills/project-ui';
const ownership = skill + '/ownership.json';
const defaultOutput = '.ui/generated';
const customOutput = 'custom/generated';
const configFile = 'ui.config.yaml';
const appSource = 'export const application = true;\n';
const attrs = (...outputs) => ['* text=auto', ...outputs.map(output => output + '/** -text'), skill + '/** -text', ''].join('\n');
const publishedTarball = process.env.UI_FOUNDATION_PUBLISHED_020_TARBALL;
const publishedSha256 = '46bd919994ce2a21e23829aed3cc9542344f23f27e28a04fb502b70fc785e8a7';

async function rootFixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-packed-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function installCLI(root, label, tarball) {
  const tools = resolve(root, label);
  await mkdir(tools);
  await writeFile(resolve(tools, 'package.json'), '{"private":true,"type":"module"}\n');
  run('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false', tarball], tools);
  const path = resolve(tools, 'node_modules/@hiroshi.inoue/ui-foundation/dist/cli.js');
  return (cwd, ...args) => run(process.execPath, [path, ...args], cwd);
}

async function configuredApp(root, name, cli, output) {
  const app = resolve(root, name);
  await mkdir(app);
  cli(app, 'init');
  if (output !== defaultOutput) await writeOutput(app, output);
  await writeAppSource(app);
  cli(app, 'sync');
  return app;
}

async function writeOutput(app, output) {
  const path = resolve(app, configFile);
  const config = parse(await readFile(path, 'utf8'));
  config.output = output;
  await writeFile(path, stringify(config));
}

async function writeAppSource(app) {
  await mkdir(resolve(app, 'src'));
  await writeFile(resolve(app, 'src/app.ts'), appSource);
}

function commit(app, message) {
  git(app, '-c', 'user.name=UI Foundation Test', '-c', 'user.email=test@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', message);
}

async function gitSeed(app, output, attributes) {
  git(app, 'init', '--quiet');
  git(app, 'config', 'core.autocrlf', 'false');
  await writeFile(resolve(app, '.gitattributes'), attributes);
  git(app, 'add', '--force', '--', '.gitattributes', configFile, 'src', output, skill);
  commit(app, 'Track generated fixture');
}

function clone(root, seed, name, autocrlf) {
  const app = resolve(root, name);
  git(root, 'clone', '--quiet', '--no-local', '--config', 'core.autocrlf=' + autocrlf, seed, app);
  return app;
}

async function recordedOutput(app, output) {
  const manifestPath = output + '/manifest.json';
  const manifest = await readFile(resolve(app, manifestPath));
  const { files } = JSON.parse(manifest);
  assert.ok(files[ownership]);
  assert.ok(files[output + '/CHECKER-NOTICE.txt']);
  assert.ok(files[output + '/UI-FOUNDATION-LICENSE.txt']);
  return { manifestPath, manifest, files };
}

async function assertAllBytes(app, { manifestPath, manifest, files }) {
  assert.deepEqual(await readFile(resolve(app, manifestPath)), manifest, manifestPath);
  for (const [path, { sha256 }] of Object.entries(files)) assert.equal(digest(await readFile(resolve(app, path))), sha256, path);
}

async function assertCurrent(app, cli, original) {
  assert.match(cli(app, 'sync', '--dry-run'), /is current/i);
  assert.equal(JSON.parse(cli(app, 'check', '--format', 'json')).valid, true);
  assert.match(cli(app, 'sync'), /is current/i);
  await assertAllBytes(app, original);
}

const normalize = bytes => bytes.toString('latin1').replace(/\r\n/g, '\n');

async function recoveryPlan(app, source, { manifestPath, manifest, files }, output) {
  const file = async (directory, relative) => {
    let path = directory;
    const parts = relative.split('/');
    for (const [index, part] of parts.entries()) {
      path = resolve(path, part);
      const stat = await lstat(path);
      assert.ok(index === parts.length - 1 ? stat.isFile() : stat.isDirectory(), 'unsafe recovery path: ' + relative);
    }
    return readFile(path);
  };
  const regenerated = await file(source, manifestPath);
  assert.deepEqual(regenerated, manifest, 'fixed package must reconstruct the original manifest');
  assert.equal(normalize(await file(app, manifestPath)), normalize(manifest), 'recorded manifest contains an edit');
  const replacements = [];
  for (const [path, { sha256 }] of Object.entries(files)) {
    assert.ok(path.startsWith(output + '/') || path.startsWith(skill + '/'));
    const bytes = await file(source, path);
    assert.equal(digest(bytes), sha256, path);
    const existing = await file(app, path);
    if (digest(existing) === sha256) continue;
    assert.equal(normalize(existing), normalize(bytes), 'do not discard a non-line-ending edit: ' + path);
    replacements.push({ path, bytes });
  }
  return [...replacements, { path: manifestPath, bytes: regenerated }];
}

test('fixed candidate preserves every managed byte in protected LF and CRLF checkouts of both outputs', { timeout: 360_000 }, async t => {
  const root = await rootFixture(t);
  const candidate = await prepareCandidate({ repository, root, execute: run });
  const cli = await installCLI(root, 'candidate-tool', candidate.tarball);
  for (const output of [defaultOutput, customOutput]) {
    const seed = await configuredApp(root, output === defaultOutput ? 'default' : 'custom', cli, output);
    const original = await recordedOutput(seed, output);
    await gitSeed(seed, output, attrs(output));
    for (const autocrlf of ['false', 'true']) {
      const app = clone(root, seed, basename(seed) + '-' + autocrlf, autocrlf);
      const checkedAttributes = git(app, 'check-attr', 'text', '--', output + '/CHECKER-NOTICE.txt', ownership);
      assert.equal(checkedAttributes.trim().split('\n').filter(line => line.endsWith(': text: unset')).length, 2);
      await assertCurrent(app, cli, original);
      assert.equal(git(app, 'status', '--porcelain').trim(), '');
    }
    t.diagnostic(`${output}: verified ${Object.keys(original.files).length} managed files and the manifest on both Git checkout modes`);
  }
  await assertFrozenCandidate(candidate);
});

test('official npm 0.2.0 reproduces the conversion, supports verified recovery, and upgrades and rolls back across output relocation', {
  timeout: 360_000,
  skip: publishedTarball ? false : 'Set UI_FOUNDATION_PUBLISHED_020_TARBALL to the fixed official npm 0.2.0 tarball for the registry reproduction.',
}, async t => {
  const root = await rootFixture(t);
  assert.equal(digest(await readFile(publishedTarball)), publishedSha256, 'published 0.2.0 tarball must be the original registry bytes');
  const previous = await installCLI(root, 'published-tool', resolve(publishedTarball));
  const candidate = await prepareCandidate({ repository, root, execute: run });
  const current = await installCLI(root, 'candidate-tool', candidate.tarball);
  const seed = await configuredApp(root, 'normalized-seed', previous, defaultOutput);
  const original = await recordedOutput(seed, defaultOutput);
  const notice = defaultOutput + '/CHECKER-NOTICE.txt';
  const noticeBytes = await readFile(resolve(seed, notice));
  assert.match(noticeBytes.toString('latin1'), /\r\n/);
  assert.match(noticeBytes.toString('latin1'), /[^\r]\n/);
  await gitSeed(seed, defaultOutput, '* text=auto\n');

  const recovery = resolve(root, 'verified-original');
  await mkdir(recovery);
  await writeFile(resolve(recovery, configFile), await readFile(resolve(seed, configFile)));
  await writeAppSource(recovery);
  previous(recovery, 'sync');
  for (const autocrlf of ['false', 'true']) {
    const app = clone(root, seed, 'normalized-' + autocrlf, autocrlf);
    const crlf = autocrlf === 'true';
    const damagedPath = crlf ? ownership : notice;
    const damaged = await readFile(resolve(app, damagedPath));
    assert.notEqual(digest(damaged), original.files[damagedPath].sha256);
    for (const cli of [previous, current]) {
      assert.throws(() => cli(app, 'check', '--format', 'json'), error => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.valid, false);
        assert.ok(report.differences.some(difference => difference.includes(damagedPath)));
        if (cli === current) assert.ok(report.differences.some(difference => difference.includes('.gitattributes')));
        return true;
      });
      for (const args of [['sync', '--dry-run'], ['sync']]) assert.throws(() => cli(app, ...args),
        crlf ? /Ownership registry does not match its manifest/ : /Generated file was edited: .ui\/generated\/CHECKER-NOTICE.txt/);
      assert.deepEqual(await readFile(resolve(app, damagedPath)), damaged);
      assert.equal(git(app, 'status', '--porcelain').trim(), '');
    }

    const edited = resolve(app, skill, 'SKILL.md');
    const baseline = await readFile(edited);
    await writeFile(edited, Buffer.concat([baseline, Buffer.from('\nConsumer edit.\n')]));
    await assert.rejects(recoveryPlan(app, recovery, original, defaultOutput), /do not discard a non-line-ending edit/);
    assert.deepEqual(await readFile(resolve(app, damagedPath)), damaged, 'a failed recovery plan writes nothing');
    await writeFile(edited, baseline);
    for (const { path, bytes } of await recoveryPlan(app, recovery, original, defaultOutput)) {
      await writeFile(resolve(app, path), bytes);
    }
    await writeFile(resolve(app, '.gitattributes'), attrs(defaultOutput, customOutput));
    git(app, 'add', '--', '.gitattributes');
    git(app, 'add', '--renormalize', '--', defaultOutput, skill);
    commit(app, 'Restore verified managed bytes');
    const fresh = clone(root, app, 'restored-' + autocrlf, autocrlf);
    await assertCurrent(fresh, previous, original);
    assert.equal(git(fresh, 'status', '--porcelain').trim(), '');
    t.diagnostic(`published 0.2.0 checkout (core.autocrlf=${autocrlf}): reproduced ${damagedPath} conflict and restored ${Object.keys(original.files).length} managed files plus manifest`);
  }

  const app = clone(root, resolve(root, 'normalized-true'), 'transition', 'true');
  const config = await readFile(resolve(app, configFile));
  const attributes = await readFile(resolve(app, '.gitattributes'));
  const registry = resolve(app, ownership);
  const originalRegistry = await readFile(registry);
  await writeFile(registry, JSON.stringify({ schema_version: 2 }));
  assert.throws(() => current(app, 'sync'), /Invalid ownership registry/);
  await writeFile(registry, originalRegistry);
  if (process.platform !== 'win32') {
    const originalNotice = resolve(root, 'notice-original');
    await rename(resolve(app, notice), originalNotice);
    await symlink(originalNotice, resolve(app, notice));
    assert.throws(() => current(app, 'sync'), /Symlink/);
    assert.deepEqual(await readFile(originalNotice), noticeBytes);
    await rm(resolve(app, notice));
    await rename(originalNotice, resolve(app, notice));
  }
  await assertAllBytes(app, original);
  assert.match(current(app, 'sync', '--dry-run'), /Dry run: no files written/);
  await assertAllBytes(app, original);
  current(app, 'sync');
  await assertCurrent(app, current, await recordedOutput(app, defaultOutput));
  assert.deepEqual(await readFile(resolve(app, configFile)), config, 'upgrade keeps the previous YAML');
  previous(app, 'sync');
  await assertCurrent(app, previous, original);

  await writeOutput(app, customOutput);
  await writeFile(resolve(app, skill, 'SKILL.md'), 'Preserve this consumer edit.\n');
  assert.throws(() => current(app, 'sync'), /Generated file was edited/);
  assert.equal(await readFile(resolve(app, skill, 'SKILL.md'), 'utf8'), 'Preserve this consumer edit.\n');
  await writeFile(resolve(app, skill, 'SKILL.md'), await readFile(resolve(recovery, skill, 'SKILL.md')));
  assert.match(current(app, 'sync', '--dry-run'), /Dry run: no files written/);
  await assertAllBytes(app, original);
  current(app, 'sync');
  await assert.rejects(readFile(resolve(app, original.manifestPath)), { code: 'ENOENT' });
  await assertCurrent(app, current, await recordedOutput(app, customOutput));
  await writeFile(resolve(app, configFile), config);
  previous(app, 'sync');
  await assert.rejects(readFile(resolve(app, customOutput, 'manifest.json')), { code: 'ENOENT' });
  await assertCurrent(app, previous, original);
  assert.deepEqual(await readFile(resolve(app, configFile)), config);
  assert.deepEqual(await readFile(resolve(app, '.gitattributes')), attributes);
  assert.equal(normalize(await readFile(resolve(app, 'src/app.ts'))), appSource);
  assert.equal(git(app, 'status', '--porcelain').trim(), '');
  await assertFrozenCandidate(candidate);
  t.diagnostic(`published 0.2.0 sha256=${publishedSha256} → fixed candidate sha256=${candidate.sha256} → published 0.2.0 verified with output relocation`);
});
