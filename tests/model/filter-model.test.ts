import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneFilter, compileFilter, dateFilterValue, decimalFilterValue, editFilter, emptyFilter, filterProblems, filterStructureError, removeFilter, type FilterField, type FilterGroup } from '../../templates/angular/filter-model.ts';
const fields: readonly FilterField[] = [{ id: 'title', label: '題名', type: 'text' }, { id: 'amount', label: '金額', type: 'number' }, { id: 'done', label: '完了', type: 'boolean' }, { id: 'day', label: '日', type: 'date' }, { id: 'status', label: '状態', type: 'choice', options: [{ value: 'a', label: '受付' }, { value: '', label: '空欄' }] }];
const root = (): FilterGroup => ({ type: 'group', id: 'root', match: 'and', children: [{ type: 'rule', id: 'money', field: 'amount', operator: 'gte', value: '0' }, { type: 'group', id: 'nested', match: 'or', children: [{ type: 'rule', id: 'state', field: 'done', operator: 'eq', value: false }, { type: 'rule', id: 'word', field: 'title', operator: 'contains', value: '申請' }] }] });
test('nested AND/OR evaluates actual zero, false, missing and independent row properties', () => {
 const matches = compileFilter(root(), fields); assert.equal(matches({ amount: 0, done: false }), true); assert.equal(matches({ amount: 0, done: true, title: '申請の確認' }), true); assert.equal(matches({ amount: -1, done: false }), false); assert.equal(matches({ amount: 0, done: true }), false); assert.equal(matches({ amount: '0', done: false }), false);
});
test('decimal drafts distinguish empty, false, radix, infinity and valid exponent', () => {
 for (const value of ['', ' ', false, '0x10', 'Infinity', NaN, '1,,2']) assert.equal(decimalFilterValue(value), null); assert.equal(decimalFilterValue('0'), 0); assert.equal(decimalFilterValue(' -1.5e2 '), -150);
});
test('calendar date operands reject rollover and use explicit UTC days', () => {
 assert.equal(dateFilterValue('2026-02-29'), null); assert.notEqual(dateFilterValue('2024-02-29'), null); assert.equal(dateFilterValue('2026-02-30'), null); assert.equal(dateFilterValue(new Date('2026-03-01T23:59:00Z')), dateFilterValue('2026-03-01')); assert.equal(dateFilterValue('0001-01-01'), new Date('0001-01-01T00:00:00Z').valueOf());
});
test('missing comparisons do not accidentally match zero, false or empty strings', () => {
 const node = emptyFilter(); node.children = [{ type: 'rule', id: 'missing', field: 'amount', operator: 'missing' }]; const match = compileFilter(node, fields); assert.equal(match({}), true); assert.equal(match({ amount: NaN }), true); assert.equal(match({ amount: 0 }), false); node.children = [{ type: 'rule', id: 'missing', field: 'title', operator: 'missing' }]; assert.equal(compileFilter(node, fields)({ title: '' }), false);
});
test('invalid operators and held values produce field-specific problems without rewriting drafts', () => {
 const node = emptyFilter(); node.children = [{ type: 'rule', id: 'x', field: 'amount', operator: 'contains', value: '-' }]; const original = JSON.stringify(node); assert.equal(filterProblems(node, fields)[0].nodeId, 'x'); assert.throws(() => compileFilter(node, fields)); assert.equal(JSON.stringify(node), original); node.children = [{ type: 'rule', id: 'x', field: 'day', operator: 'after', value: '2026-02-30' }]; assert.match(filterProblems(node, fields)[0].message, /日付/);
});
test('duplicate IDs, aliased groups, cycles and invalid field definitions are explicit errors', () => {
 const node = root(); node.children = [...node.children, node.children[0]]; assert.ok(filterStructureError(node)); const cycle = emptyFilter(); cycle.children = [cycle]; assert.ok(filterStructureError(cycle)); assert.ok(filterProblems(root(), [...fields, fields[0]]).length); assert.ok(filterStructureError(null));
});
test('empty AND/OR groups impose no restriction and clear retains stable root identity', () => {
 const node = emptyFilter('original'); assert.equal(compileFilter(node, fields)({}), true); node.match = 'or'; assert.equal(compileFilter(node, fields)({}), true); assert.deepEqual(removeFilter(root(), 'root'), emptyFilter('root'));
});
test('immutable nested edits and removals preserve sibling IDs and the original tree', () => {
 const node = root(), original = JSON.stringify(node); const next = editFilter(node, 'state', leaf => ({ ...leaf, field: 'done' } as any)); assert.equal(JSON.stringify(node), original); assert.equal(next.children[1].id, 'nested'); const removed = removeFilter(next, 'state'); assert.equal((removed.children[1] as FilterGroup).children[0].id, 'word'); assert.deepEqual(cloneFilter(node), node); assert.notEqual(cloneFilter(node).children, node.children);
});
test('compiled filters retain a stable snapshot and never traverse inherited prototype fields', () => {
 const node = emptyFilter(); node.children = [{ type: 'rule', id: 'q', field: 'title', operator: 'eq', value: 'Café' }]; const match = compileFilter(node, fields); (node.children[0] as any).value = 'changed'; assert.equal(match({ title: 'CAFÉ' }), true); assert.equal(match(Object.create({ title: 'Café' })), false);
});

test('an unconfigured child group does not turn a configured OR rule into a match-all filter', () => {
 const node = emptyFilter(); node.match = 'or'; node.children = [{ type: 'rule', id: 'q', field: 'done', operator: 'eq', value: true }, emptyFilter('draft')];
 assert.equal(compileFilter(node, fields)({ done: false }), false); assert.equal(compileFilter(node, fields)({ done: true }), true);
});

 test('malformed field and choice metadata are reported before evaluating rows',()=>{
 const root=emptyFilter();
 for(const fields of [[null],[{id:3,label:'x',type:'text'}],[{id:'x',label:null,type:'text'}],[{id:'x',label:'x',type:'choice',options:{}}],[{id:'x',label:'x',type:'choice',options:[{value:'a',label:null}]}]]){
  assert.ok(filterProblems(root,fields as never).length>0);
  assert.throws(()=>compileFilter(root,fields as never));
 }
});
