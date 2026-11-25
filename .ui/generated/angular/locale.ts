import { resolveUiMessage, uiMessageText, type UiMessageText, type UiMessageArguments, type UiMessageRequest } from './stable-messages';
import {Dir,Directionality,type Direction} from '@angular/cdk/bidi';
import {afterNextRender,computed,DOCUMENT,DestroyRef,Directive,EventEmitter,effect,ElementRef,inject,Injector,input,Pipe,type PipeTransform,Renderer2,signal,type Signal} from '@angular/core';
import {resolveUiLocale,type UiLocaleOptions,type UiLocaleResolved} from './locale-model';

import { injectUiLocale, UI_LOCALE } from './locale-token';

export { injectUiLocale, provideUiLocale, UI_LOCALE } from './locale-token';
export function injectUiMessage(): (request: UiMessageRequest) => string {
 const locale=injectUiLocale();
 return request=>{const current=locale();return resolveUiMessage(request,current.locale,current.translate);};
}
/** Construct once; read the active locale on every render. */
export function injectUiMessageText(): UiMessageText {
 const locale=injectUiLocale();
 return uiMessageText(()=>locale().locale,()=>locale().translate);
}
@Pipe({name:'uiStableMessage',standalone:true,pure:false})
export class UiStableMessagePipe implements PipeTransform{
 private readonly text=injectUiMessageText();
 transform(...args: UiMessageArguments):string{
  return this.text(...args);
 }
}
export type UiMessagePart=string|(()=>string);
export interface UiMessageState<T extends string|null|undefined> extends Signal<T>{
 set(value:T):void;update(updater:(value:T)=>T):void;asReadonly():Signal<T>;
 /** Library text is evaluated on read; dynamic/application values are captured as strings. */
 setMessage(parts:readonly UiMessagePart[]):void;
}
/** A dictionary update changes presentation without rerunning the operation that produced it. */
export function uiMessageState<T extends string|null|undefined>(initial:T,initialParts?:readonly UiMessagePart[]):UiMessageState<T|string>{
 type State={value:T|string}|{parts:readonly UiMessagePart[]};
 const state=signal<State>(initialParts?{parts:[...initialParts]}:{value:initial});
 const value=computed(()=>{const current=state();return 'parts' in current?current.parts.map(part=>typeof part==='function'?part():part).join(''):current.value;});
 const readonlyValue=computed(()=>value());
 const set=(next:T|string)=>state.set({value:next});
 return Object.assign(value,{set,update:(updater:(current:T|string)=>T|string)=>set(updater(value())),asReadonly:()=>readonlyValue,setMessage:(parts:readonly UiMessagePart[])=>state.set({parts:[...parts]})});
}
function scopedLocale():Signal<UiLocaleResolved>{
 const injector=inject(Injector),parent=inject(UI_LOCALE,{skipSelf:true});
 // Evaluate after the directive exists, rather than introducing a constructor cycle.
 return computed(()=>resolveUiLocale(injector.get(UiLocaleScope).options(),parent()));
}
const localeScopes=new WeakMap<Element,UiLocaleScope>();
function scopedDirectionality():Directionality{
 const scope=inject(UiLocaleScope),change=new EventEmitter<Direction>(),valueSignal=signal<Direction>(scope.resolveDirection());let closed=false;
 const close=()=>{if(!closed){closed=true;change.complete();}};
 effect(()=>{const value=scope.resolveDirection();if(value!==valueSignal()){valueSignal.set(value);change.emit(value);}});inject(DestroyRef).onDestroy(close);
 return {get value(){return valueSignal();},valueSignal,change,ngOnDestroy:close};
}
/** DI, language and public CDK direction scope. Application direction takes priority. */
@Directive({selector:'[uiLocale]',standalone:true,providers:[{provide:UI_LOCALE,useFactory:scopedLocale},{provide:Directionality,useFactory:scopedDirectionality}]})
export class UiLocaleScope{
 readonly options=input<UiLocaleOptions>({},{alias:'uiLocale'});
 private readonly locale=injectUiLocale();private readonly parentDirection=inject(Directionality,{skipSelf:true,optional:true});private readonly document=inject(DOCUMENT);private readonly directionRevision=signal(0);private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private readonly renderer=inject(Renderer2);
 private readonly owned=new Map<string,{original:string|null;last:string}>();private readonly external=new Set<string>();private observer:MutationObserver|null=null;private destroyed=false;
 private apply(name:string,value:string|null):void{
  if(this.external.has(name))return;const current=this.element.getAttribute(name),owned=this.owned.get(name);
  if(owned&&current!==owned.last){this.owned.delete(name);this.external.add(name);return;}
  if(!owned&&current!==null){this.external.add(name);return;}
  if(value===null){if(owned){owned.original===null?this.renderer.removeAttribute(this.element,name):this.renderer.setAttribute(this.element,name,owned.original);this.owned.delete(name);}return;}
  if(current===value&&owned)return;this.renderer.setAttribute(this.element,name,value);this.owned.set(name,{original:owned?owned.original:current,last:value});
 }
 private applicationDirection():Direction|null{
  for(let element:Element|null=this.element;element;element=element.parentElement){const raw=element.getAttribute('dir')?.toLowerCase();if(raw!=='ltr'&&raw!=='rtl'&&raw!=='auto')continue;const owner=localeScopes.get(element);if(owner&&owner.owned.get('dir')?.last===element.getAttribute('dir'))continue;
   if(raw==='ltr'||raw==='rtl')return raw;const actual=this.document.defaultView?.getComputedStyle(element).direction;return actual==='ltr'||actual==='rtl'?actual:null;
  }return null;
 }
 /** Public Directionality reads only application-owned native direction and scope signals. */
 resolveDirection():Direction{
  this.directionRevision();const parent=this.parentDirection?.valueSignal()??'ltr',application=this.applicationDirection();
  if(application!==null)return application;if(this.parentDirection instanceof Dir)return parent;if(this.external.has('dir'))return parent;return this.locale().direction??parent;
 }
 constructor(){
  localeScopes.set(this.element,this);
  effect(()=>{this.directionRevision();const locale=this.locale();this.parentDirection?.valueSignal();this.apply('lang',locale.locale);this.apply('dir',this.applicationDirection()!==null||this.parentDirection instanceof Dir?null:locale.direction);});
  afterNextRender(()=>{const Observer=this.document.defaultView?.MutationObserver;if(!Observer||this.destroyed)return;this.observer=new Observer(()=>{if(this.destroyed)return;const owned=this.owned.get('dir');if(owned&&this.element.getAttribute('dir')!==owned.last){this.owned.delete('dir');this.external.add('dir');}this.directionRevision.update(value=>value+1);});for(let element:Element|null=this.element;element;element=element.parentElement)this.observer.observe(element,{attributes:true,attributeFilter:['dir']});});
  inject(DestroyRef).onDestroy(()=>{this.destroyed=true;this.observer?.disconnect();this.observer=null;localeScopes.delete(this.element);for(const [name,owned] of this.owned)if(this.element.getAttribute(name)===owned.last){owned.original===null?this.renderer.removeAttribute(this.element,name):this.renderer.setAttribute(this.element,name,owned.original);}this.owned.clear();});
 }
}
