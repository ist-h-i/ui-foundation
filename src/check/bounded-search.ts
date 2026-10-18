import ts from 'typescript';

/** Recognize only an indexed, effect-free strict search followed by an abrupt exit. */
export function boundedSearch(statement:ts.Statement,body:ts.Block,checker:ts.TypeChecker|undefined):{collection:ts.Identifier;input:ts.Identifier}|undefined {
 if(!checker||!ts.isForStatement(statement)||body.statements.at(-2)!==statement||!ts.isThrowStatement(body.statements.at(-1)!))return;
 const unwrap=(node:ts.Expression):ts.Expression=>{while(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node))node=node.expression;return node;};
 const same=(a:ts.Identifier,b:ts.Identifier)=>checker.getSymbolAtLocation(a)===checker.getSymbolAtLocation(b)&&!!checker.getSymbolAtLocation(a);
 const init=statement.initializer,condition=statement.condition,increment=statement.incrementor;
 if(!init||!ts.isVariableDeclarationList(init)||!(init.flags&ts.NodeFlags.Let)||init.declarations.length!==1)return;
 const index=init.declarations[0]!;
 if(!ts.isIdentifier(index.name)||!index.initializer||!ts.isNumericLiteral(index.initializer)||Number(index.initializer.text)!==0)return;
 if(!condition||!ts.isBinaryExpression(condition)||condition.operatorToken.kind!==ts.SyntaxKind.LessThanToken||!ts.isIdentifier(condition.left)||!same(condition.left,index.name))return;
 const limit=unwrap(condition.right);
 if(!ts.isPropertyAccessExpression(limit)||limit.name.text!=='length'||!ts.isIdentifier(limit.expression))return;
 if(!increment||!(ts.isPostfixUnaryExpression(increment)||ts.isPrefixUnaryExpression(increment))||increment.operator!==ts.SyntaxKind.PlusPlusToken||!ts.isIdentifier(increment.operand)||!same(increment.operand,index.name))return;
 if(!ts.isBlock(statement.statement)||statement.statement.statements.length!==2)return;
 const [read,guard]=statement.statement.statements;
 if(!read||!ts.isVariableStatement(read)||!(read.declarationList.flags&ts.NodeFlags.Const)||read.declarationList.declarations.length!==1)return;
 const candidate=read.declarationList.declarations[0]!;
 if(!ts.isIdentifier(candidate.name)||!candidate.initializer)return;
 const access=unwrap(candidate.initializer);
 if(!ts.isElementAccessExpression(access)||!ts.isIdentifier(access.expression)||!same(access.expression,limit.expression)||!ts.isIdentifier(access.argumentExpression)||!same(access.argumentExpression,index.name))return;
 if(!guard||!ts.isIfStatement(guard)||guard.elseStatement)return;
 const comparison=unwrap(guard.expression);
 if(!ts.isBinaryExpression(comparison)||comparison.operatorToken.kind!==ts.SyntaxKind.EqualsEqualsEqualsToken||!ts.isIdentifier(comparison.left)||!ts.isIdentifier(comparison.right))return;
 const input=same(comparison.left,candidate.name)?comparison.right:same(comparison.right,candidate.name)?comparison.left:undefined;
 if(!input||same(input,candidate.name)||same(input,index.name))return;
 const inputDeclaration=checker.getSymbolAtLocation(input)?.valueDeclaration;
 if(!inputDeclaration||!(ts.isParameter(inputDeclaration)||ts.isVariableDeclaration(inputDeclaration)))return;
 let returned:ts.Statement=guard.thenStatement;
 if(ts.isBlock(returned)){if(returned.statements.length!==1)return;returned=returned.statements[0]!;}
 if(!ts.isReturnStatement(returned)||!returned.expression)return;
 const value=unwrap(returned.expression);
 if(!ts.isIdentifier(value)||!same(value,candidate.name))return;
 return {collection:limit.expression,input};
}
