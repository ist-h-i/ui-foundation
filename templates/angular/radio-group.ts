import { booleanAttribute, ChangeDetectionStrategy, Component, computed, Directive, forwardRef, inject, input, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: 'input[uiRadioOption]',
  host: {
    class: 'ui-radio-option__input',
    type: 'radio',
    '[name]': 'group.name()',
    '[value]': 'value()',
    '[checked]': 'group.current() === value()',
    '[required]': 'group.required()',
    '[disabled]': 'disabled() || group.blocked()',
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
    if (!this.disabled()) this.group.select(this.value());
  }
}

@Component({
  selector: 'ui-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>RadioGroup),multi:true}],
  host: { class: 'ui-radio-group' },
  template: `
    <fieldset class="ui-radio-group__fieldset" [disabled]="blocked()" [attr.aria-describedby]="descriptionIds()" (focusout)="left($event)">
      <legend class="ui-radio-group__legend">{{ label() }} <span>{{ required() ? '必須' : '任意' }}</span></legend>
      <div class="ui-radio-group__options" [attr.data-direction]="direction()"><ng-content /></div>
      @if (hint()) { <p class="ui-form-field-hint" [id]="name() + '-hint'">{{ hint() }}</p> }
      @if (hasError()) { <p class="ui-form-field-error" [id]="name() + '-error'" role="alert">{{ error() }}</p> }
    </fieldset>
  `,
  styles: `
    :host { display: block; }
    .ui-radio-group__fieldset { border: 0; padding: 0; margin: 0; min-inline-size: 0; }
    .ui-radio-group__legend { padding: 0; font-weight: var(--ui-weight-control); }
    .ui-radio-group__legend span { color: var(--ui-color-muted); font-size: var(--ui-text-small); font-weight: var(--ui-weight-body); margin-inline-start: var(--ui-space-control-gap); }
    .ui-radio-group__options { display:flex; flex-direction:column; gap:var(--ui-space-control-gap); }
    .ui-radio-group__options[data-direction="horizontal"] { flex-direction:row; flex-wrap:wrap; }
    :host([hidden]) { display:none; }
  `,
})
export class RadioGroup implements ControlValueAccessor {
  /** Unique native group name; it is also the prefix for description IDs. */
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | null>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hint = input('');
  readonly error = input<string | null>(null);
  readonly valueChange = output<string>();
  readonly direction = input<'vertical'|'horizontal'>('vertical');
  private readonly stored=signal<string|null>(null);
  private readonly formDisabled=signal(false);
  readonly current=computed(()=>this.value()===undefined?this.stored():this.value()!);
  readonly blocked=computed(()=>this.disabled()||this.formDisabled());
  private changed:(value:string)=>void=()=>{};
  private touched:()=>void=()=>{};
  writeValue(value:unknown):void{this.stored.set(typeof value==='string'?value:null);}
  registerOnChange(callback:(value:string)=>void):void{this.changed=callback;}
  registerOnTouched(callback:()=>void):void{this.touched=callback;}
  setDisabledState(value:boolean):void{this.formDisabled.set(value);}
  select(value:string):void{if(this.blocked()||this.current()===value)return;this.stored.set(value);this.valueChange.emit(value);this.changed(value);}
  touch():void{this.touched();}
  protected left(event:FocusEvent):void{const target=event.currentTarget as HTMLElement;if(event.relatedTarget instanceof Node&&target.contains(event.relatedTarget))return;this.touch();}
  readonly hasError = computed(() => Boolean(this.error()?.trim()));
  readonly descriptionIds = computed(() => {
    const ids: string[] = [];
    if (this.hint()) ids.push(`${this.name()}-hint`);
    if (this.hasError()) ids.push(`${this.name()}-error`);
    return ids.join(' ') || null;
  });
}
