import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextInput, ActionControl, Card, UiLocaleScope, UiStableMessagePipe, injectUiLocale, Spreadsheet, PDFViewer, MapView } from './.ui/generated/angular';
import { createLocaleAdapter } from './locale-adapter';

@Component({
  selector: 'package-consumer', standalone: true,
  imports: [ReactiveFormsModule, TextInput, ActionControl, Card, UiLocaleScope, UiStableMessagePipe, Spreadsheet, PDFViewer, MapView],
  template: `<section [attr.data-ui-profile]="profile">
    <button uiAction (click)="profile=profile==='guided'?'dense':'guided'">Switch profile</button>
    <button uiAction (click)="translations.switchLanguage('ja-JP')">Japanese</button>
    <button uiAction (click)="translations.switchLanguage('ar')">Arabic</button>
    <section data-testid="translated-region" [uiLocale]="translations.options()">
      <ui-text-input controlId="draft" label="Draft" [formControl]="draft" />
      <output data-testid="scoped-message">{{'uiFoundation.dialog.closeAction' | uiStableMessage}}</output>
      <ui-card cardId="locale-card" title="Application card" collapsible collapsed>Application content</ui-card>
    </section>
    <output data-testid="default-locale">{{locale().locale}}</output>
    <output data-testid="default-message">{{'uiFoundation.dialog.closeAction' | uiStableMessage}}</output>
    <output data-testid="draft">{{draft.value}}</output>
    <ui-spreadsheet label="Package sheet" [sheet]="sheet" workerUrl="/assets/sheet-formula.worker.js" />
    <ui-pdf-viewer label="Package PDF" source="/sample.pdf" workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" />
    <ui-map label="Package map" workerUrl="/assets/maplibre/maplibre-gl-worker.mjs" />
  </section>`,
})
class PackageConsumer {
  readonly locale = injectUiLocale();
  readonly translations = createLocaleAdapter();
  profile = 'guided';
  draft = new FormControl('');
  sheet = { rows: [[2, 3, '=SUM(A1:B1)']] };
}
bootstrapApplication(PackageConsumer).catch(error => console.error(error));
