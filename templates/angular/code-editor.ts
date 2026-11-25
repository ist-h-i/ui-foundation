import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {UiStableMessagePipe} from './locale';
import {Component,ChangeDetectionStrategy,DestroyRef,ElementRef,afterNextRender,effect,input,signal,viewChild,inject,forwardRef,untracked} from '@angular/core';
import {NG_VALUE_ACCESSOR} from '@angular/forms';
import type {EditorView as CmView} from '@codemirror/view';
import type {Compartment as CmCompartment,Extension} from '@codemirror/state';
import type {CompletionContext} from '@codemirror/autocomplete';
import {SpecialistEditorControl} from './editor-control';
import {codeInputSelectionGuard} from './code-editor-input';
import {type CodeLanguage,type CodeCompletion} from './editor-model';
import {observeSpecialistScope} from './specialist-browser';
import {specialistStyles} from './specialist-style';
async function loadLanguage(language: Exclude<CodeLanguage, 'text'>): Promise<Extension> {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return (await import('@codemirror/lang-javascript')).javascript({ typescript: language === 'typescript' });
    case 'json':
      return (await import('@codemirror/lang-json')).json();
    case 'markdown':
      return (await import('@codemirror/lang-markdown')).markdown();
  }
}

@Component({imports:[UiStableMessagePipe],selector:'ui-code-editor',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>CodeEditor),multi:true}],styles:specialistStyles,template:`<section [attr.aria-label]="uiEffective_label()"><p>{{uiEffective_label()}}</p><div #surface class="ui-code-surface" dir="ltr" (focusout)="touched()"></div>@if(loading()){<p role="status">{{'uiFoundation.codeEditor.preparingTheEditor' | uiStableMessage}}</p>}@if(renderError()){<p class="ui-specialist-error" role="alert">{{renderError()}}</p>}<ng-content/></section>`})
export class CodeEditor extends SpecialistEditorControl {
 private readonly uiRuntimeText_CodeEditor=injectUiRuntimeText();

 readonly language=input<CodeLanguage>('text');readonly completions=input<readonly CodeCompletion[]>([]);readonly lineNumbers=input(true);readonly loading=signal(true);readonly renderError=uiMessageState<string | null>(null);private readonly surface=viewChild.required<ElementRef<HTMLElement>>('surface');private readonly host=inject<ElementRef<HTMLElement>>(ElementRef);private readonly destroyRef=inject(DestroyRef);private editor:CmView|null=null;private configuration:CmCompartment|null=null;private updateConfiguration:((extensions:Extension[])=>void)|null=null;private extensions:(()=>Extension[])|null=null;private suppressed=false;private destroyed=false;private stopScope:(()=>void)|null=null;
 private readonly languageCompartment = signal<CmCompartment | null>(null);
 constructor(){super();effect(()=>{this.updateDocument(this.draft());});effect(()=>{this.uiEffective_label();this.completions();this.lineNumbers();this.readonly();this.disabled();this.formDisabled();this.busy();untracked(()=>{this.updateDocument(this.draft());this.configure();});});effect(onCleanup => {
   const language = this.language();
   const compartment = this.languageCompartment();
   const editor = this.editor;
   if (!compartment || !editor) return;

   // Remove commands from the previous language while its replacement loads.
   editor.dispatch({ effects: compartment.reconfigure([]) });
   this.renderError.set(null);
   this.loading.set(language !== 'text');
   if (language === 'text') return;

   let active = true;
   onCleanup(() => { active = false; });
   const current = () => active && !this.destroyed && this.language() === language;
   void loadLanguage(language).then(extension => {
     if (!current()) return;
     editor.dispatch({ effects: compartment.reconfigure(extension) });
     this.loading.set(false);
   }).catch(() => {
     if (current()) this.reportLoadFailure();
   });
 });afterNextRender(()=>{void this.mount();});this.destroyRef.onDestroy(()=>{this.destroyed=true;this.stopScope?.();this.editor?.destroy();this.editor=null;});}
 private async mount():Promise<void>{try{const [state,view,commands,autocomplete]=await Promise.all([import('@codemirror/state'),import('@codemirror/view'),import('@codemirror/commands'),import('@codemirror/autocomplete')]);if(this.destroyed)return;this.configuration=new state.Compartment();const languageCompartment = new state.Compartment();const nativeInput=codeInputSelectionGuard(state);const theme=view.EditorView.theme({'&':{fontSize:'var(--ui-text-body)',color:'var(--ui-color-text)',backgroundColor:'var(--ui-color-surface)'},'.cm-content':{fontFamily:'var(--ui-font-code)',minHeight:'calc(var(--ui-size-control)*3)',padding:'var(--ui-space-control-y) 0'},'.cm-scroller':{overflow:'auto',maxHeight:'var(--ui-size-table-viewport)'},'.cm-gutters':{backgroundColor:'var(--ui-color-background)',color:'var(--ui-color-muted)',borderRight:'var(--ui-border-control) solid var(--ui-color-border)'},'.cm-activeLineGutter':{backgroundColor:'var(--ui-color-disabled-surface)'},'.cm-cursor':{borderLeftColor:'var(--ui-color-focus)'},'&.cm-focused':{outline:'var(--ui-border-focus) solid var(--ui-color-focus)',outlineOffset:'var(--ui-border-focus-offset)'},'.cm-tooltip':{backgroundColor:'var(--ui-color-surface)',color:'var(--ui-color-text)',border:'var(--ui-border-control) solid var(--ui-color-border)'},'.cm-tooltip-autocomplete > ul > li[aria-selected]':{backgroundColor:'var(--ui-color-action)',color:'var(--ui-color-on-action)'}});this.extensions=()=>{return [state.EditorState.readOnly.of(this.readonly()||this.blocked()),view.EditorView.editable.of(!this.readonly()&&!this.blocked()),view.EditorView.contentAttributes.of({'aria-label':this.uiEffective_label(),'aria-multiline':'true',role:'textbox',tabindex:'0','aria-readonly':String(this.readonly()),'aria-disabled':String(this.blocked())}),this.lineNumbers()?view.lineNumbers():[],autocomplete.autocompletion({override:this.completions().length?[(context:CompletionContext)=>{const word=context.matchBefore(/[\w$]*/);return word&&(context.explicit||word.from!==word.to)?{from:word.from,options:this.completions().map(item=>({...item}))}:null;}]:undefined}),theme];};this.editor=new view.EditorView({parent:this.surface().nativeElement,state:state.EditorState.create({doc:this.draft(),extensions:[view.EditorView.domEventObservers({beforeinput:nativeInput.beforeinput,compositionstart:nativeInput.clear,blur:nativeInput.clear,keyup:nativeInput.clear}),view.EditorView.inputHandler.of(nativeInput.input),state.EditorState.transactionFilter.of(nativeInput.filter),commands.history(),languageCompartment.of([]),view.keymap.of([...commands.defaultKeymap,...commands.historyKeymap,...autocomplete.completionKeymap]),this.configuration.of(this.extensions()),view.EditorView.updateListener.of(update=>{if(update.docChanged&&!this.suppressed)this.edited(update.state.doc.toString());})]})});this.updateConfiguration=extensions=>this.editor!.dispatch({effects:this.configuration!.reconfigure(extensions)});this.stopScope=observeSpecialistScope(this.host.nativeElement,()=>this.editor?.requestMeasure());this.updateDocument(this.draft());this.configure();this.languageCompartment.set(languageCompartment);}catch{if(!this.destroyed)this.reportLoadFailure();}}
 private reportLoadFailure(): void {
   this.loading.set(false);
   this.renderError.setMessage([() => this.uiRuntimeText_CodeEditor("uiFoundation.codeEditor.unableToPrepareTheEditorYourInputIsStillAvailable")]);
 }
 private updateDocument(value:string):void{if(!this.editor||this.destroyed)return;this.suppressed=true;try{if(this.editor.state.doc.toString()!==value)this.editor.dispatch({changes:{from:0,to:this.editor.state.doc.length,insert:value}});}finally{this.suppressed=false;}}
 private configure():void{if(!this.editor||!this.extensions||this.destroyed)return;this.suppressed=true;try{this.updateConfiguration?.(this.extensions());}finally{this.suppressed=false;}}
}
