const path = require('path');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'none';


module.exports = {
  mode,
  entry: ['babel-polyfill', './index.js'],
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
          plugins: process.env.NODE_ENV === 'test' ? ['istanbul', 'add-module-exports'] : ['add-module-exports']
        }
      }
    ]
  },
  devtool: 'source-map'
};
