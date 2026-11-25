import { injectUiLocale, injectUiMessageText as injectUiRuntimeText, UiStableMessagePipe } from './locale';
import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, type ElementRef,
  forwardRef, input, output, signal, viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, NG_VALIDATORS, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounce, of, Subject, timer } from 'rxjs';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { textControlStyles } from './text-control-style';
import { FieldValueControl } from './value-control';

export { TextInput, Textarea } from './text-controls';

@Component({
 selector:'ui-password-input',standalone:true,imports:[FormField, FieldControl, ActionControl, UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>PasswordInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input uiFieldControl [type]="revealed() ? 'text' : 'password'" [name]="name()" [value]="current()" [attr.autocomplete]="autocomplete()"
   [disabled]="blocked()" [readOnly]="readonly()" (input)="commit(text($event))" (blur)="touch()">
   <button uiAction [attr.aria-label]="revealed() ? ('uiFoundation.passwordInput.hidePassword' | uiStableMessage) : ('uiFoundation.passwordInput.showPassword' | uiStableMessage)" [attr.aria-pressed]="revealed()" [disabled]="blocked()" (click)="revealed.set(!revealed())">{{revealed()?('uiFoundation.passwordInput.hide' | uiStableMessage):('uiFoundation.passwordInput.show' | uiStableMessage)}}</button></div>
  @if(strength()!=='unknown'){<p class="ui-input-count">{{strengthLabel()}}</p>}
 </ui-form-field>`,styles:textControlStyles,
})
export class PasswordInput extends FieldValueControl<string>{
 private readonly uiRuntimeText_PasswordInput=injectUiRuntimeText();

 protected readonly emptyValue='';readonly autocomplete=input('current-password');readonly strength=input<'weak'|'medium'|'strong'|'unknown'>('unknown');
 protected readonly revealed=signal(false);protected readonly strengthLabel=computed(()=>({weak:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.strengthWeak"),medium:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.strengthMedium"),strong:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.strengthStrong"),unknown:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.unrated")})[this.strength()]);
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
}
export interface SearchRequest{query:string;requestId:number}
@Component({
 selector:'ui-search-input',standalone:true,imports:[FormField, FieldControl, ActionControl, UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SearchInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input #editor uiFieldControl type="search" [name]="name()" [value]="current()" [placeholder]="placeholder()" [disabled]="blocked()" [readOnly]="readonly()"
   [attr.list]="hasSuggestions() ? controlId() + '-suggestions' : null" (input)="changed($event)" (blur)="touch()" (keydown.enter)="enter($event)" (compositionstart)="compositionStarted()" (compositionend)="compositionEnded($event)">
   <button uiAction [disabled]="blocked() || readonly() || !current()" [attr.aria-label]="'uiFoundation.searchInput.clearSearchText' | uiStableMessage" [attr.aria-controls]="controlId()" (click)="clear()">{{'uiFoundation.searchInput.clear' | uiStableMessage}}</button>
   <button uiAction [busy]="loading()" [disabled]="blocked() || readonly()" (click)="runSearch()">{{'uiFoundation.searchInput.search' | uiStableMessage}}</button></div>
  <datalist [id]="controlId()+'-suggestions'">@if(hasSuggestions()){@for(option of suggestions();track option){<option [value]="option"></option>}}</datalist>
  <p class="ui-input-count" role="status" aria-atomic="true">{{loading()?('uiFoundation.searchInput.loadingSuggestions' | uiStableMessage):''}}</p>
 </ui-form-field>`,styles:textControlStyles,
})
export class SearchInput extends FieldValueControl<string>{
 protected readonly emptyValue='';readonly placeholder=input('');readonly debounceMs=input(300);readonly loading=input(false,{transform:booleanAttribute});
 readonly suggestions=input<readonly string[]>([]);readonly suggestionsQuery=input<string|null>(null);readonly suggestionsRequestId=input<number|null>(null);readonly searchRequest=output<SearchRequest>();
 private readonly queries=new Subject<{query:string;immediate:boolean;epoch:number}>();private epoch=0;private requestId=0;private readonly acceptedRequest=signal<SearchRequest|null>(null);private composing=false;private lastEmittedQuery:string|undefined;private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 protected readonly hasSuggestions=computed(()=>this.suggestionsQuery()===this.current()&&(this.suggestionsRequestId()===null||this.acceptedRequest()?.query===this.current()&&this.suggestionsRequestId()===this.acceptedRequest()?.requestId));
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
 constructor(){super();this.queries.pipe(debounce(request=>request.immediate?of(0):timer(Math.max(0,Number.isFinite(this.debounceMs())?this.debounceMs():300))),takeUntilDestroyed()).subscribe(({query,immediate,epoch})=>{if(epoch===this.epoch&&!this.blocked()&&!this.readonly()&&!this.composing&&query===this.current()&&(immediate||query!==this.lastEmittedQuery||this.acceptedRequest()===null)){this.lastEmittedQuery=query;const request={query,requestId:++this.requestId};this.acceptedRequest.set(request);this.searchRequest.emit(request);}});}
 override writeValue(value:unknown):void{super.writeValue(value);this.epoch++;this.acceptedRequest.set(null);}
 protected changed(event:Event):void{if(this.blocked()||this.readonly())return;const query=this.text(event);this.epoch++;this.acceptedRequest.set(null);this.commit(query);if(!this.composing&&!(event as InputEvent).isComposing)this.queries.next({query,immediate:false,epoch:this.epoch});}
 protected compositionStarted():void{this.composing=true;}
 protected compositionEnded(event:Event):void{this.composing=false;this.changed(event);}
 protected clear():void{if(this.blocked()||this.readonly())return;this.epoch++;this.acceptedRequest.set(null);this.commit('');this.queries.next({query:'',immediate:false,epoch:this.epoch});this.editor()?.nativeElement.focus();}
 protected runSearch():void{if(!this.blocked()&&!this.readonly()&&!this.loading()&&!this.composing)this.queries.next({query:this.current(),immediate:true,epoch:this.epoch});}
 protected enter(event:Event):void{const key=event as KeyboardEvent;if(key.isComposing||key.keyCode===229)return;event.preventDefault();this.runSearch();}
}
@Component({
 selector:'ui-number-input',standalone:true,imports:[FormField,FieldControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>NumberInput),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>NumberInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input #editor uiFieldControl type="number" [name]="name()" [value]="current() ?? ''" [attr.min]="min()" [attr.max]="max()" [attr.step]="step()"
   [disabled]="blocked() || configurationError() !== null" [readOnly]="readonly()" (input)="changed($event)" (blur)="touch()">@if(unit()){<span>{{unit()}}</span>}</div>
  @if(current()!==null){<p class="ui-input-format">{{unit()?('uiFoundation.numberInput.formattedNumberWithUnit' | uiStableMessage:{value:formatted(),unit:unit()!}):('uiFoundation.numberInput.formattedNumber' | uiStableMessage:{value:formatted()})}}</p>}
  @if(configurationError()){<p class="ui-input-format" role="alert">{{configurationError()}}</p>}
 </ui-form-field>`,styles:textControlStyles,
})
export class NumberInput extends FieldValueControl<number|null> implements Validator{
 private readonly uiRuntimeText_NumberInput=injectUiRuntimeText();

 protected readonly emptyValue=null;readonly min=input<number|null>(null);readonly max=input<number|null>(null);readonly step=input<number|'any'>(1);
 readonly fractionDigits=input<number|null>();readonly grouping=input<boolean|undefined,unknown>(undefined,{transform:value=>value===undefined?undefined:booleanAttribute(value)});protected readonly numberFormat=computed(()=>{const format={...this.uiLocaleDefaults().numberOptions},digits=this.fractionDigits();if(digits===null){delete format.minimumFractionDigits;delete format.maximumFractionDigits;}else if(digits!==undefined){format.minimumFractionDigits=digits;format.maximumFractionDigits=digits;}if(this.grouping()!==undefined)format.useGrouping=this.grouping();return format;});protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly unit=input('');
 private readonly invalidDraft=signal(false);private validatorChanged:()=>void=()=>{};
 private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 protected readonly configurationError=computed(()=>{
  if(this.min()!==null&&!Number.isFinite(this.min())||this.max()!==null&&!Number.isFinite(this.max())||this.min()!==null&&this.max()!==null&&this.min()!>this.max()!)return this.uiRuntimeText_NumberInput("uiFoundation.numberInput.checkTheNumberRangeSettings");
  if(this.step()!=='any'&&(!Number.isFinite(this.step())||Number(this.step())<=0))return this.uiRuntimeText_NumberInput("uiFoundation.numberInput.enterAPositiveStepSize");
  const digits=this.fractionDigits();if(digits!==null&&digits!==undefined&&(!Number.isInteger(digits)||digits<0||digits>100))return this.uiRuntimeText_NumberInput("uiFoundation.numberInput.enterAWholeNumberOfDecimalPlacesFrom0To100");
  try{new Intl.NumberFormat(this.effectiveLocale(),this.numberFormat());}catch{return this.uiRuntimeText_NumberInput("uiFoundation.numberInput.checkTheNumberLocaleSettings");}return null;
 });
 protected readonly formatted=computed(()=>this.current()===null||this.configurationError()?'':new Intl.NumberFormat(this.effectiveLocale(),this.numberFormat()).format(this.current()!));
 constructor(){super();effect(()=>{this.min();this.max();this.step();this.required();this.fractionDigits();this.effectiveLocale();this.numberFormat();this.validatorChanged();});}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 override writeValue(value:unknown):void{super.writeValue(value);this.invalidDraft.set(false);const editor=this.editor()?.nativeElement;if(editor)editor.value=this.current()===null?'':String(this.current());}
 protected coerce(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)?value:null;}
 protected changed(event:Event):void{if(this.blocked()||this.readonly()||this.configurationError())return;const element=event.target as HTMLInputElement;this.invalidDraft.set(element.validity.badInput);if(!element.validity.badInput)this.commit(element.value===''?null:this.coerce(element.valueAsNumber));this.validatorChanged();}
 validate(control:AbstractControl):ValidationErrors|null{
  if(this.configurationError())return {numberConfig:true};if(this.invalidDraft())return {number:true};
  const value=control.value as unknown;if(value===null||value===undefined||value==='')return this.required()?{required:true}:null;
  if(typeof value!=='number'||!Number.isFinite(value))return {number:true};
  if(this.min()!==null&&value<this.min()!)return {min:{min:this.min(),actual:value}};
  if(this.max()!==null&&value>this.max()!)return {max:{max:this.max(),actual:value}};
  const step=this.step();if(typeof step==='number'&&step>0){const steps=(value-(this.min()??0))/step;if(Math.abs(steps-Math.round(steps))>1e-8)return {step:{step,actual:value}};}
  return null;
 }
}
