import {Component, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Card,TextInput,ActionControl,Menu,OverlayHost,FlowEditor,Chart,type MenuItem,type DiagramModel,type DiagramChange,type ChartSeries} from './.ui/generated/angular/index';

@Component({selector:'independent-final-consumer',standalone:true,imports:[Card,TextInput,ActionControl,Menu,OverlayHost,FlowEditor,Chart,ReactiveFormsModule],
template:`<ui-card cardId="independent-card" title="保持する申請"><ui-text-input controlId="independent-field" label="保持する入力" [formControl]="value"/><button uiAction type="button" (click)="opened.set(!opened())">メニューを切り替える</button></ui-card><ui-overlay-host><ui-menu menuId="independent-menu" label="公開する階層メニュー" [items]="items" [open]="opened()" (openChange)="opened.set($event)" [closeOnSelect]="false"/></ui-overlay-host><ui-flow-editor label="公開図" [model]="diagram" (changeRequested)="intent($event)"/><ui-chart label="公開集計" kind="gauge" [series]="series"/>`})
export class IndependentFinalConsumer{
 readonly opened=signal(false);
 readonly value=new FormControl<string|null>('保持する raw input');
 readonly items:readonly MenuItem[]=[{id:'raw-parent',label:'親',children:[{id:'raw-child',label:'子',children:[{id:'raw-leaf',label:'葉'}]}]}];
 readonly diagram:DiagramModel={nodes:[{id:'raw-node',label:'申請',x:10,y:20}],edges:[]};
 readonly series:readonly ChartSeries[]=[{id:'raw-series',label:'件数',points:[{id:'raw-point',label:'確認',value:42}]}];
 lastIntent:DiagramChange|null=null;
 intent(change:DiagramChange):void{this.lastIntent=change;}
}
