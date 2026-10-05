import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, Directive, effect, ElementRef, inject, Injectable, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { restoreFocus } from './focus';
import { PausableDeadline, validateNotification, notificationKey, type NotificationDedup, type NotificationDismissReason, type NotificationPosition, type NotificationRecord, type NotificationRequest, type NotificationSeverity } from './notification-model';
export * from './notification-model';
export interface ScopedNotificationRecord extends NotificationRecord {
    focusReturn: HTMLElement | null;
}
export interface NotificationOptions extends NotificationRequest {
    focusReturn?: HTMLElement | null;
}
const positions: readonly NotificationPosition[] = ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end'];
const positionStyles = `[data-position^="top"]{inset-block-start:var(--ui-space-section);}[data-position^="bottom"]{inset-block-end:var(--ui-space-section);}[data-position$="start"]{inset-inline-start:var(--ui-space-section);}[data-position$="end"]{inset-inline-end:var(--ui-space-section);}[data-position$="center"]{left:50%;right:auto;transform:translateX(-50%);}`;
@Component({ selector: 'ui-snackbar,ui-toast', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div [hidden]="!visible()" class="ui-snackbar" [attr.data-position]="position()" [attr.data-severity]="severity()" (pointerenter)="hover(true)" (pointerleave)="hover(false)" (focusin)="focus(true)" (focusout)="left($event)">
  <p dir="auto" [attr.role]="severity()==='error'?'alert':'status'" aria-atomic="true">{{message()}}</p><div class="ui-snackbar__actions">
   @if(actionLabel()){<button uiAction (click)="action.emit();dismiss('action')">{{actionLabel()}}</button>}
   @if(showCloseButton()){<button uiAction [attr.aria-label]="'通知を閉じる: '+message()" (click)="dismiss('close')">閉じる</button>}
  </div></div>`,
    styles: `:host{display:block;max-inline-size:100%;min-inline-size:0;}:host([hidden]){display:none;}.ui-snackbar{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--ui-space-control-gap);padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);color:var(--ui-color-text);background:var(--ui-color-surface);box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow);font:inherit;overflow-wrap:anywhere;max-inline-size:calc(100vw - 2 * var(--ui-space-section));}.ui-snackbar[hidden]{display:none;}.ui-snackbar:not([data-position="inline"]){position:fixed;z-index:1;max-block-size:calc(100dvh - 2 * var(--ui-space-section));overflow:auto;overscroll-behavior:contain;inline-size:min(var(--ui-size-dialog),calc(100vw - 2 * var(--ui-space-section)));}.ui-snackbar[data-severity="success"]{color:var(--ui-color-success);background:var(--ui-color-success-surface);}.ui-snackbar[data-severity="warning"]{color:var(--ui-color-warning);background:var(--ui-color-warning-surface);}.ui-snackbar[data-severity="error"]{color:var(--ui-color-danger);background:var(--ui-color-error-surface);}p{flex:1 1 var(--ui-size-overlay-min);min-inline-size:0;margin:0;}.ui-snackbar__actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}` + positionStyles,
})
export class Snackbar {
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly message = input.required<string>();
    readonly severity = input<NotificationSeverity>('info');
    readonly autoDismiss = input(true, { transform: booleanAttribute });
    readonly durationSeconds = input(5);
    readonly position = input<NotificationPosition | 'inline'>('bottom-center');
    readonly showCloseButton = input(true, { transform: booleanAttribute });
    readonly actionLabel = input<string | null>(null);
    readonly pauseOnHover = input(true, { transform: booleanAttribute });
    readonly pauseOnFocus = input(true, { transform: booleanAttribute });
    readonly focusChange = output<boolean>();
    readonly action = output<void>();
    readonly dismissed = output<NotificationDismissReason>();
    readonly focusReturn = input<HTMLElement | null>(null);
    readonly lifetimeKey = input<string | number | null>(null);
    protected readonly visible = linkedSignal(() => { this.lifetimeKey(); return this.open(); });
    private readonly hovered = signal(false);
    private readonly focused = signal(false);
    private deadline: PausableDeadline | null = null;
    private origin: HTMLElement | null = null;
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() {
        effect(() => { if (!this.visible() && this.element.contains(this.element.ownerDocument.activeElement))
            restoreFocus(this.focusReturn() ?? this.origin); });
        afterRenderEffect(onCleanup => { const open = this.visible(), auto = this.autoDismiss(), duration = auto ? this.durationSeconds() : 0; this.message(); this.lifetimeKey(); if (!open)
            return; const surface = this.element.querySelector<HTMLElement>('.ui-snackbar'); if (surface) { surface.scrollTop = 0; surface.scrollLeft = 0; } untracked(() => { const active = this.element.ownerDocument.activeElement as HTMLElement | null; if (!this.element.contains(active))
            this.origin = this.focusReturn() ?? active; }); validateNotification({ message: this.message(), autoDismiss: auto, durationSeconds: duration }); if (auto) {
            this.deadline = new PausableDeadline(duration * 1000, () => this.dismiss('timeout'), { now: () => performance.now(), set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) });
            untracked(() => { if (this.hovered() && this.pauseOnHover())
                this.deadline?.pause('hover'); if (this.focused() && this.pauseOnFocus())
                this.deadline?.pause('focus'); });
        } onCleanup(() => { this.deadline?.cancel(); this.deadline = null; }); });
        effect(() => { this.hovered() && this.pauseOnHover() ? this.deadline?.pause('hover') : this.deadline?.resume('hover'); this.focused() && this.pauseOnFocus() ? this.deadline?.pause('focus') : this.deadline?.resume('focus'); });
        inject(DestroyRef).onDestroy(() => { this.deadline?.cancel(); if (this.element.contains(this.element.ownerDocument.activeElement))
            restoreFocus(this.focusReturn() ?? this.origin); });
    }
    protected hover(hovered: boolean): void { this.hovered.set(hovered); }
    protected focus(focused: boolean): void { this.focused.set(focused); this.focusChange.emit(focused); }
    protected left(event: FocusEvent): void { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
        this.focused.set(false);
        this.focusChange.emit(false);
    } }
    protected dismiss(reason: NotificationDismissReason): void { if (!this.visible())
        return; const focused = this.element.contains(this.element.ownerDocument.activeElement); this.deadline?.cancel(); this.deadline = null; this.visible.set(false); this.openChange.emit(false); this.dismissed.emit(reason); if (focused)
        restoreFocus(this.focusReturn() ?? this.origin); }
}
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly document = inject(DOCUMENT);
    private focusedId: string | null = null;
    private sequence = 0;
    private owner = false;
    private dedup: NotificationDedup = 'ignore';
    private readonly records = signal<readonly ScopedNotificationRecord[]>([]);
    readonly notifications = this.records.asReadonly();
    configure(dedup: NotificationDedup): void { this.dedup = dedup; }
    attachHost(): () => void { if (this.owner)
        throw new Error('Use one NotificationHost per NotificationService scope.'); this.owner = true; return () => { const item = this.records().find(record => record.id === this.focusedId); if (item)
        this.restore(item); this.focusedId = null; this.owner = false; }; }
    notify(options: NotificationOptions): string {
        const request: NotificationOptions = { ...options, focusReturn: options.focusReturn ?? this.document.activeElement as HTMLElement | null };
        validateNotification(request);
        const key = notificationKey(request);
        const existing = this.records().find(item => notificationKey(item) === key);
        if (existing && this.dedup !== 'allow') {
            if (this.dedup === 'replace')
                this.records.update(items => items.map(item => item.id === existing.id ? { ...request, focusReturn: options.focusReturn ?? existing.focusReturn, id: existing.id, revision: existing.revision + 1 } : item));
            return existing.id;
        }
        const id = 'ui-notification-' + (++this.sequence);
        this.records.update(items => [...items, { ...request, focusReturn: request.focusReturn ?? null, id, revision: 0 }]);
        return id;
    }
    focusNotification(id: string, focused: boolean): void { if (focused)
        this.focusedId = id;
    else if (this.focusedId === id)
        this.focusedId = null; }
    private restore(record: ScopedNotificationRecord): void { if (this.focusedId !== record.id)
        return; const active = this.document.activeElement as HTMLElement | null; const current = active?.closest<HTMLElement>('[data-ui-notification-id]')?.dataset['uiNotificationId']; if (current === record.id || active === this.document.body)
        restoreFocus(record.focusReturn); }
    dismiss(id: string, revision: number | null = null): void { const item = this.records().find(record => record.id === id && (revision === null || record.revision === revision)); if (item) {
        this.restore(item);
        if (this.focusedId === id)
            this.focusedId = null;
    } this.records.update(items => items.filter(item => item.id !== id || revision !== null && item.revision !== revision)); }
    clear(): void { const item = this.records().find(record => record.id === this.focusedId); if (item)
        this.restore(item); this.focusedId = null; this.records.set([]); }
}
@Component({ selector: 'ui-notification-host', standalone: true, imports: [Snackbar], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `@for(position of positions;track position){<div class="ui-notification-stack" [attr.data-position]="position">@for(item of at(position);track item.id){<ui-snackbar [attr.data-ui-notification-id]="item.id" (focusChange)="focused(item.id,$event)" [open]="true" [focusReturn]="item.focusReturn??null" [lifetimeKey]="item.revision" [message]="item.message" [severity]="item.severity??'info'" [autoDismiss]="item.autoDismiss??true" [durationSeconds]="item.durationSeconds??5" position="inline" [showCloseButton]="item.showCloseButton??true" [actionLabel]="item.actionLabel??null" [pauseOnHover]="item.pauseOnHover??true" [pauseOnFocus]="item.pauseOnFocus??true" (action)="action.emit(item)" (dismissed)="closed(item,$event)" />}</div>}`,
    styles: `:host{display:contents;}:host([hidden]){display:none;}.ui-notification-stack{position:fixed;z-index:1;display:grid;gap:var(--ui-space-control-gap);inline-size:min(var(--ui-size-dialog),calc(100vw - 2 * var(--ui-space-section)));max-block-size:calc(100dvh - 2 * var(--ui-space-section));overflow:auto;overflow-wrap:anywhere;pointer-events:none;}.ui-notification-stack>ui-snackbar{pointer-events:auto;}` + positionStyles,
})
export class NotificationHost {
    readonly maxConcurrency = input(1);
    readonly dedup = input<NotificationDedup>('ignore');
    readonly position = input<NotificationPosition>('bottom-center');
    readonly action = output<NotificationRecord>();
    readonly dismissed = output<{
        notification: NotificationRecord;
        reason: NotificationDismissReason;
    }>();
    protected readonly positions = positions;
    private readonly service = inject(NotificationService);
    protected readonly visible = computed(() => this.service.notifications().slice(0, this.maxConcurrency()));
    constructor() { const detach = this.service.attachHost(); inject(DestroyRef).onDestroy(detach); effect(() => { if (!Number.isSafeInteger(this.maxConcurrency()) || this.maxConcurrency() <= 0)
        throw new Error('NotificationHost maxConcurrency must be a positive integer.'); this.service.configure(this.dedup()); }); }
    protected at(position: NotificationPosition): readonly ScopedNotificationRecord[] { return this.visible().filter(item => (item.position ?? this.position()) === position); }
    protected focused(id: string, focused: boolean): void { this.service.focusNotification(id, focused); }
    protected closed(notification: NotificationRecord, reason: NotificationDismissReason): void { this.service.dismiss(notification.id, notification.revision); this.dismissed.emit({ notification, reason }); }
}
/** A modal/panel may own a separate interactive notification host in its own DOM scope. */
@Directive({ selector: '[uiNotificationScope]', standalone: true, providers: [NotificationService] })
export class NotificationScope {
}
