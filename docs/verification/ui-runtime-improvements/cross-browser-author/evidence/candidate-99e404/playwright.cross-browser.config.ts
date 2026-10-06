import {defineConfig,devices} from '@playwright/test';
type Engine='chromium'|'firefox'|'webkit';
const requested=(process.env.UI_CROSS_BROWSER_ENGINES??'chromium,firefox,webkit').split(',');
const supported:readonly Engine[]=['chromium','firefox','webkit'];
if(!requested.length||new Set(requested).size!==requested.length||requested.some(name=>!supported.includes(name as Engine)))throw new Error('UI_CROSS_BROWSER_ENGINES must name distinct chromium, firefox, or webkit engines.');
const baseURL=process.env.UI_CROSS_BROWSER_URL;
if(!baseURL)throw new Error('Run node scripts/run-cross-browser.mjs to build and own an ephemeral loopback server.');
const origin=new URL(baseURL);
if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Cross-browser fixture URL must be an owned loopback origin.');
const output=process.env.UI_CROSS_BROWSER_EVIDENCE??'test-results/cross-browser';
export default defineConfig({
 testDir:'./tests/cross-browser',testMatch:'runtime-cross-browser.spec.ts',
 fullyParallel:false,workers:1,forbidOnly:true,retries:0,timeout:45_000,
 outputDir:output+'/artifacts',
 reporter:[['list'],['json',{outputFile:output+'/results.json'}]],
 use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:requested.map(name=>({name,use:{...(name==='chromium'?devices['Desktop Chrome']:name==='firefox'?devices['Desktop Firefox']:devices['Desktop Safari']),browserName:name as Engine,...(name==='chromium'?{channel:'chromium',launchOptions:process.env.UI_CROSS_CHROMIUM_EXECUTABLE?{executablePath:process.env.UI_CROSS_CHROMIUM_EXECUTABLE}:{}}:{})}})),
});
