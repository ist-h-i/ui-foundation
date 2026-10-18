import {RuntimeWarningLayout} from './runtime-warning-layout';
import {RuntimeWarningUtilityTable,RuntimeWarningAsyncTable,RuntimeWarningManagedTable} from './runtime-warning-tables';
import {RuntimeRadio} from './runtime-radio';
import {RuntimeSparseTab} from './runtime-sparse-tab';
import {RuntimeFastTab} from './runtime-fast-tab';
import {RuntimeReassessmentMasonry,RuntimeReassessmentDivider} from './runtime-reassessment-layout';
import {RuntimeReassessmentVirtual} from './runtime-reassessment-virtual';
import {CSSPanelRuntime} from './css-override-panel-runtime';
import {RuntimeResidualFrozenTable} from './runtime-residual-frozen';
import {RuntimeResidualScroll} from './runtime-residual-scroll';
import {RuntimeResidualCanvas} from './runtime-residual-engines';
import {RuntimeP2Measured} from './runtime-priority2-measured';
import {RuntimeP2VirtualEditor,RuntimeP2ColumnResize,RuntimeP2Print,RuntimeP2NativeEditors} from './runtime-priority2-tables';
import {RuntimeP2CascadeForm} from './runtime-priority2-cascade';
import { ApplicationRef, Component, ComponentRef, createComponent, EnvironmentInjector, ErrorHandler, input, reflectComponentType, Type, viewChild } from '@angular/core';
import * as foundation from '../../.ui/generated/angular';

@Component({selector:'runtime-typography',standalone:true,imports:[foundation.Typography],template:`<p [uiTypography]="$any(uiTypography())" [tone]="$any(tone())" [align]="$any(align())" [wrap]="$any(wrap())" [emphasis]="$any(emphasis())">{{text()}}</p>`})
export class TypographyRuntime {
 readonly uiTypography=input('body');readonly tone=input('neutral');readonly align=input('start');readonly wrap=input('wrap');readonly emphasis=input('normal');readonly text=input('申請の内容を確認する 長い説明 text for alignment');
}
@Component({selector:'runtime-form',standalone:true,imports:[foundation.FormGroup,foundation.FormField,foundation.FieldControl],template:`<ui-form-group groupId="runtime-form-group" label="申請内容" [labelWidth]="$any(labelWidth())" [labelPosition]="$any(labelPosition())" [gap]="$any(gap())" [columns]="columns()" [direction]="$any(direction())"><ui-form-field controlId="runtime-field" [label]="fieldLabel()" [error]="error()"><input uiFieldControl value="保持する入力"></ui-form-field></ui-form-group>`})
export class FormRuntime {
 readonly fieldLabel=input('入力する内容');readonly error=input('');readonly labelWidth=input<number|null>(null);readonly labelPosition=input('inline');readonly gap=input('normal');readonly columns=input(1);readonly direction=input('vertical');
}
@Component({selector:'runtime-form-boundary',standalone:true,imports:[foundation.FormLayout],template:`<div uiFormLayout [gap]="$any(gap())"><input aria-label="保持する下書き" value="元の内容"></div>`})
export class FormBoundaryRuntime {
 readonly gap=input<unknown>('normal');readonly layout=viewChild.required(foundation.FormLayout);
}
@Component({selector:'runtime-descriptions',standalone:true,imports:[foundation.Descriptions,foundation.DescriptionTemplate],template:`<ui-descriptions [items]="items()" [columns]="$any(columns())" [direction]="$any(direction())"><ng-template uiDescriptionValue let-item><input class="ui-field-control" [attr.aria-label]="item.label" value="保持する入力"></ng-template></ui-descriptions>`})
export class DescriptionsRuntime {readonly items=input<readonly foundation.DescriptionItem[]>([{id:'draft',label:'下書き',value:'元の内容'}]);readonly columns=input(1);readonly direction=input('vertical');}
@Component({selector:'fixture-app',standalone:true,template:`<main><h1>静的警告の実行時検証</h1><label>表示設定<select aria-label="表示設定" (change)="profile($event)"><option value="guided">guided</option><option value="dense">dense</option></select></label><button id="runtime-anchor" type="button">基準となる操作</button><section id="runtime-slot" aria-label="検証する部品"></section></main>`,styles:`main{padding:var(--ui-space-field);color:var(--ui-color-text);background:var(--ui-color-surface);font-family:var(--ui-font-body);font-size:var(--ui-text-body);}section{min-inline-size:0;}`})
export class StaticRuntimeCatalog {
 profile(event:Event):void{document.querySelector('main')!.setAttribute('data-ui-profile',(event.target as HTMLSelectElement).value);}
}

type Entry={ref:ComponentRef<unknown>|null;host:HTMLElement;errors:string[];events:{name:string;value:unknown}[];subscriptions:{unsubscribe():void}[];destroyed:boolean};
const entries=new Map<number,Entry>();let serial=0;let active:number|null=null;
export const runtimeApplicationErrors:{id:number|null;message:string}[]=[];
export class RuntimeErrorHandler implements ErrorHandler {
 handleError(error:unknown):void{const message=error instanceof Error?error.message:String(error);runtimeApplicationErrors.push({id:active,message});if(active!==null)entries.get(active)?.errors.push(message);console.error('runtime-harness: '+message);}
}
/** Local, test-only public Angular inputs. No fixture data leaves the browser. */
export function installRuntimeHarness(app:ApplicationRef):void{
 const registry={...foundation,RuntimeWarningLayout,RuntimeWarningUtilityTable,RuntimeWarningAsyncTable,RuntimeWarningManagedTable,RuntimeSparseTab,RuntimeRadio,RuntimeFastTab,RuntimeReassessmentMasonry,RuntimeReassessmentDivider,RuntimeReassessmentVirtual,TypographyRuntime,FormRuntime,FormBoundaryRuntime,DescriptionsRuntime,CSSPanelRuntime,RuntimeResidualFrozenTable,RuntimeResidualScroll,RuntimeResidualCanvas,RuntimeP2CascadeForm,RuntimeP2Measured,RuntimeP2VirtualEditor,RuntimeP2ColumnResize,RuntimeP2Print,RuntimeP2NativeEditors} as unknown as Record<string,Type<unknown>>;
 const capture=(entry:Entry,operation:()=>void)=>{try{operation();}catch(error){entry.errors.push(error instanceof Error?error.message:String(error));}};
 const render=(id:number)=>{const entry=entries.get(id);if(!entry||entry.destroyed)return;active=id;capture(entry,()=>entry.ref!.changeDetectorRef.detectChanges());capture(entry,()=>app.tick());};
 const api={
  create(name:string,inputs:Record<string,unknown>={},projectedHtml=''):number{
   const kind=registry[name],meta=kind&&reflectComponentType(kind);if(!meta)throw new Error('Unknown runtime component: '+name);
   for(const key of Object.keys(inputs))if(!meta.inputs.some(x=>x.templateName===key))throw new Error('Invalid fixture input '+name+'.'+key);
   const id=++serial;active=id;const tag=/^[a-z][\w-]*/i.exec(meta.selector)?.[0]??'div';const host=document.createElement(tag);host.dataset['runtimeId']=String(id);host.id='runtime-'+id;document.querySelector('#runtime-slot')!.append(host);
   const entry:Entry={ref:null,host,errors:[],events:[],subscriptions:[],destroyed:false};entries.set(id,entry);
   // HTML comes only from repository test cases; it is not an application input.
   const projection=document.createElement('template');projection.innerHTML=projectedHtml;
   try{const ref=createComponent(kind,{environmentInjector:app.injector as EnvironmentInjector,hostElement:host,projectableNodes:[Array.from(projection.content.childNodes)]});entry.ref=ref;for(const [key,value]of Object.entries(inputs))ref.setInput(key,value);
    for(const output of meta.outputs){const emitter=(ref.instance as Record<string,{subscribe?(fn:(value:unknown)=>void):{unsubscribe():void}}>)[output.propName];if(emitter?.subscribe)entry.subscriptions.push(emitter.subscribe(value=>entry.events.push({name:output.templateName,value})));}
    app.attachView(ref.hostView);render(id);
   }catch(error){entry.errors.push(error instanceof Error?error.message:String(error));}return id;
  },
  update(id:number,inputs:Record<string,unknown>):void{const entry=entries.get(id);if(!entry?.ref||entry.destroyed)throw new Error('Runtime instance unavailable');const meta=reflectComponentType(entry.ref.componentType)!;for(const key of Object.keys(inputs))if(!meta.inputs.some(x=>x.templateName===key))throw new Error('Invalid fixture update input '+key);active=id;capture(entry,()=>{for(const [key,value]of Object.entries(inputs))entry.ref!.setInput(key,value);});render(id);},
  render,
  instance(id:number):unknown{return entries.get(id)?.ref?.instance;},
  inspect(id:number){const e=entries.get(id);if(!e)throw new Error('Unknown runtime ID');return {errors:[...e.errors],events:e.events,hostId:e.host.id,created:!!e.ref,destroyed:e.destroyed,applicationErrors:[...runtimeApplicationErrors]};},
  destroy(id:number):void{const e=entries.get(id);if(!e||e.destroyed)return;active=id;e.destroyed=true;for(const s of e.subscriptions)s.unsubscribe();if(e.ref){app.detachView(e.ref.hostView);capture(e,()=>e.ref!.destroy());}e.host.remove();},
  async whenStable(){await app.whenStable();},
 };
 Object.defineProperty(globalThis,'__runtime',{value:api,configurable:true});
}
