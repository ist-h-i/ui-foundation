import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { Dialog, type DialogCloseRequest, type DialogResult } from './dialog';
import { ShortcutHint } from './display';
import { Icon } from './icon';
import { commandShortcut, matchesCommandShortcut, searchCommands, validNavigationId, type PaletteCommand } from './navigation-model';
/** The palette emits invocation intent. Execution, result and persistent history belong to the app. */
@Component({ selector: 'ui-command-palette', standalone: true, imports: [ActionControl, Dialog, ShortcutHint, Icon], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<dialog uiDialog #dialog [id]="controlId()" [label]="label()" [open]="opened()" (openChange)="setOpen($event)" [showHeader]="true" [showFooter]="false" [busy]="busy()" [busyLabel]="busyLabel()" [size]="size()" [closeOnOutsideClick]="closeOnOutsideClick()" (closeRequested)="closeRequested.emit($event)" (completed)="completed.emit($event)">
 <label [for]="controlId()+'-search'">{{searchLabel()}}</label><input #search autofocus class="ui-field-control" type="search" [id]="controlId()+'-search'" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" [attr.aria-expanded]="opened()" [attr.aria-controls]="controlId()+'-results'" [attr.aria-activedescendant]="activeId()?optionId(activeId()!):null" autocomplete="off" [value]="currentQuery()" (input)="searchChanged($event)" (keydown)="key($event)">
 <p class="ui-palette-summary" role="status" aria-atomic="true">{{busy()?busyLabel():results().length+'件のコマンド'}} </p>
 @if(error()){<p role="alert" class="ui-palette-error">{{error()}}</p><button uiAction [disabled]="busy()||!activeCommand()||!!activeCommand()?.disabled" (click)="invoke(activeId())">{{retryLabel()}}</button>}
 <div [id]="controlId()+'-results'" role="listbox" [attr.aria-label]="resultsLabel()" class="ui-palette-results">
 @for(group of groups();track group.name){<div role="group" [attr.aria-labelledby]="groupId(group.name)"><h3 role="presentation" aria-hidden="true" [id]="groupId(group.name)">{{group.name}}</h3>
 @for(command of group.items;track command.id){<div role="option" [id]="optionId(command.id)" [attr.data-command-id]="command.id" [attr.aria-selected]="activeId()===command.id" [attr.aria-disabled]="busy()||command.disabled?'true':null" (mousedown)="$event.preventDefault()" (click)="invoke(command.id)">@if(command.icon){<ui-icon [name]="command.icon" />}<div class="ui-palette-label"><span>{{command.label}}</span>@if(command.description){<span class="ui-palette-description">{{command.description}}</span>}</div>@if(command.shortcut){<ui-shortcut-hint [keys]="shortcutKeys(command.shortcut)" />}</div>}
 </div>}
 </div>@if(!results().length){<p>{{emptyLabel()}}</p>}
 <ng-content />
 </dialog>`,
    styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}label{display:block;font-weight:var(--ui-weight-control);margin-block-end:var(--ui-space-control-gap);}.ui-palette-summary{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}.ui-palette-error{color:var(--ui-color-danger);}.ui-palette-results{max-block-size:calc(100dvh / 2);overflow:auto;overscroll-behavior:contain;}h3{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}[role='option']{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid transparent;border-radius:var(--ui-radius-control);cursor:pointer;overflow-wrap:anywhere;}[role='option'][aria-selected='true']{border-color:var(--ui-color-focus);background:var(--ui-color-background);}[role='option'][aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}.ui-palette-label{flex:1 1 calc(var(--ui-text-body) * 6);min-inline-size:0;}.ui-palette-description{display:block;font-size:var(--ui-text-small);color:var(--ui-color-muted);}` })
export class CommandPalette {
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
    readonly busyLabel = input('コマンドを実行しています。');
    readonly searchLabel = input('コマンドを検索');
    readonly resultsLabel = input('実行できるコマンド');
    readonly defaultGroup = input('コマンド');
    readonly emptyLabel = input('該当するコマンドはありません。');
    readonly retryLabel = input('選択中のコマンドを再試行');
    readonly size = input<'small' | 'normal' | 'large' | 'full'>('large');
    readonly commandRequested = output<PaletteCommand>();
    readonly closeRequested = output<DialogCloseRequest>();
    readonly completed = output<DialogResult>();
    protected readonly opened = linkedSignal(() => this.open());
    protected readonly currentQuery = linkedSignal(() => this.query());
    private readonly history = linkedSignal(() => this.recentIds());
    protected readonly results = computed(() => searchCommands(this.commands(), this.currentQuery(), this.history()));
    private readonly active = signal<string | null>(null);
    private readonly pending = signal(false);
    protected readonly activeId = computed(() => this.displayed().some(command => command.id === this.active()) ? this.active() : this.displayed()[0]?.id ?? null);
    protected readonly activeCommand = computed(() => this.results().find(command => command.id === this.activeId()));
    protected readonly groups = computed(() => { const groups = new Map<string, PaletteCommand[]>(); for (const command of this.results()) {
        const name = command.group ?? this.defaultGroup(), items = groups.get(name) ?? [];
        items.push(command);
        groups.set(name, items);
    } return [...groups].map(([name, items]) => ({ name, items })); });
    private readonly displayed = computed(() => this.groups().flatMap(group => group.items));
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly dialog = viewChild(Dialog);
    private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
    protected readonly shortcutKeys = (value: string) => value.split('+');
    constructor() {
        const listener = (event: KeyboardEvent) => {
            if (event.repeat)
                return;
            const scope = this.shortcutScope() ?? this.element.closest('ui-overlay-host') ?? this.element.ownerDocument.body;
            if (!scope.contains(event.target as Node) || scope.closest('[hidden],[inert]'))
                return;
            const modal = this.element.ownerDocument.querySelector('dialog:modal');
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
        this.element.ownerDocument.addEventListener('keydown', listener);
        inject(DestroyRef).onDestroy(() => this.element.ownerDocument.removeEventListener('keydown', listener));
        afterRenderEffect(() => { if (!validNavigationId(this.controlId()) || [this.label(), this.busyLabel(), this.searchLabel(), this.resultsLabel(), this.defaultGroup(), this.emptyLabel(), this.retryLabel()].some(value => !value.trim()))
            throw new Error('CommandPalette requires a valid controlId and nonempty labels.'); if (!Number.isSafeInteger(this.historyLimit()) || this.historyLimit() < 1)
            throw new Error('CommandPalette historyLimit must be a positive integer.'); commandShortcut(this.shortcut()); const scope = this.shortcutScope(); if (scope && scope.ownerDocument !== this.element.ownerDocument)
            throw new Error('CommandPalette shortcutScope must belong to the same document.'); this.results(); this.pending(); const busy = this.busy(), active = this.activeId(); untracked(() => { if (!busy)
            this.pending.set(false); if (active && this.opened())
            this.element.querySelector<HTMLElement>('#' + CSS.escape(this.optionId(active)))?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }); });
    }
    private dialogElement(): HTMLDialogElement | null { return this.element.querySelector('dialog'); }
    protected optionId(id: string): string { return this.controlId() + '-command-' + encodeURIComponent(id); }
    protected groupId(name: string): string { return this.controlId() + '-group-' + encodeURIComponent(name); }
    show(): void { if (this.opened())
        return; this.pending.set(false); this.opened.set(true); this.openChange.emit(true); }
    close(): boolean { return this.dialog()?.finish('cancel') ?? false; }
    complete(value: unknown = undefined): boolean { return this.dialog()?.complete(value) ?? false; }
    protected setOpen(open: boolean): void { this.opened.set(open); if (!open)
        this.pending.set(false); this.openChange.emit(open); }
    protected searchChanged(event: Event): void { const value = (event.target as HTMLInputElement).value; this.currentQuery.set(value); this.active.set(null); this.queryChange.emit(value); }
    protected invoke(id: string | null): void { const command = this.results().find(command => command.id === id); if (!command || command.disabled || this.busy() || this.pending())
        return; this.pending.set(true); this.active.set(command.id); const history = [command.id, ...this.history().filter(id => id !== command.id)].slice(0, this.historyLimit()); this.history.set(history); this.historyChange.emit(history); this.commandRequested.emit(command); if (this.closeOnSelect())
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
