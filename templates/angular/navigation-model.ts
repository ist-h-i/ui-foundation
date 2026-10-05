/** Navigation destinations are application-owned; ordinary navigation uses native links. */
export interface NavigationNode {
    id: string;
    label: string;
    href?: string;
    icon?: string;
    description?: string;
    disabled?: boolean;
    visible?: boolean;
    children?: readonly NavigationNode[];
}
export interface BreadcrumbItem {
    id: string;
    label: string;
    href?: string;
    current?: boolean;
}
export interface MegaMenuGroup {
    id: string;
    label: string;
    description?: string;
    items: readonly NavigationNode[];
}
export interface PaletteCommand {
    id: string;
    label: string;
    description?: string;
    group?: string;
    keywords?: readonly string[];
    shortcut?: string;
    disabled?: boolean;
    visible?: boolean;
    icon?: string;
}
export interface CommandShortcut {
    key: string;
    control: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}
export interface CommandKeyEvent {
    key: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    isComposing: boolean;
    defaultPrevented: boolean;
    keyCode: number;
}
/** Opt-in shortcuts require Control, Alt or Meta so ordinary typing is preserved. */
export function commandShortcut(value: string | null): CommandShortcut | null {
    if (value === null)
        return null;
    const parts = value.split('+').map(part => part.trim()), key = parts.pop();
    const allowed = new Set(['Control', 'Alt', 'Shift', 'Meta']);
    if (!key || !parts.length || parts.some(part => !allowed.has(part)) || new Set(parts).size !== parts.length || !parts.some(part => part === 'Control' || part === 'Alt' || part === 'Meta') || !(/^[\p{L}\p{N}]$/u.test(key) || /^(?:F(?:[1-9]|1[0-2])|Enter|Space|Arrow(?:Up|Down|Left|Right))$/.test(key)))
        throw new Error('Command shortcut needs distinct modifiers, Control/Alt/Meta, and a letter, digit or supported named key.');
    return { key: key === 'Space' ? ' ' : key.toLocaleLowerCase(), control: parts.includes('Control'), alt: parts.includes('Alt'), shift: parts.includes('Shift'), meta: parts.includes('Meta') };
}
export function matchesCommandShortcut(event: CommandKeyEvent, shortcut: CommandShortcut | null): boolean {
    return !!shortcut && !event.defaultPrevented && !event.isComposing && event.keyCode !== 229 && event.key.toLocaleLowerCase() === shortcut.key && event.ctrlKey === shortcut.control && event.altKey === shortcut.alt && event.shiftKey === shortcut.shift && event.metaKey === shortcut.meta;
}
export function validNavigationId(id: string): boolean { return !!id.trim() && !/\s/.test(id); }
export function navigationHref(href: string | undefined): string | null {
    if (href === undefined)
        return null;
    if (!href.trim() || /^(?:javascript|data|vbscript):/i.test(href.replace(/[\u0000-\u0020]/g, '')))
        throw new Error('Navigation href must be a nonempty navigation destination.');
    return href;
}
export function navigationNodes(items: readonly NavigationNode[]): readonly NavigationNode[] {
    const ids = new Set<string>(), ancestors = new Set<NavigationNode>();
    const visit = (nodes: readonly NavigationNode[]) => {
        for (const node of nodes) {
            if (!validNavigationId(node.id) || ids.has(node.id) || !node.label.trim() || ancestors.has(node))
                throw new Error('Navigation nodes require unique IDs, labels and an acyclic hierarchy.');
            ids.add(node.id);
            navigationHref(node.href);
            ancestors.add(node);
            visit(node.children ?? []);
            ancestors.delete(node);
        }
    };
    visit(items);
    return items;
}
export function visibleNavigation(items: readonly NavigationNode[]): readonly NavigationNode[] { return items.filter(item => item.visible !== false); }
export function navigationPath(items: readonly NavigationNode[], id: string): readonly NavigationNode[] | null {
    for (const node of visibleNavigation(items)) {
        if (node.id === id)
            return [node];
        const path = navigationPath(node.children ?? [], id);
        if (path)
            return [node, ...path];
    }
    return null;
}
export function breadcrumbItems(items: readonly BreadcrumbItem[]): readonly BreadcrumbItem[] {
    navigationNodes(items);
    if (items.filter(item => item.current).length > 1)
        throw new Error('Breadcrumb has at most one current item.');
    return items;
}
export function foldBreadcrumb(items: readonly BreadcrumbItem[], maxItems: number): {
    start: readonly BreadcrumbItem[];
    middle: readonly BreadcrumbItem[];
    end: readonly BreadcrumbItem[];
} {
    if (!Number.isSafeInteger(maxItems) || maxItems < 3)
        throw new Error('Breadcrumb maxItems must be an integer of at least three.');
    const nodes = breadcrumbItems(items);
    return nodes.length <= maxItems ? { start: nodes, middle: [], end: [] } : { start: nodes.slice(0, 1), middle: nodes.slice(1, 1 + nodes.length - maxItems + 1), end: nodes.slice(1 + nodes.length - maxItems + 1) };
}
export function moveNavigationId(ids: readonly string[], id: string, offset: -1 | 1): readonly string[] {
    const index = ids.indexOf(id), target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length)
        return ids;
    const result = [...ids];
    result.splice(index, 1);
    result.splice(target, 0, id);
    return result;
}
export function paletteCommands(items: readonly PaletteCommand[]): readonly PaletteCommand[] {
    const ids = new Set<string>();
    for (const item of items) {
        if (!validNavigationId(item.id) || ids.has(item.id) || !item.label.trim() || item.group !== undefined && !item.group.trim())
            throw new Error('Palette commands require unique IDs and nonempty labels/groups.');
        if (item.shortcut)
            commandShortcut(item.shortcut);
        ids.add(item.id);
    }
    return items;
}
export function searchCommands(items: readonly PaletteCommand[], query: string, recentIds: readonly string[]): readonly PaletteCommand[] {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), visible = paletteCommands(items).filter(item => item.visible !== false);
    const matches = visible.filter(item => terms.every(term => [item.label, item.description ?? '', item.group ?? '', ...(item.keywords ?? [])].join(' ').toLocaleLowerCase().includes(term)));
    if (terms.length)
        return matches;
    const ranks = new Map(recentIds.map((id, index) => [id, index]));
    return [...matches].sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity));
}
