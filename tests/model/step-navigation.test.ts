import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRequestStep, validateStepNavigation, validateCurrentStepLabel, type StepNavigationItem } from '../../templates/angular/step-navigation-model.ts';

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


test('untyped input rejects invalid availability and preserves explicit state labels', () => {
  assert.throws(() => validateStepNavigation([{ ...items[0], navigable: 'false' as unknown as boolean }], null), /availability/);
  assert.throws(() => validateStepNavigation([{ ...items[0], disabled: 0 as unknown as boolean }], null), /availability/);
  assert.throws(() => validateStepNavigation([{ ...items[0], status: 'done' as StepNavigationItem['status'] }], null), /Unknown step status/);
  assert.throws(() => validateStepNavigation([{ ...items[0], id: 1 as unknown as string }], null), /Step IDs/);
});


test('the current-step marker is explicit, independent of status and supplied by the app', () => {
  assert.equal(validateCurrentStepLabel('Current step'), 'Current step');
  assert.equal(validateCurrentStepLabel('現在の段階'), '現在の段階');
  for (const value of ['', '  ', null, 1]) assert.throws(() => validateCurrentStepLabel(value), /current label/);
});
