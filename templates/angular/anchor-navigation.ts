import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, untracked, booleanAttribute } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationItem } from './navigation';
import { validNavigationId } from './navigation-model';
import { canFocus } from './focus';
export interface AnchorNavigationItem {
    id: string;
    label: string;
    target: HTMLElement | null;
    children?: readonly AnchorNavigationItem[];
}
@Component({ selector: 'ui-anchor-navigation', standalone: true, imports: [NavigationItem, NgTemplateOutlet], host: { '[attr.data-position]': 'position()', '[style.inset-block-start.px]': 'checkedOffset()', '[style.--ui-anchor-offset]': "checkedOffset()+'px'" }, changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <nav [attr.aria-label]="label()" [attr.aria-labelledby]="labelledBy()" [attr.data-hierarchical]="entries().hierarchical || null">
        <ng-container [ngTemplateOutlet]="branch" [ngTemplateOutletContext]="{$implicit: items()}" />
      </nav>
      <ng-template #branch let-items>
        <ul role="list">
          @for (item of branchItems(items); track item.id) {
            <li>
              @let target = item.target;
              @let enabled = available(target);
              <a uiNavigationItem
                [attr.href]="enabled && target ? '#' + encode(target.id) : null"
                [attr.role]="enabled ? null : 'link'"
                [attr.tabindex]="enabled ? null : 0"
                [attr.aria-disabled]="enabled ? null : 'true'"
                [attr.aria-current]="current() === item.id ? 'location' : null"
                (click)="move($event, item)">{{item.label}}</a>
              @if (item.children?.length) {
                <ng-container [ngTemplateOutlet]="branch" [ngTemplateOutletContext]="{$implicit: item.children}" />
              }
            </li>
          }
        </ul>
      </ng-template>
    `,
    styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}nav{box-sizing:border-box;max-inline-size:100%;max-block-size:calc(100dvh - var(--ui-anchor-offset));overflow:auto;overscroll-behavior:contain;background:var(--ui-color-surface);color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);padding:var(--ui-space-control-y);border-inline-start:var(--ui-border-control) solid var(--ui-color-border);}ul{list-style:none;display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);padding:0;margin:0;}li{min-inline-size:0;max-inline-size:100%;}:host([data-position='sticky']){position:sticky;align-self:start;}:host([data-position='fixed']){position:fixed;z-index:1;}[aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}a[aria-current='location']{font-weight:var(--ui-weight-heading);background:var(--ui-color-background);}
      nav[data-hierarchical] ul{display:block;}
      li > ul{padding-inline-start:var(--ui-space-control-x);border-inline-start:var(--ui-border-control) solid var(--ui-color-border);}
    ` })
export class AnchorNavigation {
    readonly label = input.required<string>();
    /** Optional ID of the visible heading or disclosure summary that names the table of contents. */
    readonly labelledBy = input<string | null>(null);
    readonly items = input<readonly AnchorNavigationItem[]>([]);
    readonly scrollRoot = input<HTMLElement | null>(null);
    readonly offset = input(0);
    protected readonly checkedOffset = computed(() => { const offset = this.offset(); if (!Number.isFinite(offset) || offset < 0) throw new Error('Anchor offset must be finite and nonnegative.'); return offset; });
    readonly position = input<'static' | 'sticky' | 'fixed'>('static');
    readonly behavior = input<'auto' | 'smooth'>('auto');
    readonly updateHash = input(true, { transform: booleanAttribute });
    readonly currentChange = output<string>();
    readonly selected = output<AnchorNavigationItem>();
    protected readonly current = signal('');
    protected readonly encode = encodeURIComponent;
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly revision = signal(0);
    private readonly leases = new Map<HTMLElement, {
        margin: string;
        marginPriority: string;
        last: string;
        lastPriority: string;
        tabindex: string | null;
        changedTab: boolean;
    }>();
    private cleanup: (() => void) | null = null;
    private paddingMeasure: { box: HTMLElement; marker: HTMLElement } | null = null;
    protected readonly entries = computed(() => {
        this.revision();
        const flat: AnchorNavigationItem[] = [];
        const ids = new Set<string>();
        const visit = (items: readonly AnchorNavigationItem[]): void => {
            for (const item of items) {
                if (!validNavigationId(item.id) || ids.has(item.id) || !item.label.trim())
                    throw new Error('Anchor navigation requires unique IDs and labels.');
                ids.add(item.id);
                if (item.target && item.target.ownerDocument !== this.element.ownerDocument)
                    throw new Error('Anchor target must belong to the same document.');
                flat.push(item);
                if (item.children?.length) visit(item.children);
            }
        };
        const items = this.items();
        visit(items);
        return { flat, hierarchical: flat.length > items.length };
    });
    protected branchItems(items: readonly AnchorNavigationItem[]): readonly AnchorNavigationItem[] {
        return items;
    }
    constructor() {
        afterRenderEffect(() => {
            const items = this.entries().flat, root = this.scrollRoot(), offset = this.checkedOffset();
            if (!this.label().trim())
                throw new Error('Anchor navigation requires a label.');
            if (root && (root.ownerDocument !== this.element.ownerDocument || items.some(item => item.target && !root.contains(item.target))))
                throw new Error('Anchor scrollRoot must share the document and contain its targets.');
            untracked(() => {
                this.cleanup?.();
                this.cleanup = null;
                const targets = items.flatMap(item => item.target ? [item.target] : []);
                for (const [target, lease] of this.leases)
                    if (!targets.includes(target))
                        this.release(target, lease);
                for (const target of targets) {
                    const margin = offset + 'px', lease = this.leases.get(target);
                    const priority = target.style.getPropertyPriority('scroll-margin-block-start');
                    if (lease) {
                        if (target.style.scrollMarginBlockStart !== lease.last || priority !== lease.lastPriority) {
                            lease.margin = target.style.scrollMarginBlockStart;
                            lease.marginPriority = priority;
                        }
                        lease.last = margin;
                        lease.lastPriority = '';
                    }
                    else
                        this.leases.set(target, { margin: target.style.scrollMarginBlockStart, marginPriority: priority, last: margin, lastPriority: '', tabindex: target.getAttribute('tabindex'), changedTab: false });
                    if (target.style.scrollMarginBlockStart !== margin || priority !== '')
                        target.style.setProperty('scroll-margin-block-start', margin);
                }
                const view = this.element.ownerDocument.defaultView;
                if (!view)
                    return;
                let frame: number | null = null;
                const update = () => { frame = null; this.track(); };
                const schedule = () => { if (frame === null)
                    frame = view.requestAnimationFrame(update); };
                (root ?? view).addEventListener('scroll', schedule, { passive: true });
                view.addEventListener('resize', schedule);
                view.addEventListener('hashchange', schedule);
                const resize = new ResizeObserver(schedule);
                for (const target of targets)
                    resize.observe(target);
                if (root)
                    resize.observe(root);
                const observer = new MutationObserver(() => { this.revision.update(value => value + 1); schedule(); });
                observer.observe(this.element.ownerDocument.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'inert', 'open', 'id', 'class', 'style', 'dir', 'data-ui-profile'] });
                this.cleanup = () => { (root ?? view).removeEventListener('scroll', schedule); view.removeEventListener('resize', schedule); view.removeEventListener('hashchange', schedule); resize.disconnect(); observer.disconnect(); if (frame !== null)
                    view.cancelAnimationFrame(frame); };
                this.track();
            });
        });
        inject(DestroyRef).onDestroy(() => { this.cleanup?.(); this.paddingMeasure?.box.remove(); for (const [target, lease] of [...this.leases])
            this.release(target, lease); });
    }
    protected available(target: HTMLElement | null): target is HTMLElement {
        // DOM availability can change without replacing the items array. Read
        // the observed revision in the template, even when entries stays equal.
        this.revision();
        return canFocus(target) && !!target.id;
    }
    private release(target: HTMLElement, lease: {
        margin: string;
        marginPriority: string;
        last: string;
        lastPriority: string;
        tabindex: string | null;
        changedTab: boolean;
    }): void { if (target.style.scrollMarginBlockStart === lease.last && target.style.getPropertyPriority('scroll-margin-block-start') === lease.lastPriority)
        target.style.setProperty('scroll-margin-block-start', lease.margin, lease.marginPriority); if (lease.changedTab && target.getAttribute('tabindex') === '-1') {
        if (lease.tabindex === null)
            target.removeAttribute('tabindex');
        else
            target.setAttribute('tabindex', lease.tabindex);
    } this.leases.delete(target); }
    protected move(event: MouseEvent, item: AnchorNavigationItem): void {
        const target = item.target;
        if (!this.available(target)) {
            event.preventDefault();
            return;
        }
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
            return;
        const view = this.element.ownerDocument.defaultView;
        if (!view)
            return;
        event.preventDefault();
        const lease = this.leases.get(target);
        if (lease && !target.matches('button,input,select,textarea,a[href],[tabindex],[contenteditable]')) {
            target.setAttribute('tabindex', '-1');
            lease.changedTab = true;
        }
        if (this.updateHash())
            view.history.pushState(view.history.state, '', '#' + encodeURIComponent(target.id));
        const behavior = view.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : this.behavior(), root = this.scrollRoot();
        if (root && root.contains(target))
            root.scrollTo({ top: root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop - this.checkedOffset() - this.scrollPadding(root), behavior });
        else
            target.scrollIntoView({ block: 'start', behavior });
        target.focus({ preventScroll: true });
        this.selected.emit(item);
        this.track();
    }
    /** Match native scrollIntoView's scrollport padding, including percentage/calc values. */
    private scrollPadding(root: HTMLElement | null): number {
        const document = this.element.ownerDocument, view = document.defaultView;
        if (!view) return 0;
        const css = view.getComputedStyle(root ?? document.documentElement).scrollPaddingBlockStart;
        if (!css || css === 'auto') return 0;
        const height = root?.clientHeight ?? document.documentElement.clientHeight;
        if (/^[\d.e+-]+px$/i.test(css)) return Math.max(0, parseFloat(css) || 0);
        if (/^[\d.e+-]+%$/i.test(css)) return Math.max(0, (parseFloat(css) || 0) * height / 100);
        // Resolve CSS arithmetic with native layout rather than approximating calc().
        // Reuse one noninteractive zero-width measure; unchanged styles do not
        // retrigger the document observer, and destruction removes the measure.
        if (!this.paddingMeasure) {
            const box = document.createElement('div'), marker = document.createElement('div');
            box.setAttribute('aria-hidden', 'true');
            box.style.cssText = 'position:fixed;inset:0 auto auto 0;visibility:hidden;pointer-events:none;width:0;height:0;padding:0;border:0;margin:0;overflow:hidden;contain:strict;';
            marker.style.cssText = 'position:absolute;left:0;width:0;height:0;padding:0;border:0;margin:0;';
            box.append(marker); document.documentElement.append(box);
            this.paddingMeasure = { box, marker };
        }
        const { box, marker } = this.paddingMeasure;
        if (box.style.height !== height + 'px') box.style.height = height + 'px';
        if (marker.style.top !== css) marker.style.top = css;
        return Math.max(0, parseFloat(view.getComputedStyle(marker).top) || 0);
    }
    private track(): void { const root = this.scrollRoot(), view = this.element.ownerDocument.defaultView, top = (root ? root.getBoundingClientRect().top + root.clientTop : 0) + this.checkedOffset() + this.scrollPadding(root), items = this.entries().flat.filter(item => this.available(item.target)).sort((a, b) => a.target!.getBoundingClientRect().top - b.target!.getBoundingClientRect().top), bottom = root ? root.scrollTop + root.clientHeight >= root.scrollHeight - 1 : !!view && view.scrollY + view.innerHeight >= this.element.ownerDocument.documentElement.scrollHeight - 1; const current = (bottom ? items.at(-1)?.id : [...items].reverse().find(item => item.target!.getBoundingClientRect().top <= top + 1)?.id) ?? items[0]?.id ?? ''; if (current !== this.current()) {
        this.current.set(current);
        this.currentChange.emit(current);
    } }
}
