import {
  AfterContentChecked,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  Directive,
  forwardRef,
  inject,
  input,
} from '@angular/core';

/** Native control values, selection and input events remain owned by the app. */
@Directive({
  selector: 'input[uiFieldControl], select[uiFieldControl], textarea[uiFieldControl]',
  standalone: true,
  host: {
    class: 'ui-field-control',
    '[attr.id]': 'field.controlId()',
    '[required]': 'field.required()',
    '[attr.aria-invalid]': 'field.hasError() ? "true" : null',
    '[attr.aria-describedby]': 'field.descriptionIds()',
  },
})
export class FieldControl {
  protected readonly field = inject<FormField>(forwardRef(() => FormField));
}

@Component({
  selector: 'ui-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="ui-form-field-label" [attr.for]="controlId()">
      {{ label() }}
      <span class="ui-form-field-requirement">{{ required() ? '必須' : '任意' }}</span>
    </label>
    <ng-content />
    @if (hasHint()) {
      <p class="ui-form-field-hint" [id]="hintId()">{{ hint() }}</p>
    }
    @if (hasError()) {
      <p class="ui-form-field-error" [id]="errorId()" role="alert">{{ error() }}</p>
    }
  `,
  host: {
    class: 'ui-form-field',
    '[class.ui-form-field--invalid]': 'hasError()',
  },
})
export class FormField implements AfterContentChecked {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  /** Space-separated IDs for extra descriptions supplied by the application. */
  readonly describedBy = input('');

  readonly hasHint = computed(() => Boolean(this.hint()?.trim()));
  readonly hasError = computed(() => Boolean(this.error()?.trim()));
  readonly hintId = computed(() => `${this.controlId()}-hint`);
  readonly errorId = computed(() => `${this.controlId()}-error`);
  readonly descriptionIds = computed(() => {
    const ids = this.describedBy().trim().split(/\s+/).filter(Boolean);
    if (this.hasHint()) ids.push(this.hintId());
    if (this.hasError()) ids.push(this.errorId());
    return [...new Set(ids)].join(' ') || null;
  });

  private readonly controls = contentChildren(FieldControl, { descendants: true });

  /** Check after projection resolves, including conditional content updates. */
  ngAfterContentChecked(): void {
    if (this.controls().length !== 1) {
      throw new Error('ui-form-field requires exactly one input, select or textarea with uiFieldControl.');
    }
    if (!this.controlId().trim() || /\s/.test(this.controlId())) {
      throw new Error('ui-form-field controlId must be nonempty and contain no whitespace.');
    }
    if (!this.label().trim()) {
      throw new Error('ui-form-field label must be nonempty.');
    }
  }
}
