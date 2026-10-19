import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { renderSkillDocumentation } from '../../src/skill-docs.ts';
import { syncProject } from '../../src/sync.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('own MIT license is byte-identical, owned and protected in generated output and Skill', async t => {
  const project = await mkdtemp(resolve(tmpdir(), 'ui-foundation-license-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const config = (await readFile(resolve(root, 'examples/ui.config.example.yaml'), 'utf8')).replace(/\nchecks:\n[\s\S]*$/, '\n');
  await writeFile(resolve(project, 'ui.config.yaml'), config);
  const applicationLicense = 'Application-owned license; do not replace.\n';
  await writeFile(resolve(project, 'LICENSE'), applicationLicense);
  const source = await readFile(resolve(root, 'LICENSE'));
  const paths = ['.ui/generated/UI-FOUNDATION-LICENSE.txt', '.agents/skills/project-ui/UI-FOUNDATION-LICENSE.txt'];
  await syncProject({ root: project });
  const manifest = JSON.parse(await readFile(resolve(project, '.ui/generated/manifest.json'), 'utf8'));
  for (const path of paths) {
    assert.deepEqual(await readFile(resolve(project, path)), source, path);
    assert.equal(manifest.files[path].sha256, createHash('sha256').update(source).digest('hex'), path);
    await writeFile(resolve(project, path), 'application manual edit\n');
    await assert.rejects(syncProject({ root: project }), /Generated file was edited/);
    assert.equal(await readFile(resolve(project, path), 'utf8'), 'application manual edit\n');
    await writeFile(resolve(project, path), source);
  }
  assert.equal(await readFile(resolve(project, 'LICENSE'), 'utf8'), applicationLicense);
  assert.deepEqual(await syncProject({ root: project }), { changes: [], written: false });

  // A new destination must not silently adopt an existing app-owned license.
  await rm(resolve(project, '.ui'), { recursive: true });
  await rm(resolve(project, '.agents'), { recursive: true });
  for (const path of paths) {
    const destination = resolve(project, path);
    await mkdir(resolve(destination, '..'), { recursive: true });
    await writeFile(destination, applicationLicense);
    await assert.rejects(syncProject({ root: project }), /Unowned file/);
    assert.equal(await readFile(destination, 'utf8'), applicationLicense);
    await rm(destination);
  }
});

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
