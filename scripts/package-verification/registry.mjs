import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { verifyEnglishDocumentation, verifyReleaseVersionDocumentation } from './documentation.mjs';
import { assertFrozenCandidate, prepareCandidate } from './candidate.mjs';

const registry = 'https://registry.npmjs.org/';
const repository = fileURLToPath(new URL('../../', import.meta.url));
const hash = (algorithm, bytes, encoding) => createHash(algorithm).update(bytes).digest(encoding);
const canonicalTags = tags => Object.fromEntries(Object.entries(tags).sort(([a], [b]) => a.localeCompare(b, 'en')));
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function registryState(document, target, registryStatus = 'found') {
  const tags = canonicalTags(document['dist-tags'] ?? {});
  const versions = document.versions ?? {};
  for (const [tag, version] of Object.entries(tags)) assert.ok(Object.hasOwn(versions, version), `Tag ${tag} points to a missing version`);
  const metadata = Object.hasOwn(versions, target) ? versions[target] : null;
  return { registryStatus, tags, versions: Object.keys(versions).sort(), target,
    targetState: !metadata ? 'unpublished' : tags.latest === target ? 'latest' : 'published',
    targetTags: Object.keys(tags).filter(tag => tags[tag] === target),
    targetIntegrity: metadata?.dist?.integrity ?? null,
    publishedAt: document.time?.[target] ?? null, latest: tags.latest ?? null,
    latestIntegrity: tags.latest ? versions[tags.latest]?.dist?.integrity ?? null : null };
}

export function assertRegistryUnchanged(before, after) {
  assert.equal(after.target, before.target, 'Registry verification target changed');
  assert.equal(after.registryStatus, before.registryStatus, 'Registry package status changed during verification');
  assert.deepEqual(after.tags, before.tags, 'Registry tags changed during verification');
  assert.deepEqual(after.versions, before.versions, 'Registry versions changed during verification');
  assert.equal(after.targetIntegrity, before.targetIntegrity, 'Target integrity changed during verification');
  assert.equal(after.latestIntegrity, before.latestIntegrity, 'Latest integrity changed during verification');
  assert.equal(after.publishedAt, before.publishedAt, 'Target publication time changed during verification');
}

export function assertStage(state, { stage, previousLatest, candidateTag }) {
  if (stage === 'observe') return;
  assert.ok(['before-publish', 'candidate-published', 'latest'].includes(stage), 'Unsupported stage');
  if (stage === 'latest') {
    assert.equal(state.latest, state.target, 'latest must point to target');
    return;
  }
  assert.ok(typeof candidateTag === 'string' && candidateTag.length > 0 && candidateTag !== 'latest', 'A separate candidate tag is required');
  assert.ok(typeof previousLatest === 'string' && previousLatest.length > 0, 'Explicit --previous-latest is required');
  assert.notEqual(previousLatest, state.target, 'Previous latest must differ from target');
  assert.equal(state.latest, previousLatest === 'none' ? null : previousLatest, 'latest changed unexpectedly');
  if (stage === 'before-publish') assert.equal(state.targetState, 'unpublished', 'Target is already published');
  else {
    assert.notEqual(state.targetState, 'unpublished', 'Target is not published');
    assert.equal(state.tags[candidateTag], state.target, 'Candidate tag must point to target');
  }
}

export function candidateInput(values) {
  const path = values.candidate;
  const sha256 = values['candidate-sha256'];
  assert.equal(path !== undefined, sha256 !== undefined, '--candidate and --candidate-sha256 must be supplied together');
  if (values.stage !== 'observe') assert.ok(path, 'Frozen --candidate tarball is required for release gates');
  if (path === undefined) return null;
  assert.ok(path.trim(), 'Candidate path must not be empty');
  assert.match(sha256, /^[a-f0-9]{64}$/, 'Candidate SHA256 must contain 64 lowercase hexadecimal characters');
  return { UI_FOUNDATION_PACKAGE_TARBALL: path, UI_FOUNDATION_PACKAGE_SHA256: sha256 };
}

export function verifyInstallMetadata(installed, locked, version, integrity) {
  assert.ok(integrity, 'Missing registry integrity');
  assert.equal(installed.version, version, 'Installed version mismatch');
  assert.equal(locked?.version, version, 'Lockfile version mismatch');
  assert.equal(locked?.integrity, integrity, 'Lockfile integrity mismatch');
}

export async function readRegistryPackage(name, fetchPackage = fetch) {
  let response;
  try { response = await fetchPackage(registry + encodeURIComponent(name), { cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { accept: 'application/json' } }); }
  catch (cause) { throw Object.assign(new Error('Official registry could not be reached', { cause }), { code: 'REGISTRY_UNAVAILABLE' }); }
  if (response.status === 404) return { registryStatus: 'not-found', document: { name, versions: {}, 'dist-tags': {} } };
  if (!response.ok) throw Object.assign(new Error(`Registry HTTP ${response.status}`), { code: 'REGISTRY_UNAVAILABLE' });
  const document = await response.json();
  assert.equal(document.name, name, 'Registry package identity mismatch');
  assert.ok(isRecord(document.versions) && isRecord(document['dist-tags']), 'Malformed registry response');
  for (const [tag, version] of Object.entries(document['dist-tags'])) {
    assert.ok(typeof version === 'string' && Object.hasOwn(document.versions, version), `Tag ${tag} points to a missing version`);
  }
  return { registryStatus: 'found', document };
}

/** Refuse indirect or non-file reads even when their bytes match a recorded hash. */
async function readManagedFile(app, relative) {
  let current = resolve(app);
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]);
    const stat = await lstat(current);
    assert.ok(!stat.isSymbolicLink() && (i === parts.length - 1 ? stat.isFile() : stat.isDirectory()),
      'Unsafe generated ownership path: ' + relative);
  }
  return readFile(current);
}

/** Verify the exact generated bytes without consulting checkout-only resources. */
export async function verifyGeneratedOwnership(app) {
  const path = '.ui/generated/manifest.json';
  const bytes = await readManagedFile(app, path);
  const manifest = JSON.parse(bytes.toString('utf8'));
  assert.ok(manifest?.version === 1 && typeof manifest.tool_version === 'string' && isDigest(manifest.configuration_hash)
    && isRecord(manifest.files), 'Missing or malformed generated ownership records');
  const paths = Object.keys(manifest.files);
  assert.ok(paths.includes('.agents/skills/project-ui/SKILL.md'), 'Generated Skill is not owned');
  assert.ok(paths.includes('.agents/skills/project-ui/ownership.json'), 'Skill ownership registry is missing');
  for (const relative of paths) {
    assert.ok((relative.startsWith('.ui/generated/') || relative.startsWith('.agents/skills/project-ui/'))
      && !relative.split('/').some(part => !part || part === '.' || part === '..')
      && !relative.includes('\\'), 'Unexpected generated ownership path: ' + relative);
    const entry = manifest.files[relative];
    assert.ok(isRecord(entry) && isDigest(entry.sha256), 'Invalid ownership digest: ' + relative);
    assert.equal(hash('sha256', await readManagedFile(app, relative), 'hex'), entry.sha256, 'Generated ownership mismatch: ' + relative);
  }
  const ownershipPath = '.agents/skills/project-ui/ownership.json';
  const ownership = JSON.parse(await readManagedFile(app, ownershipPath));
  assert.deepEqual(ownership, { schema_version: 1, output: '.ui/generated', manifest_path: path }, 'Invalid ownership registry');
  const actual = [
    ...await regularFilePaths(resolve(app, '.ui/generated'), '.ui/generated'),
    ...await regularFilePaths(resolve(app, '.agents/skills/project-ui'), '.agents/skills/project-ui'),
  ];
  assert.deepEqual(actual.sort(), [...paths, path].sort(), 'Generated ownership does not cover all files');
  return { toolVersion: manifest.tool_version, manifestSha256: hash('sha256', bytes, 'hex'), managedFiles: paths.length };
}

async function regularFilePaths(directory, prefix) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false, 'Managed file must not be a symlink: ' + prefix + '/' + entry.name);
    const path = prefix + '/' + entry.name;
    if (entry.isDirectory()) paths.push(...await regularFilePaths(resolve(directory, entry.name), path));
    else {
      assert.ok(entry.isFile(), 'Expected a regular file: ' + path);
      paths.push(path);
    }
  }
  return paths.sort();
}

/** Check the installed version's API inventory and its actual CLI copies. */
export async function verifyInstalledApiCatalog(installedRoot, installedApp) {
  const catalogPath = 'docs/ui-library-api.json';
  const catalogBytes = await readManagedFile(installedRoot, catalogPath);
  const catalog = JSON.parse(catalogBytes);
  const templates = 'templates/angular';
  assert.ok(catalog?.schema_version === 1 && catalog.source === templates
    && Array.isArray(catalog.files) && catalog.source_count === catalog.files.length, 'Invalid API catalog');
  const paths = await regularFilePaths(resolve(installedRoot, templates), templates);
  assert.deepEqual(catalog.files.map(entry => entry.path).sort(), paths.filter(path => path.endsWith('.ts')),
    'API catalog does not cover all installed Angular templates');
  for (const entry of catalog.files) {
    const contents = await readManagedFile(installedRoot, entry.path);
    assert.equal(hash('sha256', contents, 'hex'), entry.sha256, 'API catalog digest mismatch: ' + entry.path);
    // Lucide's optional interop entry is omitted by the default consumer setup.
    if (entry.path === templates + '/icons/lucide.ts') continue;
    const generated = '.ui/generated/angular/' + entry.path.slice(templates.length + 1);
    const generatedBytes = await readManagedFile(installedApp, generated);
    if (entry.path === templates + '/locale-defaults.ts') {
      const { default_language: language } = JSON.parse(await readManagedFile(installedApp, '.ui/generated/resolved.json'));
      assert.ok(language === 'en' || language === 'ja', 'Invalid generated default language');
      const declaration = "export const uiDefaultLanguage: 'en' | 'ja' = " + JSON.stringify(language) + ";";
      assert.ok(generatedBytes.toString('utf8').split('\n').includes(declaration), 'Generated default language differs from resolved config');
    } else {
      assert.deepEqual(generatedBytes, contents, 'Generated API differs from installed template: ' + entry.path);
    }
  }
  assert.deepEqual(await readManagedFile(installedApp, '.agents/skills/project-ui/references/' + catalogPath), catalogBytes,
    'Generated Skill catalog differs from installed API catalog');
  return { files: catalog.source_count, sha256: hash('sha256', catalogBytes, 'hex') };
}

async function verifyInstalledGeneration(app, installedRoot, metadata, currentContract) {
  assert.equal(metadata.bin?.['ui-foundation'], 'dist/cli.js', 'Unexpected CLI entry');
  const cli = (...args) => execFileSync(process.execPath, [resolve(installedRoot, 'dist/cli.js'), ...args], {
    cwd: app, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  cli('init');
  await mkdir(resolve(app, 'src'), { recursive: true });
  await writeFile(resolve(app, 'src/app.ts'), 'export const application = true;\n');
  cli('sync');
  const first = await verifyGeneratedOwnership(app);
  assert.equal(first.toolVersion, metadata.version, 'Generated tool version differs from installed version');
  cli('sync', '--dry-run');
  const checked = JSON.parse(cli('check', '--format', 'json'));
  assert.equal(checked.valid, true, 'Installed CLI check failed');
  assert.deepEqual(await verifyGeneratedOwnership(app), first, 'Generated ownership changed during dry-run/check');
  // Also require the installed version's actual second sync to be a no-op.
  assert.match(cli('sync'), /current/i, 'Repeated installed CLI sync must report no changes');
  assert.deepEqual(await verifyGeneratedOwnership(app), first, 'Generated ownership changed during repeated sync');
  const generatedSkillRoot = resolve(app, '.agents/skills/project-ui');
  const result = { ...first, check: 'valid', documentationContract: 'installed-version' };
  // Verify the current version against its actual package allowlist. Do not apply
  // a newer package's expected document layout to an older normal-install version.
  if (currentContract) {
    const allowed = metadata.files.filter(path => path.startsWith('docs/')).sort();
    assert.deepEqual(await regularFilePaths(resolve(generatedSkillRoot, 'references/docs'), 'docs'), allowed,
      'Generated Skill documentation differs from the installed allowlist');
    result.documentation = await verifyEnglishDocumentation(installedRoot, generatedSkillRoot);
    result.api = await verifyInstalledApiCatalog(installedRoot, app);
    result.documentationContract = 'current-target';
  }
  for (const [source, generated] of [
    ['LICENSE', '.ui/generated/UI-FOUNDATION-LICENSE.txt'],
    ['LICENSE', '.agents/skills/project-ui/UI-FOUNDATION-LICENSE.txt'],
    ['dist/CHECKER-NOTICE.txt', '.ui/generated/CHECKER-NOTICE.txt'],
  ]) {
    assert.deepEqual(await readManagedFile(app, generated), await readManagedFile(installedRoot, source),
      'Original license or notice differs from installed bytes: ' + generated);
  }
  return result;
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
  const docs = ['README.md', 'README.ja.md', ...(metadata.files ?? []).filter(path => path.startsWith('docs/')), 'skills/ui-development/SKILL.md'];
  const documentation = Object.fromEntries(await Promise.all(docs.map(async path => [path, hash('sha256', await readFile(resolve(installedRoot, path)), 'hex')])));
  // Older latest versions have their own contract. Do not impose current docs on them.
  if (expectedVersion === target) {
    await verifyReleaseVersionDocumentation(installedRoot);
  }
  const generation = await verifyInstalledGeneration(app, installedRoot, metadata, expectedVersion === target);
  return { specification, version: metadata.version, integrity: lock.packages[`node_modules/${name}`].integrity, documentation, generation };
}

async function main() {
  const report = { observedAt: new Date().toISOString(), registry, status: 'failed' };
  let root, candidate;
  try {
    const { values } = parseArgs({ options: {
      stage: { type: 'string', default: 'observe' }, 'previous-latest': { type: 'string' }, candidate: { type: 'string' }, 'candidate-sha256': { type: 'string' }
    } });
    const source = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
    const { name, version: target } = source;
    report.stage = values.stage;
    report.package = name;
    report.target = target;
    report.candidateTag = source.publishConfig.tag;
    assert.ok(['observe', 'before-publish', 'candidate-published', 'latest'].includes(values.stage), 'Unsupported stage');
    const input = candidateInput(values);
    root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-registry-'));
    if (input) {
      candidate = await prepareCandidate({ repository, root, env: input,
        execute: (file, args, cwd) => execFileSync(file, args, { cwd, encoding: 'utf8', timeout: 20000, maxBuffer: 16 * 1024 * 1024 }) });
      report.candidateSha256 = candidate.sha256;
      report.candidateIntegrity = 'sha512-' + hash('sha512', await readFile(candidate.tarball), 'base64');
      await assertFrozenCandidate(candidate);
    }
    report.operation = 'registry-observation';
    const { registryStatus, document } = await readRegistryPackage(name);
    const state = registryState(document, target, registryStatus);
    Object.assign(report, state);
    assertStage(state, { stage: values.stage, previousLatest: values['previous-latest'], candidateTag: report.candidateTag });
    if (candidate && state.targetState !== 'unpublished') assert.equal(state.targetIntegrity, report.candidateIntegrity, 'Published bytes differ from frozen candidate');
    report.installs = {};
    if (state.latest) {
      report.operation = 'default-install-and-generation';
      report.installs.default = await probe(root, name, name, 'default', state.latest, document, target);
    }
    if (state.targetState !== 'unpublished') {
      report.operation = 'fixed-install-and-generation';
      report.installs.fixed = await probe(root, name, `${name}@${target}`, 'fixed', target, document, target);
    }
    report.operation = 'registry-recheck';
    const afterPackage = await readRegistryPackage(name);
    const after = registryState(afterPackage.document, target, afterPackage.registryStatus);
    assertRegistryUnchanged(state, after);
    if (candidate) await assertFrozenCandidate(candidate);
    report.status = 'verified';
    report.operation = 'complete';
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
