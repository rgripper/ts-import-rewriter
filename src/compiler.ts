import * as ts from "typescript";
import {
  rewriteImports,
  ModuleResolver
} from "./rewriter";
import { resolveModuleName } from "typescript";
import path from 'path';
import { getTsConfig, getCommonRoot } from "./tsConfigHelper";


export function compileAndRewrite(
  directoryPath: string,
  configFileName: string
): void {
  const tsConfig = getTsConfig(directoryPath, configFileName);

  const compilerHost = ts.createCompilerHost(tsConfig.options);
  const resolveModuleNameInFile = (moduleName: string, containingFile: string) => resolveModuleName(moduleName, containingFile, tsConfig.options, compilerHost).resolvedModule!.resolvedFileName;
  
  const sourceDirectory = getCommonRoot(tsConfig.fileNames);
  const getRelativePath = (absolutePath: string) => path.relative(absolutePath, sourceDirectory);
  const moduleResolver: ModuleResolver = (moduleName, containingFile) => getRelativePath(resolveModuleNameInFile(moduleName, containingFile));

  const program = ts.createProgram(tsConfig.fileNames, tsConfig.options, compilerHost);

  let emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [rewriteImports(moduleResolver) as ts.TransformerFactory<ts.SourceFile>],
    afterDeclarations: [rewriteImports(moduleResolver) as any]
  });

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.filter(x => x.file !== undefined).forEach(diagnostic => {
    const { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(
      diagnostic.start!
    );
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    console.log(
      `${diagnostic.file!.fileName} (${line + 1},${character + 1}): ${message}`
    );
  });
}