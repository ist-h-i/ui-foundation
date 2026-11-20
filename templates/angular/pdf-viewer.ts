import {
  afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef,
  effect, ElementRef, inject, input, linkedSignal, output, untracked, viewChild,
} from '@angular/core';
import {ActionControl} from './action-control';
import {injectUiMessageText, UiStableMessagePipe} from './locale';
import {mediaStyles} from './media-style';
import type {PdfSession, PdfSource} from './pdf-adapter';
import {createPdfDocumentResource} from './pdf-document';
import type {UiMessageArguments} from './stable-messages';

interface PdfRenderRequest {
  session: PdfSession;
  page: number;
  zoom: number;
  canvas: HTMLCanvasElement;
}

interface PdfViewerState {
  /** A rendered page can have an empty text layer. */
  text: string | null;
  status: UiMessageArguments | null;
  error: UiMessageArguments | null;
  downloading: boolean;
}

@Component({selector:'ui-pdf-viewer,ui-file-preview',standalone:true,imports:[ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<p>{{label()}}</p><div class="ui-media-actions"><button uiAction [disabled]="!session()||pageValue()<=1||disabled()" (click)="move(-1)">{{'uiFoundation.pDFViewer.previousPage' | uiStableMessage}}</button><label>{{'uiFoundation.pDFViewer.page' | uiStableMessage}}<input type="number" min="1" [max]="pages()" [value]="pageValue()" [disabled]="!session()||disabled()" (change)="setPage($event)"></label><button uiAction [disabled]="!session()||pageValue()>=pages()||disabled()" (click)="move(1)">{{'uiFoundation.pDFViewer.nextPage' | uiStableMessage}}</button><label>{{'uiFoundation.pDFViewer.zoom' | uiStableMessage}}<span class="ui-select-control"><select class="ui-field-control" [value]="zoomValue()" [disabled]="disabled()" (change)="setZoom($event)"><option value="0.5">50%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label>@if(downloadable()){<button uiAction [busy]="view().downloading" [disabled]="!session()||disabled()" (click)="download()">{{'uiFoundation.pDFViewer.downloadPDF' | uiStableMessage}}</button>}</div><p role="status" aria-atomic="true">{{status()}} · {{pages()?pageValue():0}} / {{pages()}}</p>@if(error()){<p class="ui-media-error">{{error()}}</p><button uiAction [disabled]="disabled()" (click)="retry()">{{'uiFoundation.pDFViewer.reloadPDF' | uiStableMessage}}</button>}<div class="ui-pdf-viewport" role="region" tabindex="0" [attr.aria-label]="('uiFoundation.pDFViewer.pageViewForLabel' | uiStableMessage:{label:label()})"><canvas #canvas role="img" [attr.aria-label]="'uiFoundation.pdfViewer.pagePreviewLabel' | uiStableMessage:{label:label(),page:pageValue()}" [hidden]="view().text === null"></canvas></div>@if(view().text !== null){<details><summary>{{'uiFoundation.pDFViewer.pageText' | uiStableMessage}}</summary><p class="ui-pdf-text">{{view().text||('uiFoundation.pDFViewer.theTextOnThisPageIsUnavailableDownloadTheOriginalPDFToReviewIt' | uiStableMessage)}}</p></details>}`,
 styles:mediaStyles+`.ui-pdf-viewport{max-block-size:var(--ui-size-media-viewport);overflow:auto;}.ui-pdf-viewport canvas{max-inline-size:none;}.ui-pdf-text{white-space:pre-wrap;}.ui-media-actions label{flex:1 1 var(--ui-size-grid-item);}summary{cursor:pointer;min-block-size:var(--ui-size-control);}`})
export class PDFViewer {
  readonly label = input.required<string>();
  readonly source = input<PdfSource | null>(null);
  readonly workerUrl = input('pdf.worker.mjs');
  readonly assetsBaseUrl = input<string | null>(null);
  readonly page = input(1);
  readonly pageChange = output<number>();
  readonly zoom = input(1);
  readonly zoomChange = output<number>();
  readonly downloadable = input(true, {transform: booleanAttribute});
  readonly filename = input('document.pdf');
  readonly disabled = input(false, {transform: booleanAttribute});
  readonly loaded = output<number>();
  readonly loadFailed = output<'load' | 'render' | 'download'>();

  private readonly message = injectUiMessageText();
  private readonly lifetime = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly document = createPdfDocumentResource(this.element, () => {
    const source = this.source();
    return source ? {source, workerUrl: this.workerUrl(), assetsBaseUrl: this.assetsBaseUrl()} : undefined;
  });

  // A reload retains the resource's previous value. Only a resolved session can render or download.
  protected readonly session = computed(() => this.document.status() === 'resolved' ? this.document.value() : undefined);
  protected readonly pages = computed(() => this.session()?.pages ?? 0);
  private readonly requestedPage = linkedSignal(() => {
    const page = this.page();
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('PDF page must be a positive integer.');
    return page;
  });
  protected readonly pageValue = computed(() => Math.min(this.requestedPage(), Math.max(1, this.pages())));
  protected readonly zoomValue = linkedSignal(() => {
    const zoom = this.zoom();
    if (!Number.isFinite(zoom) || zoom < 0.25 || zoom > 4) throw new Error('PDF zoom must be .25–4.');
    return zoom;
  });

  protected readonly view = linkedSignal({
    source: this.session,
    computation: (): PdfViewerState => ({
      text: null, status: ['uiFoundation.pDFViewer.pDFLoaded'], error: null, downloading: false,
    }),
  });
  protected readonly status = computed(() => {
    if (this.document.status() === 'idle') return this.message('uiFoundation.pDFViewer.selectAPDF');
    if (this.document.isLoading()) return this.message('uiFoundation.pDFViewer.loadingPDF');
    const status = this.view().status;
    return this.session() && status ? this.message(...status) : '';
  });
  protected readonly error = computed(() => {
    if (this.document.status() === 'error') {
      return this.message('uiFoundation.pDFViewer.unableToLoadThePDFCheckTheSourceAndHowTheWorkerAndSupportingFilesAreServedThenTryAga');
    }
    const error = this.view().error;
    return this.session() && error ? this.message(...error) : '';
  });
  private readonly renderRequest = computed((): PdfRenderRequest | undefined => {
    const session = this.session(), canvas = this.canvas()?.nativeElement;
    return session && canvas ? {session, canvas, page: this.pageValue(), zoom: this.zoomValue()} : undefined;
  });

  constructor() {
    effect(() => {
      const snapshot = this.document.snapshot();
      if (snapshot.status === 'error') untracked(() => this.loadFailed.emit('load'));
      else if (snapshot.status === 'resolved' && snapshot.value) {
        const pages = snapshot.value.pages;
        untracked(() => this.loaded.emit(pages));
      }
    });
    afterRenderEffect(onCleanup => {
      const request = this.renderRequest();
      if (!request) return;
      onCleanup(() => request.session.cancelRender());
      untracked(() => { void this.render(request); });
    });
  }

  private async render(request: PdfRenderRequest): Promise<void> {
    const current = () => !this.lifetime.destroyed && this.renderRequest() === request;
    this.view.update(view => ({...view, text: null, status: ['uiFoundation.pDFViewer.renderingPage'], error: null}));
    try {
      const {text} = await request.session.render(request.page, request.zoom, request.canvas);
      if (current()) this.view.update(view => ({...view, text, status: ['uiFoundation.pDFViewer.pageDisplayed']}));
    } catch {
      if (current()) {
        this.view.update(view => ({...view, status: null, error: ['uiFoundation.pDFViewer.unableToDisplayThisPageTryAnotherPageOrZoomLevel']}));
        this.loadFailed.emit('render');
      }
    }
  }

  protected move(offset: number): void {
    if (this.disabled() || !this.session()) return;
    const page = Math.max(1, Math.min(this.pages(), this.pageValue() + offset));
    this.requestedPage.set(page);
    this.pageChange.emit(page);
  }

  protected setPage(event: Event): void {
    if (this.disabled() || !this.session()) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isSafeInteger(value) || value < 1 || value > this.pages()) {
      this.view.update(view => ({...view, error: ['uiFoundation.pdfViewer.pageInputRange', {pages: this.pages()}]}));
      return;
    }
    this.requestedPage.set(value);
    this.pageChange.emit(value);
  }

  protected setZoom(event: Event): void {
    if (this.disabled()) return;
    const zoom = Number((event.target as HTMLSelectElement).value);
    this.zoomValue.set(zoom);
    this.zoomChange.emit(zoom);
  }

  protected retry(): void {
    if (!this.disabled()) this.document.reload();
  }

  async download(): Promise<void> {
    const session = this.session();
    if (!session || this.disabled() || this.view().downloading) return;
    const current = () => !this.lifetime.destroyed && this.session() === session;
    this.view.update(view => ({...view, downloading: true}));
    let url: string | undefined;
    try {
      const blob = await session.blob();
      if (!current()) return;
      url = URL.createObjectURL(blob);
      const anchor = this.element.ownerDocument.createElement('a');
      anchor.href = url;
      anchor.download = this.filename();
      anchor.click();
      this.view.update(view => ({...view, status: ['uiFoundation.pDFViewer.thePDFDownloadHasStarted']}));
    } catch {
      if (current()) {
        this.view.update(view => ({...view, error: ['uiFoundation.pDFViewer.unableToDownloadThePDFTryAgain']}));
        this.loadFailed.emit('download');
      }
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (current()) this.view.update(view => ({...view, downloading: false}));
    }
  }
}
