import {computed as uiLocaleComputed} from '@angular/core';
import {computed as localeComputed} from '@angular/core';
import {injectUiLocale,injectUiText,UiMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, DestroyRef, Directive, effect, ElementRef, forwardRef, inject, input, linkedSignal, output, signal, TemplateRef, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { ValueControl, FieldValueControl } from './value-control';
import { availableOverlayAnchor, observeOverlay, OverlayRegistry, positionOverlay, type OverlayPlacement } from './overlay';
export interface SelectOption { value:string;label:string;disabled?:boolean;group?:string }
export interface ComboboxOptionContext {$implicit:SelectOption;active:boolean;selected:boolean}
@Directive({selector:'ng-template[uiComboboxOption]',standalone:true})
export class ComboboxOption {
 readonly template=inject<TemplateRef<ComboboxOptionContext>>(TemplateRef);
 static ngTemplateContextGuard(_directive:ComboboxOption,context:unknown):context is ComboboxOptionContext{return true;}
}
function grouped(options:readonly SelectOption[]):{label:string;options:SelectOption[]}[]{
 const groups=new Map<string,SelectOption[]>();for(const option of options){const group=option.group??'';groups.set(group,[...(groups.get(group)??[]),option]);}return [...groups].map(([label,options])=>({label,options}));
}
const selectionStyles=`
 :host { display: block; min-inline-size: 0; max-inline-size: 100%; font: inherit; color: var(--ui-color-text); }
 :host([hidden]), [hidden] { display: none !important; }
 fieldset { min-inline-size: 0; padding: var(--ui-space-control-y); margin: 0; border: var(--ui-border-control) solid var(--ui-color-border); border-radius: var(--ui-radius-control); }
 legend { font-weight: var(--ui-weight-control); }
 .ui-options {display:grid;grid-template-columns:repeat(var(--ui-option-columns,1),minmax(0,1fr));gap:var(--ui-space-control-gap);}
 .ui-options[data-direction="horizontal"] {display:flex;flex-wrap:wrap;}
 @media(max-width:40rem){.ui-options{grid-template-columns:minmax(0,1fr);}}
 .ui-option { display:flex; align-items:center; gap:var(--ui-space-control-gap); min-block-size:var(--ui-size-control); overflow-wrap:anywhere; }
 .ui-option input { flex:0 0 auto; inline-size:var(--ui-size-icon); block-size:var(--ui-size-icon); accent-color:var(--ui-color-action); }
 input:focus-visible, button:focus-visible { outline:var(--ui-border-focus) solid var(--ui-color-focus); outline-offset:var(--ui-border-focus-offset); }
 .ui-selection { display:grid;gap:var(--ui-space-control-gap);padding:0;border:0;border-radius:0; }
 .ui-selection > legend { padding:0;margin-block-end:var(--ui-space-control-gap); }
 .ui-selection p { margin:0;font-size:var(--ui-text-small); }
 .ui-selection__search { display:grid;gap:var(--ui-space-control-gap); }
 .ui-selection__search label { font-size:var(--ui-text-small);color:var(--ui-color-muted); }
 .ui-selection__actions, .ui-selection-values { display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap); }
 .ui-selection__group { padding:0;border:0;border-radius:0; }
 .ui-selection__group legend { padding:0;font-size:var(--ui-text-small);color:var(--ui-color-muted); }
 .ui-selection__group .ui-options { row-gap:0; }
 .ui-selection__status, .ui-selection__hint { color:var(--ui-color-muted); }
 .ui-selection-error { color:var(--ui-color-danger); }
 .ui-combobox-row { display:flex;flex-wrap:wrap;align-items:start;gap:var(--ui-space-control-gap);min-inline-size:0; }
 .ui-combobox { position:relative;flex:1 1 var(--ui-size-form-label);min-inline-size:0; }
 .ui-combobox-row > button { flex:0 0 auto; }
 .ui-combobox-help { margin-block:var(--ui-space-control-gap) 0;font-size:var(--ui-text-small);color:var(--ui-color-muted); }
 .ui-combobox-help:empty { margin:0; }
 .ui-combobox__popup { position:fixed; inset:auto; margin:0; padding:var(--ui-space-control-gap); box-sizing:border-box; max-inline-size:calc(100vw - 2 * var(--ui-space-control-gap)); max-block-size:min(var(--ui-size-input-max-height),calc(100dvh - 2 * var(--ui-space-control-gap))); overflow:auto; background:var(--ui-color-surface); color:var(--ui-color-text); border:var(--ui-border-control) solid var(--ui-color-border); border-radius:var(--ui-radius-control); font:inherit; }
 .ui-combobox__option { padding:var(--ui-space-control-y) var(--ui-space-control-x); min-block-size:var(--ui-size-control); box-sizing:border-box; cursor:pointer; }
 .ui-combobox__option[aria-selected="true"], .ui-combobox__option--active { background:var(--ui-color-background); outline:var(--ui-border-control) solid var(--ui-color-focus); outline-offset:calc(-1 * var(--ui-border-control)); }
 .ui-combobox__option[aria-disabled="true"] { color:var(--ui-color-muted); cursor:default; }
 .ui-combobox__group { padding:var(--ui-space-control-y); font-weight:var(--ui-weight-control); }
`;
@Component({selector:'ui-checkbox',standalone:true,imports:[FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Checkbox),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()"><input uiFieldControl type="checkbox" [name]="name()" [checked]="current()" [indeterminate]="indeterminate()" [disabled]="blocked() || readonly()" (change)="commit(checked($event))" (blur)="touch()"></ui-form-field>`,styles:selectionStyles})
export class Checkbox extends FieldValueControl<boolean>{protected readonly emptyValue=false;readonly indeterminate=input(false,{transform:booleanAttribute});protected coerce(value:unknown):boolean{return value===true;}}
@Component({selector:'ui-switch',standalone:true,imports:[FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Switch),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [hint]="hint()" [error]="error()"><input uiFieldControl role="switch" type="checkbox" [name]="name()" [checked]="current()" [attr.aria-checked]="current()" [attr.aria-busy]="busy() ? 'true' : null" [disabled]="blocked() || readonly()" (change)="commit(checked($event))" (blur)="touch()"></ui-form-field>`,styles:selectionStyles})
export class Switch extends FieldValueControl<boolean>{protected readonly emptyValue=false;protected coerce(value:unknown):boolean{return value===true;}}
@Component({selector:'ui-select',standalone:true,imports:[FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Select),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-select-control"><select uiFieldControl [name]="name()" [value]="current() ?? ''" [disabled]="blocked() || readonly()" (change)="choose(text($event))" (blur)="touch()">
   <option value="" [disabled]="!clearable()" [selected]="current()===null">{{uiEffective_placeholder()}}</option>
   @for(group of groups();track group.label){@if(group.label){<optgroup [label]="group.label">@for(option of group.options;track option.value){<option [value]="option.value" [selected]="current()===option.value" [disabled]="!!option.disabled">{{option.label}}</option>}</optgroup>}
    @else{@for(option of group.options;track option.value){<option [value]="option.value" [selected]="current()===option.value" [disabled]="!!option.disabled">{{option.label}}</option>}}}
  </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>
 </ui-form-field>`,styles:selectionStyles})
export class Select extends FieldValueControl<string|null>{
 protected readonly uiText_Select=injectUiText();
 protected readonly emptyValue=null;readonly options=input.required<readonly SelectOption[]>();readonly clearable=input(false,{transform:booleanAttribute});readonly placeholder=input<string>();
 protected readonly uiEffective_placeholder=uiLocaleComputed(()=>this.placeholder()??this.uiText_Select('未選択'));
 protected readonly groups=computed(()=>grouped(this.options()));protected coerce(value:unknown):string|null{return typeof value==='string'&&value?value:null;}
 protected choose(value:string):void{if(!value){if(this.clearable())this.commit(null);}else if(this.options().some(o=>o.value===value&&!o.disabled))this.commit(value);}
}
@Component({selector:'ui-multi-select,ui-checkbox-group',standalone:true,imports:[ActionControl,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>MultiSelect),multi:true}],
 template:`<fieldset class="ui-selection" [id]="controlId()" tabindex="-1" [disabled]="blocked() || readonly()" [attr.aria-describedby]="descriptionIds()" [attr.aria-invalid]="error() ? 'true' : null" (focusout)="leftGroup($event)">
  <legend>{{label()}}{{required()?(' (必須)' | uiMessage):''}}</legend>
  @if(searchable()){<div class="ui-selection__search"><label [for]="controlId()+'-search'">{{label()}}{{'の候補を検索' | uiMessage}}</label><input class="ui-field-control" [id]="controlId()+'-search'" type="search" [value]="query()" (input)="query.set(text($event))"></div>}
  @if(showSelectAll()){<div class="ui-selection__actions"><button uiAction [disabled]="!canSelectAll()" (click)="selectAll()">{{'表示中をすべて選択' | uiMessage}}</button><button uiAction [disabled]="!current().length" (click)="commit([])">{{'選択を解除' | uiMessage}}</button></div>}
  @if(current().length){<div class="ui-selection-values">@for(value of current();track value){<button uiAction [attr.aria-label]="optionLabel(value)+('の選択を解除' | uiMessage)" (click)="remove(value)">{{optionLabel(value)}} ×</button>}</div>}
  @for(group of groups();track group.label){<fieldset class="ui-selection__group"><legend>{{group.label||('選択肢' | uiMessage)}}</legend><div class="ui-options" [attr.data-direction]="direction()" [style.--ui-option-columns]="checkedColumns()">@for(option of group.options;track option.value){
   <label class="ui-option"><input type="checkbox" [checked]="current().includes(option.value)" [disabled]="!!option.disabled || atLimit() && !current().includes(option.value)" (change)="toggle(option.value,checked($event))">{{option.label}}</label>
  }</div></fieldset>}
  @if(!filtered().length){<p>{{'一致する候補はありません。' | uiMessage}}</p>}
  <p class="ui-selection__status" role="status" aria-atomic="true">{{current().length}} {{'件選択' | uiMessage}}{{maxSelected()!==null?(' / 最大 ' | uiMessage)+maxSelected()+(' 件' | uiMessage):''}}</p>
  @if(hint()){<p class="ui-selection__hint" [id]="controlId()+'-hint'">{{hint()}}</p>}@if(error()){<p class="ui-selection-error" [id]="controlId()+'-error'" role="alert">{{error()}}</p>}
 </fieldset>`,styles:selectionStyles})
export class MultiSelect extends ValueControl<readonly string[]>{
 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

 protected readonly emptyValue:readonly string[]=[];readonly options=input.required<readonly SelectOption[]>();readonly searchable=input(true,{transform:booleanAttribute});readonly showSelectAll=input(true,{transform:booleanAttribute});readonly maxSelected=input<number|null>(null);
 readonly direction=input<'vertical'|'horizontal'>('vertical');readonly columns=input(1);protected readonly checkedColumns=computed(()=>{if(!Number.isSafeInteger(this.columns())||this.columns()<1)throw new Error('ui-checkbox-group columns must be a positive integer.');return this.columns();});
 protected readonly query=signal('');protected readonly filtered=computed(()=>this.options().filter(o=>o.label.toLocaleLowerCase(this.effectiveLocale()).includes(this.query().toLocaleLowerCase(this.effectiveLocale()))));
 protected readonly groups=computed(()=>grouped(this.filtered()));protected readonly atLimit=computed(()=>this.maxSelected()!==null&&this.current().length>=this.maxSelected()!);
 protected coerce(value:unknown):readonly string[]{return Array.isArray(value)?[...new Set(value.filter((v):v is string=>typeof v==='string'))]:[];}
 protected optionLabel(value:string):string{return this.options().find(o=>o.value===value)?.label??value;}
 protected toggle(value:string,checked:boolean):void{const option=this.options().find(o=>o.value===value);const values=this.current().filter(v=>v!==value);if(checked){if(!option||option.disabled||this.atLimit()&&!this.current().includes(value))return;values.push(value);}this.commit(values);}
 protected remove(value:string):void{if(this.blocked()||this.readonly())return;this.toggle(value,false);this.touch();}
 protected leftGroup(event:FocusEvent):void{const group=event.currentTarget as HTMLElement;if(event.relatedTarget instanceof Node&&group.contains(event.relatedTarget))return;this.touch();}
 protected canSelectAll():boolean{const values=new Set([...this.current(),...this.filtered().filter(o=>!o.disabled).map(o=>o.value)]);return values.size>this.current().length&&(this.maxSelected()===null||values.size<=this.maxSelected()!);}
 protected selectAll():void{if(this.canSelectAll())this.commit([...new Set([...this.current(),...this.filtered().filter(o=>!o.disabled).map(o=>o.value)])]);}
}
@Component({selector:'ui-combobox',standalone:true,imports:[FormField,FieldControl,ActionControl,NgTemplateOutlet,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Combobox),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>Combobox),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()">
  <div class="ui-combobox-row"><div class="ui-combobox"><input #editor uiFieldControl role="combobox" type="text" autocomplete="off" [name]="name()" [value]="query()" [placeholder]="placeholder()"
   aria-autocomplete="list" aria-haspopup="listbox" [attr.aria-expanded]="open()" [attr.aria-controls]="controlId()+'-list'" [attr.aria-activedescendant]="activeId()"
   [disabled]="blocked()" [readOnly]="readonly()" (input)="changed($event)" (keydown)="key($event)" (focus)="show()" (blur)="leave()">
   <div #popup class="ui-combobox__popup" popover="manual" [hidden]="!open()" [id]="controlId()+'-list'" role="listbox" [attr.aria-label]="label()+('の候補' | uiMessage)" [attr.aria-busy]="loading() ? 'true' : null">
    @for(group of groups();track group.label){<div role="group" [attr.aria-label]="group.label||label()+('の選択肢' | uiMessage)">@if(group.label){<div class="ui-combobox__group" role="presentation">{{group.label}}</div>}
     @for(option of group.options;track option.value){<div class="ui-combobox__option" role="option" [id]="optionId(option.value)" [attr.aria-selected]="current()===option.value" [attr.aria-disabled]="!!option.disabled"
      [class.ui-combobox__option--active]="active()===option.value" (pointerdown)="$event.preventDefault()" (click)="choose(option)">@if(optionTemplate();as custom){<ng-container [ngTemplateOutlet]="custom.template" [ngTemplateOutletContext]="{$implicit:option,active:active()===option.value,selected:current()===option.value}" />}@else{ {{option.label}} }</div>}
    </div>}
   </div>
  </div>
  <button uiAction [disabled]="blocked() || readonly() || current()===null && !query()" [attr.aria-label]="label()+('をクリア' | uiMessage)" (click)="clear()">{{'クリア' | uiMessage}}</button></div>
  <p class="ui-combobox-help">{{freeInput()?('自由に入力できます。' | uiMessage):('候補から選択してください。' | uiMessage)}}</p>
  @if(!freeInput() && query() && current()===null){<p class="ui-combobox-help" role="status">{{'候補を選択するまで入力は確定されません。' | uiMessage}}</p>}
  <p class="ui-combobox-help" role="status" aria-atomic="true">{{loading()?('候補を取得しています。' | uiMessage):open() ? filtered().length+(' 件の候補' | uiMessage) : ''}}</p>
 </ui-form-field>`,styles:selectionStyles})
export class Combobox extends FieldValueControl<string|null> implements Validator{
 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

 protected readonly emptyValue=null;readonly options=input<readonly SelectOption[]>([]);readonly optionsQuery=input<string|null>(null);readonly optionsRequestId=input<number|null>(null);readonly freeInput=input(false,{transform:booleanAttribute});readonly loading=input(false,{transform:booleanAttribute});readonly placeholder=input('');
 readonly placement=input<OverlayPlacement>('bottom-start');protected readonly optionTemplate=contentChild(ComboboxOption);private readonly popup=viewChild<ElementRef<HTMLElement>>('popup');private readonly registry=inject(OverlayRegistry);
 private cleanupPopup:(()=>void)|null=null;
 readonly queryChange=output<{query:string;requestId:number}>();private readonly requestId=signal(0);
 protected readonly open=signal(false);protected readonly active=signal<string|null>(null);private readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 private readonly editing=signal(false);private validatorChanged:()=>void=()=>{};
 protected readonly query=linkedSignal<{value:string|null;options:readonly SelectOption[];freeInput:boolean;editing:boolean},string>({source:()=>({value:this.current(),options:this.options(),freeInput:this.freeInput(),editing:this.editing()}),computation:(source,previous)=>source.editing?previous?.value??'':source.options.find(o=>o.value===source.value)?.label??(source.freeInput?source.value??'':'')});
 protected readonly filtered=computed(()=>this.optionsQuery()!==null&&this.optionsQuery()!==this.query()||this.optionsRequestId()!==null&&this.optionsRequestId()!==this.requestId()?[]:this.options().filter(o=>o.label.toLocaleLowerCase(this.effectiveLocale()).includes(this.query().toLocaleLowerCase(this.effectiveLocale()))));
 protected readonly groups=computed(()=>grouped(this.filtered()));protected readonly activeId=computed(()=>this.open()&&this.filtered().some(o=>o.value===this.active()&&!o.disabled)?this.optionId(this.active()!):null);
 protected coerce(value:unknown):string|null{return typeof value==='string'&&value?value:null;}
 constructor(){super();effect(()=>{this.options();this.freeInput();this.required();this.validatorChanged();});
  afterRenderEffect(onCleanup=>{const open=this.open(),blocked=this.blocked()||this.readonly(),popup=this.popup()?.nativeElement,anchor=this.editor()?.nativeElement,placement=this.placement();if(!popup||!anchor)return;
   if(!open||blocked){if(popup.matches(':popover-open'))popup.hidePopover();if(blocked){this.open.set(false);this.active.set(null);}return;}
   if(!availableOverlayAnchor(anchor)){this.open.set(false);return;}
   popup.showPopover();const cleanup=this.registry.register({element:popup,anchor,kind:'popup',outside:true,dismiss:()=>this.closePopup()});
   const resize=observeOverlay(popup,anchor,()=>{popup.style.inlineSize=anchor.getBoundingClientRect().width+'px';positionOverlay(popup,anchor,placement);});
   const release=()=>{cleanup();resize();if(popup.matches(':popover-open'))popup.hidePopover();if(this.cleanupPopup===release)this.cleanupPopup=null;};this.cleanupPopup=release;onCleanup(release);
  });
  afterRenderEffect(()=>{const id=this.activeId();if(id)this.editor()?.nativeElement.ownerDocument.getElementById(id)?.scrollIntoView({block:'nearest'});});
 }
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 override writeValue(value:unknown):void{this.editing.set(false);super.writeValue(value);this.query.set(this.options().find(o=>o.value===this.current())?.label??(this.freeInput()?this.current()??'':''));}
 validate(control:AbstractControl):ValidationErrors|null{const value=control.value as string|null;if(!value)return this.required()?{required:true}:!this.freeInput()&&this.query()?{option:true}:null;return !this.freeInput()&&!this.options().some(option=>option.value===value&&!option.disabled)?{option:true}:null;}
 protected optionId(value:string):string{return this.controlId()+'-option-'+encodeURIComponent(value);}
 protected show():void{if(!this.blocked()&&!this.readonly())this.open.set(true);}
 private closePopup():void{this.cleanupPopup?.();this.open.set(false);this.active.set(null);}
 protected leave():void{this.closePopup();this.touch();}
 protected changed(event:Event):void{if(this.blocked()||this.readonly())return;const query=this.text(event);this.editing.set(true);this.query.set(query);this.commit(this.freeInput()?query||null:null);this.active.set(null);this.open.set(true);this.validatorChanged();this.requestId.update(id=>id+1);this.queryChange.emit({query,requestId:this.requestId()});}
 protected clear():void{if(this.blocked()||this.readonly())return;this.editing.set(false);this.commit(null);this.query.set('');this.active.set(null);this.validatorChanged();this.requestId.update(id=>id+1);this.queryChange.emit({query:'',requestId:this.requestId()});this.editor()?.nativeElement.focus();}
 protected choose(option:SelectOption):void{if(this.blocked()||this.readonly()||option.disabled)return;this.editing.set(false);this.commit(option.value);this.query.set(option.label);this.closePopup();this.validatorChanged();this.touch();}
 protected key(event:KeyboardEvent):void{
  if(this.blocked()||this.readonly()||event.isComposing||event.keyCode===229)return;
  const options=this.filtered().filter(o=>!o.disabled);const index=options.findIndex(o=>o.value===this.active());
  if(event.key==='Escape'){if(this.open()){event.preventDefault();this.closePopup();}return;}
  if(event.key==='Tab'){this.closePopup();return;}
  if(event.key==='Enter'){if(this.open()){event.preventDefault();const option=options.find(o=>o.value===this.active());if(option)this.choose(option);}return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&(event.key==='ArrowDown'||event.key==='ArrowUp'||this.open())){
   event.preventDefault();this.open.set(true);const next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?(index+1)%options.length:(index<0?options.length-1:(index-1+options.length)%options.length);
   this.active.set(options[next]?.value??null);const id=this.activeId();if(id)this.editor()?.nativeElement.ownerDocument.getElementById(id)?.scrollIntoView({block:'nearest'});
  }
 }
}
