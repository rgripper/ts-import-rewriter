"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AST Transformer to rewrite any ImportDeclaration paths.
 * This is typically used to rewrite relative imports into absolute imports
 * and mitigate import path differences w/ metaserver
 */
const ts = __importStar(require("typescript"));
const path_1 = require("path");
/**
 * Rewrite relative import to absolute import or trigger
 * rewrite callback
 *
 * @param {string} importPath import path
 * @param {ts.SourceFile} sf Source file
 * @param {Opts} opts
 * @returns
 */
function rewritePath(importPath, sf, opts) {
    if (opts.project && importPath.startsWith('.')) {
        const path = path_1.resolve(path_1.dirname(sf.fileName), importPath).split(opts.projectBaseDir)[1];
        return `${opts.project}${path}`;
    }
    if (typeof opts.rewrite === 'function') {
        return opts.rewrite(importPath, sf.fileName);
    }
}
function visitor(ctx, sf, opts = { projectBaseDir: '' }) {
    const visitor = (node) => {
        if (node.kind === ts.SyntaxKind.ImportDeclaration && node.moduleSpecifier) {
            const importPathWithQuotes = node.moduleSpecifier.getText(sf);
            const importPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2);
            const rewrittenPath = rewritePath(importPath, sf, opts);
            // Only rewrite relative path
            if (rewrittenPath) {
                return ts.createImportDeclaration(undefined, undefined, node.importClause, ts.createLiteral(rewrittenPath));
            }
        }
        return ts.visitEachChild(node, visitor, ctx);
    };
    return visitor;
}
function transformDts(opts) {
    return (ctx) => {
        return (sf) => ts.visitNode(sf, visitor(ctx, sf, opts));
    };
}
exports.transformDts = transformDts;
/**
 * Check to make sure this is a define node in AMD `define` node
 *
 * @param {ts.Node} node AST node
 * @returns true if this is a `define` node, false otherwise
 */
function isDefineNode(node) {
    return (node.kind === ts.SyntaxKind.CallExpression &&
        node.expression.text === 'define' &&
        node.arguments.length === 2 &&
        ts.isArrayLiteralExpression(node.arguments[0]) &&
        ts.isFunctionExpression(node.arguments[1]));
}
function amdVisitor(ctx, sf, opts = { projectBaseDir: '' }) {
    const visitor = (node) => {
        if (isDefineNode(node)) {
            const importPathsWithQuotes = node.arguments[0]
                .elements;
            const importPaths = importPathsWithQuotes
                .map(path => path.text)
                .map(importPath => rewritePath(importPath, sf, opts) || importPath)
                .map(p => ts.createStringLiteral(p));
            return ts.createCall(ts.createIdentifier('define'), undefined, [
                ts.createArrayLiteral(importPaths),
                node.arguments[1],
            ]);
        }
        return ts.visitEachChild(node, visitor, ctx);
    };
    return visitor;
}
function transformAmd(opts) {
    return (ctx) => {
        return (sf) => ts.visitNode(sf, amdVisitor(ctx, sf, opts));
    };
}
exports.transformAmd = transformAmd;
