import assert from 'node:assert/strict';
import {test} from 'node:test';
import {videoMarkerColorMatches} from '../ui/video-marker-color.ts';

test('video marker conversion allows at most one RGB level at each channel',()=>{
 for(const [actual,expected] of [[[255,1,0],[255,0,0]],[[1,128,1],[0,128,0]],[[1,0,255],[0,0,255]]])assert.equal(videoMarkerColorMatches(actual,expected),true);
 for(const actual of [[2,128,0],[0,130,0],[0,128,2],[0,128],[],[NaN,128,0]])assert.equal(videoMarkerColorMatches(actual,[0,128,0]),false);
});

test('wrong marker palette and blank video cannot satisfy captured fit probes',()=>{
 const palette=[[255,0,0],[0,128,0],[0,0,255]];
 for(let i=0;i<palette.length;i++)for(let j=0;j<palette.length;j++)assert.equal(videoMarkerColorMatches(palette[i],palette[j]),i===j);
 for(const blank of [[255,255,255],[0,0,0]])for(const marker of palette)assert.equal(videoMarkerColorMatches(blank,marker),false);
});
