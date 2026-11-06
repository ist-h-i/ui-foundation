import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifyEnglishDocumentation } from '../../scripts/package-verification/documentation.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('all distributed operational references have English counterparts and an English-only reading path', async () => {
  await verifyEnglishDocumentation(root);
});
