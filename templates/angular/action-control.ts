import {UiStableMessagePipe} from './locale';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  numberAttribute,
  Renderer2,
} from '@angular/core';

import { Icon } from './icon';

export type ActionSize = 'small' | 'medium' | 'large';
export type ActionVariant = 'primary' | 'secondary' | 'danger';

/**
 * Capture listeners are needed here: an Angular host click listener can share
 * the consumer's listener, so stopping propagation there cannot reliably stop
 * the consumer's handler. No DOM structure or application state is changed.
 */
function guardActivation(isBlocked: () => boolean): void {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const renderer = inject(Renderer2);
  const destroyRef = inject(DestroyRef);
  const guard = (event: Event): void => {
    if (isBlocked()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  const removeClick = renderer.listen(element, 'click', guard, { capture: true });
  const removeAuxclick = renderer.listen(element, 'auxclick', guard, { capture: true });
  destroyRef.onDestroy(() => {
    removeClick();
    removeAuxclick();
  });
}

@Component({
  selector: 'button[uiAction]',
  standalone: true,
  imports: [Icon,UiStableMessagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-action-icon" aria-hidden="true" [style.order]="iconPosition()==='end'?2:0"><ng-content select="[uiActionIcon]" />@if(icon()){<ui-icon [name]="icon()!" />}</span>
    <span class="ui-action-label" style="order:1"><ng-content /></span>
    @if (busy()) {
      <span class="ui-action-busy">{{'uiFoundation.actionControl.busy' | uiStableMessage}}</span>
    }
  `,
  host: {
    class: 'ui-action',
    '[attr.type]': 'type()',
    '[disabled]': 'blocked()',
    '[attr.aria-busy]': 'busy() ? "true" : null',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-width]': 'width()',
    '[class.ui-action--busy]': 'busy()',
    '[class.ui-action--disabled]': 'blocked()',
  },
})
export class ActionControl {
  readonly variant = input<ActionVariant>('secondary');
  readonly size = input<ActionSize | null>(null);
  readonly width = input<'auto' | 'full'>('auto');
  readonly icon = input<string | null>(null);
  readonly iconPosition = input<'start' | 'end'>('start');
  readonly busy = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  protected readonly blocked = computed(() => this.busy() || this.disabled());

  constructor() {
    guardActivation(this.blocked);
  }
}

@Component({
  selector: 'a[uiAction]',
  standalone: true,
  imports: [Icon,UiStableMessagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .ui-action-external {
      order:3;
      font-size:var(--ui-text-small);
      white-space:normal;
      overflow-wrap:anywhere;
      min-inline-size:0;
    }
  `,
  template: `
    <span class="ui-action-icon" aria-hidden="true" [style.order]="iconPosition()==='end'?2:0"><ng-content select="[uiActionIcon]" />@if(icon()){<ui-icon [name]="icon()!" />}</span>
    <span class="ui-action-label" style="order:1"><ng-content /></span>
    @if (external()) {<span class="ui-action-external">{{'uiFoundation.actionLink.external' | uiStableMessage}}<span aria-hidden="true">↗</span></span>}
    @if (busy()) {
      <span class="ui-action-busy">{{'uiFoundation.actionControl.busy' | uiStableMessage}}</span>
    }
  `,
  host: {
    class: 'ui-action',
    '[attr.href]': 'blocked() ? null : href()',
    '[attr.target]': 'target() ?? (external() ? "_blank" : null)',
    '[attr.rel]': 'linkRel()',
    '[attr.role]': 'blocked() ? "link" : null',
    '[attr.tabindex]': 'blocked() ? -1 : tabIndex()',
    '[attr.aria-disabled]': 'blocked() ? "true" : null',
    '[attr.aria-busy]': 'busy() ? "true" : null',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-width]': 'width()',
    '[class.ui-action--busy]': 'busy()',
    '[class.ui-action--disabled]': 'blocked()',
  },
})
export class ActionLink {
  readonly variant = input<ActionVariant>('secondary');
  readonly size = input<ActionSize | null>(null);
  readonly width = input<'auto' | 'full'>('auto');
  readonly icon = input<string | null>(null);
  readonly iconPosition = input<'start' | 'end'>('start');
  readonly busy = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly href = input<string | null>(null);
  readonly external = input(false, { transform: booleanAttribute });
  readonly target = input<string | null>(null);
  readonly rel = input<string | null>(null);
  protected readonly linkRel = computed(() => {const values=(this.rel()??'').split(/\s+/).filter(Boolean);if(this.external()||this.target()==='_blank')values.push('noopener','noreferrer');return [...new Set(values)].join(' ')||null;});
  readonly tabIndex = input(0, { alias: 'tabindex', transform: numberAttribute });
  protected readonly blocked = computed(() => this.busy() || this.disabled());

  constructor() {
    guardActivation(this.blocked);
  }
}
