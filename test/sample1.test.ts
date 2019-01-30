import * as compiler from '../src/compiler';
import * as path from 'path';

describe("compiler", () => {
  it("should rewrite path aliases in import statements to relative paths", () => {
    compiler.compileAndRewrite(path.resolve('./test/sample1'), 'tsconfig.json');
  })
});