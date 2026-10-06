import config from './playwright.config';
export default {...config, webServer:undefined, use:{...config.use,trace:'on'},outputDir:process.env.FOCUS_RESULTS_DIR,workers:2,retries:0};
