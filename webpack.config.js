const path = require('path');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'none';

const config = target => ({
  mode,
  entry: [path.resolve(__dirname, 'index.js')],
  target,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${target}/sequoia-client.js`,
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['@babel/preset-env'],
          plugins:
            process.env.NODE_ENV === 'test' ? ['istanbul', '@babel/transform-runtime', 'add-module-exports']
              : ['@babel/transform-runtime', 'add-module-exports']
        }
      }
    ]
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, 'node_modules')]
  },
  devtool: 'source-map'
});

const web = config('web');
const node = config('node');

module.exports = [web, node];
