import {UiStableMessagePipe} from './locale';
import { AfterContentChecked, afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, ElementRef, forwardRef, inject, input, output, signal, untracked, viewChildren } from '@angular/core';
import { ActionControl } from './action-control';
import { moveNavigationId } from './navigation-model';
@Component({ selector: 'ui-tab-panel', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />',
    host: { role: 'tabpanel', '[attr.id]': 'panelId()', '[attr.aria-labelledby]': 'tabId()', '[hidden]': '!isSelected()', tabindex: '0' },
    styles: `:host{display:block;min-inline-size:0;padding-block:var(--ui-space-field);}:host([hidden]){display:none;}:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}` })
export class TabPanel {
    readonly panelId = input.required<string>();
    readonly label = input.required<string>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly closable = input(false, { transform: booleanAttribute });
    readonly tabId = computed(() => this.panelId() + '-tab');
    private readonly tabs = inject<Tabs>(forwardRef(() => Tabs));
    protected readonly isSelected = computed(() => this.tabs.activePanelId() === this.panelId());
    belongsTo(tabs: Tabs): boolean { return this.tabs === tabs; }
}
/** Manual activation. The application owns panel removal, order and any unsaved decision. */
@Component({ selector: 'ui-tabs', standalone: true, imports: [ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div [attr.role]="panels().length?'tablist':null" [attr.aria-label]="panels().length?label():null" [attr.aria-orientation]="panels().length?orientation():null" [attr.data-scroll]="scrollable()" [attr.tabindex]="panels().length&&!enabled().length?0:null" (focusout)="onFocusOut($event)">
  @for(panel of panels();track panel.panelId()){<button #tabButton type="button" role="tab" [id]="panel.tabId()" [disabled]="panel.disabled()" [attr.aria-controls]="panel.panelId()" [attr.aria-selected]="activePanelId()===panel.panelId()" [attr.tabindex]="!panel.disabled()&&focusPanelId()===panel.panelId()?0:-1" [attr.aria-keyshortcuts]="panel.closable()?'Delete':null" (focus)="onTabFocus(panel.panelId())" (keydown)="onKeydown($event,panel)" (click)="selectPanel(panel.panelId())">{{panel.label()}}</button>}
 </div>
 <ng-content />
 @if(activePanel()&&(reorderable()||activePanel()?.closable())){<div class="ui-tab-actions" role="group" [attr.aria-label]="'uiFoundation.tabs.selectedTabActionsLabel' | uiStableMessage:{label:activePanel()?.label()??''}">
  @if(reorderable()){<button uiAction [disabled]="activeIndex()<=0" (click)="reorder(activePanelId(),-1)">{{'uiFoundation.tabs.moveSelectedTabEarlier' | uiStableMessage}}</button><button uiAction [disabled]="activeIndex()<0||activeIndex()>=panels().length-1" (click)="reorder(activePanelId(),1)">{{'uiFoundation.tabs.moveSelectedTabLater' | uiStableMessage}}</button>}
  @if(activePanel()?.closable()){<button uiAction (click)="requestClose(activePanelId())">{{'uiFoundation.tabs.closeSelectedTab' | uiStableMessage}}</button>}
 </div>}`,
    styles: `:host{display:block;min-inline-size:0;color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);font-weight:var(--ui-weight-body);line-height:var(--ui-leading-body);}:host([hidden]){display:none;}[role='tablist']{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);border-block-end:var(--ui-border-control) solid var(--ui-color-border);min-inline-size:0;max-inline-size:100%;}[role='tablist'][aria-orientation='vertical']{flex-direction:column;align-items:stretch;}[role='tablist'][data-scroll='true']{flex-wrap:nowrap;overflow:auto;overscroll-behavior:contain;max-block-size:calc(100dvh - 2 * var(--ui-space-section));}[role='tablist'][data-scroll='true'] [role='tab']{flex:0 0 auto;}[role='tablist'][data-scroll='true'][aria-orientation='horizontal'] [role='tab']{max-inline-size:none;white-space:nowrap;}[role='tab']{box-sizing:border-box;min-block-size:var(--ui-size-control);min-inline-size:var(--ui-size-control);max-inline-size:100%;padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid transparent;border-block-end:var(--ui-border-focus) solid transparent;background:var(--ui-color-surface);color:var(--ui-color-text);font:inherit;font-weight:var(--ui-weight-control);line-height:var(--ui-leading-control);cursor:pointer;overflow-wrap:anywhere;}[role='tab'][aria-selected='true']{border-block-end-color:var(--ui-color-tab-selected);color:var(--ui-color-tab-selected);font-weight:var(--ui-weight-heading);}[role='tab']:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}[role='tab']:disabled{color:var(--ui-color-muted);cursor:not-allowed;}.ui-tab-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-gap);}` })
export class Tabs implements AfterContentChecked {
    readonly label = input.required<string>();
    readonly selected = input('');
    readonly selectedChange = output<string>();
    readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
    readonly scrollable = input(false, { transform: booleanAttribute });
    readonly reorderable = input(false, { transform: booleanAttribute });
    readonly allowEmpty = input(false, { transform: booleanAttribute });
    readonly focusFallback = input<HTMLElement | null>(null);
    readonly closeRequested = output<string>();
    readonly orderChange = output<readonly string[]>();
    private readonly projectedPanels = contentChildren(TabPanel, { descendants: true });
    readonly panels = computed(() => this.projectedPanels().filter(panel => panel.belongsTo(this)));
    protected readonly enabled = computed(() => this.panels().filter(panel => !panel.disabled()));
    readonly activePanelId = computed(() => this.enabled().some(panel => panel.panelId() === this.selected()) ? this.selected() : this.enabled()[0]?.panelId() ?? '');
    protected readonly activePanel = computed(() => this.panels().find(panel => panel.panelId() === this.activePanelId()));
    protected readonly activeIndex = computed(() => this.panels().findIndex(panel => panel.panelId() === this.activePanelId()));
    private readonly focusedPanel = signal<string | null>(null);
    private readonly pendingFocus = signal<string | null>(null);
    private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private owned = false;
    private ownedPanel: string | null = null;
    private previous: readonly string[] = [];
    protected readonly focusPanelId = computed(() => this.enabled().some(panel => panel.panelId() === this.focusedPanel()) ? this.focusedPanel() : this.activePanelId());
    constructor() {
        const entered = (event: FocusEvent) => { this.owned = true; const target = event.target as HTMLElement, tab = target.closest<HTMLElement>('[role=tab]'); if (tab)
            this.ownedPanel = tab.getAttribute('aria-controls');
        else {
            let panel = target.closest<HTMLElement>('ui-tab-panel');
            while (panel && !this.panels().some(item => item.panelId() === panel!.id))
                panel = panel.parentElement?.closest<HTMLElement>('ui-tab-panel') ?? null;
            this.ownedPanel = panel?.id ?? this.activePanelId();
        } };
        const exited = (event: FocusEvent) => { if (event.relatedTarget && event.relatedTarget !== this.element.ownerDocument.body && !this.element.contains(event.relatedTarget as Node))
            this.owned = false; };
        this.element.addEventListener('focusin', entered);
        this.element.addEventListener('focusout', exited);
        inject(DestroyRef).onDestroy(() => { this.element.removeEventListener('focusin', entered); this.element.removeEventListener('focusout', exited); });
        afterRenderEffect(() => {
            const panels = this.panels(), enabled = this.enabled(), buttons = this.buttons(), pending = this.pendingFocus(), activeId = this.activePanelId();
            untracked(() => {
                const active = this.element.ownerDocument.activeElement, ownedLost = this.owned && (active === this.element.ownerDocument.body || this.element.contains(active) && (!(active as HTMLElement).getClientRects().length || active instanceof HTMLButtonElement && active.disabled));
                if (pending || ownedLost) {
                    let id = pending && enabled.some(panel => panel.panelId() === pending) ? pending : null;
                    if (!id && ownedLost) {
                        const index = this.previous.indexOf(this.ownedPanel ?? this.focusedPanel() ?? '');
                        id = panels.slice(Math.max(0, index)).find(panel => !panel.disabled())?.panelId() ?? enabled.at(-1)?.panelId() ?? null;
                    }
                    const target = id ? buttons.find(button => button.nativeElement.id === id + '-tab')?.nativeElement : buttons.find(button => button.nativeElement.id === activeId + '-tab')?.nativeElement;
                    if (target) {
                        this.focusedPanel.set(id ?? activeId);
                        target.focus({ preventScroll: true });
                        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                    }
                    else if (ownedLost)
                        this.focusFallback()?.focus({ preventScroll: true });
                    this.pendingFocus.set(null);
                }
                this.previous = panels.map(panel => panel.panelId());
            });
        });
    }
    ngAfterContentChecked(): void { const panels = this.panels(), ids = panels.map(panel => panel.panelId()); if (!this.label().trim())
        throw new Error('ui-tabs label must be nonempty.'); if (!panels.length && !this.allowEmpty())
        throw new Error('ui-tabs requires at least one ui-tab-panel.'); if (ids.some(id => !id.trim() || /\s/.test(id)) || new Set(ids).size !== ids.length)
        throw new Error('ui-tab-panel panelId values must be unique nonempty IDs without whitespace.'); if (new Set([...ids, ...panels.map(panel => panel.tabId())]).size !== ids.length * 2)
        throw new Error('ui-tab-panel panelId collides with a generated tab ID.'); if (panels.some(panel => !panel.label().trim()))
        throw new Error('ui-tab-panel label must be nonempty.'); if (this.selected() && !ids.includes(this.selected()))
        throw new Error('ui-tabs selected must match a panel ID.'); }
    protected onTabFocus(id: string): void { this.focusedPanel.set(id); }
    protected onFocusOut(event: FocusEvent): void { if (event.relatedTarget && event.relatedTarget !== this.element.ownerDocument.body && !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node))
        this.focusedPanel.set(null); }
    protected selectPanel(id: string): void { if (!this.enabled().some(panel => panel.panelId() === id))
        return; this.focusedPanel.set(id); if (id !== this.activePanelId())
        this.selectedChange.emit(id); }
    protected requestClose(id: string): void { const panel = this.panels().find(panel => panel.panelId() === id); if (!panel?.closable() || panel.disabled())
        return; this.closeRequested.emit(id); }
    protected reorder(id: string, offset: -1 | 1): void { if (!this.reorderable())
        return; const ids = this.panels().map(panel => panel.panelId()), next = moveNavigationId(ids, id, offset); if (next === ids || next.every((value, index) => value === ids[index]))
        return; this.pendingFocus.set(id); this.orderChange.emit(next); }
    protected onKeydown(event: KeyboardEvent, panel: TabPanel): void {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229)
            return;
        const id = this.focusedPanel() ?? panel.panelId(), panels = this.enabled(), index = panels.findIndex(node => node.panelId() === id), vertical = this.orientation() === 'vertical', rtl = this.element.ownerDocument.defaultView?.getComputedStyle(this.element).direction === 'rtl';
        if (event.key === 'Delete' && panel.closable()) {
            event.preventDefault();
            event.stopPropagation();
            this.requestClose(id);
            return;
        }
        if (event.altKey && this.reorderable() && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            this.reorder(id, event.key === 'ArrowUp' || event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1 : 1);
            return;
        }
        let next: number;
        if (event.key === 'Home')
            next = 0;
        else if (event.key === 'End')
            next = panels.length - 1;
        else if (event.key === (vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'))
            next = (index + 1) % panels.length;
        else if (event.key === (vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'))
            next = (index - 1 + panels.length) % panels.length;
        else
            return;
        const target = panels[next];
        if (!target)
            return;
        event.preventDefault();
        event.stopPropagation();
        this.focusedPanel.set(target.panelId());
        const button = this.buttons().find(button => button.nativeElement.id === target.tabId())?.nativeElement;
        if (button) {
            button.focus();
            button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        else
            this.pendingFocus.set(target.panelId());
    }
}
