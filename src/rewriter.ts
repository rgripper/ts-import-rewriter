/**
 * TODO
 */
import * as ts from 'typescript';

export type ModuleResolver = (moduleName: string, containingFile: string) => string | undefined;
type ImportRewriter = (node: ts.ImportDeclaration) => ts.ImportDeclaration;

export function rewriteImports(moduleResolver: ModuleResolver): ts.TransformerFactory<ts.SourceFile> {
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sf: ts.SourceFile) => {
      const rewriteImport: ImportRewriter = importNode => rewriteImportWithResolver(importNode, moduleResolver);
      const visitor = createVisitor(ctx, rewriteImport);
      return ts.visitNode(sf, visitor);
    }
  }
}

function rewriteImportWithResolver(importNode: ts.ImportDeclaration, moduleResolver: ModuleResolver): ts.ImportDeclaration {
  const sourceFile = importNode.getSourceFile();
  const importPathWithQuotes = importNode.moduleSpecifier.getText(sourceFile);
  const originalPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2);
  const rewrittenPath = moduleResolver(originalPath, sourceFile.fileName);

  if (rewrittenPath === undefined) {
    return importNode;
  }

  return ts.createImportDeclaration(
    undefined,
    undefined,
    importNode.importClause,
    ts.createLiteral(rewrittenPath)
  )
}

function createVisitor(ctx: ts.TransformationContext, createResolvedImport: ImportRewriter): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      return createResolvedImport(node as ts.ImportDeclaration);
    }
    return ts.visitEachChild(node, visitor, ctx);
  }

  return visitor;
}

