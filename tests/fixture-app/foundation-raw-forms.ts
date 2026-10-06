import {ChangeDetectionStrategy,Component,viewChild} from '@angular/core';
import {FormControl,ReactiveFormsModule,Validators} from '@angular/forms';
import {MessageComposer} from '../../.ui/generated/angular/chat';
import {CodeEditor} from '../../.ui/generated/angular/code-editor';
import {RichTextEditor} from '../../.ui/generated/angular/rich-text-editor';
import {FileUpload} from '../../.ui/generated/angular/file-upload';
import type {ChatSendRequest} from '../../.ui/generated/angular/specialist-model';
@Component({selector:'raw-forms',standalone:true,imports:[ReactiveFormsModule,MessageComposer,CodeEditor,RichTextEditor,FileUpload],changeDetection:ChangeDetectionStrategy.OnPush,template:`
<section id="raw-composer"><ui-message-composer [formControl]="text" (sendRequested)="request=$event"/><output id="raw-text-value">{{text.value}}</output><output id="raw-text-status">{{text.status}}</output></section>
<section id="raw-code"><ui-code-editor label="Direct code" [formControl]="code"/><output id="raw-code-value">{{code.value}}</output></section>
<section id="raw-rich"><ui-rich-text-editor label="Direct rich" [formControl]="rich"/><output id="raw-rich-value">{{rich.value}}</output></section>
<section id="raw-file"><ui-file-upload label="Direct file" controlId="raw-files" [formControl]="file" accept=".txt"/><output id="raw-file-value">{{files(file.value)}}</output><output id="raw-file-status">{{file.status}}</output></section>`,styles:`section{min-inline-size:0;padding-block:var(--ui-space-section);}output{display:block;overflow-wrap:anywhere;}`})
export class RawForms{
 readonly text=new FormControl('raw draft',{nonNullable:true,validators:Validators.required});readonly code=new FormControl('raw = 1',{nonNullable:true});readonly rich=new FormControl(JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Raw'}]}]}),{nonNullable:true});readonly file=new FormControl<readonly File[]|null>(null);readonly composer=viewChild.required(MessageComposer);request:ChatSendRequest|null=null;
 files(value:unknown):string{return Array.isArray(value)?value.map(file=>file.name).join(','):String(value);}
}
