import { test, expect } from './catalog-test';

for (const profile of ['guided', 'dense'] as const) {
  test(`FilterBuilder ${profile}: both match choices remain legible at 320px and 200%`, async ({ page }) => {
    await page.goto('/catalog/choices');
    await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
    await expect(page.locator('main')).toHaveAttribute('data-ui-profile', profile);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const select = page.getByLabel('条件の結合', { exact: true }).first();
    for (const value of ['and', 'or']) {
      await select.selectOption(value);
      await expect(select).toHaveValue(value);
      const geometry = await select.evaluate((element: HTMLSelectElement) => {
        const style = getComputedStyle(element);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return {
          text: context.measureText(element.selectedOptions[0].label).width,
          available: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        };
      });
      expect(geometry.text).toBeLessThanOrEqual(geometry.available);
    }
    await expect(select.getByRole('option', { name: 'すべてに一致 (AND)', exact: true })).toHaveCount(1);
    await expect(select.getByRole('option', { name: 'いずれかに一致 (OR)', exact: true })).toHaveCount(1);
  });

  test(`FilterBuilder ${profile}: complete operator meanings remain visible in restored nested conditions at 200%`, async ({ page }, info) => {
    await page.goto('/catalog/choices');
    await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.getByRole('button', { name: '複数階層の条件を復元', exact: true }).click();
    const builder = page.locator('ui-filter-builder'), observations = [];
    for (const rtl of [false, true]) {
      await page.getByLabel('RTL', { exact: true }).setChecked(rtl);
      for (const select of await builder.getByRole('combobox', { name: '演算子', exact: true }).all()) {
        const values = await select.locator('option:not([disabled])').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
        for (const value of values) {
          await select.selectOption(value);
          await expect(select).toHaveValue(value);
          const geometry = await select.evaluate((element: HTMLSelectElement) => {
            const style = getComputedStyle(element), context = document.createElement('canvas').getContext('2d')!;
            context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            const label = element.selectedOptions[0].label;
            return { label, text: context.measureText(label).width, available: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
          });
          observations.push({ rtl, value, ...geometry });
          expect(geometry.text, `${value}: ${geometry.label} remains fully readable`).toBeLessThanOrEqual(geometry.available);
        }
      }
    }
    const money = builder.locator('#filter-money-operator');
    await money.selectOption('neq');
    const model = JSON.parse(await page.locator('#filter-model').innerText());
    expect(model.children[0].operator).toBe('neq');
    await info.attach('nested-operator-labels', { body: JSON.stringify({ profile, observations }), contentType: 'application/json' });
  });
}
