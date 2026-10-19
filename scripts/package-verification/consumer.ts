import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextInput, ActionControl, Spreadsheet, PDFViewer, MapView } from './.ui/generated/angular';

@Component({
  selector: 'package-consumer', standalone: true,
  imports: [ReactiveFormsModule, TextInput, ActionControl, Spreadsheet, PDFViewer, MapView],
  template: `<section [attr.data-ui-profile]="profile">
    <button uiAction (click)="profile=profile==='guided'?'dense':'guided'">Switch profile</button>
    <ui-text-input controlId="draft" label="Draft" [formControl]="draft" />
    <output data-testid="draft">{{draft.value}}</output>
    <ui-spreadsheet label="Package sheet" [sheet]="sheet" workerUrl="/assets/sheet-formula.worker.js" />
    <ui-pdf-viewer label="Package PDF" source="/sample.pdf" workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" />
    <ui-map label="Package map" workerUrl="/assets/maplibre/maplibre-gl-worker.mjs" />
  </section>`,
})
class PackageConsumer {
  profile = 'guided';
  draft = new FormControl('');
  sheet = { rows: [[2, 3, '=SUM(A1:B1)']] };
}
bootstrapApplication(PackageConsumer).catch(error => console.error(error));
