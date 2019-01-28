/**
 * AST Transformer to rewrite any ImportDeclaration paths.
 * This is typically used to rewrite relative imports into absolute imports
 * and mitigate import path differences w/ metaserver
 */
import * as ts from 'typescript'
import { resolve, dirname } from 'path'

export interface Opts {
  projectBaseDir: string
  project?: string
  rewrite?(importPath: string, sourceFilePath: string): string
}

function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile, rewritePath: (moduleName: string, containingFile: string) => string) {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    if (node.kind === ts.SyntaxKind.ImportDeclaration && (node as ts.ImportDeclaration).moduleSpecifier) {
      const importPathWithQuotes = (node as ts.ImportDeclaration).moduleSpecifier.getText(sf)
      const importPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2)
      const rewrittenPath = rewritePath(importPath, sf.fileName);
      // Only rewrite relative path
      if (rewrittenPath) {
        return ts.createImportDeclaration(
          undefined,
          undefined,
          (node as ts.ImportDeclaration).importClause,
          ts.createLiteral(rewrittenPath)
        )
      }
    }
    return ts.visitEachChild(node, visitor, ctx)
  }

  return visitor
}

export function transformDts(opts: Opts, rewritePath: (moduleName: string, containingFile: string) => string): ts.TransformerFactory<ts.SourceFile> {
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sf: ts.SourceFile) => ts.visitNode(sf, visitor(ctx, sf, rewritePath))
  }
}