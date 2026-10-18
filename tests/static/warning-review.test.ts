import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import type { SourceDiagnostic, SourceReport } from '../../src/check/types.ts';
import { checkWarningReviews, matchWarningReviews, parseWarningReviewRegistry, warningReviewInputs } from '../../src/warning-review.ts';

const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const owner = 'templates/panel.ts', evidence = 'tests/panel.test.ts';
const warning: SourceDiagnostic = { file: owner, line: 2, column: 5, rule: 'unresolved', severity: 'warning',
  message: 'Measured width cannot be closed statically.', source: '[style.width.px]="width()"', suggestion: 'Review the runtime geometry.' };
const report = (diagnostics: SourceDiagnostic[] = [warning]): SourceReport => ({ status: 'warnings', valid: true, files: 1, checked: 1, diagnostics, exceptions: [] });
const record = () => ({ id: 'W001', diagnostic: { ...warning }, category: 'layout-measurement', detail: 'resize-observer-width',
  disposition: 'retained-warning', source_sha256: digest('measured width\n'), producer: 'ResizeObserver supplies the current content width.',
  reason: 'The host width depends on the rendered content box.', verified_scope: 'The resize regression checks a finite resize and detach sequence.',
  remaining_scope: 'Arbitrary layout, user CSS, and observer timing remain unknown.', recheck_when: ['Resize or teardown logic changes.'],
  evidence: [{ file: evidence, anchor: 'finite resize and detach', sha256: digest('finite resize and detach\n'), scope: 'Finite resize and teardown regression source.' }],
  producer_static_status: 'Unknown', universal_runtime_status: 'Unknown' });
const registryInput = () => ({ schema_version: 1, inputs: Object.fromEntries(warningReviewInputs.map(file => [file, digest('analysis input\n')])), reviews: [record()] });
const registry = () => parseWarningReviewRegistry(registryInput());
async function fixture(t: { after: (callback: () => Promise<void>) => void }) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-warning-review-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const save = async (file: string, text: string) => { await mkdir(dirname(resolve(root, file)), { recursive: true }); await writeFile(resolve(root, file), text); };
  for (const file of warningReviewInputs) await save(file, 'analysis input\n');
  await save(owner, 'measured width\n'); await save(evidence, 'finite resize and detach\n');
  const writeRegistry = async (input = registryInput()) => save('docs/ui-warning-reviews.json', JSON.stringify(input));
  await writeRegistry();
  return { root, save, writeRegistry };
}

test('a classified warning retains the original diagnostic and its Unknown boundary', () => {
  const source = report(); const before = structuredClone(source);
  Object.freeze(source.diagnostics); Object.freeze(source);
  const result = matchWarningReviews(source, registry());
  assert.equal(result.valid, true); assert.equal(result.classified, 1); assert.equal(result.source_errors, 0);
  assert.equal(result.classified_warnings[0].id, 'W001');
  assert.equal(result.classified_warnings[0].producer_static_status, 'Unknown');
  assert.equal(result.classified_warnings[0].universal_runtime_status, 'Unknown');
  assert.equal(result.categories['layout-measurement'], 1); assert.deepEqual(source, before);
});

test('unclassified warnings cannot borrow another location, source, rule, or message review', () => {
  for (const change of [{ file: 'templates/sibling.ts' }, { line: 3 }, { column: 6 }, { rule: 'another-rule' }, { source: 'different code' }, { message: 'different uncertainty' }]) {
    const result = matchWarningReviews(report([{ ...warning, ...change }]), registry());
    assert.equal(result.valid, false); assert.equal(result.classified, 0);
    assert.equal(result.unclassified_warnings.length, 1); assert.deepEqual(result.stale_reviews, ['W001']);
  }
});

test('removed warnings and duplicated runtime diagnostics require a fresh classification', () => {
  const stale = matchWarningReviews({ ...report([]), status: 'passed' }, registry());
  assert.equal(stale.valid, false); assert.deepEqual(stale.stale_reviews, ['W001']);
  const duplicate = matchWarningReviews(report([warning, { ...warning }]), registry());
  assert.equal(duplicate.valid, false); assert.ok(duplicate.issues.some(issue => issue.code === 'duplicate-diagnostic'));
});

test('errors and unconfigured or invalid source checks cannot be approved through warning reviews', () => {
  const error = { ...warning, severity: 'error' as const };
  const result = matchWarningReviews({ ...report([error]), status: 'failed', valid: false }, registry());
  assert.equal(result.valid, false); assert.equal(result.source_errors, 1); assert.equal(result.classified, 0);
  assert.equal(error.severity, 'error');
  const empty = parseWarningReviewRegistry({ ...registryInput(), reviews: [] });
  for (const change of [{ status: 'not_configured' as const }, { valid: false }, { status: 'failed' as const }]) {
    assert.equal(matchWarningReviews({ ...report([]), ...change }, empty).valid, false);
  }
});

test('warning review configuration rejects empty reasons, unknown fields, duplicate identities and invalid proofs', () => {
  const changes: ((input: ReturnType<typeof registryInput>) => void)[] = [
    input => { input.schema_version = 2; },
    input => { input.reviews[0].reason = ' '; },
    input => { input.reviews[0].verified_scope = ''; },
    input => { input.reviews[0].verified_scope = { scope: 'un-normalized audit object' } as unknown as string; },
    input => { input.reviews[0].remaining_scope = ''; },
    input => { input.reviews[0].recheck_when = []; },
    input => { input.reviews[0].evidence = []; },
    input => { input.reviews[0].evidence[0].anchor = ' '; },
    input => { input.reviews[0].evidence[0].file = 'tests/notes.md'; },
    input => { input.reviews[0].source_sha256 = 'invalid'; },
    input => { input.reviews[0].category = 'unclassified'; },
    input => { input.reviews[0].diagnostic.severity = 'error'; },
    input => { input.reviews.push(structuredClone(input.reviews[0])); },
    input => { input.reviews.push({ ...structuredClone(input.reviews[0]), id: 'W002' }); },
    input => { delete input.inputs[warningReviewInputs[0]]; },
    input => { (input as unknown as Record<string, unknown>).allow_all = true; },
  ];
  for (const change of changes) { const input = registryInput(); change(input); assert.throws(() => parseWarningReviewRegistry(input), /Invalid warning reviews/); }
});

test('actual source, checker, configuration and test dependency drift invalidate a classification', async t => {
  const { root, save } = await fixture(t);
  assert.equal((await checkWarningReviews(root, report())).valid, true);
  for (const file of [owner, evidence, warningReviewInputs[0], 'src/check/styles.ts']) {
    const original = await readFile(resolve(root, file), 'utf8');
    await save(file, '!' + original.slice(1));
    const changed = await checkWarningReviews(root, report());
    assert.equal(changed.valid, false); assert.ok(changed.issues.some(issue => issue.code === 'proof-drift' && issue.file === file), file);
    await save(file, original);
  }
  assert.equal((await checkWarningReviews(root, report())).valid, true);
});

test('a matching file hash cannot make a missing evidence anchor or conflicting proof valid', async t => {
  const { root, writeRegistry } = await fixture(t);
  const input = registryInput(); input.reviews[0].evidence[0].anchor = 'absent assertion'; await writeRegistry(input);
  const missing = await checkWarningReviews(root, report()); assert.equal(missing.valid, false);
  assert.ok(missing.issues.some(issue => issue.code === 'missing-anchor'));
  input.reviews[0].evidence.push({ ...input.reviews[0].evidence[0], sha256: digest('different bytes') }); await writeRegistry(input);
  assert.equal((await checkWarningReviews(root, report())).valid, false);
});

test('missing evidence and symlink files fail without reading an outside target', async t => {
  const { root, save } = await fixture(t);
  await rm(resolve(root, evidence));
  let result = await checkWarningReviews(root, report()); assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === 'proof-read-error' && issue.file === evidence));
  const outside = await mkdtemp(resolve(tmpdir(), 'ui-warning-outside-')); t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(resolve(outside, 'test.ts'), 'finite resize and detach\n');
  await symlink(resolve(outside, 'test.ts'), resolve(root, evidence));
  result = await checkWarningReviews(root, report()); assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === 'proof-read-error' && issue.message.includes('Symlink')));
  await rm(resolve(root, evidence)); await save(evidence, 'finite resize and detach\n');
  await rm(resolve(root, 'docs/ui-warning-reviews.json')); await symlink(resolve(outside, 'test.ts'), resolve(root, 'docs/ui-warning-reviews.json'));
  await assert.rejects(checkWarningReviews(root, report()), /Symlink/);
});

test('unsafe review paths are rejected before accessing project evidence', () => {
  for (const file of ['/tmp/private', '../outside.ts', 'tests/../outside.ts', 'tests\\outside.ts', 'C:/outside.ts', 'tests//case.ts', '.git/config', 'node_modules/x.ts']) {
    const input = registryInput(); input.reviews[0].evidence[0].file = file;
    assert.throws(() => parseWarningReviewRegistry(input), /Invalid warning reviews/);
  }
});

test('warning review CLI reports invalid options in JSON before starting project analysis', () => {
  const run = spawnSync(process.execPath, ['--import', 'tsx', 'src/warning-review-cli.ts', '--format', 'json', '--unknown'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8', timeout: 20_000 });
  assert.equal(run.error, undefined); assert.equal(run.status, 1);
  const output = JSON.parse(run.stdout); assert.equal(output.valid, false); assert.match(output.error, /Unknown option/);
});
