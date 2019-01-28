import ts from "typescript";

export function getTsConfig(directoryPath: string, configFileName: string) {
  const parseConfigHost: ts.ParseConfigFileHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    getCurrentDirectory: () => directoryPath,
    onUnRecoverableConfigFileDiagnostic: () => { }, // TODO
    useCaseSensitiveFileNames: true
  };

  return ts.getParsedCommandLineOfConfigFile(configFileName, {}, parseConfigHost)!;
}

export function getCommonRoot(fileNames: string[]): string {
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