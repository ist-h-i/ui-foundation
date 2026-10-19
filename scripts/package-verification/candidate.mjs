import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function assertFrozenCandidate(candidate) {
  assert.equal(sha256(await readFile(candidate.tarball)), candidate.sha256, 'frozen candidate bytes changed');
}

// External candidates bypass both build and pack. Every test works from its own
// frozen copy, and the full metadata must match the release source checkout.
export async function prepareCandidate({ repository, root, execute, env = process.env }) {
  const hasTarball = env.UI_FOUNDATION_PACKAGE_TARBALL !== undefined;
  const hasDigest = env.UI_FOUNDATION_PACKAGE_SHA256 !== undefined;
  assert.equal(hasTarball, hasDigest, 'UI_FOUNDATION_PACKAGE_TARBALL and UI_FOUNDATION_PACKAGE_SHA256 must be supplied together');
  let source, expected, origin;
  if (hasTarball) {
    assert.ok(env.UI_FOUNDATION_PACKAGE_TARBALL.trim(), 'external candidate path must not be empty');
    assert.match(env.UI_FOUNDATION_PACKAGE_SHA256, /^[a-f0-9]{64}$/, 'external candidate SHA256 must contain 64 lowercase hexadecimal characters');
    source = resolve(env.UI_FOUNDATION_PACKAGE_TARBALL);
    expected = env.UI_FOUNDATION_PACKAGE_SHA256;
    origin = 'external';
  } else {
    await execute(process.execPath, ['--import', 'tsx', 'scripts/build-package.ts'], repository);
    const [pack] = JSON.parse(await execute('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', root], repository));
    source = resolve(root, pack.filename);
    expected = sha256(await readFile(source));
    origin = 'source-build';
  }
  assert.equal(sha256(await readFile(source)), expected, 'candidate digest mismatch before copy');
  const tarball = resolve(root, 'frozen-candidate.tgz');
  await copyFile(source, tarball);
  assert.equal(sha256(await readFile(source)), expected, 'candidate digest changed during copy');
  const candidate = { tarball, sha256: expected, origin };
  await assertFrozenCandidate(candidate);
  await chmod(tarball, 0o444);
  const names = (await execute('tar', ['-tzf', tarball], root)).trim().split('\n');
  for (const name of names) {
    assert.ok(name.startsWith('package/') && !name.split('/').includes('..'), `unexpected archive entry: ${name}`);
  }
  assert.equal(names.filter(name => name === 'package/package.json').length, 1, 'candidate must contain exactly one package.json');
  const manifest = JSON.parse(await execute('tar', ['-xOf', tarball, 'package/package.json'], root));
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'candidate package.json must be an object');
  const sourceManifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
  assert.deepEqual(manifest, sourceManifest, 'candidate package.json must match all source package metadata');
  await assertFrozenCandidate(candidate);
  return { ...candidate, manifest, paths: names.filter(name => !name.endsWith('/')).map(name => name.slice('package/'.length)), size: (await readFile(tarball)).length };
}
