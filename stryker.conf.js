module.exports = (config) => {
  config.set({
    files: [
      'test/**/*.json',
      'test/**/*.js',
      'lib/**/*.js'
    ],
    mutate: [
      'lib/**/*.js'
    ],
    timeoutFactor: 10,
    timeoutMs: 60000,
    testRunner: 'jest',
    mutator: 'javascript',
    coverageAnalysis: 'off',
    plugins: [
      'stryker-jest-runner',
      'stryker-html-reporter',
      'stryker-babel-transpiler',
      'stryker-javascript-mutator'
    ],
    babelrcFile: '.babelrc',
    transpilers: ['babel'],
    reporter: ['dots', 'clear-text', 'html'],
    htmlReporter: {
      baseDir: 'test/results/mutation/html'
    }
  });
};
