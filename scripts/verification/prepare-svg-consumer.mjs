import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cp,mkdir,readFile,readdir,realpath,symlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function prepareSvgConsumer({root,work,fixtures}){
 // The canonical source check needs the complete configured fixture root and tsconfig.
 const sourceFolders=['src','templates','skills','examples','tests/fixture-app'];
 const manifest=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
 const documentation=manifest.files.filter(path=>path.startsWith('docs/'));
 const sourcePaths=['package.json','package-lock.json','tsconfig.json','LICENSE',...documentation];
 const sourceFiles=[];
 async function sourceInventory(relative){for(const item of await readdir(join(root,relative),{withFileTypes:true})){const path=join(relative,item.name);if(item.isDirectory())await sourceInventory(path);else if(item.isFile()){const bytes=await readFile(join(root,path));sourceFiles.push({path,bytes:bytes.length,sha256:digest(bytes)});}}}
 for(const folder of sourceFolders)await sourceInventory(folder);
 for(const path of sourcePaths){const bytes=await readFile(join(root,path));sourceFiles.push({path,bytes:bytes.length,sha256:digest(bytes)});}
 for(const folder of sourceFolders)await cp(join(root,folder),join(work,folder),{recursive:true});
 for(const path of sourcePaths){await mkdir(resolve(work,path,'..'),{recursive:true});await cp(join(root,path),join(work,path));}
 await cp(fixtures,work,{recursive:true});await symlink(await realpath(join(root,'node_modules')),join(work,'node_modules'),'dir');
 for(const file of sourceFiles)assert.equal(digest(await readFile(join(work,file.path))),file.sha256,'Exact raw copy '+file.path);
 const dependencies=manifest.devDependencies;
 const installed=[];for(const [name,expected] of Object.entries(dependencies)){const actual=JSON.parse(await readFile(join(work,'node_modules',name,'package.json'),'utf8')).version;assert.equal(actual,expected,name+' exact dependency');installed.push({name,expected,actual});}
 return {sourceFiles,installed};
}
