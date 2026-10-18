export interface ScreenshotRect {x:number;y:number;width:number;height:number;}

// Playwright 1.63 screenshotElement encloses both document-space edges in CSS
// pixels before device scaling (coreBundle.js: Helper.enclosingIntRect).
// A fractional origin can therefore add one CSS pixel at DPR 2, not merely
// one bitmap pixel. Keep this explicit instead of loosening size tolerances.
export function enclosingScreenshotClip(rect:ScreenshotRect):ScreenshotRect {
 const x=Math.floor(rect.x+1e-3),y=Math.floor(rect.y+1e-3);
 return {x,y,width:Math.ceil(rect.x+rect.width-1e-3)-x,height:Math.ceil(rect.y+rect.height-1e-3)-y};
}
