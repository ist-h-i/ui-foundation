import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkCSS } from '../../src/check/styles.ts';
import type { SourceDiagnostic } from '../../src/check/types.ts';

const policy = createSourcePolicy(resolveConfig(parseConfig(await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8'))));
function inspect(css: string) {
  const diagnostics: SourceDiagnostic[] = [];
  checkCSS(css, { file: 'app.css', text: css, offset: 0 }, { policy, checked() {}, emit: d => diagnostics.push(d), customPropertyWrites: new Set() });
  return diagnostics;
}

test('a true alias cycle terminates while a finite semantic chain stays closed', () => {
  assert.ok(inspect('.consumer{--a:var(--b);--b:var(--a);padding:var(--a)}').some(d => d.rule === 'unresolved'));
  assert.deepEqual(inspect('.consumer{--a:var(--b);--b:var(--ui-space-field);padding:var(--a)}'), []);
});

test('deep alias expansion remains Unknown and never skips a literal outside the alias', () => {
  for (const depth of [12, 64]) {
    const definitions = Array.from({ length: depth }, (_, n) => `--a${n}:var(--a${n + 1});`).join('');
    const diagnostics = inspect(`.consumer{${definitions}--a${depth}:19px;padding:var(--a0) 23px}`);
    assert.equal(diagnostics.some(d => d.message.includes('Concrete value 19px ')), depth === 12);
    assert.ok(diagnostics.some(d => d.message.includes('Concrete value 23px ')));
    assert.equal(diagnostics.some(d => d.rule === 'unresolved'), depth === 64);
  }
});

test('wide alias alternatives stop with Unknown while later ordinary values are still checked', () => {
  const definitions = '--a:var(--ui-space-field);'.repeat(520);
  const diagnostics = inspect(`.consumer{${definitions}padding:var(--a) 23px}`);
  assert.ok(diagnostics.some(d => d.rule === 'unresolved'));
  assert.ok(diagnostics.some(d => d.message.includes('Concrete value 23px ')));
});

test('separate function argument categories inspect the same alias independently', () => {
  const diagnostics = inspect('.consumer{--a:var(--ui-color-text);color:rgb(var(--a) / var(--a))}');
  assert.ok(diagnostics.some(d => d.rule === 'token-category' && d.message.includes('opacity')));
});
