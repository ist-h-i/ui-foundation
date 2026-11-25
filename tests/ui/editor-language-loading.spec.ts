import { readdir, readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

// esbuild hashes chunk names. Identify the actual language code from its source map.
async function languageChunks() {
  const chunks = new URL('../../dist/fixture-app/chunks/', import.meta.url);
  const modules = new Map<string, string[]>();
  for (const file of await readdir(chunks)) {
    if (!file.endsWith('.js.map')) continue;
    const { sources } = JSON.parse(await readFile(new URL(file, chunks), 'utf8')) as { sources: string[] };
    const languages = sources.flatMap(source => source.match(/@codemirror\/lang-([^/]+)\/dist\/index\.js$/)?.[1] ?? []);
    if (languages.length) modules.set('/chunks/' + file.slice(0, -4), languages);
  }
  return modules;
}

test('plain text omits grammars and a late language cannot replace a newer choice or selection', async ({ page }) => {
  const chunks = await languageChunks();
  const jsonChunk = [...chunks].find(([, languages]) => languages.includes('json'));
  expect(jsonChunk).toBeDefined();
  const requested = new Set<string>();
  page.on('request', request => {
    for (const language of chunks.get(new URL(request.url()).pathname) ?? []) requested.add(language);
  });
  const pending = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  await page.route('**' + jsonChunk![0], async route => {
    pending.resolve();
    await release.promise;
    await route.continue();
  });

  await page.goto('/catalog/editor-languages');
  const content = page.locator('.cm-content');
  const select = (name: string) => page.getByRole('button', { name, exact: true }).click();
  await expect(content).toBeEditable();
  await expect(page.locator('ui-code-editor').getByRole('status')).toHaveCount(0);
  expect([...requested]).toEqual([]);
  await select('json');
  await pending.promise;
  try {
    await content.fill('keep this edit');
    await content.press('End');
    await content.press('Shift+Home');
    await select('javascript');
    await expect(content).toHaveAttribute('data-language', 'javascript');
    await expect(page.locator('output')).toHaveText('keep this edit');
  } finally {
    release.resolve();
  }
  await page.waitForLoadState('networkidle');
  await expect(content).toHaveAttribute('data-language', 'javascript');
  await content.focus();
  expect(await page.evaluate(() => document.getSelection()?.toString())).toBe('keep this edit');
  await content.press('ControlOrMeta+z');
  await expect(content).toHaveText('source');
  await select('text');
  await expect(content).not.toHaveAttribute('data-language', /.+/);
  expect([...requested].sort()).toEqual(['javascript', 'json']);
});

test('a failed language request leaves the draft editable and a new choice clears the error', async ({ page }) => {
  const json = [...await languageChunks()].find(([, languages]) => languages.includes('json'));
  expect(json).toBeDefined();
  await page.route('**' + json![0], route => route.abort());
  await page.goto('/catalog/editor-languages');
  const content = page.locator('.cm-content');
  await content.fill('original');
  await page.getByRole('button', { name: 'json', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await content.fill('still editable');
  await expect(page.locator('output')).toHaveText('still editable');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'markdown', exact: true }).click();
  await expect(content).toHaveAttribute('data-language', 'markdown');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(content).toHaveText('still editable');
});
