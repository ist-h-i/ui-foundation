import {Component,computed,signal} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {Chart,UiLocaleScope,TextInput,type UiLocaleOptions,type ChartKind,type ChartSeries,type ChartAxis,type ChartSelection} from './.ui/generated/angular/index';

@Component({selector:'paint-review',standalone:true,imports:[Chart,UiLocaleScope,TextInput,ReactiveFormsModule],styles:[`output{display:block;max-inline-size:100%;white-space:pre-wrap;overflow-wrap:anywhere}label{max-inline-size:100%;overflow-wrap:anywhere}button,select,input{font:inherit;max-inline-size:100%}h1{font-size:var(--ui-text-heading)}`],template:`
<main class="fixture-main" [attr.data-ui-profile]="profile()" [attr.dir]="direction()">
 <h1>SVG paint verification</h1>
 <div class="fixture-actions">
  <label>Review profile<select aria-label="Review profile" [value]="profile()" (change)="profile.set(read($event))"><option value="guided">guided</option><option value="dense">dense</option></select></label>
  <label>Review direction<select aria-label="Review direction" [value]="direction()" (change)="direction.set(read($event))"><option value="ltr">LTR</option><option value="rtl">RTL</option></select></label>
  <label>Review locale<select aria-label="Review locale" [value]="locale()" (change)="locale.set(read($event))"><option value="ja-JP">ja-JP</option><option value="de-DE">de-DE</option><option value="ar-EG">ar-EG</option></select></label>
  <label>Review number precision<select aria-label="Review number precision" [value]="precision()" (change)="precision.set(read($event))"><option value="9">9</option><option value="2">2</option></select></label>
 </div>
 <div [uiLocale]="localeOptions()">
 <section id="review-chart"><h2>Chart</h2>
  <div class="fixture-actions">
   <label>Review chart kind<select aria-label="Review chart kind" [value]="kind()" (change)="kind.set(read($event))">@for(value of kinds;track value){<option [value]="value">{{value}}</option>}</select></label>
   <label>Review chart data<select aria-label="Review chart data" [value]="dataMode()" (change)="dataMode.set(read($event))"><option value="ordinary">ordinary</option><option value="precision">precision</option><option value="edge">edge</option><option value="fractional">fractional</option><option value="empty">empty</option></select></label>
   <label>Review chart disabled<input aria-label="Review chart disabled" type="checkbox" [checked]="disabled()" (change)="disabled.set(checked($event))"></label>
   <label>Review chart busy<input aria-label="Review chart busy" type="checkbox" [checked]="busy()" (change)="busy.set(checked($event))"></label>
  </div>
  <ui-chart label="Independent chart" [kind]="chartKind()" [series]="series()" [xAxis]="xAxis()" [yAxis]="yAxis()" [selected]="selected()" [hiddenSeries]="hiddenSeries()" [disabled]="disabled()" [busy]="busy()" (selectionChange)="selected.set($event);selections.update(increment)" (hiddenSeriesChange)="hiddenSeries.set($event)"/>
  <output id="chart-source">{{source()}}</output><output id="chart-selection">{{selectionText()}}</output><output id="chart-selections">{{selections()}}</output>
 </section>
 <ui-text-input controlId="retained-draft" label="Retained draft" [formControl]="draft"/><output id="draft-value">{{draft.value}}</output>
 </div>
</main>`})
class PaintReview {
 readonly profile=signal('guided');readonly direction=signal('ltr');readonly locale=signal('ja-JP');readonly precision=signal('9');
 readonly localeOptions=computed<UiLocaleOptions>(()=>({locale:this.locale(),timeZone:'Asia/Tokyo',numberOptions:{minimumFractionDigits:this.precision()==='2'?2:0,maximumFractionDigits:Number(this.precision())}}));
 readonly kinds:readonly ChartKind[]=['line','bar','area','scatter','heatmap','gauge'];readonly kind=signal('line');readonly chartKind=computed(()=>this.kind() as ChartKind);readonly dataMode=signal('ordinary');readonly disabled=signal(false);readonly busy=signal(false);readonly hiddenSeries=signal<readonly string[]>([]);readonly selected=signal<ChartSelection|null>(null);readonly selections=signal(0);
 readonly series=computed<readonly ChartSeries[]>(()=>{const numbers:readonly(number|null)[]=this.dataMode()==='empty'?[]:this.dataMode()==='edge'?[0,9999999999999.875,null]:this.dataMode()==='fractional'?[.125,.555,.9875]:this.dataMode()==='precision'?[2.123456789,5.987654321,9.555555555]:[2,5,9];const points=numbers.map((value,index)=>({id:['one','two','three'][index],label:this.dataMode()==='edge'&&index===0?'Full original point label must remain available through the typed data table even when gauge SVG title is truncated':'Cell'+index,value,x:index,y:index}));return[{id:'series',label:'Heat cells',points}];});
 readonly xAxis=computed<ChartAxis>(()=>({label:'横座標',type:this.kind()==='scatter'?'value':'category'}));readonly yAxis=computed<ChartAxis>(()=>({label:'縦座標',type:this.kind()==='heatmap'?'category':'value',...(this.kind()==='gauge'?this.dataMode()==='fractional'?{min:0,max:1}:{min:0,max:100}:{})}));
 readonly source=computed(()=>JSON.stringify(this.series()));readonly selectionText=computed(()=>{const selected=this.selected();return selected?selected.seriesId+'/'+selected.pointId:'none';});readonly increment=(value:number)=>value+1;readonly draft=new FormControl('Original draft',{nonNullable:true});
 read(event:Event):string{return(event.target as HTMLInputElement).value;}checked(event:Event):boolean{return(event.target as HTMLInputElement).checked;}
}
bootstrapApplication(PaintReview).catch(error=>console.error(error));
