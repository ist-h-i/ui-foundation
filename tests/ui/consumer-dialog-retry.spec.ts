import { test } from '@playwright/test';
import { verifyRegistrationRetry } from '../../skills/ui-development/references/examples/dialog-retry';

test('the distributed example retries a failed save with its draft and restores focus', async ({ page }) => {
  await verifyRegistrationRetry(page);
});
