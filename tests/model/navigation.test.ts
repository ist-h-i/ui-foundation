import assert from 'node:assert/strict';
import test from 'node:test';
import {breadcrumbItems,commandShortcut,foldBreadcrumb,matchesCommandShortcut,moveNavigationId,navigationHref,navigationNodes,navigationPath,paletteCommands,searchCommands,type NavigationNode} from '../../templates/angular/navigation-model.ts';
test('navigation validates whole recursive IDs and retains disabled and hidden data',()=>{
 const nodes:readonly NavigationNode[]=[{id:'root',label:'申請',children:[{id:'leaf',label:'確認',href:'#verify',disabled:true},{id:'hidden',label:'非表示',visible:false,href:'#hidden'}]}];assert.equal(navigationNodes(nodes),nodes);assert.deepEqual(navigationPath(nodes,'leaf')?.map(node=>node.id),['root','leaf']);assert.equal(navigationPath(nodes,'hidden'),null);
 assert.throws(()=>navigationNodes([{id:'x',label:'A',children:[{id:'x',label:'B'}]}]));const cycle:NavigationNode={id:'cycle',label:'循環'};cycle.children=[cycle];assert.throws(()=>navigationNodes([cycle]));assert.throws(()=>navigationNodes([{id:'bad id',label:'入力'}]));assert.throws(()=>navigationNodes([{id:'x',label:' '}]))
});
test('destination validation preserves native route/hash URLs while rejecting executable URLs',()=>{
 for(const href of ['#detail','/applications','https://example.com/path','mailto:help@example.com'])assert.equal(navigationHref(href),href);assert.equal(navigationHref(undefined),null);for(const href of ['','  ','javascript:alert(1)','\tjava\nscript:alert(1)','data:text/html,content','VBScript:msgbox(1)'])assert.throws(()=>navigationHref(href));
});
test('breadcrumb folding retains every item and leaves first/current last visible',()=>{
 const items=Array.from({length:8},(_,index)=>({id:'b'+index,label:'階層'+index,href:'#b'+index,current:index===7})),parts=foldBreadcrumb(items,3);assert.deepEqual(parts.start,[items[0]]);assert.deepEqual(parts.end,[items[7]]);assert.deepEqual([...parts.start,...parts.middle,...parts.end],items);assert.equal(foldBreadcrumb(items,8).middle.length,0);assert.throws(()=>foldBreadcrumb(items,2));assert.throws(()=>breadcrumbItems([{id:'a',label:'A',current:true},{id:'b',label:'B',current:true}]));
});
test('tab reordering preserves IDs and original collection at the bounds',()=>{
 const ids=['a','b','c'];assert.deepEqual(moveNavigationId(ids,'b',-1),['b','a','c']);assert.deepEqual(moveNavigationId(ids,'b',1),['a','c','b']);assert.equal(moveNavigationId(ids,'a',-1),ids);assert.equal(moveNavigationId(ids,'missing',1),ids);assert.deepEqual(ids,['a','b','c']);
});
test('command search combines label/group/keywords and keeps disabled candidates visible',()=>{
 const items=[{id:'open',label:'申請を開く',group:'申請',keywords:['records']},{id:'closed',label:'保存できない',group:'申請',disabled:true},{id:'hide',label:'申請',visible:false}];assert.deepEqual(searchCommands(items,'申請 records',[]).map(item=>item.id),['open']);assert.deepEqual(searchCommands(items,'',['closed','open']).map(item=>item.id),['closed','open']);assert.equal(searchCommands(items,'保存',[])[0]?.disabled,true);assert.throws(()=>paletteCommands([{id:'same',label:'A'},{id:'same',label:'B'}]));
});
test('command shortcuts preserve ordinary typing and reject ambiguous modifier syntax',()=>{
 assert.equal(commandShortcut(null),null);assert.deepEqual(commandShortcut('Control+Shift+K'),{key:'k',control:true,alt:false,shift:true,meta:false});assert.deepEqual(commandShortcut('Meta+Space'),{key:' ',control:false,alt:false,shift:false,meta:true});for(const value of ['', 'k','Shift+k','Control+Control+k','Ctrl+k','Control+','Control+Escape'])assert.throws(()=>commandShortcut(value));assert.throws(()=>paletteCommands([{id:'x',label:'操作',shortcut:'k'}]));assert.throws(()=>paletteCommands([{id:'x',label:'操作',group:' '}]))
});
test('shortcuts require the exact modifiers and yield to handled/IME keyboard events',()=>{
 const shortcut=commandShortcut('Control+k'),event={key:'K',ctrlKey:true,altKey:false,shiftKey:false,metaKey:false,isComposing:false,defaultPrevented:false,keyCode:75};assert.equal(matchesCommandShortcut(event,shortcut),true);for(const changed of [{ctrlKey:false},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{defaultPrevented:true},{key:'j'}])assert.equal(matchesCommandShortcut({...event,...changed},shortcut),false);assert.equal(matchesCommandShortcut(event,null),false);
});
