import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { registryState, assertStage, verifyInstallMetadata } from '../../scripts/package-verification/registry.mjs';
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
  assertStage(state({ latest: target }, { [target]: next }), { stage: 'latest' });
  assert.throws(() => state({ latest: target }, {}), /missing version/);
  assert.throws(() => assertStage(state({ latest: previousLatest }, { [previousLatest]: old, [target]: next }), { stage: 'candidate-published', previousLatest, candidateTag }), /Candidate tag/);
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
    await writeFile(resolve(root, `docs/npm-beta-readiness.${suffix}.md`), `# Contract\n\n${name}@${target}\n`);
    await writeFile(resolve(root, `docs/npm-beta-release-notes.${suffix}.md`), `# Notes\n\n## ${target}\n\n## ${previousLatest}\n`);
  }
  await verifyReleaseVersionDocumentation(root);
  await writeFile(resolve(root, 'README.ja.md'), `npm install --save-dev --save-exact ${name}@${previousLatest}\n`);
  await assert.rejects(verifyReleaseVersionDocumentation(root), /Current installation example/);
});
