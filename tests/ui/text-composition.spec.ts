import type { Locator, Page } from '@playwright/test';
import { expect, test } from './catalog-test';

type Field = 'text' | 'textarea';
const fields: Field[] = ['text', 'textarea'];

async function expectChanges(page: Page, values: (string | null)[], outputs = values) {
  await expect(page.locator('#form-changes')).toHaveText(JSON.stringify(values));
  await expect(page.locator('#value-changes')).toHaveText(JSON.stringify(outputs));
}

async function checkComposition(page: Page, field: Field, query: string, buffered: boolean) {
  await page.goto(`/catalog/text-composition?field=${field}${query}`);
  const editor = page.locator('#reactive');
  await editor.focus();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.imeSetComposition', { text: 'と', selectionStart: 1, selectionEnd: 1 });
    await expect(page.locator('.ui-input-count').first()).toHaveText('1 文字');
    await expectChanges(page, buffered ? [] : ['と']);
    await session.send('Input.imeSetComposition', { text: 'とう', selectionStart: 2, selectionEnd: 2 });
    await expect(editor).toHaveValue('とう');
    await expect(page.locator('.ui-input-count').first()).toHaveText('2 文字');
    await expectChanges(page, buffered ? [] : ['と', 'とう']);
    await session.send('Input.insertText', { text: '東京' });
    await expect(editor).toHaveValue('東京');
    await expectChanges(page, buffered ? ['東京'] : ['と', 'とう', '東京']);
    if (buffered) {
      await editor.evaluate(node => node.dispatchEvent(new InputEvent('input', {
        bubbles: true, inputType: 'insertCompositionText', data: '東京',
      })));
      await expectChanges(page, ['東京']);
    }
  } finally {
    await session.detach();
  }
}

async function draft(editor: Locator, value: string) {
  await editor.evaluate((node, value) => {
    const input = node as HTMLInputElement | HTMLTextAreaElement;
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = value;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText', data: value }));
  }, value);
}

async function finish(editor: Locator, value: string, trailingInput = false) {
  await editor.evaluate((node, { value, trailingInput }) => {
    const input = node as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
    if (trailingInput) input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromComposition', data: value }));
  }, { value, trailingInput });
}

async function replayAfterRender(editor: Locator, value: string) {
  await editor.evaluate(async (node, value) => {
    // The native editor can deliver the IME's insertion after Angular has rendered the owner's decision.
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await frame();
    await frame();
    const input = node as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromComposition', data: value }));
    await frame();
    await frame();
  }, value);
}

for (const field of fields) {
  test(`${field} displays the candidate and publishes one committed value by default`, async ({ page }) => {
    await checkComposition(page, field, '', true);
  });

  test(`${field} publishes composing input when Angular buffering is off`, async ({ page }) => {
    await checkComposition(page, field, '&buffer=off', false);
  });

  test(`${field} discards native completion after a form reset without losing subsequent input`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}`);
    const editor = page.locator('#reactive');
    await editor.focus();
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.imeSetComposition', { text: 'とう', selectionStart: 2, selectionEnd: 2 });
      await expect(editor).toHaveValue('とう');
      await page.getByRole('button', { name: '初期化' }).dispatchEvent('click');
      await expectChanges(page, [null], []);
      await session.send('Input.insertText', { text: '東京' });
      await expect(editor).toHaveValue('');
      await expectChanges(page, [null], []);
      await session.send('Input.insertText', { text: '京都' });
      await expect(editor).toHaveValue('京都');
      await expectChanges(page, [null, '京都'], ['京都']);
    } finally {
      await session.detach();
    }
  });

  test(`${field} keeps an external update when native composition completes`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}`);
    const editor = page.locator('#controlled');
    await editor.focus();
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.imeSetComposition', { text: 'とう', selectionStart: 2, selectionEnd: 2 });
      await expect(editor).toHaveValue(/とう/);
      await page.getByRole('button', { name: '別の欄を更新' }).dispatchEvent('click');
      await expect(page.locator('#controlled-value')).toHaveText('外部の更新');
      await session.send('Input.insertText', { text: '東京' });
      await expect(editor).toHaveValue('外部の更新');
      await expect(page.locator('#controlled-changes')).toHaveText('[]');
    } finally {
      await session.detach();
    }
  });

  test(`${field} discards native composition on read-only and accepts the first unlocked edit`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}`);
    const editor = page.locator('#reactive');
    const toggle = page.getByRole('button', { name: '読み取り専用を切り替える' });
    await editor.focus();
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.imeSetComposition', { text: 'とう', selectionStart: 2, selectionEnd: 2 });
      await expect(editor).toHaveValue('とう');
      await toggle.dispatchEvent('click');
      await expect(editor).toHaveJSProperty('readOnly', true);
      await session.send('Input.insertText', { text: '東京' });
      await expect(editor).toHaveValue('');
      await expectChanges(page, [], []);
      await toggle.dispatchEvent('click');
      await expect(editor).toHaveJSProperty('readOnly', false);
      await session.send('Input.insertText', { text: '京都' });
      await expect(editor).toHaveValue('京都');
      await expectChanges(page, ['京都']);
    } finally {
      await session.detach();
    }
  });

  test(`${field} respects nullable reset, readonly and disabled during a composition`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}`);
    const editor = page.locator('#reactive');
    await draft(editor, 'とう');
    await expect(editor).toHaveValue('とう');
    await page.getByRole('button', { name: '初期化' }).dispatchEvent('click');
    await expect(editor).toHaveValue('');
    await finish(editor, '東京', true);
    await expectChanges(page, [null], []);
    await expect(editor).toHaveValue('');

    for (const name of ['読み取り専用を切り替える', '有効状態を切り替える']) {
      await draft(editor, 'ちば');
      await page.getByRole('button', { name }).dispatchEvent('click');
      await expect(editor).toHaveValue('');
      await finish(editor, '千葉');
      await expectChanges(page, [null], []);
      await page.getByRole('button', { name }).dispatchEvent('click');
    }
    await editor.fill('京都');
    await expectChanges(page, [null, '京都'], ['京都']);
  });

  test(`${field} keeps composition local while a controlled value changes`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}`);
    const editor = page.locator('#reactive');
    const controlled = page.locator('#controlled');
    await draft(editor, 'か');
    await draft(controlled, 'ちば');
    await expect(page.locator('#controlled-changes')).toHaveText('[]');
    await page.getByRole('button', { name: '別の欄を更新' }).dispatchEvent('click');
    await expect(controlled).toHaveValue('外部の更新');
    await finish(controlled, '千葉', true);
    await expect(controlled).toHaveValue('外部の更新');
    await expect(page.locator('#controlled-changes')).toHaveText('[]');
    await expect(editor).toHaveValue('か');
    await finish(editor, '神奈川');
    await expectChanges(page, ['神奈川']);
    await draft(controlled, '山形');
    await expect(page.locator('.ui-input-count').last()).toHaveText('2 文字');
    await finish(controlled, '山形', true);
    await expect(controlled).toHaveValue('山形');
    await expect(page.locator('#controlled-changes')).toHaveText('["山形"]');
    await controlled.fill('秋田');
    await expect(page.locator('#controlled-changes')).toHaveText('["山形","秋田"]');
  });

  test(`${field} keeps the Angular updateOn blur boundary`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}&update=blur`);
    const editor = page.locator('#reactive');
    await editor.focus();
    await draft(editor, 'とう');
    await finish(editor, '東京');
    await expectChanges(page, [], ['東京']);
    await editor.blur();
    await expectChanges(page, ['東京']);
  });

  for (const accepts of [true, false]) {
    test(`${field} preserves the controlled owner's ${accepts ? 'acceptance' : 'rejection'} after a late IME input`, async ({ page }) => {
      await page.goto(`/catalog/text-composition?field=${field}${accepts ? '' : '&reject'}`);
      const editor = page.locator('#controlled');
      const count = page.locator('.ui-input-count').last();
      await draft(editor, '東京');
      await expect(count).toHaveText('2 文字');
      await finish(editor, '東京', true);
      const expected = accepts ? '東京' : '初期値';
      await expect(page.locator('#controlled-value')).toHaveText(expected);
      await expect(page.locator('#controlled-changes')).toHaveText('["東京"]');
      await expect(editor).toHaveValue(expected);
      await replayAfterRender(editor, '東京');
      await expect(editor).toHaveValue(expected);
      await expect(count).toHaveText(accepts ? '2 文字' : '3 文字');
      await expect(page.locator('#controlled-changes')).toHaveText('["東京"]');
      if (!accepts) {
        await page.getByRole('button', { name: '次の入力を受け入れる' }).click();
        await editor.fill('東京');
        await expect(page.locator('#controlled-value')).toHaveText('東京');
        await expect(page.locator('#controlled-changes')).toHaveText('["東京","東京"]');
      }
    });
  }

  test(`${field} preserves a form reset after a late IME input and accepts a new edit`, async ({ page }) => {
    await page.goto(`/catalog/text-composition?field=${field}`);
    const editor = page.locator('#reactive');
    await draft(editor, '東京');
    await expect(page.locator('.ui-input-count').first()).toHaveText('2 文字');
    await finish(editor, '東京');
    await expectChanges(page, ['東京']);
    await page.getByRole('button', { name: '初期化' }).dispatchEvent('click');
    await expect(editor).toHaveValue('');
    await replayAfterRender(editor, '東京');
    await expect(editor).toHaveValue('');
    await expectChanges(page, ['東京', null], ['東京']);
    await editor.fill('東京');
    await expectChanges(page, ['東京', null, '東京'], ['東京', '東京']);
    await editor.fill('大阪');
    await replayAfterRender(editor, '東京');
    await expect(editor).toHaveValue('大阪');
    await expectChanges(page, ['東京', null, '東京', '大阪'], ['東京', '東京', '大阪']);
    await draft(editor, 'きょう');
    await finish(editor, '京都');
    await expectChanges(page, ['東京', null, '東京', '大阪', '京都'], ['東京', '東京', '大阪', '京都']);
    await editor.fill('');
    await editor.pressSequentially('ab');
    await expectChanges(page, ['東京', null, '東京', '大阪', '京都', '', 'a', 'ab'], ['東京', '東京', '大阪', '京都', '', 'a', 'ab']);
  });
}

test('clearing an unfinished text entry clears the displayed candidate and restores focus', async ({ page }) => {
  await page.goto('/catalog/text-composition');
  const editor = page.locator('#reactive');
  await draft(editor, 'とう');
  await page.getByRole('button', { name: '件名をクリア' }).dispatchEvent('click');
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('');
  await finish(editor, '東京', true);
  await expectChanges(page, ['']);
  await expect(editor).toHaveValue('');
});

test.describe('Android user agent', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36' });

  test('default matches Android input timing', async ({ page }) => {
    await checkComposition(page, 'text', '', false);
  });

  test('an explicit Angular buffer overrides the platform default', async ({ page }) => {
    await checkComposition(page, 'textarea', '&buffer=on', true);
  });
});
