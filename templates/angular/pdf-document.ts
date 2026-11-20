import {afterNextRender, computed, DestroyRef, effect, inject, resource, signal} from '@angular/core';
import {PdfSession, type PdfAssetOptions, type PdfSource} from './pdf-adapter';

/** PDF.js sessions outlive a completed read. Release each worker when its document is retired. */
export function createPdfDocumentResource(
  host: HTMLElement,
  selection: () => (PdfAssetOptions & {source: PdfSource}) | undefined,
) {
  const browserReady = signal(false);
  afterNextRender(() => browserReady.set(true));
  const request = computed(() => browserReady() ? selection() : undefined);

  let ownedSession: PdfSession | undefined;
  const release = () => {
    const previous = ownedSession;
    ownedSession = undefined;
    void previous?.dispose();
  };
  const lifetime = inject(DestroyRef);
  const document = resource({
    params: request,
    loader: async ({params, abortSignal}) => {
      release();
      const session = await PdfSession.load(params.source, host.ownerDocument, params, abortSignal);
      if (abortSignal.aborted || lifetime.destroyed || request() !== params) {
        await session.dispose();
        throw new DOMException('PDF request is no longer active', 'AbortError');
      }
      ownedSession = session;
      return session;
    },
  });
  // An empty selection leaves the resource idle, so its loader will not run to release the old session.
  effect(() => { if (!request()) release(); });
  lifetime.onDestroy(release);
  return document;
}
