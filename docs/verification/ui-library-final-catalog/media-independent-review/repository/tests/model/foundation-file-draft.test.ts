import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileDraftProblem,nextFileDraft} from '../../.ui/generated/angular/file-draft-model';
import {selectFiles} from '../../.ui/generated/angular/media-model';
const policy={accept:'.txt',maxBytes:4,maxFiles:2,multiple:true};
test('file draft validates original restored shape and per-file policy without coercing the app value',()=>{
 const original=42;assert.match(fileDraftProblem(original,policy)!,/File/);assert.equal(original,42);assert.equal(fileDraftProblem(null,policy),null);assert.equal(fileDraftProblem([],policy),null);assert.equal(fileDraftProblem([new File(['ok'],'a.txt')],policy),null);
 assert.ok(fileDraftProblem([new File(['12345'],'large.txt')],policy));assert.ok(fileDraftProblem([new File(['ok'],'a.pdf')],policy));assert.ok(fileDraftProblem(Array.from({length:3},(_,i)=>new File(['x'],i+'.txt')),policy));
});
test('mixed intake retains the previous complete form batch while exposing individual upload intents separately',()=>{
 const previous=Object.freeze([new File(['old'],'old.txt')]);const result=selectFiles([new File(['ok'],'new.txt'),new File(['12345'],'bad.txt')],policy,0);
 assert.equal(result.files.length,1);assert.equal(result.rejected.length,1);assert.equal(nextFileDraft(previous,result),previous);assert.equal(result.files[0]!.name,'new.txt');
});
test('successful intake replaces the form batch atomically and keeps the files unmodified',()=>{
 const file=new File(['ok'],'new.txt'),result=selectFiles([file],policy,0),next=nextFileDraft([new File(['old'],'old.txt')],result) as readonly File[];
 assert.deepEqual(next,[file]);assert.equal(next[0],file);assert.ok(Object.isFrozen(next));assert.equal(nextFileDraft(next,{files:[],rejected:[]}) instanceof Array,true);
});
