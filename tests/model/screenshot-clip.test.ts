import assert from 'node:assert/strict';
import {test} from 'node:test';
import {enclosingScreenshotClip} from '../ui/screenshot-clip.ts';

test('element screenshot encloses fractional origin and end before DPR scaling',()=>{
 const clip=enclosingScreenshotClip({x:12,y:300.5,width:200,height:200});
 assert.deepEqual(clip,{x:12,y:300,width:200,height:201});
 assert.deepEqual({width:clip.width*2,height:clip.height*2},{width:400,height:402});
 // A true CSS-size change must change the expected bitmap, not pass a tolerance.
 const changed=enclosingScreenshotClip({x:12,y:300.5,width:200,height:202});
 assert.notEqual(changed.height*2,402);
});

test('integer alignment, fractional ends, scroll-relative origins and numerical epsilon stay distinct',()=>{
 assert.deepEqual(enclosingScreenshotClip({x:12,y:300,width:200,height:200}),{x:12,y:300,width:200,height:200});
 assert.deepEqual(enclosingScreenshotClip({x:12.5,y:300,width:200,height:200.25}),{x:12,y:300,width:201,height:201});
 assert.deepEqual(enclosingScreenshotClip({x:12,y:-.5+301,width:200,height:200}),{x:12,y:300,width:200,height:201});
 assert.deepEqual(enclosingScreenshotClip({x:12-.0001,y:300+.0001,width:200,height:200}),{x:12,y:300,width:200,height:200});
});
