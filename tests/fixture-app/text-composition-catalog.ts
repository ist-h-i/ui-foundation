import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { COMPOSITION_BUFFER_MODE, FormControl, ReactiveFormsModule } from '@angular/forms';
import { scan } from 'rxjs';
import { Textarea, TextInput } from '../../.ui/generated/angular/forms';

function compositionProviders() {
  const mode = new URLSearchParams(location.search).get('buffer');
  return mode === null ? [] : [{ provide: COMPOSITION_BUFFER_MODE, useValue: mode === 'on' }];
}

@Component({
  selector: 'fixture-app',
  standalone: true,
  imports: [ReactiveFormsModule, TextInput, Textarea],
  providers: compositionProviders(),
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (multiline) {
      <ui-textarea controlId="reactive" label="説明" showCount autoResize [formControl]="control"
        [readonly]="readOnly()" (valueChange)="recordChange($event)" />
      <ui-textarea controlId="controlled" label="別の説明" showCount
        [value]="external()" (valueChange)="acceptExternal($event)" />
    } @else {
      <ui-text-input controlId="reactive" label="件名" showCount clearable [formControl]="control"
        [readonly]="readOnly()" (valueChange)="recordChange($event)" />
      <ui-text-input controlId="controlled" label="別の件名" showCount
        [value]="external()" (valueChange)="acceptExternal($event)" />
    }
    <button type="button" (click)="control.reset()">初期化</button>
    <button type="button" (click)="setDisabled()">有効状態を切り替える</button>
    <button type="button" (click)="readOnly.set(!readOnly())">読み取り専用を切り替える</button>
    <button type="button" (click)="external.set('外部の更新')">別の欄を更新</button>
    <button type="button" (click)="acceptEdits.set(true)">次の入力を受け入れる</button>
    <output id="form-changes">{{ stringify(formChanges()) }}</output>
    <output id="value-changes">{{ stringify(valueChanges()) }}</output>
    <output id="controlled-changes">{{ stringify(externalChanges()) }}</output>
    <output id="controlled-value">{{ external() }}</output>
  `,
})
export class TextCompositionCatalog {
  private readonly params = new URLSearchParams(location.search);
  readonly multiline = this.params.get('field') === 'textarea';
  readonly control = new FormControl<string | null>(null, {
    updateOn: this.params.get('update') === 'blur' ? 'blur' : 'change',
  });
  readonly formChanges = toSignal(this.control.valueChanges.pipe(
    scan((history: (string | null)[], value) => [...history, value], []),
  ), { initialValue: [] });
  readonly valueChanges = signal<string[]>([]);
  readonly external = signal('初期値');
  readonly acceptEdits = signal(!this.params.has('reject'));
  readonly externalChanges = signal<string[]>([]);
  readonly readOnly = signal(false);
  readonly stringify = JSON.stringify;

  recordChange(value: string): void {
    this.valueChanges.update(history => [...history, value]);
  }

  acceptExternal(value: string): void {
    this.externalChanges.update(history => [...history, value]);
    if (this.acceptEdits()) this.external.set(value);
  }

  setDisabled(): void {
    if (this.control.disabled) this.control.enable({ emitEvent: false });
    else this.control.disable({ emitEvent: false });
  }
}
