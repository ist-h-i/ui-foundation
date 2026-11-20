import {computed as uiLocaleComputed} from '@angular/core';
import {computed as localeComputed} from '@angular/core';
import {injectUiLocale,injectUiMessageText,UiStableMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { Dialog, type DialogCloseRequest, type DialogResult } from './dialog';
import { ShortcutHint } from './display';
import { Icon } from './icon';
import { commandShortcut, matchesCommandShortcut, searchCommands, validNavigationId, type PaletteCommand } from './navigation-model';
/** The palette emits invocation intent. Execution, result and persistent history belong to the app. */
@Component({ selector: 'ui-command-palette', standalone: true, imports: [ActionControl, Dialog, ShortcutHint, Icon,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<dialog uiDialog #dialog [id]="controlId()" [label]="label()" [open]="opened()" (openChange)="setOpen($event)" [showHeader]="false" [closable]="false" [showFooter]="false" [busy]="busy()" [busyLabel]="uiEffective_busyLabel()" [size]="size()" [closeOnOutsideClick]="closeOnOutsideClick()" (closeRequested)="closeRequested.emit($event)" (completed)="completed.emit($event)">
 <div #controls class="ui-palette-controls"><div class="ui-palette-search-heading"><label [for]="controlId()+'-search'">{{uiEffective_searchLabel()}}</label><button uiAction [disabled]="busy()" (click)="dismiss()" [attr.aria-label]="'uiFoundation.commandPalette.closeDialog' | uiStableMessage">{{'uiFoundation.commandPalette.close' | uiStableMessage}}</button></div><input #search autofocus class="ui-field-control" type="search" [id]="controlId()+'-search'" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" [attr.aria-expanded]="opened()" [attr.aria-controls]="controlId()+'-results'" [attr.aria-activedescendant]="activeId()?optionId(activeId()!):null" autocomplete="off" (focus)="revealActive()" [value]="currentQuery()" (input)="searchChanged($event)" (keydown)="key($event)">
 <p class="ui-palette-summary" role="status" aria-atomic="true">{{busy()?uiEffective_busyLabel():('uiFoundation.commandPalette.commandsCount' | uiStableMessage:{count:results().length})}} </p></div>
 @if(error()){<div #recovery class="ui-palette-recovery"><p #errorText role="alert" aria-atomic="true" tabindex="0" class="ui-palette-error">{{error()}}</p><button #retry uiAction [disabled]="busy()||!activeCommand()||!!activeCommand()?.disabled" (click)="invoke(activeId())" [attr.aria-label]="uiEffective_retryLabel()">{{retryLabel()??('uiFoundation.commandPalette.retry' | uiStableMessage)}}</button></div>}
 <div [id]="controlId()+'-results'" role="listbox" [attr.aria-label]="uiEffective_resultsLabel()" class="ui-palette-results">
 @for(group of groups();track group.name){<div role="group" [attr.aria-labelledby]="groupId(group.name)"><h3 role="presentation" aria-hidden="true" [id]="groupId(group.name)">{{group.name}}</h3>
 @for(command of group.items;track command.id){<div role="option" [id]="optionId(command.id)" [attr.data-command-id]="command.id" [attr.aria-selected]="activeId()===command.id" [attr.aria-disabled]="busy()||command.disabled?'true':null" (mousedown)="$event.preventDefault()" (click)="invoke(command.id)">@if(command.icon){<ui-icon [name]="command.icon" />}<div class="ui-palette-label"><span>{{command.label}}</span>@if(command.description){<span class="ui-palette-description">{{command.description}}</span>}</div>@if(command.shortcut){<ui-shortcut-hint [keys]="shortcutKeys(command.shortcut)" />}</div>}
 </div>}
 </div>@if(!results().length){<p>{{uiEffective_emptyLabel()}}</p>}
 <ng-content />
 </dialog>`,
    styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}label{display:block;font-weight:var(--ui-weight-control);margin:0;min-inline-size:0;flex:1 1 calc(var(--ui-text-body) * 4);}.ui-palette-search-heading{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);margin-block-end:var(--ui-space-control-gap);}.ui-palette-controls{position:sticky;inset-block-start:0;z-index:1;display:flow-root;background:var(--ui-color-surface);margin-block-end:var(--ui-space-control-gap);}.ui-palette-summary{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}.ui-palette-recovery{position:sticky;z-index:1;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:var(--ui-space-control-gap);overflow:hidden;background:var(--ui-color-surface);margin-block-end:var(--ui-space-control-gap);}.ui-palette-recovery button:focus-visible{outline-offset:calc(-1 * var(--ui-border-focus));}.ui-palette-error{min-block-size:0;margin:0;color:var(--ui-color-danger);overflow:auto;overscroll-behavior:contain;}.ui-palette-error:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}.ui-palette-recovery[data-recovery-scroll='true']{display:block;overflow:auto;overscroll-behavior:contain;}.ui-palette-recovery[data-recovery-scroll='true'] .ui-palette-error{overflow:visible;margin-block-end:var(--ui-space-control-gap);}.ui-palette-results{max-block-size:calc(100dvh / 2);overflow:auto;overscroll-behavior:contain;}h3{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}[role='option']{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid transparent;border-radius:var(--ui-radius-control);cursor:pointer;overflow-wrap:anywhere;}[role='option'][aria-selected='true']{border-color:var(--ui-color-focus);background:var(--ui-color-background);}[role='option'][aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}.ui-palette-label{flex:1 1 calc(var(--ui-text-body) * 4);min-inline-size:0;}.ui-palette-description{display:block;font-size:var(--ui-text-small);color:var(--ui-color-muted);}` })
export class CommandPalette {
 protected readonly uiText_CommandPalette=injectUiMessageText();
 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly commands = input<readonly PaletteCommand[]>([]);
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly query = input('');
    readonly queryChange = output<string>();
    readonly recentIds = input<readonly string[]>([]);
    readonly historyChange = output<readonly string[]>();
    readonly historyLimit = input(10);
    readonly shortcut = input<string | null>(null);
    readonly shortcutScope = input<HTMLElement | null>(null);
    readonly closeOnSelect = input(false, { transform: booleanAttribute });
    readonly closeOnOutsideClick = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly error = input('');
    readonly busyLabel = input<string>();
 protected readonly uiEffective_busyLabel=uiLocaleComputed(()=>this.busyLabel()??this.uiText_CommandPalette("uiFoundation.commandPalette.runningTheCommand"));
    readonly searchLabel = input<string>();
 protected readonly uiEffective_searchLabel=uiLocaleComputed(()=>this.searchLabel()??this.uiText_CommandPalette("uiFoundation.commandPalette.searchCommands"));
    readonly resultsLabel = input<string>();
 protected readonly uiEffective_resultsLabel=uiLocaleComputed(()=>this.resultsLabel()??this.uiText_CommandPalette("uiFoundation.commandPalette.availableCommands"));
    readonly defaultGroup = input<string>();
 protected readonly uiEffective_defaultGroup=uiLocaleComputed(()=>this.defaultGroup()??this.uiText_CommandPalette("uiFoundation.commandPalette.commandsForCommandPalette"));
    readonly emptyLabel = input<string>();
 protected readonly uiEffective_emptyLabel=uiLocaleComputed(()=>this.emptyLabel()??this.uiText_CommandPalette("uiFoundation.commandPalette.noMatchingCommands"));
    readonly retryLabel = input<string>();
 protected readonly uiEffective_retryLabel=uiLocaleComputed(()=>this.retryLabel()??this.uiText_CommandPalette("uiFoundation.commandPalette.retrySelectedCommand"));
    readonly size = input<'small' | 'normal' | 'large' | 'full'>('large');
    readonly commandRequested = output<PaletteCommand>();
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
    protected readonly opened = linkedSignal(() => this.open());
    protected readonly currentQuery = linkedSignal(() => this.query());
    private readonly history = linkedSignal(() => this.recentIds());
    protected readonly results = computed(() => searchCommands(this.commands(), this.currentQuery(), this.history(),this.effectiveLocale()));
    private readonly active = signal<string | null>(null);
    private readonly pending = signal(false);
    protected readonly activeId = computed(() => this.displayed().some(command => command.id === this.active()) ? this.active() : this.displayed()[0]?.id ?? null);
    protected readonly activeCommand = computed(() => this.results().find(command => command.id === this.activeId()));
    protected readonly groups = computed(() => { const groups = new Map<string, PaletteCommand[]>(); for (const command of this.results()) {
        const name = command.group ?? this.uiEffective_defaultGroup(), items = groups.get(name) ?? [];
        items.push(command);
        groups.set(name, items);
    } return [...groups].map(([name, items]) => ({ name, items })); });
    private readonly displayed = computed(() => this.groups().flatMap(group => group.items));
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly dialog = viewChild(Dialog);
    private readonly controls = viewChild<ElementRef<HTMLElement>>('controls');
    private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
    private readonly recovery = viewChild<ElementRef<HTMLElement>>('recovery');
    private readonly errorText = viewChild<ElementRef<HTMLElement>>('errorText');
    private readonly retry = viewChild<unknown, ElementRef<HTMLElement>>('retry', { read: ElementRef });
    private revealFrame: number | null = null;
    private displayedError = '';
    protected readonly shortcutKeys = (value: string) => value.split('+');
    constructor() {
        const listener = (event: KeyboardEvent) => {
            if (event.repeat)
                return;
            const scope = this.shortcutScope() ?? this.element.closest('ui-overlay-host') ?? this.element.ownerDocument.body;
            if (!scope.contains(event.target as Node) || scope.closest('[hidden],[inert]'))
                return;
            // Native modal inertness is not reflected as an inert attribute.
            // The focused modal is the active scope, including nested dialogs;
            // DOM order alone does not describe the browser's top-layer stack.
            const document = this.element.ownerDocument;
            const modal = document.activeElement?.closest<HTMLDialogElement>('dialog:modal')
                ?? Array.from(document.querySelectorAll<HTMLDialogElement>('dialog:modal')).at(-1);
            if (modal && !modal.contains(this.element) && modal !== this.dialogElement())
                return;
            if (matchesCommandShortcut(event, commandShortcut(this.shortcut()))) {
                event.preventDefault();
                if (!this.opened())
                    this.show();
                else
                    this.search()?.nativeElement.focus({ preventScroll: true });
                return;
            }
            if (this.opened()) {
                const command = this.results().find(command => command.shortcut && matchesCommandShortcut(event, commandShortcut(command.shortcut)));
                if (command) {
                    event.preventDefault();
                    this.invoke(command.id);
                }
            }
        };
        const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.revealActive());
        afterRenderEffect(() => { const controls = this.controls()?.nativeElement, recovery = this.recovery()?.nativeElement; resize?.disconnect(); for (const element of [controls, recovery, this.dialogElement()]) if (element) resize?.observe(element); });
        this.element.ownerDocument.addEventListener('keydown', listener);
        inject(DestroyRef).onDestroy(() => {
            this.element.ownerDocument.removeEventListener('keydown', listener);
            resize?.disconnect();
            if (this.revealFrame !== null) this.element.ownerDocument.defaultView?.cancelAnimationFrame(this.revealFrame);
        });
        afterRenderEffect(() => { if (!validNavigationId(this.controlId()) || [this.label(), this.uiEffective_busyLabel(), this.uiEffective_searchLabel(), this.uiEffective_resultsLabel(), this.uiEffective_defaultGroup(), this.uiEffective_emptyLabel(), this.uiEffective_retryLabel()].some(value => !value.trim()))
            throw new Error('CommandPalette requires a valid controlId and nonempty labels.'); if (!Number.isSafeInteger(this.historyLimit()) || this.historyLimit() < 1)
            throw new Error('CommandPalette historyLimit must be a positive integer.'); commandShortcut(this.shortcut()); const scope = this.shortcutScope(); if (scope && scope.ownerDocument !== this.element.ownerDocument)
            throw new Error('CommandPalette shortcutScope must belong to the same document.'); this.results(); this.pending(); this.activeId(); const busy = this.busy(), open = this.opened(), error = this.error(); untracked(() => { if (!busy)
            this.pending.set(false); if (error !== this.displayedError) { this.displayedError = error; const text = this.errorText()?.nativeElement, recovery = this.recovery()?.nativeElement; if (text) text.scrollTop = 0; if (recovery) recovery.scrollTop = 0; } if (open) this.revealActive(); }); });
    }
    protected revealActive(): void {
        const view = this.element.ownerDocument.defaultView;
        if (!view) return;
        if (this.revealFrame !== null) view.cancelAnimationFrame(this.revealFrame);
        this.revealFrame = view.requestAnimationFrame(() => {
            this.revealFrame = null;
            const id = this.activeId();
            const dialog = this.dialogElement();
            if (!this.opened() || !dialog?.open) return;
            const option = id ? this.element.querySelector<HTMLElement>('#' + CSS.escape(this.optionId(id))) : null;
            // Reveal the command name, which identifies Enter's action; a tall
            // description/shortcut must not align its bottom and hide the name.
            const name = option?.querySelector<HTMLElement>('.ui-palette-label > span'), controls = this.controls()?.nativeElement;
            const results = this.element.querySelector<HTMLElement>('.ui-palette-results');
            if (controls) {
                const style = view.getComputedStyle(dialog), bounds = dialog.getBoundingClientRect();
                const start = Math.max(0, bounds.top + dialog.clientTop + (parseFloat(style.paddingBlockStart) || 0));
                const end = Math.min(view.innerHeight, bounds.top + dialog.clientTop + dialog.clientHeight - (parseFloat(style.paddingBlockEnd) || 0));
                // The capacity belongs to the dialog's viewport, not the body's
                // moving rect. Native error scrolling must not resize its owner.
                const innerHeight = Math.max(0, end - start);
                let margin = controls.getBoundingClientRect().height + (parseFloat(view.getComputedStyle(controls).marginBlockEnd) || 0);
                const recovery = this.recovery()?.nativeElement, error = this.errorText()?.nativeElement, retry = this.retry()?.nativeElement;
                if (recovery && error && retry) {
                    const optionStyle = option ? view.getComputedStyle(option) : null, recoveryStyle = view.getComputedStyle(recovery);
                    const endMargin = parseFloat(recoveryStyle.marginBlockEnd) || 0, gap = parseFloat(recoveryStyle.rowGap) || 0;
                    const available = Math.max(0, innerHeight - margin - (name?.getBoundingClientRect().height ?? 0) - (parseFloat(optionStyle?.paddingBlockStart ?? '') || 0) - (parseFloat(optionStyle?.paddingBlockEnd ?? '') || 0) - endMargin);
                    const height = Math.min(view.innerHeight / 3, available), line = parseFloat(view.getComputedStyle(error).lineHeight) || error.getBoundingClientRect().height;
                    // Reserve the actual command name and keep retry fixed when it fits.
                    // In shorter viewports both text and retry remain keyboard reachable.
                    const scroll = String(height < retry.getBoundingClientRect().height + line + gap);
                    const previous = recovery.dataset['recoveryScroll'];
                    const textOffset = previous === 'true' ? recovery.scrollTop : error.scrollTop;
                    if (recovery.dataset['recoveryScroll'] !== scroll) recovery.dataset['recoveryScroll'] = scroll;
                    if (recovery.style.insetBlockStart !== margin + 'px') recovery.style.insetBlockStart = margin + 'px';
                    if (recovery.style.maxBlockSize !== height + 'px') recovery.style.maxBlockSize = height + 'px';
                    if (previous !== scroll) {
                        // A hidden overflow box retains scrollTop. Transfer the
                        // reading position when error and retry change owners.
                        recovery.scrollTop = scroll === 'true' ? textOffset : 0;
                        error.scrollTop = scroll === 'true' ? 0 : textOffset;
                    }
                    margin += recovery.getBoundingClientRect().height + endMargin;
                }
                if (results) {
                    // Give results the visible space below sticky recovery;
                    // scrolling to the final option must reach this same edge.
                    const height = Math.min(view.innerHeight / 2, Math.max(0, innerHeight - margin));
                    if (results.style.maxBlockSize !== height + 'px') results.style.maxBlockSize = height + 'px';
                    // Move only our own scrollports. A global scroll-padding
                    // also shifts native focus to the search/error/retry.
                    dialog.scrollTop += results.getBoundingClientRect().top - (start + margin);
                    if (name) {
                        const box = results.getBoundingClientRect(), target = name.getBoundingClientRect();
                        const visibleStart = Math.max(start, box.top + results.clientTop, controls.getBoundingClientRect().bottom, recovery?.getBoundingClientRect().bottom ?? start);
                        const visibleEnd = Math.min(end, box.top + results.clientTop + results.clientHeight);
                        if (target.top < visibleStart) results.scrollTop += target.top - visibleStart;
                        else if (target.bottom > visibleEnd) results.scrollTop += target.bottom - visibleEnd;
                    }
                }
            }
        });
    }
    private dialogElement(): HTMLDialogElement | null { return this.element.querySelector('dialog'); }
    protected optionId(id: string): string { return this.controlId() + '-command-' + encodeURIComponent(id); }
    protected groupId(name: string): string { return this.controlId() + '-group-' + encodeURIComponent(name); }
    show(): void { if (this.opened())
        return; this.pending.set(false); this.opened.set(true); this.openChange.emit(true); }
    protected dismiss(): void { this.dialog()?.finish('close-button'); }
    close(): boolean { return this.dialog()?.finish('cancel') ?? false; }
    complete(value: unknown = undefined): boolean { return this.dialog()?.complete(value) ?? false; }
    protected setOpen(open: boolean): void { this.opened.set(open); if (!open)
        this.pending.set(false); this.openChange.emit(open); }
    protected searchChanged(event: Event): void { const value = (event.target as HTMLInputElement).value; this.currentQuery.set(value); this.active.set(null); this.queryChange.emit(value); }
    protected invoke(id: string | null): void { const command = this.results().find(command => command.id === id); if (!command || command.disabled || this.busy() || this.pending())
        return; const retry = this.retry()?.nativeElement; if (retry && this.element.ownerDocument.activeElement === retry) this.search()?.nativeElement.focus({preventScroll:true}); this.pending.set(true); this.active.set(command.id); const history = [command.id, ...this.history().filter(id => id !== command.id)].slice(0, this.historyLimit()); this.history.set(history); this.historyChange.emit(history); this.commandRequested.emit(command); if (this.closeOnSelect())
        this.complete(command); }
    protected key(event: KeyboardEvent): void { if (event.defaultPrevented || event.isComposing || event.keyCode === 229)
        return; if (event.key === 'Enter') {
        event.preventDefault();
        this.invoke(this.activeId());
        return;
    } if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
        return; const items = this.displayed(); if (!items.length)
        return; event.preventDefault(); const index = items.findIndex(item => item.id === this.activeId()), next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; this.active.set(items[next]!.id); }
}
