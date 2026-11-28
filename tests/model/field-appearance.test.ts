import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fieldCharacterWidth, fieldHintPosition } from '../../templates/angular/field-appearance.ts';

test('field hints preserve after as an available legacy placement and support before', () => {
  assert.equal(fieldHintPosition('after'), 'after');
  assert.equal(fieldHintPosition('before'), 'before');
  for (const invalid of [null, undefined, 'inline', 1]) assert.throws(() => fieldHintPosition(invalid), /hintPosition/);
});
test('character width is optional, integral and positive without changing value constraints', () => {
  assert.equal(fieldCharacterWidth(null), null);
  assert.equal(fieldCharacterWidth(12), 12);
  for (const invalid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => fieldCharacterWidth(invalid), /controlCharacters/);
});
