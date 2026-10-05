import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { parseConfig } from '../../src/config.ts';
import { syncProject, checkProject } from '../../src/sync.ts';

const repository=fileURLToPath(new URL('../../',import.meta.url));
const run=promisify(execFile);

test('a separate generated consumer compiles and operates with strict forms and typed templates; wrong row properties fail', {timeout:120_000}, async t=>{
 const root=await mkdtemp(resolve(tmpdir(),'ui-foundation-consumer-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const config=parseConfig(await readFile(resolve(repository,'examples/ui.config.example.yaml'),'utf8'));
 config.output='foundation';
 await writeFile(resolve(root,'ui.config.yaml'),stringify(config));
 await symlink(resolve(repository,'node_modules'),resolve(root,'node_modules'));
 await syncProject({root});
 assert.deepEqual(await syncProject({root}),{changes:[],written:false});
 assert.deepEqual(await checkProject({root}),{valid:true,differences:[]});
 await writeFile(resolve(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'bundler',lib:['ES2022','DOM'],strict:true,experimentalDecorators:true,skipLibCheck:true,noEmitOnError:true,outDir:'compiled'},angularCompilerOptions:{strictTemplates:true,strictInjectionParameters:true,compilationMode:'full'},include:['foundation/angular/**/*.ts','consumer.ts']}));
 const consumer=`import {Component} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {DataTableView,TableTemplate,createTableState,type TableColumn,TextInput,NumberInput,Select,Combobox,MultiSelect,DatePicker,TimePicker,DateTimePicker,DateRangePicker,GridList,GridItem,Calendar,CalendarDay,Icon,provideUiIcons,Card,CardTemplate,Menu,Dialog,DialogTemplate,ConfirmDialog,AlertDialog,FormDialog,DynamicDialogHost,OverlayHost,Snackbar,NotificationHost,Container,Stack,Grid,GridCell,Panel,Accordion,AccordionItem,Splitter,Divider,Spacer,ScrollArea,StickyRegion,AspectRatio,ResponsiveVisibility,PageFrame,ActionControl,IconButton,ButtonGroup,ToggleButton,SegmentedControl,SplitButton,FloatingActionButton,Toolbar,CopyButton,ActionFeedback,AsyncRegion,Alert,EmptyState,ResultState,ProgressBar,Spinner,Skeleton,LoadingOverlay,NotificationCenter,Tour,Typography,Badge,Tag,Avatar,AvatarGroup,Descriptions,DescriptionTemplate,Statistic,Meter,MeterGroup,HelpText,ShortcutHint,ReadMore,CodeBlock,InlineCode,Watermark} from './foundation/angular';
export const providers=[provideUiIcons()];
interface Row {id:number;name:string;amount:number|null}
@Component({selector:'consumer-app',standalone:true,imports:[ReactiveFormsModule,DataTableView,TableTemplate,TextInput,NumberInput,Select,Combobox,MultiSelect,DatePicker,TimePicker,DateTimePicker,DateRangePicker,GridList,GridItem,Calendar,CalendarDay,Icon,Card,CardTemplate,Menu,Dialog,DialogTemplate,ConfirmDialog,AlertDialog,FormDialog,DynamicDialogHost,OverlayHost,Snackbar,NotificationHost,Container,Stack,Grid,GridCell,Panel,Accordion,AccordionItem,Splitter,Divider,Spacer,ScrollArea,StickyRegion,AspectRatio,ResponsiveVisibility,PageFrame,ActionControl,IconButton,ButtonGroup,ToggleButton,SegmentedControl,SplitButton,FloatingActionButton,Toolbar,CopyButton,ActionFeedback,AsyncRegion,Alert,EmptyState,ResultState,ProgressBar,Spinner,Skeleton,LoadingOverlay,NotificationCenter,Tour,Typography,Badge,Tag,Avatar,AvatarGroup,Descriptions,DescriptionTemplate,Statistic,Meter,MeterGroup,HelpText,ShortcutHint,ReadMore,CodeBlock,InlineCode,Watermark],template:\`
 <ui-data-table tableId="records" caption="記録" [rows]="rows" [columns]="columns" keyField="id" [state]="state">
  <ng-template uiTableCell="name" [uiTableTemplateOf]="rows" let-row>{{row.name}}</ng-template>
 </ui-data-table>
 <ui-text-input controlId="title" label="件名" [formControl]="title" />
 <p data-testid="consumer-value">{{title.value}}</p><p data-testid="consumer-date">{{date.value}}</p>
 <ui-number-input controlId="amount" label="金額" [formControl]="amount" [min]="0" />
 <ui-select controlId="team" label="所属" [options]="options" [formControl]="team" />
 <ui-combobox controlId="owner" label="担当" [options]="options" [formControl]="team" />
 <ui-multi-select controlId="reviewers" label="確認者" [options]="options" [formControl]="reviewers" />
 <ui-date-picker controlId="date" label="日付" [formControl]="date" />
 <ui-time-picker controlId="time" label="時刻" [formControl]="time" />
 <ui-date-time-picker controlId="datetime" label="日時" timeZone="Asia/Tokyo" [formControl]="datetime" />
 <ui-date-range-picker controlId="range" label="期間" [formControl]="range" />
 <ui-calendar controlId="calendar" label="予定" [formControl]="date"><ng-template uiCalendarDay let-day>{{day}}</ng-template></ui-calendar>
 <ui-grid-list controlId="grid" label="候補" [items]="rows" keyField="id" labelField="name"><ng-template uiGridItem [uiGridItemOf]="rows" let-row>{{row.name}}</ng-template></ui-grid-list>
 <ui-overlay-host><ui-card cardId="record-card" title="記録" [collapsible]="true" [(collapsed)]="folded"><ng-template uiCardTemplate="body" let-context>{{context.title}}<input aria-label="Cardの下書き"></ng-template></ui-card>
 <ui-menu menuId="record-menu" label="記録の操作" [items]="[{id:'view',label:'確認',children:[{id:'detail',label:'詳細'}]}]" (selected)="menuResult=$event.item.id" /><p data-testid="consumer-menu">{{menuResult}}</p>
 <button (click)="dialogOpen=true">生成先Dialogを開く</button><dialog uiDialog label="記録の確認" [open]="dialogOpen" (openChange)="dialogOpen=$event" (completed)="closeReason=$event.reason"><ng-template uiDialogTemplate="body" let-context><input aria-label="生成先Dialog入力"><button (click)="context.finish('confirm')">完了</button></ng-template></dialog><p data-testid="consumer-close">{{closeReason}}</p></ui-overlay-host>
 <ui-confirm-dialog label="確認" message="確認しますか" /><ui-alert-dialog label="通知" message="必要な説明" />
 <ui-form-dialog label="編集"><ui-text-input controlId="dialog-title" label="編集する件名" [formControl]="title" /></ui-form-dialog><ui-dynamic-dialog-host />
 <button (click)="noticeOpen=true">生成先通知を表示</button><ui-snackbar message="生成先の通知" [open]="noticeOpen" (openChange)="noticeOpen=$event" actionLabel="内容を確認" [autoDismiss]="false" [durationSeconds]="0" /><ui-notification-host [maxConcurrency]="2" dedup="replace" />
 <ui-page-frame title="生成先の配置" [headingLevel]="2"><span uiPageFooter>生成したfooter</span><ui-container heading="配置の確認"><ui-stack><ui-grid [columns]="1" [rows]="2" [breakpoints]="[{minWidth:640,columns:2}]"><p uiGridCell [columnSpan]="2">結合したセル</p><p uiGridCell>次のセル</p></ui-grid></ui-stack></ui-container></ui-page-frame>
 <ui-panel panelId="consumer-panel" title="生成したPanel" [collapsible]="true"><input aria-label="生成したPanel入力"></ui-panel>
 <ui-accordion [initialExpanded]="['consumer-accordion']"><ui-accordion-item itemId="consumer-accordion" title="生成したAccordion"><input aria-label="生成したAccordion入力"></ui-accordion-item><ui-accordion-item itemId="consumer-second" title="次のAccordion">生成した本文</ui-accordion-item></ui-accordion>
 <ui-splitter splitterId="consumer-split" primaryLabel="生成した左領域" secondaryLabel="生成した右領域" [initialRatio]="40" [height]="240"><div uiSplitPrimary><input aria-label="生成したSplitter入力"></div><p>右領域</p></ui-splitter>
 <ui-divider label="生成した境界" /><ui-spacer size="compact" />
 <ui-scroll-area label="生成したScroll" [height]="120"><div style="height:400px"><ui-sticky-region>固定した本文</ui-sticky-region></div></ui-scroll-area>
 <ui-aspect-ratio [ratio]="2"><span>比率を保持</span></ui-aspect-ratio><ui-aspect-ratio [ratio]="2"><iframe title="生成した埋込プレビュー" srcdoc="生成した表示内容"></iframe></ui-aspect-ratio><ui-responsive-visibility [minWidth]="600"><span>広幅で表示</span></ui-responsive-visibility>
 <ui-button-group label="生成した操作群" size="large" [connected]="true"><button uiAction>概要を見る</button><button uiAction>履歴を見る</button></ui-button-group>
 <button uiIconButton icon="circle-check" label="生成した確認" [selected]="iconSelected" (click)="iconSelected=!iconSelected"></button><button uiToggleButton label="生成した固定" [(checked)]="pinned"></button>
 <ui-segmented-control controlId="consumer-segments" label="生成した選択" [options]="[{value:'summary',label:'概要'},{value:'history',label:'履歴'}]" [formControl]="segments" /><p data-testid="consumer-segment">{{segments.value}}</p>
 <ui-split-button controlId="consumer-save" label="生成した保存" menuLabel="生成した保存補助" [items]="[{id:'export',label:'生成した出力'}]" (action)="actionCount=actionCount+1" (selected)="actionResult=$event.item.id" />
 <ui-toolbar controlId="consumer-toolbar" label="生成した操作帯" style="width:180px" [items]="[{id:'refresh',label:'最新の記録を取得'},{id:'history',label:'生成した履歴を確認'}]" (selected)="actionResult=$event.id" />
 <ui-copy-button label="生成した内容をコピー" text="生成物だけのコピー" [durationSeconds]="30" (copied)="copyResult=true" /><p data-testid="consumer-copy">{{copyResult}}</p>
 <button uiAction (click)="floating=true">生成した固定操作を表示</button><ui-floating-action-button controlId="consumer-floating" label="生成した追加" [hidden]="!floating" [items]="[{id:'reuse',label:'前回を再利用'}]" menuLabel="生成した補助" (action)="actionCount=actionCount+1" (selected)="actionResult=$event.item.id" /><p data-testid="consumer-action">{{actionCount}} / {{actionResult}}</p>
 <ui-action-feedback [state]="{kind:'unknown',message:'生成した結果の確認'}" recoveryLabel="生成した結果を確認" (recover)="feedbackRequests=feedbackRequests+1" /><p data-testid="consumer-feedback">{{feedbackRequests}}</p>
 <button #consumerAsyncReturn (click)="asyncState={kind:'ready'}">生成した取得結果を返す</button><ui-async-region [state]="asyncState" [retryAvailable]="true" [focusFallback]="consumerAsyncReturn" (retry)="asyncState={kind:'loading',message:'生成した再取得'}"><input class="ui-field-control" aria-label="生成した取得領域の入力"></ui-async-region>
 <button data-testid="consumer-alert-visibility" (click)="alertClosable=!alertClosable">生成した閉じる操作を切替</button>
 <button data-testid="consumer-alert-busy" (click)="alertBusy=!alertBusy">生成した通知処理中を切替</button>
 <ui-alert title="生成した通知欄" message="必要な項目を確認" [busy]="alertBusy" [closable]="alertClosable" [open]="alertOpen" (openChange)="alertOpen=$event"><ui-inline-message uiAlertActions message="投影した別の通知" actionLabel="生成した入れ子通知の操作" (action)="nestedAlertRequests=nestedAlertRequests+1" /></ui-alert><p data-testid="consumer-nested-alert">{{nestedAlertRequests}}</p>
 <ui-empty-state title="生成した空の説明" message="記録を追加できます" actionLabel="生成した記録を追加" (action)="stateRequests=stateRequests+1" /><ui-result-state title="生成した結果" message="結果を確認できます" status="unknown" details="確認する対象の詳細" actionLabel="生成した一覧へ戻る" (action)="stateRequests=stateRequests+1" /><p data-testid="consumer-state">{{stateRequests}}</p>
 <ui-progress-bar controlId="consumer-progress" label="生成した進捗" [value]="40" [total]="200" cancelLabel="生成した進捗を取消" (cancelRequested)="cancelRequests=cancelRequests+1" /><ui-spinner label="生成した円形進捗" [value]="25" [delayMilliseconds]="0" /><ui-skeleton shape="circle" [rows]="2" [diameter]="64" />
 <button #consumerOverlayReturn (click)="loading=true">生成した領域を抑止</button><ui-loading-overlay message="生成した領域の処理中" [active]="loading" [focusFallback]="consumerOverlayReturn" cancelLabel="生成した領域の処理を取消" (cancelRequested)="loading=false"><div style="min-height:var(--ui-size-grid-item)"><input class="ui-field-control" aria-label="生成した抑止領域の入力"></div></ui-loading-overlay><p data-testid="consumer-cancel">{{cancelRequests}}</p>
 <ui-notification-center controlId="consumer-center" label="生成した通知一覧" [items]="centerItems" (readRequested)="centerItems=[{id:'notice',title:'生成した未読通知',message:'記録を確認',read:$event.read}]" (deleteRequested)="centerItems=[]" />
 <input #consumerTourFirst class="ui-field-control" aria-label="生成した案内の入力"><button #consumerTourSecond>生成した案内の対象</button><button (click)="tourOpen=true">生成した案内を再開</button><ui-tour controlId="consumer-tour" [steps]="[{id:'first',title:'生成した最初の案内',message:'入力を保持',target:consumerTourFirst},{id:'second',title:'生成した次の案内',message:'対象を確認',target:consumerTourSecond}]" [open]="tourOpen" (openChange)="tourOpen=$event" [index]="tourIndex" (indexChange)="tourIndex=$event" (closed)="tourReason=$event" /><p data-testid="consumer-tour">{{tourReason}}</p>
 <section aria-label="生成した表示部品"><h2 uiHeading>生成した表示</h2><p uiText>nativeの文字</p><ui-badge label="生成した件数" [count]="123" /><button #tagReturn>生成したタグへ戻る</button>@if(tagVisible){<ui-tag label="生成したタグ" icon="circle-check" [selectable]="true" [selected]="tagSelected" (selectedChange)="tagSelected=$event" [removable]="true" [focusFallback]="tagReturn" (removed)="tagVisible=false" />}
 <ui-avatar name="Ada Lovelace" /><ui-avatar-group label="生成した担当者" [maximum]="1" [items]="[{id:'a',name:'担当者 甲'},{id:'b',name:'担当者 乙'}]" />
 <ui-descriptions [items]="[{id:'amount',label:'生成した値',value:0}]"><ng-template uiDescriptionValue let-item let-value="value">{{item.label}}: {{value}}</ng-template></ui-descriptions>
 <ui-statistic label="生成した統計" [value]="0" [comparison]="0" comparisonLabel="前回" deltaMode="percent" /><ui-meter controlId="consumer-meter" label="生成したMeter" [value]="20" [low]="10" [high]="90" [optimum]="50" /><ui-meter-group controlId="consumer-meter-group" label="生成した区分" [items]="meterParts" />
 <label>生成した説明の入力<input aria-describedby="consumer-help"></label><ui-help-text id="consumer-help">生成した説明</ui-help-text><ui-shortcut-hint [keys]="['⌘','Enter']" label="CommandとEnter" /><code uiInlineCode>value === null</code>
 <ui-read-more controlId="consumer-read" [text]="displayLong" [lines]="1" /><ui-code-block label="生成したコード" [source]="displaySource" language="json" format="json" [lineNumbers]="true" (copied)="displayCopied=true" /><p data-testid="consumer-display-copy">{{displayCopied}}</p>
 <ui-watermark controlId="consumer-watermark" content="生成確認"><label>生成した透かし内の入力<input></label><button (click)="watermarkActions=watermarkActions+1">生成した透かし内の操作</button><p data-testid="consumer-watermark-result">{{watermarkActions}}</p></ui-watermark></section>
 <ui-icon name="circle-check" [decorative]="false" label="確認" />
\`})
export class Consumer{tagVisible=true;tagSelected=false;displayLong='確認する長い内容。'.repeat(100);displaySource='{ "a":1, "a":1e999 }';displayCopied=false;watermarkActions=0;meterParts=[{id:'part',label:'生成した区分の値',value:20,tone:'info' as const}];feedbackRequests=0;stateRequests=0;cancelRequests=0;alertOpen=true;alertClosable=true;alertBusy=false;nestedAlertRequests=0;loading=false;centerItems=[{id:'notice',title:'生成した未読通知',message:'記録を確認',read:false}];tourOpen=false;tourIndex=0;tourReason='';asyncState:{kind:'ready'}|{kind:'error'|'loading';message:string}={kind:'error',message:'生成した取得エラー'};iconSelected=false;pinned=false;actionCount=0;actionResult='';copyResult=false;floating=false;segments=new FormControl<string|null>('summary');folded=false;dialogOpen=false;noticeOpen=false;menuResult='';closeReason='';rows:Row[]=[{id:1,name:'確認',amount:null}];columns:TableColumn<Row>[]=[{id:'name',field:'name',header:'名前'}];state=createTableState();options=[{value:'a',label:'総務'}];title=new FormControl('');amount=new FormControl<number|null>(null);team=new FormControl<string|null>(null);reviewers=new FormControl<string[]>([]);date=new FormControl<string|null>(null);time=new FormControl<string|null>(null);datetime=new FormControl<string|null>(null);range=new FormControl<{start:string|null;end:string|null}|null>(null);}
bootstrapApplication(Consumer,{providers}).catch(error=>console.error(error));
`;
 const ngc=resolve(repository,'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
 await writeFile(resolve(root,'consumer.ts'),consumer);
 await run(process.execPath,[ngc,'-p','tsconfig.json'],{cwd:root});
 await readFile(resolve(root,'compiled/consumer.js'));
 const browser=JSON.parse((await run(process.execPath,[resolve(repository,'scripts/consumer-browser.mjs'),root],{cwd:root})).stdout);
 assert.equal(browser.runtime,true);assert.deepEqual(browser.profiles.map((item:{profile:string})=>item.profile),['guided','dense']);
 await writeFile(resolve(root,'consumer.ts'),consumer.replace('{{item.label}}','{{item.nonexistent}}'));
 await assert.rejects(run(process.execPath,[ngc,'-p','tsconfig.json'],{cwd:root}),error=>{const failure=error as Error&{code?:number;stderr?:string};assert.equal(failure.code,1);assert.match(failure.stderr??'',/nonexistent.*does not exist|does not exist.*nonexistent/);return true;});
 await writeFile(resolve(root,'consumer.ts'),consumer.replace('{{row.name}}','{{row.nonexistent}}'));
 await assert.rejects(run(process.execPath,[ngc,'-p','tsconfig.json'],{cwd:root}),error=>{
  const failure=error as Error&{code?:number;stderr?:string};
  assert.equal(failure.code,1);assert.match(failure.stderr??'',/nonexistent.*does not exist|does not exist.*nonexistent/);return true;
 });
});
