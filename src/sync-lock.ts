import { randomUUID } from 'node:crypto';
import { lstat, open, readFile, realpath, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

export const syncLockName = '.ui-foundation-sync.lock';

export interface SyncJournalChange {
  path: string;
  kind: 'create' | 'update' | 'delete';
  before_sha256: string | null;
  after_sha256: string | null;
}

const recoveryMessage = (path: string) => `Sync lock exists or its ownership is uncertain: ${path}\n`
  + 'Another sync may be active, or a previous run may have been interrupted. Recovery is required before retrying. '
  + 'Do not remove the marker based only on its PID or age. Confirm the owning process has stopped, preserve the marker and current files, '
  + 'then inspect its planned paths and restore the affected generated output, Skill and ownership manifests from a consistent Git revision or backup. '
  + 'Preserve application files and manual edits. Only after verifying that restoration, explicitly remove this marker and rerun sync. '
  + 'The marker contains hashes and planned changes, not file backups.';

/** One receipt owns a root's entire sync lifetime, including config reads and rollback. */
export async function acquireSyncLock(projectRoot: string) {
  const root = await realpath(resolve(projectRoot));
  const path = resolve(root, syncLockName);
  let handle;
  try { handle = await open(path, 'wx', 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(recoveryMessage(path));
    throw error;
  }
  const identity = await handle.stat();
  const receipt = { schema_version: 1, run_id: randomUUID(), pid: process.pid, root,
    started_at: new Date().toISOString(), phase: 'preflight' as 'preflight' | 'writing' | 'rollback_failed',
    changes: [] as SyncJournalChange[] };
  let retained = false;

  async function verifyIdentity() {
    let actual;
    try { actual = await lstat(path); }
    catch (error) { throw new Error(recoveryMessage(path), { cause: error }); }
    if (!actual.isFile() || actual.dev !== identity.dev || actual.ino !== identity.ino) throw new Error(recoveryMessage(path));
  }

  async function verifyOwnership() {
    await verifyIdentity();
    let current: { run_id?: unknown };
    try { current = JSON.parse(await readFile(path, 'utf8')) as { run_id?: unknown }; }
    catch (error) { throw new Error(recoveryMessage(path), { cause: error }); }
    if (!current || current.run_id !== receipt.run_id) throw new Error(recoveryMessage(path));
  }

  async function record(initial = false) {
    if (initial) await verifyIdentity();
    else await verifyOwnership();
    await handle!.truncate(0);
    const content = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
    let written = 0;
    while (written < content.length) {
      const result = await handle!.write(content, written, content.length - written, written);
      if (result.bytesWritten === 0) throw new Error(`Cannot write sync receipt: ${path}`);
      written += result.bytesWritten;
    }
    await handle!.sync();
  }

  async function release() {
    try {
      if (retained) return;
      await verifyOwnership();
      await unlink(path);
    } finally { await handle!.close(); }
  }

  try { await record(true); }
  catch (error) {
    // Failed/partial receipts also require inspection: never erase unknown state.
    await handle.close();
    throw error;
  }

  return {
    root,
    async recordWriting(changes: SyncJournalChange[]) {
      receipt.phase = 'writing';
      receipt.changes = changes;
      await record();
    },
    async retainForRecovery() {
      retained = true;
      receipt.phase = 'rollback_failed';
      // Retaining the existing marker is the safety boundary even if its update fails.
      try { await record(); } catch { /* Preserve the original failure and marker. */ }
    },
    release,
  };
}
