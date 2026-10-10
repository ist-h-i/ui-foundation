import { test, expect } from './catalog-test';
import { openSpecialistCatalog, openSpecialistSurface, profiles } from './specialist-test-helpers';

for (const profile of profiles) {
  test(`FileExplorer ${profile}: horizontal keys follow the rendered direction and preserve the tree`, async ({ page }) => {
    await openSpecialistCatalog(page, profile);
    await openSpecialistSurface(page, 'FileExplorer');
    const explorer = page.locator('ui-file-explorer');
    const root = explorer.locator('[data-explorer-id="root"]');
    const child = explorer.locator('[data-explorer-id="csv"]');

    for (const direction of ['ltr', 'rtl', 'ltr'] as const) {
      if (await page.locator('main').getAttribute('dir') !== direction) {
        await page.getByRole('button', { name: /方向:/ }).click();
      }
      await expect(page.locator('main')).toHaveAttribute('dir', direction);
      await expect(root).toHaveCSS('direction', direction);
      const openKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const closeKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      await root.focus();
      await root.press(openKey);
      await expect(root).toHaveAttribute('aria-expanded', 'true');
      await root.press(openKey);
      await expect(child).toBeFocused();
      await child.press('Space');
      await expect(child).toHaveAttribute('aria-selected', 'true');
      await child.press(closeKey);
      await expect(root).toBeFocused();
      await root.press(closeKey);
      await expect(root).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('[data-file-selection]')).toHaveText('csv');
    }

    // Consumers can set direction in CSS without a native dir attribute.
    await explorer.evaluate(element => { element.style.direction = 'rtl'; });
    await expect(root).toHaveCSS('direction', 'rtl');
    await root.press('ArrowLeft');
    await expect(root).toHaveAttribute('aria-expanded', 'true');
    await root.press('ArrowLeft');
    await expect(child).toBeFocused();
    await child.press('ArrowRight');
    await expect(root).toBeFocused();
    await root.press('ArrowRight');
    await expect(root).toHaveAttribute('aria-expanded', 'false');
  });
}
