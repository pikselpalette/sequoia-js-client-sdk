const path = require('path');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'none';

module.exports = {
  mode,
  entry: ['./index.js'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sequoia-client.js',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['babel-preset-env'],
          plugins:
            process.env.NODE_ENV === 'test' ? ['istanbul', 'transform-runtime', 'add-module-exports'] : ['transform-runtime', 'add-module-exports']
        }
      }
    ]
  },
  devtool: 'source-map'
};
