import * as ts from "typescript";
import {
  transformDts as dtsPathTransform,
  Opts as PathTransformOpts
} from "ts-transform-import-path-rewrite";
import { resolveModuleName, getParsedCommandLineOfConfigFile } from "typescript";

function getTsConfig (directoryPath: string, configFileName: string) {
  const parseConfigHost: ts.ParseConfigFileHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    getCurrentDirectory: () => directoryPath, 
    onUnRecoverableConfigFileDiagnostic: () => {}, // TODO
    useCaseSensitiveFileNames: true
  };

  return getParsedCommandLineOfConfigFile(configFileName, {}, parseConfigHost)!;
}

export function compile(
  directoryPath: string,
  configFileName: string
) {
  const tsConfig = getTsConfig(directoryPath, configFileName);

  const compilerHost = ts.createCompilerHost(tsConfig.options);
  const resolveModuleNameInFile = (moduleName: string, containingFile: string) => resolveModuleName(moduleName, containingFile, tsConfig.options, compilerHost).resolvedModule!.resolvedFileName;
  
  const program = ts.createProgram(tsConfig.fileNames, tsConfig.options, compilerHost);
  const trOpts: PathTransformOpts = {
    projectBaseDir: directoryPath,
    rewrite: resolveModuleNameInFile
  };
  let emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [dtsPathTransform(trOpts) as ts.TransformerFactory<ts.SourceFile>],
    afterDeclarations: [dtsPathTransform(trOpts) as any]
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