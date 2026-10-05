import { booleanAttribute, ChangeDetectionStrategy, Component, Directive, ElementRef, inject, input, output } from '@angular/core';
import { ActionControl } from './action-control';
@Directive({selector:'[uiFormLayout]',standalone:true,host:{class:'ui-form-layout','[style.--ui-form-columns]':'columns()','[attr.data-direction]':'direction()'}})
export class FormLayout{readonly columns=input(1);readonly direction=input<'vertical'|'horizontal'>('vertical');}
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
