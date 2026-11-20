import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { checkSources } from '../../src/check/scanner.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import type { I18nChecks, SourceDiagnostic } from '../../src/check/types.ts';
import { parseConfig, resolveConfig } from '../../src/config.ts';

const config = await readFile(new URL('../../examples/ui.config.example.en.yaml', import.meta.url), 'utf8');
const i18n: I18nChecks = {
  functions: ['t', 'translation.label'],
  pipes: ['translate'],
  dictionaries: [{ file: 'messages.json', complete: true }],
  display_bindings: ['toastMessage'],
};
const messages = {
  'order.save': 'Save order',
  'order.field': 'Order reference',
  'order.count': { parameters: { count: 'number' } },
  'order.retry': 'Try again in {minutes} minutes',
};

async function consumer(t: TestContext, template: string) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-check-i18n-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const save = (file: string, content: string) => writeFile(resolve(root, file), content);
  await mkdir(resolve(root, 'src'));
  await save('src/order.html', template);
  await save('messages.json', JSON.stringify(messages));
  const manifest = parseConfig(config);
  manifest.checks = { source_roots: ['src'], approved_components: [], exceptions: [], i18n };
  return {
    save, checks: manifest.checks,
    async check(baselinePath?: string) {
      const resolved = resolveConfig(manifest);
      return checkSources({ root, config: resolved, policy: createSourcePolicy(resolved), baselinePath });
    },
  };
}

const i18nOnly = (items: SourceDiagnostic[]) => items.filter(item => item.rule.startsWith('i18n-'));

test('finds shown text and fixed server-error copy in app UI without flagging data, routes, IDs or Angular i18n', async t => {
  const fixture = await consumer(t, `<button data-testid="save-order" aria-label="Save">保存</button>
<input placeholder="Order reference" i18n-title title="Translated help" [value]="draft">
<button i18n>Native translation</button>
<button [attr.aria-label]="t('order.save')">{{ 'order.save' | translate }}</button>
<label [attr.aria-label]="translation.label('order.field')">{{ 'uiFoundation.actionControl.busy' | uiStableMessage }}</label>
<a href="/orders" [routerLink]="'/orders/closed'" [attr.data-code]="'ACTIVE'" i18n>Orders</a>
<app-notice [toastMessage]="failed ? errorByCode[code] : response.text"></app-notice>
<app-notice toastMessage="Please retry"></app-notice>
<p>{{ response.text }} {{ code }} {{ draft }}</p>
<p [attr.data-payload]="'USER_PAYLOAD'"></p>`);
  await fixture.save('src/order.ts', `import {Component} from '@angular/core';
@Component({selector:'app-notice',template:''}) class Notice {}
@Component({selector:'app-order',templateUrl:'./order.html',imports:[Notice]}) export class Order {
  readonly errorByCode = { EXPIRED: 'The order has expired' };
}
`);
  const report = await fixture.check();
  const findings = i18nOnly(report.diagnostics);
  assert.ok(report.valid, JSON.stringify(report.diagnostics));
  assert.deepEqual(findings.map(({ line, rule, severity }) => ({ line, rule, severity })), [1, 1, 2, 7, 8]
    .map(line => ({ line, rule: 'i18n-raw-text', severity: 'warning' })));
  assert.ok(findings.every(item => item.file === 'src/order.html' && item.column > 0 && item.suggestion.includes('i18n')));
});

test('checks required arguments and literal types on application functions, registered pipes and built-ins', async t => {
  const fixture = await consumer(t, `<span>{{ t('order.count') }}</span>
<span>{{ 'order.count' | translate:{ count: 'two' } }}</span>
<span>{{ 'uiFoundation.listbox.selectedCount' | uiStableMessage:{ count: 'two' } }}</span>
<span>{{ t('order.retry') }}</span>
<span>{{ t('order.count', { count: 2 }) }}</span>
<span>{{ t('order.retry', { minutes: 2 }) }}</span>
<span>{{ 'uiFoundation.listbox.selectedCount' | uiStableMessage:{ count: 2 } }}</span>
<span>{{ 'uiFoundation.unknown' | uiStableMessage }}</span>`);
  await fixture.save('src/order.ts', `import {injectUiMessage} from '../.ui/generated/angular/core';
declare function t(id: string, args?: Record<string, unknown>): string;
const wrongCount: string = 'two';
export const appMessage = t('order.count', { count: wrongCount });
const builtInText = injectUiMessage();
export const libraryMessage = builtInText({id:'uiFoundation.listbox.selectedCount', parameters:{count:'two'}});
`);
  const report = await fixture.check();
  assert.equal(report.valid, false);
  const errors = i18nOnly(report.diagnostics);
  assert.deepEqual(errors.map(item => [item.file, item.line, item.rule, item.severity]), [
    ['src/order.html', 1, 'i18n-message-arguments', 'error'],
    ['src/order.html', 2, 'i18n-message-arguments', 'error'],
    ['src/order.html', 3, 'i18n-message-arguments', 'error'],
    ['src/order.html', 4, 'i18n-message-arguments', 'error'],
    ['src/order.html', 8, 'i18n-message-reference', 'error'],
    ['src/order.ts', 4, 'i18n-message-arguments', 'error'],
    ['src/order.ts', 6, 'i18n-message-arguments', 'error'],
  ]);
  assert.match(errors[0].message, /requires.+count/);
  assert.match(errors[1].message, /count.+number/);
});

test('distinguishes unresolved references and fragments from legacy calls and honors opt-in', async t => {
  const fixture = await consumer(t, `<p>{{ t(activeId) }}</p>
<p>{{ t('lazy.notice') }}</p>
<p>{{ t('order.count', pendingArgs) }}</p>
<p>{{ t('order.save') + recipient }}</p>
<p>{{ '保存してください' | uiMessage }}</p>
<p>{{ t('保存してください') }}</p>`);
  fixture.checks.i18n = { ...i18n, dictionaries: [{ file: 'messages.json', complete: false }] };
  const report = await fixture.check();
  const findings = i18nOnly(report.diagnostics);
  assert.deepEqual(findings.map(item => [item.line, item.rule, item.severity]), [
    [1, 'i18n-unconfirmed', 'warning'], [2, 'i18n-unconfirmed', 'warning'],
    [3, 'i18n-unconfirmed', 'warning'], [4, 'i18n-fragment', 'warning'],
    [5, 'i18n-legacy-key', 'error'], [6, 'i18n-legacy-key', 'error'],
  ]);
  assert.match(findings[0].message, /statically/);
  assert.match(findings[1].suggestion, /lazy-loaded/);
  delete fixture.checks.i18n;
  assert.deepEqual(i18nOnly((await fixture.check()).diagnostics), []);
});

test('catches a dictionary-only deletion with a baseline and applies a single reasoned exception', async t => {
  const fixture = await consumer(t, `<button>{{ t('order.save') }}</button>
<button>{{ t('order.existing') }}</button>
<button aria-label="Emergency">!</button>`);
  const baseline = await fixture.check();
  assert.deepEqual(i18nOnly(baseline.diagnostics).map(item => item.rule), ['i18n-message-reference', 'i18n-raw-text']);
  await fixture.save('baseline.json', JSON.stringify(baseline));
  const { 'order.save': _removed, ...remaining } = messages;
  await fixture.save('messages.json', JSON.stringify(remaining));
  fixture.checks.exceptions.push({
    file: 'src/order.html', rule: 'i18n-raw-text', source: 'aria-label="Emergency"',
    reason: 'Regulatory copy may change only after the next compliance review.',
  });
  const report = await fixture.check('baseline.json');
  assert.equal(report.valid, false);
  assert.deepEqual(report.diagnostics.map(item => [item.rule, item.line]), [['i18n-message-reference', 1]]);
  assert.deepEqual(report.existing_diagnostics?.map(item => [item.rule, item.line]), [['i18n-message-reference', 2]]);
  assert.deepEqual(report.exceptions.map(item => [item.rule, item.line, item.exception]), [
    ['i18n-raw-text', 3, fixture.checks.exceptions[0].reason],
  ]);
});
