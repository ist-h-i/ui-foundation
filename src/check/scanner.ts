import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';
import scssParser from 'postcss-scss';
import { ASTWithSource, Binary, Call, Conditional, CssSelector, DomElementSchemaRegistry, ImplicitReceiver, Interpolation, LiteralArray, LiteralMap, LiteralPrimitive, PrefixNot, PropertyRead, SelectorMatcher, ThisReceiver, parseTemplate } from '@angular/compiler';
import { checkCSS, checkClasses, checkStyle, collectLocalClasses, customPropertyResolver } from './styles.ts';
import { createUtilityResolver } from './tailwind.ts';
import { proveClassDomain } from './class-domain.ts';
import { boundedSearch } from './bounded-search.ts';
import { fingerprint, isExceptableRule, publicAngularEntries, readBaseline, templateOpeningContext, typescriptBaselineContext, withBaselineContext, withBaselineSubject, workspaceSourceRoots } from './application.ts';
import type { AngularDeclaration, CheckSourcesOptions, SourceDiagnostic, SourceLocation, SourceReport, StyleContext, ScopedCustomProperty, CustomPropertyOrigin, CustomPropertyResolver } from './types.ts';

const forbidden = new Set(['node_modules', '.git', '.agents', 'dist', 'build', 'coverage', 'artifacts']);
const extensions = new Set(['.ts', '.html', '.css', '.scss']);
const unknown = Symbol('unknown');
type Value = string | number | boolean | null | undefined | typeof unknown | Value[] | { [key: string]: Value };
interface Evaluated { values: Value[]; dynamic: boolean; fragments?: boolean; completeValues?: Value[]; classDomain?: ts.ConciseBody }
interface Declaration extends AngularDeclaration { node?: ts.ClassDeclaration; external?: { module: string; export: string }; approved: boolean }
const within = (root: string, candidate: string) => candidate === root || (!path.relative(root, candidate).startsWith('..' + path.sep) && path.relative(root, candidate) !== '..' && !path.isAbsolute(path.relative(root, candidate)));
const relative = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/');
function diagnostic(loc: SourceLocation, rule: string, severity: 'error' | 'warning', message: string, suggestion: string, source?: string): SourceDiagnostic {
  const prefix = loc.text.slice(0, Math.max(0, loc.offset));
  const line = prefix.split('\n').length;
  const column = prefix.length - prefix.lastIndexOf('\n');
  return { file: loc.file, line, column, rule, severity, message, suggestion, source: source ?? loc.text.slice(loc.offset).split('\n')[0] ?? '' };
}
const alternatives = new WeakSet<Value[]>();
const alternativeEvaluations = new WeakMap<Value[], Evaluated>();
const arrayEvaluations = new WeakMap<Value[], Evaluated>();
function memberValue(result: Evaluated): Value {
  if (!result.dynamic && result.values.length === 1) return result.values[0]!;
  const choices: Value[] = result.dynamic ? [...result.values, unknown] : result.values;
  if (!choices.length) return unknown; alternatives.add(choices); alternativeEvaluations.set(choices, result); return choices;
}
function evaluatedMember(value: Value): Evaluated {
  if (value === unknown) return { values: [], dynamic: true };
  return Array.isArray(value) && alternatives.has(value) ? alternativeEvaluations.get(value) ?? { values: expanded(value).filter(value=>value!==unknown), dynamic: value.includes(unknown) } : { values: [value], dynamic: false };
}
function possiblyTruthy(value: Value): boolean {
  if (value === unknown) return true;
  if (Array.isArray(value) && alternatives.has(value)) return value.some(possiblyTruthy);
  return !!value;
}
const combine = (items: Evaluated[]): Evaluated => ({ values: items.flatMap(i => i.values), dynamic: items.some(i => i.dynamic), fragments: items.some(i => i.fragments), completeValues: items.flatMap(wholeValues) });
function expanded(values: Value[]): Value[] {
  return values.flatMap(value => Array.isArray(value) && alternatives.has(value) ? expanded(value) : [value]);
}
/** Complete alternatives remain distinct from speculative string fragments. */
function wholeValues(result: Evaluated): Value[] { return expanded(result.fragments ? result.completeValues ?? [] : result.values); }
function logical(left: Evaluated, right: () => Evaluated, operation: '&&' | '||' | '??'): Evaluated {
  const values = expanded(left.values).filter(value => value !== unknown);
  const useRight = (value: Value) => operation === '&&' ? !!value : operation === '||' ? !value : value === null || value === undefined;
  const retained = values.filter(value => !useRight(value));
  const reachable = left.dynamic || values.some(useRight);
  const result = combine([{ ...left, values: retained, completeValues: wholeValues(left).filter(value => !useRight(value)) }, ...(reachable ? [right()] : [])]);
  return { ...result, dynamic: left.dynamic || result.dynamic };
}
function conditional(condition: Evaluated, yes: () => Evaluated, no: () => Evaluated): Evaluated {
  const values = expanded(condition.values).filter(value => value !== unknown);
  const result = combine([...(condition.dynamic || values.some(value => !!value) ? [yes()] : []), ...(condition.dynamic || values.some(value => !value) ? [no()] : [])]);
  return result;
}
function primitive(value: Value): value is string | number | boolean | null | undefined { return value === null || value === undefined || ['string','number','boolean'].includes(typeof value); }
function addition(left: Evaluated, right: Evaluated): Evaluated {
  const values: Value[] = []; let unsupported = false;
  for (const a of expanded(left.values)) for (const b of expanded(right.values)) {
    if (!primitive(a) || !primitive(b)) { unsupported = true; continue; }
    const value = typeof a === 'string' || typeof b === 'string' ? String(a)+String(b) : Number(a)+Number(b);
    if (typeof value === 'number' && !Number.isFinite(value)) unsupported = true; else values.push(value);
  }
  const dynamic = left.dynamic || right.dynamic || unsupported || !values.length || values.length > 128;
  const completeValues: Value[] = [];
  for (const a of wholeValues(left)) for (const b of wholeValues(right)) if (primitive(a) && primitive(b)) {
    const value = typeof a === 'string' || typeof b === 'string' ? String(a)+String(b) : Number(a)+Number(b);
    if (typeof value !== 'number' || Number.isFinite(value)) completeValues.push(value);
  }
  if (dynamic) values.push(...left.values,...right.values);
  return {values:values.slice(0,128),dynamic,fragments:dynamic,completeValues:completeValues.slice(0,128)};
}
function assignmentExpression(node: ts.Node): node is ts.BinaryExpression {
  return ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
}
function updateExpression(node: ts.Node): node is ts.PrefixUnaryExpression | ts.PostfixUnaryExpression {
  return (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken);
}
function propertyName(node: ts.PropertyName | undefined): string | undefined {
  if (!node) return;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  return;
}
/** Resolve member names from literal/const string syntax only; no code execution. */
function constantString(expression: ts.Expression, checker?: ts.TypeChecker, seen = new Set<ts.Node>()): string | undefined {
  if (seen.has(expression)) return; seen = new Set(seen).add(expression);
  if (ts.isStringLiteralLike(expression)||ts.isNumericLiteral(expression)) return expression.text;
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isNonNullExpression(expression) || ts.isSatisfiesExpression(expression)) return constantString(expression.expression,checker,seen);
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) { const left=constantString(expression.left,checker,seen), right=constantString(expression.right,checker,seen); return left!==undefined&&right!==undefined?left+right:undefined; }
  let symbol=checker?.getSymbolAtLocation(expression); if(symbol&&symbol.flags&ts.SymbolFlags.Alias)symbol=checker?.getAliasedSymbol(symbol);
  const declaration=symbol?.valueDeclaration;
  return declaration&&ts.isVariableDeclaration(declaration)&&ts.isVariableDeclarationList(declaration.parent)&&declaration.parent.flags&ts.NodeFlags.Const&&declaration.initializer?constantString(declaration.initializer,checker,seen):undefined;
}
function staticMember(expression: ts.Expression, checker?: ts.TypeChecker): {receiver:ts.Expression;name:string|undefined}|undefined {
  if(ts.isPropertyAccessExpression(expression))return {receiver:expression.expression,name:expression.name.text};
  if(ts.isElementAccessExpression(expression))return {receiver:expression.expression,name:expression.argumentExpression?constantString(expression.argumentExpression,checker):undefined};
  return;
}
function decorators(node: ts.Node): readonly ts.Decorator[] { return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []; }
function importedIdentity(expression: ts.Expression, file: ts.SourceFile): { module: string; export: string } | undefined {
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const binding = statement.importClause?.namedBindings;
    if (binding && ts.isNamedImports(binding) && ts.isIdentifier(expression)) {
      const entry = binding.elements.find(e => e.name.text === expression.text);
      if (entry) return { module: statement.moduleSpecifier.text, export: entry.propertyName?.text ?? entry.name.text };
    }
    if (binding && ts.isNamespaceImport(binding) && ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) && binding.name.text === expression.expression.text) {
      return { module: statement.moduleSpecifier.text, export: expression.name.text };
    }
  }
  return;
}
function coreExport(expression: ts.Expression, file: ts.SourceFile, checker?: ts.TypeChecker): string | undefined {
  const identity = importedIdentity(expression, file);
  let name = identity?.module === '@angular/core' ? identity.export : undefined;
  if (name && checker) {
    const binding = ts.isPropertyAccessExpression(expression) ? expression.expression : expression;
    const symbol = checker.getSymbolAtLocation(binding);
    if (!symbol?.declarations?.some(declaration => ts.isImportSpecifier(declaration) || ts.isNamespaceImport(declaration) || ts.isImportClause(declaration))) name = undefined;
  }
  if (!name && checker) {
    let symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
    const seen = new Set<ts.Symbol>();
    while (symbol && !seen.has(symbol) && seen.size < 32) {
      seen.add(symbol);
      if (symbol.declarations?.some(d => d.getSourceFile().fileName.replaceAll('\\', '/').includes('/node_modules/@angular/core/'))) { name = symbol.name; break; }
      // Preserve each explicit import/reexport hop even when the consumer has
      // no Angular declarations installed. Resolving straight to the ultimate
      // symbol loses these named hops when that final module is unavailable.
      for (const declaration of symbol.declarations ?? []) {
        const parent = ts.isImportSpecifier(declaration) ? declaration.parent.parent.parent : ts.isExportSpecifier(declaration) ? declaration.parent.parent : undefined;
        if (parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier && ts.isStringLiteral(parent.moduleSpecifier) && parent.moduleSpecifier.text === '@angular/core'
          && (ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration))) name = declaration.propertyName?.text ?? declaration.name.text;
      }
      if (name || !(symbol.flags & ts.SymbolFlags.Alias)) break;
      symbol = checker.getImmediateAliasedSymbol(symbol);
    }
  }
  return name;
}
function decoratorKind(expression: ts.Expression, file: ts.SourceFile, checker?: ts.TypeChecker): 'component' | 'directive' | undefined {
  const name = coreExport(expression, file, checker);
  if (name === 'Component') return 'component';
  if (name === 'Directive') return 'directive';
  return;
}
const classCache = new WeakMap<ts.SourceFile, ts.ClassDeclaration[]>();
const angularKinds = new Map<Function, string>([
  [ASTWithSource, 'ASTWithSource'], [LiteralPrimitive, 'LiteralPrimitive'], [LiteralArray, 'LiteralArray'],
  [LiteralMap, 'LiteralMap'], [Conditional, 'Conditional'], [Binary, 'Binary'], [PropertyRead, 'PropertyRead'], [Call, 'Call'],
  [Interpolation, 'Interpolation'], [PrefixNot, 'PrefixNot'],
]);
function classDeclarations(source: ts.SourceFile): ts.ClassDeclaration[] {
  let result = classCache.get(source); if (result) return result;
  result = [];
  function visit(node: ts.Node) { if (ts.isClassDeclaration(node)) result!.push(node); ts.forEachChild(node, visit); }
  visit(source); classCache.set(source, result); return result;
}
function metadata(node: ts.ClassDeclaration, checker?: ts.TypeChecker): { kind: 'component' | 'directive'; expression: ts.Expression } | undefined {
  for (const decorator of decorators(node)) {
    if (!ts.isCallExpression(decorator.expression)) continue;
    const kind = decoratorKind(decorator.expression.expression, node.getSourceFile(), checker);
    if (kind && decorator.expression.arguments[0]) return { kind, expression: decorator.expression.arguments[0] };
  }
  return;
}
/** Resolves finite constants only: it never invokes user code, getters, or constructors. */
class Evaluator {
  constructor(readonly checker?: ts.TypeChecker, readonly libraries: string[] = [], private readonly bindings = new Map<ts.Declaration, Evaluated>(), private readonly ranges = new Map<ts.Declaration, {integer?: boolean; min?: number; max?: number; string?: boolean}>(), private readonly sources: readonly ts.SourceFile[] = [], private readonly builtinIntegrity = new Map<string, boolean>()) {}
  private referenceCache = new WeakMap<ts.Declaration, ts.Expression[]>();
  private referenceState = { indexed: new Set<ts.SourceFile>(), bySymbol: new Map<ts.Symbol, ts.Expression[]>() };
  private computedOwnerEscapeCache = new WeakMap<ts.ClassDeclaration, boolean>();
  private ownerExposure = { indexed: false, owners: new Set<ts.ClassDeclaration>() };
  private methodReplacementState = { indexed: false, writes: [] as {receiver: ts.Expression; name: string | undefined; value: ts.Expression}[], byMethod: new WeakMap<ts.MethodDeclaration, (ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration)[]>() };
  symbol(expression: ts.Expression): ts.Symbol | undefined {
    if (ts.isIdentifier(expression) && ts.isShorthandPropertyAssignment(expression.parent) && expression.parent.name === expression) {
      return this.checker?.getShorthandAssignmentValueSymbol(expression.parent);
    }
    return this.checker?.getSymbolAtLocation(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
  }
  computedValue(expression: ts.Expression | undefined, seen = new Set<ts.Node>()): Evaluated {
    if (!expression || !ts.isCallExpression(expression) || coreExport(expression.expression, expression.getSourceFile(), this.checker) !== 'computed') return { values: [], dynamic: true };
    const callback = expression.arguments[0];
    if (!callback || !ts.isArrowFunction(callback) || callback.parameters.length) return { values: [], dynamic: true };
    return ts.isBlock(callback.body) ? this.blockValue(callback.body, seen) : this.evaluate(callback.body, seen);
  }
  private fork(): Evaluator {
    const evaluator = new Evaluator(this.checker, this.libraries, new Map(this.bindings), new Map([...this.ranges].map(([key,value]) => [key, {...value}])), this.sources, this.builtinIntegrity);
    evaluator.referenceCache = this.referenceCache; evaluator.referenceState = this.referenceState; evaluator.computedOwnerEscapeCache = this.computedOwnerEscapeCache;
    evaluator.ownerExposure = this.ownerExposure;
    evaluator.methodReplacementState = this.methodReplacementState;
    return evaluator;
  }
  private unwrapped(node: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
    return node;
  }
  private standard(expression: ts.Expression, name: string): boolean {
    const symbol = this.symbol(expression);
    return symbol?.name === name && !!symbol.declarations?.some(declaration => this.libraries.some(directory => within(directory, declaration.getSourceFile().fileName)));
  }
  private ownInstanceFieldWrite(expression:ts.Expression):boolean {
    if(!ts.isPropertyAccessExpression(expression)||expression.expression.kind!==ts.SyntaxKind.ThisKeyword)return false;
    let node:ts.Node=expression;
    while(node.parent&&!ts.isClassDeclaration(node.parent)) {node=node.parent;if(ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node))return false;}
    const owner=node.parent;
    return !!owner&&ts.isClassDeclaration(owner)&&!owner.heritageClauses?.length&&owner.members.some(member=>ts.isPropertyDeclaration(member)&&propertyName(member.name)===expression.name.text);
  }
  private unknownIntrinsicMember(node:ts.Node, kind:'Array'|'RegExp'):boolean {
    if(!ts.isElementAccessExpression(node)||constantString(node.argumentExpression!,this.checker)!==undefined)return false;
    let receiver=this.unwrapped(node.expression),budget=8;
    while(ts.isIdentifier(receiver)&&budget-->0){const declaration=this.symbol(receiver)?.valueDeclaration;if(!declaration||!ts.isVariableDeclaration(declaration)||!declaration.initializer)break;receiver=this.unwrapped(declaration.initializer);}
    const type=this.checker?.getTypeAtLocation(receiver);
    const possible=kind==='Array'?ts.isArrayLiteralExpression(receiver)||!!type&&!!this.checker?.isArrayType(type):ts.isRegularExpressionLiteral(receiver)||type?.getSymbol()?.name==='RegExp';
    if(possible)return true;
    // An unavailable receiver passed to a mutating reflection API cannot close
    // intrinsic integrity. No application factory is executed to guess its kind.
    let use:ts.Expression=node;
    while((ts.isParenthesizedExpression(use.parent)||ts.isAsExpression(use.parent)||ts.isNonNullExpression(use.parent))&&use.parent.expression===use)use=use.parent;
    return !!type&&!!(type.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown))&&ts.isCallExpression(use.parent)&&use.parent.arguments.includes(use)&&!!staticMember(use.parent.expression,this.checker)&&['assign','defineProperty','defineProperties','setPrototypeOf'].includes(staticMember(use.parent.expression,this.checker)!.name??'');
  }
  private builtinIntact(name: string): boolean {
    const cached = this.builtinIntegrity.get(name); if (cached !== undefined) return cached;
    let intact = true;
    const visit = (node: ts.Node) => {
      if (!intact || ts.isTypeNode(node)) return;
      if(ts.isIdentifier(node)&&['Function','eval'].includes(node.text)&&this.standard(node,node.text))intact=false;
      const dynamicAccess=staticMember(node as ts.Expression,this.checker);if(dynamicAccess?.name&&['constructor','eval','Function'].includes(dynamicAccess.name))intact=false;
      if(ts.isCallExpression(node)){const method=staticMember(node.expression,this.checker);if(method?.name&&['assign','defineProperty','defineProperties','setPrototypeOf'].includes(method.name)&&node.arguments[0]){let target=node.arguments[0]!,budget=8;while(ts.isIdentifier(target)&&budget-->0){const declaration=this.symbol(target)?.valueDeclaration;if(!declaration||!ts.isVariableDeclaration(declaration)||!declaration.initializer)break;target=this.unwrapped(declaration.initializer);}if(this.unknownIntrinsicMember(target,name==='Array'?'Array':'RegExp'))intact=false;}}
      if (name === 'Array') {
        const access=staticMember(node as ts.Expression,this.checker), property=access?.name;
        if (property && ['includes','map','filter','some','every','find'].includes(property) && this.written(this.accessUse(node as ts.Expression))&&!this.ownInstanceFieldWrite(node as ts.Expression)) intact=false;
        if(this.unknownIntrinsicMember(node,'Array'))intact=false;
        if (property && ['constructor','__proto__','prototype'].includes(property) && !(property==='prototype'&&access&&this.standard(access.receiver,'Object'))) intact=false;
        if (access && this.standard(access.receiver,'Object') && (property===undefined || ['getPrototypeOf','setPrototypeOf'].includes(property))) intact=false;
        if(property&&['getPrototypeOf','setPrototypeOf'].includes(property))intact=false;
        if(ts.isIdentifier(node)&&node.text==='Object'&&this.standard(node,'Object')&&this.accessUse(node)===node)intact=false;
        if(ts.isBindingElement(node)){const key=node.propertyName?(ts.isComputedPropertyName(node.propertyName)?constantString(node.propertyName.expression,this.checker):propertyName(node.propertyName)):propertyName(node.name as ts.PropertyName);if(key===undefined?!!node.propertyName&&ts.isComputedPropertyName(node.propertyName):['constructor','prototype','__proto__'].includes(key))intact=false;}
        if (ts.isIdentifier(node) && node.text==='Reflect' && this.standard(node,'Reflect')) intact=false;
        if (ts.isCallExpression(node)) {
          const method=staticMember(node.expression,this.checker);
          if(method?.name==='defineProperty'&&this.standard(method.receiver,'Object')&&node.arguments[1]) { const key=constantString(node.arguments[1],this.checker);if(key===undefined||['includes','map','filter','some','every','find'].includes(key))intact=false; }
        }
      }
      if (ts.isIdentifier(node) && node.text === name && this.standard(node, name)) {
        const use = this.accessUse(node);
        const scalarRead = !!this.checker && !!(this.checker.getTypeAtLocation(use).flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.BooleanLike));
        const directCall = ts.isCallExpression(use.parent) && use.parent.expression === use || ts.isNewExpression(use.parent) && use.parent.expression === use;
        // A static function-valued property is a copy, not an escape of its
        // containing constructor. Explicit replacement is still a write above.
        const functionCopy = ts.isPropertyAccessExpression(use) && use.expression === node && !!this.checker?.getTypeAtLocation(use).getCallSignatures().length;
        const parent = use.parent;
        const nativeArrayCallback = name === 'Number' && use === node && ts.isCallExpression(parent) && parent.arguments.includes(use)
          && ts.isPropertyAccessExpression(parent.expression) && ['map','filter','some','every','find'].includes(parent.expression.name.text)
          && !!this.checker && this.checker.isArrayType(this.checker.getTypeAtLocation(parent.expression.expression))
          && !!this.symbol(parent.expression)?.declarations?.some(declaration => this.libraries.some(directory => within(directory, declaration.getSourceFile().fileName)))
          && this.builtinIntact('Array');
        if (this.written(use) || !scalarRead && !directCall && !functionCopy && !nativeArrayCallback) intact = false;
      }
      ts.forEachChild(node, visit);
    };
    for (const source of this.sources) visit(source);
    this.builtinIntegrity.set(name, intact); return intact;
  }
  nativeIntact(name:string):boolean { return this.builtinIntact(name); }
  private hasOwnCall(node: ts.Expression): node is ts.CallExpression {
    return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'hasOwn'
      && this.standard(node.expression.expression, 'Object') && this.builtinIntact('Object') && node.arguments.length === 2;
  }
  /** Only closed literal membership guards refine runtime inputs; types and input defaults never do. */
  private refine(condition: ts.Expression, truth: boolean, seen: Set<ts.Node>): void {
    condition = this.unwrapped(condition);
    if (ts.isPrefixUnaryExpression(condition) && condition.operator === ts.SyntaxKind.ExclamationToken) { this.refine(condition.operand, !truth, seen); return; }
    if (ts.isBinaryExpression(condition) && ((condition.operatorToken.kind === ts.SyntaxKind.BarBarToken && !truth) || (condition.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth))) {
      this.refine(condition.left, truth, seen); this.refine(condition.right, truth, seen); return;
    }
    // Object.hasOwn coerces keys. Only a proven primitive string may be
    // refined to string keys; arbitrary objects can have stateful coercions.
    if (ts.isBinaryExpression(condition) && ts.isTypeOfExpression(this.unwrapped(condition.left)) && ts.isStringLiteralLike(condition.right) && condition.right.text === 'string'
      && ([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(condition.operatorToken.kind) && truth
        || [ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(condition.operatorToken.kind) && !truth)) {
      const target = this.unwrapped((this.unwrapped(condition.left) as ts.TypeOfExpression).expression);
      const declaration = ts.isIdentifier(target) ? this.symbol(target)?.valueDeclaration : undefined;
      if (declaration && (ts.isParameter(declaration) || ts.isVariableDeclaration(declaration)) && !this.references(declaration).some(reference => this.written(this.accessUse(reference)))) this.ranges.set(declaration, {...this.ranges.get(declaration),string:true});
    }
    let integerTarget: ts.Expression | undefined, minimum: number | undefined, maximum: number | undefined, integer = false;
    if (truth && ts.isCallExpression(condition) && ts.isPropertyAccessExpression(condition.expression) && condition.expression.name.text === 'isSafeInteger' && this.standard(condition.expression.expression, 'Number') && this.builtinIntact('Number') && condition.arguments.length === 1) { integerTarget = condition.arguments[0]; integer = true; }
    if (ts.isBinaryExpression(condition)) {
      let operation: ts.SyntaxKind = condition.operatorToken.kind;
      const right = this.evaluate(condition.right, seen);
      if (!right.dynamic && right.values.length === 1 && typeof right.values[0] === 'number') {
        const bound = right.values[0]; integerTarget = condition.left;
        if (!truth) operation = ({[ts.SyntaxKind.LessThanToken]:ts.SyntaxKind.GreaterThanEqualsToken,[ts.SyntaxKind.LessThanEqualsToken]:ts.SyntaxKind.GreaterThanToken,[ts.SyntaxKind.GreaterThanToken]:ts.SyntaxKind.LessThanEqualsToken,[ts.SyntaxKind.GreaterThanEqualsToken]:ts.SyntaxKind.LessThanToken} as Partial<Record<ts.SyntaxKind,ts.SyntaxKind>>)[operation] ?? ts.SyntaxKind.Unknown;
        if (operation === ts.SyntaxKind.LessThanToken) maximum = Math.ceil(bound)-1;
        else if (operation === ts.SyntaxKind.LessThanEqualsToken) maximum = Math.floor(bound);
        else if (operation === ts.SyntaxKind.GreaterThanToken) minimum = Math.floor(bound)+1;
        else if (operation === ts.SyntaxKind.GreaterThanEqualsToken) minimum = Math.ceil(bound);
        else integerTarget = undefined;
      }
    }
    if (integerTarget) {
      const target = this.unwrapped(integerTarget), declaration = ts.isIdentifier(target) ? this.symbol(target)?.valueDeclaration : undefined;
      if (declaration && (ts.isParameter(declaration) || ts.isVariableDeclaration(declaration)) && !this.references(declaration).some(reference => this.written(this.accessUse(reference)))) {
        const range = { ...this.ranges.get(declaration) };
        if (integer) range.integer = true;
        if (minimum !== undefined) range.min = Math.max(range.min ?? -Infinity, minimum);
        if (maximum !== undefined) range.max = Math.min(range.max ?? Infinity, maximum);
        this.ranges.set(declaration, range);
        if (range.integer && Number.isSafeInteger(range.min) && Number.isSafeInteger(range.max) && range.max! - range.min! < 128) {
          const domain = Array.from({length:Math.max(0,range.max!-range.min!+1)},(_,index)=>range.min!+index);
          const current = this.bindings.get(declaration);
          this.bindings.set(declaration, { values: current && !current.dynamic ? current.values.filter(value=>domain.includes(value as number)) : domain, dynamic:false });
        }
      }
    }
    if (!truth || !ts.isCallExpression(condition)) return;
    let target: ts.Expression | undefined, domain: Evaluated | undefined;
    if (ts.isPropertyAccessExpression(condition.expression) && condition.expression.name.text === 'includes' && this.builtinIntact('Array') && condition.arguments.length === 1) {
      const array = this.evaluate(condition.expression.expression, seen);
      if (!array.dynamic && array.values.every(value => Array.isArray(value) && !alternatives.has(value) && value.every(entry => typeof entry === 'string' || typeof entry === 'number'))) {
        target = condition.arguments[0]; domain = { values: array.values.flatMap(value => value as Value[]), dynamic: false };
      }
    } else if (this.hasOwnCall(condition)) {
      const object = this.evaluate(condition.arguments[0], seen);
      const key = this.unwrapped(condition.arguments[1]!);
      const declaration = ts.isIdentifier(key) ? this.symbol(key)?.valueDeclaration : undefined;
      const actual = this.evaluate(key, seen);
      const stringKey = declaration && this.ranges.get(declaration)?.string || !actual.dynamic && actual.values.length > 0 && actual.values.every(value => typeof value === 'string');
      if (stringKey && !object.dynamic && object.values.every(value => !!value && typeof value === 'object' && !Array.isArray(value))) {
        target = condition.arguments[1]; domain = { values: object.values.flatMap(value => Object.keys(value as object)), dynamic: false };
      }
    }
    if (target && domain) {
      target = this.unwrapped(target);
      const declaration = ts.isIdentifier(target) ? this.symbol(target)?.valueDeclaration : undefined;
      if (declaration && (ts.isParameter(declaration) || ts.isVariableDeclaration(declaration)) && !this.references(declaration).some(reference => this.written(this.accessUse(reference)))) {
        const current = this.bindings.get(declaration);
        this.bindings.set(declaration, current && !current.dynamic ? { values: current.values.filter(value => domain!.values.includes(value)), dynamic: false } : domain);
      }
    }
  }
  /** Interprets a deliberately small, side-effect-free control-flow subset. It never runs code. */
  private blockValue(body: ts.Block, seen: Set<ts.Node>): Evaluated {
    interface State { evaluator: Evaluator; uncertain: boolean }
    const results: Evaluated[] = [];
    let budget = 256;
    const walk = (statements: readonly ts.Statement[], initial: State[]): State[] => {
      let states = initial;
      for (const statement of statements) {
        const next: State[] = [];
        for (const state of states) {
          if (--budget < 0) { results.push({ values: [], dynamic: true }); continue; }
          const local = state.evaluator;
          const search = boundedSearch(statement, body, this.checker);
          if (search) {
            const collection = local.evaluate(search.collection, seen);
            const arrays = collection.values.filter((value):value is Value[]=>Array.isArray(value)&&!alternatives.has(value));
            const candidates = arrays.flat().filter(primitive);
            const complete = !collection.dynamic && arrays.length===collection.values.length && arrays.length>0
              && arrays.every(value=>value.length<=32&&value.every(primitive));
            const input = local.evaluate(search.input, seen);
            const matched = input.dynamic ? candidates : candidates.filter(candidate=>expanded(input.values).some(value=>candidate===value));
            results.push({values:matched,dynamic:!complete||state.uncertain});
            // The exact loop contains only scalar reads, strict comparison and
            // a return of the candidate. The following throw closes nonmatches.
            next.push({...state,uncertain:state.uncertain||!complete});
            continue;
          }
          if (ts.isReturnStatement(statement)) { const value = statement.expression ? local.evaluate(statement.expression, seen) : { values: [undefined], dynamic: false }; results.push({ ...value, dynamic: value.dynamic || state.uncertain }); }
          else if (ts.isThrowStatement(statement)) { /* No normal return on this path. */ }
          else if (ts.isBlock(statement)) next.push(...walk(statement.statements, [state]));
          else if (ts.isIfStatement(statement)) {
            const condition = local.evaluate(statement.expression, seen);
            const values = expanded(condition.values).filter(value => value !== unknown);
            for (const truth of [true, false]) {
              if (!condition.dynamic && !values.some(value => !!value === truth)) continue;
              const branch = { evaluator: local.fork(), uncertain: state.uncertain };
              branch.evaluator.refine(statement.expression, truth, seen);
              const chosen = truth ? statement.thenStatement : statement.elseStatement;
              next.push(...(chosen ? walk(ts.isBlock(chosen) ? chosen.statements : [chosen], [branch]) : [branch]));
            }
          } else if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const && statement.declarationList.declarations.every(declaration => ts.isIdentifier(declaration.name))) {
            for (const declaration of statement.declarationList.declarations) local.bindings.set(declaration, local.declarationValue(declaration, seen));
            next.push(state);
          } else {
            // Unknown execution may mutate bindings or call escaped closures. Keep
            // known returns nested in unsupported control flow for inspection.
            const inspectReturns = (node: ts.Node) => {
              if (ts.isFunctionLike(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)) return;
              if (ts.isReturnStatement(node) && node.expression) results.push({ ...local.evaluate(node.expression, seen), dynamic: true });
              ts.forEachChild(node, inspectReturns);
            };
            inspectReturns(statement);
            for (const [declaration, value] of local.bindings) local.bindings.set(declaration, { ...value, dynamic: true });
            next.push({ evaluator: local, uncertain: true });
          }
        }
        states = next;
      }
      return states;
    };
    const remaining = walk(body.statements, [{ evaluator: this.fork(), uncertain: false }]);
    if (remaining.length) results.push({ values: [undefined], dynamic: remaining.some(state => state.uncertain) });
    return results.length ? combine(results) : { values: [], dynamic: false };
  }
  private argumentValue(parameter: ts.ParameterDeclaration, value: Evaluated): Evaluated {
    let dynamic = value.dynamic;
    for (const reference of this.references(parameter)) {
      // A direct uncaught throw has no normal result from this invocation.
      // Do not let an error-message-only read turn a fresh finite argument into
      // an escape. Caught throws and nested closures remain conservative.
      let throwOnly = false, node: ts.Node = reference;
      while (node.parent && node.parent !== parameter.parent) {
        node = node.parent;
        if (ts.isTryStatement(node) || ts.isFunctionLike(node)) { throwOnly = false; break; }
        if (ts.isThrowStatement(node)) throwOnly = true;
      }
      if (throwOnly) continue;
      if (this.written(this.accessUse(reference))) dynamic = true;
      if (value.values.some(entry => !!entry && typeof entry === 'object')) {
        const access = reference.parent;
        const scalarArrayRead = ts.isPropertyAccessExpression(access) && access.expression === reference && ['includes','join'].includes(access.name.text)
          && ts.isCallExpression(access.parent) && access.parent.expression === access && this.builtinIntact('Array')
          && value.values.every(entry => Array.isArray(entry) && entry.every(item => item === null || ['string','number','boolean','undefined'].includes(typeof item)));
        if (!scalarArrayRead && this.objectReferenceUnsafe(reference, value)) dynamic = true;
      }
    }
    return { ...value, dynamic };
  }
  private methodReplacementConstructor(expression: ts.Expression, owner: ts.ClassDeclaration, seen = new Set<ts.Node>()): boolean {
    expression = this.unwrapped(expression);
    if (seen.has(expression) || seen.size > 8) return false;
    seen = new Set(seen).add(expression);
    let symbol = this.symbol(expression);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker?.getAliasedSymbol(symbol);
    const root = symbol?.valueDeclaration;
    if (root === owner) return !this.references(owner).some(reference => this.written(this.accessUse(reference)));
    return !!root && ts.isVariableDeclaration(root) && ts.isVariableDeclarationList(root.parent) && !!(root.parent.flags & ts.NodeFlags.Const)
      && !this.references(root).some(reference => this.written(reference))
      && !!root.initializer && this.methodReplacementConstructor(root.initializer, owner, seen);
  }
  /** Attribute possible writes to a declared method, never certify an instance or its lifetime. */
  private methodReplacementReceiver(receiver: ts.Expression, declaration: ts.MethodDeclaration, seen = new Set<ts.Node>()): boolean {
    receiver = this.unwrapped(receiver);
    if (!this.checker || seen.has(receiver) || seen.size > 8) return false;
    seen = new Set(seen).add(receiver);
    if (ts.isIdentifier(receiver)) {
      const root = this.symbol(receiver)?.valueDeclaration;
      // The declared type does not describe a receiver after rebinding. Reject
      // direct binding writes without confusing a member write with rebinding.
      if (root && this.references(root).some(reference => this.written(reference))) return false;
      // Strip assertions before following a const alias: `other as App` is not
      // evidence that a write targets App's method. A typed owner parameter is
      // only a possible mutation source, never a closed runtime identity.
      if (root && ts.isVariableDeclaration(root) && ts.isVariableDeclarationList(root.parent) && root.parent.flags & ts.NodeFlags.Const && root.initializer) return this.methodReplacementReceiver(root.initializer, declaration, seen);
      if (!root || !ts.isParameter(root)) return false;
    } else if (ts.isNewExpression(receiver)) {
      return ts.isClassDeclaration(declaration.parent) && this.methodReplacementConstructor(receiver.expression, declaration.parent);
    } else if (receiver.kind === ts.SyntaxKind.ThisKeyword) {
      let scope: ts.Node | undefined = receiver.parent;
      while (scope && !ts.isClassDeclaration(scope) && !ts.isClassExpression(scope)) {
        if (ts.isFunctionDeclaration(scope) || ts.isFunctionExpression(scope)
          || ts.canHaveModifiers(scope) && ts.getModifiers(scope)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword)) return false;
        scope = scope.parent;
      }
      if (!scope) return false;
    } else return false;
    const name = propertyName(declaration.name), type = this.checker.getTypeAtLocation(receiver);
    if (!name || type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown) || type.getConstructSignatures().length) return false;
    const member = this.checker.getPropertyOfType(type, name);
    return member?.valueDeclaration === declaration;
  }
  /** Follow immutable callable bindings by symbol, never a type assertion or factory result. */
  private methodReplacementCallable(expression: ts.Expression, seen = new Set<ts.Node>()): ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration | undefined {
    expression = this.unwrapped(expression);
    if (seen.has(expression) || seen.size > 8) return;
    seen = new Set(seen).add(expression);
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return expression;
    if (!ts.isIdentifier(expression)) return;
    let symbol = this.symbol(expression);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker?.getAliasedSymbol(symbol);
    const root = symbol?.valueDeclaration;
    if (!root || root.getSourceFile().isDeclarationFile || this.references(root).some(reference => this.written(reference))) return;
    if (ts.isFunctionDeclaration(root)) return root.body ? root : undefined;
    if (ts.isVariableDeclaration(root) && ts.isVariableDeclarationList(root.parent) && root.parent.flags & ts.NodeFlags.Const && root.initializer) {
      const executionScope = (node: ts.Node): ts.Node => {
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isPropertyDeclaration(parent) && !parent.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword)) return parent;
          if (ts.isFunctionLike(parent)) {
            if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && ts.isExternalModule(parent.getSourceFile()) && !parent.asteriskToken
              && !parent.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword)) {
              let use: ts.Expression = parent;
              while ((ts.isParenthesizedExpression(use.parent) || ts.isAsExpression(use.parent) || ts.isTypeAssertionExpression(use.parent) || ts.isNonNullExpression(use.parent) || ts.isSatisfiesExpression(use.parent)) && use.parent.expression === use) use = use.parent;
              const directCall = ts.isCallExpression(use.parent) && use.parent.expression === use;
              // Strict module code prevents legacy caller reflection from
              // exposing a literal synchronous IIFE for later invocation.
              // Named functions and own arguments still keep that lifetime open.
              let capturesArguments = false;
              if (directCall && ts.isFunctionExpression(parent) && !parent.name) {
                const visit = (entry: ts.Node) => { if (ts.isIdentifier(entry) && entry.text === 'arguments') capturesArguments = true; if (!capturesArguments) ts.forEachChild(entry, visit); };
                visit(parent);
              }
              if (directCall && (!ts.isFunctionExpression(parent) || !parent.name && !capturesArguments)) continue;
            }
            return parent;
          }
          if (ts.isSourceFile(parent)) return parent;
        }
        return node.getSourceFile();
      };
      // A definite earlier read in the same execution frame throws in the TDZ.
      // Direct synchronous IIFEs share that frame; deferred/escaping callables
      // can run after initialization. Named declarations above are hoisted.
      if (root.getSourceFile() === expression.getSourceFile() && expression.getStart() < root.getEnd()
        && executionScope(root) === executionScope(expression)) return;
      return this.methodReplacementCallable(root.initializer, seen);
    }
    return;
  }
  private methodReplacements(declaration: ts.MethodDeclaration): (ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration)[] {
    const state = this.methodReplacementState, cached = state.byMethod.get(declaration);
    if (cached) return cached;
    if (!state.indexed) {
      state.indexed = true;
      const visit = (node: ts.Node) => {
        if (ts.isTypeNode(node)) return;
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          const target = staticMember(this.unwrapped(node.left), this.checker);
          if (target) state.writes.push({...target, value: node.right});
        }
        if (ts.isCallExpression(node) && node.arguments.length === 2) {
          const target = staticMember(this.unwrapped(node.expression), this.checker), object = this.unwrapped(node.arguments[1]!);
          if (target?.name === 'assign' && this.standard(this.unwrapped(target.receiver), 'Object') && this.builtinIntact('Object')
            && ts.isObjectLiteralExpression(object) && object.properties.every(property => (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) && propertyName(property.name) !== undefined)) {
            // Only own plain data entries are known here. Spreads, accessors,
            // computed names and later source objects can replace the value.
            const entries = new Map<string, ts.Expression>();
            for (const property of object.properties) {
              if (ts.isPropertyAssignment(property) && propertyName(property.name) !== '__proto__') entries.set(propertyName(property.name)!, property.initializer);
              else if (ts.isShorthandPropertyAssignment(property)) entries.set(property.name.text, property.name);
            }
            for (const [name, value] of entries) state.writes.push({receiver: node.arguments[0]!, name, value});
          }
        }
        ts.forEachChild(node, visit);
      };
      for (const source of this.sources.length ? this.sources : [declaration.getSourceFile()]) visit(source);
    }
    const result: (ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration)[] = [], name = propertyName(declaration.name);
    for (const write of state.writes) {
      if (!name || write.name !== name || !this.methodReplacementReceiver(write.receiver, declaration)) continue;
      const fn = this.methodReplacementCallable(write.value);
      if (!fn?.body || fn.asteriskToken
        || fn.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword)
        || fn.parameters.some(parameter => !ts.isIdentifier(parameter.name) || parameter.dotDotDotToken || parameter.initializer)) continue;
      result.push(fn);
    }
    state.byMethod.set(declaration, result); return result;
  }
  methodValue(declaration: ts.MethodDeclaration, arguments_: Evaluated[], seen = new Set<ts.Node>()): Evaluated {
    if (!declaration.body || seen.has(declaration) || seen.size > 40 || !ts.isClassDeclaration(declaration.parent)
      || !declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ProtectedKeyword || modifier.kind === ts.SyntaxKind.PrivateKeyword)
      || declaration.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword || modifier.kind === ts.SyntaxKind.StaticKeyword) || declaration.asteriskToken
      || declaration.parameters.some(parameter => !ts.isIdentifier(parameter.name) || parameter.dotDotDotToken || parameter.initializer)) return {values:[],dynamic:true};
    const replacements = this.methodReplacements(declaration);
    const open = replacements.length > 0 || this.computedOwnerEscaped(declaration.parent)
      || this.references(declaration).some(reference => this.written(this.accessUse(reference)));
    const local = this.fork();
    for (const [index, parameter] of this.runtimeParameters(declaration).entries()) local.bindings.set(parameter, this.argumentValue(parameter, arguments_[index] ?? {values:[],dynamic:true}));
    const visited = new Set(seen).add(declaration);
    const result = combine([local.blockValue(declaration.body, visited), ...replacements.map(fn => {
      if (!fn.body) return {values: [], dynamic: true};
      const replacement = this.fork();
      for (const [index, parameter] of this.runtimeParameters(fn).entries()) replacement.bindings.set(parameter, this.argumentValue(parameter, arguments_[index] ?? {values:[],dynamic:true}));
      const replacementSeen = new Set(visited).add(fn);
      return ts.isBlock(fn.body) ? replacement.blockValue(fn.body, replacementSeen) : replacement.evaluate(fn.body, replacementSeen);
    })]);
    // The declared implementation remains a possible source of known values.
    // An exposed/replaced method also has an unknown implementation: inspecting
    // its body must never certify that replacement domain or a class guard.
    return open ? { ...result, dynamic: true, classDomain: undefined } : result;
  }
  /** TypeScript's explicit this parameter is erased and consumes no argument. */
  private runtimeParameters(fn: ts.SignatureDeclaration): readonly ts.ParameterDeclaration[] {
    return fn.parameters.filter(parameter => !ts.isIdentifier(parameter.name) || parameter.name.text !== 'this');
  }
  private functionValue(call: ts.CallExpression, seen: Set<ts.Node>): Evaluated | undefined {
    let symbol = this.symbol(call.expression);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker?.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration;
    if (declaration && ts.isMethodDeclaration(declaration)) return this.methodValue(declaration, call.arguments.map(argument => this.evaluate(argument, seen)), seen);
    const fn = declaration && ts.isFunctionDeclaration(declaration) ? declaration
      : declaration && ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent) && declaration.parent.flags & ts.NodeFlags.Const && declaration.initializer && ts.isArrowFunction(declaration.initializer) ? declaration.initializer : undefined;
    if (!fn?.body || fn.getSourceFile().isDeclarationFile || !declaration || seen.has(fn) || seen.size > 40
      || fn.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) || ts.isFunctionDeclaration(fn) && fn.asteriskToken
      || fn.parameters.some(parameter => !ts.isIdentifier(parameter.name) || parameter.dotDotDotToken || parameter.initializer)
      || this.references(declaration).some(reference => this.written(this.accessUse(reference)))) return;
    const local = this.fork();
    for (const [index, parameter] of this.runtimeParameters(fn).entries()) {
      const value = this.evaluate(call.arguments[index], seen);
      local.bindings.set(parameter, this.argumentValue(parameter, value));
    }
    const visited = new Set(seen).add(fn);
    return ts.isBlock(fn.body) ? local.blockValue(fn.body, visited) : local.evaluate(fn.body, visited);
  }
  exported(declaration: ts.Declaration): boolean {
    if (!ts.isVariableDeclaration(declaration) || !ts.isVariableDeclarationList(declaration.parent) || !ts.isVariableStatement(declaration.parent.parent)) return false;
    const statement = declaration.parent.parent, node = statement.parent;
    if (!ts.isSourceFile(node)) return false;
    if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) return true;
    const name = (declaration as ts.NamedDeclaration).name;
    const symbol = name && this.checker?.getSymbolAtLocation(name);
    return !!symbol && node.statements.some(statement => ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause) && statement.exportClause.elements.some(element => this.checker?.getExportSpecifierLocalTargetSymbol(element) === symbol));
  }
  inputOwned(declaration: ts.PropertyDeclaration): boolean {
    if (decorators(declaration).some(decorator => coreExport(ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression, declaration.getSourceFile(), this.checker) === 'Input')) return true;
    if (!ts.isClassDeclaration(declaration.parent)) return false;
    const owner = metadata(declaration.parent, this.checker);
    const inputs = owner && objectMetadata(owner.expression, this)?.get('inputs');
    if (!inputs) return false;
    const value = this.evaluate(inputs), name = propertyName(declaration.name);
    const entries = value.values.flatMap((entry): Value[] => Array.isArray(entry) ? entry : [entry]);
    return value.dynamic || entries.some(entry => typeof entry === 'string' ? entry.split(':')[0]!.trim() === name : !!entry && typeof entry === 'object' && !Array.isArray(entry) ? entry.name === name : true);
  }
  accessUse(reference: ts.Expression): ts.Expression {
    let node = reference;
    while ((ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent)) && node.parent.expression === node
      || (ts.isParenthesizedExpression(node.parent) || ts.isAsExpression(node.parent) || ts.isTypeAssertionExpression(node.parent) || ts.isNonNullExpression(node.parent) || ts.isSatisfiesExpression(node.parent)) && node.parent.expression === node) node = node.parent;
    return node;
  }
  written(reference: ts.Expression): boolean {
    let target: ts.Node = reference;
    // Assignment patterns contain expressions, but only their value/target side
    // is written. A computed property name is evaluated as a read.
    while (true) {
      const parent = target.parent;
      if ((ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) || ts.isTypeAssertionExpression(parent) || ts.isNonNullExpression(parent) || ts.isSatisfiesExpression(parent)) && parent.expression === target
        || ts.isPropertyAssignment(parent) && parent.initializer === target
        || ts.isShorthandPropertyAssignment(parent) && parent.name === target
        || (ts.isSpreadElement(parent) || ts.isSpreadAssignment(parent)) && parent.expression === target
        || ts.isArrayLiteralExpression(parent) && parent.elements.some(element => element === target)
        || ts.isObjectLiteralExpression(parent) && parent.properties.some(property => property === target)) target = parent;
      else break;
    }
    const parent = target.parent;
    return ts.isBinaryExpression(parent) && parent.left === target && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      || (ts.isForOfStatement(parent) || ts.isForInStatement(parent)) && parent.initializer === target
      || (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator)
      || ts.isDeleteExpression(parent);
  }
  objectReferenceUnsafe(reference: ts.Expression, initial: Evaluated): boolean {
    const use = this.accessUse(reference);
    if (this.written(use) || ts.isCallExpression(use.parent) && use.parent.expression === use) return true;
    let values = initial.values, node = reference;
    while (node !== use) {
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) {
        const key = ts.isPropertyAccessExpression(parent) ? parent.name.text : parent.argumentExpression && (ts.isStringLiteralLike(parent.argumentExpression) || ts.isNumericLiteral(parent.argumentExpression)) ? parent.argumentExpression.text : undefined;
        if (key === undefined) {
          if (values.some(value => !value || typeof value !== 'object' || Object.values(value).some(entry => entry !== null && typeof entry === 'object'))) return true;
          values = values.flatMap(value => Object.values(value as Record<string, Value>)); node = parent as ts.Expression; continue;
        }
        values = values.flatMap(value => value && typeof value === 'object' ? [(value as Record<string, Value>)[key] ?? unknown] : [unknown]);
      }
      node = parent as ts.Expression;
    }
    // A scalar read is a copy; an object-valued read can escape and mutate the owner.
    return values.some(value => value === unknown || !!value && typeof value === 'object');
  }
  closedComputedBody(declaration: ts.PropertyDeclaration): ts.ConciseBody | undefined {
    if (!declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) || declaration.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) || this.inputOwned(declaration)
      || ts.isClassDeclaration(declaration.parent) && this.computedOwnerEscaped(declaration.parent)
      || this.references(declaration).some(reference => this.written(this.accessUse(reference)))) return;
    const expression = declaration.initializer;
    if (!expression || !ts.isCallExpression(expression) || coreExport(expression.expression, expression.getSourceFile(), this.checker) !== 'computed') return;
    const callback = expression.arguments[0];
    return callback && ts.isArrowFunction(callback) && !callback.parameters.length ? callback.body : undefined;
  }
  computedMemberValue(declaration: ts.PropertyDeclaration, seen = new Set<ts.Node>()): Evaluated {
    const body = this.closedComputedBody(declaration);
    return body ? { ...(ts.isBlock(body) ? this.blockValue(body, seen) : this.evaluate(body, seen)), classDomain: body } : {values:[],dynamic:true};
  }
  computedCallBody(call: ts.CallExpression): ts.ConciseBody | undefined {
    const declaration = this.symbol(call.expression)?.valueDeclaration;
    return declaration && ts.isPropertyDeclaration(declaration) ? this.closedComputedBody(declaration) : undefined;
  }
  trustedInputRead(expression: ts.Expression): boolean {
    if (!ts.isCallExpression(expression) || expression.arguments.length || !ts.isPropertyAccessExpression(expression.expression) || expression.expression.expression.kind !== ts.SyntaxKind.ThisKeyword) return false;
    const declaration = this.symbol(expression.expression)?.valueDeclaration;
    if (!declaration || !ts.isPropertyDeclaration(declaration) || !declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)
      || declaration.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) || !ts.isClassDeclaration(declaration.parent) || this.computedOwnerEscaped(declaration.parent)
      || this.references(declaration).some(reference => this.written(this.accessUse(reference)))) return false;
    const initializer = declaration.initializer;
    return !!initializer && ts.isCallExpression(initializer) && coreExport(initializer.expression, initializer.getSourceFile(), this.checker) === 'input';
  }
  classGuardIntact(): boolean {
    if (!this.builtinIntact('RegExp')) return false;
    let intact = true;
    const visit = (node: ts.Node) => {
      if (!intact || ts.isTypeNode(node)) return;
      const access=staticMember(node as ts.Expression,this.checker);
      if(ts.isIdentifier(node)&&['Function','eval'].includes(node.text)&&this.standard(node,node.text))intact=false;
      if(access?.name&&['getPrototypeOf','setPrototypeOf'].includes(access.name))intact=false;
      if(this.unknownIntrinsicMember(node,'RegExp'))intact=false;
      if (access?.name && ['constructor','__proto__','prototype'].includes(access.name) && !(access.name==='prototype'&&this.standard(access.receiver,'Object'))) intact = false;
      if(access&&this.standard(access.receiver,'Object')&&(access.name===undefined||['getPrototypeOf','setPrototypeOf'].includes(access.name)))intact=false;
      if(ts.isIdentifier(node)&&node.text==='Object'&&this.standard(node,'Object')&&this.accessUse(node)===node)intact=false;
      if(ts.isBindingElement(node)){const key=node.propertyName?(ts.isComputedPropertyName(node.propertyName)?constantString(node.propertyName.expression,this.checker):propertyName(node.propertyName)):propertyName(node.name as ts.PropertyName);if(key===undefined?!!node.propertyName&&ts.isComputedPropertyName(node.propertyName):['constructor','prototype','__proto__'].includes(key))intact=false;}
      if (ts.isElementAccessExpression(node) && this.standard(node.expression, 'Object')) intact = false;
      if (ts.isIdentifier(node) && node.text === 'Reflect' && this.standard(node, 'Reflect')) intact = false;
      if (ts.isPropertyAccessExpression(node) && ['test','exec'].includes(node.name.text) && this.written(node)
        || ts.isElementAccessExpression(node) && node.argumentExpression && (ts.isStringLiteralLike(node.argumentExpression) ? ['test','exec'].includes(node.argumentExpression.text) : true) && this.written(node) && /RegExp|prototype/.test(node.expression.getText())) intact = false;
      if (ts.isCallExpression(node) && staticMember(node.expression,this.checker)) {
        const name = staticMember(node.expression,this.checker)!.name;
        // Reflective prototype extraction/escape can replace .test or .exec.
        if (name === 'getPrototypeOf' || name === 'setPrototypeOf') intact = false;
        if (name === 'defineProperty') {
          const keys = this.evaluate(node.arguments[1]);
          if (keys.dynamic || keys.values.some(value => value === 'test' || value === 'exec')) intact = false;
        }
        if (name && ['defineProperties','assign'].includes(name)) for (const argument of node.arguments.slice(1)) if (ts.isObjectLiteralExpression(argument) && argument.properties.some(property => ['test','exec'].includes(propertyName(property.name) ?? ''))) intact = false;
      }
      ts.forEachChild(node, visit);
    };
    for (const source of this.sources) visit(source); return intact;
  }
  computedOwnerEscaped(owner: ts.ClassDeclaration): boolean {
    // An inherited constructor/method can mutate the same instance. This
    // bounded evaluator does not certify a closed class hierarchy.
    if (owner.heritageClauses?.some(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)) return true;
    if (!this.ownerExposure.indexed) {
      this.ownerExposure.indexed = true;
      const expose = (symbol: ts.Symbol | undefined) => {
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker?.getAliasedSymbol(symbol);
        const declaration = symbol?.valueDeclaration;
        if (declaration && ts.isClassDeclaration(declaration)) this.ownerExposure.owners.add(declaration);
      };
      const visitedTypes = new Set<ts.Type>();
      const exposeType = (type: ts.Type | undefined) => {
        if (!type || visitedTypes.has(type)) return;
        visitedTypes.add(type);
        if (type.isUnionOrIntersection()) { for (const member of type.types) exposeType(member); return; }
        for (const argument of type.aliasTypeArguments ?? []) exposeType(argument);
        if (type.flags & ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) for (const argument of this.checker?.getTypeArguments(type as ts.TypeReference) ?? []) exposeType(argument);
        if (type.getConstructSignatures().length) return; // A constructor value is not its instance.
        expose(type.getSymbol());
        if (type.isClassOrInterface()) for (const base of type.getBaseTypes() ?? []) exposeType(base);
      };
      const visitType = (node: ts.Node) => {
        if (ts.isTypeReferenceNode(node)) expose(this.checker?.getSymbolAtLocation(node.typeName));
        ts.forEachChild(node, visitType);
      };
      const visit = (node: ts.Node) => {
        // A local annotation can hide a component in a nested structural shape.
        // It identifies an exposure hazard; it never certifies a runtime value.
        if (ts.isTypeNode(node)) { visitType(node); return; }
        if ((ts.isIdentifier(node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) || ts.isPropertyAccessExpression(node))
          && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent) && !ts.isExportSpecifier(node.parent) && !ts.isExportAssignment(node.parent)) {
          let symbol = this.symbol(node as ts.Expression);
          if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker?.getAliasedSymbol(symbol);
          const declaration = symbol?.valueDeclaration;
          // Query/injection/factory tokens, aliases and registries can expose an
          // instance even when the resulting member is any. Angular imports
          // also enable template reference queries/events; their full instance
          // lifetime is outside this bounded member summary.
          if (declaration && ts.isClassDeclaration(declaration) && node !== declaration.name) expose(symbol);
        }
        // An explicit application-created instance or a cast of that instance
        // is outside the closed Angular member lifetime summarized here.
        if (ts.isNewExpression(node)) { expose(this.symbol(this.unwrapped(node.expression))); exposeType(this.checker?.getTypeAtLocation(node)); }
        if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) { exposeType(this.checker?.getTypeAtLocation(node.expression)); exposeType(this.checker?.getTypeAtLocation(node)); }
        if (ts.isParameter(node) || ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isCallExpression(node)) exposeType(this.checker?.getTypeAtLocation(node));
        if (ts.isClassDeclaration(node) && node.heritageClauses?.some(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)) exposeType(this.checker?.getTypeAtLocation(node));
        ts.forEachChild(node, visit);
      };
      for (const source of this.sources) visit(source);
    }
    if (this.ownerExposure.owners.has(owner)) return true;
    const cached = this.computedOwnerEscapeCache.get(owner); if (cached !== undefined) return cached;
    let escaped = false;
    const visit = (node: ts.Node) => {
      if (escaped || ts.isClassDeclaration(node) || ts.isClassExpression(node) || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
        || (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) && node.parent !== owner) return;
      if (node.kind === ts.SyntaxKind.ThisKeyword) {
        let reference = node as ts.Expression;
        let cast = false;
        while ((ts.isParenthesizedExpression(reference.parent) || ts.isAsExpression(reference.parent) || ts.isTypeAssertionExpression(reference.parent) || ts.isNonNullExpression(reference.parent)) && reference.parent.expression === reference) { cast ||= ts.isAsExpression(reference.parent) || ts.isTypeAssertionExpression(reference.parent); reference = reference.parent; }
        const parent = reference.parent;
        // A property receiver does not expose the instance. Bare this in a call,
        // alias, return, container or spread can replace even a readonly signal.
        if (cast || !(ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) || parent.expression !== reference
          || ts.isElementAccessExpression(parent) && this.written(this.accessUse(parent))) escaped = true;
      }
      ts.forEachChild(node, visit);
    };
    for (const member of owner.members) if (!ts.isClassStaticBlockDeclaration(member) && !(ts.canHaveModifiers(member) && ts.getModifiers(member)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword))) visit(member);
    this.computedOwnerEscapeCache.set(owner, escaped); return escaped;
  }
  references(declaration: ts.Declaration): ts.Expression[] {
    const cached = this.referenceCache.get(declaration); if (cached) return cached;
    const name = (declaration as ts.NamedDeclaration).name;
    let symbol = name ? this.checker?.getSymbolAtLocation(name) : undefined;
    if (!symbol) return [];
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker?.getAliasedSymbol(symbol);
    const visit = (node: ts.Node) => {
      if (ts.isTypeNode(node)) return;
      if (ts.isPropertyAccessExpression(node) || ts.isIdentifier(node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) {
        let referenced = this.symbol(node as ts.Expression);
        if (referenced && referenced.flags & ts.SymbolFlags.Alias) referenced = this.checker?.getAliasedSymbol(referenced);
        if (referenced) { const references = this.referenceState.bySymbol.get(referenced) ?? []; references.push(node as ts.Expression); this.referenceState.bySymbol.set(referenced, references); }
      }
      ts.forEachChild(node, visit);
    };
    for (const source of this.sources.length ? this.sources : [declaration.getSourceFile()]) if (!this.referenceState.indexed.has(source)) {
      this.referenceState.indexed.add(source); visit(source);
    }
    const result = (symbol ? this.referenceState.bySymbol.get(symbol) ?? [] : []).filter(reference => reference !== name);
    this.referenceCache.set(declaration, result); return result;
  }
  declarationValue(declaration: ts.VariableDeclaration | ts.PropertyDeclaration | ts.PropertyAssignment, seen = new Set<ts.Node>()): Evaluated {
    const initial = this.evaluate(declaration.initializer, seen);
    let dynamic = ts.isVariableDeclaration(declaration) ? !(ts.isVariableDeclarationList(declaration.parent) && declaration.parent.flags & ts.NodeFlags.Const)
      : ts.isPropertyDeclaration(declaration) ? !declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) || this.inputOwned(declaration) : false;
    if (ts.isPropertyDeclaration(declaration) && ts.isClassDeclaration(declaration.parent) && this.computedOwnerEscaped(declaration.parent)) dynamic = true;
    const assigned: Evaluated[] = [];
    for (const reference of this.references(declaration)) {
      const parent = reference.parent;
      if (this.written(this.accessUse(reference))) dynamic = true;
      if (ts.isBinaryExpression(parent) && parent.left === reference && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        dynamic = true; if (parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) assigned.push(this.evaluate(parent.right, seen));
      } else if (ts.isPostfixUnaryExpression(parent) || ts.isPrefixUnaryExpression(parent) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator)) dynamic = true;
      // A const binding does not freeze its object or array. Track escapes and
      // member mutations instead of certifying its initial object contents.
      if (initial.values.some(value => !!value && typeof value === 'object')) {
        if (this.exported(declaration) || ts.isPropertyDeclaration(declaration) && !declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword)) dynamic = true;
        const container = ts.isShorthandPropertyAssignment(parent) || ts.isPropertyAssignment(parent) ? parent.parent : undefined;
        const metadataCall = container && ts.isObjectLiteralExpression(container) && ts.isCallExpression(container.parent) && decoratorKind(container.parent.expression, container.getSourceFile(), this.checker);
        const ownKeys = ts.isCallExpression(parent) && this.hasOwnCall(parent) && parent.arguments[0] === reference;
        const scalarCopy = ts.isSpreadAssignment(parent) && initial.values.every(value => !!value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(entry => entry === null || typeof entry !== 'object'));
        if (!metadataCall && !scalarCopy && !ownKeys && this.objectReferenceUnsafe(reference, initial)) dynamic = true;
      }
    }
    return { ...combine([initial, ...assigned]), dynamic: dynamic || initial.dynamic || assigned.some(result => result.dynamic) };
  }
  parameterValues(parameter: ts.ParameterDeclaration, seen: Set<ts.Node>): Evaluated {
    const fn = parameter.parent;
    const owner = ts.isArrowFunction(fn) && ts.isVariableDeclaration(fn.parent) && ts.isVariableDeclarationList(fn.parent.parent) && fn.parent.parent.flags & ts.NodeFlags.Const ? fn.parent
      : ts.isMethodDeclaration(fn) && fn.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword) ? fn : undefined;
    if (!owner || this.exported(owner) || parameter.dotDotDotToken || parameter.initializer) return { values: [], dynamic: true };
    const references = this.references(owner), index = fn.parameters.indexOf(parameter);
    if (!references.length) return { values: [], dynamic: true };
    const results = references.map(reference => ts.isCallExpression(reference.parent) && reference.parent.expression === reference && reference.parent.arguments[index]
      ? this.evaluate(reference.parent.arguments[index], seen) : { values: [], dynamic: true });
    const result = combine(results);
    const writes = this.references(parameter).some(reference => this.written(this.accessUse(reference)) || result.values.some(value => !!value && typeof value === 'object') && this.objectReferenceUnsafe(reference, result));
    return { ...result, dynamic: result.dynamic || writes };
  }
  mapKeys(expression: ts.Expression, seen: Set<ts.Node>): Evaluated {
    const declaration = this.symbol(expression)?.valueDeclaration;
    if (!declaration || !(ts.isVariableDeclaration(declaration) || ts.isPropertyDeclaration(declaration)) || !declaration.initializer || !ts.isNewExpression(declaration.initializer)) return { values: [], dynamic: true };
    if (this.exported(declaration) || (ts.isVariableDeclaration(declaration) ? !(ts.isVariableDeclarationList(declaration.parent) && declaration.parent.flags & ts.NodeFlags.Const) : !declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword))) return { values: [], dynamic: true };
    const constructor = this.symbol(declaration.initializer.expression);
    if (constructor?.name !== 'Map' || !constructor.declarations?.some(node => this.libraries.some(directory => within(directory, node.getSourceFile().fileName)))) return { values: [], dynamic: true };
    if (declaration.initializer.arguments?.length) return { values: [], dynamic: true };
    const results: Evaluated[] = [];
    for (const reference of this.references(declaration)) {
      const access = reference.parent;
      if (ts.isForOfStatement(access) && access.expression === reference) continue;
      if (!ts.isPropertyAccessExpression(access) || access.expression !== reference || !ts.isCallExpression(access.parent) || access.parent.expression !== access) { results.push({ values: [], dynamic: true }); continue; }
      if (access.name.text === 'set') {
        results.push(this.evaluate(access.parent.arguments[0], seen));
        // Map.set returns the mutable Map itself. Chaining or retaining it escapes
        // the directly tracked receiver, so later keys cannot be certified.
        if (!ts.isExpressionStatement(access.parent.parent)) results.push({ values: [], dynamic: true });
      }
      else if (!['get', 'has', 'delete', 'clear', 'entries', 'keys', 'values'].includes(access.name.text)) results.push({ values: [], dynamic: true });
    }
    return results.length ? combine(results) : { values: [], dynamic: true };
  }
  evaluate(node: ts.Expression | undefined, seen = new Set<ts.Node>()): Evaluated {
    if (!node || seen.has(node) || seen.size > 40) return { values: [], dynamic: true };
    seen = new Set(seen).add(node);
    const ev = (n: ts.Expression | undefined) => this.evaluate(n, seen);
    if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return { values: [ts.isNumericLiteral(node) ? Number(node.text) : node.text], dynamic: false };
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return { values: [node.kind === ts.SyntaxKind.TrueKeyword], dynamic: false };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { values: [null], dynamic: false };
    if (ts.isIdentifier(node) && node.text === 'undefined' && this.checker && !this.checker.getSymbolAtLocation(node)?.declarations?.length) return { values: [undefined], dynamic: false };
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) return ev(node.expression);
    if (ts.isConditionalExpression(node)) return conditional(ev(node.condition), () => ev(node.whenTrue), () => ev(node.whenFalse));
    if (ts.isPrefixUnaryExpression(node)) {
      const r = ev(node.operand);
      if (node.operator === ts.SyntaxKind.ExclamationToken) return { values: expanded(r.values).filter(value => value !== unknown).map(value => !value), dynamic: r.dynamic };
      // Increment/decrement mutate storage; their result cannot be inferred from
      // the operand's initializer. Only pure, explicitly supported operators fold.
      if (![ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.TildeToken].includes(node.operator)) return { values: [], dynamic: true };
      return { values: r.values.filter(v => typeof v === 'number').map(v => node.operator === ts.SyntaxKind.MinusToken ? -(v as number) : node.operator === ts.SyntaxKind.TildeToken ? ~(v as number) : v), dynamic: r.dynamic || !r.values.every(v => typeof v === 'number') };
    }
    if (ts.isBinaryExpression(node)) {
      const left = ev(node.left);
      if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) return logical(left, () => ev(node.right), '||');
      if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) return logical(left, () => ev(node.right), '??');
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return logical(left, () => ev(node.right), '&&');
      const right = ev(node.right);
      if ([ts.SyntaxKind.MinusToken,ts.SyntaxKind.AsteriskToken,ts.SyntaxKind.SlashToken,ts.SyntaxKind.PercentToken].includes(node.operatorToken.kind)) {
        const values: Value[] = []; let unsupported = false;
        for (const a of expanded(left.values)) for (const b of expanded(right.values)) {
          if (!primitive(a) || !primitive(b)) { unsupported = true; continue; }
          const x=Number(a), y=Number(b);
          const value = node.operatorToken.kind === ts.SyntaxKind.MinusToken ? x-y : node.operatorToken.kind === ts.SyntaxKind.AsteriskToken ? x*y : node.operatorToken.kind === ts.SyntaxKind.SlashToken ? x/y : x%y;
          if (Number.isFinite(value)) values.push(value); else unsupported = true;
        }
        return {values:values.slice(0,128),dynamic:left.dynamic||right.dynamic||unsupported||!values.length||values.length>128};
      }
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return addition(left,right);
    }
    if (ts.isTemplateExpression(node)) {
      let current: Evaluated = { values: [node.head.text], dynamic: false };
      for (const span of node.templateSpans) {
        const part = ev(span.expression); const next: Value[] = []; let unsupported = false;
        for (const a of current.values) for (const b of expanded(part.values)) { if (primitive(b)) next.push(`${String(a)}${String(b)}${span.literal.text}`); else unsupported = true; }
        if (part.dynamic) next.push(...current.values, span.literal.text);
        const completeValues: Value[] = [];
        for (const a of wholeValues(current)) for (const b of wholeValues(part)) if (primitive(b)) completeValues.push(`${String(a)}${String(b)}${span.literal.text}`);
        current = { values: next.slice(0, 128), dynamic: current.dynamic || part.dynamic || unsupported || next.length > 128, fragments: current.dynamic || part.dynamic || unsupported, completeValues:completeValues.slice(0,128) };
      }
      return current;
    }
    if (ts.isArrayLiteralExpression(node)) {
      const entries = node.elements.map(e => ts.isSpreadElement(e) ? ev(e.expression) : ev(e as ts.Expression));
      const value = entries.flatMap(e => e.values); arrayEvaluations.set(value, combine(entries));
      return { values: [value], dynamic: entries.some(e => e.dynamic), fragments: entries.some(e => e.fragments) };
    }
    if (ts.isObjectLiteralExpression(node)) {
      const result: { [key: string]: Value } = {}; let dynamic = false, fragments = false;
      for (const member of node.properties) {
        if (ts.isSpreadAssignment(member)) { const r = ev(member.expression); dynamic ||= r.dynamic; fragments ||= !!r.fragments; for (const v of r.values) if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(result, v); continue; }
        const key = propertyName(member.name);
        if (!key) { dynamic = true; continue; }
        const r = ts.isPropertyAssignment(member) ? ev(member.initializer) : ts.isShorthandPropertyAssignment(member) ? ev(member.name) : { values: [], dynamic: true };
        result[key] = memberValue(r); dynamic ||= r.dynamic; fragments ||= !!r.fragments;
      }
      return { values: [result], dynamic, fragments };
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword && node.arguments.length === 0) {
      const declaration = this.symbol(node.expression)?.valueDeclaration;
      if (declaration && ts.isPropertyDeclaration(declaration) && declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)) {
        let owner: ts.Node | undefined = node.parent;
        while (owner && !ts.isClassDeclaration(owner)) owner = owner.parent;
        if (owner === declaration.parent) return this.computedMemberValue(declaration, seen);
      }
    }
    if (ts.isCallExpression(node)) { const value = this.functionValue(node, seen); if (value) return value; }
    if (ts.isElementAccessExpression(node)) {
      const object = ev(node.expression), keys = ev(node.argumentExpression), values: Value[] = [];
      for (const value of object.values) for (const key of keys.values) if (value && typeof value === 'object' && (typeof key === 'string' || typeof key === 'number')) values.push(Object.hasOwn(value, key) ? (value as Record<string, Value>)[String(key)]! : unknown);
      return { values: expanded(values).filter(value => value !== unknown), dynamic: object.dynamic || keys.dynamic || !values.length || values.includes(unknown) };
    }
    if (ts.isPropertyAccessExpression(node)) {
      const r = ev(node.expression), values: Value[] = [];
      for (const v of r.values) if (v && typeof v === 'object' && !Array.isArray(v) && v[node.name.text] !== undefined) values.push(v[node.name.text]!);
      if (values.length) return { values, dynamic: r.dynamic || values.includes(unknown) };
    }
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      let symbol = this.symbol(node);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) { try { symbol = this.checker!.getAliasedSymbol(symbol); } catch { return { values: [], dynamic: true }; } }
      const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
      if (decl && this.bindings.has(decl)) {
        const bound = this.bindings.get(decl)!;
        const assignments = this.references(decl).flatMap(reference => ts.isBinaryExpression(reference.parent) && reference.parent.left === reference && reference.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken ? [ev(reference.parent.right)] : []);
        return assignments.length ? { ...combine([bound, ...assignments]), dynamic: true } : bound;
      }
      if (decl && ts.isParameter(decl)) return this.parameterValues(decl, seen);
      if (decl && ts.isBindingElement(decl) && ts.isArrayBindingPattern(decl.parent) && decl.parent.elements[0] === decl && ts.isVariableDeclaration(decl.parent.parent)) {
        const list = decl.parent.parent.parent;
        if (ts.isVariableDeclarationList(list) && ts.isForOfStatement(list.parent)) return this.mapKeys(list.parent.expression, seen);
      }
      if (decl && ts.isVariableDeclaration(decl) && !decl.initializer && ts.isVariableDeclarationList(decl.parent) && ts.isForOfStatement(decl.parent.parent)) {
        const iterable = ev(decl.parent.parent.expression);
        return { values: iterable.values.flatMap(value => Array.isArray(value) ? value : []), dynamic: !(decl.parent.flags & ts.NodeFlags.Const) || iterable.dynamic || iterable.values.some(value => !Array.isArray(value)) };
      }
      if (decl && (ts.isVariableDeclaration(decl) || ts.isPropertyDeclaration(decl) || ts.isPropertyAssignment(decl))) return this.declarationValue(decl, seen);
      if (!this.checker && ts.isIdentifier(node)) {
        for (const statement of node.getSourceFile().statements) if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === node.text) return ev(d.initializer);
      }
    }
    return { values: [], dynamic: true };
  }
}
function objectMetadata(expression: ts.Expression, evaluator: Evaluator, seen = new Set<ts.Node>()): Map<string, ts.Expression> | undefined {
  if (seen.has(expression) || seen.size > 40) return; seen = new Set(seen).add(expression);
  if (!ts.isObjectLiteralExpression(expression)) {
    let symbol = evaluator.checker?.getSymbolAtLocation(expression);
    if (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias) symbol = evaluator.checker?.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer && declaration.initializer !== expression) return objectMetadata(declaration.initializer, evaluator, seen);
    return;
  }
  const result = new Map<string, ts.Expression>();
  for (const entry of expression.properties) {
    if (ts.isPropertyAssignment(entry)) { const key = propertyName(entry.name); if (key) result.set(key, entry.initializer); }
    else if (ts.isShorthandPropertyAssignment(entry)) result.set(entry.name.text, entry.name);
  }
  return result;
}
function strings(result: Evaluated): string[] { return result.values.flatMap(v => typeof v === 'string' ? [v] : Array.isArray(v) ? strings({ values: v, dynamic: false }) : []); }
const cssUnitSuffix = /^(?:\s*(?:px|cm|mm|q|in|pt|pc|r?(?:em|ex|cap|ch|ic|lh)|[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max)|deg|grad|rad|turn|ms|s|hz|khz|dpi|dpcm|dppx|x|fr|%|[),;])+\s*)$/i;
export function angularDeclarations(files: Map<string, string>): AngularDeclaration[] {
  const result: AngularDeclaration[] = []; const evaluator = new Evaluator();
  for (const [file, text] of files) {
    if (!file.endsWith('.ts')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const node of classDeclarations(sf)) {
      const m = metadata(node); if (!m) continue;
      const properties = objectMetadata(m.expression, evaluator); const selector = strings(evaluator.evaluate(properties?.get('selector')))[0];
      if (selector) result.push({ file, name: node.name?.text ?? '(anonymous)', selector, kind: m.kind });
    }
  }
  return result.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
}

export async function checkSources(options: CheckSourcesOptions): Promise<SourceReport> {
  const checks = options.policy.checks;
  if (!checks) return { status: 'not_configured', valid: !options.requireSourceChecks && options.baselinePath === undefined, files: 0, checked: 0, diagnostics: [], exceptions: [] };
  const root = path.resolve(options.root), output = path.resolve(root, options.config.output);
  const all = new Map<string, string>(), diagnostics: SourceDiagnostic[] = [], exceptions: SourceDiagnostic[] = []; let checked = 0;
  const diagnosticIdentities = new Set<string>();
  const emit = (item: SourceDiagnostic) => {
    const identity = JSON.stringify([item.file, item.line, item.column, item.rule, item.source, item.message, item.severity]);
    if (!diagnosticIdentities.has(identity)) { diagnosticIdentities.add(identity); diagnostics.push(item); }
  };
  const ctx: StyleContext = { policy: options.policy, emit, checked: () => { checked++; }, utilities: await createUtilityResolver() };
  const loc = (file: string, text: string, offset = 0): SourceLocation => ({ file: relative(root, file), text, offset });
  const problem = (file: string, rule: string, message: string, text = '', offset = 0, severity: 'error' | 'warning' = 'error', source?: string) => emit(diagnostic(loc(file, text, offset), rule, severity, message, severity === 'warning' ? 'Use a finite literal or review this unresolved source manually.' : 'Correct the source or inspection configuration.', source));
  async function safeFile(file: string): Promise<string | undefined> {
    if (!within(root, file)) { problem(file, 'source-error', 'Source path escapes the project root.'); return; }
    const parts = path.relative(root, file).split(path.sep); let current = root;
    try {
      for (const part of parts) { current = path.join(current, part); if ((await fs.lstat(current)).isSymbolicLink()) { problem(file, 'source-error', 'Symlinked inspection paths are not allowed.'); return; } }
      if (!(await fs.stat(file)).isFile()) { problem(file, 'source-error', 'Expected a source file.'); return; }
      return await fs.readFile(file, 'utf8');
    } catch (error) { problem(file, 'source-error', `Cannot read source: ${(error as Error).message}`); return; }
  }
  const excludedProjects: NonNullable<SourceReport['excluded_projects']> = [];
  const workspace = path.join(root, 'angular.json');
  let hasWorkspace = false;
  try { await fs.lstat(workspace); hasWorkspace = true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') problem(workspace, 'source-error', `Cannot inspect Angular workspace: ${(error as Error).message}`);
  }
  if (hasWorkspace) {
    const text = await safeFile(workspace);
    if (text !== undefined) {
      try {
        for (const { name, sourceRoot } of workspaceSourceRoots(workspace, text)) {
          const target = path.resolve(root, sourceRoot);
          const canInspect = !within(output, target) && !path.relative(root, target).split(path.sep).some(part => forbidden.has(part));
          if (canInspect && checks.source_roots.some(configured => within(path.resolve(root, configured), target))) continue;
          const excluded = checks.excluded_projects?.find(item => item.name === name);
          if (excluded) excludedProjects.push({ name, source_root: sourceRoot, reason: excluded.reason });
          else {
            const remedy = canInspect && sourceRoot !== '.'
              ? `Add ${JSON.stringify(sourceRoot)} to checks.source_roots.`
              : 'Declare an inspectable application sourceRoot and add it to checks.source_roots.';
            emit(diagnostic(loc(workspace, text), 'uncovered-project', 'warning',
              `Angular project ${name} is outside the inspected source roots: ${sourceRoot}.`,
              `${remedy} For an intentional exclusion, record ${JSON.stringify(name)} with a reason in checks.excluded_projects.`, name));
          }
        }
      } catch (error) { problem(workspace, 'parse-error', (error as Error).message, text); }
    }
  }

  async function enumerate(file: string): Promise<number> {
    if (!within(root, file)) { problem(file, 'source-error', 'Source root escapes the project root.'); return 0; }
    if (within(output, file) || path.relative(root, file).split(path.sep).some(part => forbidden.has(part))) return 0;
    try {
      const st = await fs.lstat(file);
      if (st.isSymbolicLink()) { problem(file, 'source-error', 'Symlinked inspection paths are not allowed.'); return 0; }
      if (st.isDirectory()) { let total = 0; for (const child of (await fs.readdir(file)).sort()) total += await enumerate(path.join(file, child)); return total; }
      if (!st.isFile() || !extensions.has(path.extname(file))) return 0;
      const text = await safeFile(file); if (text === undefined) return 0; all.set(file, text); return 1;
    } catch (error) { problem(file, 'source-error', `Cannot enumerate source: ${(error as Error).message}`); return 0; }
  }
  for (const sourceRoot of checks.source_roots) { const file = path.resolve(root, sourceRoot); const count = await enumerate(file); if (!count) problem(file, 'source-error', 'Configured source root contains no inspectable source files.'); }
  // TypeScript's resolver probes parent directories. Every actual content read is
  // checked here before it reaches fs/ts.sys; declarations have explicit IO roots.
  const dependencyRoots: string[] = [], libraryRoots: string[] = [];
  function symlinkInProject(file: string): boolean {
    let current = root;
    for (const part of path.relative(root, file).split(path.sep)) {
      current = path.join(current, part);
      try { if (fsSync.lstatSync(current).isSymbolicLink()) return true; } catch { return false; }
    }
    return false;
  }
  function declarationPath(file: string): boolean { return /\.d\.(?:ts|mts|cts)$/.test(file) || path.basename(file) === 'package.json'; }
  function ioAllowed(candidate: string, configOnly = false): boolean {
    const file = path.resolve(candidate);
    if (!configOnly && (declarationPath(file) || /\.(?:js|mjs|cjs)$/.test(file))) {
      // Installed JavaScript entries may be probed/parsed for type metadata;
      // this never invokes their code. Pinned libraries remain declarations-only.
      const declaredRoot = [...dependencyRoots, ...(declarationPath(file) ? libraryRoots : [])].find(directory => within(directory, file));
      if (declaredRoot) {
        try { return within(fsSync.realpathSync(declaredRoot), fsSync.realpathSync(file)); } catch { return true; }
      }
    }
    if (!within(root, file) || symlinkInProject(file)) return false;
    // Dependencies supply declarations/metadata, never arbitrary executable source.
    if (!configOnly && within(path.join(root, 'node_modules'), file)) return false;
    return true;
  }
  function readAllowed(candidate: string, configOnly = false): string | undefined {
    const file = path.resolve(candidate);
    if (!ioAllowed(file, configOnly)) { problem(file, 'source-error', 'TypeScript IO path is outside its permitted root or traverses a disallowed source symlink.'); return; }
    try { const text = fsSync.readFileSync(file, 'utf8'); if (!configOnly && within(root, file) && !within(path.join(root, 'node_modules'), file) && /\.(?:ts|tsx|mts|cts|js|jsx)$/.test(file) && !declarationPath(file)) inspectSourceReferences(file, text); return text; } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && (error as NodeJS.ErrnoException).code !== 'ENOTDIR') problem(file, 'source-error', `Cannot read TypeScript input: ${(error as Error).message}`);
      return;
    }
  }
  function fileAllowed(candidate: string, configOnly = false): boolean {
    const file = path.resolve(candidate);
    if (!ioAllowed(file, configOnly)) {
      // Speculative ancestor probes are absent, but an existing denied input is
      // a real coverage failure. No denied file content is read to decide this.
      if (configOnly || fsSync.existsSync(file)) problem(file, 'source-error', 'TypeScript IO path is outside its permitted root or traverses a disallowed source symlink.');
      return false;
    }
    try { return fsSync.statSync(file).isFile(); } catch { return false; }
  }
  function directoryAllowed(candidate: string, configOnly = false): boolean {
    const file = path.resolve(candidate);
    if (!configOnly && [...dependencyRoots, ...libraryRoots].some(directory => within(directory, file))) {
      try { return [...dependencyRoots, ...libraryRoots].some(directory => within(fsSync.realpathSync(directory), fsSync.realpathSync(file))) && fsSync.statSync(file).isDirectory(); } catch { return false; }
    }
    if (!within(root, file) || symlinkInProject(file)) return false;
    try { return fsSync.statSync(file).isDirectory(); } catch { return false; }
  }
  const configHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readFile: file => readAllowed(file, true), fileExists: file => fileAllowed(file, true),
    // checks.source_roots owns source discovery; tsconfig include/exclude never
    // expands the inspection set or requires traversing unrelated directories.
    readDirectory: directory => { if (!directoryAllowed(directory, true)) problem(path.resolve(directory), 'source-error', 'TypeScript config discovery path escapes the project or traverses a symlink.'); return []; },
  };
  const referencesChecked = new Set<string>();
  function inspectSourceReferences(file: string, text: string) {
    if (referencesChecked.has(file)) return; referencesChecked.add(file);
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const inspectReference = (reference: string) => { if ((reference.startsWith('.') || path.isAbsolute(reference)) && !ioAllowed(path.resolve(path.dirname(file), reference))) problem(file, 'source-error', `Imported application source is outside the project or symlinked: ${reference}`); };
    function visitReference(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) inspectReference(node.moduleSpecifier.text);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) inspectReference(node.argument.literal.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) inspectReference(node.arguments[0].text);
      ts.forEachChild(node, visitReference);
    }
    visitReference(source); for (const reference of source.referencedFiles) inspectReference(reference.fileName.startsWith('.') ? reference.fileName : './' + reference.fileName);
  }
  for (const [file, text] of all) if (file.endsWith('.ts')) inspectSourceReferences(file, text);
  let compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true, skipLibCheck: true };
  if (checks.tsconfig) {
    const file = path.resolve(root, checks.tsconfig); const text = await safeFile(file);
    if (text !== undefined) {
      const parsed = ts.parseConfigFileTextToJson(file, text);
      if (parsed.error) problem(file, 'parse-error', ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n'), text);
      else { const config = ts.parseJsonConfigFileContent(parsed.config, configHost, path.dirname(file)); compilerOptions = config.options; for (const error of config.errors) if (error.code !== 18003) problem(file, 'parse-error', ts.flattenDiagnosticMessageText(error.messageText, '\n'), text); }
    }
  }
  const compilerHost = ts.createCompilerHost(compilerOptions);
  const defaultLib = ts.getDefaultLibFilePath(compilerOptions); let libraryRoot: string | undefined;
  const targetDependencies = path.join(root, 'node_modules');
  try { if (fsSync.statSync(targetDependencies).isDirectory()) { dependencyRoots.push(targetDependencies, fsSync.realpathSync(targetDependencies)); } } catch { /* No target dependencies. */ }
  const targetLibraries = path.join(targetDependencies, 'typescript', 'lib');
  if (fileAllowed(path.join(targetLibraries, path.basename(defaultLib)))) libraryRoot = targetLibraries;
  if (!libraryRoot && fsSync.existsSync(defaultLib)) libraryRoot = path.dirname(defaultLib);
  const packagedLibraries = path.join(path.dirname(ts.sys.getExecutingFilePath()), 'checker-lib');
  if (!libraryRoot && fsSync.existsSync(path.join(packagedLibraries, path.basename(defaultLib)))) libraryRoot = packagedLibraries;
  if (libraryRoot && within(root, libraryRoot) && !within(targetDependencies, libraryRoot) && symlinkInProject(libraryRoot)) { problem(libraryRoot, 'source-error', 'Packaged TypeScript library roots cannot traverse a source symlink.'); libraryRoot = undefined; }
  if (libraryRoot) {
    try { libraryRoots.push(libraryRoot, fsSync.realpathSync(libraryRoot)); } catch { /* Missing roots produce the library coverage diagnostic below. */ }
    compilerHost.getDefaultLibFileName = options => path.join(libraryRoot!, path.basename(ts.getDefaultLibFilePath(options))); compilerHost.getDefaultLibLocation = () => libraryRoot!;
  } else if (!compilerOptions.noLib && [...all.keys()].some(f => f.endsWith('.ts'))) problem([...all.keys()].find(f => f.endsWith('.ts'))!, 'unresolved', 'TypeScript standard libraries are unavailable; typed DOM sink coverage is incomplete.', '', 0, 'warning');
  const resolutionPathAllowed = (candidate: string) => {
    const file = path.resolve(candidate);
    if (within(root, file) && !within(targetDependencies, file) && !symlinkInProject(file)) return true;
    return [...dependencyRoots, ...libraryRoots].some(directory => within(directory, file)) && (directoryAllowed(file) || fileAllowed(file));
  };
  const resolutionPaths = [...(compilerOptions.typeRoots ?? []), ...(compilerOptions.rootDirs ?? []), ...(compilerOptions.baseUrl ? [compilerOptions.baseUrl] : [])];
  const mappingBase = compilerOptions.baseUrl ?? (typeof compilerOptions.pathsBasePath === 'string' ? compilerOptions.pathsBasePath : checks.tsconfig ? path.dirname(path.resolve(root, checks.tsconfig)) : root);
  for (const targets of Object.values(compilerOptions.paths ?? {})) for (const target of targets) resolutionPaths.push(path.resolve(mappingBase, target.split('*')[0] || '.'));
  for (const candidate of resolutionPaths) if (!resolutionPathAllowed(candidate)) problem(path.resolve(candidate), 'source-error', 'Explicit TypeScript resolution options escape the project/declaration roots or traverse a source symlink.');
  compilerHost.readFile = file => readAllowed(file);
  compilerHost.fileExists = file => fileAllowed(file);
  compilerHost.directoryExists = file => directoryAllowed(file);
  compilerHost.realpath = file => within(root, file) && !within(targetDependencies, file) ? file : ioAllowed(file) ? (() => { try { return fsSync.realpathSync(file); } catch { return file; } })() : file;
  compilerHost.getDirectories = directory => directoryAllowed(directory) ? fsSync.readdirSync(directory, { withFileTypes: true }).filter(entry => directoryAllowed(path.join(directory, entry.name))).map(entry => entry.name) : [];
  compilerHost.readDirectory = () => [];
  compilerHost.getCurrentDirectory = () => root;
  if (libraryRoot) for (const library of compilerOptions.lib ?? []) if (!fileAllowed(path.join(libraryRoot, library))) problem(path.join(libraryRoot, library), 'source-error', 'Requested TypeScript standard library is unavailable; DOM type coverage cannot be established.');
  const program = ts.createProgram([...all.keys()].filter(f => f.endsWith('.ts')), compilerOptions, compilerHost), checker = program.getTypeChecker(), evaluator = new Evaluator(checker, libraryRoots, undefined, undefined, program.getSourceFiles().filter(source => !source.isDeclarationFile && !within(targetDependencies, source.fileName)));
  const angularOutput = path.join(output, 'angular');
  const entryFiles = publicAngularEntries.map(name => path.join(angularOutput, name));
  const resolutionCache = ts.createModuleResolutionCache(root, compilerHost.getCanonicalFileName, compilerOptions);
  function resolveImport(module: ts.StringLiteralLike, source: ts.SourceFile) {
    return resolveSpecifier(module.text, source, module);
  }
  function resolveSpecifier(specifier: string, source: ts.SourceFile, original: ts.StringLiteralLike) {
    return ts.resolveModuleName(specifier, source.fileName, compilerOptions, compilerHost, resolutionCache, undefined,
      ts.getModeForUsageLocation(source, original, compilerOptions)).resolvedModule?.resolvedFileName;
  }
  // Read only the entry points required to recommend a replacement. Adding the
  // entire barrel to the compiler program would also resolve specialist engines.
  let publicExports: Map<string, Map<string, Set<string>>> | undefined;
  function exportsByEntry() {
    if (publicExports) return publicExports;
    publicExports = new Map();
    for (const entry of entryFiles) {
      if (!fileAllowed(entry)) continue;
      const text = readAllowed(entry);
      if (text === undefined) continue;
      const source = ts.createSourceFile(entry, text, {
        languageVersion: ts.ScriptTarget.Latest,
        impliedNodeFormat: ts.getImpliedNodeFormatForFile(entry, resolutionCache.getPackageJsonInfoCache(), compilerHost, compilerOptions),
      }, true);
      const exportsForFile = new Map<string, Set<string>>();
      for (const statement of source.statements) {
        if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteralLike(statement.moduleSpecifier)
          || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
        const target = resolveImport(statement.moduleSpecifier, source);
        if (!target) continue;
        let names = exportsForFile.get(target);
        if (!names) { names = new Set(); exportsForFile.set(target, names); }
        for (const element of statement.exportClause.elements) {
          if (!element.propertyName || element.propertyName.text === element.name.text) names.add(element.name.text);
        }
      }
      publicExports.set(entry, exportsForFile);
    }
    return publicExports;
  }
  function inspectGeneratedReferences(source: ts.SourceFile) {
    function inspectReference(module: ts.StringLiteralLike, names: readonly string[] = []) {
      const resolved = resolveImport(module, source);
      if (!resolved || !within(angularOutput, resolved) || entryFiles.includes(resolved)) return;
      const preferred = names.length ? [...exportsByEntry()].find(([, files]) => names.every(name => files.get(resolved)?.has(name))) : undefined;
      let suggestion = 'Use a public API where available, or request a public export for this dependency.';
      if (preferred) {
        const candidate = relative(path.dirname(source.fileName), preferred[0]).replace(/\.ts$/, '');
        const relativeEntry = candidate.startsWith('.') ? candidate : './' + candidate;
        const specifiers = module.text.endsWith('.js') ? [relativeEntry + '.js', relativeEntry] : [relativeEntry, relativeEntry + '.js'];
        const specifier = specifiers.find(value => resolveSpecifier(value, source, module) === preferred[0]);
        if (specifier) suggestion = `Import the same names from '${specifier}' instead.`;
      }
      emit(diagnostic(loc(source.fileName, source.text, module.getStart(source)), 'generated-internal-import', 'warning',
        `Import resolves to internal generated file ${relative(root, resolved)}.`, suggestion, module.getText(source)));
    }
    function visit(node: ts.Node): void {
      if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
        const bindings = node.importClause?.namedBindings;
        inspectReference(node.moduleSpecifier, bindings && ts.isNamedImports(bindings) && !node.importClause?.name
          ? bindings.elements.map(element => (element.propertyName ?? element.name).text) : []);
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        const clause = node.exportClause;
        inspectReference(node.moduleSpecifier, clause && ts.isNamedExports(clause) ? clause.elements.map(element => (element.propertyName ?? element.name).text) : []);
      }
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) {
        let exported = node.qualifier;
        while (exported && ts.isQualifiedName(exported)) exported = exported.left;
        inspectReference(node.argument.literal, exported ? [exported.text] : []);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        inspectReference(node.arguments[0]);
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
          && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
        inspectReference(node.moduleReference.expression);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const source of program.getSourceFiles()) {
    if (all.has(source.fileName)) inspectGeneratedReferences(source);
  }
  function assignedValue(node: ts.BinaryExpression): Evaluated {
    const right = evaluator.evaluate(node.right);
    if ([ts.SyntaxKind.EqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken].includes(node.operatorToken.kind)) return right;
    // The existing DOM value is runtime state. Keep RHS fragments for +=, but
    // never treat them as the complete result or as a closed CSS supplier.
    if (node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) return addition({ values: [], dynamic: true }, right);
    return { values: [], dynamic: true };
  }
  function styleWrite(node: ts.Node): { target: ts.Expression; value: () => Evaluated } | undefined {
    if (assignmentExpression(node)) { let result: Evaluated | undefined; return { target: node.left, value: () => result ??= assignedValue(node) }; }
    if (updateExpression(node)) return { target: node.operand, value: () => ({ values: [], dynamic: true }) };
    return;
  }
  function hostBindingKeys(call: ts.CallExpression, member: ts.ClassElement): Evaluated {
    const name = propertyName(member.name);
    const result = call.arguments.length ? evaluator.evaluate(call.arguments[0]) : { values: name === undefined ? [] : [name], dynamic: name === undefined };
    const values = expanded(result.values);
    return { values: values.filter((value): value is string => typeof value === 'string').map(value => /^attr\.(style|class|id)$/.exec(value)?.[1] ?? value), dynamic: result.dynamic || values.some(value => typeof value !== 'string') };
  }
  for (const error of program.getSyntacticDiagnostics()) if (error.file && all.has(error.file.fileName)) problem(error.file.fileName, 'parse-error', ts.flattenDiagnosticMessageText(error.messageText, '\n'), error.file.text, error.start ?? 0);
  const declarationList: Declaration[] = [];
  // Import identity is taken from the exported name, never the consumer's local alias.
  const imported = new Map<ts.Symbol, { module: string; export: string }[]>();
  for (const sf of program.getSourceFiles()) {
    for (const statement of sf.statements) {
      if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const moduleSymbol = checker.getSymbolAtLocation(statement.moduleSpecifier);
      if (moduleSymbol) for (let exported of checker.getExportsOfModule(moduleSymbol)) {
        const exportedName = exported.name;
        if (exported.flags & ts.SymbolFlags.Alias) exported = checker.getAliasedSymbol(exported);
        const identities = imported.get(exported) ?? [];
        identities.push({ module: statement.moduleSpecifier.text, export: exportedName }); imported.set(exported, identities);
      }
      if (!ts.isImportDeclaration(statement)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const entry of bindings.elements) {
        const alias = checker.getSymbolAtLocation(entry.name); if (!alias) continue;
        const symbol = alias.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(alias) : alias;
        const identities = imported.get(symbol) ?? []; identities.push({ module: statement.moduleSpecifier.text, export: entry.propertyName?.text ?? entry.name.text }); imported.set(symbol, identities);
      }
    }
  }
  const approvedIdentity = (identity: { module: string; export: string }) => ['@angular/core', '@angular/common', '@angular/forms', '@angular/router'].includes(identity.module) || checks.approved_components.some(a => a.module === identity.module && a.export === identity.export);
  for (const sf of program.getSourceFiles()) {
    for (const node of classDeclarations(sf)) {
      const m = metadata(node, checker); let selector: string | undefined, kind = m?.kind;
      if (m) selector = strings(evaluator.evaluate(objectMetadata(m.expression, evaluator)?.get('selector')))[0];
      if (!selector) for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member) || !member.type || !ts.isTypeReferenceNode(member.type)) continue;
        const name = propertyName(member.name);
        if (name !== 'ɵcmp' && name !== 'ɵdir') continue;
        kind = name === 'ɵcmp' ? 'component' : 'directive';
        const arg = member.type.typeArguments?.[1]; if (arg && ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) selector = arg.literal.text;
      }
      if (!selector || !kind) continue;
      const symbol = node.name ? checker.getSymbolAtLocation(node.name) : undefined;
      const identities = symbol ? imported.get(symbol) ?? [] : [];
      const generated = within(output, sf.fileName) || options.policy.generated_components.some(d => d.name === node.name?.text && d.selector === selector && relative(root, sf.fileName) === d.file);
      const standardAngular = /\/node_modules\/@angular\/(?:core|common|forms|router)\//.test(sf.fileName.replaceAll('\\', '/'));
      const approved = all.has(sf.fileName) || generated || standardAngular || identities.some(approvedIdentity);
      declarationList.push({ file: sf.fileName, name: node.name?.text ?? '(anonymous)', selector, kind, node, external: identities[0], approved });
    }
  }
  for (const declaration of options.policy.generated_components) if (!declarationList.some(d => d.selector === declaration.selector && d.name === declaration.name)) declarationList.push({ ...declaration, approved: true });
  function confirmedPipe(declaration: ts.ClassDeclaration): boolean {
    if (decorators(declaration).some(decorator => ts.isCallExpression(decorator.expression) && coreExport(decorator.expression.expression, declaration.getSourceFile(), checker) === 'Pipe')) return true;
    return declaration.members.some(member => {
      if (!ts.isPropertyDeclaration(member) || propertyName(member.name) !== 'ɵpipe' || !member.type || !ts.isTypeReferenceNode(member.type)) return false;
      const name = member.type.typeName;
      if (ts.isIdentifier(name)) return coreExport(name, declaration.getSourceFile(), checker) === 'ɵɵPipeDeclaration';
      if (ts.isQualifiedName(name) && ts.isIdentifier(name.left)) {
        for (const statement of declaration.getSourceFile().statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === '@angular/core' && statement.importClause?.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings) && statement.importClause.namedBindings.name.text === name.left.text && name.right.text === 'ɵɵPipeDeclaration') return true;
      }
      return false;
    });
  }
  const byClass = new Map(declarationList.filter(d => d.node).map(d => [d.node!, d]));
  function angularScope(expression: ts.Expression | ts.TypeNode, result = new Set<Declaration>(), seen = new Set<ts.Node>()): Set<Declaration> {
    if (seen.has(expression)) return result; seen.add(expression);
    if (ts.isArrayLiteralExpression(expression)) { for (const e of expression.elements) angularScope(ts.isSpreadElement(e) ? e.expression : e as ts.Expression, result, seen); return result; }
    if (ts.isTupleTypeNode(expression)) { for (const type of expression.elements) angularScope(type, result, seen); return result; }
    const symbolNode = ts.isTypeQueryNode(expression) ? expression.exprName : ts.isTypeReferenceNode(expression) ? expression.typeName : ts.isPropertyAccessExpression(expression) ? expression.name : expression;
    let symbol = checker.getSymbolAtLocation(symbolNode);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) angularScope(declaration.initializer, result, seen);
    if (declaration && ts.isClassDeclaration(declaration)) {
      const registered = byClass.get(declaration); if (registered) result.add(registered);
      for (const member of declaration.members) if (ts.isPropertyDeclaration(member) && propertyName(member.name) === 'ɵmod' && member.type && ts.isTypeReferenceNode(member.type)) {
        const exports = member.type.typeArguments?.[3]; if (exports) angularScope(exports, result, seen);
      }
      for (const decorator of decorators(declaration)) if (ts.isCallExpression(decorator.expression) && importedIdentity(decorator.expression.expression, declaration.getSourceFile())?.export === 'NgModule') {
        const meta = decorator.expression.arguments[0]; const exports = meta ? objectMetadata(meta, evaluator)?.get('exports') : undefined; if (exports) angularScope(exports, result, seen);
      }
    }
    return result;
  }
  const matcher = new SelectorMatcher<Declaration>();
  const declaredSelectors = new Map<ts.ClassDeclaration, CssSelector[]>();
  const dom = new DomElementSchemaRegistry();
  for (const declaration of declarationList) { try { const selectors=CssSelector.parse(declaration.selector); matcher.addSelectables(selectors, declaration); if(declaration.node)declaredSelectors.set(declaration.node,selectors); } catch { if (all.has(declaration.file)) problem(declaration.file, 'parse-error', `Invalid Angular selector ${declaration.selector}.`); } }
  const consumed = new Set<string>(), stylesScanned = new Set<string>(), globalClasses = new Set<string>();
  const componentClasses = new Map<ts.ClassDeclaration, Set<string>>();
  const componentStyleUnits = new Map<ts.ClassDeclaration, { css: string; scss: boolean }[]>();
  const scopedExternalStyles = new Set<string>(), globalExternalStyles = new Set<string>();
  const externalStyleContent = new Map<string, string>();
  function unresolved(file: string, text: string, offset: number, message: string, source?: string) { problem(file, 'unresolved', message, text, offset, 'warning', source); }
  function inspectValue(result: Evaluated, mode: 'class' | 'style' | 'css', property: string, location: SourceLocation, unit = '', context = ctx, classes = globalClasses) {
    const emitted = new Set<string>();
    const complete = new Set(wholeValues(result));
    let fragmentCandidate = !!result.fragments;
    const valueContext: StyleContext = { ...context, separateLiteralValues: context.separateLiteralValues || !!(result.dynamic && result.fragments), emit: item => {
      let mapped = item;
      if (fragmentCandidate) {
        const literal = /Concrete value (.+?) in /.exec(item.message)?.[1] ?? '';
        const meaningfulLiteral = /^(?:#[a-f\d]{3,8}|[+-]?(?:\d*\.)?\d+(?:px|rem|em|ch|ex|vh|vw|vmin|vmax|%|ms|s|deg)|red|blue|green|white|black|yellow|orange|purple|pink|gray|grey|cyan|magenta|transparent|(?:\d*\.)?\d+)$/i.test(literal);
        if (item.rule === 'parse-error' || item.rule === 'literal-token' && !meaningfulLiteral || item.rule === 'unknown-token' && (/(?:var\(\s*--ui-[\w-]*|[\w-]+-)\s*$/.test(item.source) || /var\(\s*--ui-(?:color|font|text|leading|weight|space|radius|size|border|motion|opacity)-\s*\)/.test(item.source))) mapped = { ...item, rule: 'unresolved', severity: 'warning', message: 'Incomplete dynamic string fragment: ' + item.message };
      }
      if (result.fragments) {
        const value = item.source.slice(item.source.indexOf(':') + 1).trim();
        const completeLiteral = mode === 'class' && !/[[(]|-$/.test(item.source) || /^(?:#[a-f\d]{3,8}|[+-]?(?:\d*\.)?\d+(?:px|rem|em|ch|ex|vh|vw|vmin|vmax|%|ms|s|deg)?|red|blue|green|white|black|yellow|orange|purple|pink|gray|grey|cyan|magenta|transparent)$/i.test(value);
        if (!completeLiteral) {
          const name = property.replace(/^--%NS%/, '--') || /^[\w-]+(?=:)/.exec(item.source)?.[0] || mode;
          const fixed = mapped.rule === 'literal-token' ? /Concrete value (.+?) in /.exec(mapped.message)?.[1] : undefined;
          const expression = fixed ? `${name}:(dynamic expression; fixed ${fixed})` : `${name}:(dynamic expression)`;
          mapped = { ...mapped, source: context === ctx ? `${location.text.slice(location.offset).split('\n')[0]} :: ${expression}` : expression };
        }
      }
      const identity = `${mapped.file}:${mapped.line}:${mapped.column}:${mapped.rule}:${mapped.message}:${mapped.source}`;
      // An unresolved expression gets one warning at the binding. Parser noise
      // from speculative string fragments must not multiply that same unknown.
      if (result.dynamic && fragmentCandidate && mapped.rule === 'unresolved') return;
      if (!emitted.has(identity)) { emitted.add(identity); context.emit(mapped); }
    } };
    for (const value of result.values) {
      fragmentCandidate = !!result.fragments && !complete.has(value);
      if (value === unknown || value === null || value === undefined || typeof value === 'boolean') continue;
      if (fragmentCandidate && typeof value === 'string' && cssUnitSuffix.test(value)) continue;
      if (Array.isArray(value)) { fragmentCandidate = false; inspectValue(arrayEvaluations.get(value) ?? { values: value, dynamic: false, fragments: result.fragments, completeValues: complete.has(value) ? value : undefined }, mode, property, location, unit, valueContext, classes); continue; }
      if (typeof value === 'object') {
        fragmentCandidate = false;
        for (const [key, entry] of Object.entries(value)) {
          if (mode === 'class') { if (possiblyTruthy(entry)) checkClasses(key, location, valueContext, classes); continue; }
          inspectValue(evaluatedMember(entry), 'style', key, location, '', valueContext, classes);
        }
      } else if (mode === 'class') checkClasses(String(value), location, valueContext, classes);
      else if (mode === 'css') checkCSS(String(value), location, valueContext);
      else checkStyle(property.replace(/^--%NS%/, '--'), String(value) + unit, location, valueContext);
    }
    const classProved = mode === 'class' && result.classDomain && proveClassDomain(result.classDomain, { utilities: context.utilities, resolveComputed: call => evaluator.computedCallBody(call), isTrustedInputRead: expression => evaluator.trustedInputRead(expression), intrinsicRegExpTestIntact: evaluator.classGuardIntact() });
    if (result.dynamic && !classProved) context.emit(diagnostic(location, 'unresolved', 'warning', `Cannot fully resolve ${mode === 'class' ? 'class list' : 'style value'} statically. Known literal branches were inspected.`, 'Use semantic tokens and review unresolved runtime values.'));
  }
  function angularValue(ast: any, members: Map<string, ts.Expression>, depth = 0): Evaluated {
    if (!ast || depth > 40) return { values: [], dynamic: true };
    const ev = (n: any) => angularValue(n, members, depth + 1);
    switch (angularKinds.get(ast.constructor)) {
      case 'ASTWithSource': return ev(ast.ast);
      case 'PrefixNot': { const result = ev(ast.expression); return { values: expanded(result.values).filter(value => value !== unknown).map(value => !value), dynamic: result.dynamic }; }
      case 'LiteralPrimitive': return { values: [ast.value as Value], dynamic: false };
      case 'LiteralArray': { const entries = ast.expressions.map(ev) as Evaluated[]; const value=entries.flatMap(e=>e.values);arrayEvaluations.set(value,combine(entries));return { values: [value], dynamic: entries.some(e => e.dynamic), fragments: entries.some(e => e.fragments) }; }
      case 'LiteralMap': { const result: { [key: string]: Value } = {}; let dynamic = false, fragments = false; ast.keys.forEach((key: any, i: number) => { const r = ev(ast.values[i]); result[key.key] = memberValue(r); dynamic ||= r.dynamic; fragments ||= !!r.fragments; }); return { values: [result], dynamic, fragments }; }
      case 'Conditional': return conditional(ev(ast.condition), () => ev(ast.trueExp), () => ev(ast.falseExp));
      case 'Call': {
        const receiver = ast.receiver;
        if (receiver instanceof PropertyRead && (receiver.receiver instanceof ImplicitReceiver || receiver.receiver instanceof ThisReceiver) ) {
          const expression = members.get(receiver.name);
          if (expression && ts.isPropertyDeclaration(expression.parent) && !ast.args.length) return evaluator.computedMemberValue(expression.parent);
          if (expression && ts.isMethodDeclaration(expression.parent)) return evaluator.methodValue(expression.parent, ast.args.map(ev));
        }
        return { values: [], dynamic: true };
      }
      case 'Binary': {
        const left = ev(ast.left);
        if (['||', '??', '&&'].includes(ast.operation)) return logical(left, () => ev(ast.right), ast.operation);
        const right = ev(ast.right);
        if (ast.operation === '+') return addition(left,right);
        return { values: [], dynamic: true };
      }
      case 'PropertyRead': if ((ast.receiver instanceof ImplicitReceiver || ast.receiver instanceof ThisReceiver) && members.has(ast.name)) {
        const expression = members.get(ast.name)!;
        const value = ts.isPropertyDeclaration(expression.parent) ? evaluator.declarationValue(expression.parent) : evaluator.evaluate(expression);
        return value;
      } return { values: [], dynamic: true };
      case 'Interpolation': { const pieces: Evaluated[] = ast.expressions.map(ev); return { values: [...ast.strings.filter((s: string) => s.trim()), ...pieces.flatMap((r: Evaluated) => r.values)], dynamic: true, fragments: true }; }
      default: return { values: [], dynamic: true };
    }
  }
  function literalOrigin(expression: ts.Expression, value: string, seen = new Set<ts.Node>()): ts.StringLiteralLike | undefined {
    if (seen.has(expression)) return; seen.add(expression);
    if (ts.isStringLiteralLike(expression)) return expression.text === value ? expression : undefined;
    if (ts.isArrayLiteralExpression(expression)) { for (const entry of expression.elements) { const origin = literalOrigin(ts.isSpreadElement(entry) ? entry.expression : entry as ts.Expression, value, seen); if (origin) return origin; } }
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) return literalOrigin(expression.expression, value, seen);
    let symbol = evaluator.symbol(expression); if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return literalOrigin(declaration.initializer, value, seen);
    return;
  }
  function literalPosition(literal: ts.StringLiteralLike): (offset: number) => number {
    const raw = literal.getText().slice(1, -1), positions: number[] = []; let i = 0;
    while (i < raw.length) {
      const start = i;
      if (raw[i] !== '\\') { positions.push(start); i += raw[i] === '\r' && raw[i + 1] === '\n' ? 2 : 1; continue; }
      i++; const escape = raw[i++];
      if (escape === '\n' || escape === '\r') { if (escape === '\r' && raw[i] === '\n') i++; continue; }
      if (escape === 'x') i += 2;
      else if (escape === 'u') { if (raw[i] === '{') { const close = raw.indexOf('}', i); const code = Number.parseInt(raw.slice(i + 1, close), 16); i = close < 0 ? raw.length : close + 1; if (code > 65535) positions.push(start); } else i += 4; }
      positions.push(start);
    }
    const base = literal.getStart() + 1; return offset => base + (positions[offset] ?? raw.length);
  }
  interface StyleUnit { value: string; expression: ts.Expression; fragments?: boolean }
  function styleUnits(expression: ts.Expression, seen = new Set<ts.Node>()): StyleUnit[] {
    if (seen.has(expression)) return []; seen = new Set(seen).add(expression);
    if (ts.isArrayLiteralExpression(expression)) return expression.elements.flatMap(e => styleUnits(ts.isSpreadElement(e) ? e.expression : e as ts.Expression, seen));
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) return styleUnits(expression.expression, seen);
    let symbol = evaluator.symbol(expression); if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return styleUnits(declaration.initializer, seen);
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const pieces = [...styleUnits(expression.left, seen), ...styleUnits(expression.right, seen)];
      // Complete stylesheet chunks retain provenance; incomplete fragments must be parsed after joining.
      if (pieces.length && pieces.every(p => { if (p.fragments) return false; try { postcss.parse(p.value); return true; } catch { return false; } })) return pieces;
    }
    const resolved = evaluator.evaluate(expression); return strings(resolved).map(value => ({ value, expression, fragments: resolved.fragments }));
  }
  const inlineStylesScanned = new Set<string>();
  const verifiedOrigins = new Map<string, boolean>();
  async function verifyOrigin(file: string): Promise<boolean> {
    if (all.has(file)) return true;
    if (verifiedOrigins.has(file)) return verifiedOrigins.get(file)!;
    const text = await safeFile(file); const valid = text !== undefined; verifiedOrigins.set(file, valid); if (valid) consumed.add(file); return valid;
  }
  function angularInput(declaration: Declaration, name: string): boolean {
    const node = declaration.node; if (!node) return declaration.kind === 'component';
    const m = metadata(node, checker); const explicit = m ? objectMetadata(m.expression, evaluator)?.get('inputs') : undefined;
    if (explicit && strings(evaluator.evaluate(explicit)).some(value => value.split(':').at(-1)?.trim() === name)) return true;
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && ['ɵcmp', 'ɵdir'].includes(propertyName(member.name) ?? '') && member.type && ts.isTypeReferenceNode(member.type)) {
        const inputs = member.type.typeArguments?.[3];
        if (inputs && ts.isTypeLiteralNode(inputs)) for (const input of inputs.members) if (ts.isPropertySignature(input) && input.type) {
          if (ts.isLiteralTypeNode(input.type) && ts.isStringLiteral(input.type.literal) && input.type.literal.text === name) return true;
          if (ts.isTypeLiteralNode(input.type) && input.type.members.some(alias => ts.isPropertySignature(alias) && propertyName(alias.name) === 'alias' && alias.type && ts.isLiteralTypeNode(alias.type) && ts.isStringLiteral(alias.type.literal) && alias.type.literal.text === name)) return true;
        }
      }
      for (const decorator of decorators(member)) {
        const call = ts.isCallExpression(decorator.expression) ? decorator.expression : undefined;
        if (coreExport(call?.expression ?? decorator.expression, node.getSourceFile(), checker) !== 'Input') continue;
        const values = call ? evaluator.evaluate(call.arguments[0]).values : [];
        const alias = values.flatMap(value => typeof value === 'string' ? [value] : value && typeof value === 'object' && !Array.isArray(value) && typeof value.alias === 'string' ? [value.alias] : [])[0];
        if ((alias ?? propertyName(member.name)) === name) return true;
      }
      if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer)) {
        const expression = member.initializer.expression;
        const input = coreExport(expression, node.getSourceFile(), checker) === 'input' || ts.isPropertyAccessExpression(expression) && expression.name.text === 'required' && coreExport(expression.expression, node.getSourceFile(), checker) === 'input';
        if (input) { const options = member.initializer.arguments.at(-1); const aliases = options ? evaluator.evaluate(options).values.flatMap(value => value && typeof value === 'object' && !Array.isArray(value) && typeof value.alias === 'string' ? [value.alias] : []) : []; if ((aliases[0] ?? propertyName(member.name)) === name) return true; }
      }
    }
    return false;
  }
  function inspectTemplate(file: string, text: string, template: string, offset: number, members = new Map<string, ts.Expression>(), scope?: Set<Declaration>, position?: (offset: number) => number, classes = globalClasses) {
    const parsed = parseTemplate(template, relative(root, file), { preserveWhitespaces: false }); checked++;
    if (parsed.errors?.length) { for (const error of parsed.errors) problem(file, 'parse-error', error.msg, text, position ? position(error.span.start.offset) : offset + error.span.start.offset); return; }
    const visited = new Set<object>();
    function visit(node: any, ancestors: string[]) {
      if (!node || typeof node !== 'object' || visited.has(node)) return; visited.add(node);
      const opening = node.startSourceSpan;
      const context = opening ? [...ancestors, template.slice(opening.start.offset, opening.end.offset)] : ancestors;
      const emitAtNode = (item: SourceDiagnostic) => {
        const finding = item.rule === 'unapproved-component' ? withBaselineSubject(item, 'Angular declaration', item.message) : item;
        ctx.emit(finding.severity === 'error' ? withBaselineContext(finding, 'Template', ...context.map(templateOpeningContext)) : finding);
      };
      if ((node.name || node.tagName) && node.attributes && node.inputs) {
        const elementName = node.name ?? 'ng-template';
        const renderedAttributes = node.name || node.tagName === 'ng-template' ? node.attributes : [];
        const renderedInputs = node.name || node.tagName === 'ng-template' ? node.inputs : [];
        const at = (item: any) => { const sourceOffset = item.sourceSpan?.start?.offset ?? node.sourceSpan?.start?.offset ?? 0; return loc(file, text, position ? position(sourceOffset) : offset + sourceOffset); };
        const startTag = template.slice(node.startSourceSpan?.start?.offset ?? node.sourceSpan.start.offset, node.startSourceSpan?.end?.offset ?? node.sourceSpan.end.offset);
        const bindingContext: StyleContext = { ...ctx, emit: item => emitAtNode({ ...item, source: `${startTag} :: ${item.source}` }) };
        const selector = new CssSelector(); selector.setElement(elementName);
        for (const attribute of renderedAttributes) {
          selector.addAttribute(attribute.name, attribute.value ?? '');
          if (attribute.name === 'class') { for (const name of attribute.value.split(/\s+/)) if (name) selector.addClassName(name); checkClasses(attribute.value, at(attribute), bindingContext, classes); }
          if (attribute.name === 'style') checkCSS(attribute.value, at(attribute), bindingContext);
          if (['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-family', 'font-weight'].includes(attribute.name) || ['width', 'height'].includes(attribute.name) && dom.hasElement(elementName, [])) checkStyle(attribute.name, attribute.value, at(attribute), bindingContext);
        }
        for (const input of renderedInputs) if (input.type === 0 || input.type === 5) selector.addAttribute(input.name, '');
        for (const output of node.outputs ?? []) selector.addAttribute(output.name, '');
        for (const input of node.templateAttrs ?? []) selector.addAttribute(input.name, '');
        const matching: Declaration[] = []; matcher.match(selector, (_s, declaration) => { if (!scope || all.has(declaration.file) || within(output, declaration.file) || !declaration.node || scope.has(declaration)) matching.push(declaration); });
        for (const declaration of matching) {
          checked++;
          if (!declaration.approved) emitAtNode(diagnostic(at(node), 'unapproved-component', 'error', `Unapproved Angular ${declaration.kind} ${declaration.name} (${declaration.external?.module ?? 'unknown module'}:${declaration.external?.export ?? declaration.name}) matches ${declaration.selector}.`, 'Approve the exported identity and module with a reason, or use a generated/local component.', template.slice(node.sourceSpan.start.offset, node.sourceSpan.end.offset)));
        }
        if (!dom.hasElement(elementName, []) && !['ng-template', 'ng-content'].includes(elementName) && !matching.some(d => d.kind === 'component')) emitAtNode(diagnostic(at(node), 'unapproved-component', 'error', `Unknown custom element ${elementName}; its Angular identity cannot be approved.`, 'Include the declaration in inspected sources or provide resolvable imported component metadata.', template.slice(node.sourceSpan.start.offset, node.sourceSpan.end.offset)));
        for (const input of renderedInputs) {
          if (input.type === 3) inspectValue(angularValue(input.value, members), 'style', input.name, at(input), input.unit ?? '', bindingContext, classes);
          else if (input.type === 2) { const value = angularValue(input.value, members); if (value.dynamic || value.values.some(possiblyTruthy)) inspectValue({ values: [input.name], dynamic: false }, 'class', '', at(input), '', bindingContext, classes); }
          else if (input.name === 'class' || input.name === 'ngClass') inspectValue(angularValue(input.value, members), 'class', '', at(input), '', bindingContext, classes);
          else if (input.name === 'style' || input.name === 'ngStyle') inspectValue(angularValue(input.value, members), input.name === 'ngStyle' ? 'style' : 'css', '', at(input), '', bindingContext, classes);
          else if (['width', 'height'].includes(input.name) && dom.hasElement(elementName, []) && (input.type === 1 || input.type === 0 && !matching.some(declaration => declaration.kind === 'component' || angularInput(declaration, input.name)))) inspectValue(angularValue(input.value, members), 'style', input.name, at(input), '', bindingContext, classes);
          else if (input.type === 1 && ['fill', 'stroke', 'opacity', 'font-size', 'stroke-width'].includes(input.name)) inspectValue(angularValue(input.value, members), 'style', input.name, at(input), '', bindingContext, classes);
        }
      }
      for (const key of ['children', 'branches', 'cases', 'nodes']) if (Array.isArray(node[key])) for (const child of node[key]) visit(child, context);
      for (const key of ['empty', 'placeholder', 'loading', 'error']) if (node[key]) visit(node[key], context);
    }
    for (const node of parsed.nodes) visit(node, []);
  }
  async function externalFile(owner: string, reference: string): Promise<{ file: string; text: string } | undefined> {
    const file = path.resolve(path.dirname(owner), reference);
    if (within(output, file) || path.relative(root, file).split(path.sep).some(p => forbidden.has(p))) { problem(owner, 'source-error', `External template/style points into excluded output: ${reference}.`); return; }
    const text = await safeFile(file); if (text === undefined) return; consumed.add(file); return { file, text };
  }
  function encapsulation(expression: ts.Expression | undefined, seen = new Set<ts.Node>()): 'global' | 'scoped' | 'shadow' | 'unknown' {
    if (!expression) return 'scoped';
    if (seen.has(expression)) return 'unknown'; seen = new Set(seen).add(expression);
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) return encapsulation(expression.expression, seen);
    if (ts.isPropertyAccessExpression(expression) && coreExport(expression.expression, expression.getSourceFile(), checker) === 'ViewEncapsulation') {
      if (expression.name.text === 'None') return 'global';
      if (expression.name.text === 'Emulated') return 'scoped';
      if (expression.name.text === 'ShadowDom') return 'shadow';
    }
    if (ts.isNumericLiteral(expression)) return expression.text === '2' ? 'global' : expression.text === '3' ? 'shadow' : expression.text === '0' ? 'scoped' : 'unknown';
    if (ts.isIdentifier(expression)) {
      let symbol = checker.getSymbolAtLocation(expression); if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      const declaration = symbol?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer && ts.isVariableDeclarationList(declaration.parent) && declaration.parent.flags & ts.NodeFlags.Const) return encapsulation(declaration.initializer, seen);
    }
    return 'unknown';
  }
  function domOrigin(node: ts.Expression): ts.Expression {
    const seen = new Set<ts.Node>();
    while (!seen.has(node)) {
      seen.add(node);
      if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) { node = node.expression; continue; }
      const declaration = ts.isIdentifier(node) && evaluator.symbol(node)?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) { node = declaration.initializer; continue; }
      break;
    }
    return node;
  }
  function domStyle(node: ts.Expression): boolean {
    const type = checker.getTypeAtLocation(node); const types = type.isUnion() ? type.types : [type];
    if (types.some(t => ['setProperty', 'cssText'].some(name => checker.getPropertyOfType(t, name)?.declarations?.some(declaration => {
      const file = declaration.getSourceFile().fileName; return path.basename(file) === 'lib.dom.d.ts' && libraryRoots.some(directory => within(directory, file));
    })))) return true;
    const origin = domOrigin(node);
    if (origin !== node) return domStyle(origin);
    const access = staticMember(node, checker);
    return access?.name === 'style' && domElement(access.receiver);
  }
  function domElement(expression: ts.Expression): boolean {
    const type = checker.getTypeAtLocation(expression);
    const types = type.isUnion() ? type.types : [type];
    if (types.some(t => checker.getPropertyOfType(t, 'setAttribute')?.declarations?.some(declaration => {
      const file = declaration.getSourceFile().fileName;
      return path.basename(file) === 'lib.dom.d.ts' && libraryRoots.some(directory => within(directory, file));
    }))) return true;
    const origin = domOrigin(expression);
    return origin !== expression && domElement(origin);
  }
  function renderer(expression: ts.Expression): boolean {
    const type = checker.getTypeAtLocation(expression);
    if (type.getSymbol()?.declarations?.some(declaration => declaration.getSourceFile().fileName.replaceAll('\\', '/').includes('/node_modules/@angular/core/')) && /\bRenderer2\b/.test(checker.typeToString(type))) return true;
    const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
    const declaration = symbol?.valueDeclaration;
    if (declaration && (ts.isParameter(declaration) || ts.isPropertyDeclaration(declaration)) && declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName)) {
      const identity = importedIdentity(declaration.type.typeName, declaration.getSourceFile());
      return identity?.module === '@angular/core' && identity.export === 'Renderer2';
    }
    return false;
  }
  function nativeDOMObject(expression:ts.Expression,names?:readonly string[]):boolean {
    const type=checker.getTypeAtLocation(expression), types=type.isUnion()?type.types:[type];
    if (types.some(value=>{const symbol=value.getSymbol();return !!symbol&&(!names||names.includes(symbol.name))&&!!symbol.declarations?.some(declaration=>path.basename(declaration.getSourceFile().fileName)==='lib.dom.d.ts'&&libraryRoots.some(directory=>within(directory,declaration.getSourceFile().fileName)));})) return true;
    const origin = domOrigin(expression);
    return origin !== expression && nativeDOMObject(origin, names);
  }
  function mutationDOMObject(expression:ts.Expression):boolean {
    if(domElement(expression))return true;
    if(nativeDOMObject(expression,['Attr','NamedNodeMap','CSSStyleDeclaration','Document','HTMLDocument','XMLDocument','DOMTokenList','DOMStringMap']))return true;
    const type=checker.getTypeAtLocation(expression),types=type.isUnion()?type.types:[type];
    return types.some(value=>{const name=value.getSymbol()?.name;return !!name&&name.startsWith('CSS')&&nativeDOMObject(expression);});
  }
  function styleAttribute(expression:ts.Expression,seen=new Set<ts.Node>()):boolean {
    if(seen.has(expression))return false;seen=new Set(seen).add(expression);
    while(ts.isParenthesizedExpression(expression)||ts.isAsExpression(expression)||ts.isNonNullExpression(expression))expression=expression.expression;
    const declaration=evaluator.symbol(expression)?.valueDeclaration;
    if(declaration&&ts.isVariableDeclaration(declaration)&&ts.isVariableDeclarationList(declaration.parent)&&declaration.parent.flags&ts.NodeFlags.Const&&declaration.initializer)return styleAttribute(declaration.initializer,seen);
    if(!ts.isCallExpression(expression))return false;
    const access=staticMember(expression.expression,checker);
    if(!access||!nativeDOMObject(access.receiver)||!access.name)return false;
    const position=access.name.endsWith('NS')?1:0;
    return ['getAttributeNode','getAttributeNodeNS','createAttribute','createAttributeNS'].includes(access.name)&&!!expression.arguments[position]&&constantString(expression.arguments[position]!,checker)==='style';
  }
  function standardObject(expression:ts.Expression):boolean {
    const symbol=evaluator.symbol(expression);
    return symbol?.name==='Object'&&!!symbol.declarations?.some(declaration=>libraryRoots.some(directory=>within(directory,declaration.getSourceFile().fileName)));
  }
  function styleAssignment(call:ts.CallExpression): {name:string;value:ts.Expression}[]|undefined {
    const method=staticMember(call.expression,checker);
    if(method?.name!=='assign'||!standardObject(method.receiver)||!evaluator.nativeIntact('Object')||call.arguments.length<2||!domStyle(call.arguments[0]!))return;
    const entries:{name:string;value:ts.Expression}[]=[];
    for(const argument of call.arguments.slice(1)) {
      if(!ts.isObjectLiteralExpression(argument))return;
      for(const property of argument.properties) {
        if(!ts.isPropertyAssignment(property))return;
        const name=ts.isComputedPropertyName(property.name)?constantString(property.name.expression,checker):propertyName(property.name);
        if(name===undefined)return;
        entries.push({name,value:property.initializer});
      }
    }
    return entries;
  }
  // Collect possible runtime mutations before checking any stylesheet aliases.
  // Unknown cssText/style bags or names prevent a static alias certification.
  let resetAllRuntimeProperties=false;
  let runtimeScopeUnsafe=false;
  const propertyWrites = new Set<string>();
  const externalPropertyValues = new Map<string,string[]>();
  const producerOwners = new Set<ts.ClassDeclaration>();
  const scopedProducers = new Map<ts.ClassDeclaration, ScopedCustomProperty[]>();
  type NativeSubject = { selectors: Set<string>; uncertainClasses: boolean; unknownClassNames: boolean; unknownId: boolean; values: Map<string, Evaluated>; uncertainStyles: boolean; ancestors: readonly NativeSubject[]; bindings: SelectorState; hostDetached: boolean };
  const nativeProducers = new Map<ts.ClassDeclaration, NativeSubject[]>();
  const hostProducers = new Map<ts.ClassDeclaration, Map<string, Evaluated>>();
  const hostWriters = new Map<string, Set<ts.ClassDeclaration>>();
  type SelectorState = { selectors: Set<string>; optional: Set<string>; classesUnknown: boolean; idUnknown: boolean; classAlternatives?: Set<string>[]; keyAlternatives?: SelectorState[][]; keyBranch?: object };
  const selectorState = (): SelectorState => ({ selectors: new Set(), optional: new Set(), classesUnknown: false, idUnknown: false, classAlternatives: [new Set()] });
  // Finite alternatives describe simultaneous class names. A union would make
  // mutually exclusive branches look like a possible compound selector.
  const joinClasses = (left: Set<string>[] | undefined, right: Set<string>[] | undefined): Set<string>[] | undefined => {
    if (!left || !right || left.length * right.length > 128) return undefined;
    return [...new Map(left.flatMap(a => right.map(b => { const merged = new Set([...a, ...b]); return [[...merged].sort().join(' '), merged] as const; }))).values()];
  };
  const classBranches = (entry: Value): Set<string>[] | undefined => {
    if (entry === unknown) return undefined;
    if (typeof entry === 'string') return [new Set(entry.split(/\s+/).filter(Boolean).map(name => '.' + name))];
    if (Array.isArray(entry)) {
      if (alternatives.has(entry)) {
        const branches = entry.map(classBranches);
        return branches.every(branch => !!branch) ? branches.flatMap(branch => branch!) : undefined;
      }
      return entry.reduce<Set<string>[] | undefined>((current, item) => joinClasses(current, classBranches(item)), [new Set()]);
    }
    if (entry && typeof entry === 'object') return Object.entries(entry).reduce<Set<string>[] | undefined>((current, [name, enabled]) => {
      const choices = evaluatedMember(enabled), values = expanded(choices.values);
      const branches: Set<string>[] = [];
      if (choices.dynamic || values.some(value => !possiblyTruthy(value))) branches.push(new Set());
      if (choices.dynamic || values.some(possiblyTruthy)) branches.push(...classBranches(name)!);
      return joinClasses(current, branches);
    }, [new Set()]);
    return [new Set()];
  };
  const mergeSelectors = (target: SelectorState, source: SelectorState) => {
    for (const selector of source.selectors) target.selectors.add(selector);
    for (const selector of source.optional) target.optional.add(selector);
    target.classesUnknown ||= source.classesUnknown; target.idUnknown ||= source.idUnknown;
    target.classAlternatives = joinClasses(target.classAlternatives, source.classAlternatives);
    if (source.keyAlternatives?.length) target.keyAlternatives = [...new Set([...(target.keyAlternatives ?? []), ...source.keyAlternatives])];
  };
  const bindingSelectors = (state: SelectorState, key: string, value: Evaluated, fixedKeys = false) => {
    const add = (selector: string) => { state.selectors.add(selector); state.optional.add(selector); };
    if (key.startsWith('class.')) {
      if (value.dynamic || value.values.some(possiblyTruthy)) add('.' + key.slice(6));
      const branches: Set<string>[] = [];
      if (value.dynamic || value.values.some(entry => !possiblyTruthy(entry))) branches.push(new Set());
      if (value.dynamic || value.values.some(possiblyTruthy)) branches.push(new Set(['.' + key.slice(6)]));
      state.classAlternatives = joinClasses(state.classAlternatives, branches);
    } else if (key === 'class' || key === 'ngClass') {
      const visit = (entry: Value): void => {
        if (typeof entry === 'string') for (const name of entry.split(/\s+/).filter(Boolean)) add('.' + name);
        else if (Array.isArray(entry)) for (const item of entry) visit(item);
        else if (entry && typeof entry === 'object') for (const [name, enabled] of Object.entries(entry)) if (possiblyTruthy(enabled)) visit(name);
      };
      for (const entry of wholeValues(value)) visit(entry);
      state.classesUnknown ||= !!value.fragments || value.dynamic && !fixedKeys;
      const branches = wholeValues(value).map(classBranches);
      state.classAlternatives = joinClasses(state.classAlternatives, !value.dynamic && !value.fragments && branches.every(branch => !!branch) ? branches.flatMap(branch => branch!) : undefined);
    } else if (key === 'id') {
      for (const entry of wholeValues(value)) if ((typeof entry === 'string' || typeof entry === 'number') && String(entry)) add('#' + entry);
      state.idUnknown ||= value.dynamic || !!value.fragments;
    }
  };
  const staticHostSelectors = new Map<ts.ClassDeclaration, Set<string>>();
  const hostSelectorStates = new Map<ts.ClassDeclaration, SelectorState>();
  const ownSelectorState = (owner: ts.ClassDeclaration) => { let state = hostSelectorStates.get(owner); if (!state) hostSelectorStates.set(owner, state = selectorState()); return state; };
  type Application = { owner: ts.ClassDeclaration; subject: NativeSubject; matches: Declaration[]; values: Map<string, Evaluated>; selectors: Set<string>; state: SelectorState };
  const templateApplications: Application[] = [];
  type HostApplication = { id: object; values: Map<string, Evaluated>; selectors: Set<string>; state: SelectorState; parent?: ts.ClassDeclaration; subject?: NativeSubject };
  const hostApplications = new Map<ts.ClassDeclaration, HostApplication[]>();
  const appliedNativeValues = new Map<Map<string, Evaluated>, Map<string, Evaluated>>();
  const unscopedProperties = new Set<string>();
  const ownedTemplates = new Set<string>();
  const recordWriter = (name: string, owner?: ts.ClassDeclaration, host = false) => {
    propertyWrites.add(name);
    if (!owner) unscopedProperties.add(name);
    if (owner && host) { const writers = hostWriters.get(name) ?? new Set(); writers.add(owner); hostWriters.set(name, writers); }
  };
  const mergeProducer = (values: Map<string, Evaluated>, name: string, result: Evaluated) => values.set(name, values.has(name) ? combine([values.get(name)!, result]) : result);
  ctx.customPropertyWrites = propertyWrites;
  const recordProperties = (result: Evaluated, value?:Evaluated) => {
    if (result.dynamic) ctx.customPropertyWrites = 'unknown';
    for (const name of strings(result)) if (name.startsWith('--')) {recordWriter(name);if(value&&!value.fragments)externalPropertyValues.set(name,[...(externalPropertyValues.get(name)??[]),...strings(value)]);}
  };
  const recordStyleText = (result: Evaluated) => {
    if (result.dynamic) ctx.customPropertyWrites = 'unknown';
    for (const value of strings(result)) {
      try { postcss.parse(value).walkDecls(declaration => { if (declaration.prop.startsWith('--')) { recordWriter(declaration.prop); if(!result.fragments)externalPropertyValues.set(declaration.prop,[...(externalPropertyValues.get(declaration.prop)??[]),declaration.value]); } }); }
      catch { ctx.customPropertyWrites = 'unknown'; }
    }
  };
  const recordReplacement=(result:Evaluated)=>{
    resetAllRuntimeProperties=true;
    recordStyleText(result);
  };
  const closedStyleAlias=(use:ts.Expression):boolean=>{
    const declaration=use.parent;
    if(!ts.isVariableDeclaration(declaration)||!ts.isIdentifier(declaration.name)||evaluator.exported(declaration)||declaration.initializer!==use||!ts.isVariableDeclarationList(declaration.parent)||!(declaration.parent.flags&ts.NodeFlags.Const))return false;
    return evaluator.references(declaration).every(reference=>{
      const parent=reference.parent;
      return ((ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent))&&parent.expression===reference)
        || ts.isCallExpression(parent)&&parent.arguments[0]===reference&&!!styleAssignment(parent);
    });
  };
  const readonlyDOMMethods=new Set(['getAttribute','getAttributeNS','getAttributeNode','getAttributeNodeNS','getAttributeNames','hasAttribute','hasAttributeNS','hasAttributes','getBoundingClientRect','getClientRects','querySelector','querySelectorAll','matches','closest','contains','compareDocumentPosition','getRootNode','checkVisibility','isDefaultNamespace','lookupNamespaceURI','lookupPrefix','hasChildNodes','getPropertyValue','getPropertyPriority','getComputedStyle','isSameNode','isEqualNode','item','getNamedItem','getNamedItemNS','toString','addEventListener','removeEventListener','createAttribute','createAttributeNS','createElement','createElementNS','createTextNode','createDocumentFragment']);
  const modeledDOMMethods=new Set(['setProperty','removeProperty','setStyle','removeStyle','setAttribute','removeAttribute','setAttributeNS','removeAttributeNS','setAttributeNode','setAttributeNodeNS','removeAttributeNode','toggleAttribute']);
  for (const [file] of all) {
    if (!file.endsWith('.ts')) continue;
    const source = program.getSourceFile(file); if (!source) continue;
    function visit(node: ts.Node) {
      if(ts.isTypeNode(node))return;
      const member=staticMember(node as ts.Expression,checker);
      if(member&&styleAttribute(member.receiver)&&evaluator.written(node as ts.Expression)) {
        runtimeScopeUnsafe=true;
        if(assignmentExpression(node.parent)&&node.parent.left===node&&['value','nodeValue','textContent'].includes(member.name??''))recordReplacement(assignedValue(node.parent));
        else ctx.customPropertyWrites='unknown';
      }
      if(member&&mutationDOMObject(member.receiver)) {
        if(checker.getTypeAtLocation(node as ts.Expression).flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown)){runtimeScopeUnsafe=true;ctx.customPropertyWrites='unknown';}
        if(evaluator.written(node as ts.Expression)) {
          const modeledStyle=domStyle(member.receiver)&&member.name!==undefined;
          const modeledElementStyle=domElement(member.receiver)&&member.name==='style';
          if(!modeledStyle&&!modeledElementStyle)runtimeScopeUnsafe=true;
          if(nativeDOMObject(member.receiver,['Attr'])) {
            runtimeScopeUnsafe=true;
            if(!styleAttribute(member.receiver))ctx.customPropertyWrites='unknown';
          }
        }
        const directCall=ts.isCallExpression(node.parent)&&node.parent.expression===node;
        const type=checker.getTypeAtLocation(node as ts.Expression);
        if(type.getCallSignatures().length&&!readonlyDOMMethods.has(member.name??'')&&!modeledDOMMethods.has(member.name??'')) {
          runtimeScopeUnsafe=true;
          if(nativeDOMObject(member.receiver,['CSSStyleSheet','CSSGroupingRule','CSSStyleRule','CSSKeyframesRule','CSSKeyframeRule','NamedNodeMap','Attr']))ctx.customPropertyWrites='unknown';
        }
        if(!directCall&&type.getCallSignatures().length&&modeledDOMMethods.has(member.name??''))ctx.customPropertyWrites='unknown';
      }
      if((ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)||ts.isCallExpression(node)||ts.isNewExpression(node)||ts.isIdentifier(node)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)&&!((ts.isVariableDeclaration(node.parent)||ts.isParameter(node.parent)||ts.isPropertyDeclaration(node.parent))&&node.parent.name===node))&&mutationDOMObject(node as ts.Expression)) {
        let use=node as ts.Expression;
        while((ts.isParenthesizedExpression(use.parent)||ts.isAsExpression(use.parent)||ts.isNonNullExpression(use.parent))&&use.parent.expression===use)use=use.parent;
        const parent=use.parent;
        const chained=(ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent))&&parent.expression===use;
        const readCall=ts.isCallExpression(parent)&&parent.arguments.includes(use)&&(()=>{const access=staticMember(parent.expression,checker),symbol=evaluator.symbol(parent.expression);return access&&readonlyDOMMethods.has(access.name??'')&&nativeDOMObject(access.receiver)||!!symbol&&readonlyDOMMethods.has(symbol.name)&&!!symbol.declarations?.some(declaration=>path.basename(declaration.getSourceFile().fileName)==='lib.dom.d.ts');})();
        const assign=ts.isCallExpression(parent)&&parent.arguments[0]===use&&domStyle(use)&&!!styleAssignment(parent);
        if(!chained&&!readCall&&!assign&&!closedStyleAlias(use)){runtimeScopeUnsafe=true;ctx.customPropertyWrites='unknown';}
      }
      if(member) {
        const unavailable=!!(checker.getTypeAtLocation(member.receiver).flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown));
        const method=member.name;
        const styleReceiver=domStyle(member.receiver), rendererReceiver=renderer(member.receiver), elementReceiver=domElement(member.receiver);
        const writer=method&&(['setProperty','removeProperty'].includes(method)&&(styleReceiver||unavailable)||['setStyle','removeStyle'].includes(method)&&(rendererReceiver||unavailable)||['setAttribute','removeAttribute','setAttributeNS','removeAttributeNS','setAttributeNode','setAttributeNodeNS','removeAttributeNode','toggleAttribute'].includes(method)&&(elementReceiver||rendererReceiver||unavailable));
        if(writer&&!(ts.isCallExpression(node.parent)&&node.parent.expression===node))ctx.customPropertyWrites='unknown';
        if(styleReceiver&&method===undefined)ctx.customPropertyWrites='unknown';
        // A style declaration object passed out of a property-read/call chain can
        // be mutated by aliases, Object.assign or arbitrary application helpers.
        if(styleReceiver) {
          const parent=member.receiver.parent;
          if(!(ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent))||parent.expression!==member.receiver)ctx.customPropertyWrites='unknown';
        }
      }
      if ((ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)||ts.isIdentifier(node)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)&&!((ts.isVariableDeclaration(node.parent)||ts.isParameter(node.parent)||ts.isPropertyDeclaration(node.parent))&&node.parent.name===node)) && domStyle(node as ts.Expression)) {
        let use:ts.Expression=node as ts.Expression;
        while((ts.isParenthesizedExpression(use.parent)||ts.isAsExpression(use.parent)||ts.isNonNullExpression(use.parent))&&use.parent.expression===use)use=use.parent;
        const parent=use.parent;
        if(!((ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent))&&parent.expression===use)&&!(ts.isCallExpression(parent)&&parent.arguments[0]===use&&styleAssignment(parent))&&!closedStyleAlias(use))ctx.customPropertyWrites='unknown';
      }
      if (ts.isCallExpression(node)) {
        const access=staticMember(node.expression,checker);
        if(access) {
          const method=access.name,receiver=access.receiver;
          if(nativeDOMObject(receiver)&&checker.getTypeAtLocation(node).flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown)){runtimeScopeUnsafe=true;ctx.customPropertyWrites='unknown';}
          const unavailable=!!(checker.getTypeAtLocation(receiver).flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown));
          if(method&&['setProperty','removeProperty'].includes(method)&&(domStyle(receiver)||unavailable))recordProperties(evaluator.evaluate(node.arguments[0]),method==='setProperty'&&domStyle(receiver)?evaluator.evaluate(node.arguments[1]):undefined);
          if(method&&['setStyle','removeStyle'].includes(method)&&(renderer(receiver)||unavailable))recordProperties(evaluator.evaluate(node.arguments[1]),method==='setStyle'&&renderer(receiver)?evaluator.evaluate(node.arguments[2]):undefined);
          if(method&&['setAttribute','removeAttribute'].includes(method)&&(domElement(receiver)||renderer(receiver)||unavailable)) {
            const names=evaluator.evaluate(node.arguments[renderer(receiver)?1:0]);
            if(names.dynamic)ctx.customPropertyWrites='unknown';
            else if(strings(names).includes('style')) {if(method==='removeAttribute')resetAllRuntimeProperties=true;else if(domElement(receiver)||renderer(receiver))recordReplacement(evaluator.evaluate(node.arguments[renderer(receiver)?2:1]));else ctx.customPropertyWrites='unknown';}
          }
          if(method&&['setAttributeNS','removeAttributeNS','toggleAttribute'].includes(method)&&(domElement(receiver)||unavailable)) {
            const names=evaluator.evaluate(node.arguments[method==='toggleAttribute'?0:1]);
            if(names.dynamic)ctx.customPropertyWrites='unknown';
            else if(strings(names).includes('style')) {if(method==='setAttributeNS'){if(domElement(receiver))recordReplacement(evaluator.evaluate(node.arguments[2]));else ctx.customPropertyWrites='unknown';}else resetAllRuntimeProperties=true;}
          }
          if(method&&['setAttributeNode','setAttributeNodeNS','removeAttributeNode'].includes(method)&&(domElement(receiver)||unavailable)){if(method==='removeAttributeNode')resetAllRuntimeProperties=true;else ctx.customPropertyWrites='unknown';}
          if(method&&['insertRule','replaceSync','replace'].includes(method)&&nativeDOMObject(receiver)) {runtimeScopeUnsafe=true;ctx.customPropertyWrites='unknown';recordStyleText(evaluator.evaluate(node.arguments[0]));}
          if(method&&nativeDOMObject(receiver,['NamedNodeMap'])&&['removeNamedItem','removeNamedItemNS','setNamedItem','setNamedItemNS'].includes(method)) {
            runtimeScopeUnsafe=true;
            if(method.startsWith('remove'))resetAllRuntimeProperties=true;else ctx.customPropertyWrites='unknown';
          }
          if(method==='assign'&&standardObject(receiver)&&node.arguments[0]&&nativeDOMObject(node.arguments[0],['Attr','NamedNodeMap','CSSStyleSheet','CSSStyleRule'])){runtimeScopeUnsafe=true;ctx.customPropertyWrites='unknown';}
          if(method==='assign'&&standardObject(receiver)&&node.arguments[0]&&domElement(node.arguments[0])) {
            if(!evaluator.nativeIntact('Object'))ctx.customPropertyWrites='unknown';
            for(const argument of node.arguments.slice(1)) {
              if(!ts.isObjectLiteralExpression(argument)){ctx.customPropertyWrites='unknown';continue;}
              for(const property of argument.properties){if(!ts.isPropertyAssignment(property)){ctx.customPropertyWrites='unknown';continue;}const key=ts.isComputedPropertyName(property.name)?constantString(property.name.expression,checker):propertyName(property.name);if(key===undefined)ctx.customPropertyWrites='unknown';else if(key==='style')recordReplacement(evaluator.evaluate(property.initializer));}
            }
          }
          if(method==='assign'&&standardObject(receiver)&&node.arguments[0]&&domStyle(node.arguments[0])) {
            const entries=styleAssignment(node);
            if(!entries)ctx.customPropertyWrites='unknown';
            else for(const entry of entries)if(entry.name==='cssText')recordReplacement(evaluator.evaluate(entry.value));else if(entry.name.startsWith('--')) {
              recordWriter(entry.name);
              const value=evaluator.evaluate(entry.value);
              if(!value.fragments)externalPropertyValues.set(entry.name,[...(externalPropertyValues.get(entry.name)??[]),...strings(value)]);
            }
          }
        }
      }
      if (ts.isDeleteExpression(node) && ts.isElementAccessExpression(node.expression) && domStyle(node.expression.expression)) recordProperties(evaluator.evaluate(node.expression.argumentExpression));
      const write = styleWrite(node);
      if (write) {
        const left = write.target, value = write.value;
        const access=staticMember(left,checker);
        if(access&&domStyle(access.receiver)&&access.name?.startsWith('--'))recordProperties({values:[access.name],dynamic:false},value());
        if(access?.name==='style'&&domElement(access.receiver))recordReplacement(value());
        if(access?.name==='cssText'&&domStyle(access.receiver))recordReplacement(value());
        if (ts.isPropertyAccessExpression(left) && left.name.text === 'cssText' && (domStyle(left.expression) || checker.getTypeAtLocation(left.expression).flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))) recordReplacement(value());
        if (ts.isElementAccessExpression(left) && domStyle(left.expression)) recordProperties(evaluator.evaluate(left.argumentExpression));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  function collectTemplateWrites(template: string, members = new Map<string, ts.Expression>(), owner?: ts.ClassDeclaration, host = false) {
    const parsed = parseTemplate(template, 'custom-property-write-coverage');
    if (parsed.errors?.length) { ctx.customPropertyWrites = 'unknown'; return; }
    const visited = new Set<object>();
    const ownerMetadata = owner && metadata(owner, checker);
    const imports = ownerMetadata && objectMetadata(ownerMetadata.expression, evaluator)?.get('imports');
    const scope = imports ? angularScope(imports) : new Set<Declaration>();
    function visit(node: any, ancestors: readonly NativeSubject[] = [], hostDetached = false) {
      if (!node || typeof node !== 'object' || visited.has(node)) return; visited.add(node);
      const bindings = selectorState();
      const values = new Map<string, Evaluated>(); let uncertainStyles = false, uncertainClasses = false, unknownClassNames = false, unknownId = false;
      const rendersElement = typeof node.name === 'string' && node.name !== 'ng-container' && node.name !== 'ng-template';
      const selectors = new Set<string>();
      if (typeof node.name === 'string') selectors.add(node.name);
      const record = (name: string, result: Evaluated) => {
        recordWriter(name, owner, host); mergeProducer(values, name, result);
      };
      const textStyle = (result: Evaluated) => {
        if (result.dynamic || result.values.some(value => typeof value !== 'string')) { uncertainStyles = true; ctx.customPropertyWrites = 'unknown'; }
        for (const value of strings(result)) try { postcss.parse(value).walkDecls(declaration => {
          if (declaration.prop.startsWith('--')) record(declaration.prop, {values:[declaration.value],dynamic:false});
        }); } catch { uncertainStyles = true; ctx.customPropertyWrites = 'unknown'; }
      };
      for (const attribute of rendersElement ? node.attributes ?? [] : []) {
        if (attribute.name === 'style') textStyle({ values: [attribute.value], dynamic: false });
        if (attribute.name === 'class') for (const name of attribute.value.split(/\s+/).filter(Boolean)) selectors.add('.'+name);
        if (attribute.name === 'id') selectors.add('#'+attribute.value);
      }
      for (const input of rendersElement ? node.inputs ?? [] : []) {
        if (input.type === 2) bindingSelectors(bindings, 'class.' + input.name, angularValue(input.value, members));
        else if (['class', 'ngClass', 'id'].includes(input.name)) bindingSelectors(bindings, input.name, angularValue(input.value, members), angularKinds.get((input.value.ast ?? input.value).constructor) === 'LiteralMap');
        if (input.type === 3 && input.name.startsWith('--')) {
          const result = angularValue(input.value, members);
          record(input.name.replace(/^--%NS%/, '--'), { ...result, values: result.values.map(value => typeof value === 'number' && input.unit ? `${value}${input.unit}` : value) });
        } else if (input.name === 'style') {uncertainStyles=true;ctx.customPropertyWrites='unknown';textStyle(angularValue(input.value, members));}
        else if (input.name === 'ngStyle') {
          uncertainStyles=true;ctx.customPropertyWrites='unknown';
          const result = angularValue(input.value, members);
          if (result.dynamic || !result.values.length || result.values.some(value => !value || typeof value !== 'object' || Array.isArray(value))) { uncertainStyles = true; ctx.customPropertyWrites = 'unknown'; }
          for (const value of result.values) if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, content] of Object.entries(value)) if (key.startsWith('--')) {
            record(key, evaluatedMember(content));
          }
        }
        if (input.name === 'class' || input.name === 'ngClass' || input.type === 2) unknownClassNames = true;
        if (input.name === 'id') unknownId = true;
        uncertainClasses = unknownClassNames || unknownId;
      }
      const subject: NativeSubject = { selectors, values, uncertainStyles, uncertainClasses, unknownClassNames, unknownId, ancestors, bindings, hostDetached };
      if (owner) {
        if (host) {
          mergeSelectors(ownSelectorState(owner), bindings);
          const producers = hostProducers.get(owner) ?? new Map<string, Evaluated>();
          for (const [name, result] of values) mergeProducer(producers, name, result);
          hostProducers.set(owner, producers);
        } else if (rendersElement) {
          const producers = nativeProducers.get(owner) ?? []; producers.push(subject); nativeProducers.set(owner, producers);
        }
      }
      if (!host && owner && rendersElement && node.attributes && node.inputs) {
        const selector = new CssSelector(); selector.setElement(node.name);
        for (const attribute of node.attributes) {
          selector.addAttribute(attribute.name, attribute.value ?? '');
          if (attribute.name === 'class') for (const name of attribute.value.split(/\s+/).filter(Boolean)) selector.addClassName(name);
        }
        for (const input of node.inputs) if (input.type === 0 || input.type === 5) selector.addAttribute(input.name, '');
        for (const output of node.outputs ?? []) selector.addAttribute(output.name, '');
        for (const input of node.templateAttrs ?? []) selector.addAttribute(input.name, '');
        const matches: Declaration[] = [];
        matcher.match(selector, (_selector, declaration) => { if (scope.has(declaration) && declaration.node) matches.push(declaration); });
        if (matches.length) templateApplications.push({ owner, subject, matches, values, selectors, state: bindings });
      }
      // An explicit template can be instantiated at a different outlet. Its
      // lexical parent is not a proven DOM ancestor. ng-container is transparent.
      const descendants = node.tagName === 'ng-template' ? [] : rendersElement ? [...ancestors, subject] : ancestors;
      const detached = hostDetached || node.tagName === 'ng-template';
      for (const key of ['children', 'branches', 'cases', 'nodes']) if (Array.isArray(node[key])) for (const child of node[key]) visit(child, descendants, detached);
      for (const key of ['empty', 'placeholder', 'loading', 'error']) if (node[key]) visit(node[key], descendants, detached);
    }
    for (const node of parsed.nodes) visit(node);
  }
  const globalStyleWrites = new Map<string, { name: string; value?: string; selector?: string }[]>();
  const sharedGlobalStyles = new Set<string>();
  const registeredCustomProperties = new Set<string>();
  const collectRegistrations = (css: string, scss: boolean) => {
    try { (scss ? scssParser.parse(css) : postcss.parse(css)).walkAtRules('property', rule => { registeredCustomProperties.add(rule.params.trim()); }); }
    catch { /* The normal stylesheet pass reports parse failures. */ }
  };
  let unknownGlobalStyleWrites = false;
  const collectGlobalStyleWrites = (css: string, scss = false, shared = false) => {
    if (shared) sharedGlobalStyles.add(css);
    if (globalStyleWrites.has(css)) return;
    const records: { name: string; value?: string; selector?: string }[] = [];
    try {
      const sheet = scss ? scssParser.parse(css) : postcss.parse(css);
      if (scss) sheet.walkAtRules(rule => { if (/^(mixin|include|extend|function|if|else|for|each|while|use|forward|import)$/.test(rule.name)) unknownGlobalStyleWrites = true; });
      sheet.walkDecls(declaration => {
        if (!declaration.prop.startsWith('--')) return;
        if (/\$|#\{/.test(declaration.prop)) unknownGlobalStyleWrites = true;
        const selector = declaration.parent?.type === 'rule' ? declaration.parent.selector : undefined;
        let simpleScope = true;
        for (let parent = declaration.parent?.parent; parent && parent.type !== 'root'; parent = parent.parent) {
          if (parent.type !== 'atrule' || !/^(media|container|supports|layer)$/.test(parent.name)) simpleScope = false;
        }
        // Candidate propagation accepts only compounds of tag/class/id anchors.
        // All other scopes still invalidate completeness for this name.
        const selectors = simpleScope ? selector?.split(',').map(value => value.trim()).filter(value => /^(?:[a-z][\w-]*)?(?:[.#][\w-]+)*$/.test(value) && !!value) ?? [] : [];
        if (!selectors.length) records.push({ name: declaration.prop });
        for (const selector of selectors) records.push({ name: declaration.prop, value: declaration.value, selector });
      });
      sheet.walkAtRules('property', rule => { records.push({ name: rule.params.trim() }); registeredCustomProperties.add(rule.params.trim()); });
    } catch { unknownGlobalStyleWrites = true; }
    globalStyleWrites.set(css, records);
  };
  const scopedStylesOwners = new Set<ts.ClassDeclaration>();
  const knownStylesOwners = new Set<ts.ClassDeclaration>();
  const shadowStylesOwners = new Set<ts.ClassDeclaration>();
  const unknownStylesOwners = new Set<ts.ClassDeclaration>();
  for (const [file, text] of all) {
    if (!file.endsWith('.ts')) continue;
    const source = program.getSourceFile(file); if (!source) continue;
    for (const node of classDeclarations(source)) {
      const m = metadata(node, checker); if (!m) continue;
      producerOwners.add(node);
      const recordHostValue = (name: string, result: Evaluated) => {
        recordWriter(name, node, true);
        const producers = hostProducers.get(node) ?? new Map<string, Evaluated>(); mergeProducer(producers, name, result); hostProducers.set(node, producers);
      };
      for (const member of node.members) for (const decorator of decorators(member)) {
        if (!ts.isCallExpression(decorator.expression)) continue;
        const api = coreExport(decorator.expression.expression, source, checker);
        if (api !== 'HostBinding') {
          if (!api && checker.getTypeAtLocation(decorator.expression.expression).flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
            ctx.customPropertyWrites = 'unknown'; const state = ownSelectorState(node); state.classesUnknown = state.idUnknown = true;
          }
          continue;
        }
        const keys = hostBindingKeys(decorator.expression, member);
        if (keys.dynamic) { ctx.customPropertyWrites = 'unknown'; const state = ownSelectorState(node); state.classesUnknown = state.idUnknown = true; }
        const value = ts.isPropertyDeclaration(member) ? evaluator.declarationValue(member) : { values: [], dynamic: true };
        const names = [...new Set(strings(keys))], state = ownSelectorState(node), branches: SelectorState[] = [];
        for (const raw of names) {
          const key = raw;
          const selectors = names.length > 1 ? selectorState() : state;
          bindingSelectors(selectors, key, value); branches.push(selectors);
          if (key.startsWith('style.--')) {
            const [name, unit] = key.slice(6).split('.');
            recordHostValue(name, { ...value, dynamic: value.dynamic || keys.dynamic || names.length > 1, values: value.values.map(item => typeof item === 'number' && unit ? `${item}${unit}` : item) });
          } else if (key === 'style') {
            // A replaceable style bag keeps coverage open. Its known values
            // belong to this host, never to the unscoped DOM mutation pool.
            ctx.customPropertyWrites = 'unknown';
            for (const text of strings(value)) {
              try { postcss.parse(text).walkDecls(declaration => { if (declaration.prop.startsWith('--')) recordHostValue(declaration.prop, { values: [declaration.value], dynamic: false }); }); }
              catch { ctx.customPropertyWrites = 'unknown'; }
            }
          }
        }
        if (names.length > 1 && branches.some(branch => branch.selectors.size || branch.classesUnknown || branch.idUnknown)) (state.keyAlternatives ??= []).push(branches);
      }
      const props = objectMetadata(m.expression, evaluator); if (!props) { ctx.customPropertyWrites = 'unknown'; continue; }
      const members = new Map<string, ts.Expression>(); for (const member of node.members) { const name = propertyName(member.name); if (name && ts.isPropertyDeclaration(member) && member.initializer) members.set(name, member.initializer); else if (name && ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) members.set(name, member.name); }
      const template = props.get('template');
      if (template) { const result = evaluator.evaluate(template); if (result.dynamic) ctx.customPropertyWrites = 'unknown'; for (const value of strings(result)) collectTemplateWrites(value, members, node); }
      const reference = props.get('templateUrl');
      if (reference) { const result = evaluator.evaluate(reference); if (result.dynamic) ctx.customPropertyWrites = 'unknown'; for (const name of strings(result)) { const external = await externalFile(file, name); if (external) { ownedTemplates.add(external.file); collectTemplateWrites(external.text, members, node); } else ctx.customPropertyWrites = 'unknown'; } }
      const host = props.get('host');
      if (host) {
        const result = evaluator.evaluate(host); if (result.dynamic) { ctx.customPropertyWrites = 'unknown'; const state = ownSelectorState(node); state.classesUnknown = state.idUnknown = true; }
        for (const value of result.values) if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, content] of Object.entries(value)) {
          if ((key === 'class' || key === 'id') && typeof content !== 'string') { const state = ownSelectorState(node); if (key === 'class') state.classesUnknown = true; else state.idUnknown = true; }
          if ((key === 'class' || key === 'id') && typeof content === 'string') {
            const selectors = staticHostSelectors.get(node) ?? new Set<string>();
            if (key === 'class') for (const name of content.split(/\s+/).filter(Boolean)) selectors.add('.' + name);
            else if (content) selectors.add('#' + content);
            staticHostSelectors.set(node, selectors);
          }
          if (key === 'style') collectTemplateWrites(`<div style="${String(content).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></div>`, members, node, true);
          if (/^\[(?:attr\.)?(?:style|ngStyle|class|ngClass|id)(?:\.|\])/.test(key) && typeof content === 'string') collectTemplateWrites(`<div ${key}="${content.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></div>`, members, node, true);
        }
      }
    }
  }
  for (const [file, text] of all) if (file.endsWith('.html') && !ownedTemplates.has(file)) collectTemplateWrites(text);
  // Transfer possible values only along actual same-element applications.
  // These are additional candidates, never a proof of cascade priority or of
  // complete writer coverage. Unrelated owners must not lend their values.
  for (const application of templateApplications) {
    const directiveValues = new Map<string, Evaluated>();
    for (const declaration of application.matches) for (const selector of staticHostSelectors.get(declaration.node!) ?? []) application.selectors.add(selector);
    for (const writer of application.matches) if (writer.kind === 'directive') {
      for (const [name, result] of hostProducers.get(writer.node!) ?? []) {
        mergeProducer(directiveValues, name, { ...result, dynamic: true, classDomain: undefined });
      }
    }
    const state = selectorState(); mergeSelectors(state, application.state);
    for (const declaration of application.matches) mergeSelectors(state, ownSelectorState(declaration.node!));
    Object.assign(application.state, state);
    for (const consumer of application.matches) {
      const values = new Map<string, Evaluated>();
      for (const [name, result] of application.values) mergeProducer(values, name, { ...result, dynamic: true, classDomain: undefined });
      for (const [name, result] of directiveValues) mergeProducer(values, name, result);
      const applications = hostApplications.get(consumer.node!) ?? [];
      applications.push({ id: {}, values, selectors: new Set(application.selectors), state, parent: application.owner, subject: application.subject });
      hostApplications.set(consumer.node!, applications);
    }
    // Keep foreign directive values separate from aggregate native producers.
    // Their candidate records carry the complete facts of this actual node.
    if (directiveValues.size) appliedNativeValues.set(application.values, directiveValues);
  }
  if(resetAllRuntimeProperties)for(const name of propertyWrites)unscopedProperties.add(name);
  const closedProducer = (result: Evaluated | undefined): boolean => !!result && !result.dynamic && result.values.length > 0
    && expanded(result.values).every(value => (typeof value === 'string' || typeof value === 'number') && !!String(value).trim() && !/^(initial|inherit|unset|revert|revert-layer)$/i.test(String(value).trim()));
  const wholeStrings = (result: Evaluated): string[] => wholeValues(result).filter(value => typeof value === 'string' || typeof value === 'number').map(String);
  const producerStrings = (result: Evaluated | undefined): string[] => result ? expanded(result.values).filter(value => typeof value === 'string' || typeof value === 'number').map(String).filter(value => !result.fragments || wholeStrings(result).includes(value) || !cssUnitSuffix.test(value)) : [];
  for (const owner of producerOwners) {
    const records: ScopedCustomProperty[] = [];
    const hostOrigin = { selectors: [':host'], host: true };
    for (const [name, result] of hostProducers.get(owner) ?? []) records.push({name,selector:':host',origin:hostOrigin,values:producerStrings(result),fragments:result.fragments,wholeValues:wholeStrings(result),complete:!runtimeScopeUnsafe && closedProducer(result) && !(hostApplications.get(owner) ?? []).some(application => application.values.has(name)) && !unscopedProperties.has(name) && [...(hostWriters.get(name) ?? [])].every(writer => writer === owner)});
    const nodes = nativeProducers.get(owner) ?? [];
    const selectors = new Set(nodes.flatMap(node => [...node.selectors]));
    for (const selector of selectors) {
      const matching = nodes.filter(node => node.selectors.has(selector) || node.uncertainClasses && (selector.startsWith('.') || selector.startsWith('#')));
      const names = new Set(matching.flatMap(node => [...node.values.keys()]));
      for (const name of names) {
        const complete = !runtimeScopeUnsafe && matching.length > 0 && matching.every(node => !node.uncertainStyles && !node.uncertainClasses && closedProducer(node.values.get(name)))
          && !unscopedProperties.has(name) && !(hostWriters.get(name)?.size);
        // Coverage still requires every matching node, including missing/reset
        // producers. Candidate values must retain their own element's facts.
        for (const node of matching) {
          const result = node.values.get(name);
          records.push({ name, selector, values: producerStrings(result), complete,
            fragments: result?.fragments, wholeValues: result ? wholeStrings(result) : [],
            subjectSelectors: [...node.selectors], partialSubject: true, subjectClassesUnknown: node.unknownClassNames, subjectIdUnknown: node.unknownId, subjectId: node.values,
            origin: { subjectId: node.values, selectors: [...node.selectors] } });
        }
      }
    }
    // Inheritance is only a possible candidate along actual template ancestry.
    // It cannot establish supply, override priority, or registered-property behavior.
    for (const node of nodes) for (const ancestor of node.ancestors) for (const [name, result] of [...ancestor.values, ...(appliedNativeValues.get(ancestor.values) ?? [])]) {
      for (const selector of node.selectors) records.push({ name, selector, values: producerStrings(result), fragments: result.fragments, wholeValues: wholeStrings(result), complete: false,
        subjectSelectors: [...node.selectors], partialSubject: true, subjectClassesUnknown: node.unknownClassNames, subjectIdUnknown: node.unknownId, subjectId: node.values, inherited: true,
        origin: { subjectId: ancestor.values, selectors: [...ancestor.selectors] } });
    }
    for (const node of nodes) for (const [name, result] of appliedNativeValues.get(node.values) ?? []) {
      for (const selector of node.selectors) records.push({ name, selector, values: producerStrings(result), fragments: result.fragments, wholeValues: wholeStrings(result), complete: false, subjectSelectors: [...node.selectors], subjectId: node.values,
        origin: { subjectId: node.values, selectors: [...node.selectors] } });
    }
    scopedProducers.set(owner, records);
  }
  for (const [file, text] of all) {
    if (!file.endsWith('.ts')) continue;
    const source = program.getSourceFile(file); if (!source) continue;
    for (const declaration of classDeclarations(source)) {
      const m = metadata(declaration, checker); if (m?.kind !== 'component') continue;
      const props = objectMetadata(m.expression, evaluator); const mode = encapsulation(props?.get('encapsulation'));
      if (mode === 'scoped' || mode === 'shadow') scopedStylesOwners.add(declaration);
      if (mode !== 'unknown') knownStylesOwners.add(declaration);
      if (mode === 'shadow') shadowStylesOwners.add(declaration);
      if (mode === 'unknown') unknownStylesOwners.add(declaration);
      if (mode === 'unknown') unresolved(file, text, props!.get('encapsulation')!.getStart(), 'Angular style encapsulation cannot be resolved; its class approvals remain component-local.');
      const ownClasses = new Set<string>(); componentClasses.set(declaration, ownClasses);
      const units: { css: string; scss: boolean }[] = []; componentStyleUnits.set(declaration, units);
      const addClasses = (css: string, scss = false) => { units.push({ css, scss }); collectRegistrations(css, scss); if (mode === 'global') collectGlobalStyleWrites(css, scss, true); for (const name of collectLocalClasses(css, scss)) { ownClasses.add(name); if (mode === 'global') globalClasses.add(name); } };
      const styles = props?.get('styles');
      if (styles) for (const unit of styleUnits(styles)) if (!within(output, unit.expression.getSourceFile().fileName) && await verifyOrigin(unit.expression.getSourceFile().fileName)) addClasses(unit.value);
      for (const key of ['styleUrl', 'styleUrls']) {
        const expression = props?.get(key); if (!expression) continue;
        for (const reference of strings(evaluator.evaluate(expression))) {
          const external = await externalFile(file, reference); if (!external) continue;
          externalStyleContent.set(external.file, external.text);
          (mode === 'global' ? globalExternalStyles : scopedExternalStyles).add(external.file);
          addClasses(external.text, external.file.endsWith('.scss'));
        }
      }
    }
  }
  // A stylesheet referenced by an encapsulated component is local even when it
  // is also in source_roots. A confirmed None consumer makes that sheet global.
  for (const [file, text] of all) if (/\.(css|scss)$/.test(file) && (!scopedExternalStyles.has(file) || globalExternalStyles.has(file))) { collectGlobalStyleWrites(text, file.endsWith('.scss')); for (const name of collectLocalClasses(text, file.endsWith('.scss'))) globalClasses.add(name); }
  for (const file of globalExternalStyles) for (const name of collectLocalClasses(externalStyleContent.get(file)!, file.endsWith('.scss'))) globalClasses.add(name);
  for (const classes of componentClasses.values()) for (const name of globalClasses) classes.add(name);
  // Stylesheet reachability depends only on containment, not on the bounded
  // supply/selector expansion below. Solve finite metadata links separately;
  // cycles, mixed locations and detached views remain unknown. Never promote a
  // missing parent context to document reachability just because traversal ends.
  const documentScopes = new Map<ts.ClassDeclaration, boolean>();
  const sharedScopes = new Map<ts.ClassDeclaration, boolean>();
  const applicationStyleScope = (application: HostApplication, shared: boolean): boolean | undefined => {
    if (!application.parent) return true;
    if (application.subject?.hostDetached || unknownStylesOwners.has(application.parent)) return undefined;
    if (shadowStylesOwners.has(application.parent)) return shared;
    return (shared ? sharedScopes : documentScopes).get(application.parent);
  };
  for (const shared of [false, true]) {
    const scopes = shared ? sharedScopes : documentScopes;
    let scopeChanged = true;
    while (scopeChanged) {
      scopeChanged = false;
      for (const owner of producerOwners) {
        if (scopes.has(owner)) continue;
        const locations = (hostApplications.get(owner) ?? []).map(application => applicationStyleScope(application, shared));
        const scope = locations.every(value => value === true) ? true : locations.every(value => value === false) ? false : undefined;
        if (scope !== undefined) { scopes.set(owner, scope); scopeChanged = true; }
      }
    }
  }
  type SelectorVariant = { selectors: string[]; subjectClassesUnknown: boolean; subjectIdUnknown: boolean; subjectOptionalSelectors: string[]; classBranch?: Set<string>; idBranch?: string; keyBranch?: object };
  const selectorBudgetWarnings = new Set<ts.ClassDeclaration>();
  // The incoming/native and receiving-host views share this frozen selector Set.
  // Reuse branch identities so their correlated variants can still be paired.
  const keySelectorStates = new WeakMap<Set<string>, SelectorState[]>();
  const selectorVariants = (fixed: Iterable<string>, state: SelectorState, owner: ts.ClassDeclaration): SelectorVariant[] => {
    if (state.keyAlternatives?.length) {
      const cached = keySelectorStates.get(state.selectors);
      if (cached) return cached.flatMap(choice => selectorVariants(fixed, choice, owner));
      let choices: SelectorState[] = [{ ...state, keyAlternatives: undefined }];
      for (const group of state.keyAlternatives) {
        const next: SelectorState[] = []; let truncated = false;
        for (const current of choices) for (const branch of group) {
          if (next.length >= 128) { truncated = true; continue; }
          const combined = selectorState(); mergeSelectors(combined, current); mergeSelectors(combined, branch);
          // A dynamic class value can erase classAlternatives. The key choice
          // still has to stay paired across the two views of this physical host.
          combined.keyBranch = {}; next.push(combined);
        }
        choices = next;
        if (truncated) {
          ctx.customPropertyWrites = 'unknown';
          if (!selectorBudgetWarnings.has(owner)) { const source = owner.getSourceFile(); unresolved(source.fileName, source.text, owner.getStart(), 'HostBinding selector alternatives exceed 128; bounded candidates were inspected and coverage remains unknown.'); selectorBudgetWarnings.add(owner); }
        }
      }
      keySelectorStates.set(state.selectors, choices);
      return choices.flatMap(choice => selectorVariants(fixed, choice, owner));
    }
    const base = [...fixed], all = new Set([...base, ...state.selectors]);
    const fixedClasses = base.filter(selector => selector.startsWith('.'));
    const branches = state.classAlternatives?.map(branch => ({ classes: new Set([...branch, ...fixedClasses]), identity: branch }));
    const ids = [...all].filter(selector => selector.startsWith('#'));
    return (branches?.length ? branches : [undefined]).flatMap(branch => (ids.length > 1 ? ids : [undefined]).map(id => {
      const selectors = [...all].filter(selector => (!branch || !selector.startsWith('.') || branch.classes.has(selector)) && (!id || !selector.startsWith('#') || selector === id));
      const optional = new Set([...state.optional].filter(selector => selectors.includes(selector)));
      if ([...optional].some(name => name.startsWith('.'))) for (const name of selectors) if (name.startsWith('.')) optional.add(name);
      if ([...optional].some(name => name.startsWith('#'))) for (const name of selectors) if (name.startsWith('#')) optional.add(name);
      return { selectors, subjectClassesUnknown: state.classesUnknown, subjectIdUnknown: state.idUnknown, subjectOptionalSelectors: [...optional], classBranch: branch?.identity, idBranch: id, keyBranch: state.keyBranch };
    }));
  };
  type HostContext = { id: object; owner: ts.ClassDeclaration; depth: number; values: Map<string, Evaluated>; facts: CustomPropertyOrigin; parent?: { context: HostContext; subject: NativeSubject } };
  const contextsByOwner = new Map<ts.ClassDeclaration, HostContext[]>();
  function ownerContexts(owner: ts.ClassDeclaration, path: readonly ts.ClassDeclaration[] = []): HostContext[] {
    const cached = contextsByOwner.get(owner); if (cached) return cached;
    const base = new Set(staticHostSelectors.get(owner));
    const applications = hostApplications.get(owner);
    // Declaration alternatives describe possible selectors, not simultaneous
    // facts on a receiving node. Actual applications already carry their facts.
    const fallbacks: HostApplication[] = (declaredSelectors.get(owner) ?? [new CssSelector()]).map(selector => {
      const selectors = new Set<string>();
      if (selector.element) selectors.add(selector.element);
      for (const name of selector.classNames) selectors.add('.' + name);
      for (let index = 0; index < selector.attrs.length; index += 2) if (selector.attrs[index] === 'id' && selector.attrs[index + 1]) selectors.add('#' + selector.attrs[index + 1]);
      return { id: { owner, selector }, values: new Map<string, Evaluated>(), selectors, state: ownSelectorState(owner) };
    });
    // An actual application already includes this owner's bindings exactly once.
    let parentBudget = 128;
    const contexts = (applications?.length ? applications : fallbacks).flatMap(application => {
      const variants = selectorVariants([...base, ...application.selectors], application.state, owner);
      // Reused child templates must remain tied to each real parent instance.
      // Recursive components and large graphs retain local candidates only;
      // these bounded links never certify that all writers were enumerated.
      const parentLimit = Math.min(32, Math.floor(parentBudget / variants.length));
      const expandable = application.parent && application.subject && path.length < 8 && ![...path, owner].includes(application.parent);
      const allParents = expandable ? ownerContexts(application.parent!, [...path, owner]) : [];
      const parents = allParents.filter(parent => parent.depth < 8).slice(0, parentLimit);
      const untracked = !!application.parent && (!expandable || parents.length < allParents.length);
      parentBudget = Math.max(0, parentBudget - parents.length * variants.length);
      return (parents.length ? parents : [undefined]).flatMap(parent => variants.map(variant => {
        const id = parent || variants.length > 1 ? { application: application.id, parent: parent?.id, variant } : application.id;
        const styleScope = (shared: boolean): boolean | undefined => application.subject?.hostDetached || application.parent && unknownStylesOwners.has(application.parent) ? undefined
          : application.parent && shadowStylesOwners.has(application.parent) ? shared
          : parent ? shared ? parent.facts.sharedStyles : parent.facts.documentStyles : applicationStyleScope(application, shared);
        return { id, owner, depth: parent ? parent.depth + 1 : 0, values: application.values, facts: { ...variant, applicationId: id, host: true, selectors: [':host', ...variant.selectors], documentStyles: styleScope(false), sharedStyles: styleScope(true),
          untrackedSupply: untracked || !application.subject?.hostDetached && parent?.facts.untrackedSupply },
          parent: parent && application.subject ? { context: parent, subject: application.subject } : undefined };
      }));
    });
    contextsByOwner.set(owner, contexts);
    return contexts;
  }
  for (const owner of producerOwners) ownerContexts(owner);
  const possibleGlobalSubject = (selector: string, facts: CustomPropertyOrigin): boolean => {
    const required = selector.match(/^[a-z][\w-]*|[.#][\w-]+/g) ?? [];
    return new Set(required.filter(anchor => anchor.startsWith('#'))).size <= 1 && required.length > 0 && required.every(anchor => facts.selectors.includes(anchor)
      || anchor.startsWith('.') && facts.subjectClassesUnknown || anchor.startsWith('#') && facts.subjectIdUnknown);
  };
  const nativeContexts = new Map<HostContext, Map<object, CustomPropertyOrigin[]>>();
  function nativeContext(application: HostContext): Map<object, CustomPropertyOrigin[]> {
    const cached = nativeContexts.get(application); if (cached) return cached;
    const variantsByNode = new Map<object, CustomPropertyOrigin[]>();
    for (const node of nativeProducers.get(application.owner) ?? []) {
      const variants = selectorVariants(node.selectors, node.bindings, application.owner);
      variantsByNode.set(node.values, variants.map(variant => ({ ...variant, applicationId: application.id, hostDetached: node.hostDetached,
        documentStyles: node.hostDetached || unknownStylesOwners.has(application.owner) ? undefined : shadowStylesOwners.has(application.owner) ? false : application.facts.documentStyles,
        sharedStyles: node.hostDetached || unknownStylesOwners.has(application.owner) ? undefined : shadowStylesOwners.has(application.owner) ? true : application.facts.sharedStyles,
        subjectId: variants.length > 1 ? { node: node.values, variant } : node.values })));
    }
    for (const node of nativeProducers.get(application.owner) ?? []) {
      const ancestors = node.ancestors.flatMap(ancestor => variantsByNode.get(ancestor.values) ?? []);
      for (const variant of variantsByNode.get(node.values) ?? []) variant.nativeAncestors = ancestors;
    }
    nativeContexts.set(application, variantsByNode);
    return variantsByNode;
  }
  const sourceContexts = new Map<HostContext, StyleContext>();
  const hostOrigins = (application: HostContext): CustomPropertyOrigin[] => {
    if (!application.parent) return [];
    const { context: parent, subject } = application.parent;
    return (nativeContext(parent).get(subject.values) ?? []).filter(origin =>
      origin.keyBranch === application.facts.keyBranch
      && (!origin.classBranch || !application.facts.classBranch || origin.classBranch === application.facts.classBranch)
      && (!origin.idBranch || !application.facts.idBranch || origin.idBranch === application.facts.idBranch));
  };
  const sourceContext = (application: HostContext): StyleContext => {
    let context = sourceContexts.get(application);
    if (!context) { context = stylesheetContext('', application.owner, scopedStylesOwners.has(application.owner), [application]); sourceContexts.set(application, context); }
    return context;
  };
  const sameHostSources = new Map<CustomPropertyOrigin, HostContext[]>();
  const ownHostResolvers = new Map<HostContext, ReturnType<typeof customPropertyResolver>>();
  const inheritedHostResolvers = new Map<HostContext, ReturnType<typeof customPropertyResolver>>();
  for (const applications of contextsByOwner.values()) for (const application of applications) if (application.parent) {
    const { context: parent } = application.parent;
    let resolvers: ReturnType<typeof customPropertyResolver>[] | undefined;
    application.facts.supply = name => {
      if (!resolvers) {
        // Both views describe the same physical host. Keep correlated finite
        // bindings paired; left/right alternatives cannot supply one another.
        resolvers = hostOrigins(application).map(origin => customPropertyResolver(sourceContext(parent), origin, 'incoming'));
      }
      const results = resolvers.map(resolve => resolve(name));
      return { complete: false, candidates: results.flatMap(result => result.candidates) };
    };
    if (knownStylesOwners.has(application.owner)) for (const origin of hostOrigins(application)) {
      // Known None components also write host metadata/HostBinding values;
      // their CSS keeps global selectors in sourceContext. An unknown outlet
      // or renderer cannot certify the shared-style tree for this peer layer.
      if (origin.sharedStyles !== true) continue;
      const sources = sameHostSources.get(origin) ?? [];
      sources.push(application); sameHostSources.set(origin, sources);
      origin.sameHost = name => ({ complete: false, candidates: sources.flatMap(child => {
        let resolve = ownHostResolvers.get(child);
        // Collect only this host layer now; its returned dependency resolvers
        // can consult incoming supply later, without synchronous query ping-pong.
        if (!resolve) { resolve = customPropertyResolver(sourceContext(child), child.facts, 'own'); ownHostResolvers.set(child, resolve); }
        return resolve(name).candidates;
      }) });
    }
  }
  // A missing bounded link cannot certify a parent-native alias as closed when
  // the co-located child's host layer has not been inspected.
  for (const [owner, applications] of hostApplications) if (knownStylesOwners.has(owner)) for (const application of applications) if (application.parent && application.subject) {
    for (const parent of contextsByOwner.get(application.parent) ?? []) for (const origin of nativeContext(parent).get(application.subject.values) ?? []) {
      if (!sameHostSources.get(origin)?.some(child => child.owner === owner)) origin.untrackedSupply = true;
    }
  }
  function stylesheetContext(css: string, owner?: ts.ClassDeclaration, componentStyles = false, applications?: readonly HostContext[]): StyleContext {
    const foreign = [...globalStyleWrites].filter(([source]) => source !== css).flatMap(([source, records]) => records.map(record => ({ ...record, shared: sharedGlobalStyles.has(source) })));
    const names = new Set(foreign.map(record => record.name));
    const writes = unknownGlobalStyleWrites || ctx.customPropertyWrites === 'unknown' ? 'unknown' : new Set([...(ctx.customPropertyWrites ?? []), ...names]);
    const records: ScopedCustomProperty[] = [];
    const hostSubjects: CustomPropertyOrigin[] = [], nativeSubjects: CustomPropertyOrigin[] = [];
    const hostConsumers = new Set<CustomPropertyOrigin>();
    const hostInheritance = new Map<CustomPropertyOrigin, CustomPropertyResolver>();
    // None styles have an owner for their source units, but their consumers can
    // belong to another component. Do not replace that consumer's application
    // identity with the stylesheet owner's or import its scoped definitions.
    const globalConsumer = !owner || !componentStyles && knownStylesOwners.has(owner);
    const contexts = applications ?? (owner && !globalConsumer ? contextsByOwner.get(owner) ?? [] : [...contextsByOwner.values()].flat());
    const sourceReaches = (facts: CustomPropertyOrigin, application: HostContext): boolean => !!owner && application.owner === owner
      || (owner ? facts.sharedStyles : facts.documentStyles) === true;
    for (const application of contexts) {
      const id = application.id, facts = application.facts;
      const nativeVariants = nativeContext(application);
      const hostReaches = sourceReaches(facts, application);
      // A standard ShadowDom's own root receives shared styles even when its
      // outer host placement is unknown. Test native and host reach separately.
      if (!hostReaches && ![...nativeVariants.values()].some(variants => variants.some(subject => sourceReaches(subject, application)))) continue;
      hostSubjects.push(facts);
      // Foreign component hosts already have a receiving native view in their
      // parent. Do not add a second generic None query that reflects incoming
      // inline values and destroys that native view's closed local coverage.
      if (hostReaches && (!owner || application.owner === owner)) hostConsumers.add(facts);
      const origin: CustomPropertyOrigin = componentStyles ? { applicationId: id, host: true, selectors: [':host'] } : facts;
      // A template node is reused by each component application. Its finite
      // selector branches also need distinct identities throughout alias recursion.
      for (const record of scopedProducers.get(application.owner) ?? []) {
        const subjects = record.subjectId ? nativeVariants.get(record.subjectId) ?? [undefined] : [undefined];
        for (const subject of subjects) {
          if (subject ? !sourceReaches(subject, application) : !hostReaches) continue;
          const origins = record.origin?.host ? [origin]
            : record.origin?.subjectId === record.subjectId && subject ? [subject]
            : record.origin?.subjectId ? nativeVariants.get(record.origin.subjectId) ?? [record.origin] : [record.origin];
          for (const computeOrigin of origins) records.push({ ...record, applicationId: id,
            subjectId: subject?.subjectId ?? record.subjectId,
            subjectSelectors: subject?.selectors ?? record.subjectSelectors,
            subjectClassesUnknown: subject?.subjectClassesUnknown ?? record.subjectClassesUnknown,
            subjectIdUnknown: subject?.subjectIdUnknown ?? record.subjectIdUnknown,
            subjectOptionalSelectors: subject?.subjectOptionalSelectors ?? record.subjectOptionalSelectors,
            complete: record.complete && !names.has(record.name) && (!subject || !subject.subjectClassesUnknown && !subject.subjectIdUnknown && !subject.subjectOptionalSelectors?.length),
            origin: computeOrigin ? { ...computeOrigin, applicationId: id } : undefined });
        }
      }
      if (hostReaches) for (const [name, value] of application.values) records.push({ name, selector: ':host', applicationId: id, origin, incomingHost: true,
        values: producerStrings(value), fragments: value.fragments, wholeValues: wholeStrings(value), complete: false });
      for (const variants of nativeVariants.values()) for (const nodeFacts of variants) {
        if (!sourceReaches(nodeFacts, application)) continue;
        nativeSubjects.push(nodeFacts);
        if (application.owner !== owner && !nodeFacts.hostDetached && knownStylesOwners.has(application.owner)) hostInheritance.set(nodeFacts, name => {
          let resolve = inheritedHostResolvers.get(application);
          if (!resolve) {
            resolve = customPropertyResolver(sourceContext(application), application.facts);
            inheritedHostResolvers.set(application, resolve);
          }
          // The inherited expression computes on the host, never on a leaf
          // with a homonymous local custom property. Returned resolvers keep it.
          return resolve(name);
        });
        for (const record of foreign) if ((record.shared ? nodeFacts.sharedStyles : nodeFacts.documentStyles) === true && record.selector && record.value !== undefined && possibleGlobalSubject(record.selector, nodeFacts)) {
          for (const selector of nodeFacts.selectors) records.push({ name: record.name, selector, values: [record.value], applicationId: id, complete: false,
            subjectSelectors: nodeFacts.selectors, subjectClassesUnknown: nodeFacts.subjectClassesUnknown,
            subjectIdUnknown: nodeFacts.subjectIdUnknown, subjectOptionalSelectors: nodeFacts.subjectOptionalSelectors, subjectId: nodeFacts.subjectId, origin: nodeFacts });
        }
      }
      if (hostReaches) for (const record of foreign) if ((record.shared ? facts.sharedStyles : facts.documentStyles) === true && record.selector && record.value !== undefined && possibleGlobalSubject(record.selector, facts)) {
        records.push({ name: record.name, selector: ':host', applicationId: id, origin, values: [record.value], complete: false });
      }
    }
    // Unattached global CSS still has its own selector-scoped candidates. These
    // carry no application values and never establish complete writer coverage.
    if (!owner) for (const record of foreign) if (record.selector && record.value !== undefined) records.push({ name: record.name, selector: record.selector, values: [record.value], complete: false });
    return { ...ctx, customPropertyWrites: writes, customPropertyValues: owner ? externalPropertyValues : ctx.customPropertyValues,
      registeredCustomProperties, scopedCustomProperties: records, componentStyles, hostSubjects, hostConsumers, nativeSubjects, hostInheritance,
      siblingStyles: owner ? componentStyleUnits.get(owner)?.filter(unit => unit.css !== css) : undefined };
  }
  for (const [file, text] of [...all]) {
    if (!file.endsWith('.ts')) continue;
    const sf = program.getSourceFile(file); if (!sf) continue;
    for (const node of classDeclarations(sf)) {
      const m = metadata(node, checker); if (!m) continue;
      const classes = componentClasses.get(node) ?? globalClasses;
      const properties = objectMetadata(m.expression, evaluator);
      if (!properties) { unresolved(file, text, m.expression.getStart(), 'Angular decorator metadata cannot be resolved statically.'); continue; }
      if (ts.isObjectLiteralExpression(m.expression) && m.expression.properties.some(p => !ts.isShorthandPropertyAssignment(p) && (!ts.isPropertyAssignment(p) || !propertyName(p.name)))) unresolved(file, text, m.expression.getStart(), 'Angular metadata includes unsupported spread or computed fields.');
      const members = new Map<string, ts.Expression>(); for (const member of node.members) { const name = propertyName(member.name); if (name && ts.isPropertyDeclaration(member) && member.initializer) members.set(name, member.initializer); else if (name && ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) members.set(name, member.name); }
      const inspectImports = (expression: ts.Expression, seen = new Set<ts.Node>()) => {
        if (seen.has(expression)) { unresolved(file, text, expression.getStart(), 'Cyclic Angular import metadata cannot be resolved.'); return; }
        seen = new Set(seen).add(expression);
        if (ts.isArrayLiteralExpression(expression)) { for (const entry of expression.elements) inspectImports(ts.isSpreadElement(entry) ? entry.expression : entry as ts.Expression, seen); return; }
        let symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
        const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
        if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) { inspectImports(declaration.initializer, seen); return; }
        if (declaration && ts.isClassDeclaration(declaration) && (metadata(declaration, checker) || confirmedPipe(declaration) || declaration.members.some(member => ['ɵcmp', 'ɵdir', 'ɵmod'].includes(propertyName(member.name) ?? '')))) return;
        unresolved(file, text, expression.getStart(), 'Imported Angular declaration/module metadata is unavailable; attribute directive coverage is incomplete.');
      };
      const imports = properties.get('imports'); if (imports) inspectImports(imports);
      const scope = imports ? angularScope(imports) : new Set<Declaration>();
      const selectorExpr = properties.get('selector'); if (selectorExpr && evaluator.evaluate(selectorExpr).dynamic) unresolved(file, text, selectorExpr.getStart(), 'Angular selector cannot be fully resolved.');
      for (const key of ['template', 'styles', 'templateUrl', 'styleUrl', 'styleUrls']) {
        const expression = properties.get(key); if (!expression) continue;
        const resolved = evaluator.evaluate(expression); if (resolved.dynamic) unresolved(file, text, expression.getStart(), `Angular ${key} cannot be fully resolved.`);
        for (const value of strings(resolved)) {
          if (key === 'template') {
            const origin = literalOrigin(expression, value); const sourceFile = origin?.getSourceFile();
            if (sourceFile && (within(output, sourceFile.fileName) || !(await verifyOrigin(sourceFile.fileName)))) continue;
            inspectTemplate(sourceFile?.fileName ?? file, sourceFile?.text ?? text, value, expression.getStart(), members, scope, origin ? literalPosition(origin) : undefined, classes);
          } else if (key === 'styles') {
            // Process once outside the value loop below, retaining literal source coordinates.
          }
          else { const external = await externalFile(file, value); if (external) { if (key === 'templateUrl') inspectTemplate(external.file, external.text, external.text, 0, members, scope, undefined, classes); else { const identity = `${external.file}:${file}:${node.getStart()}`; if (!stylesScanned.has(identity)) { stylesScanned.add(identity); checkCSS(external.text, loc(external.file, external.text), stylesheetContext(external.text, node, scopedStylesOwners.has(node)), external.file.endsWith('.scss')); } } } }
        }
        if (key === 'styles') for (const unit of styleUnits(expression)) {
          const sourceFile = unit.expression.getSourceFile(); if (within(output, sourceFile.fileName) || !(await verifyOrigin(sourceFile.fileName))) continue; const origin = literalOrigin(unit.expression, unit.value);
          const start = origin?.getStart() ?? unit.expression.getStart(); const identity = `${sourceFile.fileName}:${start}:${unit.value}:${file}:${node.getStart()}`;
          if (inlineStylesScanned.has(identity)) continue; inlineStylesScanned.add(identity);
          const position = origin ? literalPosition(origin) : undefined;
          const sourceContext: StyleContext = { ...stylesheetContext(unit.value, node, scopedStylesOwners.has(node)), emit: item => {
            let mapped = item;
            if (position) { const lines = unit.value.split('\n'); const logical = lines.slice(0, item.line - 1).reduce((sum, line) => sum + line.length + 1, 0) + item.column - 1; const prefix = sourceFile.text.slice(0, position(logical)); mapped = { ...item, line: prefix.split('\n').length, column: prefix.length - prefix.lastIndexOf('\n') }; }
            ctx.emit(unit.fragments && mapped.rule === 'parse-error' ? { ...mapped, rule: 'unresolved', severity: 'warning', message: 'Incomplete dynamic stylesheet fragment: ' + mapped.message } : mapped);
          } };
          checkCSS(unit.value, origin ? loc(sourceFile.fileName, unit.value) : loc(sourceFile.fileName, sourceFile.text, start), sourceContext);
        }
      }
      const host = properties.get('host');
      if (host) {
        const resolved = evaluator.evaluate(host); if (resolved.dynamic) unresolved(file, text, host.getStart(), 'Angular host metadata cannot be fully resolved.');
        for (const value of resolved.values) if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, content] of Object.entries(value)) {
          const location = loc(file, text, host.getStart());
          if (key === 'class') inspectValue({ values: [content], dynamic: content === unknown }, 'class', '', location, '', ctx, classes);
          else if (key === 'style') inspectValue({ values: [content], dynamic: content === unknown }, 'css', '', location, '', ctx, classes);
          else if (/^\[(?:attr\.)?(?:style|class|ngStyle|ngClass)(?:\.|\])/.test(key)) {
            if (typeof content === 'string') inspectTemplate(file, text, `<div ${key}="${content.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></div>`, host.getStart(), members, scope, undefined, classes);
            else unresolved(file, text, host.getStart(), `Cannot resolve host binding ${key}.`);
          }
        }
      }
      for (const member of node.members) for (const decorator of decorators(member)) {
        if (!ts.isCallExpression(decorator.expression)) continue;
        const api = coreExport(decorator.expression.expression, sf, checker);
        if (api !== 'HostBinding') {
          if (!api && checker.getTypeAtLocation(decorator.expression.expression).flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) unresolved(file, text, member.getStart(), 'Decorator identity is unavailable; host style/class coverage requires manual review.');
          continue;
        }
        const keys = hostBindingKeys(decorator.expression, member);
        const location = loc(file, text, member.getStart());
        if (keys.dynamic || !keys.values.length) unresolved(file, text, member.getStart(), 'Dynamic HostBinding key cannot be fully resolved; known keys were inspected.');
        for (const raw of new Set(strings(keys))) {
          const key = raw;
          if (!(key === 'class' || key === 'style' || key.startsWith('style.') || key.startsWith('class.'))) continue;
          if (key.startsWith('class.')) {
            const constant = ts.isPropertyDeclaration(member) && member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ? evaluator.evaluate(member.initializer) : undefined;
            if (!constant || constant.dynamic || constant.values.some(possiblyTruthy)) checkClasses(key.slice(6), location, ctx, classes);
          }
          else if (ts.isPropertyDeclaration(member)) { const [property, unit] = key.startsWith('style.') ? key.slice(6).split('.') : ['', '']; inspectValue(evaluator.declarationValue(member), key === 'class' ? 'class' : key === 'style' ? 'css' : 'style', property!, location, unit, ctx, classes); }
          else unresolved(file, text, member.getStart(), `Computed HostBinding ${key} cannot be resolved.`);
        }
      }
    }
    function attributeWrite(node: ts.CallExpression, name: ts.Expression | undefined, value: ts.Expression | undefined, classes = globalClasses) {
      const attribute = evaluator.evaluate(name); const names = strings(attribute); const location = loc(file, text, node.getStart());
      for (const name of names) {
        if (name === 'style') inspectValue(evaluator.evaluate(value), 'css', 'style', location, '', ctx, classes);
        else if (name === 'class') inspectValue(evaluator.evaluate(value), 'class', 'class', location, '', ctx, classes);
        else if (['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-family', 'font-weight', 'color', 'width', 'height'].includes(name)) inspectValue(evaluator.evaluate(value), 'style', name, location);
      }
      if (attribute.dynamic) unresolved(file, text, node.getStart(), 'Dynamic DOM attribute name may write class/style/presentation values and requires manual review.');
    }
    function unresolvedStyleReceiver(expression: ts.Expression): boolean { return ts.isPropertyAccessExpression(expression) && expression.name.text === 'style' && !!(checker.getTypeAtLocation(expression).flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)); }
    function visit(node: ts.Node, classes = globalClasses) {
      if (ts.isClassDeclaration(node)) classes = componentClasses.get(node) ?? globalClasses;
      const write = styleWrite(node);
      if (write) {
        const left = write.target, value = write.value;
        if(domStyle(left))inspectValue(value(),'css','style',loc(file,text,node.getStart()));
        else if (ts.isPropertyAccessExpression(left) && domStyle(left.expression)) inspectValue(value(), left.name.text === 'cssText' ? 'css' : 'style', left.name.text.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), loc(file, text, node.getStart()));
        else if (ts.isElementAccessExpression(left) && domStyle(left.expression)) {
          const names = evaluator.evaluate(left.argumentExpression), properties = strings(names);
          for (const property of new Set(properties)) inspectValue(value(), property === 'cssText' ? 'css' : 'style', property, loc(file, text, node.getStart()));
          if (names.dynamic || !properties.length) unresolved(file, text, node.getStart(), 'Dynamic DOM style property cannot be fully resolved; known names were inspected.');
        } else if ((ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) && unresolvedStyleReceiver(left.expression)) unresolved(file, text, node.getStart(), 'DOM style target type is unavailable; this style assignment requires manual review.');
      }
      if (ts.isCallExpression(node) && staticMember(node.expression,checker)) {
        const access=staticMember(node.expression,checker)!,receiver=access.receiver,method=access.name;
        const assignments=styleAssignment(node);
        if(assignments)for(const entry of assignments)inspectValue(evaluator.evaluate(entry.value),entry.name==='cssText'?'css':'style',entry.name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),loc(file,text,node.getStart()));
        if(method&&['insertRule','replaceSync','replace'].includes(method)&&nativeDOMObject(receiver))inspectValue(evaluator.evaluate(node.arguments[0]),'css','style',loc(file,text,node.getStart()));
        if(method==='setAttributeNS'&&domElement(receiver))attributeWrite(node,node.arguments[1],node.arguments[2],classes);
        if (method === 'setAttribute') {
          if (domElement(receiver)) attributeWrite(node, node.arguments[0], node.arguments[1], classes);
          else if (renderer(receiver)) attributeWrite(node, node.arguments[1], node.arguments[2], classes);
        }
        if (method === 'setProperty' && domStyle(receiver)) {
          const names = evaluator.evaluate(node.arguments[0]), properties = strings(names);
          for (const property of new Set(properties)) inspectValue(evaluator.evaluate(node.arguments[1]), 'style', property, loc(file, text, node.getStart()));
          if (names.dynamic || !properties.length) unresolved(file, text, node.getStart(), 'Dynamic DOM style property cannot be fully resolved; known names were inspected.');
        }
        if (method === 'setProperty' && !domStyle(receiver) && unresolvedStyleReceiver(receiver)) unresolved(file, text, node.getStart(), 'DOM style target type is unavailable; this setProperty call requires manual review.');
        if (method === 'setStyle' && renderer(receiver)) {
          const names = evaluator.evaluate(node.arguments[1]), properties = strings(names);
          for (const property of new Set(properties)) inspectValue(evaluator.evaluate(node.arguments[2]), 'style', property, loc(file, text, node.getStart()));
          if (names.dynamic || !properties.length) unresolved(file, text, node.getStart(), 'Dynamic Renderer2 style property cannot be fully resolved; known names were inspected.');
        }
        if (method && ['setOption', 'setPaintProperty'].includes(method)) unresolved(file, text, node.getStart(), 'Styling inside an external rendering engine requires manual review.');
      }
      ts.forEachChild(node, child => visit(child, classes));
    }
    visit(sf);
  }
  for (const [file, text] of all) {
    if (consumed.has(file)) continue;
    if (file.endsWith('.html')) inspectTemplate(file, text, text, 0);
    if (/\.(css|scss)$/.test(file)) checkCSS(text, loc(file, text), stylesheetContext(text), file.endsWith('.scss'));
  }
  // Exceptions are precise, auditable, and cannot suppress source/parse failures.
  const suppressed = new Set<SourceDiagnostic>();
  for (const exception of checks.exceptions) {
    const matches = diagnostics.filter(d => d.file === exception.file && d.rule === exception.rule && d.source.includes(exception.source) && (exception.line === undefined || d.line === exception.line) && (exception.column === undefined || d.column === exception.column));
    if (!isExceptableRule(exception.rule) || matches.length !== 1 || suppressed.has(matches[0]!)) problem(path.resolve(root, exception.file), 'exception-error', `Exception must match exactly one unsuppressed diagnostic: ${exception.rule} (${matches.length} matches).`, exception.source);
    else { const match = matches[0]!; suppressed.add(match); const { baseline_context: _context, baseline_subject: _subject, ...finding } = match; exceptions.push({ ...finding, exception: exception.reason }); }
  }
  let baseline: Map<string, number> | undefined;
  if (options.baselinePath !== undefined) {
    const file = path.resolve(root, options.baselinePath);
    if (path.isAbsolute(options.baselinePath) || options.baselinePath.split('/').some(part => !part || part === '.' || part === '..' || forbidden.has(part))
        || /[\\\u0000-\u001f<>:"|?*]/.test(options.baselinePath)) {
      problem(file, 'baseline-error', 'Use a normalized project-relative path for the diagnostic baseline.');
    } else {
      const text = await safeFile(file);
      if (text !== undefined) {
        try { baseline = readBaseline(text); }
        catch (error) { problem(file, 'baseline-error', `Cannot use source baseline: ${(error as Error).message}`); }
      }
    }
  }
  const existing: SourceDiagnostic[] = [];
  const active: SourceDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    if (suppressed.has(diagnostic)) continue;
    if (diagnostic.severity !== 'error' || !isExceptableRule(diagnostic.rule)) {
      active.push(diagnostic);
      continue;
    }
    const source = program.getSourceFile(path.resolve(root, diagnostic.file));
    const context = source ? typescriptBaselineContext(source, diagnostic.line, diagnostic.column) : [];
    const item = diagnostic.baseline_subject ? withBaselineContext(diagnostic, ...context) : { ...diagnostic, baseline_context: null };
    if (!baseline || !item.baseline_context) {
      active.push(item);
      continue;
    }
    const key = fingerprint(item), count = baseline.get(key) ?? 0;
    if (count > 0) {
      baseline.set(key, count - 1);
      existing.push(item);
    } else active.push(item);
  }
  const sort = (a: SourceDiagnostic, b: SourceDiagnostic) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule) || a.message.localeCompare(b.message);
  active.sort(sort); exceptions.sort(sort); existing.sort(sort);
  const valid = !active.some(d => d.severity === 'error');
  return { status: valid ? active.length ? 'warnings' : 'passed' : 'failed', valid, files: all.size + [...consumed].filter(f => !all.has(f)).length, checked, diagnostics: active, exceptions, source_roots: checks.source_roots,
    ...(baseline ? { existing_diagnostics: existing } : {}),
    ...(excludedProjects.length ? { excluded_projects: excludedProjects } : {}) };
}
