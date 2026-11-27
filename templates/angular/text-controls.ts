import { injectComponentMessageText } from './component-message-text';
import { textControlMessages } from './text-control-messages';
import {
  afterNextRender, afterRenderEffect, type AfterRenderRef, booleanAttribute, ChangeDetectionStrategy,
  Component, computed, DestroyRef, Directive, DOCUMENT, type ElementRef, forwardRef, inject, Injector,
  input, linkedSignal, untracked, viewChild,
} from '@angular/core';
import { COMPOSITION_BUFFER_MODE, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { textControlStyles } from './text-control-style';
import { FieldValueControl } from './value-control';

interface TextComposition {
  readonly text: string;
  readonly discarded: boolean;
}

@Directive()
abstract class ComposingTextControl extends FieldValueControl<string> {
  protected readonly emptyValue = '';
  protected readonly editor = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('editor');
  // Angular's default text accessor buffers except on Android. The application can override it.
  private readonly bufferComposition = inject(COMPOSITION_BUFFER_MODE, { optional: true })
    ?? !/android \d+/i.test(inject(DOCUMENT).defaultView?.navigator.userAgent ?? '');
  private readonly editable = computed(() => !this.blocked() && !this.readonly());
  private readonly composition = linkedSignal({
    source: () => ({ externalValue: this.value(), editable: this.editable() }),
    computation: (source, previous): TextComposition | null =>
      source.editable ? this.discardComposition(previous?.value ?? null) : null,
  });
  protected readonly displayedText = computed(() => this.composition()?.text ?? this.current());
  private readonly injector = inject(Injector);
  private lastComposition: string | null = null;
  private pendingReconciliation?: AfterRenderRef;

  protected coerce(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  override writeValue(value: unknown): void {
    super.writeValue(value);
    this.composition.update(composition => this.discardComposition(composition));
    this.restoreEditor();
  }

  protected beginComposition(event: Event): void {
    this.lastComposition = null;
    if (this.bufferComposition && this.editable()) {
      this.composition.set({ text: this.text(event), discarded: false });
    }
  }

  protected edit(event: Event): void {
    const value = this.text(event);
    if (!this.editable()) {
      this.restoreEditor();
      return;
    }
    const composition = this.composition();
    if (composition) {
      this.composition.set({ ...composition, text: value });
      return;
    }
    const input = event as InputEvent;
    if (this.bufferComposition && input.isComposing) {
      this.restoreEditor();
      return;
    }
    const taggedFinal = input.inputType === 'insertFromComposition' || input.inputType === 'insertCompositionText';
    // Chromium can expose a final insertion with data and an empty inputType.
    const untypedFinal = !input.inputType && input.data != null && (value === this.lastComposition || value === this.current());
    if (this.lastComposition !== null && (taggedFinal || untypedFinal)) {
      this.reconcileAfterRender();
      return;
    }
    // Ordinary edits are distinguishable from an old IME replay, even after a reset.
    this.commit(value);
  }

  protected endComposition(event: Event): void {
    if (!this.bufferComposition) return;
    const value = this.text(event);
    this.lastComposition = value;
    const composition = this.composition();
    this.composition.set(null);
    if (!composition || composition.discarded || !this.editable()) {
      this.restoreEditor();
      return;
    }
    this.commit(value);
  }

  protected clear(): void {
    if (!this.editable()) return;
    this.composition.update(composition => this.discardComposition(composition));
    this.commit('');
    this.restoreEditor();
    this.editor()?.nativeElement.focus();
  }

  protected blur(): void {
    if (this.composition()?.discarded) {
      this.composition.set(null);
      this.restoreEditor();
    }
    this.touch();
  }

  protected override commit(value: string): void {
    super.commit(value);
    if (this.value() !== undefined) this.reconcileAfterRender();
  }

  private reconcileAfterRender(): void {
    // Read the owner's decision after Angular has applied parent inputs, including a rejection or reset.
    this.pendingReconciliation ??= afterNextRender(() => {
      this.pendingReconciliation = undefined;
      this.restoreEditor();
    }, { injector: this.injector });
  }

  private discardComposition(composition: TextComposition | null): TextComposition | null {
    if (!composition) return null;
    const editor = untracked(this.editor)?.nativeElement;
    // Writing the DOM value during native composition can turn its pending
    // completion into ordinary input. Leave the buffer until it ends or blurs.
    return editor && editor.ownerDocument.activeElement === editor
      ? { ...composition, discarded: true }
      : null;
  }

  private restoreEditor(): void {
    if (this.composition()) return;
    const editor = this.editor()?.nativeElement;
    const value = this.displayedText();
    if (editor && editor.value !== value) editor.value = value;
  }
}

@Component({
 selector: 'ui-text-input', standalone: true, imports: [FormField, FieldControl, ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
 providers: [{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TextInput),multi:true}],
 template: `
  <ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [hintPosition]="hintPosition()" [controlCharacters]="controlCharacters()" [required]="required()" [hint]="hint()" [error]="error()">
   <div class="ui-input-group">
    <input #editor uiFieldControl type="text" [name]="name()" [value]="displayedText()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
      [attr.autocomplete]="autocomplete()" [disabled]="blocked()" [readOnly]="readonly()" (input)="edit($event)"
      (compositionstart)="beginComposition($event)" (compositionend)="endComposition($event)" (blur)="blur()">
    @if (clearable()) { <button uiAction [attr.aria-label]="messageText({id: 'uiFoundation.textInput.clearForLabel', parameters: {label:label()}})" [disabled]="blocked() || readonly() || !displayedText()" (click)="clear()">{{messageText({id: 'uiFoundation.textInput.clearForTextInput'})}}</button> }
   </div>
   @if (showCount()) { <p class="ui-input-count">{{ characterCount() }}</p> }
  </ui-form-field>
 `, styles: textControlStyles,
})
export class TextInput extends ComposingTextControl {
  protected readonly messageText = injectComponentMessageText(textControlMessages);

  protected characterCount(): string {
    const count = this.displayedText().length;
    const limit = this.maxLength();
    return limit === null
      ? this.messageText({ id: 'uiFoundation.textInput.characterCount', parameters: { count } })
      : this.messageText({ id: 'uiFoundation.textInput.characterCountWithLimit', parameters: { count, limit } });
  }
 readonly placeholder=input(''); readonly maxLength=input<number|null>(null); readonly autocomplete=input('off');
 readonly clearable=input(false,{transform:booleanAttribute}); readonly showCount=input(false,{transform:booleanAttribute});
}
@Component({
 selector:'ui-textarea',standalone:true,imports:[FormField,FieldControl],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Textarea),multi:true}],
 template:`<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [hintPosition]="hintPosition()" [controlCharacters]="controlCharacters()" [required]="required()" [hint]="hint()" [error]="error()">
  <textarea #editor uiFieldControl [name]="name()" [value]="displayedText()" [rows]="rows()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
   [disabled]="blocked()" [readOnly]="readonly()" [style.max-block-size.px]="checkedMaxHeight()" (input)="edit($event)"
   (compositionstart)="beginComposition($event)" (compositionend)="endComposition($event)" (blur)="blur()"></textarea>
  @if(showCount()){<p class="ui-input-count">{{ characterCount() }}</p>}
 </ui-form-field>`,styles:textControlStyles,
})
export class Textarea extends ComposingTextControl{
  protected readonly messageText = injectComponentMessageText(textControlMessages);

  protected characterCount(): string {
    const count = this.displayedText().length;
    const limit = this.maxLength();
    return limit === null
      ? this.messageText({ id: 'uiFoundation.textarea.characterCount', parameters: { count } })
      : this.messageText({ id: 'uiFoundation.textarea.characterCountWithLimit', parameters: { count, limit } });
  }
 readonly rows=input(3);readonly maxLength=input<number|null>(null);readonly maxHeight=input<number|null>(null);
 protected readonly checkedMaxHeight=computed(()=>{const height=this.maxHeight();if(height!==null&&(!Number.isFinite(height)||height<=0))throw new Error('ui-textarea maxHeight must be a positive pixel size.');return height;});
 readonly autoResize=input(false,{transform:booleanAttribute});readonly showCount=input(false,{transform:booleanAttribute});readonly placeholder=input('');
 constructor(){super();const render=afterRenderEffect(onCleanup=>{
   this.displayedText();this.rows();this.checkedMaxHeight();const automatic=this.autoResize(),element=this.editor()?.nativeElement;if(!element)return;
   if(!automatic){element.style.height='';return;}
   const view=element.ownerDocument.defaultView;let frame:number|null=null;
   const resize=()=>{frame=null;if(!element.getClientRects().length)return;const previous=element.style.height;element.style.height='auto';const height=element.scrollHeight+(element.offsetHeight-element.clientHeight)+'px';element.style.height=height;if(previous===height)return;};
   const schedule=()=>{if(frame===null&&view)frame=view.requestAnimationFrame(resize);};
   const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);observer?.observe(element);
   const profiles=typeof MutationObserver==='undefined'?null:new MutationObserver(schedule);profiles?.observe(element.ownerDocument.body,{subtree:true,attributes:true,attributeFilter:['data-ui-profile','hidden','class']});
   resize();onCleanup(()=>{observer?.disconnect();profiles?.disconnect();if(frame!==null)view?.cancelAnimationFrame(frame);});
  });inject(DestroyRef).onDestroy(()=>render.destroy());}
}
