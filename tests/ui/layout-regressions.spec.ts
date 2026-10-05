import { expect, test, type Locator, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();
const japaneseLabel = '申請内容を確認して次の手続きに進む';
const asciiLabel = 'ReviewApplicationDetailsBeforeContinuingToTheNextStep';

for (const profile of ['guided', 'dense'] as const) {
  test.describe(profile, () => {
    test.beforeEach(async ({ page }) => {
      const errors: string[] = [];
      pageErrors.set(page, errors);
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'レイアウトの回帰検証', exact: true })).toBeVisible();
      await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
      await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', profile);
    });

    test.afterEach(async ({ page }) => {
      expect(pageErrors.get(page)).toEqual([]);
    });

    test('checkboxを持つFormFieldはhiddenでDOMと値を保持し、表示・Tab順・直接focusから外れる', async ({ page }) => {
      const field = page.getByTestId('layout-confirmation-field');
      const checkbox = field.locator('input[type="checkbox"]');
      const hide = page.getByLabel('追加の確認欄を非表示にする', { exact: true });
      const next = page.getByTestId('layout-after-confirmation');
      await expect(checkbox).not.toBeChecked();
      await checkbox.focus();
      await page.keyboard.press('Space');
      await expect(checkbox).toBeChecked();
      await checkbox.evaluate((element) => element.setAttribute('data-retained-control', 'changed-before-hiding'));

      await hide.check();
      await expect(field).toHaveAttribute('hidden', '');
      await expect(checkbox).toHaveCount(1);
      await expect(checkbox).toHaveAttribute('data-retained-control', 'changed-before-hiding');
      await expect.soft(field).toBeHidden({ timeout: 1000 });
      await expect.soft(checkbox).toBeHidden({ timeout: 1000 });
      await hide.focus();
      await page.keyboard.press('Tab');
      await expect.soft(next).toBeFocused({ timeout: 1000 });
      await next.focus();
      await checkbox.evaluate((element: HTMLInputElement) => element.focus());
      await expect.soft(checkbox).not.toBeFocused({ timeout: 1000 });
      await expect.soft(next).toBeFocused({ timeout: 1000 });

      await hide.uncheck();
      await expect(checkbox).toBeVisible();
      await expect(checkbox).toHaveAttribute('data-retained-control', 'changed-before-hiding');
      await expect(checkbox).toBeChecked();
      await hide.focus();
      await page.keyboard.press('Tab');
      await expect(checkbox).toBeFocused();
      await page.keyboard.press('Space');
      await expect(checkbox).not.toBeChecked();
    });

    async function expectTextInsideAction(action: Locator, label: string, context: string, busy: boolean): Promise<void> {
      await expect(action).toContainText(label);
      const geometry = await action.evaluate((host) => {
        const rect = host.getBoundingClientRect();
        const css = getComputedStyle(host);
        const bounds = {
          left: rect.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft),
          right: rect.right - parseFloat(css.borderRightWidth) - parseFloat(css.paddingRight),
          top: rect.top + parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop),
          bottom: rect.bottom - parseFloat(css.borderBottomWidth) - parseFloat(css.paddingBottom),
        };
        const serialize = (value: DOMRect) => ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom });
        const lines: { text: string; rect: ReturnType<typeof serialize> }[] = [];
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent?.trim() || '';
          if (!text) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const line of range.getClientRects()) {
            if (line.width && line.height) lines.push({ text, rect: serialize(line) });
          }
        }
        const busyElement = host.querySelector('.ui-action-busy');
        return {
          bounds,
          lines,
          busy: busyElement ? serialize(busyElement.getBoundingClientRect()) : null,
        };
      });
      expect(geometry.lines.length, `${context}: rendered text lines`).toBeGreaterThan(0);
      for (const [index, line] of geometry.lines.entries()) {
        const message = `${context}: text line ${index + 1} (${line.text}), bounds=${JSON.stringify(geometry.bounds)}`;
        expect.soft(line.rect.left, message).toBeGreaterThanOrEqual(geometry.bounds.left - 1);
        expect.soft(line.rect.right, message).toBeLessThanOrEqual(geometry.bounds.right + 1);
        expect.soft(line.rect.top, message).toBeGreaterThanOrEqual(geometry.bounds.top - 1);
        expect.soft(line.rect.bottom, message).toBeLessThanOrEqual(geometry.bounds.bottom + 1);
      }
      if (busy) {
        await expect(action.locator('.ui-action-busy')).toHaveText('処理中');
        await expect(action.locator('.ui-action-busy')).toBeVisible();
        expect(geometry.busy, `${context}: busy indicator rectangle`).not.toBeNull();
        expect.soft(geometry.busy!.left, `${context}: busy frame left`).toBeGreaterThanOrEqual(geometry.bounds.left - 1);
        expect.soft(geometry.busy!.right, `${context}: busy frame right`).toBeLessThanOrEqual(geometry.bounds.right + 1);
        expect.soft(geometry.busy!.top, `${context}: busy frame top`).toBeGreaterThanOrEqual(geometry.bounds.top - 1);
        expect.soft(geometry.busy!.bottom, `${context}: busy frame bottom`).toBeLessThanOrEqual(geometry.bounds.bottom + 1);
      } else {
        expect(geometry.busy).toBeNull();
      }
    }

    test('320px幅の長い直接投影ラベルはbuttonとaの通常・処理中、100%・200%文字サイズで枠内に収まる', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      const busyToggle = page.getByLabel('長いラベルの操作を処理中にする', { exact: true });
      const examples = [
        ['layout-japanese-button', japaneseLabel], ['layout-japanese-link', japaneseLabel],
        ['layout-ascii-button', asciiLabel], ['layout-ascii-link', asciiLabel],
      ] as const;

      for (const textSize of [100, 200]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
        expect(await page.getByTestId('layout-japanese-button').evaluate((element) => getComputedStyle(element).fontSize))
          .toBe(`${(profile === 'guided' ? 18 : 16) * textSize / 100}px`);
        for (const busy of [false, true]) {
          await busyToggle.setChecked(busy);
          for (const [testId, label] of examples) {
            const action = page.getByTestId(testId);
            await expectTextInsideAction(action, label, `${textSize}% / ${busy ? 'busy' : 'normal'} / ${testId}`, busy);
            if (busy) {
              await expect(action).toHaveAttribute('aria-busy', 'true');
              await action.evaluate((element) => {
                element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                element.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
              });
            }
          }
        }
      }
      await expect(page.getByTestId('layout-button-count')).toHaveText('ボタン操作: 0');
      await expect(page.getByTestId('layout-link-count')).toHaveText('リンク操作: 0');
      await expect(page).not.toHaveURL(/#layout-action-destination$/);
      await busyToggle.uncheck();
      await page.getByTestId('layout-japanese-button').click();
      await page.getByTestId('layout-japanese-link').click();
      await expect(page.getByTestId('layout-button-count')).toHaveText('ボタン操作: 1');
      await expect(page.getByTestId('layout-link-count')).toHaveText('リンク操作: 1');
      await expect(page).toHaveURL(/#layout-action-destination$/);
    });
  });
}
