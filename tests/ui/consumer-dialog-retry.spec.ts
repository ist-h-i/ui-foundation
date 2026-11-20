import { expect, test } from '@playwright/test';
import { verifyRegistrationRetry } from '../../skills/ui-development/references/examples/dialog-retry';

test('the distributed example retries a failed save with its draft and restores focus', async ({ page }) => {
  await verifyRegistrationRetry(page);
});

test('the example catches a draft discarded after failure', async ({ page }) => {
  await expect(verifyRegistrationRetry(page, '/catalog/dialog-retry?regression=draft'))
    .rejects.toThrow(/toHaveValue/);
});

test('the example catches missing focus restoration after a successful retry', async ({ page }) => {
  await expect(verifyRegistrationRetry(page, '/catalog/dialog-retry?regression=focus'))
    .rejects.toThrow(/Focus returns to the opener after successful save/);
});
