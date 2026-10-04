import { booleanAttribute, ChangeDetectionStrategy, Component, computed, Directive, forwardRef, inject, input, output } from '@angular/core';

@Directive({
  selector: 'input[uiRadioOption]',
  host: {
    class: 'ui-radio-option__input',
    type: 'radio',
    '[name]': 'group.name()',
    '[value]': 'value()',
    '[checked]': 'group.value() === value()',
    '[required]': 'group.required()',
    '[disabled]': 'disabled() || group.disabled()',
    '[attr.aria-invalid]': 'group.hasError() ? "true" : null',
    '[attr.aria-describedby]': 'group.descriptionIds()',
    '(change)': 'select()',
  },
})
export class RadioOption {
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly group = inject<RadioGroup>(forwardRef(() => RadioGroup));

  protected select(): void {
    if (!this.disabled() && !this.group.disabled() && this.group.value() !== this.value()) this.group.valueChange.emit(this.value());
  }
}

@Component({
  selector: 'ui-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-radio-group' },
  template: `
    <fieldset class="ui-radio-group__fieldset" [disabled]="disabled()" [attr.aria-describedby]="descriptionIds()">
      <legend class="ui-radio-group__legend">{{ label() }} <span>{{ required() ? '必須' : '任意' }}</span></legend>
      <ng-content />
      @if (hint()) { <p class="ui-form-field-hint" [id]="name() + '-hint'">{{ hint() }}</p> }
      @if (hasError()) { <p class="ui-form-field-error" [id]="name() + '-error'" role="alert">{{ error() }}</p> }
    </fieldset>
  `,
  styles: `
    :host { display: block; }
    .ui-radio-group__fieldset { border: 0; padding: 0; margin: 0; min-inline-size: 0; }
    .ui-radio-group__legend { padding: 0; font-weight: 600; }
    .ui-radio-group__legend span { color: var(--ui-color-muted); font-size: var(--ui-font-small); font-weight: 400; margin-inline-start: var(--ui-space-2); }
  `,
})
export class RadioGroup {
  /** Unique native group name; it is also the prefix for description IDs. */
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hint = input('');
  readonly error = input<string | null>(null);
  readonly valueChange = output<string>();
  readonly hasError = computed(() => Boolean(this.error()?.trim()));
  readonly descriptionIds = computed(() => {
    const ids: string[] = [];
    if (this.hint()) ids.push(`${this.name()}-hint`);
    if (this.hasError()) ids.push(`${this.name()}-error`);
    return ids.join(' ') || null;
  });
}
