import {injectUiMessageText as injectUiDiagnosticText} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText as injectUiTimelineText,injectUiMessageText,UiStableMessagePipe} from './locale';
import {injectUiLocale} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,contentChildren,DestroyRef,Directive,ElementRef,inject,input,output,signal,TemplateRef,untracked,viewChild} from '@angular/core';
import {CollectionPresentation} from './collection-views';
import type {CollectionKey} from './collection-model';
import {InfiniteScroll,type CollectionLoadRequest} from './infinite-scroll';
import {installCollectionFocus} from './collection-runtime';
import {canFocus} from './focus';
import {timelineConfigurationProblem,timelineDateTime,timelineDefaultDateOptions,timelineType,type TimelineDateTime} from './timeline-model';

export interface TimelineItemContext<T>{$implicit:T;key:CollectionKey;label:string;index:number;pageIndex:number;count:number;type:string;dateTime:TimelineDateTime;expanded:boolean;}
@Directive({selector:'ng-template[uiTimelineItem]',standalone:true})
export class TimelineItem<T extends object>{
 readonly of=input.required<readonly T[]>({alias:'uiTimelineItemOf'});
 readonly slot=input<'item'|'details'>('item',{alias:'uiTimelineItemSlot'});
 readonly template=inject<TemplateRef<TimelineItemContext<T>>>(TemplateRef);
 static ngTemplateContextGuard<T extends object>(_directive:TimelineItem<T>,_context:unknown):_context is TimelineItemContext<T>{return true;}
}
interface TimelineRequest{host:InfiniteScroll;request:CollectionLoadRequest;resetKey:string|number;}

/** Ordered activity presentation. App-supplied instants/policies/results remain application-owned. */
@Component({selector:'ui-timeline,ui-activity-log',standalone:true,imports:[NgTemplateOutlet,InfiniteScroll,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 host:{tabindex:'-1','[attr.aria-label]':'label()'},
 template:`<section [attr.aria-label]="label()">
 @if(problem()){<p role="alert">{{problem()}}</p>}
 @if(!itemProblem()){
 <ol>@for(item of items();track key(item);let index=$index){
  <li [attr.data-timeline-key]="key(item)"><div class="ui-timeline-meta"><span class="ui-timeline-type">{{itemType(item)}}</span>@if(dateTime(item).iso){<time [attr.datetime]="dateTime(item).iso">{{dateTime(item).text}}</time>}@else{<span>{{dateTime(item).text}}</span>}<span>{{effectiveTimeZone()}}</span></div>
   @if(typeProblem(item)){<p role="alert">{{typeProblem(item)}}</p>}
   @if(dateTime(item).problem){<p role="alert">{{dateTime(item).problem}}</p>}
   <div class="ui-timeline-content">@if(mainTemplate()){<ng-container [ngTemplateOutlet]="mainTemplate()!.template" [ngTemplateOutletContext]="timelineContext(item,index)" />}@else{<span class="ui-timeline-label">{{itemLabel(item)}}</span>@if(description(item)){<p>{{description(item)}}</p>}}</div>
   @if(hasDetails(item)){<details [open]="isExpanded(item)" (toggle)="toggle(item,$event)"><summary data-collection-control [attr.aria-label]="('uiFoundation.timeline.detailsForLabel' | uiStableMessage:{label:itemLabel(item)})">{{'uiFoundation.timeline.showDetails' | uiStableMessage}}</summary><div class="ui-timeline-details">@if(detailsTemplate()){<ng-container [ngTemplateOutlet]="detailsTemplate()!.template" [ngTemplateOutletContext]="timelineContext(item,index)" />}@else{<p>{{details(item)}}</p>}</div></details>}
  </li>
 }@empty{<li class="ui-timeline-empty">{{uiEffective_emptyMessage()}}</li>}</ol>
 }
 @if(loadMore()){<ui-infinite-scroll #loader [label]="('uiFoundation.timeline.loadMoreForLabel' | uiStableMessage:{label:label()})" [loading]="loading()" [finished]="finished()" [error]="loadError()" [disabled]="disabled()||!!problem()" [autoLoad]="autoLoad()" [observerRoot]="observerRoot()" [rootMargin]="rootMargin()" [resetKey]="resetKey()" [contentVersion]="contentVersion()" [loadingMessage]="uiEffective_loadingMessage()" [endMessage]="uiEffective_endMessage()" (loadRequested)="forwardLoad($event)" />}
 </section>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}section{min-inline-size:0;max-inline-size:100%;}ol{list-style:none;margin:0;padding:0;min-inline-size:0;}li{min-inline-size:0;border-inline-start:var(--ui-border-control) solid var(--ui-color-border);padding-inline-start:var(--ui-space-field);padding-block:var(--ui-space-control-y);color:var(--ui-color-text);overflow-wrap:anywhere;}.ui-timeline-meta{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--ui-space-control-gap);font-size:var(--ui-text-small);color:var(--ui-color-muted);}.ui-timeline-type,.ui-timeline-label{font-weight:var(--ui-weight-control);}.ui-timeline-type{color:var(--ui-color-text);}.ui-timeline-content,.ui-timeline-details{min-inline-size:0;overflow-wrap:anywhere;}.ui-timeline-content{margin-block:var(--ui-space-control-gap);}details{min-inline-size:0;}summary{cursor:pointer;min-block-size:var(--ui-size-control);box-sizing:border-box;padding-block:var(--ui-space-control-y);color:var(--ui-color-link);}summary:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}p{overflow-wrap:anywhere;margin-block:var(--ui-space-control-gap);}p[role=alert]{color:var(--ui-color-danger);}.ui-timeline-empty{color:var(--ui-color-muted);}`})
export class Timeline<T extends object> extends CollectionPresentation<T>{
 private readonly uiDiagnostic_Timeline=injectUiDiagnosticText();

 private readonly uiRuntimeText_Timeline=injectUiRuntimeText();

 protected readonly uiText_Timeline=injectUiMessageText();private readonly uiTimelineText=injectUiTimelineText();
 readonly dateTimeField=input.required<Extract<keyof T,string>>();readonly typeField=input.required<Extract<keyof T,string>>();readonly detailsField=input<Extract<keyof T,string>|null>(null);readonly timeZone=input<string>();protected readonly effectiveTimeZone=computed(()=>this.timeZone()??this.uiLocaleDefaults().timeZone);protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly dateTimeOptions=input<Intl.DateTimeFormatOptions>();protected readonly effectiveDateTimeOptions=computed(()=>this.dateTimeOptions()??this.uiLocaleDefaults().dateTimeOptions);
 readonly expandedKeys=input<readonly CollectionKey[]|undefined>();readonly expandedKeysChange=output<readonly CollectionKey[]>();
 readonly loadMore=input(false,{transform:booleanAttribute});readonly loading=input(false,{transform:booleanAttribute});readonly finished=input(false,{transform:booleanAttribute});readonly loadError=input<string|null>(null);readonly disabled=input(false,{transform:booleanAttribute});readonly autoLoad=input(true,{transform:booleanAttribute});readonly observerRoot=input<HTMLElement|null>(null);readonly rootMargin=input('0px');readonly resetKey=input<string|number>('');readonly contentVersion=input<string|number>(0);readonly loadingMessage=input<string>();
 protected readonly uiEffective_loadingMessage=uiLocaleComputed(()=>this.loadingMessage()??this.uiText_Timeline("uiFoundation.timeline.loading"));readonly endMessage=input<string>();
 protected readonly uiEffective_endMessage=uiLocaleComputed(()=>this.endMessage()??this.uiText_Timeline("uiFoundation.timeline.allItemsAreDisplayed"));readonly loadRequested=output<CollectionLoadRequest>();
 private readonly templates=contentChildren<TimelineItem<T>>(TimelineItem);protected readonly mainTemplate=computed(()=>this.templates().find(template=>template.slot()==='item'));protected readonly detailsTemplate=computed(()=>this.templates().find(template=>template.slot()==='details'));
 private readonly storedExpanded=signal<readonly CollectionKey[]>([]);private readonly loader=viewChild(InfiniteScroll);private readonly destroy=inject(DestroyRef);private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private pending:TimelineRequest|null=null;private focusedDetail:HTMLElement|null=null;
 protected readonly problem=computed(()=>{if(this.itemProblem())return this.itemProblem();const expanded=this.expandedKeys();if(expanded!==undefined&&(!Array.isArray(expanded)||new Set(expanded).size!==expanded.length||expanded.some(key=>!this.items().some(item=>this.key(item)===key))))return this.uiRuntimeText_Timeline("uiFoundation.timeline.provideAUniqueCurrentItemKeyForEachExpandedDetail");if(this.templates().filter(template=>template.slot()==='item').length>1||this.templates().filter(template=>template.slot()==='details').length>1)return this.uiRuntimeText_Timeline("uiFoundation.timeline.provideOneItemTemplateAndOneDetailTemplateForTheTimeline");return timelineConfigurationProblem(this.effectiveLocale(),this.effectiveTimeZone()??'',this.effectiveDateTimeOptions(), this.uiDiagnostic_Timeline);});
 private readonly times=computed(()=>{const result=new Map<CollectionKey,TimelineDateTime>();if(this.itemProblem())return result;for(const item of this.items()){const date=timelineDateTime(item[this.dateTimeField()],this.effectiveLocale(),this.effectiveTimeZone()??'',this.effectiveDateTimeOptions(),this.uiTimelineText);result.set(this.key(item),date);}return result;});
 protected dateTime(item:T):TimelineDateTime{return this.times().get(this.key(item))!;}
 protected itemType(item:T):string{return timelineType(item[this.typeField()],this.uiTimelineText).text;}
 protected typeProblem(item:T):string|null{return timelineType(item[this.typeField()],this.uiTimelineText).problem;}
 protected details(item:T):string{const value=this.detailsField()===null?null:item[this.detailsField()!];return value===null||value===undefined?'':String(value);}
 protected hasDetails(item:T):boolean{return !!this.detailsTemplate()||!!this.details(item);}
 protected isExpanded(item:T):boolean{return (this.expandedKeys()??this.storedExpanded()).includes(this.key(item));}
 protected timelineContext(item:T,index:number):TimelineItemContext<T>{return {$implicit:item,key:this.key(item),label:this.itemLabel(item),index,pageIndex:index,count:this.items().length,type:this.itemType(item),dateTime:this.dateTime(item),expanded:this.isExpanded(item)};}
 protected toggle(item:T,event:Event):void{const expanded=(event.target as HTMLDetailsElement).open,current=this.expandedKeys()??this.storedExpanded(),key=this.key(item);if(current.includes(key)===expanded)return;const next=expanded?[...current,key]:current.filter(id=>id!==key);this.storedExpanded.set(next);this.expandedKeysChange.emit(next);}
 protected forwardLoad(request:CollectionLoadRequest):void{const host=this.loader();if(!host||this.destroy.destroyed||!this.loadMore())return;this.pending={host,request,resetKey:this.resetKey()};this.loadRequested.emit(request);}
 /** Acknowledge only the exact request from the current, unchanged loader host. */
 completeLoad(id:number):boolean{const pending=this.pending;if(!this.validRequest(pending,id)||!pending!.host.completeLoad(id))return false;this.pending=null;return true;}
 failLoad(id:number,message:string):boolean{const pending=this.pending;if(!this.validRequest(pending,id)||!pending!.host.failLoad(id,message))return false;this.pending=null;return true;}
 private validRequest(pending:TimelineRequest|null,id:number):boolean{return !this.destroy.destroyed&&this.loadMore()&&!!pending&&pending.request.id===id&&pending.resetKey===this.resetKey()&&pending.host===this.loader();}
 /** Call before a synchronous app query change when an old same-turn result must be rejected. */
 invalidatePending():void{this.pending?.host.invalidatePending();this.pending=null;this.loader()?.invalidatePending();}
 constructor(){super();installCollectionFocus();this.destroy.onDestroy(()=>{this.invalidatePending();this.focusedDetail=null;});
  afterRenderEffect(()=>{this.loadMore();this.loader();this.resetKey();untracked(()=>{if(this.pending&&!this.validRequest(this.pending,this.pending.request.id))this.invalidatePending();});});
  // Native closed details retain DOM. Move only focus trapped in a newly hidden
  // detail subtree to its own summary; never reclaim an external/projected edit.
  afterRenderEffect(onCleanup=>{const focused=(event:FocusEvent)=>{const target=event.target;this.focusedDetail=target instanceof HTMLElement&&target.closest('.ui-timeline-details')&&this.element.contains(target)?target:null;};const toggled=(event:Event)=>{const details=event.target;if(!(details instanceof HTMLDetailsElement)||details.open||!this.focusedDetail||!details.contains(this.focusedDetail))return;const active=this.element.ownerDocument.activeElement;if(active===this.focusedDetail||active===this.element.ownerDocument.body){const summary=details.querySelector<HTMLElement>('summary');if(canFocus(summary))summary.focus({preventScroll:true});}this.focusedDetail=null;};this.element.ownerDocument.addEventListener('focusin',focused,true);this.element.addEventListener('toggle',toggled,true);onCleanup(()=>{this.element.ownerDocument.removeEventListener('focusin',focused,true);this.element.removeEventListener('toggle',toggled,true);});});
 }
}
