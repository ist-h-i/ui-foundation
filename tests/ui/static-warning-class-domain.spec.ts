import {test,expect} from '@playwright/test';

for (const profile of ['guided','dense']) {
  test(`CodeBlock class domain ${profile}: preserves language namespace and raw source across rendering updates`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/catalog/display');
    await page.getByLabel('プロファイル',{exact:true}).selectOption(profile);
    const block=page.locator('ui-code-block'),code=block.locator('pre code');
    await expect(code).toHaveClass('language-json');
    await expect(code.locator('script')).toHaveCount(0);
    const raw='const value = "'+('long-value'.repeat(50))+'";';
    await page.getByLabel('コード内容',{exact:true}).fill(raw);
    await page.getByLabel('JSONを整形',{exact:true}).uncheck();
    await page.getByLabel('行番号を表示',{exact:true}).uncheck();
    await page.getByLabel('コードを折り返す',{exact:true}).uncheck();
    await expect(code).toHaveClass('language-json');
    await expect(code).toHaveText(raw);
    await page.getByLabel('プロファイル',{exact:true}).selectOption(profile==='guided'?'dense':'guided');
    await expect(code).toHaveClass('language-json');
    await expect(code).toHaveText(raw);
    expect(errors).toEqual([]);
  });
}
