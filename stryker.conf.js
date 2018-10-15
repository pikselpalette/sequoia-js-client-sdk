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
    timeoutMS: 60000,
    testRunner: 'jest',
    mutator: 'javascript',
    coverageAnalysis: 'off',
    plugins: [
      'stryker-jest-runner',
      'stryker-html-reporter',
      'stryker-javascript-mutator'
    ],
    reporters: ['progress', 'dots', 'clear-text', 'html'],
    htmlReporter: {
      baseDir: 'test/results/mutation/html'
    }
  });
};
