const getMutatePattern = () => {
  const sharedProps = { included: false, mutated: true };

  for (let i = 0; i < process.argv.length; i++) {
    const argument = process.argv[i].split('=');

    if (argument[0] === '--file') {
      return [
        { pattern: argument.slice(1).join('='), ...sharedProps },
        'lib/**/*.js'
      ];
    }
  }

  return [{ pattern: 'lib/**/*.js', ...sharedProps }];
};

module.exports = (config) => {
  config.set({
    files: [
      'test/**/*.json',
      'test/**/*.js',
      ...getMutatePattern()
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
