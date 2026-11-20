import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessage} from './locale';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { focusBeforeHiding } from './layout';
export type AsyncRegionState = {
    kind: 'ready';
} | {
    kind: 'loading' | 'empty' | 'error' | 'refreshing' | 'partial' | 'stale';
    message: string;
};
@Component({
    selector: 'ui-async-region',
    imports: [ActionControl],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ui-async-region', '[attr.data-state]': 'state().kind' },
    template: `
    <p class="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">{{ message() }}</p>
    <div class="ui-async-region__notice" [hidden]="state().kind === 'ready'">
      <p tabindex="-1" class="ui-async-region__message">{{ message() }}</p>
      @if (retryAvailable()) {
        <button uiAction [busy]="retryBusy()" [disabled]="isLoading()" (click)="requestRetry()">{{ uiEffective_retryLabel() }}</button>
      }
    </div>
    <div class="ui-async-region__content" [hidden]="!showContent()" [attr.aria-busy]="isLoading()">
      <ng-content />
    </div>
  `,
    styles: `
    .ui-async-region__notice { margin-block-end: var(--ui-space-field); }
  `,
})
export class AsyncRegion {
 protected readonly uiText_AsyncRegion=injectUiMessage();
    readonly state = input.required<AsyncRegionState>();
    readonly retryAvailable = input(false);
    readonly retryBusy = input(false);
    readonly retryLabel = input<string>();
 protected readonly uiEffective_retryLabel=uiLocaleComputed(()=>this.retryLabel()??this.uiText_AsyncRegion({id:'uiFoundation.asyncRegion.retryAction'}));
    readonly retry = output<void>();
    readonly focusFallback = input<HTMLElement | null>(null);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() { effect(() => { const shown = this.showContent(), ready = this.state().kind === 'ready', blocked = this.isLoading() || this.retryBusy() || !this.retryAvailable(), fallback = this.focusFallback(); untracked(() => { const content = this.element.querySelector<HTMLElement>('.ui-async-region__content'), notice = this.element.querySelector<HTMLElement>('.ui-async-region__notice'); if (!shown && content)
        focusBeforeHiding(content, fallback); if (ready && notice)
        focusBeforeHiding(notice, fallback);
    else if (blocked) {
        const button = notice?.querySelector<HTMLElement>('button'), active = this.element.ownerDocument.activeElement;
        if (active && button?.contains(active))
            notice?.querySelector<HTMLElement>('.ui-async-region__message')?.focus();
    } }); }); }
    protected readonly message = computed(() => {
        const state = this.state();
        return state.kind === 'ready' ? '' : state.message;
    });
    protected readonly isLoading = computed(() => ['loading', 'refreshing'].includes(this.state().kind));
    protected readonly showContent = computed(() => ['ready', 'refreshing', 'partial', 'stale'].includes(this.state().kind));
    protected requestRetry(): void {
        if (this.retryAvailable() && !this.retryBusy() && !this.isLoading())
            this.retry.emit();
    }
}
