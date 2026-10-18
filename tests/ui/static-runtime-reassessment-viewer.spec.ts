import type {Locator, Page, Route} from '@playwright/test';
import {test, expect, contexts, ready, environment, create, update, host, settle, record, destroy} from './css-override-test';

async function bitmap(page: Page, width: number, height: number) {
  return page.evaluate(({width, height}) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'red'; context.fillRect(0, 0, width / 2, height);
    context.fillStyle = 'blue'; context.fillRect(width / 2, 0, width / 2, height);
    return canvas.toDataURL('image/png');
  }, {width, height});
}

async function decoded(image: Locator, width = 400, height = 200) {
  await expect.poll(() => image.evaluate(el => {
    const image = el as HTMLImageElement;
    return image.complete ? [image.naturalWidth, image.naturalHeight] : [];
  })).toEqual([width, height]);
}

const near = (actual: number, expected: number, description: string) =>
  expect(Math.abs(actual - expected), description).toBeLessThanOrEqual(1);

async function geometry(viewer: Locator) {
  return viewer.evaluate(el => {
    const viewport = el.querySelector<HTMLElement>('.ui-image-viewport')!;
    const canvas = el.querySelector<HTMLElement>('.ui-image-canvas')!;
    const image = canvas.querySelector<HTMLElement>('ui-image')!;
    const native = image.querySelector<HTMLImageElement>('img')!;
    const box = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return {x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom};
    };
    const style = getComputedStyle(viewport), transform = new DOMMatrix(getComputedStyle(image).transform);
    return {viewport: box(viewport), canvas: box(canvas), image: box(image), native: box(native),
      available: viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      scroll: {left: viewport.scrollLeft, top: viewport.scrollTop, width: viewport.scrollWidth, height: viewport.scrollHeight,
        clientWidth: viewport.clientWidth, clientHeight: viewport.clientHeight},
      overflowX: style.overflowX, overflowY: style.overflowY, fit: getComputedStyle(native).objectFit,
      matrix: [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f],
      natural: [native.naturalWidth, native.naturalHeight]};
  });
}

async function rotationOracle(page: Page, viewer: Locator, angle: number, zoom: number) {
  const viewport = viewer.locator('.ui-image-viewport');
  await viewport.evaluate(el => el.scrollTo({left: 0, top: 0, behavior: 'instant'}));
  await viewport.scrollIntoViewIfNeeded(); await settle(page);
  const g = await geometry(viewer), width = g.available * zoom, height = width / 2;
  const rotated = angle % 180 !== 0;
  near(g.canvas.width, rotated ? height : width, 'rotation swaps the canvas width');
  near(g.canvas.height, rotated ? width : height, 'rotation swaps the canvas height');
  near(g.image.width, g.canvas.width, 'transformed host fits canvas horizontally');
  near(g.image.height, g.canvas.height, 'transformed host fits canvas vertically');
  near(g.image.x + g.image.width / 2, g.canvas.x + g.canvas.width / 2, 'transformed image center x');
  near(g.image.y + g.image.height / 2, g.canvas.y + g.canvas.height / 2, 'transformed image center y');
  near(g.native.width, g.canvas.width, 'decoded image has the transformed canvas width');
  near(g.native.height, g.canvas.height, 'decoded image has the transformed canvas height');
  expect(g.natural).toEqual([400, 200]); expect(g.fit).toBe('contain');
  expect(g.overflowX).toBe('auto'); expect(g.overflowY).toBe('auto');
  const expected = angle === 0 ? [1, 0, 0, 1, 0, 0] : angle === 90 ? [0, 1, -1, 0, height, 0]
    : angle === 180 ? [-1, 0, 0, -1, width, height] : [0, -1, 1, 0, 0, width];
  for (let index = 0; index < expected.length; index++)
    expect(Math.abs(g.matrix[index] - expected[index]), 'DOMMatrix rotation and translation').toBeLessThanOrEqual(.01);
  // Read the rendered marker pixels, independently of the CSS matrix oracle.
  const screenshot = await viewport.screenshot();
  const colors = await page.evaluate(async ({png, points, viewport}) => {
    const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', {willReadFrequently: true})!; context.drawImage(image, 0, 0);
    return points.map(point => {
      const x = (point.x - viewport.x) * canvas.width / viewport.width;
      const y = (point.y - viewport.y) * canvas.height / viewport.height;
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) throw new Error('Marker is clipped outside viewport');
      return [...context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data].slice(0, 3);
    });
  }, {png: screenshot.toString('base64'), viewport: g.viewport,
    points: [.25, .75].map(fraction => ({
      x: g.canvas.x + g.matrix[0] * width * fraction + g.matrix[2] * height / 2 + g.matrix[4],
      y: g.canvas.y + g.matrix[1] * width * fraction + g.matrix[3] * height / 2 + g.matrix[5],
    }))});
  expect(colors).toEqual([[255, 0, 0], [0, 0, 255]]);
  await record('viewer-rotation-' + angle, {angle, zoom, ...g, colors});
}

async function inspect(page: Page, id: number) {
  return page.evaluate(id => (window as any).__runtime.inspect(id), id);
}

for (const context of contexts) test(`reassessment ImageViewer R102-R106 ${context.name}: decoded rotation geometry/paint, retry, native scroll and late load ownership`, async ({page}) => {
  await ready(page, context);
  const source = await bitmap(page, 400, 200), portrait = await bitmap(page, 200, 400);
  const id = await create(page, 'ImageViewer', {label: '回転と取得を確認する画像', open: true, zoom: .5,
    images: [{id: 'marker', src: source, alt: '左が赤、右が青の画像'}]});
  const viewer = host(page, id), image = viewer.locator('.ui-image-canvas img');
  await decoded(image);
  for (const angle of [0, 90, 180, 270]) {
    if (angle) await viewer.getByRole('button', {name: '右へ90度回転', exact: true}).click();
    await rotationOracle(page, viewer, angle, .5);
  }
  expect((await inspect(page, id)).events.filter((event: {name: string}) => event.name === 'rotationChange').map((event: {value: number}) => event.value)).toEqual([90, 180, 270]);

  // The same retained viewer must recalculate from the new viewport/profile/font/direction.
  const changed = contexts[(contexts.indexOf(context) + 1) % contexts.length];
  await environment(page, changed); await decoded(image);
  await rotationOracle(page, viewer, 270, .5);
  const range = viewer.getByLabel('拡大率', {exact: true});
  await range.focus(); await range.press('End'); await expect(range).toBeFocused();
  await expect(range).toHaveValue('400');
  const viewport = viewer.getByRole('region', {name: '画像表示領域', exact: true});
  await range.press('Tab');
  await expect(viewer.getByRole('button', {name: '右へ90度回転', exact: true})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(viewer.getByRole('button', {name: '表示をリセット', exact: true})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(viewport).toBeFocused();
  expect((await geometry(viewer)).scroll.width).toBeGreaterThan((await geometry(viewer)).scroll.clientWidth);
  await viewport.press('ArrowRight');
  await expect.poll(async () => (await geometry(viewer)).scroll.left).toBeGreaterThan(0);
  expect((await inspect(page, id)).events.filter((event: {name: string}) => event.name === 'indexChange')).toEqual([]);
  await viewer.getByRole('button', {name: '表示をリセット', exact: true}).click();
  await expect(range).toHaveValue('100');
  // Publish the reset state before setting a different external zoom input again.
  await update(page, id, {zoom: 1});

  // Retry is a native public action. Hold its second response while a newer public src wins.
  const brokenUrl = '/reassessment-viewer-broken-' + context.name + '.png';
  let attempts = 0, retryRoute!: Route, retryRequested!: () => void;
  const retried = new Promise<void>(resolve => retryRequested = resolve);
  await page.route('**' + brokenUrl, async route => {
    attempts++;
    if (attempts === 1) await route.fulfill({status: 200, contentType: 'image/png', body: 'invalid bitmap bytes'});
    else {retryRoute = route; retryRequested();}
  });
  await update(page, id, {images: [{id: 'failed', src: brokenUrl, alt: '再取得する画像'}]});
  const retry = viewer.getByRole('button', {name: '画像を再取得', exact: true});
  await expect(retry).toBeVisible(); await retry.focus(); await retry.press('Enter'); await retried;
  await expect(viewer.locator('.ui-image-canvas figure')).toBeFocused();
  await update(page, id, {images: [{id: 'latest', src: source, alt: '復旧した赤青画像'}], zoom: .5, rotation: 0});
  await decoded(image); await retryRoute.fulfill({status: 200, contentType: 'image/png', body: 'late invalid bytes'});
  await settle(page); await expect(retry).toHaveCount(0); await decoded(image);
  await rotationOracle(page, viewer, 0, .5); expect(attempts).toBe(2);

  // A real held portrait response cannot overwrite the newer landscape dimensions.
  const pendingUrl = '/reassessment-viewer-pending-' + context.name + '.png';
  let pendingRoute!: Route, pendingRequested!: () => void;
  const requested = new Promise<void>(resolve => pendingRequested = resolve);
  await page.route('**' + pendingUrl, route => {pendingRoute = route; pendingRequested();});
  await update(page, id, {images: [{id: 'pending', src: pendingUrl, alt: '応答待ちの縦画像'}]}); await requested;
  await update(page, id, {images: [{id: 'current', src: source, alt: '現在の横画像'}]}); await decoded(image);
  const beforeLate = await inspect(page, id);
  await pendingRoute.fulfill({status: 200, contentType: 'image/png', body: Buffer.from(portrait.split(',')[1], 'base64')});
  await settle(page); await decoded(image); await expect(image).toHaveAttribute('src', source);
  await rotationOracle(page, viewer, 0, .5);
  expect((await inspect(page, id)).events).toEqual(beforeLate.events);
  await destroy(page, id);

  const destroyedUrl = '/reassessment-viewer-destroyed-' + context.name + '.png';
  let destroyedRoute!: Route, destroyedRequested!: () => void;
  const requestedBeforeDestroy = new Promise<void>(resolve => destroyedRequested = resolve);
  await page.route('**' + destroyedUrl, route => {destroyedRoute = route; destroyedRequested();});
  const pendingId = await create(page, 'ImageViewer', {open: true, images: [{id: 'destroy', src: destroyedUrl, alt: '破棄する取得待ち画像'}]});
  await requestedBeforeDestroy; await destroy(page, pendingId);
  const destroyedState = await inspect(page, pendingId);
  await destroyedRoute.fulfill({status: 200, contentType: 'image/png', body: Buffer.from(source.split(',')[1], 'base64')});
  await settle(page); await expect(host(page, pendingId)).toHaveCount(0);
  const afterDestroyed = await inspect(page, pendingId);
  expect(afterDestroyed.errors).toEqual([]); expect(afterDestroyed.events).toEqual(destroyedState.events);
  await record('viewer-retry-and-owned-loads', {attempts, beforeLate, destroyedState, afterDestroyed});
});
