import type {Page,TestInfo} from '@playwright/test';
export interface NativeSheetEvent {id:number;kind:string;at:number;url:string;data?:unknown;}
declare global {interface Window {__sheetNativeEvents:NativeSheetEvent[];}}
/** Observe real native Workers. The optional held reply is actual parser data delayed only at delivery. */
export async function observeNativeSheetWorkers(page:Page,holdFirstReply=false):Promise<string[]>{
 const closed:string[]=[];
 page.on('worker',worker=>{if(new URL(worker.url()).pathname==='/assets/sheet-formula.worker.js')worker.on('close',()=>closed.push(worker.url()));});
 await page.addInitScript(({holdFirstReply})=>{
  const NativeWorker=window.Worker,events:NativeSheetEvent[]=[];window.__sheetNativeEvents=events;let sequence=0;
  const nativeSetter=Object.getOwnPropertyDescriptor(NativeWorker.prototype,'onmessage')?.set;
  class ObservedWorker extends NativeWorker {
   private readonly observationId:number;private readonly observationUrl:string;
   constructor(url:URL|string,options?:WorkerOptions){
    const at=performance.now();super(url,options);this.observationUrl=new URL(String(url),location.href).href;this.observationId=new URL(this.observationUrl).pathname==='/assets/sheet-formula.worker.js'?++sequence:0;
    if(!this.observationId)return;
    const record=(kind:string,data?:unknown)=>events.push({id:this.observationId,kind,at:performance.now(),url:this.observationUrl,...(data===undefined?{}:{data})});
    events.push({id:this.observationId,kind:'construct',at,url:this.observationUrl});
    this.addEventListener('message',event=>record('message',event.data));this.addEventListener('error',event=>record('error',event.message));
    if(holdFirstReply&&this.observationId===1){
     let handler:((this:Worker,event:MessageEvent)=>unknown)|null=null;
     Object.defineProperty(this,'onmessage',{configurable:true,get:()=>handler,set:(value:typeof handler)=>{
      handler=value;if(!nativeSetter)throw new Error('Native Worker message setter unavailable');
      nativeSetter.call(this,(event:MessageEvent)=>{
       if(Array.isArray(event.data?.results)){record('held-native-reply',event.data);setTimeout(()=>{record('delivered-held-native-reply',event.data);value?.call(this,event);},1500);}
       else value?.call(this,event);
      });
     }});
    }
   }
   override postMessage(message:unknown,options:Transferable[]|StructuredSerializeOptions=[]):void{if(this.observationId)events.push({id:this.observationId,kind:'post',at:performance.now(),url:this.observationUrl,data:message});if(Array.isArray(options))super.postMessage(message,options);else super.postMessage(message,options);}
   override terminate():void{if(this.observationId)events.push({id:this.observationId,kind:'terminate',at:performance.now(),url:this.observationUrl});super.terminate();}
  }
  window.Worker=ObservedWorker;
 },{holdFirstReply});
 return closed;
}
export async function nativeSheetEvents(page:Page):Promise<NativeSheetEvent[]>{return page.evaluate(()=>window.__sheetNativeEvents);}
export async function attachNativeSheetEvidence(page:Page,info:TestInfo,extra:Record<string,unknown>={}):Promise<void>{
 await info.attach('native-sheet-worker-observation',{body:JSON.stringify({...extra,events:await nativeSheetEvents(page)}),contentType:'application/json'});
}

/** Before module evaluation Playwright may never expose a Worker close event; inspect native targets too. */
export async function liveNativeSheetWorkerTargets(page:Page):Promise<unknown[]>{const session=await page.context().newCDPSession(page);try{const {targetInfos}=await session.send('Target.getTargets');return targetInfos.filter(target=>target.type==='worker'&&target.url===new URL('/assets/sheet-formula.worker.js',page.url()).href);}finally{await session.detach();}}
