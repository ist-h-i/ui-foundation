import {defineConfig,devices} from '@playwright/test';
const port=5473;
export default defineConfig({
 testDir:'./tests/ui',
 fullyParallel:false,
 workers:1,
 retries:0,
 timeout:60000,
 forbidOnly:true,
 reporter:[['list'],['json',{outputFile:'../evidence/media-native-results.json'}]],
 outputDir:'../evidence/media-native-artifacts',
 use:{baseURL:`http://127.0.0.1:${port}`,channel:'chromium',trace:'on',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{command:`UI_FIXTURE_PORT=${port} node scripts/serve.mjs`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false,timeout:60000},
});
