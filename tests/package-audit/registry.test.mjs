import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { registryState, assertRegistryUnchanged, assertStage, candidateInput, verifyInstallMetadata, verifyGeneratedOwnership } from '../../scripts/package-verification/registry.mjs';
import { verifyReleaseVersionDocumentation } from '../../scripts/package-verification/documentation.mjs';

const target = '0.2.0';
const previousLatest = '0.1.0';
const candidateTag = 'release-candidate';
const old = { dist: { integrity: 'sha512-old' } };
const next = { dist: { integrity: 'sha512-next' } };
const fixture = (tags, versions) => ({ 'dist-tags': tags, versions });
const state = (tags, versions) => registryState(fixture(tags, versions), target);

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
  verifyInstallMetadata({ version: target }, { version: target, integrity: next.dist.integrity }, target, next.dist.integrity);
  assert.throws(() => verifyInstallMetadata({ version: previousLatest }, { version: previousLatest, integrity: old.dist.integrity }, target, next.dist.integrity), /Installed version mismatch/);
  assert.throws(() => verifyInstallMetadata({ version: target }, { version: target, integrity: old.dist.integrity }, target, next.dist.integrity), /integrity mismatch/);
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
});


test('registry generation evidence verifies actual owned bytes and rejects traversal', async t => {
  const app = await mkdtemp(resolve(tmpdir(), 'ui-foundation-registry-generation-'));
  t.after(() => rm(app, { recursive: true, force: true }));
  await mkdir(resolve(app, '.ui/generated'), { recursive: true });
  await mkdir(resolve(app, '.agents/skills/project-ui'), { recursive: true });
  const files = {};
  for (const path of ['.agents/skills/project-ui/SKILL.md', '.agents/skills/project-ui/ownership.json']) {
    const text = path + '\n';
    await writeFile(resolve(app, path), text);
    files[path] = { sha256: createHash('sha256').update(text).digest('hex') };
  }
  const manifest = resolve(app, '.ui/generated/manifest.json');
  await writeFile(manifest, JSON.stringify({ files }));
  assert.equal((await verifyGeneratedOwnership(app)).managedFiles, 2);
  await writeFile(resolve(app, '.agents/skills/project-ui/SKILL.md'), 'manual edit');
  await assert.rejects(verifyGeneratedOwnership(app), /ownership mismatch/);
  const path = '.agents/skills/project-ui/SKILL.md';
  await writeFile(resolve(app, path), path + '\n');
  files['.ui/generated/../unexpected'] = { sha256: 'a'.repeat(64) };
  await writeFile(manifest, JSON.stringify({ files }));
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
  await writeFile(resolve(app, ownership), text);
  await writeFile(resolve(app, skill), text);
  const path = resolve(app, '.ui/generated/manifest.json');
  const files = { [skill]: null, [ownership]: { sha256: digest } };
  await writeFile(path, JSON.stringify({ files }));
  await assert.rejects(verifyGeneratedOwnership(app), /Invalid ownership digest/);
  files[skill] = { sha256: digest };
  await writeFile(path, JSON.stringify({ files }));
  await verifyGeneratedOwnership(app);
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
  assert.throws(() => assertRegistryUnchanged(before, { ...before, publishedAt: '2026-11-28T00:00:00Z' }), /publication time changed/);
  assert.throws(() => assertRegistryUnchanged(before, state({ latest: target }, { [previousLatest]: old, [target]: next })), /tags changed/);
});
