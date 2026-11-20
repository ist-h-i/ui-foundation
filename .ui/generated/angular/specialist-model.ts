import {uiMessageText as createUiMessageText, type UiMessageText, type UiStaticMessageId} from './stable-messages';
const japaneseText = createUiMessageText(() => 'ja-JP');
const englishText = createUiMessageText(() => 'en');
class SpecialistDiagnostic extends Error {
  constructor(readonly id: UiStaticMessageId) { super(); }
}
function rejectDiagnostic(id: UiStaticMessageId): never { throw new SpecialistDiagnostic(id); }

/** Public read models. Persistence, remote operations, undo and policy remain app owned. */
export type ChartKind = 'line' | 'bar' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'heatmap' | 'radar' | 'gauge' | 'treemap';
export const chartKinds: readonly ChartKind[] = ['line','bar','area','pie','doughnut','scatter','heatmap','radar','gauge','treemap'];
export interface ChartPoint { id: string; label: string; value: number | null; x?: number; y?: number; children?: readonly ChartPoint[]; }
export interface ChartSeries { id: string; label: string; points: readonly ChartPoint[]; }
export interface ChartAxis { label: string; type: 'category' | 'value' | 'time'; min?: number; max?: number; }
export interface ChartSelection { seriesId: string; pointId: string; }
export interface ChartPointRow {seriesId:string;seriesLabel:string;point:ChartPoint;depth:number;}
export function chartPointRows(series:readonly ChartSeries[]):readonly ChartPointRow[]{const rows:ChartPointRow[]=[];for(const item of series){const visit=(points:readonly ChartPoint[],depth:number)=>{for(const point of points){rows.push({seriesId:item.id,seriesLabel:item.label,point,depth});if(point.children)visit(point.children,depth+1);}};visit(item.points,0);}return rows;}
export function chartAxisProblem(x:ChartAxis,y:ChartAxis,kind?:ChartKind, text: UiMessageText = japaneseText):string|null{for(const axis of [x,y])if(!['category','value','time'].includes(axis.type)||typeof axis.label!=='string'||axis.min!==undefined&&!Number.isFinite(axis.min)||axis.max!==undefined&&!Number.isFinite(axis.max)||axis.min!==undefined&&axis.max!==undefined&&axis.min>=axis.max)return text("uiFoundation.chart.checkTheAxisTypeAndRange");if(kind==='heatmap'&&(x.type!=='category'||y.type!=='category'))return text("uiFoundation.chart.useCategoryAxesForBothAxesOfThe");return null;}
export interface SparklineSummary { first: number | null; last: number | null; delta: number | null; missing: number; }
export function sparklineSummary(points: readonly ChartPoint[]): SparklineSummary {
  const first = points[0]?.value ?? null, last = points.at(-1)?.value ?? null;
  return {first,last,delta:first === null || last === null ? null : last-first, missing:points.filter(p => p.value === null).length};
}
export function requireIds(items: readonly {id:string}[], label: string, diagnostic?: UiStaticMessageId): void {
  const ids = new Set<string>();
  for (const item of items) { if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) { if (diagnostic) rejectDiagnostic(diagnostic); throw new Error(`${label}: stable unique IDs are required`); } ids.add(item.id); }
}
export function chartProblem(kind: ChartKind, series: readonly ChartSeries[], text: UiMessageText = englishText): string | null {
  try {
    if (!chartKinds.includes(kind)) rejectDiagnostic('uiFoundation.chart.unknownKind');
    requireIds(series,'Series','uiFoundation.chart.invalidSeriesIds');
    let count=0;const ids=new Set<string>();
    const visit = (points:readonly ChartPoint[],seen:Set<ChartPoint>,depth:number):void => {
      if(depth>32) rejectDiagnostic('uiFoundation.chart.treeTooDeep');
      requireIds(points,'Points','uiFoundation.chart.invalidPointIds');
      for(const point of points) {
        if(seen.has(point)) rejectDiagnostic('uiFoundation.chart.treeCycle');
        if(ids.has(point.id))rejectDiagnostic('uiFoundation.chart.duplicatePointIds');ids.add(point.id);if(++count>10000)rejectDiagnostic('uiFoundation.chart.tooManyPoints');
        if(typeof point.label !== 'string' || (point.value !== null && !Number.isFinite(point.value))) rejectDiagnostic('uiFoundation.chart.invalidValue');
        if((kind==='scatter' || kind==='heatmap') && (!Number.isFinite(point.x) || !Number.isFinite(point.y))) rejectDiagnostic('uiFoundation.chart.missingCoordinates');
        if(['pie','doughnut','treemap','gauge','radar'].includes(kind) && point.value!==null && point.value<0) rejectDiagnostic('uiFoundation.chart.negativeValue');
        if(point.children) {seen.add(point); visit(point.children,seen,depth+1);seen.delete(point);}
      }
    };
    for(const item of series){ids.clear();if(typeof item.label!=='string')rejectDiagnostic('uiFoundation.chart.missingSeriesLabel');if(['line','bar','area'].includes(kind)&&new Set(item.points.map(point=>point.label)).size!==item.points.length)rejectDiagnostic('uiFoundation.chart.duplicateCategoryLabels');visit(item.points,new Set(),0);}
    return null;
  } catch(error) {return text(error instanceof SpecialistDiagnostic ? error.id : 'uiFoundation.chart.invalidData');}
}
export type LngLat = readonly [longitude:number,latitude:number];
export interface MapMarker { id:string; label:string; coordinate:LngLat; }
export interface MapRegion { id:string; label:string; rings:readonly (readonly LngLat[])[]; }
export interface MapCamera { center:LngLat; zoom:number; }
export function mapProblem(markers:readonly MapMarker[],regions:readonly MapRegion[],camera:MapCamera, text: UiMessageText = englishText):string|null {
  const coordinate=(v:LngLat)=>Array.isArray(v)&&v.length===2&&Number.isFinite(v[0])&&Number.isFinite(v[1])&&Math.abs(v[0])<=180&&Math.abs(v[1])<=90;
  try {
    requireIds([...markers,...regions],'Map objects','uiFoundation.mapView.invalidObjectIds');
    if(!coordinate(camera.center)||!Number.isFinite(camera.zoom)||camera.zoom<0||camera.zoom>22) rejectDiagnostic('uiFoundation.mapView.invalidCamera');
    for(const marker of markers)if(!coordinate(marker.coordinate))rejectDiagnostic('uiFoundation.mapView.invalidMarker');
    for(const region of regions) {
      if(!region.rings.length)rejectDiagnostic('uiFoundation.mapView.missingRegionPolygon');
      for(const ring of region.rings)if(ring.length<4||ring.some(p=>!coordinate(p))||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])rejectDiagnostic('uiFoundation.mapView.invalidRegionPolygon');
    }
    return null;
  }catch(error){return text(error instanceof SpecialistDiagnostic ? error.id : 'uiFoundation.mapView.invalidData');}
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
const defaultGanttText = createUiMessageText(() => 'en');
export function ganttProblem(tasks:readonly GanttTask[], text: UiMessageText = defaultGanttText):string|null {
  try { requireIds(tasks, 'Tasks'); } catch { return text('uiFoundation.gantt.invalidTaskIds'); }
  const byId = new Map(tasks.map(task => [task.id, task]));
  for (const task of tasks) {
    try {
      if (civilEpoch(task.start) > civilEpoch(task.end)) return text('uiFoundation.gantt.invalidTaskOrder');
    } catch { return text('uiFoundation.gantt.invalidCivilDate'); }
    if (task.progress !== null && (!Number.isFinite(task.progress) || task.progress < 0 || task.progress > 100)) return text('uiFoundation.gantt.invalidProgress');
    if (!task.dependencies) return text('uiFoundation.gantt.invalidDependencyIds');
    try { requireIds(task.dependencies.map(id => ({ id })), 'Dependencies'); } catch { return text('uiFoundation.gantt.invalidDependencyIds'); }
    if (task.dependencies.some(id => !byId.has(id))) return text('uiFoundation.gantt.unknownDependency');
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const result = byId.get(id)!.dependencies.some(hasCycle);
    visiting.delete(id);
    visited.add(id);
    return result;
  };
  return tasks.some(task => hasCycle(task.id)) ? text('uiFoundation.gantt.dependencyCycle') : null;
}
export interface BoardColumn {id:string;label:string;limit?:number;}
export interface BoardCard {id:string;label:string;columnId:string;description?:string;disabled?:boolean;}
export interface BoardMove {cardId:string;fromColumn:string;toColumn:string;index:number;}
export function boardProblem(columns:readonly BoardColumn[],cards:readonly BoardCard[], text: UiMessageText = englishText):string|null {
  try{requireIds(columns,'Columns','uiFoundation.kanban.invalidColumnIds');requireIds(cards,'Cards','uiFoundation.kanban.invalidCardIds');for(const column of columns)if(column.limit!==undefined&&(!Number.isInteger(column.limit)||column.limit<0))rejectDiagnostic('uiFoundation.kanban.invalidColumnLimit');for(const card of cards)if(!columns.some(c=>c.id===card.columnId))rejectDiagnostic('uiFoundation.kanban.unknownCardColumn');return null;}catch(error){return text(error instanceof SpecialistDiagnostic ? error.id : 'uiFoundation.kanban.invalidBoard');}
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
export function sheetProblem(sheet:SheetModel, text: UiMessageText = englishText):string|null {
  if(!sheet||!Array.isArray(sheet.rows)||sheet.rows.length>1000)return text('uiFoundation.spreadsheet.rowLimit');const width=sheet.rows[0]?.length??0;
  if(width>100||sheet.rows.length*width>10000)return text('uiFoundation.spreadsheet.cellLimit');
  for(const row of sheet.rows){if(!Array.isArray(row)||row.length!==width)return text('uiFoundation.spreadsheet.unevenRows');for(const cell of row)if(!(cell===null||typeof cell==='boolean'||typeof cell==='string'&&cell.length<=8192||typeof cell==='number'&&Number.isFinite(cell)))return text('uiFoundation.spreadsheet.invalidCell');}return null;
}
export function editSheet(sheet:SheetModel,edit:SheetEdit):SheetModel {
  const {row,column}=edit.address;if(sheetProblem(sheet)||!Number.isInteger(row)||!Number.isInteger(column)||row<0||column<0||!sheet.rows[row]||column>=sheet.rows[row].length)throw new Error('Cell address is invalid');
  if(sheet.rows[row][column]!==edit.previous)throw new Error('Cell changed before edit');const rows=sheet.rows.map(r=>[...r]);rows[row][column]=edit.value;const result={rows};const problem=sheetProblem(result);if(problem)throw new Error(problem);return result;
}
/** CSV import preserves formula source and leading zeroes. No evaluation is performed during parsing. */
export function importSheetCsv(source:string, text: UiMessageText = englishText):SheetModel {
  if(source.length>2_000_000)throw new Error(text('uiFoundation.spreadsheet.csvSizeLimit'));
  const rows:SheetCell[][]=[],row:SheetCell[]= [];let cell='',quoted=false,closed=false;
  const pushCell=()=>{row.push(cell);cell='';closed=false;};const pushRow=()=>{pushCell();rows.push([...row]);row.length=0;};
  for(let i=0;i<source.length;i++){const char=source[i];if(quoted){if(char==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=char;continue;}if(char==='"'&&!cell&&!closed){quoted=true;continue;}if(char===','){pushCell();continue;}if(char==='\r'||char==='\n'){if(char==='\r'&&source[i+1]==='\n')i++;pushRow();continue;}if(closed)throw new Error(text('uiFoundation.spreadsheet.csvUnexpectedText'));cell+=char;}
  if(quoted)throw new Error(text('uiFoundation.spreadsheet.csvUnclosedQuote'));if(cell||row.length||!rows.length)pushRow();
  const width=Math.max(...rows.map(r=>r.length),0);for(const cells of rows)while(cells.length<width)cells.push(null);const sheet={rows};const problem=sheetProblem(sheet,text);if(problem)throw new Error(problem);return sheet;
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
export function diagramProblem(model:DiagramModel, text: UiMessageText = englishText):string|null {
  try{requireIds(model.nodes,'Nodes','uiFoundation.flowEditor.invalidNodeIds');requireIds(model.edges,'Connections','uiFoundation.flowEditor.invalidConnectionIds');for(const node of model.nodes){if(typeof node.label!=='string'||!node.label.trim())rejectDiagnostic('uiFoundation.flowEditor.emptyNodeLabel');if(!Number.isFinite(node.x)||!Number.isFinite(node.y)||node.x<0||node.y<0||node.x>1e6||node.y>1e6)rejectDiagnostic('uiFoundation.flowEditor.invalidNodeCoordinates');}for(const edge of model.edges)if(!model.nodes.some(n=>n.id===edge.from)||!model.nodes.some(n=>n.id===edge.to))rejectDiagnostic('uiFoundation.flowEditor.connectionUnknownNode');return null;}catch(error){return text(error instanceof SpecialistDiagnostic ? error.id : 'uiFoundation.flowEditor.invalidDiagram');}
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
export function chatProblem(messages:readonly ChatMessage[], text: UiMessageText = englishText):string|null {
  try{requireIds(messages,'Messages','uiFoundation.messageList.invalidMessageIds');for(const message of messages){if(!['draft','sending','sent','failed','unknown'].includes(message.state))rejectDiagnostic('uiFoundation.messageList.unknownSendState');requireIds(message.attachments,'Attachments','uiFoundation.messageList.invalidAttachmentIds');for(const attachment of message.attachments)if(attachment.size!==null&&(!Number.isFinite(attachment.size)||attachment.size<0))rejectDiagnostic('uiFoundation.messageList.invalidAttachmentSize');}return null;}catch(error){return text(error instanceof SpecialistDiagnostic ? error.id : 'uiFoundation.messageList.invalidData');}
}
export function chatCanSend(draft:ChatDraft):boolean{return !!draft.text.trim()||draft.attachments.length>0;}
/** Escape neither changes markdown semantics nor grants trust. Only explicit safe URL schemes are accepted. */
export function safeEditorUrl(raw:string,allowImage=false):string|null {
  try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)&&!(url.protocol==='mailto:'&&!allowImage))return null;if(url.username||url.password)return null;return url.href;}catch{return null;}
}

export function chartLocaleProblem(locale:string,timeZone:string|null,numberOptions:Intl.NumberFormatOptions,dateTimeOptions:Intl.DateTimeFormatOptions,hasTimeAxis:boolean, text: UiMessageText = japaneseText):string|null{if(hasTimeAxis&&(timeZone===null||!timeZone.trim()))return text("uiFoundation.chart.specifyTheTimeAxisTimeZone");if(dateTimeOptions.timeZone!==undefined)return text("uiFoundation.chart.specifyTheTimeAxisTimeZoneInIts");try{new Intl.NumberFormat(locale,numberOptions);new Intl.DateTimeFormat(locale,{...dateTimeOptions,timeZone:timeZone??'UTC'});}catch{return text("uiFoundation.chart.checkTheChartLocaleNumberFormatAndDate");}return null;}
