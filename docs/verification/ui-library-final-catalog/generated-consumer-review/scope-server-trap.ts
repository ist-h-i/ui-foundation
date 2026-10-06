import '@angular/compiler';
import {createApplication} from '@angular/platform-browser';
import {DOCUMENT,ElementRef,PLATFORM_ID,Renderer2,runInInjectionContext,signal} from '@angular/core';
import {Directionality} from '@angular/cdk/bidi';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {UiLocaleScope,provideUiLocale} from './.ui/generated/angular/index';
const globals=['document','window','MutationObserver','getComputedStyle'] as const;
const originals=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const originalDevMode=Object.getOwnPropertyDescriptor(globalThis,'ngDevMode');
Object.defineProperty(globalThis,'ngDevMode',{value:false,configurable:true,writable:true});
const attributes=new Map<string,string>();
const host={parentElement:null,getAttribute:(name:string)=>attributes.get(name)??null};
const renderer={setAttribute:(_element:unknown,name:string,value:string)=>attributes.set(name,value),removeAttribute:(_element:unknown,name:string)=>attributes.delete(name)};
const options=signal({locale:'de-DE',direction:'rtl' as const});
let app:Awaited<ReturnType<typeof createApplication>>|undefined;
let scope:UiLocaleScope|undefined;
const accessed:string[]=[];
try{
 app=await createApplication({providers:[...provideUiLocale(options),{provide:DOCUMENT,useValue:{defaultView:null}},{provide:PLATFORM_ID,useValue:'server'},{provide:ElementRef,useValue:new ElementRef(host)},{provide:Renderer2,useValue:renderer},{provide:Directionality,useValue:{value:'ltr',valueSignal:()=> 'ltr'}}]});
 // Angular platform initialization is outside the directive's boundary.
 for(const key of globals)Object.defineProperty(globalThis,key,{configurable:true,get(){accessed.push(key);throw new Error('Forbidden browser global '+key);}});
 scope=runInInjectionContext(app.injector,()=>new UiLocaleScope());
 app.tick();
 assert.equal(scope.resolveDirection(),'rtl');
 assert.equal(attributes.get('lang'),'de-DE');
 assert.equal(attributes.get('dir'),'rtl');
 app.destroy();app=undefined;
 assert.equal(attributes.size,0);
 assert.deepEqual(accessed,[]);
 await writeFile('evidence/scope-server-trap.json',JSON.stringify({actualClass:'UiLocaleScope',platformId:'server',angularMode:'production',documentDefaultView:null,browserGlobalsRead:accessed,ownedAttributesRemovedAtDestroy:true,limits:'Actual directive construction/effects/destruction in Angular server DI after Angular platform setup. Host and Renderer2 are test adapters; no SSR HTML rendering or hydration claim.'},null,2)+'\n');
 console.log('Actual UiLocaleScope server DI/global trap passed.');
}finally{
 app?.destroy();for(const [key,descriptor]of originals)descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key);originalDevMode?Object.defineProperty(globalThis,'ngDevMode',originalDevMode):Reflect.deleteProperty(globalThis,'ngDevMode');
}
