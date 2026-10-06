import {test as base,expect} from '@playwright/test';
export {expect} from '@playwright/test';
export const test=base.extend<{runtimeEvidence:void}>({
 runtimeEvidence:[async({page,browser,browserName},use,info)=>{
  const errors:string[]=[],warnings:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning')warnings.push(message.text());});
  try{await use();}finally{
   const telemetry={engine:browserName,version:browser.version(),test:info.title,runtimeErrors:errors,consoleWarnings:warnings,scope:'Headless native/DOM/ARIA automation; Safari device and screen-reader speech not measured'};
   await info.attach('runtime-engine',{body:JSON.stringify(telemetry,null,2),contentType:'application/json'});
   expect(errors,'browser exceptions and console errors').toEqual([]);expect(warnings,'browser console warnings').toEqual([]);
  }
 },{auto:true}],
});
