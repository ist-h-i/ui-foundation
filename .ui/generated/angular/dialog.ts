import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessage,UiStableMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, DestroyRef, Directive, ElementRef, inject, input, output, signal, TemplateRef, untracked, } from '@angular/core';
import { ActionControl } from './action-control';
import { restoreFocus, tabbableElements } from './focus';
import { OverlayRegistry } from './overlay';
import { MoveHandle, ResizeHandle, type PanelRect } from './panel-handle';
export type DialogCloseReason = 'escape' | 'outside' | 'close-button' | 'confirm' | 'cancel' | 'programmatic' | 'native';
export interface DialogResult<T = unknown> {
    reason: DialogCloseReason;
    value: T | undefined;
    returnValue: string;
}
/** Synchronous veto. The app can retain this request and later call dialog.finish(). */
export class DialogCloseRequest<T = unknown> {
    private prevented = false;
    constructor(readonly reason: DialogCloseReason, readonly value: T | undefined, readonly returnValue: string) { }
    get defaultPrevented(): boolean { return this.prevented; }
    preventDefault(): void { this.prevented = true; }
}
export interface DialogContext {
    busy: boolean;
    finish: (reason: DialogCloseReason, value?: unknown, returnValue?: string) => boolean;
}
export type DialogArea = 'header' | 'body' | 'footer';
@Directive({ selector: 'ng-template[uiDialogTemplate]', standalone: true })
export class DialogTemplate {
    readonly uiDialogTemplate = input.required<DialogArea>();
    readonly template = inject<TemplateRef<{
        $implicit: DialogContext;
    }>>(TemplateRef);
    static ngTemplateContextGuard(_directive: DialogTemplate, _context: unknown): _context is {
        $implicit: DialogContext;
    } { return true; }
}
/** Shared native panel rendering; Drawer and BottomSheet add concrete geometry. */
export const DIALOG_HEADER_TEMPLATE = `
    <header [hidden]="!showHeader()" class="ui-dialog__header">
      <div class="ui-dialog__title">
        @if (template('header'); as header) { <ng-container [ngTemplateOutlet]="header.template" [ngTemplateOutletContext]="{$implicit:context()}" /> }
        @else { <ng-content select="[uiDialogHeader]" /><h2>{{ title() || label() }}</h2> }
      </div>
      <div class="ui-dialog__handles">
        @if (draggable()) { <button uiAction uiMoveHandle [target]="element" [uiHandleDisabled]="busy() || maximized()" [disabled]="busy() || maximized()" (rectChange)="setRect($event)" [attr.aria-label]="'uiFoundation.dialog.moveLabel' | uiStableMessage" [attr.title]="'uiFoundation.dialog.moveInstructions' | uiStableMessage">{{'uiFoundation.dialog.moveAction' | uiStableMessage}}</button> }
        @if (maximizable()) { <button uiAction [disabled]="busy()" [attr.aria-pressed]="maximized()" (click)="toggleMaximized()">{{ maximized() ? ('uiFoundation.dialog.restoreSize' | uiStableMessage) : ('uiFoundation.dialog.maximize' | uiStableMessage) }}</button> }
        @if (closable()) { <button uiAction class="ui-dialog__close" [disabled]="busy()" (click)="finish('close-button')" [attr.aria-label]="'uiFoundation.dialog.closeLabel' | uiStableMessage">{{'uiFoundation.dialog.closeAction' | uiStableMessage}}</button> }
      </div>
    </header>
    @if (!showHeader() && (draggable() || maximizable() || closable())) { <div class="ui-dialog__handles ui-dialog__standalone-handles">
      @if (draggable()) { <button uiAction uiMoveHandle [target]="element" [uiHandleDisabled]="busy() || maximized()" [disabled]="busy() || maximized()" (rectChange)="setRect($event)" [attr.aria-label]="'uiFoundation.dialog.moveLabel' | uiStableMessage" [attr.title]="'uiFoundation.dialog.moveInstructions' | uiStableMessage">{{'uiFoundation.dialog.moveAction' | uiStableMessage}}</button> }
      @if (maximizable()) { <button uiAction [disabled]="busy()" [attr.aria-pressed]="maximized()" (click)="toggleMaximized()">{{ maximized() ? ('uiFoundation.dialog.restoreSize' | uiStableMessage) : ('uiFoundation.dialog.maximize' | uiStableMessage) }}</button> }
      @if (closable()) { <button uiAction class="ui-dialog__close" [disabled]="busy()" (click)="finish('close-button')" [attr.aria-label]="'uiFoundation.dialog.closeLabel' | uiStableMessage">{{'uiFoundation.dialog.closeAction' | uiStableMessage}}</button> }
    </div> }
  `;
export const DIALOG_BODY_TEMPLATE = `
    <div class="ui-dialog__body">
      @if (template('body'); as body) { <ng-container [ngTemplateOutlet]="body.template" [ngTemplateOutletContext]="{$implicit:context()}" /> }
      @else { <ng-content /> }
    </div>
  `;
export const DIALOG_FOOTER_TEMPLATE = `
    <footer [hidden]="!showFooter()" class="ui-dialog__footer">
      @if (template('footer'); as footer) { <ng-container [ngTemplateOutlet]="footer.template" [ngTemplateOutletContext]="{$implicit:context()}" /> }
      @else { <ng-content select="[uiDialogFooter]" /> }
    </footer>
    @if (resizable()) { <div class="ui-dialog__handles"><button uiAction uiResizeHandle [target]="element" [uiHandleDisabled]="busy() || maximized()" [disabled]="busy() || maximized()" (rectChange)="setRect($event)" [attr.aria-label]="'uiFoundation.dialog.resizeLabel' | uiStableMessage" [attr.title]="'uiFoundation.dialog.resizeInstructions' | uiStableMessage">{{'uiFoundation.dialog.resizeAction' | uiStableMessage}}</button></div> }
    <p role="status" aria-atomic="true" class="ui-dialog__status">{{ busy() ? uiEffective_busyLabel() : '' }}</p>
  `;
export const DIALOG_TEMPLATE = DIALOG_HEADER_TEMPLATE + DIALOG_BODY_TEMPLATE + DIALOG_FOOTER_TEMPLATE;
export const DIALOG_STYLES = `
    :host { box-sizing:border-box; inline-size:min(var(--ui-size-dialog),calc(100vw - 2 * var(--ui-space-section))); min-inline-size:min(var(--ui-size-dialog-min),calc(100vw - 2 * var(--ui-space-section))); min-block-size:var(--ui-size-control); max-inline-size:calc(100vw - 2 * var(--ui-space-section)); max-block-size:calc(100dvh - 2 * var(--ui-space-section)); margin:auto; padding:var(--ui-space-section); border:var(--ui-border-control) solid var(--ui-color-border); border-radius:var(--ui-radius-surface); background:var(--ui-color-surface); color:var(--ui-color-text); font-family:var(--ui-font-body); font-size:var(--ui-text-body); font-weight:var(--ui-weight-body); line-height:var(--ui-leading-body); overflow:auto; overflow-wrap:anywhere; }
    :host:not(:modal) { z-index:1; }
    :host::backdrop { background:var(--ui-color-backdrop); }
    :host([data-size="small"]) { inline-size:min(calc(var(--ui-size-dialog) * .75),calc(100vw - 2 * var(--ui-space-section))); }
    :host([data-size="large"]) { inline-size:min(calc(var(--ui-size-dialog) * 1.5),calc(100vw - 2 * var(--ui-space-section))); }
    :host([data-size="full"]),:host([data-maximized="true"]) { inline-size:calc(100vw - 2 * var(--ui-space-section)); block-size:calc(100dvh - 2 * var(--ui-space-section)); }
    :host([data-position="top"]) { margin-block-start:var(--ui-space-section); }
    :host([data-position="bottom"]) { margin-block-end:var(--ui-space-section); }
    :host([data-position="start"]) { margin-inline-start:var(--ui-space-section); }
    :host([data-position="end"]) { margin-inline-end:var(--ui-space-section); }
    [hidden] { display:none!important; }
    .ui-dialog__header,.ui-dialog__footer,.ui-dialog__handles { display:flex; flex-wrap:wrap; align-items:center; gap:var(--ui-space-control-gap); }
    .ui-dialog__header { margin-block-end:var(--ui-space-field); }
    .ui-dialog__standalone-handles { justify-content:flex-end; margin-block-end:var(--ui-space-field); }
    .ui-dialog__title { flex:1 1 calc(var(--ui-text-heading) * 4); min-inline-size:0; }
    h2 { margin:0; font-size:var(--ui-text-heading); line-height:var(--ui-leading-heading); text-wrap:balance; }
    .ui-dialog__footer { margin-block-start:var(--ui-space-field); }
    .ui-dialog__status { color:var(--ui-color-muted); font-size:var(--ui-text-small); margin:0; }
    .ui-dialog__status:not(:empty) { margin-block-start:var(--ui-space-control-gap); }
  `;
/** Native HTML owns modal inertness and Tab confinement. DOM ancestry keeps profiles/RTL. */
@Component({
    selector: 'dialog[uiDialog]', standalone: true,
    imports: [NgTemplateOutlet, ActionControl, MoveHandle, ResizeHandle,UiStableMessagePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: DIALOG_TEMPLATE,
    host: {
        '[attr.aria-label]': 'label()', '[attr.aria-modal]': 'open() && modal() ? "true" : null',
        '[attr.aria-busy]': 'busy()', '[attr.data-size]': 'size()',
        '[attr.data-position]': 'position()', '[attr.data-maximized]': 'maximized()',
        '(cancel)': 'onCancelled($event)', '(close)': 'onClosed()',
        '(pointerdown)': 'backdropStart($event)', '(pointerup)': 'backdropEnd($event)',
    },
    styles: DIALOG_STYLES,
})
export class Dialog {
 protected readonly uiText_Dialog=injectUiMessage();
    readonly label = input.required<string>();
    readonly title = input('');
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly modal = input(true, { transform: booleanAttribute });
    readonly showHeader = input(false, { transform: booleanAttribute });
    readonly showFooter = input(true, { transform: booleanAttribute });
    readonly closable = input(true, { transform: booleanAttribute });
    readonly closeOnEscape = input(true, { transform: booleanAttribute });
    readonly closeOnOutsideClick = input(false, { transform: booleanAttribute });
    readonly size = input<'small' | 'normal' | 'large' | 'full'>('normal');
    readonly position = input<'center' | 'top' | 'bottom' | 'start' | 'end'>('center');
    readonly draggable = input(false, { transform: booleanAttribute });
    readonly resizable = input(false, { transform: booleanAttribute });
    readonly maximizable = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly busyLabel = input<string>();
 protected readonly uiEffective_busyLabel=uiLocaleComputed(()=>this.busyLabel()??this.uiText_Dialog({id:'uiFoundation.dialog.busy'}));
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
    readonly cancelled = output<void>();
    readonly closed = output<void>();
    protected readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
    protected readonly maximized = signal(false);
    private readonly rectangle = signal<PanelRect | null>(null);
    private readonly templates = contentChildren(DialogTemplate);
    private readonly registry = inject(OverlayRegistry);
    private unregister: (() => void) | null = null;
    private destroyed = false;
    private origin: HTMLElement | null = null;
    private geometrySettings: string | null = null;
    private pending: DialogResult | null = null;
    private accepted = false;
    private backdropPointer: number | null = null;
    constructor() {
        afterRenderEffect(() => {
            const wanted = this.open(), modal = this.modal(), size = this.size(), position = this.position();
            let rect = this.rectangle();
            const max = this.maximized();
            if (!this.label().trim())
                throw new Error('uiDialog label must be nonempty.');
            const areas = this.templates().map(t => t.uiDialogTemplate());
            if (new Set(areas).size !== areas.length)
                throw new Error('uiDialog requires at most one template per area.');
            untracked(() => {
                const settings = size + ':' + position;
                if (this.geometrySettings !== null && this.geometrySettings !== settings) {
                    this.rectangle.set(null);
                    rect = null;
                }
                this.geometrySettings = settings;
                if (wanted && this.element.isConnected && (!this.element.open || this.element.matches(':modal') !== modal)) {
                    if (!this.element.open) {
                        this.origin = this.element.ownerDocument.activeElement as HTMLElement | null;
                        this.accepted = false;
                        this.pending = null;
                    }
                    else {
                        this.element.close();
                        this.unregister?.();
                        this.unregister = null;
                    }
                    if (modal)
                        this.element.showModal();
                    else
                        this.element.show();
                    // A visible close must not replace the established initial content focus.
                    if (!this.showHeader() && this.element.ownerDocument.activeElement?.matches('.ui-dialog__close')) {
                        const initial = tabbableElements(this.element).find(element => !element.matches('.ui-dialog__close'));
                        if (initial) restoreFocus(initial, this.element);
                    }
                    this.unregister = this.registry.register({ element: this.element, kind: modal ? 'native-dialog' : 'popup', outside: !modal, dismiss: reason => { if (reason !== 'scope-exit' && (reason === 'escape' ? this.closeOnEscape() : this.closeOnOutsideClick()))
                            this.finish(reason); } });
                }
                else if (!wanted && this.element.open) {
                    this.pending = { reason: 'programmatic', value: undefined, returnValue: '' };
                    this.accepted = true;
                    this.element.close();
                }
                this.layout(max ? null : rect, size, position, max);
            });
        });
        inject(DestroyRef).onDestroy(() => {
            this.destroyed = true;
            this.unregister?.();
            this.unregister = null;
            if (this.element.open) {
                const owned = this.element.contains(this.element.ownerDocument.activeElement);
                this.element.close();
                if (owned) restoreFocus(this.origin);
            }
        });
    }
    protected template(area: DialogArea): DialogTemplate | undefined { return this.templates().find(t => t.uiDialogTemplate() === area); }
    protected context(): DialogContext { return { busy: this.busy(), finish: (reason, value, returnValue) => this.finish(reason, value, returnValue) }; }
    /** UI close is vetoable; an app input open=false is an explicit programmatic close. */
    finish(reason: DialogCloseReason = 'programmatic', value?: unknown, returnValue = ''): boolean { return this.requestFinish(reason, value, returnValue, false); }
    complete(value?: unknown, returnValue = ''): boolean { return this.requestFinish('confirm', value, returnValue, true); }
    focusFirst(): void { (tabbableElements(this.element).find(element => element.matches('input,textarea,select,[contenteditable]')) ?? this.element).focus({ preventScroll: true }); }
    private requestFinish(reason: DialogCloseReason, value: unknown, returnValue: string, completed: boolean): boolean {
        if (!this.element.open || this.accepted)
            return false;
        const request = new DialogCloseRequest(reason, value, returnValue);
        if (this.busy() && !completed)
            request.preventDefault();
        this.closeRequested.emit(request);
        if (request.defaultPrevented)
            return false;
        this.pending = { reason, value, returnValue };
        this.accepted = true;
        this.unregister?.();
        this.unregister = null;
        if (reason === 'escape')
            this.cancelled.emit();
        this.element.close(returnValue);
        return true;
    }
    protected onCancelled(event: Event): void { event.preventDefault(); if (this.closeOnEscape())
        this.finish('escape'); }
    protected onClosed(): void {
        if (this.destroyed || this.element.open)
            return;
        this.unregister?.();
        this.unregister = null;
        const result = this.pending ?? { reason: 'native' as const, value: undefined, returnValue: this.element.returnValue };
        this.pending = null;
        this.accepted = false;
        this.openChange.emit(false);
        this.closed.emit();
        this.completed.emit(result);
        const active = this.element.ownerDocument.activeElement;
        // UA close usually restores the invoker. A nonmodal external close must
        // not take focus from an unrelated action selected in the meantime.
        if (active === this.origin || active === this.element.ownerDocument.body || this.element.contains(active)) restoreFocus(this.origin);
        this.origin = null;
    }
    private outside(event: PointerEvent): boolean { const box = this.element.getBoundingClientRect(); return event.target === this.element && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom); }
    protected backdropStart(event: PointerEvent): void { this.backdropPointer = this.closeOnOutsideClick() && event.button === 0 && this.outside(event) ? event.pointerId : null; }
    protected backdropEnd(event: PointerEvent): void { const dismiss = this.backdropPointer === event.pointerId && this.outside(event); this.backdropPointer = null; if (dismiss)
        this.finish('outside'); }
    protected setRect(rect: PanelRect): void {
        this.rectangle.set(rect);
        // Apply each native key intent before a following key reads the target bounds.
        this.layout(this.maximized() ? null : rect, this.size(), this.position(), this.maximized());
    }
    protected resetGeometry(): void { this.rectangle.set(null); }
    protected toggleMaximized(): void { if (!this.busy())
        this.maximized.update(value => !value); }
    private layout(rect: PanelRect | null, _size: string, _position: string, max: boolean): void {
        // Inline geometry is only generated by a user move/resize. Clearing restores token sizes/positions.
        for (const property of ['position', 'left', 'top', 'right', 'bottom', 'margin', 'width', 'height'])
            this.element.style.removeProperty(property);
        if (rect && !max) {
            Object.assign(this.element.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', right: 'auto', bottom: 'auto', margin: '0', width: rect.width + 'px', height: rect.height + 'px' });
        }
    }
}
