import * as ts from "typescript";
import {
  transformDts,
  Opts as PathTransformOpts
} from "./transform";
import { resolveModuleName, getParsedCommandLineOfConfigFile } from "typescript";
import path from 'path';

function getTsConfig(directoryPath: string, configFileName: string) {
  const parseConfigHost: ts.ParseConfigFileHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    getCurrentDirectory: () => directoryPath,
    onUnRecoverableConfigFileDiagnostic: () => { }, // TODO
    useCaseSensitiveFileNames: true
  };

  return getParsedCommandLineOfConfigFile(configFileName, {}, parseConfigHost)!;
}

function getCommonRoot(fileNames: string[]): string {
  const rootChars: string[] = [];
  for (let i = 0; ; i++) {
    const lastChar = fileNames.map(x => x[i] as string | undefined).reduce((a, b) => a === b ? a : undefined);
    if (lastChar == undefined) {
      break;
    }

    rootChars.push(lastChar);
  }

  return rootChars.join('');
}

export function compileAndRewrite(
  directoryPath: string,
  configFileName: string
): void {
  const tsConfig = getTsConfig(directoryPath, configFileName);

  const compilerHost = ts.createCompilerHost(tsConfig.options);
  const resolveModuleNameInFile = (moduleName: string, containingFile: string) => resolveModuleName(moduleName, containingFile, tsConfig.options, compilerHost).resolvedModule!.resolvedFileName;
  
  const sourceDirectory = getCommonRoot(tsConfig.fileNames);
  const getRelativePath = (absolutePath: string) => path.relative(absolutePath, sourceDirectory);
  const rewritePath = (moduleName: string, containingFile: string) => getRelativePath(resolveModuleNameInFile(moduleName, containingFile));

  const program = ts.createProgram(tsConfig.fileNames, tsConfig.options, compilerHost);
  const trOpts: PathTransformOpts = {
    projectBaseDir: directoryPath,
    rewrite: resolveModuleNameInFile
  };
  let emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [transformDts(trOpts, rewritePath) as ts.TransformerFactory<ts.SourceFile>],
    afterDeclarations: [transformDts(trOpts, rewritePath) as any]
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