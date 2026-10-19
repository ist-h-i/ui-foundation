import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyAudit, noticeContainsOriginal, inventoryMatchesNotice, resolveLockedDependency, dependencyClosure, classifyMissingDependencies, originalNoticeFiles, canExcludeNativeNotice, nativeExclusionProof, sha256 } from '../../scripts/audit-package.mjs';

const response = ({ high = 0, critical = 0, dev = 30 } = {}) => ({ status: high || critical ? 1 : 0, stdout: JSON.stringify({ auditReportVersion: 2, vulnerabilities: high || critical ? { vulnerable: {} } : {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high, critical, total: high + critical }, dependencies: { dev } } }) });

test('failed registry response, malformed JSON and omit-dev scans stay Unknown', () => {
  for (const result of [{ status: 1, stdout: '{"error":{"code":"EAI_AGAIN"}}' }, { status: 0, stdout: 'invalid' }, { ...response(), status: null, error: new Error('timeout') }, response({ dev: 0 })]) assert.equal(classifyAudit(result).status, 'Unknown');
  assert.equal(classifyAudit(response()).status, 'Verified');
});

test('applicable high-severity advisory is actionable even when npm exits 1', () => {
  const audit = classifyAudit(response({ high: 1 }));
  assert.equal(audit.status, 'ActionRequired');
  assert.equal(audit.high, 1);
});

test('original notice byte checks reject changed line endings and absent version headers', () => {
  const original = Buffer.from('Copyright\r\nlicense terms\r\n');
  assert.equal(noticeContainsOriginal(Buffer.concat([Buffer.from('dependency@1.2.3\n'), original]), 'dependency', '1.2.3', original), true);
  assert.equal(noticeContainsOriginal(Buffer.from('dependency@1.2.3\nCopyright\nlicense terms\n'), 'dependency', '1.2.3', original), false);
  assert.equal(noticeContainsOriginal(original, 'dependency', '1.2.3', original), false);
  assert.equal(noticeContainsOriginal(Buffer.concat([Buffer.from('dependency@1.2.30\n'), original]), 'dependency', '1.2.3', original), false);
});

test('bundled inventory rejects missing, duplicate and different-version notice dependencies', () => {
  const dependencies = [{ name: 'a', version: '1.0.0' }, { name: 'b', version: '2.0.0' }];
  assert.equal(inventoryMatchesNotice(dependencies, [...dependencies].reverse()), true);
  assert.equal(inventoryMatchesNotice(dependencies, dependencies.slice(0, 1)), false);
  assert.equal(inventoryMatchesNotice(dependencies, [...dependencies, dependencies[0]]), false);
  assert.equal(inventoryMatchesNotice(dependencies, [{ name: 'a', version: '2.0.0' }, dependencies[1]]), false);
});

test('closure resolves nested fixed versions and required peers without assuming hoisting', () => {
  const packages = { '': {}, 'node_modules/a': { dependencies: { b: '*' }, peerDependencies: { c: '*', optional: '*' }, peerDependenciesMeta: { optional: { optional: true } } }, 'node_modules/a/node_modules/b': {}, 'node_modules/b': {}, 'node_modules/c': {} };
  assert.equal(resolveLockedDependency(packages, 'node_modules/a', 'b'), 'node_modules/a/node_modules/b');
  assert.deepEqual(dependencyClosure(packages, ['a']), { paths: ['node_modules/a', 'node_modules/a/node_modules/b', 'node_modules/c'], requiredPaths: ['node_modules/a', 'node_modules/a/node_modules/b', 'node_modules/c'], missing: [] });
  assert.equal(dependencyClosure(packages, ['missing']).missing.length, 1);
});

test('MIT-prefixed license and exact-version README original bytes are recognized without metadata substitution', async t => {
  const root = await mkdtemp(join(tmpdir(), 'package-notice-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'MIT-LICENSE.txt'), 'original license');
  assert.equal((await originalNoticeFiles(root, 'jsbarcode', '3.12.3'))[0].path, 'MIT-LICENSE.txt');
  await rm(join(root, 'MIT-LICENSE.txt'));
  await writeFile(join(root, 'README.md'), await readFile(new URL('../../node_modules/murmurhash-js/README.md', import.meta.url)));
  assert.equal((await originalNoticeFiles(root, 'murmurhash-js', '1.0.0'))[0].path, 'README.md');
  assert.deepEqual(await originalNoticeFiles(root, 'murmurhash-js', '1.0.1'), []);
  await writeFile(join(root, 'README.md'), 'license metadata says MIT');
  await assert.rejects(originalNoticeFiles(root, 'murmurhash-js', '1.0.0'), /Unrecognized original/);
});

test('only incompatible uninstalled optional paths are inactive; explicit/required paths and bundled declarations remain blocking', () => {
  const optional = 'node_modules/wasm';
  const packages = { '': {}, 'node_modules/root': { optionalDependencies: { wasm: '*' } }, [optional]: { optional: true, cpu: ['wasm32'], dependencies: { missing: '*' }, bundleDependencies: ['missing'] } };
  const closure = dependencyClosure(packages, ['root']);
  let disposition = classifyMissingDependencies(packages, closure, new Set(), 'darwin', 'arm64');
  assert.equal(disposition.inactiveOptional.length, 1);
  assert.equal(disposition.inactiveOptional[0].status, 'Unknown');
  assert.equal(disposition.actionable.length, 0);
  assert.equal(classifyMissingDependencies(packages, closure, new Set([optional]), 'darwin', 'arm64').actionable.length, 1);
  assert.equal(classifyMissingDependencies(packages, closure, new Set(), 'wasi', 'wasm32').actionable.length, 1);
  assert.equal(classifyMissingDependencies(packages, dependencyClosure(packages, ['wasm']), new Set(), 'darwin', 'arm64').actionable.length, 1);
  packages['node_modules/required'] = { dependencies: { wasm: '*' } };
  disposition = classifyMissingDependencies(packages, dependencyClosure(packages, ['root', 'required']), new Set(), 'darwin', 'arm64');
  assert.equal(disposition.actionable.length, 1);
});

test('native Unknown can be excluded only for the exact platform/version with every shipping proof', () => {
  const proof = { name: '@napi-rs/canvas-darwin-arm64', version: '1.0.10', platform: 'darwin', arch: 'arm64', reportPassed: true, tarballMatches: true, metafileHashMatches: true, inputPathsHashMatches: true, outputBindingsVerified: true, noCanvasInputs: true, noNativeInputs: true, noNativeFiles: true, noNativeBinaryCopies: true };
  assert.equal(canExcludeNativeNotice(proof), true);
  for (const key of Object.keys(proof)) assert.equal(canExcludeNativeNotice({ ...proof, [key]: undefined }), false, key);
  assert.equal(canExcludeNativeNotice({ ...proof, version: '1.0.11' }), false);
  assert.equal(canExcludeNativeNotice({ ...proof, noCanvasInputs: false }), false);
});

test('native exclusion checks saved metafile, emitted output bytes and actual native binary copies', async t => {
  const root = await mkdtemp(join(tmpdir(), 'package-native-proof-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source'), packageRoot = join(root, 'package'), delivery = join(root, 'consumer/dist'), tarball = join(root, 'candidate.tgz');
  await mkdir(join(source, 'node_modules/@napi-rs/canvas-darwin-arm64'), { recursive: true });
  await mkdir(packageRoot); await mkdir(delivery, { recursive: true });
  const native = Buffer.from([0, 1, 3, 7]);
  await writeFile(join(source, 'node_modules/@napi-rs/canvas-darwin-arm64/skia.darwin-arm64.node'), native);
  const emitted = 'console.log(1);';
  await writeFile(join(delivery, 'main.js'), emitted);
  await writeFile(tarball, 'candidate tarball fixture');
  const meta = { inputs: { 'node_modules/pdfjs-dist/build/pdf.mjs': { bytes: 20 } }, outputs: { 'public/main.js': { bytes: Buffer.byteLength(emitted) } } };
  const metaBytes = JSON.stringify(meta);
  await writeFile(join(root, 'consumer/bundle-metafile.json'), metaBytes);
  const report = { status: 'passed', candidate_sha256: sha256(await readFile(tarball)), smoke: { bundle: { metafile: 'consumer/bundle-metafile.json', delivery_root: 'consumer/dist', metafile_sha256: sha256(metaBytes), input_paths_sha256: sha256(JSON.stringify(Object.keys(meta.inputs).sort())), input_count: 1, outputs: [{ path: 'public/main.js', delivery_path: 'main.js', bytes: Buffer.byteLength(emitted), sha256: sha256(emitted) }] } } };
  await writeFile(join(root, 'report.json'), JSON.stringify(report));
  assert.equal((await nativeExclusionProof(source, packageRoot, delivery, tarball)).outputBindingsVerified, true);
  await writeFile(join(delivery, 'main.js'), 'console.log(2);');
  assert.equal((await nativeExclusionProof(source, packageRoot, delivery, tarball)).outputBindingsVerified, false);
  await writeFile(join(delivery, 'main.js'), emitted);
  await writeFile(join(delivery, 'renamed-native.dat'), native);
  assert.equal((await nativeExclusionProof(source, packageRoot, delivery, tarball)).noNativeBinaryCopies, false);
  await rm(join(delivery, 'renamed-native.dat'));
  await writeFile(join(delivery, 'addon.node'), 'different binary');
  assert.equal((await nativeExclusionProof(source, packageRoot, delivery, tarball)).noNativeFiles, false);
  await rm(join(root, 'consumer/bundle-metafile.json'));
  assert.equal((await nativeExclusionProof(source, packageRoot, delivery, tarball)).verified, false);
});
