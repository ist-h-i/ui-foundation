import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText} from './locale';
import { ChangeDetectionStrategy, Component, booleanAttribute, computed, effect, ElementRef, inject, input, output, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { focusBeforeHiding } from './layout';
export type ActionFeedbackState = {
    kind: 'idle';
} | {
    kind: 'success' | 'error' | 'unknown' | 'warning';
    message: string;
};
@Component({
    selector: 'ui-action-feedback',
    imports: [ActionControl],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ui-action-feedback', '[attr.data-state]': 'state().kind' },
    template: `
    <p class="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">{{ message() }}</p>
    <div class="ui-action-feedback__panel" [attr.aria-busy]="busy()||recoveryBusy()" [hidden]="state().kind === 'idle' && !busy()">
      <p tabindex="-1" class="ui-action-feedback__message">{{ message() }}</p>
      @if (recoveryLabel() && state().kind !== 'idle') {
        <button uiAction [busy]="busy()||recoveryBusy()" [disabled]="recoveryDisabled()" (click)="requestRecovery()">{{ recoveryLabel() }}</button>
      }
      <ng-content />
    </div>
  `,
})
export class ActionFeedback {
 protected readonly uiText_ActionFeedback=injectUiText();
    readonly state = input.required<ActionFeedbackState>();
    readonly recoveryLabel = input('');
    readonly recoveryBusy = input(false, { transform: booleanAttribute });
    readonly recoveryDisabled = input(false, { transform: booleanAttribute });
    readonly recover = output<void>();
    readonly busy = input(false, { transform: booleanAttribute });
    readonly busyMessage = input<string>();
 protected readonly uiEffective_busyMessage=uiLocaleComputed(()=>this.busyMessage()??this.uiText_ActionFeedback('処理しています。'));
    readonly focusFallback = input<HTMLElement | null>(null);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() { effect(() => { const state = this.state().kind, busy = this.busy(), blocked = busy || this.recoveryBusy() || this.recoveryDisabled() || !this.recoveryLabel(), fallback = this.focusFallback(); untracked(() => { const panel = this.element.querySelector<HTMLElement>('.ui-action-feedback__panel'); if (state === 'idle' && !busy) {
        if (panel)
            focusBeforeHiding(panel, fallback);
        return;
    } const active = this.element.ownerDocument.activeElement; if (blocked && active && panel?.querySelector('button')?.contains(active))
        panel.querySelector<HTMLElement>('.ui-action-feedback__message')?.focus(); }); }); }
    protected readonly message = computed(() => {
        const state = this.state();
        return this.busy() ? this.uiEffective_busyMessage() : state.kind === 'idle' ? '' : state.message;
    });
    protected requestRecovery(): void {
        if (this.state().kind !== 'idle' && this.recoveryLabel() && !this.busy() && !this.recoveryBusy() && !this.recoveryDisabled())
            this.recover.emit();
    }
}
