/**
 * TODO
 */
import * as ts from 'typescript';

export type ModuleResolver = (moduleName: string, containingFile: string) => string | undefined;
type Rewriter<T extends ts.Node> = (node: T) => T;

export function rewriteImports(moduleResolver: ModuleResolver): ts.TransformerFactory<ts.SourceFile> {
  const rewriteImport: Rewriter<ts.ImportDeclaration> = importNode => rewriteImportWithResolver(importNode, moduleResolver);
  const rewriteExport: Rewriter<ts.ExportDeclaration> = exportNode => rewriteExportWithResolver(exportNode, moduleResolver);
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sf: ts.SourceFile): ts.SourceFile => {
      const visitor = createVisitor(ctx, rewriteImport, rewriteExport);
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

function rewriteExportWithResolver(exportNode: ts.ExportDeclaration, moduleResolver: ModuleResolver): ts.ExportDeclaration {
  const sourceFile = exportNode.getSourceFile();
  if (exportNode.moduleSpecifier === undefined) {
    return exportNode;
  }
  const importPathWithQuotes = exportNode.moduleSpecifier.getText(sourceFile);
  const originalModuleName = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2);
  const rewrittenModuleName = moduleResolver(originalModuleName, sourceFile.fileName);

  if (rewrittenModuleName === undefined) {
    return exportNode;
  }

  return ts.createExportDeclaration(
    undefined,
    undefined,
    exportNode.exportClause,
    ts.createLiteral(rewrittenModuleName)
  )
}

function createVisitor(ctx: ts.TransformationContext, rewriteImport: Rewriter<ts.ImportDeclaration>, rewriteExport: Rewriter<ts.ExportDeclaration>): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    // try {
    //   console.log(ts.SyntaxKind[node.kind], node.getText());
    // }
    // catch (e) { }
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      return rewriteImport(node as ts.ImportDeclaration);
    }
    if (node.kind === ts.SyntaxKind.ExportDeclaration) {
      return rewriteExport(node as ts.ExportDeclaration);
    }
    return ts.visitEachChild(node, visitor, ctx);
  }

  return visitor;
}

