"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("typescript"));
const transform_1 = require("./transform");
const typescript_1 = require("typescript");
function getTsConfig(directoryPath, configFileName) {
    const parseConfigHost = {
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
        getCurrentDirectory: () => directoryPath,
        onUnRecoverableConfigFileDiagnostic: () => { },
        useCaseSensitiveFileNames: true
    };
    return typescript_1.getParsedCommandLineOfConfigFile(configFileName, {}, parseConfigHost);
}
function compileAndRewrite(directoryPath, configFileName) {
    const tsConfig = getTsConfig(directoryPath, configFileName);
    const compilerHost = ts.createCompilerHost(tsConfig.options);
    const resolveModuleNameInFile = (moduleName, containingFile) => typescript_1.resolveModuleName(moduleName, containingFile, tsConfig.options, compilerHost).resolvedModule.resolvedFileName;
    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options, compilerHost);
    const trOpts = {
        projectBaseDir: directoryPath,
        rewrite: resolveModuleNameInFile
    };
    let emitResult = program.emit(undefined, undefined, undefined, undefined, {
        after: [transform_1.transformDts(trOpts)],
        afterDeclarations: [transform_1.transformDts(trOpts)]
    });
    const allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    allDiagnostics.filter(x => x.file !== undefined).forEach(diagnostic => {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    });
}
exports.compileAndRewrite = compileAndRewrite;
