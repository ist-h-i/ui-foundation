import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injectable } from '@angular/core';
export type OverlayCloseReason = 'escape' | 'outside' | 'scope-exit';
export type OverlayPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'left-start';
export interface OverlayEntry {
    element: HTMLElement;
    anchor?: HTMLElement;
    kind: 'popup' | 'native-dialog';
    outside?: boolean;
    dismiss: (reason: OverlayCloseReason) => void;
}
const handledPointerEvents = new WeakSet<PointerEvent>();
const stacks = new WeakMap<Document, Array<{
    owner: OverlayRegistry;
    entry: OverlayEntry;
}>>();
/** UA modal inertness does not add an inert attribute to the background. */
export function availableOverlayAnchor(anchor: HTMLElement): boolean {
    if (!anchor.isConnected || anchor.closest('[hidden],[inert]') || !anchor.getClientRects().length)
        return false;
    if (anchor.ownerDocument.defaultView?.getComputedStyle(anchor).visibility !== 'visible')
        return false;
    const document = anchor.ownerDocument;
    const modal = document.activeElement?.closest<HTMLDialogElement>('dialog:modal')
        ?? Array.from(document.querySelectorAll<HTMLDialogElement>('dialog:modal')).at(-1);
    return !modal || modal.contains(anchor);
}
/** Scope a coordinator with OverlayHost, or use the application root default. */
@Injectable({ providedIn: 'root' })
export class OverlayRegistry {
    private readonly document = inject(DOCUMENT);
    private readonly entries = stacks.get(this.document) ?? [];
    constructor() {
        stacks.set(this.document, this.entries);
        this.document.addEventListener('keydown', this.keydown, true);
        this.document.addEventListener('pointerdown', this.pointerdown, true);
        this.document.addEventListener('close', this.closed, true);
        const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.prune());
        if (this.document.body)
            observer?.observe(this.document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden', 'inert', 'class', 'style'] });
        inject(DestroyRef).onDestroy(() => { this.document.removeEventListener('keydown', this.keydown, true); this.document.removeEventListener('pointerdown', this.pointerdown, true); this.document.removeEventListener('close', this.closed, true); observer?.disconnect(); for (let index = this.entries.length - 1; index >= 0; index--)
            if (this.entries[index]!.owner === this)
                this.entries.splice(index, 1); });
    }
    register(entry: OverlayEntry): () => void { const record = { owner: this, entry }; this.entries.push(record); let removed = false; return () => { if (removed)
        return; removed = true; const index = this.entries.indexOf(record); if (index >= 0)
        this.entries.splice(index, 1); }; }
    private prune(): void { for (const record of [...this.entries].reverse()) {
        const entry = record.entry;
        if (record.owner === this && entry.kind === 'popup' && (!entry.element.isConnected || entry.anchor && !availableOverlayAnchor(entry.anchor)))
            entry.dismiss('scope-exit');
    } }
    private readonly closed = (event: Event): void => { const target = event.target as HTMLElement | null; if (!target || target.tagName !== 'DIALOG' || (target as HTMLDialogElement).open)
        return; for (const record of [...this.entries].reverse())
        if (record.owner === this && record.entry.kind === 'popup' && (target.contains(record.entry.element) || !!record.entry.anchor && target.contains(record.entry.anchor)))
            record.entry.dismiss('scope-exit'); };
    private readonly keydown = (event: KeyboardEvent): void => {
        const record = this.entries.at(-1), top = record?.entry;
        if (record?.owner !== this || event.defaultPrevented || event.key !== 'Escape' || !top || top.kind === 'native-dialog')
            return;
        event.preventDefault();
        event.stopPropagation();
        top.dismiss('escape');
    };
    private readonly pointerdown = (event: PointerEvent): void => {
        const record = this.entries.at(-1), top = record?.entry, target = event.target as Node | null;
        if (record?.owner !== this || handledPointerEvents.has(event))
            return;
        handledPointerEvents.add(event);
        if (top?.kind === 'popup' && top.outside && target && !top.element.contains(target) && !top.anchor?.contains(target))
            top.dismiss('outside');
    };
}
@Component({ selector: 'ui-overlay-host', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, providers: [OverlayRegistry], template: '<ng-content />', styles: ':host{display:contents;}:host([hidden]){display:none;}' })
export class OverlayHost {
}
/** Native popover keeps its DOM ancestry while entering the browser top layer. */
export function positionOverlay(element: HTMLElement, anchor: HTMLElement, placement: OverlayPlacement, point: {
    x: number;
    y: number;
} | null = null): void {
    const view = element.ownerDocument.defaultView;
    if (!view)
        return;
    const viewport = view.visualViewport;
    const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0, width = viewport?.width ?? view.innerWidth, height = viewport?.height ?? view.innerHeight;
    const box = anchor.getBoundingClientRect(), popup = element.getBoundingClientRect();
    const padding = parseFloat(view.getComputedStyle(element).paddingTop) || 0;
    const rtl = view.getComputedStyle(anchor).direction === 'rtl';
    let x = point?.x ?? box.left, y = point?.y ?? box.bottom;
    if (!point) {
        if (placement === 'right-start' || placement === 'left-start') {
            const right = (placement === 'right-start') !== rtl;
            x = right ? box.right : box.left - popup.width;
            y = box.top;
            if (right && x + popup.width > left + width - padding)
                x = box.left - popup.width;
            else if (!right && x < left + padding)
                x = box.right;
        }
        else {
            const end = placement.endsWith('end') !== rtl;
            x = end ? box.right - popup.width : box.left;
            y = placement.startsWith('top') ? box.top - popup.height : box.bottom;
            if (y + popup.height > top + height - padding && box.top - popup.height >= top + padding)
                y = box.top - popup.height;
            else if (y < top + padding && box.bottom + popup.height <= top + height - padding)
                y = box.bottom;
        }
    }
    element.style.left = Math.max(left + padding, Math.min(x, left + width - popup.width - padding)) + 'px';
    element.style.top = Math.max(top + padding, Math.min(y, top + height - popup.height - padding)) + 'px';
}
export function observeOverlay(element: HTMLElement, anchor: HTMLElement, update: () => void): () => void {
    const view = element.ownerDocument.defaultView;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    observer?.observe(anchor);
    view?.addEventListener('resize', update);
    view?.addEventListener('scroll', update, true);
    view?.visualViewport?.addEventListener('resize', update);
    view?.visualViewport?.addEventListener('scroll', update);
    update();
    return () => { observer?.disconnect(); view?.removeEventListener('resize', update); view?.removeEventListener('scroll', update, true); view?.visualViewport?.removeEventListener('resize', update); view?.visualViewport?.removeEventListener('scroll', update); };
}
