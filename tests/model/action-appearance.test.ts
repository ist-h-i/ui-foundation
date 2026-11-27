import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveActionAppearance, type ActionVariant, type ActionEmphasis, type ActionTone } from '../../templates/angular/action-appearance.ts';

test('legacy action variants retain their meanings', () => {
  const oldContract: Record<ActionVariant, [ActionEmphasis, ActionTone]> = {
    primary: ['primary', 'normal'], secondary: ['secondary', 'normal'], danger: ['primary', 'danger'],
  };
  for (const variant of Object.keys(oldContract) as ActionVariant[]) {
    const [emphasis, tone] = oldContract[variant];
    assert.deepEqual(resolveActionAppearance(variant), { emphasis, tone, toneConflict: false });
  }
});
test('explicit emphasis and tone support all six combinations', () => {
  for (const emphasis of ['primary', 'secondary', 'tertiary'] as const)
    for (const tone of ['normal', 'danger'] as const)
      assert.deepEqual(resolveActionAppearance('secondary', emphasis, tone), { emphasis, tone, toneConflict: false });
});
test('old danger remains visible during migration and invalid new axes fail', () => {
  assert.deepEqual(resolveActionAppearance('danger', 'secondary', 'normal'), {
    emphasis: 'secondary', tone: 'danger', toneConflict: true,
  });
  assert.deepEqual(resolveActionAppearance('danger', 'tertiary'), {
    emphasis: 'tertiary', tone: 'danger', toneConflict: false,
  });
  assert.throws(() => resolveActionAppearance('secondary', 'invalid' as ActionEmphasis), /emphasis/);
  assert.throws(() => resolveActionAppearance('secondary', null, 'invalid' as ActionTone), /tone/);
});
