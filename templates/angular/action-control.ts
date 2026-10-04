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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-action-label"><ng-content /></span>
    @if (busy()) {
      <span class="ui-action-busy">処理中</span>
    }
  `,
  host: {
    class: 'ui-action',
    '[attr.type]': 'type()',
    '[disabled]': 'blocked()',
    '[attr.aria-busy]': 'busy() ? "true" : null',
    '[attr.data-variant]': 'variant()',
    '[class.ui-action--busy]': 'busy()',
    '[class.ui-action--disabled]': 'blocked()',
  },
})
export class ActionControl {
  readonly variant = input<ActionVariant>('secondary');
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-action-label"><ng-content /></span>
    @if (busy()) {
      <span class="ui-action-busy">処理中</span>
    }
  `,
  host: {
    class: 'ui-action',
    '[attr.href]': 'blocked() ? null : href()',
    '[attr.role]': 'blocked() ? "link" : null',
    '[attr.tabindex]': 'blocked() ? -1 : tabIndex()',
    '[attr.aria-disabled]': 'blocked() ? "true" : null',
    '[attr.aria-busy]': 'busy() ? "true" : null',
    '[attr.data-variant]': 'variant()',
    '[class.ui-action--busy]': 'busy()',
    '[class.ui-action--disabled]': 'blocked()',
  },
})
export class ActionLink {
  readonly variant = input<ActionVariant>('secondary');
  readonly busy = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly href = input<string | null>(null);
  readonly tabIndex = input(0, { alias: 'tabindex', transform: numberAttribute });
  protected readonly blocked = computed(() => this.busy() || this.disabled());

  constructor() {
    guardActivation(this.blocked);
  }
}
