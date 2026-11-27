import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRequestStep, validateStepNavigation, type StepNavigationItem } from '../../templates/angular/step-navigation-model.ts';

const items: readonly StepNavigationItem[] = [
  { id: 'first', label: 'First', status: 'complete', statusLabel: 'Complete', navigable: true },
  { id: 'second', label: 'Second', status: 'error', statusLabel: 'Review required', navigable: true },
  { id: 'third', label: 'Third', status: 'not-started', statusLabel: 'Not started', disabled: true, navigable: true },
];
test('current and step status are independent and app-owned', () => {
  assert.equal(validateStepNavigation(items, 'second'), items);
  assert.equal(items[1].status, 'error');
  assert.equal(validateStepNavigation(items, null), items);
  assert.throws(() => validateStepNavigation(items, 'missing'), /Current step/);
  assert.throws(() => validateStepNavigation([items[0], items[0]], null), /unique/);
  assert.throws(() => validateStepNavigation([{ ...items[0], statusLabel: '' }], null), /status label/);
});
test('navigation only requests explicitly allowed non-current steps', () => {
  assert.equal(canRequestStep(items[0], 'second', false), true);
  assert.equal(canRequestStep(items[0], 'second', true), false);
  assert.equal(canRequestStep(items[1], 'second', false), false);
  assert.equal(canRequestStep(items[2], 'second', false), false);
  assert.equal(canRequestStep({ ...items[0], navigable: false }, 'second', false), false);
});
