import { NgComponentOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, Injectable, InjectionToken, Injector, input, output, signal, Type, viewChild, DestroyRef, ElementRef, untracked } from '@angular/core';
import { Dialog, DialogTemplate, DialogCloseRequest, type DialogCloseReason, type DialogResult } from './dialog';
import { ActionControl } from './action-control';
/** Confirmation result is UI intent, not a guarantee that a backend mutation succeeded. */
@Component({ selector: 'ui-confirm-dialog', standalone: true, imports: [Dialog, DialogTemplate, ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<dialog uiDialog [label]="label()" [title]="title()||label()" [open]="open()" (openChange)="openChange.emit($event)" [showHeader]="true" [busy]="busy()" [closeOnOutsideClick]="closeOnOutsideClick()" (closeRequested)="closeRequested.emit($event)" (completed)="completed.emit($event)"><p>{{message()}}</p><ng-content /><ng-template uiDialogTemplate="footer" let-context><button uiAction variant="primary" [disabled]="context.busy" (click)="context.finish('confirm',true)">{{confirmLabel()}}</button><button uiAction [disabled]="context.busy" (click)="context.finish('cancel',false)">{{cancelLabel()}}</button></ng-template></dialog>` })
export class ConfirmDialog {
    readonly label = input.required<string>();
    readonly message = input.required<string>();
    readonly title = input('');
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly busy = input(false, { transform: booleanAttribute });
    readonly confirmLabel = input('確認');
    readonly cancelLabel = input('取消');
    readonly closeOnOutsideClick = input(false, { transform: booleanAttribute });
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
}
@Component({ selector: 'ui-alert-dialog', standalone: true, imports: [Dialog, DialogTemplate, ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<dialog uiDialog role="alertdialog" [label]="label()" [open]="open()" (openChange)="openChange.emit($event)" [showHeader]="true" [closable]="false" [closeOnEscape]="false" (closeRequested)="closeRequested.emit($event)" (completed)="completed.emit($event)"><p>{{message()}}</p><ng-content /><ng-template uiDialogTemplate="footer" let-context><button uiAction autofocus (click)="context.finish('confirm',true)">{{acknowledgeLabel()}}</button></ng-template></dialog>` })
export class AlertDialog {
    readonly label = input.required<string>();
    readonly message = input.required<string>();
    readonly acknowledgeLabel = input('確認しました');
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
}
@Component({ selector: 'ui-form-dialog', standalone: true, imports: [Dialog, DialogTemplate, ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<dialog uiDialog [label]="label()" [title]="label()" [open]="open()" (openChange)="changed($event)" [showHeader]="true" [busy]="busy()" [closeOnOutsideClick]="closeOnOutsideClick()" (closeRequested)="requested($event)" (completed)="completed.emit($event)">
  <ng-content /><p role="status" aria-atomic="true">{{error()}}</p>
  @if(held();as request){<fieldset><legend>保存していない変更があります。閉じますか。</legend><button #keepButton uiAction [disabled]="busy()" (click)="keepEditing()">編集を続ける</button><button uiAction variant="danger" [disabled]="busy()" (click)="discard(request)">変更を破棄して閉じる</button></fieldset>}
  <ng-template uiDialogTemplate="footer"><button uiAction variant="primary" [disabled]="busy()||!valid()" (click)="save()">{{saveLabel()}}</button><button uiAction [disabled]="busy()" (click)="cancel()">取消</button></ng-template>
 </dialog>` })
export class FormDialog {
    readonly label = input.required<string>();
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly busy = input(false, { transform: booleanAttribute });
    readonly dirty = input(false, { transform: booleanAttribute });
    readonly valid = input(true, { transform: booleanAttribute });
    readonly error = input('');
    readonly saveLabel = input('保存');
    readonly closeOnOutsideClick = input(false, { transform: booleanAttribute });
    readonly saveRequested = output<void>();
    readonly closeRequested = output<DialogCloseRequest>();
    readonly closeHeld = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
    protected readonly held = signal<DialogCloseRequest | null>(null);
    private readonly dialog = viewChild(Dialog);
    private discardAllowed = false;
    private readonly keepButton = viewChild<unknown, ElementRef<HTMLButtonElement>>('keepButton', { read: ElementRef });
    constructor() { afterRenderEffect(() => { if (this.held())
        this.keepButton()?.nativeElement.focus({ preventScroll: true }); }); }
    protected requested(request: DialogCloseRequest): void { if (this.dirty() && request.reason !== 'confirm' && !this.discardAllowed) {
        request.preventDefault();
        this.held.set(request);
        this.closeHeld.emit(request);
    } this.closeRequested.emit(request); }
    protected changed(open: boolean): void { if (!open)
        this.held.set(null); this.openChange.emit(open); }
    protected keepEditing(): void { this.held.set(null); this.focusEditor(); }
    protected discard(request: DialogCloseRequest): void { this.discardAllowed = true; try {
        if (this.dialog()?.finish(request.reason, request.value, request.returnValue))
            this.held.set(null);
    }
    finally {
        this.discardAllowed = false;
    } }
    protected save(): void { if (!this.busy() && this.valid())
        this.saveRequested.emit(); }
    protected cancel(): void { this.dialog()?.finish('cancel'); }
    /** App calls after validation/persistence succeeds; failure leaves content and errors visible. */
    complete(value?: unknown, returnValue = ''): boolean { const closed = this.dialog()?.complete(value, returnValue) ?? false; if (closed)
        this.held.set(null); return closed; }
    private focusEditor(): void { this.dialog()?.focusFirst(); }
}
export const UI_DYNAMIC_DIALOG_DATA = new InjectionToken<unknown>('UI_DYNAMIC_DIALOG_DATA');
export const UI_DYNAMIC_DIALOG_REF = new InjectionToken<DynamicDialogRef>('UI_DYNAMIC_DIALOG_REF');
export interface DynamicDialogConfiguration {
    component: Type<unknown>;
    label: string;
    data?: unknown;
    inputs?: Record<string, unknown>;
    modal?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    size?: 'small' | 'normal' | 'large' | 'full';
    position?: 'center' | 'top' | 'bottom' | 'start' | 'end';
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
    onCloseRequest?: (request: DialogCloseRequest) => void;
}
export class DynamicDialogRef<T = unknown> {
    private resolve!: (result: DialogResult<T>) => void;
    readonly result = new Promise<DialogResult<T>>(resolve => this.resolve = resolve);
    private handler: ((reason: DialogCloseReason, value?: unknown) => boolean) | null = null;
    private done = false;
    finish(reason: DialogCloseReason = 'programmatic', value?: T): boolean { return this.handler?.(reason, value) ?? false; }
    attach(handler: (reason: DialogCloseReason, value?: unknown) => boolean): () => void { this.handler = handler; return () => { this.handler = null; }; }
    settle(result: DialogResult): void { if (this.done)
        return; this.done = true; this.handler = null; this.resolve(result as DialogResult<T>); }
}
interface DynamicSession {
    config: DynamicDialogConfiguration;
    ref: DynamicDialogRef;
}
@Injectable({ providedIn: 'root' })
export class DynamicDialogService {
    private readonly active = signal<DynamicSession | null>(null);
    readonly session = this.active.asReadonly();
    private host = false;
    attachHost(): () => void { if (this.host)
        throw new Error('One DynamicDialogHost is allowed per service scope.'); this.host = true; return () => { this.host = false; this.resolve({ reason: 'programmatic', value: undefined, returnValue: '' }); }; }
    open<T = unknown>(config: DynamicDialogConfiguration): DynamicDialogRef<T> { if (!this.host)
        throw new Error('Add a DynamicDialogHost before opening a dynamic dialog.'); if (this.active())
        throw new Error('Close the current dynamic dialog before opening another.'); if (!config.label.trim())
        throw new Error('Dynamic dialog requires a label.'); const ref = new DynamicDialogRef<T>(); this.active.set({ config, ref: ref as DynamicDialogRef }); return ref; }
    updateInputs(inputs: Record<string, unknown>): void { this.active.update(session => session ? { ...session, config: { ...session.config, inputs: { ...session.config.inputs, ...inputs } } } : null); }
    resolve(result: DialogResult): void { const session = this.active(); if (!session)
        return; this.active.set(null); session.ref.settle(result); }
}
@Component({ selector: 'ui-dynamic-dialog-host', standalone: true, imports: [NgComponentOutlet, Dialog], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `@if(session();as session){<dialog uiDialog [label]="session.config.label" [open]="true" [modal]="session.config.modal??true" [showHeader]="session.config.showHeader??true" [showFooter]="session.config.showFooter??false" [size]="session.config.size??'normal'" [position]="session.config.position??'center'" [closeOnEscape]="session.config.closeOnEscape??true" [closeOnOutsideClick]="session.config.closeOnOutsideClick??false" (closeRequested)="session.config.onCloseRequest?.($event)" (completed)="service.resolve($event)"><ng-container [ngComponentOutlet]="session.config.component" [ngComponentOutletInputs]="session.config.inputs??{}" [ngComponentOutletInjector]="contentInjector()" /></dialog>}` })
export class DynamicDialogHost {
    protected readonly service = inject(DynamicDialogService);
    protected readonly session = this.service.session;
    private readonly parent = inject(Injector);
    private readonly dialog = viewChild(Dialog);
    private detach: (() => void) | null = null;
    private readonly activeRef = computed(() => this.session()?.ref ?? null);
    protected readonly contentInjector = computed(() => { const ref = this.activeRef(), data = untracked(() => this.session()?.config.data); return Injector.create({ parent: this.parent, providers: [{ provide: UI_DYNAMIC_DIALOG_DATA, useValue: data }, { provide: UI_DYNAMIC_DIALOG_REF, useValue: ref }] }); });
    constructor() { const detach = this.service.attachHost(); afterRenderEffect(() => { const dialog = this.dialog(), ref = this.activeRef(); untracked(() => { this.detach?.(); this.detach = dialog && ref ? ref.attach((reason, value) => dialog.finish(reason, value)) : null; }); }); inject(DestroyRef).onDestroy(() => { this.detach?.(); detach(); }); }
}
