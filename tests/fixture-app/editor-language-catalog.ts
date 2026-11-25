import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CodeEditor, type CodeLanguage } from '../../.ui/generated/angular/index';

@Component({
  selector: 'fixture-app',
  imports: [CodeEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (option of languages; track option) {
      <button (click)="language.set(option)">{{ option }}</button>
    }
    <ui-code-editor label="Code" [language]="language()" [value]="draft()" (valueChange)="draft.set($event)" />
    <output>{{ draft() }}</output>
  `,
})
export class EditorLanguageCatalog {
  protected readonly languages: CodeLanguage[] = ['text', 'javascript', 'typescript', 'json', 'markdown'];
  protected readonly language = signal<CodeLanguage>('text');
  protected readonly draft = signal('source');
}
