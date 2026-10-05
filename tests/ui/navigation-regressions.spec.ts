import { readFile } from 'node:fs/promises';
import { expect, test, type Locator } from '@playwright/test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { renderTokens } from '../../src/tokens.ts';

const labels = {
  japanese: '申請内容と承認履歴を確認する',
  ascii: 'ReviewApplicationDetailsAndApprovalHistoryBeforeContinuing',
};

async function expectLabelInside(link: Locator, label: string): Promise<void> {
  await expect(link).toHaveText(label);
  const geometry = await link.evaluate((element) => {
    const serialize = (rect: DOMRect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height });
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const lines: ReturnType<typeof serialize>[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const line of range.getClientRects()) if (line.width && line.height) lines.push(serialize(line));
    }
    return { link: serialize(rect), item: serialize(element.closest('li')!.getBoundingClientRect()), lines,
      whiteSpace: style.whiteSpace, overflowX: style.overflowX, textOverflow: style.textOverflow,
      content: { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight),
        top: rect.top + parseFloat(style.paddingTop), bottom: rect.bottom - parseFloat(style.paddingBottom) } };
  });
  expect(geometry.lines.length).toBeGreaterThan(0);
  expect(geometry.link.width).toBeGreaterThanOrEqual(44);
  expect(geometry.link.height).toBeGreaterThanOrEqual(44);
  expect.soft(geometry.whiteSpace).not.toBe('nowrap');
  expect.soft(geometry.overflowX).not.toBe('hidden');
  expect.soft(geometry.textOverflow).not.toBe('ellipsis');
  for (const line of geometry.lines) {
    for (const [name, bounds] of Object.entries({ content: geometry.content, item: geometry.item })) {
      expect.soft(line.left, `${label}: ${name} left`).toBeGreaterThanOrEqual(bounds.left - 1);
      expect.soft(line.right, `${label}: ${name} right`).toBeLessThanOrEqual(bounds.right + 1);
      expect.soft(line.top, `${label}: ${name} top`).toBeGreaterThanOrEqual(bounds.top - 1);
      expect.soft(line.bottom, `${label}: ${name} bottom`).toBeLessThanOrEqual(bounds.bottom + 1);
    }
  }
}

function contrast(foreground: string, background: string): number {
  const luminance = (value: string) => {
    const channels = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => channel / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function colors(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    let background = 'rgb(255, 255, 255)';
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const candidate = getComputedStyle(ancestor).backgroundColor;
      if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') { background = candidate; break; }
    }
    return { color: style.color, background, indicator: style.borderBottomColor };
  });
}

for (const profile of ['guided', 'dense'] as const) {
  test.describe(profile, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
      await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', profile);
      await expect(page.getByTestId('layout-navigation')).toBeVisible();
    });

    test('長いnavとパンくずの全文字は320px・100/200%でlistとlinkの枠内に収まりnative操作を維持する', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      for (const size of [100, 200]) {
        await page.evaluate((value) => { document.documentElement.style.fontSize = `${value}%`; }, size);
        for (const kind of ['nav', 'breadcrumb']) {
          for (const language of ['japanese', 'ascii'] as const) {
            const link = page.getByTestId(`layout-${kind}-${language}`);
            expect(await link.evaluate((element) => getComputedStyle(element).fontSize))
              .toBe(`${(profile === 'guided' ? 18 : 16) * size / 100}px`);
            await expectLabelInside(link, labels[language]);
          }
        }
        const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        expect.soft(width.scroll, `${size}%: page horizontal overflow`).toBeLessThanOrEqual(width.client);
      }

      const hide = page.getByLabel('長い移動先のナビを非表示にする', { exact: true });
      const japanese = page.getByTestId('layout-nav-japanese');
      const ascii = page.getByTestId('layout-nav-ascii');
      await hide.focus();
      await page.keyboard.press('Tab');
      await expect(japanese).toBeFocused();
      expect(await japanese.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
      await page.keyboard.press('Tab');
      await expect(ascii).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#layout-navigation-ascii$/);
      await expect(ascii).toHaveAttribute('aria-current', 'page');
      await expect(japanese).not.toHaveAttribute('aria-current', 'page');
      const breadcrumb = page.getByTestId('layout-breadcrumb-japanese');
      await breadcrumb.click();
      await expect(page).toHaveURL(/#layout-navigation-japanese$/);
      await expect(breadcrumb).toHaveAttribute('aria-current', 'page');
      await hide.check();
      await expect(page.getByTestId('layout-navigation')).toBeHidden();
      await expect(page.getByTestId('layout-breadcrumb')).toBeHidden();
      await hide.uncheck();
      await expect(japanese).toHaveAttribute('aria-current', 'page');
    });

    test('明るいaction背景でもnav・パンくず・選択tabの独立した文字色が実背景で4.5:1を保つ', async ({ page }) => {
      const config = parseConfig(await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8'));
      for (const configuredProfile of Object.values(config.profiles)) {
        configuredProfile.semantic['color.action'] = 'white';
        configuredProfile.semantic['color.action-hover'] = 'white';
        configuredProfile.semantic['color.on-action'] = 'ink';
      }
      const resolved = resolveConfig(config);
      await page.addStyleTag({ content: renderTokens(resolved) });
      const rgb = (hex: string) => `rgb(${[0, 2, 4].map((offset) => parseInt(hex.slice(1).slice(offset, offset + 2), 16)).join(', ')})`;
      const roles = resolved.profiles[profile].semantic;
      const expectedLink = rgb(String(roles['color.link'].value));
      const expectedSelected = rgb(String(roles['color.tab-selected'].value));

      for (const background of ['surface', 'background']) {
        await page.getByTestId('layout-navigation').evaluate((element, role) => {
          (element.parentElement as HTMLElement).style.backgroundColor = `var(--ui-color-${role})`;
        }, background);
        for (const kind of ['nav', 'breadcrumb']) {
          const normal = page.getByTestId(`layout-${kind}-ascii`);
          const current = page.getByTestId(`layout-${kind}-japanese`);
          await page.mouse.move(0, 0);
          for (const [state, link] of [['normal', normal], ['current', current], ['hover', normal]] as const) {
            if (state === 'hover') await link.hover();
            const measured = await colors(link);
            expect(measured.color, `${background}/${kind}/${state}`).toBe(expectedLink);
            expect(measured.background).toBe(rgb(String(roles[`color.${state === 'normal' ? background : 'background'}`].value)));
            expect(contrast(measured.color, measured.background), `${background}/${kind}/${state}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
      const selectedTab = page.getByRole('tab', { name: '確認メモ', exact: true });
      const selected = await colors(selectedTab);
      expect(selected.color).toBe(expectedSelected);
      expect(selected.indicator).toBe(expectedSelected);
      expect(selected.background).toBe(rgb(String(roles['color.surface'].value)));
      expect(contrast(selected.color, selected.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(selected.indicator, selected.background)).toBeGreaterThanOrEqual(4.5);
      const button = page.getByRole('button', { name: '変更を保存', exact: true });
      await button.hover();
      const action = await colors(button);
      expect(action.background).toBe('rgb(255, 255, 255)');
      expect(action.color).toBe(rgb(String(roles['color.on-action'].value)));
      expect(contrast(action.color, action.background)).toBeGreaterThanOrEqual(4.5);
    });
  });
}
