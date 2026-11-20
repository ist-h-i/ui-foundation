import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessage} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { focusBeforeHiding } from './layout';
@Component({selector:'ui-page-frame,ui-app-shell',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 host:{class:'ui-page-frame','[attr.data-fixed-header]':'stickyHeader()','[attr.data-fixed-sidebar]':'fixedSidebar()&&enoughRoom()','[attr.data-fixed-footer]':'stickyFooter()','[style.--ui-frame-header-height.px]':'stickyHeader()?headerHeight():0','[style.--ui-frame-footer-height.px]':'stickyFooter()?footerHeight():0','[style.--ui-frame-scroll-height.px]':'scrollHeight()'},
 template:`<header #header class="ui-page-frame__header" [hidden]="!showHeader()"><div class="ui-page-frame__heading">
 @if(headingLevel()===1){<h1>{{title()}}</h1>}@else{<h2>{{title()}}</h2>}<ng-content select="[uiPageContext]" /><ng-content select="[uiPageHeader]" /></div>
 <div #actions class="ui-page-frame__actions" [hidden]="!showActions()"><ng-content select="[uiPageActions]" /></div></header>
 <div class="ui-page-frame__layout" [attr.data-sidebar]="showSidebar()"><aside #sidebar class="ui-page-frame__sidebar" [attr.aria-label]="uiEffective_sidebarLabel()" [hidden]="!showSidebar()"><ng-content select="[uiPageSidebar]" /></aside>
 <div class="ui-page-frame__body"><ng-content /></div></div>
 <footer #footer class="ui-page-frame__footer" [hidden]="!showFooter()"><ng-content select="[uiPageFooter]" /></footer><span #measure class="ui-page-frame__measure" aria-hidden="true"></span>`,
 styleUrl:'./page-frame.css'})
export class PageFrame {
 protected readonly uiText_PageFrame=injectUiMessage();
 readonly title=input.required<string>();readonly headingLevel=input<1|2>(1);readonly showHeader=input(true,{transform:booleanAttribute});readonly showSidebar=input(false,{transform:booleanAttribute});readonly showFooter=input(true,{transform:booleanAttribute});readonly showActions=input(true,{transform:booleanAttribute});readonly fixedHeader=input(false,{transform:booleanAttribute});readonly fixedSidebar=input(false,{transform:booleanAttribute});readonly fixedFooter=input(false,{transform:booleanAttribute});readonly sidebarLabel=input<string>();
 protected readonly uiEffective_sidebarLabel=uiLocaleComputed(()=>this.sidebarLabel()??this.uiText_PageFrame({id:'uiFoundation.pageFrame.sidebarLabel'}));readonly focusFallback=input<HTMLElement|null>(null);
 protected readonly headerHeight=signal(0);protected readonly footerHeight=signal(0);protected readonly scrollHeight=signal(0);private readonly minimumHeight=signal(0);private readonly measure=viewChild<ElementRef<HTMLElement>>('measure');
 protected readonly enoughRoom=computed(()=>this.scrollHeight()>(this.fixedHeader()&&this.showHeader()?this.headerHeight():0)+(this.fixedFooter()&&this.showFooter()?this.footerHeight():0)+this.minimumHeight());protected readonly stickyHeader=computed(()=>this.fixedHeader()&&this.showHeader()&&this.enoughRoom());protected readonly stickyFooter=computed(()=>this.fixedFooter()&&this.showFooter()&&this.enoughRoom());
 private readonly header=viewChild<ElementRef<HTMLElement>>('header');private readonly actions=viewChild<ElementRef<HTMLElement>>('actions');private readonly sidebar=viewChild<ElementRef<HTMLElement>>('sidebar');private readonly footer=viewChild<ElementRef<HTMLElement>>('footer');
 constructor(){
  const root=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,view=root.ownerDocument.defaultView;
  let resizeObserver:ResizeObserver|undefined,ancestorObserver:MutationObserver|undefined,scrollOwner:HTMLElement|null=null;
  const nearest=():HTMLElement|null=>{for(let parent=root.parentElement;parent&&parent!==root.ownerDocument.body&&parent!==root.ownerDocument.documentElement;parent=parent.parentElement){if(/^(auto|scroll|hidden|overlay)$/.test(view!.getComputedStyle(parent).overflowY))return parent;}return null;};
  const update=()=>{const next=nearest();if(next!==scrollOwner){if(scrollOwner)resizeObserver?.unobserve(scrollOwner);if(next)resizeObserver?.observe(next);scrollOwner=next;}this.scrollHeight.set(next?.clientHeight??view?.innerHeight??0);this.headerHeight.set(this.header()?.nativeElement.getBoundingClientRect().height??0);this.footerHeight.set(this.footer()?.nativeElement.getBoundingClientRect().height??0);this.minimumHeight.set(this.measure()?.nativeElement.getBoundingClientRect().height??0);};
  const watchAncestors=()=>{ancestorObserver?.disconnect();for(let parent=root.parentElement;parent;parent=parent.parentElement)ancestorObserver?.observe(parent,{childList:true,attributes:true,attributeFilter:['style','class','dir','data-ui-profile']});update();};
  view?.addEventListener('resize',update);
  afterRenderEffect(()=>{const header=this.header(),footer=this.footer(),minimum=this.measure();this.showHeader();this.showFooter();resizeObserver?.disconnect();scrollOwner=null;resizeObserver=new ResizeObserver(update);for(const ref of [header,footer,minimum])if(ref)resizeObserver.observe(ref.nativeElement);ancestorObserver??=new MutationObserver(watchAncestors);watchAncestors();});
  inject(DestroyRef).onDestroy(()=>{resizeObserver?.disconnect();ancestorObserver?.disconnect();view?.removeEventListener('resize',update);});
  effect(()=>{const states:Array<[boolean,ElementRef<HTMLElement>|undefined]>=[[this.showHeader(),this.header()],[this.showActions(),this.actions()],[this.showSidebar(),this.sidebar()],[this.showFooter(),this.footer()]];const fallback=this.focusFallback();for(const [shown,region]of states)if(!shown&&region)untracked(()=>focusBeforeHiding(region.nativeElement,fallback));});
 }
}
