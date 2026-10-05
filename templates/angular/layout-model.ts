export type LayoutSpace = 'none' | 'compact' | 'normal' | 'wide';
export const layoutSpace = (value: LayoutSpace): string => ({none:'0',compact:'var(--ui-space-control-gap)',normal:'var(--ui-space-field)',wide:'var(--ui-space-section)'}[value]);
export interface LayoutBreakpoint { minWidth: number; columns: number; rows?: number }
export interface GridPlacement { minWidth: number; column?: number; row?: number; columnSpan?: number; rowSpan?: number }
export function positiveInteger(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }
export function gridAtWidth(width: number, columns: number, rows: number, breakpoints: readonly LayoutBreakpoint[]): {columns:number;rows:number} {
 if (!positiveInteger(columns) || !positiveInteger(rows) || !Number.isFinite(width) || width<0 || breakpoints.some(item=>!Number.isFinite(item.minWidth)||item.minWidth<0||!positiveInteger(item.columns)||item.rows!==undefined&&!positiveInteger(item.rows)) || new Set(breakpoints.map(item=>item.minWidth)).size!==breakpoints.length) throw new Error('ui-grid requires positive column/row counts and unique nonnegative breakpoints.');
 const point=[...breakpoints].sort((a,b)=>b.minWidth-a.minWidth).find(item=>item.minWidth<=width);return {columns:point?.columns??columns,rows:point?.rows??rows};
}
export function splitterBounds(min: number, max: number, ratio: number): number {
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max>100||min>=max||!Number.isFinite(ratio))throw new Error('ui-splitter requires 0 <= minRatio < maxRatio <= 100 and a finite ratio.');return Math.max(min,Math.min(max,ratio));
}
