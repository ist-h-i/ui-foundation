/** Focus utilities operate in the existing DOM/profile scope. No document-wide trap. */
export function canFocus(element: HTMLElement | null): element is HTMLElement {
    return !!element && element.isConnected && !element.closest('[inert],[hidden]') && !element.matches(':disabled') && element.getClientRects().length > 0;
}
export function restoreFocus(origin: HTMLElement | null, fallback: HTMLElement | null = null): boolean {
    const element = canFocus(origin) ? origin : canFocus(fallback) ? fallback : null;
    if (!element)
        return false;
    element.focus({ preventScroll: true });
    return element.ownerDocument.activeElement === element;
}
export function tabbableElements(root: ParentNode): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex],summary,[contenteditable="true"]')).filter(element => canFocus(element) && element.tabIndex >= 0);
}
/** Menus leave their composite on Tab. Native modal scope remains confined. */
export function focusOutsideMenu(anchor: HTMLElement, backwards = false): void {
    const modal = anchor.closest<HTMLDialogElement>('dialog:modal');
    const candidates = tabbableElements(modal ?? anchor.ownerDocument.body);
    const index = candidates.indexOf(anchor);
    const target = candidates[(index + (backwards ? -1 : 1) + candidates.length) % candidates.length];
    if (target)
        target.focus();
}
