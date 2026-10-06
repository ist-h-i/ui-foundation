import type {PDFDocumentLoadingTask,PDFDocumentProxy,PDFWorker,RenderTask} from 'pdfjs-dist';
import {mediaResourceUrl} from './media-dom';

export type PdfSource=string|Blob|Uint8Array;
export interface PdfAssetOptions {workerUrl:string;assetsBaseUrl:string|null;startupTimeoutMs?:number;}
export interface PdfPageResult {page:number;text:string;width:number;height:number;}

/** Native worker startup must finish before PDF.js receives the port. No PDF.js private fields or protocol parsing. */
function workerStarted(worker:Worker,signal:AbortSignal,timeoutMs:number):Promise<void> {
 return new Promise((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>|null=null;
  const cleanup=()=>{
   if(timer!==null)clearTimeout(timer);
   worker.removeEventListener('message',message);worker.removeEventListener('error',error);signal.removeEventListener('abort',abort);
  };
  const message=()=>{cleanup();resolve();};
  const error=(event:Event)=>{event.preventDefault();cleanup();reject(new Error('PDF worker unavailable'));};
  const abort=()=>{cleanup();reject(new Error('PDF load cancelled'));};
  if(signal.aborted){abort();return;}
  worker.addEventListener('message',message,{once:true});worker.addEventListener('error',error,{once:true});signal.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{cleanup();reject(new Error('PDF worker startup timed out'));},timeoutMs);
 });
}

/** PDF.js networking, worker and render lifetime are isolated from the UI's stable page model. */
export class PdfSession {
 private renderTask:RenderTask|null=null;
 private disposed=false;
 private rendering=0;
 private constructor(private readonly loading:PDFDocumentLoadingTask,private readonly worker:Worker,private readonly pdfWorker:PDFWorker,readonly document:PDFDocumentProxy){}

 static async load(source:PdfSource,owner:Document,options:PdfAssetOptions,signal:AbortSignal):Promise<PdfSession> {
  const engine=await import('pdfjs-dist');signal.throwIfAborted();
  const timeoutMs=options.startupTimeoutMs??10000;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<=0||timeoutMs>2147483647)throw new Error('PDF worker startupTimeoutMs must fit the positive timer range.');
  const workerUrl=mediaResourceUrl(options.workerUrl,owner);
  const assets=options.assetsBaseUrl===null?{}:{
   cMapUrl:mediaResourceUrl(options.assetsBaseUrl.replace(/\/?$/,'/')+'cmaps/',owner),cMapPacked:true,
   standardFontDataUrl:mediaResourceUrl(options.assetsBaseUrl.replace(/\/?$/,'/')+'standard_fonts/',owner),
   wasmUrl:mediaResourceUrl(options.assetsBaseUrl.replace(/\/?$/,'/')+'wasm/',owner),
   iccUrl:mediaResourceUrl(options.assetsBaseUrl.replace(/\/?$/,'/')+'iccs/',owner)
  };
  const worker=new Worker(workerUrl,{type:'module'});
  let pdfWorker:PDFWorker|null=null,task:PDFDocumentLoadingTask|null=null,interruption=false;
  let rejectLoad:(error:Error)=>void=()=>{};
  const interrupted=new Promise<never>((_resolve,reject)=>{rejectLoad=reject;});
  void interrupted.catch(()=>{});
  const abort=()=>{interruption=true;rejectLoad(new Error('PDF load cancelled'));};
  const workerError=(event:Event)=>{event.preventDefault();interruption=true;rejectLoad(new Error('PDF worker unavailable'));};
  try {
   await workerStarted(worker,signal,timeoutMs);signal.throwIfAborted();
   pdfWorker=engine.PDFWorker.create({port:worker});
   signal.addEventListener('abort',abort,{once:true});worker.addEventListener('error',workerError,{once:true});
   const input=typeof source==='string'?{url:mediaResourceUrl(source,owner)}:{data:source instanceof Uint8Array?source.slice():new Uint8Array(await source.arrayBuffer())};
   signal.throwIfAborted();
   task=engine.getDocument({...input,...assets,worker:pdfWorker,enableXfa:false});
   const document=await Promise.race([task.promise,interrupted]);
   return new PdfSession(task,worker,pdfWorker,document);
  } catch(error) {
   // A failed/aborted native port cannot acknowledge PDF.js destruction. Do not wait for its missing acknowledgement.
   const cleanup=task?.destroy();
   try{if(interruption)void cleanup?.catch(()=>{});else await cleanup?.catch(()=>{});}
   finally{pdfWorker?.destroy();worker.terminate();}
   throw error;
  } finally {
   signal.removeEventListener('abort',abort);worker.removeEventListener('error',workerError);
  }
 }

 get pages():number{return this.document.numPages;}
 async render(page:number,zoom:number,canvas:HTMLCanvasElement):Promise<PdfPageResult> {
  if(this.disposed)throw new Error('PDF session closed');
  const previous=this.renderTask;this.cancelRender();const revision=++this.rendering;
  await previous?.promise.catch(()=>{});
  const pdfPage=await this.document.getPage(page);
  if(this.disposed||revision!==this.rendering)throw new Error('PDF render cancelled');
  const viewport=pdfPage.getViewport({scale:zoom});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const task=pdfPage.render({canvas,viewport});this.renderTask=task;await task.promise;
  const text=await pdfPage.getTextContent();
  if(this.disposed||revision!==this.rendering)throw new Error('PDF render cancelled');
  return {page,text:text.items.flatMap(item=>'str' in item?[item.str+(item.hasEOL?'\n':' ')]:[]).join(''),width:canvas.width,height:canvas.height};
 }
 async blob():Promise<Blob>{const data=await this.document.getData();return new Blob([new Uint8Array(data)],{type:'application/pdf'});}
 cancelRender():void{this.rendering++;this.renderTask?.cancel();}
 async dispose():Promise<void>{
  if(this.disposed)return;
  this.disposed=true;this.cancelRender();
  try{await this.loading.destroy();}finally{this.pdfWorker.destroy();this.worker.terminate();}
 }
}
