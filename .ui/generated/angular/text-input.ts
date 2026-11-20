import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {injectUiLocale,UiStableMessagePipe} from './locale';
import { afterNextRender, afterRenderEffect, type AfterRenderRef, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, Directive, DOCUMENT, effect, ElementRef, forwardRef, inject, Injector, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { COMPOSITION_BUFFER_MODE, NG_VALUE_ACCESSOR, NG_VALIDATORS, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounce, of, Subject, timer } from 'rxjs';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { FieldValueControl } from './value-control';
const fieldImports = [FormField, FieldControl, ActionControl];
const controlStyles = `
  :host { display: block; min-inline-size: 0; max-inline-size: 100%; font: inherit; }
  :host([hidden]) { display: none; }
  .ui-input-group { display: flex; flex-wrap: wrap; gap: var(--ui-space-control-gap); align-items: center; min-inline-size: 0; }
  .ui-input-group input { flex: 1 1 var(--ui-size-control); min-inline-size: 0; }
  .ui-input-count, .ui-input-format { color: var(--ui-color-muted); font-size: var(--ui-text-small); margin-block: var(--ui-space-control-y); }
  textarea { resize: vertical; max-block-size: var(--ui-size-input-max-height); }
`;

interface TextComposition {
  readonly text: string;
  readonly discarded: boolean;
}

@Directive()
abstract class ComposingTextControl extends FieldValueControl<string> {
  protected readonly emptyValue = '';
  protected readonly editor = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('editor');
  // Angular's default text accessor buffers except on Android. The application can override it.
  private readonly bufferComposition = inject(COMPOSITION_BUFFER_MODE, { optional: true })
    ?? !/android \d+/i.test(inject(DOCUMENT).defaultView?.navigator.userAgent ?? '');
  private readonly editable = computed(() => !this.blocked() && !this.readonly());
  private readonly composition = linkedSignal({
    source: () => ({ externalValue: this.value(), editable: this.editable() }),
    computation: (source, previous): TextComposition | null =>
      source.editable ? this.discardComposition(previous?.value ?? null) : null,
  });
  protected readonly displayedText = computed(() => this.composition()?.text ?? this.current());
  private readonly injector = inject(Injector);
  private lastComposition: string | null = null;
  private pendingReconciliation?: AfterRenderRef;

  protected coerce(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  override writeValue(value: unknown): void {
    super.writeValue(value);
    this.composition.update(composition => this.discardComposition(composition));
    this.restoreEditor();
  }

  protected beginComposition(event: Event): void {
    this.lastComposition = null;
    if (this.bufferComposition && this.editable()) {
      this.composition.set({ text: this.text(event), discarded: false });
    }
  }

  protected edit(event: Event): void {
    const value = this.text(event);
    if (!this.editable()) {
      this.restoreEditor();
      return;
    }
    const composition = this.composition();
    if (composition) {
      this.composition.set({ ...composition, text: value });
      return;
    }
    const input = event as InputEvent;
    if (this.bufferComposition && input.isComposing) {
      this.restoreEditor();
      return;
    }
    const taggedFinal = input.inputType === 'insertFromComposition' || input.inputType === 'insertCompositionText';
    // Chromium can expose a final insertion with data and an empty inputType.
    const untypedFinal = !input.inputType && input.data != null && (value === this.lastComposition || value === this.current());
    if (this.lastComposition !== null && (taggedFinal || untypedFinal)) {
      this.reconcileAfterRender();
      return;
    }
    // Ordinary edits are distinguishable from an old IME replay, even after a reset.
    this.commit(value);
  }

  protected endComposition(event: Event): void {
    if (!this.bufferComposition) return;
    const value = this.text(event);
    this.lastComposition = value;
    const composition = this.composition();
    this.composition.set(null);
    if (!composition || composition.discarded || !this.editable()) {
      this.restoreEditor();
      return;
    }
    this.commit(value);
  }

  protected clear(): void {
    if (!this.editable()) return;
    this.composition.update(composition => this.discardComposition(composition));
    this.commit('');
    this.restoreEditor();
    this.editor()?.nativeElement.focus();
  }

  protected blur(): void {
    if (this.composition()?.discarded) {
      this.composition.set(null);
      this.restoreEditor();
    }
    this.touch();
  }

  protected override commit(value: string): void {
    super.commit(value);
    if (this.value() !== undefined) this.reconcileAfterRender();
  }

  private reconcileAfterRender(): void {
    // Read the owner's decision after Angular has applied parent inputs, including a rejection or reset.
    this.pendingReconciliation ??= afterNextRender(() => {
      this.pendingReconciliation = undefined;
      this.restoreEditor();
    }, { injector: this.injector });
  }

  private discardComposition(composition: TextComposition | null): TextComposition | null {
    if (!composition) return null;
    const editor = untracked(this.editor)?.nativeElement;
    // Writing the DOM value during native composition can turn its pending
    // completion into ordinary input. Leave the buffer until it ends or blurs.
    return editor && editor.ownerDocument.activeElement === editor
      ? { ...composition, discarded: true }
      : null;
  }

  private restoreEditor(): void {
    if (this.composition()) return;
    const editor = this.editor()?.nativeElement;
    const value = this.displayedText();
    if (editor && editor.value !== value) editor.value = value;
  }
}

@Component({
 selector: 'ui-text-input', standalone: true, imports: [...fieldImports,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
 providers: [{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TextInput),multi:true}],
 template: `
  <ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
   <div class="ui-input-group">
    <input #editor uiFieldControl type="text" [name]="name()" [value]="displayedText()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
      [attr.autocomplete]="autocomplete()" [disabled]="blocked()" [readOnly]="readonly()" (input)="edit($event)"
      (compositionstart)="beginComposition($event)" (compositionend)="endComposition($event)" (blur)="blur()">
    @if (clearable()) { <button uiAction [attr.aria-label]="('uiFoundation.textInput.clearForLabel' | uiStableMessage:{label:label()})" [disabled]="blocked() || readonly() || !displayedText()" (click)="clear()">{{'uiFoundation.textInput.clearForTextInput' | uiStableMessage}}</button> }
   </div>
   @if (showCount()) { <p class="ui-input-count">{{ maxLength()===null?('uiFoundation.textInput.characterCount' | uiStableMessage:{count:displayedText().length}):('uiFoundation.textInput.characterCountWithLimit' | uiStableMessage:{count:displayedText().length,limit:maxLength()!}) }}</p> }
  </ui-form-field>
 `, styles: controlStyles,
})
export class TextInput extends ComposingTextControl {
 readonly placeholder=input(''); readonly maxLength=input<number|null>(null); readonly autocomplete=input('off');
 readonly clearable=input(false,{transform:booleanAttribute}); readonly showCount=input(false,{transform:booleanAttribute});
}
@Component({
 selector:'ui-textarea',standalone:true,imports:[FormField,FieldControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Textarea),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <textarea #editor uiFieldControl [name]="name()" [value]="displayedText()" [rows]="rows()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
   [disabled]="blocked()" [readOnly]="readonly()" [style.max-block-size.px]="checkedMaxHeight()" (input)="edit($event)"
   (compositionstart)="beginComposition($event)" (compositionend)="endComposition($event)" (blur)="blur()"></textarea>
  @if(showCount()){<p class="ui-input-count">{{ maxLength()===null?('uiFoundation.textarea.characterCount' | uiStableMessage:{count:displayedText().length}):('uiFoundation.textarea.characterCountWithLimit' | uiStableMessage:{count:displayedText().length,limit:maxLength()!}) }}</p>}
 </ui-form-field>`,styles:controlStyles,
})
export class Textarea extends ComposingTextControl{
 readonly rows=input(3);readonly maxLength=input<number|null>(null);readonly maxHeight=input<number|null>(null);
 protected readonly checkedMaxHeight=computed(()=>{const height=this.maxHeight();if(height!==null&&(!Number.isFinite(height)||height<=0))throw new Error('ui-textarea maxHeight must be a positive pixel size.');return height;});
 readonly autoResize=input(false,{transform:booleanAttribute});readonly showCount=input(false,{transform:booleanAttribute});readonly placeholder=input('');
 constructor(){super();const render=afterRenderEffect(onCleanup=>{
   this.displayedText();this.rows();this.checkedMaxHeight();const automatic=this.autoResize(),element=this.editor()?.nativeElement;if(!element)return;
   if(!automatic){element.style.height='';return;}
   const view=element.ownerDocument.defaultView;let frame:number|null=null;
   const resize=()=>{frame=null;if(!element.getClientRects().length)return;const previous=element.style.height;element.style.height='auto';const height=element.scrollHeight+(element.offsetHeight-element.clientHeight)+'px';element.style.height=height;if(previous===height)return;};
   const schedule=()=>{if(frame===null&&view)frame=view.requestAnimationFrame(resize);};
   const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);observer?.observe(element);
   const profiles=typeof MutationObserver==='undefined'?null:new MutationObserver(schedule);profiles?.observe(element.ownerDocument.body,{subtree:true,attributes:true,attributeFilter:['data-ui-profile','hidden','class']});
   resize();onCleanup(()=>{observer?.disconnect();profiles?.disconnect();if(frame!==null)view?.cancelAnimationFrame(frame);});
  });inject(DestroyRef).onDestroy(()=>render.destroy());}
}
@Component({
 selector:'ui-password-input',standalone:true,imports:[...fieldImports,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>PasswordInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input uiFieldControl [type]="revealed() ? 'text' : 'password'" [name]="name()" [value]="current()" [attr.autocomplete]="autocomplete()"
   [disabled]="blocked()" [readOnly]="readonly()" (input)="commit(text($event))" (blur)="touch()">
   <button uiAction [attr.aria-label]="revealed() ? ('uiFoundation.passwordInput.hidePassword' | uiStableMessage) : ('uiFoundation.passwordInput.showPassword' | uiStableMessage)" [attr.aria-pressed]="revealed()" [disabled]="blocked()" (click)="revealed.set(!revealed())">{{revealed()?('uiFoundation.passwordInput.hide' | uiStableMessage):('uiFoundation.passwordInput.show' | uiStableMessage)}}</button></div>
  @if(strength()!=='unknown'){<p class="ui-input-count">{{strengthLabel()}}</p>}
 </ui-form-field>`,styles:controlStyles,
})
export class PasswordInput extends FieldValueControl<string>{
 private readonly uiRuntimeText_PasswordInput=injectUiRuntimeText();

 protected readonly emptyValue='';readonly autocomplete=input('current-password');readonly strength=input<'weak'|'medium'|'strong'|'unknown'>('unknown');
 protected readonly revealed=signal(false);protected readonly strengthLabel=computed(()=>({weak:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.strengthWeak"),medium:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.strengthMedium"),strong:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.strengthStrong"),unknown:this.uiRuntimeText_PasswordInput("uiFoundation.passwordInput.unrated")})[this.strength()]);
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
}
export interface SearchRequest{query:string;requestId:number}
@Component({
 selector:'ui-search-input',standalone:true,imports:[...fieldImports,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SearchInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input #editor uiFieldControl type="search" [name]="name()" [value]="current()" [placeholder]="placeholder()" [disabled]="blocked()" [readOnly]="readonly()"
   [attr.list]="hasSuggestions() ? controlId() + '-suggestions' : null" (input)="changed($event)" (blur)="touch()" (keydown.enter)="enter($event)" (compositionstart)="compositionStarted()" (compositionend)="compositionEnded($event)">
   <button uiAction [disabled]="blocked() || readonly() || !current()" [attr.aria-label]="'uiFoundation.searchInput.clearSearchText' | uiStableMessage" [attr.aria-controls]="controlId()" (click)="clear()">{{'uiFoundation.searchInput.clear' | uiStableMessage}}</button>
   <button uiAction [busy]="loading()" [disabled]="blocked() || readonly()" (click)="runSearch()">{{'uiFoundation.searchInput.search' | uiStableMessage}}</button></div>
  <datalist [id]="controlId()+'-suggestions'">@if(hasSuggestions()){@for(option of suggestions();track option){<option [value]="option"></option>}}</datalist>
  <p class="ui-input-count" role="status" aria-atomic="true">{{loading()?('uiFoundation.searchInput.loadingSuggestions' | uiStableMessage):''}}</p>
 </ui-form-field>`,styles:controlStyles,
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
 </ui-form-field>`,styles:controlStyles,
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
