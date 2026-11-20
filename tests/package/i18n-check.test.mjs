import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse, stringify } from 'yaml';
import { assertFrozenCandidate, prepareCandidate } from '../../scripts/package-verification/candidate.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const options = { encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } };
const execute = (file, args, cwd) => execFileSync(file, args, { ...options, cwd });
const generatedSkill = '.agents/skills/project-ui';

function documentationExample(mark, language, docs) {
  const marker = mark ? `<!-- i18n-check: ${mark} -->` : '## Translation checks';
  const start = docs.indexOf(marker);
  assert.ok(start >= 0, `Missing documented example for ${mark ?? language}`);
  const lines = docs.slice(start).split('\n');
  const lower = lines.indexOf('```' + language);
  const upper = lines.indexOf('```', lower + 1);
  assert.ok(lower >= 0 && upper > lower, `Missing ${language} block for ${mark ?? language}`);
  return lines.slice(lower + 1, upper).join('\n') + '\n';
}

test('packed CLI and generated checker agree on the synced translation guide examples', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-package-i18n-'));
  let candidate;
  t.after(async () => {
    try { if (candidate) await assertFrozenCandidate(candidate); }
    finally { await rm(root, { recursive: true, force: true }); }
  });
  candidate = await prepareCandidate({ repository, root, execute });
  const app = resolve(root, 'consumer');
  await mkdir(resolve(app, 'src'), { recursive: true });
  const save = (path, text) => writeFile(resolve(app, path), text);
  const read = path => readFile(resolve(app, path), 'utf8');
  await save('package.json', '{"private":true,"type":"module"}');
  execute('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false', candidate.tarball], app);
  const bin = resolve(app, 'node_modules/.bin/ui-foundation');
  execute(bin, ['init'], app);
  const installed = 'node_modules/' + candidate.manifest.name;
  const guidePath = 'docs/static-checks.en.md';
  const authorGuide = await read(`${installed}/${guidePath}`);
  const configuration = parse(await read('ui.config.yaml'));
  configuration.checks = parse(documentationExample(null, 'yaml', authorGuide)).checks;
  await save('ui.config.yaml', stringify(configuration));
  await save('src/orders.messages.json', documentationExample(null, 'json', authorGuide));
  execute(bin, ['sync'], app);
  const guide = await read(`${generatedSkill}/references/${guidePath}`);
  const japanese = await read(`${generatedSkill}/references/docs/static-checks.ja.md`);
  const skill = await read(`${generatedSkill}/SKILL.md`);
  const reference = await read(`${generatedSkill}/references/i18n-check.md`);
  assert.match(skill, /\]\(references\/i18n-check\.md\)/);
  assert.match(reference, /\]\(docs\/static-checks\.en\.md#translation-checks\)/);
  assert.match(japanese, /翻訳漏れの検査/);
  assert.match(await read(`${generatedSkill}/references/docs/ui-library-consumer-guide.en.md`),
    /\]\(static-checks\.en\.md#translation-checks\)/);
  assert.match(await read(`${generatedSkill}/references/docs/ui-library-consumer-guide.ja.md`),
    /\]\(static-checks\.ja\.md#翻訳漏れの検査\)/);

  const args = ['--format', 'json'];
  function check(status) {
    const cli = spawnSync(bin, ['check', ...args], { ...options, cwd: app });
    const standalone = spawnSync(process.execPath, [configuration.output + '/check-ui.cjs', ...args], { ...options, cwd: app });
    for (const result of [cli, standalone]) {
      assert.ifError(result.error);
      assert.equal(result.status, status, result.stdout + result.stderr);
    }
    const report = JSON.parse(cli.stdout).source;
    assert.deepEqual(report, JSON.parse(standalone.stdout));
    return report;
  }

  const cases = [
    { name: 'before', exit: 1, expected: [
      [1, 'i18n-raw-text', 'warning'], [1, 'i18n-raw-text', 'warning'], [2, 'i18n-message-arguments', 'error'],
    ] },
    { name: 'after', exit: 0, expected: [] },
  ];
  for (const { name, exit, expected } of cases) {
    const html = documentationExample(name, 'html', guide);
    assert.equal(documentationExample(name, 'html', japanese), html);
    await save('src/order.html', html);
    const report = check(exit);
    assert.deepEqual(report.diagnostics.map(item => [item.line, item.rule, item.severity]), expected);
  }

  const dictionary = JSON.parse(await read('src/orders.messages.json'));
  delete dictionary['order.save'];
  await save('src/orders.messages.json', JSON.stringify(dictionary));
  const missing = check(1);
  assert.deepEqual(missing.diagnostics.map(item => [item.line, item.rule, item.severity]), [
    [1, 'i18n-message-reference', 'error'], [1, 'i18n-message-reference', 'error'],
  ]);
});
