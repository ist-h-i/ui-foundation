import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutKeyword, layoutSpace } from '../../templates/angular/layout-model.ts';
test('public spacing accepts only own keys and never returns inherited objects/functions',()=>{
 for(const [value,expected] of Object.entries({none:'0',compact:'var(--ui-space-control-gap)',normal:'var(--ui-space-field)',wide:'var(--ui-space-section)'}))assert.equal(layoutSpace(value as any),expected);
 for(const value of [null,undefined,{},[],0,false,'unknown','__proto__','constructor','toString','valueOf','var(--app-spacing)'])assert.throws(()=>layoutSpace(value as any),/Layout spacing must/);
});
test('structural keyword guards preserve enum contracts across the JS input boundary',()=>{
 const values=['start','center','end'] as const;for(const value of values)assert.equal(layoutKeyword(value,values,'align'),value);
 for(const value of [null,undefined,{},[],0,false,'unknown','__proto__','var(--app-align)',' center','safe center'])assert.throws(()=>layoutKeyword(value,values,'align'),/align must/);
});

test('keyword validation reads candidate values rather than replaceable array search methods',()=>{
 const values=['start','center','end'];values.includes=()=>true;
 assert.equal(layoutKeyword('center',values,'align'),'center');
 assert.throws(()=>layoutKeyword('arbitrary',values,'align'),/align must/);
 assert.throws(()=>layoutKeyword({toString:()=> 'start'},values,'align'),/align must/);
});
