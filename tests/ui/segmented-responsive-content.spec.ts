import { test, expect } from './catalog-test';

for (const profile of ['guided', 'dense'] as const) {
  test(`SegmentedControl ${profile}: equal options keep radio, icon and label inside their targets`, async ({ page }) => {
    await page.goto('/catalog/actions');
    await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
    await expect(page.locator('main')).toHaveAttribute('data-ui-profile', profile);
    const host = page.locator('ui-segmented-control');
    const geometry = () => host.locator('.ui-segment').evaluateAll(segments => segments.flatMap(segment => {
      const target = segment.getBoundingClientRect();
      return [...segment.querySelectorAll('input, ui-icon, span')].map(child => {
        const content = child.getBoundingClientRect();
        return { text: child.textContent, inside: content.left >= target.left - 1 && content.right <= target.right + 1 };
      });
    }).filter(content => !content.inside));
    for (const scale of ['100%', '200%'] as const) {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(value => { document.documentElement.style.fontSize = value; }, scale);
      for (const direction of ['ltr', 'rtl'] as const) {
        await page.getByLabel('RTL', { exact: true }).setChecked(direction === 'rtl');
        await expect(page.locator('main')).toHaveAttribute('dir', direction);
        await expect.poll(geometry, { message: `${profile} ${scale} ${direction}` }).toEqual([]);
      }
    }
    const history = host.getByRole('radio', { name: '履歴', exact: true });
    await history.focus();
    await history.press('Space');
    await expect(history).toBeChecked();
    await page.getByLabel('均等幅にする', { exact: true }).uncheck();
    await expect.poll(geometry).toEqual([]);
    await page.getByLabel('選択肢を縦方向にする', { exact: true }).check();
    await expect.poll(geometry).toEqual([]);
    await expect(history).toBeChecked();
  });

  test(`SegmentedControl ${profile}: a long legend reflows at 320px and 200% without page panning`, async ({ page }) => {
    await page.goto('/catalog/foundation');
    await page.evaluate(value => {
      const stage = (window as unknown as { __stage: { profile: { set(profile: 'guided' | 'dense'): void } } }).__stage;
      stage.profile.set(value);
    }, profile);
    await expect(page.locator('main')).toHaveAttribute('data-ui-profile', profile);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const segment = page.locator('[data-form="SegmentedControl"]');
    await expect(segment.locator('legend')).toHaveText('SegmentedControl');
    for (const direction of ['ltr', 'rtl'] as const) {
      await page.evaluate(value => { document.documentElement.dir = value; }, direction);
      await expect.poll(() => segment.locator('legend').evaluate(element => {
        const text = element.getBoundingClientRect(), field = element.closest('fieldset')!.getBoundingClientRect();
        return text.left >= field.left - 1 && text.right <= field.right + 1;
      }), { message: `${profile} 200% ${direction}: legend stays in the fieldset` }).toBe(true);
      const words = await segment.locator('.ui-segment span').evaluateAll(elements => elements.map(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return { label: element.textContent, lines: [...range.getClientRects()].filter(box => box.width > 0).length };
      }));
      expect(words, 'short choices stay readable as whole words').toEqual([{ label: 'Alpha', lines: 1 }, { label: 'Beta', lines: 1 }]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
    }
    const beta = segment.getByRole('radio', { name: 'Beta', exact: true });
    await beta.focus();
    await beta.press('Space');
    await expect(beta).toBeChecked();
    await expect(segment.locator('output[data-form-value]')).toHaveText('"b"');
  });
}

for(const profile of ['guided','dense'] as const)test(`SegmentedControl ${profile}: the catalog validity reflects an asynchronous option replacement without another user event`,async({page})=>{
 await page.goto('/catalog/actions');await page.getByLabel('表示設定',{exact:true}).selectOption(profile);
 await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const host=page.locator('ui-segmented-control'),diagnostic=page.getByTestId('segment-value');
 await expect(diagnostic).toHaveText('"summary" / 有効 / 未操作');
 await page.getByTestId('replace-segments').click();await expect(host).toHaveClass(/ng-invalid/);
 await expect(diagnostic).toHaveText('"summary" / 要確認 / 未操作');
 await expect(host.getByRole('radio',{name:'新しい概要',exact:true})).not.toBeChecked();
 const history=host.getByRole('radio',{name:'新しい履歴',exact:true});await history.focus();await page.keyboard.press('Space');
 await expect(history).toBeChecked();await expect(host).toHaveClass(/ng-valid/);
 await expect(diagnostic).toContainText('"new-history" / 有効');
 await page.getByRole('button',{name:'選択を初期化',exact:true}).click();await expect(host).toHaveClass(/ng-invalid/);
 await expect(diagnostic).toHaveText('null / 要確認 / 未操作');
});
