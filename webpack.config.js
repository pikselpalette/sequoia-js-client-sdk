const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: ['babel-polyfill', './index.js'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sequoia-client.js',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['env'],
          plugins: process.env.NODE_ENV === 'test' ? ['istanbul', 'add-module-exports'] : ['add-module-exports']
        }
      },
      {
        test: /\.(json|\/package)$/,
        loader: 'json-loader'
      }
    ]
  },
  devtool: 'source-map'
};
