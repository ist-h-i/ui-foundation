import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { verifyReleaseVersionDocumentation } from './documentation.mjs';

const registry = 'https://registry.npmjs.org/';
const repository = fileURLToPath(new URL('../../', import.meta.url));
const hash = (algorithm, bytes, encoding) => createHash(algorithm).update(bytes).digest(encoding);
const canonicalTags = tags => Object.fromEntries(Object.entries(tags).sort(([a], [b]) => a.localeCompare(b, 'en')));

export function registryState(document, target) {
  const tags = canonicalTags(document['dist-tags'] ?? {});
  const versions = document.versions ?? {};
  for (const [tag, version] of Object.entries(tags)) assert.ok(Object.hasOwn(versions, version), `Tag ${tag} points to a missing version`);
  const metadata = Object.hasOwn(versions, target) ? versions[target] : null;
  return { tags, versions: Object.keys(versions), target,
    targetState: !metadata ? 'unpublished' : tags.latest === target ? 'latest' : 'published',
    targetTags: Object.keys(tags).filter(tag => tags[tag] === target),
    targetIntegrity: metadata?.dist?.integrity ?? null,
    publishedAt: document.time?.[target] ?? null, latest: tags.latest ?? null };
}

export function assertStage(state, { stage, previousLatest, candidateTag }) {
  if (stage === 'observe') return;
  assert.ok(['before-publish', 'candidate-published', 'latest'].includes(stage), 'Unsupported stage');
  if (stage === 'latest') {
    assert.equal(state.latest, state.target, 'latest must point to target');
    return;
  }
  assert.ok(previousLatest !== undefined, 'Explicit --previous-latest is required');
  assert.equal(state.latest, previousLatest === 'none' ? null : previousLatest, 'latest changed unexpectedly');
  if (stage === 'before-publish') assert.equal(state.targetState, 'unpublished', 'Target is already published');
  else {
    assert.notEqual(state.targetState, 'unpublished', 'Target is not published');
    assert.equal(state.tags[candidateTag], state.target, 'Candidate tag must point to target');
  }
}

export function verifyInstallMetadata(installed, locked, version, integrity) {
  assert.ok(integrity, 'Missing registry integrity');
  assert.equal(installed.version, version, 'Installed version mismatch');
  assert.equal(locked?.version, version, 'Lockfile version mismatch');
  assert.equal(locked?.integrity, integrity, 'Lockfile integrity mismatch');
}

async function packument(name) {
  let response;
  try { response = await fetch(registry + encodeURIComponent(name), { cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { accept: 'application/json' } }); }
  catch (cause) { throw Object.assign(new Error('Official registry could not be reached', { cause }), { code: 'REGISTRY_UNAVAILABLE' }); }
  if (response.status === 404) return { name, versions: {}, 'dist-tags': {} };
  if (!response.ok) throw Object.assign(new Error(`Registry HTTP ${response.status}`), { code: 'REGISTRY_UNAVAILABLE' });
  const document = await response.json();
  assert.equal(document.name, name, 'Registry package identity mismatch');
  assert.ok(document.versions && document['dist-tags'], 'Malformed registry response');
  return document;
}

async function probe(root, name, specification, label, expectedVersion, document, target) {
  const app = resolve(root, label, 'app');
  await mkdir(app, { recursive: true });
  await writeFile(resolve(app, 'package.json'), '{"private":true,"type":"module"}\n');
  // Isolated install and cache, no lifecycle scripts or audit traffic.
  execFileSync('npm', ['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online',
    '--registry=' + registry, '--cache', resolve(root, label, 'cache'), '--fetch-retries=0', specification],
    { cwd: app, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  const installedRoot = resolve(app, 'node_modules', name);
  const metadata = JSON.parse(await readFile(resolve(installedRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(resolve(app, 'package-lock.json'), 'utf8'));
  assert.equal(metadata.name, name);
  verifyInstallMetadata(metadata, lock.packages[`node_modules/${name}`], expectedVersion, document.versions[expectedVersion].dist.integrity);
  const docs = ['README.md', 'README.ja.md', ...(metadata.files ?? []).filter(path => path.startsWith('docs/') && path.endsWith('.md')), 'skills/ui-development/SKILL.md'];
  const documentation = Object.fromEntries(await Promise.all(docs.map(async path => [path, hash('sha256', await readFile(resolve(installedRoot, path)), 'hex')])));
  // Older latest versions have their own contract. Do not impose current docs on them.
  if (expectedVersion === target) await verifyReleaseVersionDocumentation(installedRoot);
  return { specification, version: metadata.version, integrity: lock.packages[`node_modules/${name}`].integrity, documentation };
}

async function main() {
  const report = { observedAt: new Date().toISOString(), registry, status: 'failed' };
  let root;
  try {
    const { values } = parseArgs({ options: {
      stage: { type: 'string', default: 'observe' }, 'previous-latest': { type: 'string' }, candidate: { type: 'string' }
    } });
    const source = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
    const { name, version: target } = source;
    report.stage = values.stage;
    report.package = name;
    report.target = target;
    report.candidateTag = source.publishConfig.tag;
    assert.ok(['observe', 'before-publish', 'candidate-published', 'latest'].includes(values.stage), 'Unsupported stage');
    if (values.stage !== 'observe') assert.ok(values.candidate, 'Frozen --candidate tarball is required for release gates');
    const document = await packument(name);
    const state = registryState(document, target);
    Object.assign(report, state);
    assertStage(state, { stage: values.stage, previousLatest: values['previous-latest'], candidateTag: report.candidateTag });
    if (values.candidate) {
      const bytes = await readFile(resolve(values.candidate));
      report.candidateIntegrity = 'sha512-' + hash('sha512', bytes, 'base64');
      const candidateMetadata = JSON.parse(execFileSync('tar', ['-xOf', resolve(values.candidate), 'package/package.json'], { encoding: 'utf8', timeout: 20000 }));
      assert.deepEqual(candidateMetadata, source, 'Frozen candidate metadata differs from source');
      if (state.targetState !== 'unpublished') assert.equal(state.targetIntegrity, report.candidateIntegrity, 'Published bytes differ from frozen candidate');
    }
    root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-registry-'));
    report.installs = {};
    if (state.latest) report.installs.default = await probe(root, name, name, 'default', state.latest, document, target);
    if (state.targetState !== 'unpublished') report.installs.fixed = await probe(root, name, `${name}@${target}`, 'fixed', target, document, target);
    const after = registryState(await packument(name), target);
    assert.deepEqual(after.tags, state.tags, 'Registry tags changed during verification');
    assert.equal(after.targetIntegrity, state.targetIntegrity, 'Target integrity changed during verification');
    report.status = 'verified';
  } catch (error) {
    report.status = error.code === 'REGISTRY_UNAVAILABLE' ? 'registry-unavailable' : 'failed';
    // Avoid recording subprocess stderr or npm authentication configuration.
    report.error = error.status !== undefined ? `Verification subprocess failed (exit ${error.status})` : error.message;
    process.exitCode = 1;
  } finally {
    if (root) await rm(root, { recursive: true, force: true });
    console.log(JSON.stringify(report, null, 2));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
