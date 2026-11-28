import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { test } from 'node:test';
import { verifyEnglishDocumentation, verifySkillInstructionCopies } from '../../scripts/package-verification/documentation.mjs';

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
  for (const path of ['references/examples/sample.ts', 'references/examples/sample.css']) {
    const contents = path.endsWith('.ts') ? 'export const value = 1;\n' : '.sample { color: red; }\n';
    await write(source, path, contents);
    await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction files differ/);
    await write(generated, path, contents);
    assert.deepEqual(await verifySkillInstructionCopies(source, generated), Object.keys(instructions).sort());
    await write(generated, path, contents + '\n// changed');
    await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction differs/);
    await write(generated, path, contents);
  }
  await write(generated, 'references/examples/unowned.ts', 'export {};\n');
  await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction files differ/);
  await rm(resolve(generated, 'references/examples/unowned.ts'));
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
  await rm(resolve(generated, 'references/unowned.md'));

  const nested = 'references/nested/levels/setup.md';
  await write(source, nested, '[Design][rules]\n\n[rules]: ../../../../../docs/design.en.md#rules\n');
  await write(generated, nested, '[Design][rules]\n\n[rules]: ../../docs/design.en.md#rules\n');
  const sourceExample = '// This is an exact example: [Design](../../../docs/design.en.md)\n';
  await write(source, 'references/root-example.ts', sourceExample);
  await write(generated, 'references/root-example.ts', sourceExample);
  await write(source, 'quick-start.md', '# Setup\n');
  await assert.rejects(verifySkillInstructionCopies(source, generated), /instruction files differ/);
  await write(generated, 'quick-start.md', '# Setup\n');
  assert.ok((await verifySkillInstructionCopies(source, generated)).includes(nested));

  await write(source, 'references/example.json', '{}\n');
  await assert.rejects(verifySkillInstructionCopies(source, generated), /Unsupported Skill instruction file.*example.json/);
  await rm(resolve(source, 'references/example.json'));
  await symlink('root-example.ts', resolve(source, 'references/unowned.ts'));
  await assert.rejects(verifySkillInstructionCopies(source, generated), /Skill instruction symlink/);
});



test('distribution checks resolve reference-style local links and detect missing destinations and fragments', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-reference-links-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const write = async (path, text) => {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  };
  const files = ['docs/design.en.md', 'docs/ui-components.en.md'];
  await write('package.json', JSON.stringify({ files }));
  for (const file of [
    'README.md', 'assets/pdf-source/README.md', 'assets/pdf-source/README.ja.md',
    'skills/ui-development/README.md', 'skills/ui-development/README.ja.md',
    'skills/ui-development/references/token-design.md',
    'skills/ui-development/references/ui-library-runtime.md',
    'skills/ui-development/references/component-checks.md',
    ...files,
  ]) await write(file, '# Rules\n');
  const skill = 'skills/ui-development/SKILL.md';
  await write(skill, '# Instructions\n\n[Design][rules]\n\n[rules]: ../../docs/design.en.md#rules "Design reference"\n');
  await verifyEnglishDocumentation(root);

  await write(skill, '# Instructions\n\n[Design][rules]\n\n[rules]: ../../docs/design.en.md#missing\n');
  await assert.rejects(verifyEnglishDocumentation(root), /Missing heading/);
  await write(skill, '# Instructions\n\n[Design][rules]\n\n[rules]: ../../docs/missing.en.md#rules\n');
  await assert.rejects(verifyEnglishDocumentation(root), { code: 'ENOENT' });
  await write(skill, '# Instructions\n\n<a href="../../docs/missing-html.en.md">Design</a>\n');
  await assert.rejects(verifyEnglishDocumentation(root), { code: 'ENOENT' });
});
