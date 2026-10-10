import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ActionControl } from '../../.ui/generated/angular/action-control';
import { PageFrame } from '../../.ui/generated/angular/page-frame';
import { Card } from '../../.ui/generated/angular/card';
import { Tabs, TabPanel } from '../../.ui/generated/angular/tabs';
import { Navigation } from '../../.ui/generated/angular/navigation';
import { Alert } from '../../.ui/generated/angular/feedback';
import { Badge, Statistic } from '../../.ui/generated/angular/display';
import type {TableColumn} from '../../.ui/generated/angular/table-model';
import { DataTableView } from '../../.ui/generated/angular/data-table-view';
import { Timeline } from '../../.ui/generated/angular/timeline';
import { Scheduler } from '../../.ui/generated/angular/scheduler';
import {Gantt} from '../../.ui/generated/angular/gantt';
import type {ChartAxis,GanttTask} from '../../.ui/generated/angular/specialist-model';
import { Chart } from '../../.ui/generated/angular/chart';
interface Row {id:string;name:string;amount:number;confirmed:boolean;}
@Component({selector:'profile-specimens',standalone:true,imports:[ActionControl,PageFrame,Card,Tabs,TabPanel,Navigation,Alert,Badge,Statistic,DataTableView,Timeline,Scheduler,Chart,Gantt],changeDetection:ChangeDetectionStrategy.OnPush,template:`<section id="profile-categories"><ui-page-frame title="プロファイル標本" [headingLevel]="2"><nav uiNavigation label="標本の移動"><a href="#range-case">フォームへ</a><a href="#vendor-editors">編集へ</a></nav><button uiAction id="profile-action" type="button">継続操作</button><ui-card cardId="profile-card" title="保持する入力"><div class="profile-card-field"><label for="card-draft">未確定のメモ</label><input class="ui-field-control" id="card-draft" [value]="draft()" (input)="draft.set($any($event.target).value)"></div></ui-card><ui-tabs label="表示区分"><ui-tab-panel panelId="profile-tab-a" label="A"><p>最初の内容</p></ui-tab-panel><ui-tab-panel panelId="profile-tab-b" label="B"><p>次の内容</p></ui-tab-panel></ui-tabs><ui-alert message="アプリの確認メッセージ"/><ui-badge [count]="3"/><ui-statistic label="件数" [value]="1234.5"/>
<ui-data-table tableId="profile-table" caption="申請の金額" [rows]="rows" [columns]="columns" keyField="id" [pagination]="false" [columnControls]="false" [resizableColumns]="false"/>
<ui-timeline label="活動の履歴" [items]="activities" keyField="id" labelField="name" typeField="kind" dateTimeField="at" detailsField="details"/>
<ui-scheduler schedulerId="profile-schedule" label="担当の予定" date="2026-10-06" view="day" [events]="events"/>
<ui-chart id="chart-inherited" label="申請件数のグラフ" kind="bar" [series]="series"/>
<ui-chart id="chart-explicit" label="明示した書式" kind="bar" locale="en-US" [numberOptions]="explicitNumberOptions" [series]="series"/>
<ui-chart id="chart-time" label="時間軸のグラフ" kind="line" [xAxis]="timeAxis" [series]="timeSeries"/>
<ui-gantt id="gantt-inherited" label="実行の工程" [tasks]="ganttTasks()"/>
</ui-page-frame></section>`,styles:`.profile-card-field{display:grid;gap:var(--ui-space-control-gap);min-inline-size:0;}section{padding-block:var(--ui-space-section);min-inline-size:0;}input{min-inline-size:0;max-inline-size:100%;font:inherit;box-sizing:border-box;}`})
export class ProfileSpecimens{
 readonly draft=signal('保持する入力');
 readonly rows:readonly Row[]=[{id:'a',name:'原文を保持',amount:1234.5,confirmed:true},{id:'b',name:'確認中',amount:1000,confirmed:false}];
 readonly columns:readonly TableColumn<Row>[]=[{id:'name',field:'name',header:'申請'},{id:'amount',field:'amount',header:'金額',type:'number'},{id:'confirmed',field:'confirmed',header:'確認',type:'boolean'}];
 readonly activities=[{id:'a',name:'原文の種別を保持',kind:'種別は未取得です。',at:'2026-10-06T01:00:00Z',details:'アプリの詳細'},{id:'b',name:'未取得の種別',kind:null,at:null,details:'アプリの詳細'}];
 readonly events=[{id:'event-a',title:'アプリの予定名',start:'2026-10-06T01:00:00Z',end:'2026-10-06T02:00:00Z'}];
 readonly explicitNumberOptions:Intl.NumberFormatOptions={maximumFractionDigits:1,useGrouping:false};
 readonly timeAxis:ChartAxis={label:'Application time',type:'time'};readonly timeSeries=[{id:'time-a',label:'Clock',points:[{id:'time-1',label:'App first',x:1791248400000,value:3},{id:'time-2',label:'App second',x:1791252000000,value:4}]}];
 readonly ganttTasks=signal<readonly GanttTask[]>([{id:'task-a',label:'App task',start:'2026-10-06',end:'2026-10-09',progress:40,dependencies:[]}]);
 readonly series=[{id:'series-a',label:'件数',points:[{id:'point-a',label:'原値A',value:1234.5},{id:'point-b',label:'原値B',value:1500}]}];
}
