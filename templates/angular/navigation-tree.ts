import {UiStableMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { Icon } from './icon';
import { ActionControl } from './action-control';
import { NavigationItem } from './navigation';
import { canFocus } from './focus';
import { navigationHref, navigationNodes, navigationPath, visibleNavigation, type NavigationNode } from './navigation-model';
@Component({ selector: 'ui-side-nav,ui-navigation-rail', standalone: true, imports: [NgTemplateOutlet, Icon, ActionControl, NavigationItem,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<nav [attr.aria-label]="label()" [attr.data-collapsed]="folded()" [style.inline-size.px]="folded()?null:checkedWidth()"><button #collapse uiAction [attr.aria-label]="folded()?('uiFoundation.sideNav.expandDestination' | uiStableMessage):('uiFoundation.sideNav.collapseDestination' | uiStableMessage)" [attr.aria-expanded]="!folded()" [attr.aria-controls]="navId()+'-items'" (click)="setCollapsed(!folded())">{{folded()?('uiFoundation.sideNav.expand' | uiStableMessage):('uiFoundation.sideNav.collapse' | uiStableMessage)}}</button><ul [id]="navId()+'-items'"><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{nodes:visible(nodes())}" /></ul></nav>
 <ng-template #entries let-nodes="nodes">@for(node of nodes;track node.id){<li>
  @if(visible(node.children??[]).length){<details [attr.data-nav-id]="node.id" [open]="!folded()&&expanded().includes(node.id)"><summary [attr.aria-label]="node.label" [attr.aria-disabled]="node.disabled?'true':null" (click)="toggle($event,node)"><ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{node:node}" /></summary>@if(node.href){<a uiNavigationItem [attr.href]="node.disabled?null:href(node.href)" [attr.role]="node.disabled?'link':null" [attr.aria-disabled]="node.disabled?'true':null" [attr.tabindex]="node.disabled?0:null" [currentPage]="current()===node.id" (click)="destination($event,node)">{{'uiFoundation.sideNav.openForLabel' | uiStableMessage:{label:node.label} }}</a>}<ul><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{nodes:visible(node.children??[])}" /></ul></details>}
  @else{<a uiNavigationItem [attr.data-nav-id]="node.id" [attr.href]="node.disabled?null:href(node.href)" [attr.role]="node.disabled||!node.href?'link':null" [attr.aria-disabled]="node.disabled||!node.href?'true':null" [attr.tabindex]="node.disabled||!node.href?0:null" [currentPage]="current()===node.id" [attr.aria-label]="node.label" (click)="destination($event,node)"><ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{node:node}" /></a>}
 </li>}</ng-template>
 <ng-template #content let-node="node">@if(node.icon){<ui-icon [name]="node.icon" />}@else if(folded()){<span aria-hidden="true">{{node.label.slice(0,1)}}</span>}<span class="ui-side-label">{{node.label}}@if(node.description){<small>{{node.description}}</small>}</span></ng-template>`,
    styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}nav{box-sizing:border-box;inline-size:var(--ui-size-sidebar);max-inline-size:100%;background:var(--ui-color-surface);color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);padding:var(--ui-space-control-y);border-inline-end:var(--ui-border-control) solid var(--ui-color-border);}nav[data-collapsed='true']{inline-size:var(--ui-size-navigation-rail);}ul{list-style:none;padding:0;margin:0;min-inline-size:0;}details>ul{padding-inline-start:var(--ui-space-control-x);border-inline-start:var(--ui-border-control) solid var(--ui-color-border);}summary,a{box-sizing:border-box;min-block-size:var(--ui-size-control);max-inline-size:100%;padding:var(--ui-space-control-y) var(--ui-space-control-x);border-radius:var(--ui-radius-control);cursor:pointer;overflow-wrap:anywhere;}a{display:flex;gap:var(--ui-space-control-gap);}summary::marker{color:var(--ui-color-link);}summary:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}small{display:block;font-size:var(--ui-text-small);color:var(--ui-color-muted);}.ui-side-label{min-inline-size:0;}[aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}nav[data-collapsed='true'] .ui-side-label{position:absolute;inline-size:1px;block-size:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}` })
export class SideNav {
    readonly navId = input.required<string>();
    readonly label = input.required<string>();
    readonly items = input<readonly NavigationNode[]>([]);
    readonly current = input('');
    readonly expandedIds = input<readonly string[]>([]);
    readonly expandedIdsChange = output<readonly string[]>();
    readonly collapsed = input(false, { transform: booleanAttribute });
    readonly collapsedChange = output<boolean>();
    readonly width = input<number | null>(null);
    protected readonly checkedWidth = computed(() => { const width = this.width(); if (width !== null && (!Number.isFinite(width) || width <= 0)) throw new Error('SideNav width must be positive.'); return width; });
    readonly selected = output<NavigationNode>();
    protected readonly nodes = computed(() => navigationNodes(this.items()));
    protected readonly visible = visibleNavigation;
    protected readonly href = navigationHref;
    protected readonly expanded = linkedSignal(() => this.expandedIds());
    protected readonly folded = linkedSignal(() => this.collapsed());
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly collapse = viewChild<unknown, ElementRef<HTMLButtonElement>>('collapse', { read: ElementRef });
    private ownedId: string | null = null;
    private owned = false;
    private previous: readonly NavigationNode[] = [];
    constructor() {
        const focused = (event: FocusEvent) => { this.owned = this.host.contains(event.target as Node); this.ownedId = (event.target as Element)?.closest('[data-nav-id]')?.getAttribute('data-nav-id') ?? null; };
        const exited = (event: FocusEvent) => { if (event.relatedTarget && event.relatedTarget !== this.host.ownerDocument.body && !this.host.contains(event.relatedTarget as Node))
            this.owned = false; };
        this.host.addEventListener('focusin', focused);
        this.host.addEventListener('focusout', exited);
        inject(DestroyRef).onDestroy(() => { this.host.removeEventListener('focusin', focused); this.host.removeEventListener('focusout', exited); });
        afterRenderEffect(() => {
            const nodes = this.nodes();
            this.folded();
            this.expanded();
            this.checkedWidth();
            if (!this.navId().trim() || /\s/.test(this.navId()) || !this.label().trim())
                throw new Error('SideNav requires an ID and label.');
            untracked(() => {
                const active = this.host.ownerDocument.activeElement;
                if (this.owned && (!active || active === this.host.ownerDocument.body || this.host.contains(active) && !canFocus(active as HTMLElement))) {
                    const path = this.ownedId ? navigationPath(this.previous, this.ownedId) : null;
                    let target: HTMLElement | null = null;
                    for (const item of [...(path ?? [])].reverse()) {
                        const candidate = this.host.querySelector<HTMLElement>('[data-nav-id="' + CSS.escape(item.id) + '"]');
                        const focus = candidate?.tagName === 'DETAILS' ? candidate.querySelector<HTMLElement>('summary') : candidate;
                        if (canFocus(focus ?? null)) {
                            target = focus!;
                            break;
                        }
                    }
                    (target ?? this.collapse()?.nativeElement)?.focus({ preventScroll: true });
                }
                this.previous = nodes;
            });
        });
    }
    protected setCollapsed(value: boolean): void { if (value && this.host.contains(this.host.ownerDocument.activeElement))
        this.collapse()?.nativeElement.focus(); this.folded.set(value); this.collapsedChange.emit(value); }
    protected toggle(event: Event, node: NavigationNode): void { event.preventDefault(); if (node.disabled)
        return; const wasFolded = this.folded(); if (wasFolded)
        this.setCollapsed(false); const next = !wasFolded && this.expanded().includes(node.id) ? this.expanded().filter(id => id !== node.id) : [...new Set([...this.expanded(), node.id])]; this.expanded.set(next); this.expandedIdsChange.emit(next); }
    protected destination(event: Event, node: NavigationNode): void { if (node.disabled || !node.href) {
        event.preventDefault();
        return;
    } this.selected.emit(node); }
}
@Component({ selector: 'ui-bottom-navigation,ui-dock', standalone: true, imports: [Icon, NavigationItem], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<nav [attr.aria-label]="label()" [attr.data-edge]="edge()" [attr.data-fixed]="fixed()"><ul>@for(item of nodes();track item.id){<li><a uiNavigationItem [attr.href]="item.disabled?null:href(item.href)" [attr.role]="item.disabled||!item.href?'link':null" [attr.aria-disabled]="item.disabled||!item.href?'true':null" [attr.tabindex]="item.disabled||!item.href?0:null" [currentPage]="current()===item.id" [attr.aria-label]="item.label" (click)="activate($event,item)">@if(item.icon){<ui-icon [name]="item.icon" />}<span [class.ui-nav-label-hidden]="!showLabels()">{{item.label}}</span></a></li>}</ul></nav>`,
    styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}nav{box-sizing:border-box;background:var(--ui-color-surface);color:var(--ui-color-text);border:var(--ui-border-control) solid var(--ui-color-border);padding:var(--ui-space-control-y);max-inline-size:100%;font-family:var(--ui-font-body);font-size:var(--ui-text-body);}ul{display:flex;list-style:none;gap:var(--ui-space-control-gap);padding:0;margin:0;overflow:auto;overscroll-behavior:contain;max-block-size:calc(100dvh - 2 * var(--ui-space-control-y) - 2 * var(--ui-border-control));}li{min-inline-size:var(--ui-size-control);flex:1;}a{display:flex;flex-direction:column;gap:var(--ui-space-control-gap);text-align:center;}.ui-nav-label-hidden{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}nav[data-fixed='true']{position:fixed;z-index:1;max-block-size:100dvh;}nav[data-fixed='true'][data-edge='bottom']{inset:auto 0 0;}nav[data-fixed='true'][data-edge='top']{inset:0 0 auto;}nav[data-fixed='true'][data-edge='left']{inset:0 auto 0 0;}nav[data-fixed='true'][data-edge='right']{inset:0 0 0 auto;}nav[data-edge='left'] ul,nav[data-edge='right'] ul{flex-direction:column;}[aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}` })
export class BottomNavigation {
    readonly label = input.required<string>();
    readonly items = input<readonly NavigationNode[]>([]);
    readonly current = input('');
    readonly showLabels = input(true, { transform: booleanAttribute });
    readonly fixed = input(false, { transform: booleanAttribute });
    readonly edge = input<'top' | 'bottom' | 'left' | 'right'>('bottom');
    readonly selected = output<NavigationNode>();
    protected readonly href = navigationHref;
    protected readonly nodes = computed(() => { if (!this.label().trim())
        throw new Error('BottomNavigation label must be nonempty.'); const items = navigationNodes(this.items()); if (items.some(item => item.children?.length))
        throw new Error('BottomNavigation destinations are flat; use SideNav for hierarchical destinations.'); return visibleNavigation(items); });
    protected activate(event: Event, item: NavigationNode): void { if (item.disabled || !item.href) {
        event.preventDefault();
        return;
    } this.selected.emit(item); }
}
