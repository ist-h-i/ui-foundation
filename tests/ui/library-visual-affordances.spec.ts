import { test, expect } from './catalog-test';
import { uiProfiles } from '../../.ui/generated/profiles';

test('表示設定の初期選択と適用中のprofileが一致し、切替で入力を保持する', async ({ page }) => {
  for (const route of ['/catalog', '/catalog/actions', '/catalog/layout', '/catalog/feedback', '/catalog/navigation', '/catalog/floating']) {
    await page.goto(route);
    const main = page.locator('main'), setting = page.locator('select').filter({has:page.locator('option[value=guided]')}).filter({has:page.locator('option[value=dense]')}).first();
    await expect(main).toHaveAttribute('data-ui-profile', uiProfiles.defaultProfile);
    await expect(setting).toHaveValue(uiProfiles.defaultProfile);
    await setting.selectOption('dense');
    await expect(main).toHaveAttribute('data-ui-profile', 'dense');
    await expect(setting).toHaveValue('dense');
  }
  await page.goto('/catalog');
  const title = page.getByRole('textbox', { name: '件名 必須', exact: true });
  await title.fill('表示を切り替えても保持する申請');
  const native = await title.elementHandle();
  await page.getByLabel('表示設定', { exact: true }).selectOption('dense');
  await expect(title).toHaveValue('表示を切り替えても保持する申請');
  expect(await title.evaluate((element, previous) => element === previous, native)).toBe(true);
});

test('空のCard領域は比較面を圧迫せず、狭幅の文字拡大でも入力を保持する', async ({ page }) => {
  await page.goto('/catalog/foundation');
  const card = page.locator('ui-card').filter({ has: page.locator('#card-draft') });
  const input = card.getByRole('textbox', { name: '未確定のメモ', exact: true });
  await input.fill('空の領域に余白を予約しない');
  const native = await input.elementHandle();
  for (const profile of ['guided', 'dense']) {
    await page.locator('main').evaluate((element, value) => element.setAttribute('data-ui-profile', value), profile);
    for (const rtl of [false, true]) {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(value => { document.documentElement.style.fontSize = '200%'; document.documentElement.dir = value ? 'rtl' : 'ltr'; }, rtl);
      await expect(card.locator('[data-card-area="media"], [data-card-area="footer"], [data-card-area="actions"]')).toHaveCount(3);
      for (const area of ['media', 'footer', 'actions']) await expect(card.locator(`[data-card-area="${area}"]`)).toBeHidden();
      await expect(card.getByRole('status')).toBeHidden();
      await input.click();
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('空の領域に余白を予約しない');
      expect(await input.evaluate((element, previous) => element === previous, native)).toBe(true);
      const bounds = await card.evaluate(element => {
        const card = element.getBoundingClientRect(), input = element.querySelector('input')!.getBoundingClientRect();
        return { left: card.left, right: card.right, inputLeft: input.left, inputRight: input.right };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(-1);
      expect(bounds.right).toBeLessThanOrEqual(321);
      expect(bounds.inputLeft).toBeGreaterThanOrEqual(bounds.left);
      expect(bounds.inputRight).toBeLessThanOrEqual(bounds.right);
    }
  }
});

test('通知の絞り込みは狭幅・拡大・RTLでも選択と操作対象が明確', async ({ page }) => {
  await page.goto('/catalog/feedback');
  await page.getByLabel('表示設定', { exact: true }).selectOption('dense');
  await page.getByLabel('RTL', { exact: true }).check();
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  const center = page.locator('ui-notification-center');
  for (const label of ['通知の状態', '通知の分類']) {
    const select = center.getByLabel(label, { exact: true });
    const geometry = await select.evaluate(element => {
      const rect = element.getBoundingClientRect(), arrow = element.parentElement!.querySelector('svg')!.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { height: rect.height, left: rect.left, right: rect.right, arrowInset: arrow.left - rect.left, padding: parseFloat(style.paddingInlineEnd), arrowWidth: arrow.width };
    });
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(321);
    expect(geometry.arrowInset).toBeGreaterThanOrEqual(15);
    expect(geometry.padding).toBeGreaterThanOrEqual(geometry.arrowWidth + geometry.arrowInset);
    await select.focus(); await expect(select).toBeFocused();
  }
  await center.getByLabel('通知の状態', { exact: true }).selectOption('unread');
  await center.getByRole('button', { name: '既読にする: 提出内容を確認', exact: true }).click();
  await expect(center.getByRole('button', { name: '既読にする: 取得状態を確認', exact: true })).toBeFocused();
  await expect(center.locator('[data-notice]')).toHaveCount(1);
});
