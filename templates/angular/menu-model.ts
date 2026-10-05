export interface MenuItem {
    id: string;
    label?: string;
    type?: 'item' | 'checkbox' | 'radio' | 'group' | 'separator';
    icon?: string;
    disabled?: boolean;
    visible?: boolean;
    checked?: boolean;
    radioGroup?: string;
    value?: unknown;
    children?: readonly MenuItem[];
}
export interface MenuSelection {
    item: MenuItem;
    path: readonly string[];
}
export function validateMenu(items: readonly MenuItem[]): readonly MenuItem[] {
    const ids = new Set<string>(), ancestors = new Set<MenuItem>();
    const visit = (nodes: readonly MenuItem[]) => {
        for (const item of nodes) {
            if (ancestors.has(item))
                throw new Error('Menu children must not contain cycles.');
            if (!item.id?.trim() || ids.has(item.id))
                throw new Error('Menu item ids must be nonempty and unique.');
            ids.add(item.id);
            if (item.type !== 'separator' && !item.label?.trim())
                throw new Error('Menu items and groups require labels.');
            if (item.type === 'separator' && item.children?.length)
                throw new Error('Menu separators cannot have children.');
            ancestors.add(item);
            if (item.children)
                visit(item.children);
            ancestors.delete(item);
        }
    };
    visit(items);
    return items;
}
export function visibleMenuItems(items: readonly MenuItem[]): readonly MenuItem[] { return items.filter(item => item.visible !== false); }
export function menuCommands(items: readonly MenuItem[]): readonly MenuItem[] { return visibleMenuItems(items).flatMap(item => item.type === 'group' ? menuCommands(item.children ?? []) : item.type === 'separator' ? [] : [item]); }
export function menuPath(items: readonly MenuItem[], id: string): readonly string[] { for (const item of items) {
    if (item.id === id)
        return [id];
    const path = menuPath(item.children ?? [], id);
    if (path.length)
        return [item.id, ...path];
} return []; }
export function selectMenuCheck(items: readonly MenuItem[], selected: MenuItem): readonly MenuItem[] {
    let selectedScope = 'root';
    const findScope = (nodes: readonly MenuItem[], scope: string) => { for (const node of nodes) {
        if (node.id === selected.id)
            selectedScope = scope;
        findScope(node.children ?? [], node.id);
    } };
    findScope(items, 'root');
    const group = selected.radioGroup ?? selectedScope;
    const map = (nodes: readonly MenuItem[], scope: string): MenuItem[] => nodes.map(node => ({ ...node,
        ...(node.id === selected.id && selected.type === 'checkbox' ? { checked: !selected.checked } : {}),
        ...(selected.type === 'radio' && node.type === 'radio' && (node.radioGroup ?? scope) === group ? { checked: node.id === selected.id } : {}),
        ...(node.children ? { children: map(node.children, node.id) } : {}),
    }));
    return map(items, 'root');
}
