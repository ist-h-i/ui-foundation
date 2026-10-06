import {Component,ChangeDetectionStrategy,computed,signal} from '@angular/core';
import {FlowEditor,UiLocaleScope,changeDiagram,type DiagramChange,type DiagramModel,type UiLocaleOptions} from '../../.ui/generated/angular/index';

const initialDiagram=():DiagramModel=>({nodes:[{id:'a',label:'提出',x:16,y:16},{id:'b',label:'承認',x:300,y:100}],edges:[{id:'ab',from:'a',to:'b',label:'確認'}]});

/** A public-barrel controlled consumer, with app-owned data and locale updates. */
@Component({selector:'fixture-app',standalone:true,imports:[FlowEditor,UiLocaleScope],changeDetection:ChangeDetectionStrategy.OnPush,template:`
<main [attr.data-ui-profile]="profile()" [attr.dir]="rtl()?'rtl':'ltr'">
 <h1>フロー編集の検証</h1>
 <div class="fixture-controls">
  <button type="button" (click)="profile.set(profile()==='guided'?'dense':'guided')">プロファイル: {{profile()}}</button>
  <button type="button" (click)="rtl.set(!rtl())">方向: {{rtl()?'RTL':'LTR'}}</button>
  <label>読取り専用<input type="checkbox" [checked]="readonly()" (change)="readonly.set($any($event.target).checked)"></label>
  <label>処理中<input type="checkbox" [checked]="busy()" (change)="busy.set($any($event.target).checked)"></label>
  <label>操作抑止<input type="checkbox" [checked]="disabled()" (change)="disabled.set($any($event.target).checked)"></label>
  <button type="button" (click)="translate()">検証文言を切替</button>
  <button type="button" (click)="externalUpdate()">外部モデルを更新</button>
  <button type="button" (click)="model.set(initial())">元のモデルへ戻す</button>
  <button type="button" (click)="externalInvalidLabel()">外部の空ラベル</button>
  <button type="button" (click)="externalNegative()">外部の負座標</button>
  <button type="button" (click)="removeTarget()">対象ノードを外部除去</button>
 </div>
 <section [uiLocale]="locale()">
  <ui-flow-editor label="申請フロー" [model]="model()" [zoom]="zoom()" [selected]="selected()" [readonly]="readonly()" [busy]="busy()" [disabled]="disabled()" (changeRequested)="commit($event)" (layoutRequested)="model.set($event)" (zoomChange)="zoom.set($event)" (selectionChange)="selected.set($event)"/>
 </section>
 <output data-diagram-model [attr.data-value]="modelJson()">{{model().nodes.length}} nodes / {{model().edges.length}} edges</output>
 <output data-diagram-requests>{{requests()}}</output>
 <output data-diagram-selected>{{selected()||'なし'}}</output>
</main>`})
export class DiagramValidationCatalog {
 readonly profile=signal<'guided'|'dense'>('guided');readonly rtl=signal(false);readonly readonly=signal(false);readonly busy=signal(false);readonly disabled=signal(false);
 readonly model=signal<DiagramModel>(initialDiagram());readonly modelJson=computed(()=>JSON.stringify(this.model()));readonly zoom=signal(1);readonly selected=signal<string|null>(null);readonly requests=signal(0);readonly locale=signal<UiLocaleOptions>({locale:'ja-JP'});
 initial():DiagramModel{return initialDiagram();}
 commit(change:DiagramChange):void{const next=changeDiagram(this.model(),change);this.requests.update(value=>value+1);this.model.set(next);}
 externalUpdate():void{this.model.set({...this.model(),nodes:this.model().nodes.map(node=>node.id==='a'?{...node,label:'外部から更新',x:64,y:80}:node)});}
 externalInvalidLabel():void{this.model.set({...this.model(),nodes:this.model().nodes.map(node=>node.id==='a'?{...node,label:''}:node)});}
 externalNegative():void{this.model.set({...this.model(),nodes:this.model().nodes.map(node=>node.id==='a'?{...node,x:-12}:node)});}
 removeTarget():void{this.model.set({nodes:this.model().nodes.filter(node=>node.id!=='a'),edges:this.model().edges.filter(edge=>edge.from!=='a'&&edge.to!=='a')});}
 translate():void{this.locale.set({locale:'en-US',messages:{'ノードのラベルを入力してください。':'Enter a node label.','位置は0〜1000000の範囲で入力してください。':'Enter a position from 0 to 1000000.','Node labels must not be empty':'Application diagram has an empty node label.','Node coordinates are invalid':'Application diagram has an invalid position.','ラベル':'Label','横位置':'X position','縦位置':'Y position','提出':'Do not translate application data'}});}
}
