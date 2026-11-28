import assert from 'node:assert/strict';
import { test } from 'node:test';
import { run } from '../../scripts/package-verification/run.mjs';

test('an exited macOS subprocess group is verified when its final signal reports EPERM', {
  skip: process.platform !== 'darwin',
}, async t => {
  const originalKill = process.kill;
  const kill = t.mock.method(process, 'kill', (pid, signal) => {
    if (pid < 0 && signal === 'SIGKILL') throw Object.assign(new Error('Operation not permitted'), { code: 'EPERM' });
    return originalKill(pid, signal);
  });
  assert.equal(await run(process.execPath, ['-e', 'process.stdout.write("complete")']), 'complete');
  await assert.rejects(run(process.execPath, ['-e', 'process.exit(7)']), { code: 7 });
  assert.equal(kill.mock.callCount(), 2);
});
