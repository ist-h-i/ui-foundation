import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, forwardRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { ActionControl } from './action-control';
import { ValueControl } from './value-control';
import { canFocus } from './focus';
export interface InlineEditRequest { requestId: number; value: string; previousValue: string; }
/** Saving emits intent. Only an app-confirmed, matching result publishes the value. */
@Component({ selector: 'ui-inline-edit', standalone: true, imports: [ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InlineEdit), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => InlineEdit), multi: true }],
  template: `<section [attr.aria-label]="label()" [attr.aria-busy]="busy()||!!pending()" [attr.aria-describedby]="descriptions()"><div class="ui-inline-display" [hidden]="editing()"><span class="ui-inline-value">{{current()||uiEffective_emptyLabel()}}</span><button #start uiAction type="button" [disabled]="blocked()||readonly()" (click)="begin()">{{uiEffective_editLabel()}}</button></div><div [hidden]="!editing()"><label [for]="controlId()">{{label()}}@if(required()){<span class="ui-inline-required">  {{'uiFoundation.inlineEdit.required' | uiStableMessage}}</span>}</label>@if(multiline()){<textarea #editor class="ui-field-control" [id]="controlId()" [name]="name()" [value]="draft()" [rows]="rows()" [disabled]="disabledState()" [readOnly]="blocked()||readonly()||!!pending()" [attr.aria-required]="required()" [attr.aria-invalid]="error()||problem()?'true':null" [attr.aria-describedby]="descriptions()" (input)="edit($event)" (keydown)="key($event)" (blur)="touch()"></textarea>}@else{<input #editor class="ui-field-control" type="text" [id]="controlId()" [name]="name()" [value]="draft()" [disabled]="disabledState()" [readOnly]="blocked()||readonly()||!!pending()" [attr.aria-required]="required()" [attr.aria-invalid]="error()||problem()?'true':null" [attr.aria-describedby]="descriptions()" (input)="edit($event)" (keydown)="key($event)" (blur)="touch()">}<div class="ui-inline-actions"><button uiAction type="button" [disabled]="blocked()||readonly()||!!pending()||!!draftError()" (click)="save()">{{uiEffective_saveLabel()}}</button><button uiAction type="button" [disabled]="blocked()||readonly()||!!pending()" (click)="cancel()">{{uiEffective_cancelLabel()}}</button></div></div>@if(hint()){<p class="ui-inline-hint" [id]="controlId()+'-hint'">{{hint()}}</p>}@if(error()||problem()){<p class="ui-inline-error" [id]="controlId()+'-error'" role="status">{{error()||problem()}}</p>}@if(pending()||busy()){<p class="ui-inline-hint" role="status">{{uiEffective_busyLabel()}}</p>}</section>`,
  styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}section,label{display:block;min-inline-size:0;overflow-wrap:anywhere;}label{font-weight:var(--ui-weight-control);margin-block-end:var(--ui-space-control-gap);}.ui-inline-display,.ui-inline-actions{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);}.ui-inline-display[hidden]{display:none;}.ui-inline-value{flex:1 1 calc(var(--ui-text-body) * 8);min-inline-size:0;white-space:pre-wrap;overflow-wrap:anywhere;}.ui-inline-actions{margin-block-start:var(--ui-space-control-gap);}.ui-inline-hint{color:var(--ui-color-muted);font-size:var(--ui-text-small);margin-block:var(--ui-space-control-gap);}.ui-inline-error,.ui-inline-required{color:var(--ui-color-danger);}` })
export class InlineEdit extends ValueControl<string> implements Validator {
 private readonly uiRuntimeText_InlineEdit=injectUiRuntimeText();

 protected readonly uiText_InlineEdit=injectUiMessageText();
  protected readonly emptyValue = '';
  readonly multiline = input(false, { transform: booleanAttribute });
  readonly rows = input(3);
  readonly maxLength = input<number | null>(null);
  readonly validateValue = input<((value: string) => string | null) | null>(null);
  readonly editLabel = input<string>();
 protected readonly uiEffective_editLabel=uiLocaleComputed(()=>this.editLabel()??this.uiText_InlineEdit("uiFoundation.inlineEdit.edit"));
  readonly saveLabel = input<string>();
 protected readonly uiEffective_saveLabel=uiLocaleComputed(()=>this.saveLabel()??this.uiText_InlineEdit("uiFoundation.inlineEdit.save"));
  readonly cancelLabel = input<string>();
 protected readonly uiEffective_cancelLabel=uiLocaleComputed(()=>this.cancelLabel()??this.uiText_InlineEdit("uiFoundation.inlineEdit.cancel"));
  readonly emptyLabel = input<string>();
 protected readonly uiEffective_emptyLabel=uiLocaleComputed(()=>this.emptyLabel()??this.uiText_InlineEdit("uiFoundation.inlineEdit.noInput"));
  readonly busyLabel = input<string>();
 protected readonly uiEffective_busyLabel=uiLocaleComputed(()=>this.busyLabel()??this.uiText_InlineEdit("uiFoundation.inlineEdit.checkingWhetherTheChangesWereSaved"));
  readonly saveRequested = output<InlineEditRequest>();
  readonly editingChange = output<boolean>();
  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly pending = signal<InlineEditRequest | null>(null);
  private readonly resultError = signal('');
  private readonly editor = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('editor');
  private readonly start = viewChild<unknown, ElementRef<HTMLButtonElement>>('start', {read: ElementRef});
  private readonly destroy = inject(DestroyRef);
  private sequence = 0;
  private focusAfterStart = false;
  private focusAfterFinish = false;
  private observedCurrent: string | undefined;
  private validatorChanged: () => void = () => {};
  protected readonly configurationError = computed(() => ![this.label(), this.uiEffective_editLabel(), this.uiEffective_saveLabel(), this.uiEffective_cancelLabel(), this.uiEffective_emptyLabel(), this.uiEffective_busyLabel()].every(value => value.trim()) || !Number.isSafeInteger(this.rows()) || this.rows() < 1 || this.maxLength() !== null && (!Number.isSafeInteger(this.maxLength()) || this.maxLength()! < 0) ? this.uiRuntimeText_InlineEdit("uiFoundation.inlineEdit.checkTheEditorDescriptionRowCountAndCharacterLimit") : null);
  protected readonly draftError = computed(() => this.configurationError() ?? this.checkValue(this.draft()));
  protected readonly problem = computed(() => this.resultError() || (this.editing() ? this.draftError() : this.configurationError()));
  protected readonly descriptions = computed(() => [this.hint() ? this.controlId() + '-hint' : '', this.error() || this.problem() ? this.controlId() + '-error' : ''].filter(Boolean).join(' ') || null);
  constructor() {
    super();
    afterRenderEffect(() => {
      const current = this.current();
      this.editing(); this.editor(); this.configurationError(); this.draft(); this.required(); this.maxLength(); this.validateValue();
      untracked(() => { this.syncExternalValue(current); this.validatorChanged(); if (this.focusAfterStart && this.editing() && canFocus(this.editor()?.nativeElement ?? null)) { this.focusAfterStart = false; this.editor()!.nativeElement.focus(); }
        if (this.focusAfterFinish && !this.editing() && canFocus(this.start()?.nativeElement ?? null)) { this.focusAfterFinish = false; this.start()!.nativeElement.focus({ preventScroll: true }); }
      });
    });
  }
  protected coerce(value: unknown): string { return typeof value === 'string' ? value : ''; }
  override writeValue(value: unknown): void {
    super.writeValue(value); this.draft.set(this.coerce(value)); this.resultError.set('');
    // A reset supersedes an outstanding UI request. It does not abort backend I/O.
    this.pending.set(null);
  }
  /** Invalidate UI acknowledgement before a parent change that has not reached this input yet. No I/O is aborted. */
  invalidatePending(): void {
    if (this.destroy.destroyed) return;
    this.pending.set(null); this.resultError.set('');
  }
  private syncExternalValue(current: string): void {
    if (this.observedCurrent === current) return;
    this.observedCurrent = current; this.invalidatePending();
    if (this.editing()) this.draft.set(current);
  }
  private requestIsCurrent(request: InlineEditRequest): boolean {
    if (this.current() === request.previousValue) return true;
    this.syncExternalValue(this.current()); return false;
  }
  private checkValue(value: string): string | null {
    if (this.required() && !value.trim()) return this.uiRuntimeText_InlineEdit("uiFoundation.inlineEdit.enterAValue");
    if (this.maxLength() !== null && [...value].length > this.maxLength()!) return this.uiRuntimeText_InlineEdit("uiFoundation.inlineEdit.enterNoMoreThanUi0Characters",{ui0:String(this.maxLength())});
    try { return this.validateValue()?.(value) ?? null; } catch { return this.uiRuntimeText_InlineEdit("uiFoundation.inlineEdit.couldNotFinishValidatingTheInput"); }
  }
  protected begin(): void {
    if (this.blocked() || this.readonly() || this.configurationError() || this.editing()) return;
    this.observedCurrent = this.current();
    this.draft.set(this.current()); this.resultError.set(''); this.focusAfterStart = true;
    this.editing.set(true); this.editingChange.emit(true);
  }
  protected edit(event: Event): void {
    if (this.blocked() || this.readonly() || this.pending()) return;
    this.draft.set(this.text(event)); this.resultError.set('');
  }
  protected save(): void {
    if (!this.editing() || this.blocked() || this.readonly() || this.pending() || this.draftError()) return;
    this.touch(); this.resultError.set('');
    const request = { requestId: ++this.sequence, value: this.draft(), previousValue: this.current() };
    this.pending.set(request); this.saveRequested.emit(request);
  }
  /** App-owned result; reject stale/destroyed requests and retain the failed draft. */
  fail(requestId: number, message: string): boolean {
    const request = this.pending();
    if (this.destroy.destroyed || !request || request.requestId !== requestId || !message.trim() || !this.requestIsCurrent(request)) return false;
    this.pending.set(null); this.resultError.set(message); return true;
  }
  complete(requestId: number, value?: string): boolean {
    const request = this.pending();
    if (this.destroy.destroyed || !request || request.requestId !== requestId || !this.requestIsCurrent(request)) return false;
    const confirmed = value ?? request.value;
    if (this.checkValue(confirmed)) return false;
    this.pending.set(null); this.resultError.set('');
    // ValueControl.publishValue is the shared CVA publication primitive;
    // user commits still honor blocked/readonly, app-confirmed results do not.
    this.publishValue(confirmed);
    this.finishEditing(); return true;
  }
  protected cancel(): void {
    if (!this.editing() || this.blocked() || this.readonly() || this.pending()) return;
    this.draft.set(this.current()); this.resultError.set(''); this.touch(); this.finishEditing();
  }
  private finishEditing(): void {
    const active = this.editor()?.nativeElement.ownerDocument.activeElement;
    const owned = active === this.editor()?.nativeElement || !!active?.closest('ui-inline-edit') && active.closest('ui-inline-edit') === this.start()?.nativeElement.closest('ui-inline-edit');
    this.editing.set(false); this.editingChange.emit(false);
    this.focusAfterFinish = owned;
  }
  protected key(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') { event.preventDefault(); this.cancel(); }
    else if (event.key === 'Enter' && (!this.multiline() || event.ctrlKey || event.metaKey)) { event.preventDefault(); this.save(); }
  }
  registerOnValidatorChange(callback: () => void): void { this.validatorChanged = callback; }
  validate(control: AbstractControl): ValidationErrors | null {
    const error = this.configurationError() ?? this.checkValue(this.editing() ? this.draft() : this.coerce(control.value));
    return error ? { inlineEdit: error } : null;
  }
}
