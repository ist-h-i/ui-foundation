import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { test } from 'node:test';
import { verifySkillInstructionCopies } from '../../scripts/package-verification/documentation.mjs';

test('instruction copies match the installed version, including newly discovered nested references', async t => {
  const base = await mkdtemp(resolve(tmpdir(), 'ui-foundation-skill-instructions-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const source = resolve(base, 'source'), generated = resolve(base, 'generated');
  const write = async (root, path, text) => {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  };
  const instructions = {
    'SKILL.md': '# Skill\n[Design](../../docs/design.en.md)\n',
    'references/token-design.md': '# Tokens\n',
    'references/ui-library-runtime.md': '# Runtime\n',
    'references/component-checks.md': '# Checks\n',
  };
  for (const [path, text] of Object.entries(instructions)) {
    await write(source, path, text);
    await write(generated, path, text.replaceAll('](../../docs/', '](references/docs/'));
  }
  await write(generated, 'references/docs/design.en.md', '# Generated documentation\n');
  await write(source, 'references/README.md', '# Human-facing notes\n');
  await write(source, 'references/nested/README.ja.md', '# Human-facing translation\n');
  assert.deepEqual(await verifySkillInstructionCopies(source, generated), Object.keys(instructions).sort());
  const extra = 'references/nested/screen-design.md';
  await write(source, extra, '# New reference\n');
  await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction files differ/);
  await write(generated, extra, '# New reference\n');
  assert.ok((await verifySkillInstructionCopies(source, generated)).includes(extra));
  await write(generated, extra, '# Edited reference\n');
  await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction differs/);
  await write(generated, extra, '# New reference\n');
  await write(generated, 'references/unowned.md', '# Unexpected\n');
  await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction files differ/);
});
