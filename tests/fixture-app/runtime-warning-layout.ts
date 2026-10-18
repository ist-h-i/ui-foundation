import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {FieldControl, FormField, FormGroup, FormLayout} from '../../.ui/generated/angular';

/** Compiled consumers are required: projected HTML cannot instantiate directives. */
@Component({selector:'runtime-warning-layout',standalone:true,
 imports:[FormLayout,FormGroup,FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`@if(mode()==='fieldset'){
  @if(hint()){<p id="warning-direct-hint">{{hint()}}</p>}
  <fieldset uiFormLayout [columns]="columns()" [direction]="direction()" [gap]="gap()" [labelPosition]="labelPosition()" [labelWidth]="labelWidth()" [disabled]="disabled()" [attr.aria-describedby]="hint()?'warning-direct-hint':null">
   <legend>直接fieldsetの申請</legend>
   <ui-form-field controlId="warning-direct-text" label="申請の説明"><input uiFieldControl value="保持する説明"></ui-form-field>
   <ui-form-field controlId="warning-direct-check" label="確認の同意" labelPosition="inline"><input uiFieldControl type="checkbox"></ui-form-field>
  </fieldset>
 }@else{
  <ui-form-group groupId="warning-composed-group" label="部品を合成した申請" [hint]="hint()" [columns]="columns()" [direction]="direction()" [gap]="gap()" [labelPosition]="labelPosition()" [labelWidth]="labelWidth()" [disabled]="disabled()">
   <ui-form-field controlId="warning-group-text" label="申請の説明"><input uiFieldControl value="保持する説明"></ui-form-field>
   <ui-form-field controlId="warning-group-check" label="確認の同意" labelPosition="inline"><input uiFieldControl type="checkbox"></ui-form-field>
  </ui-form-group>
 }<button type="button" data-warning-after>グループの後の操作</button>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}fieldset[uiFormLayout]{margin:0;min-inline-size:0;box-sizing:border-box;padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);}legend{font-weight:var(--ui-weight-control);}p{margin:0 0 var(--ui-space-field);}`})
export class RuntimeWarningLayout {
 readonly mode=input<'fieldset'|'group'>('fieldset');readonly columns=input(2);
 readonly direction=input<'vertical'|'horizontal'>('vertical');readonly gap=input<'none'|'compact'|'normal'|'wide'>('normal');
 readonly labelPosition=input<'above'|'inline'>('inline');readonly labelWidth=input<number|null>(80);
 readonly disabled=input(false);readonly hint=input('内容を確認して入力してください');
}
