import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { ConfigValidationError, parseConfig, resolveConfig } from '../../src/config.ts';
import { renderTailwind, renderTokens } from '../../src/tokens.ts';

const example = readFileSync(new URL('../../examples/ui.config.example.yaml', import.meta.url), 'utf8');
const edited = (change: (config: any) => void): string => {
  const config = parse(example);
  change(config);
  return stringify(config, { aliasDuplicateObjects: false });
};
const resolve = (source = example) => resolveConfig(parseConfig(source));
test('knob size follows its own positive semantic role and profile mapping',()=>{
 const result=resolve();assert.equal(result.profiles.guided.semantic['size.knob'].value,'160px');assert.equal(result.profiles.dense.semantic['size.knob'].value,'128px');
 assert.match(renderTailwind(result),/--spacing-size-knob: var\(--ui-size-knob\)/);assert.match(renderTokens(result),/--ui-size-knob: var\(--ui-p-knob-guided\)/);
 rejects(edited(config=>{delete config.semantic['size.knob'];}),/size.knob/);rejects(edited(config=>{config.primitives['knob-guided'].value='0px';}),/greater than zero/);
 rejects(edited(config=>{config.semantic['size.knob']='ink';}),/size.knob/);
});
test('navigation rail has a required positive semantic width in each profile',()=>{
 const result=resolve();assert.equal(result.profiles.guided.semantic['size.navigation-rail'].value,'72px');assert.equal(result.profiles.dense.semantic['size.navigation-rail'].value,'64px');
 assert.match(renderTailwind(result),/--spacing-size-navigation-rail: var\(--ui-size-navigation-rail\)/);assert.match(renderTokens(result),/--ui-size-navigation-rail: var\(--ui-p-navigation-rail-guided\)/);
 rejects(edited(config=>{delete config.semantic['size.navigation-rail'];}),/size.navigation-rail/);rejects(edited(config=>{config.primitives['navigation-rail-guided'].value='0px';}),/greater than zero/);
});
test('mega menu and column widths have dedicated positive semantics and explicit profile mappings',()=>{
 const result=resolve();assert.equal(result.profiles.guided.semantic['size.mega-menu'].value,'960px');assert.equal(result.profiles.dense.semantic['size.mega-menu'].value,'768px');assert.equal(result.profiles.guided.semantic['size.navigation-column'].value,'192px');assert.equal(result.profiles.dense.semantic['size.navigation-column'].value,'160px');
 assert.match(renderTailwind(result),/--spacing-size-navigation-column: var\(--ui-size-navigation-column\)/);assert.match(renderTokens(result),/--ui-size-mega-menu: var\(--ui-p-mega-menu-guided\)/);
 for(const role of ['size.mega-menu','size.navigation-column'])rejects(edited(config=>{delete config.semantic[role];}),new RegExp(role));rejects(edited(config=>{config.primitives['mega-menu-guided'].value='0px';}),/greater than zero/);
});
test('drawer dimensions are dedicated positive semantics with explicit profile mappings',()=>{
 const result=resolve();assert.equal(result.profiles.guided.semantic['size.drawer-inline'].value,'384px');assert.equal(result.profiles.dense.semantic['size.drawer-inline'].value,'320px');
 assert.equal(result.profiles.guided.semantic['size.drawer-block'].value,'480px');assert.equal(result.profiles.dense.semantic['size.drawer-block'].value,'400px');
 assert.match(renderTailwind(result),/--spacing-size-drawer-inline: var\(--ui-size-drawer-inline\)/);assert.match(renderTokens(result),/--ui-size-drawer-block: var\(--ui-p-drawer-block-guided\)/);
 rejects(edited(config=>{delete config.semantic['size.drawer-inline'];}),/size.drawer-inline/);
 rejects(edited(config=>{config.primitives['drawer-block-guided'].value='0px';}),/greater than zero/);
});
test('form label width has its own required semantic role and profile mapping',()=>{
 const result=resolve();assert.equal(result.profiles.guided.semantic['size.form-label'].value,'12rem');assert.equal(result.profiles.dense.semantic['size.form-label'].value,'9rem');
 assert.match(renderTailwind(result),/--spacing-size-form-label: var\(--ui-size-form-label\)/);assert.match(renderTokens(result),/--ui-size-form-label: var\(--ui-p-form-label-guided\)/);
 rejects(edited(config=>{delete config.semantic['size.form-label'];}),/size.form-label/);
});
test('display roles resolve from the source configuration and generate supported namespaces',()=>{
 const result=resolve();assert.equal(result.profiles.guided.semantic['size.avatar'].value,'64px');assert.equal(result.profiles.dense.semantic['size.avatar'].value,'48px');
 assert.match(String(result.profiles.guided.semantic['font.code'].value),/monospace/);assert.equal(result.profiles.guided.semantic['opacity.watermark'].value,.12);
 assert.match(renderTailwind(result),/--font-family-code: var\(--ui-font-code\)/);assert.match(renderTailwind(result),/--spacing-size-avatar: var\(--ui-size-avatar\)/);
 assert.doesNotMatch(renderTailwind(result),/--opacity-/);assert.match(renderTokens(result),/--ui-opacity-watermark: var\(--ui-p-watermark-opacity\)/);
});
test('opacity values reject out-of-range overrides with source locations',()=>{
 rejects(edited(c=>{c.primitives['watermark-opacity'].value=1.01;}),/Opacity.*between 0 and 1/);
 rejects(edited(c=>{c.primitives['watermark-opacity'].value=-.1;}),/Invalid number/);
 rejects(edited(c=>{c.primitives['too-opaque']={type:'number',value:2};c.profiles.dense.semantic['opacity.watermark']='too-opaque';}),/Opacity.*between 0 and 1/);
 assert.equal(resolve(edited(c=>{c.primitives['watermark-opacity'].value=0;})).profiles.guided.semantic['opacity.watermark'].value,0);
});
function rejects(source: string, message: RegExp) {
  assert.throws(() => resolve(source), (error: unknown) => {
    assert.ok(error instanceof ConfigValidationError);
    const insensitive = new RegExp(message.source, message.flags.includes('i') ? message.flags : `${message.flags}i`);
    const issue = error.issues.find((issue) => insensitive.test(issue.message));
    assert.ok(issue, error.message);
    assert.ok(issue.line >= 1);
    assert.ok(issue.column >= 1);
    assert.ok(issue.path.length > 0);
    return true;
  });
}

test('the approved example resolves explicit profile differences and preserves context', () => {
  const result = resolve();
  assert.equal(result.default_profile, 'guided');
  assert.equal(result.output, '.ui/generated');
  assert.equal(result.profiles.guided.semantic['color.action'].value, '#1856a6');
  assert.equal(result.profiles.dense.semantic['color.action'].value, '#175c3a');
  for (const role of ['color.link', 'color.tab-selected']) {
    assert.equal(result.profiles.guided.semantic[role].reference, 'blue');
    assert.equal(result.profiles.dense.semantic[role].reference, 'green');
  }
  assert.equal(result.profiles.guided.semantic['text.body'].value, '1.125rem');
  assert.equal(result.profiles.dense.semantic['text.body'].value, '1rem');
  assert.equal(result.profiles.guided.semantic['radius.control'].value, '12px');
  assert.equal(result.profiles.dense.semantic['radius.control'].value, '4px');
  assert.equal(result.profiles.guided.semantic['size.control'].value, '44px');
  assert.equal(result.profiles.dense.semantic['size.control'].value, '44px');
  assert.equal(result.profiles.dense.semantic['space.page'].reference, 'space-16');
  assert.match(result.profiles.guided.guidance, /必須項目/);
  assert.deepEqual(Object.keys(result.profiles.guided.semantic), Object.keys(result.profiles.dense.semantic));
});

test('prose-only edits cannot infer or alter token values', () => {
  const original = resolve();
  const changed = resolve(edited((config) => {
    config.context.product = '文字を極端に大きくして赤くしてほしい';
    config.profiles.dense.context.audience = ['初めて利用する人'];
    config.profiles.dense.guidance = '大きな文字と青い操作を使う案を検討する';
  }));
  assert.deepEqual(changed.primitives, original.primitives);
  assert.deepEqual(changed.profiles.dense.semantic, original.profiles.dense.semantic);
  assert.equal(renderTokens(changed), renderTokens(original));
  assert.equal(renderTailwind(changed), renderTailwind(original));
});

test('tokens and Tailwind are deterministic and respond to direct primitive references', () => {
  const original = resolve();
  assert.equal(renderTokens(resolve()), renderTokens(original));
  assert.equal(renderTailwind(resolve()), renderTailwind(original));
  const changed = resolve(edited((config) => { config.profiles.dense.semantic['space.page'] = 'space-32'; }));
  assert.equal(changed.profiles.dense.semantic['space.page'].value, '32px');
  assert.notEqual(renderTokens(changed), renderTokens(original));
  assert.match(renderTailwind(changed), /--spacing-page: var\(--ui-space-page\);/);
});

test('root defaults and every nested profile emit all roles rather than partial overrides', () => {
  const result = resolve();
  const css = renderTokens(result);
  const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const root = blocks.find((block) => block[1].trim() === ':root');
  assert.ok(root);
  assert.match(root[2], /--ui-p-blue: #1856a6;/);
  assert.match(root[2], /--ui-color-action: var\(--ui-p-blue\);/);
  for (const id of ['guided', 'dense']) {
    const block = blocks.find((block) => block[1].trim() === `[data-ui-profile="${id}"]`);
    assert.ok(block);
    for (const role of Object.keys(result.profiles[id].semantic)) {
      assert.ok(block[2].includes(`--ui-${role.replace('.', '-')}:`), `${id}: ${role}`);
    }
    assert.match(block[2], /--ui-size-control: var\(--ui-p-control-minimum\);/);
  }
  const denseDefault = resolve(edited((config) => { config.default_profile = 'dense'; }));
  assert.match(renderTokens(denseDefault), /:root \{[^}]*--ui-color-action: var\(--ui-p-green\);/);
});

test('additional roles are resolved for all scopes and supported Tailwind namespaces', () => {
  const result = resolve(edited((config) => {
    config.semantic['color.extra-link'] = 'blue';
    config.semantic['font.weight-body'] = 'system-font';
    config.semantic['space.hero-gap'] = 'space-32';
    config.semantic['motion.enter'] = 'duration';
    config.profiles.dense.semantic['color.extra-link'] = 'green';
  }));
  assert.equal(result.profiles.dense.semantic['color.extra-link'].reference, 'green');
  assert.match(renderTokens(result), /--ui-motion-enter: var\(--ui-p-duration\);/);
  const tailwind = renderTailwind(result);
  assert.match(tailwind, /@theme inline \{/);
  assert.match(tailwind, /--color-color-extra-link: var\(--ui-color-extra-link\);/);
  assert.match(tailwind, /--spacing-hero-gap: var\(--ui-space-hero-gap\);/);
  assert.match(tailwind, /--font-family-body: var\(--ui-font-body\);/);
  assert.match(tailwind, /--font-family-weight-body: var\(--ui-font-weight-body\);/);
  assert.match(tailwind, /--text-size-body: var\(--ui-text-body\);/);
  assert.match(tailwind, /--font-weight-weight-control: var\(--ui-weight-control\);/);
  assert.match(tailwind, /--spacing-size-control: var\(--ui-size-control\);/);
  assert.doesNotMatch(tailwind, /--motion-|--border-/);
});

test('a role added in only one profile is rejected to prevent nested inheritance leaks', () => {
  rejects(edited((config) => { config.profiles.dense.semantic['color.extra-link'] = 'green'; }), /every profile|全プロファイル/);
});

test('structure diagnostics identify the exact YAML key location', () => {
  const source = example.replace('schema_version: 1', 'schema_version: 1\nunknown_field: true');
  assert.throws(() => parseConfig(source), (error: unknown) => {
    assert.ok(error instanceof ConfigValidationError);
    const issue = error.issues.find((issue) => issue.path === 'unknown_field');
    assert.ok(issue);
    assert.equal(issue.line, 4);
    assert.equal(issue.column, 1);
    return true;
  });
});

test('unsafe value diagnostics retain its original YAML line and field', () => {
  const source = example.replace('text-guided: { type: length, value: 1.125rem }', 'text-guided: { type: length, value: "var(--external)" }');
  const line = source.split('\n').findIndex((line) => line.includes('text-guided:')) + 1;
  assert.throws(() => parseConfig(source), (error: unknown) => {
    assert.ok(error instanceof ConfigValidationError);
    const issue = error.issues.find((issue) => issue.path === 'primitives.text-guided.value');
    assert.ok(issue);
    assert.equal(issue.line, line);
    assert.ok(issue.column > 1);
    assert.match(issue.message, /length value/);
    return true;
  });
});

test('supported literal variants remain usable without granting free CSS syntax', () => {
  const result = resolve(edited((c) => {
    c.primitives['extra-hex'] = { type: 'color', value: '#abc' };
    c.primitives['extra-em'] = { type: 'length', value: '.5em' };
    c.primitives['extra-duration'] = { type: 'duration', value: '0.2s' };
    c.primitives['extra-count'] = { type: 'number', value: 0 };
    c.primitives['extra-easing'] = { type: 'easing', value: 'step-end' };
    c.primitives['extra-font'] = { type: 'fontFamily', value: '"游ゴシック", serif' };
    c.semantic['space.extra-gap'] = 'extra-em';
  }));
  assert.equal(result.primitives['extra-hex'].value, '#abc');
  assert.match(renderTokens(result), /--ui-p-extra-font: "游ゴシック", serif;/);
  assert.equal(result.profiles.guided.semantic['space.extra-gap'].value, '.5em');
});

test('additional roles defined by all profiles need no implicit default inference', () => {
  const result = resolve(edited((c) => {
    c.profiles.guided.semantic['color.extra-link'] = 'blue';
    c.profiles.dense.semantic['color.extra-link'] = 'green';
  }));
  assert.equal(result.profiles.guided.semantic['color.extra-link'].reference, 'blue');
  assert.equal(result.profiles.dense.semantic['color.extra-link'].reference, 'green');
  assert.match(renderTokens(result), /:root \{[^}]*--ui-color-extra-link: var\(--ui-p-blue\);/);
});

const invalidStructures: Array<[string, (config: any) => void, RegExp]> = [
  ['unsupported schema', (c) => { c.schema_version = 2; }, /schema_version|スキーマ/],
  ['unknown root key', (c) => { c.target = {}; }, /unknown|未知/],
  ['unknown context key', (c) => { c.context.users = []; }, /unknown|未知/],
  ['unknown primitive field', (c) => { c.primitives.ink.unit = 'hex'; }, /unknown|未知/],
  ['unknown profile key', (c) => { c.profiles.dense.density = 'compact'; }, /unknown|未知/],
  ['missing required role', (c) => { delete c.semantic['color.action']; }, /required role|必須の役割/],
  ['unknown default profile', (c) => { c.default_profile = 'missing'; }, /default_profile/],
  ['unknown primitive reference', (c) => { c.profiles.dense.semantic['color.action'] = 'missing'; }, /unknown primitive|プリミティブ/],
  ['semantic reference rejected', (c) => { c.semantic['color.action'] = 'color.success'; }, /direct primitive|直接参照/],
  ['wrong primitive type', (c) => { c.semantic['color.action'] = 'space-16'; }, /requires color|型/],
  ['invalid profile selector', (c) => { c.profiles['dense"] html'] = c.profiles.dense; }, /profile ID|プロファイルID/],
  ['invalid primitive name', (c) => { c.primitives['bad_name'] = c.primitives.ink; }, /primitive name|プリミティブ名/],
  ['multiple semantic dots', (c) => { c.semantic['color.action.extra'] = 'blue'; }, /category|カテゴリ/],
  ['unknown semantic category', (c) => { c.semantic['custom.action'] = 'blue'; }, /category|カテゴリ/],
  ['absolute output', (c) => { c.output = '/tmp/ui'; }, /relative|相対/],
  ['output traversal', (c) => { c.output = '.ui/../other'; }, /relative|相対/],
  ['empty profile audience', (c) => { c.profiles.dense.context.audience = []; }, /at least|一つ以上/],
];
for (const [name, change, message] of invalidStructures) {
  test(`rejects ${name} with a positioned reason`, () => rejects(edited(change), message));
}

const invalidValues: Array<[string, string, unknown]> = [
  ['color', 'ink', '#12345678'], ['color', 'ink', 'url(https://example.com)'],
  ['length', 'space-16', '-1px'], ['length', 'space-16', 'calc(1rem + 1px)'],
  ['length', 'space-16', 'var(--external)'], ['length', 'space-16', '100vh'],
  ['fontFamily', 'system-font', 'serif; color: red'],
  ['fontFamily', 'system-font', 'url(remote-font.woff2)'],
  ['number', 'regular', Number.POSITIVE_INFINITY], ['number', 'regular', -1],
  ['duration', 'duration', '-1ms'], ['duration', 'duration', 'var(--duration)'],
  ['easing', 'easing', 'cubic-bezier(0,0,1,1)'],
];
for (const [type, name, value] of invalidValues) {
  test(`rejects unsafe ${type} value ${String(value)}`, () => {
    rejects(edited((config) => { config.primitives[name].value = value; }), /value|値/);
  });
}

test('duplicate keys and YAML aliases are refused before value resolution', () => {
  rejects(example.replace('default_profile: guided', 'default_profile: guided\ndefault_profile: dense'), /unique|duplicate|重複/);
  rejects(example.replace('color.text: ink', 'color.text: ink\n  color.text: white'), /unique|duplicate|重複/);
  rejects(example.replace("ink: { type: color, value: '#1c293d' }", "ink: &ink { type: color, value: '#1c293d' }\n  copy: *ink"), /alias|エイリアス/);
  rejects(`${example}\n---\nextra: document`, /multiple documents/);
});

test('profile overrides cannot hide broken base references', () => {
  rejects(edited((c) => {
    c.semantic['color.action'] = 'missing';
    c.profiles.guided.semantic['color.action'] = 'blue';
    c.profiles.dense.semantic['color.action'] = 'green';
  }), /Unknown primitive reference/);
});

test('Tailwind variable collisions across spacing and size are rejected', () => {
  rejects(edited((c) => { c.semantic['space.size-control'] = 'space-16'; }), /collision|衝突/);
});

test('role values validate font weights and readable dimensions beyond primitive types', () => {
  rejects(edited((c) => { c.primitives.regular.value = 99; }), /100.*900/);
  rejects(edited((c) => { c.primitives.semibold.value = 901; }), /100.*900/);
  rejects(edited((c) => { c.primitives['leading-body'].value = 0; }), /greater than zero|0より大/);
  rejects(edited((c) => { c.primitives['text-guided'].value = '0px'; }), /greater than zero|0より大/);
  rejects(edited((c) => { c.primitives['focus-width'].value = '0px'; }), /greater than zero|0より大/);
});

test('defined text/background pairs are checked for each profile, including hover and status states', () => {
  rejects(edited((c) => { c.profiles.dense.semantic['color.on-action'] = 'green'; }), /dense.*contrast|dense.*コントラスト/);
  rejects(edited((c) => { c.primitives['green-hover'].value = '#ffffff'; }), /action-hover.*4\.5/);
  rejects(edited((c) => { c.semantic['color.warning'] = 'warning-wash'; }), /warning-surface.*4\.5/);
  const safeBorderEdit = resolve(edited((c) => { c.primitives.outline.value = '#ffffff'; }));
  assert.equal(safeBorderEdit.profiles.guided.semantic['color.border'].value, '#ffffff');
});

const independentActionColors = (c: any) => {
  c.semantic['color.action'] = 'white';
  c.semantic['color.action-hover'] = 'white';
  c.semantic['color.on-action'] = 'ink';
  c.semantic['color.link'] = 'blue';
  c.semantic['color.tab-selected'] = 'blue';
  c.profiles.dense.semantic['color.action'] = 'white';
  c.profiles.dense.semantic['color.action-hover'] = 'white';
  c.profiles.dense.semantic['color.link'] = 'green';
  c.profiles.dense.semantic['color.tab-selected'] = 'green';
};

test('light action backgrounds are valid with dark button text and independent link and tab colors', () => {
  const result = resolve(edited(independentActionColors));
  for (const profile of Object.values(result.profiles)) {
    assert.equal(profile.semantic['color.action'].value, '#ffffff');
    assert.equal(profile.semantic['color.action-hover'].value, '#ffffff');
    assert.equal(profile.semantic['color.on-action'].value, '#1c293d');
  }
});

for (const id of ['guided', 'dense']) {
  for (const background of ['surface', 'background']) {
    test(`${id} link text must contrast against color.${background}`, () => {
      rejects(edited((c) => {
        independentActionColors(c);
        c.profiles[id].semantic['color.link'] = 'white';
      }), new RegExp(`${id}.*color.link / color.${background}.*4\\.5`));
    });
  }
  test(`${id} selected tab text must contrast against its surface`, () => {
    rejects(edited((c) => {
      independentActionColors(c);
      c.profiles[id].semantic['color.tab-selected'] = 'white';
    }), new RegExp(`${id}.*color.tab-selected / color.surface.*4\\.5`));
  });
}

for (const role of ['color.link', 'color.tab-selected']) {
  const invalidRoleMappings: Array<[string, (c: any) => void, string, RegExp]> = [
    ['missing base mapping', (c) => {
      delete c.semantic[role];
      c.profiles.guided.semantic[role] = 'blue';
      c.profiles.dense.semantic[role] = 'green';
    }, `semantic.${role}`, /Required role/],
    ['wrong base primitive type', (c) => { c.semantic[role] = 'space-16'; }, `semantic.${role}`, /requires color/],
    ['unknown profile primitive', (c) => { c.profiles.dense.semantic[role] = 'missing'; }, `profiles.dense.semantic.${role}`, /Unknown primitive reference/],
    ['wrong profile primitive type', (c) => { c.profiles.dense.semantic[role] = 'space-16'; }, `profiles.dense.semantic.${role}`, /requires color/],
  ];
  for (const [name, change, path, message] of invalidRoleMappings) {
    test(`${role} rejects ${name} at its YAML field`, () => {
      assert.throws(() => resolve(edited(change)), (error: unknown) => {
        assert.ok(error instanceof ConfigValidationError);
        const issue = error.issues.find((issue) => issue.path === path && message.test(issue.message));
        assert.ok(issue, error.message);
        assert.ok(issue.line >= 1);
        assert.ok(issue.column >= 1);
        return true;
      });
    });
  }
}
