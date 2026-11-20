import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {UiStableMessagePipe} from './locale';
import {afterNextRender,afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,DestroyRef,ElementRef,inject,input,output,signal,untracked,viewChild} from '@angular/core';
import {canFocus} from './focus';
import {ActionControl} from './action-control';import {isMediaVisible,observeMediaVisibility} from './media-dom';import {mediaStyles} from './media-style';
export interface MediaCaption {id:string;src:string;language:string;label:string;kind?:'subtitles'|'captions';}
export interface MediaPlaybackState {playing:boolean;currentTime:number;duration:number|null;volume:number;rate:number;}
@Component({selector:'ui-audio-player,ui-video-player',standalone:true,imports:[ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,host:{'[attr.aria-busy]':'pending()||reloading()'},
 template:`<p>{{label()}}</p>@if(kind()==='video'){<video #media [src]="src()" [poster]="poster()" [attr.preload]="preload()" playsinline [controls]="!disabled()" [attr.aria-label]="label()" (loadedmetadata)="loaded()" (play)="sync()" (pause)="sync()" (timeupdate)="sync()" (volumechange)="sync()" (ratechange)="sync()" (ended)="sync()" (error)="failed()">@for(caption of captions();track caption.id){<track [src]="caption.src" [kind]="caption.kind??'captions'" [srclang]="caption.language" [label]="caption.label">}</video>}@else{<audio #media [src]="src()" [attr.preload]="preload()" [controls]="!disabled()" [attr.aria-label]="label()" (loadedmetadata)="loaded()" (play)="sync()" (pause)="sync()" (timeupdate)="sync()" (volumechange)="sync()" (ratechange)="sync()" (ended)="sync()" (error)="failed()">@for(caption of captions();track caption.id){<track [src]="caption.src" [kind]="caption.kind??'captions'" [srclang]="caption.language" [label]="caption.label">}</audio>}<div class="ui-media-actions"><button #playAction uiAction [disabled]="disabled()||pending()" (click)="toggle()">{{state().playing?('uiFoundation.mediaPlayer.pause' | uiStableMessage):('uiFoundation.mediaPlayer.play' | uiStableMessage)}}</button><button uiAction [disabled]="disabled()" (click)="stop()">{{'uiFoundation.mediaPlayer.stop' | uiStableMessage}}</button><label>{{'uiFoundation.mediaPlayer.volume' | uiStableMessage}}<input type="range" min="0" max="100" step="1" [value]="state().volume*100" [disabled]="disabled()" (input)="setVolume($event)"></label><label>{{'uiFoundation.mediaPlayer.playbackSpeed' | uiStableMessage}}<span class="ui-select-control"><select class="ui-field-control" [value]="state().rate" [disabled]="disabled()" (change)="setRate($event)"><option value="0.5">{{'uiFoundation.mediaPlayer.halfSpeed' | uiStableMessage}}</option><option value="1">{{'uiFoundation.mediaPlayer.normalSpeed' | uiStableMessage}}</option><option value="1.5">{{'uiFoundation.mediaPlayer.oneAndHalfSpeed' | uiStableMessage}}</option><option value="2">{{'uiFoundation.mediaPlayer.doubleSpeed' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label><label>{{'uiFoundation.mediaPlayer.captions' | uiStableMessage}}<span class="ui-select-control"><select class="ui-field-control" #captionSelect [value]="captionId()??''" [disabled]="disabled()" (change)="setCaption($event)"><option value="">{{'uiFoundation.mediaPlayer.noCaptions' | uiStableMessage}}</option>@for(caption of captions();track caption.id){<option [value]="caption.id">{{caption.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label>@if(kind()==='video'){<button uiAction [disabled]="disabled()||!fullscreenSupported()" (click)="fullscreen()">{{'uiFoundation.mediaPlayer.fullScreen' | uiStableMessage}}</button>}</div><p #actionStatus data-media-status tabindex="-1" role="status" aria-atomic="true" [class.ui-media-error]="!!error()">{{reloading()?('uiFoundation.mediaPlayer.loading' | uiStableMessage):error()||status()}}</p>@if(error()){<button #retryAction uiAction [disabled]="disabled()" (click)="retry()">{{'uiFoundation.mediaPlayer.reloadMedia' | uiStableMessage}}</button>}@if(activeCue()){<p class="ui-media-caption" aria-live="off">{{activeCue()}}</p>}@if(transcript()){<details><summary>{{'uiFoundation.mediaPlayer.transcript' | uiStableMessage}}</summary><p>{{transcript()}}</p></details>}`,
 styles:mediaStyles+`[data-media-status],.ui-media-actions button,[data-media-status]+button{scroll-margin:calc(var(--ui-border-focus) + var(--ui-border-focus-offset));}video{inline-size:100%;max-block-size:var(--ui-size-media-viewport);background:var(--ui-color-background);}audio{display:block;inline-size:100%;max-inline-size:100%;}.ui-media-actions label{flex:1 1 var(--ui-size-grid-item);}.ui-media-caption{background:var(--ui-color-surface);padding:var(--ui-space-control-gap);}@media(max-width:40rem){.ui-media-actions .ui-select-control{--ui-space-control-x:var(--ui-space-control-gap);}}`})
export class MediaPlayer {
 private readonly uiRuntimeText_MediaPlayer=injectUiRuntimeText();

 readonly label=input.required<string>();readonly kind=input<'audio'|'video'>(inject(ElementRef).nativeElement.localName==='ui-audio-player'?'audio':'video');readonly src=input.required<string>();readonly poster=input('');readonly preload=input<'none'|'metadata'|'auto'>('metadata');readonly captions=input<readonly MediaCaption[]>([]);readonly transcript=input('');readonly disabled=input(false,{transform:booleanAttribute});readonly stateChange=output<MediaPlaybackState>();readonly playbackFailed=output<'load'|'play'|'fullscreen'>();
 protected readonly state=signal<MediaPlaybackState>({playing:false,currentTime:0,duration:null,volume:1,rate:1});protected readonly status=uiMessageState('');protected readonly error=uiMessageState('');protected readonly pending=signal(false);protected readonly reloading=signal(false);protected readonly captionId=signal<string|null>(null);protected readonly activeCue=signal('');protected readonly fullscreenSupported=signal(false);
 private readonly media=viewChild<ElementRef<HTMLMediaElement>>('media');private readonly playAction=viewChild<unknown,ElementRef<HTMLButtonElement>>('playAction',{read:ElementRef});private readonly retryAction=viewChild<unknown,ElementRef<HTMLButtonElement>>('retryAction',{read:ElementRef});private readonly actionStatus=viewChild<ElementRef<HTMLParagraphElement>>('actionStatus');private actionFocus:{revision:number;source:string;media:HTMLMediaElement;action:'play'|'retry'}|null=null;private readonly captionSelect=viewChild<ElementRef<HTMLSelectElement>>('captionSelect');private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private destroyed=false;private revision=0;private currentSource='';private currentMedia:HTMLMediaElement|null=null;private cueCleanup=()=>{};
 private readonly captionSources=new Map<HTMLTrackElement,string>();private readonly captionIds=new Map<HTMLTrackElement,string>();private readonly pendingCaptionLoads=new Set<HTMLTrackElement>();private reconcilingCaptions=false;
 constructor(){
  let visibilityCleanup=()=>{};
  afterNextRender(()=>{this.fullscreenSupported.set(!!this.element.requestFullscreen&&this.element.ownerDocument.fullscreenEnabled);visibilityCleanup=observeMediaVisibility(this.element,value=>{if(!value){this.revision++;this.pending.set(false);this.reloading.set(false);this.actionFocus=null;this.media()?.nativeElement.pause();}});});
  afterRenderEffect(()=>{const source=this.src(),disabled=this.disabled(),kind=this.kind(),captions=this.captions(),media=this.media()?.nativeElement,retry=this.retryAction()?.nativeElement,play=this.playAction()?.nativeElement,status=this.actionStatus()?.nativeElement,error=this.error(),pending=this.pending(),reloading=this.reloading();this.status();untracked(()=>{
   if(source!==this.currentSource){this.revision++;this.pending.set(false);this.reloading.set(false);this.actionFocus=null;this.currentMedia?.pause();this.error.set('');this.status.set('');this.currentSource=source;this.captionId.set(null);this.activeCue.set('');}
   if(media!==this.currentMedia){this.revision++;this.pending.set(false);this.reloading.set(false);this.actionFocus=null;this.currentMedia?.pause();this.currentMedia=media??null;}
   if(media){if(disabled||!isMediaVisible(this.element)){this.revision++;this.pending.set(false);this.reloading.set(false);this.actionFocus=null;media.pause();}this.configureCaptions(media,captions);}
   const focus=this.actionFocus;
   if(focus){
    if(focus.revision!==this.revision||focus.source!==source||focus.media!==media||disabled||!canFocus(status??null))this.actionFocus=null;
    else {
     const finished=focus.action==='play'?!pending:!reloading;
     if(this.element.ownerDocument.activeElement===status){const candidate=finished?(error?retry:focus.action==='play'?play:status):status;const target=canFocus(candidate??null)?candidate!:status!;if(target!==status)target.focus({preventScroll:true});if(this.element.ownerDocument.activeElement===target)target.scrollIntoView({block:'nearest',inline:'nearest'});}
     if(finished)this.actionFocus=null;
    }
   }
   void kind;
  });});
  inject(DestroyRef).onDestroy(()=>{this.destroyed=true;this.revision++;this.actionFocus=null;visibilityCleanup();this.cueCleanup();this.captionSources.clear();this.captionIds.clear();this.pendingCaptionLoads.clear();const media=this.media()?.nativeElement;media?.pause();media?.removeAttribute('src');media?.load();});
 }
 private holdActionFocus(action:'play'|'retry',revision:number,source:string,media:HTMLMediaElement):void{
  this.actionFocus=null;const trigger=(action==='play'?this.playAction():this.retryAction())?.nativeElement,status=this.actionStatus()?.nativeElement??null;
  if(this.element.ownerDocument.activeElement!==trigger||!canFocus(status))return;status.focus({preventScroll:true});if(this.element.ownerDocument.activeElement===status)this.actionFocus={revision,source,media,action};
 }
 protected loaded():void{if(this.destroyed)return;this.reloading.set(false);this.sync();}
 protected sync():void{if(this.destroyed)return;const media=this.media()?.nativeElement;if(!media)return;if((this.disabled()||!isMediaVisible(this.element))&&!media.paused){this.revision++;this.pending.set(false);media.pause();return;}const state={playing:!media.paused&&!media.ended,currentTime:media.currentTime,duration:Number.isFinite(media.duration)?media.duration:null,volume:media.volume,rate:media.playbackRate};this.state.set(state);this.stateChange.emit(state);this.status.setMessage(state.playing ? [() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.playing")] : [() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.pausedOrStopped")]);}
 async toggle():Promise<void>{
  const media=this.media()?.nativeElement;if(!media||this.disabled()||this.pending()||!isMediaVisible(this.element))return;
  if(!media.paused){this.revision++;media.pause();return;}
  const revision=++this.revision,source=this.src(),current=()=>!this.destroyed&&revision===this.revision&&media===this.media()?.nativeElement&&source===this.src();this.holdActionFocus('play',revision,source,media);this.pending.set(true);this.error.set('');this.status.setMessage([() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.loading")]);
  try{await media.play();
   // Only the current request may act on this element. Stop/source/hidden/destroy own their cleanup synchronously.
   if(!current())return;
   if(this.disabled()||!isMediaVisible(this.element))media.pause();
  }catch{if(current()){this.error.setMessage([() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.couldNotPlayTheMediaCheckItsFormatAndAvailabilityThenTryAgain")]);this.playbackFailed.emit('play');}}
  finally{if(current())this.pending.set(false);}
 }
 stop():void{const media=this.media()?.nativeElement;if(!media||this.disabled())return;this.revision++;this.pending.set(false);this.reloading.set(false);this.actionFocus=null;media.pause();if(media.readyState>0)media.currentTime=0;this.sync();this.status.setMessage([() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.stopped")]);}
 setPlaybackVolume(value:number):void{
  if(!Number.isFinite(value)||value<0||value>1)throw new Error('Media volume must be 0–1.');
  const media=this.media()?.nativeElement;if(this.disabled()||!media)return;media.volume=value;
  // Native volumechange is queued. Keep rendering in step with input before the next key arrives.
  this.state.update(state=>({...state,volume:media.volume}));
 }
 protected setVolume(event:Event):void{this.setPlaybackVolume(Number((event.target as HTMLInputElement).value)/100);}setPlaybackRate(value:number):void{if(!Number.isFinite(value)||value<.25||value>4)throw new Error('Media playback rate must be .25–4.');if(!this.disabled()&&this.media())this.media()!.nativeElement.playbackRate=value;}protected setRate(event:Event):void{this.setPlaybackRate(Number((event.target as HTMLSelectElement).value));}
 showCaption(id:string|null):void{if(this.disabled())return;if(id!==null&&!this.captions().some(caption=>caption.id===id))throw new Error('Caption ID must exist.');const media=this.media()?.nativeElement;if(!media)return;this.captionId.set(id);this.applyCaptionSelection(media,this.captions());this.updateCues(media);}protected setCaption(event:Event):void{this.showCaption((event.target as HTMLSelectElement).value||null);}
 private configureCaptions(media:HTMLMediaElement,captions:readonly MediaCaption[]):void {
  this.cueCleanup();
  const elements=[...media.querySelectorAll<HTMLTrackElement>('track')];
  for(const element of this.captionSources.keys())if(!elements.includes(element)){this.captionSources.delete(element);this.captionIds.delete(element);this.pendingCaptionLoads.delete(element);}
  elements.forEach((element,index)=>{if(this.captionSources.get(element)!==element.src)this.pendingCaptionLoads.add(element);this.captionSources.set(element,element.src);this.captionIds.set(element,captions[index].id);});
  this.applyCaptionSelection(media,captions);this.updateCues(media);
  const update=()=>this.updateCues(media),loaded=(event:Event)=>this.captionLoaded(event);
  for(const element of elements){element.track.addEventListener('cuechange',update);element.addEventListener('load',loaded);element.addEventListener('error',loaded);}
  media.textTracks.addEventListener('change',update);
  this.cueCleanup=()=>{for(const element of elements){element.track.removeEventListener('cuechange',update);element.removeEventListener('load',loaded);element.removeEventListener('error',loaded);}media.textTracks.removeEventListener('change',update);};
 }
 private applyCaptionSelection(media:HTMLMediaElement,captions:readonly MediaCaption[]):void {
  if(this.reconcilingCaptions)return;this.reconcilingCaptions=true;
  try{const selected=captions.findIndex(caption=>caption.id===this.captionId());if(selected<0)this.captionId.set(null);
   [...media.querySelectorAll<HTMLTrackElement>('track')].forEach((element,index)=>{const mode=index===selected?'showing':'disabled';if(element.track.mode!==mode)element.track.mode=mode;});
  }finally{this.reconcilingCaptions=false;}
 }
 private captionLoaded(event:Event):void {
  const element=event.target as HTMLTrackElement,media=this.media()?.nativeElement;
  if(this.destroyed||!media?.contains(element)||this.captionSources.get(element)!==element.src)return;
  this.pendingCaptionLoads.delete(element);this.updateCues(media);
 }
 private updateCues(media:HTMLMediaElement):void {
  if(this.destroyed||this.reconcilingCaptions||media!==this.media()?.nativeElement)return;
  const captions=this.captions(),elements=[...media.querySelectorAll<HTMLTrackElement>('track')];
  const captionFor=(element:HTMLTrackElement)=>captions.find(caption=>caption.id===this.captionIds.get(element));
  // Native change can arrive while Angular is moving tracks for a new model. Preserve stable selection until that DOM is reconciled.
  const configured=elements.length===captions.length&&elements.every((element,index)=>this.captionIds.get(element)===captions[index].id&&this.captionSources.get(element)===element.src&&element.getAttribute('src')===captions[index].src);
  if(!captions.some(caption=>caption.id===this.captionId()))this.captionId.set(null);
  if(configured){
   // Caption selection belongs to showCaption/the labelled select. Native change also fires for automatic insertion and mode writes.
   this.applyCaptionSelection(media,captions);
   const select=this.captionSelect()?.nativeElement;if(select)select.value=this.captionId()??'';
  }
  this.activeCue.set(elements.flatMap(element=>{const caption=captionFor(element);return caption&&caption.id===this.captionId()&&caption.src===element.getAttribute('src')&&this.captionSources.get(element)===element.src&&element.track.mode==='showing'&&element.readyState===2&&!this.pendingCaptionLoads.has(element)?[...element.track.activeCues??[]].map(cue=>'text' in cue?String(cue.text):''):[];}).join('\n'));
 }
 async play():Promise<void>{if(this.media()?.nativeElement.paused)await this.toggle();}pause():void{if(this.disabled())return;this.revision++;this.pending.set(false);this.reloading.set(false);this.actionFocus=null;this.media()?.nativeElement.pause();}playback():MediaPlaybackState{return {...this.state()};}
 protected failed():void{if(this.destroyed)return;this.reloading.set(false);this.error.setMessage([() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.unableToLoadTheMediaCheckTheSourceAndFormatThenTryAgain")]);this.playbackFailed.emit('load');}protected retry():void{const media=this.media()?.nativeElement;if(this.destroyed||this.disabled()||this.reloading()||!media||!isMediaVisible(this.element))return;const revision=++this.revision;this.holdActionFocus('retry',revision,this.src(),media);this.pending.set(false);this.reloading.set(true);this.error.set('');this.status.setMessage([() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.loading")]);media.load();}
 async fullscreen():Promise<void>{if(this.disabled()||this.kind()!=='video'||!this.fullscreenSupported())return;try{if(this.element.ownerDocument.fullscreenElement===this.element)await this.element.ownerDocument.exitFullscreen();else await this.element.requestFullscreen();}catch{if(!this.destroyed){this.error.setMessage([() => this.uiRuntimeText_MediaPlayer("uiFoundation.mediaPlayer.couldNotSwitchToFullScreen")]);this.playbackFailed.emit('fullscreen');}}}
}
