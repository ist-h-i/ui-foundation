import type {Locator, Page} from '@playwright/test';
import {test, expect, contexts, ready as runtimeReady, environment, create, update, host, settle, set, clear, record, destroy} from './css-override-test';

async function ready(page:Page,context:typeof contexts[number]){await runtimeReady(page,context);await page.locator('#runtime-slot').evaluate(el=>{const slot=el as HTMLElement;slot.style.padding='calc(var(--ui-border-focus) + var(--ui-border-focus-offset))';slot.style.boxSizing='border-box';});await settle(page);}

const near = (actual: number, expected: number, label: string) => expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(1);
async function rect(node: Locator) {const box = await node.boundingBox(); expect(box).not.toBeNull(); return box!;}
async function token(node: Locator, name: string) {
  return node.evaluate((el, name) => {const probe = document.createElement('span');probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;inline-size:var(${name});`;el.append(probe);const result = probe.getBoundingClientRect().width;probe.remove();return result;}, name);
}
async function nativeFocus(page: Page, node: Locator) {
  await page.locator('#runtime-anchor').click();
  for (let step = 0; step < 40; step++) {await page.keyboard.press('Tab');if (await node.evaluate(el => el === document.activeElement)) break;}
  await expect(node).toBeFocused(); await ring(node);
}
async function ring(node: Locator) {
  const result = await node.evaluate(el => {
    const style = getComputedStyle(el), box = el.getBoundingClientRect();
    const reach = Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset));
    let clip = {left: 0, top: 0, right: innerWidth, bottom: innerHeight};
    const ancestors = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const s = getComputedStyle(parent), r = parent.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX)) {clip.left = Math.max(clip.left, r.left + parent.clientLeft);clip.right = Math.min(clip.right, r.left + parent.clientLeft + parent.clientWidth);}
      if (/auto|scroll|hidden|clip/.test(s.overflowY)) {clip.top = Math.max(clip.top, r.top + parent.clientTop);clip.bottom = Math.min(clip.bottom, r.top + parent.clientTop + parent.clientHeight);}
      if (/auto|scroll|hidden|clip/.test(s.overflowX + ' ' + s.overflowY)) ancestors.push({tag: parent.tagName, class: parent.className, overflowX: s.overflowX, overflowY: s.overflowY, box: r.toJSON(), clientWidth: parent.clientWidth, clientHeight: parent.clientHeight});
    }
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return {focus: el.matches(':focus-visible'), width: parseFloat(style.outlineWidth), style: style.outlineStyle,
      color: style.outlineColor, offset: parseFloat(style.outlineOffset), extent: reach, hit: hit === el || !!hit && el.contains(hit),
      box: box.toJSON(), ring: {left: box.left - reach, right: box.right + reach, top: box.top - reach, bottom: box.bottom + reach}, clip, ancestors,
      label: el.getAttribute('aria-label') ?? el.textContent?.trim(), rootScroll: {x: scrollX, y: scrollY},
      inside: box.left - reach >= clip.left - 1 && box.right + reach <= clip.right + 1 && box.top - reach >= clip.top - 1 && box.bottom + reach <= clip.bottom + 1};
  });
  try {
    expect(result.focus).toBe(true);expect(result.width).toBeGreaterThan(0);expect(result.style).not.toBe('none');
    expect(result.color).not.toBe('rgba(0, 0, 0, 0)');expect(result.hit).toBe(true);expect(result.inside).toBe(true);
  } finally {await record('layout-focus-ring', result);}
}

for (const context of contexts) {
  test(`reassessment layout-public R111 R128-R130 ${context.name}: semantic width, scroll used height, sticky flow and local terminal`, async ({page}) => {
    await ready(page, context);
    const containerId = await create(page, 'Container', {maxWidth: 'content', padding: 'normal'}, '<p>幅の制約内に保持する内容</p>');
    const container = host(page, containerId);
    for (const maxWidth of ['content', 'full', 180] as const) {
      await update(page, containerId, {maxWidth});
      const actual = await rect(container), parent = await container.evaluate(el => {
        const parent = el.parentElement!, style = getComputedStyle(parent), outer = parent.getBoundingClientRect().width;
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight), border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
        return {outer, padding, border, content: outer - padding - border};
      });
      // A block's percentage/auto size uses its containing content box, excluding stage padding.
      const maximum = maxWidth === 'content' ? await token(container, '--ui-size-content') : maxWidth === 'full' ? parent.content : maxWidth;
      near(actual.width, Math.min(parent.content, maximum), 'Container used semantic/public maximum');
      await record('container-containing-content-' + maxWidth, {parent, maximum, actual});
      await expect(container).toContainText('幅の制約内に保持する内容');
    }
    const scrollId = await create(page, 'ScrollArea', {label: '独立した高さの領域', height: 180, direction: 'vertical'}, '<div style="block-size:700px"><p>先頭の内容</p><button style="margin-block-start:600px">末尾の操作</button></div>');
    const viewport = host(page, scrollId).getByRole('region');
    for (const height of [180, 'viewport', 'auto'] as const) {
      await update(page, scrollId, {height});
      near((await rect(viewport)).height, height === 'viewport' ? await token(viewport, '--ui-size-table-viewport') : height === 'auto' ? 700 : height, 'ScrollArea actual used height');
    }
    await update(page, scrollId, {height: 180});await nativeFocus(page, viewport);await viewport.press('End');
    await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await destroy(page, scrollId);await destroy(page, containerId);

    const stickyId = await create(page, 'StickyRegion', {offset: 12, edge: 'top'}, '<p style="margin:0;block-size:40px">終端を確認する固定内容</p>');
    const sticky = host(page, stickyId);
    await sticky.evaluate(el => {
      const root = document.createElement('div');root.id = 'reassessment-sticky-root';root.style.cssText = 'height:220px;overflow:auto;border:1px solid transparent;';
      const lead = document.createElement('div'), scope = document.createElement('div'), prefix = document.createElement('div'), tail = document.createElement('div');
      lead.style.height = '180px';scope.style.height = '700px';scope.dataset['stickyScope'] = '';prefix.style.height = '120px';tail.style.height = '700px';
      el.before(root);root.append(lead, scope, tail);scope.append(prefix, el);
    });
    const root = page.locator('#reassessment-sticky-root');
    const natural = await sticky.evaluate(el => {const root = el.closest('#reassessment-sticky-root')!;return el.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop;});
    expect(natural).toBeGreaterThan(12);
    const observations = [];
    for (const top of [0, 360, 900]) {
      await root.evaluate((el, top) => el.scrollTop = top, top);await settle(page);
      const g = await sticky.evaluate((el, natural) => {
        const root = el.closest('#reassessment-sticky-root')!, scope = el.closest('[data-sticky-scope]')!, r = el.getBoundingClientRect(), start = root.getBoundingClientRect().top + root.clientTop;
        return {top: r.top, expected: Math.min(Math.max(start + natural - root.scrollTop, start + 12), scope.getBoundingClientRect().bottom - r.height), scroll: root.scrollTop};
      }, natural);
      near(g.top, g.expected, 'Sticky follows normal flow, then pin, then containing block terminal');observations.push(g);
    }
    await update(page, stickyId, {enabled: false});await root.evaluate(el => el.scrollTop = 360);
    near(await sticky.evaluate(el => el.getBoundingClientRect().top), await root.evaluate((el, natural) => el.getBoundingClientRect().top + el.clientTop + natural - el.scrollTop, natural), 'disabled Sticky restores flow');
    await record('layout-public-used-geometry', observations);await destroy(page, stickyId);await root.evaluate(el => el.remove());
  });

  test(`reassessment splitter R162 ${context.name}: actual pane min/max drag ratios and pointercancel ownership`, async ({page}) => {
    await ready(page, context);
    const id = await create(page, 'RuntimeP2Measured', {mode: 'split', height: 320, ratio: 40, minRatio: 30, maxRatio: 70});
    const node = host(page, id), handle = node.getByRole('separator');
    const panes = node.locator('.ui-splitter-pane');
    async function ratio(expected: number) {
      await expect(handle).toHaveAttribute('aria-valuenow', String(expected));
      const first = await rect(panes.nth(0)), second = await rect(panes.nth(1));
      near(first.width, (first.width + second.width) * expected / 100, 'actual pane proportion excluding separator');
      expect(first.width).toBeGreaterThan(0);expect(second.width).toBeGreaterThan(0);
    }
    await nativeFocus(page, handle);await handle.press('Home');await ratio(30);await handle.press('End');await ratio(70);
    await handle.evaluate(el => el.addEventListener('pointerdown', event => (el as HTMLElement).dataset['pointerId'] = String((event as PointerEvent).pointerId)));
    for (const [sign, expected] of [[-1, 30], [1, 70]] as const) {
      const box = await rect(handle), extent = (await rect(panes.nth(0))).width + (await rect(panes.nth(1))).width;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + sign * (context.dir === 'rtl' ? -1 : 1) * extent * .6, box.y + box.height / 2);
      await ratio(expected);await page.mouse.up();
    }
    const box = await rect(handle);await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);await page.mouse.down();
    expect(await handle.evaluate(el => el.hasPointerCapture(Number((el as HTMLElement).dataset['pointerId'])))).toBe(true);
    await handle.dispatchEvent('pointercancel', {pointerId: Number(await handle.getAttribute('data-pointer-id')), pointerType: 'mouse', bubbles: true});
    expect(await handle.evaluate(el => el.hasPointerCapture(Number((el as HTMLElement).dataset['pointerId'])))).toBe(false);
    await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2);await page.mouse.up();await ratio(70);
    await nativeFocus(page, handle);await record('splitter-pane-bounds', {first: await rect(panes.nth(0)), second: await rect(panes.nth(1)), pointerCancelDeliveredToCapturedPointer: true});
    await destroy(page, id);
  });

  test(`reassessment textarea R176 R177 ${context.name}: intrinsic clone height after profile/hidden reveal and capped native scroll`, async ({page}) => {
    await ready(page, context);
    const id = await create(page, 'Textarea', {controlId: 'reassessment-textarea', label: '保持する長文', autoResize: true, rows: 2, maxHeight: 10000});
    const node = host(page, id), editor = node.getByRole('textbox'), text = '申請内容 ABCDEF を確認して次の操作へ進みます。\n'.repeat(12);
    await editor.fill(text);
    async function intrinsic() {
      return editor.evaluate(el => {
        const original = el as HTMLTextAreaElement, style = getComputedStyle(original), clone = original.cloneNode() as HTMLTextAreaElement;
        clone.removeAttribute('id');clone.removeAttribute('name');clone.setAttribute('aria-hidden', 'true');clone.tabIndex = -1;
        for (const property of Array.from(style)) clone.style.setProperty(property, style.getPropertyValue(property));
        clone.style.cssText += ';position:absolute;visibility:hidden;pointer-events:none;height:auto;block-size:auto;max-height:none;max-block-size:none;';
        clone.style.width = original.getBoundingClientRect().width + 'px';clone.value = original.value;document.body.append(clone);
        const natural = clone.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);clone.remove();
        return {natural, actual: original.getBoundingClientRect().height, scroll: original.scrollHeight, client: original.clientHeight};
      });
    }
    await expect.poll(async () => {const g = await intrinsic();return Math.abs(g.natural - g.actual);}).toBeLessThanOrEqual(1);
    await environment(page, contexts[(contexts.indexOf(context) + 1) % contexts.length]);
    await expect.poll(async () => {const g = await intrinsic();return Math.abs(g.natural - g.actual);}).toBeLessThanOrEqual(1);
    await node.evaluate(el => (el as HTMLElement).hidden = true);await expect(editor).toBeHidden();
    await environment(page, context);await node.evaluate(el => (el as HTMLElement).hidden = false);
    await expect.poll(async () => {const g = await intrinsic();return Math.abs(g.natural - g.actual);}).toBeLessThanOrEqual(1);
    await update(page, id, {maxHeight: 180});await expect.poll(async () => (await intrinsic()).actual).toBeLessThanOrEqual(181);
    expect((await intrinsic()).natural).toBeGreaterThan(180);await nativeFocus(page, editor);await editor.press('Control+End');
    await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBeGreaterThan(0);await expect(editor).toHaveValue(text);await ring(editor);
    await record('textarea-independent-intrinsic', await intrinsic());await destroy(page, id);
  });

  test(`reassessment masonry R014 ${context.name}: unequal card heights stay unfragmented without overlap and retain native actions`, async ({page}) => {
    await ready(page, context);
    const items = Array.from({length: 7}, (_, i) => ({id: 'card-' + i, label: '申請を確認 ' + i, text: '内容を確認する ABCD '.repeat([2, 8, 3, 12, 4, 6, 2][i])}));
    const id = await create(page, 'RuntimeReassessmentMasonry', {items, columns: 2}), node = host(page, id);
    for (const columns of [2, 1, 3]) {
      await update(page, id, {columns});await settle(page);
      const cards = await node.locator('li[data-item-key]').evaluateAll(elements => elements.map(el => ({key: el.getAttribute('data-item-key'), fragments: el.getClientRects().length, box: el.getBoundingClientRect().toJSON()})));
      expect(cards).toHaveLength(7);expect(new Set(cards.map(card => Math.round(card.box.height))).size).toBeGreaterThan(1);
      for (let i = 0; i < cards.length; i++) {expect(cards[i].fragments).toBe(1);expect(cards[i].box.height).toBeGreaterThan(0);for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i].box, b = cards[j].box;expect(Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1, 'cards must not overlap').toBe(false);
      }}
      await record('masonry-' + columns, cards);
    }
    await update(page, id, {columns: 1, items: items.map(item => ({...item, text: item.text + ' 更新後の全文末尾'}))});
    for (const item of items) {const action = node.getByRole('button', {name: item.label, exact: true});await nativeFocus(page, action);await expect(node.locator(`li[data-item-key="${item.id}"]`)).toContainText('更新後の全文末尾');}
    await destroy(page, id);
  });

  test(`reassessment grid-list R092 ${context.name}: semantic minimum threshold uses real gap and retains updated selected content`, async ({page}) => {
    await ready(page, context);
    const items = Array.from({length: 5}, (_, i) => ({id: 'item-' + i, name: '保持する申請 ' + i}));
    const id = await create(page, 'GridList', {items, keyField: 'id', labelField: 'name', controlId: 'threshold-grid', label: '幅の境界一覧', selectionMode: 'single', gap: 'compact'});
    const node = host(page, id), list = node.locator('ul.ui-grid-list');await set(node, '--ui-size-grid-item', '80px');
    for (const gap of ['compact', 'wide']) {
      await update(page, id, {gap});
      const minimum = await node.locator('.ui-grid-list__measure').evaluate(el => el.getBoundingClientRect().width);near(minimum,80,'independent configured semantic grid minimum');
      const actualGap = await list.evaluate(el => parseFloat(getComputedStyle(el).columnGap));
      const expectedGap = await token(node, gap === 'compact' ? '--ui-space-control-gap' : '--ui-space-section');near(actualGap, expectedGap, 'actual semantic gap');
      const threshold = minimum * 2 + actualGap;
      for (const delta of [-1, 0, 1]) {
        await node.evaluate((el, width) => (el as HTMLElement).style.inlineSize = width + 'px', threshold + delta);
        await expect.poll(() => list.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(delta < 0 ? 1 : 2);
        const geometry = await list.evaluate(el => {const style = getComputedStyle(el);return {width: el.getBoundingClientRect().width, gap: parseFloat(style.columnGap), tracks: style.gridTemplateColumns.split(' ').map(Number.parseFloat)};});
        for (const width of geometry.tracks) near(width, (geometry.width - geometry.gap * (geometry.tracks.length - 1)) / geometry.tracks.length, 'used grid tracks');
        await record('grid-minimum-' + gap + '-' + delta, {minimum, threshold, delta, ...geometry});
      }
    }
    await clear(node, 'inline-size');await update(page, id, {items: items.map(item => ({...item, name: item.name + ' 更新済み全文'}))});
    const choice = node.getByRole('radio').first();await nativeFocus(page, choice);await choice.press('Space');
    await expect(node).toContainText('保持する申請 0 更新済み全文');
    const event = await page.evaluate(id => (window as any).__runtime.inspect(id).events.filter((event: {name: string}) => event.name === 'selectedKeysChange').at(-1), id);expect(event.value).toEqual(['item-0']);await destroy(page, id);
  });

  test(`reassessment layout-css R124 R125 ${context.name}: divider pseudo used border thickness/color and adjacent keyboard rings`, async ({page}) => {
    await ready(page, context);
    const id = await create(page, 'RuntimeReassessmentDivider', {}), node = host(page, id), divider = node.locator('ui-divider');
    for (const orientation of ['horizontal', 'vertical']) for (const lineStyle of ['solid', 'dashed', 'dotted']) {
      await update(page, id, {orientation, lineStyle});
      const expected = await divider.evaluate(el => {const probe = document.createElement('span');probe.style.cssText = 'position:absolute;visibility:hidden;border-top:var(--ui-border-control) solid var(--ui-color-border);';el.append(probe);const style = getComputedStyle(probe), result = {width: parseFloat(style.borderTopWidth), color: style.borderTopColor};probe.remove();return result;});
      for (const pseudo of ['::before', '::after']) {
        const actual = await divider.evaluate((el, {pseudo, orientation}) => {const s = getComputedStyle(el, pseudo);return orientation === 'horizontal' ? {width: parseFloat(s.borderTopWidth), color: s.borderTopColor, style: s.borderTopStyle} : {width: parseFloat(s.borderInlineStartWidth), color: s.borderInlineStartColor, style: s.borderInlineStartStyle};}, {pseudo, orientation});
        expect(actual.width).toBeGreaterThan(0);near(actual.width, expected.width, 'used pseudo border thickness');expect(actual.color).toBe(expected.color);expect(actual.style).toBe(lineStyle);
      }
      await nativeFocus(page, node.getByRole('button', {name: '境界の前の操作', exact: true}));await page.keyboard.press('Tab');await expect(node.getByRole('button', {name: '境界の後の操作', exact: true})).toBeFocused();await ring(node.getByRole('button', {name: '境界の後の操作', exact: true}));
    }
    await destroy(page, id);
  });

  test(`reassessment specialist-style R161 ${context.name}: JsonViewer real table consumer has local full-content reach after update`, async ({page}) => {
    await ready(page, context);
    const source = JSON.stringify(Object.fromEntries(Array.from({length: 24}, (_, i) => ['申請項目' + i, '保持する長文 ' + i + ' ABCDEFGHIJ '.repeat(6)])));
    const id = await create(page, 'JsonViewer', {label: '実consumerの階層', source}), node = host(page, id), viewport = node.getByRole('region', {name: '実consumerの階層の階層', exact: true}), table = node.locator('table.ui-specialist-data-table');
    for (const columns of [3, 5]) {
      await set(table, '--ui-specialist-columns', String(columns));await node.evaluate(el=>(el as HTMLElement).style.inlineSize='240px');await settle(page);
      const dimensions = await table.evaluate(el => {const style = getComputedStyle(el), parent = el.parentElement!;const unit = document.createElement('span');unit.style.cssText = 'position:absolute;visibility:hidden;inline-size:max(var(--ui-size-table-column-min),calc(8em + var(--ui-space-table-x) * 2));';el.append(unit);const minimum = unit.getBoundingClientRect().width;unit.remove();return {minimum, width: el.getBoundingClientRect().width, minWidth: parseFloat(style.minWidth), client: parent.clientWidth, scroll: parent.scrollWidth};});
      near(dimensions.minWidth, dimensions.minimum * columns, 'shared CSS used table minimum from actual consumer');expect(dimensions.width).toBeGreaterThanOrEqual(dimensions.minWidth - 1);expect(dimensions.scroll).toBeGreaterThan(dimensions.client);
      await nativeFocus(page, viewport);await viewport.press('End');await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      await viewport.evaluate(el => {el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -el.scrollWidth : el.scrollWidth;el.scrollTop = el.scrollHeight;});
      const last = node.locator('tbody tr').last().locator('td').last();await expect(last).toContainText('保持する長文 23');
      await last.evaluate(el => {
        el.scrollIntoView({block: 'end', inline: 'end'});
        const text = el.querySelector('code')!.firstChild!, range = document.createRange();
        range.setStart(text, Math.max(0, (text.textContent?.length ?? 1) - 1));range.setEnd(text, text.textContent!.length);
        const endpoint = range.getBoundingClientRect(), viewport = el.closest<HTMLElement>('.ui-specialist-scroll')!, view = viewport.getBoundingClientRect();
        viewport.scrollBy({left: endpoint.right > view.right ? endpoint.right - view.right + 2 : endpoint.left < view.left ? endpoint.left - view.left - 2 : 0, behavior: 'instant'});
      });await settle(page);
      const end = await last.evaluate(el => {const text = el.querySelector('code')!.firstChild!, range = document.createRange();range.setStart(text, Math.max(0, text.textContent!.length - 1));range.setEnd(text, text.textContent!.length);return {last: range.getBoundingClientRect().toJSON(), view: el.closest('.ui-specialist-scroll')!.getBoundingClientRect().toJSON()};});
      expect(end.last.width).toBeGreaterThan(0);expect(end.last.bottom).toBeLessThanOrEqual(end.view.bottom + 1);expect(end.last.right).toBeLessThanOrEqual(end.view.right + 1);expect(end.last.left).toBeGreaterThanOrEqual(end.view.left - 1);
      await record('specialist-json-columns-' + columns, {dimensions, end});
    }
    await update(page, id, {source: JSON.stringify({更新された申請: '更新後も消えない全文末尾'})});await expect(table).toContainText('更新後も消えない全文末尾');
    const search = node.getByRole('searchbox');await nativeFocus(page, search);await search.fill('更新された申請');await ring(search);await expect(table).toContainText('更新後も消えない全文末尾');await destroy(page, id);
  });
}
