import {Component,computed,signal,viewChild} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {ReactiveFormsModule,FormControl} from '@angular/forms';
import {Chart} from '../.ui/generated/angular/chart';
import {Spreadsheet} from '../.ui/generated/angular/spreadsheet';
import {CodeEditor} from '../.ui/generated/angular/code-editor';
import {RichTextEditor} from '../.ui/generated/angular/rich-text-editor';
import {MarkdownEditor,type MarkdownMode} from '../.ui/generated/angular/markdown-editor';
import {DiffViewer,JsonViewer} from '../.ui/generated/angular/diff-json';
import {UiLocaleScope} from '../.ui/generated/angular/locale';
import type {UiLocaleOptions} from '../.ui/generated/angular/locale-model';
import type {ChartKind,ChartSeries,ChartAxis,ChartSelection,SheetModel,SheetEdit} from '../.ui/generated/angular/specialist-model';
import type {CodeLanguage} from '../.ui/generated/angular/editor-model';

@Component({selector:'review-final',standalone:true,imports:[Chart,Spreadsheet,CodeEditor,RichTextEditor,MarkdownEditor,DiffViewer,JsonViewer,UiLocaleScope,ReactiveFormsModule],styles:[`output[hidden]{display:none}output{display:block;max-inline-size:100%;white-space:pre-wrap;overflow-wrap:anywhere}label{max-inline-size:100%;overflow-wrap:anywhere}button,select,input{font:inherit;max-inline-size:100%}h1{font-size:var(--ui-text-heading)}`],template:`
<main class="fixture-main" [attr.data-ui-profile]="profile()" [attr.dir]="direction()">
<h1>独立した公開APIの検証</h1>
<div class="fixture-actions">
 <label>Review profile<select aria-label="Review profile" [value]="profile()" (change)="profile.set(read($event))"><option value="guided">guided</option><option value="dense">dense</option></select></label>
 <label>Review direction<select aria-label="Review direction" [value]="direction()" (change)="direction.set(read($event))"><option value="ltr">LTR</option><option value="rtl">RTL</option></select></label>
 <label>Review locale<select aria-label="Review locale" [value]="locale()" (change)="locale.set(read($event))"><option value="ja-JP">ja-JP</option><option value="de-DE">de-DE</option><option value="ar-EG">ar-EG</option></select></label>
 <label>Review number precision<select aria-label="Review number precision" [value]="precision()" (change)="precision.set(read($event))"><option value="9">9</option><option value="2">2</option></select></label>
 <label>Review section<select aria-label="Review section" [value]="section()" (change)="section.set(read($event))"><option value="chart">Chart</option><option value="editors">Editors</option><option value="sheet">Spreadsheet</option><option value="viewers">Viewers</option></select></label>
<button type="button" (click)="localizedStatus.set(true)">Review activate status dictionary</button><button type="button" (click)="alternateMessages.set(!alternateMessages())">Review change live dictionary</button>
</div>
<div id="locale-scope" [uiLocale]="localeOptions()">
@if(section()==='chart'){
 <section id="review-chart"><h2>Chart</h2>
 <div class="fixture-actions">
  <label>Review chart kind<select aria-label="Review chart kind" [value]="kind()" (change)="setKind($event)">@for(value of kinds;track value){<option [value]="value">{{value}}</option>}</select></label>
  <label>Review chart data<select aria-label="Review chart data" [value]="dataMode()" (change)="dataMode.set(read($event))"><option value="ordinary">ordinary</option><option value="precision">precision</option><option value="duplicates">duplicates</option><option value="edge">edge</option><option value="empty">empty</option></select></label>
  <label>Review invalid axis<input aria-label="Review invalid axis" type="checkbox" [checked]="invalidAxis()" (change)="invalidAxis.set(checked($event))"></label>
  <label>Review chart disabled<input aria-label="Review chart disabled" type="checkbox" [checked]="disabled()" (change)="disabled.set(checked($event))"></label>
  <label>Review chart busy<input aria-label="Review chart busy" type="checkbox" [checked]="busy()" (change)="busy.set(checked($event))"></label>
  <button type="button" (click)="inspect()">Review inspect public ECharts</button>
 </div>
 <ui-chart label="Independent chart" [kind]="kind()" [series]="series()" [xAxis]="xAxis()" [yAxis]="yAxis()" [selected]="selected()" [hiddenSeries]="hiddenSeries()" [disabled]="disabled()" [busy]="busy()" (selectionChange)="selected.set($event);selections.update(increment)" (hiddenSeriesChange)="hiddenSeries.set($event)"/>
 <output id="chart-source">{{source()}}</output><output id="chart-selection">{{selectionText()}}</output><output id="chart-selections">{{selections()}}</output><output id="chart-option" hidden>{{option()}}</output><output id="chart-option-revision" hidden>{{optionRevision()}}</output>
 </section>
}
@if(section()==='editors'){
 <section id="review-editors"><h2>Editors</h2>
 <button type="button" (click)="mounted.set(!mounted())">Review remount editors</button>
 <label>Review code language<select aria-label="Review code language" [value]="language()" (change)="setLanguage($event)"><option value="javascript">javascript</option><option value="typescript">typescript</option><option value="text">text</option></select></label>
 <label>Review code readonly<input aria-label="Review code readonly" type="checkbox" [checked]="readonlyCode()" (change)="readonlyCode.set(checked($event))"></label>
 <button type="button" (click)="code.disabled?code.enable():code.disable()">Review form disable code</button>
 @if(mounted()){
  <div id="rich"><ui-rich-text-editor label="Independent document" [formControl]="rich"/></div>
  <div id="markdown"><ui-markdown-editor label="Independent Markdown" [formControl]="markdown" [mode]="markdownMode()" (modeChange)="markdownMode.set($event)"/></div>
  <div id="code"><ui-code-editor label="Independent code" [formControl]="code" [language]="language()" [readonly]="readonlyCode()" [completions]="[{label:'reviewCompletion',type:'variable'}]"/></div>
 }
 <output id="code-value">{{code.value}}</output><output id="rich-value">{{rich.value}}</output>
 </section>
}
@if(section()==='sheet'){
 <section id="review-sheet"><h2>Spreadsheet</h2>
 <label>Review worker failure<input aria-label="Review worker failure" type="checkbox" [checked]="workerFailure()" (change)="workerFailure.set(checked($event))"></label>
 <label>Review custom worker<input aria-label="Review custom worker" type="checkbox" [checked]="customWorker()" (change)="customWorker.set(checked($event))"></label>
 <button type="button" (click)="alternateMessages.set(!alternateMessages())">Review change failure dictionary</button>
 <ui-spreadsheet [sheet]="sheet()" [workerUrl]="workerFailure()?'/direct-consumer/missing-worker.js':customWorker()?'/direct-consumer/assets/application-error.worker.js':'/direct-consumer/assets/sheet-formula.worker.js'" [frozenRows]="1" [frozenColumns]="1" (cellEditRequested)="edit($event)" (importRequested)="sheet.set($event)" (exportRequested)="exported.set($event.text);exportRevision.update(increment)"/>
 <output id="sheet-source">{{sheetSource()}}</output><output id="sheet-export">{{exported()}}</output><output id="sheet-export-revision">{{exportRevision()}}</output><output id="sheet-raw-error">{{sheetWidget()?.calculationError()??''}}</output>
 </section>
}
@if(section()==='viewers'){
 <section id="review-viewers"><h2>Viewers</h2><div id="diff"><ui-diff-viewer label="Independent difference" [before]="diffBefore" [after]="diffAfter" [writer]="diffWriter"/></div><div id="json"><ui-json-viewer label="Independent JSON" [source]="jsonSource"/></div>
 <button type="button" (click)="assignAppCopyStatus()">Review assign app-owned copy status</button><output id="diff-writes">{{diffWrites()}}</output><output id="diff-before">{{diffBefore}}</output><output id="diff-after">{{diffAfter}}</output><output id="json-source">{{jsonSource}}</output><output id="json-raw-error">{{jsonWidget()?.model()?.error??''}}</output>
 </section>
}
</div></main>`})
export class FinalRuntime {
 readonly profile=signal('guided');readonly direction=signal('ltr');readonly locale=signal('ja-JP');readonly precision=signal('9');readonly section=signal('chart');
 readonly alternateMessages=signal(false);readonly localizedStatus=signal(false);
 readonly localeOptions=computed<UiLocaleOptions>(()=>({locale:this.locale(),timeZone:'Asia/Tokyo',numberOptions:{minimumFractionDigits:this.precision()==='2'?2:0,maximumFractionDigits:Number(this.precision())},messages:{'の書式':' formatting','Markdownの表示':'Markdown modes','太字':'Bold','編集':'Edit','凡例':'Legend','数式を計算しています。':'Calculating formulas','計算済み':'Formula calculated','数式の計算を開始できませんでした。セルの原文は保持されています。再計算してください。':this.alternateMessages()?'Alternate formula failure. Source retained.':'Formula could not start. Source preserved. Retry calculation.','Application says approval is pending.':'This app error must remain original.',...(this.localizedStatus()?{'文書形式またはURLを確認してください。元の内容は保持されています。':this.alternateMessages()?'Alternate document failure. Original retained.':'Document failure. Original retained.','コピーしました':this.alternateMessages()?'Alternate copied message.':'Copied original text.',' 変更前':' Before',' 変更後':' After','{code} at {offset}':'Parser {code} at offset {offset}.','first\nbefore\nfinal':'THIS RAW DOC MUST NEVER CHANGE'}:{})}}));
 readonly kinds:readonly ChartKind[]=['line','bar','area','scatter','heatmap','gauge'];readonly kind=signal<ChartKind>('line');readonly dataMode=signal('ordinary');readonly invalidAxis=signal(false);readonly disabled=signal(false);readonly busy=signal(false);readonly hiddenSeries=signal<readonly string[]>([]);readonly selected=signal<ChartSelection|null>(null);readonly selections=signal(0);readonly option=signal('');readonly optionRevision=signal(0);
 readonly series=computed<readonly ChartSeries[]>(()=>{const numbers:readonly(number|null)[]=this.dataMode()==='empty'?[]:this.dataMode()==='edge'?[0,9999999999999.875,null]:this.dataMode()==='precision'?[2.123456789,5.987654321,9.555555555]:[2,5,9];const points=numbers.map((value,index)=>({id:['one','two','three'][index],label:this.dataMode()==='edge'&&index===0?'Full original point label must remain available through the typed data table even when gauge SVG title is truncated':'Cell'+index,value,x:index,y:index}));return[{id:'series',label:'Heat cells',points},...(this.dataMode()==='duplicates'?[{id:'second-series',label:'Second series',points:[{id:'one',label:'Other cell',value:7,x:3,y:3}]}]:[])];});
 readonly xAxis=computed<ChartAxis>(()=>({label:'横座標',type:this.kind()==='scatter'?'value':'category'}));
 readonly yAxis=computed<ChartAxis>(()=>({label:'縦座標',type:this.kind()==='heatmap'&&!this.invalidAxis()?'category':'value',...(this.kind()==='gauge'?{min:0,max:100}:{})}));
 readonly source=computed(()=>JSON.stringify(this.series()));readonly selectionText=computed(()=>{const selected=this.selected();return selected?selected.seriesId+'/'+selected.pointId:'none';});
 readonly mounted=signal(true);readonly language=signal<CodeLanguage>('javascript');readonly readonlyCode=signal(false);readonly code=new FormControl('const initial = 3;',{nonNullable:true});readonly rich=new FormControl(JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Safe document'}]}]}),{nonNullable:true});readonly markdown=new FormControl('# Safe preview\n\nA **strong** word.',{nonNullable:true});readonly markdownMode=signal<MarkdownMode>('split');
 readonly sheet=signal<SheetModel>({rows:[[2,3,'=SUM(A1:B1)'],['001',5,'=C1*2']]});readonly workerFailure=signal(false);readonly customWorker=signal(false);readonly sheetWidget=viewChild(Spreadsheet);readonly exported=signal('');readonly exportRevision=signal(0);readonly sheetSource=computed(()=>JSON.stringify(this.sheet()));readonly increment=(value:number)=>value+1;
 readonly diffBefore='first\nbefore\nfinal';readonly diffAfter='first\nafter\nfinal';readonly jsonSource='{"incomplete": }';readonly diffWrites=signal(0);readonly diffWidget=viewChild(DiffViewer);readonly jsonWidget=viewChild(JsonViewer);readonly diffWriter=async(value:string):Promise<void>=>{this.diffWrites.update(this.increment);await navigator.clipboard.writeText(value);};assignAppCopyStatus():void{this.diffWidget()?.copyStatus.set('コピーしました');}
 read(event:Event):string{return(event.target as HTMLInputElement).value;}checked(event:Event):boolean{return(event.target as HTMLInputElement).checked;}setKind(event:Event):void{this.kind.set(this.read(event) as ChartKind);this.option.set('');this.hiddenSeries.set([]);}setLanguage(event:Event):void{this.language.set(this.read(event) as CodeLanguage);}
 async inspect():Promise<void>{this.option.set('');const engine=await import('echarts/core');const surface=document.querySelector<HTMLElement>('#review-chart .ui-specialist-surface');this.option.set(surface?JSON.stringify(engine.getInstanceByDom(surface)?.getOption()??{}):'{}');this.optionRevision.update(this.increment);}
 edit(request:SheetEdit):void{this.sheet.update(sheet=>({rows:sheet.rows.map((row,r)=>r===request.address.row?row.map((value,c)=>c===request.address.column?request.value:value):row)}));}
}
bootstrapApplication(FinalRuntime).catch(error=>console.error(error));
