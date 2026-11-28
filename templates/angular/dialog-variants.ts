import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import { NgComponentOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, Injectable, InjectionToken, Injector, input, output, signal, Type, viewChild, DestroyRef, ElementRef, untracked } from '@angular/core';
import { DIALOG_INITIAL_FOCUS, Dialog, DialogTemplate, DialogCloseRequest, type DialogCloseReason, type DialogResult } from './dialog';
import { ActionControl, type ActionTone } from './action-control';
/** Confirmation result is UI intent, not a guarantee that a backend mutation succeeded. */
@Component({ selector: 'ui-confirm-dialog', standalone: true, imports: [Dialog, DialogTemplate, ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    viewProviders: [{
        provide: DIALOG_INITIAL_FOCUS,
        useFactory: () => {
            const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
            return (dialog: HTMLDialogElement) => dialog.parentElement === host
                ? dialog.querySelector<HTMLButtonElement>(':scope > .ui-dialog__footer > button[data-confirm-cancel-focus]:enabled')
                : null;
        },
    }],
    template: `<dialog uiDialog [label]="label()" [title]="title()||label()" [open]="open()" (openChange)="openChange.emit($event)" [showHeader]="true" [busy]="busy()" [closeOnOutsideClick]="closeOnOutsideClick()" (closeRequested)="closeRequested.emit($event)" (completed)="completed.emit($event)"><p>{{message()}}</p><ng-content /><ng-template uiDialogTemplate="footer" let-context><button uiAction variant="primary" [tone]="confirmTone()" [disabled]="context.busy" (click)="context.finish('confirm',true)">{{uiEffective_confirmLabel()}}</button><button uiAction [attr.data-confirm-cancel-focus]="confirmTone() === 'danger' ? '' : null" [disabled]="context.busy" (click)="context.finish('cancel',false)">{{uiEffective_cancelLabel()}}</button></ng-template></dialog>` })
export class ConfirmDialog {
 protected readonly uiText_ConfirmDialog=injectUiMessageText();
    readonly label = input.required<string>();
    readonly message = input.required<string>();
    readonly title = input('');
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly busy = input(false, { transform: booleanAttribute });
    readonly confirmLabel = input<string>();
    readonly confirmTone = input<ActionTone | null>(null);
 protected readonly uiEffective_confirmLabel=uiLocaleComputed(()=>this.confirmLabel()??this.uiText_ConfirmDialog("uiFoundation.confirmDialog.confirmation"));
    readonly cancelLabel = input<string>();
 protected readonly uiEffective_cancelLabel=uiLocaleComputed(()=>this.cancelLabel()??this.uiText_ConfirmDialog("uiFoundation.confirmDialog.cancel"));
    readonly closeOnOutsideClick = input(false, { transform: booleanAttribute });
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
}
@Component({ selector: 'ui-alert-dialog', standalone: true, imports: [Dialog, DialogTemplate, ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<dialog uiDialog role="alertdialog" [label]="label()" [open]="open()" (openChange)="openChange.emit($event)" [showHeader]="true" [closable]="false" [closeOnEscape]="false" (closeRequested)="closeRequested.emit($event)" (completed)="completed.emit($event)"><p>{{message()}}</p><ng-content /><ng-template uiDialogTemplate="footer" let-context><button uiAction variant="primary" autofocus (click)="context.finish('confirm',true)">{{uiEffective_acknowledgeLabel()}}</button></ng-template></dialog>` })
export class AlertDialog {
 protected readonly uiText_AlertDialog=injectUiMessageText();
    readonly label = input.required<string>();
    readonly message = input.required<string>();
    readonly acknowledgeLabel = input<string>();
 protected readonly uiEffective_acknowledgeLabel=uiLocaleComputed(()=>this.acknowledgeLabel()??this.uiText_AlertDialog("uiFoundation.alertDialog.acknowledged"));
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
}
@Component({ selector: 'ui-form-dialog', standalone: true, imports: [Dialog, DialogTemplate, ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `fieldset{min-inline-size:0;margin-block:var(--ui-space-field);padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);}legend{max-inline-size:100%;overflow-wrap:anywhere;}.ui-form-dialog-guard-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-field);}[role="status"]:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}`,
    template: `<dialog uiDialog [label]="label()" [title]="label()" [open]="open()" (openChange)="changed($event)" [showHeader]="true" [busy]="busy()" [closeOnOutsideClick]="closeOnOutsideClick()" (closeRequested)="requested($event)" (completed)="completed.emit($event)">
  <ng-content /><p #saveStatus tabindex="-1" role="status" aria-atomic="true">{{busy()?('uiFoundation.formDialog.saving' | uiStableMessage):error()}}</p>
  @if(held();as request){<fieldset><legend>{{'uiFoundation.formDialog.closeWithUnsavedChanges' | uiStableMessage}}</legend><div class="ui-form-dialog-guard-actions"><button #keepButton uiAction [disabled]="busy()" (click)="keepEditing()">{{'uiFoundation.formDialog.keepEditing' | uiStableMessage}}</button><button uiAction variant="danger" [disabled]="busy()" (click)="discard(request)">{{'uiFoundation.formDialog.closeWithoutSaving' | uiStableMessage}}</button></div></fieldset>}
  <ng-template uiDialogTemplate="footer"><button #saveButton uiAction variant="primary" [disabled]="busy()||!valid()" (click)="save()">{{uiEffective_saveLabel()}}</button><button uiAction [disabled]="busy()" (click)="cancel()">{{'uiFoundation.formDialog.cancel' | uiStableMessage}}</button></ng-template>
 </dialog>` })
export class FormDialog {
 protected readonly uiText_FormDialog=injectUiMessageText();
    readonly label = input.required<string>();
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly busy = input(false, { transform: booleanAttribute });
    readonly dirty = input(false, { transform: booleanAttribute });
    readonly valid = input(true, { transform: booleanAttribute });
    readonly error = input('');
    readonly saveLabel = input<string>();
 protected readonly uiEffective_saveLabel=uiLocaleComputed(()=>this.saveLabel()??this.uiText_FormDialog("uiFoundation.formDialog.save"));
    readonly closeOnOutsideClick = input(false, { transform: booleanAttribute });
    readonly saveRequested = output<void>();
    readonly closeRequested = output<DialogCloseRequest>();
    readonly closeHeld = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
    protected readonly held = signal<DialogCloseRequest | null>(null);
    private readonly dialog = viewChild(Dialog);
    private discardAllowed = false;
    private readonly saveButton = viewChild<unknown, ElementRef<HTMLButtonElement>>('saveButton', { read: ElementRef });
    private readonly saveStatus = viewChild<unknown, ElementRef<HTMLParagraphElement>>('saveStatus', { read: ElementRef });
    private readonly saveFocus = signal<HTMLButtonElement | null>(null);
    private saveWasBusy = false;
    private readonly keepButton = viewChild<unknown, ElementRef<HTMLButtonElement>>('keepButton', { read: ElementRef });
    constructor() {
        afterRenderEffect(() => { if (this.held())
            this.revealFocus(this.keepButton()?.nativeElement); });
        afterRenderEffect(() => {
            const previous = this.saveFocus(), busy = this.busy(), open = this.open(), button = this.saveButton()?.nativeElement, status = this.saveStatus()?.nativeElement;
            untracked(() => {
                if (!previous) return;
                if (!open || !button?.closest('dialog')?.open) {
                    this.saveFocus.set(null); this.saveWasBusy = false; return;
                }
                if (busy) {
                    this.saveWasBusy = true;
                    const document = previous.ownerDocument;
                    if (document.activeElement === previous || document.activeElement === document.body || document.activeElement === document.documentElement)
                        this.revealFocus(status);
                    return;
                }
                const wasBusy = this.saveWasBusy;
                this.saveFocus.set(null); this.saveWasBusy = false;
                const document = previous.ownerDocument;
                if (wasBusy && (document.activeElement === status || document.activeElement === document.body || document.activeElement === document.documentElement)) {
                    if (!button.disabled) this.revealFocus(button);
                    else this.focusEditor();
                }
            });
        });
    }
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
    protected save(): void { if (!this.busy() && this.valid()) {
        const button = this.saveButton()?.nativeElement;
        this.saveWasBusy = false;
        this.saveFocus.set(button && button.ownerDocument.activeElement === button ? button : null);
        this.saveRequested.emit();
    } }
    protected cancel(): void { this.dialog()?.finish('cancel'); }
    /** App calls after validation/persistence succeeds; failure leaves content and errors visible. */
    complete(value?: unknown, returnValue = ''): boolean { const closed = this.dialog()?.complete(value, returnValue) ?? false; if (closed)
        this.held.set(null); return closed; }
    private revealFocus(element?: HTMLElement): void {
        element?.focus({ preventScroll: true });
        if (element && element.ownerDocument.activeElement === element) element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    private focusEditor(): void {
        this.dialog()?.focusFirst();
        const owner = this.saveButton()?.nativeElement.closest('dialog'), active = owner?.ownerDocument.activeElement;
        if (active instanceof HTMLElement && active !== owner && owner?.contains(active)) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
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
