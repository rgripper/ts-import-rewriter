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

/**
 * Rewrite relative import to absolute import or trigger
 * rewrite callback
 *
 * @param {string} importPath import path
 * @param {ts.SourceFile} sf Source file
 * @param {Opts} opts
 * @returns
 */
function rewritePath(importPath: string, sf: ts.SourceFile, opts: Opts) {
    if (opts.project && importPath.startsWith('.')) {
        const path = resolve(dirname(sf.fileName), importPath).split(opts.projectBaseDir)[1]
        return `${opts.project}${path}`
    }

    if (typeof opts.rewrite === 'function') {
        return opts.rewrite(importPath, sf.fileName)
    }
}

function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile, opts: Opts = { projectBaseDir: '' }) {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        if (node.kind === ts.SyntaxKind.ImportDeclaration && (node as ts.ImportDeclaration).moduleSpecifier) {
            const importPathWithQuotes = (node as ts.ImportDeclaration).moduleSpecifier.getText(sf)
            const importPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2)
            const rewrittenPath = rewritePath(importPath, sf, opts)
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

export function transformDts(opts: Opts): ts.TransformerFactory<ts.SourceFile> {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        return (sf: ts.SourceFile) => ts.visitNode(sf, visitor(ctx, sf, opts))
    }
}