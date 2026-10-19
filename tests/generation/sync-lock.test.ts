import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { test, type TestContext } from 'node:test';
import { syncProject } from '../../src/sync.ts';
import { acquireSyncLock } from '../../src/sync-lock.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const marker = '.ui-foundation-sync.lock';
const run = promisify(execFile);
const loader = import.meta.resolve('tsx');

async function project(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-sync-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = (await readFile(resolve(repository, 'examples/ui.config.example.yaml'), 'utf8')).replace(/\nchecks:\n[\s\S]*$/, '\n');
  await writeFile(resolve(root, 'ui.config.yaml'), source);
  return root;
}

// A child pauses at an observed filesystem boundary. IPC gates make the ordering
// deterministic without timing sleeps or production-only test hooks.
function pausedSync(t: TestContext, root: string, phase: 'preflight' | 'writing') {
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const method = ${JSON.stringify(phase)} === 'preflight' ? 'readFile' : 'rename';
    const original = fs.promises[method];
    let paused = false;
    fs.promises[method] = async function (...args) {
      const result = await original.apply(this, args);
      if (!paused && (method === 'rename' || String(args[0]).endsWith('/ui.config.yaml'))) {
        paused = true;
        await new Promise(resolve => { process.once('message', resolve); process.send({ phase: ${JSON.stringify(phase)} }); });
      }
      return result;
    };
    syncBuiltinESMExports();
    const { syncProject } = await import(${JSON.stringify(pathToFileURL(resolve(repository, 'src/sync.ts')).href)});
    await syncProject({ root: ${JSON.stringify(root)} });
    process.disconnect();
  `;
  const child = spawn(process.execPath, ['--import', loader, '--input-type=module', '--eval', script], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let stderr = '';
  child.stderr!.on('data', value => { stderr += String(value); });
  const exited = once(child, 'exit');
  const ready = new Promise<void>((accept, reject) => {
    child.once('message', () => accept());
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Child exited before gate: ${code}\n${stderr}`)));
  });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; } });
  return { child, ready, exited };
}

async function lockMissing(root: string) {
  await assert.rejects(readFile(resolve(root, marker)), { code: 'ENOENT' });
}

test('same-root CLI sync and dry-run are excluded before preflight until the owning sync finishes', { timeout: 60_000 }, async t => {
  const root = await project(t);
  const first = pausedSync(t, root, 'preflight');
  await first.ready;
  const receipt = await readFile(resolve(root, marker), 'utf8');
  assert.equal(JSON.parse(receipt).phase, 'preflight');
  for (const args of [[], ['--dry-run']]) {
    await assert.rejects(run(process.execPath, ['--import', loader, resolve(repository, 'src/cli.ts'), 'sync', ...args], { cwd: root }), error => {
      assert.match(String((error as { stderr: string }).stderr), /sync.*lock|lock.*sync/i);
      return true;
    });
    assert.equal(await readFile(resolve(root, marker), 'utf8'), receipt);
  }
  const alias = resolve(root, 'root-alias');
  await symlink(root, alias);
  await assert.rejects(syncProject({ root: alias }), /recovery/i);
  first.child.send('continue');
  assert.deepEqual(await first.exited, [0, null]);
  await lockMissing(root);
  assert.deepEqual(await syncProject({ root }), { changes: [], written: false });
});

test('SIGKILL after an actual managed write leaves a journal and blocks subsequent sync and dry-run', { timeout: 60_000 }, async t => {
  const root = await project(t);
  const first = pausedSync(t, root, 'writing');
  await first.ready;
  const receipt = await readFile(resolve(root, marker), 'utf8');
  const journal = JSON.parse(receipt);
  assert.equal(journal.phase, 'writing');
  assert.ok(journal.changes.length > 0);
  assert.ok(journal.changes.every((change: { after_sha256: string | null }) => change.after_sha256 === null || /^[a-f0-9]{64}$/.test(change.after_sha256)));
  first.child.kill('SIGKILL');
  assert.deepEqual(await first.exited, [null, 'SIGKILL']);
  for (const dryRun of [false, true]) await assert.rejects(syncProject({ root, dryRun }), /interrupted|recovery/i);
  assert.equal(await readFile(resolve(root, marker), 'utf8'), receipt);
  assert.ok((await readdir(resolve(root, '.agents/skills/project-ui'))).length > 0, 'child completed an actual managed write');
});

test('ordinary success, dry-run, no changes, invalid config and ownership conflicts release their receipt', async t => {
  const root = await project(t);
  await syncProject({ root, dryRun: true });
  await lockMissing(root);
  await syncProject({ root });
  await lockMissing(root);
  await syncProject({ root });
  await lockMissing(root);
  await writeFile(resolve(root, '.ui/generated/tokens.css'), 'manual edit\n');
  await assert.rejects(syncProject({ root }), /Generated file was edited/);
  await lockMissing(root);
  await writeFile(resolve(root, 'ui.config.yaml'), 'invalid: config\n');
  await assert.rejects(syncProject({ root }));
  await lockMissing(root);
});

test('unknown, malformed, or symlink receipts are preserved and never treated as stale by PID', async t => {
  const root = await project(t);
  for (const receipt of ['', '{', JSON.stringify({ pid: 2147483647, run_id: 'unknown', phase: 'writing' })]) {
    await writeFile(resolve(root, marker), receipt);
    await assert.rejects(syncProject({ root }), /recovery/i);
    assert.equal(await readFile(resolve(root, marker), 'utf8'), receipt);
    await rm(resolve(root, marker));
  }
  await writeFile(resolve(root, 'application.txt'), 'keep\n');
  await symlink(resolve(root, 'application.txt'), resolve(root, marker));
  await assert.rejects(syncProject({ root }), /recovery/i);
  assert.equal(await readFile(resolve(root, 'application.txt'), 'utf8'), 'keep\n');
});

test('release preserves a replaced receipt belonging to another run', async t => {
  const root = await project(t);
  const lock = await acquireSyncLock(root);
  const replacement = JSON.stringify({ run_id: 'another-owner' });
  await writeFile(resolve(root, marker), replacement);
  await assert.rejects(lock.recordWriting([]), /recovery/i);
  assert.equal(await readFile(resolve(root, marker), 'utf8'), replacement);
  await assert.rejects(lock.release(), /recovery/i);
  assert.equal(await readFile(resolve(root, marker), 'utf8'), replacement);
});

test('ordinary I/O rollback releases the marker, while incomplete rollback retains its recovery journal', { timeout: 60_000 }, async t => {
  for (const failRollback of [false, true]) {
    const root = await project(t);
    await syncProject({ root });
    const contextPath = resolve(root, '.agents/skills/project-ui/project-context.md');
    const before = await readFile(contextPath, 'utf8');
    const configPath = resolve(root, 'ui.config.yaml');
    await writeFile(configPath, (await readFile(configPath, 'utf8')).replace('product:', 'product: changed-'));
    const script = `
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      const rename = fs.promises.rename;
      let calls = 0;
      fs.promises.rename = async function (...args) {
        calls++;
        if (calls === 2 || (${failRollback} && calls > 2)) throw new Error('injected rename failure');
        return rename.apply(this, args);
      };
      syncBuiltinESMExports();
      const { syncProject } = await import(${JSON.stringify(pathToFileURL(resolve(repository, 'src/sync.ts')).href)});
      await syncProject({ root: ${JSON.stringify(root)} });
    `;
    await assert.rejects(run(process.execPath, ['--import', loader, '--input-type=module', '--eval', script]), error => {
      assert.match(String((error as { stderr: string }).stderr), /injected rename failure/);
      return true;
    });
    if (failRollback) {
      assert.equal(JSON.parse(await readFile(resolve(root, marker), 'utf8')).phase, 'rollback_failed');
      await assert.rejects(syncProject({ root }), /recovery/i);
    } else {
      await lockMissing(root);
      assert.equal(await readFile(contextPath, 'utf8'), before);
      await syncProject({ root });
    }
  }
});
