import {Component,ChangeDetectionStrategy,computed,signal} from '@angular/core';
import {FlowEditor,UiLocaleScope,changeDiagram,type DiagramChange,type DiagramModel,type UiLocaleOptions} from '../../.ui/generated/angular/index';
const initial=():DiagramModel=>({nodes:[{id:'a',label:'提出 α',x:12.5,y:16},{id:'b',label:'承認',x:300,y:100}],edges:[{id:'ab',from:'a',to:'b',label:'確認'}]});
@Component({selector:'fixture-app',standalone:true,imports:[FlowEditor,UiLocaleScope],changeDetection:ChangeDetectionStrategy.OnPush,template:`
<main [attr.data-ui-profile]="profile()" [attr.dir]="rtl()?'rtl':'ltr'">
<h1>独立 Diagram consumer</h1>
<div class="fixture-controls"><button type="button" (click)="profile.set(profile()==='guided'?'dense':'guided')">profile {{profile()}}</button><button type="button" (click)="rtl.set(!rtl())">direction {{rtl()?'rtl':'ltr'}}</button><button type="button" (click)="localize()">locale</button><button type="button" (click)="reset()">reset</button><button type="button" (click)="external('label')">app label</button><button type="button" (click)="external('y')">app y</button><button type="button" (click)="remove()">app remove</button><button type="button" (click)="externalInvalid()">app invalid</button><label>readonly<input type="checkbox" [checked]="readonly()" (change)="flag('readonly',$event)"></label><label>busy<input type="checkbox" [checked]="busy()" (change)="flag('busy',$event)"></label><label>disabled<input type="checkbox" [checked]="disabled()" (change)="flag('disabled',$event)"></label></div>
<section [uiLocale]="locale()"><ui-flow-editor id="primary" label="独立フロー" [model]="model()" [zoom]="zoom()" [selected]="selected()" [readonly]="readonly()" [busy]="busy()" [disabled]="disabled()" (changeRequested)="commit($event)" (layoutRequested)="model.set($event)" (zoomChange)="zoom.set($event)" (selectionChange)="selected.set($event)"/><ui-flow-editor id="secondary" label="比較フロー" [model]="secondary"/></section>
<output id="app-model" [attr.data-json]="json()">{{requests()}} requests</output><output id="selected">{{selected()}}</output>
</main>`})
export class IndependentDiagramCatalog {
readonly profile=signal<'guided'|'dense'>('guided');readonly rtl=signal(false);readonly readonly=signal(false);readonly busy=signal(false);readonly disabled=signal(false);readonly model=signal<DiagramModel>(initial());readonly json=computed(()=>JSON.stringify(this.model()));readonly selected=signal<string|null>(null);readonly requests=signal(0);readonly zoom=signal(1);readonly secondary=initial();readonly locale=signal<UiLocaleOptions>({locale:'ja-JP'});
flag(which:'readonly'|'busy'|'disabled',event:Event):void{if(!(event.target instanceof HTMLInputElement))throw new Error('Expected native checkbox');this[which].set(event.target.checked);}
commit(change:DiagramChange):void{this.model.set(changeDiagram(this.model(),change));this.requests.update(n=>n+1);}
reset():void{this.model.set(initial());this.requests.set(0);}
external(field:'label'|'y'):void{this.model.update(m=>({...m,nodes:m.nodes.map(n=>n.id==='a'?{...n,...(field==='label'?{label:'APP 更新'}:{y:123.5})}:n)}));}
remove():void{this.model.update(m=>({nodes:m.nodes.filter(n=>n.id!=='a'),edges:m.edges.filter(e=>e.from!=='a'&&e.to!=='a')}));}
externalInvalid():void{this.model.update(m=>({...m,nodes:m.nodes.map(n=>n.id==='a'?{...n,x:-4}:n)}));}
localize():void{this.locale.set({locale:'en-US',messages:{'ノードのラベルを入力してください。':'Label is required.','位置は0〜1000000の範囲で入力してください。':'Position is outside the domain.','Node coordinates are invalid':'Invalid application coordinates.','ラベル':'label','横位置':'x','縦位置':'y','提出 α':'DO NOT TRANSLATE'}});}
}
