import {Component} from '@angular/core';
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {Card,TextInput,ActionControl,type TreeNode} from './relocated/ui/angular/index';
@Component({selector:'ownership-consumer',standalone:true,imports:[Card,TextInput,ActionControl,ReactiveFormsModule],template:`<ui-card cardId="ownership-card" [title]="title"><ui-text-input controlId="ownership-field" label="保持する入力" [formControl]="value"/><button uiAction type="button">保存</button></ui-card>`})
export class OwnershipConsumer {readonly title='移動した公開consumer';readonly value=new FormControl<string|null>('raw保持');readonly typedNodes:readonly TreeNode<{amount:number}>[]=[{id:'a',label:'A',data:{amount:1}}];}
