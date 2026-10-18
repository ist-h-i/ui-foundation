import { test, expect, type Page, type Locator } from '@playwright/test';

type RuntimeApi = {
  create(name: string, inputs: Record<string, unknown>, projectedHtml?: string): number;
  update(id: number, inputs: Record<string, unknown>): void;
  destroy(id: number): void;
  inspect(id: number): { errors: string[]; events: unknown[]; hostId: string };
};
const matrix = [
  { name: 'A', profile: 'guided', width: 1280, font: '100%', dir: 'ltr', reduce: false },
  { name: 'B', profile: 'dense', width: 320, font: '200%', dir: 'rtl', reduce: true },
] as const;
async function setup(page: Page, context: { profile: string; width: number; font: string; dir: string; reduce: boolean }) {
  await page.setViewportSize({ width: context.width, height: 800 });
  await page.emulateMedia({ reducedMotion: context.reduce ? 'reduce' : 'no-preference' });
  await page.goto('/catalog/static-runtime');
  await page.getByLabel('表示設定', { exact: true }).selectOption(context.profile);
  await page.evaluate(({ font, dir }) => {
    document.documentElement.style.fontSize = font;
    document.documentElement.dir = dir;
  }, context);
}
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function create(page: Page, name: string, inputs: Record<string, unknown>, projectedHtml?: string) {
  const id = await page.evaluate(({ name, inputs, projectedHtml }) =>
    (window as unknown as { __runtime: RuntimeApi }).__runtime.create(name, inputs, projectedHtml), { name, inputs, projectedHtml });
  await settle(page);
  return { id, host: page.locator(`[data-runtime-id="${id}"]`) };
}
async function update(page: Page, id: number, inputs: Record<string, unknown>) {
  await page.evaluate(({ id, inputs }) => (window as unknown as { __runtime: RuntimeApi }).__runtime.update(id, inputs), { id, inputs });
  await settle(page);
}
async function errors(page: Page, id: number) {
  return page.evaluate(id => (window as unknown as { __runtime: RuntimeApi }).__runtime.inspect(id).errors, id);
}
async function destroy(page: Page, id: number) {
  await page.evaluate(id => (window as unknown as { __runtime: RuntimeApi }).__runtime.destroy(id), id);
  await settle(page);
}
async function dimensions(locator: Locator) {
  return locator.evaluate(el => {
    const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { width: rect.width, height: rect.height, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
      blockSize: style.blockSize, maxBlockSize: style.maxBlockSize, inlineSize: style.inlineSize,
      // CSS box dimensions are unaffected by SVG's continuously rotating transform.
      layoutWidth: Number.parseFloat(style.width), layoutHeight: Number.parseFloat(style.height), transform: style.transform,
      style: (el as HTMLElement).style.cssText, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop, overflowY: style.overflowY, animation: style.animationName };
  });
}
const closeTo = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);

for (const context of matrix) {
  test(`table-container-input-geometry R037 R038 基準${context.name}: サイズ、制限、scroll、hidden復旧`, async ({ page }, info) => {
    await setup(page, context);
    const { id, host } = await create(page, 'TableContainer', { label: '測定する表領域', height: 180, maxHeight: 150, scrollDirection: 'block' }, '<div style="height:800px">長い表の内容</div>');
    closeTo((await dimensions(host)).height, 150);
    await host.focus(); await expect(host).toBeFocused(); await host.press('PageDown');
    await expect.poll(async () => (await dimensions(host)).scrollTop).toBeGreaterThan(0);
    await host.evaluate(el => (el as HTMLElement).hidden = true); await expect(host).toBeHidden();
    await update(page, id, { height: 120, maxHeight: null });
    await host.evaluate(el => (el as HTMLElement).hidden = false); await expect(host).toBeVisible();
    closeTo((await dimensions(host)).height, 120);
    await update(page, id, { height: null, displaySize: 'viewport' });
    const viewport = await host.evaluate(el => Number.parseFloat(getComputedStyle(el).getPropertyValue('--ui-size-table-viewport')));
    closeTo((await dimensions(host)).height, viewport);
    await update(page, id, { displaySize: 'content' });
    expect((await dimensions(host)).height).toBeGreaterThan(viewport);
    expect(await errors(page, id)).toEqual([]);
    await info.attach('R037-R038-CSSOM', { body: JSON.stringify(await dimensions(host), null, 2), contentType: 'application/json' });
    await destroy(page, id); await expect(host).toHaveCount(0);
  });

  test(`drawer-sheet-input-geometry R073 R074 R076 基準${context.name}: 全edge、割合、keyboard、close/destroy`, async ({ page }, info) => {
    await setup(page, context);
    const drawer = await create(page, 'Drawer', { label: '寸法測定drawer', open: true, width: 300, height: 600, modal: false }, '<input aria-label="保持する下書き"><button>投影操作</button>');
    await expect(drawer.host).toBeVisible();
    const editor = drawer.host.getByRole('textbox', { name: '保持する下書き' }); await editor.fill('保持');
    for (const edge of ['left', 'right', 'top', 'bottom']) {
      await update(page, drawer.id, { edge });
      const actual = await dimensions(drawer.host); closeTo(actual.width, 300); closeTo(actual.height, 600);
      expect(actual.x).toBeGreaterThanOrEqual(-1); expect(actual.right).toBeLessThanOrEqual(context.width + 1);
      expect(actual.y).toBeGreaterThanOrEqual(-1); expect(actual.bottom).toBeLessThanOrEqual(801);
      await expect(editor).toHaveValue('保持');
    }
    const close = drawer.host.getByRole('button', { name: 'ダイアログを閉じる', exact: true });
    await close.focus(); await expect(close).toBeFocused(); await close.press('Enter'); await expect(drawer.host).toBeHidden();
    await destroy(page, drawer.id);
    const sheet = await create(page, 'BottomSheet', { label: '割合測定sheet', open: true, modal: false, height: 600, stages: [.4, .7, 1], stage: 1 });
    closeTo((await dimensions(sheet.host)).height, 420);
    const slider = sheet.host.getByRole('slider'); await slider.focus(); await slider.press('Home');
    await expect(slider).toHaveAttribute('aria-valuetext', '1 / 3 (40%)');await expect.poll(async()=>Math.abs((await dimensions(sheet.host)).height-240),'Home stage must reach its rendered height').toBeLessThanOrEqual(1);
    await slider.press('End');await expect(slider).toHaveAttribute('aria-valuetext','3 / 3 (100%)');await expect.poll(async()=>Math.abs((await dimensions(sheet.host)).height-600),'End stage must reach its rendered height').toBeLessThanOrEqual(1);
    await expect(sheet.host.getByRole('button', { name: '高くする', exact: true })).toBeDisabled(); await expect(slider).toBeFocused();
    await update(page, sheet.id, { open: false, stage: 0 }); await expect(sheet.host).toBeHidden();
    await update(page, sheet.id, { open: true, height: null }); closeTo((await dimensions(sheet.host)).height, 320);
    expect(await errors(page, sheet.id)).toEqual([]);
    await info.attach('R073-R074-R076-CSSOM', { body: JSON.stringify(await dimensions(sheet.host), null, 2), contentType: 'application/json' });
    await destroy(page, sheet.id); await expect(sheet.host).toHaveCount(0);
  });

  test(`feedback-input-geometry R079 R080 R081 R082 基準${context.name}: 数値、semantic、shape、減速motion`, async ({ page }, info) => {
    await setup(page, context);
    const spinner = await create(page, 'Spinner', { label: '測定spinner', size: 36, value: 25, total: 100 });
    const svg = spinner.host.locator('svg'); closeTo((await dimensions(svg)).layoutWidth, 36); closeTo((await dimensions(svg)).layoutHeight, 36);
    await expect(spinner.host.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    await update(page, spinner.id, { size: 'small', value: null });
    const icon = await spinner.host.evaluate(el => Number.parseFloat(getComputedStyle(el).getPropertyValue('--ui-size-icon')));
    closeTo((await dimensions(svg)).layoutWidth, icon);
    await update(page, spinner.id, { size: 'large' });
    const control = await spinner.host.evaluate(el => Number.parseFloat(getComputedStyle(el).getPropertyValue('--ui-size-control')));
    closeTo((await dimensions(svg)).layoutWidth, 2 * control);
    if (context.reduce) expect((await dimensions(svg)).animation).toBe('none');
    const skeleton = await create(page, 'Skeleton', { shape: 'rectangle', width: 100, height: 32, rows: 2 });
    const line = skeleton.host.locator('.ui-skeleton-line').first(); closeTo((await dimensions(line)).width, 100); closeTo((await dimensions(line)).height, 32);
    await expect(skeleton.host).toHaveAttribute('aria-hidden', 'true');
    await update(page, skeleton.id, { shape: 'circle', diameter: 72 }); closeTo((await dimensions(line)).width, 72); closeTo((await dimensions(line)).height, 72);
    await skeleton.host.evaluate(el => (el as HTMLElement).style.inlineSize = '40px'); closeTo((await dimensions(line)).width, 40); closeTo((await dimensions(line)).height, 40);
    await skeleton.host.evaluate(el => (el as HTMLElement).style.removeProperty('inline-size'));
    await update(page, skeleton.id, { shape: 'line', width: 'control', height: 'text' });
    closeTo((await dimensions(line)).width, control);
    const textHeight = await skeleton.host.evaluate(el => {
      const style = getComputedStyle(el); return Number.parseFloat(style.fontSize) * Number.parseFloat(style.getPropertyValue('--ui-leading-body'));
    });
    closeTo((await dimensions(line)).height, textHeight);
    if (context.reduce) expect((await dimensions(line)).animation).toBe('none');
    await page.getByLabel('表示設定', { exact: true }).selectOption(context.profile === 'guided' ? 'dense' : 'guided');
    const changedTextHeight = await skeleton.host.evaluate(el => {
      const style = getComputedStyle(el); return Number.parseFloat(style.fontSize) * Number.parseFloat(style.getPropertyValue('--ui-leading-body'));
    });
    closeTo((await dimensions(line)).height, changedTextHeight);
    expect(changedTextHeight).not.toBe(textHeight);
    expect(await errors(page, spinner.id)).toEqual([]); expect(await errors(page, skeleton.id)).toEqual([]);
    await info.attach('R079-R082-CSSOM', { body: JSON.stringify({ spinner: await dimensions(svg), skeleton: await dimensions(line) }, null, 2), contentType: 'application/json' });
    await destroy(page, spinner.id); await destroy(page, skeleton.id);
  });
}

test('table-container-input-geometry R037 R038 リスク: 不正値はCSSへ渡さず説明し、正常値へ復旧する', async ({ page }) => {
  await setup(page, { ...matrix[0], width: 320 });
  const { id, host } = await create(page, 'TableContainer', { label: '境界測定', height: 120, maxHeight: 150 });
  for (const invalid of [0, -1, NaN, Infinity, '300px'] as unknown[]) {
    await update(page, id, { height: invalid, maxHeight: invalid });
    await expect(host.getByRole('alert')).toBeVisible();
    const inline = await host.evaluate(el => ({ height: (el as HTMLElement).style.blockSize, max: (el as HTMLElement).style.maxBlockSize }));
    expect(inline).toEqual({ height: '', max: '' });
    await update(page, id, { height: 120, maxHeight: 150 }); await expect(host.getByRole('alert')).toHaveCount(0); closeTo((await dimensions(host)).height, 120);
  }
  expect(await errors(page, id)).toEqual([]);
});

test('drawer-sheet-input-geometry R073 R074 R076 リスク: 不正寸法・stageを拒否し正常更新へ復旧する', async ({ page }) => {
  await setup(page, { ...matrix[1], width: 1280, font: '100%' });
  const drawer = await create(page, 'Drawer', { label: '不正寸法測定', open: true, modal: false, width: 300, height: 600 });
  for (const invalid of [0, -1, NaN, Infinity, '300px']) {
    const before = (await errors(page, drawer.id)).length;
    await update(page, drawer.id, { width: invalid });
    expect((await errors(page, drawer.id)).length).toBeGreaterThan(before);
    expect(await drawer.host.evaluate(el => (el as HTMLElement).style.getPropertyValue('--ui-panel-width'))).toBe('300px');
    await update(page, drawer.id, { width: 280 }); closeTo((await dimensions(drawer.host)).width, 280);
    await update(page, drawer.id, { width: 300 });
  }
  await destroy(page, drawer.id);
  const sheet = await create(page, 'BottomSheet', { label: '不正stage測定', modal: false, open: true, height: 600, stages: [.4, .7, 1], stage: 1 });
  for (const stages of [[], [0, .7], [.7, .4], [1.1], [NaN], [Infinity]]) {
    const before = (await errors(page, sheet.id)).length;
    await update(page, sheet.id, { stages }); expect((await errors(page, sheet.id)).length).toBeGreaterThan(before);
    expect(await sheet.host.evaluate(el => (el as HTMLElement).style.getPropertyValue('--ui-sheet-height'))).not.toMatch(/NaN|Infinity|undefined/);
    await update(page, sheet.id, { stages: [.4, .7, 1], stage: 1 }); closeTo((await dimensions(sheet.host)).height, 420);
  }
  await destroy(page, sheet.id);
});

test('feedback-input-geometry R079 R080 R081 R082 リスク: 不正数値拒否・復旧と遅延cancel/destroy', async ({ page }) => {
  await setup(page, { ...matrix[0], width: 320, font: '200%' });
  const spinner = await create(page, 'Spinner', { label: '境界spinner', size: 36 });
  for (const size of [0, -1, NaN, Infinity]) {
    const before = (await errors(page, spinner.id)).length; await update(page, spinner.id, { size });
    expect((await errors(page, spinner.id)).length).toBeGreaterThan(before);
    expect(await spinner.host.locator('svg').getAttribute('style')).not.toMatch(/NaN|Infinity|-1px|0px/);
    await update(page, spinner.id, { size: 36 }); closeTo((await dimensions(spinner.host.locator('svg'))).layoutWidth, 36);
  }
  const skeleton = await create(page, 'Skeleton', { shape: 'rectangle', width: 100, height: 32 });
  for (const value of [0, -1, NaN, Infinity]) {
    const before = (await errors(page, skeleton.id)).length; await update(page, skeleton.id, { width: value, height: value });
    expect((await errors(page, skeleton.id)).length).toBeGreaterThan(before);
    await update(page, skeleton.id, { width: 100, height: 32 }); closeTo((await dimensions(skeleton.host.locator('.ui-skeleton-line'))).height, 32);
  }
  await destroy(page, spinner.id); await destroy(page, skeleton.id);
  const delayed = await create(page, 'Spinner', { label: '遅延spinner', active: true, delayMilliseconds: 250 });
  await expect(delayed.host.getByRole('progressbar')).toBeHidden();
  await update(page, delayed.id, { active: false }); await page.waitForTimeout(300); await expect(delayed.host.getByRole('progressbar')).toBeHidden();
  await update(page, delayed.id, { active: true }); await expect(delayed.host.getByRole('progressbar')).toBeVisible();
  await update(page, delayed.id, { delayMilliseconds: 250, active: false }); await update(page, delayed.id, { active: true });
  await destroy(page, delayed.id); await page.waitForTimeout(300); await expect(delayed.host).toHaveCount(0);
});
