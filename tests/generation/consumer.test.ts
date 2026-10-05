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

test('a separate generated consumer compiles with strict forms and typed table/grid/day templates; wrong row properties fail', {timeout:60_000}, async t=>{
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
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {DataTableView,TableTemplate,createTableState,type TableColumn,TextInput,NumberInput,Select,Combobox,MultiSelect,DatePicker,TimePicker,DateTimePicker,DateRangePicker,GridList,GridItem,Calendar,CalendarDay,Icon,provideUiIcons} from './foundation/angular';
export const providers=[provideUiIcons()];
interface Row {id:number;name:string;amount:number|null}
@Component({selector:'consumer-app',standalone:true,imports:[ReactiveFormsModule,DataTableView,TableTemplate,TextInput,NumberInput,Select,Combobox,MultiSelect,DatePicker,TimePicker,DateTimePicker,DateRangePicker,GridList,GridItem,Calendar,CalendarDay,Icon],template:\`
 <ui-data-table tableId="records" caption="記録" [rows]="rows" [columns]="columns" keyField="id" [state]="state">
  <ng-template uiTableCell="name" [uiTableTemplateOf]="rows" let-row>{{row.name}}</ng-template>
 </ui-data-table>
 <ui-text-input controlId="title" label="件名" [formControl]="title" />
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
 <ui-icon name="check" [decorative]="false" label="確認" />
\`})
export class Consumer{rows:Row[]=[{id:1,name:'確認',amount:null}];columns:TableColumn<Row>[]=[{id:'name',field:'name',header:'名前'}];state=createTableState();options=[{value:'a',label:'総務'}];title=new FormControl('');amount=new FormControl<number|null>(null);team=new FormControl<string|null>(null);reviewers=new FormControl<string[]>([]);date=new FormControl<string|null>(null);time=new FormControl<string|null>(null);datetime=new FormControl<string|null>(null);range=new FormControl<{start:string|null;end:string|null}|null>(null);}
`;
 const ngc=resolve(repository,'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
 await writeFile(resolve(root,'consumer.ts'),consumer);
 await run(process.execPath,[ngc,'-p','tsconfig.json'],{cwd:root});
 await readFile(resolve(root,'compiled/consumer.js'));
 await writeFile(resolve(root,'consumer.ts'),consumer.replace('{{row.name}}','{{row.nonexistent}}'));
 await assert.rejects(run(process.execPath,[ngc,'-p','tsconfig.json'],{cwd:root}),error=>{
  const failure=error as Error&{code?:number;stderr?:string};
  assert.equal(failure.code,1);assert.match(failure.stderr??'',/nonexistent.*does not exist|does not exist.*nonexistent/);return true;
 });
});
