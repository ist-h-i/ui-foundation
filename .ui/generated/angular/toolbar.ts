import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText} from './locale';
import { afterNextRender, type AfterRenderRef, afterRenderEffect, Injector, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { Menu, type MenuItem, type MenuSelection } from './menu';
import { focusBeforeHiding } from './focus';
export interface ToolbarItem {
    id: string;
    label?: string;
    icon?: string;
    type?: 'action' | 'separator';
    disabled?: boolean;
    visible?: boolean;
}
@Component({ selector: 'ui-toolbar,ui-action-bar', standalone: true, imports: [ActionControl, Menu], changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[attr.data-fixed]': 'fixed()' },
    template: `<div #bar class="ui-toolbar-inner" role="toolbar" [attr.aria-label]="label()" [attr.aria-orientation]="direction()" [attr.data-direction]="direction()" [attr.data-overflow]="overflow()" (keydown)="key($event)">
 @for(item of shown();track item.id){@if(item.type==='separator'){<span class="ui-toolbar-separator" role="separator" [attr.aria-orientation]="direction()==='horizontal'?'vertical':'horizontal'"></span>}@else{<button uiAction [attr.data-toolbar-action]="item.id" [attr.tabindex]="tabId()===item.id?0:-1" [icon]="item.icon??null" [disabled]="disabled()||!!item.disabled" (focus)="activeId.set(item.id)" (click)="choose(item)">{{item.label}}</button>}}
 <ui-menu #more [hidden]="!overflowed().length" [menuId]="controlId()+'-more'" [label]="uiEffective_overflowLabel()" [items]="menuItems()" [disabled]="disabled()" [triggerTabIndex]="tabId()==='__more'?0:-1" [open]="menuOpen()" (openChange)="menuOpen.set($event)" (focusin)="activeId.set('__more')" (selected)="chooseMenu($event)" />
 </div>
 <div #measure class="ui-toolbar-measure" aria-hidden="true" inert>@for(item of available();track item.id){@if(item.type==='separator'){<span class="ui-toolbar-separator" [attr.data-measure-item]="item.id"></span>}@else{<button uiAction tabindex="-1" [attr.data-measure-item]="item.id" [icon]="item.icon??null">{{item.label}}</button>}}<button uiAction data-measure-more tabindex="-1">{{uiEffective_overflowLabel()}}</button></div>`,
    styles: `:host{display:block;box-sizing:border-box;min-inline-size:0;max-inline-size:100%;padding:var(--ui-space-control-gap);background:var(--ui-color-surface);color:var(--ui-color-text);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);}:host([hidden]),[hidden]{display:none!important;}:host([data-fixed="top"]){position:sticky;inset-block-start:0;z-index:1;}:host([data-fixed="bottom"]){position:sticky;inset-block-end:0;z-index:1;}.ui-toolbar-inner{display:flex;align-items:center;gap:var(--ui-space-control-gap);min-inline-size:0;}.ui-toolbar-inner[data-overflow="wrap"]{flex-wrap:wrap;}.ui-toolbar-inner[data-direction="vertical"]{flex-direction:column;align-items:stretch;}.ui-toolbar-inner>button{flex:0 1 auto;}.ui-toolbar-inner>ui-menu{min-inline-size:0;flex:0 1 auto;}.ui-toolbar-separator{align-self:stretch;min-inline-size:var(--ui-border-control);background:var(--ui-color-border);}.ui-toolbar-inner[data-direction="vertical"]>.ui-toolbar-separator{min-block-size:var(--ui-border-control);}.ui-toolbar-measure{position:fixed;inset-block-start:0;inset-inline-start:0;display:flex;align-items:center;gap:var(--ui-space-control-gap);inline-size:max-content;visibility:hidden;pointer-events:none;}.ui-toolbar-measure>*{flex:0 0 auto;max-inline-size:none;}` })
export class Toolbar {
 protected readonly uiText_Toolbar=injectUiMessageText();
    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly items = input<readonly ToolbarItem[]>([]);
    readonly direction = input<'horizontal' | 'vertical'>('horizontal');
    readonly overflow = input<'menu' | 'wrap'>('menu');
    readonly overflowLabel = input<string>();
 protected readonly uiEffective_overflowLabel=uiLocaleComputed(()=>this.overflowLabel()??this.uiText_Toolbar("uiFoundation.toolbar.moreActions"));
    readonly fixed = input<'none' | 'top' | 'bottom'>('none');
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly selected = output<ToolbarItem>();
    protected readonly activeId = signal<string | null>(null);
    private readonly fitting = signal<ReadonlySet<string>>(new Set());
    private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');
    private readonly measure = viewChild<ElementRef<HTMLElement>>('measure');
    private readonly more = viewChild(Menu);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly injector = inject(Injector);
    private focusJob: AfterRenderRef | null = null;
    private pendingFocus: {
        id: string | null;
        origin: Element | null;
    } | null = null;
    protected readonly menuOpen = signal(false);
    protected readonly available = computed(() => this.items().filter(item => item.visible !== false));
    protected readonly shown = computed(() => this.trimSeparators(this.available().filter(item => this.overflow() !== 'menu' || this.direction() === 'vertical' || this.fitting().has(item.id))));
    protected readonly overflowed = computed(() => this.available().filter(item => item.type !== 'separator' && this.overflow() === 'menu' && this.direction() === 'horizontal' && !this.fitting().has(item.id)));
    protected readonly menuItems = computed<readonly MenuItem[]>(() => this.overflowed().map(item => ({ id: item.id, label: item.label, icon: item.icon, disabled: item.disabled })));
    protected readonly tabId = computed(() => {
        const enabled = this.disabled() ? [] : this.shown().filter(item => item.type !== 'separator' && !item.disabled).map(item => item.id);
        if (!this.disabled() && this.overflowed().length)
            enabled.push('__more');
        return enabled.includes(this.activeId() ?? '') ? this.activeId() : enabled[0] ?? null;
    });
    constructor() {
        let observer: ResizeObserver | undefined;
        effect(() => {
            const ids = new Set<string>();
            for (const item of this.items()) {
                if (!item.id.trim() || item.id === '__more' || ids.has(item.id) || item.type !== 'separator' && !item.label?.trim())
                    throw new Error('Toolbar requires unique IDs and labelled actions.');
                ids.add(item.id);
            }
        });
        afterRenderEffect(() => {
            this.available();
            this.overflow();
            this.direction();
            this.uiEffective_overflowLabel();
            const bar = this.bar()?.nativeElement, measure = this.measure()?.nativeElement;
            if (!bar || !measure)
                return;
            untracked(() => { observer?.disconnect(); observer = new ResizeObserver(() => this.fit()); observer.observe(bar); observer.observe(measure); this.fit(); });
        });
        effect(() => {
            const disabled = this.disabled(), available = this.available(), shown = this.shown(), overflowed = this.overflowed();
            untracked(() => {
                const active = this.element.ownerDocument.activeElement as HTMLElement | null;
                if (!active || !this.element.contains(active))
                    return;
                const id = active.dataset['toolbarAction'], inMore = this.bar()?.nativeElement.querySelector('ui-menu')?.contains(active), menuId = active.closest<HTMLElement>('[data-menu-item]')?.dataset['menuItem'];
                if (disabled) {
                    this.focusJob?.destroy();
                    this.focusJob = null;
                    focusBeforeHiding(this.element);
                }
                else if (inMore && !overflowed.length) {
                    this.menuOpen.set(false);
                    this.requestFocus(menuId && shown.some(item => item.id === menuId) ? menuId : null);
                }
                else if (id && !available.some(item => item.id === id && !item.disabled))
                    this.requestFocus(null);
                else if (id && !shown.some(item => item.id === id))
                    this.requestFocus('__more');
            });
        });
        inject(DestroyRef).onDestroy(() => { observer?.disconnect(); this.focusJob?.destroy(); });
    }
    private trimSeparators(items: readonly ToolbarItem[]): readonly ToolbarItem[] { return items.filter((item, index) => item.type !== 'separator' || index > 0 && index < items.length - 1 && items[index - 1]?.type !== 'separator'); }
    private fit(): void {
        const bar = this.bar()?.nativeElement, measure = this.measure()?.nativeElement;
        if (!bar || !measure)
            return;
        const entries = Array.from(measure.querySelectorAll<HTMLElement>('[data-measure-item]')), gap = parseFloat(getComputedStyle(bar).columnGap) || 0, width = bar.clientWidth;
        let chosen = new Set(entries.map(element => element.dataset['measureItem']!));
        if (this.overflow() === 'menu' && this.direction() === 'horizontal') {
            const total = entries.reduce((sum, element) => sum + element.getBoundingClientRect().width, 0) + Math.max(0, entries.length - 1) * gap;
            if (total > width) {
                chosen = new Set();
                const reserve = (measure.querySelector<HTMLElement>('[data-measure-more]')?.getBoundingClientRect().width ?? 0) + gap;
                let used = 0;
                for (const element of entries) {
                    const next = element.getBoundingClientRect().width + (chosen.size ? gap : 0);
                    if (used + next + reserve > width)
                        break;
                    chosen.add(element.dataset['measureItem']!);
                    used += next;
                }
            }
        }
        const previous = this.fitting(), candidate = this.element.ownerDocument.activeElement as HTMLElement | null, active = candidate && this.element.contains(candidate) ? candidate : null, activeAction = active?.dataset['toolbarAction'], moreElement = bar.querySelector('ui-menu'), menuAction = active?.closest<HTMLElement>('[data-menu-item]')?.dataset['menuItem'];
        if (activeAction && !chosen.has(activeAction))
            this.requestFocus('__more');
        if (active && moreElement?.contains(active) && (this.available().every(item => item.type === 'separator' || chosen.has(item.id)) || menuAction && chosen.has(menuAction))) {
            this.menuOpen.set(false);
            this.requestFocus(menuAction && chosen.has(menuAction) ? menuAction : null);
        }
        if (previous.size !== chosen.size || [...previous].some(id => !chosen.has(id)))
            this.fitting.set(chosen);
        if (this.pendingFocus)
            this.scheduleFocus();
    }
    private requestFocus(id: string | null): void { this.activeId.set(id); this.pendingFocus = { id, origin: this.pendingFocus?.origin ?? this.element.ownerDocument.activeElement }; this.scheduleFocus(); }
    private scheduleFocus(): void { this.focusJob?.destroy(); this.focusJob = afterNextRender(() => { this.focusJob = null; const pending = this.pendingFocus; if (!pending)
        return; const active = this.element.ownerDocument.activeElement; if (active && active !== this.element.ownerDocument.body && active !== pending.origin && !this.element.contains(active)) {
        this.pendingFocus = null;
        return;
    } if (this.focusId(this.tabId()))
        this.pendingFocus = null;
    else if (!this.available().some(item => item.type !== 'separator' && !item.disabled) || this.disabled()) {
        this.pendingFocus = null;
        focusBeforeHiding(this.element);
    } }, { injector: this.injector }); }
    private buttons(): HTMLButtonElement[] { const bar = this.bar()?.nativeElement; return bar ? Array.from(bar.querySelectorAll<HTMLButtonElement>('button[data-toolbar-action],ui-menu>button')).filter(button => !button.disabled && !!button.getClientRects().length) : []; }
    private focusId(id: string | null): boolean {
        if (id === '__more') {
            this.more()?.focusTrigger();
            return !!this.bar()?.nativeElement.querySelector('ui-menu')?.contains(this.element.ownerDocument.activeElement);
        }
        const button = this.buttons().find(button => button.dataset['toolbarAction'] === id);
        button?.focus();
        return !!button && this.element.ownerDocument.activeElement === button;
    }
    protected choose(item: ToolbarItem): void {
        if (!this.disabled() && !item.disabled && item.type !== 'separator')
            this.selected.emit(item);
    }
    protected chooseMenu(selection: MenuSelection): void {
        const item = this.items().find(item => item.id === selection.item.id);
        if (item)
            this.choose(item);
    }
    protected key(event: KeyboardEvent): void {
        if (this.disabled() || event.defaultPrevented || event.isComposing)
            return;
        const buttons = this.buttons(), current = buttons.indexOf(event.target as HTMLButtonElement);
        if (current < 0)
            return;
        const rtl = getComputedStyle(this.element).direction === 'rtl';
        let next: number;
        switch (event.key) {
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = buttons.length - 1;
                break;
            case 'ArrowRight':
                if (this.direction() !== 'horizontal')
                    return;
                next = current + (rtl ? -1 : 1);
                break;
            case 'ArrowLeft':
                if (this.direction() !== 'horizontal')
                    return;
                next = current + (rtl ? 1 : -1);
                break;
            case 'ArrowDown':
                if (this.direction() !== 'vertical')
                    return;
                next = current + 1;
                break;
            case 'ArrowUp':
                if (this.direction() !== 'vertical')
                    return;
                next = current - 1;
                break;
            default: return;
        }
        event.preventDefault();
        buttons[(next + buttons.length) % buttons.length]?.focus();
    }
}
