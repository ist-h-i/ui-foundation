import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { marked } from 'marked';
import { renderSkillDocumentation } from '../../src/skill-docs.ts';
import { readSkillInstructions, renderSkillInstruction } from '../../src/skill-instructions.ts';

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

/** Compare the installed version's own operational instructions with its synced copies. */
export async function verifySkillInstructionCopies(source, generated) {
  const instructions = await readSkillInstructions(source);
  const paths = [...instructions.keys()].sort();
  for (const required of ['SKILL.md', 'references/token-design.md', 'references/ui-library-runtime.md', 'references/component-checks.md']) {
    assert.ok(instructions.has(required), 'Missing core Skill instruction: ' + required);
  }
  if (generated) {
    const copied = await readSkillInstructions(generated, true);
    assert.deepEqual([...copied.keys()].sort(), paths, 'Generated Skill instruction files differ from installed version');
    for (const path of paths) {
      assert.equal(copied.get(path), renderSkillInstruction(path, instructions.get(path)), 'Generated Skill instruction differs from installed version: ' + path);
    }
  }
  return paths.filter(path => path.endsWith('.md'));
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
  async function inspect(file, root, englishProse = true) {
    const text = await readFile(file, 'utf8');
    const body = prose(text);
    // Japanese language switches and literal dictionary keys/examples are allowed;
    // operational prose must be readable without knowing Japanese.
    const withoutSwitches = body.replace(/\[[^\]]*(?:日本語|Japanese)[^\]]*\]\([^)]+\)/g, '');
    if (englishProse) assert.equal(japanese.test(withoutSwitches), false, `Japanese operational prose in English document: ${file}`);
    const links = [];
    marked.walkTokens(marked.lexer(text), token => {
      if (token.type === 'link' || token.type === 'image') links.push([token.text, token.href]);
      if (token.type === 'html') {
        for (const [, target] of token.raw.matchAll(/<(?:a|img)\b[^>]*\b(?:href|src)=["']([^"']+)["']/gi)) {
          links.push(['', target]);
        }
      }
    });
    for (const [label, target] of links) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
      const fragmentAt = target.indexOf('#');
      const relative = decodeURIComponent(fragmentAt === -1 ? target : target.slice(0, fragmentAt));
      const fragment = fragmentAt === -1 ? '' : decodeURIComponent(target.slice(fragmentAt + 1));
      const destination = relative ? resolve(dirname(file), relative) : file;
      assert.ok(destination.startsWith(resolve(root) + sep), `Local reference leaves its distribution root: ${file} -> ${target}`);
      const content = await readFile(destination, 'utf8');
      if (fragment && destination.endsWith('.md')) assert.ok(headingIds(content).has(fragment), `Missing heading: ${file} -> ${target}`);
      if (isJapaneseDocument(destination)) assert.match(label, /日本語|Japanese/, `English workflow requires Japanese reference: ${file} -> ${target}`);
    }
    checked++;
  }
  for (const file of documents.filter(file => file.endsWith('.en.md'))) await inspect(resolve(packageRoot, file), packageRoot);
  await inspect(resolve(packageRoot, 'README.md'), packageRoot, false); // Deliberate Japanese human-facing summary.
  for (const directory of ['skills/ui-development', 'assets/pdf-source']) {
    await inspect(resolve(packageRoot, directory, 'README.md'), packageRoot);
    await readFile(resolve(packageRoot, directory, 'README.ja.md'));
  }
  const sourceSkillRoot = resolve(packageRoot, 'skills/ui-development');
  const instructions = await verifySkillInstructionCopies(sourceSkillRoot, generatedSkillRoot);
  const skillRoots = [sourceSkillRoot, ...(generatedSkillRoot ? [resolve(generatedSkillRoot)] : [])];
  for (const root of skillRoots) {
    for (const file of instructions) await inspect(resolve(root, file), root === sourceSkillRoot ? packageRoot : root);
    for (const retired of ['SKILL.en.md', 'SKILL.ja.md']) {
      await assert.rejects(readFile(resolve(root, retired)), { code: 'ENOENT' });
    }
  }
  if (generatedSkillRoot) {
    const expectedCopies = await renderSkillDocumentation(packageRoot);
    const references = resolve(generatedSkillRoot, 'references');
    const entries = await readdir(resolve(references, 'docs'), { recursive: true, withFileTypes: true });
    const actualDocs = entries.filter(entry => !entry.isDirectory()).map(entry =>
      relative(references, resolve(entry.parentPath, entry.name)).split(sep).join('/'));
    assert.deepEqual(actualDocs.sort(), [...expectedCopies.keys()].filter(path => path.startsWith('docs/')).sort(),
      'Generated package documentation files differ from installed version');
    for (const [file, expected] of expectedCopies) {
      const path = resolve(generatedSkillRoot, 'references', file);
      assert.ok((await lstat(path)).isFile(), `Generated package reference must be a regular file: ${file}`);
      assert.equal(await readFile(path, 'utf8'), expected, `Generated package reference differs from installed version: ${file}`);
      if (file.endsWith('.en.md')) await inspect(path, generatedSkillRoot);
    }
  }
  if (generatedSkillRoot) for (const file of ['README.md', 'README.ja.md']) {
    await assert.rejects(readFile(resolve(generatedSkillRoot, file)), { code: 'ENOENT' }, 'Human-facing Skill READMEs are not AI instructions');
  }
  return { pairedDocuments: pairs.length, englishDocumentsChecked: checked };
}
