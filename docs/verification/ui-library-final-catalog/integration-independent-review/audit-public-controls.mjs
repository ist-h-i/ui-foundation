import ts from 'typescript';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='repository/templates/angular',out=[];
for(const name of (await readdir(dir)).filter(n=>n.endsWith('.ts')).sort()){
 const text=await readFile(dir+'/'+name,'utf8'),f=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true),classes=[];
 for(const n of f.statements){if(!ts.isClassDeclaration(n)||!n.name)continue;const fields=[];const methods=[];
  for(const m of n.members){if(ts.isPropertyDeclaration(m)&&m.name&&m.initializer){const init=m.initializer.getText(f);if(/^(input|output|model|signal|computed|linkedSignal|viewChild|contentChild)([<(\.])/.test(init))fields.push({name:m.name.getText(f),line:f.getLineAndCharacterOfPosition(m.getStart(f)).line+1,initializer:init,protected:!!m.modifiers?.some(x=>[ts.SyntaxKind.ProtectedKeyword,ts.SyntaxKind.PrivateKeyword].includes(x.kind))});}
   if(ts.isMethodDeclaration(m)&&m.name)methods.push({name:m.name.getText(f),line:f.getLineAndCharacterOfPosition(m.getStart(f)).line+1,protected:!!m.modifiers?.some(x=>[ts.SyntaxKind.ProtectedKeyword,ts.SyntaxKind.PrivateKeyword].includes(x.kind))});
  }classes.push({name:n.name.text,extends:n.heritageClauses?.map(c=>c.getText(f))??[],fields,methods});
 }
 out.push({file:'templates/angular/'+name,sha256:createHash('sha256').update(text).digest('hex'),classes});
}
await writeFile('evidence/public-controls-inventory-candidate.json',JSON.stringify(out,null,2)+'\n');
const picked=new Set(['file-upload.ts','image-media.ts','image-cropper.ts','pdf-viewer.ts','media-player.ts','barcode.ts','chart.ts','map.ts','gantt.ts','kanban.ts','spreadsheet.ts','rich-text-editor.ts','markdown-editor.ts','code-editor.ts','inspection.ts','file-explorer.ts','diagram.ts','chat.ts','editor-control.ts','scheduler-controller.ts','tree.ts','tree-select.ts','cascader.ts','organization-chart.ts']);
for(const x of out)if(picked.has(x.file.split('/').at(-1)))for(const c of x.classes)console.log(x.file+' '+c.name+' extends '+c.extends.join(' ')+'\n '+c.fields.filter(p=>!p.protected&&/^(input|output|model)/.test(p.initializer)).map(p=>p.name+':'+p.line).join(' ')+'\n methods '+c.methods.filter(p=>!p.protected).map(p=>p.name+':'+p.line).join(' '));
