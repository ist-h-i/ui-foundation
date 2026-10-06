import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cascaderPathProblem, treeBeginLoad, treeBranch, treeCancelLoads, treeCheckState, treeComplete, treeDomIdToken, treeEntries, treeFailLoad, treeFilter, treeNodes, treeResolveLoad, treeSelectionProblem, treeToggleCheck, treeVisible, treeWithLoads, type TreeNode} from '../../.ui/generated/angular/tree-model';

const nodes: readonly TreeNode[] = [{id:'head',label:'本部',children:[{id:'alpha',label:'企画',children:[{id:'a1',label:'企画1'},{id:'a2',label:'企画2'}]},{id:'beta',label:'運用'},{id:'locked',label:'停止部署',disabled:true,children:[{id:'locked-child',label:'変更不可'}]}]},{id:'lazy',label:'支社',hasChildren:true},{id:'last',label:'独立部署'}];

test('accepted UTF16 IDs keep raw selection/path/check values and distinct safe DOM tokens',()=>{
 const ids=['\ud800','\udc00','\ud800\ud800','\ud800a','a\ud800','\ud801','\ufffd','%ud800','%u0061d800','\ud83d\ude00','plain','A/B'];
 const accepted:readonly TreeNode[]=[{id:ids[0]!,label:'親',children:ids.slice(1).map(id=>({id,label:'子'}))}];assert.strictEqual(treeNodes(accepted),accepted);
 const encoded=ids.map(treeDomIdToken);assert.equal(new Set(encoded).size,ids.length);assert.equal(treeDomIdToken('\ud800'),'%ud800');assert.equal(treeDomIdToken('plain'),encodeURIComponent('plain'));assert.equal(treeDomIdToken('\ud83d\ude00'),encodeURIComponent('\ud83d\ude00'));assert.equal(treeDomIdToken('%ud800'),'%25ud800');assert(encoded.every(id=>!/[\ud800-\udfff\s]/.test(id)));
 for(const id of ids.slice(1)){assert.equal(treeSelectionProblem(accepted,[id],'single'),null);assert.equal(cascaderPathProblem(accepted,[ids[0]!,id],false),null);assert.deepEqual(treeToggleCheck(accepted,[],id,true,false),[id]);}
 assert.deepEqual(treeEntries(accepted).map(entry=>entry.node.id),ids);
});

test('branch, loaded-empty and unavailable descendants retain separate meanings',()=>{
 assert.equal(treeBranch(nodes[1]!),true);assert.equal(treeComplete(nodes[1]!),false);assert.equal(treeBranch({id:'empty',label:'取得済み',hasChildren:true,children:[]}),false);assert.equal(treeComplete({id:'empty',label:'取得済み',hasChildren:true,children:[]}),true);
 assert.equal(treeEntries(nodes).find(entry=>entry.node.id==='locked-child')!.disabled,true);
});
test('duplicate IDs, missing labels and cycles fail instead of rendering ambiguous trees',()=>{
 assert.throws(()=>treeNodes([{id:'a',label:'A'},{id:'a',label:'B'}]),/unique/);assert.throws(()=>treeNodes([{id:'bad',label:''}]),/label/);
 const cyclic: {id:string;label:string;children?:TreeNode[]}={id:'cycle',label:'循環'};cyclic.children=[cyclic];assert.throws(()=>treeNodes([cyclic]),/cycles/);
});
test('visible traversal uses expansion; search preserves ancestry and restores previous state',()=>{
 assert.deepEqual(treeVisible(nodes,[]).map(item=>item.node.id),['head','lazy','last']);assert.deepEqual(treeVisible(nodes,['head','alpha']).map(item=>item.node.id),['head','alpha','a1','a2','beta','locked','lazy','last']);
 assert.deepEqual(treeEntries(treeFilter(nodes,'企画2')).map(item=>item.node.id),['head','alpha','a2']);assert.deepEqual(treeVisible(nodes,[],'企画2').map(item=>item.node.id),['head','alpha','a2']);assert.deepEqual(treeVisible(nodes,[]).map(item=>item.node.id),['head','lazy','last']);
});
test('linked checks derive mixed/complete parents and retain disabled values',()=>{
 let selected=treeToggleCheck(nodes,['locked-child'],'a1',true);assert.equal(treeCheckState(nodes,selected,'alpha'),'mixed');assert.equal(treeCheckState(nodes,selected,'head'),'mixed');
 selected=treeToggleCheck(nodes,selected,'a2',true);assert.ok(selected.includes('alpha'));assert.equal(treeCheckState(nodes,selected,'alpha'),'true');assert.equal(treeCheckState(nodes,selected,'head'),'mixed');
 selected=treeToggleCheck(nodes,selected,'beta',true);assert.ok(selected.includes('head'));assert.equal(treeCheckState(nodes,selected,'head'),'true');assert.ok(selected.includes('locked-child'));
 selected=treeToggleCheck(nodes,selected,'a1',false);assert.equal(treeCheckState(nodes,selected,'alpha'),'mixed');assert.ok(!selected.includes('head'));
 assert.strictEqual(treeToggleCheck(nodes,selected,'locked-child',false),selected);
});
test('unlinked checks are independent; unknown children cannot be batch-confirmed',()=>{
 const independent=treeToggleCheck(nodes,[],'head',true,false);assert.deepEqual(independent,['head']);assert.equal(treeCheckState(nodes,independent,'head',false),'true');
 const values:readonly string[]=['a1'];assert.strictEqual(treeToggleCheck(nodes,values,'lazy',true,true),values);assert.equal(treeCheckState(nodes,['lazy'],'lazy',true),'mixed');
 const partlyLoaded: readonly TreeNode[]=[{id:'r',label:'R',children:[{id:'known',label:'K'},{id:'unknown',label:'U',hasChildren:true}]}];assert.strictEqual(treeToggleCheck(partlyLoaded,values,'r',true),values);assert.equal(treeCheckState(partlyLoaded,['known'],'r'),'mixed');
});
test('restored parent/leaf keys derive consistent linked checks and keep unrelated invalid values',()=>{
 assert.equal(treeCheckState(nodes,['head'],'head'),'true');assert.equal(treeCheckState(nodes,['head'],'a1'),'true');assert.equal(treeCheckState(nodes,['a1','a2'],'alpha'),'true');assert.equal(treeCheckState(nodes,['a1','a2','beta'],'head'),'true');
 const remaining=treeToggleCheck(nodes,['head','gone','lazy'],'a1',false,true);assert.ok(remaining.includes('a2'));assert.ok(remaining.includes('beta'));assert.ok(!remaining.includes('head'));assert.ok(remaining.includes('gone'));assert.ok(remaining.includes('lazy'));
});
test('selection/path validators keep cardinality, unknown, disabled and intermediate errors',()=>{
 assert.equal(treeSelectionProblem(nodes,['a1','a2'],'single'),'cardinality');assert.equal(treeSelectionProblem(nodes,['deleted'],'single'),'unknown');assert.equal(treeSelectionProblem(nodes,['locked-child'],'single'),'disabled');assert.equal(treeSelectionProblem(nodes,['lazy'],'multiple',true),'incomplete');assert.equal(treeSelectionProblem(nodes,['a1','a1'],'multiple'),'duplicate');
 assert.equal(cascaderPathProblem(nodes,['head','alpha','a2'],false),null);assert.equal(cascaderPathProblem(nodes,['head','alpha'],false),'intermediate');assert.equal(cascaderPathProblem(nodes,['head','alpha'],true),null);assert.equal(cascaderPathProblem(nodes,['alpha','a2'],true),'path');
});
test('loading deduplicates, failure/retry replaces request identity, stale replies return null',()=>{
 const first=treeBeginLoad(nodes,{},'lazy',1);assert.equal(first.request!.nodeId,'lazy');assert.deepEqual(first.request!.path,['lazy']);assert.equal(treeBeginLoad(nodes,first.loads,'lazy',2).request,null);
 const failed=treeFailLoad(first.loads,1,'再試行してください。')!;assert.equal(failed.lazy!.status,'error');assert.equal(treeResolveLoad(nodes,failed,1,[]),null);
 const retry=treeBeginLoad(nodes,failed,'lazy',2);assert.equal(retry.request!.requestId,2);assert.equal(treeFailLoad(retry.loads,1,'古い失敗'),null);
 const resolved=treeResolveLoad(nodes,retry.loads,2,[{id:'branch',label:'子部署',hasChildren:true}])!;assert.equal(treeWithLoads(nodes,resolved)[1]!.children![0]!.id,'branch');assert.equal(treeResolveLoad(nodes,resolved,2,[]),null);
});
test('nested lazy descendants and duplicate descendant responses are validated globally',()=>{
 const first=treeBeginLoad(nodes,{},'lazy',1),loaded=treeResolveLoad(nodes,first.loads,1,[{id:'branch',label:'子部署',hasChildren:true}])!;
 const nested=treeBeginLoad(nodes,loaded,'branch',2);assert.deepEqual(nested.request!.path,['lazy','branch']);const result=treeResolveLoad(nodes,nested.loads,2,[{id:'deep',label:'孫部署'}]);assert.ok(result);assert.ok(treeEntries(treeWithLoads(nodes,result!)).some(entry=>entry.node.id==='deep'));
 const retry=treeBeginLoad(nodes,{},'lazy',3);assert.throws(()=>treeResolveLoad(nodes,retry.loads,3,[{id:'head',label:'重複'}]),/unique/);
});
test('cancellation removes only matching pending work and rejects old results',()=>{
 const first=treeBeginLoad(nodes,{},'lazy',1),cancelled=treeCancelLoads(first.loads,['lazy'],'collapse');assert.equal(cancelled.cancelled[0]!.reason,'collapse');assert.equal(treeResolveLoad(nodes,cancelled.loads,1,[]),null);
 const retry=treeBeginLoad(nodes,cancelled.loads,'lazy',2);assert.equal(retry.request!.requestId,2);assert.equal(treeResolveLoad(nodes,retry.loads,1,[]),null);assert.equal(treeResolveLoad(nodes,retry.loads,2,[])!.lazy!.status,'loaded');
});
