import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiDiagnosticText} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import {Component,ChangeDetectionStrategy,DestroyRef,ElementRef,afterNextRender,afterRenderEffect,viewChildren,untracked,input,output,signal,computed,inject,effect} from '@angular/core';
import {diagramProblem,type DiagramModel,type DiagramNode,type DiagramChange,type DiagramEdge} from './specialist-model';
import {diagramConnection,layoutDiagram,placeDiagramLabels,type DiagramLabelBounds} from './diagram-layout';
import {canFocus} from './focus';
import {observeSpecialistScope,readSpecialistTheme} from './specialist-browser';
import {specialistStyles} from './specialist-style';
type DiagramEditField='label'|'x'|'y';
import type {UiStaticMessageId} from './stable-messages';
interface DiagramEditError {readonly id:string;readonly field:DiagramEditField;readonly previous:string|number;readonly message:UiStaticMessageId;}
interface DiagramLabelMetrics {readonly width:number;readonly height:number;readonly offsetX:number;readonly offsetY:number;}
interface DiagramFocusRecovery {readonly kind:'node'|'edge';readonly id:string;readonly index:number;readonly element:HTMLElement;}
let nextDiagramValidationId=0;
@Component({imports:[UiStableMessagePipe],selector:'ui-flow-editor',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,styles:[specialistStyles,`.ui-diagram-canvas{position:relative;background:var(--ui-color-surface)}.ui-diagram-node{position:absolute;max-inline-size:none;overflow-wrap:anywhere;white-space:normal;transform-origin:top left}.ui-diagram-canvas svg{position:absolute;inset:0;inline-size:100%;block-size:100%;pointer-events:none}.ui-diagram-canvas path,.ui-diagram-canvas line{stroke:var(--ui-color-border);stroke-width:var(--ui-border-control);fill:none}.ui-diagram-canvas .ui-diagram-edge[data-selected=true]{stroke:var(--ui-color-text);stroke-width:var(--ui-border-focus)}.ui-diagram-arrow{fill:var(--ui-color-border);stroke:none}.ui-diagram-arrow[data-selected=true]{fill:var(--ui-color-text)}.ui-diagram-caption-surface{fill:var(--ui-color-surface)}.ui-diagram-connections{list-style:none;padding:0;}.ui-diagram-connections>li{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-gap);}.ui-diagram-editors{container-type:inline-size}.ui-diagram-editors input{inline-size:100%;max-inline-size:100%;}.ui-diagram-canvas text{fill:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-small)}`],template:`
<section [attr.aria-label]="uiEffective_label()"><p>{{uiEffective_label()}}</p>@if(problem()||editProblem()||actionError()){<p class="ui-specialist-error" role="alert" [id]="validationId">{{problem()||editProblem()||actionError()}}</p>}<div class="ui-specialist-actions"><button type="button" [disabled]="disabled()||busy()||!!problem()||zoom()>=4" (click)="zoomChange.emit(zoom()+.25)">{{'uiFoundation.flowEditor.zoomIn' | uiStableMessage}}</button><button type="button" [disabled]="disabled()||busy()||!!problem()||zoom()<=.25" (click)="zoomChange.emit(zoom()-.25)">{{'uiFoundation.flowEditor.zoomOut' | uiStableMessage}}</button><button type="button" [disabled]="blocked()" (click)="arrange()">{{'uiFoundation.flowEditor.autoLayout' | uiStableMessage}}</button><output>{{'uiFoundation.flowEditor.zoom' | uiStableMessage}} {{zoom()}}</output></div>
<div class="ui-specialist-scroll" data-diagram-viewport role="region" [attr.aria-label]="('uiFoundation.flowEditor.diagramForLabel' | uiStableMessage:{label:uiEffective_label()})" tabindex="0"><div class="ui-diagram-canvas" [style.inline-size.px]="width()*zoom()" [style.block-size.px]="height()*zoom()"><svg aria-hidden="true" [attr.viewBox]="'0 0 '+width()+' '+height()">@for(edge of displayModel().edges;track edge.id){<path class="ui-diagram-edge" [attr.d]="edgePath(edge)" [attr.data-selected]="selectedEdge()===edge.id"/><polygon class="ui-diagram-arrow" [attr.points]="edgeArrow(edge)" [attr.data-selected]="selectedEdge()===edge.id"/>@if(edge.label){@let caption=labelPosition(edge);@if(caption.guide){<line [attr.x1]="edgeMid(edge).x" [attr.y1]="edgeMid(edge).y" [attr.x2]="caption.guide.x" [attr.y2]="caption.guide.y" [attr.stroke-dasharray]="gapSize()/2"/>}@if(caption.box){<rect class="ui-diagram-caption-surface" [attr.x]="caption.box.x-gapSize()/2" [attr.y]="caption.box.y-gapSize()/2" [attr.width]="caption.box.width+gapSize()" [attr.height]="caption.box.height+gapSize()"/>}<text #diagramLabel text-anchor="middle" [attr.x]="caption.x" [attr.y]="caption.y">{{edge.label}}</text>}}</svg>@for(node of displayModel().nodes;track node.id){<button #diagramNode type="button" class="ui-diagram-node" [style.left.px]="node.x*zoom()" [style.top.px]="node.y*zoom()" [style.inline-size.px]="nodeWidth()" [style.min-block-size.px]="nodeHeight()" [style.transform]="'scale('+zoom()+')'" [attr.aria-pressed]="selected()===node.id" [disabled]="disabled()||busy()" (click)="selectionChange.emit(node.id)" (keydown)="nodeKey($event,node)">{{node.label}}</button>}</div></div>
<div class="ui-specialist-scroll ui-diagram-editors" role="region" [attr.aria-label]="('uiFoundation.flowEditor.editorForLabel' | uiStableMessage:{label:uiEffective_label()})" tabindex="0"><table class="ui-specialist-data-table" style="--ui-specialist-columns:4"><caption>{{'uiFoundation.flowEditor.nodeLabelAndPosition' | uiStableMessage}}</caption><thead><tr><th scope="col">{{'uiFoundation.flowEditor.node' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.flowEditor.horizontalPosition' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.flowEditor.verticalPosition' | uiStableMessage}}</th><th scope="col">{{'uiFoundation.flowEditor.actions' | uiStableMessage}}</th></tr></thead><tbody>@for(node of model().nodes;track node.id){<tr><td><input data-diagram-node-editor required [attr.aria-invalid]="invalidEdit(node,'label')?'true':null" [attr.aria-describedby]="invalidEdit(node,'label')?validationId:null" [attr.aria-label]="('uiFoundation.flowEditor.labelForLabel' | uiStableMessage:{label:node.label})" [value]="node.label" [readOnly]="readonly()" [disabled]="blocked()" (change)="rename(node,$event)"></td><td><input type="number" required min="0" max="1000000" step="any" [attr.aria-invalid]="invalidEdit(node,'x')?'true':null" [attr.aria-describedby]="invalidEdit(node,'x')?validationId:null" [attr.aria-label]="('uiFoundation.flowEditor.horizontalPositionForDiagramForLabel' | uiStableMessage:{label:node.label})" [value]="node.x" [readOnly]="readonly()" [disabled]="blocked()" (change)="position(node,'x',$event)"></td><td><input type="number" required min="0" max="1000000" step="any" [attr.aria-invalid]="invalidEdit(node,'y')?'true':null" [attr.aria-describedby]="invalidEdit(node,'y')?validationId:null" [attr.aria-label]="('uiFoundation.flowEditor.verticalPositionForDiagramForLabel' | uiStableMessage:{label:node.label})" [value]="node.y" [readOnly]="readonly()" [disabled]="blocked()" (change)="position(node,'y',$event)"></td><td><button type="button" [disabled]="blocked()" (click)="removeNode(node,$event)">{{'uiFoundation.flowEditor.removeForLabel' | uiStableMessage:{label:node.label} }}</button></td></tr>}</tbody></table></div>
<div class="ui-specialist-actions"><label>{{'uiFoundation.flowEditor.source' | uiStableMessage}}<span class="ui-select-control"><select class="ui-field-control" data-diagram-from [attr.aria-label]="'uiFoundation.flowEditor.source' | uiStableMessage" [value]="from()" [disabled]="blocked()" (change)="setEndpoint('from',$event)"><option value="">{{'uiFoundation.flowEditor.selection' | uiStableMessage}}</option>@for(node of model().nodes;track node.id){<option [value]="node.id">{{node.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label><label>{{'uiFoundation.flowEditor.destination' | uiStableMessage}}<span class="ui-select-control"><select class="ui-field-control" [attr.aria-label]="'uiFoundation.flowEditor.destination' | uiStableMessage" [value]="to()" [disabled]="blocked()" (change)="setEndpoint('to',$event)"><option value="">{{'uiFoundation.flowEditor.selection' | uiStableMessage}}</option>@for(node of model().nodes;track node.id){<option [value]="node.id">{{node.label}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label><button type="button" [disabled]="blocked()||!from()||!to()" (click)="connect()">{{'uiFoundation.flowEditor.connect' | uiStableMessage}}</button><button data-diagram-add type="button" [disabled]="blocked()" (click)="add()">{{'uiFoundation.flowEditor.addNode' | uiStableMessage}}</button></div><ul class="ui-diagram-connections" [attr.aria-label]="'uiFoundation.flowEditor.connection' | uiStableMessage">@for(edge of model().edges;track edge.id){<li><button data-diagram-edge-control type="button" [disabled]="disabled()||busy()" [attr.aria-pressed]="selectedEdge()===edge.id" (click)="selectedEdge.set(edge.id)">{{nodeLabel(edge.from)}} → {{nodeLabel(edge.to)}} {{edge.label}}</button><button type="button" [disabled]="blocked()" (click)="removeEdge(edge,$event)">{{'uiFoundation.flowEditor.removeConnection' | uiStableMessage}}</button></li>}</ul></section>`})
export class FlowEditor {
 readonly validationId='ui-diagram-validation-'+nextDiagramValidationId++;
 private readonly editErrors=signal<readonly DiagramEditError[]>([]);
 private readonly activeEditErrors=computed(()=>this.editErrors().filter(error=>this.model().nodes.some(node=>node.id===error.id&&node[error.field]===error.previous)));
 readonly editProblem=computed(()=>this.activeEditErrors().map(error=>this.uiRuntimeText_FlowEditor('uiFoundation.flowEditor.nodeEditError',{node:this.nodeLabel(error.id),field:this.uiRuntimeText_FlowEditor(error.field==='label' ? "uiFoundation.flowEditor.labelForDiagram" : error.field==='x' ? "uiFoundation.flowEditor.horizontalPosition" : "uiFoundation.flowEditor.verticalPosition"),problem:this.uiRuntimeText_FlowEditor(error.message)})).join(' ')||null);
 readonly displayModel=computed(()=>this.problem()?{nodes:[],edges:[]}:this.model());

 private readonly uiDiagnostic_FlowEditor=injectUiDiagnosticText();

 private readonly uiRuntimeText_FlowEditor=injectUiRuntimeText();

 protected readonly uiText_FlowEditor=injectUiMessageText();
 readonly label=input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_FlowEditor("uiFoundation.flowEditor.flow"));readonly model=input<DiagramModel>({nodes:[],edges:[]});readonly zoom=input(1);readonly direction=input<'LR'|'TB'>('LR');readonly selected=input<string|null>(null);readonly readonly=input(false);readonly disabled=input(false);readonly busy=input(false);readonly changeRequested=output<DiagramChange>();readonly layoutRequested=output<DiagramModel>();readonly zoomChange=output<number>();readonly selectionChange=output<string>();readonly from=signal('');readonly to=signal('');readonly selectedEdge=signal<string|null>(null);readonly actionError=uiMessageState<string | null>(null);readonly nodeWidth=signal(0);readonly nodeHeight=signal(0);private readonly gap=signal(0);protected readonly gapSize=this.gap.asReadonly();
 private readonly nodeElements=viewChildren<ElementRef<HTMLButtonElement>>('diagramNode');
 private readonly labelElements=viewChildren<ElementRef<SVGTextElement>>('diagramLabel');
 private readonly nodeHeights=signal<ReadonlyMap<string,number>>(new Map());
 private readonly labelMetrics=signal<ReadonlyMap<string,DiagramLabelMetrics>>(new Map());
 private readonly focusRecovery=signal<DiagramFocusRecovery|null>(null);
 private geometryResize:ResizeObserver|null=null;
 private readonly host=inject<ElementRef<HTMLElement>>(ElementRef);private readonly destroyRef=inject(DestroyRef);private stopScope:(()=>void)|null=null;private stopFocus:(()=>void)|null=null;
 private readonly labelBounds=computed(()=>{
  const nodes=this.displayModel().nodes.map(node=>({x:node.x,y:node.y,width:this.nodeWidth(),height:this.heightOf(node.id)})),metrics=this.labelMetrics();
  const labels=this.displayModel().edges.filter(edge=>!!edge.label).map(edge=>{const middle=this.edgeMid(edge),size=metrics.get(edge.id);return {id:edge.id,x:middle.x-(size?.width??0)/2,y:middle.y-(size?.height??0)/2,width:size?.width??0,height:size?.height??0};});
  return placeDiagramLabels(nodes,labels,this.gap());
 });
 readonly problem=computed(()=>diagramProblem(this.model(), this.uiDiagnostic_FlowEditor)??(!Number.isFinite(this.zoom())||this.zoom()<.25||this.zoom()>4?this.uiRuntimeText_FlowEditor("uiFoundation.flowEditor.setTheZoomLevelToAValueBetween025And4"):null));readonly blocked=computed(()=>this.readonly()||this.disabled()||this.busy()||!!this.problem());readonly width=computed(()=>Math.max(this.nodeWidth()*2,...this.model().nodes.map(n=>n.x+this.nodeWidth()+this.gap()),...this.displayModel().edges.map(edge=>{const box=this.connection(edge).bounds;return box.x+box.width+this.gap();}),...[...this.labelBounds().values()].map(box=>box.x+box.width+this.gap())));readonly height=computed(()=>Math.max(this.nodeHeight()*4,...this.model().nodes.map(n=>n.y+this.heightOf(n.id)+this.gap()),...this.displayModel().edges.map(edge=>{const box=this.connection(edge).bounds;return box.y+box.height+this.gap();}),...[...this.labelBounds().values()].map(box=>box.y+box.height+this.gap())));
 constructor(){
  afterRenderEffect(()=>{this.model();this.zoom();this.nodeWidth();this.nodeHeight();this.nodeElements();this.labelElements();untracked(()=>{this.observeGeometry();this.measureGeometry();});});
  afterRenderEffect(()=>{const recovery=this.focusRecovery();if(!recovery)return;this.model();this.blocked();untracked(()=>this.recoverRemovedFocus(recovery));});
  effect(()=>{const nodes=new Map(this.model().nodes.map(node=>[node.id,node]));this.editErrors.update(errors=>{const kept=errors.filter(error=>nodes.get(error.id)?.[error.field]===error.previous);return kept.length===errors.length?errors:kept;});});
  afterNextRender(()=>{
   const host=this.host.nativeElement,document=host.ownerDocument;
   this.geometryResize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>this.measureGeometry());this.observeGeometry();
   const moved=(event:FocusEvent)=>{const recovery=this.focusRecovery();if(recovery&&event.target!==recovery.element&&event.target!==document.body)this.focusRecovery.set(null);};
   const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!host.contains(event.target))this.focusRecovery.set(null);};
   document.addEventListener('focusin',moved,true);document.addEventListener('pointerdown',outside,true);
   this.stopFocus=()=>{document.removeEventListener('focusin',moved,true);document.removeEventListener('pointerdown',outside,true);};
   this.stopScope=observeSpecialistScope(host,()=>{if(!canFocus(host))this.focusRecovery.set(null);const theme=readSpecialistTheme(host);this.nodeWidth.set(theme.controlSize*4+theme.gap*2);this.nodeHeight.set(theme.controlSize);this.gap.set(theme.gap);this.measureGeometry();});
  });
  this.destroyRef.onDestroy(()=>{this.stopScope?.();this.stopFocus?.();this.geometryResize?.disconnect();this.focusRecovery.set(null);});
 }
 private observeGeometry():void{this.geometryResize?.disconnect();for(const element of [...this.nodeElements(),...this.labelElements()])this.geometryResize?.observe(element.nativeElement);}
 private measureGeometry():void{if(this.destroyRef.destroyed||!canFocus(this.host.nativeElement))return;this.measureNodes();this.measureLabels();}
 private measureLabels():void{
  const edges=this.displayModel().edges.filter(edge=>!!edge.label),elements=this.labelElements(),previous=this.labelMetrics(),metrics=new Map<string,DiagramLabelMetrics>();
  for(let index=0;index<elements.length;index++){
   const edge=edges[index],element=elements[index]!.nativeElement;if(!edge)continue;
   const box=element.getBBox(),x=Number(element.getAttribute('x')),y=Number(element.getAttribute('y'));
   if(box.width>0&&box.height>0)metrics.set(edge.id,{width:box.width,height:box.height,offsetX:box.x-x,offsetY:box.y-y});
  }
  if(metrics.size!==previous.size||[...metrics].some(([id,size])=>{const prior=previous.get(id);return !prior||(['width','height','offsetX','offsetY'] as const).some(key=>Math.abs(size[key]-prior[key])>.01);}))this.labelMetrics.set(metrics);
 }
 labelPosition(edge:DiagramEdge):{x:number;y:number;box:DiagramLabelBounds|null;guide:{x:number;y:number}|null}{
  const middle=this.edgeMid(edge),box=this.labelBounds().get(edge.id),metrics=this.labelMetrics().get(edge.id);if(!box||!metrics)return {...middle,box:null,guide:null};
  const shifted=Math.abs(box.x+box.width/2-middle.x)>.01||Math.abs(box.y+box.height/2-middle.y)>.01;
  return {x:box.x-metrics.offsetX,y:box.y-metrics.offsetY,box,guide:shifted?{x:Math.max(box.x,Math.min(middle.x,box.x+box.width)),y:Math.max(box.y,Math.min(middle.y,box.y+box.height))}:null};
 }
 private recoverRemovedFocus(recovery:DiagramFocusRecovery):void{
  const host=this.host.nativeElement,document=host.ownerDocument;
  if(!canFocus(host)){this.focusRecovery.set(null);return;}
  const active=document.activeElement;
  if(active!==recovery.element&&active!==document.body){this.focusRecovery.set(null);return;}
  const items=recovery.kind==='node'?this.model().nodes:this.model().edges;if(items.some(item=>item.id===recovery.id))return;
  this.focusRecovery.set(null);
  const controls=Array.from(host.querySelectorAll<HTMLElement>(recovery.kind==='node'?'[data-diagram-node-editor]':'[data-diagram-edge-control]'));
  const targets=[...controls.slice(recovery.index),...controls.slice(0,recovery.index).reverse(),host.querySelector<HTMLElement>('[data-diagram-from]'),host.querySelector<HTMLElement>('[data-diagram-add]'),host.querySelector<HTMLElement>('[data-diagram-viewport]')];
  for(const target of targets)if(canFocus(target)){target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',inline:'nearest'});break;}
 }
 private requestRemoval(kind:'node'|'edge',id:string,event:Event):void{
  if(this.blocked())return;const items=kind==='node'?this.model().nodes:this.model().edges,index=items.findIndex(item=>item.id===id);if(index<0)return;
  const element=event.currentTarget as HTMLElement|null;
  this.focusRecovery.set(element&&this.host.nativeElement.ownerDocument.activeElement===element&&canFocus(element)?{kind,id,index,element}:null);
  this.changeRequested.emit({type:kind==='node'?'remove-node':'remove-edge',id});
 }
 removeNode(node:DiagramNode,event:Event):void{this.requestRemoval('node',node.id,event);}
 removeEdge(edge:DiagramEdge,event:Event):void{this.requestRemoval('edge',edge.id,event);}
 private heightOf(id:string):number{return this.nodeHeights().get(id)??this.nodeHeight();}
 private measureNodes():void{
  const zoom=this.zoom();if(!Number.isFinite(zoom)||zoom<=0)return;
  const nodes=this.displayModel().nodes,elements=this.nodeElements(),previous=this.nodeHeights(),heights=new Map<string,number>();
  for(let index=0;index<elements.length;index++){
   const node=nodes[index],element=elements[index]!.nativeElement;if(!node)continue;
   const height=element.getClientRects().length?element.getBoundingClientRect().height/zoom:previous.get(node.id);
   if(height!==undefined&&height>0)heights.set(node.id,height);
  }
  if(heights.size!==previous.size||[...heights].some(([id,height])=>Math.abs(height-(previous.get(id)??0))>.01))this.nodeHeights.set(heights);
 }
 nodeLabel(id:string):string{return this.model().nodes.find(n=>n.id===id)?.label??id;}
 private connection(edge:DiagramEdge){const bounds=(id:string):DiagramLabelBounds=>{const node=this.model().nodes.find(node=>node.id===id);return {x:node?.x??0,y:node?.y??0,width:this.nodeWidth(),height:this.heightOf(id)};};return diagramConnection(bounds(edge.from),bounds(edge.to),this.gap(),this.direction(),edge.from===edge.to);}
 edgePath(edge:DiagramEdge):string{return this.connection(edge).path;}
 edgeArrow(edge:DiagramEdge):string{return this.connection(edge).arrow;}
 edgeMid(edge:DiagramEdge):{x:number;y:number}{return this.connection(edge).middle;}
 arrange():void{if(this.blocked())return;try{this.layoutRequested.emit(layoutDiagram(this.model(),this.nodeWidth(),Math.max(this.nodeHeight(),...this.nodeHeights().values()),this.gap(),this.direction(),Math.max(this.gap()*2,...[...this.labelMetrics().values()].map(size=>(this.direction()==='LR'?size.width:size.height)+this.gap()*2))));this.actionError.set(null);}catch{this.actionError.setMessage([() => this.uiRuntimeText_FlowEditor("uiFoundation.flowEditor.couldNotCalculateTheLayoutTheCurrentDiagramHasBeenKept")]);}}
 invalidEdit(node:DiagramNode,field:DiagramEditField):boolean{return this.activeEditErrors().some(error=>error.id===node.id&&error.field===field);}
 private currentNode(id:string):DiagramNode|undefined{return this.model().nodes.find(node=>node.id===id);}
 private rejectEdit(node:DiagramNode,field:DiagramEditField,message:UiStaticMessageId):void{this.editErrors.update(errors=>[...errors.filter(error=>error.id!==node.id||error.field!==field),{id:node.id,field,previous:node[field],message}]);this.actionError.set(null);}
 private clearEdit(node:DiagramNode,field:DiagramEditField):void{this.editErrors.update(errors=>errors.filter(error=>error.id!==node.id||error.field!==field));this.actionError.set(null);}
 rename(node:DiagramNode,event:Event):void{const current=this.currentNode(node.id);if(this.blocked()||!current)return;const label=(event.target as HTMLInputElement).value;if(!label.trim()){this.rejectEdit(current,'label','uiFoundation.flowEditor.nodeLabelRequired');return;}this.clearEdit(current,'label');this.changeRequested.emit({type:'label',id:current.id,label});}
 position(node:DiagramNode,axis:'x'|'y',event:Event):void{const current=this.currentNode(node.id);if(this.blocked()||!current)return;const raw=(event.target as HTMLInputElement).value,value=Number(raw);if(!raw.trim()||!Number.isFinite(value)||value<0||value>1e6){this.rejectEdit(current,axis,'uiFoundation.flowEditor.nodePositionRange');return;}this.clearEdit(current,axis);this.changeRequested.emit({type:'move',id:current.id,x:axis==='x'?value:current.x,y:axis==='y'?value:current.y});}
 nodeKey(event:KeyboardEvent,node:DiagramNode):void{if(this.blocked()||event.isComposing||event.defaultPrevented||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const current=this.currentNode(node.id);if(!current)return;const delta=event.shiftKey?this.gap()*4:this.gap(),x=Math.max(0,Math.min(1e6,current.x+(event.key==='ArrowLeft'?-delta:event.key==='ArrowRight'?delta:0))),y=Math.max(0,Math.min(1e6,current.y+(event.key==='ArrowUp'?-delta:event.key==='ArrowDown'?delta:0)));if(x===current.x&&y===current.y)return;this.actionError.set(null);this.changeRequested.emit({type:'move',id:current.id,x,y});}
 setEndpoint(which:'from'|'to',event:Event):void{(which==='from'?this.from:this.to).set((event.target as HTMLSelectElement).value);}
 connect():void{if(!this.blocked()&&this.from()&&this.to())this.changeRequested.emit({type:'connect',edge:{id:crypto.randomUUID(),from:this.from(),to:this.to()}});}
 add():void{if(!this.blocked())this.changeRequested.emit({type:'add',node:{id:crypto.randomUUID(),label:this.uiRuntimeText_FlowEditor("uiFoundation.flowEditor.newNode"),x:this.gap(),y:this.gap()}});}
}
