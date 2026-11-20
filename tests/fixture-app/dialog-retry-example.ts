import { Component, model, signal } from '@angular/core';
import { ActionControl, Dialog } from '../../.ui/generated/angular/index';

@Component({
  selector: 'fixture-retry-input',
  template: `<label>Item name <input [value]="value()" (input)="value.set($any($event.target).value)"></label>`,
})
export class RegistrationInput {
  readonly value = model('');
}

@Component({
  selector: 'fixture-app',
  imports: [ActionControl, Dialog, RegistrationInput],
  template: `
    <button uiAction type="button" [disabled]="openerDisabled()" (click)="open.set(true)">New registration</button>
    <dialog uiDialog label="Register item" [open]="open()" (openChange)="open.set($event)" [busy]="saving()">
      <form (submit)="$event.preventDefault(); save()">
        <fixture-retry-input [(value)]="name" />
        @if (failed()) { <p role="alert">Could not save. Try again.</p> }
        <button uiAction type="submit" [disabled]="saving()">Save</button>
      </form>
    </dialog>
  `,
})
export class DialogRetryExample {
  readonly open = signal(false);
  readonly name = signal('');
  readonly saving = signal(false);
  readonly failed = signal(false);
  protected readonly openerDisabled = signal(false);
  private readonly regression = new URLSearchParams(location.search).get('regression');

  async save() {
    if (this.saving()) return;
    this.saving.set(true);
    this.failed.set(false);
    try {
      const result = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name() }),
      });
      if (result.ok) {
        if (this.regression === 'focus') this.openerDisabled.set(true);
        this.open.set(false);
      } else {
        if (this.regression === 'draft') this.name.set('');
        this.failed.set(true);
      }
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
