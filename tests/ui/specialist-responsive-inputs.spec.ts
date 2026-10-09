import { test, expect } from './catalog-test';
import { openSpecialistCatalog, openSpecialistSurface, profiles } from './specialist-test-helpers';

for (const profile of profiles) {
  test(`Specialist ${profile}: native input labels fit at 320px and 200% in both directions`, async ({ page }) => {
    await openSpecialistCatalog(page, profile);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });

    for (const surface of ['RichText', 'Diff / JSON', 'FileExplorer'] as const) {
      await openSpecialistSurface(page, surface);
      for (const direction of ['ltr', 'rtl'] as const) {
        if (await page.locator('main').getAttribute('dir') !== direction) {
          await page.getByRole('button', { name: /方向:/ }).click();
        }
        await expect(page.locator('main')).toHaveAttribute('dir', direction);
        const geometry = await page.locator('section:not([hidden]) > ui-rich-text-editor, section:not([hidden]) > ui-diff-viewer, section:not([hidden]) > ui-json-viewer, section:not([hidden]) > ui-file-explorer').evaluateAll(hosts => {
          return hosts.flatMap(host => {
            const outer = host.getBoundingClientRect();
            return [...host.querySelectorAll('label, input, select')]
              .filter(element => element.getBoundingClientRect().width > 0)
              .map(element => {
                const rect = element.getBoundingClientRect();
                return { control: element.outerHTML.slice(0, 180), inside: rect.left >= outer.left - 1 && rect.right <= outer.right + 1 };
              });
          });
        });
        expect(geometry.length, `observed controls in ${surface}`).toBeGreaterThan(0);
        expect(geometry.filter(control => !control.inside), `${surface} ${direction}`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      }
    }

    const draft = page.getByLabel('新しい名前', { exact: true });
    await draft.fill('拡大表示でも保持する名前.txt');
    await page.getByRole('button', { name: /プロファイル:/ }).click();
    await expect(draft).toHaveValue('拡大表示でも保持する名前.txt');
  });
}
