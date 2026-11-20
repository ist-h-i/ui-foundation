import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// The model layer uses these framework-independent JSON and date libraries. Review other external imports explicitly.
const modelDependencies = new Set(['jsonc-parser', 'temporal-polyfill']);

async function checkModels(directory: string, models: string[]): Promise<void> {
  const visited = new Set<string>();
  async function visit(path: string, chain: string[]): Promise<void> {
    if (visited.has(path)) return;
    visited.add(path);
    const source = await readFile(path, 'utf8');
    for (const { fileName } of ts.preProcessFile(source, true, true).importedFiles) {
      const next = [...chain, fileName];
      if (fileName.startsWith('.')) {
        const relative = fileName.endsWith('.ts') ? fileName : fileName + '.ts';
        await visit(resolve(dirname(path), relative), next);
      } else assert.ok(modelDependencies.has(fileName), next.join(' → '));
    }
  }
  for (const model of models) await visit(resolve(directory, model), [model]);
}

test('generated domain models depend only on other pure modules and the reviewed libraries', async () => {
  const directory = fileURLToPath(new URL('../../.ui/generated/angular/', import.meta.url));
  const models = (await readdir(directory)).filter(name => name.endsWith('-model.ts'));
  assert.ok(models.includes('collection-model.ts') && models.includes('table-model.ts'));
  await checkModels(directory, models);
});

test('a model cannot introduce an Angular dependency through a re-exported UI package', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'ui-model-dependency-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(resolve(directory, 'chosen-model.ts'), "export * from './helper';");
  await writeFile(resolve(directory, 'helper.ts'), "export { LucideDynamicIcon as icon } from '@lucide/angular';");
  await assert.rejects(checkModels(directory, ['chosen-model.ts']), /chosen-model\.ts → \.\/helper → @lucide\/angular/);
});
