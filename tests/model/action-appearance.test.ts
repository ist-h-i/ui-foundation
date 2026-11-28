import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateMenu, selectMenuCheck, type MenuItem } from '../../templates/angular/menu-model.ts';
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
  assert.throws(() => resolveActionAppearance('invalid' as ActionVariant, 'primary', 'danger'), /variant/);
  assert.throws(() => resolveActionAppearance('secondary', 'invalid' as ActionEmphasis), /emphasis/);
  assert.throws(() => resolveActionAppearance('secondary', null, 'invalid' as ActionTone), /tone/);
});


test('menu commands retain an explicit danger tone and reject unknown tone values', () => {
  const items: readonly MenuItem[] = [{ id: 'remove', label: 'Remove', tone: 'danger' }, { id: 'check', label: 'Check', type: 'checkbox', checked: false }];
  assert.equal(validateMenu(items), items);
  assert.equal(selectMenuCheck(items, items[1]!)[0].tone, 'danger');
  assert.throws(() => validateMenu([{ id: 'bad', label: 'Bad', tone: 'unknown' as ActionTone }]), /tone/);
});
