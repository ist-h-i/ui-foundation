import { afterNextRender, booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, input, output, untracked } from '@angular/core';
import { canRequestStep, validateStepNavigation, type StepNavigationItem } from './step-navigation-model';
import { layoutKeyword } from './layout-model';
import { restoreFocus } from './focus';
export type { StepNavigationItem, StepNavigationStatus } from './step-navigation-model';

/** Controlled progress indicator. Navigation emits intent and does not own routing or form state. */
@Component({
  selector: 'ui-step-navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', tabindex: '-1', '[attr.aria-label]': 'checkedLabel()', '[attr.aria-busy]': 'busy() ? "true" : null' },
  template: `
    <ol role="list" [attr.data-direction]="checkedDirection()">
      @for (item of checkedItems(); track item.id) {
        <li [attr.aria-current]="item.id === currentId() ? 'step' : null" [attr.data-status]="item.status">
          @if (item.navigable) {
            <button type="button" [attr.data-step-id]="item.id" [disabled]="!available(item)" (click)="request(item.id)">
              <span class="ui-step-label">{{item.label}}</span>
              <span class="ui-step-status">{{item.statusLabel}}</span>
            </button>
          } @else {
            <span class="ui-step-label">{{item.label}}</span>
            <span class="ui-step-status">{{item.statusLabel}}</span>
          }
        </li>
      }
    </ol>
  `,
  styles: `
    :host { display:block; min-inline-size:0; color:var(--ui-color-text); }
    :host([hidden]) { display:none; }
    ol { display:flex; flex-wrap:wrap; gap:var(--ui-space-control-gap); padding:0; margin:0; list-style:none; }
    ol[data-direction="vertical"] { flex-direction:column; align-items:start; }
    li { min-inline-size:0; max-inline-size:100%; padding:var(--ui-space-control-gap); border-inline-start:var(--ui-border-control) solid var(--ui-color-border); overflow-wrap:anywhere; }
    li[aria-current="step"] { border-inline-start-color:var(--ui-color-focus); font-weight:var(--ui-weight-heading); }
    .ui-step-label,.ui-step-status { display:block; }
    .ui-step-status { font-size:var(--ui-text-small); color:var(--ui-color-muted); }
    li[data-status="error"] .ui-step-status { color:var(--ui-color-danger); background:var(--ui-color-surface); }
    li[data-status="complete"] .ui-step-status { color:var(--ui-color-success); background:var(--ui-color-success-surface); }
    button { display:block; font:inherit; text-align:start; color:inherit; background:var(--ui-color-surface); border:var(--ui-border-control) solid var(--ui-color-border); border-radius:var(--ui-radius-control); padding:var(--ui-space-control-y) var(--ui-space-control-x); min-block-size:var(--ui-size-control); min-inline-size:var(--ui-size-control); max-inline-size:100%; overflow-wrap:anywhere; }
    button:disabled { background:var(--ui-color-disabled-surface); color:var(--ui-color-muted); }
    button:focus-visible,:host:focus-visible { outline:var(--ui-border-focus) solid var(--ui-color-focus); outline-offset:var(--ui-border-focus-offset); }
  `,
})
export class StepNavigation {
  readonly label = input.required<string>();
  readonly items = input.required<readonly StepNavigationItem[]>();
  readonly currentId = input<string | null>(null);
  readonly direction = input<'horizontal' | 'vertical'>('horizontal');
  readonly busy = input(false, { transform: booleanAttribute });
  readonly stepRequested = output<string>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  // Bridge only the event-to-render gap; the app owns ongoing transition state.
  private requestPending = false;
  protected readonly checkedItems = computed(() => validateStepNavigation(this.items(), this.currentId()));
  protected readonly checkedLabel = computed(() => {
    const label = this.label();
    if (!label.trim()) throw new Error('StepNavigation requires a label');
    return label;
  });
  protected readonly checkedDirection = computed(() => layoutKeyword(this.direction(), ['horizontal', 'vertical'] as const, 'StepNavigation direction'));

  constructor() {
    effect(() => {
      const items = this.checkedItems(), currentId = this.currentId(), busy = this.busy();
      untracked(() => {
        const active = this.element.ownerDocument.activeElement as HTMLElement | null;
        if (!active || !this.element.contains(active)) return;
        const id = active.dataset['stepId'];
        if (id === undefined) return;
        const item = items.find(entry => entry.id === id);
        if (!item || !canRequestStep(item, currentId, busy)) restoreFocus(this.element);
      });
    });
  }

  protected available(item: StepNavigationItem): boolean {
    return canRequestStep(item, this.currentId(), this.busy());
  }
  protected request(id: string): void {
    const item = this.checkedItems().find(entry => entry.id === id);
    if (this.requestPending || !item || !this.available(item)) return;
    this.requestPending = true;
    afterNextRender(() => { this.requestPending = false; }, { injector: this.injector });
    this.stepRequested.emit(id);
  }
}
