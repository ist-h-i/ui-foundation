import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { registryState, readRegistryPackage, assertRegistryUnchanged, assertStage, candidateInput, verifyInstallMetadata, verifyGeneratedOwnership, verifyInstalledApiCatalog } from '../../scripts/package-verification/registry.mjs';
import { verifyReleaseVersionDocumentation } from '../../scripts/package-verification/documentation.mjs';

const target = '0.2.0';
const previousLatest = '0.1.0';
const candidateTag = 'release-candidate';
const old = { dist: { integrity: 'sha512-old' } };
const next = { dist: { integrity: 'sha512-next' } };
const fixture = (tags, versions) => ({ 'dist-tags': tags, versions });
const state = (tags, versions) => registryState(fixture(tags, versions), target);
const manifestHeader = { version: 1, tool_version: target, configuration_hash: 'c'.repeat(64) };
const ownershipRecord = JSON.stringify({ schema_version: 1, output: '.ui/generated', manifest_path: '.ui/generated/manifest.json' });

test('registry lookup distinguishes a missing package from an unavailable registry and an unpublished target', async () => {
  const name = '@scope/package';
  const missing = await readRegistryPackage(name, async () => new Response(null, { status: 404 }));
  assert.equal(missing.registryStatus, 'not-found');
  assert.equal(registryState(missing.document, target, missing.registryStatus).targetState, 'unpublished');
  const received = await readRegistryPackage(name, async url => {
    assert.equal(url, 'https://registry.npmjs.org/%40scope%2Fpackage');
    return Response.json({ name, ...fixture({ latest: previousLatest }, { [previousLatest]: old }) });
  });
  assert.equal(received.registryStatus, 'found');
  assert.equal(registryState(received.document, target, received.registryStatus).targetState, 'unpublished');
  await assert.rejects(readRegistryPackage(name, async () => new Response(null, { status: 503 })),
    { code: 'REGISTRY_UNAVAILABLE' });
  await assert.rejects(readRegistryPackage(name, async () => { throw Error('fetch failed'); }),
    { code: 'REGISTRY_UNAVAILABLE' });
  await assert.rejects(readRegistryPackage(name, async () => Response.json({ name, versions: [], 'dist-tags': [] })),
    /Malformed registry response/);
});

test('registry checks distinguish unpublished, candidate and latest', () => {
  const unpublished = state({ latest: previousLatest }, { [previousLatest]: old });
  assert.equal(unpublished.targetState, 'unpublished');
  assertStage(unpublished, { stage: 'before-publish', previousLatest, candidateTag });
  const candidate = state({ latest: previousLatest, [candidateTag]: target }, { [previousLatest]: old, [target]: next });
  assert.equal(candidate.targetState, 'published');
  assertStage(candidate, { stage: 'candidate-published', previousLatest, candidateTag });
  assert.throws(() => assertStage(candidate, { stage: 'latest' }), /latest must point/);
  assert.throws(() => assertStage(candidate, { stage: 'before-publish', previousLatest, candidateTag }), /already published/);
  const alreadyLatest = state({ latest: target, [candidateTag]: target }, { [target]: next });
  assertStage(alreadyLatest, { stage: 'latest' });
  assert.throws(() => assertStage(alreadyLatest, { stage: 'candidate-published', previousLatest: target, candidateTag }), /Previous latest must differ/);
  assert.throws(() => assertStage(unpublished, { stage: 'before-publish', previousLatest, candidateTag: 'latest' }), /separate candidate tag/);
  assert.throws(() => assertStage(unpublished, { stage: 'before-publish', previousLatest: '', candidateTag }), /previous-latest/);
  assert.throws(() => state({ latest: target }, {}), /missing version/);
  assert.throws(() => state({ latest: previousLatest }, { [previousLatest]: old, [target]: null }), /Malformed registry version record/);
  const noLatest = state({ [candidateTag]: target }, { [target]: next });
  assertStage(noLatest, { stage: 'candidate-published', previousLatest: 'none', candidateTag });
  assert.throws(() => assertStage(noLatest, { stage: 'candidate-published', previousLatest: 'none', candidateTag, normalVersion: target }),
    /normal install already resolves to the candidate/);
  assert.throws(() => assertStage(state({ latest: previousLatest }, { [previousLatest]: old, [target]: next }), { stage: 'candidate-published', previousLatest, candidateTag }), /Candidate tag/);
});

test('release gates require the independently recorded candidate digest', () => {
  const candidate = '/candidate.tgz';
  const digest = 'a'.repeat(64);
  assert.equal(candidateInput({ stage: 'observe' }), null);
  assert.throws(() => candidateInput({ stage: 'before-publish' }), /Frozen/);
  assert.throws(() => candidateInput({ stage: 'observe', candidate }), /supplied together/);
  assert.throws(() => candidateInput({ stage: 'observe', 'candidate-sha256': digest }), /supplied together/);
  assert.throws(() => candidateInput({ stage: 'latest', candidate, 'candidate-sha256': 'invalid' }), /SHA256/);
  assert.deepEqual(candidateInput({ stage: 'latest', candidate, 'candidate-sha256': digest }), { UI_FOUNDATION_PACKAGE_TARBALL: candidate, UI_FOUNDATION_PACKAGE_SHA256: digest });
});

test('install evidence must match both expected version and registry integrity', () => {
  const dist = { integrity: next.dist.integrity, tarball: 'https://registry.npmjs.org/@scope/package/-/package-0.2.0.tgz' };
  const locked = { version: target, integrity: dist.integrity, resolved: dist.tarball };
  verifyInstallMetadata({ version: target }, locked, target, dist);
  assert.throws(() => verifyInstallMetadata({ version: previousLatest }, locked, target, dist), /Installed version mismatch/);
  assert.throws(() => verifyInstallMetadata({ version: target }, { ...locked, integrity: old.dist.integrity }, target, dist), /integrity mismatch/);
  assert.throws(() => verifyInstallMetadata({ version: target }, { ...locked, resolved: 'file:package.tgz' }, target, dist), /source mismatch/);
  assert.throws(() => verifyInstallMetadata({ version: target }, locked, target, { ...dist, tarball: 'https://example.invalid/package.tgz' }), /official registry/);
});

test('document check rejects stale current pins but preserves migration history', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-doc-versions-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const name = '@hiroshi.inoue/ui-foundation';
  await mkdir(resolve(root, 'docs'));
  await writeFile(resolve(root, 'package.json'), JSON.stringify({ name, version: target }));
  for (const path of ['README.md', 'README.ja.md', 'docs/ui-library-consumer-guide.en.md', 'docs/ui-library-consumer-guide.ja.md']) {
    await writeFile(resolve(root, path), `npm install --save-dev --save-exact ${name}@${target}\n\nHistorical: ${name}@${previousLatest}\n`);
  }
  for (const suffix of ['en', 'ja']) {
    await writeFile(resolve(root, `docs/npm-beta-readiness.${suffix}.md`), `# Contract\n\n\`${name}@${target}\`\n`);
    await writeFile(resolve(root, `docs/npm-beta-release-notes.${suffix}.md`), `# Notes\n\n\`${name}@${target}\`\n\n## ${target}\n\n## ${previousLatest}\n`);
  }
  await verifyReleaseVersionDocumentation(root);
  const contract = resolve(root, 'docs/npm-beta-readiness.en.md');
  await writeFile(contract, `# Contract\n\n\`${name}@${target}-beta.1\`\n`);
  await assert.rejects(verifyReleaseVersionDocumentation(root), /Current contract/);
  await writeFile(contract, `# Contract\n\n\`${name}@${target}\`\n`);
  const notes = resolve(root, 'docs/npm-beta-release-notes.en.md');
  await writeFile(notes, `# Notes\n\n\`${name}@${previousLatest}\`\n\n## ${target}\n`);
  await assert.rejects(verifyReleaseVersionDocumentation(root), /Release note introduction/);
  await writeFile(notes, `# Notes\n\n\`${name}@${target}\`\n\n## ${target}\n`);
  await writeFile(resolve(root, 'README.ja.md'), `npm install --save-dev --save-exact ${name}@${previousLatest}\n`);
  await assert.rejects(verifyReleaseVersionDocumentation(root), /Current installation example/);
  await writeFile(resolve(root, 'README.ja.md'), `npm install --save-dev --save-exact ${name}@${target}\n`);
  await rm(resolve(root, 'docs/ui-library-consumer-guide.ja.md'));
  await assert.rejects(verifyReleaseVersionDocumentation(root), { code: 'ENOENT' });
});


test('registry generation evidence verifies actual owned bytes and rejects traversal', async t => {
  const app = await mkdtemp(resolve(tmpdir(), 'ui-foundation-registry-generation-'));
  t.after(() => rm(app, { recursive: true, force: true }));
  await mkdir(resolve(app, '.ui/generated'), { recursive: true });
  await mkdir(resolve(app, '.agents/skills/project-ui'), { recursive: true });
  const files = {};
  for (const path of ['.agents/skills/project-ui/SKILL.md', '.agents/skills/project-ui/ownership.json']) {
    const text = path.endsWith('/ownership.json') ? ownershipRecord : path + '\n';
    await writeFile(resolve(app, path), text);
    files[path] = { sha256: createHash('sha256').update(text).digest('hex') };
  }
  const manifest = resolve(app, '.ui/generated/manifest.json');
  await writeFile(manifest, JSON.stringify({ ...manifestHeader, files }));
  assert.equal((await verifyGeneratedOwnership(app)).managedFiles, 2);
  await writeFile(resolve(app, '.agents/skills/project-ui/SKILL.md'), 'manual edit');
  await assert.rejects(verifyGeneratedOwnership(app), /ownership mismatch/);
  const path = '.agents/skills/project-ui/SKILL.md';
  await writeFile(resolve(app, path), path + '\n');
  files['.ui/generated/../unexpected'] = { sha256: 'a'.repeat(64) };
  await writeFile(manifest, JSON.stringify({ ...manifestHeader, files }));
  await assert.rejects(verifyGeneratedOwnership(app), /Unexpected generated ownership path/);
});


test('generation evidence rejects symlinks and invalid ownership records', async t => {
  const app = await mkdtemp(resolve(tmpdir(), 'ui-foundation-registry-ownership-'));
  t.after(() => rm(app, { recursive: true, force: true }));
  const skillRoot = '.agents/skills/project-ui';
  await mkdir(resolve(app, '.ui/generated'), { recursive: true });
  await mkdir(resolve(app, skillRoot), { recursive: true });
  const text = 'same bytes\n';
  const target = resolve(app, 'outside.txt');
  await writeFile(target, text);
  const skill = skillRoot + '/SKILL.md';
  const ownership = skillRoot + '/ownership.json';
  const digest = createHash('sha256').update(text).digest('hex');
  await writeFile(resolve(app, ownership), ownershipRecord);
  await writeFile(resolve(app, skill), text);
  const path = resolve(app, '.ui/generated/manifest.json');
  const files = { [skill]: null, [ownership]: { sha256: createHash('sha256').update(ownershipRecord).digest('hex') } };
  await writeFile(path, JSON.stringify({ ...manifestHeader, files }));
  await assert.rejects(verifyGeneratedOwnership(app), /Invalid ownership digest/);
  files[skill] = { sha256: digest };
  await writeFile(path, JSON.stringify({ ...manifestHeader, files }));
  await verifyGeneratedOwnership(app);
  const untracked = resolve(app, skillRoot, 'manual.md');
  await writeFile(untracked, text);
  await assert.rejects(verifyGeneratedOwnership(app), /does not cover all files/);
  await rm(untracked);
  const invalidRegistry = '{}';
  await writeFile(resolve(app, ownership), invalidRegistry);
  const validDigest = files[ownership].sha256;
  files[ownership].sha256 = createHash('sha256').update(invalidRegistry).digest('hex');
  await writeFile(path, JSON.stringify({ ...manifestHeader, files }));
  await assert.rejects(verifyGeneratedOwnership(app), /Invalid ownership registry/);
  await writeFile(resolve(app, ownership), ownershipRecord);
  files[ownership].sha256 = validDigest;
  await writeFile(path, JSON.stringify({ ...manifestHeader, files }));
  if (process.platform !== 'win32') {
    await rm(resolve(app, skill));
    await symlink(target, resolve(app, skill));
    await assert.rejects(verifyGeneratedOwnership(app), /Unsafe generated ownership path/);
  }
});


test('registry recheck detects changes beyond the candidate tag', () => {
  const tags = { latest: previousLatest, [candidateTag]: target };
  const before = state(tags, { [previousLatest]: old, [target]: next });
  assert.doesNotThrow(() => assertRegistryUnchanged(before, state({ [candidateTag]: target, latest: previousLatest }, { [target]: next, [previousLatest]: old })));
  assert.throws(() => assertRegistryUnchanged(before, state(tags, { [previousLatest]: old, [target]: next, '0.3.0': next })), /versions changed/);
  assert.throws(() => assertRegistryUnchanged(before, state(tags, { [previousLatest]: next, [target]: next })), /Latest integrity changed/);
  assert.throws(() => assertRegistryUnchanged(before, state(tags, { [previousLatest]: old, [target]: old })), /Target integrity changed/);
  assert.throws(() => assertRegistryUnchanged(before, { ...before, registryStatus: 'not-found' }), /package status changed/);
  assert.throws(() => assertRegistryUnchanged(before, { ...before, publishedAt: '2026-11-28T00:00:00Z' }), /publication time changed/);
  assert.throws(() => assertRegistryUnchanged(before, state({ latest: target }, { [previousLatest]: old, [target]: next })), /tags changed/);
});

test('installed API inventory detects missing, stale and mismatched generated templates', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-registry-api-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const installed = resolve(root, 'package');
  const app = resolve(root, 'app');
  const source = 'templates/angular';
  const installedCatalog = resolve(installed, 'docs/ui-library-api.json');
  const generatedCatalog = resolve(app, '.agents/skills/project-ui/references/docs/ui-library-api.json');
  const generatedFile = resolve(app, '.ui/generated/angular/index.ts');
  for (const path of [resolve(installed, source), resolve(installedCatalog, '..'), resolve(generatedCatalog, '..'), resolve(generatedFile, '..')]) {
    await mkdir(path, { recursive: true });
  }
  const bytes = 'export const example = true;\n';
  const entry = { path: source + '/index.ts', sha256: createHash('sha256').update(bytes).digest('hex') };
  const catalog = files => JSON.stringify({ schema_version: 1, source, source_count: files.length, files });
  await writeFile(resolve(installed, entry.path), bytes);
  await writeFile(generatedFile, bytes);
  await writeFile(installedCatalog, catalog([]));
  await assert.rejects(verifyInstalledApiCatalog(installed, app), /does not cover all/);
  await writeFile(installedCatalog, catalog([{ ...entry, sha256: '0'.repeat(64) }]));
  await assert.rejects(verifyInstalledApiCatalog(installed, app), /API catalog digest mismatch/);
  await writeFile(installedCatalog, catalog([entry]));
  await writeFile(generatedCatalog, catalog([entry]));
  assert.equal((await verifyInstalledApiCatalog(installed, app)).files, 1);
  await writeFile(generatedFile, 'export const example = false;\n');
  await assert.rejects(verifyInstalledApiCatalog(installed, app), /Generated API differs from installed template/);
});
