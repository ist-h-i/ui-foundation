import path from 'node:path';
import ts from 'typescript';
import type { SourceDiagnostic } from './types.ts';

export const publicAngularEntries = ['core.ts', 'index.ts'] as const;

// Share the rule list between the YAML parser, scanner and baseline comparison.
export const exceptableRules = [
  'literal-token', 'primitive-reference', 'unknown-token', 'token-category',
  'unapproved-component', 'unresolved', 'generated-internal-import',
] as const;

export function isExceptableRule(rule: string): boolean {
  return exceptableRules.some(candidate => candidate === rule);
}

export function withBaselineContext(diagnostic: SourceDiagnostic, ...context: string[]): SourceDiagnostic {
  if (diagnostic.severity !== 'error' || !isExceptableRule(diagnostic.rule)) return diagnostic;
  const combined = [...context, ...(diagnostic.baseline_context ?? [])];
  return { ...diagnostic, baseline_context: combined.length ? combined : null };
}

export function fingerprint(diagnostic: Pick<SourceDiagnostic, 'file' | 'rule' | 'message' | 'source' | 'baseline_context'>): string {
  return JSON.stringify([diagnostic.file, diagnostic.rule, diagnostic.message, diagnostic.source, diagnostic.baseline_context]);
}

function tokens(node: ts.Node, source: ts.SourceFile): string {
  const result: string[] = [];
  function collect(token: ts.Node): void {
    if (ts.isJSDoc(token)) return;
    const children = token.getChildren(source);
    if (children.length) children.forEach(collect);
    else if (token.getWidth(source)) result.push(token.getText(source));
  }
  collect(node);
  return JSON.stringify(result);
}

export function templateOpeningContext(opening: string): string {
  // Opening-tag whitespace is a separator. Quoted attribute values are single
  // tokens so changing a space inside a value still changes the context.
  if (!opening.startsWith('<')) return opening.trim();
  return JSON.stringify(opening.match(/"[^"]*"|'[^']*'|[^\s"'=<>]+|[=<>]/g) ?? []);
}

/** Identify the named scope and statement containing a TypeScript finding independently of line and column. */
export function typescriptBaselineContext(source: ts.SourceFile, line: number, column: number): string[] {
  const lines = source.getLineStarts();
  const position = lines[line - 1] === undefined ? -1 : lines[line - 1] + column - 1;
  const context: string[] = [];
  const expression = (node: ts.Node | undefined) => node ? tokens(node, source) : null;
  const branch = (first: ts.Node) => position < first.getStart(source) ? 'condition' : position < first.getEnd() ? 'then' : 'else';
  function visit(node: ts.Node): void {
    if (position < node.getStart(source) || position >= node.getEnd()) return;
    if (ts.isClassLike(node) || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
        || ts.isMethodDeclaration(node) || ts.isAccessor(node) || ts.isVariableDeclaration(node)
        || ts.isPropertyDeclaration(node) || ts.isPropertyAssignment(node)) {
      context.push(JSON.stringify([node.kind, node.name ? tokens(node.name, source) : null]));
    }
    if (ts.isIfStatement(node)) context.push(JSON.stringify(['if', expression(node.expression), branch(node.thenStatement)]));
    if (ts.isConditionalExpression(node)) context.push(JSON.stringify(['conditional', expression(node.condition), branch(node.whenTrue)]));
    if (ts.isForOfStatement(node) || ts.isForInStatement(node)) {
      context.push(JSON.stringify([node.kind, expression(node.initializer), expression(node.expression), ts.isForOfStatement(node) && !!node.awaitModifier]));
    }
    if (ts.isForStatement(node)) context.push(JSON.stringify(['for', expression(node.initializer), expression(node.condition), expression(node.incrementor)]));
    if (ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isSwitchStatement(node) || ts.isCaseClause(node)) {
      context.push(JSON.stringify([node.kind, expression(node.expression)]));
    }
    if (ts.isDefaultClause(node)) context.push('default case');
    if (ts.isExpressionStatement(node) || ts.isReturnStatement(node)) context.push(tokens(node, source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  return context.length ? ['TypeScript', ...context] : [];
}

export function readBaseline(text: string): Map<string, number> {
  const document = JSON.parse(text);
  const report = document?.source ?? document;
  const statuses = ['passed', 'warnings', 'failed'];
  if (!report || !statuses.includes(report.status) || !Array.isArray(report.diagnostics) || report.existing_diagnostics !== undefined) {
    throw new Error('Expected a full JSON source report from a configured check without --baseline.');
  }
  const counts = new Map<string, number>();
  for (const item of report.diagnostics) {
    if (!item || !['warning', 'error'].includes(item.severity)
        || ![item.file, item.rule, item.message, item.source].every(value => typeof value === 'string')) {
      throw new Error('The source baseline contains an invalid diagnostic.');
    }
    if (item.severity === 'error' && isExceptableRule(item.rule)) {
      if (item.baseline_context === null) continue;
      if (!Array.isArray(item.baseline_context) || !item.baseline_context.length || item.baseline_context.some((label: unknown) => typeof label !== 'string')) {
        throw new Error('Capture a new full JSON source report with this checker version to record structural baseline context.');
      }
      const key = fingerprint(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export function workspaceSourceRoots(file: string, text: string): { name: string; sourceRoot: string }[] {
  const parsed = ts.parseConfigFileTextToJson(file, text);
  if (parsed.error) throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n'));
  const projects: unknown = parsed.config?.projects;
  if (!projects || typeof projects !== 'object' || Array.isArray(projects)) {
    throw new Error('Expected an object of projects in angular.json.');
  }
  return Object.entries(projects).map(([name, project]) => {
    const root: unknown = project?.sourceRoot ?? project?.root;
    if (typeof root !== 'string' || path.isAbsolute(root) || /[\\\u0000-\u001f<>:"|?*]/.test(root) || root.split('/').includes('..')) {
      throw new Error(`Expected a project-relative sourceRoot or root for Angular project ${name}.`);
    }
    return { name, sourceRoot: path.normalize(root) };
  });
}
