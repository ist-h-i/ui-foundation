import { expect, type Page } from '@playwright/test';

// Match these values and the response bodies to your application's contract.
export async function verifyRegistrationRetry(page: Page, screen = '/catalog/dialog-retry') {
  const draft = 'Example draft';
  const submissions: unknown[] = [];
  await page.route('**/api/registrations', async route => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    submissions.push(route.request().postDataJSON());
    const firstAttempt = submissions.length === 1;
    await route.fulfill({
      status: firstAttempt ? 503 : 201,
      json: firstAttempt ? { code: 'temporarily_unavailable' } : { id: 'registration-1' },
    });
  });
  await page.goto(screen);

  const opener = page.getByRole('button', { name: 'New registration', exact: true });
  await page.keyboard.press('Tab');
  await expect(opener).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Register item' });
  const name = dialog.getByRole('textbox', { name: 'Item name' });
  const save = dialog.getByRole('button', { name: 'Save', exact: true });

  await expect(name).toBeFocused();
  await page.keyboard.type(draft);
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('alert')).toHaveText('Could not save. Try again.');
  await expect(name).toHaveValue(draft);
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(dialog).toBeHidden();
  await expect(opener, 'Focus returns to the opener after successful save').toBeFocused();
  expect(submissions).toEqual([{ name: draft }, { name: draft }]);
}
