import {uiMessage,type UiMessages} from './locale-model';
/** Pure client-side table operations. Server mode does not call this pipeline. */
export type TableKey = string | number;
export type TableColumnType = 'text' | 'number' | 'date' | 'boolean';
export interface TableColumn<T extends object = Record<string, unknown>> {
  id: string;
  field: keyof T & string;
  header: string;
  type?: TableColumnType;
  format?: (value: unknown, row: T) => string;
  sortable?: boolean;
  filterable?: boolean;
  options?: readonly { value: string; label: string }[];
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  pinned?: 'start' | 'end';
}
export interface TableSort { column: string; direction: 'asc' | 'desc' }
export type TableOperator = 'contains' | 'startsWith' | 'eq' | 'gte' | 'lte' | 'before' | 'after' | 'missing';
export interface TableConstraint { operator: TableOperator; value?: string | number | boolean }
export interface TableFilter { column: string; match: 'and' | 'or'; constraints: readonly TableConstraint[] }
export interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sort: readonly TableSort[];
  filters: readonly TableFilter[];
  columnOrder: readonly string[];
  hiddenColumns: readonly string[];
  columnWidths: Readonly<Record<string, number>>;
  pinnedColumns: Readonly<Record<string, 'start' | 'end' | 'none'>>;
}
export function createTableState(pageSize = 10): TableState {
  return { page: 1, pageSize, search: '', sort: [], filters: [], columnOrder: [], hiddenColumns: [], columnWidths: {}, pinnedColumns: {} };
}

export function tableValue<T extends object>(row: T, column: TableColumn<T>): unknown { return row[column.field]; }
/** Column IDs are arbitrary strings; inherited properties are never configured entries. */
export function tableOwnValue<V>(record: Readonly<Record<string, V>>, id: string): V | undefined { return Object.hasOwn(record, id) ? record[id] : undefined; }
export function tableText<T extends object>(row: T, column: TableColumn<T>, locale = 'ja-JP', missing = '未取得', numberOptions:Intl.NumberFormatOptions={}, messages:UiMessages={}): string {
  const value = tableValue(row, column);
  if (typed(value, column.type) === null) return missing;
  if (column.format) return column.format(value, row);
  if (typeof value === 'number') return Number.isFinite(value) ? new Intl.NumberFormat(locale,numberOptions).format(value) : missing;
  if (typeof value === 'boolean') return uiMessage(value ? 'はい' : 'いいえ',messages);
  return String(value);
}
function typed(value: unknown, type: TableColumnType = 'text'): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : null;
  if (type === 'boolean') return typeof value === 'boolean' ? value : null;
  if (type === 'date') {
    const stamp = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(stamp) ? stamp : null;
  }
  return String(value);
}
function matches<T extends object>(row: T, column: TableColumn<T>, rule: TableConstraint, locale: string): boolean {
  const raw = tableValue(row, column);
  const value = typed(raw, column.type);
  if (rule.operator === 'missing') return value === null;
  if (rule.value === undefined) return true; // A chosen comparison with no input is inactive metadata.
  if (value === null) return false;
  if (rule.operator === 'contains' || rule.operator === 'startsWith') {
    const text = String(raw).toLocaleLowerCase(locale);
    const search = String(rule.value ?? '').toLocaleLowerCase(locale);
    return rule.operator === 'contains' ? text.includes(search) : text.startsWith(search);
  }
  const expected = column.type === 'number' ? Number(rule.value) : column.type === 'date'
    ? Date.parse(String(rule.value)) : column.type === 'boolean' ? rule.value === true || rule.value === 'true' : String(rule.value ?? '');
  if (typeof expected === 'number' && !Number.isFinite(expected)) return false;
  if (rule.operator === 'eq') return value === expected;
  if (typeof value !== 'number' || typeof expected !== 'number') return false;
  switch (rule.operator) {
    case 'gte': return value >= expected;
    case 'lte': return value <= expected;
    case 'before': return value < expected;
    case 'after': return value > expected;
    default: return false;
  }
}
export function queryTable<T extends object>(rows: readonly T[], columns: readonly TableColumn<T>[], state: TableState,
  options: { sort?: boolean; filters?: boolean; search?: boolean; searchColumns?: readonly string[]; locale?: string } = {}): T[] {
  const locale = options.locale ?? 'ja-JP';
  const byId = new Map(columns.map(column => [column.id, column]));
  const searchColumns = columns.filter(column => !options.searchColumns || options.searchColumns.includes(column.id));
  const query = state.search.trim().toLocaleLowerCase(locale);
  const result = rows.filter(row => {
    if (options.search !== false && query && !searchColumns.some(column => {
      const value = tableValue(row, column);
      return value !== null && value !== undefined && tableText(row, column, locale).toLocaleLowerCase(locale).includes(query);
    })) return false;
    if (options.filters !== false && !state.filters.every(filter => {
      const column = byId.get(filter.column);
      if (!column || column.filterable === false) return true;
      const values = filter.constraints.filter(rule => rule.operator === 'missing' || rule.value !== undefined).map(rule => matches(row, column, rule, locale));
      return filter.match === 'or' ? values.length === 0 || values.some(Boolean) : values.every(Boolean);
    })) return false;
    return true;
  });
  if (options.sort === false) return result;
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return result.sort((a, b) => {
    for (const sort of state.sort) {
      const column = byId.get(sort.column);
      if (!column || column.sortable === false) continue;
      const left = typed(tableValue(a, column), column.type);
      const right = typed(tableValue(b, column), column.type);
      // Missing always follows known values in either direction.
      if (left === null || right === null) { if (left !== right) return left === null ? 1 : -1; continue; }
      const order = typeof left === 'string' && typeof right === 'string' ? collator.compare(left, right)
        : left < right ? -1 : left > right ? 1 : 0;
      if (order) return sort.direction === 'asc' ? order : -order;
    }
    return 0; // Stable sort preserves input order for ties.
  });
}
export function nextTableSort(sort: readonly TableSort[], column: string, multiple: boolean): TableSort[] {
  const current = sort.find(item => item.column === column);
  const remaining = multiple ? sort.filter(item => item.column !== column) : [];
  return current?.direction === 'desc' ? remaining : [...remaining, { column, direction: current ? 'desc' : 'asc' }];
}

/** Widths are border-box pixels measured by the DOM adapter, never theme constants. */
export function fitTableColumns<T extends object>(columns: readonly TableColumn<T>[], available: number,
  minimum: number, explicit: Readonly<Record<string, number>>, natural: Readonly<Record<string, number>>, mode: 'content' | 'available', auto: boolean): Record<string, number> {
  const widths: Record<string, number> = Object.create(null);
  const flexible: TableColumn<T>[] = [];
  for (const column of columns) {
    const min = column.minWidth ?? minimum;
    const max = column.maxWidth ?? Infinity;
    const fixed = tableOwnValue(explicit, column.id) ?? column.width;
    widths[column.id] = Math.min(max, Math.max(min, fixed ?? (auto && mode === 'content' ? tableOwnValue(natural, column.id) ?? min : min)));
    if (fixed === undefined && auto && mode === 'available') flexible.push(column);
  }
  let remaining = available - Object.values(widths).reduce((a,b) => a+b, 0);
  let candidates = flexible;
  while (remaining > 0.01 && candidates.length) {
    const share = remaining / candidates.length;
    let added = 0;
    for (const column of candidates) {
      const next = Math.min(column.maxWidth ?? Infinity, widths[column.id] + share);
      added += next - widths[column.id]; widths[column.id] = next;
    }
    remaining -= added;
    candidates = candidates.filter(column => widths[column.id] < (column.maxWidth ?? Infinity));
    if (added < 0.01) break;
  }
  return widths;
}
export function tableConfigurationError<T extends object>(rows: readonly T[], columns: readonly TableColumn<T>[], key: keyof T & string, state: TableState): string | null {
  if (!columns.length || new Set(columns.map(c => c.id)).size !== columns.length || columns.some(c => !c.id.trim() || !c.header.trim())) return '列IDと見出しを一意に指定してください。';
  if (columns.every(column => state.hiddenColumns.includes(column.id))) return '少なくとも一列を表示してください。';
  const keys = rows.map(row => row[key]);
  if (keys.some(value => !(typeof value === 'string' && value.length > 0 || typeof value === 'number' && Number.isFinite(value))) || new Set(keys).size !== keys.length) return '行キーを一意な文字列または有限の数値にしてください。';
  if (!Number.isSafeInteger(state.page) || state.page < 1 || !Number.isSafeInteger(state.pageSize) || state.pageSize < 1) return 'ページと表示件数を正の整数にしてください。';
  if (columns.some(c => [c.width, c.minWidth, c.maxWidth].some(v => v !== undefined && (!Number.isFinite(v) || v <= 0)) || c.minWidth !== undefined && c.maxWidth !== undefined && c.minWidth > c.maxWidth)) return '列幅の範囲を確認してください。';
  if (Object.values(state.columnWidths).some(width => !Number.isFinite(width) || width <= 0)) return '保存した列幅を確認してください。';
  return null;
}
