import type {Browser, BrowserContext, Page} from '@playwright/test';
import {setImmediate} from 'node:timers/promises';
import {inspect} from 'node:util';

export type LifecyclePhase = 'test-active' | 'diagnostic' | 'cleanup';
export type LifecycleEventName = 'page.close' | 'page.crash' | 'context.close' | 'browser.disconnected';
export type LifecycleErrorKind = 'primary' | 'cleanup' | 'diagnostic';

interface Stamp {
  sequence: number;
  wallTime: string;
  monotonicTime: number;
  phase: LifecyclePhase;
}

export interface LifecycleEvent extends Stamp {
  event: LifecycleEventName;
}

export interface LifecycleError extends Stamp {
  kind: LifecycleErrorKind;
  raw: string;
  name?: string;
  message?: string;
  stack?: string;
}

export interface LifecycleSnapshot {
  capturedAt: {wallTime: string; monotonicTime: number};
  phase: LifecyclePhase;
  classification: 'open' | 'page-closed' | 'page-crashed' | 'context-closed' | 'browser-disconnected';
  pageClosed: boolean;
  browserConnected: boolean;
  observed: {pageClosed: boolean; pageCrashed: boolean; contextClosed: boolean; browserDisconnected: boolean};
  events: LifecycleEvent[];
  errors: LifecycleError[];
}

type Attach = (name: string, options: {body: string; contentType: string}) => Promise<void>;

export interface PageLifecycle {
  setPhase(phase: LifecyclePhase): void;
  recordError(kind: LifecycleErrorKind, error: unknown): void;
  snapshot(): Promise<LifecycleSnapshot>;
  flush(attach: Attach, name?: string): Promise<LifecycleSnapshot>;
  dispose(): void;
}

/** Observe public lifecycle events only. The journal identifies the lost scope,
 * not its cause. Once disposed, subsequent fixture teardown is outside its scope. */
export function attachPageLifecycle(page: Page, context: BrowserContext, browser: Browser): PageLifecycle {
  let phase: LifecyclePhase = 'test-active';
  let sequence = 0;
  let disposed = false;
  let flushed: Promise<LifecycleSnapshot> | undefined;
  const events: LifecycleEvent[] = [];
  const errors: LifecycleError[] = [];
  const stamp = (): Stamp => ({sequence: ++sequence, wallTime: new Date().toISOString(), monotonicTime: performance.now(), phase});
  const observe = (event: LifecycleEventName) => () => events.push({...stamp(), event});
  const pageClose = observe('page.close');
  const pageCrash = observe('page.crash');
  const contextClose = observe('context.close');
  const browserDisconnect = observe('browser.disconnected');
  page.on('close', pageClose);
  page.on('crash', pageCrash);
  context.on('close', contextClose);
  browser.on('disconnected', browserDisconnect);

  const snapshot = async (): Promise<LifecycleSnapshot> => {
    // A page close can precede the context/browser callback in the same protocol
    // delivery. Yield local event-loop turns, without sending browser work or RAF.
    // This is an observation boundary, not a guarantee that future events arrived.
    await setImmediate();
    await setImmediate();
    const observed = {
      pageClosed: events.some(entry => entry.event === 'page.close'),
      pageCrashed: events.some(entry => entry.event === 'page.crash'),
      contextClosed: events.some(entry => entry.event === 'context.close'),
      browserDisconnected: events.some(entry => entry.event === 'browser.disconnected'),
    };
    const pageClosed = page.isClosed();
    const browserConnected = browser.isConnected();
    const classification = observed.browserDisconnected || !browserConnected ? 'browser-disconnected'
      : observed.contextClosed ? 'context-closed'
        : observed.pageCrashed ? 'page-crashed'
          : observed.pageClosed || pageClosed ? 'page-closed' : 'open';
    return {
      capturedAt: {wallTime: new Date().toISOString(), monotonicTime: performance.now()},
      phase, classification, pageClosed, browserConnected, observed,
      events: events.map(entry => ({...entry})), errors: errors.map(entry => ({...entry})),
    };
  };

  return {
    setPhase(value) {phase = value;},
    recordError(kind, error) {
      errors.push({...stamp(), kind, raw: inspect(error, {depth: 4, customInspect: false, getters: false}),
        ...(error instanceof Error ? {name: error.name, message: error.message, stack: error.stack} : {})});
    },
    snapshot,
    flush(attach, name = 'browser-lifecycle') {
      flushed ??= snapshot().then(async state => {
        await attach(name, {body: JSON.stringify(state, null, 2), contentType: 'application/json'});
        return state;
      });
      return flushed;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      page.off('close', pageClose);
      page.off('crash', pageCrash);
      context.off('close', contextClose);
      browser.off('disconnected', browserDisconnect);
    },
  };
}

/** Preserve the original thrown value, including non-Error values, when cleanup
 * also fails. Both failures remain separately available in the lifecycle journal. */
export async function runWithLifecycleCleanup<T>(lifecycle: PageLifecycle, action: () => Promise<T>, cleanup: () => Promise<void>): Promise<T> {
  lifecycle.setPhase('test-active');
  let actionFailed = false;
  let actionError: unknown;
  let cleanupFailed = false;
  let cleanupError: unknown;
  let result!: T;
  try {
    result = await action();
  } catch (error) {
    actionFailed = true;
    actionError = error;
    lifecycle.recordError('primary', error);
  }
  lifecycle.setPhase('cleanup');
  try {
    await cleanup();
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
    lifecycle.recordError('cleanup', error);
  }
  if (actionFailed) throw actionError;
  if (cleanupFailed) throw cleanupError;
  return result;
}
