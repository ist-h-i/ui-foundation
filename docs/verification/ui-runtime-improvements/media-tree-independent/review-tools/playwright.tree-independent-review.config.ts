import {defineConfig} from '@playwright/test';
import config from './playwright.independent-review.config';
export default defineConfig({...config,
 testMatch:'tree-axe-contract.spec.ts',
 reporter:[['list'],['json',{outputFile:'../evidence/tree-native-results.json'}]],
 outputDir:'../evidence/tree-native-artifacts',
});
