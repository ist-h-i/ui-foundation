import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
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

const consumerDocuments = ['docs/components.ja.md', 'docs/ui-library-consumer-guide.ja.md', 'docs/npm-beta-readiness.ja.md', 'docs/npm-beta-release-notes.ja.md', 'docs/commands.ja.md'];

async function documentationFixture(t: TestContext) {
  const fixture = await mkdtemp(resolve(tmpdir(), 'ui-foundation-skill-docs-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const files = ['docs/commands.md', 'docs/ui-library-api.json', 'examples/ui.config.example.yaml'];
  await mkdir(resolve(fixture, 'docs/adr'), { recursive: true });
  await mkdir(resolve(fixture, 'examples'), { recursive: true });
  await writeFile(resolve(fixture, 'package.json'), JSON.stringify({ files }));
  await writeFile(resolve(fixture, 'docs/commands.md'), '[API](ui-library-api.json) [example](../examples/ui.config.example.yaml) [authoring](development.md) [external](https://example.com/)\n');
  await writeFile(resolve(fixture, 'docs/ui-library-api.json'), '{}\n');
  await writeFile(resolve(fixture, 'examples/ui.config.example.yaml'), 'schema: 1\n');
  await writeFile(resolve(fixture, 'docs/development.md'), 'Developer instructions must not be copied.\n');
  await writeFile(resolve(fixture, 'docs/adr/0001-private.md'), 'An unlisted ADR must not be copied.\n');
  return { fixture, files };
}

test('generated Skill selects only explicit package documentation, excluding newly added developer documents', async t => {
  const { fixture, files } = await documentationFixture(t);
  const docs = await renderSkillDocumentation(fixture);
  assert.deepEqual([...docs.keys()].sort(), [...files].sort());
  assert.equal(docs.has('docs/development.md'), false);
  assert.equal(docs.has('docs/adr/0001-private.md'), false);
  const commands = docs.get('docs/commands.md')!;
  assert.match(commands, /\[API\]\(ui-library-api\.json\)/);
  assert.match(commands, /\[example\]\(\.\.\/examples\/ui\.config\.example\.yaml\)/);
  assert.match(commands, /\[external\]\(https:\/\/example\.com\/\)/);
  assert.doesNotMatch(commands, /\[authoring\]\(development\.md\)/);
  await writeFile(resolve(fixture, 'docs/new-maintainer-playbook.md'), 'Future internal work.\n');
  assert.deepEqual(await renderSkillDocumentation(fixture), docs, 'a new unlisted document must not change generated references');
});

test('generated Skill fails closed for missing allowlisted documents, glob entries and symlink sources', async t => {
  for (const scenario of ['missing', 'glob', 'symlink'] as const) await t.test(scenario, async t => {
    const { fixture, files } = await documentationFixture(t);
    if (scenario === 'glob') {
      await writeFile(resolve(fixture, 'package.json'), JSON.stringify({ files: [...files, 'docs/*.md'] }));
    } else {
      await rm(resolve(fixture, 'docs/commands.md'));
      if (scenario === 'symlink') await symlink('development.md', resolve(fixture, 'docs/commands.md'));
    }
    await assert.rejects(renderSkillDocumentation(fixture), scenario === 'missing' ? /commands\.md|ENOENT/ : scenario === 'glob' ? /glob|explicit|allowlist|invalid/i : /symlink/i);
  });
});

test('generated Skill consumer documents and links resolve without checkout or node_modules', async () => {
  const docs = await renderSkillDocumentation();
  const metadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const allowed = metadata.files.filter((path: string) => path.startsWith('docs/'));
  assert.ok(allowed.every((path: string) => /^docs\/[a-z0-9-]+(?:\.ja)?\.(?:md|json)$/.test(path)), 'documentation paths must be explicit files');
  assert.deepEqual([...docs.keys()].sort(), [...allowed, 'examples/ui.config.example.yaml'].sort());
  for (const path of [...consumerDocuments, 'docs/ui-components.md', 'docs/design.md', 'docs/ui-library-api.json']) assert.ok(docs.has(path), `missing ${path}`);
  assert.ok(![...docs.keys()].some(path => /(?:development|implementation-plan|release-plan|matrix|verification|^docs\/adr\/)/.test(path)));
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

test('resync retires an unchanged formerly owned developer document and protects unowned or edited documents', async t => {
  const project = await mkdtemp(resolve(tmpdir(), 'ui-foundation-retired-docs-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const config = (await readFile(resolve(root, 'examples/ui.config.example.yaml'), 'utf8')).replace(/\nchecks:\n[\s\S]*$/, '\n');
  await writeFile(resolve(project, 'ui.config.yaml'), config);
  await syncProject({ root: project });
  const retired = '.agents/skills/project-ui/references/docs/development.md';
  const manifestPath = resolve(project, '.ui/generated/manifest.json');
  const legacy = 'Former generated developer documentation.\n';
  await writeFile(resolve(project, retired), legacy);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.files[retired] = { sha256: createHash('sha256').update(legacy).digest('hex') };
  await writeFile(manifestPath, JSON.stringify(manifest));
  const dryRun = await syncProject({ root: project, dryRun: true });
  assert.ok(dryRun.changes.some(change => change.path === retired && change.kind === 'delete'));
  assert.equal(await readFile(resolve(project, retired), 'utf8'), legacy);
  await writeFile(resolve(project, retired), 'Consumer edited documentation.\n');
  await assert.rejects(syncProject({ root: project }), /Generated file was edited/);
  assert.equal(await readFile(resolve(project, retired), 'utf8'), 'Consumer edited documentation.\n');
  await writeFile(resolve(project, retired), legacy);
  const result = await syncProject({ root: project });
  assert.ok(result.changes.some(change => change.path === retired && change.kind === 'delete'));
  await assert.rejects(readFile(resolve(project, retired)), { code: 'ENOENT' });
  assert.equal(JSON.parse(await readFile(manifestPath, 'utf8')).files[retired], undefined);
  const unowned = 'Application-owned developer guidance.\n';
  await writeFile(resolve(project, retired), unowned);
  const before = await readFile(manifestPath);
  await assert.rejects(syncProject({ root: project }), /Unowned file/);
  assert.equal(await readFile(resolve(project, retired), 'utf8'), unowned);
  assert.deepEqual(await readFile(manifestPath), before, 'an ownership conflict must leave the manifest intact');
});
