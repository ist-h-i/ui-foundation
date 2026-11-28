import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CORE_ROLES, OPTIONAL_ROLE_FALLBACKS, withOptionalRoleFallbacks } from '../../src/roles.ts';

test('new heading roles are optional and derived from the effective mapping', () => {
  const legacy = { 'text.heading': 'legacy-heading', 'text.body': 'legacy-body' };
  const next = withOptionalRoleFallbacks(legacy);
  assert.equal(next['text.page-title'], 'legacy-heading');
  assert.equal(next['text.section-title'], 'legacy-heading');
  assert.equal(next['text.subheading'], 'legacy-body');
  assert.deepEqual(legacy, { 'text.heading': 'legacy-heading', 'text.body': 'legacy-body' });
  for (const role of Object.keys(OPTIONAL_ROLE_FALLBACKS)) assert.equal(Object.hasOwn(CORE_ROLES, role), false);
});

test('explicit per-profile mappings win and missing required roles are not invented', () => {
  const next = withOptionalRoleFallbacks({ 'text.heading': 'dense-heading', 'text.body': 'dense-body', 'text.section-title': 'dense-section' });
  assert.equal(next['text.page-title'], 'dense-heading');
  assert.equal(next['text.section-title'], 'dense-section');
  assert.equal(next['text.subheading'], 'dense-body');
  assert.deepEqual(withOptionalRoleFallbacks({}), {});
});
