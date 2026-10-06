import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import { booleanAttribute, afterRenderEffect, ChangeDetectionStrategy, Component, Directive, DestroyRef, ElementRef, computed, inject, input, linkedSignal, output, untracked, ViewEncapsulation, } from '@angular/core';
import { foldBreadcrumb, navigationHref, type BreadcrumbItem } from './navigation-model';
import { NgTemplateOutlet } from '@angular/common';
import { canFocus } from './focus';
// Projection keeps native lists and links in the application. These namespaced
// styles intentionally cover projected elements without ::ng-deep.
const navigationStyles = `
  .ui-navigation, .ui-breadcrumb {
    min-inline-size: 0;
    max-inline-size: 100%;
    color: var(--ui-color-text);
    font-family: var(--ui-font-body);
    font-size: var(--ui-text-body);
    font-weight: var(--ui-weight-body);
    line-height: var(--ui-leading-body);
  }
  .ui-navigation > ul, .ui-breadcrumb > ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-control-gap);
    margin: 0;
    padding: 0;
    list-style: none;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .ui-navigation > ul > li, .ui-breadcrumb > ol > li {
    box-sizing: border-box;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .ui-breadcrumb > ol > li {
    display: flex;
    align-items: center;
  }
  .ui-breadcrumb > ol > li + li {
    padding-inline-start: var(--ui-space-control-gap);
    border-inline-start: var(--ui-border-control) solid var(--ui-color-border);
  }
  .ui-navigation-item {
    display: inline-flex;
    box-sizing: border-box;
    align-items: center;
    min-block-size: var(--ui-size-control);
    min-inline-size: var(--ui-size-control);
    max-inline-size: 100%;
    padding: var(--ui-space-control-y) var(--ui-space-control-x);
    border-radius: var(--ui-radius-control);
    color: var(--ui-color-link);
    text-underline-offset: var(--ui-border-focus-offset);
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .ui-navigation-item:hover {
    background: var(--ui-color-background);
    text-decoration-thickness: var(--ui-border-control);
  }
  .ui-navigation-item[aria-current="page"] {
    background: var(--ui-color-background);
    font-weight: var(--ui-weight-heading);
    text-decoration: underline;
    text-decoration-thickness: var(--ui-border-focus);
  }
  .ui-navigation-item:focus-visible {
    outline: var(--ui-border-focus) solid var(--ui-color-focus);
    outline-offset: var(--ui-border-focus-offset);
  }
  .ui-navigation[hidden], .ui-breadcrumb[hidden], .ui-navigation-item[hidden] {
    display: none;
  }
  .ui-navigation[data-direction='vertical'] > ul { flex-direction: column; align-items: stretch; }
  .ui-navigation[data-narrow='scroll'] > ul { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior: contain; }
  .ui-navigation[data-narrow='scroll'] > ul > li { flex: 0 0 auto; max-inline-size: 100%; }
  .ui-navigation-item { gap: var(--ui-space-control-gap); }
  .ui-breadcrumb[data-structured='true'] > ol > li + li { padding-inline-start: 0; border: 0; }
  .ui-breadcrumb__separator { color: var(--ui-color-muted); padding-inline: var(--ui-space-control-gap); }
  .ui-breadcrumb details { min-inline-size: 0; }
  .ui-breadcrumb summary { cursor: pointer; min-block-size: var(--ui-size-control); padding: var(--ui-space-control-y) var(--ui-space-control-x); overflow-wrap: anywhere; }
  .ui-breadcrumb details > ol { padding-inline-start: var(--ui-space-control-x); margin: 0; list-style: none; }
  .ui-breadcrumb summary:focus-visible { outline: var(--ui-border-focus) solid var(--ui-color-focus); outline-offset: var(--ui-border-focus-offset); }
  @media (forced-colors: active) {
    .ui-navigation-item:focus-visible { outline-color: Highlight; }
  }
`;
@Directive({
    selector: 'a[uiNavigationItem]',
    standalone: true,
    host: {
        class: 'ui-navigation-item',
        '[attr.aria-current]': 'currentPage() ? "page" : null',
    },
})
export class NavigationItem {
    readonly currentPage = input(false, { transform: booleanAttribute });
}
@Component({
    selector: 'nav[uiNavigation]',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ui-navigation', '[attr.aria-label]': 'label()', '[attr.data-direction]': 'direction()', '[attr.data-narrow]': 'narrow()' },
    template: '<ng-content />',
    styles: navigationStyles,
})
export class Navigation {
    readonly label = input.required<string>();
    readonly direction = input<'horizontal' | 'vertical'>('horizontal');
    readonly narrow = input<'wrap' | 'scroll'>('wrap');
}
@Component({
    selector: 'nav[uiBreadcrumb]',
    standalone: true,
    imports: [NgTemplateOutlet, NavigationItem,UiMessagePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ui-breadcrumb', '[attr.aria-label]': 'uiEffective_label()', '[attr.data-structured]': 'items() !== null' },
    template: `@if(items()===null){<ng-content />}@else{<ol>
    @for(item of parts().start;track item.id;let index=$index){<li>@if(index){<span class="ui-breadcrumb__separator" aria-hidden="true">{{separator()}}</span>}<ng-container [ngTemplateOutlet]="destination" [ngTemplateOutletContext]="{item:item}" /></li>}
    @if(parts().middle.length){<li><span class="ui-breadcrumb__separator" aria-hidden="true">{{separator()}}</span><details [open]="opened()"><summary (click)="toggle($event)">{{'省略した階層（' | uiMessage}}{{parts().middle.length}}{{'件）' | uiMessage}}</summary><ol>@for(item of parts().middle;track item.id){<li><ng-container [ngTemplateOutlet]="destination" [ngTemplateOutletContext]="{item:item}" /></li>}</ol></details></li>}
    @for(item of parts().end;track item.id){<li><span class="ui-breadcrumb__separator" aria-hidden="true">{{separator()}}</span><ng-container [ngTemplateOutlet]="destination" [ngTemplateOutletContext]="{item:item}" /></li>}
   </ol>}
   <ng-template #destination let-item="item">@if(item.href){<a uiNavigationItem [attr.href]="href(item.href)" [attr.data-breadcrumb-id]="item.id" [currentPage]="isCurrent(item)">{{item.label}}</a>}@else{<span [attr.aria-current]="isCurrent(item)?'page':null">{{item.label}}</span>}</ng-template>`,
    styles: navigationStyles,
})
export class Breadcrumb {
 protected readonly uiText_Breadcrumb=injectUiText();
    readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_Breadcrumb('パンくず'));
    readonly items = input<readonly BreadcrumbItem[] | null>(null);
    readonly maxItems = input(5);
    readonly separator = input('/');
    readonly expanded = input(false, { transform: booleanAttribute });
    readonly expandedChange = output<boolean>();
    protected readonly opened = linkedSignal(() => this.expanded());
    protected readonly href = navigationHref;
    protected readonly parts = computed(() => foldBreadcrumb(this.items() ?? [], this.maxItems()));
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private owned = false;
    private focusedSummary: HTMLElement | null = null;
    constructor() {
        const entered = (event: FocusEvent) => { this.owned = true; this.focusedSummary = (event.target as HTMLElement).closest('details')?.querySelector<HTMLElement>('summary') ?? null; };
        const exited = (event: FocusEvent) => { if (event.relatedTarget && event.relatedTarget !== this.element.ownerDocument.body && !this.element.contains(event.relatedTarget as Node))
            this.owned = false; };
        this.element.addEventListener('focusin', entered);
        this.element.addEventListener('focusout', exited);
        inject(DestroyRef).onDestroy(() => { this.element.removeEventListener('focusin', entered); this.element.removeEventListener('focusout', exited); });
        afterRenderEffect(() => {
            this.parts();
            this.opened();
            untracked(() => {
                const active = this.element.ownerDocument.activeElement;
                if (this.owned && (active === this.element.ownerDocument.body || this.element.contains(active) && !canFocus(active as HTMLElement))) {
                    const candidates = this.element.querySelectorAll<HTMLElement>('summary,a[href]');
                    const target = canFocus(this.focusedSummary) ? this.focusedSummary : [...candidates].find(node => canFocus(node));
                    target?.focus({ preventScroll: true });
                }
            });
        });
    }
    protected isCurrent(item: BreadcrumbItem): boolean { const items = this.items() ?? []; return items.some(node => node.current) ? !!item.current : items.at(-1)?.id === item.id; }
    protected toggle(event: Event): void { event.preventDefault(); this.opened.update(value => !value); this.expandedChange.emit(this.opened()); }
}
