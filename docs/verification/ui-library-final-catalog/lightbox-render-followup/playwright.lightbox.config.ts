import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'media-regressions.guarded.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:45000,
 expect:{timeout:5000},use:{baseURL:'http://127.0.0.1:5342',channel:'chromium',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
 reporter:[['list'],['json',{outputFile:'evidence/guarded-formal-results.json'}]],outputDir:'evidence/guarded-formal-artifacts',
});
