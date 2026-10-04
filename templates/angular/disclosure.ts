import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

/** Native details keeps its standard keyboard operation and projected content. */
@Component({
  selector: 'ui-disclosure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details [open]="open()" (toggle)="onToggle($event)">
      <summary>{{ title() }}</summary>
      <div class="ui-disclosure-content"><ng-content /></div>
    </details>
  `,
  styles: `
    :host { display: block; min-inline-size: 0; color: var(--ui-color-text); }
    :host([hidden]) { display: none; }
    details { border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius); }
    summary {
      box-sizing: border-box;
      min-block-size: var(--ui-control-height);
      padding: var(--ui-space-2) var(--ui-space-4);
      font-weight: 600;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    summary:focus-visible { outline: 3px solid var(--ui-color-focus); outline-offset: 3px; }
    .ui-disclosure-content { padding: var(--ui-space-4); border-block-start: 1px solid var(--ui-color-border); }
  `,
})
export class Disclosure {
  readonly title = input.required<string>();
  readonly open = input(false, { transform: booleanAttribute });
  readonly openChange = output<boolean>();

  protected onToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement;
    this.openChange.emit(details.open);
  }
}
