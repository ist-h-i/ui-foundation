import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { parseConfig } from '../../src/config.ts';
import { checkProject, stableJSON, syncProject } from '../../src/sync.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const registry = '.agents/skills/project-ui/ownership.json';
const oldOutput = '.ui/generated';
const newOutput = 'app/generated-ui';
const run = promisify(execFile);
const loader = import.meta.resolve('tsx');

async function project(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-output-migration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = (await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8')).replace(/\nchecks:\n[\s\S]*$/, '\n');
  const config = parseConfig(source);
  await writeFile(resolve(root, 'ui.config.yaml'), source);
  await syncProject({ root });
  return { root, config };
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function visit(directory: string) {
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isSymbolicLink()) files[path] = 'symlink';
      else files[path] = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
    }
  }
  await visit('');
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

async function legacy(root: string) {
  const path = resolve(root, `${oldOutput}/manifest.json`);
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  delete manifest.files[registry];
  await rm(resolve(root, registry));
  await writeFile(path, stableJSON(manifest));
}

test('output relocation keeps fixed Skill ownership, retires the old manifest, and is dry-run safe and repeatable', async t => {
  const { root, config } = await project(t);
  const skill = await readFile(resolve(root, '.agents/skills/project-ui/SKILL.md'), 'utf8');
  await writeFile(resolve(root, 'application.ts'), 'application-owned\n');
  const originalManifest = JSON.parse(await readFile(resolve(root, `${oldOutput}/manifest.json`), 'utf8'));
  for (const destination of [newOutput, `${newOutput}/nested`, newOutput, oldOutput]) {
    config.output = destination;
    await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
    const before = await snapshot(root);
    const dry = await syncProject({ root, dryRun: true });
    assert.equal(dry.written, false);
    assert.deepEqual(await snapshot(root), before);
    const result = await syncProject({ root });
    assert.deepEqual(result.changes, dry.changes);
    assert.equal(result.written, true);
    assert.equal((await checkProject({ root })).valid, true);
    assert.deepEqual(await syncProject({ root }), { changes: [], written: false });
    assert.equal(await readFile(resolve(root, '.agents/skills/project-ui/SKILL.md'), 'utf8'), skill);
    assert.equal(await readFile(resolve(root, 'application.ts'), 'utf8'), 'application-owned\n');
    assert.equal(JSON.parse(await readFile(resolve(root, registry), 'utf8')).output, destination);
    for (const change of result.changes.filter(change => change.kind === 'delete')) {
      await assert.rejects(readFile(resolve(root, change.path)), { code: 'ENOENT' });
    }
  }
  for (const name of Object.keys(originalManifest.files)) {
    assert.ok((await snapshot(root))[name], `regenerated original owned file: ${name}`);
  }
});

test('v1 generation upgrades in place or relocates with an explicit previous output', async t => {
  for (const inPlace of [true, false]) {
    const { root, config } = await project(t);
    await legacy(root);
    if (inPlace) {
      await syncProject({ root });
      assert.equal((await checkProject({ root })).valid, true);
    }
    config.output = newOutput;
    await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
    if (!inPlace) {
      const before = await snapshot(root);
      await assert.rejects(syncProject({ root }), /--from-output/);
      assert.deepEqual(await snapshot(root), before);
    }
    const fromOutput = inPlace ? undefined : oldOutput;
    const before = await snapshot(root);
    await syncProject({ root, fromOutput, dryRun: true });
    assert.deepEqual(await snapshot(root), before);
    await syncProject({ root, fromOutput });
    assert.equal((await checkProject({ root })).valid, true);
    await assert.rejects(readFile(resolve(root, `${oldOutput}/manifest.json`)), { code: 'ENOENT' });
  }
});

test('relocation rejects edited or unowned old/Skill/new files and even an identical target manifest', async t => {
  for (const path of [`${oldOutput}/angular/styles.css`, '.agents/skills/project-ui/SKILL.md', `${oldOutput}/custom.ts`, `${newOutput}/tokens.css`, `${newOutput}/manifest.json`]) {
    const { root, config } = await project(t);
    await mkdir(resolve(root, path, '..'), { recursive: true });
    const content = path.endsWith('/manifest.json')
      ? await readFile(resolve(root, `${oldOutput}/manifest.json`), 'utf8')
      : path === `${newOutput}/tokens.css` ? await readFile(resolve(root, `${oldOutput}/tokens.css`), 'utf8') : 'application-owned\n';
    await writeFile(resolve(root, path), content);
    config.output = newOutput;
    await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
    const before = await snapshot(root);
    for (const dryRun of [true, false]) {
      await assert.rejects(syncProject({ root, dryRun }), /Generated file was edited|Unowned (file|target manifest)/);
      assert.deepEqual(await snapshot(root), before);
    }
  }
});

test('registry edits, missing prior manifests, wrong explicit locations and unsafe migration paths cannot override ownership', async t => {
  for (const scenario of ['registry-edit', 'invalid-registry', 'missing-manifest', 'wrong-from', 'outside', 'skill-overlap', 'case-only', 'registry-symlink', 'old-symlink', 'new-symlink']) {
    const { root, config } = await project(t);
    let fromOutput: string | undefined;
    if (scenario === 'registry-edit') await writeFile(resolve(root, registry), stableJSON({ schema_version: 1, output: oldOutput, manifest_path: `${oldOutput}/manifest.json`, extra: true }));
    if (scenario === 'invalid-registry') await writeFile(resolve(root, registry), '{');
    if (scenario === 'missing-manifest') await rm(resolve(root, `${oldOutput}/manifest.json`));
    if (scenario === 'wrong-from') fromOutput = 'application';
    if (scenario === 'outside') fromOutput = '../application';
    if (scenario === 'skill-overlap') fromOutput = '.agents';
    await mkdir(resolve(root, 'application'), { recursive: true });
    await writeFile(resolve(root, 'application/keep.txt'), 'keep\n');
    if (scenario === 'registry-symlink') { await rm(resolve(root, registry)); await symlink(resolve(root, 'application/keep.txt'), resolve(root, registry)); }
    if (scenario === 'old-symlink') { await rm(resolve(root, oldOutput), { recursive: true }); await symlink(resolve(root, 'application'), resolve(root, oldOutput)); }
    if (scenario === 'new-symlink') { await mkdir(resolve(root, 'app'), { recursive: true }); await symlink(resolve(root, 'application'), resolve(root, newOutput)); }
    config.output = scenario === 'case-only' ? '.UI/generated' : newOutput;
    await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
    const before = await snapshot(root);
    for (const dryRun of [true, false]) {
      await assert.rejects(syncProject({ root, fromOutput, dryRun }), /ownership|manifest|owned output|Unsafe|overlap|Symlink|Case-only/i);
      assert.deepEqual(await snapshot(root), before);
    }
  }
});

test('nested relocation refuses an existing target manifest even when its SHA is in the old scoped manifest', async t => {
  const { root, config } = await project(t);
  const destination = `${oldOutput}/nested`;
  const manifestPath = resolve(root, `${oldOutput}/manifest.json`);
  const targetPath = `${destination}/manifest.json`;
  const existing = await readFile(manifestPath, 'utf8');
  await mkdir(resolve(root, destination), { recursive: true });
  await writeFile(resolve(root, targetPath), existing);
  const manifest = JSON.parse(existing);
  manifest.files[targetPath] = { sha256: createHash('sha256').update(existing).digest('hex') };
  await writeFile(manifestPath, stableJSON(manifest));
  config.output = destination;
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  const before = await snapshot(root);
  for (const dryRun of [true, false]) {
    await assert.rejects(syncProject({ root, dryRun }), /Unowned target manifest/);
    assert.deepEqual(await snapshot(root), before);
  }
});

test('a missing owned registry is regenerated from the current or explicitly named prior manifest', async t => {
  for (const move of [false, true]) {
    const { root, config } = await project(t);
    await rm(resolve(root, registry));
    if (move) { config.output = newOutput; await writeFile(resolve(root, 'ui.config.yaml'), stringify(config)); }
    await syncProject({ root, fromOutput: move ? oldOutput : undefined });
    assert.equal((await checkProject({ root })).valid, true);
  }
});

test('a failure retiring the old manifest rolls back new output, registry and old generated content', async t => {
  if (process.getuid?.() === 0) { t.skip('Permission failure requires a non-root user.'); return; }
  const { root, config } = await project(t);
  // Use an otherwise empty owned directory so the failing deletion occurs after the new manifest and registry writes.
  const oldManifestPath = resolve(root, `${oldOutput}/manifest.json`);
  const manifest = JSON.parse(await readFile(oldManifestPath, 'utf8'));
  for (const path of Object.keys(manifest.files).filter(path => path.startsWith(oldOutput + '/'))) await rm(resolve(root, path));
  manifest.files = Object.fromEntries(Object.entries(manifest.files).filter(([path]) => !path.startsWith(oldOutput + '/')));
  await writeFile(oldManifestPath, stableJSON(manifest));
  config.output = newOutput;
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  const before = await snapshot(root);
  await chmod(resolve(root, oldOutput), 0o555);
  try { await assert.rejects(syncProject({ root }), { code: 'EACCES' }); }
  finally { await chmod(resolve(root, oldOutput), 0o755); }
  assert.deepEqual(await snapshot(root), before);
  await syncProject({ root });
  assert.equal((await checkProject({ root })).valid, true);
});

test('CLI v1 migration requires an explicit path once and keeps --from-output sync-only', async t => {
  const { root, config } = await project(t);
  await legacy(root);
  config.output = newOutput;
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  const cli = resolve(repository, 'src/cli.ts');
  await assert.rejects(run(process.execPath, ['--import', loader, cli, 'sync'], { cwd: root }), { code: 1 });
  const before = await snapshot(root);
  const dry = await run(process.execPath, ['--import', loader, cli, 'sync', '--from-output', oldOutput, '--dry-run'], { cwd: root });
  assert.match(dry.stdout, /no files written/);
  assert.deepEqual(await snapshot(root), before);
  await run(process.execPath, ['--import', loader, cli, 'sync', '--from-output', oldOutput], { cwd: root });
  await run(process.execPath, ['--import', loader, cli, 'check'], { cwd: root });
  for (const args of [['check', '--from-output', oldOutput], ['init', '--from-output', oldOutput], ['sync', '--from-output'], ['sync', '--from-output', newOutput, '--from-output', newOutput]]) {
    await assert.rejects(run(process.execPath, ['--import', loader, cli, ...args], { cwd: root }), { code: 1 });
  }
});
