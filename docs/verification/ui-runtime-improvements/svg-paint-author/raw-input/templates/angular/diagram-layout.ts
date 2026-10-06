import dagre from '@dagrejs/dagre';
import {diagramProblem,type DiagramModel} from './specialist-model';
export function layoutDiagram(model:DiagramModel,width:number,height:number,gap:number,direction:'LR'|'TB'='LR'):DiagramModel {
 const problem=diagramProblem(model);if(problem)throw new Error(problem);if(![width,height,gap].every(v=>Number.isFinite(v)&&v>0))throw new Error('Layout dimensions must be positive');
 const graph=new dagre.graphlib.Graph({directed:true,multigraph:true}).setGraph({rankdir:direction,nodesep:gap,ranksep:gap*2,marginx:gap,marginy:gap}).setDefaultEdgeLabel(()=>({}));
 for(const node of model.nodes)graph.setNode(node.id,{width,height});for(const edge of model.edges)graph.setEdge(edge.from,edge.to,{},edge.id);dagre.layout(graph);
 return {nodes:model.nodes.map(node=>{const position=graph.node(node.id);return {...node,x:position.x-width/2,y:position.y-height/2};}),edges:model.edges.map(edge=>({...edge}))};
}
