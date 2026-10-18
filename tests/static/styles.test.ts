import assert from 'node:assert/strict';
import test from 'node:test';
import { compile, __unstable__loadDesignSystem } from 'tailwindcss';
import { checkCSS, checkStyle, checkClasses, collectLocalClasses } from '../../src/check/styles.ts';
import { createUtilityResolver } from '../../src/check/tailwind.ts';
import type { SourceDiagnostic, SourcePolicy, StyleContext } from '../../src/check/types.ts';

const utilities = await createUtilityResolver();
const categories = { color: 'color', font: 'fontFamily', text: 'length', leading: 'number', weight: 'number', space: 'length', radius: 'length', size: 'length', border: 'length', motion: 'duration', opacity: 'number' } as const;
const semantic: SourcePolicy['semantic'] = Object.fromEntries(Object.entries(categories).map(([category, type]) => [`--ui-${category}-test`, { category, type }]));
semantic['--ui-motion-easing'] = { category: 'motion', type: 'easing' };
function run(css: string, scss = false, options: Partial<StyleContext> = {}) {
  const diagnostics: SourceDiagnostic[] = [];
  let checked = 0;
  const context: StyleContext = { policy: { schema_version: 1, configuration_hash: '', semantic, generated_components: [] }, utilities, ...options, emit: (d) => diagnostics.push(d), checked: () => checked++ };
  checkCSS(css, { file: 'app.scss', text: `prefix\n${css}`, offset: 7 }, context, scss);
  return { diagnostics, get checked() { return checked; }, context };
}

test('all token families reject concrete declarations and accept matching semantic roles', () => {
  const pairs = [['color', 'red', 'color'], ['font-family', 'Arial', 'font'], ['font-size', '16px', 'text'], ['line-height', '1.5', 'leading'], ['font-weight', '600', 'weight'], ['padding-inline', '12px', 'space'], ['border-start-start-radius', '8px', 'radius'], ['min-inline-size', '20rem', 'size'], ['border-block-end-width', '1px', 'border'], ['transition-duration', '120ms', 'motion'], ['opacity', '.8', 'opacity']];
  for (const [property, value, category] of pairs) {
    assert.deepEqual(run(`a{${property}:${value}}`).diagnostics.map((d) => d.rule), ['literal-token'], property);
    assert.deepEqual(run(`a{${property}:var(--ui-${category}-test)}`).diagnostics, [], property);
  }
});

test('CSS parses shorthand, functions, mixed literals, fallbacks and category mismatches', () => {
  const good = run('a{border:var(--ui-border-test) solid var(--ui-color-test);padding:0 var(--ui-space-test);width:calc(var(--ui-size-test)*3);transition:color var(--ui-motion-test) var(--ui-motion-easing);}');
  assert.deepEqual(good.diagnostics, []);
  assert.deepEqual(run('a{padding:calc(var(--ui-space-test) + 8px)}').diagnostics.map((d) => d.rule), ['literal-token']);
  assert.deepEqual(run('a{color:var(--ui-color-test, red)}').diagnostics.map((d) => d.rule), ['literal-token']);
  assert.deepEqual(run('a{color:var(--ui-p-red);padding:var(--ui-color-test);width:var(--ui-size-missing)}').diagnostics.map((d) => d.rule), ['primitive-reference', 'token-category', 'unknown-token']);
  assert.deepEqual(run('a{transition-duration:var(--ui-motion-easing)}').diagnostics.map((d) => d.rule), ['token-category']);
});

test('zero, valid resets, neutral full dimensions and identity opacity are allowed', () => {
  assert.deepEqual(run('a{width:100%;height:auto;max-width:none;margin:0;padding:0px;color:currentColor;background:transparent;border:0;opacity:1;border-radius:0;line-height:normal;display:flex;animation-name:rotate;}').diagnostics, []);
  assert.equal(run('a{inset:50%;border-radius:50%;width:50%;aspect-ratio:16/9;}').diagnostics.length, 3);
});

test('comments/business data ignored and CSS diagnostics retain exact declarations and positions', () => {
  const result = run('/* color:red */\na {\n  color: red;\n  content:"red 12px";\n}');
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].source, 'a{color: red}');
  assert.equal(result.diagnostics[0].line, 4);
  assert.equal(result.diagnostics[0].column, 3);
});

test('Sass expansions and non-policy variables remain warnings, syntax errors fail', () => {
  const result = run('$gap: 8px; @mixin foo {padding:$gap} a{@include foo; color: theme("dark");}', true);
  assert.ok(result.diagnostics.length >= 4);
  assert.ok(result.diagnostics.every((d) => d.severity === 'warning'));
  assert.equal(run('a { color: red').diagnostics[0].rule, 'parse-error');
  assert.equal(run('a{width:var(--runtime-size)}').diagnostics[0].rule, 'unresolved');
});

test('Tailwind protected utilities include variants, arbitrary properties and semantic namespaces', () => {
  const good = run('');
  checkClasses('hover:text-color-test md:p-test font-family-test font-weight-test text-size-test leading-test rounded-test w-size-test opacity-100 w-full p-0 [display:flex]', { file: 'app.html', text: '', offset: 0 }, good.context);
  assert.deepEqual(good.diagnostics, []);
  const bad = run('');
  const classes = 'md:hover:bg-red-500 max-w-[12rem] gap-x-4 rounded-full border-2 duration-200 ease-in-out font-bold leading-tight text-xl dark:opacity-50 [padding:calc(var(--ui-space-test)_+_2px)]';
  checkClasses(classes, { file: 'app.html', text: classes, offset: 0 }, bad.context);
  assert.equal(bad.diagnostics.filter((d) => d.rule === 'literal-token').length, 12);
  assert.equal(bad.diagnostics[0].source, 'md:hover:bg-red-500');
  assert.equal(bad.diagnostics[1].column, classes.indexOf('max-w') + 1);
});

test('local class names are checked through CSS, slash modifiers cannot hide literals', () => {
  const result = run('');
  const classes = 'p-4 text-color-test/50 bg-[var(--ui-color-test)] hover:w-(--ui-size-test)';
  checkClasses(classes, { file: 'app.html', text: classes, offset: 0 }, result.context, new Set(['p-4']));
  assert.deepEqual(result.diagnostics.map((d) => [d.rule, d.source]), [['literal-token', 'text-color-test/50']]);
  checkStyle('fontWeight', 'var(--ui-weight-test)', { file: 'app.ts', text: '', offset: 0 }, result.context);
  assert.equal(result.diagnostics.length, 1);
});

test('arbitrary type hints and semantic references retain their intended property family', () => {
  const result = run('');
  checkClasses('text-[length:var(--ui-text-test)] text-(length:--ui-text-test) font-[family-name:var(--ui-font-test)] border-[length:var(--ui-border-test)] ring-(length:--ui-border-test)', { file: 'app.html', text: '', offset: 0 }, result.context);
  assert.deepEqual(result.diagnostics, []);
  const malformed = run('a{font-family:"unterminated}');
  assert.ok(malformed.diagnostics.some((d) => d.rule === 'parse-error'));
});

test('track/flex geometry and responsive query literals are inspected; proportional layout is structural', () => {
  const good = run('a{grid-template-columns:repeat(2,minmax(0,1fr));flex:1 1 var(--ui-size-test);background:linear-gradient(90deg,var(--ui-color-test),var(--ui-color-test));transform:rotate(45deg);--business-count:17;}');
  assert.deepEqual(good.diagnostics, []);
  const bad = run('@media(min-width:40rem){a{grid-template-columns:200px 1fr;flex:1 1 200px;-webkit-text-fill-color:red;}}');
  assert.equal(bad.diagnostics.filter((d) => d.rule === 'literal-token').length, 4);
});

test('gradient utilities inspect stops, and full opacity modifiers preserve semantic colors', () => {
  const result = run('');
  checkClasses('bg-linear-to-r from-color-test to-color-test/100', { file: 'app.html', text: '', offset: 0 }, result.context);
  assert.deepEqual(result.diagnostics, []);
  checkClasses('from-red-500 to-blue-500', { file: 'app.html', text: '', offset: 0 }, result.context);
  assert.equal(result.diagnostics.length, 2);
});

test('accessibility geometry requires a reasoned exception; layout modifiers remain structural', () => {
  const result = run('');
  checkClasses('sr-only ring-inset divide-x-reverse scroll-p-test border-spacing-x-test scale-100', { file: 'app.html', text: '', offset: 0 }, result.context);
  assert.deepEqual(result.diagnostics.map((d) => d.source), ['sr-only']);
});


test('runtime UI control variables warn, while missing semantic-family tokens fail', () => {
  const result = run('a{padding:var(--ui-card-inset);width:var(--ui-avatar-size);color:var(--ui-color-missing);margin:var(--ui-p-gap)}');
  assert.deepEqual(result.diagnostics.map((d) => [d.rule, d.severity]), [['unresolved', 'warning'], ['unresolved', 'warning'], ['unknown-token', 'error'], ['primitive-reference', 'error']]);
});

test('scoped source aliases inspect every state candidate in the consuming property category', () => {
  const options = { componentStyles: true, customPropertyWrites: new Set<string>() };
  const css = ':host{--ui-local-inset:var(--ui-space-test);--ui-local-size:calc(var(--ui-size-test)*var(--ui-local-scale));--ui-local-scale:1}:host([data-compact]){--ui-local-inset:0px;--ui-local-scale:.75}:host([data-large]){--ui-local-inset:var(--ui-border-test);--ui-local-scale:1.25}.body{padding:var(--ui-local-inset);width:var(--ui-local-size)}';
  assert.deepEqual(run(css, false, options).diagnostics, []);
  const bad = run(css + '.body{font-size:var(--ui-local-size)}:host([data-bad]){--ui-local-inset:12px}', false, options);
  assert.ok(bad.diagnostics.some(d => d.source.includes('padding:') && d.rule === 'literal-token'));
  assert.ok(bad.diagnostics.some(d => d.source.includes('font-size:') && d.rule === 'token-category'));
});

test('same selector bases and explicit ancestors trace aliases without crossing unrelated selectors', () => {
  const options = { customPropertyWrites: new Set<string>() };
  const good = run('.sheet{--ui-row:calc(var(--ui-size-test) + var(--ui-space-test)*2 + var(--ui-border-test))}.sheet td,.sheet th{height:var(--ui-row)}.action{--ui-factor:1;font-size:calc(var(--ui-text-test)*var(--ui-factor))}.action[data-small],.group>.action:not([data-size]){--ui-factor:.875}', false, options);
  assert.deepEqual(good.diagnostics, []);
  const unrelated = run('.one{--ui-alias:var(--ui-size-test)}.two{width:var(--ui-alias)}', false, options);
  assert.deepEqual(unrelated.diagnostics.map(d => d.rule), ['unresolved']);
  const distinct = run('.one{--ui-alias:var(--ui-size-test);width:var(--ui-alias)}.two{--ui-alias:12px;width:var(--ui-alias)}', false, options);
  assert.deepEqual(distinct.diagnostics.map(d => [d.rule, d.source]), [['literal-token', '.two{width:var(--ui-alias)} :: --ui-alias=12px']]);
  const shared = run('.one,.two{--ui-alias:var(--ui-nested)}.one{--ui-nested:var(--ui-size-test);width:var(--ui-alias)}.two{--ui-nested:12px}', false, options);
  assert.ok(!shared.diagnostics.some(d => d.source.includes('width:')), JSON.stringify(shared.diagnostics));
  const inherited = run('.parent{--ui-alias:var(--ui-nested)}.parent .child{--ui-nested:var(--ui-size-test);width:var(--ui-alias)}', false, options);
  assert.ok(inherited.diagnostics.some(d => d.rule === 'unresolved' && d.source.includes('width:')));
});

test('unsafe alias branches retain warnings while known literals and category violations remain visible', () => {
  const options = { componentStyles: true, customPropertyWrites: new Set<string>(['--ui-local-size']) };
  const css = ':host{--ui-local-size:var(--ui-size-test);--ui-local-gap:var(--ui-inherited,12px);--ui-cycle-a:var(--ui-cycle-b);--ui-cycle-b:var(--ui-cycle-a)}.body{font-size:var(--ui-local-size);padding:var(--ui-local-gap);width:var(--ui-cycle-a)}';
  const result = run(css, false, options);
  for (const property of ['font-size', 'padding', 'width']) assert.ok(result.diagnostics.some(d => d.rule === 'unresolved' && d.source.includes(property + ':')));
  assert.ok(result.diagnostics.some(d => d.rule === 'token-category' && d.source.includes('font-size:')));
  assert.ok(result.diagnostics.some(d => d.rule === 'literal-token' && d.source.includes('padding:')));
  for (const barrier of [undefined, 'unknown' as const]) {
    assert.ok(run('.one{--ui-local-size:var(--ui-size-test);width:var(--ui-local-size)}', false, { customPropertyWrites: barrier }).diagnostics.some(d => d.rule === 'unresolved'));
  }
  assert.ok(run(':host{--ui-local-size:var(--ui-size-test)}.body{width:var(--ui-local-size)}', false, { customPropertyWrites: new Set<string>() }).diagnostics.some(d => d.rule === 'unresolved'));
  assert.ok(run('.one{--ui-local-size:var(--ui-size-test);width:var(--ui-local-size)}', true, { customPropertyWrites: new Set<string>() }).diagnostics.some(d => d.rule === 'unresolved'));
  for (const value of ['inherit', 'initial', 'unset', 'revert', 'revert-layer']) {
    assert.ok(run(`.one{--ui-local-size:${value};width:var(--ui-local-size)}`, false, { customPropertyWrites: new Set<string>() }).diagnostics.some(d => d.rule === 'unresolved'), value);
  }
  const unknownBranch = run('.one{--ui-local-size:var(--ui-size-test);font-size:var(--ui-local-size)}.one:is(.active){--ui-local-size:12px}', false, { customPropertyWrites: new Set<string>() });
  for (const rule of ['unresolved', 'token-category', 'literal-token']) assert.ok(unknownBranch.diagnostics.some(d => d.source.includes('font-size:') && d.rule === rule), rule);
});

test('alias candidate applicability does not certify conditional or ancestor-only coverage', () => {
  const options = { componentStyles: true, customPropertyWrites: new Set<string>() };
  for (const definition of [
    '.parent .one{--local:var(--ui-size-test)}',
    '.one[data-large]{--local:var(--ui-size-test)}',
    '.one:hover{--local:var(--ui-size-test)}',
    ':host([data-large]){--local:var(--ui-size-test)}',
    '@supports(display:grid){.one{--local:var(--ui-size-test)}}',
    '@media(orientation:landscape){.one{--local:var(--ui-size-test)}}',
  ]) {
    const diagnostics = run(definition + '.one{width:var(--local)}', false, options).diagnostics;
    assert.ok(diagnostics.some(d => d.rule === 'unresolved' && d.source.includes('width:')), definition);
  }
  for (const css of [
    '.parent .one{--local:var(--ui-size-test);width:var(--local)}',
    '.one[data-large]{--local:var(--ui-size-test);width:var(--local)}',
    '@supports(display:grid){.one{--local:var(--ui-size-test);width:var(--local)}}',
  ]) assert.deepEqual(run(css, false, options).diagnostics, [], css);
});

test('compound alias selectors retain known literal and wrong-category candidates', () => {
  const options = { customPropertyWrites: new Set<string>() };
  for (const selector of ['.one.active', '.active.one', 'button.one', '.parent>.one.active']) {
    for (const [value, rule] of [['12px', 'literal-token'], ['var(--ui-text-test)', 'token-category']]) {
      const diagnostics = run(`.one{--local:var(--ui-size-test);width:var(--local)}${selector}{--local:${value}}`, false, options).diagnostics;
      assert.ok(diagnostics.some(d => d.source.includes('width:') && d.rule === 'unresolved'), selector);
      assert.ok(diagnostics.some(d => d.source.includes('width:') && d.rule === rule), selector + value);
    }
  }
});

test('known runtime alias writes are inspected as candidates without certifying completeness', () => {
  const options = {
    customPropertyWrites: new Set(['--written']),
    customPropertyValues: new Map([['--written', ['12px', 'var(--ui-text-test)', 'var(--nested)']]]),
  };
  const diagnostics = run('.one{--written:var(--ui-size-test);--nested:var(--ui-size-test);width:var(--written)}', false, options).diagnostics;
  for (const rule of ['unresolved', 'literal-token', 'token-category']) {
    assert.ok(diagnostics.some(d => d.source.includes('width:') && d.rule === rule), rule);
  }
  const absent = run('.one{width:var(--written)}', false, options).diagnostics;
  assert.ok(absent.some(d => d.rule === 'unresolved'));
  assert.ok(absent.some(d => d.rule === 'literal-token'));
});

test('primitive and missing semantic references cannot be approved through local definitions', () => {
  const result = run('.one{--ui-p-test:var(--ui-size-test);--ui-size-missing:var(--ui-size-test);--ui-alias:var(--ui-p-test);width:var(--ui-alias);height:var(--ui-size-missing)}', false, { customPropertyWrites: new Set<string>() });
  assert.ok(result.diagnostics.some(d => d.source.includes('width:') && d.rule === 'primitive-reference'));
  assert.ok(result.diagnostics.some(d => d.source.includes('height:') && d.rule === 'unknown-token'));
});

test('anonymous CSS math groups keep enclosing categories and coefficient semantics', () => {
  assert.deepEqual(run('a{width:calc((var(--ui-size-test)*2) + (var(--ui-space-test)/3));padding:calc((var(--ui-space-test) + var(--ui-size-test))*2)}').diagnostics, []);
  assert.deepEqual(run('a{width:calc((var(--ui-size-test) + 12px))}').diagnostics.map(d => d.rule), ['literal-token']);
  assert.deepEqual(run('a{font-size:calc((var(--ui-size-test)*2))}').diagnostics.map(d => d.rule), ['token-category']);
  assert.deepEqual(run('a{width:calc((var(--ui-p-size)*2))}').diagnostics.map(d => d.rule), ['primitive-reference']);
  assert.ok(run('a{width:calc((var(--ui-size-test) + theme("dark")))}').diagnostics.some(d => d.rule === 'unresolved'));
  assert.ok(run('a{width:calc(())}').diagnostics.some(d => d.rule === 'parse-error'));
  assert.ok(run('a{width:calc((var(--ui-size-test) +))}').diagnostics.some(d => d.rule === 'parse-error'));
  assert.ok(run('a{width:calc((var(--ui-size-test)/))}').diagnostics.some(d => d.rule === 'parse-error'));
  assert.ok(run('a{width:calc((var(--ui-size-test) var(--ui-size-test)))}').diagnostics.some(d => d.rule === 'parse-error'));
  assert.ok(run('a{width:calc((var(--ui-size-test))}').diagnostics.some(d => d.rule === 'parse-error'));
});

test('arithmetic spacing compositions accept compatible lengths without accepting direct wrong-purpose tokens', () => {
  assert.deepEqual(run('a{padding:calc(var(--ui-space-test) + var(--ui-size-test));margin:clamp(var(--ui-border-test),var(--ui-text-test),var(--ui-space-test));}').diagnostics, []);
  assert.equal(run('a{padding:var(--ui-size-test)}').diagnostics[0].rule, 'token-category');
  assert.equal(run('a{padding:calc(var(--ui-space-test) + var(--ui-color-test))}').diagnostics[0].rule, 'token-category');
});

test('declaration source context distinguishes identical properties in different selectors', () => {
  const result = run('.first{width:1px}.second{width:1px}');
  assert.deepEqual(result.diagnostics.map((d) => d.source), ['.first{width:1px}', '.second{width:1px}']);
});


test('SVG no-paint is structural without allowing no-paint for ordinary color', () => {
  assert.deepEqual(run('path{fill:none;stroke:none;}').diagnostics, []);
  assert.equal(run('path{stroke-width:2}').diagnostics[0].rule, 'literal-token');
  assert.equal(run('path{color:none}').diagnostics[0].rule, 'literal-token');
  assert.equal(run('a{width:var(--ui-specialist-columns)}').diagnostics[0].severity, 'warning');
  assert.equal(run('@media(forced-colors:active){a{color:CanvasText;background:Canvas;border-color:Highlight;}}').diagnostics.filter((d) => d.rule === 'literal-token').length, 3);
});


test('animation counts/names, ratio values, grid count fallbacks and unrelated property keywords are structural', () => {
  const result = run('a{animation:skeleton var(--ui-motion-test) var(--ui-motion-easing) infinite;aspect-ratio:1;grid-template-columns:repeat(var(--ui-option-columns,1),minmax(0,1fr));display:var(--ui-field-label-layout,block);width:calc(var(--ui-text-test)*var(--ui-leading-test));--runtime-track-columns:minmax(0,1fr) var(--ui-size-test);}');
  assert.ok(result.diagnostics.every((d) => d.rule === 'unresolved' && d.severity === 'warning'), JSON.stringify(result.diagnostics));
  assert.equal(run('a{animation:skeleton 180ms ease infinite}').diagnostics[0].rule, 'literal-token');
  assert.equal(run('a{opacity:.5;transition-timing-function:linear;}').diagnostics.filter((d) => d.rule === 'literal-token').length, 2);
  assert.equal(run('a{width:var(--ui-leading-test)}').diagnostics[0].rule, 'token-category');
});


test('local classes come from parsed active selectors rather than comments, declaration strings or attributes', () => {
  const css = `/* .bg-red-500 { color: red } */
    .real, .hover\\:bg-red-500 { content: '.p-4'; }
    [data-label='.m-4'] { color: inherit; }`;
  assert.deepEqual([...collectLocalClasses(css)].sort(), ['hover:bg-red-500', 'real']);
  const result = run('');
  checkClasses('bg-red-500 p-4 m-4 hover:bg-red-500', { file: 'app.html', text: '', offset: 0 }, result.context, collectLocalClasses(css));
  assert.deepEqual(result.diagnostics.map((d) => d.source), ['bg-red-500', 'p-4', 'm-4']);
});

test('Sass-expanded selectors and malformed CSS cannot grant local-class approvals', () => {
  assert.deepEqual([...collectLocalClasses('.bg-#{$shade} {.p-4{padding:0}} .outer {&.m-4{margin:0}}', true)].sort(), ['outer']);
  assert.deepEqual([...collectLocalClasses('@mixin colors{.bg-red-500{color:red}}', true)], []);
  assert.deepEqual([...collectLocalClasses('.p-4 {')], []);
  assert.deepEqual([...collectLocalClasses(`.foo\\/bar { padding:0 }`)], ['foo/bar']);
});

test('all four physical radius corners inspect literals and semantic categories in CSS, SCSS and arbitrary utilities', () => {
  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    const property = `border-${corner}-radius`;
    for (const scss of [false, true]) {
      assert.equal(run(`a{${property}:12px}`, scss).diagnostics[0]?.rule, 'literal-token', `${property} literal`);
      assert.equal(run(`a{${property}:var(--ui-color-test)}`, scss).diagnostics[0]?.rule, 'token-category', `${property} category`);
      assert.deepEqual(run(`a{${property}:var(--ui-radius-test)}`, scss).diagnostics, [], `${property} semantic`);
    }
    const result = run('');
    checkClasses(`md:[${property}:12px] hover:[${property}:var(--ui-color-test)] [${property}:var(--ui-radius-test)]`, { file: 'app.html', text: '', offset: 0 }, result.context);
    assert.deepEqual(result.diagnostics.map((d) => d.rule), ['literal-token', 'token-category']);
    assert.equal(result.checked, 3);
  }
});

test('Tailwind grid track families inspect arbitrary geometry and reject wrong-category tokens', () => {
  for (const prefix of ['grid-cols', 'grid-rows', 'auto-cols', 'auto-rows']) {
    const result = run('');
    checkClasses(`md:${prefix}-[200px_1fr] ${prefix}-[var(--ui-color-test)] ${prefix}-[var(--ui-size-test)_1fr]`, { file: 'app.html', text: '', offset: 0 }, result.context);
    assert.deepEqual(result.diagnostics.map((d) => d.rule), ['literal-token', 'token-category'], prefix);
    assert.equal(result.checked, 3);
  }
  const structural = run('');
  checkClasses('grid-cols-3 grid-rows-2 auto-cols-fr auto-rows-min grid-cols-[repeat(auto-fit,minmax(0,1fr))] grid-rows-subgrid grid-cols-(--runtime-tracks)', { file: 'app.html', text: '', offset: 0 }, structural.context);
  assert.deepEqual(structural.diagnostics.map((d) => [d.rule, d.severity]), [['unresolved', 'warning']]);
});

test('Tailwind gradient payloads and background geometry use the CSS visitor', () => {
  const bad = run('');
  checkClasses('hover:bg-linear-[45deg,red,blue] bg-radial-[circle,red,blue] bg-conic-[red,blue] bg-[linear-gradient(45deg,red,blue)] bg-size-[200px_auto] bg-[length:200px_auto] bg-position-[12px_0]', { file: 'app.html', text: '', offset: 0 }, bad.context);
  assert.equal(bad.diagnostics.filter((d) => d.rule === 'literal-token').length, 7);
  const good = run('');
  checkClasses('bg-linear-to-r bg-linear-45 bg-radial bg-conic bg-linear-[45deg,var(--ui-color-test),var(--ui-color-test)] bg-radial-[circle,var(--ui-color-test),var(--ui-color-test)] bg-[linear-gradient(45deg,var(--ui-color-test),var(--ui-color-test))] bg-size-[var(--ui-size-test)_auto] bg-cover bg-auto bg-conic-(--runtime-gradient)', { file: 'app.html', text: '', offset: 0 }, good.context);
  assert.deepEqual(good.diagnostics.map((d) => [d.rule, d.severity]), [['unresolved', 'warning']]);
});

test('text decoration, emphasis and border image shorthands inspect protected values', () => {
  for (const declaration of ['text-decoration:underline red 2px', 'text-emphasis:filled red', 'border-image:linear-gradient(red,blue) 1']) {
    assert.ok(run(`a{${declaration}}`).diagnostics.some(d => d.rule === 'literal-token'), declaration);
  }
  assert.deepEqual(run('a{text-decoration:underline solid var(--ui-color-test) var(--ui-border-test);text-emphasis:filled dot var(--ui-color-test);border-image-source:linear-gradient(var(--ui-color-test),var(--ui-color-test));}').diagnostics, []);
  assert.equal(run('a{text-decoration:underline var(--ui-font-test)}').diagnostics[0]?.rule, 'token-category');
});

test('Tailwind decoration thickness hints use border semantics rather than color', () => {
  const result = run('');
  checkClasses('decoration-[length:var(--ui-border-test)] decoration-(length:--ui-border-test) decoration-(percentage:--ui-border-test) decoration-color-test decoration-auto decoration-from-font', { file:'app.html',text:'',offset:0 }, result.context);
  assert.equal(result.diagnostics.length, 0);
  checkClasses('hover:decoration-[length:2px] decoration-[length:var(--ui-color-test)] decoration-(percentage:--ui-color-test) decoration-red-500', { file:'app.html',text:'',offset:0 }, result.context);
  assert.deepEqual(result.diagnostics.map(d => d.rule), ['literal-token', 'token-category', 'token-category', 'literal-token']);
});


test('arbitrary utility types follow Tailwind hints and defaults rather than token names', async () => {
  const cases = [
    ['text', 'color', 'color', 'text', 'color'],
    ['text', 'length', 'text', 'color', 'font-size'],
    ['border', 'color', 'color', 'border', 'border-color'],
    ['border', 'length', 'border', 'color', 'border-width'],
    ['decoration', 'color', 'color', 'border', 'text-decoration-color'],
    ['decoration', 'length', 'border', 'color', 'text-decoration-thickness'],
    ['ring', 'color', 'color', 'border', '--tw-ring-color'],
    ['outline', 'color', 'color', 'border', 'outline-color'],
    ['font', 'number', 'weight', 'font', 'font-weight'],
    ['font', 'family-name', 'font', 'weight', 'font-family'],
    ['stroke', 'number', 'border', 'color', 'stroke-width'],
    ['stroke', 'color', 'color', 'border', 'stroke'],
    ['bg', 'length', 'size', 'color', 'background-size'],
    ['bg', 'position', 'size', 'color', 'background-position'],
  ];
  for (const [prefix, hint, good, bad, property] of cases) {
    for (const bracket of [false, true]) {
      const candidate = (category: string) => bracket ? `${prefix}-[${hint}:var(--ui-${category}-test)]` : `${prefix}-(${hint}:--ui-${category}-test)`;
      const compiler = await compile('@tailwind utilities;');
      assert.ok(compiler.build([candidate(bad)]).includes(`${property}: var(--ui-${bad}-test)`), candidate(bad));
      const allowed = run(''); checkClasses(candidate(good), {file:'app.html',text:'',offset:0}, allowed.context);
      assert.deepEqual(allowed.diagnostics, [], candidate(good));
      const denied = run(''); checkClasses(`md:hover:${candidate(bad)}`, {file:'app.html',text:'',offset:0}, denied.context);
      assert.deepEqual(denied.diagnostics.map(d => d.rule), ['token-category'], candidate(bad));
    }
  }
  for (const [prefix, category] of [['text','text'],['border','border'],['decoration','border'],['ring','border'],['outline','border'],['font','font'],['stroke','border']]) {
    const denied = run(''); checkClasses(`${prefix}-(--ui-${category}-test)`, {file:'app.html',text:'',offset:0}, denied.context);
    assert.deepEqual(denied.diagnostics.map(d => d.rule), ['token-category'], prefix);
  }
});


test('Tailwind percentage hints and inferred math dispatch to geometry', async () => {
  for (const [prefix, category, property] of [['text','text','font-size'],['border','border','border-width'],['stroke','border','stroke-width'],['decoration','border','text-decoration-thickness'],['ring','border','--tw-ring-shadow'],['bg','size','background-position']]) {
    const good = `${prefix}-[calc(var(--ui-${category}-test)*2)]`;
    const compiler = await compile('@tailwind utilities;'); assert.ok(compiler.build([good]).includes(`${property}:`), good);
    const accepted = run('');checkClasses(good,{file:'app.html',text:'',offset:0},accepted.context);assert.deepEqual(accepted.diagnostics,[],good);
    const rejected = run('');checkClasses(`${prefix}-[calc(var(--ui-color-test)*2)]`,{file:'app.html',text:'',offset:0},rejected.context);assert.ok(rejected.diagnostics.some(d=>d.rule==='token-category'),prefix);
  }
  for (const type of ['percentage','absolute-size','relative-size']) {
    const accepted=run('');checkClasses(`text-(${type}:--ui-text-test)`,{file:'app.html',text:'',offset:0},accepted.context);assert.deepEqual(accepted.diagnostics,[]);
    const rejected=run('');checkClasses(`text-(${type}:--ui-color-test)`,{file:'app.html',text:'',offset:0},rejected.context);assert.equal(rejected.diagnostics[0]?.rule,'token-category');
  }
  const font=run('');checkClasses('font-[Arial]',{file:'app.html',text:'',offset:0},font.context);assert.equal(font.diagnostics[0]?.rule,'literal-token');
});

test('Tailwind logical spacing, transform axes and filter families inspect known payloads', async () => {
  const families = ['pbs','pbe','mbs','mbe','scroll-pbs','scroll-pbe','scroll-ps','scroll-pe','scroll-mbs','scroll-mbe','scroll-ms','scroll-me','inset-bs','inset-be','border-bs','border-be','translate','translate-z','perspective','origin','perspective-origin'];
  for (const prefix of families) {
    const candidate = `${prefix}-[12px]`;const compiler=await compile('@tailwind utilities;');assert.ok(compiler.build([candidate]).includes('12px'),candidate);
    const rejected=run('');checkClasses(`md:hover:${candidate}`,{file:'app.html',text:'',offset:0},rejected.context);assert.equal(rejected.diagnostics[0]?.rule,'literal-token',candidate);
    const primitive=run('');checkClasses(`${prefix}-(--ui-p-test)`,{file:'app.html',text:'',offset:0},primitive.context);assert.equal(primitive.diagnostics[0]?.rule,'primitive-reference',prefix);
  }
  for (const prefix of ['translate','translate-z','perspective','transform','origin','perspective-origin','scale-x','scale-y','scale-z']) {
    const rejected=run('');checkClasses(`${prefix}-(--ui-color-test)`,{file:'app.html',text:'',offset:0},rejected.context);assert.equal(rejected.diagnostics[0]?.rule,'token-category',prefix);
  }
  for(const prefix of ['brightness','contrast','grayscale','invert','sepia','saturate','backdrop-brightness','backdrop-contrast','backdrop-grayscale','backdrop-invert','backdrop-sepia','backdrop-saturate','backdrop-opacity']) {
    const rejected=run('');checkClasses(`${prefix}-[.5]`,{file:'app.html',text:'',offset:0},rejected.context);assert.equal(rejected.diagnostics[0]?.rule,'literal-token',prefix);
    const accepted=run('');checkClasses(`${prefix}-(--ui-opacity-test)`,{file:'app.html',text:'',offset:0},accepted.context);assert.deepEqual(accepted.diagnostics,[],prefix);
  }
  const transform=run('');checkClasses('transform-[translateX(12px)]',{file:'app.html',text:'',offset:0},transform.context);assert.equal(transform.diagnostics[0]?.rule,'literal-token');
  const identity=run('');checkClasses('scale-x-100 scale-y-0 brightness-100 rotate-x-45 skew-y-12',{file:'app.html',text:'',offset:0},identity.context);assert.deepEqual(identity.diagnostics,[]);
  const hue=run('');checkClasses('hue-rotate-45 backdrop-hue-rotate-45',{file:'app.html',text:'',offset:0},hue.context);assert.deepEqual(hue.diagnostics.map(d=>d.rule),['literal-token','literal-token']);
});


test('Tailwind registered functional families cannot silently skip protected CSS literals', async () => {
  const design = await __unstable__loadDesignSystem('');
  let protectedCandidates = 0;
  for(const prefix of design.utilities.keys('functional')) {
    if(prefix.startsWith('-')||prefix.startsWith('@'))continue;
    for(const value of ['12px','red','.5','translateX(12px)']) {
      const candidate=`${prefix}-[${value}]`, css=design.candidatesToCss([candidate])[0];if(!css)continue;
      if(!run(css).diagnostics.some(d=>d.rule==='literal-token'))continue;
      protectedCandidates++;
      const checked=run('');checkClasses(candidate,{file:'app.html',text:candidate,offset:0},checked.context);
      assert.ok(checked.diagnostics.some(d=>d.severity==='error'),candidate);
    }
  }
  assert.ok(protectedCandidates>400);
});

test('function payloads retain their property and numeric/filter purpose', () => {
  assert.equal(run('a{width:rgb(var(--ui-color-test));filter:blur(var(--ui-color-test));backdrop-filter:grayscale(var(--ui-color-test));}').diagnostics.filter(d=>d.rule==='token-category').length,3);
  assert.deepEqual(run('a{color:rgb(var(--ui-color-test));filter:blur(var(--ui-size-test)) grayscale(var(--ui-opacity-test));}').diagnostics,[]);
  const masks=run('');checkClasses('mask-radial-(--ui-size-test) mask-radial-at-top mask-radial-circle mask-linear-from-(--ui-size-test) mask-linear-from-[color:var(--ui-color-test)] mask-t-from-[color:var(--ui-color-test)]',{file:'app.html',text:'',offset:0},masks.context);assert.deepEqual(masks.diagnostics,[]);
});


test('compiler declarations preserve family-specific hints, structural utilities and percentages', async () => {
  const failures=['divide-x-[var(--ui-color-test)]','divide-y-(--ui-color-test)','decoration-(percentage:--ui-color-test)','decoration-(number:--ui-border-test)','outline-(percentage:--ui-color-test)','mask-(percentage:--ui-color-test)','opacity-1','zoom-1','text-color-test/1'];
  for(const candidate of failures){const result=run('');checkClasses(candidate,{file:'app.html',text:'',offset:0},result.context);assert.ok(result.diagnostics.some(d=>d.severity==='error'),candidate);}
  const allowed=run('');checkClasses('divide-y-(--ui-border-test) decoration-(number:--ui-color-test) decoration-(percentage:--ui-border-test) outline-(percentage:--ui-border-test) mask-(percentage:--ui-size-test) aspect-square aspect-video object-fill object-top-left object-left-top origin-top-left mask-radial-at-top-right mask-top-left transform-gpu opacity-100 zoom-100 text-[color-mix(in_oklab,var(--ui-color-test)_calc(0%),transparent)]',{file:'app.html',text:'',offset:0},allowed.context);assert.deepEqual(allowed.diagnostics,[]);
  const shadow=run('');checkClasses('drop-shadow-[0_0_var(--ui-space-test)_var(--ui-color-test)]',{file:'app.html',text:'',offset:0},shadow.context);assert.deepEqual(shadow.diagnostics,[]);
  const wrongShadow=run('');checkClasses('drop-shadow-[0_0_var(--ui-opacity-test)]',{file:'app.html',text:'',offset:0},wrongShadow.context);assert.equal(wrongShadow.diagnostics[0]?.rule,'token-category');
  const unknown=run('');checkClasses('w-(--tw-business) [width:var(--tw-other,12px)]',{file:'app.html',text:'',offset:0},unknown.context);assert.ok(unknown.diagnostics.some(d=>d.rule==='unresolved'));assert.ok(unknown.diagnostics.some(d=>d.rule==='literal-token'));
});


test('authored modifier variables remain unresolved and their fallback pieces are inspected', () => {
  for(const classes of ['text-[var(--ui-color-test)]/[var(--tw-business)]','bg-[var(--ui-color-test)]/(--tw-business)','text-[length:var(--ui-text-test)]/[var(--tw-business)]']){
    const result=run('');checkClasses(classes,{file:'app.html',text:'',offset:0},result.context);assert.ok(result.diagnostics.some(d=>d.rule==='unresolved'),classes);assert.ok(result.diagnostics.every(d=>d.severity==='warning'),classes);
  }
  const fallback=run('');checkClasses('text-[length:var(--ui-text-test)]/[var(--tw-business,12px)]',{file:'app.html',text:'',offset:0},fallback.context);assert.ok(fallback.diagnostics.some(d=>d.rule==='literal-token'));
  const good=run('');checkClasses('text-[var(--ui-color-test)]/[var(--ui-opacity-test)]',{file:'app.html',text:'',offset:0},good.context);assert.deepEqual(good.diagnostics,[]);
});

test('color-mix and gradient arguments distinguish color, opacity and positions', () => {
  for(const css of ['a{background:color-mix(in srgb,var(--ui-space-test),transparent)}','a{background:linear-gradient(var(--ui-space-test),var(--ui-color-test))}','a{background:color-mix(in srgb,var(--ui-color-test) var(--ui-space-test),transparent)}'])assert.ok(run(css).diagnostics.some(d=>d.rule==='token-category'),css);
  assert.deepEqual(run('a{background:color-mix(in srgb,var(--ui-color-test) calc(var(--ui-opacity-test)*100%),transparent);background-image:linear-gradient(to right,var(--ui-color-test) var(--ui-space-test),var(--ui-size-test),var(--ui-color-test));}').diagnostics,[]);
  assert.ok(run('a{background:color-mix(in srgb,var(--ui-color-test) calc(50%),transparent)}').diagnostics.some(d=>d.rule==='literal-token'));
});

test('explicit responsive/container thresholds inspect literals and fallbacks rather than selector data', () => {
  const bad=run('');checkClasses('min-[900px]:w-size-test @min-[40rem]:p-test max-[var(--ui-size-test,800px)]:p-test',{file:'app.html',text:'',offset:0},bad.context);assert.equal(bad.diagnostics.filter(d=>d.rule==='literal-token').length,3);
  const good=run('');checkClasses('md:w-size-test hover:p-test [data-size="900px"]:p-test',{file:'app.html',text:'',offset:0},good.context);assert.deepEqual(good.diagnostics,[]);
});

test('named container variants inspect the threshold before the container modifier', async () => {
  const design = await __unstable__loadDesignSystem('');
  for (const variant of ['@min-', '@max-', '@']) {
    const utility = `${variant}[40rem]/sidebar:p-[var(--ui-space-test)]`;
    assert.match(design.candidatesToCss([utility])[0]!, /@container sidebar \(width (?:>=|<) 40rem\)/);
    const bad = run('');
    checkClasses(utility, { file: 'app.html', text: utility, offset: 0 }, bad.context);
    assert.deepEqual(bad.diagnostics.map(d => d.rule), ['literal-token'], utility);
    assert.equal(bad.diagnostics[0].source, utility);
  }
  const fallback = run('');
  checkClasses('@min-[var(--ui-size-test,40rem)]/sidebar:p-test', { file: 'app.html', text: '', offset: 0 }, fallback.context);
  assert.ok(fallback.diagnostics.some(d => d.rule === 'literal-token'));
  const good = run('');
  checkClasses('@min-[var(--ui-size-test)]/sidebar:p-test @md/sidebar:p-test', { file: 'app.html', text: '', offset: 0 }, good.context);
  assert.deepEqual(good.diagnostics, []);
  const dynamic = run('');
  checkClasses('@min-[var(--runtime-width)]/sidebar:p-test', { file: 'app.html', text: '', offset: 0 }, dynamic.context);
  assert.deepEqual(dynamic.diagnostics.map(d => d.rule), ['unresolved']);
});

test('compound negation variants retain arbitrary media/container thresholds', async () => {
  const design = await __unstable__loadDesignSystem('');
  for (const variant of ['not-@min-[40rem]/sidebar', 'not-@max-[40rem]/sidebar', 'not-@[40rem]/sidebar', 'not-min-[900px]', 'not-max-[900px]', 'not-not-min-[900px]']) {
    const utility = `${variant}:p-[var(--ui-space-test)]`;
    assert.ok(design.candidatesToCss([utility])[0], utility);
    const bad = run('');
    checkClasses(utility, { file: 'app.html', text: utility, offset: 0 }, bad.context);
    assert.deepEqual(bad.diagnostics.map(d => d.rule), ['literal-token'], utility);
  }
  const semantic = run('');
  checkClasses('not-@min-[var(--ui-size-test)]/sidebar:p-test not-not-min-[var(--ui-size-test)]:p-test', { file: 'app.html', text: '', offset: 0 }, semantic.context);
  assert.deepEqual(semantic.diagnostics, []);
  const fallback = run('');
  checkClasses('not-@min-[var(--runtime-width,40rem)]/sidebar:p-test', { file: 'app.html', text: '', offset: 0 }, fallback.context);
  assert.ok(fallback.diagnostics.some(d => d.rule === 'unresolved'));
  assert.ok(fallback.diagnostics.some(d => d.rule === 'literal-token'));
});


test('color alpha arguments use opacity without disguising literal channels', () => {
  assert.deepEqual(run('a{color:rgb(from var(--ui-color-test) r g b / var(--ui-opacity-test));color:rgba(var(--ui-color-test),var(--ui-opacity-test));}').diagnostics,[]);
  assert.ok(run('a{color:rgb(from var(--ui-color-test) r g b / var(--ui-space-test))}').diagnostics.some(d=>d.rule==='token-category'));
  assert.ok(run('a{color:rgb(0 0 0 / var(--ui-opacity-test))}').diagnostics.some(d=>d.rule==='literal-token'));
  assert.deepEqual(run('a{color:rgb(from color-mix(in srgb,var(--ui-color-test),transparent) r g b / var(--ui-opacity-test))}').diagnostics,[]);
  assert.ok(run('a{color:rgba($channels,1)}',true).diagnostics.every(d=>d.severity==='warning'));
});

test('functional, attribute and universal selectors retain known alias override candidates', () => {
  for (const selector of [':is(.one,.active)', ':where(.one)', '[data-large]', '*']) {
    const source = `.one{--local:var(--ui-size-test);width:var(--local)}${selector}{--local:12px!important}`;
    const result = run(source, false, { customPropertyWrites: new Set() });
    assert.ok(result.diagnostics.some(d => d.rule === 'literal-token'), selector);
    assert.ok(result.diagnostics.some(d => d.rule === 'unresolved'), selector);
    const wrong = run(`.one{--local:var(--ui-size-test);width:var(--local)}${selector}{--local:var(--ui-text-test)}`, false, { customPropertyWrites: new Set() });
    assert.ok(wrong.diagnostics.some(d => d.rule === 'token-category'), selector);
  }
});

test('functional selector alternatives retain unanchored branches and simple negation excludes impossible subjects', () => {
  for (const selector of [':is(.other,*)', ':is(.other,[data-large])', ':where(.other,*)', '.parent:not(.one) *']) {
    const result = run(`.one{--gap:var(--ui-space-test);padding:var(--gap)}${selector}{--gap:12px!important}`, false, { customPropertyWrites: new Set() });
    assert.ok(result.diagnostics.some(d => d.rule === 'literal-token'), selector);
  }
  const excluded = run('.one{--gap:var(--ui-space-test);padding:var(--gap)}:not(.one){--gap:12px!important}', false, { customPropertyWrites: new Set() });
  assert.ok(excluded.diagnostics.every(d => d.severity === 'warning'));
});

test('a functional universal branch cannot discard a required outer subject anchor', () => {
  for (const selector of ['button:is(.nested,*)', '.other:is(.nested,[data-large])']) {
    const result = run(`p{--gap:var(--ui-space-test);padding:var(--gap)}${selector}{--gap:12px!important}`, false, { customPropertyWrites: new Set() });
    assert.ok(result.diagnostics.every(d => d.severity === 'warning'), selector);
  }
  const applicable = run('p{--gap:var(--ui-space-test);padding:var(--gap)}p:is(.nested,*){--gap:12px!important}', false, { customPropertyWrites: new Set() });
  assert.ok(applicable.diagnostics.some(d => d.rule === 'literal-token'));
});
