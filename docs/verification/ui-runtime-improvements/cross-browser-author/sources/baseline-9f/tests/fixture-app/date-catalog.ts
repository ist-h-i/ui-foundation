import {ChangeDetectionStrategy,Component,signal} from '@angular/core';
import {ReactiveFormsModule,FormControl,FormGroup} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {ActionControl,Calendar,CalendarDay,DatePicker,DateRangePicker,TimePicker,DateTimePicker,MonthPicker,YearPicker,FormLayout,type DateRange,type DateInputFormat} from '../../.ui/generated/angular/index';
@Component({selector:'date-catalog',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[ReactiveFormsModule,ActionControl,Calendar,CalendarDay,DatePicker,DateRangePicker,TimePicker,DateTimePicker,MonthPicker,YearPicker,FormLayout],
 template:`<section aria-label="日付部品の検証"><h2>日付と期間を選ぶ</h2>
  <label for="date-format">日付の入力書式</label><select id="date-format" class="ui-field-control" [value]="inputFormat()" (change)="changeFormat($event)"><option value="native">ブラウザ標準</option><option value="yyyy/MM/dd">yyyy/MM/dd</option><option value="dd/MM/yyyy">dd/MM/yyyy</option><option value="MM/dd/yyyy">MM/dd/yyyy</option></select>
  <label><input type="checkbox" [checked]="monday()" (change)="monday.set(checked($event))">月曜から表示</label>
  <label><input type="checkbox" [checked]="marchInitial()" (change)="marchInitial.set(checked($event))">日付の初期表示を3月にする</label>
  <label><input type="checkbox" [checked]="offsetStep()" (change)="offsetStep.set(checked($event))">日時を9:10起点の15分間隔にする</label>
  <button uiAction (click)="disable()">{{form.disabled?'日付入力を有効にする':'日付入力を無効にする'}}</button><button uiAction (click)="reset()">日付を初期化</button>
  <form [formGroup]="form" uiFormLayout [columns]="2" novalidate>
   <ui-date-picker controlId="event-date" label="予定日" formControlName="date" [required]="true" min="2026-01-01" max="2026-12-31" [disabledDates]="['2026-10-03']" [weekStartsOn]="monday()?1:0" [initialMonth]="marchInitial()?'2026-03':'2026-10'" [inputFormat]="inputFormat()" [error]="error('date')" hint="10月3日は選択できません。" />
   <ui-time-picker controlId="event-time" label="開始時刻" formControlName="time" min="09:00" max="18:00" [stepSeconds]="900" [hourFormat]="12" [error]="error('time')" />
   <ui-date-time-picker controlId="event-datetime" label="現地日時" formControlName="datetime" timeZone="Asia/Tokyo" [min]="offsetStep()?'2026-10-05T09:10':'2026-01-01T00:00'" [stepSeconds]="offsetStep()?900:60" max="2026-12-31T23:59" [error]="error('datetime')" hint="この値は現地日時です。Instantへの変換は利用アプリが行います。" />
   <ui-month-picker controlId="event-month" label="対象月" formControlName="month" min="2026-01" max="2026-12" [error]="error('month')" />
   <ui-year-picker controlId="event-year" label="対象年" formControlName="year" min="2020" max="2030" [error]="error('year')" />
   <ui-calendar controlId="inline-calendar" label="予定カレンダー" [dayDescription]="dayDescription" formControlName="calendar" today="2026-10-05" [weekStartsOn]="monday()?1:0" min="2026-01-01" max="2026-12-31" [disabledDates]="['2026-10-03']" [view]="yearView()?'year':'month'">
    <ng-template uiCalendarDay let-date let-day="day"><span>{{day}}</span>@if(date==='2026-10-05'){<small>予定</small>}</ng-template>
   </ui-calendar>
   <ui-date-range-picker controlId="event-range" label="対象期間" formControlName="range" [maxDays]="7" min="2026-01-01" max="2026-12-31" [disabledDates]="['2026-10-03']" [months]="2" [initialMonth]="'2026-10'" [weekStartsOn]="monday()?1:0" [inputFormat]="inputFormat()" [error]="error('range')" [presets]="presets" />
  </form>
  <button uiAction (click)="yearView.set(!yearView())">年の月一覧を切替</button>
  <label><input type="checkbox" [checked]="showDefaults()" (change)="showDefaults.set(checked($event))">端末日付の既定値を表示</label>
  @if(showDefaults()){
   <section aria-label="端末日付の既定値"><ui-calendar data-testid="local-calendar" controlId="local-calendar" label="端末カレンダー" [formControl]="defaultDate" />
    <ui-date-range-picker data-testid="local-range" controlId="local-range" label="端末の期間" [formControl]="defaultRange" />
    <p data-testid="local-date">{{defaultDate.value}}</p>
   </section>
  }
  <pre data-testid="date-values">{{snapshot().value}}</pre><p data-testid="date-status">日付: {{snapshot().valid?'有効':'要確認'}}</p>
 </section>`,styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}form{margin-block:var(--ui-space-section);}h2{font-size:var(--ui-text-heading);}pre{white-space:pre-wrap;overflow-wrap:anywhere;}small{display:block;font-size:var(--ui-text-small);}`})
export class DateCatalog{
 readonly form=new FormGroup({date:new FormControl<string|null>('2026-10-05'),time:new FormControl<string|null>('09:00'),datetime:new FormControl<string|null>(null),month:new FormControl<string|null>('2026-10'),year:new FormControl<string|null>('2026'),calendar:new FormControl<string|null>('2026-10-05'),range:new FormControl<DateRange>({start:null,end:null},{nonNullable:true})});
 readonly snapshot=toSignal(this.form.events.pipe(map(()=>this.read())),{initialValue:this.read()});readonly inputFormat=signal<DateInputFormat>('native');readonly monday=signal(false);readonly yearView=signal(false);readonly offsetStep=signal(false);readonly marchInitial=signal(false);
 readonly showDefaults=signal(false);readonly defaultDate=new FormControl<string|null>(null);readonly defaultRange=new FormControl<DateRange>({start:null,end:null},{nonNullable:true});
 readonly dayDescription=(date:string)=>date==='2026-10-05'?'予定あり':'';
 readonly presets=[{label:'翌週の平日',range:{start:'2026-10-05',end:'2026-10-09'}},{label:'選択不可日を含む期間',range:{start:'2026-10-01',end:'2026-10-05'}}];
 private read(){return {value:JSON.stringify(this.form.getRawValue()),valid:this.form.valid};}
 error(name:keyof DateCatalog['form']['controls']):string|null{this.snapshot();const control=this.form.controls[name];return control.invalid&&control.touched?'選択できる範囲と入力内容を確認してください。':null;}
 checked(event:Event):boolean{return (event.target as HTMLInputElement).checked;}
 changeFormat(event:Event):void{const value=(event.target as HTMLSelectElement).value;if(value==='native'||value==='yyyy/MM/dd'||value==='dd/MM/yyyy'||value==='MM/dd/yyyy')this.inputFormat.set(value);}
 disable():void{if(this.form.disabled)this.form.enable();else this.form.disable();}
 reset():void{this.form.reset({date:'2026-10-05',time:'09:00',datetime:null,month:'2026-10',year:'2026',calendar:'2026-10-05',range:{start:null,end:null}});}
}
