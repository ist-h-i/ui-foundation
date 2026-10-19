import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { assertFrozenCandidate, prepareCandidate } from '../../scripts/package-verification/candidate.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = { name: '@example/release', version: '0.1.0-beta.1', private: false, license: 'MIT', bin: { release: 'dist/cli.js' } };

async function fixture(t, candidateManifest = JSON.stringify(manifest)) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-candidate-unit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = resolve(root, 'repo'), archive = resolve(root, 'archive'), target = resolve(root, 'test');
  for (const directory of [repository, resolve(archive, 'package'), target]) await mkdir(directory, { recursive: true });
  await writeFile(resolve(repository, 'package.json'), JSON.stringify(manifest));
  await writeFile(resolve(archive, 'package/package.json'), candidateManifest);
  const source = resolve(root, 'release.tgz');
  execFileSync('tar', ['-czf', source, '-C', archive, 'package']);
  const digest = hash(await readFile(source));
  const calls = [];
  const execute = (file, args, cwd) => { calls.push([file, args]); return execFileSync(file, args, { cwd, encoding: 'utf8' }); };
  return { repository, root: target, source, digest, calls, execute, env: { UI_FOUNDATION_PACKAGE_TARBALL: source, UI_FOUNDATION_PACKAGE_SHA256: digest } };
}

test('external candidate is a separate hash-bound copy with full metadata and no build/pack', async t => {
  const f = await fixture(t);
  const result = await prepareCandidate(f);
  assert.equal(result.origin, 'external');
  assert.equal(result.sha256, f.digest);
  assert.notEqual(result.tarball, f.source);
  assert.deepEqual(result.manifest, manifest);
  assert.deepEqual(result.paths, ['package.json']);
  assert.deepEqual(await readFile(result.tarball), await readFile(f.source));
  assert.ok(f.calls.every(([file]) => file === 'tar'), 'external candidates must not invoke a build or npm pack');
  await writeFile(f.source, 'external source changed after freezing');
  await assertFrozenCandidate(result);
  await chmod(result.tarball, 0o644);
  await writeFile(result.tarball, 'frozen candidate tampered');
  await assert.rejects(assertFrozenCandidate(result), /frozen candidate bytes changed/);
});

test('external path and digest must be supplied together before any command', async t => {
  const f = await fixture(t);
  for (const env of [{ UI_FOUNDATION_PACKAGE_TARBALL: f.source }, { UI_FOUNDATION_PACKAGE_SHA256: f.digest }]) {
    await assert.rejects(prepareCandidate({ ...f, env }), /must be supplied together/);
  }
  assert.deepEqual(f.calls, []);
});

test('invalid or mismatching external digest fails before any command', async t => {
  const f = await fixture(t);
  await assert.rejects(prepareCandidate({ ...f, env: { ...f.env, UI_FOUNDATION_PACKAGE_SHA256: 'invalid' } }), /64 lowercase/);
  await assert.rejects(prepareCandidate({ ...f, env: { ...f.env, UI_FOUNDATION_PACKAGE_SHA256: '0'.repeat(64) } }), /digest mismatch before copy/);
  assert.deepEqual(f.calls, []);
});

test('malformed candidate package metadata is rejected', async t => {
  const f = await fixture(t, '{"name":');
  await assert.rejects(prepareCandidate(f), SyntaxError);
});

test('non-object candidate package metadata is rejected', async t => {
  const f = await fixture(t, '[]');
  await assert.rejects(prepareCandidate(f), /must be an object/);
});

test('metadata fields beyond release identity must match the source manifest', async t => {
  const f = await fixture(t, JSON.stringify({ ...manifest, bin: { release: 'dist/different.js' } }));
  await assert.rejects(prepareCandidate(f), /must match all source package metadata/);
});
