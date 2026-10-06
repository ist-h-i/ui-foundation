import ts from 'typescript';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

// An API inventory, not an application-source policy or accessibility audit.
const directory = 'templates/angular';
const digest = value => createHash('sha256').update(value).digest('hex');
const records = [];
for (const name of (await readdir(directory)).filter(name => name.endsWith('.ts')).sort()) {
  const path = `${directory}/${name}`;
  const text = await readFile(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const declarations = [];
  for (const node of source.statements) {
    if (ts.isExportDeclaration(node)) {
      declarations.push({ kind: 'export', declaration: node.getText(source) });
      continue;
    }
    if (!node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isClassDeclaration(node)) {
      const members = [];
      for (const member of node.members) {
        if (!member.name || member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword)) continue;
        const initializer = ts.isPropertyDeclaration(member) ? member.initializer : undefined;
        const call = initializer && ts.isCallExpression(initializer) ? initializer : undefined;
        const callee = call?.expression.getText(source);
        const kind = /^(input|model)(\.required)?$/.test(callee ?? '') ? 'input' : callee === 'output' ? 'output' : ts.isMethodDeclaration(member) ? 'method' : ts.isGetAccessorDeclaration(member) ? 'getter' : 'property';
        const declaration = member.body ? text.slice(member.getStart(source), member.body.getStart(source)).trim() : member.getText(source);
        members.push({ name: member.name.getText(source), kind, declaration, ...(initializer ? { initializer: initializer.getText(source) } : {}) });
      }
      const decorators = (ts.getDecorators(node) ?? []).map(value => {
        const call = ts.isCallExpression(value.expression) ? value.expression : undefined;
        const options = call?.arguments[0];
        const selector = options && ts.isObjectLiteralExpression(options) ? options.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(source) === 'selector') : undefined;
        return { name: call?.expression.getText(source) ?? value.expression.getText(source), ...(selector ? { selector: selector.initializer.getText(source) } : {}) };
      });
      declarations.push({ name: node.name?.text, kind: 'class', decorators, extends: node.heritageClauses?.map(value => value.getText(source)) ?? [], members });
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
      const names = ts.isVariableStatement(node) ? node.declarationList.declarations.map(value => value.name.getText(source)) : [node.name?.text];
      declarations.push({ names, kind: ts.isInterfaceDeclaration(node) ? 'interface' : ts.isTypeAliasDeclaration(node) ? 'type' : ts.isFunctionDeclaration(node) ? 'function' : 'variable', declaration: node.body ? text.slice(node.getStart(source), node.body.getStart(source)).trim() : node.getText(source) });
    }
  }
  records.push({ path, sha256: digest(text), declarations });
}
await writeFile('docs/ui-library-api.json', JSON.stringify({ schema_version: 1, source: directory, purpose: 'Exact source API inventory; compiler inference, inherited inputs and application correctness require consumer validation.', source_count: records.length, files: records }, null, 2) + '\n');
console.log(`Recorded ${records.length} source files in docs/ui-library-api.json`);
