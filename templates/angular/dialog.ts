import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * A focused native-dialog adapter. Opening runs after browser rendering, rather
 * than binding the HTML open attribute (which would create a non-modal dialog).
 * Native dialog behavior owns modal focus, Escape and focus restoration. SSR and
 * hydration behavior require separate verification before adopting this adapter.
 */
@Component({
  selector: 'dialog[uiDialog]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    '[attr.aria-label]': 'label()',
    '[attr.aria-modal]': 'open() ? "true" : null',
    '(cancel)': 'onCancelled()',
    '(close)': 'onClosed()',
  },
  styles: `
    :host {
      box-sizing: border-box;
      inline-size: min(var(--ui-dialog-width, 36rem), calc(100vw - 2 * var(--ui-space-6)));
      max-block-size: calc(100dvh - 2 * var(--ui-space-6));
      padding: var(--ui-space-6);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius);
      background: var(--ui-color-surface);
      color: var(--ui-color-text);
      font-family: var(--ui-font-family);
      font-size: var(--ui-font-body);
      line-height: var(--ui-line-height);
      overflow: auto;
      overflow-wrap: anywhere;
    }
    :host::backdrop {
      background: var(--ui-dialog-backdrop, color-mix(in srgb, var(--ui-color-text) 40%, transparent));
    }
  `,
})
export class Dialog {
  readonly label = input.required<string>();
  readonly open = input(false, { transform: booleanAttribute });
  readonly openChange = output<boolean>();
  readonly cancelled = output<void>();
  readonly closed = output<void>();

  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private destroyed = false;

  constructor() {
    const renderRef = afterRenderEffect({
      earlyRead: () => {
        if (!this.label().trim()) throw new Error('uiDialog label must be nonempty.');
        const shouldOpen = this.open();
        return {
          shouldOpen,
          actualOpen: this.element.open,
          modal: this.element.open && this.element.matches(':modal'),
          connected: this.element.isConnected,
        };
      },
      write: (state) => {
        const { shouldOpen, actualOpen, modal, connected } = state();
        if (shouldOpen && connected && !modal) {
          // Static HTML open can precede the input binding. Remove that state
          // without firing a stale close event, then open in the top layer.
          if (actualOpen) this.element.open = false;
          this.element.showModal();
        } else if (!shouldOpen && actualOpen) {
          this.element.close();
        }
      },
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      renderRef.destroy();
      if (this.element.open && typeof this.element.close === 'function') this.element.close();
    });
  }

  protected onCancelled(): void {
    this.cancelled.emit();
  }

  protected onClosed(): void {
    // Ignore a queued close event when the app already reopened the dialog.
    if (this.destroyed || this.element.open) return;
    this.openChange.emit(false);
    this.closed.emit();
  }
}
