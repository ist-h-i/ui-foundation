import {type Locator,type Page} from '@playwright/test';
import {test,expect,contexts,ready as runtimeReady,environment,settle,create,host,update,destroy,record,type Context} from './css-override-test';
const rows=Array.from({length:1000},(_,id)=>({id,name:`申請 ${id} `+'長い内容と保持する名前 '.repeat(8),amount:id}));
const state={page:1,pageSize:1000,search:'',sort:[],filters:[],columnOrder:[],hiddenColumns:[],columnWidths:{name:1,amount:9999},pinnedColumns:{}};

for (const kind of ['list', 'table'] as const) {
 test(`virtual ${kind} reorders the focused editor without blurring or changing its selection`, async ({page}) => {
  await runtimeReady(page, contexts[0]);
  const id = await create(page, 'RuntimeReassessmentVirtual', {
   kind, rows: rows.slice(1, 3), editors: true, height: 240, itemHeight: 48, overscan: 1,
  });
  const root = host(page, id);
  const editor = root.getByRole('textbox', {name: '再検証入力 2', exact: true});
  await editor.fill('提出前');
  await settle(page);
  const orders = [[2, 1], [3, 1, 4, 2], [2, 4, 1, 3], [2]];
  const observations = await editor.evaluate((element, {id, orders}) => {
   const input = element as HTMLInputElement;
   const viewport = input.closest('cdk-virtual-scroll-viewport')!;
   const runtime = (window as any).__runtime;
   // This part of the draft exists only in the editor until its next input event.
   input.setRangeText('の下書き', input.value.length, input.value.length, 'end');
   input.setSelectionRange(1, 4, 'backward');
   let blurs = 0;
   const onBlur = () => { blurs++; };
   input.addEventListener('blur', onBlur);
   try {
    return orders.map(order => {
     runtime.update(id, {rows: order.map(id => ({id, name: '申請 ' + id, amount: id}))});
     const editors = [...viewport.querySelectorAll<HTMLInputElement>('input')];
     return {
      order: editors.map(editor => editor.getAttribute('aria-label')),
      sameEditor: editors[order.indexOf(2)] === input,
      focused: document.activeElement === input, value: input.value,
      selection: [input.selectionStart, input.selectionEnd, input.selectionDirection], blurs,
     };
    });
   } finally {
    input.removeEventListener('blur', onBlur);
   }
  }, {id, orders});
  expect(observations).toEqual(orders.map(order => ({
   order: order.map(id => '再検証入力 ' + id), sameEditor: true, focused: true,
   value: '提出前の下書き', selection: [1, 4, 'backward'], blurs: 0,
  })));
  await update(page, id, {rows: []});
  await expect(root.getByRole('textbox')).toHaveCount(0);
  await destroy(page, id);
 });

 test(`virtual ${kind} keeps the visible editor when its key moves to a distant window`, async ({page}) => {
  await runtimeReady(page, contexts[0]);
  const initial = rows.slice(1, 41);
  const id = await create(page, 'RuntimeReassessmentVirtual', {
   kind, rows: initial, editors: true, height: 144, itemHeight: 48, overscan: 0,
  });
  const root = host(page, id);
  const editor = root.getByRole('textbox', {name: '再検証入力 2', exact: true});
  await editor.fill('下書き');
  await settle(page);
  const observed = await editor.evaluate(async (element, {id, kind, initial}) => {
   const runtime = (window as any).__runtime;
   const fixture = runtime.instance(id);
   const component = kind === 'list' ? fixture.list() : fixture.table();
   const input = element as HTMLInputElement;
   const viewport = input.closest<HTMLElement>('cdk-virtual-scroll-viewport')!;
   const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
   const state = (index: number) => {
    const range = fixture.range();
    const bounds = viewport.getBoundingClientRect(), editorBounds = input.getBoundingClientRect();
    return {
     focused: document.activeElement === input, blurs, value: input.value,
     selection: [input.selectionStart, input.selectionEnd, input.selectionDirection],
     exactRow: input.closest<HTMLElement>('[data-ui-virtual-index]')?.dataset['uiVirtualIndex'] === String(index),
     inRange: range.start <= index && index < range.end,
     bounded: viewport.querySelectorAll('[data-ui-virtual-index]').length <= 7,
     visible: editorBounds.bottom > bounds.top && editorBounds.top < bounds.bottom,
    };
   };
   input.setRangeText('未確定', 3, 3, 'end');
   input.setSelectionRange(1, 4, 'backward');
   let blurs = 0;
   input.addEventListener('blur', () => { blurs++; }, {once: true});
   const reversed = [...initial].reverse();
   const expanded = [...Array.from({length: 100}, (_, i) => ({id: 1000 + i, name: '追加', amount: i})), ...reversed];
   const retained = [];
   for (const data of [reversed, expanded, initial]) {
    const index = data.findIndex(row => row.id === 2);
    runtime.update(id, {rows: data});
    retained.push(state(index));
    await frames();
    retained.push(state(index));
   }
   runtime.update(id, {rows: initial.filter(row => row.id !== 2)});
   await frames();
   const removed = !input.isConnected && document.activeElement === viewport;

   runtime.update(id, {rows: initial});
   const next = viewport.querySelector<HTMLInputElement>('[aria-label="再検証入力 2"]')!;
   next.focus();
   component.scrollToIndex(20);
   runtime.update(id, {rows: reversed});
   await frames();
   const explicitRange = fixture.range();
   const explicitScroll = explicitRange.start <= 20 && 20 < explicitRange.end && !next.isConnected;
   const outside = document.getElementById('runtime-anchor')!;
   outside.focus();
   runtime.update(id, {rows: initial});
   await frames();
   return {retained, removed, explicitScroll, outside: document.activeElement === outside};
  }, {id, kind, initial});
  for (const snapshot of observed.retained) expect(snapshot).toEqual({
   focused: true, blurs: 0, value: '下書き未確定', selection: [1, 4, 'backward'],
   exactRow: true, inRange: true, bounded: true, visible: true,
  });
  expect(observed.removed).toBe(true);
  expect(observed.explicitScroll).toBe(true);
  expect(observed.outside).toBe(true);
  await destroy(page, id);
 });

 test(`virtual ${kind} combines a keyed reorder with row and viewport resizing`, async ({page}) => {
  await runtimeReady(page, contexts[0]);
  const initial = rows.slice(0, 100);
  for (const {geometry, next, bottom} of [
   {geometry: {itemHeight: 96, height: 97}, next: 19, bottom: false},
   {geometry: {itemHeight: 240, height: 97}, next: 21, bottom: true},
   ...[{itemHeight: 96, height: 149}, {itemHeight: 48, height: 97}, {itemHeight: 96, height: 97}]
    .map(geometry => ({geometry, next: 79, bottom: false})),
  ]) {
   const id = await create(page, 'RuntimeReassessmentVirtual', {
    kind, rows: initial, editors: true, height: 149, itemHeight: 48, overscan: 0,
   });
   const root = host(page, id);
   await expect(root.getByRole('textbox').first()).toBeVisible();
   await root.evaluate((_, {id, kind}) => {
    const fixture = (window as any).__runtime.instance(id);
    (kind === 'list' ? fixture.list() : fixture.table()).scrollToOffset(947);
   }, {id, kind});
   const editor = root.getByRole('textbox', {name: '再検証入力 20', exact: true});
   await expect(editor).toBeVisible();
   const observations = await editor.evaluate(async (node, {id, geometry, initial, next, bottom}) => {
    const input = node as HTMLInputElement, viewport = input.closest<HTMLElement>('cdk-virtual-scroll-viewport')!;
    const runtime = (window as any).__runtime;
    if (bottom) {
     // A projected editor can sit at the bottom of a row taller than its viewport.
     input.closest<HTMLElement>('[data-ui-virtual-index]')!.style.position = 'relative';
     Object.assign(input.style, {position: 'absolute', bottom: '3px', top: 'auto', height: '26px', minHeight: '0'});
    }
    input.focus({preventScroll: true});
    input.setRangeText('編集中', 0, input.value.length, 'end');
    input.setSelectionRange(0, 2, 'backward');
    let blurs = 0;
    input.addEventListener('blur', () => { blurs++; }, {once: true});
    const fullyVisible = (element: Element) => {
     const rect = element.getBoundingClientRect(), top = viewport.getBoundingClientRect().top + viewport.clientTop;
     return rect.top >= top - 1 && rect.bottom <= top + viewport.clientHeight + 1;
    };
    const originallyVisible = fullyVisible(input);
    const read = () => {
     const range = runtime.instance(id).range(), row = input.closest<HTMLElement>('[data-ui-virtual-index]')!;
     return {
      focused: document.activeElement === input, value: input.value, blurs,
      selection: [input.selectionStart, input.selectionEnd, input.selectionDirection],
      row: row.dataset['uiVirtualIndex'],
      rowFits: geometry.itemHeight > viewport.clientHeight || fullyVisible(row),
      inRange: range.start <= next && next < range.end,
      visible: fullyVisible(input),
      bounded: viewport.querySelectorAll('[data-ui-virtual-index]').length <= Math.ceil(geometry.height / geometry.itemHeight) + 2,
     };
    };
    const fixture = runtime.instance(id);
    const ranges: {start: number; end: number}[] = [];
    const subscription = (fixture.list() ?? fixture.table()).rangeChange.subscribe((range: {start: number; end: number}) => ranges.push(range));
    let snapshots;
    try {
     const reordered = [...initial];
     if (next !== 79) [reordered[next], reordered[20]] = [reordered[20]!, reordered[next]!];
     else reordered.reverse();
     runtime.update(id, {...geometry, rows: reordered});
     const immediate = read();
     await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
     snapshots = [immediate, read()];
    } finally {
     subscription.unsubscribe();
    }
    // A native scroll can occur before the CDK scroll event and the next input update.
    viewport.scrollTop = 50 * geometry.itemHeight;
    runtime.update(id, {rows: initial, itemHeight: 2 * geometry.itemHeight, height: 149});
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const range = fixture.range();
    return {snapshots, ranges, originallyVisible, explicit: {
     offset: viewport.scrollTop, includesRequestedRow: range.start <= 50 && 50 < range.end, released: !input.isConnected,
    }};
   }, {id, geometry, initial, next, bottom});
   expect(observations.originallyVisible).toBe(true);
   expect(observations.explicit).toEqual({offset: 100 * geometry.itemHeight, includesRequestedRow: true, released: true});
   expect(observations.ranges.length).toBeGreaterThan(0);
   for (const range of observations.ranges) {
    expect(range.start).toBeLessThanOrEqual(next);
    expect(range.end).toBeGreaterThan(next);
   }
   for (const snapshot of observations.snapshots) expect(snapshot, JSON.stringify(geometry)).toEqual({
    focused: true, value: '編集中', blurs: 0, selection: [0, 2, 'backward'], row: String(next), rowFits: true,
    inRange: true, visible: true, bounded: true,
   });
   await destroy(page, id);
  }
 });

 test(`virtual ${kind} prioritizes an explicit scroll for one update while the editor is still partly visible`, async ({page}) => {
  await runtimeReady(page, contexts[0]);
  const initial = rows.slice(0, 100);
  for (const method of ['offset', 'index', 'native', 'consumed', 'settled', 'settled-native'] as const) {
   const id = await create(page, 'RuntimeReassessmentVirtual', {
    kind, rows: initial, editors: true, itemHeight: 48, height: 149, overscan: 0,
   });
   const root = host(page, id);
   await expect(root.getByRole('textbox').first()).toBeVisible();
   await root.evaluate((_, id) => {
    const fixture = (window as any).__runtime.instance(id);
    (fixture.list() ?? fixture.table()).scrollToOffset(947);
   }, id);
   const editor = root.getByRole('textbox', {name: '再検証入力 20', exact: true});
   await expect(editor).toBeVisible();
   const result = await editor.evaluate(async (element, {id, initial, method}) => {
    const input = element as HTMLInputElement, viewport = input.closest<HTMLElement>('cdk-virtual-scroll-viewport')!;
    const runtime = (window as any).__runtime, fixture = runtime.instance(id), component = fixture.list() ?? fixture.table();
    const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await frames();
    input.focus({preventScroll: true});
    input.setRangeText('編集中', 0, input.value.length, 'end');
    input.setSelectionRange(0, 2, 'backward');
    let blurs = 0;
    input.addEventListener('blur', () => blurs++);
    if (method === 'native' || method === 'settled-native') viewport.scrollTop = 865;
    else if (method === 'index') component.scrollToIndex(18);
    else component.scrollToOffset(865);
    const rect = input.getBoundingClientRect(), top = viewport.getBoundingClientRect().top + viewport.clientTop;
    const partlyVisible = rect.top < top + viewport.clientHeight && rect.bottom > top + viewport.clientHeight;
    if (method === 'consumed') runtime.update(id, {rows: [...initial]});
    if (method === 'settled' || method === 'settled-native') await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const reordered = [...initial];
    [reordered[19], reordered[20]] = [reordered[20]!, reordered[19]!];
    runtime.update(id, {rows: reordered, itemHeight: 96, height: 97});
    const read = () => {
     const range = fixture.range();
     return {
      offset: viewport.scrollTop, inRange: range.start <= 18 && 18 < range.end,
      focused: document.activeElement === input, draft: input.value, blurs,
      selection: [input.selectionStart, input.selectionEnd, input.selectionDirection],
     };
    };
    const immediate = read();
    await frames();
    return {partlyVisible, snapshots: [immediate, read()]};
   }, {id, initial, method});
   expect(result.partlyVisible).toBe(true);
   const settled = method === 'consumed' || method === 'settled' || method === 'settled-native';
   const expected = settled ? (kind === 'list' ? 1824 : 1823) : (method === 'index' ? 1728 : 1730);
   for (const snapshot of result.snapshots) expect(snapshot, method).toEqual({
    offset: expected, inRange: true, focused: true, draft: '編集中', blurs: 0, selection: [0, 2, 'backward'],
   });
   await destroy(page, id);
  }
 });

}

test('virtual list restores owned focus when an in-place replacement removes the focused row', async ({page}) => {
 await runtimeReady(page, contexts[0]);
 const id = await create(page, 'RuntimeReassessmentVirtual', {
  kind: 'list', rows: rows.slice(1, 3), editors: true, height: 240, itemHeight: 48, overscan: 0,
 });
 const editor = host(page, id).getByRole('textbox', {name: '再検証入力 1', exact: true});
 await editor.focus();
 const result = await editor.evaluate((input, id) => {
  const runtime = (window as any).__runtime;
  const fixture = runtime.instance(id);
  const rows = fixture.rows();
  const viewport = input.closest('cdk-virtual-scroll-viewport')!;
  const previousRange = fixture.range();
  rows[0] = {...rows[0], id: 3};
  runtime.update(id, {height: 241});
  const focusRestored = !input.isConnected && document.activeElement === viewport;
  const rangeRetained = fixture.range() === previousRange;
  const outside = document.createElement('button');
  document.body.append(outside);
  try {
   outside.focus();
   rows[0] = {...rows[0], id: 4};
   runtime.update(id, {height: 242});
   return {focusRestored, rangeRetained, outsideFocused: document.activeElement === outside};
  } finally {
   outside.remove();
  }
 }, id);
 expect(result).toEqual({focusRestored: true, rangeRetained: true, outsideFocused: true});
 await expect(host(page, id).getByRole('textbox', {name: '再検証入力 4', exact: true})).toBeVisible();
 await destroy(page, id);
});

test('virtual table reuses tracked rows and updates focused, empty and refilled windows in the same render', async ({page}) => {
 await runtimeReady(page, contexts[0]);
 const initial = [{id: 1, code: 'a', name: 'First'}, {id: 2, code: 'b', name: 'Second'}];
 const id = await create(page, 'VirtualDataTable', {
  tableId: 'keyed-rows', caption: 'Requests', keyField: 'id', rows: initial,
  columns: [{id: 'name', field: 'name', header: 'Request'}], height: 160, itemHeight: 48,
 });
 const table = host(page, id);
 const cell = table.locator('[data-virtual-row-key="number:1"] [role="cell"]');
 await cell.focus();
 const result = await table.evaluate((root, {id, initial}) => {
  const runtime = (window as any).__runtime;
  const viewport = root.querySelector('cdk-virtual-scroll-viewport')!;
  const rendered = () => [...viewport.querySelectorAll<HTMLElement>('[data-virtual-row-key]')];
  const range = () => runtime.inspect(id).events.filter((event: {name: string}) => event.name === 'rangeChange').at(-1)?.value;
  const [first, second] = rendered();
  const focused = document.activeElement;
  const replacements = initial.map(row => ({...row, name: row.name + ' updated'}));
  runtime.update(id, {rows: replacements});
  const sameKey = rendered()[0] === first && document.activeElement === focused;
  const label = rendered()[0]?.textContent?.trim();

  replacements[0] = {...replacements[0]!, name: 'First revised'};
  runtime.update(id, {disabled: true});
  const inPlaceLabel = rendered()[0]?.textContent?.trim();

  runtime.update(id, {rows: [...replacements].reverse()});
  const reordered = rendered()[0] === second && rendered()[1] === first;
  const indices = rendered().map(row => row.getAttribute('aria-rowindex'));
  first!.querySelector<HTMLElement>('[role="cell"]')!.focus();
  runtime.update(id, {keyField: 'code'});
  const rekeyed = rendered().map(row => row.dataset['virtualRowKey']);
  const oldRowsRemoved = !first!.isConnected && !second!.isConnected;
  const recoveredFocus = document.activeElement === viewport;

  runtime.update(id, {rows: []});
  const empty = {count: rendered().length, range: range(), status: !!root.querySelector('[role="status"]')};
  runtime.update(id, {rows: [replacements[0]]});
  const refilled = {keys: rendered().map(row => row.dataset['virtualRowKey']), range: range()};
  return {sameKey, label, inPlaceLabel, reordered, indices, rekeyed, oldRowsRemoved, recoveredFocus, empty, refilled};
 }, {id, initial});
 expect(result).toEqual({
  sameKey: true, label: 'First updated', inPlaceLabel: 'First revised', reordered: true, indices: ['2', '3'],
  rekeyed: ['string:b', 'string:a'], oldRowsRemoved: true, recoveredFocus: true,
  empty: {count: 0, range: {start: 0, end: 0}, status: true},
  refilled: {keys: ['string:a'], range: {start: 0, end: 1}},
 });
 await destroy(page, id);
});

function nextContext(c:Context):Context{return {...c,profile:c.profile==='guided'?'dense':'guided',width:c.width===1280?320:1280,font:c.font==='100%'?'200%':'100%',dir:c.dir==='ltr'?'rtl':'ltr',motion:c.motion==='reduce'?'no-preference':'reduce'} as Context;}
async function ready(page:Page,context:Context){await runtimeReady(page,context);await page.locator('#runtime-slot').evaluate(el=>{const slot=el as HTMLElement;slot.style.padding='calc(var(--ui-border-focus) + var(--ui-border-focus-offset))';slot.style.boxSizing='border-box';});await settle(page);}
/** Enter through native Tab order without a frame wait between keys; no reverse Tab or direct target focus.
 * A separate burst regression checks identity only after all trusted keys have run. */
async function nativeFocus(page:Page,target:Locator){
 await target.scrollIntoViewIfNeeded();const identity=await target.evaluate(el=>({root:el.closest<HTMLElement>('[data-runtime-id]')!.id,tag:el.tagName,label:el.getAttribute('aria-label'),role:el.getAttribute('role'),row:el.closest('[data-virtual-row-key]')?.getAttribute('data-virtual-row-key')??null,col:el.getAttribute('aria-colindex')}));
 await page.locator('#runtime-anchor').focus();let found=false;
 for(let i=0;i<180;i++){await page.keyboard.press('Tab');if(await page.evaluate(identity=>{const root=document.getElementById(identity.root),active=document.activeElement;return !!root&&!!active&&root.contains(active)&&active.tagName===identity.tag&&active.getAttribute('aria-label')===identity.label&&active.getAttribute('role')===identity.role&&(active.closest('[data-virtual-row-key]')?.getAttribute('data-virtual-row-key')??null)===identity.row&&active.getAttribute('aria-colindex')===identity.col;},identity)){found=true;break;}}
 expect(found,'target is reachable using native Tab from the external anchor').toBe(true);await expect(target).toBeFocused();
 await expect.poll(()=>target.evaluate(el=>el.matches(':focus-visible'))).toBe(true);
}
async function focusMetric(target:Locator){return target.evaluate(async node=>{
 const el=node as HTMLElement,r=el.getBoundingClientRect(),style=getComputedStyle(el),width=parseFloat(style.outlineWidth)||0,offset=parseFloat(style.outlineOffset)||0,extent=Math.max(0,width+offset),ring={left:r.left-extent,right:r.right+extent,top:r.top-extent,bottom:r.bottom+extent};
 const clip={left:0,top:0,right:innerWidth,bottom:innerHeight};const ancestors=[];
 for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect(),x=/auto|scroll|hidden|clip/.test(s.overflowX),y=/auto|scroll|hidden|clip/.test(s.overflowY);if(x||y){const bounds=await new Promise<DOMRectReadOnly>(resolve=>{const observer=new IntersectionObserver(entries=>{observer.disconnect();resolve(entries[0]!.rootBounds!);},{root:p});observer.observe(el);});if(x){clip.left=Math.max(clip.left,bounds.left);clip.right=Math.min(clip.right,bounds.right);}if(y){clip.top=Math.max(clip.top,bounds.top);clip.bottom=Math.min(clip.bottom,bounds.bottom);}ancestors.push({tag:p.tagName,class:p.className,x,y,nativeRoot:bounds.toJSON(),borderBox:b.toJSON(),client:{width:p.clientWidth,height:p.clientHeight}});}}
 const inset=Math.min(r.width/2,r.height/2,Math.max(3,...[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius,style.borderBottomRightRadius].map(x=>parseFloat(x)||0))),hits=[r.left+inset,(r.left+r.right)/2,r.right-inset].flatMap(x=>[r.top+inset,(r.top+r.bottom)/2,r.bottom-inset].map(y=>{const top=document.elementFromPoint(x,y);return top===el||!!top&&el.contains(top);}));
 return {ring,clip,outlineWidth:width,outlineOffset:offset,outlineStyle:style.outlineStyle,focusVisible:el.matches(':focus-visible'),ancestors,hits,pass:width>0&&style.outlineStyle!=='none'&&el.matches(':focus-visible')&&ring.left>=clip.left-1&&ring.right<=clip.right+1&&ring.top>=clip.top-1&&ring.bottom<=clip.bottom+1&&hits.every(Boolean)};
 });}
async function expectFocus(target:Locator,label:string){try{await expect.poll(async()=>(await focusMetric(target)).pass,{message:label+': full focus outline and native hit points fit all clipping ancestors'}).toBe(true);}finally{await record(label,await focusMetric(target));}}
/** The CDK public range is compared to DOM indices, independent measured row/probe and spacer. */
async function metric(page:Page,id:number,kind:'list'|'table'|'listbox',count:number){return page.evaluate(({id,kind,count})=>{
 const api=(window as any).__runtime,instance=api.instance(id),component=kind==='listbox'?instance:kind==='list'?instance.list():instance.table(),viewport=component.viewport(),element=viewport.elementRef.nativeElement as HTMLElement,range=viewport.getRenderedRange(),wrapper=element.querySelector<HTMLElement>(kind==='listbox'?'.cdk-virtual-scroll-content-wrapper':'.ui-virtual-window')!,spacer=element.querySelector<HTMLElement>('.cdk-virtual-scroll-spacer')!,scope=document.querySelector<HTMLElement>(`[data-runtime-id="${id}"]`)!,selector=kind==='list'?'.ui-virtual-row':kind==='table'?'[data-virtual-row-key]':'[role=option]',nodes=[...element.querySelectorAll<HTMLElement>(selector)],probe=scope.querySelector<HTMLElement>(kind==='list'?'.ui-virtual-measure':kind==='table'?'.ui-virtual-table__row-probe':'.ui-listbox-measure')!,itemHeight=component.itemHeight()??probe.getBoundingClientRect().height;
 const rendered=nodes.map(row=>{const r=row.getBoundingClientRect(),index=kind==='list'?Number(row.getAttribute('aria-posinset'))-1:kind==='table'?Number(row.getAttribute('aria-rowindex'))-2:Number(row.dataset['listValue']),s=getComputedStyle(row),children=[...row.children].map(child=>{const box=child.getBoundingClientRect();return {top:box.top,bottom:box.bottom,height:box.height,scroll:(child as HTMLElement).scrollHeight,client:(child as HTMLElement).clientHeight};});return {index,height:r.height,width:r.width,top:r.top,bottom:r.bottom,client:row.clientHeight,scroll:row.scrollHeight,padding:parseFloat(s.paddingTop)+parseFloat(s.paddingBottom),children};});
 return {kind,count,range,rangeOutput:kind==='listbox'?null:instance.range(),overscan:component.overscan(),height:element.clientHeight,width:element.clientWidth,itemHeight,probe:probe.getBoundingClientRect().height,offset:kind==='listbox'?new DOMMatrixReadOnly(getComputedStyle(wrapper).transform).m42:parseFloat(getComputedStyle(wrapper).paddingBlockStart),spacer:spacer.getBoundingClientRect().height,rendered,scrollTop:element.scrollTop,scrollHeight:element.scrollHeight,scrollOffset:viewport.measureScrollOffset(),viewportRect:{top:element.getBoundingClientRect().top+element.clientTop,bottom:element.getBoundingClientRect().top+element.clientTop+element.clientHeight}};
 },{id,kind,count});}
async function verifyGeometry(page:Page,id:number,kind:'list'|'table'|'listbox',count:number,label:string){
 await expect.poll(async()=>{const m=await metric(page,id,kind,count);return m.rendered.length>0&&m.range.end===count&&m.rendered.at(-1)!.index===count-1&&Math.abs(m.offset-m.range.start*m.itemHeight)<=1&&Math.abs(m.spacer-count*m.itemHeight)<=1&&m.rendered.every(row=>Math.abs(row.height-m.itemHeight)<=1);},{message:label+': CDK range and total spacer agree with current independent item measurement'}).toBe(true);
 const m=await metric(page,id,kind,count);expect(m.itemHeight).toBeGreaterThan(0);expect(m.range.start).toBe(m.rendered[0]!.index);expect(m.range.end-m.range.start).toBe(m.rendered.length);if(m.rangeOutput)expect(m.rangeOutput).toEqual(m.range);expect(m.rendered.length).toBeLessThanOrEqual(Math.ceil(m.height/m.itemHeight)+2*(m.overscan+1)+2);expect(m.scrollTop).toBeGreaterThan(0);expect(Math.abs(m.scrollTop-m.scrollOffset)).toBeLessThanOrEqual(1);
 const last=m.rendered.at(-1)!;expect(last.top).toBeGreaterThanOrEqual(m.viewportRect.top-1);expect(last.bottom).toBeLessThanOrEqual(m.viewportRect.bottom+1);
 if(kind!=='table')for(const row of m.rendered)expect(Math.abs(row.width-m.width)).toBeLessThanOrEqual(1);
 await record(label,m);
}
async function atEnd(page:Page,viewport:Locator){await nativeFocus(page,viewport);await viewport.press('End');await settle(page);}
async function verifyColumns(node:Locator,expected:number[],label:string){
 const measure=()=>node.evaluate(n=>{const headers=[...n.querySelectorAll<HTMLElement>('[role=columnheader]')],rows=[...n.querySelectorAll<HTMLElement>('[data-virtual-row-key]')];return {headers:headers.map(h=>{const r=h.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}),rows:rows.map(row=>[...row.querySelectorAll<HTMLElement>('[role=cell]')].map(c=>{const r=c.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,contentHeight:c.scrollHeight,clientHeight:c.clientHeight};}))};});
 await expect.poll(async()=>{const m=await measure();return m.headers.length===expected.length&&m.headers.every((h,i)=>Math.abs(h.width-expected[i]!)<=1)&&m.rows.every(row=>row.every((c,i)=>Math.abs(c.left-m.headers[i]!.left)<=1&&Math.abs(c.right-m.headers[i]!.right)<=1));},{message:label+': min/max clamped header widths and every rendered body column edge'}).toBe(true);await record(label,await measure());
}
async function verifyListbox(page:Page,node:Locator,label:string,expectedLabel:string){
 const viewport=node.getByRole('listbox'),option=node.locator('[data-list-value="999"]');
 await expect.poll(()=>viewport.evaluate(el=>{const active=el.getAttribute('aria-activedescendant'),row=active?document.getElementById(active):null;return !!row&&el.contains(row)&&row.dataset['listValue']==='999'&&document.querySelectorAll('[id="'+active+'"]').length===1;})).toBe(true);
 await expect(option).toHaveAttribute('aria-label',expectedLabel);await expect(option).toHaveAttribute('aria-selected','true');
 const clips=await node.locator('[role=option]>span').evaluateAll(spans=>spans.map(span=>{const el=span as HTMLElement,r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect(),s=getComputedStyle(el);return {text:el.textContent,width:r.width,height:r.height,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,top:r.top,bottom:r.bottom,parentTop:p.top,parentBottom:p.bottom,overflow:s.overflowX,ellipsis:s.textOverflow,nowrap:s.whiteSpace};}));
 for(const row of clips){expect(row.scrollHeight).toBeLessThanOrEqual(row.clientHeight+1);expect(row.top).toBeGreaterThanOrEqual(row.parentTop-1);expect(row.bottom).toBeLessThanOrEqual(row.parentBottom+1);expect(row.overflow).toBe('hidden');expect(row.ellipsis).toBe('ellipsis');expect(row.nowrap).toBe('nowrap');}
 const ownership=await viewport.evaluate(el=>{const owns=(el.getAttribute('aria-owns')??'').split(' ').filter(Boolean),rows=[...el.querySelectorAll<HTMLElement>('[role=option]')],owned=owns.flatMap(id=>{const node=document.getElementById(id);if(!node||!el.contains(node))return ['MISSING:'+id];return node.getAttribute('role')==='group'?(node.getAttribute('aria-owns')??'').split(' ').filter(Boolean):[id];});return {owns,owned,rows:rows.map(r=>r.id),active:el.getAttribute('aria-activedescendant')};});expect([...ownership.owned].sort()).toEqual([...ownership.rows].sort());expect(new Set(ownership.owned).size).toBe(ownership.rows.length);
 const cdp=await page.context().newCDPSession(page);try{const ax=await cdp.send('Accessibility.getFullAXTree'),box=ax.nodes.find(n=>n.role?.value==='listbox'&&n.name?.value==='再検証する1000候補')!;expect(box).toBeTruthy();const byId=new Map(ax.nodes.map(n=>[n.nodeId,n])),owned=(n:typeof ax.nodes[number])=>{const seen=new Set<string>();while(n.parentId&&!seen.has(n.parentId)){if(n.parentId===box.nodeId)return true;seen.add(n.parentId);const parent=byId.get(n.parentId);if(!parent)return false;n=parent;}return false;},options=ax.nodes.filter(n=>n.role?.value==='option'&&!n.ignored&&owned(n));expect(options).toHaveLength(ownership.rows.length);expect(options.some(n=>String(n.name?.value??'').replace(/\s+/g,' ').trim()===expectedLabel.replace(/\s+/g,' ').trim())).toBe(true);await record(label,{clips,ownership,AXOptions:options.map(n=>({id:n.nodeId,parent:n.parentId,name:n.name?.value}))});}finally{await cdp.detach();}
 await expectFocus(viewport,label+'-viewport-ring');
}
for(const context of contexts){
 for(const kind of ['list','table'] as const)test(`reassessment virtual ${kind} ${context.name}: terminal environment remeasure hidden range key draft and native focus`,async({page})=>{
  if(kind==='table'){
   // Default fixed rows contain native text cells. A projected editor supplies its own explicit row-height budget below.
   await ready(page,context);const id=await create(page,'RuntimeReassessmentVirtual',{kind,rows,height:360,itemHeight:null,overscan:2,state,editors:false}),node=host(page,id),viewport=node.locator('cdk-virtual-scroll-viewport');
   const cell=(key:number)=>node.locator(`[data-virtual-row-key="number:${key}"] [role=cell]`).last();
   await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'table-default-initial-'+context.name);await verifyColumns(node,[100,180],'table-clamp-initial-'+context.name);await expect(node.getByRole('textbox')).toHaveCount(0);await nativeFocus(page,cell(999));await expectFocus(cell(999),'table-native-cell-initial-'+context.name);
   await environment(page,nextContext(context));await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'table-default-environment-'+context.name);await verifyColumns(node,[100,180],'table-clamp-environment-'+context.name);await nativeFocus(page,cell(999));await expectFocus(cell(999),'table-native-cell-environment-'+context.name);
   await update(page,id,{state:{...state,columnWidths:{name:9999,amount:1}}});await verifyColumns(node,[220,80],'table-clamp-updated-'+context.name);
   await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(node).toBeHidden();await update(page,id,{rows:rows.slice(0,999),overscan:4});await node.evaluate(el=>(el as HTMLElement).hidden=false);await atEnd(page,viewport);await verifyGeometry(page,id,kind,999,'table-default-reveal-'+context.name);await nativeFocus(page,cell(998));await expectFocus(cell(998),'table-native-cell-reveal-'+context.name);await expect(node.getByRole('textbox')).toHaveCount(0);
   await update(page,id,{rows,height:440,itemHeight:220,overscan:1,editors:true});await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'table-explicit-editor-initial-'+context.name);const last=node.getByRole('textbox',{name:'再検証入力 999',exact:true});await nativeFocus(page,last);await last.fill('key999の未保存下書き');await expectFocus(last,'table-explicit-editor-initial-'+context.name);
   await environment(page,context);await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'table-explicit-editor-environment-'+context.name);await expect(last).toHaveValue('key999の未保存下書き');await nativeFocus(page,last);await expectFocus(last,'table-explicit-editor-environment-'+context.name);
   await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(node).toBeHidden();await update(page,id,{rows:rows.slice(0,999),overscan:3});await node.evaluate(el=>(el as HTMLElement).hidden=false);await atEnd(page,viewport);await verifyGeometry(page,id,kind,999,'table-explicit-editor-reveal-'+context.name);await expect(node.getByRole('textbox',{name:'再検証入力 998',exact:true})).toHaveValue('元の入力 998');
   await update(page,id,{rows,overscan:1});await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'table-explicit-editor-recycled-'+context.name);await expect(last).toHaveValue('key999の未保存下書き');await nativeFocus(page,last);await expectFocus(last,'table-explicit-editor-recycled-'+context.name);await verifyColumns(node,[220,80],'table-clamp-final-'+context.name);await destroy(page,id);
  }else{
   // Default labels use the library's fixed semantic row; editable projections provide a separate fixed budget.
   await ready(page,context);const id=await create(page,'RuntimeReassessmentVirtual',{kind,rows,height:360,itemHeight:null,overscan:2,state,editors:false}),node=host(page,id),viewport=node.locator('cdk-virtual-scroll-viewport');
   await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'list-default-initial-'+context.name);await expect(node.getByRole('textbox')).toHaveCount(0);await expectFocus(viewport,'list-default-viewport-initial-'+context.name);
   await environment(page,nextContext(context));await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'list-default-environment-'+context.name);await expectFocus(viewport,'list-default-viewport-environment-'+context.name);
   const labels=await node.locator('.ui-virtual-row>span').evaluateAll(nodes=>nodes.map(el=>{const s=getComputedStyle(el);return {text:el.textContent,ellipsis:s.textOverflow,overflow:s.overflowX,nowrap:s.whiteSpace};}));expect(labels.length).toBeGreaterThan(0);for(const label of labels){expect(label.ellipsis).toBe('ellipsis');expect(label.overflow).toBe('hidden');expect(label.nowrap).toBe('nowrap');}await record('list-default-labels-'+context.name,labels);
   await node.evaluate(el=>(el as HTMLElement).hidden=true);await update(page,id,{rows:rows.slice(0,999),overscan:4});await node.evaluate(el=>(el as HTMLElement).hidden=false);await atEnd(page,viewport);await verifyGeometry(page,id,kind,999,'list-default-reveal-'+context.name);await expectFocus(viewport,'list-default-viewport-reveal-'+context.name);
   await update(page,id,{rows,height:440,itemHeight:220,overscan:1,editors:true});await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'list-explicit-editor-initial-'+context.name);const last=node.getByRole('textbox',{name:'再検証入力 999',exact:true});await nativeFocus(page,last);await last.fill('key999の未保存下書き');await expectFocus(last,'list-explicit-editor-initial-'+context.name);
   await environment(page,context);await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'list-explicit-editor-environment-'+context.name);await expect(last).toHaveValue('key999の未保存下書き');await nativeFocus(page,last);await expectFocus(last,'list-explicit-editor-environment-'+context.name);
   await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(node).toBeHidden();await update(page,id,{rows:rows.slice(0,999),overscan:3});await node.evaluate(el=>(el as HTMLElement).hidden=false);await atEnd(page,viewport);await verifyGeometry(page,id,kind,999,'list-explicit-editor-reveal-'+context.name);await expect(node.getByRole('textbox',{name:'再検証入力 998',exact:true})).toHaveValue('元の入力 998');
   await update(page,id,{rows,overscan:1});await atEnd(page,viewport);await verifyGeometry(page,id,kind,1000,'list-explicit-editor-recycled-'+context.name);await expect(last).toHaveValue('key999の未保存下書き');await nativeFocus(page,last);await expectFocus(last,'list-explicit-editor-recycled-'+context.name);await destroy(page,id);
  }
 });
 test(`reassessment virtual listbox ${context.name}: unfiltered terminal AX ownership label clips environment and hidden reveal`,async({page})=>{
  await ready(page,context);const options=rows.map(row=>({value:String(row.id),label:row.name,group:row.id<500?'前半の候補':'後半の候補'})),id=await create(page,'Listbox',{options,controlId:'reassessment-listbox',label:'再検証する1000候補',virtual:true,height:360,itemHeight:null,overscan:2}),node=host(page,id),viewport=node.getByRole('listbox');
  await atEnd(page,viewport);await viewport.press('Space');await verifyGeometry(page,id,'listbox',1000,'listbox-initial-'+context.name);await verifyListbox(page,node,'listbox-initial-'+context.name,options[999]!.label);
  await environment(page,nextContext(context));await atEnd(page,viewport);await verifyGeometry(page,id,'listbox',1000,'listbox-environment-'+context.name);await verifyListbox(page,node,'listbox-environment-'+context.name,options[999]!.label);
  await node.evaluate(el=>(el as HTMLElement).hidden=true);await expect(node).toBeHidden();const changed=options.map(option=>({...option,label:option.label+' 更新'}));await update(page,id,{options:changed,height:440,itemHeight:null,overscan:4});await node.evaluate(el=>(el as HTMLElement).hidden=false);await atEnd(page,viewport);await verifyGeometry(page,id,'listbox',1000,'listbox-reveal-'+context.name);await verifyListbox(page,node,'listbox-reveal-'+context.name,changed[999]!.label);
  await update(page,id,{height:440,itemHeight:220,overscan:1});await atEnd(page,viewport);await verifyGeometry(page,id,'listbox',1000,'listbox-explicit-'+context.name);await verifyListbox(page,node,'listbox-explicit-'+context.name,changed[999]!.label);await destroy(page,id);
 });
}

// Exact default-height projection that exposed the native Tab outline regression.
test('reassessment virtual default projection D regression: environment update preserves the complete native Tab outline',async({page})=>{
 const context=contexts[3];await ready(page,context);const id=await create(page,'RuntimeReassessmentVirtual',{kind:'list',rows,height:360,itemHeight:null,overscan:2,state,editors:true}),node=host(page,id),viewport=node.locator('cdk-virtual-scroll-viewport'),editor=node.getByRole('textbox',{name:'再検証入力 999',exact:true});
 await atEnd(page,viewport);await verifyGeometry(page,id,'list',1000,'original-default-D-initial');await nativeFocus(page,editor);await editor.fill('元の不具合の下書き');await expectFocus(editor,'original-default-D-initial-ring');
 await environment(page,nextContext(context));await atEnd(page,viewport);await verifyGeometry(page,id,'list',1000,'original-default-D-environment');await expect(editor).toHaveValue('元の不具合の下書き');await nativeFocus(page,editor);await expectFocus(editor,'original-default-D-environment-ring');await destroy(page,id);
});
