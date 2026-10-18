import {test, expect} from '@playwright/test';
import {attachPageLifecycle, runWithLifecycleCleanup, type LifecycleSnapshot} from './runtime-lifecycle';

test('runtime lifecycle: an owned page close is distinct from context closure and fixture teardown', async ({page, browser}, testInfo) => {
  const context = await browser.newContext();
  const ownedPage = await context.newPage();
  const lifecycle = attachPageLifecycle(ownedPage, context, browser);
  try {
    expect((await lifecycle.snapshot()).classification).toBe('open');
    await ownedPage.close();
    const closed = await lifecycle.snapshot();
    expect(closed.classification).toBe('page-closed');
    expect(closed.observed).toEqual({pageClosed: true, pageCrashed: false, contextClosed: false, browserDisconnected: false});
    expect(closed.events.map(entry => [entry.event, entry.phase])).toEqual([['page.close', 'test-active']]);
    expect(closed.pageClosed).toBe(true);
    expect(closed.browserConnected).toBe(true);
    expect(context.pages()).toHaveLength(0);
    expect(page.isClosed()).toBe(false);
    lifecycle.setPhase('cleanup');
    await context.close();
    const complete = await lifecycle.flush(testInfo.attach.bind(testInfo));
    expect(complete.classification).toBe('context-closed');
    expect(complete.events.map(entry => [entry.event, entry.phase])).toEqual([['page.close', 'test-active'], ['context.close', 'cleanup']]);
    expect(complete.observed.pageCrashed).toBe(false);
    for (const [index, entry] of complete.events.entries()) {
      expect(entry.sequence).toBe(index + 1);
      expect(Number.isNaN(Date.parse(entry.wallTime))).toBe(false);
      expect(entry.monotonicTime).toBeGreaterThanOrEqual(closed.events[0]!.monotonicTime);
    }
  } finally {
    lifecycle.dispose();
    await context.close();
  }
});

test('runtime lifecycle: owned context closure is recorded during diagnostics without a false crash', async ({page, browser}, testInfo) => {
  const context = await browser.newContext();
  const ownedPage = await context.newPage();
  const lifecycle = attachPageLifecycle(ownedPage, context, browser);
  try {
    lifecycle.setPhase('diagnostic');
    await context.close();
    const closed = await lifecycle.flush(testInfo.attach.bind(testInfo));
    expect(closed.classification).toBe('context-closed');
    expect(closed.observed).toEqual({pageClosed: true, pageCrashed: false, contextClosed: true, browserDisconnected: false});
    expect(closed.events.map(entry => entry.event).sort()).toEqual(['context.close', 'page.close']);
    expect(closed.events.every(entry => entry.phase === 'diagnostic')).toBe(true);
    expect(closed.browserConnected).toBe(true);
    expect(page.isClosed()).toBe(false);
  } finally {
    lifecycle.dispose();
    await context.close();
  }
});

test('runtime lifecycle: public closure of an owned child browser records disconnection', async ({page, browser, playwright, browserName}, testInfo) => {
  const ownedBrowser = await playwright[browserName].launch({channel:browserName==='chromium'?'chromium':undefined});
  const context = await ownedBrowser.newContext();
  const ownedPage = await context.newPage();
  const lifecycle = attachPageLifecycle(ownedPage, context, ownedBrowser);
  try {
    await ownedBrowser.close();
    const closed = await lifecycle.flush(testInfo.attach.bind(testInfo));
    expect(closed.classification).toBe('browser-disconnected');
    expect(closed.observed).toEqual({pageClosed: true, pageCrashed: false, contextClosed: true, browserDisconnected: true});
    expect(closed.events.map(entry => entry.event).sort()).toEqual(['browser.disconnected', 'context.close', 'page.close']);
    expect(closed.events.every(entry => entry.phase === 'test-active')).toBe(true);
    expect(closed.browserConnected).toBe(false);
    expect(browser.isConnected()).toBe(true);
    expect(page.isClosed()).toBe(false);
  } finally {
    lifecycle.dispose();
    await ownedBrowser.close();
  }
});

test('runtime lifecycle: a cleanup failure cannot replace the primary failure and the journal flushes once', async ({page, context, browser}, testInfo) => {
  const lifecycle = attachPageLifecycle(page, context, browser);
  const primary = new Error('original wheel predicate failure');
  const cleanup = new Error('later probe cleanup failure');
  try {
    await expect(runWithLifecycleCleanup(lifecycle, async () => {throw primary;}, async () => {throw cleanup;})).rejects.toBe(primary);
    const snapshot = await lifecycle.snapshot();
    expect(snapshot.classification).toBe('open');
    expect(snapshot.errors.map(entry => [entry.kind, entry.phase, entry.message])).toEqual([
      ['primary', 'test-active', primary.message], ['cleanup', 'cleanup', cleanup.message],
    ]);
    expect(snapshot.errors[0]!.raw).toContain(primary.message);
    expect(snapshot.errors[1]!.raw).toContain(cleanup.message);
    expect(snapshot.errors[0]!.stack).toBe(primary.stack);
    expect(snapshot.errors[1]!.stack).toBe(cleanup.stack);
    const attachments: LifecycleSnapshot[] = [];
    const attach = async (name: string, options: {body: string; contentType: string}) => {
      attachments.push(JSON.parse(options.body) as LifecycleSnapshot);
      await testInfo.attach(name, options);
    };
    const [first, second] = await Promise.all([lifecycle.flush(attach), lifecycle.flush(attach)]);
    expect(first).toBe(second);
    expect(attachments).toHaveLength(1);
    expect(attachments[0]!.errors).toHaveLength(2);
  } finally {
    lifecycle.dispose();
  }
});

test('runtime lifecycle: an owned Chromium renderer crash is distinct from page closure and preserves both errors', async ({page, browser, browserName}, testInfo) => {
  test.skip(browserName !== 'chromium', 'Page.crash is a Chromium CDP diagnostic; other browsers are not covered.');
  const context = await browser.newContext();
  const ownedPage = await context.newPage();
  const session = await context.newCDPSession(ownedPage);
  const lifecycle = attachPageLifecycle(ownedPage, context, browser);
  const cleanupError = new Error('controlled cleanup failure after renderer crash');
  let primaryError: unknown;
  let thrownError: unknown;
  let commandResult: {status: 'resolved'} | {status: 'rejected'; message: string} | undefined;
  let command: Promise<void> | undefined;
  const settleCommand = async () => {
    if (!command) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([command, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Page.crash command did not settle after owned context closure')), 5000);
      })]);
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    try {
      await runWithLifecycleCleanup(lifecycle, async () => {
        const crashed = ownedPage.waitForEvent('crash', {timeout: 10000});
        // Page.crash may reject when the renderer dies, or remain pending until
        // its CDP session closes. Attach its rejection handler immediately; await
        // its bounded settlement after closing the owned context in cleanup.
        command = session.send('Page.crash').then(() => {commandResult = {status: 'resolved'};}, error => {
          commandResult = {status: 'rejected', message: error instanceof Error ? error.message : String(error)};
        });
        await crashed;
        const state = await lifecycle.snapshot();
        await testInfo.attach('owned-renderer-crash-active', {body: JSON.stringify(state, null, 2), contentType: 'application/json'});
        expect(state.classification).toBe('page-crashed');
        expect(state.observed).toEqual({pageClosed: false, pageCrashed: true, contextClosed: false, browserDisconnected: false});
        expect(state.pageClosed).toBe(false);
        expect(state.browserConnected).toBe(true);
        expect(state.events.map(entry => [entry.event, entry.phase])).toEqual([['page.crash', 'test-active']]);
        try {
          await ownedPage.evaluate(() => document.title);
        } catch (error) {
          primaryError = error;
          throw error;
        }
        throw new Error('A crashed renderer unexpectedly accepted page.evaluate');
      }, async () => {
        await context.close();
        await settleCommand();
        throw cleanupError;
      });
    } catch (error) {
      thrownError = error;
    }
    expect(primaryError).toBeInstanceOf(Error);
    expect((primaryError as Error).message).toMatch(/crash/i);
    expect(thrownError).toBe(primaryError);
    const complete = await lifecycle.flush(testInfo.attach.bind(testInfo));
    expect(complete.classification).toBe('context-closed');
    expect(complete.observed).toEqual({pageClosed: true, pageCrashed: true, contextClosed: true, browserDisconnected: false});
    expect(complete.events.filter(entry => entry.event === 'page.crash').map(entry => entry.phase)).toEqual(['test-active']);
    expect(complete.events.filter(entry => entry.event !== 'page.crash').every(entry => entry.phase === 'cleanup')).toBe(true);
    expect(complete.errors.map(entry => [entry.kind, entry.phase, entry.message])).toEqual([
      ['primary', 'test-active', (primaryError as Error).message], ['cleanup', 'cleanup', cleanupError.message],
    ]);
    expect(commandResult).toBeDefined();
    await testInfo.attach('owned-renderer-crash-command', {body: JSON.stringify(commandResult, null, 2), contentType: 'application/json'});
    expect(browser.isConnected()).toBe(true);
    expect(page.isClosed()).toBe(false);
  } finally {
    lifecycle.setPhase('cleanup');
    await context.close();
    await settleCommand();
    lifecycle.dispose();
  }
});
