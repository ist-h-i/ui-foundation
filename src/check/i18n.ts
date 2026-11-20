import { AST, ASTWithSource, Binary, BindingPipe, Call, Chain, Conditional, ImplicitReceiver, Interpolation, KeyedRead, Lexer, LiteralArray, LiteralMap, LiteralPrimitive, NonNullAssert, ParseLocation, ParseSourceFile, ParseSourceSpan, Parser, PropertyRead, SafeCall, SafeKeyedRead, TmplAstElement, TmplAstLetDeclaration, SafePropertyRead, ThisReceiver } from '@angular/compiler';
import ts from 'typescript';
import type { I18nChecks } from './types.ts';

export type MessageArguments = Readonly<Record<string, readonly string[]>>;
export interface MessageDictionary {
  messages: ReadonlyMap<string, MessageArguments>;
  complete: boolean;
}
export type I18nRule = 'i18n-raw-text' | 'i18n-message-reference' | 'i18n-message-arguments' | 'i18n-fragment' | 'i18n-unconfirmed' | 'i18n-legacy-key';
export type I18nFinding = (rule: I18nRule, severity: 'error' | 'warning', message: string, suggestion: string, start: number, end: number, site?: string[], excerpt?: Span) => void;
type Argument = { kinds?: readonly string[]; start: number; end: number };
type Wrapper = 'request' | 'positional';
type LibraryImport = (specifier: ts.StringLiteralLike) => boolean;
type Span = { start: number; end: number };

const idSyntax = /^[A-Za-z][A-Za-z0-9_-]*(?:[.:/][A-Za-z0-9_-]+)*$/;
const parameterSyntax = /^[A-Za-z_$][\w$]*$/;
const types = new Set(['string', 'number', 'boolean', 'null']);
const bindingNames = new Set([
  'aria-label', 'aria-description', 'aria-valuetext', 'aria-roledescription', 'label', 'placeholder',
  'alt', 'title', 'textContent', 'innerText', 'innerHTML', 'message', 'errorMessage', 'notice', 'emptyMessage', 'loadingMessage',
]);
const legacyFunctions = new Set(['uiMessage', 'injectUiText']);
const bindingParser = new Parser(new Lexer());
function knownAngularId(value: AST | undefined): string | undefined {
  if (value instanceof LiteralPrimitive && typeof value.value === 'string') return value.value;
  if (value instanceof Binary && value.operation === '+') {
    const left = knownAngularId(value.left);
    const right = knownAngularId(value.right);
    if (left !== undefined && right !== undefined) return left + right;
  }
  if (value instanceof NonNullAssert) return knownAngularId(value.expression);
}
const displayInstruction = "Wrap display text in Angular i18n or call a configured function such as t('feature.message').";

export function readMessageDictionary(json: string, complete: boolean): MessageDictionary {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected a flat JSON object of message IDs.');
  const messages = new Map<string, MessageArguments>();
  for (const [id, entry] of Object.entries(data)) {
    if (!idSyntax.test(id) || id.startsWith('uiFoundation.')) throw new Error(`Invalid app-owned message ID ${JSON.stringify(id)}.`);
    if (typeof entry === 'string') {
      messages.set(id, Object.fromEntries([...entry.matchAll(/\{([A-Za-z_$][\w$]*)\}/g)].map(match => [match[1], []])));
      continue;
    }
    if (!entry || typeof entry !== 'object' || !('parameters' in entry) || !entry.parameters || typeof entry.parameters !== 'object' || Array.isArray(entry.parameters)) {
      throw new Error(`Expected text or a parameters object for ${JSON.stringify(id)}.`);
    }
    const parameters: [string, readonly string[]][] = [];
    for (const [name, kind] of Object.entries(entry.parameters)) {
      if (!parameterSyntax.test(name) || typeof kind !== 'string' || !types.has(kind)) throw new Error(`Invalid parameter ${JSON.stringify(name)} for ${JSON.stringify(id)}.`);
      parameters.push([name, [kind]]);
    }
    messages.set(id, Object.fromEntries(parameters));
  }
  return { messages, complete };
}

interface TemplateNode {
  name?: string;
  value?: AST | string;
  sourceSpan?: { start: { offset: number }; end: { offset: number } };
  i18n?: unknown;
  attributes?: TemplateNode[];
  inputs?: TemplateNode[];
  outputs?: { handler: AST }[];
  startSourceSpan?: TemplateNode['sourceSpan'];
  children?: TemplateNode[];
  branches?: TemplateNode[];
  cases?: TemplateNode[];
  placeholder?: TemplateNode;
  empty?: TemplateNode;
  loading?: TemplateNode;
  error?: TemplateNode;
  references?: { name: string }[];
  variables?: { name: string }[];
  item?: { name: string };
  contextVariables?: { name: string }[];
  expressionAlias?: { name: string };
}
function nodeSpan(node: TemplateNode): Span {
  return { start: node.sourceSpan?.start.offset ?? 0, end: node.sourceSpan?.end.offset ?? 0 };
}
function applicationText(value: unknown): value is string {
  return typeof value === 'string' && /\p{L}/u.test(value) && !/^\s*$/.test(value);
}
function referenceName(node: AST): string | undefined {
  if (node instanceof PropertyRead || node instanceof SafePropertyRead) {
    if (node.receiver instanceof ImplicitReceiver || node.receiver instanceof ThisReceiver) return node.name;
    const owner = referenceName(node.receiver);
    if (owner) return `${owner}.${node.name}`;
  }
}
function literalKind(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

function importedLibraryName(expression: ts.Expression, checker: ts.TypeChecker, isLibraryImport: LibraryImport): string | undefined {
  if (ts.isIdentifier(expression)) {
    const binding = checker.getSymbolAtLocation(expression)?.declarations?.find(ts.isImportSpecifier);
    const declaration = binding?.parent.parent.parent;
    if (binding && declaration && ts.isImportDeclaration(declaration) && ts.isStringLiteralLike(declaration.moduleSpecifier)
        && isLibraryImport(declaration.moduleSpecifier)) return (binding.propertyName ?? binding.name).text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const binding = checker.getSymbolAtLocation(expression.expression)?.declarations?.find(ts.isNamespaceImport);
    const declaration = binding?.parent.parent;
    if (declaration && ts.isImportDeclaration(declaration) && ts.isStringLiteralLike(declaration.moduleSpecifier)
        && isLibraryImport(declaration.moduleSpecifier)) return expression.name.text;
  }
}
function wrapperKind(name: string | undefined): Wrapper | undefined {
  if (name === 'injectUiMessage') return 'request';
  if (name === 'injectUiMessageText') return 'positional';
}
function typeKinds(type: ts.Type): string[] | undefined {
  if (type.isUnion()) {
    const parts = type.types.map(typeKinds);
    return parts.every(part => part !== undefined) ? parts.flatMap(part => part!) : undefined;
  }
  const flags = type.flags;
  const kind = flags & ts.TypeFlags.StringLike ? 'string' : flags & ts.TypeFlags.NumberLike ? 'number'
    : flags & ts.TypeFlags.BooleanLike ? 'boolean' : flags & ts.TypeFlags.Null ? 'null'
    : flags & ts.TypeFlags.BigIntLike ? 'bigint' : flags & ts.TypeFlags.Object ? 'object'
    : flags & ts.TypeFlags.Undefined ? 'undefined' : undefined;
  return kind ? [kind] : undefined;
}

export function createMessageChecks(config: I18nChecks, dictionaries: readonly MessageDictionary[], library: MessageDictionary) {
  const configuredFunction = new Set(config.functions);
  const configuredPipe = new Set(config.pipes);
  const display = new Set([...bindingNames, ...config.display_bindings]);
  function checkReference(name: string, id: unknown, args: Record<string, Argument> | undefined, span: Span, emit: I18nFinding, libraryOnly = false) {
    const warn = (message: string, suggestion: string) => emit('i18n-unconfirmed', 'warning', message, suggestion, span.start, span.end);
    if (typeof id !== 'string') {
      warn(`The message ID passed to ${name} cannot be determined statically.`, 'Use a stable literal ID or verify the complete set of possible IDs in the loaded dictionaries.');
      return;
    }
    const builtIn = libraryOnly || id.startsWith('uiFoundation.');
    if (!idSyntax.test(id)) {
      emit('i18n-legacy-key', 'error', `Expected a stable message ID in ${name}.`,
        'Move the displayed phrase to an ID in a selected dictionary and pass that ID.', span.start, span.end);
      return;
    }
    const candidates = builtIn ? [library] : dictionaries;
    const definitions = candidates.flatMap(source => source.messages.has(id) ? [source.messages.get(id)!] : []);
    if (!definitions.length) {
      if (candidates.length && candidates.every(source => source.complete)) {
        emit('i18n-message-reference', 'error', `Message ID "${id}" is absent from the selected dictionary scope.`,
          'Add the ID to a selected dictionary or correct the ID at the call site.', span.start, span.end);
      } else {
        warn(`Message ID "${id}" cannot be confirmed from the selected dictionaries.`,
          'Select its dictionary in checks.i18n.dictionaries or verify the lazy-loaded message at runtime.');
      }
      return;
    }
    if (args === undefined) {
      if (definitions.some(schema => Object.keys(schema).length)) warn(`Named arguments for "${id}" cannot be determined statically.`,
        'Pass the required arguments as a named object or verify the values in the loaded dictionary.');
      return;
    }
    const required = new Map<string, Set<string>>();
    for (const schema of definitions) {
      for (const [name, kinds] of Object.entries(schema)) {
        const known = required.get(name) ?? new Set<string>();
        for (const kind of kinds) known.add(kind);
        required.set(name, known);
      }
    }
    for (const [name, kinds] of required) {
      const accepted = [...kinds].sort();
      if (!Object.hasOwn(args, name)) {
        emit('i18n-message-arguments', 'error', `Message "${id}" requires the named argument "${name}".`,
          `Add { ${name}: value } to the call.`, span.start, span.end);
      } else if (accepted.length > 1 && !builtIn) {
        warn(`The selected dictionaries declare incompatible types for "${id}.${name}".`,
          'Use the same parameter definitions in each selected dictionary.');
      } else if (accepted.length && args[name].kinds?.every(kind => !accepted.includes(kind))) {
        emit('i18n-message-arguments', 'error', `Message "${id}" expects "${name}" to have type ${accepted.join(' or ')}.`,
          `Pass the original ${accepted.join(' or ')} value as "${name}".`, args[name].start, args[name].end, undefined, span);
      }
    }
  }
  function raw(text: unknown, span: Span, emit: I18nFinding) {
    if (applicationText(text)) emit('i18n-raw-text', 'warning', 'Display or accessible text is written directly in the source.', displayInstruction, span.start, span.end);
  }
  function fragment(span: Span, emit: I18nFinding) {
    emit('i18n-fragment', 'warning', 'Concatenation around a translated fragment fixes the sentence order in code.',
      'Translate the complete message and pass the inserted values as named arguments.', span.start, span.end);
  }
  function legacy(name: string, span: Span, emit: I18nFinding) {
    emit('i18n-legacy-key', 'error', `"${name}" uses the former source-text translation API.`,
      'Use uiStableMessage with a library ID, or a configured app translator with an app-owned ID.', span.start, span.end);
  }

  function angularArguments(value: AST | undefined): Record<string, Argument> | undefined {
    if (!value) return {};
    if (!(value instanceof LiteralMap)) return;
    if (value.keys.some(key => !('key' in key))) return;
    return Object.fromEntries(value.keys.flatMap((key, index) => {
      if (!('key' in key)) return [];
      const expression = value.values[index];
      const kind = expression instanceof LiteralPrimitive ? literalKind(expression.value)
        : knownAngularId(expression) !== undefined ? 'string'
        : expression instanceof LiteralArray ? 'array' : expression instanceof LiteralMap ? 'object' : undefined;
      return [[key.key, { ...expression.sourceSpan, kinds: kind ? [kind] : undefined }]];
    }));
  }
  function angularField(value: LiteralMap, name: string): AST | undefined {
    for (let index = value.keys.length - 1; index >= 0; index--) {
      const key = value.keys[index];
      if ('key' in key && key.key === name) return value.values[index];
    }
  }
  type TemplateWrapper = (receiver: AST) => Wrapper | undefined;
  type ViewLocals = Map<string, string | undefined>;
  const implicitName = (receiver: AST): string | undefined => {
    if (receiver instanceof PropertyRead || receiver instanceof SafePropertyRead) {
      return receiver.receiver instanceof ImplicitReceiver ? receiver.name : implicitName(receiver.receiver);
    }
  };
  function componentName(receiver: AST, locals: ViewLocals): string | undefined {
    const root = implicitName(receiver);
    return root && locals.has(root) ? undefined : referenceName(receiver);
  }
  function angularTranslation(value: AST, wrapper: TemplateWrapper, locals: ViewLocals): boolean {
    if (value instanceof ASTWithSource) return angularTranslation(value.ast, wrapper, locals);
    if (value instanceof BindingPipe) return value.name === 'uiStableMessage' || configuredPipe.has(value.name);
    if (value instanceof Call || value instanceof SafeCall) {
      const name = componentName(value.receiver, locals);
      return !!name && (!!wrapper(value.receiver) || configuredFunction.has(name));
    }
    return false;
  }
  function inspectAngular(value: AST, shown: boolean, emit: I18nFinding, members: ReadonlyMap<string, ts.Expression>, wrapper: TemplateWrapper, locals: ViewLocals) {
    if (value instanceof ASTWithSource) return inspectAngular(value.ast, shown, emit, members, wrapper, locals);
    if (value instanceof Chain) {
      for (const expression of value.expressions) inspectAngular(expression, shown, emit, members, wrapper, locals);
      return;
    }
    if (value instanceof NonNullAssert) return inspectAngular(value.expression, shown, emit, members, wrapper, locals);
    if (value instanceof BindingPipe) {
      if (value.name === 'uiMessage' && !configuredPipe.has(value.name)) { legacy(value.name, value.sourceSpan, emit); return; }
      if (angularTranslation(value, wrapper, locals)) {
        checkReference(value.name, knownAngularId(value.exp), angularArguments(value.args[0]), value.sourceSpan, emit, value.name === 'uiStableMessage' && !configuredPipe.has(value.name));
        return;
      }
      inspectAngular(value.exp, shown, emit, members, wrapper, locals);
      return;
    }
    if (value instanceof Call || value instanceof SafeCall) {
      const name = componentName(value.receiver, locals);
      if (shown && name) {
        const initializer = members.get(name);
        if (initializer) inspectDisplayInitializer(initializer, value.sourceSpan, emit, members);
      }
      const kind = name && wrapper(value.receiver);
      if (name && kind === 'request') {
        const request = value.args[0];
        const object = request instanceof LiteralMap && request.keys.every(key => 'key' in key) ? request : undefined;
        checkReference(name, object && knownAngularId(angularField(object, 'id')),
          object ? angularArguments(angularField(object, 'parameters')) : undefined, value.sourceSpan, emit, true);
      } else if (name && (kind === 'positional' || configuredFunction.has(name))) {
        checkReference(name, knownAngularId(value.args[0]), angularArguments(value.args[1]), value.sourceSpan, emit, !!kind);
      }
      else for (const argument of value.args) inspectAngular(argument, false, emit, members, wrapper, locals);
      return;
    }
    if (value instanceof Conditional) {
      inspectAngular(value.trueExp, shown, emit, members, wrapper, locals);
      inspectAngular(value.falseExp, shown, emit, members, wrapper, locals);
      return;
    }
    if (value instanceof Interpolation) {
      if (shown && value.strings.some(applicationText)) {
        if (value.expressions.some(expression => angularTranslation(expression, wrapper, locals))) fragment(value.sourceSpan, emit);
        raw(value.strings.join(''), value.sourceSpan, emit);
      }
      for (const expression of value.expressions) inspectAngular(expression, shown, emit, members, wrapper, locals);
      return;
    }
    if (value instanceof Binary) {
      if (value.operation === '+' && (angularTranslation(value.left, wrapper, locals) || angularTranslation(value.right, wrapper, locals))) fragment(value.sourceSpan, emit);
      if (['+', '||', '??'].includes(value.operation)) {
        inspectAngular(value.left, shown, emit, members, wrapper, locals);
        inspectAngular(value.right, shown, emit, members, wrapper, locals);
      }
      return;
    }
    if (shown && (value instanceof KeyedRead || value instanceof SafeKeyedRead)) {
      const owner = componentName(value.receiver, locals);
      const initializer = owner && members.get(owner);
      if (initializer) {
        const key = value.key instanceof LiteralPrimitive && typeof value.key.value === 'string' ? value.key.value : undefined;
        inspectMapValue(initializer, key, value.sourceSpan, emit, members, new Set());
      }
    }
    if (shown && value instanceof LiteralPrimitive) raw(value.value, value.sourceSpan, emit);
    if (shown && (value instanceof PropertyRead || value instanceof SafePropertyRead)) {
      if (value.receiver instanceof ImplicitReceiver && locals.has(value.name)) {
        raw(locals.get(value.name), value.sourceSpan, emit);
        return;
      }
      const name = componentName(value, locals);
      const initializer = name && members.get(name);
      if (initializer) inspectDisplayInitializer(initializer, value.sourceSpan, emit, members);
      const owner = componentName(value.receiver, locals);
      const map = owner && members.get(owner);
      if (map) inspectMapValue(map, value.name, value.sourceSpan, emit, members, new Set());
    }
  }

  function propertyKey(name: ts.PropertyName) {
    const node = ts.isComputedPropertyName(name) ? name.expression : name;
    return ts.isIdentifier(node) && !ts.isComputedPropertyName(name) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)
      ? node.text : undefined;
  }
  function inspectMapValue(map: ts.Expression, key: string | undefined, span: Span, emit: I18nFinding, members: ReadonlyMap<string, ts.Expression>, seen: Set<ts.Node>) {
    if (ts.isAsExpression(map) || ts.isSatisfiesExpression(map) || ts.isParenthesizedExpression(map)) {
      inspectMapValue(map.expression, key, span, emit, members, seen);
    } else if (ts.isObjectLiteralExpression(map)) {
      for (const item of map.properties) {
        if (ts.isPropertyAssignment(item) && (key === undefined || propertyKey(item.name) === key)) {
          inspectDisplayInitializer(item.initializer, span, emit, members, seen);
        }
      }
    }
  }

  function inspectDisplayInitializer(expression: ts.Expression, span: Span, emit: I18nFinding, members: ReadonlyMap<string, ts.Expression>, seen = new Set<ts.Node>()): void {
    if (seen.has(expression)) return;
    seen.add(expression);
    const inspect = (value: ts.Expression) => inspectDisplayInitializer(value, span, emit, members, seen);
    if (ts.isStringLiteralLike(expression)) raw(expression.text, span, emit);
    else if (ts.isConditionalExpression(expression)) {
      inspect(expression.whenTrue);
      inspect(expression.whenFalse);
    } else if (ts.isIdentifier(expression) && ts.isMethodDeclaration(expression.parent)) {
      const method = expression.parent;
      if (method.body) for (const statement of method.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression) inspect(statement.expression);
      }
    } else if (ts.isElementAccessExpression(expression) || ts.isPropertyAccessExpression(expression)) {
      const owner = expression.expression;
      if (ts.isPropertyAccessExpression(owner) && owner.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const map = members.get(owner.name.text);
        const argument = ts.isElementAccessExpression(expression) ? expression.argumentExpression : expression.name;
        const key = ts.isPropertyAccessExpression(expression) || ts.isStringLiteralLike(argument) ? argument.getText().replace(/^['"]|['"]$/g, '') : undefined;
        if (map) inspectMapValue(map, key, span, emit, members, seen);
      }
    } else if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
        && ['input', 'model', 'signal'].includes(expression.expression.text) && expression.arguments[0]) {
      inspect(expression.arguments[0]);
    } else if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isParenthesizedExpression(expression)) {
      inspect(expression.expression);
    } else if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.PlusToken].includes(expression.operatorToken.kind)) {
      inspect(expression.left);
      inspect(expression.right);
    }
  }

  function memberWrapper(members: ReadonlyMap<string, ts.Expression>, checker: ts.TypeChecker, libraryImport: LibraryImport): TemplateWrapper {
    return receiver => {
      if (!(receiver instanceof PropertyRead || receiver instanceof SafePropertyRead)
          || !(receiver.receiver instanceof ThisReceiver || receiver.receiver instanceof ImplicitReceiver)) return;
      const expression = members.get(receiver.name);
      if (expression && ts.isCallExpression(expression)) return wrapperKind(importedLibraryName(expression.expression, checker, libraryImport));
    };
  }

  function template(nodes: readonly TemplateNode[], emit: I18nFinding, members: ReadonlyMap<string, ts.Expression>, context: (start: number, end: number) => string,
                    checker: ts.TypeChecker, libraryImport: LibraryImport) {
    const wrapper = memberWrapper(members, checker, libraryImport);
    const visited = new Set<TemplateNode>();

    function view(nodes: readonly TemplateNode[], parent: ViewLocals, shadowed: readonly { name: string }[] = []): ViewLocals {
      const locals = new Map(parent);
      for (const alias of shadowed) locals.set(alias.name, undefined);
      function references(node: TemplateNode) {
        for (const reference of node.references ?? []) locals.set(reference.name, undefined);
        // Plain elements share the containing view. Embedded templates and control-flow blocks have their own.
        if (node instanceof TmplAstElement) for (const child of node.children) references(child);
      }
      for (const node of nodes) references(node);
      return locals;
    }

    function walk(node: TemplateNode, locals: ViewLocals, translate = false, invisible = false, ancestor: string[] = []) {
      if (visited.has(node)) return;
      visited.add(node);
      const current = node.startSourceSpan;
      const site = current ? [...ancestor, context(current.start.offset, current.end.offset)] : ancestor;
      const local: I18nFinding = (rule, severity, message, suggestion, start, end, _, excerpt) =>
        emit(rule, severity, message, suggestion, start, end, site, excerpt);
      const attrs = node.attributes ?? [];
      const buttonInput = node.name === 'input' && attrs.some(attribute =>
        attribute.name === 'type' && typeof attribute.value === 'string' && /^(?:submit|reset|button)$/i.test(attribute.value));
      const angularI18n = translate || !!node.i18n || attrs.some(attribute => attribute.name === 'i18n');
      const hidden = invisible || ['script', 'style'].includes(node.name ?? '');
      for (const attribute of [...attrs, ...(node.inputs ?? [])]) {
        const translated = attrs.some(marker => marker.name === `i18n-${attribute.name}`) || !!attribute.i18n;
        const name = attribute.name?.replace(/^attr\./, '') ?? '';
        const shown = !hidden && !translated && (display.has(name) || (buttonInput && name === 'value'));
        if (typeof attribute.value === 'string') {
          if (shown) raw(attribute.value, nodeSpan(attribute), local);
        } else if (attribute.value) inspectAngular(attribute.value, shown, local, members, wrapper, locals);
      }
      for (const output of node.outputs ?? []) inspectAngular(output.handler, false, local, members, wrapper, locals);
      if (typeof node.value === 'string') {
        if (!angularI18n && !hidden) raw(node.value, nodeSpan(node), local);
      } else if (node.value instanceof AST) {
        inspectAngular(node.value, !(node instanceof TmplAstLetDeclaration) && !angularI18n && !hidden, local, members, wrapper, locals);
      }
      if (node instanceof TmplAstLetDeclaration) {
        const reference = node.value instanceof ASTWithSource ? node.value.ast : node.value;
        const copy = knownAngularId(reference) ?? (reference instanceof PropertyRead && reference.receiver instanceof ImplicitReceiver
          ? locals.get(reference.name) : undefined);
        locals.set(node.name, copy);
      }
      if (node.children?.length) {
        const variables = [...node.variables ?? [], ...node.contextVariables ?? []];
        if (node.item) variables.push(node.item);
        if (node.expressionAlias) variables.push(node.expressionAlias);
        const childLocals = node instanceof TmplAstElement ? locals : view(node.children, locals, variables);
        for (const child of node.children) walk(child, childLocals, angularI18n, hidden, site);
      }
      for (const list of [node.branches, node.cases]) {
        for (const child of list ?? []) walk(child, locals, angularI18n, hidden, site);
      }
      for (const child of [node.placeholder, node.empty, node.loading, node.error]) {
        if (child) walk(child, locals, angularI18n, hidden, site);
      }
    }
    const locals = view(nodes, new Map());
    for (const node of nodes) walk(node, locals);
  }
  function typescript(source: ts.SourceFile, checker: ts.TypeChecker, emit: I18nFinding, libraryImport: LibraryImport) {
    const wrappers = new Map<ts.Symbol, 'request' | 'positional'>();
    const angularDecorators = new Set<ts.Symbol>();
    const angularNamespace = new Set<ts.Symbol>();
    const isAngularOwner = (node: ts.Expression) => {
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol && angularDecorators.has(symbol)) return true;
      if (!ts.isPropertyAccessExpression(node) || !['Component', 'Directive'].includes(node.name.text)) return false;
      const owner = checker.getSymbolAtLocation(node.expression);
      return !!owner && angularNamespace.has(owner);
    };
    const span = (node: ts.Node): Span => ({ start: node.getStart(source), end: node.getEnd() });
    const name = (node: ts.Expression) => node.getText(source).replace(/^this\./, '');
    const unwrapped = (node: ts.Expression): ts.Expression => ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
      ? unwrapped(node.expression) : node;
    const callSymbol = (node: ts.Expression) => checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node);
    const knownId = (input: ts.Expression | undefined): string | undefined => {
      if (!input) return;
      const node = unwrapped(input);
      if (ts.isStringLiteralLike(node)) return node.text;
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const left = knownId(node.left);
        const right = knownId(node.right);
        if (left !== undefined && right !== undefined) return left + right;
      }
      const type = checker.getTypeAtLocation(node);
      if (type.isStringLiteral()) return type.value;
    };
    const field = (object: ts.Expression, key: string): { value?: ts.Expression; type?: ts.Type; unknown?: boolean } => {
      const node = unwrapped(object);
      if (ts.isObjectLiteralExpression(node)) {
        for (const property of [...node.properties].reverse()) {
          if (ts.isSpreadAssignment(property)) {
            const spread = field(property.expression, key);
            if (spread.value || spread.type || spread.unknown) return spread;
            continue;
          }
          if (propertyKey(property.name) === undefined) return { unknown: true };
          if (propertyKey(property.name) !== key) continue;
          if (ts.isPropertyAssignment(property)) return { value: property.initializer };
          if (ts.isShorthandPropertyAssignment(property)) {
            const symbol = checker.getShorthandAssignmentValueSymbol(property);
            if (symbol) return { value: property.name, type: checker.getTypeOfSymbolAtLocation(symbol, property.name) };
          }
          return { unknown: true };
        }
        return {};
      }
      const type = checker.getTypeAtLocation(node);
      if (!(type.flags & ts.TypeFlags.Object) || type.getStringIndexType()) return { unknown: true };
      const property = type.getProperty(key);
      return property ? { type: checker.getTypeOfSymbolAtLocation(property, node) } : {};
    };
    const argumentsFromType = (type: ts.Type, site: ts.Expression) => {
      if (!(type.flags & ts.TypeFlags.Object) || type.getStringIndexType()
          || type.getProperties().some(property => property.flags & ts.SymbolFlags.Optional)) return;
      return Object.fromEntries(type.getProperties().map(property => [property.getName(), {
        ...span(site), kinds: typeKinds(checker.getTypeOfSymbolAtLocation(property, site)),
      }]));
    };
    const args = (value: ts.Expression | undefined): Record<string, Argument> | undefined => {
      if (!value) return {};
      const node = unwrapped(value);
      const type = checker.getTypeAtLocation(node);
      if (!ts.isObjectLiteralExpression(node)) return argumentsFromType(type, node);
      if (node.properties.some(property => ts.isSpreadAssignment(property)
          ? argumentsFromType(checker.getTypeAtLocation(property.expression), property.expression) === undefined
          : propertyKey(property.name) === undefined)) return;
      return Object.fromEntries(type.getProperties().map(property => {
        const matched = field(node, property.getName());
        const expression = matched.value ?? node;
        return [property.getName(), {
          ...span(expression), kinds: typeKinds(matched.type ?? checker.getTypeOfSymbolAtLocation(property, expression)),
        }];
      }));
    };
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (statement.moduleSpecifier.text === '@angular/core') {
        if (bindings && ts.isNamespaceImport(bindings)) {
          const symbol = checker.getSymbolAtLocation(bindings.name);
          if (symbol) angularNamespace.add(symbol);
        }
        if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
          if (!['Component', 'Directive'].includes((binding.propertyName ?? binding.name).text)) continue;
          const symbol = checker.getSymbolAtLocation(binding.name);
          if (symbol) angularDecorators.add(symbol);
        }
      }
      if (!libraryImport(statement.moduleSpecifier)) continue;
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
        const original = (binding.propertyName ?? binding.name).text;
        if (legacyFunctions.has(original) || ['UiMessagePipe', 'uiEnglishMessages', 'uiJapaneseMessages', 'UiMessages'].includes(original)) legacy(original, span(binding), emit);
      }
    }
    const imported = (expression: ts.Expression) => importedLibraryName(expression, checker, libraryImport);
    function findWrappers(node: ts.Node) {
      if ((ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) && node.initializer
          && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.name)) {
        const kind = wrapperKind(imported(node.initializer.expression));
        const declared = checker.getSymbolAtLocation(node.name);
        if (declared && kind) wrappers.set(declared, kind);
      }
      ts.forEachChild(node, findWrappers);
    }
    findWrappers(source);
    const wrapperOf = (node: ts.Expression) => {
      const symbol = callSymbol(node);
      return symbol && wrappers.get(symbol);
    };
    const translationCall = (value: ts.Expression) => {
      const node = unwrapped(value);
      return ts.isCallExpression(node) && (configuredFunction.has(name(node.expression))
        || !!wrapperOf(node.expression) || imported(node.expression) === 'resolveUiMessage');
    };
    function visit(node: ts.Node) {
      if (ts.isPropertyAssignment(node) && propertyKey(node.name) === 'host' && ts.isObjectLiteralExpression(node.initializer)
          && ts.isObjectLiteralExpression(node.parent) && ts.isCallExpression(node.parent.parent) && ts.isDecorator(node.parent.parent.parent)
          && isAngularOwner(node.parent.parent.expression)) {
        const declaration = node.parent.parent.parent.parent;
        const members = new Map<string, ts.Expression>();
        if (ts.isClassLike(declaration)) for (const member of declaration.members) {
          if (ts.isPropertyDeclaration(member) && member.initializer && ts.isIdentifier(member.name)) members.set(member.name.text, member.initializer);
          else if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) members.set(member.name.text, member.name);
        }
        const templateWrapper = memberWrapper(members, checker, libraryImport);
        for (const item of node.initializer.properties) {
          if (!ts.isPropertyAssignment(item) || !ts.isStringLiteralLike(item.initializer)) continue;
          const key = propertyKey(item.name);
          if (key === undefined) continue;
          const property = key.match(/^\[(?:attr\.)?([A-Za-z][\w-]*)\]$/)?.[1];
          if (property && display.has(property)) {
            const value = item.initializer.text;
            const input = new ParseSourceFile(value, source.fileName);
            const start = new ParseLocation(input, 0, 0, 0);
            const expression = bindingParser.parseBinding(value, new ParseSourceSpan(start, start.moveBy(value.length)), 0);
            if (!expression.errors.length) {
              const site = span(item);
              // Angular parses the decoded string, so report the original host property span.
              inspectAngular(expression, true, (rule, severity, message, suggestion) =>
                emit(rule, severity, message, suggestion, site.start, site.end), members, templateWrapper, new Map());
            }
          } else if (display.has(key)) raw(item.initializer.text, span(item), emit);
        }
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken
          && (translationCall(node.left) || translationCall(node.right))) fragment(span(node), emit);
      if (ts.isCallExpression(node)) {
        const target = name(node.expression);
        const subject = node.arguments[0] && unwrapped(node.arguments[0]);
        const wrapper = wrapperOf(node.expression);
        const original = imported(node.expression);
        if (ts.isPropertyAccessExpression(node.expression) && original && legacyFunctions.has(original)) {
          legacy(original, span(node), emit);
        } else if (wrapper === 'request' || original === 'resolveUiMessage') {
          const key = subject && field(subject, 'id');
          const parameters = subject && field(subject, 'parameters');
          let id: string | undefined;
          if (key?.type?.isStringLiteral()) id = key.type.value;
          else if (key?.value) id = knownId(key.value);
          const named = parameters?.value ? args(parameters.value) : parameters?.type && subject ? argumentsFromType(parameters.type, subject)
            : !subject || parameters?.unknown ? undefined : {};
          checkReference(target, id, named, span(node), emit, true);
        } else if (wrapper === 'positional' || configuredFunction.has(target)) {
          checkReference(target, knownId(subject), args(node.arguments[1]), span(node), emit, !!wrapper);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { template, typescript };
}
