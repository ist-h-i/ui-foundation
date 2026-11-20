import { uiMessageText, type UiMessageText, type UiStaticMessageId } from './stable-messages';

const japaneseText = uiMessageText(() => 'ja-JP');
import { tableText, tableValue, type TableColumn, type TableKey, type TableState } from './table-model';
/** Preserve accepted UTF-16 identities; the %u namespace cannot occur in URI encoding. */
export function tableDomIdToken(id: string): string {
    try { return encodeURIComponent(id); }
    catch { return '%u' + id.split('').map(unit => unit.charCodeAt(0).toString(16).padStart(4, '0')).join(''); }
}
/** Tuple boundaries remain distinct even when accepted identities contain hyphens. */
export function tableDomIdPair(first: string, second: string): string {
    return tableDomIdToken(first).replace(/-/g, '%2D') + '-' + tableDomIdToken(second).replace(/-/g, '%2D');
}
/** A local edit contract. Persistence, permission checks and undo remain app-owned. */
export interface TableEditableColumn<T extends object = Record<string, unknown>> extends TableColumn<T> {
    editable?: boolean;
    required?: boolean;
    minimum?: number;
    maximum?: number;
    parseDraft?: (raw: string, row: T) => unknown;
    validateValue?: (value: unknown, draftRow: T, originalRow: T) => string | null;
}
export interface TableEditChange {
    column: string;
    field: string;
    previousValue: unknown;
    value: unknown;
    raw: string;
}
export interface TableEditRequest<T extends object> {
    requestId: number;
    key: TableKey;
    row: T;
    changes: readonly TableEditChange[];
    value: T;
}
export type TableDraftResult = {
    valid: true;
    value: unknown;
} | {
    valid: false;
    message: string;
    messageText?: () => string;
};
export function tableDraft(value: unknown): string {
    return value === null || value === undefined ? '' : value instanceof Date ? Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '' : String(value);
}
function validCivil(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const [year, month, day] = value.split('-').map(Number), date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
/** Blank nullable values and incomplete/invalid drafts remain distinct. */
export function parseTableDraft<T extends object>(raw: string, column: TableEditableColumn<T>, row: T, text?: UiMessageText): TableDraftResult {
    const invalid = (id: UiStaticMessageId): TableDraftResult => {
        const messageText = () => (text ?? japaneseText)(id);
        return { valid: false, message: messageText(), ...(text ? { messageText } : {}) };
    };
    if (column.required && !raw.trim())
        return invalid('uiFoundation.tableEdit.valueRequired');
    let value: unknown;
    try {
        if (column.parseDraft)
            value = column.parseDraft(raw, row);
        else if (!raw.length && column.type !== 'text')
            value = null;
        else if (column.type === 'number') {
            if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) || !Number.isFinite(Number(raw)))
                return invalid('uiFoundation.tableEdit.numberRequired');
            value = Number(raw);
        }
        else if (column.type === 'boolean') {
            if (!['true', 'false'].includes(raw))
                return invalid('uiFoundation.tableEdit.booleanRequired');
            value = raw === 'true';
        }
        else if (column.type === 'date') {
            if (!validCivil(raw))
                return invalid('uiFoundation.tableEdit.validDateRequired');
            value = raw;
        }
        else
            value = raw;
    }
    catch {
        return invalid('uiFoundation.tableEdit.unreadableDraft');
    }
    if (column.required && (value === null || value === undefined || typeof value === 'string' && !value.trim()))
        return invalid('uiFoundation.tableEdit.valueRequired');
    if (column.type === 'number' && value !== null && (typeof value !== 'number' || !Number.isFinite(value)))
        return invalid('uiFoundation.tableEdit.numberRequired');
    if (column.type === 'boolean' && value !== null && typeof value !== 'boolean')
        return invalid('uiFoundation.tableEdit.booleanRequired');
    if (column.type === 'date' && value !== null && (typeof value !== 'string' || !validCivil(value)))
        return invalid('uiFoundation.tableEdit.validDateRequired');
    if (column.options && value !== null && !column.options.some(option => option.value === String(value)))
        return invalid('uiFoundation.tableEdit.optionRequired');
    if (typeof value === 'number' && (column.minimum !== undefined && value < column.minimum || column.maximum !== undefined && value > column.maximum))
        return invalid('uiFoundation.tableEdit.outOfRange');
    return { valid: true, value };
}
export function tableEditProblem<T extends object>(columns: readonly TableEditableColumn<T>[], keyField?: keyof T & string, text: UiMessageText = japaneseText): string | null {
    if (new Set(columns.map(column => column.id)).size !== columns.length || columns.some(column => !column.id.trim() || !column.header.trim() || !column.field.trim()))
        return text('uiFoundation.tableEdit.invalidEditableColumns');
    if (columns.some(column => [column.minimum, column.maximum].some(value => value !== undefined && !Number.isFinite(value)) || column.minimum !== undefined && column.maximum !== undefined && column.minimum > column.maximum))
        return text('uiFoundation.tableEdit.invalidEditBounds');
    if (keyField && columns.some(column => column.field === keyField && column.editable === true))
        return text('uiFoundation.tableEdit.rowKeyImmutable');
    return null;
}
export function validateTableRowDraft<T extends object>(row: T, columns: readonly TableEditableColumn<T>[], raw: Readonly<Record<string, string>>, keyField: keyof T & string, text?: UiMessageText): {
    errorText?: Readonly<Record<string,()=>string>>;
    value: T;
    changes: readonly TableEditChange[];
    errors: Readonly<Record<string, string>>;
} {
    const errorText:Record<string,()=>string>=Object.create(null);
    const changes: TableEditChange[] = [], errors: Record<string, string> = Object.create(null), value = { ...row };
    for (const column of columns) {
        if (column.editable === false || column.field === keyField || !Object.hasOwn(raw, column.id))
            continue;
        if (!Object.hasOwn(row, column.field)) {
            errorText[column.id] = () => (text ?? japaneseText)('uiFoundation.tableEdit.missingOriginalValue');
            errors[column.id] = errorText[column.id]();
            continue;
        }
        const result = parseTableDraft(raw[column.id], column, row, text);
        if (!result.valid) {
            errors[column.id] = result.message;errorText[column.id]=result.messageText??(()=>result.message);
            continue;
        }
        (value as Record<string, unknown>)[column.field] = result.value;
        changes.push({ column: column.id, field: column.field, previousValue: tableValue(row, column), value: result.value, raw: raw[column.id] });
    }
    for (const column of columns) {
        if (!changes.some(change => change.column === column.id) || !column.validateValue)
            continue;
        try {
            const error = column.validateValue((value as Record<string, unknown>)[column.field], value, row);
            if (error)
                {errors[column.id] = error;errorText[column.id]=()=>error;}
        }
        catch {
            errorText[column.id] = () => (text ?? japaneseText)('uiFoundation.tableEdit.draftValidationFailed');
            errors[column.id] = errorText[column.id]();
        }
    }
    return { value, changes, errors, ...(text?{errorText}:{}) };
}
export function tableEditStillCurrent<T extends object>(request: TableEditRequest<T>, row: T, keyField: keyof T & string): boolean {
    return row[keyField] === request.key && request.changes.every(change => Object.hasOwn(row, change.field) && Object.is((row as Record<string, unknown>)[change.field], change.previousValue));
}
export interface TableHeaderGroup {
    id: string;
    label: string;
    children: readonly (string | TableHeaderGroup)[];
}
export interface TableHeaderCell {
    id: string;
    label: string;
    kind: 'group' | 'column';
    columnId: string | null;
    columns: readonly string[];
    colSpan: number;
    rowSpan: number;
}
function headerPaths<T extends object>(columns: readonly TableColumn<T>[], groups: readonly TableHeaderGroup[], text: UiMessageText = japaneseText): Map<string, readonly TableHeaderGroup[]> {
    const known = new Set(columns.map(column => column.id)), used = new Set<string>(), ids = new Set<string>(), ancestors = new Set<TableHeaderGroup>(), paths = new Map<string, readonly TableHeaderGroup[]>();
    const walk = (children: readonly (string | TableHeaderGroup)[], path: readonly TableHeaderGroup[]): void => {
        for (const child of children) {
            if (typeof child === 'string') {
                if (!known.has(child) || used.has(child))
                    throw new Error(text('uiFoundation.tableHeader.unknownOrDuplicateColumn'));
                used.add(child);
                paths.set(child, path);
            }
            else {
                if (!child || !child.id.trim() || !child.label.trim() || !child.children.length || ids.has(child.id) || ancestors.has(child) || path.length > 50)
                    throw new Error(text('uiFoundation.tableHeader.invalidGroupHierarchy'));
                ids.add(child.id);
                ancestors.add(child);
                walk(child.children, [...path, child]);
                ancestors.delete(child);
            }
        }
    };
    walk(groups, []);
    for (const column of columns)
        if (!paths.has(column.id))
            paths.set(column.id, []);
    return paths;
}
export function tableHeaderProblem<T extends object>(columns: readonly TableColumn<T>[], groups: readonly TableHeaderGroup[], text: UiMessageText = japaneseText): string | null {
    try {
        headerPaths(columns, groups, text);
        return null;
    }
    catch (error) {
        return error instanceof Error ? error.message : text('uiFoundation.tableHeader.invalidGroups');
    }
}
/** Reordered split groups become separate native header cells; hidden columns do not leave holes. */
export function tableHeaderRows<T extends object>(columns: readonly TableColumn<T>[], groups: readonly TableHeaderGroup[], allColumns: readonly TableColumn<T>[] = columns, prefix = 'table'): readonly (readonly TableHeaderCell[])[] {
    const paths = headerPaths(allColumns, groups), depth = Math.max(0, ...columns.map(column => paths.get(column.id)!.length)), rows: TableHeaderCell[][] = [];
    for (let level = 0; level <= depth; level++) {
        const cells: TableHeaderCell[] = [];
        let index = 0;
        while (index < columns.length) {
            const column = columns[index], path = paths.get(column.id)!;
            if (path.length < level) {
                index++;
                continue;
            }
            if (path.length === level) {
                cells.push({ id: `${prefix}-header-${tableDomIdToken(column.id)}`, label: column.header, kind: 'column', columnId: column.id, columns: [column.id], colSpan: 1, rowSpan: depth - level + 1 });
                index++;
                continue;
            }
            const group = path[level], members = [column.id];
            let end = index + 1;
            while (end < columns.length) {
                const other = paths.get(columns[end].id)!;
                if (other.length <= level || other.slice(0, level + 1).some((item, i) => item.id !== path[i].id))
                    break;
                members.push(columns[end].id);
                end++;
            }
            cells.push({ id: `${prefix}-group-${tableDomIdPair(group.id, column.id)}`, label: group.label, kind: 'group', columnId: null, columns: members, colSpan: members.length, rowSpan: 1 });
            index = end;
        }
        rows.push(cells);
    }
    return rows;
}
export function tableCellHeaders(rows: readonly (readonly TableHeaderCell[])[], column: string): string { return rows.flatMap(row => row.filter(cell => cell.columns.includes(column)).map(cell => cell.id)).join(' '); }
export type TableAggregateKind = 'sum' | 'average' | 'min' | 'max' | 'count';
export interface TableAggregate {
    column: string;
    kind: TableAggregateKind;
    label?: string;
}
export interface TableAggregateValue extends TableAggregate {
    value: number | null;
    known: number;
    missing: number;
}
export function aggregateTable<T extends object>(rows: readonly T[], columns: readonly TableColumn<T>[], definitions: readonly TableAggregate[]): readonly TableAggregateValue[] {
    return definitions.map(definition => {
        const column = columns.find(item => item.id === definition.column);
        if (!column)
            throw new Error('集計列がありません。');
        if (!['sum', 'average', 'min', 'max', 'count'].includes(definition.kind))
            throw new Error('集計方法が不正です。');
        const values = rows.map(row => tableValue(row, column)).filter(value => {
            if (value === null || value === undefined || typeof value === 'number' && !Number.isFinite(value))
                return false;
            if (definition.kind !== 'count')
                return typeof value === 'number' && Number.isFinite(value);
            if (column.type === 'number')
                return typeof value === 'number' && Number.isFinite(value);
            if (column.type === 'boolean')
                return typeof value === 'boolean';
            if (column.type === 'date')
                return value instanceof Date ? Number.isFinite(value.getTime()) : typeof value === 'string' && Number.isFinite(Date.parse(value));
            return true;
        });
        const known = values.length, numbers = values as number[];
        const value = definition.kind === 'count' ? known : !known ? null : definition.kind === 'sum' ? numbers.reduce((a, b) => a + b, 0) : definition.kind === 'average' ? numbers.reduce((a, b) => a + b, 0) / known : definition.kind === 'min' ? numbers.reduce((a, b) => Math.min(a, b)) : numbers.reduce((a, b) => Math.max(a, b));
        return { ...definition, value, known, missing: rows.length - known };
    });
}
export interface TableRowGroup<T extends object> {
    id: string;
    column: string;
    label: string;
    level: number;
    rows: readonly T[];
    children: readonly TableRowGroup<T>[];
    aggregates: readonly TableAggregateValue[];
}
export type TableGroupEntry<T extends object> = {
    kind: 'group';
    group: TableRowGroup<T>;
    hidden: boolean;
} | {
    kind: 'row';
    row: T;
    hidden: boolean;
};
export function groupTable<T extends object>(rows: readonly T[], columns: readonly TableColumn<T>[], by: readonly string[], aggregates: readonly TableAggregate[] = [], locale = 'ja-JP', missing = '未取得', numberOptions:Intl.NumberFormatOptions={}, text: UiMessageText = uiMessageText(() => locale)): readonly TableRowGroup<T>[] {
    if (new Set(by).size !== by.length || by.some(id => !columns.some(column => column.id === id)))
        throw new Error('グループ列を一意な列IDにしてください。');
    const walk = (items: readonly T[], level: number, path: readonly string[]): readonly TableRowGroup<T>[] => {
        if (level >= by.length)
            return [];
        const column = columns.find(item => item.id === by[level])!, buckets = new Map<string, {
            label: string;
            rows: T[];
        }>();
        for (const row of items) {
            const raw = tableValue(row, column), stamp = column.type === 'date' ? (raw instanceof Date ? raw.getTime() : typeof raw === 'string' ? Date.parse(raw) : NaN) : null;
            const value = raw === null || raw === undefined || typeof raw === 'number' && !Number.isFinite(raw) || column.type === 'number' && typeof raw !== 'number' || column.type === 'boolean' && typeof raw !== 'boolean' || column.type === 'date' && !Number.isFinite(stamp) ? null : column.type === 'date' ? stamp : column.type === 'number' || column.type === 'boolean' ? raw : String(raw);
            const identity = JSON.stringify([value === null ? 'missing' : column.type ?? 'text', value]);
            let bucket = buckets.get(identity);
            if (!bucket) {
                bucket = { label: tableText(row, column, locale, missing,numberOptions,text), rows: [] };
                buckets.set(identity, bucket);
            }
            bucket.rows.push(row);
        }
        return [...buckets].map(([identity, bucket]) => { const current = [...path, column.id, identity]; return { id: JSON.stringify(current), column: column.id, label: bucket.label, level: level + 1, rows: bucket.rows, children: walk(bucket.rows, level + 1, current), aggregates: aggregateTable(bucket.rows, columns, aggregates) }; });
    };
    return walk(rows, 0, []);
}
/** Hidden entries stay in the DOM in the full table, retaining editor and detail drafts. */
export function flattenTableGroups<T extends object>(groups: readonly TableRowGroup<T>[], collapsed: readonly string[], hidden = false): readonly TableGroupEntry<T>[] { return groups.flatMap(group => [{ kind: 'group' as const, group, hidden }, ...(group.children.length ? flattenTableGroups(group.children, collapsed, hidden || collapsed.includes(group.id)) : group.rows.map(row => ({ kind: 'row' as const, row, hidden: hidden || collapsed.includes(group.id) })))]); }
export interface GridCell {
    row: number;
    column: number;
}
export interface GridRange {
    anchor: GridCell;
    focus: GridCell;
}
export function gridCellMove(cell: GridCell, key: string, rowCount: number, columnCount: number, control = false, pageRows = 10, rtl = false): GridCell {
    if (!rowCount || !columnCount)
        return { row: 0, column: 0 };
    let { row, column } = cell;
    switch (key) {
        case 'ArrowDown':
            row++;
            break;
        case 'ArrowUp':
            row--;
            break;
        case 'ArrowRight':
            column += rtl ? -1 : 1;
            break;
        case 'ArrowLeft':
            column += rtl ? 1 : -1;
            break;
        case 'Home':
            column = 0;
            if (control)
                row = 0;
            break;
        case 'End':
            column = columnCount - 1;
            if (control)
                row = rowCount - 1;
            break;
        case 'PageDown':
            row += pageRows;
            break;
        case 'PageUp':
            row -= pageRows;
            break;
    }
    return { row: Math.min(rowCount - 1, Math.max(0, row)), column: Math.min(columnCount - 1, Math.max(0, column)) };
}
export function gridRangeContains(range: GridRange, cell: GridCell): boolean { return cell.row >= Math.min(range.anchor.row, range.focus.row) && cell.row <= Math.max(range.anchor.row, range.focus.row) && cell.column >= Math.min(range.anchor.column, range.focus.column) && cell.column <= Math.max(range.anchor.column, range.focus.column); }
export function gridRangeCells(range: GridRange): readonly GridCell[] {
    const result: GridCell[] = [];
    for (let row = Math.min(range.anchor.row, range.focus.row); row <= Math.max(range.anchor.row, range.focus.row); row++)
        for (let column = Math.min(range.anchor.column, range.focus.column); column <= Math.max(range.anchor.column, range.focus.column); column++)
            result.push({ row, column });
    return result;
}
export type TableOutputScope = 'page' | 'filtered' | 'selected' | 'supplied';
export function tableOutputRows<T extends object>(scope: TableOutputScope, supplied: readonly T[], filtered: readonly T[], page: readonly T[], selected: readonly TableKey[], key: (row: T) => TableKey): readonly T[] { return scope === 'page' ? page : scope === 'filtered' ? filtered : scope === 'selected' ? supplied.filter(row => selected.includes(key(row))) : supplied; }
export function tableOutputMatrix<T extends object>(rows: readonly T[], columns: readonly TableColumn<T>[], locale = 'ja-JP', missing = '未取得', headers = true, numberOptions: Intl.NumberFormatOptions = {}, text: UiMessageText = uiMessageText(() => locale)): readonly (readonly string[])[] { return [...(headers ? [columns.map(column => column.header)] : []), ...rows.map(row => columns.map(column => tableText(row, column, locale, missing, numberOptions, text)))]; }
export function serializeTableMatrix(matrix: readonly (readonly string[])[], delimiter: '\t' | ',' = '\t', safeFormulas = delimiter === ','): string {
    return matrix.map(row => row.map(original => {
        let value = original;
        if (safeFormulas && /^[\s]*[=+@-]/.test(value) && !/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/.test(value))
            value = "'" + value;
        return value.includes(delimiter) || /["\r\n]/.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value;
    }).join(delimiter)).join('\r\n');
}
/** Strict quoted TSV/CSV: malformed quotes fail instead of inventing a partial paste. */
export function parseTableMatrix(text: string, delimiter: '\t' | ',' = '\t'): readonly (readonly string[])[] {
    const rows: string[][] = [], row: string[] = [];
    let value = '', quoted = false, closed = false;
    const field = () => { row.push(value); value = ''; closed = false; };
    const line = () => { field(); rows.push([...row]); row.length = 0; };
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (quoted) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    value += '"';
                    index++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                value += char;
            continue;
        }
        if (char === '"') {
            if (value.length || closed)
                throw new Error('貼付け内容の引用符が不正です。');
            quoted = true;
            continue;
        }
        if (char === delimiter) {
            field();
            continue;
        }
        if (char === '\r' || char === '\n') {
            if (char === '\r' && text[index + 1] === '\n')
                index++;
            line();
            continue;
        }
        if (closed)
            throw new Error('引用符の後に区切り以外の文字があります。');
        value += char;
    }
    if (quoted)
        throw new Error('貼付け内容の引用符が閉じていません。');
    if (value.length || row.length || closed || !rows.length)
        line();
    const width = rows[0]?.length ?? 0;
    if (rows.some(item => item.length !== width))
        throw new Error('貼付ける行の列数を揃えてください。');
    return rows;
}
export interface TablePasteResult<T extends object> {
    requests: readonly Omit<TableEditRequest<T>, 'requestId'>[];
    errors: readonly string[];
    errorText?: readonly (()=>string)[];
}
export function prepareTablePaste<T extends object>(rows: readonly T[], columns: readonly TableEditableColumn<T>[], keyField: keyof T & string, start: GridCell, matrix: readonly (readonly string[])[], text?: UiMessageText): TablePasteResult<T> {
    const errorText:(()=>string)[]=[];
    const translate = text ?? japaneseText;
    const add = (format: () => string): string => {
        errorText.push(format);
        return format();
    };
    const requests: Omit<TableEditRequest<T>, 'requestId'>[] = [], errors: string[] = [];
    if (!Number.isSafeInteger(start.row) || !Number.isSafeInteger(start.column) || start.row < 0 || start.column < 0 || !matrix.length || matrix.some(item => item.length !== matrix[0].length) || start.row + matrix.length > rows.length || start.column + matrix[0].length > columns.length)
        return { requests: [], errors: [add(() => translate('uiFoundation.tablePaste.rangeOutsideTable'))], ...(text?{errorText}:{}) };
    matrix.forEach((line, index) => {
        const row = rows[start.row + index], raw: Record<string, string> = Object.create(null);
        line.forEach((value, offset) => {
            const column = columns[start.column + offset];
            if (column.field === keyField || column.editable === false)
                errors.push(add(() => translate('uiFoundation.tablePaste.readonlyCell', { row: start.row + index + 1, column: column.header })));
            else
                raw[column.id] = value;
        });
        const result = validateTableRowDraft(row, columns, raw, keyField, text);
        for (const [id, message] of Object.entries(result.errors))
            errors.push(add(() => translate('uiFoundation.tablePaste.invalidCell', { row: start.row + index + 1, column: columns.find(column => column.id === id)?.header ?? id, message: result.errorText?.[id]?.() ?? message })));
        requests.push({ key: row[keyField] as TableKey, row, value: result.value, changes: result.changes });
    });
    return { requests: errors.length ? [] : requests, errors, ...(text?{errorText}:{}) };
}
export function cloneTableState(state: TableState): TableState { return { ...state, sort: state.sort.map(item => ({ ...item })), filters: state.filters.map(filter => ({ ...filter, constraints: filter.constraints.map(rule => ({ ...rule })) })), columnOrder: [...state.columnOrder], hiddenColumns: [...state.hiddenColumns], columnWidths: { ...state.columnWidths }, pinnedColumns: { ...state.pinnedColumns } }; }
