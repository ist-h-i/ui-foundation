/** Stable UI read model. I/O, permissions and transport error normalization belong to the app. */
export interface TreeNode<T = unknown> {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly data?: T;
  readonly children?: readonly TreeNode<T>[];
  readonly hasChildren?: boolean;
  readonly disabled?: boolean;
  readonly selectable?: boolean;
  readonly checkable?: boolean;
}
export interface TreeEntry<T = unknown> {
  readonly node: TreeNode<T>;
  readonly path: readonly string[];
  readonly parentId: string | null;
  readonly level: number;
  readonly disabled: boolean;
  readonly position: number;
  readonly setSize: number;
}
export type TreeCheckState = 'true' | 'false' | 'mixed';
export interface TreeLoadRequest { readonly nodeId: string; readonly path: readonly string[]; readonly requestId: number; }
export interface TreeLoadCancellation extends TreeLoadRequest { readonly reason: 'collapse' | 'source-change' | 'reset' | 'invalidate' | 'destroy' | 'close'; }
export interface TreeLoadRecord<T = unknown> extends TreeLoadRequest {
  readonly status: 'loading' | 'error' | 'loaded';
  readonly children?: readonly TreeNode<T>[];
  readonly message?: string;
}
export type TreeLoads<T = unknown> = Readonly<Record<string, TreeLoadRecord<T>>>;

/** DOM IDs retain accepted UTF-16 keys. The %u namespace cannot occur in URI encoding. */
export function treeDomIdToken(id: string): string {
  try { return encodeURIComponent(id); }
  catch { return '%u' + id.split('').map(unit => unit.charCodeAt(0).toString(16).padStart(4, '0')).join(''); }
}

/** Validate before recursion: IDs are UI keys, not an authorization boundary. */
export function treeNodes<T>(nodes: readonly TreeNode<T>[]): readonly TreeNode<T>[] {
  if (!Array.isArray(nodes)) throw new Error('Tree nodes must be an array.');
  const ids = new Set<string>(), ancestors = new Set<TreeNode<T>>();
  let count = 0;
  const visit = (items: readonly TreeNode<T>[], depth: number): void => {
    if (depth > 100 || count > 10000) throw new Error('Tree exceeds the supported depth or node count.');
    for (const node of items) {
      if (!node || typeof node !== 'object' || typeof node.id !== 'string' || !node.id.trim() || /\s/.test(node.id) || typeof node.label !== 'string' || !node.label.trim()) throw new Error('Tree nodes require a nonempty, whitespace-free ID and a label.');
      if (ancestors.has(node)) throw new Error('Tree nodes must not contain cycles.');
      if (ids.has(node.id)) throw new Error('Tree node IDs must be unique: ' + node.id);
      ids.add(node.id); count++;
      if (count > 10000) throw new Error('Tree exceeds the supported node count.');
      if (node.children !== undefined) {
        if (!Array.isArray(node.children)) throw new Error('Tree children must be an array.');
        ancestors.add(node); visit(node.children, depth + 1); ancestors.delete(node);
      }
    }
  };
  visit(nodes, 1); return nodes;
}
export function treeBranch(node: TreeNode): boolean { return node.children !== undefined ? node.children.length > 0 : node.hasChildren === true; }
export function treeUnloaded(node: TreeNode): boolean { return node.hasChildren === true && node.children === undefined; }
export function treeEntries<T>(nodes: readonly TreeNode<T>[]): readonly TreeEntry<T>[] {
  const result: TreeEntry<T>[] = [];
  const visit = (items: readonly TreeNode<T>[], path: readonly string[], parentId: string | null, disabled: boolean): void => {
    items.forEach((node, index) => {
      const current = [...path, node.id], blocked = disabled || node.disabled === true;
      result.push({node, path: current, parentId, level: current.length, disabled: blocked, position: index + 1, setSize: items.length});
      visit(node.children ?? [], current, node.id, blocked);
    });
  };
  visit(nodes, [], null, false); return result;
}
export function treeEntry<T>(nodes: readonly TreeNode<T>[], id: string): TreeEntry<T> | null { return treeEntries(nodes).find(item => item.node.id === id) ?? null; }
export function treePath<T>(nodes: readonly TreeNode<T>[], id: string): readonly TreeNode<T>[] | null {
  const entry = treeEntry(nodes, id); if (!entry) return null;
  const all = new Map(treeEntries(nodes).map(item => [item.node.id, item.node]));
  return entry.path.map(key => all.get(key)!);
}
/** Loaded descendants retain ancestor context; incomplete branches are never called searched. */
export function treeFilter<T>(nodes: readonly TreeNode<T>[], query: string, locale = 'ja-JP'): readonly TreeNode<T>[] {
  const search = query.trim().normalize('NFKC').toLocaleLowerCase(locale); if (!search) return nodes;
  const visit = (items: readonly TreeNode<T>[]): readonly TreeNode<T>[] => items.flatMap(node => {
    const children = visit(node.children ?? []);
    const matches = [node.label, node.description ?? ''].join(' ').normalize('NFKC').toLocaleLowerCase(locale).includes(search);
    if (!matches && !children.length) return [];
    return [{...node, ...(node.children !== undefined ? {children} : {})}];
  });
  return visit(nodes);
}
export function treeVisible<T>(nodes: readonly TreeNode<T>[], expanded: readonly string[], query = '', locale = 'ja-JP'): readonly TreeEntry<T>[] {
  const entries = treeEntries(treeFilter(nodes, query, locale)), open = new Set(expanded);
  return entries.filter(item => query.trim() || item.path.slice(0, -1).every(id => open.has(id)));
}
export function treeComplete(node: TreeNode): boolean { return !treeUnloaded(node) && (node.children ?? []).every(child => child.disabled || treeComplete(child)); }

function eligible<T>(node: TreeNode<T>): readonly TreeNode<T>[] {
  if (node.disabled) return [];
  return [ ...(node.checkable === false ? [] : [node]), ...(node.children ?? []).flatMap(eligible) ];
}
/** Restored parent keys and restored leaf keys have the same linked selection meaning. */
function effectiveChecks<T>(nodes: readonly TreeNode<T>[], values: readonly string[]): Set<string> {
  const entries = treeEntries(nodes), next = new Set(values);
  for (const id of values) {
    const entry = entries.find(item => item.node.id === id);
    if (entry && !entry.disabled && entry.node.checkable !== false && treeComplete(entry.node)) for (const child of eligible(entry.node)) next.add(child.id);
  }
  for (const entry of [...entries].reverse()) {
    if (entry.disabled || entry.node.checkable === false || !treeBranch(entry.node) || !treeComplete(entry.node)) continue;
    const descendants = (entry.node.children ?? []).flatMap(eligible);
    if (descendants.length && descendants.every(node => next.has(node.id))) next.add(entry.node.id);
  }
  return next;
}
export function treeCheckState<T>(nodes: readonly TreeNode<T>[], values: readonly string[], id: string, linked = true): TreeCheckState {
  const entry = treeEntry(nodes, id); if (!entry) return 'false';
  if (!linked || entry.disabled) return values.includes(id) ? 'true' : 'false';
  const effective = effectiveChecks(nodes, values);
  if (!treeBranch(entry.node)) return effective.has(id) ? 'true' : 'false';
  const candidates = (entry.node.children ?? []).flatMap(eligible), selected = candidates.filter(node => effective.has(node.id));
  if (treeComplete(entry.node) && candidates.length && candidates.every(node => effective.has(node.id))) return 'true';
  if (treeComplete(entry.node) && !candidates.length) return effective.has(id) ? 'true' : 'false';
  return selected.length || values.includes(id) ? 'mixed' : 'false';
}
export function treeToggleCheck<T>(nodes: readonly TreeNode<T>[], values: readonly string[], id: string, checked: boolean, linked = true): readonly string[] {
  const entries = treeEntries(nodes), entry = entries.find(item => item.node.id === id);
  if (!entry || entry.disabled || entry.node.checkable === false || linked && !treeComplete(entry.node)) return values;
  const next = linked ? effectiveChecks(nodes, values) : new Set(values);
  for (const node of linked ? eligible(entry.node) : [entry.node]) checked ? next.add(node.id) : next.delete(node.id);
  if (linked) {
    for (const ancestor of [...entries].reverse()) {
      if (ancestor.disabled || ancestor.node.checkable === false || !treeBranch(ancestor.node) || !treeComplete(ancestor.node)) continue;
      const descendants = (ancestor.node.children ?? []).flatMap(eligible);
      if (treeComplete(ancestor.node) && descendants.length && descendants.every(node => next.has(node.id))) next.add(ancestor.node.id);
      else next.delete(ancestor.node.id);
    }
  }
  return [...next];
}
export function treeSelectionProblem<T>(nodes: readonly TreeNode<T>[], values: readonly string[], mode: 'single' | 'multiple', linked = false): 'cardinality' | 'unknown' | 'disabled' | 'unselectable' | 'incomplete' | 'duplicate' | null {
  if (new Set(values).size !== values.length) return 'duplicate';
  if (mode === 'single' && values.length > 1) return 'cardinality';
  for (const id of values) {
    const entry = treeEntry(nodes, id);
    if (!entry) return 'unknown';
    if (entry.disabled) return 'disabled';
    if (mode === 'single' ? entry.node.selectable === false : entry.node.checkable === false) return 'unselectable';
    if (linked && !treeComplete(entry.node)) return 'incomplete';
  }
  return null;
}
export function cascaderPathProblem<T>(nodes: readonly TreeNode<T>[], path: readonly string[], allowIntermediate: boolean): 'path' | 'disabled' | 'unselectable' | 'intermediate' | null {
  if (!path.length) return null;
  const last = treeEntry(nodes, path.at(-1)!);
  if (!last || last.path.length !== path.length || last.path.some((id, index) => id !== path[index])) return 'path';
  if (last.disabled) return 'disabled';
  if (last.node.selectable === false) return 'unselectable';
  return !allowIntermediate && treeBranch(last.node) ? 'intermediate' : null;
}
export function treeWithLoads<T>(nodes: readonly TreeNode<T>[], loads: TreeLoads<T>): readonly TreeNode<T>[] {
  const visit = (items: readonly TreeNode<T>[]): readonly TreeNode<T>[] => items.map(node => {
    const loaded = node.children ?? (loads[node.id]?.status === 'loaded' ? loads[node.id]?.children : undefined);
    return loaded === undefined ? node : {...node, children: visit(loaded)};
  });
  return treeNodes(visit(nodes));
}
export function treeBeginLoad<T>(nodes: readonly TreeNode<T>[], loads: TreeLoads<T>, id: string, requestId: number): {loads: TreeLoads<T>; request: TreeLoadRequest | null} {
  const entry = treeEntry(treeWithLoads(nodes, loads), id);
  if (!entry || entry.disabled || !treeUnloaded(entry.node) || loads[id]?.status === 'loading' || !Number.isSafeInteger(requestId) || requestId <= 0) return {loads, request: null};
  const request: TreeLoadRequest = {nodeId: id, path: entry.path, requestId};
  return {loads: {...loads, [id]: {...request, status: 'loading'}}, request};
}
export function treeResolveLoad<T>(nodes: readonly TreeNode<T>[], loads: TreeLoads<T>, requestId: number, children: readonly TreeNode<T>[]): TreeLoads<T> | null {
  const record = Object.values(loads).find(item => item.requestId === requestId && item.status === 'loading');
  if (!record || !treeEntry(treeWithLoads(nodes, loads), record.nodeId)) return null;
  treeNodes(children);
  const next: TreeLoads<T> = {...loads, [record.nodeId]: {...record, status: 'loaded', children}};
  treeWithLoads(nodes, next); return next;
}
export function treeFailLoad<T>(loads: TreeLoads<T>, requestId: number, message: string): TreeLoads<T> | null {
  const record = Object.values(loads).find(item => item.requestId === requestId && item.status === 'loading');
  if (!record) return null;
  if (typeof message !== 'string' || !message.trim()) throw new Error('Tree load failures require an application-normalized message.');
  return {...loads, [record.nodeId]: {...record, status: 'error', message}};
}
export function treeCancelLoads<T>(loads: TreeLoads<T>, ids: readonly string[] | null, reason: TreeLoadCancellation['reason']): {loads: TreeLoads<T>; cancelled: readonly TreeLoadCancellation[]} {
  const next: Record<string, TreeLoadRecord<T>> = {...loads}, cancelled: TreeLoadCancellation[] = [];
  for (const record of Object.values(loads)) if (record.status === 'loading' && (ids === null || ids.includes(record.nodeId))) {
    cancelled.push({nodeId: record.nodeId, path: record.path, requestId: record.requestId, reason}); delete next[record.nodeId];
  }
  return {loads: next, cancelled};
}
