import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { parseConfig } from '../../src/config.ts';
import { checkProject, initProject, syncProject } from '../../src/sync.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const run = promisify(execFile);
const loader = import.meta.resolve('tsx');

async function project(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-generation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = (await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8')).replace(/\nchecks:\n[\s\S]*$/, '\n');
  await writeFile(resolve(root, 'ui.config.yaml'), source);
  return { root, source, config: parseConfig(source) };
}

test('dry-run writes nothing; repeated generation is stable and check observes the generated output', async t => {
  const { root } = await project(t);
  const plan = await syncProject({ root, dryRun: true });
  assert.ok(plan.changes.some(change => change.path.endsWith('/tokens.css')));
  assert.equal(plan.written, false);
  await assert.rejects(readFile(resolve(root, '.ui/generated/manifest.json')), { code: 'ENOENT' });
  await assert.rejects(readFile(resolve(root, '.agents/skills/project-ui/SKILL.md')), { code: 'ENOENT' });
  assert.equal((await syncProject({ root })).written, true);
  assert.deepEqual(await syncProject({ root }), { changes: [], written: false });
  const report = await checkProject({ root });
  assert.equal(report.valid, true);
  assert.deepEqual(report.differences, []);
  assert.equal(report.source.status, 'not_configured');
});

test('a changed primitive reaches CSS, resolved policy and AI context; stale output fails check', async t => {
  const { root, config } = await project(t);
  await syncProject({ root });
  config.primitives[config.semantic['color.action']].value = '#273899';
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  const stale = await checkProject({ root });
  assert.equal(stale.valid, false);
  assert.ok(stale.differences.some(path => path.includes('tokens.css')));
  await syncProject({ root });
  for (const path of ['.ui/generated/tokens.css', '.ui/generated/resolved.json', '.ui/generated/policy.json', '.agents/skills/project-ui/project-context.md']) {
    assert.match(await readFile(resolve(root, path), 'utf8'), /#273899/);
  }
  assert.equal((await checkProject({ root })).valid, true);
});

test('context-only edits change AI guidance without changing tokens or Tailwind mappings', async t => {
  const { root, config } = await project(t);
  await syncProject({ root });
  const tokens = await readFile(resolve(root, '.ui/generated/tokens.css'), 'utf8');
  const theme = await readFile(resolve(root, '.ui/generated/tailwind.css'), 'utf8');
  config.context.product = '新しい利用目的';
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  await syncProject({ root });
  assert.equal(await readFile(resolve(root, '.ui/generated/tokens.css'), 'utf8'), tokens);
  assert.equal(await readFile(resolve(root, '.ui/generated/tailwind.css'), 'utf8'), theme);
  assert.match(await readFile(resolve(root, '.agents/skills/project-ui/project-context.md'), 'utf8'), /新しい利用目的/);
});

test('default profile and labels are generated as usable application metadata', async t => {
  const { root, config } = await project(t);
  config.default_profile = 'dense';
  config.profiles.dense.label = '一覧の比較を優先';
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  await syncProject({ root });
  const { uiProfiles } = await import(pathToFileURL(resolve(root, '.ui/generated/profiles.ts')).href);
  assert.equal(uiProfiles.defaultProfile, 'dense');
  assert.deepEqual(uiProfiles.profiles.find((item: { id: string }) => item.id === 'dense'), { id: 'dense', label: '一覧の比較を優先' });
  const rootCSS = (await readFile(resolve(root, '.ui/generated/tokens.css'), 'utf8')).split('[data-ui-profile=')[0];
  assert.match(rootCSS, /--ui-color-action: var\(--ui-p-green\)/);
  assert.equal((await checkProject({ root })).valid, true);
});

test('manual edits are detected and preserved, including Skill edits', async t => {
  for (const path of ['.ui/generated/angular/styles.css', '.agents/skills/project-ui/SKILL.md']) {
    const { root } = await project(t);
    await syncProject({ root });
    const edited = 'local edits that must survive\n';
    await writeFile(resolve(root, path), edited);
    assert.equal((await checkProject({ root })).valid, false);
    await assert.rejects(syncProject({ root }), /Generated file was edited/);
    await assert.rejects(syncProject({ root, dryRun: true }), /Generated file was edited/);
    assert.equal(await readFile(resolve(root, path), 'utf8'), edited);
  }
});

test('existing unowned output and Skill files are not adopted or overwritten', async t => {
  for (const path of ['.ui/generated/tokens.css', '.agents/skills/project-ui/SKILL.md']) {
    const { root } = await project(t);
    await mkdir(resolve(root, path, '..'), { recursive: true });
    await writeFile(resolve(root, path), 'application-owned\n');
    await assert.rejects(syncProject({ root }), /Unowned file/);
    assert.equal(await readFile(resolve(root, path), 'utf8'), 'application-owned\n');
    await assert.rejects(readFile(resolve(root, '.ui/generated/manifest.json')), { code: 'ENOENT' });
  }
});

test('unexpected files inside managed directories fail check and sync without deletion', async t => {
  const { root } = await project(t);
  await syncProject({ root });
  const path = resolve(root, '.ui/generated/custom.ts');
  await writeFile(path, 'keep this\n');
  assert.ok((await checkProject({ root })).differences.some(item => item === 'Unowned: .ui/generated/custom.ts'));
  await assert.rejects(syncProject({ root }), /Unowned file/);
  assert.equal(await readFile(path, 'utf8'), 'keep this\n');
});

test('missing output fails check and can be regenerated without touching application files', async t => {
  const { root } = await project(t);
  await syncProject({ root });
  await writeFile(resolve(root, 'application.ts'), 'application-owned');
  await rm(resolve(root, '.ui/generated/tokens.css'));
  assert.ok((await checkProject({ root })).differences.some(item => item.startsWith('Missing:')));
  await syncProject({ root });
  assert.equal((await checkProject({ root })).valid, true);
  assert.equal(await readFile(resolve(root, 'application.ts'), 'utf8'), 'application-owned');
});

test('invalid manifest ownership is rejected before any output changes', async t => {
  const { root } = await project(t);
  await syncProject({ root });
  const path = resolve(root, '.ui/generated/manifest.json');
  const before = await readFile(resolve(root, '.ui/generated/tokens.css'), 'utf8');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.files['application.ts'] = { sha256: 'a'.repeat(64) };
  await writeFile(path, JSON.stringify(manifest));
  await assert.rejects(syncProject({ root }), /Invalid manifest ownership/);
  assert.equal(await readFile(resolve(root, '.ui/generated/tokens.css'), 'utf8'), before);
});

test('output directory, descendant and configuration symlinks are rejected', async t => {
  for (const scenario of ['output', 'descendant', 'config']) {
    const { root } = await project(t);
    await mkdir(resolve(root, 'application'), { recursive: true });
    await writeFile(resolve(root, 'application/owned.txt'), 'keep');
    if (scenario === 'output') {
      await mkdir(resolve(root, '.ui'), { recursive: true });
      await symlink(resolve(root, 'application'), resolve(root, '.ui/generated'));
    } else if (scenario === 'descendant') {
      await syncProject({ root });
      await symlink(resolve(root, 'application'), resolve(root, '.ui/generated/alias'));
    } else {
      await renameConfig(root);
    }
    await assert.rejects(syncProject({ root }), /Symlink/);
    await assert.rejects(checkProject({ root }), /Symlink/);
    assert.equal(await readFile(resolve(root, 'application/owned.txt'), 'utf8'), 'keep');
  }
});

async function renameConfig(root: string) {
  const content = await readFile(resolve(root, 'ui.config.yaml'), 'utf8');
  await writeFile(resolve(root, 'application/config.yaml'), content);
  await rm(resolve(root, 'ui.config.yaml'));
  await symlink(resolve(root, 'application/config.yaml'), resolve(root, 'ui.config.yaml'));
}

test('project-relative path boundaries and Skill/output overlap are rejected', async t => {
  const { root, config } = await project(t);
  await assert.rejects(initProject({ root, configPath: '../elsewhere.yaml' }), /Unsafe/);
  await assert.rejects(initProject({ root, configPath: '/tmp/elsewhere.yaml' }), /Unsafe/);
  for (const output of ['.agents', '.AGENTS']) {
    config.output = output;
    await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
    await assert.rejects(syncProject({ root }), /overlap/);
  }
});

test('init preserves existing config and creates a runnable fresh configuration', async t => {
  const { root, source } = await project(t);
  await assert.rejects(initProject({ root }), { code: 'EEXIST' });
  assert.equal(await readFile(resolve(root, 'ui.config.yaml'), 'utf8'), source);
  await rm(resolve(root, 'ui.config.yaml'));
  assert.equal(await initProject({ root }), 'ui.config.yaml');
  const initial = parseConfig(await readFile(resolve(root, 'ui.config.yaml'), 'utf8'));
  assert.deepEqual(initial.checks?.source_roots, ['src']);
  await mkdir(resolve(root, 'src'));
  await writeFile(resolve(root, 'src/app.ts'), 'export const application = true;\n');
  await syncProject({ root });
  assert.equal((await checkProject({ root })).valid, true);
});

test('CLI check has a real failing exit status, and dry-run is read-only', async t => {
  const { root } = await project(t);
  const cli = resolve(repository, 'src/cli.ts');
  await assert.rejects(run(process.execPath, ['--import', loader, cli, 'check'], { cwd: root }), { code: 1 });
  const dry = await run(process.execPath, ['--import', loader, cli, 'sync', '--dry-run'], { cwd: root });
  assert.match(dry.stdout, /no files written/);
  await assert.rejects(readFile(resolve(root, '.ui/generated/tokens.css')), { code: 'ENOENT' });
  await run(process.execPath, ['--import', loader, cli, 'sync'], { cwd: root });
  await run(process.execPath, ['--import', loader, cli, 'check'], { cwd: root });
  await writeFile(resolve(root, '.ui/generated/tokens.css'), 'edited');
  await assert.rejects(run(process.execPath, ['--import', loader, cli, 'check'], { cwd: root }), { code: 1 });
  await assert.rejects(run(process.execPath, ['--import', loader, cli, 'sync'], { cwd: root }), { code: 1 });
  await assert.rejects(run(process.execPath, ['--import', loader, cli, 'check', '--dry-run'], { cwd: root }), { code: 1 });
});

test('an ordinary I/O failure restores files already written and leaves the previous manifest', async t => {
  if (process.getuid?.() === 0) { t.skip('Permission failure requires a non-root user.'); return; }
  const { root, config } = await project(t);
  await syncProject({ root });
  const directory = resolve(root, '.ui/generated');
  const contextPath = resolve(root, '.agents/skills/project-ui/project-context.md');
  const context = await readFile(contextPath, 'utf8');
  const manifest = await readFile(resolve(directory, 'manifest.json'), 'utf8');
  config.context.product = 'changed context to exercise rollback';
  await writeFile(resolve(root, 'ui.config.yaml'), stringify(config));
  await chmod(directory, 0o555);
  try { await assert.rejects(syncProject({ root }), { code: 'EACCES' }); }
  finally { await chmod(directory, 0o755); }
  assert.equal(await readFile(contextPath, 'utf8'), context);
  assert.equal(await readFile(resolve(directory, 'manifest.json'), 'utf8'), manifest);
  await syncProject({ root });
  assert.equal((await checkProject({ root })).valid, true);
});
