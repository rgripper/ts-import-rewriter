import ts from "typescript";
import path from 'path';

export function getTsConfig(directoryPath: string, configFileName: string): ts.ParsedCommandLine | undefined {
  const parseConfigHost: ts.ParseConfigFileHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    getCurrentDirectory: () => directoryPath,
    onUnRecoverableConfigFileDiagnostic: () => { }, // TODO
    useCaseSensitiveFileNames: true
  };

  const absoluteConfigFileName = path.resolve(directoryPath, configFileName);
  return ts.getParsedCommandLineOfConfigFile(absoluteConfigFileName, {}, parseConfigHost);
}