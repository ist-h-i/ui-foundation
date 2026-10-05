import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal, untracked, viewChildren } from '@angular/core';
import { ActionControl } from './action-control';
import { Icon } from './icon';
import { tabbableElements } from './focus';
import { Menu, type MenuRootNavigation } from './menu';
import { menuCommands, selectMenuCheck, validateMenu, type MenuItem, type MenuSelection } from './menu-model';
/** Command navigation is a composite widget. Site destinations use Navigation instead. */
@Component({ selector: 'ui-menubar', standalone: true, imports: [ActionControl, Icon, Menu], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div role="menubar" aria-orientation="horizontal" [attr.aria-label]="label()" [attr.tabindex]="roots().length?null:0">
 @for(item of roots();track item.id){
  @if(children(item).length){<ui-menu [menuId]="controlId()+'-'+encode(item.id)" [label]="item.label!" [items]="item.children??[]" [disabled]="disabled()||!!item.disabled" [menubar]="true" [triggerTabIndex]="focusId()===item.id?0:-1" [closeOnSelect]="closeOnSelect()" (itemsChange)="changeChildren(item.id,$event)" (selected)="childSelected(item,$event)" (openChange)="menuChanged(item.id,$event)" (rootNavigation)="boundary(item.id,$event)" (focusin)="focused.set(item.id)" (keydown)="rootKey($event,item)">@if(item.icon){<ui-icon uiMenuTrigger [name]="item.icon" />}</ui-menu>}
  @else{<button uiAction type="button" [id]="controlId()+'-'+encode(item.id)+'-trigger'" [attr.role]="role(item)" [attr.aria-checked]="item.type==='checkbox'||item.type==='radio'?!!item.checked:null" [attr.aria-disabled]="disabled()||item.disabled?'true':null" [attr.tabindex]="focusId()===item.id?0:-1" (focus)="focused.set(item.id)" (keydown)="rootKey($event,item)" (click)="invoke(item)">@if(item.icon){<ui-icon [name]="item.icon" />}@if(item.type==='checkbox'||item.type==='radio'){<span aria-hidden="true">{{item.checked?'✓':'○'}}</span>}{{item.label}}</button>}
 }
 </div>`,
    styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}[role='menubar']{display:flex;align-items:center;gap:var(--ui-space-control-gap);max-inline-size:100%;overflow:auto;overscroll-behavior:contain;padding:var(--ui-space-control-gap);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-surface);color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-control);}ui-menu,[role='menubar']>button{flex:0 0 auto;}[aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}[role='menubar']:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}` })
export class Menubar {
    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly items = input<readonly MenuItem[]>([]);
    readonly itemsChange = output<readonly MenuItem[]>();
    readonly selected = output<MenuSelection>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly closeOnSelect = input(true, { transform: booleanAttribute });
    private readonly current = linkedSignal(() => this.items());
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly menus = viewChildren(Menu);
    protected readonly focused = signal<string | null>(null);
    protected readonly encode = encodeURIComponent;
    private owned = false;
    private previous: readonly string[] = [];
    private prefix = '';
    private prefixAt = 0;
    protected readonly roots = computed(() => { if (!this.controlId().trim() || /\s/.test(this.controlId()) || !this.label().trim())
        throw new Error('Menubar requires a nonempty controlId and label.'); const nodes = validateMenu(this.current()); if (nodes.some(node => node.type === 'group' || node.type === 'separator' || menuCommands(node.children ?? []).length && (node.type === 'checkbox' || node.type === 'radio')))
        throw new Error('Menubar root entries must be commands, and submenu roots use type item; groups and separators belong in popup children.'); return menuCommands(nodes); });
    protected readonly focusId = computed(() => this.roots().some(node => node.id === this.focused()) ? this.focused() : this.roots()[0]?.id ?? null);
    protected readonly children = (item: MenuItem) => menuCommands(item.children ?? []);
    constructor() {
        const enter = () => this.owned = true, leave = (event: FocusEvent) => { if (event.relatedTarget && !this.element.contains(event.relatedTarget as Node))
            this.owned = false; };
        this.element.addEventListener('focusin', enter);
        this.element.addEventListener('focusout', leave);
        inject(DestroyRef).onDestroy(() => { this.element.removeEventListener('focusin', enter); this.element.removeEventListener('focusout', leave); });
        afterRenderEffect(() => { const nodes = this.roots(); this.menus(); untracked(() => { const active = this.element.ownerDocument.activeElement; if (this.owned && (active === this.element.ownerDocument.body || this.element.contains(active) && !(active as HTMLElement).getClientRects().length)) {
            const index = this.previous.indexOf(this.focused() ?? '');
            this.focusRoot(nodes[Math.min(Math.max(index, 0), nodes.length - 1)]?.id ?? null);
        } this.previous = nodes.map(node => node.id); }); });
    }
    protected role(item: MenuItem): string { return item.type === 'checkbox' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem'; }
    private menu(id: string): Menu | undefined { return this.menus().find(menu => menu.menuId() === this.controlId() + '-' + encodeURIComponent(id)); }
    private closeOthers(id: string | null): void { for (const menu of this.menus())
        if (menu !== this.menu(id ?? ''))
            menu.dismiss(false); }
    private focusRoot(id: string | null): void { this.focused.set(id); const target = id ? this.element.querySelector<HTMLElement>('#' + CSS.escape(this.controlId() + '-' + encodeURIComponent(id) + '-trigger')) : this.element.querySelector<HTMLElement>('[role=menubar]'); if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } }
    protected menuChanged(id: string, open: boolean): void { if (open) {
        this.focused.set(id);
        this.closeOthers(id);
    } }
    protected changeChildren(id: string, children: readonly MenuItem[]): void { const next = this.current().map(node => node.id === id ? { ...node, children } : node); this.current.set(next); this.itemsChange.emit(next); }
    protected childSelected(root: MenuItem, event: MenuSelection): void { this.selected.emit({ item: event.item, path: [root.id, ...event.path] }); }
    protected invoke(item: MenuItem): void { if (this.disabled() || item.disabled)
        return; let selected = item; if (item.type === 'checkbox' || item.type === 'radio') {
        const next = selectMenuCheck(this.current(), item);
        this.current.set(next);
        this.itemsChange.emit(next);
        selected = next.find(node => node.id === item.id)!;
    } this.closeOthers(null); this.selected.emit({ item: selected, path: [item.id] }); }
    protected boundary(id: string, event: MenuRootNavigation): void { if (event.direction === 'exit') {
        this.closeOthers(null);
        this.focusOutside(!!event.backwards);
        return;
    } this.move(id, event.direction === 'next' ? 1 : -1, true); }
    private move(id: string, offset: 1 | -1, open: boolean): void { const nodes = this.roots(), index = nodes.findIndex(node => node.id === id), next = nodes[(index + offset + nodes.length) % nodes.length]; if (!next)
        return; this.closeOthers(null); this.focusRoot(next.id); if (open && !this.disabled() && !next.disabled)
        this.menu(next.id)?.openMenu(); }
    private focusOutside(backwards: boolean): void { const scope = this.element.closest('dialog:modal') ?? this.element.ownerDocument.body; const candidates = tabbableElements(scope).filter(node => !this.element.contains(node)); const side = candidates.filter(node => !!(this.element.compareDocumentPosition(node) & (backwards ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING))); const target = backwards ? side.at(-1) : side[0]; (target ?? (backwards ? candidates.at(-1) : candidates[0]))?.focus(); }
    protected rootKey(event: KeyboardEvent, item: MenuItem): void {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229)
            return;
        const target = event.target as HTMLElement;
        if (target.id !== this.controlId() + '-' + encodeURIComponent(item.id) + '-trigger')
            return;
        const nodes = this.roots(), logical = nodes.find(node => node.id === this.focusId()) ?? item, rtl = this.element.ownerDocument.defaultView?.getComputedStyle(this.element).direction === 'rtl';
        if (event.key === 'Tab') {
            // A preceding root key can move focus before Angular renders its
            // new roving tabindex. Exit the whole composite in either state.
            event.preventDefault();
            this.closeOthers(null);
            this.focusOutside(event.shiftKey);
            return;
        }
        if (event.key.length !== 1 || event.key === ' ') {
            this.prefix = '';
            this.prefixAt = 0;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            this.move(logical.id, event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : -1, false);
            return;
        }
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            this.closeOthers(null);
            this.focusRoot((event.key === 'Home' ? nodes[0] : nodes.at(-1))?.id ?? null);
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeOthers(null);
            this.focusRoot(logical.id);
            return;
        }
        if (event.key.length === 1 && event.key !== ' ' && !event.altKey && !event.ctrlKey && !event.metaKey) {
            const now = performance.now();
            this.prefix = now - this.prefixAt > 600 ? event.key : this.prefix + event.key;
            this.prefixAt = now;
            const prefix = (new Set(this.prefix).size === 1 ? event.key : this.prefix).toLocaleLowerCase(), index = nodes.findIndex(node => node.id === logical.id), ordered = [...nodes.slice(index + 1), ...nodes.slice(0, index + 1)], match = ordered.find(node => node.label?.trim().toLocaleLowerCase().startsWith(prefix));
            if (match) {
                event.preventDefault();
                this.closeOthers(null);
                this.focusRoot(match.id);
            }
        }
        else {
            this.prefix = '';
            this.prefixAt = 0;
        }
    }
}
