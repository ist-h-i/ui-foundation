import dagre from '@dagrejs/dagre';
import {diagramProblem,type DiagramModel} from './specialist-model';
export function layoutDiagram(model:DiagramModel,width:number,height:number,gap:number,direction:'LR'|'TB'='LR',rankGap=gap*2):DiagramModel {
 const problem=diagramProblem(model);if(problem)throw new Error(problem);if(![width,height,gap,rankGap].every(v=>Number.isFinite(v)&&v>0))throw new Error('Layout dimensions must be positive');
 const graph=new dagre.graphlib.Graph({directed:true,multigraph:true}).setGraph({rankdir:direction,nodesep:gap,ranksep:rankGap,marginx:gap,marginy:gap}).setDefaultEdgeLabel(()=>({}));
 for(const node of model.nodes)graph.setNode(node.id,{width,height});for(const edge of model.edges)graph.setEdge(edge.from,edge.to,{},edge.id);dagre.layout(graph);
 return {nodes:model.nodes.map(node=>{const position=graph.node(node.id);return {...node,x:position.x-width/2,y:position.y-height/2};}),edges:model.edges.map(edge=>({...edge}))};
}
export interface DiagramLabelBounds {readonly x:number;readonly y:number;readonly width:number;readonly height:number;}
export interface DiagramConnectionPoint {readonly x:number;readonly y:number;}
export interface DiagramConnectionGeometry {
 readonly points:readonly DiagramConnectionPoint[];readonly path:string;readonly arrow:string;
 readonly middle:DiagramConnectionPoint;readonly bounds:DiagramLabelBounds;
}
/** Connect measured node boundaries, including reverse ranks and self connections. */
export function diagramConnection(from:DiagramLabelBounds,to:DiagramLabelBounds,gap:number,direction:'LR'|'TB'='LR',self=false):DiagramConnectionGeometry {
 const clearance=Math.max(0,gap)*2,center=(box:DiagramLabelBounds)=>({x:box.x+box.width/2,y:box.y+box.height/2});
 const a=center(from),b=center(to);let points:DiagramConnectionPoint[];
 if(self){
  const right=from.x+from.width,bottom=from.y+from.height;
  points=direction==='LR'?[{x:right,y:a.y},{x:right+clearance,y:a.y},{x:right+clearance,y:bottom+clearance},{x:a.x,y:bottom+clearance},{x:a.x,y:bottom}]:[{x:a.x,y:bottom},{x:a.x,y:bottom+clearance},{x:right+clearance,y:bottom+clearance},{x:right+clearance,y:a.y},{x:right,y:a.y}];
 }else if(direction==='LR'){
  if(from.x+from.width<to.x||to.x+to.width<from.x){
   const forward=b.x>=a.x,start={x:forward?from.x+from.width:from.x,y:a.y},end={x:forward?to.x:to.x+to.width,y:b.y},middle=(start.x+end.x)/2;
   points=[start,{x:middle,y:start.y},{x:middle,y:end.y},end];
  }else if(from.x+from.width===to.x||to.x+to.width===from.x){
   const outside=Math.max(from.y+from.height,to.y+to.height)+clearance;
   points=[{x:a.x,y:from.y+from.height},{x:a.x,y:outside},{x:b.x,y:outside},{x:b.x,y:to.y+to.height}];
  }else{
   const outside=Math.max(from.x+from.width,to.x+to.width)+clearance;
   points=[{x:from.x+from.width,y:a.y},{x:outside,y:a.y},{x:outside,y:b.y},{x:to.x+to.width,y:b.y}];
  }
 }else{
  if(from.y+from.height<to.y||to.y+to.height<from.y){
   const forward=b.y>=a.y,start={x:a.x,y:forward?from.y+from.height:from.y},end={x:b.x,y:forward?to.y:to.y+to.height},middle=(start.y+end.y)/2;
   points=[start,{x:start.x,y:middle},{x:end.x,y:middle},end];
  }else if(from.y+from.height===to.y||to.y+to.height===from.y){
   const outside=Math.max(from.x+from.width,to.x+to.width)+clearance;
   points=[{x:from.x+from.width,y:a.y},{x:outside,y:a.y},{x:outside,y:b.y},{x:to.x+to.width,y:b.y}];
  }else{
   const outside=Math.max(from.y+from.height,to.y+to.height)+clearance;
   points=[{x:a.x,y:from.y+from.height},{x:a.x,y:outside},{x:b.x,y:outside},{x:b.x,y:to.y+to.height}];
  }
 }
 points=points.filter((point,index)=>!index||point.x!==points[index-1]!.x||point.y!==points[index-1]!.y);
 const end=points.at(-1)!,previous=points.at(-2)??end,length=Math.hypot(end.x-previous.x,end.y-previous.y),size=Math.min(Math.max(0,gap),length),ux=length?(end.x-previous.x)/length:0,uy=length?(end.y-previous.y)/length:0;
 const arrow=size?`${end.x},${end.y} ${end.x-ux*size-uy*size/2},${end.y-uy*size+ux*size/2} ${end.x-ux*size+uy*size/2},${end.y-uy*size-ux*size/2}`:'';
 const segments=points.slice(1).map((point,index)=>Math.hypot(point.x-points[index]!.x,point.y-points[index]!.y)),half=segments.reduce((sum,value)=>sum+value,0)/2;let traversed=0,middle=end;
 for(let index=0;index<segments.length;index++){const span=segments[index]!;if(traversed+span>=half){const start=points[index]!,finish=points[index+1]!,ratio=span?(half-traversed)/span:0;middle={x:start.x+(finish.x-start.x)*ratio,y:start.y+(finish.y-start.y)*ratio};break;}traversed+=span;}
 const left=Math.min(...points.map(point=>point.x)),top=Math.min(...points.map(point=>point.y));
 return {points,path:points.map((point,index)=>`${index?'L':'M'}${point.x},${point.y}`).join(' '),arrow,middle,bounds:{x:left,y:top,width:Math.max(...points.map(point=>point.x))-left,height:Math.max(...points.map(point=>point.y))-top}};
}
/** Place measured captions without moving controlled nodes, including manual layouts. */
export function placeDiagramLabels(nodes:readonly DiagramLabelBounds[],labels:readonly (DiagramLabelBounds&{readonly id:string})[],gap:number):ReadonlyMap<string,DiagramLabelBounds> {
 const occupied=[...nodes],placed=new Map<string,DiagramLabelBounds>();
 for(const label of labels){
  const x=Math.max(gap,label.x),desiredY=Math.max(gap,label.y),blockers=occupied.filter(box=>x<box.x+box.width+gap&&x+label.width>box.x-gap);
  const candidates=[desiredY,...blockers.flatMap(box=>[box.y-gap-label.height,box.y+box.height+gap])].filter(y=>y>=gap).sort((a,b)=>Math.abs(a-desiredY)-Math.abs(b-desiredY)||a-b);
  const y=candidates.find(candidate=>blockers.every(box=>candidate+label.height<=box.y-gap||candidate>=box.y+box.height+gap))??Math.max(gap,...blockers.map(box=>box.y+box.height+gap));
  const box={x,y,width:label.width,height:label.height};placed.set(label.id,box);occupied.push(box);
 }
 return placed;
}
