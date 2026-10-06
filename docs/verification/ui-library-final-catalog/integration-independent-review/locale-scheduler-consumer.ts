import {ChangeDetectionStrategy,Component,signal,viewChild} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {Scheduler,DiffViewer,JsonViewer,UiLocaleScope,provideUiLocale,type UiLocaleOptions,type SchedulerEvent,type SchedulerMoveRequest} from './repository/.ui/generated/angular/index';

const initialMessages:Record<string,string>={
 '移動先のタイムゾーンを確認してください。':'Invalid move zone',
 '予定の日時には有効なオフセット付きISO文字列を指定してください。元の予定を保持しています。':'Invalid event instant',
 '表示言語とタイムゾーンを明示してください。':'Display locale and zone required',
 '移動結果を確認しています。':'Move pending',
 '移動を要求':'Request move',
 '移動先を編集':'Edit move',
 '移動入力を閉じる':'Close move',
 ' 変更前':' Before',
 ' 変更後':' After',
 '変更後の次の一致':'Next after match',
 '{code} at {offset}':'Parse {code}; offset {offset}'
};
const settings=signal<UiLocaleOptions>({locale:'en-US',timeZone:'UTC',direction:'ltr',messages:initialMessages});
@Component({selector:'locale-scheduler-review',standalone:true,imports:[Scheduler,DiffViewer,JsonViewer,UiLocaleScope],providers:[provideUiLocale(settings)],changeDetection:ChangeDetectionStrategy.OnPush,template:`
 <main [uiLocale]="{}" [attr.data-ui-profile]="profile()"><h1>Schedulerと差分・診断の独立境界</h1>
 <input id="external" aria-label="App external input">
 <ui-scheduler #scheduler schedulerId="native-scheduler" label="App scheduler" date="2026-10-06" view="day" [events]="events()" [resources]="resources" [canMove]="allowed" (moveRequested)="request($event)"/>
 <output id="request-count">{{requests().length}}</output>
 <ui-diff-viewer #diff label="App diff" before="alpha&#10;beta&#10;same" after="alpha&#10;changed&#10;same"/>
 <ui-json-viewer #json label="App JSON" [source]="jsonSource"/>
 </main>`,styles:`main{padding:var(--ui-space-page);font:var(--ui-text-body)/var(--ui-leading-body) var(--ui-font-body);color:var(--ui-color-text);background:var(--ui-color-background);}output{display:block;}`})
export class LocaleSchedulerReview {
 readonly profile=signal<'guided'|'dense'>('guided');
 readonly events=signal<readonly SchedulerEvent<{raw:string}>[]>([{id:'raw-event',title:'App original event',start:'2026-10-06T10:00:00+00:00',end:'2026-10-06T11:00:00+00:00',resourceIds:['raw-room'],data:{raw:'Application payload'}}]);
 readonly resources=[{id:'raw-room',label:'App room'}];
 readonly requests=signal<readonly SchedulerMoveRequest<{raw:string}>[]>([]);
 readonly allowCalls=signal(0);
 readonly allowed=():boolean=>{this.allowCalls.update(x=>x+1);return true;};
 readonly scheduler=viewChild.required(Scheduler<{raw:string}>);
 readonly diff=viewChild.required(DiffViewer);
 readonly json=viewChild.required(JsonViewer);
 readonly jsonSource='{"raw": }';
 request(value:SchedulerMoveRequest<{raw:string}>):void{this.requests.update(x=>[...x,value]);}
 breakZone():void{settings.update(current=>({...current,timeZone:null}));}
 diagnosticsVersion(version:number):void{settings.update(current=>({...current,messages:{...current.messages,'予定の日時には有効なオフセット付きISO文字列を指定してください。元の予定を保持しています。':'Invalid event instant v'+version,'表示言語とタイムゾーンを明示してください。':'Display locale and zone required v'+version}}));}
 restoreStructure():void{this.events.update(rows=>rows.map(row=>({...row,start:'2026-10-06T10:00:00+00:00'})));settings.update(current=>({...current,timeZone:'UTC'}));}
 change(version:number):void{settings.set({locale:version===2?'de-DE':'en-GB',timeZone:'UTC',direction:'rtl',messages:{...initialMessages,'移動先のタイムゾーンを確認してください。':'Invalid move zone v'+version,'移動結果を確認しています。':'Move pending v'+version,' 変更前':' Before v'+version,' 変更後':' After v'+version,'{code} at {offset}':'Parse v'+version+' {code}; offset {offset}'}});}
}
bootstrapApplication(LocaleSchedulerReview).then(ref=>Object.defineProperty(globalThis,'__localeSchedulerReview',{value:ref.components[0].instance}));
