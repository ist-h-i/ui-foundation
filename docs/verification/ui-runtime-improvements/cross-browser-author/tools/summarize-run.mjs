import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const stage='/tmp/ui-foundation-cross-browser-stage',name=process.argv[2];
if(!['focused-before','focused-after','focused-final'].includes(name))throw Error('Select an actual owned run');
const base=resolve(stage,'evidence',name),report=JSON.parse(await readFile(resolve(base,'results.json'),'utf8')),counts={},runtime=[],axe=[];
for(const suite of report.suites??[])await walk(suite);
async function walk(suite){
 for(const spec of suite.specs??[])for(const test of spec.tests??[]){
  const entry=counts[test.projectName]??={passed:0,failed:0,skipped:0,timedOut:0,interrupted:0,retryAttempts:0};
  for(const result of test.results??[]){entry[result.status==='passed'?'passed':result.status==='skipped'?'skipped':result.status==='timedOut'?'timedOut':result.status==='interrupted'?'interrupted':'failed']++;entry.retryAttempts+=Number(result.retry??0);
   for(const attachment of result.attachments??[]){
    if(!['runtime-engine','axe-target','notification-resume','menu-level-roving'].includes(attachment.name))continue;
    const bytes=attachment.body?Buffer.from(attachment.body,'base64'):await readFile(attachment.path),value=JSON.parse(bytes.toString());
    if(attachment.name==='runtime-engine')runtime.push({...value,actualStatus:result.status});
    if(attachment.name==='axe-target')axe.push({engine:test.projectName,test:spec.title,violations:value.violations,incomplete:value.incomplete,passes:value.passes.length});
   }
  }
 }
 for(const child of suite.suites??[])await walk(child);
}
const warnings=runtime.flatMap(row=>(row.consoleWarnings??[]).map(text=>({engine:row.engine,version:row.version,userAgent:row.userAgent,test:row.test,text,classification:(row.engineAdvisories??[]).includes(text)?'Firefox scroll-linked engine advisory':'unclassified in this harness'})));
const incomplete=axe.flatMap(row=>row.incomplete.flatMap(rule=>rule.nodes.map(node=>({engine:row.engine,test:row.test,rule:rule.id,impact:rule.impact,target:node.target,reasons:[...node.any,...node.all,...node.none].map(check=>({id:check.id,message:check.message,data:check.data}))}))));
const summary={name,stats:report.stats,counts,versions:Object.fromEntries(runtime.map(row=>[row.engine,row.version])),runtimeTelemetryCases:runtime.length,runtimeErrorCount:runtime.flatMap(row=>row.runtimeErrors??[]).length,consoleWarningCount:warnings.length,classifiedEngineAdvisoryCount:warnings.filter(row=>row.classification==='Firefox scroll-linked engine advisory').length,unknownWarningCount:runtime.flatMap(row=>row.unknownWarnings??row.consoleWarnings??[]).length,axe:{analyzes:axe.length,violationCases:axe.filter(row=>row.violations.length).length,violationRules:axe.reduce((n,row)=>n+row.violations.length,0),incompleteCases:axe.filter(row=>row.incomplete.length).length,incompleteRules:axe.reduce((n,row)=>n+row.incomplete.length,0),incompleteNodes:incomplete.length,incompleteByRule:incomplete.reduce((totals,row)=>({...totals,[row.rule]:(totals[row.rule]??0)+1}),{})},receipt:JSON.parse(await readFile(resolve(base,'run-receipt.json'),'utf8')),exit:parseInt(await readFile(resolve(stage,'evidence',name+'.exit'),'utf8'),10),scope:'Headless Playwright engines; explicit native/DOM input and focus operations. ARIA snapshot is serialized browser semantics, not screen-reader speech. Axe incomplete is preserved, never changed to pass.'};
await writeFile(resolve(stage,'evidence',name+'-summary.json'),JSON.stringify(summary,null,2)+'\n');
await writeFile(resolve(stage,'evidence',name+'-warnings.json'),JSON.stringify(warnings,null,2)+'\n');
await writeFile(resolve(stage,'evidence',name+'-incomplete.json'),JSON.stringify(incomplete,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
