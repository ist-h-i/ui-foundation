import { AST, ASTWithSource, Binary, BindingPipe, Call, Conditional, ImplicitReceiver, Interpolation, KeyedRead, LiteralMap, LiteralPrimitive, PropertyRead, ThisReceiver } from '@angular/compiler';
import ts from 'typescript';
import type { I18nChecks } from './types.ts';

export type MessageArguments = Readonly<Record<string, readonly string[]>>;
export interface MessageDictionary {
  messages: ReadonlyMap<string, MessageArguments>;
  complete: boolean;
}
export type I18nRule = 'i18n-raw-text' | 'i18n-message-reference' | 'i18n-message-arguments' | 'i18n-fragment' | 'i18n-unconfirmed' | 'i18n-legacy-key';
export type I18nFinding = (rule: I18nRule, severity: 'error' | 'warning', message: string, suggestion: string, start: number, end: number, site?: string[]) => void;
type Argument = { kind?: string; start: number; end: number };
type Span = { start: number; end: number };

const idSyntax = /^[A-Za-z][A-Za-z0-9_-]*(?:[.:/][A-Za-z0-9_-]+)*$/;
const parameterSyntax = /^[A-Za-z_$][\w$]*$/;
const types = new Set(['string', 'number', 'boolean', 'null']);
const bindingNames = new Set([
  'aria-label', 'aria-description', 'aria-valuetext', 'aria-roledescription', 'label', 'placeholder',
  'alt', 'title', 'textContent', 'innerText', 'message', 'errorMessage', 'notice', 'emptyMessage', 'loadingMessage',
]);
const legacyFunctions = new Set(['uiMessage', 'injectUiText']);
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
}
function nodeSpan(node: TemplateNode): Span {
  return { start: node.sourceSpan?.start.offset ?? 0, end: node.sourceSpan?.end.offset ?? 0 };
}
function applicationText(value: unknown): value is string {
  return typeof value === 'string' && /\p{L}/u.test(value) && !/^\s*$/.test(value);
}
function referenceName(node: AST): string | undefined {
  if (node instanceof PropertyRead) {
    if (node.receiver instanceof ImplicitReceiver || node.receiver instanceof ThisReceiver) return node.name;
    const owner = referenceName(node.receiver);
    if (owner) return `${owner}.${node.name}`;
  }
}
function literalKind(value: unknown): string {
  return value === null ? 'null' : typeof value;
}

export function createMessageChecks(config: I18nChecks, dictionaries: readonly MessageDictionary[], library: MessageDictionary) {
  const configuredFunction = new Set(config.functions);
  const configuredPipe = new Set(config.pipes);
  const display = new Set([...bindingNames, ...config.display_bindings]);
  function checkReference(name: string, id: unknown, args: Record<string, Argument> | undefined, span: Span, emit: I18nFinding) {
    const warn = (message: string, suggestion: string) => emit('i18n-unconfirmed', 'warning', message, suggestion, span.start, span.end);
    if (typeof id !== 'string') {
      warn(`The message ID passed to ${name} cannot be determined statically.`, 'Use a stable literal ID or verify the complete set of possible IDs in the loaded dictionaries.');
      return;
    }
    const builtIn = name === 'uiStableMessage' || id.startsWith('uiFoundation.');
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
      } else if (accepted.length && args[name].kind !== undefined && !accepted.includes(args[name].kind!)) {
        emit('i18n-message-arguments', 'error', `Message "${id}" expects "${name}" to have type ${accepted.join(' or ')}.`,
          `Pass the original ${accepted.join(' or ')} value as "${name}".`, args[name].start, args[name].end);
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

  function qArguments(value: AST | undefined): Record<string, Argument> | undefined {
    if (!value) return {};
    if (!(value instanceof LiteralMap)) return;
    if (value.keys.some(key => !('key' in key))) return;
    return Object.fromEntries(value.keys.flatMap((key, index) => {
      if (!('key' in key)) return [];
      const expression = value.values[index];
      return [[key.key, { ...expression.sourceSpan, kind: expression instanceof LiteralPrimitive ? literalKind(expression.value) : undefined }]];
    }));
  }
  function angularTranslation(value: AST): boolean {
    if (value instanceof ASTWithSource) return angularTranslation(value.ast);
    if (value instanceof BindingPipe) return value.name === 'uiStableMessage' || configuredPipe.has(value.name);
    if (value instanceof Call) return configuredFunction.has(referenceName(value.receiver) ?? '');
    return false;
  }
  function inspectAngular(value: AST, shown: boolean, emit: I18nFinding, members: ReadonlyMap<string, ts.Expression>) {
    if (value instanceof ASTWithSource) return inspectAngular(value.ast, shown, emit, members);
    if (value instanceof BindingPipe) {
      if (value.name === 'uiMessage') { legacy(value.name, value.sourceSpan, emit); return; }
      if (angularTranslation(value)) {
        checkReference(value.name, value.exp instanceof LiteralPrimitive ? value.exp.value : undefined, qArguments(value.args[0]), value.sourceSpan, emit);
        return;
      }
      inspectAngular(value.exp, shown, emit, members);
      return;
    }
    if (value instanceof Call) {
      const name = referenceName(value.receiver);
      if (shown && name && value.args.length === 0) {
        const initializer = members.get(name);
        if (initializer) inspectDisplayInitializer(initializer, value.sourceSpan, emit);
      }
      if (name && legacyFunctions.has(name)) legacy(name, value.sourceSpan, emit);
      else if (name && configuredFunction.has(name)) {
        const id = value.args[0];
        checkReference(name, id instanceof LiteralPrimitive ? id.value : undefined, qArguments(value.args[1]), value.sourceSpan, emit);
      }
      else for (const argument of value.args) inspectAngular(argument, false, emit, members);
      return;
    }
    if (value instanceof Conditional) {
      inspectAngular(value.trueExp, shown, emit, members);
      inspectAngular(value.falseExp, shown, emit, members);
      return;
    }
    if (value instanceof Interpolation) {
      if (shown && value.strings.some(applicationText)) {
        if (value.expressions.some(angularTranslation)) fragment(value.sourceSpan, emit);
        raw(value.strings.join(''), value.sourceSpan, emit);
      }
      for (const expression of value.expressions) inspectAngular(expression, shown, emit, members);
      return;
    }
    if (value instanceof Binary) {
      if (value.operation === '+' && (angularTranslation(value.left) || angularTranslation(value.right))) fragment(value.sourceSpan, emit);
      if (['+', '||', '??'].includes(value.operation)) {
        inspectAngular(value.left, shown, emit, members);
        inspectAngular(value.right, shown, emit, members);
      }
      return;
    }
    if (shown && value instanceof KeyedRead) {
      const name = referenceName(value.receiver);
      const initializer = name && members.get(name);
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
          if (ts.isPropertyAssignment(property)) inspectDisplayInitializer(property.initializer, value.sourceSpan, emit);
        }
      }
    }
    if (shown && value instanceof LiteralPrimitive) raw(value.value, value.sourceSpan, emit);
    if (shown && value instanceof PropertyRead) {
      const name = referenceName(value);
      const initializer = name && members.get(name);
      if (initializer) inspectDisplayInitializer(initializer, value.sourceSpan, emit);

    }
  }

  function inspectDisplayInitializer(expression: ts.Expression, span: Span, emit: I18nFinding): void {
    if (ts.isStringLiteralLike(expression)) raw(expression.text, span, emit);
    else if (ts.isConditionalExpression(expression)) {
      inspectDisplayInitializer(expression.whenTrue, span, emit);
      inspectDisplayInitializer(expression.whenFalse, span, emit);
    } else if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
        && ['input', 'model', 'signal'].includes(expression.expression.text) && expression.arguments[0]) {
      inspectDisplayInitializer(expression.arguments[0], span, emit);
    }
  }

  function template(nodes: readonly TemplateNode[], emit: I18nFinding, members: ReadonlyMap<string, ts.Expression>, context: (start: number, end: number) => string) {
    const visited = new Set<TemplateNode>();
    function walk(node: TemplateNode, translate = false, invisible = false, ancestor: string[] = []) {
      if (visited.has(node)) return;
      visited.add(node);
      const current = node.startSourceSpan;
      const site = current ? [...ancestor, context(current.start.offset, current.end.offset)] : ancestor;
      const local: I18nFinding = (rule, severity, message, suggestion, start, end) => emit(rule, severity, message, suggestion, start, end, site);
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
        } else if (attribute.value) inspectAngular(attribute.value, shown, local, members);
      }
      for (const output of node.outputs ?? []) inspectAngular(output.handler, false, local, members);
      if (typeof node.value === 'string') {
        if (!angularI18n && !hidden) raw(node.value, nodeSpan(node), local);
      } else if (node.value instanceof AST) inspectAngular(node.value, !angularI18n && !hidden, local, members);
      for (const list of [node.children, node.branches, node.cases]) for (const child of list ?? []) walk(child, angularI18n, hidden, site);
      for (const child of [node.placeholder, node.empty, node.loading, node.error]) if (child) walk(child, angularI18n, hidden, site);
    }
    for (const node of nodes) walk(node);
  }
  function typescript(source: ts.SourceFile, checker: ts.TypeChecker, emit: I18nFinding) {
    const wrappers = new Map<string, 'request' | 'positional'>();
    const namespace = new Set<string>();
    const imports = new Map<string, string>();
    const span = (node: ts.Node): Span => ({ start: node.getStart(source), end: node.getEnd() });
    const name = (node: ts.Expression) => node.getText(source).replace(/^this\./, '');
    const unwrapped = (node: ts.Expression): ts.Expression => ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
      ? unwrapped(node.expression) : node;
    const field = (node: ts.ObjectLiteralExpression, key: string) => node.properties
      .find((item): item is ts.PropertyAssignment => ts.isPropertyAssignment(item) && item.name.getText(source).replace(/^['"]|['"]$/g, '') === key)?.initializer;
    const args = (value: ts.Expression | undefined) => {
      if (!value) return {};
      const node = unwrapped(value);
      if (!ts.isObjectLiteralExpression(node)) return;
      if (node.properties.some(property => !ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property))) return;
      return Object.fromEntries(node.properties.map(property => {
        const assignment = property as ts.PropertyAssignment | ts.ShorthandPropertyAssignment;
        const label = assignment.name.getText(source).replace(/^['"]|['"]$/g, '');
        const expression = ts.isPropertyAssignment(assignment) ? assignment.initializer : assignment.name;
        const type = checker.getTypeAtLocation(expression);
        const known = type.flags & ts.TypeFlags.StringLike ? 'string' : type.flags & ts.TypeFlags.NumberLike ? 'number'
          : type.flags & ts.TypeFlags.BooleanLike ? 'boolean' : type.flags & ts.TypeFlags.Null ? 'null' : undefined;
        return [label, { ...span(expression), kind: known }];
      }));
    };
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
      if (!/(?:^|\/)(?:angular(?:\/core|\/index)?|locale(?:-model)?)$/.test(statement.moduleSpecifier.text)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) namespace.add(bindings.name.text);
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
        const original = (binding.propertyName ?? binding.name).text;
        imports.set(binding.name.text, original);
        if (legacyFunctions.has(original) || ['UiMessagePipe', 'uiEnglishMessages', 'uiJapaneseMessages', 'UiMessages'].includes(original)) legacy(original, span(binding), emit);
      }
    }
    const imported = (raw: string) => imports.get(raw) ?? (namespace.has(raw.split('.')[0]) ? raw.split('.')[1] : undefined);
    function findWrappers(node: ts.Node) {
      if ((ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) && node.initializer
          && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.name)) {
        const factory = imported(name(node.initializer.expression));
        if (factory === 'injectUiMessage') wrappers.set(node.name.text, 'request');
        if (factory === 'injectUiMessageText') wrappers.set(node.name.text, 'positional');
      }
      ts.forEachChild(node, findWrappers);
    }
    findWrappers(source);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const target = name(node.expression);
        const subject = node.arguments[0] && unwrapped(node.arguments[0]);
        if (configuredFunction.has(target) || wrappers.get(target) === 'positional') {
          checkReference(target, subject && ts.isStringLiteralLike(subject) ? subject.text : undefined, args(node.arguments[1]), span(node), emit);
        } else if (wrappers.has(target) || imported(target) === 'resolveUiMessage') {
          const object = subject && ts.isObjectLiteralExpression(subject) ? subject : undefined;
          const id = object && field(object, 'id');
          checkReference(target, id && ts.isStringLiteralLike(id) ? id.text : undefined, object ? args(field(object, 'parameters')) : undefined, span(node), emit);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { template, typescript };
}
