import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessage} from './locale';
import { afterNextRender, type AfterRenderRef, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, Injector, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { Icon } from './icons/renderer';
import { fallbackIcons } from './icons/registry';
import { shape as circleCheckIcon } from './icons/circle-check';
import { shape as circleAlertIcon } from './icons/circle-alert';
import { shape as infoIcon } from './icons/info';
import { restoreFocus, tabbableElements, focusBeforeHiding } from './focus';
export type FeedbackSeverity = 'info' | 'success' | 'warning' | 'error';
import { progressValue } from './feedback-model';
export { progressValue, type ProgressValue } from './feedback-model';
function holdBlockedFeedbackAction(element: HTMLElement, blocked: boolean): void { const active = element.ownerDocument.activeElement as HTMLElement | null; if (blocked && active && element.contains(active) && active.closest('[data-feedback-action]'))
    element.querySelector<HTMLElement>('.ui-feedback-message')?.focus(); }
const common = `:host{box-sizing:border-box;display:block;min-inline-size:0;max-inline-size:100%;font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);overflow-wrap:anywhere;}:host([hidden]),[hidden]{display:none!important;}h2{margin:0;font-size:var(--ui-text-heading);font-weight:var(--ui-weight-heading);line-height:var(--ui-leading-heading);}p{margin-block:var(--ui-space-control-gap);}button{max-inline-size:100%;}.ui-feedback-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}.ui-feedback-frame{padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-background);}`;
const severity = `:host([data-severity="success"]){--ui-feedback-ink:var(--ui-color-success);--ui-feedback-surface:var(--ui-color-success-surface);}:host([data-severity="warning"]){--ui-feedback-ink:var(--ui-color-warning);--ui-feedback-surface:var(--ui-color-warning-surface);}:host([data-severity="error"]){--ui-feedback-ink:var(--ui-color-danger);--ui-feedback-surface:var(--ui-color-error-surface);}.ui-feedback-frame{color:var(--ui-feedback-ink,var(--ui-color-text));background:var(--ui-feedback-surface,var(--ui-color-background));}`;
@Component({ selector: 'ui-alert,ui-banner,ui-inline-message', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush, host: { '[hidden]': '!opened()', '[attr.data-severity]': 'severity()' },
    template: `<div class="ui-feedback-frame"><div [attr.role]="announcement()==='off'?null:announcement()==='assertive'?'alert':'status'" aria-atomic="true">@if(title()){<h2>{{title()}}</h2>}<p class="ui-feedback-message" tabindex="-1">{{message()}}</p></div><ng-content /><div class="ui-feedback-actions"><ng-content select="[uiAlertActions]" />@if(actionLabel()){<button uiAction data-feedback-action="action" [busy]="busy()" [disabled]="disabled()" (click)="requestAction()">{{actionLabel()}}</button>}@if(closable()){<button uiAction data-feedback-action="close" [disabled]="busy()||disabled()" (click)="close()">{{uiEffective_closeLabel()}}</button>}</div></div>`, styles: common + severity })
export class Alert {
 protected readonly uiText_Alert=injectUiMessage();
    readonly open = input(true, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly title = input('');
    readonly message = input.required<string>();
    readonly severity = input<FeedbackSeverity>('info');
    readonly announcement = input<'polite' | 'assertive' | 'off'>('polite');
    readonly closable = input(false, { transform: booleanAttribute });
    readonly closeLabel = input<string>();
 protected readonly uiEffective_closeLabel=uiLocaleComputed(()=>this.closeLabel()??this.uiText_Alert({id:'uiFoundation.alert.closeLabel'}));
    readonly actionLabel = input('');
    readonly busy = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly action = output<void>();
    readonly closed = output<void>();
    readonly focusFallback = input<HTMLElement | null>(null);
    protected readonly opened = linkedSignal(() => this.open());
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() { effect(() => {
        const open = this.opened(), blocked = this.busy() || this.disabled(), fallback = this.focusFallback();
        const actionVisible = !!this.actionLabel(), closeVisible = this.closable();
        untracked(() => {
            if (!open) { focusBeforeHiding(this.element, fallback); return; }
            const active = this.element.ownerDocument.activeElement;
            const ownsFocus = (kind: 'action' | 'close') => !!active && !!this.element.querySelector(':scope > .ui-feedback-frame > .ui-feedback-actions > [data-feedback-action="' + kind + '"]')?.contains(active);
            if ((blocked || !actionVisible) && ownsFocus('action') || (blocked || !closeVisible) && ownsFocus('close'))
                this.element.querySelector<HTMLElement>('.ui-feedback-message')?.focus();
        });
    }); }
    protected requestAction(): void {
        if (this.opened() && !this.busy() && !this.disabled())
            this.action.emit();
    }
    protected close(): void {
        if (!this.opened() || this.busy() || this.disabled())
            return;
        focusBeforeHiding(this.element, this.focusFallback());
        this.opened.set(false);
        this.openChange.emit(false);
        this.closed.emit();
    }
}
@Component({ selector: 'ui-empty-state', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div class="ui-feedback-frame" [attr.data-kind]="kind()">@if(image()&&!imageFailed()){<img [src]="image()" [alt]="imageAlt()" (error)="imageFailed.set(true)">}<h2>{{title()}}</h2><p class="ui-feedback-message" tabindex="-1">{{message()}}</p><ng-content /><div class="ui-feedback-actions"><ng-content select="[uiEmptyActions]" />@if(actionLabel()){<button uiAction data-feedback-action [busy]="busy()" [disabled]="disabled()" (click)="requestAction()">{{actionLabel()}}</button>}</div></div>`, styles: common + `img{display:block;max-inline-size:100%;max-block-size:var(--ui-size-grid-item);object-fit:contain;margin-inline:auto;}` })
export class EmptyState {
    readonly kind = input<'empty' | 'search'>('empty');
    readonly title = input.required<string>();
    readonly message = input.required<string>();
    readonly image = input<string | null>(null);
    readonly imageAlt = input('');
    readonly actionLabel = input('');
    readonly busy = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly action = output<void>();
    protected readonly imageFailed = signal(false);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() { effect(() => { this.image(); this.imageFailed.set(false); }); effect(() => { const blocked = this.busy() || this.disabled() || !this.actionLabel(); untracked(() => holdBlockedFeedbackAction(this.element, blocked)); }); }
    protected requestAction(): void {
        if (!this.busy() && !this.disabled())
            this.action.emit();
    }
}
@Component({ selector: 'ui-result-state', standalone: true, imports: [ActionControl, Icon], changeDetection: ChangeDetectionStrategy.OnPush, host: { '[attr.data-severity]': 'status()==="unknown"?"warning":status()' },
    viewProviders: [fallbackIcons(circleCheckIcon, circleAlertIcon, infoIcon)],
    template: `<div class="ui-feedback-frame"><div role="status" aria-atomic="true"><h2><ui-icon [name]="icon()" /> {{title()}}</h2><p class="ui-feedback-message" tabindex="-1">{{message()}}</p></div>@if(details()){<details [open]="detailsOpen()" (toggle)="detailsChange($event)"><summary>{{uiEffective_detailsLabel()}}</summary><p>{{details()}}</p></details>}<ng-content /><div class="ui-feedback-actions"><ng-content select="[uiResultActions]" />@if(actionLabel()){<button uiAction data-feedback-action [busy]="busy()" [disabled]="disabled()" (click)="requestAction()">{{actionLabel()}}</button>}</div></div>`, styles: common + severity + `summary{min-block-size:var(--ui-size-control);cursor:pointer;}h2{display:flex;align-items:baseline;gap:var(--ui-space-control-gap);}` })
export class ResultState {
 protected readonly uiText_ResultState=injectUiMessage();
    readonly status = input<FeedbackSeverity | 'unknown'>('success');
    readonly title = input.required<string>();
    readonly message = input.required<string>();
    readonly details = input('');
    readonly detailsLabel = input<string>();
 protected readonly uiEffective_detailsLabel=uiLocaleComputed(()=>this.detailsLabel()??this.uiText_ResultState({id:'uiFoundation.resultState.detailsLabel'}));
    readonly detailsOpen = input(false, { transform: booleanAttribute });
    readonly detailsOpenChange = output<boolean>();
    readonly actionLabel = input('');
    readonly busy = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly action = output<void>();
    protected readonly icon = computed(() => this.status() === 'success' ? 'circle-check' : this.status() === 'error' ? 'circle-alert' : this.status() === 'warning' || this.status() === 'unknown' ? 'circle-alert' : 'info');
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() { effect(() => { const blocked = this.busy() || this.disabled() || !this.actionLabel(); untracked(() => holdBlockedFeedbackAction(this.element, blocked)); }); }
    protected requestAction(): void {
        if (!this.busy() && !this.disabled())
            this.action.emit();
    }
    protected detailsChange(event: Event): void { this.detailsOpenChange.emit((event.currentTarget as HTMLDetailsElement).open); }
}
@Component({ selector: 'ui-progress-bar', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<label [for]="controlId()">{{label()}}</label><progress tabindex="-1" [id]="controlId()" [attr.value]="progress().value" [max]="progress().total" [attr.aria-valuetext]="description()">{{description()}}</progress><p>{{description()}}</p>@if(cancelLabel()){<button uiAction [busy]="cancelBusy()" [disabled]="disabled()" (click)="requestCancel()">{{cancelLabel()}}</button>}`, styles: common + `label{display:block;font-weight:var(--ui-weight-control);}progress{display:block;inline-size:100%;block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}` })
export class ProgressBar {
 private readonly uiRuntimeText_ProgressBar=injectUiMessage();

    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly value = input<number | null>(null);
    readonly total = input(100);
    readonly valueText = input('');
    readonly cancelLabel = input('');
    readonly cancelBusy = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly cancelRequested = output<void>();
    protected readonly progress = computed(() => progressValue(this.value(), this.total()));
    protected readonly description = computed(() => {
        const supplied = this.valueText();
        if (supplied) return supplied;
        const { value, total, percent } = this.progress();
        return value === null || percent === null
            ? this.uiRuntimeText_ProgressBar({ id: 'uiFoundation.progressBar.indeterminate' })
            : this.uiRuntimeText_ProgressBar({ id: 'uiFoundation.progressBar.description', parameters: { value, total, percent } });
    });
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() { effect(() => { const blocked = this.cancelBusy() || this.disabled() || !this.cancelLabel(); untracked(() => { const active = this.element.ownerDocument.activeElement; if (blocked && active && this.element.querySelector('button')?.contains(active))
        this.element.querySelector<HTMLElement>('progress')?.focus(); }); }); }
    protected requestCancel(): void {
        if (this.cancelLabel() && !this.cancelBusy() && !this.disabled())
            this.cancelRequested.emit();
    }
}
@Component({ selector: 'ui-spinner,ui-circular-progress', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div [hidden]="!visible()" class="ui-spinner" role="progressbar" [attr.aria-label]="label()" [attr.aria-valuemin]="0" [attr.aria-valuemax]="progress().total" [attr.aria-valuenow]="progress().value" [attr.data-indeterminate]="progress().value===null"><svg viewBox="0 0 40 40" aria-hidden="true" [style.inline-size]="sizeValue()" [style.block-size]="sizeValue()"><circle class="ui-spinner-track" cx="20" cy="20" r="16" /><circle class="ui-spinner-arc" cx="20" cy="20" r="16" pathLength="100" [attr.stroke-dasharray]="(progress().percent??30)+' 100'" /></svg><span>{{label()}}</span></div>`, styles: common + `.ui-spinner{display:flex;align-items:center;gap:var(--ui-space-control-gap);}svg{flex:0 0 auto;transform:rotate(-90deg);fill:none;stroke-width:3;}.ui-spinner-track{stroke:var(--ui-color-border);}.ui-spinner-arc{stroke:var(--ui-color-action);}.ui-spinner[data-indeterminate="true"] svg{animation:ui-spin calc(6 * var(--ui-motion-duration)) linear infinite;}@keyframes ui-spin{to{transform:rotate(270deg);}}@media(prefers-reduced-motion:reduce){.ui-spinner[data-indeterminate="true"] svg{animation:none;}}` })
export class Spinner {
    readonly label = input.required<string>();
    readonly active = input(true, { transform: booleanAttribute });
    readonly value = input<number | null>(null);
    readonly total = input(100);
    readonly size = input<'small' | 'medium' | 'large' | number>('medium');
    readonly delayMilliseconds = input(0);
    protected readonly visible = signal(false);
    protected readonly progress = computed(() => progressValue(this.value(), this.total()));
    protected readonly sizeValue = computed(() => {
        const size = this.size();
        if (typeof size === 'number') {
            if (!Number.isFinite(size) || size <= 0)
                throw new Error('Spinner size must be positive.');
            return size + 'px';
        }
        return size === 'small' ? 'var(--ui-size-icon)' : size === 'large' ? 'calc(2 * var(--ui-size-control))' : 'var(--ui-size-control)';
    });
    constructor() {
        effect(onCleanup => {
            const active = this.active(), delay = this.delayMilliseconds();
            if (!Number.isFinite(delay) || delay < 0 || delay > 2147483647)
                throw new Error('Spinner delay must fit a nonnegative browser timer.');
            this.visible.set(active && delay === 0);
            if (active && delay > 0) {
                const timer = setTimeout(() => this.visible.set(true), delay);
                onCleanup(() => clearTimeout(timer));
            }
        });
    }
}
@Component({ selector: 'ui-skeleton', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, host: { 'aria-hidden': 'true', '[attr.data-shape]': 'shape()', '[attr.data-motion]': 'motion()' }, template: `@for(row of lines();track row){<span class="ui-skeleton-line" [style.inline-size]="widthValue()" [style.block-size]="shape() === 'circle' ? 'auto' : heightValue()" [style.aspect-ratio]="shape() === 'circle' ? '1' : null"></span>}`, styles: common + `:host{display:flex;flex-direction:column;gap:var(--ui-space-control-gap);}.ui-skeleton-line{display:block;max-inline-size:100%;border-radius:var(--ui-radius-control);background:var(--ui-color-disabled-surface);}:host([data-shape="circle"]) .ui-skeleton-line{border-radius:50%;}:host([data-motion="true"]) .ui-skeleton-line{animation:ui-pulse calc(8 * var(--ui-motion-duration)) var(--ui-motion-easing) infinite;}@keyframes ui-pulse{50%{opacity:.5;}}@media(prefers-reduced-motion:reduce){:host([data-motion="true"]) .ui-skeleton-line{animation:none;}}` })
export class Skeleton {
    readonly shape = input<'line' | 'rectangle' | 'circle'>('line');
    readonly rows = input(1);
    readonly width = input<number | 'full' | 'control'>('full');
    readonly height = input<number | 'text' | 'control'>('text');
    readonly diameter = input<number | 'control'>('control');
    readonly motion = input(true, { transform: booleanAttribute });
    protected readonly lines = computed(() => {
        const count = this.rows();
        if (!Number.isInteger(count) || count < 1 || count > 1000)
            throw new Error('Skeleton rows must be an integer between 1 and 1000.');
        return Array.from({ length: count }, (_, index) => index);
    });
    protected readonly widthValue = computed(() => this.shape() === 'circle' ? this.dimension(this.diameter(), 'var(--ui-size-control)', 'var(--ui-size-control)') : this.dimension(this.width(), '100%', 'var(--ui-size-control)'));
    protected readonly heightValue = computed(() => this.shape() === 'circle' ? this.dimension(this.diameter(), 'var(--ui-size-control)', 'var(--ui-size-control)') : this.dimension(this.height(), this.shape() === 'rectangle' ? 'var(--ui-size-control)' : 'calc(var(--ui-text-body) * var(--ui-leading-body))', 'var(--ui-size-control)'));
    private dimension(value: number | 'full' | 'text' | 'control', full: string, control: string): string {
        if (typeof value === 'number') {
            if (!Number.isFinite(value) || value <= 0)
                throw new Error('Skeleton dimensions must be positive.');
            return value + 'px';
        }
        return value === 'control' ? control : full;
    }
}
@Component({ selector: 'ui-loading-overlay,ui-block-ui', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush, host: { tabindex: '-1', '[attr.data-active]': 'active()' }, template: `<div class="ui-loading-content" [inert]="active()" [attr.aria-busy]="active()"><ng-content /></div><div class="ui-loading-notice" [hidden]="!active()"><p tabindex="-1" role="status" aria-atomic="true">{{message()}}</p>@if(cancelLabel()){<button uiAction [busy]="cancelBusy()" [disabled]="disabled()" (click)="requestCancel()">{{cancelLabel()}}</button>}</div>`, styles: common + `:host{position:relative;border-radius:var(--ui-radius-surface);}.ui-loading-content{min-inline-size:0;}.ui-loading-notice{box-sizing:border-box;position:absolute;inset:0;display:flex;flex-direction:column;justify-content:safe center;align-items:safe center;gap:var(--ui-space-control-gap);padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:inherit;background:var(--ui-color-background);color:var(--ui-color-text);overflow:auto;}.ui-loading-notice p{max-inline-size:100%;}.ui-loading-notice:focus-within{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}` })
export class LoadingOverlay {
    readonly active = input(false, { transform: booleanAttribute });
    readonly focusFallback = input<HTMLElement | null>(null);
    readonly message = input.required<string>();
    readonly cancelLabel = input('');
    readonly cancelBusy = input(false, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly cancelRequested = output<void>();
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly injector = inject(Injector);
    private origin: HTMLElement | null = null;
    private focusJob: AfterRenderRef | null = null;
    constructor() { effect(() => { const active = this.active(), fallback = this.focusFallback(), blocked = this.cancelBusy() || this.disabled() || !this.cancelLabel(); untracked(() => { const focus = this.element.ownerDocument.activeElement as HTMLElement | null, content = this.element.querySelector('.ui-loading-content'), notice = this.element.querySelector('.ui-loading-notice'); if (active && focus && content?.contains(focus)) {
        this.origin = focus;
        this.element.focus();
        this.focusJob?.destroy();
        this.focusJob = afterNextRender(() => { this.focusJob = null; if (this.element.ownerDocument.activeElement !== this.element)
            return; restoreFocus(this.element.querySelector<HTMLElement>('.ui-loading-notice button:not(:disabled)') ?? this.element.querySelector<HTMLElement>('.ui-loading-notice [role="status"]')); }, { injector: this.injector });
    }
    else if (active && blocked && focus && notice?.querySelector('button')?.contains(focus)) {
        this.element.querySelector<HTMLElement>('.ui-loading-notice [role="status"]')?.focus();
    }
    else if (!active && (this.origin || !!focus && !!notice?.contains(focus))) {
        const origin = this.origin;
        this.origin = null;
        if (focus && notice?.contains(focus))
            this.element.focus();
        this.focusJob?.destroy();
        this.focusJob = afterNextRender(() => { this.focusJob = null; const current = this.element.ownerDocument.activeElement; if (current !== this.element && !notice?.contains(current))
            return; if (!restoreFocus(origin, fallback) && !restoreFocus(tabbableElements(content ?? this.element)[0] ?? null))
            focusBeforeHiding(this.element, fallback); }, { injector: this.injector });
    } }); }); inject(DestroyRef).onDestroy(() => { this.focusJob?.destroy(); focusBeforeHiding(this.element, this.focusFallback()); }); }
    protected requestCancel(): void {
        if (this.active() && this.cancelLabel() && !this.cancelBusy() && !this.disabled())
            this.cancelRequested.emit();
    }
}
