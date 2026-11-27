import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { devNull, tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse, stringify } from 'yaml';
import { prepareCandidate, assertFrozenCandidate } from '../../scripts/package-verification/candidate.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const run = (file, args, cwd) => execFileSync(file, args, {
  cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: devNull },
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('packed CLI: recover normalized managed bytes for a custom output and verify fresh LF and CRLF checkouts', { timeout: 360_000 }, async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-packed-git-'));
  let candidate;
  t.after(async () => {
    try { if (candidate) await assertFrozenCandidate(candidate); }
    finally { await rm(root, { recursive: true, force: true }); }
  });
  candidate = await prepareCandidate({ repository, root, execute: run });
  const tools = resolve(root, 'tools');
  await mkdir(tools);
  await writeFile(resolve(tools, 'package.json'), '{"private":true,"type":"module"}\n');
  run('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false', candidate.tarball], tools);
  const cliPath = resolve(tools, 'node_modules', candidate.manifest.name, candidate.manifest.bin['ui-foundation']);
  const cli = (cwd, ...args) => run(process.execPath, [cliPath, ...args], cwd);
  const git = (cwd, ...args) => run('git', args, cwd);
  const output = 'custom/generated';
  const skill = '.agents/skills/project-ui';
  const manifestPath = output + '/manifest.json';
  const attributes = '* text=auto\n' + output + '/** -text\n' + skill + '/** -text\n';

  const seed = resolve(root, 'seed');
  await mkdir(seed);
  cli(seed, 'init');
  const config = parse(await readFile(resolve(seed, 'ui.config.yaml'), 'utf8'));
  config.output = output;
  await writeFile(resolve(seed, 'ui.config.yaml'), stringify(config));
  await mkdir(resolve(seed, 'src'));
  await writeFile(resolve(seed, 'src/app.ts'), 'export const application = true;\n');
  cli(seed, 'sync');
  const originalManifest = await readFile(resolve(seed, manifestPath));
  const recorded = JSON.parse(originalManifest.toString('utf8'));
  assert.ok(recorded.files[skill + '/ownership.json']);
  assert.ok(recorded.files[output + '/CHECKER-NOTICE.txt']);
  git(seed, 'init', '--quiet');
  git(seed, 'config', 'user.name', 'UI Foundation Test');
  git(seed, 'config', 'user.email', 'test@example.invalid');
  git(seed, 'config', 'core.autocrlf', 'true');
  await writeFile(resolve(seed, '.gitattributes'), '* text=auto\n');
  git(seed, 'add', '--force', '--', '.gitattributes', 'ui.config.yaml', 'src', output, skill);
  git(seed, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Normalized fixture');

  const broken = resolve(root, 'broken');
  git(root, 'clone', '--quiet', '--no-local', '--config', 'core.autocrlf=true', seed, broken);
  const ownership = skill + '/ownership.json';
  const normalized = await readFile(resolve(broken, ownership));
  assert.notEqual(digest(normalized), recorded.files[ownership].sha256);
  assert.throws(() => cli(broken, 'sync', '--dry-run'), /manifest|edited/i);
  assert.throws(() => cli(broken, 'sync'), /manifest|edited/i);
  assert.deepEqual(await readFile(resolve(broken, ownership)), normalized, 'conflict must not adopt converted bytes');

  // Reconstruct from the same fixed package and configuration in a separate directory.
  const recovery = resolve(root, 'recovery');
  await mkdir(recovery);
  await writeFile(resolve(recovery, 'ui.config.yaml'), await readFile(resolve(seed, 'ui.config.yaml')));
  await mkdir(resolve(recovery, 'src'));
  await writeFile(resolve(recovery, 'src/app.ts'), 'export const application = true;\n');
  cli(recovery, 'sync');
  const recoveredManifest = await readFile(resolve(recovery, manifestPath));
  const normalizedManifest = await readFile(resolve(broken, manifestPath), 'utf8');
  const normalize = text => text.replace(/\r\n/g, '\n');
  assert.equal(normalize(normalizedManifest), normalize(originalManifest.toString('utf8')),
    'only line-ending conversion of the recorded manifest is recoverable');
  assert.deepEqual(recoveredManifest, originalManifest, 'regenerated manifest must match the original fixed-package record');
  // Validate every file before replacing any. A local edit is not a Git conversion.
  const replacements = [];
  for (const [path, entry] of Object.entries(recorded.files)) {
    assert.ok(path.startsWith(output + '/') || path.startsWith(skill + '/'));
    const bytes = await readFile(resolve(recovery, path));
    assert.equal(digest(bytes), entry.sha256, path);
    const destination = resolve(broken, path);
    const existing = await readFile(destination);
    if (digest(existing) !== entry.sha256) {
      assert.equal(normalize(existing.toString('utf8')), normalize(bytes.toString('utf8')),
        'do not discard a non-line-ending edit: ' + path);
      replacements.push({ destination, bytes });
    }
  }
  assert.ok(replacements.length > 0);
  for (const { destination, bytes } of replacements) await writeFile(destination, bytes);
  await writeFile(resolve(broken, manifestPath), recoveredManifest);
  await writeFile(resolve(broken, '.gitattributes'), attributes);
  git(broken, 'config', 'user.name', 'UI Foundation Test');
  git(broken, 'config', 'user.email', 'test@example.invalid');
  git(broken, 'add', '--', '.gitattributes');
  git(broken, 'add', '--renormalize', '--', output, skill);
  git(broken, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Restore verified managed bytes');
  for (const autocrlf of ['false', 'true']) {
    const checkout = resolve(root, 'checkout-' + autocrlf);
    git(root, 'clone', '--quiet', '--no-local', '--config', 'core.autocrlf=' + autocrlf, broken, checkout);
    assert.deepEqual(await readFile(resolve(checkout, manifestPath)), originalManifest);
    for (const [path, entry] of Object.entries(recorded.files)) {
      assert.equal(digest(await readFile(resolve(checkout, path))), entry.sha256, path);
    }
    const dryRun = cli(checkout, 'sync', '--dry-run');
    assert.match(dryRun, /is current/i);
    assert.equal(JSON.parse(cli(checkout, 'check', '--format', 'json')).valid, true);
    assert.match(cli(checkout, 'sync'), /current/i);
    assert.deepEqual(await readFile(resolve(checkout, manifestPath)), originalManifest);
    for (const [path, entry] of Object.entries(recorded.files)) {
      assert.equal(digest(await readFile(resolve(checkout, path))), entry.sha256, path);
    }
    assert.equal(git(checkout, 'status', '--porcelain').trim(), '');
  }
});
