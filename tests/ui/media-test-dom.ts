import type {ApplicationRef} from '@angular/core';
import type {MediaCatalog} from '../fixture-app/media-catalog';
import type {decodeCanvas} from '../fixture-app/media-decoder';

/** Browser hooks owned by the real Media fixture and the native test probes. */
declare global {
 interface Window {
  __mediaCatalog:MediaCatalog;
  __mediaApplication:ApplicationRef;
  __mediaDecodeCanvas:typeof decodeCanvas;
  nativePlayProbe:{calls:number;pauses:number;pending:Array<()=>void>};
  nativeReentryProbe:{sequence:string[];playing:number};
  savedNativeAudio:HTMLAudioElement;
  cropDecodeProbe:{pending:Array<{name:string;release:()=>void}>;closed:string[]};
  cropEncodingProbe:{created:string[];revoked:string[];pending:Array<()=>void>;delay:boolean};
  mediaWorkerProbe:Array<{terminated:number}>;
 }
}

/** Playwright serializes each evaluator; its native type guard runs in the browser. */
export function readNativeAudioState(node:SVGElement|HTMLElement){
 if(!(node instanceof HTMLAudioElement))throw new TypeError('Expected a native audio element');
 return {readyState:node.readyState,currentTime:node.currentTime,paused:node.paused,volume:node.volume,playbackRate:node.playbackRate,controls:node.controls,trackCount:node.textTracks.length,modes:Array.from(node.textTracks,track=>track.mode)};
}
export function readNativeVideoState(node:SVGElement|HTMLElement){
 if(!(node instanceof HTMLVideoElement))throw new TypeError('Expected a native video element');
 return {readyState:node.readyState,videoWidth:node.videoWidth};
}
export function readNativeImageWidth(node:SVGElement|HTMLElement){
 if(!(node instanceof HTMLImageElement))throw new TypeError('Expected a native image element');
 return node.naturalWidth;
}
export function readNativeCanvasSize(node:SVGElement|HTMLElement){
 if(!(node instanceof HTMLCanvasElement))throw new TypeError('Expected a native canvas element');
 return {width:node.width,height:node.height};
}
