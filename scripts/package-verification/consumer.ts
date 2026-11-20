import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { LucideFolder } from '@lucide/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextInput, ActionControl, UiMessagePipe, injectUiLocale, Spreadsheet, PDFViewer, MapView, RichTextEditor, IconButton, ActionLink, FormField, FieldControl, FormLayout, ImageCropper, Kanban, provideUiIcons } from './.ui/generated/angular';

@Component({
  selector: 'package-consumer', standalone: true,
  imports: [ReactiveFormsModule, TextInput, ActionControl, UiMessagePipe, Spreadsheet, PDFViewer, MapView, RichTextEditor, IconButton, ActionLink, FormField, FieldControl, FormLayout, ImageCropper, Kanban],
  template: `<section [attr.data-ui-profile]="profile">
    <button uiAction (click)="profile=profile==='guided'?'dense':'guided'">Switch profile</button>
    <button uiAction (click)="iconDisabled=!iconDisabled">Toggle folder availability</button>
    <button uiIconButton icon="folder" label="Open folder" shape="round" [disabled]="iconDisabled"></button>
    <a uiAction href="/next" [external]="true">Open link</a>
    <ui-form-field controlId="packed-option" label="Packed option" [required]="true">
      <input uiFieldControl type="checkbox" id="packed-option">
    </ui-form-field>
    <ui-text-input controlId="draft" label="Draft" [formControl]="draft" />
    <form uiFormLayout>
      <ui-form-field controlId="packed-name" label="Packed name">
        <input uiFieldControl id="packed-name">
      </ui-form-field>
    </form>
    <section>
      <ui-image-cropper label="Packed crop" alt="Source image" />
    </section>
    <output data-testid="default-locale">{{locale().locale}}</output>
    <output data-testid="default-message">{{'閉じる' | uiMessage}}</output>
    <output data-testid="draft">{{draft.value}}</output>
    <ui-kanban label="Packed board" [columns]="columns" [cards]="cards" />
    <ui-spreadsheet label="Package sheet" [sheet]="sheet" workerUrl="/assets/sheet-formula.worker.js" />
    <ui-pdf-viewer label="Package PDF" source="/sample.pdf" workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" />
    <ui-rich-text-editor label="Packed rich text" />
    <ui-map label="Package map" workerUrl="/assets/maplibre/maplibre-gl-worker.mjs" />
  </section>`,
})
class PackageConsumer {
  readonly locale = injectUiLocale();
  profile = 'guided';
  iconDisabled = false;
  draft = new FormControl('');
  columns = [{ id: 'todo', label: 'To do' }, { id: 'done', label: 'Done' }];
  cards = [{ id: 'packed-card', label: 'Packed card', columnId: 'todo' }];
  sheet = { rows: [[2, 3, '=SUM(A1:B1)']] };
}
bootstrapApplication(PackageConsumer, { providers: [provideUiIcons(LucideFolder)] }).catch(error => console.error(error));
