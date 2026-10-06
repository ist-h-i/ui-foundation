import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { restoreFocus } from './focus';
import { OverlayRegistry, availableOverlayAnchor, observeOverlay, positionOverlay, type OverlayPlacement } from './overlay';
export interface TourStep {
    id: string;
    title: string;
    message: string;
    target: HTMLElement;
    placement?: OverlayPlacement;
}
export type TourCloseReason = 'completed' | 'dismissed' | 'escape' | 'target-unavailable' | 'scope-exit';
@Component({ selector: 'ui-tour,ui-coachmark', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div #popup popover="manual" class="ui-tour-popup" role="dialog" aria-modal="false" tabindex="-1" [attr.aria-labelledby]="controlId()+'-title'" [attr.aria-describedby]="controlId()+'-description'">@if(current();as step){<h2 [id]="controlId()+'-title'">{{step.title}}</h2><p [id]="controlId()+'-description'">{{step.message}}</p><p role="status" aria-atomic="true"><bdi dir="ltr">{{currentIndex()+1}} / {{steps().length}}</bdi></p><div class="ui-tour-actions"><button uiAction [disabled]="currentIndex()===0" (click)="previous()">{{uiEffective_previousLabel()}}</button><button uiAction (click)="next()">{{currentIndex()===steps().length-1?uiEffective_finishLabel():uiEffective_nextLabel()}}</button><button uiAction (click)="close('dismissed')">{{uiEffective_closeLabel()}}</button></div>}</div>@if(opened()&&highlight();as box){<div class="ui-tour-highlight" aria-hidden="true" [style.left.px]="box.left" [style.top.px]="box.top" [style.width.px]="box.width" [style.height.px]="box.height"></div>}`,
    styles: `:host{display:contents;}:host([hidden]){display:none;}.ui-tour-popup{box-sizing:border-box;position:fixed;inset:auto;margin:0;padding:var(--ui-space-field);inline-size:var(--ui-size-dialog-min);max-inline-size:calc(100vw - 2 * var(--ui-space-control-gap));max-block-size:calc(100dvh - 2 * var(--ui-space-field));overflow:auto;overscroll-behavior:contain;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-surface);color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow);overflow-wrap:anywhere;}h2{font-size:var(--ui-text-heading);line-height:var(--ui-leading-heading);margin:0;}p{margin-block:var(--ui-space-control-gap);}.ui-tour-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}.ui-tour-highlight{box-sizing:border-box;position:fixed;pointer-events:none;z-index:1;border:var(--ui-border-focus) solid var(--ui-color-focus);border-radius:var(--ui-radius-control);}` })
export class Tour {
 protected readonly uiText_Tour=injectUiText();
    readonly controlId = input.required<string>();
    readonly steps = input<readonly TourStep[]>([]);
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly index = input(0);
    readonly indexChange = output<number>();
    readonly seen = input<readonly string[]>([]);
    readonly seenChange = output<readonly string[]>();
    readonly closed = output<TourCloseReason>();
    readonly previousLabel = input<string>();
 protected readonly uiEffective_previousLabel=uiLocaleComputed(()=>this.previousLabel()??this.uiText_Tour('戻る'));
    readonly nextLabel = input<string>();
 protected readonly uiEffective_nextLabel=uiLocaleComputed(()=>this.nextLabel()??this.uiText_Tour('次へ'));
    readonly finishLabel = input<string>();
 protected readonly uiEffective_finishLabel=uiLocaleComputed(()=>this.finishLabel()??this.uiText_Tour('案内を完了'));
    readonly closeLabel = input<string>();
 protected readonly uiEffective_closeLabel=uiLocaleComputed(()=>this.closeLabel()??this.uiText_Tour('案内を閉じる'));
    protected readonly opened = linkedSignal(() => this.open());
    protected readonly currentIndex = linkedSignal(() => this.index());
    private readonly seenIds = linkedSignal(() => this.seen());
    protected readonly current = computed(() => this.steps()[this.currentIndex()] ?? null);
    protected readonly highlight = signal<{
        left: number;
        top: number;
        width: number;
        height: number;
    } | null>(null);
    private readonly popup = viewChild<ElementRef<HTMLElement>>('popup');
    private readonly registry = inject(OverlayRegistry);
    private returnFocus: HTMLElement | null = null;
    private cleanup: (() => void) | null = null;
    private target: HTMLElement | null = null;
    private stepId: string | null = null;
    constructor() {
        effect(() => {
            const steps = this.steps(), index = this.currentIndex(), ids = new Set<string>();
            if (!Number.isInteger(index) || index < 0 || steps.length && index >= steps.length)
                throw new Error('Tour index must select an existing step.');
            for (const step of steps) {
                if (!step.id.trim() || !step.title.trim() || ids.has(step.id))
                    throw new Error('Tour steps need unique IDs and titles.');
                ids.add(step.id);
            }
        });
        afterRenderEffect(() => {
            const open = this.opened(), step = this.current();
            const popup = this.popup()?.nativeElement;
            if (!popup)
                return;
            untracked(() => {
                if (!open) {
                    const owned = popup.contains(popup.ownerDocument.activeElement);
                    if (popup.matches(':popover-open'))
                        popup.hidePopover();
                    this.cleanup?.();
                    this.cleanup = null;
                    this.target = null;
                    this.stepId = null;
                    this.highlight.set(null);
                    if (owned)
                        restoreFocus(this.returnFocus);
                    this.returnFocus = null;
                    return;
                }
                if (!step || !this.eligible(step.target)) {
                    this.close('target-unavailable');
                    return;
                }
                const enter = !popup.matches(':popover-open') || this.stepId !== step.id;
                this.stepId = step.id;
                if (!popup.matches(':popover-open')) {
                    this.returnFocus = popup.ownerDocument.activeElement as HTMLElement | null;
                    popup.showPopover();
                }
                if (this.target !== step.target) {
                    this.cleanup?.();
                    this.target = step.target;
                    step.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
                    const unregister = this.registry.register({ element: popup, anchor: step.target, kind: 'popup', outside: false, dismiss: reason => this.close(reason === 'escape' ? 'escape' : 'scope-exit') });
                    const stop = observeOverlay(popup, step.target, () => this.position());
                    const observer = new MutationObserver(() => this.position());
                    observer.observe(popup.ownerDocument.body, { childList: true, subtree: true });
                    this.cleanup = () => { unregister(); stop(); observer.disconnect(); };
                }
                this.position();
                if (!this.seenIds().includes(step.id)) {
                    const next = [...this.seenIds(), step.id];
                    this.seenIds.set(next);
                    this.seenChange.emit(next);
                }
                const current = popup.ownerDocument.activeElement;
                if (enter && !popup.contains(current))
                    restoreFocus(popup.querySelector<HTMLElement>('button:not(:disabled)'), popup);
            });
        });
        inject(DestroyRef).onDestroy(() => {
            this.cleanup?.();
            const popup = this.popup()?.nativeElement;
            const owned = popup?.contains(popup.ownerDocument.activeElement);
            if (popup?.matches(':popover-open'))
                popup.hidePopover();
            if (owned)
                restoreFocus(this.returnFocus);
        });
    }
    private eligible(target: HTMLElement): boolean { return availableOverlayAnchor(target); }
    private position(): void {
        const step = this.current(), popup = this.popup()?.nativeElement;
        if (!this.opened() || !popup || !popup.matches(':popover-open'))
            return;
        if (!step || !this.eligible(step.target)) {
            this.close('target-unavailable');
            return;
        }
        positionOverlay(popup, step.target, step.placement ?? 'bottom-start');
        const box = step.target.getBoundingClientRect(), next = { left: box.left, top: box.top, width: box.width, height: box.height }, previous = this.highlight();
        if (!previous || Object.keys(next).some(key => next[key as keyof typeof next] !== previous[key as keyof typeof next]))
            this.highlight.set(next);
    }
    protected next(): void {
        if (!this.opened())
            return;
        if (this.currentIndex() >= this.steps().length - 1) {
            this.close('completed');
            return;
        }
        this.currentIndex.update(index => index + 1);
        this.indexChange.emit(this.currentIndex());
    }
    protected previous(): void {
        if (this.opened() && this.currentIndex() > 0) {
            this.currentIndex.update(index => index - 1);
            this.indexChange.emit(this.currentIndex());
        }
    }
    close(reason: TourCloseReason = 'dismissed'): void {
        if (!this.opened())
            return;
        this.opened.set(false);
        this.openChange.emit(false);
        this.closed.emit(reason);
        const popup = this.popup()?.nativeElement, owned = popup?.contains(popup.ownerDocument.activeElement);
        if (popup?.matches(':popover-open'))
            popup.hidePopover();
        this.cleanup?.();
        this.cleanup = null;
        this.target = null;
        this.stepId = null;
        this.highlight.set(null);
        if (owned)
            restoreFocus(this.returnFocus);
        this.returnFocus = null;
    }
}
