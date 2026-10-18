import {Component,DestroyRef,inject,input,signal} from '@angular/core';
import {VirtualList,VirtualItem,TableColumnResize,DataTableView,TableTemplate,createTablePrintDocument,type TableColumn} from '../../.ui/generated/angular';
interface Row{id:number;name:string;}
@Component({selector:'runtime-p2-virtual-editor',standalone:true,imports:[VirtualList,VirtualItem],template:`<ui-virtual-list [items]="items()" keyField="id" labelField="name" label="投影された編集一覧" [height]="height()" [itemHeight]="itemHeight()" [overscan]="overscan()"><ng-template uiVirtualItem [uiVirtualItemOf]="items()" let-item><label>{{item.name}}<input class="ui-field-control" [attr.aria-label]="'編集 '+item.id" [value]="drafts().get(item.id)??'保持 '+item.id" (input)="save(item.id,$event)"></label></ng-template></ui-virtual-list>`})
export class RuntimeP2VirtualEditor{
 readonly items=input<readonly Row[]>(Array.from({length:1000},(_,id)=>({id,name:'申請 '+id+' long label '.repeat(5)})));readonly height=input<number|null>(null);readonly itemHeight=input<number|null>(null);readonly overscan=input(3);readonly drafts=signal<ReadonlyMap<number,string>>(new Map());
 save(id:number,event:Event):void{this.drafts.update(old=>new Map(old).set(id,(event.target as HTMLInputElement).value));}
}
@Component({selector:'runtime-p2-column-resize',standalone:true,imports:[TableColumnResize],template:`<div data-resize-column [style.width.px]="width()" style="box-sizing:border-box;position:relative;min-width:0"><span>申請の可変列</span><button type="button" uiTableColumnResize label="申請列の幅" [value]="width()" [minimum]="80" [maximum]="300" [disabled]="disabled()||busy()" (resizeChange)="resize($event)" style="position:absolute;inset-inline-end:0;top:0;height:100%">境界</button></div>`})
export class RuntimeP2ColumnResize{readonly disabled=input(false);readonly busy=input(false);readonly width=signal(150);readonly emitted=signal<readonly number[]>([]);resize(value:number):void{this.width.set(value);this.emitted.update(values=>[...values,value]);}}
@Component({selector:'runtime-p2-print',standalone:true,template:`<div data-print-scope>印刷元</div>`})
export class RuntimeP2Print{
 private current:ReturnType<typeof createTablePrintDocument>|null=null;private readonly destroyRef=inject(DestroyRef);
 constructor(){this.destroyRef.onDestroy(()=>this.current?.destroy());}
 create(scope:Element){this.current?.destroy();this.current=createTablePrintDocument([['氏名','内容'],['申請者','長い印刷本文 '.repeat(35)]],'検証する印刷表',document,scope);return this.current.frame;}
 close():void{this.current?.destroy();this.current=null;}
}

@Component({selector:'runtime-p2-native-editors',standalone:true,imports:[DataTableView,TableTemplate],template:`<ui-data-table caption="固定の編集一覧" tableId="p2-editor-native" [rows]="items" [columns]="columns" keyField="id" [pagination]="false" [stickyHeader]="true" [fixedStartKeys]="[0,1]" [fixedEndKeys]="[18,19]" [columnControls]="false" [resizableColumns]="false"><ng-template uiTableCell="name" [uiTableTemplateOf]="items" let-row><input class="ui-field-control" [attr.aria-label]="'申請 '+row.id" [value]="'保持 '+row.id"></ng-template></ui-data-table>`})
export class RuntimeP2NativeEditors{readonly items=Array.from({length:20},(_,id)=>({id,name:'長文 '.repeat(5)}));readonly columns:readonly TableColumn<Row>[]=[{id:'name',field:'name',header:'申請内容',minWidth:140,maxWidth:260}];}
