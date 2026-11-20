import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { AnchoredPopup } from './floating-panel';
import { tabbableElements } from './focus';
import { Icon } from './icon';
import { positiveInteger } from './layout-model';
import { navigationHref, navigationNodes, validNavigationId, visibleNavigation, type MegaMenuGroup, type NavigationNode } from './navigation-model';
/** A grouped navigation popup uses native links/disclosures, without menu-widget key interception. */
@Component({ selector: 'ui-mega-menu', standalone: true, imports: [NgTemplateOutlet, ActionControl, Icon,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[id]': 'controlId()', 'popover': 'manual', 'role': 'dialog', 'aria-modal': 'false', 'tabindex': '-1', '[attr.aria-label]': 'label()', '[attr.aria-busy]': 'busy()' },
    template: `<div class="ui-mega-heading"><h2>{{label()}}</h2><button uiAction [disabled]="busy()" (click)="close('close-button')">{{uiEffective_closeLabel()}}</button></div><nav [attr.aria-label]="label()" class="ui-mega-columns" [style.--ui-mega-columns]="checkedColumns()">
 @for(group of checkedGroups();track group.id){<section [attr.aria-labelledby]="controlId()+'-group-'+group.id"><h3 [id]="controlId()+'-group-'+group.id">{{group.label}}</h3>@if(group.description){<p class="ui-mega-description">{{group.description}}</p>}<ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{items:visibleItems(group.items)}" /></section>}
 </nav><ng-template #entries let-items="items"><ul>@for(item of items;track item.id){<li>@if(item.children?.length){<details><summary>{{item.label}}</summary>@if(item.description){<p class="ui-mega-description">{{item.description}}</p>}@if(item.href){<a [attr.href]="item.disabled||busy()?null:href(item.href)" [attr.role]="item.disabled||busy()?'link':null" [attr.aria-disabled]="item.disabled||busy()?'true':null" [attr.tabindex]="item.disabled||busy()?0:null" [attr.aria-current]="current()===item.id?'page':null" (click)="choose($event,item)">{{'uiFoundation.megaMenu.openForLabel' | uiStableMessage:{label:item.label} }}</a>}<ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{items:visibleItems(item.children)}" /></details>}
 @else{<a [attr.href]="item.disabled||busy()?null:href(item.href)" [attr.role]="item.disabled||busy()||!item.href?'link':null" [attr.aria-disabled]="item.disabled||busy()||!item.href?'true':null" [attr.tabindex]="item.disabled||busy()||!item.href?0:null" [attr.aria-current]="current()===item.id?'page':null" (click)="choose($event,item)">@if(item.icon){<ui-icon [name]="item.icon" />}<span>{{item.label}}@if(item.description){<span class="ui-mega-description">{{item.description}}</span>}</span></a>}</li>}</ul></ng-template>`,
    styles: `:host{box-sizing:border-box;position:fixed;inset:auto;margin:0;padding:var(--ui-space-field);inline-size:var(--ui-size-mega-menu);max-inline-size:calc(100vw - 2 * var(--ui-space-control-gap));max-block-size:calc(100dvh - 2 * var(--ui-space-control-gap));overflow:auto;overscroll-behavior:contain;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-surface);color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);overflow-wrap:anywhere;box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow);}:host([hidden]){display:none!important;}:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}.ui-mega-heading{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);margin-block-end:var(--ui-space-field);}h2{flex:1 1 calc(var(--ui-text-heading) * 6);min-inline-size:0;margin:0;font-size:var(--ui-text-heading);}h3{margin:0;font-size:var(--ui-text-body);font-weight:var(--ui-weight-heading);}.ui-mega-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,max(var(--ui-size-navigation-column),calc((100% - (var(--ui-mega-columns) - 1) * var(--ui-space-field)) / var(--ui-mega-columns)))),1fr));gap:var(--ui-space-field);}section{min-inline-size:0;}ul{list-style:none;margin:0;padding:0;}a,summary{box-sizing:border-box;display:flex;align-items:center;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);color:var(--ui-color-link);text-decoration:underline;border-radius:var(--ui-radius-control);cursor:pointer;}summary{display:list-item;color:var(--ui-color-text);text-decoration:none;}a>span{min-inline-size:0;}a:hover,summary:hover{background:var(--ui-color-background);}a:focus-visible,summary:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}a[aria-disabled='true']{color:var(--ui-color-muted);cursor:not-allowed;}a[aria-current='page']{font-weight:var(--ui-weight-heading);background:var(--ui-color-background);}.ui-mega-description{display:block;color:var(--ui-color-muted);font-size:var(--ui-text-small);margin-block:var(--ui-space-control-gap);}details>ul{padding-inline-start:var(--ui-space-field);}` })
export class MegaMenu extends AnchoredPopup {
 protected readonly uiText_MegaMenu=injectUiMessageText();
    readonly label = input.required<string>();
    readonly groups = input<readonly MegaMenuGroup[]>([]);
    readonly columns = input(3);
    protected readonly checkedColumns = computed(() => { const columns=this.columns(); if(!positiveInteger(columns))throw new Error('MegaMenu columns must be a positive integer.'); return columns; });
    readonly current = input('');
    readonly closeOnSelect = input(true, { transform: booleanAttribute });
    readonly closeLabel = input<string>();
 protected readonly uiEffective_closeLabel=uiLocaleComputed(()=>this.closeLabel()??this.uiText_MegaMenu("uiFoundation.megaMenu.close"));
    readonly selected = output<NavigationNode>();
    protected readonly visibleItems = visibleNavigation;
    protected readonly href = navigationHref;
    private owned = false;
    protected readonly checkedGroups = computed(() => { if (!this.label().trim() || !this.uiEffective_closeLabel().trim())
        throw new Error('MegaMenu requires nonempty labels.'); this.checkedColumns(); const groups = this.groups(), ids = new Set<string>(); for (const group of groups) {
        if (!validNavigationId(group.id) || ids.has(group.id) || !group.label.trim())
            throw new Error('MegaMenu groups require unique IDs and labels.');
        ids.add(group.id);
    } navigationNodes(groups.flatMap(group => group.items)); return groups; });
    constructor() { super(); const enter = () => this.owned = true, leave = (event: FocusEvent) => { if (event.relatedTarget && !this.element.contains(event.relatedTarget as Node))
        this.owned = false; }; this.element.addEventListener('focusin', enter); this.element.addEventListener('focusout', leave); inject(DestroyRef).onDestroy(() => { this.element.removeEventListener('focusin', enter); this.element.removeEventListener('focusout', leave); }); afterRenderEffect(() => { this.checkedGroups(); this.busy(); untracked(() => { const active = this.element.ownerDocument.activeElement; if (this.element.matches(':popover-open') && this.owned && (active === this.element.ownerDocument.body || this.element.contains(active) && (!(active as HTMLElement).getClientRects().length || (active as HTMLElement).matches(':disabled'))))
        (tabbableElements(this.element)[0] ?? this.element).focus({ preventScroll: true }); }); }); }
    protected override initialFocus(source: 'click' | 'automatic' | 'programmatic'): HTMLElement | null { return source === 'automatic' ? null : tabbableElements(this.element)[0] ?? this.element; }
    protected choose(event: MouseEvent, item: NavigationNode): void { if (this.busy() || item.disabled || !item.href) {
        event.preventDefault();
        return;
    } if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return; this.selected.emit(item); if (this.closeOnSelect())
        this.close('confirm', item); }
}
