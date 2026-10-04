import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ActionControl } from './action-control';

export type AsyncRegionState =
  | { kind: 'ready' }
  | { kind: 'loading' | 'empty' | 'error' | 'refreshing' | 'partial' | 'stale'; message: string };

@Component({
  selector: 'ui-async-region',
  imports: [ActionControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-async-region', '[attr.data-state]': 'state().kind' },
  template: `
    <p class="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">{{ message() }}</p>
    <div class="ui-async-region__notice" [hidden]="state().kind === 'ready'">
      <p class="ui-async-region__message" aria-hidden="true">{{ message() }}</p>
      @if (retryAvailable()) {
        <button uiAction [busy]="retryBusy()" [disabled]="isLoading()" (click)="requestRetry()">{{ retryLabel() }}</button>
      }
    </div>
    <div class="ui-async-region__content" [hidden]="!showContent()" [attr.aria-busy]="isLoading()">
      <ng-content />
    </div>
  `,
})
export class AsyncRegion {
  readonly state = input.required<AsyncRegionState>();
  readonly retryAvailable = input(false);
  readonly retryBusy = input(false);
  readonly retryLabel = input('再試行');
  readonly retry = output<void>();
  protected readonly message = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? '' : state.message;
  });
  protected readonly isLoading = computed(() => ['loading', 'refreshing'].includes(this.state().kind));
  protected readonly showContent = computed(() => ['ready', 'refreshing', 'partial', 'stale'].includes(this.state().kind));

  protected requestRetry(): void {
    if (this.retryAvailable() && !this.retryBusy() && !this.isLoading()) this.retry.emit();
  }
}
