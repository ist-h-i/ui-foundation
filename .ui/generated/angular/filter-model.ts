import {uiMessageText as createUiMessageText, type UiMessageText} from './stable-messages';
const japaneseText = createUiMessageText(() => 'ja-JP');
/** Serializable UI conditions. No SQL, code evaluation, network or persistence. */
export type FilterFieldType = 'text' | 'number' | 'date' | 'boolean' | 'choice';
export type FilterOperator = 'contains' | 'startsWith' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'before' | 'after' | 'missing' | 'present';
export interface FilterField { id: string; label: string; type: FilterFieldType; options?: readonly { value: string; label: string }[]; }
export interface FilterRule { type: 'rule'; id: string; field: string; operator: FilterOperator; value?: string | number | boolean; }
export interface FilterGroup { type: 'group'; id: string; match: 'and' | 'or'; children: readonly FilterNode[]; }
export type FilterNode = FilterRule | FilterGroup;
export interface FilterProblem { nodeId: string; message: string; }
const common: readonly FilterOperator[] = ['eq', 'neq', 'missing', 'present'];
export function filterOperators(type: FilterFieldType): readonly FilterOperator[] {
  if (type === 'text') return ['contains', 'startsWith', ...common];
  if (type === 'number') return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'missing', 'present'];
  if (type === 'date') return ['eq', 'neq', 'before', 'after', 'missing', 'present'];
  return common;
}
export function emptyFilter(id = 'root'): FilterGroup { return { type: 'group', id, match: 'and', children: [] }; }
export function filterStructureError(source: unknown, text: UiMessageText = japaneseText): string | null {
  const ids = new Set<string>(), seen = new WeakSet<object>();
  const visit = (candidate: unknown): string | null => {
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) return text("uiFoundation.filterBuilder.checkTheCriteriaStructureForInvalidEntriesOr");
    seen.add(candidate); const node = candidate as Partial<FilterNode>;
    if (typeof node.id !== 'string' || !node.id.trim() || ids.has(node.id)) return text("uiFoundation.filterBuilder.useAUniqueNonemptyStringForEachCriterion");
    ids.add(node.id);
    if (node.type === 'rule') return typeof node.field === 'string' && typeof node.operator === 'string' ? null : text("uiFoundation.filterBuilder.checkTheCriterionFieldAndOperator");
    if (node.type !== 'group' || !['and', 'or'].includes(node.match!) || !Array.isArray(node.children)) return text("uiFoundation.filterBuilder.checkTheCriteriaGroupAndItsAndOr");
    for (const child of node.children) { const error = visit(child); if (error) return error; }
    return null;
  };
  if ((source as Partial<FilterGroup> | null)?.type !== 'group') return text("uiFoundation.filterBuilder.useACriteriaGroupAtTheRoot");
  return visit(source);
}
export function decimalFilterValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const number = Number(value); return Number.isFinite(number) ? number : null;
}
export function dateFilterValue(value: unknown): number | null {
  const text = value instanceof Date && Number.isFinite(value.valueOf()) ? value.toISOString().slice(0, 10) : value;
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(text + 'T00:00:00.000Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === text ? date.valueOf() : null;
}
function operand(value: unknown, type: FilterFieldType, rule: boolean): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (type === 'number') return rule ? decimalFilterValue(value) : typeof value === 'number' && Number.isFinite(value) ? value : null;
  if (type === 'date') return dateFilterValue(value);
  if (type === 'boolean') return typeof value === 'boolean' ? value : rule && (value === 'true' || value === 'false') ? value === 'true' : null;
  return typeof value === 'string' ? value : null;
}
export function filterProblems(root: unknown, fields: readonly FilterField[], text: UiMessageText = japaneseText): readonly FilterProblem[] {
  const structure = filterStructureError(root); if (structure) return [{ nodeId: 'root', message: structure }];
  const byId = new Map<string, FilterField>();
  for (const field of fields) {
    if (!field || typeof field.id !== 'string' || typeof field.label !== 'string' || !field.id.trim() || !field.label.trim() || !['text', 'number', 'date', 'boolean', 'choice'].includes(field.type) || byId.has(field.id)) return [{ nodeId: (root as FilterGroup).id, message: text("uiFoundation.filterBuilder.checkTheCriteriaFieldIdsDescriptionsAndTypes") }];
    const values = new Set<string>();
    if (field.type === 'choice' && field.options !== undefined && !Array.isArray(field.options)) return [{ nodeId: (root as FilterGroup).id, message: text("uiFoundation.filterBuilder.provideTheOptionsAsAnArray") }];
    if (field.type === 'choice') for (const option of field.options ?? []) { if (!option || typeof option.value !== 'string' || typeof option.label !== 'string' || !option.label.trim() || values.has(option.value)) return [{ nodeId: (root as FilterGroup).id, message: text("uiFoundation.filterBuilder.checkTheOptionValuesAndDescriptionsAndLook") }]; values.add(option.value); }
    byId.set(field.id, field);
  }
  const result: FilterProblem[] = [];
  const visit = (node: FilterNode): void => {
    if (node.type === 'group') { node.children.forEach(visit); return; }
    const field = byId.get(node.field);
    if (!field) { result.push({ nodeId: node.id, message: text("uiFoundation.filterBuilder.chooseAFieldForTheCriterion") }); return; }
    if (!filterOperators(field.type).includes(node.operator)) { result.push({ nodeId: node.id, message: text("uiFoundation.filterBuilder.chooseAnOperatorSupportedByThisField") }); return; }
    if (node.operator === 'missing' || node.operator === 'present') return;
    if (operand(node.value, field.type, true) === null || field.type === 'choice' && !(field.options ?? []).some(option => option.value === node.value)) result.push({ nodeId: node.id, message: field.type === 'date' ? text("uiFoundation.filterBuilder.enterAValidDateInYyyyMmDd") : field.type === 'number' ? text("uiFoundation.filterBuilder.enterAFiniteNumber") : field.type === 'boolean' ? text("uiFoundation.filterBuilder.chooseYesOrNo") : text("uiFoundation.filterBuilder.provideAValueForTheCriterion") });
  };
  visit(root as FilterGroup); return result;
}
export function editFilter(root: FilterGroup, id: string, update: (node: FilterNode) => FilterNode): FilterGroup {
  const visit = (node: FilterNode): FilterNode => node.id === id ? update(node) : node.type === 'group' ? { ...node, children: node.children.map(visit) } : node;
  const next = visit(root); if (next.type !== 'group') throw new Error('The filter root must remain a group.'); return next;
}
export function removeFilter(root: FilterGroup, id: string): FilterGroup {
  if (root.id === id) return emptyFilter(root.id);
  const visit = (group: FilterGroup): FilterGroup => ({ ...group, children: group.children.filter(child => child.id !== id).map(child => child.type === 'group' ? visit(child) : child) });
  return visit(root);
}
export function cloneFilter(root: FilterGroup): FilterGroup {
  const visit = (node: FilterNode): FilterNode => node.type === 'group' ? { type: 'group', id: node.id, match: node.match, children: node.children.map(visit) } : { type: 'rule', id: node.id, field: node.field, operator: node.operator, ...(node.value === undefined ? {} : { value: node.value }) };
  return visit(root) as FilterGroup;
}
/** Empty groups are omitted from matching. Missing values only match explicit missing. */
export function compileFilter(root: FilterGroup, fields: readonly FilterField[], locale = 'ja-JP'): (row: Readonly<Record<string, unknown>>) => boolean {
  const problems = filterProblems(root, fields); if (problems.length) throw new Error(problems.map(problem => problem.message).join(' '));
  const snapshot = cloneFilter(root), byId = new Map(fields.map(field => [field.id, { ...field }]));
  const rule = (node: FilterRule, row: Readonly<Record<string, unknown>>): boolean => {
    const field = byId.get(node.field)!, actual = operand(Object.prototype.hasOwnProperty.call(row, field.id) ? row[field.id] : undefined, field.type, false);
    if (node.operator === 'missing') return actual === null;
    if (node.operator === 'present') return actual !== null;
    if (actual === null) return false;
    const expected = operand(node.value, field.type, true)!;
    const a = typeof actual === 'string' ? actual.toLocaleLowerCase(locale) : actual, b = typeof expected === 'string' ? expected.toLocaleLowerCase(locale) : expected;
    if (node.operator === 'contains') return String(a).includes(String(b));
    if (node.operator === 'startsWith') return String(a).startsWith(String(b));
    if (node.operator === 'eq') return a === b;
    if (node.operator === 'neq') return a !== b;
    if (node.operator === 'gt' || node.operator === 'after') return a > b;
    if (node.operator === 'lt' || node.operator === 'before') return a < b;
    if (node.operator === 'gte') return a >= b;
    return a <= b;
  };
  type Predicate = (row: Readonly<Record<string, unknown>>) => boolean;
  const build = (node: FilterNode): Predicate | null => {
    if (node.type === 'rule') return row => rule(node, row);
    const children = node.children.map(build).filter((child): child is Predicate => child !== null);
    if (!children.length) return null;
    return node.match === 'and' ? row => children.every(child => child(row)) : row => children.some(child => child(row));
  };
  const predicate = build(snapshot); return row => predicate?.(row) ?? true;
}
