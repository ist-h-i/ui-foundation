import {defineConfig} from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
 ...config,fullyParallel:false,workers:1,retries:0,
 testMatch:['media.spec.ts','media-regressions.spec.ts','media-lifetime.spec.ts'],
 reporter:[['list'],['json',{outputFile:'../evidence/native-media-results.json'}]],
 outputDir:'../evidence/native-media-artifacts',
});
