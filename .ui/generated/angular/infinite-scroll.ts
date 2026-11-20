import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,DestroyRef,ElementRef,inject,input,output,signal,untracked,viewChild} from '@angular/core';
import {ActionControl} from './action-control';
import {installCollectionFocus} from './collection-runtime';
export interface CollectionLoadRequest{id:number;reason:'button'|'intersection'|'retry';}
let collectionLoadId=0;
/** A local request token, never an abort or a successful backend update. */
@Component({selector:'ui-infinite-scroll',standalone:true,imports:[ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,host:{tabindex:'-1','[attr.aria-label]':'label()'},
 template:`<section [attr.aria-label]="label()" [attr.aria-busy]="active()"><ng-content/><div #sentinel class="ui-infinite-sentinel" aria-hidden="true"></div>@if(active()){<p role="status">{{uiEffective_loadingMessage()}}</p>}@else if(problem()){<p role="alert">{{problem()}}</p>}@else if(failure()){<p role="alert">{{failure()}}</p>}@else if(finished()){<p role="status">{{uiEffective_endMessage()}}</p>}@if(!finished()&&!problem()){<button uiAction data-collection-control [disabled]="disabled()||active()" (click)="request(failure()?'retry':'button')">{{failure()?('uiFoundation.infiniteScroll.retry' | uiStableMessage):('uiFoundation.infiniteScroll.loadMore' | uiStableMessage)}}</button>}</section>`,
 styles:`:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}:host:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}section{min-inline-size:0;max-inline-size:100%;}p{overflow-wrap:anywhere;}.ui-infinite-sentinel{block-size:var(--ui-border-control);inline-size:100%;}`})
export class InfiniteScroll{
 private readonly uiRuntimeText_InfiniteScroll=injectUiRuntimeText();

 protected readonly uiText_InfiniteScroll=injectUiMessageText();
 readonly label=input.required<string>();readonly loading=input(false,{transform:booleanAttribute});readonly finished=input(false,{transform:booleanAttribute});readonly error=input<string|null>(null);readonly disabled=input(false,{transform:booleanAttribute});readonly autoLoad=input(true,{transform:booleanAttribute});readonly observerRoot=input<HTMLElement|null>(null);readonly rootMargin=input('0px');readonly resetKey=input<string|number>('');readonly contentVersion=input<string|number>(0);readonly loadingMessage=input<string>();
 protected readonly uiEffective_loadingMessage=uiLocaleComputed(()=>this.loadingMessage()??this.uiText_InfiniteScroll("uiFoundation.infiniteScroll.loading"));readonly endMessage=input<string>();
 protected readonly uiEffective_endMessage=uiLocaleComputed(()=>this.endMessage()??this.uiText_InfiniteScroll("uiFoundation.infiniteScroll.allItemsAreDisplayed"));readonly loadRequested=output<CollectionLoadRequest>();
 private readonly sentinel=viewChild<ElementRef<HTMLElement>>('sentinel');private readonly destroy=inject(DestroyRef);private readonly pending=signal<CollectionLoadRequest|null>(null);private readonly localError=signal<string|null>(null);private readonly observerError=uiMessageState<string | null>(null);private readonly lastAutoVersion=signal<string|number|null>(null);private observedKey:string|number|undefined;private observerGeneration=0;private readonly observerRevision=signal(0);
 protected readonly active=computed(()=>this.loading()||this.pending()!==null);protected readonly failure=computed(()=>this.localError()??this.error()??this.observerError());
 protected readonly problem=computed(()=>!this.label().trim()||!this.uiEffective_loadingMessage().trim()||!this.uiEffective_endMessage().trim()?this.uiRuntimeText_InfiniteScroll("uiFoundation.infiniteScroll.provideADescriptionForLoadingMoreItems"):null);
 /** Releases only this host's pending presentation; the application supplies appended items and finished state. */
 completeLoad(id:number):boolean{if(this.destroy.destroyed||this.pending()?.id!==id||this.observedKey!==this.resetKey())return false;this.pending.set(null);this.localError.set(null);return true;}
 failLoad(id:number,message:string):boolean{if(this.destroy.destroyed||this.pending()?.id!==id||this.observedKey!==this.resetKey()||!message.trim())return false;this.pending.set(null);this.localError.set(message);return true;}
 invalidatePending():void{this.observerGeneration++;this.observerRevision.update(value=>value+1);this.pending.set(null);this.localError.set(null);this.lastAutoVersion.set(null);}
 protected request(reason:CollectionLoadRequest['reason']):void{if(this.destroy.destroyed||this.disabled()||this.active()||this.finished()||this.problem()||reason==='intersection'&&(!this.autoLoad()||this.failure()||this.lastAutoVersion()===this.contentVersion()))return;this.localError.set(null);this.observerError.set(null);if(reason==='intersection')this.lastAutoVersion.set(this.contentVersion());const request={id:++collectionLoadId,reason};this.pending.set(request);this.loadRequested.emit(request);}
 constructor(){installCollectionFocus();
  this.destroy.onDestroy(()=>this.invalidatePending());
  afterRenderEffect(()=>{const key=this.resetKey();untracked(()=>{if(this.observedKey!==key){this.observedKey=key;this.invalidatePending();}});});
  afterRenderEffect(()=>{this.observerRoot();this.rootMargin();const enabled=this.autoLoad();untracked(()=>{this.observerError.set(null);if(!enabled)this.lastAutoVersion.set(null);});});
  afterRenderEffect(onCleanup=>{this.observerRevision();const target=this.sentinel()?.nativeElement,root=this.observerRoot(),margin=this.rootMargin(),key=this.resetKey(),version=this.contentVersion(),enabled=this.autoLoad()&&!this.disabled()&&!this.finished()&&!this.active()&&!this.failure()&&!this.problem()&&this.lastAutoVersion()!==version;if(!target||!enabled)return;const generation=++this.observerGeneration;
   let observer:IntersectionObserver;try{observer=new IntersectionObserver(entries=>{if(generation!==this.observerGeneration||key!==this.resetKey()||root!==this.observerRoot()||margin!==this.rootMargin()||version!==this.contentVersion()||!this.autoLoad())return;if(entries.some(entry=>entry.target===target&&entry.isIntersecting))this.request('intersection');},{root,rootMargin:margin});}catch{this.observerError.setMessage([() => this.uiRuntimeText_InfiniteScroll("uiFoundation.infiniteScroll.checkTheAreaThatTriggersAutomaticLoadingYouCanStillLoadMoreItemsManually")]);return;}
   observer.observe(target);onCleanup(()=>{this.observerGeneration++;observer.disconnect();});
  });
 }
}
