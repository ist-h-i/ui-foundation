import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiLocale,injectUiMessageText,UiStableMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, Directive, effect, ElementRef, inject, input, linkedSignal, output, TemplateRef, untracked } from '@angular/core';
import { Icon } from './icon';
import { restoreFocus } from './focus';
import { focusBeforeHiding } from './layout';
import { layoutKeyword } from './layout-model';
import { displayStyles } from './display-style';
import { avatarInitials, comparisonDelta, displayInteger, finiteDisplayValue, meterGroupValues, meterValues, numberDisplay, type DisplayTone, type MeterSegment } from './display-model';

/** Meaning and hierarchy come from the consumer's native tag. Appearance never changes its role. */
@Directive({selector:'[uiTypography],[uiHeading],[uiText]',standalone:true,host:{
 class:'ui-typography',
 '[style.font-family]':'"var(--ui-font-body)"','[style.font-size]':'fontSize()','[style.line-height]':'lineHeight()',
 '[style.font-weight]':'fontWeight()','[style.font-style]':'emphasis()==="italic"?"italic":null',
 '[style.text-align]':'checkedAlign()','[style.color]':'foreground()','[style.background-color]':'surface()',
 '[style.overflow-wrap]':'"anywhere"','[style.white-space]':'wrap()==="nowrap"?"nowrap":null',
 '[style.text-wrap]':'wrap()==="balance"?"balance":null','[style.max-inline-size]':'"100%"',
 '[style.display]':'wrap()==="nowrap"?"block":null','[style.overflow-x]':'wrap()==="nowrap"?"auto":null',
 '[attr.data-tone]':'tone()'
}})
export class Typography {
 readonly uiTypography=input<''|'body'|'heading'|'small'>('');
 readonly tone=input<DisplayTone>('neutral');readonly align=input<'start'|'center'|'end'|'justify'>('start');
 readonly wrap=input<'wrap'|'nowrap'|'balance'>('wrap');readonly emphasis=input<'normal'|'strong'|'italic'>('normal');
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private readonly tag=this.element.tagName;private addedTabstop=false;
 protected readonly checkedAlign=computed(()=>layoutKeyword(this.align(),['start','center','end','justify'] as const,'Typography align'));
 private readonly checkedTone=computed(()=>layoutKeyword(this.tone(),['neutral','muted','info','success','warning','error'] as const,'Typography tone'));
 private readonly variant=computed(()=>layoutKeyword(this.uiTypography(),['','body','heading','small'] as const,'Typography variant')||(/^H[1-6]$/.test(this.tag)?'heading':'body'));
 protected readonly fontSize=computed(()=>'var(--ui-text-'+this.variant()+')');
 protected readonly lineHeight=computed(()=>'var(--ui-leading-'+(this.variant()==='heading'?'heading':'body')+')');
 protected readonly fontWeight=computed(()=>'var(--ui-weight-'+(this.variant()==='heading'?'heading':this.emphasis()==='strong'||this.tag==='STRONG'?'control':'body')+')');
 protected readonly foreground=computed(()=>'var(--ui-color-'+({neutral:'text',muted:'muted',info:'link',success:'success',warning:'warning',error:'danger'}[this.checkedTone()])+')');
 protected readonly surface=computed(()=>'var(--ui-color-'+({neutral:'surface',muted:'surface',info:'surface',success:'success-surface',warning:'warning-surface',error:'error-surface'}[this.checkedTone()])+')');
 constructor(){effect(()=>{if(this.wrap()==='nowrap'&&!this.element.hasAttribute('tabindex')&&!this.element.matches('a[href],button,input,select,textarea,summary')){this.element.tabIndex=0;this.addedTabstop=true;}else if(this.wrap()!=='nowrap'&&this.addedTabstop){if(this.element.getAttribute('tabindex')==='0')this.element.removeAttribute('tabindex');this.addedTabstop=false;}});}
}

@Component({selector:'ui-badge',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 host:{'[attr.data-position]':'position()','[attr.data-dot]':'dot()'},
 template:`<ng-content />@if(shown()){<span class="ui-badge-value ui-display-tone" role="img" [attr.aria-label]="spoken()" [attr.data-tone]="tone()"><span aria-hidden="true">{{dot()?'':shownCount()}}</span></span>}`,
 styles:[displayStyles,`:host{display:inline-flex;position:relative;align-items:center;gap:var(--ui-space-control-gap);}.ui-badge-value{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-inline-size:var(--ui-size-icon);padding-inline:var(--ui-space-control-gap);border:var(--ui-border-control) solid currentColor;border-radius:var(--ui-radius-control);font-size:var(--ui-text-small);font-weight:var(--ui-weight-control);overflow-wrap:anywhere;}:host([data-dot="true"]) .ui-badge-value{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);padding:0;border-radius:50%;background:currentColor;}:host(:not([data-position="inline"])) .ui-badge-value{position:absolute;z-index:1;max-inline-size:100%;}:host([data-position^="top"]) .ui-badge-value{inset-block-start:0;}:host([data-position^="bottom"]) .ui-badge-value{inset-block-end:0;}:host([data-position$="start"]) .ui-badge-value{inset-inline-start:0;}:host([data-position$="end"]) .ui-badge-value{inset-inline-end:0;}:host([data-position$="center"]) .ui-badge-value{inset-inline-start:0;inset-inline-end:0;inline-size:fit-content;margin-inline:auto;}`]})
export class Badge {
 protected readonly uiText_Badge=injectUiMessageText();
 readonly count=input(0);readonly maximum=input(99);readonly showZero=input(false,{transform:booleanAttribute});readonly dot=input(false,{transform:booleanAttribute});
 readonly label=input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_Badge("uiFoundation.badge.count"));readonly tone=input<DisplayTone>('neutral');
 readonly position=input<'inline'|'top-start'|'top-center'|'top-end'|'bottom-start'|'bottom-center'|'bottom-end'>('inline');
 protected readonly shown=computed(()=>this.dot()||this.showZero()||this.count()>0);
 protected readonly shownCount=computed(()=>this.count()>this.maximum()?this.maximum()+'+':String(this.count()));
 protected readonly spoken=computed(()=>this.dot()?this.uiEffective_label():this.uiEffective_label()+' '+this.count());
 constructor(){effect(()=>{displayInteger(this.count(),'Badge count',0,Number.MAX_SAFE_INTEGER);displayInteger(this.maximum(),'Badge maximum',1,Number.MAX_SAFE_INTEGER);if(!this.uiEffective_label().trim())throw new Error('Badge needs a nonempty label.');});}
}

/** Selection and removal are separate native buttons. The app owns actual data removal. */
@Component({selector:'ui-tag,ui-chip',standalone:true,imports:[Icon,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<span class="ui-tag-frame ui-display-tone" [attr.data-tone]="tone()" [attr.data-disabled]="blocked()">
 @if(selectable()){<button type="button" data-tag-action="select" [disabled]="blocked()" [attr.aria-pressed]="selection()" (click)="toggle()">@if(icon()){<ui-icon [name]="icon()!" />}<span>{{label()}}</span></button>}
 @else{<span class="ui-tag-label">@if(icon()){<ui-icon [name]="icon()!" />}{{label()}}</span>}
 @if(removable()){<button type="button" data-tag-action="remove" [disabled]="blocked()" [attr.aria-label]="('uiFoundation.tag.removeForLabel' | uiStableMessage:{label:label()})" (click)="remove()"><ui-icon name="x" /></button>}
 @if(busy()){<span>{{'uiFoundation.tag.working' | uiStableMessage}}</span>}</span>`,
 styles:[displayStyles,`:host{display:inline-flex;}.ui-tag-frame{display:inline-flex;align-items:center;flex-wrap:wrap;gap:var(--ui-space-control-gap);border:var(--ui-border-control) solid currentColor;border-radius:var(--ui-radius-control);overflow-wrap:anywhere;}.ui-tag-label,button{display:inline-flex;align-items:center;gap:var(--ui-space-control-gap);}.ui-tag-label{padding:var(--ui-space-control-y) var(--ui-space-control-x);}button{background:transparent;color:inherit;border-color:transparent;}button[aria-pressed="true"]{box-shadow:inset 0 0 0 var(--ui-border-focus) currentColor;}.ui-tag-frame[data-disabled="true"]{color:var(--ui-color-muted);background:var(--ui-color-disabled-surface);}`]})
export class Tag {
 readonly label=input.required<string>();readonly icon=input<string|null>(null);readonly tone=input<DisplayTone>('neutral');
 readonly selectable=input(false,{transform:booleanAttribute});readonly selected=input(false,{transform:booleanAttribute});readonly selectedChange=output<boolean>();
 readonly removable=input(false,{transform:booleanAttribute});readonly removed=output<void>();readonly disabled=input(false,{transform:booleanAttribute});readonly busy=input(false,{transform:booleanAttribute});readonly focusFallback=input<HTMLElement|null>(null);
 protected readonly selection=linkedSignal(()=>this.selected());protected readonly blocked=computed(()=>this.disabled()||this.busy());
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 constructor(){effect(()=>{if(!this.label().trim())throw new Error('Tag label must be nonempty.');const blocked=this.blocked(),selectable=this.selectable(),removable=this.removable();untracked(()=>{const active=this.element.ownerDocument.activeElement;if(active===this.element.querySelector(':scope > .ui-tag-frame > [data-tag-action="select"]')&&(blocked||!selectable)||active===this.element.querySelector(':scope > .ui-tag-frame > [data-tag-action="remove"]')&&(blocked||!removable)){this.element.tabIndex=-1;restoreFocus(this.element);}});});}
 protected toggle():void{if(this.blocked())return;this.selection.update(value=>!value);this.selectedChange.emit(this.selection());}
 protected remove():void{if(this.blocked())return;focusBeforeHiding(this.element,this.focusFallback());this.removed.emit();}
}

export interface AvatarItem { id:string;name:string;src?:string|null;alt?:string }
@Component({selector:'ui-avatar',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 host:{'[attr.data-size]':'size()','[attr.data-shape]':'shape()','[style.--ui-avatar-graphemes]':'letterCount()'},
 template:`@if(src()&&!failedSource()){<img [src]="src()!" [alt]="decorative()?'':alt()??name()" [attr.aria-hidden]="decorative()?'true':null" (error)="fail()">}@else{<span class="ui-avatar-fallback" [attr.role]="decorative()?null:'img'" [attr.aria-label]="decorative()?null:alt()??name()" [attr.aria-hidden]="decorative()?'true':null">{{initials()}}</span>}`,
 styles:[displayStyles,`:host{--ui-avatar-scale:1;--ui-avatar-size:calc(var(--ui-size-avatar)*var(--ui-avatar-scale));display:inline-flex;inline-size:var(--ui-avatar-size);aspect-ratio:1;flex:0 0 auto;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);overflow:hidden;background:var(--ui-color-background);}:host([data-size="small"]){--ui-avatar-scale:0.75;}:host([data-size="large"]){--ui-avatar-scale:1.25;}:host([data-shape="circle"]){border-radius:50%;}img{inline-size:100%;block-size:100%;object-fit:cover;}.ui-avatar-fallback{display:flex;align-items:center;justify-content:center;inline-size:100%;block-size:100%;font-size:calc(var(--ui-text-avatar)*var(--ui-avatar-scale)*0.76/var(--ui-avatar-graphemes));line-height:1;white-space:nowrap;overflow-wrap:normal;font-weight:var(--ui-weight-heading);}`]})
export class Avatar {
 readonly name=input.required<string>();readonly src=input<string|null>(null);readonly alt=input<string|null>(null);readonly decorative=input(false,{transform:booleanAttribute});protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly size=input<'small'|'medium'|'large'>('medium');readonly shape=input<'circle'|'square'>('circle');readonly imageFailed=output<string>();
 protected readonly failedSource=linkedSignal(()=>{this.src();return false;});protected readonly initials=computed(()=>avatarInitials(this.name(),this.effectiveLocale()));protected readonly letterCount=computed(()=>Math.max(2,Array.from(new Intl.Segmenter(this.effectiveLocale(),{granularity:'grapheme'}).segment(this.initials())).length));
 constructor(){effect(()=>{if(!this.decorative()&&!(this.alt()??this.name()).trim())throw new Error('Avatar needs descriptive alternative text.');});}
 protected fail():void{this.failedSource.set(true);this.imageFailed.emit(this.src()??'');}
}
@Component({selector:'ui-avatar-group',standalone:true,imports:[Avatar,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 host:{role:'group','[attr.aria-label]':'label()',tabindex:'-1'},
 template:`<div class="ui-avatars">@for(item of visibleItems();track item.id){<ui-avatar [name]="item.name" [alt]="item.alt??null" [src]="item.src??null" [size]="size()" [shape]="shape()" [locale]="effectiveLocale()" />}</div>@if(hiddenItems().length){<details><summary>{{'uiFoundation.avatarGroup.showMoreCount' | uiStableMessage:{count:hiddenItems().length} }}</summary><div class="ui-avatars">@for(item of hiddenItems();track item.id){<div class="ui-avatar-entry"><ui-avatar [name]="item.name" [alt]="item.alt??null" [src]="item.src??null" [size]="size()" [shape]="shape()" [locale]="effectiveLocale()" /><span>{{item.name}}</span></div>}</div></details>}`,
 styles:[displayStyles,`:host{display:block;}.ui-avatars{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);}.ui-avatar-entry{display:flex;align-items:center;gap:var(--ui-space-control-gap);min-inline-size:0;overflow-wrap:anywhere;}details{margin-block-start:var(--ui-space-control-gap);}summary{color:var(--ui-color-link);background:var(--ui-color-surface);}`]})
export class AvatarGroup {
 readonly items=input.required<readonly AvatarItem[]>();readonly maximum=input(3);readonly label=input.required<string>();readonly size=input<'small'|'medium'|'large'>('medium');readonly shape=input<'circle'|'square'>('circle');protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);
 protected readonly visibleItems=computed(()=>this.items().slice(0,this.maximum()));protected readonly hiddenItems=computed(()=>this.items().slice(this.maximum()));
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 constructor(){effect(()=>{displayInteger(this.maximum(),'AvatarGroup maximum',1);if(!this.label().trim())throw new Error('AvatarGroup label must be nonempty.');const ids=new Set<string>();for(const item of this.items()){if(!item.id.trim()||!item.name.trim()||ids.has(item.id))throw new Error('AvatarGroup requires unique IDs and names.');ids.add(item.id);}if(!this.hiddenItems().length)untracked(()=>{if(this.element.querySelector(':scope > details')?.contains(this.element.ownerDocument.activeElement))restoreFocus(this.element);});});}
}

export interface DescriptionItem { id:string;label:string;value?:string|number|boolean|null }
export interface DescriptionContext { $implicit:DescriptionItem;value:DescriptionItem['value'];missing:boolean }
@Directive({selector:'ng-template[uiDescriptionValue]',standalone:true})
export class DescriptionTemplate {readonly template=inject<TemplateRef<DescriptionContext>>(TemplateRef);static ngTemplateContextGuard(_directive:DescriptionTemplate,context:unknown):context is DescriptionContext{return true;}}
@Component({selector:'ui-descriptions,ui-key-value',standalone:true,imports:[NgTemplateOutlet],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<dl [attr.aria-label]="label()" [attr.data-direction]="direction()" [style.--ui-description-columns]="checkedColumns()">@for(item of items();track item.id){<div class="ui-description"><dt>{{item.label}}</dt><dd>@if(valueTemplate();as custom){<ng-container [ngTemplateOutlet]="custom.template" [ngTemplateOutletContext]="{$implicit:item,value:item.value,missing:item.value==null}" /> }@else{ {{item.value==null?uiEffective_missingLabel():item.value===''?uiEffective_emptyLabel():item.value}} }</dd></div>}</dl>`,
 styles:[displayStyles,`:host{display:block;}dl{display:grid;grid-template-columns:repeat(var(--ui-description-columns),minmax(0,1fr));gap:var(--ui-space-field);margin:0;}.ui-description{min-inline-size:0;overflow-wrap:anywhere;}dt{font-weight:var(--ui-weight-control);}dd{margin:0;padding-block-start:var(--ui-space-control-gap);}[data-direction="horizontal"] .ui-description{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}[data-direction="horizontal"] dd{padding:0;}@media(max-width:40rem){dl{grid-template-columns:minmax(0,1fr);}}`]})
export class Descriptions {
 protected readonly uiText_Descriptions=injectUiMessageText();
 readonly items=input.required<readonly DescriptionItem[]>();readonly columns=input(1);readonly direction=input<'horizontal'|'vertical'>('vertical');readonly label=input<string|null>(null);readonly missingLabel=input<string>();
 protected readonly checkedColumns=computed(()=>displayInteger(this.columns(),'Descriptions columns',1,12));
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_Descriptions("uiFoundation.descriptions.unavailable"));readonly emptyLabel=input<string>();
 protected readonly uiEffective_emptyLabel=uiLocaleComputed(()=>this.emptyLabel()??this.uiText_Descriptions("uiFoundation.descriptions.emptyString"));protected readonly valueTemplate=contentChild(DescriptionTemplate);
 constructor(){effect(()=>{this.checkedColumns();const ids=new Set<string>();for(const item of this.items()){if(!item.id.trim()||!item.label.trim()||ids.has(item.id))throw new Error('Descriptions need unique IDs and labels.');if(typeof item.value==='number')finiteDisplayValue(item.value);ids.add(item.id);}});}
}

@Component({selector:'ui-statistic,ui-metric-card',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<div class="ui-metric"><span class="ui-metric-label">{{label()}}</span><p class="ui-metric-value">{{formatted()??uiEffective_missingLabel()}}@if(formatted()!==null&&unit()){<span> {{unit()}}</span>}</p>@if(comparisonLabel()){<p>{{comparisonLabel()}}: {{formattedComparison()??uiEffective_missingLabel()}}</p><p class="ui-display-tone" [attr.data-tone]="deltaTone()">{{uiEffective_deltaLabel()}}: {{formattedDelta()??uiEffective_unavailableDeltaLabel()}}</p>}</div>`,
 styles:[displayStyles,`:host{display:block;}.ui-metric{padding:var(--ui-space-field);background:var(--ui-color-surface);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);overflow-wrap:anywhere;}.ui-metric-label{font-weight:var(--ui-weight-control);}.ui-metric-value{font-size:var(--ui-text-heading);line-height:var(--ui-leading-heading);font-weight:var(--ui-weight-heading);}p{margin-block:var(--ui-space-control-gap) 0;}`]})
export class Statistic {
 protected readonly uiText_Statistic=injectUiMessageText();
 readonly label=input.required<string>();readonly value=input<number|null>(null);readonly unit=input('');readonly comparison=input<number|null>(null);readonly comparisonLabel=input('');readonly deltaLabel=input<string>();
 protected readonly uiEffective_deltaLabel=uiLocaleComputed(()=>this.deltaLabel()??this.uiText_Statistic("uiFoundation.statistic.change"));readonly deltaMode=input<'absolute'|'percent'>('absolute');readonly deltaTone=input<DisplayTone>('neutral');protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly format=input<Intl.NumberFormatOptions>();protected readonly effectiveFormat=computed(()=>this.format()??this.uiLocaleDefaults().numberOptions);readonly missingLabel=input<string>();
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_Statistic("uiFoundation.statistic.unavailable"));readonly unavailableDeltaLabel=input<string>();
 protected readonly uiEffective_unavailableDeltaLabel=uiLocaleComputed(()=>this.unavailableDeltaLabel()??this.uiText_Statistic("uiFoundation.statistic.comparisonUnavailable"));
 protected readonly formatted=computed(()=>numberDisplay(this.value(),this.effectiveLocale(),this.effectiveFormat()));protected readonly formattedComparison=computed(()=>numberDisplay(this.comparison(),this.effectiveLocale(),this.effectiveFormat()));protected readonly formattedDelta=computed(()=>numberDisplay(comparisonDelta(this.value(),this.comparison(),this.deltaMode()),this.effectiveLocale(),this.deltaMode()==='percent'?{style:'percent',maximumFractionDigits:2,signDisplay:'always'}:{...this.effectiveFormat(),signDisplay:'always'}));
 constructor(){effect(()=>{if(!this.label().trim())throw new Error('Statistic label must be nonempty.');finiteDisplayValue(this.value());finiteDisplayValue(this.comparison(),'comparison');});}
}

@Component({selector:'ui-meter',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<div class="ui-meter"><span class="ui-meter-label" [id]="controlId()+'-label'">{{label()}}</span>@if(range().value!==null){<meter [id]="controlId()" [attr.aria-labelledby]="controlId()+'-label'" [value]="range().value!" [min]="range().min" [max]="range().max" [attr.low]="range().low" [attr.high]="range().high" [attr.optimum]="range().optimum" [attr.aria-valuetext]="formatted()+' '+unit()">{{formatted()}}</meter><bdi class="ui-meter-value" dir="ltr"><span class="ui-meter-number">{{formatted()}}</span><bdi>{{' '+unit()}}</bdi> / <span class="ui-meter-maximum">{{formattedMaximum()}}</span></bdi>}@else{<span [id]="controlId()">{{uiEffective_missingLabel()}}</span>}</div>`,
 styles:[displayStyles,`:host{display:block;background:var(--ui-color-surface);}.ui-meter{display:grid;gap:var(--ui-space-control-gap);overflow-wrap:anywhere;}.ui-meter-label{font-weight:var(--ui-weight-control);}meter{inline-size:100%;min-block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}`]})
export class Meter {
 protected readonly uiText_Meter=injectUiMessageText();
 readonly controlId=input.required<string>();readonly label=input.required<string>();readonly value=input<number|null>(null);readonly minimum=input(0);readonly maximum=input(100);readonly low=input<number|null>(null);readonly high=input<number|null>(null);readonly optimum=input<number|null>(null);readonly unit=input('');protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly format=input<Intl.NumberFormatOptions>();protected readonly effectiveFormat=computed(()=>this.format()??this.uiLocaleDefaults().numberOptions);readonly missingLabel=input<string>();
 protected readonly uiEffective_missingLabel=uiLocaleComputed(()=>this.missingLabel()??this.uiText_Meter("uiFoundation.meter.unavailable"));
 protected readonly range=computed(()=>meterValues(this.value(),this.minimum(),this.maximum(),this.low(),this.high(),this.optimum()));protected readonly formatted=computed(()=>numberDisplay(this.value(),this.effectiveLocale(),this.effectiveFormat()));protected readonly formattedMaximum=computed(()=>numberDisplay(this.maximum(),this.effectiveLocale(),this.effectiveFormat()));
 constructor(){effect(()=>{if(!this.controlId().trim()||!this.label().trim())throw new Error('Meter needs an ID and label.');this.range();});}
}
@Component({selector:'ui-meter-group',standalone:true,imports:[Meter,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 host:{role:'group','[attr.aria-label]':'label()'},
 template:`<p>{{'uiFoundation.meterGroup.availableForLabel' | uiStableMessage:{label:label()} }} <bdi class="ui-meter-total" dir="ltr"><span class="ui-meter-sum">{{formattedSum()}}</span> / <span class="ui-meter-maximum">{{formattedMaximum()}}</span></bdi>@if(totals().unknown){  {{'uiFoundation.meterGroup.unavailableCount' | uiStableMessage:{count:totals().unknown} }}}</p><div class="ui-meter-segments" aria-hidden="true">@for(item of items();track item.id){@if(item.value!==null){<span [style.inline-size.%]="item.value/maximum()*100" [attr.data-tone]="item.tone??'neutral'" [attr.title]="item.label"></span>}}</div><div class="ui-meter-items">@for(item of items();track item.id){<div class="ui-meter-entry ui-display-tone" [attr.data-tone]="item.tone??'neutral'"><ui-meter [controlId]="controlId()+'-'+item.id" [label]="item.label" [value]="item.value" [maximum]="maximum()" [unit]="unit()" [locale]="effectiveLocale()" [format]="effectiveFormat()" /></div>}</div>`,
 styles:[displayStyles,`:host{display:block;}p{margin-block:0 var(--ui-space-control-gap);overflow-wrap:anywhere;}.ui-meter-segments{display:flex;inline-size:100%;min-block-size:var(--ui-size-icon);background:var(--ui-color-background);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);overflow:hidden;}.ui-meter-segments span{background:var(--ui-color-text);}.ui-meter-segments [data-tone="muted"]{background:var(--ui-color-muted);}.ui-meter-segments [data-tone="info"]{background:var(--ui-color-link);}.ui-meter-segments [data-tone="success"]{background:var(--ui-color-success);}.ui-meter-segments [data-tone="warning"]{background:var(--ui-color-warning);}.ui-meter-segments [data-tone="error"]{background:var(--ui-color-danger);}.ui-meter-items{display:grid;gap:var(--ui-space-control-gap);margin-block-start:var(--ui-space-control-gap);}.ui-meter-entry{padding:var(--ui-space-control-gap);}`]})
export class MeterGroup {
 readonly controlId=input.required<string>();readonly label=input.required<string>();readonly items=input.required<readonly MeterSegment[]>();readonly maximum=input(100);readonly unit=input('');protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly format=input<Intl.NumberFormatOptions>();protected readonly effectiveFormat=computed(()=>this.format()??this.uiLocaleDefaults().numberOptions);protected readonly totals=computed(()=>meterGroupValues(this.items(),this.maximum()));protected readonly formattedSum=computed(()=>numberDisplay(this.totals().sum,this.effectiveLocale(),this.effectiveFormat()));protected readonly formattedMaximum=computed(()=>numberDisplay(this.maximum(),this.effectiveLocale(),this.effectiveFormat()));
 constructor(){effect(()=>{if(!this.controlId().trim()||!this.label().trim())throw new Error('MeterGroup needs an ID and label.');this.totals();});}
}

@Component({selector:'ui-help-text',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 host:{'[attr.data-position]':'position()'},template:'<ng-content />',
 styles:[displayStyles,`:host{display:block;color:var(--ui-color-muted);background:var(--ui-color-surface);font-size:var(--ui-text-small);overflow-wrap:anywhere;}:host([data-position="inline"]){display:inline;}:host([data-position="below"]){margin-block-start:var(--ui-space-control-gap);}:host([data-position="above"]){margin-block-end:var(--ui-space-control-gap);}`]})
export class HelpText {readonly position=input<'inline'|'above'|'below'>('below');}
@Component({selector:'ui-shortcut-hint',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 host:{'[attr.aria-label]':'label()','[attr.role]':'label()?"img":null','[attr.data-position]':'position()'},
 template:`@for(key of keys();track $index){@if($index){<span [attr.aria-hidden]="label()?'true':null"> + </span>}<kbd [attr.aria-hidden]="label()?'true':null">{{key}}</kbd>}`,
 styles:[displayStyles,`:host{display:inline-flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);font-size:var(--ui-text-small);}:host([data-position="below"]){display:flex;margin-block-start:var(--ui-space-control-gap);}kbd{font-family:var(--ui-font-code);padding:var(--ui-space-control-gap);color:var(--ui-color-text);background:var(--ui-color-background);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);overflow-wrap:anywhere;}`]})
export class ShortcutHint {readonly keys=input.required<readonly string[]>();readonly label=input<string|null>(null);readonly position=input<'inline'|'below'>('inline');constructor(){effect(()=>{if(!this.keys().length||this.keys().some(key=>!key.trim())||this.label()!==null&&!this.label()!.trim())throw new Error('ShortcutHint needs nonempty keys and an optional nonempty spoken label.');});}}
