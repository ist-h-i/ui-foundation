import {defineConfig,devices} from '@playwright/test';
import {resolve} from 'node:path';
const evidence=resolve(process.env.UI_CROSS_BROWSER_EVIDENCE!);
export default defineConfig({testDir:'./tests/ui',testMatch:'navigation-catalog.spec.ts',fullyParallel:false,workers:1,forbidOnly:true,retries:0,timeout:45000,reporter:[['list'],['json',{outputFile:resolve(evidence,'results.json')}]],outputDir:resolve(evidence,'artifacts'),use:{baseURL:process.env.UI_CROSS_BROWSER_URL,trace:'retain-on-failure',screenshot:'only-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome'],channel:'chromium',launchOptions:{executablePath:process.env.UI_CROSS_CHROMIUM_EXECUTABLE}}}]});
