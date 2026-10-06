import {Directive, inject, input, TemplateRef} from '@angular/core';
import type {TreeCheckState, TreeNode} from './tree-model';

export interface TreeNodeContext<T = unknown> {
  $implicit: TreeNode<T>;
  node: TreeNode<T>;
  path: readonly string[];
  level: number;
  expanded: boolean;
  selected: boolean;
  checkState: TreeCheckState;
}

/** The input anchors generic inference in strictTemplates consumers. */
@Directive({selector:'ng-template[uiTreeNodeTemplate]',standalone:true})
export class TreeNodeTemplate<T = unknown> {
  readonly uiTreeNodeTemplate = input.required<readonly TreeNode<T>[]>();
  readonly template = inject<TemplateRef<TreeNodeContext<T>>>(TemplateRef);
  static ngTemplateContextGuard<T>(_directive: TreeNodeTemplate<T>, context: unknown): context is TreeNodeContext<T> { return true; }
}
