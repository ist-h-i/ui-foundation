import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

test('generated chart components defer ECharts and load only their supported series', async () => {
  const { metafile } = await build({
    entryPoints: ['.ui/generated/angular/chart.ts', '.ui/generated/angular/gantt.ts'],
    bundle: true,
    splitting: true,
    format: 'esm',
    target: 'es2022',
    outdir: 'dist/chart-engine-test',
    external: ['@angular/*', 'rxjs'],
    metafile: true,
    write: false,
  });
  const outputs = metafile.outputs;
  function staticInputs(entry: string): string[] {
    const start = Object.entries(outputs).find(([, output]) =>
      output.entryPoint === '.ui/generated/angular/' + entry + '.ts');
    assert.ok(start, 'Missing generated entry ' + entry);
    const visited = new Set<string>();
    const inputs = new Set<string>();
    function visit(file: string) {
      if (visited.has(file)) return;
      visited.add(file);
      const output = outputs[file]!;
      for (const [input, data] of Object.entries(output.inputs)) {
        if (data.bytesInOutput > 0) inputs.add(input);
      }
      for (const edge of output.imports) {
        if (!edge.external && edge.kind !== 'dynamic-import') visit(edge.path);
      }
    }
    visit(start[0]);
    return [...inputs];
  }
  for (const component of ['chart', 'gantt']) {
    assert.deepEqual(staticInputs(component).filter(path => /node_modules\/(?:echarts|zrender)\//.test(path)), []);
  }
  for (const [entry, expected] of Object.entries({
    'gantt-engine': ['custom'],
    'sparkline-engine': ['line'],
    'chart-engine': ['bar', 'gauge', 'heatmap', 'line', 'pie', 'radar', 'scatter', 'treemap'],
  })) {
    const installed = staticInputs(entry).flatMap(path =>
      path.match(/node_modules\/echarts\/lib\/chart\/([^/]+)\/install\.js$/)?.[1] ?? []);
    assert.deepEqual(installed.sort(), expected, entry);
  }
});
