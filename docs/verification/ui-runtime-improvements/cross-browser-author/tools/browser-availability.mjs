import {chromium,firefox,webkit} from './source/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root='/tmp/ui-foundation-cross-browser-stage';
const inventory=JSON.parse(await readFile(root+'/evidence/browser-inventory.json','utf8'));
const result=[];
for(const [name,type] of Object.entries({chromium,firefox,webkit})){
 let browser;const errors=[],record={name,launch:'not completed',close:'not completed',executable:name==='chromium'?inventory.executables.chromium.path:type.executablePath()};
 try{
  browser=await type.launch({headless:true,executablePath:record.executable,timeout:30000});record.launch='actual success';record.version=browser.version();
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><label>Engine input<input id="value"></label><button id="open">Open</button><dialog><label>Dialog input<input autofocus></label></dialog><script>document.querySelector("#open").onclick=()=>document.querySelector("dialog").showModal()</script>');
  await page.locator('#value').fill('engine-native-value');await page.getByRole('button',{name:'Open',exact:true}).click();
  record.native=await page.evaluate(()=>({value:document.querySelector('#value').value,modal:document.querySelector('dialog').matches(':modal'),focusInModal:document.querySelector('dialog').contains(document.activeElement),userAgent:navigator.userAgent,webgl2:!!document.createElement('canvas').getContext('webgl2'),popover:'showPopover' in HTMLElement.prototype,ariaSnapshotScope:'automation semantics; speech not exercised'}));
  if(record.native.value!=='engine-native-value'||!record.native.modal||!record.native.focusInModal)throw Error('Native launch smoke operation failed');
  record.smoke='actual passed';await context.close();record.contextClose='actual completed';
 }catch(error){record.failure=String(error);record.smoke='not passed';}
 finally{if(browser){await browser.close();record.close='actual completed';}record.runtimeErrors=errors;result.push(record);await writeFile(root+'/evidence/browser-availability.json',JSON.stringify({recordedAtUtc:new Date().toISOString(),playwright:inventory.playwright,records:result,safariRealDevice:false,screenReaderSpeech:false},null,2)+'\n');}
}
console.log(JSON.stringify(result,null,2));process.exitCode=result.every(row=>row.smoke==='actual passed')?0:1;
