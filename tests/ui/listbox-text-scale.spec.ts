import { test, expect } from './catalog-test';

for (const profile of ['guided', 'dense'] as const) {
  test(`Listbox ${profile}: enlarged group and option text fits the measured virtual rows`, async ({ page }) => {
    await page.goto('/catalog/collections');
    await page.getByRole('combobox', { name: '表示設定', exact: true }).selectOption(profile);
    await expect(page.locator('main')).toHaveAttribute('data-ui-profile', profile);
    const host = page.locator('ui-listbox');
    const box = host.getByRole('listbox');
    await expect(box).toBeVisible();
    const rowTextGeometry = () => host.locator('.ui-listbox-option > span').evaluateAll(spans => spans.map(span => ({
      text: span.textContent,
      clientHeight: span.clientHeight,
      scrollHeight: span.scrollHeight,
    })).filter(span => span.scrollHeight > span.clientHeight + 1));

    for (const scale of ['100%', '200%', '100%'] as const) {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(value => { document.documentElement.style.fontSize = value; }, scale);
      await expect.poll(rowTextGeometry, { message: `${profile} ${scale}: group and candidate line boxes` }).toEqual([]);
      const rows = host.locator('.ui-listbox-option');
      expect(await rows.count()).toBeGreaterThan(0);
      const rowGeometry = await rows.evaluateAll(options => options.map(option => {
        const row = option.getBoundingClientRect();
        const wrapper = option.parentElement!.getBoundingClientRect();
        return Math.abs(row.height - wrapper.height);
      }));
      expect(rowGeometry.every(delta => delta <= 1), 'option and CDK fixed row heights agree').toBe(true);
      await box.focus();
      await box.press('End');
      await expect.poll(async () => {
        const id = await box.getAttribute('aria-activedescendant');
        return id ? page.locator(`[id="${id}"][role="option"]`).count() : 0;
      }).toBe(1);
      await expect.poll(rowTextGeometry).toEqual([]);
      await box.press('Home');
      await expect.poll(async () => {
        const id = await box.getAttribute('aria-activedescendant');
        return id ? page.locator(`[id="${id}"][role="option"]`).count() : 0;
      }).toBe(1);
    }

    await page.locator('#listbox-virtual').click();
    await expect(host.locator('cdk-virtual-scroll-viewport')).toHaveCount(0);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect.poll(rowTextGeometry).toEqual([]);
  });
}
