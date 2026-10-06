import {Directive, input} from '@angular/core';
import type {TreeCheckState, TreeEntry} from './tree-model';

/** Tree's native list item: one real composite item, with explicit hierarchy metadata. */
@Directive({selector:'li[uiTreeItem]',standalone:true,host:{
  role:'treeitem',
  '[attr.data-tree-id]':'uiTreeItem().node.id',
  '[attr.aria-label]':'uiTreeItem().node.label',
  '[attr.aria-level]':'uiTreeItem().level',
  '[attr.aria-posinset]':'uiTreeItem().position',
  '[attr.aria-setsize]':'uiTreeItem().setSize',
  '[attr.aria-expanded]':'itemExpanded()',
  '[attr.aria-disabled]':'itemDisabled() ? "true" : null',
  '[attr.aria-selected]':'itemSelected()',
  '[attr.aria-checked]':'itemChecked()',
  '[attr.aria-busy]':'itemBusy() ? "true" : null',
  '[attr.tabindex]':'itemTabIndex()',
}})
export class TreeItem {
  readonly uiTreeItem = input.required<TreeEntry>();
  readonly itemExpanded = input<boolean | null>(null);
  readonly itemDisabled = input(false);
  readonly itemSelected = input<boolean | null>(null);
  readonly itemChecked = input<TreeCheckState | null>(null);
  readonly itemBusy = input(false);
  readonly itemTabIndex = input(-1);
}
