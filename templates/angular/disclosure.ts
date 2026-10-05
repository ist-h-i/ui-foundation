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
    :host {
      display: block;
      min-inline-size: 0;
      color: var(--ui-color-text);
      font-family: var(--ui-font-body);
      font-size: var(--ui-text-body);
      font-weight: var(--ui-weight-body);
      line-height: var(--ui-leading-body);
    }
    :host([hidden]) { display: none; }
    details { border: var(--ui-border-control) solid var(--ui-color-border); border-radius: var(--ui-radius-surface); }
    summary {
      box-sizing: border-box;
      min-block-size: var(--ui-size-control);
      padding: var(--ui-space-control-y) var(--ui-space-control-x);
      font-weight: var(--ui-weight-control);
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    summary:focus-visible { outline: var(--ui-border-focus) solid var(--ui-color-focus); outline-offset: var(--ui-border-focus-offset); }
    .ui-disclosure-content { padding: var(--ui-space-field); border-block-start: var(--ui-border-control) solid var(--ui-color-border); }
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
