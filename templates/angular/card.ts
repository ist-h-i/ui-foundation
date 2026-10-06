import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, Directive, effect, afterRenderEffect, ElementRef, inject, input, linkedSignal, output, TemplateRef, viewChild, viewChildren, untracked } from '@angular/core';
import { ActionControl } from './action-control';
export type CardArea = 'header' | 'body' | 'footer' | 'media' | 'actions';
export interface CardContext {
    title: string;
    subtitle: string;
    collapsed: boolean;
    loading: boolean;
}
@Directive({ selector: 'ng-template[uiCardTemplate]', standalone: true })
export class CardTemplate {
    readonly uiCardTemplate = input.required<CardArea>();
    readonly template = inject<TemplateRef<{
        $implicit: CardContext;
    }>>(TemplateRef);
    static ngTemplateContextGuard(_directive: CardTemplate, _context: unknown): _context is {
        $implicit: CardContext;
    } { return true; }
}
const regionStyles = `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}:host([data-align="center"]){text-align:center;}:host([data-align="end"]){text-align:end;}:host([data-padding="compact"]){padding:var(--ui-space-control-y);}:host([data-padding="normal"]){padding:var(--ui-space-section);}`;
@Directive({ standalone: true, host: { '[attr.data-align]': 'align()', '[attr.data-padding]': 'padding()' } })
abstract class CardRegion {
    readonly align = input<'start' | 'center' | 'end'>('start');
    readonly padding = input<'none' | 'compact' | 'normal'>('none');
}
@Component({ selector: 'ui-card-header', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', styles: regionStyles })
export class CardHeader extends CardRegion {
}
@Component({ selector: 'ui-card-body', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', styles: regionStyles })
export class CardBody extends CardRegion {
}
@Component({ selector: 'ui-card-footer', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', styles: regionStyles })
export class CardFooter extends CardRegion {
}
@Component({ selector: 'ui-card-media', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', styles: regionStyles + 'img,video{max-inline-size:100%;}' })
export class CardMedia extends CardRegion {
}
@Component({ selector: 'ui-card-actions', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content />', styles: regionStyles + ':host{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}:host([data-align="center"]){justify-content:center;}:host([data-align="end"]){justify-content:end;}' })
export class CardActions extends CardRegion {
}
@Component({ selector: 'ui-card', standalone: true, imports: [NgTemplateOutlet, ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[attr.data-appearance]': 'appearance()', '[attr.data-orientation]': 'orientation()', '[attr.data-padding]': 'padding()' },
    template: `<article #article tabindex="-1" [attr.aria-label]="label()||title()||null" [attr.aria-busy]="loading()">
  <header data-card-area="header" [hidden]="!showHeader()"><div class="ui-card__heading">
   @if(template('header');as header){<ng-container [ngTemplateOutlet]="header.template" [ngTemplateOutletContext]="{$implicit:context()}" />}
   @else{<ng-content select="ui-card-header,[uiCardHeader]" />@if(title()){<h2>{{title()}}</h2>}@if(subtitle()){<p class="ui-card__subtitle">{{subtitle()}}</p>}}
   @if(collapsible()){<button #toggle uiAction [attr.aria-expanded]="!folded()" [attr.aria-controls]="cardId()+'-content'" (click)="toggleCollapsed()">{{folded()?('展開' | uiMessage):('折り畳む' | uiMessage)}}: {{title()||label()}}</button>}
  </div></header>
  @if(collapsible()&&!showHeader()){<button #toggle uiAction [attr.aria-expanded]="!folded()" [attr.aria-controls]="cardId()+'-content'" (click)="toggleCollapsed()">{{folded()?('展開' | uiMessage):('折り畳む' | uiMessage)}}: {{title()||label()}}</button>}
  <div #content [id]="cardId()+'-content'" [hidden]="collapsible()&&folded()" class="ui-card__content">
   <div class="ui-card__media" data-card-area="media" [hidden]="!showMedia()">@if(template('media');as media){<ng-container [ngTemplateOutlet]="media.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content select="ui-card-media,[uiCardMedia]" />}</div>
   <div class="ui-card__body" data-card-area="body" [hidden]="!showBody()">@if(template('body');as body){<ng-container [ngTemplateOutlet]="body.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content />}</div>
   <footer data-card-area="footer" [hidden]="!showFooter()">@if(template('footer');as footer){<ng-container [ngTemplateOutlet]="footer.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content select="ui-card-footer,[uiCardFooter]" />}</footer>
   <div class="ui-card__actions" data-card-area="actions" [hidden]="!showActions()">@if(template('actions');as actions){<ng-container [ngTemplateOutlet]="actions.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content select="ui-card-actions,[uiCardActions]" />}</div>
  </div>
  <p class="ui-card__loading" role="status" aria-atomic="true">{{loading()?uiEffective_loadingLabel():''}}</p>
 </article>`,
    styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;color:var(--ui-color-text);background:var(--ui-color-surface);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);overflow-wrap:anywhere;}:host([hidden]){display:none;}:host([data-appearance="plain"]){border-color:transparent;}:host([data-appearance="raised"]){box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow);}article{min-inline-size:0;}header,.ui-card__body,footer,.ui-card__actions{padding:var(--ui-space-section);}:host([data-padding="compact"]) header,:host([data-padding="compact"]) .ui-card__body,:host([data-padding="compact"]) footer,:host([data-padding="compact"]) .ui-card__actions{padding:var(--ui-space-control-y);}:host([data-padding="none"]) header,:host([data-padding="none"]) .ui-card__body,:host([data-padding="none"]) footer,:host([data-padding="none"]) .ui-card__actions{padding:0;}[hidden]{display:none!important;}h2{font-size:var(--ui-text-heading);line-height:var(--ui-leading-heading);margin:0;}p{margin-block:var(--ui-space-control-gap) 0;}.ui-card__heading{display:grid;gap:var(--ui-space-control-gap);}.ui-card__subtitle,.ui-card__loading{color:var(--ui-color-muted);font-size:var(--ui-text-small);}.ui-card__loading:not(:empty){padding:var(--ui-space-control-y) var(--ui-space-control-x);}.ui-card__content{min-inline-size:0;}:host([data-orientation="horizontal"]) .ui-card__content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));}:host([data-orientation="horizontal"]) footer,:host([data-orientation="horizontal"]) .ui-card__actions{grid-column:1/-1;}@media(max-width:40rem){:host([data-orientation="horizontal"]) .ui-card__content{grid-template-columns:1fr;}}article:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}`,
})
export class Card {
 protected readonly uiText_Card=injectUiText();
    readonly cardId = input.required<string>();
    readonly title = input('');
    readonly subtitle = input('');
    readonly label = input('');
    readonly showHeader = input(true, { transform: booleanAttribute });
    readonly showBody = input(true, { transform: booleanAttribute });
    readonly showFooter = input(true, { transform: booleanAttribute });
    readonly showMedia = input(true, { transform: booleanAttribute });
    readonly showActions = input(true, { transform: booleanAttribute });
    readonly orientation = input<'vertical' | 'horizontal'>('vertical');
    readonly appearance = input<'outlined' | 'plain' | 'raised'>('outlined');
    readonly padding = input<'none' | 'compact' | 'normal'>('normal');
    readonly collapsible = input(false, { transform: booleanAttribute });
    readonly collapsed = input(false, { transform: booleanAttribute });
    readonly collapsedChange = output<boolean>();
    readonly loading = input(false, { transform: booleanAttribute });
    readonly loadingLabel = input<string>();
 protected readonly uiEffective_loadingLabel=uiLocaleComputed(()=>this.loadingLabel()??this.uiText_Card('内容を読み込んでいます。'));
    protected readonly folded = linkedSignal(() => this.collapsed());
    private readonly templates = contentChildren(CardTemplate);
    private readonly content = viewChild<unknown, ElementRef<HTMLElement>>('content', { read: ElementRef });
    private readonly toggles = viewChildren<unknown, ElementRef<HTMLButtonElement>>('toggle', { read: ElementRef });
    private readonly article = viewChild<unknown, ElementRef<HTMLElement>>('article', { read: ElementRef });
    protected readonly context = computed<CardContext>(() => ({ title: this.title(), subtitle: this.subtitle(), collapsed: this.folded(), loading: this.loading() }));
    constructor() { effect(() => { if (!this.cardId().trim())
        throw new Error('ui-card cardId must be nonempty.'); const areas = this.templates().map(t => t.uiCardTemplate()); if (new Set(areas).size !== areas.length)
        throw new Error('ui-card requires at most one template per area.'); }); effect(() => { const folded = this.collapsible() && this.folded(), shown = { header: this.showHeader(), body: this.showBody(), media: this.showMedia(), footer: this.showFooter(), actions: this.showActions() }; const article = this.article()?.nativeElement, toggles = this.toggles(); untracked(() => { const active = article?.ownerDocument.activeElement as HTMLElement | null, area = active?.closest<HTMLElement>("[data-card-area]")?.dataset["cardArea"] as CardArea | undefined; if (active && article?.contains(active) && (area && (!shown[area] || area !== "header" && folded))) {
        const toggle = toggles.map(ref => ref.nativeElement).find(element => !!element.closest("header") === shown.header && !element.closest("[hidden]"));
        (toggle ?? article)?.focus({ preventScroll: true });
    } }); }); }
    protected template(area: CardArea): CardTemplate | undefined { return this.templates().find(template => template.uiCardTemplate() === area); }
    protected toggleCollapsed(): void { this.folded.set(!this.folded()); this.collapsedChange.emit(this.folded()); }
}
