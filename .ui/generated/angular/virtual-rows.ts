import {
  DestroyRef, Directive, inject, input, TemplateRef, ViewContainerRef,
  type EmbeddedViewRef, type SimpleChanges, type TrackByFunction,
} from '@angular/core';
import type {ListRange} from '@angular/cdk/collections';
import {CdkVirtualScrollViewport, type CdkVirtualScrollRepeater} from '@angular/cdk/scrolling';
import {ReplaySubject} from 'rxjs';
import type {CollectionKey} from './collection-model';
import {VirtualScroll, type FocusedVirtualRow} from './virtual-scroll';

interface RowContext<T> {
  $implicit: T;
  index: number;
  count: number;
  gap: number;
  first: boolean;
  last: boolean;
  even: boolean;
  odd: boolean;
}

interface TrackedRow<T> {
  key: unknown;
  context: RowContext<T>;
}

function rowsInWindow<T>(
  items: readonly T[], indices: readonly number[], itemSize: number, trackBy: TrackByFunction<T>,
): TrackedRow<T>[] {
  const rows: TrackedRow<T>[] = [];
  let previous: number | undefined;
  for (const index of indices) {
    if (index >= items.length) continue;
    const item = items[index]!;
    const even = index % 2 === 0;
    rows.push({
      key: trackBy(index, item),
      context: {
        $implicit: item, index, count: items.length,
        gap: previous === undefined ? 0 : (index - previous - 1) * itemSize,
        first: index === 0, last: index === items.length - 1, even, odd: !even,
      },
    });
    previous = index;
  }
  return rows;
}

/** Public CDK repeater with a bounded window that can retain a focused row. */
@Directive({selector: '[uiVirtualRows][uiVirtualRowsOf]', standalone: true})
export class VirtualRows<T> implements CdkVirtualScrollRepeater<T> {
  readonly uiVirtualRowsOf = input.required<readonly T[]>();
  readonly uiVirtualRowsTrackBy = input<TrackByFunction<T>>((_index, item) => item);
  private readonly dataChanges = new ReplaySubject<readonly T[]>(1);
  readonly dataStream = this.dataChanges.asObservable();

  private readonly viewport = inject(CdkVirtualScrollViewport);
  private readonly scroll = inject(VirtualScroll);
  private readonly template = inject<TemplateRef<RowContext<T>>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private readonly views = new Map<unknown, EmbeddedViewRef<RowContext<T>>>();

  constructor() {
    this.viewport.attach(this);
    inject(DestroyRef).onDestroy(() => {
      this.viewport.detach();
      this.dataChanges.complete();
      this.views.clear();
    });
  }

  ngOnChanges(changes: SimpleChanges<VirtualRows<T>>): void {
    // Stage CDK's new data length before resolving the new geometry and focused key together.
    this.scroll.dataChanged();
    if (changes.uiVirtualRowsOf) this.dataChanges.next(this.uiVirtualRowsOf());
  }

  // Native Tab can request several synchronous checks. Also inspect the current
  // contents when the caller reuses an array and updates a row in place.
  ngDoCheck(): void {
    const items = this.uiVirtualRowsOf();
    const trackBy = this.uiVirtualRowsTrackBy();
    if (this.scroll.radioGroups().length) {
      this.scroll.setRowKeys(items.map((item, index) => trackBy(index, item) as CollectionKey));
    }
    this.scroll.reconcilePosition(this.focusedRow(items, trackBy));
    this.renderRows(rowsInWindow(items, this.scroll.indices(), this.scroll.itemSize(), trackBy));
  }

  private focusedRow(items: readonly T[], trackBy: TrackByFunction<T>): FocusedVirtualRow | null {
    const viewport = this.viewport.elementRef.nativeElement;
    const active = viewport.ownerDocument.activeElement;
    if (!active || active === viewport || !viewport.contains(active)) return null;
    for (const [key, view] of this.views) {
      if (!view.rootNodes.some((root: Node) => root.contains(active))) continue;
      const previous = view.context.index;
      const next = previous < items.length && trackBy(previous, items[previous]!) === key
        ? previous
        : items.findIndex((item, index) => trackBy(index, item) === key);
      return next < 0 ? null : {previous, next, active};
    }
    return null;
  }

  private renderRows(rows: readonly TrackedRow<T>[]): void {
    const keys = new Set(rows.map(row => row.key));
    for (const [key, view] of this.views) {
      if (!keys.has(key)) {
        this.container.remove(this.container.indexOf(view));
        this.views.delete(key);
      }
    }
    rows.forEach(({key, context}, position) => {
      const view = this.views.get(key);
      if (view) {
        Object.assign(view.context, context);
        this.placeView(view, position);
      } else {
        this.views.set(key, this.container.createEmbeddedView(this.template, context, position));
      }
    });
  }

  private placeView(view: EmbeddedViewRef<RowContext<T>>, position: number): void {
    const current = this.container.indexOf(view);
    if (current === position) return;
    const active = this.viewport.elementRef.nativeElement.ownerDocument.activeElement;
    if (active && view.rootNodes.some((root: Node) => root.contains(active))) {
      // The earlier positions are already in order. Move each intervening sibling
      // behind the focused view so its DOM stays connected throughout the reorder.
      for (let index = position; index < current; index++) {
        this.container.move(this.container.get(position)!, current);
      }
    } else {
      this.container.move(view, position);
    }
  }

  measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number {
    if (range.start >= range.end) return 0;
    const rows = new Map<number, HTMLElement>();
    for (const view of this.views.values()) {
      const root = view.rootNodes.find((node: unknown): node is HTMLElement => node instanceof HTMLElement);
      const row = root?.querySelector<HTMLElement>('[data-ui-virtual-index]');
      if (row) rows.set(view.context.index, row);
    }
    for (let index = range.start; index < range.end; index++) {
      if (!rows.has(index)) throw new Error('Cannot measure a virtual row that is not rendered.');
    }
    const first = rows.get(range.start)!.getBoundingClientRect();
    const last = rows.get(range.end - 1)!.getBoundingClientRect();
    return orientation === 'vertical' ? last.bottom - first.top : last.right - first.left;
  }

  static ngTemplateContextGuard<T>(_directive: VirtualRows<T>, _context: unknown): _context is RowContext<T> {
    return true;
  }
}
