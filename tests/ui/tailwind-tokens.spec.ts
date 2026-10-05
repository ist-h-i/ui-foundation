import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { parseConfig, resolveConfig } from '../../src/config';
import { renderTailwind, renderTokens } from '../../src/tokens';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('同じ役割名の色・書体を追加しても文字サイズと太さのutilityを独立して生成する', async ({ page }) => {
  const directory = await mkdtemp(join(tmpdir(), 'ui-foundation-tailwind-'));
  try {
    const config = parseConfig(await readFile(join(root, 'examples/ui.config.example.yaml'), 'utf8'));
    config.semantic['color.body'] = 'blue';
    config.primitives['control-font'] = { type: 'fontFamily', value: 'serif' };
    config.semantic['font.control'] = 'control-font';
    config.profiles.dense.semantic['weight.body'] = 'bold';
    const resolved = resolveConfig(config);
    const entry = join(directory, 'entry.css');
    const output = join(directory, 'output.css');
    await writeFile(entry, `@import "${join(root, 'node_modules/tailwindcss/index.css')}" source(none);\n`
      + renderTokens(resolved) + renderTailwind(resolved)
      + '@source inline("text-color-body text-size-body font-family-body font-family-control font-weight-body font-weight-control");\n');
    execFileSync(join(root, 'node_modules/.bin/tailwindcss'), ['-i', entry, '-o', output], { cwd: root, stdio: 'pipe' });
    const css = await readFile(output, 'utf8');
    for (const [profile, fontSize, fontWeight] of [['guided', '18px', '400'], ['dense', '16px', '700']] as const) {
      await page.setContent(`<style>${css}</style><main data-ui-profile="${profile}">
        <p data-testid="body" class="text-color-body text-size-body font-family-body font-weight-body">本文</p>
        <p data-testid="control" class="text-size-body font-family-control font-weight-control">操作</p>
      </main>`);
      const body = await page.getByTestId('body').evaluate(element => {
        const style = getComputedStyle(element);
        return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily };
      });
      expect(body).toMatchObject({ color: 'rgb(24, 86, 166)', fontSize, fontWeight });
      expect(body.fontFamily).toContain('system-ui');
      const control = await page.getByTestId('control').evaluate(element => {
        const style = getComputedStyle(element);
        return { fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontSize: style.fontSize };
      });
      expect(control).toEqual({ fontFamily: 'serif', fontWeight: '600', fontSize });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
