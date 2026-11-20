import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {injectUiLocale,UiStableMessagePipe} from './locale';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,Directive,effect,ElementRef,forwardRef,input,linkedSignal,signal,untracked,viewChild} from '@angular/core';
import {NG_VALIDATORS,NG_VALUE_ACCESSOR,type AbstractControl,type ValidationErrors,type Validator} from '@angular/forms';
import {ActionControl} from './action-control';
import {FormField,FieldControl} from './form-field';
import {FieldValueControl} from './value-control';
import {Calendar} from './calendar';
import {Dialog} from './dialog';
import {civilDate,civilLabel,formatCivilInput,parseCivilInput,timeSeconds,localDateTimeSeconds,type DateInputFormat} from './date-model';
const temporalStyles=`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}.ui-date-controls{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);align-items:center;}.ui-date-controls input{flex:1 1 12ch;min-inline-size:min(100%,12ch);max-inline-size:100%;}.ui-date-format{margin:0;color:var(--ui-color-muted);font-size:var(--ui-text-small);overflow-wrap:anywhere;}`;
@Directive({standalone:true})
abstract class TemporalControl extends FieldValueControl<string|null> implements Validator{
 protected readonly messageText = injectUiRuntimeText();
 protected readonly emptyValue=null;protected abstract readonly kind:'date'|'time'|'datetime-local'|'month'|'year';
 readonly min=input<string|null>(null);readonly max=input<string|null>(null);readonly clearable=input(true,{transform:booleanAttribute});protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);
 protected readonly invalidDraft=signal(false);private validatorChanged:()=>void=()=>{};
 protected readonly editor=viewChild<ElementRef<HTMLInputElement>>('editor');
 protected valid(value:string):boolean{switch(this.kind){case'date':return !!civilDate(value);case'month':return /^\d{4}-\d{2}$/.test(value)&&!!civilDate(value+'-01');case'year':return /^\d{1,4}$/.test(value)&&Number(value)>=1&&Number(value)<=9999;case'time':return timeSeconds(value)!==null;case'datetime-local':{const [date,time,...extra]=value.split('T');return extra.length===0&&!!civilDate(date)&&!!time&&timeSeconds(time)!==null;}}}
 protected coerce(value:unknown):string|null{return typeof value==='string'&&this.valid(value)?value:null;}
 protected changed(event:Event):void{if(this.blocked()||this.readonly())return;const input=event.target as HTMLInputElement;this.invalidDraft.set(input.validity.badInput);if(!input.validity.badInput)this.commit(input.value||null);this.validatorChanged();}
 protected clear():void{if(this.blocked()||this.readonly())return;this.invalidDraft.set(false);this.commit(null);this.writeEditor('');this.editor()?.nativeElement.focus();}
 protected writeEditor(value:string):void{const editor=this.editor()?.nativeElement;if(editor)editor.value=value;}
 override writeValue(value:unknown):void{super.writeValue(value);this.invalidDraft.set(false);this.writeEditor(this.current()??'');}
 constructor(){super();effect(()=>{this.min();this.max();this.required();this.validatorChanged();});}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 protected notifyValidation():void{this.validatorChanged();}
 protected draftInvalid(invalid:boolean):void{this.invalidDraft.set(invalid);this.validatorChanged();}
 protected validateExtra(_value:string):ValidationErrors|null{return null;}
 validate(control:AbstractControl):ValidationErrors|null{
  const value=control.value as unknown;if(this.invalidDraft())return {date:true};if(value===null||value===undefined||value==='')return this.required()?{required:true}:null;
  if(typeof value!=='string'||!this.valid(value))return {date:true};
  const compare=(v:string)=>this.kind==='year'?Number(v):this.kind==='time'?timeSeconds(v)!:v;
  const actual=compare(value),min=this.min(),max=this.max();
  if(this.kind==='time'&&min&&max&&compare(min)>compare(max)){if(actual<compare(min)&&actual>compare(max))return {timeRange:true};}
  else{if(min&&actual<compare(min))return {min:{min,actual:value}};if(max&&actual>compare(max))return {max:{max,actual:value}};}
  return this.validateExtra(value);
 }
}
@Component({selector:'ui-date-picker',standalone:true,imports:[FormField,FieldControl,ActionControl,Calendar,Dialog,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>DatePicker),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>DatePicker),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()"><div class="ui-date-controls">
  <input #editor uiFieldControl [type]="activeInputFormat()==='native'?'date':'text'" [value]="editorValue()" [name]="name()" [attr.min]="min()" [attr.max]="max()" [attr.placeholder]="activeInputFormat()==='native'?null:activeInputFormat()" [disabled]="blocked()" [readOnly]="readonly()" (input)="dateChanged($event)" (blur)="touch()">
  <button uiAction [disabled]="blocked()||readonly()" [attr.aria-label]="messageText('uiFoundation.datePicker.openCalendarLabel', {label: label()})" aria-haspopup="dialog" (click)="calendarOpen.set(true)">{{'uiFoundation.datePicker.calendar' | uiStableMessage}}</button>
  @if(clearable()){<button uiAction [disabled]="blocked()||readonly()||current()===null&&!invalidDraft()" [attr.aria-label]="messageText('uiFoundation.datePicker.clearLabel', {label: label()})" (click)="clear()">{{'uiFoundation.datePicker.clearForDateInput' | uiStableMessage}}</button>}</div>
  @if(current() || activeInputFormat()!=='native'){<p class="ui-date-format">{{current()?formatted():''}}{{current()&&activeInputFormat()!=='native'?' · ':''}}{{activeInputFormat()==='native'?'':messageText('uiFoundation.datePicker.inputFormatHint', {format: activeInputFormat()})}}</p>}
 </ui-form-field>
 <dialog uiDialog [label]="messageText('uiFoundation.datePicker.selectDateLabel', {label: label()})" [open]="calendarOpen()" (openChange)="calendarOpen.set($event)">
  <ui-calendar [controlId]="controlId()+'-calendar'" [label]="messageText('uiFoundation.datePicker.calendarLabel', {label: label()})" [value]="current()" (valueChange)="choose($event)" [min]="min()" [max]="max()" [disabledDates]="disabledDates()" [dateDisabled]="dateDisabled()" [weekStartsOn]="weekStartsOn()" [locale]="effectiveLocale()" [initialMonth]="initialMonth()" [disabled]="blocked()" [readonly]="readonly()" />
  <button uiAction (click)="calendarOpen.set(false)">{{'uiFoundation.datePicker.cancelDateSelection' | uiStableMessage}}</button>
 </dialog>`,styles:temporalStyles})
export class DatePicker extends TemporalControl{
 protected readonly kind='date';readonly disabledDates=input<readonly string[]>([]);readonly dateDisabled=input<((date:string)=>boolean)|null>(null);readonly weekStartsOn=input(0);readonly initialMonth=input<string|null>(null);readonly format=input<'locale'|'iso'>('locale');
 readonly inputFormat=input<DateInputFormat>();protected readonly effectiveInputFormat=computed(()=>this.inputFormat()??this.uiLocaleDefaults().dateInputFormat);protected readonly activeInputFormat=signal<DateInputFormat>(this.effectiveInputFormat());protected readonly editorValue=linkedSignal(()=>formatCivilInput(this.current(),this.activeInputFormat()));
 private readonly calendar=viewChild(Calendar);
 protected readonly calendarOpen=signal(false);protected readonly formatted=computed(()=>this.current()?this.format()==='iso'?this.current():civilLabel(this.current()!,this.effectiveLocale(),this.uiLocaleDefaults().civilDateOptions):'');
 constructor(){super();effect(()=>{this.disabledDates();this.dateDisabled();this.notifyValidation();});effect(()=>{const format=this.effectiveInputFormat(),invalid=this.invalidDraft();if(invalid)return;untracked(()=>{this.activeInputFormat.set(format);this.editorValue.set(formatCivilInput(this.current(),format));});});afterRenderEffect(()=>{const format=this.activeInputFormat();if(this.invalidDraft())return;untracked(()=>this.writeEditor(formatCivilInput(this.current(),format)));});effect(()=>{if(this.blocked()||this.readonly())this.calendarOpen.set(false);});afterRenderEffect(()=>{if(this.calendarOpen()){const calendar=this.calendar();untracked(()=>calendar?.focusDate());}});}
 protected dateChanged(event:Event):void{if(this.activeInputFormat()==='native'){this.changed(event);return;}if(this.blocked()||this.readonly())return;const value=this.text(event),parsed=parseCivilInput(value,this.activeInputFormat());this.editorValue.set(value);this.draftInvalid(!!value&&!parsed);if(!value||parsed)this.commit(parsed);}
 override writeValue(value:unknown):void{this.activeInputFormat.set(this.effectiveInputFormat());super.writeValue(value);const formatted=formatCivilInput(this.current(),this.activeInputFormat());this.editorValue.set(formatted);this.writeEditor(formatted);}
 protected override clear():void{if(this.blocked()||this.readonly())return;this.activeInputFormat.set(this.effectiveInputFormat());super.clear();this.editorValue.set('');}
 protected override validateExtra(value:string):ValidationErrors|null{return this.disabledDates().includes(value)||this.dateDisabled()?.(value)?{disabledDate:true}:null;}
 protected choose(date:string|null):void{if(date){this.draftInvalid(false);this.commit(date);this.activeInputFormat.set(this.effectiveInputFormat());const value=formatCivilInput(date,this.activeInputFormat());this.editorValue.set(value);this.writeEditor(value);this.touch();this.calendarOpen.set(false);}}
}
const nativeTemplate=`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()"><div class="ui-date-controls">
 <input #editor uiFieldControl [type]="nativeType" [value]="current()??''" [name]="name()" [attr.min]="min()" [attr.max]="max()" [attr.step]="inputStep()" [disabled]="blocked()" [readOnly]="readonly()" (input)="changed($event)" (blur)="touch()">
 @if(clearable()){<button uiAction [disabled]="blocked()||readonly()||current()===null&&!invalidDraft()" [attr.aria-label]="messageText('uiFoundation.dateInput.clearLabel', {label: label()})" (click)="clear()">{{'uiFoundation.dateInput.clearForDateInput' | uiStableMessage}}</button>}</div>@if(display()){<p class="ui-date-format">{{display()}}</p>}</ui-form-field>`;
@Component({selector:'ui-time-picker',standalone:true,imports:[FormField,FieldControl,ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TimePicker),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>TimePicker),multi:true}],template:nativeTemplate,styles:temporalStyles})
export class TimePicker extends TemporalControl{
 protected readonly kind='time';protected readonly nativeType='time';readonly seconds=input(false,{transform:booleanAttribute});readonly stepSeconds=input(60);readonly hourFormat=input<12|24>(24);readonly timeAllowed=input<((time:string)=>boolean)|null>(null);
 protected inputStep():number{return this.seconds()?this.stepSeconds():Math.max(60,this.stepSeconds());}
 constructor(){super();effect(()=>{this.seconds();this.stepSeconds();this.timeAllowed();this.notifyValidation();});}
 protected display():string{const value=this.current(),seconds=value?timeSeconds(value):null;if(seconds===null)return '';const date=new Date(seconds*1000);return new Intl.DateTimeFormat(this.effectiveLocale(),{timeZone:'UTC',hour:'numeric',minute:'2-digit',...(this.seconds()?{second:'2-digit'}:{}),hour12:this.hourFormat()===12}).format(date);}
 protected override validateExtra(value:string):ValidationErrors|null{const seconds=timeSeconds(value)!;const step=this.inputStep();if(!Number.isInteger(step)||step<=0)return {timeStepConfig:true};if((seconds-(this.min()?timeSeconds(this.min()!)??0:0))%step!==0)return {timeStep:true};return this.timeAllowed()&&!this.timeAllowed()!(value)?{disabledTime:true}:null;}
}
@Component({selector:'ui-date-time-picker',standalone:true,imports:[FormField,FieldControl,ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>DateTimePicker),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>DateTimePicker),multi:true}],template:nativeTemplate,styles:temporalStyles})
export class DateTimePicker extends TemporalControl{
 private readonly uiRuntimeText_DateTimePicker=injectUiRuntimeText();

 protected readonly kind='datetime-local';protected readonly nativeType='datetime-local';readonly timeZone=input<string>();protected readonly effectiveTimeZone=computed(()=>this.timeZone()??this.uiLocaleDefaults().timeZone);readonly stepSeconds=input(60);
 protected inputStep():number{return this.stepSeconds();}
 constructor(){super();effect(()=>{this.effectiveTimeZone();this.stepSeconds();this.notifyValidation();});}
 protected display():string{
  const zone = this.effectiveTimeZone() ?? this.uiRuntimeText_DateTimePicker("uiFoundation.dateTimePicker.timeZoneNotSet");
  const value = this.current();
  return value ? this.uiRuntimeText_DateTimePicker('uiFoundation.dateTimePicker.valueWithZone', { zone, value })
    : this.uiRuntimeText_DateTimePicker('uiFoundation.dateTimePicker.localTimeWithZone', { zone });
 }
 protected override validateExtra(value:string):ValidationErrors|null{if(this.effectiveTimeZone()===null)return {timeZoneRequired:true};try{new Intl.DateTimeFormat(this.effectiveLocale(),{timeZone:this.effectiveTimeZone()??undefined});}catch{return {timeZone:true};}const step=this.stepSeconds();if(!Number.isInteger(step)||step<=0)return {timeStepConfig:true};const seconds=localDateTimeSeconds(value)!;const base=this.min()?localDateTimeSeconds(this.min()!)??0:0;return (seconds-base)%step!==0?{timeStep:true}:null;}
}
@Component({selector:'ui-month-picker',standalone:true,imports:[FormField,FieldControl,ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>MonthPicker),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>MonthPicker),multi:true}],template:nativeTemplate,styles:temporalStyles})
export class MonthPicker extends TemporalControl{protected readonly kind='month';protected readonly nativeType='month';protected inputStep():number{return 1;}protected display():string{return this.current()?civilLabel(this.current()!+'-01',this.effectiveLocale(),{year:'numeric',month:'long'}):'';}}
@Component({selector:'ui-year-picker',standalone:true,imports:[FormField,FieldControl,ActionControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>YearPicker),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>YearPicker),multi:true}],template:nativeTemplate,styles:temporalStyles})
export class YearPicker extends TemporalControl{
 private readonly uiRuntimeText_YearPicker=injectUiRuntimeText();
protected readonly kind='year';protected readonly nativeType='number';protected inputStep():number{return 1;}protected display():string{const year = this.current(); return year ? this.uiRuntimeText_YearPicker('uiFoundation.yearPicker.formattedYear', { year: Number(year) }) : '';}}
