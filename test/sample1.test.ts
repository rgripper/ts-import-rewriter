import * as compiler from '../src/compiler';

describe("compiler", () => {
  it("should rewrite path aliases in import statements to relative paths", () => {
    compiler.compileAndRewrite('./sample1', 'tsconfig.json');
  })
});