import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { uiProfiles } from '../../.ui/generated/profiles';

type DisplayProfile = 'guided' | 'dense';
const pageErrors = new WeakMap<Page, string[]>();
const profileStyles = {
  guided: { backgroundColor: 'rgb(24, 86, 166)', fontSize: '18px', paddingX: '24px', paddingY: '12px', radius: '12px', tableX: '16px', tableY: '12px' },
  dense: { backgroundColor: 'rgb(23, 92, 58)', fontSize: '16px', paddingX: '16px', paddingY: '8px', radius: '4px', tableX: '12px', tableY: '8px' },
} satisfies Record<DisplayProfile, object>;

// These are the required roles in docs/design.md. Compare every role, including
// those omitted from a profile override, to catch inheritance from its parent.
const semanticVariables = [
  'color-text', 'color-muted', 'color-surface', 'color-background', 'color-border',
  'color-action', 'color-action-hover', 'color-on-action', 'color-danger', 'color-danger-hover',
  'color-on-danger', 'color-success', 'color-success-surface', 'color-warning', 'color-warning-surface',
  'color-error-surface', 'color-focus', 'color-disabled-surface', 'color-backdrop',
  'color-link', 'color-tab-selected',
  'font-body', 'text-body', 'text-small', 'text-heading', 'leading-body', 'leading-heading',
  'leading-control', 'weight-body', 'weight-heading', 'weight-control', 'space-page', 'space-section',
  'space-field', 'space-control-x', 'space-control-y', 'space-control-gap', 'space-table-x', 'space-table-y',
  'radius-control', 'radius-surface', 'size-control', 'size-icon', 'size-dialog', 'size-content',
  'border-control', 'border-focus', 'border-focus-offset', 'motion-duration', 'motion-easing',
].map((role) => `--ui-${role}`);

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', uiProfiles.defaultProfile);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function setProfile(page: Page, profile: DisplayProfile): Promise<void> {
  await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
  await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', profile);
  // Pointer hover is a different semantic role from the normal action color.
  await page.mouse.move(0, 0);
}

async function appearance(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      borderRadius: style.borderRadius,
    };
  });
}

async function semanticMapping(locator: Locator): Promise<Record<string, string>> {
  return locator.evaluate((element, variables) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(variables.map((variable) => [variable, style.getPropertyValue(variable).trim()]));
  }, semanticVariables);
}

test('初期profileと表示設定の選択肢を生成metadataから読み、未定義IDを拒否する', async ({ page }) => {
  const selector = page.getByLabel('表示設定', { exact: true });
  await expect(selector).toHaveValue(uiProfiles.defaultProfile);
  expect(await selector.locator('option').evaluateAll((options) => options.map((option) => ({
    id: (option as HTMLOptionElement).value, label: option.textContent?.trim(),
  })))).toEqual(uiProfiles.profiles);

  const name = page.getByLabel('申請名', { exact: false });
  await name.fill('選択肢を変えても保持する入力');
  await name.evaluate((element) => element.setAttribute('data-metadata-instance', 'same-input'));
  for (const profile of uiProfiles.profiles) {
    await selector.selectOption(profile.id);
    await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', profile.id);
    await expect(name).toHaveValue('選択肢を変えても保持する入力');
    await expect(name).toHaveAttribute('data-metadata-instance', 'same-input');
  }
  const beforeInvalid = await selector.inputValue();
  await selector.evaluate((element: HTMLSelectElement) => {
    const previous = element.value;
    const unknown = document.createElement('option');
    unknown.value = 'unknown-profile';
    element.append(unknown);
    element.value = unknown.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    unknown.remove();
    element.value = previous;
  });
  await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', beforeInvalid);
  await expect(name).toHaveValue('選択肢を変えても保持する入力');
  await expect(name).toHaveAttribute('data-metadata-instance', 'same-input');
});

test('guidedとdenseの切替を部品とTailwind utilityの実際の色・書体・文字・余白・角丸へ反映する', async ({ page }) => {
  const save = page.getByRole('button', { name: '変更を保存', exact: false });
  const utility = page.getByTestId('profile-utility');
  // Chromium can serialize BlinkMacSystemFont as "system-ui" on macOS.
  // Normalize the independently specified expected font with the same browser.
  const expectedFontFamily = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    document.body.append(probe);
    const normalized = getComputedStyle(probe).fontFamily;
    probe.remove();
    return normalized;
  });
  for (const profile of ['guided', 'dense', 'guided'] as const) {
    await setProfile(page, profile);
    const values = profileStyles[profile];
    const expected = {
      backgroundColor: values.backgroundColor,
      color: 'rgb(255, 255, 255)',
      fontFamily: expectedFontFamily,
      fontSize: values.fontSize,
      paddingLeft: values.paddingX,
      paddingRight: values.paddingX,
      paddingTop: values.paddingY,
      paddingBottom: values.paddingY,
      borderRadius: values.radius,
    };
    await expect.poll(() => appearance(save)).toEqual(expected);
    expect(await appearance(utility)).toEqual(expected);
    const checkbox = page.getByLabel('内容を確認しました', { exact: false });
    expect(await checkbox.evaluate((element) => ({ width: getComputedStyle(element).width, height: getComputedStyle(element).height })))
      .toEqual({ width: '20px', height: '20px' });
    const cell = page.getByTestId('basic-table-row').first().getByRole('cell').first();
    expect(await cell.evaluate((element) => ({ x: getComputedStyle(element).paddingLeft, y: getComputedStyle(element).paddingTop })))
      .toEqual({ x: values.tableX, y: values.tableY });
  }
});

test('表示設定を変更しても同じDOMの入力・選択・部分欠損・非表示領域を保持する', async ({ page }) => {
  const name = page.getByLabel('申請名', { exact: false });
  const filter = page.getByLabel('一覧を絞り込む', { exact: false });
  await name.fill('表示を変えても残る入力');
  await page.getByLabel('申請区分', { exact: false }).selectOption('equipment');
  await page.getByLabel('内容を確認しました', { exact: false }).check();
  await page.locator('#application-form').getByLabel('補足', { exact: false }).fill('保持する判断材料');
  await filter.fill('備品');
  await name.evaluate((element) => element.setAttribute('data-profile-instance', 'same-name'));
  await filter.evaluate((element) => element.setAttribute('data-profile-instance', 'same-filter'));
  await page.getByLabel('一覧の状態', { exact: true }).selectOption('partial');
  await setProfile(page, 'dense');
  await expect(name).toHaveValue('表示を変えても残る入力');
  await expect(name).toHaveAttribute('data-profile-instance', 'same-name');
  await expect(page.getByLabel('申請区分', { exact: false })).toHaveValue('equipment');
  await expect(page.getByLabel('内容を確認しました', { exact: false })).toBeChecked();
  await expect(page.locator('#application-form').getByLabel('補足', { exact: false })).toHaveValue('保持する判断材料');
  await expect(filter).toHaveValue('備品');
  await expect(page.getByTestId('list-region')).toHaveAttribute('data-state', 'partial');
  await expect(page.getByRole('button', { name: '承認へ進む', exact: true })).toBeDisabled();

  await page.getByLabel('一覧の状態', { exact: true }).selectOption('error');
  await expect(filter).toBeHidden();
  await setProfile(page, 'guided');
  await expect(filter).toBeHidden();
  await expect(page.getByTestId('list-region')).toHaveAttribute('data-state', 'error');
  await expect(filter).toHaveAttribute('data-profile-instance', 'same-filter');
  await page.getByTestId('list-region').getByRole('button', { name: '一覧を再取得', exact: false }).click();
  await expect(filter).toBeVisible();
  await expect(filter).toHaveValue('備品');
  await expect(name).toHaveValue('表示を変えても残る入力');
  await expect(page.getByTestId('retry-count')).toHaveText('一覧再取得: 1');
  await expect(page.getByTestId('save-count')).toHaveText('保存要求: 0');
});

test('処理中の表示設定変更でも一回の保存処理と完了結果を保持する', async ({ page }) => {
  const time = new Date('2026-10-05T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  const save = page.getByRole('button', { name: '変更を保存', exact: false });
  await page.getByLabel('申請名', { exact: false }).fill('処理中に表示を変更した申請');
  await save.click();
  await page.clock.runFor(20);
  await expect(save).toBeDisabled();
  await expect(save).toHaveAttribute('aria-busy', 'true');
  await page.getByLabel('表示設定', { exact: true }).selectOption('dense');
  await page.clock.runFor(20);
  await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', 'dense');
  await expect(save).toHaveAttribute('aria-busy', 'true');
  await expect(save).toContainText('変更を保存');
  await expect(save).toContainText('処理中');
  await save.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect(page.getByTestId('save-count')).toHaveText('保存要求: 1');
  await page.clock.runFor(600);
  await expect(save).toBeEnabled();
  await expect(page.getByTestId('saved-name')).toHaveText('処理中に表示を変更した申請');
  await expect(page.getByTestId('save-feedback')).toContainText('処理中に表示を変更した申請を保存しました。');
  await page.getByLabel('表示設定', { exact: true }).selectOption('guided');
  await page.clock.runFor(20);
  await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', 'guided');
  await expect(page.getByTestId('save-feedback')).toContainText('処理中に表示を変更した申請を保存しました。');
  await expect(page.getByTestId('save-count')).toHaveText('保存要求: 1');
});

test('入れ子のprofileは外側の全役割から独立し、部品とutilityの見た目も一致する', async ({ page }) => {
  const utility = page.getByTestId('profile-utility');
  const reference = {} as Record<DisplayProfile, { mapping: Record<string, string>; appearance: Awaited<ReturnType<typeof appearance>> }>;
  for (const profile of ['guided', 'dense'] as const) {
    await setProfile(page, profile);
    reference[profile] = { mapping: await semanticMapping(utility), appearance: await appearance(utility) };
    for (const variable of semanticVariables) expect(reference[profile].mapping[variable], variable).not.toBe('');
  }

  for (const outerProfile of ['dense', 'guided'] as const) {
    await setProfile(page, outerProfile);
    for (const [profile, actionId, utilityId] of [
      ['guided', 'nested-guided-action', 'nested-guided-utility'],
      ['dense', 'nested-dense-inner-action', 'nested-dense-utility'],
    ] as const) {
      const action = page.getByTestId(actionId);
      const nestedUtility = page.getByTestId(utilityId);
      expect(await semanticMapping(action)).toEqual(reference[profile].mapping);
      expect(await semanticMapping(nestedUtility)).toEqual(reference[profile].mapping);
      expect(await appearance(action)).toEqual(reference[profile].appearance);
      expect(await appearance(nestedUtility)).toEqual(reference[profile].appearance);
    }
  }
});

for (const profile of ['guided', 'dense'] as const) {
  test(`${profile}の処理中リンク・操作・展開状態にaxe違反がなく、キーボードfocusを維持する`, async ({ page }) => {
    await setProfile(page, profile);
    await page.getByLabel('詳細リンクを処理中にする', { exact: true }).check();
    await page.getByLabel('長いラベルの操作を処理中にする', { exact: true }).check();
    await page.getByTestId('optional-information').locator('summary').click();
    const link = page.getByRole('link', { name: '申請の詳細', exact: false });
    await expect(link).toHaveAttribute('aria-busy', 'true');
    await expect(link).toHaveAttribute('tabindex', '-1');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const selector = page.getByLabel('表示設定', { exact: true });
    await selector.focus();
    await page.keyboard.press('Tab');
    const name = page.getByLabel('申請名', { exact: false });
    await expect(name).toBeFocused();
    expect(await name.evaluate((element) => ({ width: getComputedStyle(element).outlineWidth, color: getComputedStyle(element).outlineColor })))
      .toEqual({ width: '3px', color: profileStyles[profile].backgroundColor });
  });
}
