import {expect,type Locator} from '@playwright/test';
export async function waitForResetViewport(viewport:Locator):Promise<void>{
 await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
}
