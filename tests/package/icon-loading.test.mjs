import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from '../../scripts/package-verification/run.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));

test('the packed icon entries meet development and production budgets on Angular 21 and 22',
  { timeout: 610_000 }, async t => {
    const workspace = await mkdtemp(join(tmpdir(), 'ui-icon-budget-'));
    t.after(() => rm(workspace, { recursive: true, force: true }));
    const result = await run(process.execPath, [
      'docs/verification/generated-icon-loading-56/reproduce.mjs',
      '--candidate', '--angular', 'both', '--workspace', workspace,
    ], { cwd: repository, signal: t.signal, timeout: 600_000 });
    for (const line of result.split('\n').filter(line => line.startsWith('Measured '))) t.diagnostic(line);
  });
