const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      '@packages': resolve(__dirname, '../../packages'),
    },
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [
          /node_modules\/@prisma/,
          /generated\/prisma/,
        ],
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /generated\/prisma\/runtime/,
      message: /Failed to parse source map/,
    },
  ],
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      sourceMap: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/utils/email-templates',
          to: 'src/utils/email-templates',
        },
      ],
    }),
  ],
};