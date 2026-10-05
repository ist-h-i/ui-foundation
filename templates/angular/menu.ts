import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { Icon } from './icon';
import { focusOutsideMenu, restoreFocus } from './focus';
import { OverlayRegistry, observeOverlay, positionOverlay, type OverlayPlacement } from './overlay';
import { menuCommands, menuPath, selectMenuCheck, validateMenu, visibleMenuItems, type MenuItem, type MenuSelection } from './menu-model';
export * from './menu-model';
@Component({ selector: 'ui-menu,ui-dropdown-menu,ui-context-menu', standalone: true, imports: [NgTemplateOutlet, ActionControl, Icon], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<button #anchor uiAction [id]="menuId()+'-trigger'" [disabled]="disabled()||!commands(nodes()).length" aria-haspopup="menu" [attr.aria-expanded]="opened()" [attr.aria-controls]="menuId()" (click)="toggle()" (keydown)="triggerKey($event)" (pointerenter)="hoverOpen()" (pointerleave)="hoverLeave($event)">
  <ng-content select="[uiMenuTrigger]" />{{label()}}</button>
  @if(trigger()==='context'){<div #contextTarget class="ui-menu__context" tabindex="0" [attr.aria-label]="label()+'の対象'" (contextmenu)="contextMenu($event)" (keydown)="contextKey($event)" (pointerdown)="hold($event)" (pointermove)="moveHold($event)" (pointerup)="stopHold()" (pointercancel)="stopHold()"><ng-content select="[uiMenuContext]" /></div>}
  <div #popup popover="manual" class="ui-menu__popup" [id]="menuId()" (pointerleave)="hoverLeave($event)" (pointerenter)="stopHoverClose()">
   <ul role="menu" [attr.aria-labelledby]="menuId()+'-trigger'"><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{items:visible(nodes()),parent:null,depth:0}" /></ul>
  </div>
  <ng-template #entries let-items="items" let-parent="parent" let-depth="depth">
   @for(item of items;track item.id){
    @if(item.type==='separator'){<li role="separator" aria-orientation="horizontal" class="ui-menu__separator"></li>}
    @else if(item.type==='group'){<li role="none"><ul role="group" [attr.aria-label]="item.label"><li role="presentation" class="ui-menu__group">{{item.label}}</li><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{items:visible(item.children??[]),parent:parent,depth:depth}" /></ul></li>}
    @else{<li role="none"><button type="button" [id]="itemId(item.id)" [attr.data-menu-item]="item.id" [attr.role]="role(item)" tabindex="-1" [attr.aria-disabled]="item.disabled?'true':null" [attr.aria-checked]="item.type==='checkbox'||item.type==='radio'?!!item.checked:null" [attr.aria-haspopup]="commands(item.children??[]).length?'menu':null" [attr.aria-expanded]="commands(item.children??[]).length?expanded()[depth]===item.id:null" [attr.aria-controls]="commands(item.children??[]).length?itemId(item.id)+'-children':null" (click)="select(item,depth)" (keydown)="key($event,item,parent,depth)" (pointerenter)="stopHoverClose()">
     @if(item.icon){<ui-icon [name]="item.icon" />}@if(item.type==='checkbox'||item.type==='radio'){<span aria-hidden="true">{{item.checked?'✓':'○'}}</span>}<span class="ui-menu__label">{{item.label}}</span>@if(commands(item.children??[]).length){<span aria-hidden="true">›</span>}
    </button>
    @if(expanded()[depth]===item.id&&commands(item.children??[]).length){<ul [id]="itemId(item.id)+'-children'" role="menu" [attr.aria-labelledby]="itemId(item.id)" [attr.data-menu-parent]="item.id" class="ui-menu__submenu"><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{items:visible(item.children??[]),parent:item,depth:depth+1}" />
     <li role="none"><button type="button" role="menuitem" tabindex="-1" [attr.data-menu-back]="item.id" (click)="closeLevel(depth+1)" (keydown)="key($event,null,item,depth+1)">親メニューに戻る</button></li>
    </ul>}</li>}
   }
  </ng-template>`,
    styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}.ui-menu__popup,.ui-menu__submenu{box-sizing:border-box;position:fixed;inset:auto;margin:0;inline-size:max-content;min-inline-size:min(var(--ui-size-overlay-min),calc(100vw - 2 * var(--ui-space-control-gap)));max-inline-size:calc(100vw - 2 * var(--ui-space-control-gap));padding:var(--ui-space-control-y);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-surface);color:var(--ui-color-text);font:inherit;box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow);overflow:visible;overflow-wrap:anywhere;}.ui-menu__popup>ul,.ui-menu__submenu{max-block-size:calc(100dvh - 2 * var(--ui-space-section));overflow-y:auto;overscroll-behavior:contain;}.ui-menu__popup>ul{max-block-size:calc(100dvh - 2 * var(--ui-space-section) - 2 * var(--ui-space-control-y));}ul{list-style:none;padding:0;margin:0;min-inline-size:0;}li{padding:0;margin:0;}button[data-menu-item],button[data-menu-back]{box-sizing:border-box;display:flex;align-items:center;gap:var(--ui-space-control-gap);inline-size:100%;min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);border:0;border-radius:var(--ui-radius-control);background:var(--ui-color-surface);color:var(--ui-color-text);font:inherit;text-align:start;cursor:pointer;white-space:normal;overflow-wrap:anywhere;}.ui-menu__label{flex:1;min-inline-size:0;}button[data-menu-item]:focus-visible,button[data-menu-back]:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}button[data-menu-item]:hover,button[data-menu-back]:hover{background:var(--ui-color-background);}button[aria-disabled="true"]{color:var(--ui-color-muted);cursor:not-allowed;}.ui-menu__group{font-size:var(--ui-text-small);font-weight:var(--ui-weight-control);padding:var(--ui-space-control-y);color:var(--ui-color-muted);}.ui-menu__separator{border-block-start:var(--ui-border-control) solid var(--ui-color-border);margin-block:var(--ui-space-control-gap);}.ui-menu__context{padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);margin-block:var(--ui-space-control-gap);}.ui-menu__context:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}`,
})
export class Menu {
    readonly menuId = input.required<string>();
    readonly label = input.required<string>();
    readonly items = input<readonly MenuItem[]>([]);
    readonly itemsChange = output<readonly MenuItem[]>();
    readonly selected = output<MenuSelection>();
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly trigger = input<'click' | 'hover' | 'context'>('click');
    readonly placement = input<OverlayPlacement>('bottom-start');
    readonly closeOnSelect = input(true, { transform: booleanAttribute });
    readonly disabled = input(false, { transform: booleanAttribute });
    protected readonly opened = linkedSignal(() => this.open());
    private readonly currentItems = linkedSignal(() => this.items());
    protected readonly nodes = computed(() => validateMenu(this.currentItems()));
    protected readonly expanded = signal<readonly string[]>([]);
    private readonly pendingFocus = signal<string | null>(null);
    protected readonly visible = visibleMenuItems;
    protected readonly commands = menuCommands;
    private readonly anchor = viewChild<unknown, ElementRef<HTMLButtonElement>>('anchor', { read: ElementRef });
    private readonly popup = viewChild<unknown, ElementRef<HTMLElement>>('popup', { read: ElementRef });
    private readonly contextTarget = viewChild<unknown, ElementRef<HTMLElement>>('contextTarget', { read: ElementRef });
    private readonly registry = inject(OverlayRegistry);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private cleanup: (() => void) | null = null;
    private point: {
        x: number;
        y: number;
    } | null = null;
    private returnFocus: HTMLElement | null = null;
    private holdTimer: ReturnType<typeof setTimeout> | null = null;
    private holdStart: {
        x: number;
        y: number;
    } | null = null;
    private hoverTimer: ReturnType<typeof setTimeout> | null = null;
    private shouldFocus = true;
    private prefix = '';
    private prefixAt = 0;
    constructor() {
        effect(() => { if (!this.menuId().trim() || !this.label().trim())
            throw new Error('Menu menuId and label must be nonempty.'); const nodes = this.nodes(), disabled = this.disabled(), open = this.opened(); untracked(() => { if (disabled || !menuCommands(nodes).length) {
            this.close(true);
            return;
        } if (open)
            this.reconcile(nodes); }); });
        afterRenderEffect(() => {
            const open = this.opened();
            this.placement();
            this.expanded();
            this.nodes();
            this.pendingFocus();
            const popup = this.popup()?.nativeElement, anchor = this.anchor()?.nativeElement;
            if (!popup || !anchor)
                return;
            untracked(() => {
                if (open && !popup.matches(':popover-open')) {
                    this.returnFocus ??= popup.ownerDocument.activeElement as HTMLElement | null;
                    popup.showPopover();
                    this.cleanup = this.registry.register({ element: popup, anchor, kind: 'popup', outside: true, dismiss: reason => reason === 'escape' ? this.closeLevel(this.focusedDepth()) : this.close(false) });
                    this.cleanup = this.combine(this.cleanup, observeOverlay(popup, anchor, () => this.position()));
                    if (this.shouldFocus && !this.pendingFocus())
                        this.pendingFocus.set(menuCommands(this.nodes())[0]?.id ?? null);
                }
                else if (!open && popup.matches(':popover-open')) {
                    popup.hidePopover();
                    this.cleanup?.();
                    this.cleanup = null;
                }
                if (open) {
                    this.position();
                    const id = this.pendingFocus();
                    if (id) {
                        const button = popup.querySelector<HTMLElement>('#' + CSS.escape(this.itemId(id)));
                        if (button) {
                            button.focus();
                            this.pendingFocus.set(null);
                        }
                    }
                }
            });
        });
        inject(DestroyRef).onDestroy(() => { this.stopHold(); this.stopHoverClose(); this.cleanup?.(); this.cleanup = null; const popup = this.popup()?.nativeElement; if (popup?.matches(':popover-open'))
            popup.hidePopover(); });
    }
    private reconcile(nodes: readonly MenuItem[]): void {
        const popup = this.popup()?.nativeElement, active = popup?.ownerDocument.activeElement as HTMLElement | null;
        const focused = !!active && !!popup?.contains(active), oldParent = active?.closest<HTMLElement>('[data-menu-parent]')?.dataset['menuParent'];
        const id = active?.closest<HTMLElement>('[data-menu-item]')?.dataset['menuItem'];
        const oldPath = this.expanded();
        const path: string[] = [];
        const levels: Array<readonly MenuItem[]> = [menuCommands(nodes)];
        let commands = levels[0]!;
        for (const parentId of oldPath) {
            const parent = commands.find(item => item.id === parentId);
            if (!parent || parent.disabled || !menuCommands(parent.children ?? []).length)
                break;
            path.push(parentId);
            commands = menuCommands(parent.children ?? []);
            levels.push(commands);
        }
        if (path.length !== oldPath.length)
            this.expanded.set(path);
        if (!focused)
            return;
        const depth = oldParent ? oldPath.indexOf(oldParent) + 1 : 0;
        const level = levels[Math.min(depth, path.length)]!;
        if (depth > path.length || id && !level.some(item => item.id === id))
            this.pendingFocus.set(level[0]?.id ?? path.at(-1) ?? null);
    }
    private combine(first: () => void, second: () => void): () => void { return () => { first(); second(); }; }
    protected itemId(id: string): string { return this.menuId() + '-item-' + encodeURIComponent(id); }
    protected role(item: MenuItem): string { return item.type === 'checkbox' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem'; }
    protected toggle(): void { this.shouldFocus = true; if (this.opened()) {
        this.close(true);
        return;
    } this.point = null; this.returnFocus = this.anchor()?.nativeElement ?? null; this.opened.set(true); this.openChange.emit(true); }
    protected triggerKey(event: KeyboardEvent): void { if (this.disabled())
        return; if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.shouldFocus = true;
        this.point = null;
        this.returnFocus = this.anchor()?.nativeElement ?? null;
        this.opened.set(true);
        this.openChange.emit(true);
        const commands = menuCommands(this.nodes());
        this.pendingFocus.set((event.key === 'ArrowUp' ? commands.at(-1) : commands[0])?.id ?? null);
    } }
    protected select(item: MenuItem, depth: number): void {
        if (item.disabled || this.disabled())
            return;
        if (menuCommands(item.children ?? []).length) {
            this.openChildren(item, depth, true);
            return;
        }
        let chosen = item;
        if (item.type === 'checkbox' || item.type === 'radio') {
            const next = selectMenuCheck(this.currentItems(), item);
            this.currentItems.set(next);
            this.itemsChange.emit(next);
            const find = (nodes: readonly MenuItem[]): MenuItem | undefined => { for (const node of nodes) {
                if (node.id === item.id)
                    return node;
                const child = find(node.children ?? []);
                if (child)
                    return child;
            } return undefined; };
            chosen = find(next)!;
        }
        this.selected.emit({ item: chosen, path: menuPath(this.currentItems(), item.id) });
        if (this.closeOnSelect())
            this.close(true);
    }
    private openChildren(item: MenuItem, depth: number, focus: boolean): void { if (item.disabled || !menuCommands(item.children ?? []).length)
        return; this.expanded.update(path => [...path.slice(0, depth), item.id]); if (focus)
        this.pendingFocus.set(menuCommands(item.children ?? [])[0]!.id); }
    protected closeLevel(depth: number): void { if (depth <= 0) {
        this.close(true);
        return;
    } const parent = this.expanded()[depth - 1]; this.expanded.update(path => path.slice(0, depth - 1)); if (parent)
        this.pendingFocus.set(parent); }
    private close(restore: boolean): void { if (!this.opened())
        return; this.opened.set(false); this.expanded.set([]); this.pendingFocus.set(null); const popup = this.popup()?.nativeElement; if (popup?.matches(':popover-open'))
        popup.hidePopover(); this.cleanup?.(); this.cleanup = null; this.openChange.emit(false); if (restore)
        restoreFocus(this.returnFocus, this.anchor()?.nativeElement ?? null); this.returnFocus = null; }
    protected key(event: KeyboardEvent, item: MenuItem | null, parent: MenuItem | null, depth: number): void {
        if (event.isComposing)
            return;
        if (event.key.length !== 1 || event.key === ' ') {
            this.prefix = '';
            this.prefixAt = 0;
        }
        const menu = (event.currentTarget as HTMLElement).closest('[role="menu"]')!;
        const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role^="menuitem"]')).filter(button => button.closest('[role="menu"]') === menu);
        const index = buttons.indexOf(event.currentTarget as HTMLButtonElement);
        const rtl = this.element.ownerDocument.defaultView?.getComputedStyle(this.element).direction === 'rtl';
        if (event.key === 'Tab') {
            event.preventDefault();
            const anchor = this.point ? (this.returnFocus ?? this.contextTarget()?.nativeElement) : this.anchor()?.nativeElement;
            this.close(false);
            if (anchor)
                focusOutsideMenu(anchor, event.shiftKey);
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeLevel(depth);
            return;
        }
        if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') && item) {
            event.preventDefault();
            this.openChildren(item, depth, true);
            return;
        }
        if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') && parent) {
            event.preventDefault();
            this.closeLevel(depth);
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (item)
                this.select(item, depth);
            else
                this.closeLevel(depth);
            return;
        }
        let target: HTMLButtonElement | undefined;
        if (event.key === 'ArrowDown')
            target = buttons[(index + 1) % buttons.length];
        else if (event.key === 'ArrowUp')
            target = buttons[(index - 1 + buttons.length) % buttons.length];
        else if (event.key === 'Home')
            target = buttons[0];
        else if (event.key === 'End')
            target = buttons.at(-1);
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = performance.now();
            this.prefix = now - this.prefixAt > 600 ? event.key : this.prefix + event.key;
            this.prefixAt = now;
            const repeated = new Set(this.prefix).size === 1;
            const prefix = (repeated ? event.key : this.prefix).toLocaleLowerCase();
            target = [...buttons.slice(index + 1), ...buttons.slice(0, index + 1)].find(button => (button.querySelector('.ui-menu__label')?.textContent ?? button.textContent)?.trim().toLocaleLowerCase().startsWith(prefix));
        }
        if (target) {
            event.preventDefault();
            target.focus();
        }
    }
    private position(): void { const popup = this.popup()?.nativeElement, anchor = this.anchor()?.nativeElement; if (!popup || !anchor || !popup.matches(':popover-open'))
        return; positionOverlay(popup, anchor, this.placement(), this.point); for (const submenu of popup.querySelectorAll<HTMLElement>('[data-menu-parent]')) {
        const parent = popup.querySelector<HTMLElement>('#' + CSS.escape(this.itemId(submenu.dataset['menuParent']!)));
        if (parent)
            positionOverlay(submenu, parent, 'right-start');
    } }
    private focusedDepth(): number { const parent = (this.element.ownerDocument.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-menu-parent]')?.dataset['menuParent']; return parent ? this.expanded().indexOf(parent) + 1 : 0; }
    protected hoverOpen(): void { this.stopHoverClose(); if (this.trigger() === 'hover' && !this.disabled() && !this.opened()) {
        this.shouldFocus = false;
        this.point = null;
        this.returnFocus = this.element.ownerDocument.activeElement as HTMLElement | null;
        this.opened.set(true);
        this.openChange.emit(true);
    } }
    protected hoverLeave(event: PointerEvent): void { if (this.trigger() !== 'hover' || this.popup()?.nativeElement.contains(this.element.ownerDocument.activeElement))
        return; const target = event.relatedTarget as Node | null; if (target && this.element.contains(target))
        return; this.hoverTimer = setTimeout(() => this.close(false), 200); }
    protected stopHoverClose(): void { if (this.hoverTimer !== null)
        clearTimeout(this.hoverTimer); this.hoverTimer = null; }
    protected contextMenu(event: MouseEvent): void { if (this.trigger() !== 'context' || this.disabled())
        return; event.preventDefault(); this.point = { x: event.clientX, y: event.clientY }; this.contextOrigin(); this.opened.set(true); this.openChange.emit(true); this.pendingFocus.set(menuCommands(this.nodes())[0]?.id ?? null); }
    protected contextKey(event: KeyboardEvent): void { if (this.disabled() || !(event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey))
        return; event.preventDefault(); const target = this.contextTarget()?.nativeElement; if (!target)
        return; const rect = target.getBoundingClientRect(); this.point = { x: rect.left, y: rect.bottom }; this.contextOrigin(); this.opened.set(true); this.openChange.emit(true); this.pendingFocus.set(menuCommands(this.nodes())[0]?.id ?? null); }
    private contextOrigin(): void { this.shouldFocus = true; const target = this.contextTarget()?.nativeElement, active = this.element.ownerDocument.activeElement as HTMLElement | null; if (target && (!active || !target.contains(active)))
        target.focus({ preventScroll: true }); this.returnFocus = this.element.ownerDocument.activeElement as HTMLElement | null; }
    protected hold(event: PointerEvent): void { if (this.disabled() || event.pointerType !== 'touch')
        return; this.stopHold(); this.holdStart = { x: event.clientX, y: event.clientY }; this.holdTimer = setTimeout(() => { this.point = this.holdStart; this.contextOrigin(); this.opened.set(true); this.openChange.emit(true); this.pendingFocus.set(menuCommands(this.nodes())[0]?.id ?? null); }, 500); }
    protected moveHold(event: PointerEvent): void { if (this.holdStart && Math.hypot(event.clientX - this.holdStart.x, event.clientY - this.holdStart.y) > 8)
        this.stopHold(); }
    protected stopHold(): void { if (this.holdTimer !== null)
        clearTimeout(this.holdTimer); this.holdTimer = null; this.holdStart = null; }
}
