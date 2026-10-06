import type {EChartsOption,SeriesOption} from 'echarts';
import {type ChartKind,type ChartSeries,type ChartAxis,type ChartSelection,type ChartPoint} from './specialist-model';
import type {SpecialistTheme} from './specialist-browser';
export interface ChartPresentation {readonly locale:string;readonly timeZone:string|null;readonly numberOptions:Intl.NumberFormatOptions;readonly dateTimeOptions:Intl.DateTimeFormatOptions;}
/** Dimensions of the public plot surface; inherited line height comes from leading.body. */
export interface ChartGeometry {readonly width:number;readonly lineHeight:number;readonly measureText?:(label:string)=>number;readonly textHeight?:number;}
export interface GaugeLayout {readonly columns:number;readonly rows:number;readonly radius:number;readonly labelWidth:number;readonly lineHeight:number;readonly detailHeight:number;readonly titleOffset:number;readonly detailOffset:number;readonly height:number;center(index:number):[number,number];}
/** Pixel coordinates keep the dial and both text rows separate when text grows or columns collapse. */
function gaugeScaleGeometry(labels:readonly string[],theme:SpecialistTheme,geometry?:ChartGeometry):{radius:number;padding:number;labelDistance:number} {
 const measure=geometry?.measureText??((label:string)=>[...label].length*theme.fontSize),height=geometry?.textHeight??theme.fontSize*1.25;
 // Radial labels have centered bounds. Ten intervals span 270 degrees; adjacent labels need their diagonal plus a semantic gap.
 const diagonal=Math.max(...labels.map(label=>Math.hypot(measure(label),height)));
 const labelDistance=theme.gap*2+diagonal/2;
 // The last minor tick is painted after its label. Reserve half of the rotated label bounds plus a semantic gap inside every stroke.
 return {radius:theme.gap*2+labelDistance+(diagonal+theme.gap)/(2*Math.sin(3*Math.PI/40)),padding:theme.gap+Math.max(0,diagonal/2-theme.gap*3),labelDistance};
}
export function gaugeScaleLabels(min=0,max=100,format:(value:number)=>string=String):readonly string[]{return Array.from({length:11},(_,index)=>format(min+(max-min)*index/10));}
export function gaugeLayout(count:number,theme:SpecialistTheme,geometry?:ChartGeometry,valueCharacters=0,scaleLabels:readonly string[]=gaugeScaleLabels()):GaugeLayout {
 const scale=gaugeScaleGeometry(scaleLabels,theme,geometry),minimumWidth=Math.max(theme.fontSize*10+theme.gap*2,(scale.radius+scale.padding)*2),width=Math.max((scale.radius+scale.padding)*2,geometry?.width&&geometry.width>0?geometry.width:minimumWidth);
 const columns=Math.max(1,Math.min(Math.max(count,1),Math.floor(width/minimumWidth))),rows=Math.max(1,Math.ceil(count/columns));
 const cellWidth=width/columns,labelWidth=Math.max(theme.fontSize,cellWidth-theme.gap*2),radius=Math.max(0,Math.min(cellWidth/2-scale.padding,Math.max(theme.fontSize*6,scale.radius)));
 const lineHeight=geometry?.lineHeight&&geometry.lineHeight>0?geometry.lineHeight:theme.fontSize*2;
 const detailHeight=lineHeight*Math.max(1,Math.ceil(valueCharacters*theme.fontSize/labelWidth));
 const titleOffset=radius+scale.padding+lineHeight/2,detailOffset=titleOffset+lineHeight/2+theme.gap+detailHeight/2;
 const cellHeight=scale.padding+radius+detailOffset+detailHeight/2+scale.padding;
 return {columns,rows,radius,labelWidth,lineHeight,detailHeight,titleOffset,detailOffset,height:count?rows*cellHeight:0,center:index=>[(index%columns+.5)*cellWidth,Math.floor(index/columns)*cellHeight+scale.padding+radius]};
}
export interface ChartPlotLayout {readonly width:number;readonly height:number;}
/** Reserve real text space; category labels remain complete in a locally scrollable plot. */
export function chartPlotLayout(kind:ChartKind,series:readonly ChartSeries[],x:ChartAxis,y:ChartAxis,legend:boolean,compact:boolean,theme:SpecialistTheme,geometry:ChartGeometry,presentation:ChartPresentation):ChartPlotLayout {
 const number=new Intl.NumberFormat(presentation.locale,presentation.numberOptions);
 if(kind==='gauge'){const min=y.min??0,max=y.max??100,scale=gaugeScaleGeometry(gaugeScaleLabels(min,max,value=>number.format(value)),theme,geometry);return {width:Math.max(geometry.width,(scale.radius+scale.padding)*2),height:0};}
 if(compact||!['line','bar','area','scatter','heatmap'].includes(kind))return {width:geometry.width,height:0};
 const format=(value:number,axis:ChartAxis)=>axis.type==='time'?new Intl.DateTimeFormat(presentation.locale,{...presentation.dateTimeOptions,timeZone:presentation.timeZone!}).format(value):number.format(value);
 const width=(label:string)=>[...label].length*theme.fontSize,longest=(labels:readonly string[])=>Math.max(theme.fontSize,...labels.map(width));
 const points=series.flatMap(item=>item.points),coordinates=(axis:'x'|'y')=>[...new Set(points.map(point=>String(point[axis])))];
 const xLabels=x.type==='category'?(kind==='heatmap'?coordinates('x'):[...new Set(points.map(point=>point.label))]):points.map((point,index)=>format(point.x??index,x));
 const yLabels=y.type==='category'?coordinates('y'):[...points.filter(point=>point.value!==null).map(point=>format(kind==='scatter'?(point.y??point.value!):point.value!,y)),...([y.min,y.max,0].filter((value):value is number=>value!==undefined).map(value=>format(value,y)))];
 const lineHeight=geometry.lineHeight>0?geometry.lineHeight:theme.fontSize*2;
 const xSpace=x.type==='category'?xLabels.reduce((total,label)=>total+width(label)+theme.gap,theme.gap):longest(xLabels)*4;
 const visualSpace=kind==='heatmap'?longest(points.map(point=>number.format(point.value??0)))+theme.gap*3:0;
 return {width:Math.max(geometry.width,Math.max(xSpace,width(x.label))+longest(yLabels)+theme.fontSize+lineHeight+theme.gap*6+visualSpace),height:Math.max(width(y.label),lineHeight*(y.type==='category'?Math.max(1,yLabels.length):8))+lineHeight*2+theme.gap*4+(legend?lineHeight+theme.gap*3:0)};
}
export function chartOptions(kind:ChartKind,series:readonly ChartSeries[],x:ChartAxis,y:ChartAxis,legend:boolean,selected:ChartSelection|null,theme:SpecialistTheme,compact=false,hiddenSeries:readonly string[]=[],presentation:ChartPresentation={locale:'ja-JP',timeZone:null,numberOptions:{},dateTimeOptions:{dateStyle:'medium',timeStyle:'short'}},geometry?:ChartGeometry):EChartsOption {
 const number=new Intl.NumberFormat(presentation.locale,presentation.numberOptions),numberLabel=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?number.format(value):String(value??''),axisLabel=(axis:ChartAxis)=>axis.type==='value'?numberLabel:axis.type==='time'?(value:unknown)=>{if(typeof value!=='number'||!Number.isFinite(value))return String(value??'');if(presentation.timeZone===null)throw new RangeError('Chart time axis needs an explicit timezone.');return new Intl.DateTimeFormat(presentation.locale,{...presentation.dateTimeOptions,timeZone:presentation.timeZone}).format(value);}:undefined;
  const point=(seriesId:string,p:ChartPoint):Record<string,unknown>=>({id:p.id,name:p.label,value:p.value,applicationSeriesId:seriesId,selected:selected?.seriesId===seriesId&&selected.pointId===p.id,...(p.children?{children:p.children.map(child=>point(seriesId,child))}:{})});
  const labels=[...new Set(series.flatMap(s=>s.points.map(p=>p.label)))],colors=[theme.action,theme.success,theme.danger,theme.muted];
  const graphicLegend=!['pie','doughnut','gauge','treemap'].includes(kind);
  const gauges=series.filter(item=>!hiddenSeries.includes(item.id)).flatMap(item=>item.points.filter(point=>point.value!==null).map(point=>({seriesId:item.id,pointId:point.id})));
  const gaugeValues=series.filter(item=>!hiddenSeries.includes(item.id)).flatMap(item=>item.points.filter(point=>point.value!==null).map(point=>numberLabel(point.value)));
  const scaleLabels=gaugeScaleLabels(y.min??0,y.max??100,numberLabel),scale=gaugeScaleGeometry(scaleLabels,theme,geometry);
  const gauge=gaugeLayout(gauges.length,theme,geometry,Math.max(0,...gaugeValues.map(value=>[...value].length)),scaleLabels);
  const coordinates=(axis:'x'|'y')=>[...new Set(series.flatMap(item=>item.points.map(point=>point[axis]!)))].sort((a,b)=>a-b).map(String);
  const heatX=kind==='heatmap'?coordinates('x'):[],heatY=kind==='heatmap'?coordinates('y'):[];
  const lineHeight=geometry?.lineHeight&&geometry.lineHeight>0?geometry.lineHeight:theme.fontSize*2;
  const axis=(configuration:ChartAxis,data:readonly string[],vertical=false)=>{
    const common={name:configuration.label,nameLocation:'middle' as const,nameRotate:vertical?90:0,nameGap:theme.gap,nameMoveOverlap:true,nameTextStyle:{color:theme.text,fontSize:theme.fontSize,lineHeight},min:configuration.min,max:configuration.max,axisLabel:{color:theme.text,fontSize:theme.fontSize,lineHeight,formatter:axisLabel(configuration)},axisLine:{lineStyle:{color:theme.border}},...(vertical?{splitLine:{lineStyle:{color:theme.border}}}:{})};
    return configuration.type==='category'?{...common,type:'category' as const,data:[...data],axisLabel:{...common.axisLabel,interval:0},...(kind==='heatmap'?{boundaryGap:true}:{})}:{...common,type:configuration.type};
  };
  const axes={xAxis:axis(x,kind==='heatmap'?heatX:labels),yAxis:axis(y,heatY,true)};
  const normalized:unknown[]=series.map<unknown>((s,index)=>{
    const base={id:s.id,name:s.id,selectedMode:'single',animation:!theme.reducedMotion,itemStyle:{color:colors[index%colors.length]},emphasis:{focus:'series'}};
    if(['line','bar','area'].includes(kind))return {...base,type:kind==='bar'?'bar':'line',data:x.type==='category'||compact?labels.map(label=>{const p=s.points.find(p=>p.label===label);return p?point(s.id,p):{name:label,value:null};}):s.points.map((p,index)=>({...point(s.id,p),value:[p.x??index,p.value]})),connectNulls:false,areaStyle:kind==='area'?{}:undefined};
    if(kind==='pie'||kind==='doughnut')return {...base,type:'pie',radius:kind==='doughnut'?[`${Math.min(60,90/Math.max(series.length,1))*.5}%`,`${Math.min(60,90/Math.max(series.length,1))}%`]:`${Math.min(60,90/Math.max(series.length,1))}%`,center:[`${(index+.5)*100/Math.max(series.length,1)}%`,'50%'],label:{color:theme.text},data:s.points.filter(p=>p.value!==null).map(p=>point(s.id,p))};
    if(kind==='scatter'||kind==='heatmap')return {...base,type:kind,data:s.points.filter(p=>p.value!==null).map(p=>({...point(s.id,p),value:kind==='heatmap'?[String(p.x),String(p.y),p.value]:[p.x,p.y,p.value]}))};
    if(kind==='radar')return {...base,type:'radar',data:labels.every(label=>s.points.some(p=>p.label===label&&p.value!==null))?[{name:s.id,value:labels.map(label=>s.points.find(p=>p.label===label)!.value)}]:[],lineStyle:{type:index%2?'dashed':'solid'}};
    if(kind==='gauge')return hiddenSeries.includes(s.id)?[]:s.points.filter(p=>p.value!==null).map(p=>{
      const position=gauges.findIndex(item=>item.seriesId===s.id&&item.pointId===p.id);
      return {...base,id:'ui-gauge-'+JSON.stringify([s.id,p.id]),type:'gauge',min:y.min??0,max:y.max??100,center:gauge.center(position),radius:gauge.radius,splitNumber:10,pointer:{showAbove:false},title:{color:theme.text,fontSize:theme.fontSize,lineHeight:gauge.lineHeight,width:gauge.labelWidth,overflow:'truncate',offsetCenter:[0,gauge.titleOffset]},detail:{color:theme.text,fontSize:theme.fontSize,lineHeight:gauge.lineHeight,width:gauge.labelWidth,height:gauge.detailHeight,overflow:'breakAll',padding:0,formatter:numberLabel,offsetCenter:[0,gauge.detailOffset]},axisLine:{lineStyle:{color:[[1,theme.border]],width:theme.gap}},axisTick:{splitNumber:2,length:theme.gap/2,distance:theme.gap,lineStyle:{color:theme.border}},splitLine:{length:theme.gap,distance:theme.gap,lineStyle:{color:theme.border}},axisLabel:{color:theme.text,fontSize:theme.fontSize,distance:scale.labelDistance,rotate:'radial',formatter:numberLabel,backgroundColor:theme.surface},data:[point(s.id,p)]};
    });
    return {...base,type:'treemap',left:`${index*100/Math.max(series.length,1)}%`,width:`${100/Math.max(series.length,1)}%`,roam:false,breadcrumb:{show:false},leafDepth:undefined,label:{color:theme.onAction},data:s.points.filter(p=>p.value!==null).map(p=>point(s.id,p))};
  }).filter((_item,index)=>graphicLegend||!hiddenSeries.includes(series[index].id)).flatMap(item=>Array.isArray(item)?item:[item]);
  const axisKind=['line','bar','area','scatter','heatmap'].includes(kind);
  return {animation:!theme.reducedMotion,backgroundColor:theme.surface,color:colors,textStyle:{fontFamily:theme.font,fontSize:theme.fontSize,color:theme.text},aria:{enabled:true,decal:{show:true}},tooltip:{show:false},legend:{show:graphicLegend&&legend&&!compact,top:0,textStyle:{color:theme.text,fontSize:theme.fontSize,lineHeight},type:'scroll',data:series.map(item=>item.id),formatter:(id:string)=>series.find(item=>item.id===id)?.label??id,selected:Object.fromEntries(series.map(item=>[item.id,!hiddenSeries.includes(item.id)]))},grid:axisKind?{left:theme.gap,right:kind==='heatmap'&&!compact?Math.max(theme.fontSize,...series.flatMap(item=>item.points.map(point=>[...numberLabel(point.value??0)].length*theme.fontSize)))+theme.gap*3:theme.gap,top:legend&&!compact?lineHeight+theme.gap*3:theme.gap,bottom:theme.gap,outerBoundsMode:compact?'none':'same',outerBoundsContain:'all'}:undefined,...(kind==='heatmap'?{xAxis:{...axes.xAxis,show:!compact},yAxis:{...axes.yAxis,show:!compact}}:axisKind&&!compact?axes:axisKind?{xAxis:{type:'category',show:false,data:labels},yAxis:{type:'value',show:false}}:{}),radar:kind==='radar'?{indicator:labels.map(name=>({name,max:y.max??Math.max(1,...series.flatMap(s=>s.points.map(p=>p.value??0)))})),axisName:{color:theme.text},axisLine:{lineStyle:{color:theme.border}},splitLine:{lineStyle:{color:theme.border}}}:undefined,visualMap:kind==='heatmap'?{right:theme.gap,top:legend?lineHeight+theme.gap*3:theme.gap,itemWidth:theme.gap,itemHeight:theme.fontSize*6,min:Math.min(0,...series.flatMap(s=>s.points.map(p=>p.value??0))),max:Math.max(1,...series.flatMap(s=>s.points.map(p=>p.value??0))),show:!compact,calculable:false,formatter:numberLabel,inRange:{color:[theme.surface,theme.action]},textStyle:{color:theme.text,fontSize:theme.fontSize,lineHeight}}:undefined,series:normalized as SeriesOption[]};
}
