import {uiMessageState} from './locale';
import {injectUiText as injectUiRuntimeText} from './locale';
import {UiMessagePipe} from './locale';
import {Component,ChangeDetectionStrategy,DestroyRef,ElementRef,afterNextRender,effect,input,signal,viewChild,inject,forwardRef} from '@angular/core';
import {NG_VALUE_ACCESSOR} from '@angular/forms';
import type {EditorView as PmView} from 'prosemirror-view';
import type {Schema} from 'prosemirror-model';
import type {Command,EditorState,Transaction} from 'prosemirror-state';
import {SpecialistEditorControl} from './editor-control';
import {checkedRichDocument,defaultRichDocument,type RichToolbarAction} from './editor-model';
import {safeEditorUrl} from './specialist-model';
import {specialistStyles} from './specialist-style';
const toolbarLabels:Record<RichToolbarAction,string>={bold:'太字',italic:'斜体',code:'コード',paragraph:'段落',heading:'見出し',link:'リンクを設定',image:'画像を挿入',undo:'元に戻す',redo:'やり直す'};
@Component({imports:[UiMessagePipe],selector:'ui-rich-text-editor',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>RichTextEditor),multi:true}],styles:[specialistStyles,`.ui-rich-toolbar{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap)}`],template:`
<section [attr.aria-label]="uiEffective_label()"><p>{{uiEffective_label()}}</p><div class="ui-rich-toolbar" role="group" [attr.aria-label]="uiEffective_label()+('の書式' | uiMessage)">@for(action of toolbar();track action){<button type="button" [disabled]="blocked()||readonly()||loading()||documentInvalid()" (mousedown)="$event.preventDefault()" (click)="command(action)">{{actionLabel(action)}}</button>}</div>
<div class="ui-specialist-actions"><label>{{'リンク・画像URL' | uiMessage}}<input type="url" [value]="urlDraft()" [disabled]="blocked()||readonly()" (input)="setUrl($event)"></label><label>{{'画像の代替説明' | uiMessage}}<input type="text" [value]="altDraft()" [disabled]="blocked()||readonly()" (input)="setAlt($event)"></label></div><div #surface (focusout)="touched()"></div>@if(loading()){<p role="status">{{'エディターを準備しています。' | uiMessage}}</p>}@if(renderError()){<p class="ui-specialist-error" role="alert">{{renderError()}}</p>}</section>`})
export class RichTextEditor extends SpecialistEditorControl {
 private readonly uiRuntimeText_RichTextEditor=injectUiRuntimeText();

 readonly toolbar=input<readonly RichToolbarAction[]>(['bold','italic','code','paragraph','heading','link','image','undo','redo']);readonly urlDraft=signal('');readonly altDraft=signal('');readonly loading=signal(true);readonly renderError=uiMessageState<string | null>(null);readonly documentInvalid=signal(false);private readonly ready=signal(false);private mounting=false;private readonly surface=viewChild.required<ElementRef<HTMLElement>>('surface');private readonly destroyRef=inject(DestroyRef);private editor:PmView|null=null;private schema:Schema|null=null;private commands:Partial<Record<RichToolbarAction,Command>>={};private destroyed=false;
 constructor(){super();effect(()=>{this.draft();this.uiEffective_label();this.readonly();this.disabled();this.formDisabled();this.busy();if(this.ready()&&!this.editor&&!this.mounting)void this.mount();else this.update();});afterNextRender(()=>{this.ready.set(true);});this.destroyRef.onDestroy(()=>{this.destroyed=true;this.editor?.destroy();this.editor=null;});}
 private async mount():Promise<void>{if(this.mounting||this.destroyed)return;this.mounting=true;this.loading.set(true);try{const [state,view,basic,commands,keymap,history]=await Promise.all([import('prosemirror-state'),import('prosemirror-view'),import('prosemirror-schema-basic'),import('prosemirror-commands'),import('prosemirror-keymap'),import('prosemirror-history')]);if(this.destroyed)return;this.schema=basic.schema;const doc=this.schema.nodeFromJSON(checkedRichDocument(this.draft()||defaultRichDocument));this.commands={bold:commands.toggleMark(this.schema.marks['strong']),italic:commands.toggleMark(this.schema.marks['em']),code:commands.toggleMark(this.schema.marks['code']),paragraph:commands.setBlockType(this.schema.nodes['paragraph']),heading:commands.setBlockType(this.schema.nodes['heading'],{level:2}),undo:history.undo,redo:history.redo};this.editor=new view.EditorView(this.surface().nativeElement,{state:state.EditorState.create({schema:this.schema,doc,plugins:[history.history(),keymap.keymap({'Mod-z':history.undo,'Mod-Shift-z':history.redo,'Mod-y':history.redo,'Mod-b':this.commands.bold!,'Mod-i':this.commands.italic!}),keymap.keymap(commands.baseKeymap)]}),editable:()=>!this.readonly()&&!this.blocked(),attributes:{class:'ui-rich-editor',role:'textbox','aria-label':this.uiEffective_label(),'aria-multiline':'true',tabindex:'0'},dispatchTransaction:transaction=>this.dispatch(transaction)});this.loading.set(false);this.documentInvalid.set(false);this.update();}catch(error){if(!this.destroyed){this.loading.set(false);this.renderError.setMessage([() => this.uiRuntimeText_RichTextEditor('文書を表示できません。元の内容は保持されています。')]);this.documentInvalid.set(true);}}finally{this.mounting=false;}}
 /** Validate the resulting transaction chain before either DOM or CVA can observe it. */
 private dispatch(transaction:Transaction):void {
  const editor=this.editor;if(!editor||this.destroyed)return;const previous=editor.state;
  if(transaction.docChanged&&(this.blocked()||this.readonly()||this.documentInvalid())){editor.updateState(previous);return;}
  let next:EditorState,serialized:string|undefined;
  try {
   next=previous.applyTransaction(transaction).state;
   if(!next.doc.eq(previous.doc)){serialized=JSON.stringify(next.doc.toJSON());checkedRichDocument(serialized);}
  } catch {
   // updateState also repairs native DOM edits that were rejected by the transaction boundary.
   editor.updateState(previous);this.renderError.setMessage([() => this.uiRuntimeText_RichTextEditor('文書形式またはURLを確認してください。元の内容は保持されています。')]);return;
  }
  editor.updateState(next);
  if(serialized!==undefined){this.renderError.set(null);this.edited(serialized);}
 }
 private update():void{if(!this.editor||!this.schema||this.destroyed)return;try{const doc=this.schema.nodeFromJSON(checkedRichDocument(this.draft()||defaultRichDocument));if(!this.editor.state.doc.eq(doc)){const transaction=this.editor.state.tr.replaceWith(0,this.editor.state.doc.content.size,doc.content);this.editor.updateState(this.editor.state.apply(transaction));}this.documentInvalid.set(false);this.editor.setProps({editable:()=>!this.readonly()&&!this.blocked()&&!this.documentInvalid(),attributes:{class:'ui-rich-editor',role:'textbox','aria-label':this.uiEffective_label(),'aria-multiline':'true',tabindex:'0','aria-readonly':String(this.readonly()),'aria-disabled':String(this.blocked())}});this.renderError.set(null);}catch{this.documentInvalid.set(true);this.editor.setProps({editable:()=>false,attributes:{class:'ui-rich-editor',role:'textbox','aria-label':this.uiEffective_label(),'aria-multiline':'true','aria-readonly':'true','aria-invalid':'true',tabindex:'0'}});this.renderError.setMessage([() => this.uiRuntimeText_RichTextEditor('文書形式またはURLを確認してください。元の内容は保持されています。')]);}}
 actionLabel(action:RichToolbarAction):string{return this.uiRuntimeText_RichTextEditor(toolbarLabels[action]);}setUrl(event:Event):void{this.urlDraft.set((event.target as HTMLInputElement).value);}setAlt(event:Event):void{this.altDraft.set((event.target as HTMLInputElement).value);}
 command(action:RichToolbarAction):void{const editor=this.editor,schema=this.schema;if(!editor||!schema||this.blocked()||this.readonly()||this.documentInvalid())return;
  if(action==='link'){const url=safeEditorUrl(this.urlDraft());if(!url){this.renderError.setMessage([() => this.uiRuntimeText_RichTextEditor('http、https、mailtoのURLを入力してください。')]);return;}const {from,to}=editor.state.selection;if(from===to){this.renderError.setMessage([() => this.uiRuntimeText_RichTextEditor('リンクを設定する文字を選択してください。')]);return;}editor.dispatch(editor.state.tr.addMark(from,to,schema.marks['link'].create({href:url})));}
  else if(action==='image'){const url=safeEditorUrl(this.urlDraft(),true);if(!url||!this.altDraft().trim()){this.renderError.setMessage([() => this.uiRuntimeText_RichTextEditor('画像のhttp・https URLと代替説明を入力してください。')]);return;}editor.dispatch(editor.state.tr.replaceSelectionWith(schema.nodes['image'].create({src:url,alt:this.altDraft()})));}
  else this.commands[action]?.(editor.state,transaction=>editor.dispatch(transaction),editor);
  this.renderError.set(null);editor.focus();
 }
}
