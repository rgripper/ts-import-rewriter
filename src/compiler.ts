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
  return compileAndRewriteWithOptions(tsConfig.fileNames, tsConfig.options);
}

export function compileAndRewriteWithOptions(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  const compilerHost = ts.createCompilerHost(options);
  console.debug(fileNames);
  if (fileNames.length === 0) {
    console.info('No files to compile');
    return;
  }
  const moduleResolver = createModuleResolver(fileNames, options, compilerHost);
  const program = ts.createProgram(fileNames, options, compilerHost);

  const emitResult = program.emit(undefined, undefined, undefined, undefined, {
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

const createModuleResolver = (fileNames: string[], compilerOptions: ts.CompilerOptions, compilerHost: ts.CompilerHost): ModuleResolver => {
  return (moduleName, containingFile) => {
    const sourceDirectory = getCommonRoot(fileNames);
    const resolution = resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost);
    const absolutePath = resolution && resolution.resolvedModule && resolution.resolvedModule.resolvedFileName;
    return absolutePath && path.relative(absolutePath, sourceDirectory);
  }
}
