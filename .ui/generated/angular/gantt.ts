import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {civilLabel} from './date-model';
import {computed as localeComputed} from '@angular/core';
import {injectUiLocale,injectUiMessageText,UiStableMessagePipe} from './locale';
import {Component,ChangeDetectionStrategy,DestroyRef,ElementRef,afterNextRender,effect,input,output,signal,computed,viewChild,inject} from '@angular/core';
import type {EChartsType} from 'echarts/core';
import type {CustomSeriesOption,CustomSeriesRenderItemAPI,CustomSeriesRenderItemParams,EChartsOption} from 'echarts';
import {ganttProblem,civilEpoch,type GanttTask,type GanttScale} from './specialist-model';
import {observeSpecialistScope,readSpecialistTheme} from './specialist-browser';
import {specialistStyles} from './specialist-style';
export interface GanttTaskChange {taskId:string;previous:GanttTask;start?:string;end?:string;progress?:number|null;}
@Component({imports:[UiStableMessagePipe],selector:'ui-gantt',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,styles:specialistStyles,template:`
<section [attr.aria-label]="uiEffective_label()"><p>{{uiEffective_label()}}</p><label>{{'uiFoundation.gantt.timeline' | uiStableMessage}} <span class="ui-select-control"><select class="ui-field-control" [attr.aria-label]="'uiFoundation.gantt.timeline' | uiStableMessage" [value]="scale()" [disabled]="disabled()||busy()" (change)="setScale($event)"><option value="day">{{'uiFoundation.gantt.dayScale' | uiStableMessage}}</option><option value="week">{{'uiFoundation.gantt.week' | uiStableMessage}}</option><option value="month">{{'uiFoundation.gantt.month' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label><div class="ui-specialist-plot-scroll" role="region" [attr.aria-label]="uiRuntimeText_Gantt('uiFoundation.gantt.diagramLabel', {label: uiEffective_label()})" tabindex="0" dir="ltr"><div #surface class="ui-specialist-surface" aria-hidden="true" dir="ltr"></div></div>
@if(problem()||renderError()||editError()){<p class="ui-specialist-error" role="alert">{{problem()||renderError()||editError()}}</p>}
<div class="ui-specialist-scroll" role="region" [attr.aria-label]="uiRuntimeText_Gantt('uiFoundation.gantt.taskRegionLabel', {label: uiEffective_label()})" tabindex="0"><table><caption>{{'uiFoundation.gantt.dateRangeDependenciesAndProgress' | uiStableMessage}}</caption><thead><tr><th scope="col">{{'uiFoundation.gantt.task' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.gantt.start' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.gantt.end' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.gantt.dependency' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.gantt.progress' | uiStableMessage}}</th></tr></thead><tbody>@for(task of tasks();track task.id){<tr><th scope="row">{{task.label}}</th><td><input type="date" [attr.aria-label]="uiRuntimeText_Gantt('uiFoundation.gantt.taskStartLabel', {label: task.label})" [value]="task.start" [disabled]="unavailable()" [readOnly]="readonly()" (change)="edit(task,'start',$event)"></td><td><input type="date" [attr.aria-label]="uiRuntimeText_Gantt('uiFoundation.gantt.taskEndLabel', {label: task.label})" [value]="task.end" [disabled]="unavailable()" [readOnly]="readonly()" (change)="edit(task,'end',$event)"></td><td>{{dependencyLabels(task)}}</td><td>@if(task.progress===null){<span>{{'uiFoundation.gantt.unavailable' | uiStableMessage}}</span>}@else{<progress [value]="task.progress" max="100" [attr.aria-label]="uiRuntimeText_Gantt('uiFoundation.gantt.taskProgressLabel', {label: task.label})"></progress>}<input type="number" min="0" max="100" [attr.aria-label]="uiRuntimeText_Gantt('uiFoundation.gantt.editTaskProgressLabel', {label: task.label})" [value]="task.progress??''" [disabled]="unavailable()" [readOnly]="readonly()" (change)="edit(task,'progress',$event)"></td></tr>}</tbody></table></div></section>`})
export class Gantt {

 protected readonly uiRuntimeText_Gantt=injectUiRuntimeText();

 protected readonly uiText_Gantt=injectUiMessageText();readonly civilDateOptions=input<Intl.DateTimeFormatOptions>();protected readonly effectiveCivilDateOptions=computed(()=>this.civilDateOptions()??this.uiLocaleDefaults().civilDateOptions);
 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

 readonly label=input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_Gantt("uiFoundation.gantt.ganttChart"));readonly tasks=input<readonly GanttTask[]>([]);readonly scale=input<GanttScale>('day');readonly readonly=input(false);readonly disabled=input(false);readonly busy=input(false);readonly taskChange=output<GanttTaskChange>();readonly scaleChange=output<GanttScale>();readonly problem=computed(()=>ganttProblem(this.tasks(),this.uiRuntimeText_Gantt));readonly unavailable=computed(()=>this.disabled()||this.busy()||!!this.problem());readonly renderError=uiMessageState<string | null>(null);readonly editError=uiMessageState<string | null>(null);private readonly host=inject<ElementRef<HTMLElement>>(ElementRef);private readonly surface=viewChild.required<ElementRef<HTMLElement>>('surface');private readonly destroyRef=inject(DestroyRef);private chart:EChartsType|null=null;private destroyed=false;private stopScope:(()=>void)|null=null;
 constructor(){effect(()=>{this.tasks();this.scale();this.effectiveLocale();this.effectiveCivilDateOptions();this.paint();});afterNextRender(()=>{void this.mount();});this.destroyRef.onDestroy(()=>{this.destroyed=true;this.stopScope?.();this.chart?.dispose();});}
 private async mount():Promise<void>{try{const engine=await import('./gantt-engine');if(this.destroyed)return;this.chart=engine.init(this.surface().nativeElement,undefined,{renderer:'svg'});this.stopScope=observeSpecialistScope(this.host.nativeElement,()=>this.paint());this.paint();}catch{if(!this.destroyed)this.renderError.setMessage([() => this.uiRuntimeText_Gantt("uiFoundation.gantt.couldNotDrawTheGanttChartReviewTheTaskTable")]);}}
 private paint():void{
  if(!this.chart||this.destroyed)return;
  if(this.problem()){this.chart.clear();return;}
  try{
   const tasks=this.tasks(),theme=readSpecialistTheme(this.host.nativeElement),surface=this.surface().nativeElement,day=86400000;
   const lineHeight=parseFloat(getComputedStyle(surface).lineHeight)||theme.fontSize*2;
   const canvas=surface.ownerDocument.createElement('canvas'),context=canvas.getContext('2d');
   if(context)context.font=`${theme.fontSize}px ${theme.font}`;
   const measure=(label:string)=>context?.measureText(label).width??[...label].length*theme.fontSize;
   // Axis bounds include the exclusive day after 9999-12-31; format that native UTC date without truncating its extended year.
   const axisDateFormat=new Intl.DateTimeFormat(this.effectiveLocale(),{...this.effectiveCivilDateOptions(),timeZone:'UTC'});
   const format=(value:number)=>axisDateFormat.format(new Date(value));
   const min=tasks.length?Math.min(...tasks.map(task=>civilEpoch(task.start))):undefined;
   const max=tasks.length?Math.max(...tasks.map(task=>civilEpoch(task.end)+day)):undefined;
   const dateLabels=tasks.flatMap(task=>[format(civilEpoch(task.start)),format(civilEpoch(task.end))]);
   if(min!==undefined&&max!==undefined){
    dateLabels.push(format(min),format(max));
    // Sample every month and weekday in the boundary years, without iterating a potentially long project period.
    for(const year of new Set([new Date(min).getUTCFullYear(),new Date(max).getUTCFullYear()])){
     if(year<1||year>9999)continue;
     for(let month=1;month<=12;month++)for(let date=1;date<=7;date++){
      const iso=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(date).padStart(2,'0');
      dateLabels.push(civilLabel(iso,this.effectiveLocale(),this.effectiveCivilDateOptions()));
     }
    }
   }
   const dateWidth=Math.max(theme.fontSize,...dateLabels.map(measure));
   const taskWidth=Math.max(theme.fontSize,...tasks.map(task=>measure(task.label)));
   const left=Math.max(taskWidth+theme.gap*2,dateWidth/2+theme.gap),right=dateWidth/2+theme.gap;
   const top=theme.gap,bottom=lineHeight+theme.gap*3,tickSpace=dateWidth+theme.gap*2;
   // Keep complete labels locally reachable. Longer periods use fewer ticks, rather than an unbounded canvas width.
   const plotWidth=Math.max(surface.parentElement!.clientWidth-left-right,tickSpace*3);
   const width=Math.ceil(left+plotWidth+right);
   const rowHeight=Math.max(theme.controlSize,lineHeight+theme.gap);
   surface.style.minInlineSize=width>surface.parentElement!.clientWidth?`${width}px`:'';
   surface.style.minBlockSize=`${Math.ceil(Math.max(theme.controlSize*5,Math.max(1,tasks.length)*rowHeight+top+bottom))}px`;
   const renderBar=(_p:CustomSeriesRenderItemParams,api:CustomSeriesRenderItemAPI)=>{
    const start=api.coord([api.value(0),api.value(2)]),end=api.coord([api.value(1),api.value(2)]),height=theme.controlSize*.6,progress=Number(api.value(3));
    return {type:'group' as const,children:[{type:'rect' as const,shape:{x:start[0],y:start[1]-height/2,width:Math.max(1,end[0]-start[0]),height},style:{fill:theme.background,stroke:theme.border}},{type:'rect' as const,shape:{x:start[0],y:start[1]-height/2,width:progress<0?0:Math.max(1,end[0]-start[0])*progress/100,height},style:{fill:theme.action}}]};
   };
   const dependencyPairs=tasks.flatMap((task,index)=>task.dependencies.map(id=>({source:tasks.findIndex(t=>t.id===id),target:index})));
   const renderEdge=(_p:CustomSeriesRenderItemParams,api:CustomSeriesRenderItemAPI)=>{
    const from=api.coord([api.value(0),api.value(1)]),to=api.coord([api.value(2),api.value(3)]),bend=from[0]+theme.gap;
    return {type:'group' as const,children:[{type:'polyline' as const,shape:{points:[[from[0],from[1]],[bend,from[1]],[bend,to[1]],[to[0],to[1]]]},style:{stroke:theme.muted,lineWidth:theme.borderWidth,fill:'none'}},{type:'polygon' as const,shape:{points:[[to[0],to[1]],[to[0]-theme.gap/2,to[1]-theme.gap/3],[to[0]-theme.gap/2,to[1]+theme.gap/3]]},style:{fill:theme.muted}}]};
   };
   const axisLabel={color:theme.text,fontFamily:theme.font,fontSize:theme.fontSize,lineHeight,margin:theme.gap};
   const option:EChartsOption={
    animation:!theme.reducedMotion,useUTC:true,backgroundColor:theme.surface,textStyle:{fontFamily:theme.font,fontSize:theme.fontSize,color:theme.text},
    grid:{left,right,top,bottom},
    xAxis:{type:'time',min,max,minInterval:day*(this.scale()==='day'?1:this.scale()==='week'?7:28),splitNumber:Math.max(1,Math.floor(plotWidth/tickSpace)),axisLabel:{...axisLabel,formatter:format,hideOverlap:true,showMinLabel:true,showMaxLabel:true},axisTick:{length:theme.gap/2},axisLine:{lineStyle:{color:theme.border}}},
    yAxis:{type:'category',data:tasks.map(task=>task.label),inverse:true,axisLabel:{...axisLabel,interval:0},axisTick:{length:theme.gap/2},axisLine:{lineStyle:{color:theme.border}}},
    series:[{type:'custom',renderItem:renderBar,encode:{x:[0,1],y:2},data:tasks.map((task,index)=>[civilEpoch(task.start),civilEpoch(task.end)+day,index,task.progress??-1,task.label])},{type:'custom',renderItem:renderEdge,data:dependencyPairs.map(pair=>[civilEpoch(tasks[pair.source].end)+day,pair.source,civilEpoch(tasks[pair.target].start),pair.target])}] as CustomSeriesOption[]
   };
   this.chart.resize();this.chart.setOption(option,{notMerge:true});this.renderError.set(null);
  }catch{this.renderError.setMessage([() => this.uiRuntimeText_Gantt("uiFoundation.gantt.couldNotDrawTheGanttChartReviewTheTaskTable")]);}
 }
 dependencyLabels(task:GanttTask):string{return new Intl.ListFormat(this.uiLocaleDefaults().locale).format(task.dependencies.map(id=>this.tasks().find(t=>t.id===id)?.label??id))||this.uiRuntimeText_Gantt("uiFoundation.gantt.none");}
 setScale(event:Event):void{const value=(event.target as HTMLSelectElement).value;if(['day','week','month'].includes(value))this.scaleChange.emit(value as GanttScale);}
 edit(task:GanttTask,field:'start'|'end'|'progress',event:Event):void{if(this.unavailable()||this.readonly())return;const raw=(event.target as HTMLInputElement).value;const value=field==='progress'?(raw===''?null:Number(raw)):raw,candidate=this.tasks().map(current=>current.id===task.id?{...current,[field]:value}:current),problem=ganttProblem(candidate,this.uiRuntimeText_Gantt);if(problem){this.editError.setMessage([() => this.uiRuntimeText_Gantt("uiFoundation.gantt.checkTheDateRangeAndEnterProgressFrom0To100YourInputIsStillAvailable")]);return;}this.editError.set(null);this.taskChange.emit({taskId:task.id,previous:task,[field]:value});}
}
