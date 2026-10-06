import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const source=await readFile('consumer.ts','utf8');
const config=JSON.parse(await readFile('tsconfig.consumer.json','utf8'));
assert.deepEqual(config.include,['consumer.ts']);
const run=async(name,args,expected,diagnostic)=>{const result=spawnSync('./node_modules/.bin/ngc',args,{encoding:'utf8',env:{...process.env,NO_COLOR:'1'},maxBuffer:2e7});const log=result.stdout+result.stderr;await writeFile('evidence/type-'+name+'.log',log);assert.equal(result.status,expected,name+' actual exit');if(diagnostic)assert.match(log,diagnostic,name+' actual diagnostic');return {name,command:['ngc',...args],exit:result.status,expectedExit:expected,diagnostic:log.replace(/\x1b\[[0-9;]*m/g,'').slice(0,1200)};};
const results=[await run('public-barrel-positive',['-p','tsconfig.consumer.json'],0)];
const cases=[
 ['tree-context','node.data?.amount?.toFixed(0)','node.data?.amount?.toUpperCase()',/toUpperCase.*number|number.*toUpperCase/s],
 ['scheduler-context','event.data?.amount?.toFixed(0)','event.data?.amount?.toUpperCase()',/toUpperCase.*number|number.*toUpperCase/s],
 ['table-context','row.amount.toFixed(0)','row.amount.toUpperCase()',/toUpperCase.*number|number.*toUpperCase/s],
 ['chart-prop','<ui-chart label="申請件数"','<ui-chart kind="unknown-chart" label="申請件数"',/unknown-chart.*ChartKind/s],
 ['file-prop','<ui-file-upload #uploader','<ui-file-upload [value]="3" #uploader',/number.*readonly File\[\]|readonly File\[\].*number/s],
 ['nullable-form-types',null,null,/null.*File\[\]|File\[\].*null/s],
 ['ambient-typed-api',null,null,/string.*number|number.*string/s],
];
for(const [name,from,to,diagnostic] of cases){let modified=source;if(from){assert.ok(modified.includes(from));modified=modified.replace(from,to);}if(name==='nullable-form-types')modified+='\nconst invalidFileControl = new FormControl<File[]>(null);\nconst invalidDateControl = new FormControl<Ui.DateRange>(null);\n';if(name==='ambient-typed-api')modified+='\nimport FormulaParser from "fast-formula-parser";\nconst badParser = new FormulaParser({onCell:()=>1,onRange:()=>[]});\nbadParser.parse("SUM(A1:B1)",{row:"bad",col:1});\n';await writeFile('consumer-negative.ts',modified);await writeFile('tsconfig.negative.json',JSON.stringify({...config,compilerOptions:{...config.compilerOptions,noEmit:true},include:['consumer-negative.ts']}));results.push(await run(name,['-p','tsconfig.negative.json'],1,diagnostic));await writeFile('evidence/type-'+name+'.source.ts',modified);}
await writeFile('ambient-absent.ts','import FormulaParser from "fast-formula-parser";\nexport const parser = new FormulaParser({onCell:()=>1,onRange:()=>[]});\n');await writeFile('tsconfig.ambient-absent.json',JSON.stringify({...config,compilerOptions:{...config.compilerOptions,noEmit:true},include:['ambient-absent.ts']}));results.push(await run('ambient-absent',['-p','tsconfig.ambient-absent.json'],1,/TS7016|Could not find a declaration/));
await writeFile('evidence/type-results.json',JSON.stringify({include:config.include,publicLibraryImport:'./.ui/generated/angular/index',formulaAmbient:'sheet-formula.ts triple-reference imports formula-parser.d.ts transitively from public barrel',results},null,2)+'\n');console.log(JSON.stringify(results.map(({name,exit,expectedExit})=>({name,exit,expectedExit}))));
