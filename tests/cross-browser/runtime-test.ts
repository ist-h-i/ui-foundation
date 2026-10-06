import {test as base,expect} from '@playwright/test';
export {expect} from '@playwright/test';
export const test=base.extend<{runtimeEvidence:void}>({
 runtimeEvidence:[async({page,browser,browserName},use,info)=>{
  const errors:string[]=[],warnings:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning')warnings.push(message.text());});
  try{await use();}finally{
   const advisory=/^\[JavaScript Warning: "This site appears to use a scroll-linked positioning effect\. This may not work well with asynchronous panning; see https:\/\/firefox-source-docs\.mozilla\.org\/performance\/scroll-linked_effects\.html for further details and to join the discussion on related tools and features!" \{file: "http:\/\/127\.0\.0\.1:\d+\/catalog\/foundation" line: 0\}\]$/;
   const engineAdvisories=browserName==='firefox'?warnings.filter(warning=>advisory.test(warning)):[];
   const unknownWarnings=warnings.filter(warning=>!engineAdvisories.includes(warning));
   const telemetry={engine:browserName,version:browser.version(),userAgent:await page.evaluate(()=>navigator.userAgent),test:info.title,runtimeErrors:errors,consoleWarnings:warnings,engineAdvisories,unknownWarnings,scope:'Headless native/DOM/ARIA automation; Safari device and screen-reader speech not measured'};
   await info.attach('runtime-engine',{body:JSON.stringify(telemetry,null,2),contentType:'application/json'});
   expect(errors,'browser exceptions and console errors').toEqual([]);expect(unknownWarnings,'unclassified browser console warnings').toEqual([]);
  }
 },{auto:true}],
});
