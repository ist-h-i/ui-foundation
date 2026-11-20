import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const output = 'docs/ui-message-arguments.json';
const sources = ['component-messages', 'diagnostic-messages', 'table-scheduler-messages'];
const directory = 'templates/angular';
const contracts = new Map();

async function readModule(name) {
  const file = `${directory}/${name}.ts`;
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, `Invalid TypeScript in ${file}`);
  return source;
}

function members(module, variable) {
  const declaration = module.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(node => node.name.getText(module) === variable);
  const initializer = declaration?.initializer;
  const value = initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer;
  assert.ok(value && ts.isObjectLiteralExpression(value), `${variable} must be a literal object`);
  return value.properties;
}

function nameOf(node) {
  assert.ok(node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)), 'Expected a literal name');
  return node.name.text;
}

function add(id, schema) {
  assert.match(id, /^uiFoundation\.[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/);
  assert.ok(!contracts.has(id), `Duplicate message ID ${id}`);
  contracts.set(id, schema);
}

for (const source of sources) {
  const module = await readModule(source);
  const variable = source.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  for (const property of members(module, variable)) {
    const id = nameOf(property);
    assert.ok(ts.isPropertyAssignment(property), `${id} requires a literal pattern`);
    const message = JSON.parse(property.initializer.getText(module));
    assert.ok(message.ja.trim() && message.en.trim(), `Missing default text for ${id}`);
    assert.ok(message.one === undefined || (message.one.trim() && message.parameters.count === 'number'), `Invalid singular text for ${id}`);
    const schema = Object.fromEntries(Object.entries(message.parameters).map(([key, type]) => {
      assert.ok(['string', 'number', 'value'].includes(type), `Unknown parameter type for ${id}.${key}`);
      return [key, type === 'value' ? ['string', 'number'] : [type]];
    }));
    const names = Object.keys(schema).sort();
    for (const pattern of [message.ja, message.en, message.one].filter(value => value !== undefined)) {
      const placeholders = [...new Set([...pattern.matchAll(/\{(\w+)\}/g)].map(([, name]) => name))].sort();
      assert.deepEqual(placeholders, names, `Unsupported placeholders in ${id}: ${pattern}`);
    }
    add(id, schema);
  }
}

const runtime = await readModule('stable-messages');
const manual = runtime.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === 'ManualMessageParameters');
assert.ok(manual && ts.isTypeLiteralNode(manual.type));
const manualIds = manual.type.members.map(nameOf).sort();
for (const locale of ['japanese', 'english']) {
  assert.deepEqual(members(runtime, locale).map(nameOf).sort(), manualIds, `Incomplete or duplicate ${locale} message IDs`);
}
for (const member of manual.type.members) {
  let schema = {};
  if (ts.isTypeLiteralNode(member.type)) {
    schema = Object.fromEntries(member.type.members.map(parameter => {
      const types = parameter.type.getText(runtime).split('|').map(type => type.trim());
      assert.ok(types.every(type => ['string', 'number', 'null'].includes(type)), 'Unsupported manual parameter type');
      return [nameOf(parameter), types];
    }));
  } else {
    assert.equal(member.type.getText(runtime), 'undefined');
  }
  add(nameOf(member), schema);
}

const schema = JSON.stringify(Object.fromEntries([...contracts].sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(await readFile(output, 'utf8'), schema, 'Refresh the published message argument schema with node scripts/catalog-message-arguments.mjs');
else await writeFile(output, schema);
