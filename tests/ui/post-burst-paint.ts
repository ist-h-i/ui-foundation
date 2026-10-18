export interface PostBurstPaintOptions<Metric> {
 expectedIdentity:string;
 identify:(element:Element|null)=>string;
 read:()=>Metric;
 isReady:(metric:Metric)=>boolean;
 timeoutMs?:number;
}
export interface PostBurstPaintSample<Metric> {
 elapsedMs:number;
 activeIdentity:string;
 pinnedIdentity:string;
 sameTarget:boolean;
 connected:boolean;
 ready:boolean;
 metric:Metric|null;
 measurementError:string|null;
}
export interface PostBurstPaintObservation<Metric> {
 outcome:'ready'|'timeout'|'target-changed'|'measurement-failed';
 expectedIdentity:string;
 initialIdentity:string;
 targetIssue:string|null;
 timeoutMs:number;
 attempts:number;
 elapsedMs:number;
 initial:PostBurstPaintSample<Metric>;
 final:PostBurstPaintSample<Metric>;
}
declare global {
 interface Window {
  __observePostBurstPaint:<Metric>(options:PostBurstPaintOptions<Metric>)=>Promise<PostBurstPaintObservation<Metric>>;
 }
}

/** Install during setup. The observer itself never writes DOM, focus, or scroll. */
export function installPostBurstPaintObserver(){
 window.__observePostBurstPaint=async <Metric>({expectedIdentity,identify,read,isReady,timeoutMs=1000}:PostBurstPaintOptions<Metric>):Promise<PostBurstPaintObservation<Metric>>=>{
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('post-burst paint timeout must be a positive finite duration');
  const started=performance.now(),target=document.activeElement,initialIdentity=identify(target);
  let targetIssue:string|null=null;
  const focusout=(event:FocusEvent)=>{if(event.target===target)targetIssue??='focus left the pinned target';};
  const focusin=(event:FocusEvent)=>{if(event.target!==target)targetIssue??='another target received focus';};
  const mutations=new MutationObserver(records=>{
   if(records.some(record=>[...record.removedNodes].some(node=>node===target||!!target&&node.contains(target))))targetIssue??='the pinned target was removed';
  });
  document.addEventListener('focusout',focusout,true);document.addEventListener('focusin',focusin,true);
  mutations.observe(document,{childList:true,subtree:true});
  const sample=():PostBurstPaintSample<Metric>=>{
   let metric:Metric|null=null,measurementError:string|null=null,ready=false;
   try{metric=structuredClone(read());ready=isReady(metric);}catch(error){measurementError=error instanceof Error?error.message:String(error);}
   return {elapsedMs:performance.now()-started,activeIdentity:identify(document.activeElement),pinnedIdentity:identify(target),sameTarget:document.activeElement===target,connected:!!target?.isConnected,ready,metric,measurementError};
  };
  try{
   // This synchronous, detached copy is the FIRST actual metric. No await,
   // frame, timer, or producer callback can precede it inside the observer.
   const initial=sample();let final=initial,attempts=1;
   for(;;){
    if(!final.sameTarget)targetIssue??='the active DOM target changed';
    if(!final.connected)targetIssue??='the pinned target is disconnected';
    if(initialIdentity!==expectedIdentity||final.pinnedIdentity!==expectedIdentity||final.activeIdentity!==expectedIdentity)targetIssue??='the expected target identity changed';
    const outcome=targetIssue?'target-changed':final.measurementError?'measurement-failed':final.elapsedMs>timeoutMs?'timeout':final.ready?'ready':final.elapsedMs>=timeoutMs?'timeout':null;
    if(outcome)return {outcome,expectedIdentity,initialIdentity,targetIssue,timeoutMs,attempts,elapsedMs:final.elapsedMs,initial,final};
    // Only explicit POST-BURST observations use rendering opportunities. The
    // deadline timer also terminates an observation when RAF is suspended.
    await new Promise<void>(resolve=>{
     const timer=setTimeout(()=>{cancelAnimationFrame(frame);resolve();},Math.max(0,timeoutMs-(performance.now()-started)));
     const frame=requestAnimationFrame(()=>{clearTimeout(timer);resolve();});
    });
    final=sample();attempts++;
   }
  }finally{
   document.removeEventListener('focusout',focusout,true);document.removeEventListener('focusin',focusin,true);mutations.disconnect();
  }
 };
}
