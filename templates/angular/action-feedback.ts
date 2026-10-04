import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ActionControl } from './action-control';

export type ActionFeedbackState =
  | { kind: 'idle' }
  | { kind: 'success' | 'error' | 'unknown' | 'warning'; message: string };

@Component({
  selector: 'ui-action-feedback',
  imports: [ActionControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-action-feedback', '[attr.data-state]': 'state().kind' },
  template: `
    <p class="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">{{ message() }}</p>
    <div class="ui-action-feedback__panel" [hidden]="state().kind === 'idle'">
      <p class="ui-action-feedback__message" aria-hidden="true">{{ message() }}</p>
      @if (recoveryLabel() && state().kind !== 'idle') {
        <button uiAction [busy]="recoveryBusy()" [disabled]="recoveryDisabled()" (click)="requestRecovery()">{{ recoveryLabel() }}</button>
      }
      <ng-content />
    </div>
  `,
})
export class ActionFeedback {
  readonly state = input.required<ActionFeedbackState>();
  readonly recoveryLabel = input('');
  readonly recoveryBusy = input(false);
  readonly recoveryDisabled = input(false);
  readonly recover = output<void>();
  protected readonly message = computed(() => {
    const state = this.state();
    return state.kind === 'idle' ? '' : state.message;
  });

  protected requestRecovery(): void {
    if (this.state().kind !== 'idle' && this.recoveryLabel() && !this.recoveryBusy() && !this.recoveryDisabled()) this.recover.emit();
  }
}
