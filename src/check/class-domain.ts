import ts from 'typescript';
import type { UtilityResolver } from './types.ts';

export interface ClassDomainContext {
  utilities?: UtilityResolver;
  /** Must include full checked-source writes/escapes, inherited owner mutation,
   * readonly computed identity and imported Angular computed identity checks. */
  resolveComputed: (call: ts.CallExpression) => ts.ConciseBody | undefined;
  /** Only an identified Angular input signal read, never an arbitrary method. */
  isTrustedInputRead: (expression: ts.Expression) => boolean;
  /** Explicit checked-source test and exec intrinsic-integrity evidence; absent is incomplete. */
  intrinsicRegExpTestIntact?: boolean;
}
const unwrap = (expression: ts.Expression): ts.Expression => {
  while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression) || ts.isSatisfiesExpression(expression)) expression = expression.expression;
  return expression;
};
function memberCall(expression: ts.Expression): ts.CallExpression | undefined {
  const value = unwrap(expression);
  return ts.isCallExpression(value) && !value.questionDotToken && value.arguments.length === 0 && !value.typeArguments?.length && ts.isPropertyAccessExpression(value.expression) && value.expression.expression.kind === ts.SyntaxKind.ThisKeyword && !value.expression.questionDotToken ? value : undefined;
}
function sameCall(left: ts.Expression, right: ts.Expression): boolean {
  const a = memberCall(left), b = memberCall(right);
  return !!a && !!b && (a.expression as ts.PropertyAccessExpression).name.text === (b.expression as ts.PropertyAccessExpression).name.text;
}
function returned(body: ts.ConciseBody): ts.Expression | undefined {
  if (!ts.isBlock(body)) return unwrap(body);
  return body.statements.length === 1 && ts.isReturnStatement(body.statements[0]) && body.statements[0].expression ? unwrap(body.statements[0].expression) : undefined;
}
function isLocal(expression: ts.Expression, name: string): boolean { const node = unwrap(expression); return ts.isIdentifier(node) && node.text === name; }
function binary(expression: ts.Expression, operator: ts.SyntaxKind): ts.BinaryExpression | undefined {
  const node = unwrap(expression); return ts.isBinaryExpression(node) && node.operatorToken.kind === operator ? node : undefined;
}
function literal(expression: ts.Expression, text: string): boolean { const node = unwrap(expression); return ts.isStringLiteralLike(node) && node.text === text; }
function nullValue(expression: ts.Expression): boolean { return unwrap(expression).kind === ts.SyntaxKind.NullKeyword; }
function emptyGuard(statement: ts.Statement, name: string): boolean {
  if (!ts.isIfStatement(statement) || statement.elseStatement) return false;
  const or = binary(statement.expression, ts.SyntaxKind.BarBarToken);
  if (!or) return false;
  const nil = binary(or.left, ts.SyntaxKind.EqualsEqualsToken), empty = binary(or.right, ts.SyntaxKind.EqualsEqualsEqualsToken);
  const yes = ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1 ? statement.thenStatement.statements[0] : statement.thenStatement;
  return !!nil && isLocal(nil.left, name) && nullValue(nil.right) && !!empty && isLocal(empty.left, name) && literal(empty.right, '') && ts.isReturnStatement(yes) && !!yes.expression && literal(yes.expression, '');
}
/** Parse a deliberately small anchored character-class grammar without executing
 * application regexes. Only literal ASCII ranges/characters in the safe alphabet
 * are allowed; no escapes, flags, negation, alternation or arbitrary constructs. */
function safeAlphabet(regex: ts.RegularExpressionLiteral): boolean {
  const match = /^\/\^\[([^\]]+)\]\+\$\/$/.exec(regex.text);
  if (!match) return false;
  const allowed = new Set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_+-');
  const chars = match[1];
  for (let index = 0; index < chars.length; index++) {
    const start = chars[index];
    if (!allowed.has(start)) return false;
    if (chars[index + 1] === '-' && index + 2 < chars.length) {
      const end = chars[index + 2], from = start.charCodeAt(0), to = end.charCodeAt(0);
      if (from > to) return false;
      for (let code = from; code <= to; code++) if (!allowed.has(String.fromCharCode(code))) return false;
      index += 2;
    }
  }
  return true;
}
function validationGuard(statement: ts.Statement, name: string): boolean {
  if (!ts.isIfStatement(statement) || statement.elseStatement) return false;
  const or = binary(statement.expression, ts.SyntaxKind.BarBarToken);
  if (!or) return false;
  const type = binary(or.left, ts.SyntaxKind.ExclamationEqualsEqualsToken);
  if (!type || !ts.isTypeOfExpression(unwrap(type.left)) || !isLocal((unwrap(type.left) as ts.TypeOfExpression).expression, name) || !literal(type.right, 'string')) return false;
  const negated = unwrap(or.right);
  if (!ts.isPrefixUnaryExpression(negated) || negated.operator !== ts.SyntaxKind.ExclamationToken) return false;
  const test = unwrap(negated.operand);
  if (!ts.isCallExpression(test) || test.arguments.length !== 1 || !isLocal(test.arguments[0], name) || test.questionDotToken || !ts.isPropertyAccessExpression(test.expression) || test.expression.name.text !== 'test') return false;
  const regex = unwrap(test.expression.expression);
  if (!ts.isRegularExpressionLiteral(regex) || !safeAlphabet(regex)) return false;
  const failure = ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1 ? statement.thenStatement.statements[0] : statement.thenStatement;
  return ts.isThrowStatement(failure);
}
function validatedIdentifier(body: ts.ConciseBody, context: ClassDomainContext): boolean {
  if (!ts.isBlock(body)) return false;
  const statements = body.statements;
  if (statements.length !== 3 && statements.length !== 4) return false;
  const first = statements[0];
  if (!ts.isVariableStatement(first) || !(first.declarationList.flags & ts.NodeFlags.Const) || first.declarationList.declarations.length !== 1) return false;
  const declaration = first.declarationList.declarations[0];
  if (!ts.isIdentifier(declaration.name) || !declaration.initializer || !context.isTrustedInputRead(unwrap(declaration.initializer))) return false;
  const name = declaration.name.text;
  let index = 1;
  if (statements.length === 4 && !emptyGuard(statements[index++], name)) return false;
  if (!validationGuard(statements[index++], name)) return false;
  const last = statements[index];
  return ts.isReturnStatement(last) && !!last.expression && isLocal(last.expression, name);
}

/** Prove a single class token (possibly with a final line terminator) or null.
 * JavaScript $ can accept a final line terminator, which cannot add another class.
 * Never substitute one
 * representative class; callers must still inspect every known finite branch. */
export function proveClassDomain(body: ts.ConciseBody, context: ClassDomainContext): boolean {
  if (context.intrinsicRegExpTestIntact !== true || !context.utilities?.disjointClassPrefix) return false;
  const expression = returned(body);
  if (!expression || !ts.isConditionalExpression(expression) || !nullValue(expression.whenFalse)) return false;
  const condition = memberCall(expression.condition), yes = binary(expression.whenTrue, ts.SyntaxKind.PlusToken);
  if (!condition || !yes || !sameCall(condition, yes.right) || !ts.isStringLiteralLike(unwrap(yes.left))) return false;
  const prefix = (unwrap(yes.left) as ts.StringLiteralLike).text;
  if (!context.utilities.disjointClassPrefix(prefix)) return false;
  const checkedBody = context.resolveComputed(condition);
  return !!checkedBody && validatedIdentifier(checkedBody, context);
}
