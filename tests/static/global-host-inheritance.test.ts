import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';

const example = await readFile(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
const consumer = 'padding:var(--a)';
const sources = ['document', 'none'] as const;
type ConsumerSource = (typeof sources)[number];

interface FixtureOptions {
  external?: boolean;
  childTemplate?: string;
  childStyles?: string;
  childMode?: string;
  childHost?: Record<string, string>;
  parentTemplate?: string;
  consumerStyles?: string;
}

function fixture(source: ConsumerSource, options: FixtureOptions = {}) {
  const childTemplate = options.childTemplate ?? '<p class="leaf" style="--b:17px"></p>';
  const childStyles = options.childStyles ?? ':host{--a:var(--b)}';
  const parentTemplate = options.parentTemplate ?? '<app-child style="--b:19px"></app-child>';
  const consumerStyles = options.consumerStyles ?? `.leaf{${consumer}}`;
  const files: Record<string, string> = {};
  const template = (name: string, contents: string) => {
    if (!options.external) return `template:${JSON.stringify(contents)}`;
    files[`${name}.html`] = contents;
    return `templateUrl:'./${name}.html'`;
  };
  const styles = (name: string, contents: string) => {
    if (!options.external) return `styles:[${JSON.stringify(contents)}]`;
    files[`${name}.css`] = contents;
    return `styleUrl:'./${name}.css'`;
  };
  const child = `@Component({selector:'app-child',${template('child', childTemplate)},${styles('child', childStyles)},encapsulation:${options.childMode ?? 'ViewEncapsulation.Emulated'},host:${JSON.stringify(options.childHost ?? {})}})class Child{}`;
  const parent = `@Component({selector:'app-parent',imports:[Child],${template('parent', parentTemplate)}${source === 'none' ? `,encapsulation:ViewEncapsulation.None,${styles('parent', consumerStyles)}` : ''}})class Parent{flag!:boolean}`;
  if (source === 'document') files['global.css'] = consumerStyles;
  return {
    body: child + parent,
    files,
    consumerFile: source === 'document' ? 'app/global.css' : options.external ? 'app/parent.css' : 'app/app.ts',
  };
}

async function scan(input: ReturnType<typeof fixture>) {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-global-host-inheritance-'));
  try {
    await mkdir(resolve(root, 'app'));
    const files = {
      'app.ts': `import{Component,ViewEncapsulation}from'@angular/core';${input.body}\nthrow new Error('Application fixture must never execute');`,
      ...input.files,
    };
    for (const [name, contents] of Object.entries(files)) await writeFile(resolve(root, 'app', name), contents);
    const configInput = parseConfig(example);
    configInput.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
    const config = resolveConfig(configInput);
    return await checkSources({ root, config, policy: createSourcePolicy(config) });
  } finally { await rm(root, { recursive: true, force: true }); }
}

type Report = Awaited<ReturnType<typeof scan>>;
function expectValues(report: Report, input: ReturnType<typeof fixture>, expected: readonly string[], excluded = ['17px']) {
  const details = JSON.stringify({ input, diagnostics: report.diagnostics });
  const errors = report.diagnostics.filter(d => d.severity === 'error');
  const hasLiteral = (value: string) => errors.some(d => d.rule === 'literal-token' && d.file === input.consumerFile
    && d.source.includes(consumer) && d.message.includes(`Concrete value ${value} `));
  for (const value of expected) assert.ok(hasLiteral(value), `Expected ${value}: ${details}`);
  for (const value of excluded) assert.equal(hasLiteral(value), false, `Unexpected ${value}: ${details}`);
  if (!expected.length) assert.deepEqual(errors, [], details);
  assert.ok(report.diagnostics.some(d => d.rule === 'unresolved' && d.file === input.consumerFile && d.source.includes(consumer)), details);
}

// 107 bounded scan inputs. Fixtures are parsed only: no application or Sass execution.
test('foreign consumers inspect scoped host aliases in inline and external Angular sources', async () => {
  for (const source of sources) for (const external of [false, true]) for (const value of ['0', 'var(--ui-space-field)', '19px']) {
    const input = fixture(source, { external, parentTemplate: `<app-child style="--b:${value}"></app-child>` });
    expectValues(await scan(input), input, value === '19px' ? ['19px'] : []);
  }
});

test('host alias chains compute before transfer through native descendants and ancestors', async () => {
  for (const source of sources) for (const nested of [false, true]) for (const value of ['0', 'var(--ui-space-field)', '19px']) {
    const leaf = '<p class="leaf" style="--b:17px;--c:17px"></p>';
    const input = fixture(source, {
      childStyles: ':host{--a:var(--b);--b:var(--c)}',
      childTemplate: nested ? `<section style="--b:17px;--c:17px">${leaf}</section>` : leaf,
      parentTemplate: `<app-child style="--c:${value}"></app-child>`,
    });
    expectValues(await scan(input), input, value === '19px' ? ['19px'] : []);
  }
});

test('finite host class and id alternatives keep alias and dependency branches correlated', async () => {
  for (const source of sources) for (const attribute of ['class', 'id']) for (const leftValue of ['0', '19px']) {
    const anchor = attribute === 'class' ? '.' : '#';
    const input = fixture(source, {
      childStyles: `:host(${anchor}left){--a:var(--b);--b:${leftValue}}:host(${anchor}right){--b:19px}`,
      parentTemplate: `<app-child [${attribute}]="flag ? 'left' : 'right'"></app-child>`,
    });
    expectValues(await scan(input), input, leftValue === '19px' ? ['19px'] : []);
  }
});

test('host resolution does not borrow a dependency from another application or native sibling', async () => {
  for (const source of sources) {
    for (const value of ['0', '19px']) {
      const input = fixture(source, {
        childStyles: ':host(.left){--a:var(--b)}',
        parentTemplate: `<app-child class="left" style="--b:${value}"></app-child><app-child class="right" style="--b:19px"></app-child>`,
      });
      expectValues(await scan(input), input, value === '19px' ? ['19px'] : []);
    }
    const sibling = fixture(source, {
      childTemplate: '<p class="leaf" style="--b:17px"></p><i style="--b:19px"></i>',
      parentTemplate: '<app-child></app-child>',
    });
    expectValues(await scan(sibling), sibling, []);
  }
});

test('child own writers remain inspectable beside incoming and local semantic alternatives', async () => {
  for (const source of sources) for (const options of [
    { childStyles: ':host{--a:var(--b);--b:19px}', parentTemplate: '<app-child style="--b:0"></app-child>' },
    { childStyles: ':host{--a:var(--ui-space-field)}', parentTemplate: '<app-child style="--a:19px"></app-child>' },
    { childStyles: ':host{--a:var(--ui-space-field)}', childHost: { style: '--a:19px' }, parentTemplate: '<app-child style="--a:0"></app-child>' },
    { consumerStyles: `.leaf{--a:var(--ui-space-field);${consumer}}` },
  ]) {
    const input = fixture(source, options);
    expectValues(await scan(input), input, ['19px']);
  }
});

test('a leaf or pseudo may use its own 17px dependency only through an actual own alias', async () => {
  for (const source of sources) for (const pseudo of [false, true]) {
    const input = fixture(source, {
      childTemplate: pseudo ? '<p class="leaf"></p>' : '<p class="leaf" style="--a:var(--b);--b:17px"></p>',
      parentTemplate: '<app-child style="--b:0"></app-child>',
      consumerStyles: pseudo ? `.leaf::before{--a:var(--b);--b:17px;${consumer}}` : `.leaf{${consumer}}`,
    });
    expectValues(await scan(input), input, ['17px'], ['19px']);
  }
});

test('registered aliases block host and pseudo inheritance while same-host dependencies remain own values', async () => {
  const registration = (name: string) => `@property ${name}{syntax:"*";inherits:false;initial-value:0}`;
  for (const source of sources) {
    const hostToNative = fixture(source, { consumerStyles: `${registration('--a')}.leaf{${consumer}}` });
    expectValues(await scan(hostToNative), hostToNative, []);
    const nativeToPseudo = fixture(source, {
      childTemplate: '<p class="leaf" style="--a:19px;--b:17px"></p>',
      consumerStyles: `${registration('--a')}.leaf::before{${consumer}}`,
    });
    expectValues(await scan(nativeToPseudo), nativeToPseudo, []);
    const ownDependency = fixture(source, {
      childStyles: ':host{--a:var(--b);--b:19px}',
      parentTemplate: '<app-child style="--b:0"></app-child>',
      consumerStyles: `${registration('--b')}.leaf{${consumer}}`,
    });
    expectValues(await scan(ownDependency), ownDependency, ['19px']);
  }
});

test('normal pseudo consumers inherit the host computation without reusing native dependencies', async () => {
  for (const source of sources) for (const pseudo of ['::before', '::after']) for (const value of ['0', '19px']) {
    const input = fixture(source, {
      parentTemplate: `<app-child style="--b:${value}"></app-child>`,
      consumerStyles: `.leaf${pseudo}{--b:17px;${consumer}}`,
    });
    expectValues(await scan(input), input, value === '19px' ? ['19px'] : []);
  }
});

test('document and SharedStylesHost reachability retain their distinct shadow boundaries', async () => {
  for (const source of sources) for (const childMode of [
    'ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom',
    'ViewEncapsulation.ExperimentalIsolatedShadowDom', 'unknownMode()',
  ]) {
    const input = fixture(source, { childMode });
    const reachable = childMode === 'ViewEncapsulation.Emulated'
      || source === 'none' && childMode === 'ViewEncapsulation.ShadowDom';
    expectValues(await scan(input), input, reachable ? ['19px'] : []);
  }
});

test('identical document and None CSS text retains its own stylesheet reachability and diagnostic file', async () => {
  for (const external of [false, true]) {
    const css = `.leaf{${consumer}}`;
    const input = fixture('none', { external, childMode: 'ViewEncapsulation.ShadowDom', consumerStyles: css });
    input.files['global.css'] = css;
    const report = await scan(input);
    expectValues(report, input, ['19px']);
    assert.equal(report.diagnostics.some(d => d.file === 'app/global.css' && d.severity === 'error'
      && d.source.includes(consumer) && d.message.includes('Concrete value 19px ')), false, JSON.stringify(report.diagnostics));
  }
});

test('native nodes declared inside ng-template never inherit the declaring component host', async () => {
  for (const source of sources) for (const external of [false, true]) {
    const input = fixture(source, { external, childTemplate: '<ng-template><p class="leaf" style="--b:17px"></p></ng-template>' });
    expectValues(await scan(input), input, []);
  }
});

test('true host alias cycles remain Unknown for foreign native consumers', async () => {
  for (const source of sources) for (const cycle of ['--b:var(--a)', '--b:var(--b)']) {
    const input = fixture(source, { childStyles: `:host{--a:var(--b);${cycle}}`, parentTemplate: '<app-child></app-child>' });
    expectValues(await scan(input), input, []);
  }
});

test('a definite literal outside an unresolved alias is still a violation', async () => {
  for (const source of sources) {
    const input = fixture(source, {
      childStyles: ':host{--a:var(--b);--b:var(--a)}',
      parentTemplate: '<app-child></app-child>',
      consumerStyles: '.leaf{padding:var(--a) 23px}',
    });
    expectValues(await scan(input), input, ['23px']);
  }
});

test('arbitrary child internal scoped CSS is not promoted into foreign stylesheet supply', async () => {
  for (const source of sources) {
    const input = fixture(source, { childStyles: '.leaf{--a:19px}', parentTemplate: '<app-child></app-child>' });
    expectValues(await scan(input), input, []);
  }
});

test('a parent native sibling never inherits the neighboring child component host', async () => {
  for (const source of sources) {
    const input = fixture(source, {
      childTemplate: '',
      parentTemplate: '<app-child style="--b:19px"></app-child><p class="leaf" style="--b:17px"></p>',
    });
    expectValues(await scan(input), input, []);
  }
});

test('None host inheritance uses global selectors or real host writers instead of unshimmed host CSS', async () => {
  for (const source of sources) for (const writer of ['host-css', 'global-css', 'metadata']) {
    const input = fixture(source, {
      childMode: 'ViewEncapsulation.None',
      childStyles: writer === 'host-css' ? ':host{--a:19px}' : writer === 'global-css' ? 'app-child{--a:19px}' : '',
      childHost: writer === 'metadata' ? { style: '--a:19px' } : {},
    });
    expectValues(await scan(input), input, writer === 'host-css' ? [] : ['19px']);
  }
});

function sharedShadow(parentMode: string, raw: boolean, outerDetached = false, innerDetached = false, childMode = 'ViewEncapsulation.ShadowDom') {
  const leaf = raw ? '<p class="leaf" style="--a:19px;--b:17px"></p>' : '<p class="leaf" style="--b:17px"></p>';
  const input = fixture('document', {
    childMode,
    childStyles: raw ? '' : ':host{--a:19px}',
    childTemplate: innerDetached ? `<ng-template>${leaf}</ng-template>` : leaf,
    parentTemplate: outerDetached ? '<ng-template><app-child></app-child></ng-template>' : '<app-child></app-child>',
  });
  delete input.files['global.css'];
  input.consumerFile = 'app/app.ts';
  input.body = input.body.replace('})class Parent{', `,encapsulation:${parentMode}})class Parent{`)
    + `@Component({selector:'app-theme',template:'',styles:['.leaf{${consumer}}'],encapsulation:ViewEncapsulation.None})class Theme{}`
    + `@Component({selector:'app-root',template:'<app-theme></app-theme><app-parent></app-parent>',imports:[Theme,Parent]})class Root{}`;
  return input;
}

test('shared consumers reach a standard shadow root independently of the outer host placement', async () => {
  for (const parentMode of ['ViewEncapsulation.Emulated', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.ExperimentalIsolatedShadowDom', 'unknownMode()']) for (const raw of [false, true]) {
    const input = sharedShadow(parentMode, raw);
    expectValues(await scan(input), input, ['19px']);
  }
  for (const raw of [false, true]) {
    const input = sharedShadow('ViewEncapsulation.Emulated', raw, true);
    expectValues(await scan(input), input, ['19px']);
  }
});

test('shared shadow reachability does not certify inner detached views or unknown shadow renderers', async () => {
  const inner = sharedShadow('ViewEncapsulation.Emulated', false, false, true);
  expectValues(await scan(inner), inner, []);
  for (const mode of ['ViewEncapsulation.ExperimentalIsolatedShadowDom', 'unknownMode()']) {
    const input = sharedShadow('ViewEncapsulation.Emulated', false, false, false, mode);
    expectValues(await scan(input), input, []);
  }
});
