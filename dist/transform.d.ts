/**
 * AST Transformer to rewrite any ImportDeclaration paths.
 * This is typically used to rewrite relative imports into absolute imports
 * and mitigate import path differences w/ metaserver
 */
import * as ts from 'typescript';
export interface Opts {
    projectBaseDir: string;
    project?: string;
    rewrite?(importPath: string, sourceFilePath: string): string;
}
export declare function transformDts(opts: Opts): ts.TransformerFactory<ts.SourceFile>;
export declare function transformAmd(opts: Opts): ts.TransformerFactory<ts.SourceFile>;
