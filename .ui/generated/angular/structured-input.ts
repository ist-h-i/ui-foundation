import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as localeComputed} from '@angular/core';
import {injectUiLocale,UiMessagePipe} from './locale';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, ElementRef, forwardRef, input, linkedSignal, signal, viewChild } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { FieldValueControl } from './value-control';
import { formatMasked, graphemes, maskCaret, parseMask, readMasked, validateOTP, type MaskPart } from './structured-input-model';
const styles=`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}.ui-structured-hint{color:var(--ui-color-muted);font-size:var(--ui-text-small);margin-block:var(--ui-space-control-gap) 0;}.ui-structured-error{color:var(--ui-color-danger);}.ui-code-input{font-family:var(--ui-font-code);}.ui-token-editor{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);align-items:center;}.ui-token-editor input{flex:1 1 var(--ui-size-form-label);min-inline-size:0;}.ui-tokens{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);list-style:none;padding:0;margin-block:var(--ui-space-control-gap);}.ui-tokens li{display:flex;gap:var(--ui-space-control-gap);align-items:center;padding-inline:var(--ui-space-control-gap);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);min-inline-size:0;overflow-wrap:anywhere;}`;
@Component({selector:'ui-masked-input',standalone:true,imports:[FormField,FieldControl,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>MaskedInput),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>MaskedInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error() || problem()" [describedBy]="showPlaceholders() ? controlId()+'-format' : ''"><input #editor uiFieldControl class="ui-code-input" type="text" [name]="name()" [value]="display()" [placeholder]="example()" [attr.autocomplete]="autocomplete()" [disabled]="blocked() || configurationError() !== null" [readOnly]="readonly()" (beforeinput)="before($event)" (input)="changed($event)" (blur)="left()" (compositionstart)="composing=true" (compositionend)="endComposition($event)">@if(showPlaceholders()){<p class="ui-structured-hint" [id]="controlId()+'-format'">{{'入力書式:' | uiMessage}} <bdi dir="ltr">{{example()}}</bdi></p>}</ui-form-field>`,styles})
export class MaskedInput extends FieldValueControl<string> implements Validator {
 private readonly uiRuntimeText_MaskedInput=injectUiRuntimeText();

 protected readonly emptyValue='';readonly mask=input.required<string>();readonly placeholderCharacter=input('_');readonly showPlaceholders=input(true,{transform:booleanAttribute});readonly clearIncompleteOnBlur=input(false,{transform:booleanAttribute});readonly autocomplete=input('off');
 private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');private readonly draft=linkedSignal(()=>{this.current();this.mask();return null as string|null;});protected composing=false;private validatorChanged:()=>void=()=>{};
 protected readonly configuration=computed(()=>{try{const parts=parseMask(this.mask());if(graphemes(this.placeholderCharacter()).length!==1)throw new Error();return {parts,error:null};}catch{return {parts:[] as readonly MaskPart[],error:this.uiRuntimeText_MaskedInput('入力書式と未入力文字の設定を確認してください。')};}});
 protected readonly configurationError=computed(()=>this.configuration().error);
 protected readonly display=computed(()=>this.draft()??(readMasked(this.current(),this.configuration().parts)===this.current()?formatMasked(this.current(),this.configuration().parts):this.current()));
 protected readonly example=computed(()=>formatMasked('',this.configuration().parts,this.placeholderCharacter()));
 protected readonly problem=computed(()=>this.configurationError()??(this.draft()!==null||readMasked(this.current(),this.configuration().parts)!==this.current()?this.uiRuntimeText_MaskedInput('入力書式に合わない文字を確認してください。'):this.current()&&graphemes(this.current()).length!==this.slots()?this.uiRuntimeText_MaskedInput('入力が途中です。'):'') );
 private slots():number{return this.configuration().parts.filter(part=>part.kind!=='literal').length;}
 constructor(){super();effect(()=>{this.mask();this.placeholderCharacter();this.required();this.validatorChanged();});}
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
 override writeValue(value:unknown):void{super.writeValue(value);this.draft.set(null);}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null {if(this.configurationError())return {maskConfiguration:true};if(this.draft()!==null)return {maskDraft:true};const value=typeof control.value==='string'?control.value:'';if(!value)return this.required()?{required:true}:null;return readMasked(value,this.configuration().parts)===value&&graphemes(value).length===this.slots()?null:{mask:true};}
 protected changed(event:Event):void {
  if(this.blocked()||this.readonly()||this.configurationError())return;const editor=event.target as HTMLInputElement;if(this.composing||(event as InputEvent).isComposing)return;
  const inputValue=editor.value,caret=editor.selectionStart??inputValue.length,raw=readMasked(inputValue,this.configuration().parts);
  if(raw===null){this.draft.set(inputValue);this.validatorChanged();return;}
  const prefix=readMasked(inputValue.slice(0,caret),this.configuration().parts);this.draft.set(null);this.commit(raw);editor.value=formatMasked(raw,this.configuration().parts);const position=maskCaret(raw,this.configuration().parts,graphemes(prefix??raw).length);editor.setSelectionRange(position,position);this.validatorChanged();
 }
 protected before(event:Event):void {
  const inputEvent=event as InputEvent,editor=event.target as HTMLInputElement;if(this.blocked()||this.readonly()||this.composing||inputEvent.isComposing||this.draft()!==null||!['deleteContentBackward','deleteContentForward'].includes(inputEvent.inputType)||editor.selectionStart!==editor.selectionEnd)return;
  const parts=this.configuration().parts,characters=graphemes(this.current());if(readMasked(this.current(),parts)!==this.current())return;const caret=editor.selectionStart??0;let offset=0,index=0,target=-1;
  const ranges:Array<{start:number;end:number}>=[];for(const part of parts){if(part.kind==='literal'){offset+=part.value.length;continue;}if(index>=characters.length)break;const start=offset;offset+=characters[index]!.length;ranges.push({start,end:offset});if(inputEvent.inputType==='deleteContentBackward'&&start<caret)target=index;else if(inputEvent.inputType==='deleteContentForward'&&offset>caret&&target<0)target=index;index++;}
  if(target<0)return;inputEvent.preventDefault();characters.splice(target,1);const raw=characters.join('');let position:number;
  if(readMasked(raw,parts)!==raw){const range=ranges[target]!;const edited=editor.value.slice(0,range.start)+editor.value.slice(range.end);this.draft.set(edited);editor.value=edited;position=range.start;}
  else{this.commit(raw);editor.value=formatMasked(raw,parts);position=maskCaret(raw,parts,target);}editor.setSelectionRange(position,position);this.validatorChanged();
 }
 protected endComposition(event:Event):void{this.composing=false;this.changed(event);}
 protected left():void{if(this.clearIncompleteOnBlur()&&!this.blocked()&&!this.readonly()&&!this.editor()?.nativeElement.matches(':disabled')&&(this.draft()!==null||this.current()&&graphemes(this.current()).length!==this.slots())){this.draft.set(null);this.commit('');}this.touch();this.validatorChanged();}
}

@Component({selector:'ui-otp-input',standalone:true,imports:[FormField,FieldControl,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>OTPInput),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>OTPInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error() || problem()" [describedBy]="controlId()+'-length'"><input uiFieldControl class="ui-code-input" type="text" autocomplete="one-time-code" [attr.inputmode]="kind()==='numeric'?'numeric':'text'" [attr.pattern]="pattern()" [name]="name()" [value]="current()" [disabled]="blocked() || configurationError() !== null" [readOnly]="readonly()" (input)="changed($event)" (paste)="paste($event)" (blur)="touch()"><p class="ui-structured-hint" [id]="controlId()+'-length'">{{current().length}} / {{digits()}} {{'桁' | uiMessage}}{{kind()==='alphanumeric'?(' (英数字)' | uiMessage):(' (数字)' | uiMessage)}}</p></ui-form-field>`,styles})
export class OTPInput extends FieldValueControl<string> implements Validator {
 private readonly uiRuntimeText_OTPInput=injectUiRuntimeText();

 protected readonly emptyValue='';readonly digits=input(6);readonly kind=input<'numeric'|'alphanumeric'>('numeric');readonly stripPasteSeparators=input(false,{transform:booleanAttribute});private validatorChanged:()=>void=()=>{};
 protected readonly configurationError=computed(()=>Number.isSafeInteger(this.digits())&&this.digits()>0&&this.digits()<=64?null:this.uiRuntimeText_OTPInput('桁数には1から64の整数を指定してください。'));
 protected readonly pattern=computed(()=>`${this.kind()==='numeric'?'[0-9]':'[A-Za-z0-9]'}{${this.configurationError()?1:this.digits()}}`);
 protected readonly problem=computed(()=>this.configurationError()??(this.current()&&!validateOTP(this.current(),this.digits(),this.kind())?this.uiRuntimeText_OTPInput('指定した桁数と文字種を確認してください。'):''));
 constructor(){super();effect(()=>{this.digits();this.kind();this.required();this.validatorChanged();});}
 protected coerce(value:unknown):string{return typeof value==='string'?value:'';}
 protected changed(event:Event):void{if(this.configurationError())return;this.commit(this.text(event));}
 protected paste(event:ClipboardEvent):void{if(!this.stripPasteSeparators()||this.blocked()||this.readonly()||this.configurationError())return;const text=event.clipboardData?.getData('text');if(text===undefined)return;event.preventDefault();const editor=event.target as HTMLInputElement,start=editor.selectionStart??0,end=editor.selectionEnd??start;const inserted=text.replace(/[\s-]/g,'');const value=editor.value.slice(0,start)+inserted+editor.value.slice(end);this.commit(value);editor.value=value;editor.setSelectionRange(start+inserted.length,start+inserted.length);}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null{if(this.configurationError())return {otpConfiguration:true};const value=typeof control.value==='string'?control.value:'';return !value?this.required()?{required:true}:null:validateOTP(value,this.digits(),this.kind())?null:{otp:true};}
}

@Component({selector:'ui-tag-input,ui-token-input',standalone:true,imports:[FormField,FieldControl,ActionControl,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TagInput),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>TagInput),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error() || problem()" [describedBy]="controlId()+'-count '+controlId()+'-pending'"><ul class="ui-tokens" [attr.aria-label]="label()+('の入力済み項目' | uiMessage)">@for(token of current();track $index){<li><span>{{token}}</span><button uiAction [attr.aria-label]="token+('を削除 (' | uiMessage)+($index+1)+')'" [disabled]="blocked() || readonly()" (click)="remove($index)">{{'削除' | uiMessage}}</button></li>}</ul><div class="ui-token-editor"><input #editor uiFieldControl [uiFieldRequired]="false" type="text" [name]="name()" autocomplete="off" [value]="draft()" [attr.list]="options().length ? controlId()+'-options' : null" [disabled]="blocked() || configurationError() !== null" [readOnly]="readonly()" (input)="edit($event)" (keydown.enter)="enter($event)" (blur)="touch()"><button uiAction [disabled]="blocked() || readonly() || !draft().trim() || configurationError() !== null" (click)="add()">{{'追加' | uiMessage}}</button></div><datalist [id]="controlId()+'-options'">@for(option of options();track option){<option [value]="option"></option>}</datalist><p class="ui-structured-hint" [id]="controlId()+'-pending'" role="status" aria-atomic="true">{{draft().trim()?('入力中の項目を追加するか、入力欄をクリアしてください。' | uiMessage):''}}</p><p class="ui-structured-hint" [id]="controlId()+'-count'">{{current().length}} {{'件' | uiMessage}}{{maxTokens()===null?'':(' / 最大 ' | uiMessage)+maxTokens()+(' 件' | uiMessage)}}</p></ui-form-field>`,styles})
export class TagInput extends FieldValueControl<readonly string[]> implements Validator {
 private readonly uiRuntimeText_TagInput=injectUiRuntimeText();

 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

 protected readonly emptyValue:readonly string[]=[];readonly options=input<readonly string[]>([]);readonly freeInput=input(true,{transform:booleanAttribute});readonly allowDuplicates=input(false,{transform:booleanAttribute});readonly caseSensitive=input(true,{transform:booleanAttribute});readonly maxTokens=input<number|null>(null);protected readonly draft=signal('');private readonly rejected=signal('');private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');private validatorChanged:()=>void=()=>{};
 protected readonly configurationError=computed(()=>this.maxTokens()!==null&&(!Number.isSafeInteger(this.maxTokens())||this.maxTokens()!<0)?this.uiRuntimeText_TagInput('最大件数には0以上の整数を指定してください。'):null);
 protected readonly problem=computed(()=>this.configurationError()??(this.rejected()||this.collectionProblem(this.current())));
 private collectionProblem(values:readonly string[]):string{if(this.maxTokens()!==null&&values.length>this.maxTokens()!)return this.uiRuntimeText_TagInput('最大件数を超えています。項目を削除してください。');if(!this.allowDuplicates()&&new Set(values.map(value=>this.key(value))).size!==values.length)return this.uiRuntimeText_TagInput('重複した項目を確認してください。');if(values.some(value=>!value.trim()||!this.freeInput()&&!this.options().includes(value)))return this.uiRuntimeText_TagInput('候補にない項目を確認してください。');return '';}
 protected coerce(value:unknown):readonly string[]{return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];}
 constructor(){super();effect(()=>{this.options();this.freeInput();this.allowDuplicates();this.caseSensitive();this.maxTokens();this.required();this.draft();this.validatorChanged();});}
 override writeValue(value:unknown):void{const values=this.coerce(value),editor=this.editor()?.nativeElement,host=editor?.closest('ui-tag-input,ui-token-input'),active=editor?.ownerDocument.activeElement;const changed=values.length!==this.current().length||values.some((item,index)=>item!==this.current()[index]);if(changed&&active instanceof HTMLButtonElement&&host?.contains(active)&&editor&&!editor.matches(':disabled'))editor.focus();super.writeValue(value);this.draft.set('');this.rejected.set('');}
 private key(value:string):string{return this.caseSensitive()?value:value.toLocaleLowerCase(this.effectiveLocale());}
 protected edit(event:Event):void{if(this.blocked()||this.readonly())return;this.draft.set(this.text(event));this.rejected.set('');}
 protected enter(event:Event):void{const keyboard=event as KeyboardEvent;if(keyboard.isComposing||keyboard.keyCode===229)return;event.preventDefault();this.add();}
 protected add():void{if(this.blocked()||this.readonly()||this.configurationError())return;const value=this.draft().trim();if(!value)return;
  const error=!this.freeInput()&&!this.options().includes(value)?this.uiRuntimeText_TagInput('候補から項目を選んでください。'):!this.allowDuplicates()&&this.current().some(item=>this.key(item)===this.key(value))?this.uiRuntimeText_TagInput('同じ項目は追加できません。'):this.maxTokens()!==null&&this.current().length>=this.maxTokens()!?this.uiRuntimeText_TagInput('最大件数に達しています。'):'';
  if(error){this.rejected.set(error);this.touch();return;}this.commit([...this.current(),value]);this.draft.set('');this.rejected.set('');this.editor()?.nativeElement.focus();
 }
 protected remove(index:number):void{if(this.blocked()||this.readonly()||index<0||index>=this.current().length)return;this.editor()?.nativeElement.focus();this.commit(this.current().filter((_,position)=>position!==index));this.rejected.set('');}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null{if(this.configurationError())return {tokenConfiguration:true};if(this.draft().trim())return {tokenDraft:true};const values=Array.isArray(control.value)?control.value as string[]:[];if(this.required()&&!values.length)return {required:true};if(this.maxTokens()!==null&&values.length>this.maxTokens()!)return {maxTokens:true};if(!this.allowDuplicates()&&new Set(values.map(value=>this.key(value))).size!==values.length)return {duplicate:true};if(values.some(value=>!value.trim()||!this.freeInput()&&!this.options().includes(value)))return {token:true};return null;}
}
