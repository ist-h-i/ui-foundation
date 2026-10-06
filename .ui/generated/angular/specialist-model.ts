/** Public read models. Persistence, remote operations, undo and policy remain app owned. */
export type ChartKind = 'line' | 'bar' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'heatmap' | 'radar' | 'gauge' | 'treemap';
export const chartKinds: readonly ChartKind[] = ['line','bar','area','pie','doughnut','scatter','heatmap','radar','gauge','treemap'];
export interface ChartPoint { id: string; label: string; value: number | null; x?: number; y?: number; children?: readonly ChartPoint[]; }
export interface ChartSeries { id: string; label: string; points: readonly ChartPoint[]; }
export interface ChartAxis { label: string; type: 'category' | 'value' | 'time'; min?: number; max?: number; }
export interface ChartSelection { seriesId: string; pointId: string; }
export interface ChartPointRow {seriesId:string;seriesLabel:string;point:ChartPoint;depth:number;}
export function chartPointRows(series:readonly ChartSeries[]):readonly ChartPointRow[]{const rows:ChartPointRow[]=[];for(const item of series){const visit=(points:readonly ChartPoint[],depth:number)=>{for(const point of points){rows.push({seriesId:item.id,seriesLabel:item.label,point,depth});if(point.children)visit(point.children,depth+1);}};visit(item.points,0);}return rows;}
export function chartAxisProblem(x:ChartAxis,y:ChartAxis,kind?:ChartKind):string|null{for(const axis of [x,y])if(!['category','value','time'].includes(axis.type)||typeof axis.label!=='string'||axis.min!==undefined&&!Number.isFinite(axis.min)||axis.max!==undefined&&!Number.isFinite(axis.max)||axis.min!==undefined&&axis.max!==undefined&&axis.min>=axis.max)return '軸の種別と範囲を確認してください。';if(kind==='heatmap'&&(x.type!=='category'||y.type!=='category'))return 'ヒートマップは横軸・縦軸とも区分軸を指定してください。';return null;}
export interface SparklineSummary { first: number | null; last: number | null; delta: number | null; missing: number; }
export function sparklineSummary(points: readonly ChartPoint[]): SparklineSummary {
  const first = points[0]?.value ?? null, last = points.at(-1)?.value ?? null;
  return {first,last,delta:first === null || last === null ? null : last-first, missing:points.filter(p => p.value === null).length};
}
export function requireIds(items: readonly {id:string}[], label: string): void {
  const ids = new Set<string>();
  for (const item of items) { if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error(`${label}: stable unique IDs are required`); ids.add(item.id); }
}
export function chartProblem(kind: ChartKind, series: readonly ChartSeries[]): string | null {
  try {
    if (!chartKinds.includes(kind)) throw new Error('Unknown chart kind');
    requireIds(series,'Series');
    let count=0;const ids=new Set<string>();
    const visit = (points:readonly ChartPoint[],seen:Set<ChartPoint>,depth:number):void => {
      if(depth>32) throw new Error('Chart tree is too deep');
      requireIds(points,'Points');
      for(const point of points) {
        if(seen.has(point)) throw new Error('Chart tree contains a cycle');
        if(ids.has(point.id))throw new Error('Point IDs must be unique throughout each series');ids.add(point.id);if(++count>10000)throw new Error('Chart has too many points');
        if(typeof point.label !== 'string' || (point.value !== null && !Number.isFinite(point.value))) throw new Error('Chart values must be finite or explicitly missing');
        if((kind==='scatter' || kind==='heatmap') && (!Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error('Coordinates are required');
        if(['pie','doughnut','treemap','gauge','radar'].includes(kind) && point.value!==null && point.value<0) throw new Error('This chart requires non-negative values');
        if(point.children) {seen.add(point); visit(point.children,seen,depth+1);seen.delete(point);}
      }
    };
    for(const item of series){ids.clear();if(typeof item.label!=='string')throw new Error('Series label is required');if(['line','bar','area'].includes(kind)&&new Set(item.points.map(point=>point.label)).size!==item.points.length)throw new Error('Category labels must be unique within a series');visit(item.points,new Set(),0);}
    return null;
  } catch(error) {return error instanceof Error ? error.message : 'Invalid chart data';}
}
export type LngLat = readonly [longitude:number,latitude:number];
export interface MapMarker { id:string; label:string; coordinate:LngLat; }
export interface MapRegion { id:string; label:string; rings:readonly (readonly LngLat[])[]; }
export interface MapCamera { center:LngLat; zoom:number; }
export function mapProblem(markers:readonly MapMarker[],regions:readonly MapRegion[],camera:MapCamera):string|null {
  const coordinate=(v:LngLat)=>Array.isArray(v)&&v.length===2&&Number.isFinite(v[0])&&Number.isFinite(v[1])&&Math.abs(v[0])<=180&&Math.abs(v[1])<=90;
  try {
    requireIds([...markers,...regions],'Map objects');
    if(!coordinate(camera.center)||!Number.isFinite(camera.zoom)||camera.zoom<0||camera.zoom>22) throw new Error('Map camera is invalid');
    for(const marker of markers)if(!coordinate(marker.coordinate))throw new Error('Marker coordinates are invalid');
    for(const region of regions) {
      if(!region.rings.length)throw new Error('A region needs polygon rings');
      for(const ring of region.rings)if(ring.length<4||ring.some(p=>!coordinate(p))||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])throw new Error('Region rings must be closed polygons');
    }
    return null;
  }catch(error){return error instanceof Error?error.message:'Invalid map data';}
}
export interface GanttTask {id:string;label:string;start:string;end:string;progress:number|null;dependencies:readonly string[];}
export type GanttScale='day'|'week'|'month';
const civil=/^\d{4}-\d{2}-\d{2}$/;
export function civilEpoch(date:string):number {
  if(!civil.test(date))throw new Error('Dates require civil ISO YYYY-MM-DD');
  const value=Date.parse(date+'T00:00:00Z');
  if(!Number.isFinite(value)||new Date(value).toISOString().slice(0,10)!==date)throw new Error('Civil date does not exist');
  return value;
}
export function ganttProblem(tasks:readonly GanttTask[]):string|null {
  try {
    requireIds(tasks,'Tasks');const byId=new Map(tasks.map(task=>[task.id,task]));
    for(const task of tasks){if(civilEpoch(task.start)>civilEpoch(task.end))throw new Error('Task end precedes start');if(task.progress!==null&&(!Number.isFinite(task.progress)||task.progress<0||task.progress>100))throw new Error('Progress must be 0–100 or explicitly unknown');requireIds(task.dependencies.map(id=>({id})),'Dependencies');for(const id of task.dependencies)if(!byId.has(id))throw new Error('Unknown dependency');}
    const visiting=new Set<string>(),visited=new Set<string>();
    const visit=(id:string):void=>{if(visiting.has(id))throw new Error('Dependency cycle');if(visited.has(id))return;visiting.add(id);for(const next of byId.get(id)!.dependencies)visit(next);visiting.delete(id);visited.add(id);};
    for(const task of tasks)visit(task.id);return null;
  }catch(error){return error instanceof Error?error.message:'Invalid Gantt tasks';}
}
export interface BoardColumn {id:string;label:string;limit?:number;}
export interface BoardCard {id:string;label:string;columnId:string;description?:string;disabled?:boolean;}
export interface BoardMove {cardId:string;fromColumn:string;toColumn:string;index:number;}
export function boardProblem(columns:readonly BoardColumn[],cards:readonly BoardCard[]):string|null {
  try{requireIds(columns,'Columns');requireIds(cards,'Cards');for(const column of columns)if(column.limit!==undefined&&(!Number.isInteger(column.limit)||column.limit<0))throw new Error('Column limits must be non-negative integers');for(const card of cards)if(!columns.some(c=>c.id===card.columnId))throw new Error('Unknown card column');return null;}catch(error){return error instanceof Error?error.message:'Invalid board';}
}
export function moveBoardCard(columns:readonly BoardColumn[],cards:readonly BoardCard[],move:BoardMove):readonly BoardCard[] {
  const problem=boardProblem(columns,cards);if(problem)throw new Error(problem);
  const card=cards.find(c=>c.id===move.cardId),target=columns.find(c=>c.id===move.toColumn);
  if(!card||card.columnId!==move.fromColumn||card.disabled||!target)throw new Error('Card move is unavailable');
  const targetCards=cards.filter(c=>c.columnId===target.id&&c.id!==card.id);
  if(!Number.isInteger(move.index)||move.index<0||move.index>targetCards.length)throw new Error('Card position is invalid');
  if(target.limit!==undefined&&targetCards.length>=target.limit&&target.id!==card.columnId)throw new Error('Column limit reached');
  const reordered=[...targetCards.slice(0,move.index),{...card,columnId:target.id},...targetCards.slice(move.index)];
  return columns.flatMap(column=>column.id===target.id?reordered:cards.filter(c=>c.columnId===column.id&&c.id!==card.id));
}
export type SheetCell = string | number | boolean | null;
export interface SheetModel {rows:readonly (readonly SheetCell[])[];}
export interface SheetAddress {row:number;column:number;}
export interface SheetSelection {anchor:SheetAddress;focus:SheetAddress;}
export interface SheetEdit {address:SheetAddress;previous:SheetCell;value:SheetCell;}
export function columnName(index:number):string {if(!Number.isInteger(index)||index<0)throw new Error('Invalid column');let value=index+1,text='';while(value){value--;text=String.fromCharCode(65+value%26)+text;value=Math.floor(value/26);}return text;}
export function sheetProblem(sheet:SheetModel):string|null {
  if(!sheet||!Array.isArray(sheet.rows)||sheet.rows.length>1000)return 'A sheet has at most 1,000 rows';const width=sheet.rows[0]?.length??0;
  if(width>100||sheet.rows.length*width>10000)return 'A sheet has at most 100 columns and 10,000 cells';
  for(const row of sheet.rows){if(!Array.isArray(row)||row.length!==width)return 'Sheet rows must be rectangular';for(const cell of row)if(!(cell===null||typeof cell==='boolean'||typeof cell==='string'&&cell.length<=8192||typeof cell==='number'&&Number.isFinite(cell)))return 'Invalid sheet cell';}return null;
}
export function editSheet(sheet:SheetModel,edit:SheetEdit):SheetModel {
  const {row,column}=edit.address;if(sheetProblem(sheet)||!Number.isInteger(row)||!Number.isInteger(column)||row<0||column<0||!sheet.rows[row]||column>=sheet.rows[row].length)throw new Error('Cell address is invalid');
  if(sheet.rows[row][column]!==edit.previous)throw new Error('Cell changed before edit');const rows=sheet.rows.map(r=>[...r]);rows[row][column]=edit.value;const result={rows};const problem=sheetProblem(result);if(problem)throw new Error(problem);return result;
}
/** CSV import preserves formula source and leading zeroes. No evaluation is performed during parsing. */
export function importSheetCsv(text:string):SheetModel {
  if(text.length>2_000_000)throw new Error('CSV exceeds the import limit');
  const rows:SheetCell[][]=[],row:SheetCell[]= [];let cell='',quoted=false,closed=false;
  const pushCell=()=>{row.push(cell);cell='';closed=false;};const pushRow=()=>{pushCell();rows.push([...row]);row.length=0;};
  for(let i=0;i<text.length;i++){const char=text[i];if(quoted){if(char==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=char;continue;}if(char==='"'&&!cell&&!closed){quoted=true;continue;}if(char===','){pushCell();continue;}if(char==='\r'||char==='\n'){if(char==='\r'&&text[i+1]==='\n')i++;pushRow();continue;}if(closed)throw new Error('Unexpected CSV text after a closing quote');cell+=char;}
  if(quoted)throw new Error('Unclosed CSV quote');if(cell||row.length||!rows.length)pushRow();
  const width=Math.max(...rows.map(r=>r.length),0);for(const cells of rows)while(cells.length<width)cells.push(null);const sheet={rows};const problem=sheetProblem(sheet);if(problem)throw new Error(problem);return sheet;
}
export function exportSheetCsv(sheet:SheetModel):string {const problem=sheetProblem(sheet);if(problem)throw new Error(problem);return sheet.rows.map(row=>row.map(cell=>'"'+String(cell??'').replaceAll('"','""')+'"').join(',')).join('\r\n');}
export interface ExplorerNode {id:string;label:string;kind:'file'|'folder';children?:readonly ExplorerNode[];disabled?:boolean;size?:number|null;}
export type ExplorerView='tree'|'list'|'grid';
export type ExplorerOperation='open'|'rename'|'delete'|'create-folder'|'download';
export interface ExplorerRequest {operation:ExplorerOperation;nodeId:string|null;name?:string;}
export interface ExplorerRow {node:ExplorerNode;depth:number;ancestors:readonly string[];}
export function explorerRows(nodes:readonly ExplorerNode[],expanded:readonly string[],query='',includeCollapsed=false,locale='ja-JP'):readonly ExplorerRow[] {
  const rows:ExplorerRow[]=[],ids=new Set<string>();const all:ExplorerRow[]=[];
  const visit=(items:readonly ExplorerNode[],ancestors:readonly string[],depth:number):void=>{if(depth>64)throw new Error('File hierarchy is too deep');requireIds(items,'Files');for(const node of items){if(ids.has(node.id))throw new Error('File hierarchy has duplicate IDs or a cycle');ids.add(node.id);if(node.kind!=='file'&&node.kind!=='folder')throw new Error('Unknown file kind');if(node.kind==='file'&&node.children?.length)throw new Error('Files cannot contain children');const row={node,ancestors,depth};all.push(row);if(node.children)visit(node.children,[...ancestors,node.id],depth+1);}};visit(nodes,[],0);
  const search=query.trim().toLocaleLowerCase(locale);for(const row of all)if(search?row.node.label.toLocaleLowerCase(locale).includes(search):includeCollapsed||row.ancestors.every(id=>expanded.includes(id)))rows.push(row);return rows;
}
export interface DiagramNode {id:string;label:string;x:number;y:number;}
export interface DiagramEdge {id:string;from:string;to:string;label?:string;}
export interface DiagramModel {nodes:readonly DiagramNode[];edges:readonly DiagramEdge[];}
export type DiagramChange={type:'move';id:string;x:number;y:number}|{type:'label';id:string;label:string}|{type:'connect';edge:DiagramEdge}|{type:'remove-node';id:string}|{type:'remove-edge';id:string}|{type:'add';node:DiagramNode};
export function diagramProblem(model:DiagramModel):string|null {
  try{requireIds(model.nodes,'Nodes');requireIds(model.edges,'Connections');for(const node of model.nodes){if(typeof node.label!=='string'||!node.label.trim())throw new Error('Node labels must not be empty');if(!Number.isFinite(node.x)||!Number.isFinite(node.y)||node.x<0||node.y<0||node.x>1e6||node.y>1e6)throw new Error('Node coordinates are invalid');}for(const edge of model.edges)if(!model.nodes.some(n=>n.id===edge.from)||!model.nodes.some(n=>n.id===edge.to))throw new Error('Connection refers to an unknown node');return null;}catch(error){return error instanceof Error?error.message:'Invalid diagram';}
}
export function changeDiagram(model:DiagramModel,change:DiagramChange):DiagramModel {
  const problem=diagramProblem(model);if(problem)throw new Error(problem);let nodes=[...model.nodes],edges=[...model.edges];
  if(change.type==='move'||change.type==='label'){if(!nodes.some(n=>n.id===change.id))throw new Error('Unknown node');nodes=nodes.map(n=>n.id!==change.id?n:change.type==='move'?{...n,x:change.x,y:change.y}:{...n,label:change.label});}
  if(change.type==='connect')edges.push({...change.edge});if(change.type==='add')nodes.push({...change.node});if(change.type==='remove-node'){nodes=nodes.filter(n=>n.id!==change.id);edges=edges.filter(e=>e.from!==change.id&&e.to!==change.id);}if(change.type==='remove-edge')edges=edges.filter(e=>e.id!==change.id);
  const result={nodes,edges},nextProblem=diagramProblem(result);if(nextProblem)throw new Error(nextProblem);return result;
}
export interface ChatAttachment {id:string;label:string;size:number|null;}
export type ChatSendState='draft'|'sending'|'sent'|'failed'|'unknown';
export interface ChatMessage {id:string;author:string;text:string;time:string;state:ChatSendState;attachments:readonly ChatAttachment[];error?:string;retryable?:boolean;}
export interface ChatDraft {text:string;attachments:readonly ChatAttachment[];}
export interface ChatSendRequest {requestId:number;draft:ChatDraft;}
export interface ChatRetryRequest {messageId:string;}
export interface ChatLoadRequest {requestId:number;cursor:string|null;}
export function chatProblem(messages:readonly ChatMessage[]):string|null {
  try{requireIds(messages,'Messages');for(const message of messages){if(!['draft','sending','sent','failed','unknown'].includes(message.state))throw new Error('Unknown send state');requireIds(message.attachments,'Attachments');for(const attachment of message.attachments)if(attachment.size!==null&&(!Number.isFinite(attachment.size)||attachment.size<0))throw new Error('Attachment size is invalid');}return null;}catch(error){return error instanceof Error?error.message:'Invalid messages';}
}
export function chatCanSend(draft:ChatDraft):boolean{return !!draft.text.trim()||draft.attachments.length>0;}
/** Escape neither changes markdown semantics nor grants trust. Only explicit safe URL schemes are accepted. */
export function safeEditorUrl(raw:string,allowImage=false):string|null {
  try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)&&!(url.protocol==='mailto:'&&!allowImage))return null;if(url.username||url.password)return null;return url.href;}catch{return null;}
}

export function chartLocaleProblem(locale:string,timeZone:string|null,numberOptions:Intl.NumberFormatOptions,dateTimeOptions:Intl.DateTimeFormatOptions,hasTimeAxis:boolean):string|null{if(hasTimeAxis&&(timeZone===null||!timeZone.trim()))return '時間軸のタイムゾーンを明示してください。';if(dateTimeOptions.timeZone!==undefined)return '時間軸のタイムゾーンは独立した設定で明示してください。';try{new Intl.NumberFormat(locale,numberOptions);new Intl.DateTimeFormat(locale,{...dateTimeOptions,timeZone:timeZone??'UTC'});}catch{return 'グラフの言語・数値書式・日時書式を確認してください。';}return null;}
