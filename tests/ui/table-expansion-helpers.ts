import type {Page,TestInfo} from '@playwright/test';
import {writeFile as writeNodeFile,stat} from 'node:fs/promises';
import {basename,extname} from 'node:path';
import {test,expect} from './catalog-test';

export type TableProfile='guided'|'dense';
export interface TableStoryArtifacts {
 readonly evidencePath:(original:string)=>string;
 readonly writeFile:(original:string,data:string|Uint8Array)=>Promise<void>;
}
export type RegisterTableStory=(name:string,operation:(page:Page,artifacts:TableStoryArtifacts)=>Promise<void>)=>void;

function artifactsFor(testInfo:TestInfo):{artifacts:TableStoryArtifacts;attach:()=>Promise<void>}{
 const paths=new Map<string,string>();
 const evidencePath=(original:string):string=>{const name=basename(original),path=testInfo.outputPath(name);paths.set(name,path);return path;};
 const contentType=(name:string):string=>({'.png':'image/png','.json':'application/json','.csv':'text/csv','.txt':'text/plain'}[extname(name)]??'application/octet-stream');
 return {
  artifacts:{evidencePath,writeFile:async(original,data)=>{await writeNodeFile(evidencePath(original),data);}},
  attach:async()=>{for(const [name,path] of paths){try{await stat(path);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}await testInfo.attach(name,{path,contentType:contentType(name)});}},
 };
}

/** Synchronous registration; native browser operations run inside the actual catalog test. */
export const registerTableStory:RegisterTableStory=(name,operation)=>{
 test(name,async({page},testInfo)=>{
  const {artifacts,attach}=artifactsFor(testInfo);
  try{
   await page.goto('/catalog/tables');
   await expect(page.getByRole('heading',{name:'表拡張の検証',exact:true})).toBeVisible();
   await operation(page,artifacts);
  }catch(error){
   try{await page.screenshot({path:artifacts.evidencePath(`evidence/${name.replaceAll(/[^a-zA-Z0-9-]/g,'-')}-failure.png`),fullPage:true});}catch{/* Preserve the original assertion if a failed page cannot produce a screenshot. */}
   throw error;
  }finally{await attach();}
 });
};
