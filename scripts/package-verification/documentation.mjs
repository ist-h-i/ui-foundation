import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const prose = text => text.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '').replace(/`[^`\n]+`/g, '');
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const isJapaneseDocument = file => /\.ja\.md$/.test(file) || /\/(?:design|ui-components)\.md$/.test(file);

function headingIds(text) {
  const counts = new Map();
  const ids = new Set();
  for (const [, heading] of text.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '').matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = heading.toLowerCase().replace(/`/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    ids.add(base + (count ? `-${count}` : ''));
  }
  for (const [, id] of text.matchAll(/<(?:a|[hH][1-6])\s+[^>]*id=["']([^"']+)["']/g)) ids.add(id);
  return ids;
}

// Discover operational instructions from the installed package, not the
// latest checkout's fixed list. Generated references/docs are checked separately.
async function skillInstructions(root, generated = false) {
  const files = ['SKILL.md'];
  assert.ok((await lstat(resolve(root, 'SKILL.md'))).isFile(), 'SKILL.md must be a regular file');
  async function visit(prefix) {
    assert.ok((await lstat(resolve(root, prefix))).isDirectory(), 'Skill reference directory must not be a symlink');
    for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
      const path = prefix + '/' + entry.name;
      if (generated && path === 'references/docs') continue;
      assert.equal(entry.isSymbolicLink(), false, 'Skill reference must not be a symlink: ' + path);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && path.endsWith('.md') && !/^README(?:\\.[a-z]+)?\\.md$/.test(entry.name)) files.push(path);
    }
  }
  await visit('references');
  return files.sort();
}

/** Compare the installed version's own operational instructions with its synced copies. */
export async function verifySkillInstructionCopies(source, generated) {
  const paths = await skillInstructions(source);
  for (const required of ['SKILL.md', 'references/token-design.md', 'references/ui-library-runtime.md', 'references/component-checks.md']) {
    assert.ok(paths.includes(required), 'Missing core Skill instruction: ' + required);
  }
  if (generated) {
    assert.deepEqual(await skillInstructions(generated, true), paths, 'Generated Skill instruction files differ from installed version');
    for (const path of paths) {
      const original = await readFile(resolve(source, path), 'utf8');
      const expected = original.replaceAll('](../../docs/', '](references/docs/').replaceAll('](../../../docs/', '](docs/');
      assert.equal(await readFile(resolve(generated, path), 'utf8'), expected, 'Generated Skill instruction differs from installed version: ' + path);
    }
  }
  return paths;
}

/** Check the actual package and optional synced Skill, without using checkout-only documents. */
export async function verifyEnglishDocumentation(packageRoot, generatedSkillRoot) {
  const metadata = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const documents = metadata.files.filter(file => file.startsWith('docs/') && file.endsWith('.md'));
  const pairs = documents.filter(file => /\.ja\.md$/.test(file)).map(file => [file, file.replace(/\.ja\.md$/, '.en.md')]);
  pairs.push(['docs/design.md', 'docs/design.en.md'], ['docs/ui-components.md', 'docs/ui-components.en.md']);
  for (const [ja, en] of pairs) {
    assert.ok(documents.includes(en), `English counterpart must be packed: ${ja} -> ${en}`);
    await readFile(resolve(packageRoot, en));
  }
  let checked = 0;
  async function inspect(file, englishProse = true) {
    const text = await readFile(file, 'utf8');
    const body = prose(text);
    // Japanese language switches and literal dictionary keys/examples are allowed;
    // operational prose must be readable without knowing Japanese.
    const withoutSwitches = body.replace(/\[[^\]]*(?:日本語|Japanese)[^\]]*\]\([^)]+\)/g, '');
    if (englishProse) assert.equal(japanese.test(withoutSwitches), false, `Japanese operational prose in English document: ${file}`);
    for (const [, label, target] of body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [relative, fragment] = target.split('#');
      const destination = relative ? resolve(dirname(file), relative) : file;
      const content = await readFile(destination, 'utf8');
      if (fragment && destination.endsWith('.md')) assert.ok(headingIds(content).has(decodeURIComponent(fragment)), `Missing heading: ${file} -> ${target}`);
      if (isJapaneseDocument(destination)) assert.match(label, /日本語|Japanese/, `English workflow requires Japanese reference: ${file} -> ${target}`);
    }
    checked++;
  }
  for (const file of documents.filter(file => file.endsWith('.en.md'))) await inspect(resolve(packageRoot, file));
  await inspect(resolve(packageRoot, 'README.md'), false); // Deliberate Japanese human-facing summary.
  for (const directory of ['skills/ui-development', 'assets/pdf-source']) {
    await inspect(resolve(packageRoot, directory, 'README.md'));
    await readFile(resolve(packageRoot, directory, 'README.ja.md'));
  }
  const sourceSkillRoot = resolve(packageRoot, 'skills/ui-development');
  const instructions = await verifySkillInstructionCopies(sourceSkillRoot, generatedSkillRoot);
  const skillRoots = [sourceSkillRoot, ...(generatedSkillRoot ? [resolve(generatedSkillRoot)] : [])];
  for (const root of skillRoots) {
    for (const file of instructions) await inspect(resolve(root, file));
    for (const retired of ['SKILL.en.md', 'SKILL.ja.md']) {
      await assert.rejects(readFile(resolve(root, retired)), { code: 'ENOENT' });
    }
  }
  if (generatedSkillRoot) for (const file of documents) {
    const path = resolve(generatedSkillRoot, 'references', file);
    if (file.endsWith('.en.md')) await inspect(path);
    else await readFile(path);
  }
  if (generatedSkillRoot) for (const file of ['README.md', 'README.ja.md']) {
    await assert.rejects(readFile(resolve(generatedSkillRoot, file)), { code: 'ENOENT' }, 'Human-facing Skill READMEs are not AI instructions');
  }
  return { pairedDocuments: pairs.length, englishDocumentsChecked: checked };
}
