import {UiMessagePipe} from './locale';
import {Component,ChangeDetectionStrategy,SecurityContext,computed,forwardRef,input,output} from '@angular/core';
import {NG_VALUE_ACCESSOR} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import {inject} from '@angular/core';
import {marked} from 'marked';
import {SpecialistEditorControl} from './editor-control';
import {CodeEditor} from './code-editor';
import {specialistStyles} from './specialist-style';
export type MarkdownMode='edit'|'preview'|'split';
/** Security adapter: parsed Markdown HTML passes Angular sanitization; no bypassSecurityTrust* path. */
@Component({selector:'ui-markdown-preview',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,styles:[specialistStyles,`:host{padding:var(--ui-space-control-y)}.ui-markdown-content{overflow-wrap:anywhere}`],template:`<div class="ui-markdown-content" [innerHTML]="html()"></div>`})
export class MarkdownPreview {
 readonly source=input('');private readonly sanitizer=inject(DomSanitizer);readonly html=computed(()=>this.sanitizer.sanitize(SecurityContext.HTML,marked.parse(this.source(),{async:false}))??'');
}
@Component({selector:'ui-markdown-editor',standalone:true,imports:[CodeEditor,MarkdownPreview,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>MarkdownEditor),multi:true}],styles:[specialistStyles,`.ui-markdown-workspace{display:grid;gap:var(--ui-space-section);min-inline-size:0}.ui-markdown-split{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:40rem){.ui-markdown-split{grid-template-columns:minmax(0,1fr)}}`],template:`<section [attr.aria-label]="uiEffective_label()"><div class="ui-specialist-actions" role="group" [attr.aria-label]="'Markdownの表示' | uiMessage"><button type="button" [disabled]="blocked()" [attr.aria-pressed]="mode()==='edit'" (click)="modeChange.emit('edit')">{{'編集' | uiMessage}}</button><button type="button" [disabled]="blocked()" [attr.aria-pressed]="mode()==='preview'" (click)="modeChange.emit('preview')">{{'プレビュー' | uiMessage}}</button><button type="button" [disabled]="blocked()" [attr.aria-pressed]="mode()==='split'" (click)="modeChange.emit('split')">{{'分割表示' | uiMessage}}</button></div><div class="ui-markdown-workspace" [class.ui-markdown-split]="mode()==='split'"><ui-code-editor [hidden]="mode()==='preview'" [label]="uiEffective_label()+('のMarkdown' | uiMessage)" language="markdown" [value]="draft()" [readonly]="readonly()" [disabled]="blocked()" (valueChange)="edited($event)" (focusout)="touched()"/><ui-markdown-preview [hidden]="mode()==='edit'" [source]="draft()"/></div></section>`})
export class MarkdownEditor extends SpecialistEditorControl {readonly mode=input<MarkdownMode>('split');readonly modeChange=output<MarkdownMode>();}
