import { booleanAttribute, computed, Directive, input, output, signal } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';

/** Native editing state/CVA only; application validation and server state remain outside. */
@Directive({ standalone: true })
export abstract class ValueControl<T> implements ControlValueAccessor {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly value = input<T>();
  readonly valueChange = output<T>();
  readonly name = input('');
  protected abstract readonly emptyValue: T;
  private readonly stored = signal<T | undefined>(undefined);
  private readonly formDisabled = signal(false);
  protected readonly current = computed(() => this.value() !== undefined ? this.value()! : this.stored() === undefined ? this.emptyValue : this.stored()!);
  protected readonly blocked = computed(() => this.disabled() || this.busy() || this.formDisabled());
  protected readonly descriptionIds = computed(() => [this.hint() ? this.controlId() + '-hint' : '', this.error() ? this.controlId() + '-error' : ''].filter(Boolean).join(' ') || null);
  private notifyChange: (value: T) => void = () => {};
  private notifyTouched: () => void = () => {};
  protected abstract coerce(value: unknown): T;
  writeValue(value: unknown): void { this.stored.set(this.coerce(value)); }
  registerOnChange(callback: (value: T) => void): void { this.notifyChange = callback; }
  registerOnTouched(callback: () => void): void { this.notifyTouched = callback; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }
  protected touch(): void { this.notifyTouched(); }
  protected commit(value: T): void {
    if (this.blocked() || this.readonly()) return;
    this.stored.set(value); this.valueChange.emit(value); this.notifyChange(value);
  }
  protected text(event: Event): string { return (event.target as HTMLInputElement).value; }
  protected checked(event: Event): boolean { return (event.target as HTMLInputElement).checked; }
}
