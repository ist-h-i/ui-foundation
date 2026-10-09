import { test, expect } from './catalog-test';
import type { Locator } from '@playwright/test';

for (const profile of ['guided', 'dense'] as const) {
  test(`Calendar ${profile}: every keyboard destination is visible before it can be committed at 320px and 200%`, async ({ page }) => {
    await page.goto('/catalog');
    await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const trigger = page.getByRole('button', { name: '予定日のカレンダーを開く', exact: true });
    const dialog = page.getByRole('dialog', { name: '予定日の日付を選択', exact: true });
    const visibleDestination = () => dialog.evaluate(element => {
      const focused = element.ownerDocument.activeElement;
      const region = focused?.closest('.ui-calendar__days');
      if (!focused || !region || !focused.matches('button[data-date]')) return false;
      const box = focused.getBoundingClientRect(), clip = region.getBoundingClientRect();
      const hit = element.ownerDocument.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(focused);
      return !!hit && focused.contains(hit)
        && [...range.getClientRects()].every(text => text.left >= clip.left - 1 && text.right <= clip.right + 1
          && text.top >= clip.top - 1 && text.bottom <= clip.bottom + 1);
    });
    for (const direction of ['rtl', 'ltr'] as const) {
      await page.getByLabel('RTL', { exact: true }).setChecked(direction === 'rtl');
      await trigger.press('Enter');
      await expect(dialog.locator('button[data-date="2026-10-05"]')).toBeFocused();
      await expect.poll(visibleDestination).toBe(true);
      for (const key of [
        ...Array<string>(7).fill(direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'),
        'ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp',
      ]) {
        await page.keyboard.press(key);
        await expect.poll(visibleDestination, { message: `${profile} ${direction} ${key}: the focused number stays visible` }).toBe(true);
        await expect(page.getByTestId('date-values')).toContainText('"date":"2026-10-05"');
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  });
}

for (const profile of ['guided', 'dense'] as const) {
  test(`Calendar ${profile}: month and year buttons reveal the new tab entry while retaining button focus`, async ({ page }) => {
    await page.goto('/catalog'); await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const trigger = page.getByRole('button', { name: '予定日のカレンダーを開く', exact: true });
    const dialog = page.getByRole('dialog', { name: '予定日の日付を選択', exact: true });
    const visibleEntry = async (button: Locator) => button.evaluate(element => {
      const region = element.closest('.ui-calendar__days')!, clip = region.getBoundingClientRect(), box = element.getBoundingClientRect();
      const range = element.ownerDocument.createRange(); range.selectNodeContents(element);
      const hit = element.ownerDocument.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return !!hit && element.contains(hit) && [...range.getClientRects()].every(text => text.left >= clip.left - 1 && text.right <= clip.right + 1 && text.top >= clip.top - 1 && text.bottom <= clip.bottom + 1);
    });
    for (const direction of ['ltr', 'rtl'] as const) {
      await page.getByLabel('RTL', { exact: true }).setChecked(direction === 'rtl');
      await trigger.press('Enter'); await expect(dialog).toBeVisible();
      const previous = dialog.getByRole('button', { name: '予定日の日付の前の月', exact: true });
      await previous.focus(); await previous.press('Enter');
      const entry = dialog.locator('button[data-date="2026-09-01"]');
      await expect(entry).toHaveAttribute('tabindex', '0'); await expect(previous).toBeFocused();
      await expect.poll(() => visibleEntry(entry), { message: `${profile} ${direction}: new month tab entry is readable` }).toBe(true);
      await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    }
    await page.getByRole('button', { name: '年の月一覧を切替', exact: true }).click();
    const calendar = page.locator('ui-calendar').filter({ has: page.locator('section[aria-label="予定カレンダー"]') });
    for (const direction of ['ltr', 'rtl'] as const) {
      await page.getByLabel('RTL', { exact: true }).setChecked(direction === 'rtl');
      const january = calendar.getByRole('button', { name: '1月', exact: true });
      await january.focus(); await january.press('Enter');
      const entry = calendar.locator('button[data-date="2026-01-01"]');
      await expect(entry).toHaveAttribute('tabindex', '0'); await expect(january).toBeFocused();
      await expect.poll(() => visibleEntry(entry), { message: `${profile} ${direction}: new year-view tab entry is readable` }).toBe(true);
    }
    await expect(page.getByTestId('date-values')).toContainText('"date":"2026-10-05"');
  });
}
