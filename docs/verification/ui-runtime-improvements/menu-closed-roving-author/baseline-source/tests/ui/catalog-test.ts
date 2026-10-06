import {test as base,expect} from '@playwright/test';
export {expect} from '@playwright/test';
/** Catch Angular ErrorHandler failures, browser exceptions and configuration warnings. */
export const test=base.extend<{runtimeErrors:string[]}>({
 runtimeErrors:[async({page},use)=>{const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')errors.push(message.type()+': '+message.text());});await use(errors);expect(errors,'catalog browser runtime errors and warnings').toEqual([]);},{auto:true}],
});
