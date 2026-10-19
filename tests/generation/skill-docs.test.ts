import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { renderSkillDocumentation } from '../../src/skill-docs.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('generated Skill operational documents and ADR links resolve without checkout or node_modules', async () => {
  const docs = await renderSkillDocumentation();
  for (const path of ['docs/ui-components.md', 'docs/npm-beta-readiness.ja.md', 'docs/design.md',
    'docs/adr/0001-overlay-escape.md', 'docs/adr/0002-collections-cdk.md', 'docs/adr/0003-virtual-native-tab.md',
    'docs/ui-library-api.json', 'docs/ui-library-matrix.json', 'examples/ui.config.example.yaml']) assert.ok(docs.has(path), `missing ${path}`);
  for (const [path, text] of docs) if (path.endsWith('.md')) {
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      assert.ok(docs.has(posix.normalize(posix.join(posix.dirname(path), target.split('#')[0]))), `broken ${path} -> ${target}`);
    }
  }
  const skill = await readFile(resolve(root, 'skills/ui-development/SKILL.md'), 'utf8');
  assert.doesNotMatch(skill, /プロジェクトルートの`docs\/|checkoutのsrc\/cli/);
  for (const match of skill.matchAll(/references\/(docs\/[^\s`）)]+?\.(?:md|json))/g)) assert.ok(docs.has(match[1]), `Skill reference missing ${match[1]}`);
});
