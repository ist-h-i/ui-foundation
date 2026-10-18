import type {Locator, Page} from '@playwright/test';
import {test, expect, contexts, ready, environment, host, create, update, set, clear, settle, record, hiddenReveal, destroy} from './css-override-test';

// These properties are unregistered. inherit/unset inherit, initial is guaranteed-invalid;
// an invalid substituted repeat() is grid-template-columns:none, not a repaired column count.
const declarations = ['2', 'inherit', 'unset', 'initial', '0', 'bogus'] as const;
const options = Array.from({length: 5}, (_, i) => ({value: String(i), label: `候補の説明 ${i}`, group: '分類'}));
const items = Array.from({length: 5}, (_, i) => ({id: `d${i}`, label: `項目 ${i}`, value: `値 ${i}`}));
const groups = Array.from({length: 5}, (_, i) => ({id: `g${i}`, label: `分類 ${i}`, items: [{id: `l${i}`, label: `移動先 ${i}`, href: '#runtime-anchor'}]}));

async function remember(target: Locator, key: string) {
  await target.evaluate((el, key) => {const w = window as any; (w.__cssTrackNodes ??= {})[key] = el;}, key);
}
async function retained(target: Locator, key: string) {
  expect(await target.evaluate((el, key) => (window as any).__cssTrackNodes[key] === el, key), 'same native DOM node').toBe(true);
}
async function declaration(target: Locator, property: string, expected: string) {
  const result = await target.evaluate((el, property) => ({value: (el as HTMLElement).style.getPropertyValue(property), priority: (el as HTMLElement).style.getPropertyPriority(property), computed: getComputedStyle(el).getPropertyValue(property).trim()}), property);
  expect(result.value).toBe(expected); expect(result.priority).toBe('important'); return result;
}
async function appRule(target: Locator, key: string, properties: Record<string, string>) {
  await target.evaluate((el, {key, properties}) => {
    el.setAttribute('data-css-track-app', key); const sheet = document.createElement('style'); sheet.id = key;
    sheet.textContent = `[data-css-track-app="${key}"]{${Object.entries(properties).map(([p,v]) => `${p}:${v}!important;`).join('')}}`;
    document.head.append(sheet);
  }, {key, properties});
}
async function appDeclaration(target: Locator, key: string, properties: Record<string, string>) {
  const values = await target.evaluate((el, {key, properties}) => {
    const sheet = document.getElementById(key) as HTMLStyleElement, rule = sheet.sheet!.cssRules[0] as CSSStyleRule;
    return Object.keys(properties).map(property => ({property, value: rule.style.getPropertyValue(property), priority: rule.style.getPropertyPriority(property), computed: getComputedStyle(el).getPropertyValue(property).trim()}));
  }, {key, properties});
  for (const value of values) {expect(value.value).toBe(properties[value.property]); expect(value.priority).toBe('important'); expect(value.computed).toBe(properties[value.property]);}
}
async function finished(page: Page, id: number, target: Locator, properties: Record<string, string>, key: string) {
  await remember(target, key + '-node'); await appDeclaration(target, key, properties);
  const before = await page.locator('#' + key).textContent();
  await destroy(page, id);
  expect(await page.evaluate(key => ((window as any).__cssTrackNodes[key] as HTMLElement).isConnected, key + '-node')).toBe(false);
  expect(await page.locator('#' + key).textContent()).toBe(before);
  await record('persistent-app-important-stylesheet', {key, properties, css: before});
}

async function metric(target: Locator) {
  return target.evaluate(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect(), left = r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), top = r.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop);
    // Only grid resolves this property to used pixel tracks. For block/inline,
    // percentages and minmax() are unresolved declaration tokens, not pixels.
    const tracks = s.display === 'grid' ? s.gridTemplateColumns.split(' ').filter(value => /^\d+(?:\.\d+)?px$/.test(value)).map(Number.parseFloat) : [];
    return {display: s.display, rawTracks: s.gridTemplateColumns, tracks, width: r.width - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth) - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), gap: s.columnGap === 'normal' ? 0 : parseFloat(s.columnGap), small: matchMedia('(max-width:40rem)').matches, dir: s.direction, children: Array.from(el.children).map(c => {const b = c.getBoundingClientRect(); return {x: b.left - left, y: b.top - top, w: b.width, h: b.height};})};
  });
}
// Independent native reference uses literal CSS grammar, no production var()/calc()/repeat()
// expressions. Content clones retain their normal child rules and intrinsic text/control sizes.
async function reference(target: Locator, native: {display?: string; columns: string; gap?: string; field?: boolean}) {
  return target.evaluate((el, native) => {
    const s = getComputedStyle(el), rect = el.getBoundingClientRect(), width = rect.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth);
    const wrapper = document.createElement('div'), ref = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;left:-10000px;top:0;box-sizing:content-box;margin:0;padding:0;border:0;'; wrapper.style.width = width + 'px';
    // The label fixture is a single-column vertical FormLayout. Preserve its
    // grid-item blockification of initial inline without positioning the reference.
    wrapper.style.display = native.field ? 'grid' : 'block'; if (native.field) wrapper.style.gridTemplateColumns = 'minmax(0,1fr)';
    ref.style.cssText = 'position:static;box-sizing:content-box;margin:0;padding:0;border:0;min-width:0;max-width:none;align-items:start;';
    ref.style.width = width + 'px'; ref.style.display = native.display ?? 'grid'; ref.style.gridTemplateColumns = native.columns; ref.style.gap = native.gap ?? s.gap;
    ref.style.fontFamily = s.fontFamily; ref.style.fontSize = s.fontSize; ref.style.fontWeight = s.fontWeight; ref.style.fontStyle = s.fontStyle;
    // FormField uses a unitless semantic leading token. Preserve that inherited
    // number for the smaller requirement span; computed px would change its line box.
    ref.style.lineHeight = native.field ? 'var(--ui-leading-body)' : s.lineHeight;
    ref.style.direction = s.direction; ref.style.letterSpacing = s.letterSpacing; ref.style.overflowWrap = s.overflowWrap;
    for (const name of Array.from(s).filter(name => name.startsWith('--ui-'))) ref.style.setProperty(name, s.getPropertyValue(name));
    for (const child of Array.from(el.children)) {const clone = child.cloneNode(true) as HTMLElement; clone.style.margin = getComputedStyle(child).margin; for (const node of [clone, ...clone.querySelectorAll('[id]')]) node.removeAttribute('id'); if (native.field) {clone.style.gridColumn = clone.matches('label') ? '1' : '2'; if (clone.matches('label')) clone.style.gridRow = '1';} ref.append(clone);}
    wrapper.append(ref); el.ownerDocument.body.append(wrapper); const r = ref.getBoundingClientRect(), expected = getComputedStyle(ref);
    const tracks = expected.display === 'grid' ? expected.gridTemplateColumns.split(' ').filter(value => /^\d+(?:\.\d+)?px$/.test(value)).map(Number.parseFloat) : [];
    const result = {display: expected.display, rawTracks: expected.gridTemplateColumns, tracks, children: Array.from(ref.children).map(c => {const b = c.getBoundingClientRect(); return {x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height};})};
    wrapper.remove(); return result;
  }, native);
}
async function nativeMatches(target: Locator, native: Parameters<typeof reference>[1]) {
  const actual = await metric(target), expected = await reference(target, native);
  expect(actual.display).toBe(expected.display); expect(actual.tracks).toHaveLength(expected.tracks.length);
  for (let i = 0; i < expected.tracks.length; i++) expect(Math.abs(actual.tracks[i]! - expected.tracks[i]!)).toBeLessThanOrEqual(1);
  expect(actual.children).toHaveLength(expected.children.length);
  for (let i = 0; i < expected.children.length; i++) for (const axis of ['x', 'y', 'w', 'h'] as const) expect(Math.abs(actual.children[i]![axis] - expected.children[i]![axis]), `native child ${i} ${axis}`).toBeLessThanOrEqual(1);
  await record('native-consumer-and-child-reference', {native, actual, expected}); return actual;
}
async function equalTracks(target: Locator, requested: number) {
  const actual = await metric(target), count = actual.small ? 1 : requested;
  expect(actual.display).toBe('grid'); expect(actual.tracks).toHaveLength(count);
  const width = (actual.width - (count - 1) * actual.gap) / count;
  for (const track of actual.tracks) expect(Math.abs(track - width)).toBeLessThanOrEqual(1);
  for (const child of actual.children) expect(Math.abs(child.w - width)).toBeLessThanOrEqual(1);
  await nativeMatches(target, {columns: Array.from({length: count}, () => 'minmax(0,1fr)').join(' ')});
  return actual;
}
async function columnsAudit(page: Page, target: Locator, property: string, fallback: boolean) {
  const parent = page.locator('main'); await set(parent, property, '3');
  for (const value of declarations) {
    await set(target, property, value); await settle(page); const own = await declaration(target, property, value), m = await metric(target);
    expect(own.computed).toBe(value === 'initial' ? '' : value === 'inherit' || value === 'unset' ? '3' : value);
    if (m.small) await equalTracks(target, 1);
    else if (value === '2' || value === 'inherit' || value === 'unset' || value === 'initial' && fallback) await equalTracks(target, value === 'initial' ? 1 : value === '2' ? 2 : 3);
    else await nativeMatches(target, {columns: 'none'});
    await record('column-declaration-native-semantics', {property, value, own});
  }
  await clear(parent, property);
}

for (const context of contexts) test.describe(`CSS tracks ${context.name}`, () => {
  test.beforeEach(async ({page}) => ready(page, context));

  test('form-layout-css-cascade styles-css-cascade columns initial/inherit/unset/zero/bogus actual grid and native editor', async ({page}) => {
    const id = await create(page, 'RuntimeP2CascadeForm', {columns: 2, labelPosition: 'above'}), node = host(page, id), layout = node.locator('.ui-form-layout'), editor = node.locator('#p2-editor');
    await editor.fill('保持する native 下書き'); await editor.focus(); await remember(editor, 'form-editor');
    await equalTracks(layout, 2); await columnsAudit(page, layout, '--ui-form-columns', true);
    await appRule(layout, 'form-layout-lease', {'--ui-form-columns': '2'}); await update(page, id, {columns: 4, error: '確認する説明'}); await appDeclaration(layout, 'form-layout-lease', {'--ui-form-columns': '2'}); await equalTracks(layout, 2);
    const next = contexts[(contexts.indexOf(context) + 1) % contexts.length]!; await environment(page, next); await equalTracks(layout, 2); await retained(editor, 'form-editor'); await expect(editor).toHaveValue('保持する native 下書き'); await expect(editor).toBeFocused();
    await hiddenReveal(page, node); await equalTracks(layout, 2); await retained(editor, 'form-editor'); await expect(editor).toHaveValue('保持する native 下書き');
    await finished(page, id, layout, {'--ui-form-columns': '2'}, 'form-layout-lease');
  });

  test('display-css-cascade selection-input-css-cascade column fallback grid tracks child rectangles and selection retention', async ({page}) => {
    for (const family of ['DescriptionsRuntime', 'MultiSelect'] as const) {
      const id = await create(page, family, family === 'DescriptionsRuntime' ? {items, columns: 2} : {controlId: 'track-options', label: '候補を選択', options, columns: 2, searchable: false, showSelectAll: false}), node = host(page, id), grid = node.locator(family === 'DescriptionsRuntime' ? 'dl' : '.ui-options'), native = family === 'DescriptionsRuntime' ? node.getByRole('textbox').first() : node.getByRole('checkbox').first(), property = family === 'DescriptionsRuntime' ? '--ui-description-columns' : '--ui-option-columns';
      if (family === 'DescriptionsRuntime') await native.fill('保持する本文'); else {await native.focus(); await native.press('Space'); await expect(native).toBeChecked();}
      await native.focus(); await remember(native, family); await equalTracks(grid, 2); await columnsAudit(page, grid, property, family === 'MultiSelect');
      await appRule(grid, family + '-lease', {[property]: '2'}); await update(page, id, {columns: 4}); await appDeclaration(grid, family + '-lease', {[property]: '2'}); await equalTracks(grid, 2);
      await environment(page, contexts[(contexts.indexOf(context) + 1) % contexts.length]!); await equalTracks(grid, 2); await retained(native, family); await expect(native).toBeFocused();
      if (family === 'DescriptionsRuntime') await expect(native).toHaveValue('保持する本文'); else await expect(native).toBeChecked();
      await hiddenReveal(page, node); await equalTracks(grid, 2); await retained(native, family);
      await finished(page, id, grid, {[property]: '2'}, family + '-lease'); await environment(page, context);
    }
  });

  test('form-field-css-cascade form-layout-css-cascade styles-css-cascade label native fallback and checkbox exclusion', async ({page}) => {
    const id = await create(page, 'RuntimeP2CascadeForm', {columns: 1, labelPosition: 'inline', labelWidth: 80}), node = host(page, id), layout = node.locator('.ui-form-layout'), field = node.locator('ui-form-field').first(), checkboxField = node.locator('ui-form-field').last(), editor = node.locator('#p2-editor'), parent = page.locator('main');
    await editor.fill('label変更で保持'); await editor.focus(); await remember(editor, 'label-editor');
    // Local field declarations must not affect checkbox's dedicated grid contract.
    const checkboxBefore = await metric(checkboxField);
    for (const value of ['80px minmax(0,1fr)', 'inherit', 'unset', 'initial', '0', 'bogus']) {
      await set(parent, '--ui-field-label-columns', '64px minmax(0,1fr)'); await set(field, '--ui-field-label-layout', 'grid'); await set(field, '--ui-field-label-columns', value); await settle(page);
      // Unlike repeat(0,...), direct grid-template-columns:0 is a valid zero-width
      // explicit track; the editor in column 2 then creates an implicit auto track.
      const own = await declaration(field, '--ui-field-label-columns', value), m = await metric(field), columns = value === 'inherit' || value === 'unset' ? '64px minmax(0,1fr)' : value === 'initial' ? '80px minmax(0,1fr)' : value === 'bogus' ? 'none' : value;
      expect(own.computed).toBe(value === 'initial' ? '' : value === 'inherit' || value === 'unset' ? '64px minmax(0,1fr)' : value);
      await nativeMatches(field, {display: m.small ? 'block' : 'grid', columns, gap: `${m.gap}px`, field: true});
      expect(await metric(checkboxField)).toEqual(checkboxBefore);
    }
    await clear(parent, '--ui-field-label-columns'); await clear(field, '--ui-field-label-columns'); await clear(field, '--ui-field-label-layout');
    // Form label width has a semantic fallback only when initial makes var() unavailable.
    await set(parent, '--ui-form-label-width', '64px');
    for (const value of ['80px', 'inherit', 'unset', 'initial', '0', '0px', 'bogus']) {
      await set(layout, '--ui-form-label-width', value); await settle(page); const m = await metric(field);
      const semantic = await field.evaluate(el => {const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;inline-size:var(--ui-size-form-label);'; el.append(probe); const size = probe.getBoundingClientRect().width; probe.remove(); return size;});
      const label = value === 'initial' ? semantic : value === 'inherit' || value === 'unset' ? 64 : value === '80px' ? 80 : 0;
      // min() requires compatible numeric types: unitless 0 mixed with 40%
      // is invalid, whereas the explicit length 0px is a valid zero minimum.
      await nativeMatches(field, {display: m.small ? 'block' : 'grid', columns: value === '0' || value === 'bogus' ? 'none' : `${Math.min(label, m.width * .4)}px minmax(0,1fr)`, gap: `${m.gap}px`, field: true});
      await declaration(layout, '--ui-form-label-width', value);
    }
    await clear(parent, '--ui-form-label-width'); await set(layout, '--ui-form-label-width', '80px');
    await set(parent, '--ui-field-label-layout', 'block');
    for (const value of ['grid', 'inherit', 'unset', 'initial', '0', 'bogus']) {
      await set(field, '--ui-field-label-layout', value); await settle(page); const m = await metric(field);
      const display = m.small ? 'block' : value === 'inherit' || value === 'unset' ? 'block' : value === '0' || value === 'bogus' ? 'inline' : 'grid';
      await nativeMatches(field, {display, columns: `${Math.min(80, m.width * .4)}px minmax(0,1fr)`, gap: `${m.gap}px`, field: true}); await declaration(field, '--ui-field-label-layout', value);
    }
    await clear(parent, '--ui-field-label-layout'); await clear(field, '--ui-field-label-layout'); await appRule(field, 'field-lease', {'--ui-field-label-layout': 'grid', '--ui-field-label-columns': '80px minmax(0,1fr)'}); await update(page, id, {labelPosition: 'above', labelWidth: 120, fieldPosition: 'above'});
    for (const next of [context, contexts[(contexts.indexOf(context) + 1) % contexts.length]!]) {await environment(page, next); const m = await metric(field); await nativeMatches(field, {display: m.small ? 'block' : 'grid', columns: '80px minmax(0,1fr)', gap: `${m.gap}px`, field: true}); await retained(editor, 'label-editor'); await expect(editor).toHaveValue('label変更で保持'); await expect(editor).toBeFocused();}
    await hiddenReveal(page, node); await retained(editor, 'label-editor'); await finished(page, id, field, {'--ui-field-label-layout': 'grid', '--ui-field-label-columns': '80px minmax(0,1fr)'}, 'field-lease');
  });

  test('mega-menu-css-cascade non-auto-fit native fallback tracks positive/zero/invalid and producer lifecycle', async ({page}) => {
    const anchor = await page.locator('#runtime-anchor').evaluateHandle(el => el);
    const id = await page.evaluate(({anchor, groups}) => (window as any).__runtime.create('MegaMenu', {controlId: 'track-mega', label: '移動先一覧', anchor, open: true, columns: 3, groups}), {anchor, groups}), node = host(page, id), nav = node.locator('nav'), parent = page.locator('main');
    await expect(node).toBeVisible(); const link = node.getByRole('link').first(); await link.focus(); await remember(link, 'mega-link');
    const autoFit = async () => {
      const m = await metric(nav), minimum = await nav.evaluate(el => {const p = document.createElement('span'); p.style.cssText = 'position:absolute;width:var(--ui-size-navigation-column);'; el.append(p); const width = p.getBoundingClientRect().width; p.remove(); return width;});
      // A desired 3-column layout is possible only if three semantic minimums + gaps fit.
      let count = 1; for (let n = 2; n <= 3; n++) if (n * minimum + (n - 1) * m.gap <= m.width + .01) count = n;
      // When 3 minima do not fit, the requested fraction still caps capacity: two won't
      // fit unless the semantic minimum permits them. The independent space budget is enough.
      const positive = m.tracks.filter(track => track > 0); expect(positive).toHaveLength(count);
      const width = (m.width - (count - 1) * m.gap) / count; for (const track of positive) expect(Math.abs(track - width)).toBeLessThanOrEqual(1);
      for (const child of m.children) expect(Math.abs(child.w - width)).toBeLessThanOrEqual(1);
      await record('mega-auto-fit-semantic-space-budget', {m, minimum, count, width});
    };
    await autoFit(); await set(parent, '--ui-mega-columns', '2');
    for (const value of ['2', 'inherit', 'unset', 'initial', '0', 'bogus']) {
      await set(nav, '--ui-mega-columns', value); await settle(page); const own = await declaration(nav, '--ui-mega-columns', value);
      expect(own.computed).toBe(value === 'initial' ? '' : value === 'inherit' || value === 'unset' ? '2' : value);
      if (value === 'initial' || value === 'bogus') await nativeMatches(nav, {columns: 'none'});
      else if (value === '0') {
        // Zero division follows native CSS numeric semantics; a literal +infinity
        // minimum is independently equivalent to the minimum clamped at 100%.
        await nativeMatches(nav, {columns: 'minmax(100%,1fr)'});
      } else {
        const m = await metric(nav), minimum = await nav.evaluate(el => {const p = document.createElement('span'); p.style.cssText = 'position:absolute;width:var(--ui-size-navigation-column);'; el.append(p); const w = p.getBoundingClientRect().width; p.remove(); return w;});
        const count = m.width >= 2 * minimum + m.gap ? 2 : 1; await nativeMatches(nav, {columns: Array.from({length: count}, () => 'minmax(0,1fr)').join(' ')});
      }
    }
    await clear(parent, '--ui-mega-columns'); await clear(nav, '--ui-mega-columns'); await appRule(nav, 'mega-lease', {'--ui-mega-columns': '2'}); await update(page, id, {columns: 4}); await appDeclaration(nav, 'mega-lease', {'--ui-mega-columns': '2'});
    await environment(page, contexts[(contexts.indexOf(context) + 1) % contexts.length]!);
    const m = await metric(nav), minimum = await nav.evaluate(el => {const p = document.createElement('span'); p.style.cssText = 'position:absolute;width:var(--ui-size-navigation-column);'; el.append(p); const w = p.getBoundingClientRect().width; p.remove(); return w;});
    await nativeMatches(nav, {columns: m.width >= 2 * minimum + m.gap ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)'}); await retained(link, 'mega-link'); await expect(link).toBeFocused();
    await node.evaluate(el => (el as HTMLElement).hidden = true); await expect(node).toBeHidden(); await settle(page);
    await node.evaluate(el => (el as HTMLElement).hidden = false); await update(page, id, {open: false}); await update(page, id, {open: true}); await expect(node).toBeVisible();
    const revealed = await metric(nav), revealMinimum = await nav.evaluate(el => {const p = document.createElement('span'); p.style.cssText = 'position:absolute;width:var(--ui-size-navigation-column);'; el.append(p); const w = p.getBoundingClientRect().width; p.remove(); return w;});
    await nativeMatches(nav, {columns: revealed.width >= 2 * revealMinimum + revealed.gap ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)'});
    await retained(link, 'mega-link'); await finished(page, id, nav, {'--ui-mega-columns': '2'}, 'mega-lease');
  });
});
