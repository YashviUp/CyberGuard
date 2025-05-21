const path = require('path');

module.exports = {
  entry: './src/background.js', // Change to your actual entry file
  output: {
    filename: 'background.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'CyberGuard', // Optional: attach to window/global
    libraryTarget: 'umd',  // Optional: UMD for compatibility
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 250000,
    }
  },
  performance: {
    hints: false // Disable size warnings
  }
};
