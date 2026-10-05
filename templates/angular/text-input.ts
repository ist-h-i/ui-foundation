import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, forwardRef, inject, input, output, signal, viewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR, NG_VALIDATORS, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounce, of, Subject, timer } from 'rxjs';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { ValueControl } from './value-control';
const fieldImports = [FormField, FieldControl, ActionControl];
const controlStyles = `
  :host { display: block; min-inline-size: 0; max-inline-size: 100%; font: inherit; }
  :host([hidden]) { display: none; }
  .ui-input-group { display: flex; flex-wrap: wrap; gap: var(--ui-space-control-gap); align-items: center; min-inline-size: 0; }
  .ui-input-group input { flex: 1 1 var(--ui-size-control); min-inline-size: 0; }
  .ui-input-count, .ui-input-format { color: var(--ui-color-muted); font-size: var(--ui-text-small); margin-block: var(--ui-space-control-y); }
  textarea { resize: vertical; max-block-size: var(--ui-size-input-max-height); }
`;
@Component({
 selector: 'ui-text-input', standalone: true, imports: fieldImports, changeDetection: ChangeDetectionStrategy.OnPush,
 providers: [{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TextInput),multi:true}],
 template: `
  <ui-form-field [controlId]="controlId()" [label]="label()" [required]="required()" [hint]="hint()" [error]="error()">
   <div class="ui-input-group">
    <input #editor uiFieldControl type="text" [name]="name()" [value]="current()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
      [attr.autocomplete]="autocomplete()" [disabled]="blocked()" [readOnly]="readonly()" (input)="commit(text($event))" (blur)="touch()">
    @if (clearable()) { <button uiAction [attr.aria-label]="label() + 'をクリア'" [disabled]="blocked() || readonly() || !current()" (click)="clear()">クリア</button> }
   </div>
   @if (showCount()) { <p class="ui-input-count">{{ current().length }}{{ maxLength() !== null ? ' / ' + maxLength() : '' }} 文字</p> }
  </ui-form-field>
 `, styles: controlStyles,
})
export class TextInput extends ValueControl<string> {
 protected readonly emptyValue='';
 readonly placeholder=input(''); readonly maxLength=input<number|null>(null); readonly autocomplete=input('off');
 readonly clearable=input(false,{transform:booleanAttribute}); readonly showCount=input(false,{transform:booleanAttribute});
 private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
 protected clear():void{if(this.blocked()||this.readonly())return;this.commit('');this.editor()?.nativeElement.focus();}
}
@Component({
 selector:'ui-textarea',standalone:true,imports:[FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Textarea),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [required]="required()" [hint]="hint()" [error]="error()">
  <textarea #editor uiFieldControl [name]="name()" [value]="current()" [rows]="rows()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
   [disabled]="blocked()" [readOnly]="readonly()" [style.max-block-size.px]="maxHeight()" (input)="commit(text($event))" (blur)="touch()"></textarea>
  @if(showCount()){<p class="ui-input-count">{{ current().length }}{{ maxLength() !== null ? ' / ' + maxLength() : '' }} 文字</p>}
 </ui-form-field>`,styles:controlStyles,
})
export class Textarea extends ValueControl<string>{
 protected readonly emptyValue='';readonly rows=input(3);readonly maxLength=input<number|null>(null);readonly maxHeight=input<number|null>(null);
 readonly autoResize=input(false,{transform:booleanAttribute});readonly showCount=input(false,{transform:booleanAttribute});readonly placeholder=input('');
 private readonly editor=viewChild<ElementRef<HTMLTextAreaElement>>('editor');
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
 constructor(){super();const render=afterRenderEffect(()=>{this.current();const element=this.editor()?.nativeElement;if(!element)return;
   if(this.autoResize()){element.style.height='auto';element.style.height=element.scrollHeight+'px';}else{element.style.height='';}
  });inject(DestroyRef).onDestroy(()=>render.destroy());}
}
@Component({
 selector:'ui-password-input',standalone:true,imports:fieldImports,changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>PasswordInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input uiFieldControl [type]="revealed() ? 'text' : 'password'" [name]="name()" [value]="current()" [attr.autocomplete]="autocomplete()"
   [disabled]="blocked()" [readOnly]="readonly()" (input)="commit(text($event))" (blur)="touch()">
   <button uiAction [attr.aria-label]="revealed() ? 'パスワードを隠す' : 'パスワードを表示'" [attr.aria-pressed]="revealed()" [disabled]="blocked()" (click)="revealed.set(!revealed())">{{revealed()?'隠す':'表示'}}</button></div>
  @if(strength()!=='unknown'){<p class="ui-input-count">強度: {{strengthLabel()}}</p>}
 </ui-form-field>`,styles:controlStyles,
})
export class PasswordInput extends ValueControl<string>{
 protected readonly emptyValue='';readonly autocomplete=input('current-password');readonly strength=input<'weak'|'medium'|'strong'|'unknown'>('unknown');
 protected readonly revealed=signal(false);protected readonly strengthLabel=computed(()=>({weak:'弱い',medium:'中程度',strong:'強い',unknown:'未評価'})[this.strength()]);
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
}
export interface SearchRequest{query:string;requestId:number}
@Component({
 selector:'ui-search-input',standalone:true,imports:fieldImports,changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SearchInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input #editor uiFieldControl type="search" [name]="name()" [value]="current()" [placeholder]="placeholder()" [disabled]="blocked()" [readOnly]="readonly()"
   [attr.list]="suggestionsQuery() === current() ? controlId() + '-suggestions' : null" (input)="changed($event)" (blur)="touch()" (keydown.enter)="enter($event)" (compositionstart)="compositionStarted()" (compositionend)="compositionEnded($event)">
   <button uiAction [disabled]="blocked() || readonly() || !current()" [attr.aria-label]="label()+'をクリア'" (click)="clear()">クリア</button>
   <button uiAction [busy]="loading()" [disabled]="blocked() || readonly()" (click)="runSearch()">検索</button></div>
  <datalist [id]="controlId()+'-suggestions'">@if(suggestionsQuery()===current()){@for(option of suggestions();track option){<option [value]="option"></option>}}</datalist>
  <p class="ui-input-count" role="status" aria-atomic="true">{{loading()?'候補を取得しています。':''}}</p>
 </ui-form-field>`,styles:controlStyles,
})
export class SearchInput extends ValueControl<string>{
 protected readonly emptyValue='';readonly placeholder=input('');readonly debounceMs=input(300);readonly loading=input(false,{transform:booleanAttribute});
 readonly suggestions=input<readonly string[]>([]);readonly suggestionsQuery=input<string|null>(null);readonly searchRequest=output<SearchRequest>();
 private readonly queries=new Subject<{query:string;immediate:boolean}>();private requestId=0;private composing=false;private lastEmittedQuery:string|undefined;private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
 constructor(){super();this.queries.pipe(debounce(request=>request.immediate?of(0):timer(Math.max(0,Number.isFinite(this.debounceMs())?this.debounceMs():300))),takeUntilDestroyed()).subscribe(({query,immediate})=>{if(!this.blocked()&&!this.readonly()&&!this.composing&&query===this.current()&&(immediate||query!==this.lastEmittedQuery)){this.lastEmittedQuery=query;this.searchRequest.emit({query,requestId:++this.requestId});}});}
 protected changed(event:Event):void{if(this.blocked()||this.readonly())return;const query=this.text(event);this.commit(query);if(!this.composing&&!(event as InputEvent).isComposing)this.queries.next({query,immediate:false});}
 protected compositionStarted():void{this.composing=true;}
 protected compositionEnded(event:Event):void{this.composing=false;this.changed(event);}
 protected clear():void{if(this.blocked()||this.readonly())return;this.commit('');this.queries.next({query:'',immediate:false});this.editor()?.nativeElement.focus();}
 protected runSearch():void{if(!this.blocked()&&!this.readonly()&&!this.loading()&&!this.composing)this.queries.next({query:this.current(),immediate:true});}
 protected enter(event:Event):void{const key=event as KeyboardEvent;if(key.isComposing||key.keyCode===229)return;event.preventDefault();this.runSearch();}
}
@Component({
 selector:'ui-number-input',standalone:true,imports:[FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>NumberInput),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>NumberInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-input-group"><input #editor uiFieldControl type="number" [name]="name()" [value]="current() ?? ''" [attr.min]="min()" [attr.max]="max()" [attr.step]="step()"
   [disabled]="blocked() || configurationError() !== null" [readOnly]="readonly()" (input)="changed($event)" (blur)="touch()">@if(unit()){<span>{{unit()}}</span>}</div>
  @if(current()!==null){<p class="ui-input-format">表示: {{formatted()}} {{unit()}}</p>}
  @if(configurationError()){<p class="ui-input-format" role="alert">{{configurationError()}}</p>}
 </ui-form-field>`,styles:controlStyles,
})
export class NumberInput extends ValueControl<number|null> implements Validator{
 protected readonly emptyValue=null;readonly min=input<number|null>(null);readonly max=input<number|null>(null);readonly step=input<number|'any'>(1);
 readonly fractionDigits=input<number|null>(null);readonly grouping=input(true,{transform:booleanAttribute});readonly locale=input('ja-JP');readonly unit=input('');
 private readonly invalidDraft=signal(false);private validatorChanged:()=>void=()=>{};
 private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 protected readonly configurationError=computed(()=>{
  if(this.min()!==null&&!Number.isFinite(this.min())||this.max()!==null&&!Number.isFinite(this.max())||this.min()!==null&&this.max()!==null&&this.min()!>this.max()!)return '数値の範囲設定を確認してください。';
  if(this.step()!=='any'&&(!Number.isFinite(this.step())||Number(this.step())<=0))return '刻み幅には正の数を指定してください。';
  const digits=this.fractionDigits();if(digits!==null&&(!Number.isInteger(digits)||digits<0||digits>100))return '小数桁には0から100の整数を指定してください。';
  try{new Intl.NumberFormat(this.locale());}catch{return '数値の言語設定を確認してください。';}return null;
 });
 protected readonly formatted=computed(()=>this.current()===null||this.configurationError()?'':new Intl.NumberFormat(this.locale(),{useGrouping:this.grouping(),...(this.fractionDigits()===null?{}:{minimumFractionDigits:this.fractionDigits()!,maximumFractionDigits:this.fractionDigits()!})}).format(this.current()!));
 constructor(){super();effect(()=>{this.min();this.max();this.step();this.required();this.fractionDigits();this.locale();this.validatorChanged();});}
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
