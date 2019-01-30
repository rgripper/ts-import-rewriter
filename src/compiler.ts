import * as ts from "typescript";
import {
  rewriteImports,
  ModuleResolver
} from "./rewriter";
import { resolveModuleName } from "typescript";
import path from 'path';
import { getTsConfig } from "./tsConfigHelper";

export function compileAndRewrite(
  directoryPath: string,
  configFileName: string
): void {
  const tsConfig = getTsConfig(directoryPath, configFileName);
  if (tsConfig === undefined) {
    console.error('No config file found');
    return;
  }
  console.log(tsConfig.options);
  return compileAndRewriteWithOptions(tsConfig.fileNames, tsConfig.options);
}

export function compileAndRewriteWithOptions(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  const compilerHost = ts.createCompilerHost(options);
  if (fileNames.length === 0) {
    console.info('No files to compile');
    return;
  }
  const moduleResolver = createModuleResolver(options, compilerHost);
  const program = ts.createProgram(fileNames, options, compilerHost);

  const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [rewriteImports(moduleResolver)],
    afterDeclarations: [rewriteImports(moduleResolver) as ts.TransformerFactory<ts.SourceFile | ts.Bundle>]
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

const createModuleResolver = (compilerOptions: ts.CompilerOptions, compilerHost: ts.CompilerHost): ModuleResolver => {
  return (moduleName, containingFile) => {
    const { resolvedModule } = resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost);
    if (resolvedModule === undefined || resolvedModule.isExternalLibraryImport) {
      return moduleName;
    }

    const absolutePath = resolvedModule.resolvedFileName;
    const relativePath = path.relative(compilerOptions.rootDir!, absolutePath); // TODO: root dir
    const relativeModuleName = relativePath.substring(0, relativePath.length - resolvedModule.extension.length);
    const posixRelativeModuleName = './' + relativeModuleName.split(path.win32.sep).join(path.posix.sep);
    
    return posixRelativeModuleName;
  }
}
