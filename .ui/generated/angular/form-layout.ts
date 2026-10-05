import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, Directive, effect, ElementRef, inject, input, output } from '@angular/core';
import { ActionControl } from './action-control';
import { layoutSpace, positiveInteger, type LayoutSpace } from './layout-model';
@Directive({selector:'[uiFormLayout]',standalone:true,host:{class:'ui-form-layout','[style.--ui-form-columns]':'checkedColumns()', '[style.--ui-form-gap]':'spacing()', '[style.--ui-form-label-width]':'width()', '[style.--ui-form-label-layout]':'labelPosition() === "inline" ? "grid" : "block"', '[style.--ui-form-label-columns]':'labelPosition() === "inline" ? "min(var(--ui-form-label-width, var(--ui-size-form-label)), 40%) minmax(0, 1fr)" : "none"', '[attr.data-direction]':'direction()'}})
export class FormLayout {
 readonly columns=input(1); readonly direction=input<'vertical'|'horizontal'>('vertical'); readonly gap=input<LayoutSpace>('normal');
 readonly labelPosition=input<'above'|'inline'>('above'); readonly labelWidth=input<number|null>(null);
 protected readonly checkedColumns=computed(()=>{if(!positiveInteger(this.columns()))throw new Error('uiFormLayout columns must be a positive integer.');return this.columns();});
 protected readonly spacing=computed(()=>layoutSpace(this.gap()));
 protected readonly width=computed(()=>{const width=this.labelWidth();if(width!==null&&(!Number.isFinite(width)||width<=0))throw new Error('uiFormLayout labelWidth must be a positive pixel size.');return width===null?'var(--ui-size-form-label)':width+'px';});
}
@Component({selector:'ui-form-group',standalone:true,imports:[FormLayout],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<fieldset [disabled]="disabled()" [attr.aria-describedby]="hint() ? groupId()+'-hint' : null"><legend>{{label()}}</legend>@if(hint()){<p class="ui-form-field-hint" [id]="groupId()+'-hint'">{{hint()}}</p>}<div uiFormLayout [columns]="columns()" [direction]="direction()" [gap]="gap()" [labelPosition]="labelPosition()" [labelWidth]="labelWidth()"><ng-content /></div></fieldset>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}fieldset{min-inline-size:0;margin:0;padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);}legend{font-weight:var(--ui-weight-control);padding-inline:var(--ui-space-control-gap);}p{margin-block:0 var(--ui-space-field);}`})
export class FormGroup {
 readonly groupId=input.required<string>();readonly label=input.required<string>();readonly hint=input('');readonly disabled=input(false,{transform:booleanAttribute});
 readonly columns=input(1);readonly direction=input<'vertical'|'horizontal'>('vertical');readonly gap=input<LayoutSpace>('normal');readonly labelPosition=input<'above'|'inline'>('above');readonly labelWidth=input<number|null>(null);
 constructor(){effect(()=>{if(!this.groupId().trim()||/\s/.test(this.groupId())||!this.label().trim())throw new Error('ui-form-group requires a simple ID and nonempty label.');});}
}
@Component({selector:'ui-form-actions',standalone:true,imports:[ActionControl],changeDetection:ChangeDetectionStrategy.OnPush,
 host:{class:'ui-form-actions',role:'group',tabindex:'-1','[attr.aria-label]':'label()','[attr.data-direction]':'direction()', '[attr.data-align]':'align()', '[attr.aria-busy]':'busy() ? "true" : null'},
 template:`@if(showSubmit()){<button data-form-action="submit" uiAction variant="primary" type="submit" [attr.form]="formId()" [busy]="busy()" [disabled]="disabled()">{{submitLabel()}}</button>}@if(showReset()){<button data-form-action="reset" uiAction type="reset" [attr.form]="formId()" [disabled]="disabled() || busy()">{{resetLabel()}}</button>}@if(showCancel()){<button data-form-action="cancel" uiAction [disabled]="disabled() || busy()" (click)="cancelled.emit()">{{cancelLabel()}}</button>}<ng-content />`,
 styles:`:host{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);align-items:center;min-inline-size:0;}:host([hidden]){display:none;}:host([data-direction="vertical"]){flex-direction:column;align-items:stretch;}:host([data-align="center"]){justify-content:center;}:host([data-align="end"]){justify-content:flex-end;}:host(:focus-visible){outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}`})
export class FormActions {
 readonly formId=input<string|null>(null);readonly disabled=input(false,{transform:booleanAttribute});readonly busy=input(false,{transform:booleanAttribute});
 readonly showSubmit=input(true,{transform:booleanAttribute});readonly showReset=input(true,{transform:booleanAttribute});readonly showCancel=input(true,{transform:booleanAttribute});
 readonly submitLabel=input('送信');readonly resetLabel=input('入力を戻す');readonly cancelLabel=input('取消');readonly direction=input<'horizontal'|'vertical'>('horizontal');readonly align=input<'start'|'center'|'end'>('end');readonly cancelled=output<void>();
 readonly label=input('フォームの操作');private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private previousFocus:HTMLElement|null=null;
 constructor(){
  effect(()=>{if(!this.label().trim()||this.showSubmit()&&!this.submitLabel().trim()||this.showReset()&&!this.resetLabel().trim()||this.showCancel()&&!this.cancelLabel().trim()||this.formId()!==null&&(!this.formId()!.trim()||/\s/.test(this.formId()!)))throw new Error('ui-form-actions requires action labels and a simple form ID.');});
  effect(()=>{const blocked=this.busy()||this.disabled(),visibility={submit:this.showSubmit(),reset:this.showReset(),cancel:this.showCancel()};const active=this.element.ownerDocument.activeElement as HTMLElement|null;if(active?.parentElement===this.element&&active.dataset['formAction']&&(blocked||!visibility[active.dataset['formAction'] as keyof typeof visibility])){this.previousFocus=active;this.element.focus();}});
  afterRenderEffect(()=>{if(!this.busy()&&!this.disabled()&&this.element.ownerDocument.activeElement===this.element&&this.previousFocus){const previous=this.previousFocus;this.previousFocus=null;if(previous.isConnected&&!previous.matches(':disabled'))previous.focus();}});
  const guard=(event:Event)=>{if(this.busy()||this.disabled()){event.preventDefault();event.stopImmediatePropagation();}};this.element.addEventListener('click',guard,true);this.element.addEventListener('auxclick',guard,true);inject(DestroyRef).onDestroy(()=>{this.element.removeEventListener('click',guard,true);this.element.removeEventListener('auxclick',guard,true);});
 }
}
@Component({selector:'ui-input-group',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 host:{class:'ui-input-group','[attr.data-connected]':'connected()'},
 template:`<ng-content select="[uiInputBefore]" /><ng-content /><ng-content select="[uiInputAfter]" />`,
 styles:`:host{display:flex;align-items:center;flex-wrap:wrap;gap:var(--ui-space-control-gap);min-inline-size:0;max-inline-size:100%;}:host([data-connected="true"]){gap:0;}:host([hidden]){display:none;}`} )
export class InputGroup{readonly connected=input(true,{transform:booleanAttribute});}
export interface FormError{controlId:string;message:string;label:string}
@Component({selector:'ui-form-error-summary',standalone:true,imports:[ActionControl],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`@if(visible() && errors().length){<section role="alert" [attr.aria-label]="title()"><h2>{{title()}}</h2><ul>@for(error of errors();track error.controlId){<li><button uiAction (click)="go(error)">{{error.label}}: {{error.message}}</button></li>}</ul></section>}`,
 styles:`:host{display:block;min-inline-size:0;}section{color:var(--ui-color-danger);background:var(--ui-color-error-surface);padding:var(--ui-space-section);border-radius:var(--ui-radius-surface);}h2{font-size:var(--ui-text-body);}li+li{margin-block-start:var(--ui-space-control-gap);}:host([hidden]){display:none;}`} )
export class FormErrorSummary{
 readonly errors=input.required<readonly FormError[]>();readonly title=input('入力内容を確認してください');readonly visible=input(true,{transform:booleanAttribute});readonly navigate=output<FormError>();
 private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 protected go(error:FormError):void{this.navigate.emit(error);const target=this.element.ownerDocument.getElementById(error.controlId);if(target instanceof HTMLElement){target.focus();target.scrollIntoView({block:'nearest'});}}
}
