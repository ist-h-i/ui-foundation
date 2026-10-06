import { DestroyRef, ElementRef, inject } from '@angular/core';
import { canFocus } from './focus';
import { availableOverlayAnchor } from './overlay';
/** Preserve only the disappearing/disabled controls owned by this labelled host. */
export function installTableControlFocus(): void {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement, document = host.ownerDocument;
    let owned: HTMLElement | null = null;
    const focus = (event: FocusEvent) => { const target = event.target; owned = target instanceof HTMLElement && target.matches('[data-table-control]') && target.closest('[data-table-owner]') === host ? target : null; };
    const leave = (event: FocusEvent) => {
        if (event.target !== owned)
            return;
        const next = event.relatedTarget;
        if (next instanceof Node && next !== document.body)
            owned = null;
        else {
            const previous = owned;
            queueMicrotask(() => {
                if (owned === previous && canFocus(previous))
                    owned = null;
            });
        }
    };
    const pointer = (event: PointerEvent) => {
        if (event.target instanceof Node && !host.contains(event.target))
            owned = null;
    };
    const observer = new MutationObserver(() => {
        const target = owned, active = document.activeElement;
        if (!target || canFocus(target) || !availableOverlayAnchor(host) || active !== target && active !== document.body)
            return;
        owned = null;
        host.focus({ preventScroll: true });
    });
    observer.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'inert'] });
    document.addEventListener('focusin', focus, true);
    host.addEventListener('focusout', leave, true);
    document.addEventListener('pointerdown', pointer, true);
    inject(DestroyRef).onDestroy(() => { observer.disconnect(); owned = null; document.removeEventListener('focusin', focus, true); host.removeEventListener('focusout', leave, true); document.removeEventListener('pointerdown', pointer, true); });
}
