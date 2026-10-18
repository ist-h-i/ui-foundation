import {defineConfig,devices,webkit} from '@playwright/test';
import {fileURLToPath} from 'node:url';
type Engine='chromium'|'firefox'|'webkit';
const suite=process.env.UI_CROSS_BROWSER_SUITE??'runtime';
if(suite!=='runtime'&&suite!=='virtual-radio')throw new Error('UI_CROSS_BROWSER_SUITE must be runtime or virtual-radio.');
const radio=suite==='virtual-radio';
const requested=(process.env.UI_CROSS_BROWSER_ENGINES??'chromium,firefox,webkit').split(',');
const supported:readonly Engine[]=['chromium','firefox','webkit'];
if(!requested.length||new Set(requested).size!==requested.length||requested.some(name=>!supported.includes(name as Engine)))throw new Error('UI_CROSS_BROWSER_ENGINES must name distinct chromium, firefox, or webkit engines.');
const baseURL=process.env.UI_CROSS_BROWSER_URL;
if(!baseURL)throw new Error('Run node scripts/run-cross-browser.mjs to build and own an ephemeral loopback server.');
const origin=new URL(baseURL);
if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Cross-browser fixture URL must be an owned loopback origin.');
const output=process.env.UI_CROSS_BROWSER_EVIDENCE??'test-results/cross-browser';
// Cocoa reads this process argument domain without changing the user's defaults.
// Passing the pair as Playwright args treats the value as a URL, so launch via exec.
const radioWebKitLaunch=radio&&process.platform==='darwin'?{
 executablePath:fileURLToPath(new URL('./scripts/webkit-keyboard-launcher.sh',import.meta.url)),
 env:{...process.env,UI_RADIO_WEBKIT_EXECUTABLE:webkit.executablePath()},
}:undefined;
export default defineConfig({
 testDir:radio?'./tests/ui':'./tests/cross-browser',testMatch:radio?['virtual-radio.spec.ts','virtual-sparse-tab.spec.ts','virtual-fast-tab.spec.ts']:'runtime-cross-browser.spec.ts',
 fullyParallel:false,workers:1,forbidOnly:true,retries:0,timeout:radio?90_000:45_000,
 outputDir:output+'/artifacts',
 reporter:[['list'],['json',{outputFile:output+'/results.json'}]],
 use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:requested.map(name=>({name,use:{...(name==='chromium'?devices['Desktop Chrome']:name==='firefox'?devices['Desktop Firefox']:devices['Desktop Safari']),browserName:name as Engine,...(name==='chromium'?{channel:'chromium',launchOptions:process.env.UI_CROSS_CHROMIUM_EXECUTABLE?{executablePath:process.env.UI_CROSS_CHROMIUM_EXECUTABLE}:{}}:name==='webkit'&&radioWebKitLaunch?{launchOptions:radioWebKitLaunch}:{})}})),
});
