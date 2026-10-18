export interface PostBurstIdentityRules {
 targetAttributes:readonly string[];
 ancestorAttributes:readonly string[];
 classTokens:readonly string[];
}
export interface PostBurstPaintOptions<Metric> {
 expectedIdentity:string;
 identify:(element:Element|null)=>string;
 identityRules:PostBurstIdentityRules;
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
 window.__observePostBurstPaint=async <Metric>({expectedIdentity,identify,identityRules,read,isReady,timeoutMs=1000}:PostBurstPaintOptions<Metric>):Promise<PostBurstPaintObservation<Metric>>=>{
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('post-burst paint timeout must be a positive finite duration');
  const started=performance.now(),target=document.activeElement,initialIdentity=identify(target);
  const dependencies=new Map<Element,{attributes:Map<string,string|null>;classes:Map<string,boolean>}>();
  for(let element=target;element;element=element.parentElement)dependencies.set(element,{
   attributes:new Map((element===target?identityRules.targetAttributes:identityRules.ancestorAttributes).map(name=>[name,element.getAttribute(name)])),
   classes:new Map(identityRules.classTokens.map(token=>[token,element.classList.contains(token)])),
  });
  let targetIssue:string|null=null;
  const focusout=(event:FocusEvent)=>{if(event.target===target)targetIssue??='focus left the pinned target';};
  const focusin=(event:FocusEvent)=>{if(event.target!==target)targetIssue??='another target received focus';};
  const inspectMutations=(records:MutationRecord[])=>{
   for(const record of records){
    if(record.type==='childList'&&[...record.removedNodes].some(node=>dependencies.has(node as Element)||!!target&&node.contains(target)))targetIssue??='the pinned target or an identity ancestor was removed';
    if(record.type!=='attributes')continue;
    const element=record.target as Element,dependency=dependencies.get(element),name=record.attributeName;if(!dependency||!name)continue;
    // A→B→A can finish before the next frame. Checking each oldValue as well as
    // the current value preserves that history without rewriting live DOM.
    if(dependency.attributes.has(name)){
     const pinned=dependency.attributes.get(name);
     if(record.oldValue!==pinned||element.getAttribute(name)!==pinned)targetIssue??=`identity attribute ${name} changed on ${element===target?'the pinned target':'a pinned ancestor'}`;
    }
    if(name==='class')for(const [token,pinned] of dependency.classes){
     const oldTokens=new Set((record.oldValue??'').split(/[\t\n\f\r ]+/).filter(Boolean));
     if(oldTokens.has(token)!==pinned||element.classList.contains(token)!==pinned)targetIssue??=`identity class ${token} changed on ${element===target?'the pinned target':'a pinned ancestor'}`;
    }
   }
  };
  const mutations=new MutationObserver(inspectMutations);
  document.addEventListener('focusout',focusout,true);document.addEventListener('focusin',focusin,true);
  const attributeFilter=[...new Set([...identityRules.targetAttributes,...identityRules.ancestorAttributes,...(identityRules.classTokens.length?['class']:[])])];
  mutations.observe(document,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter});
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
    inspectMutations(mutations.takeRecords());
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
