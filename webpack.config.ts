/* eslint-env node */

import * as path from 'path';
import { Configuration as WebpackConfiguration } from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';
import pluginMetadata from './plugin-metadata';

const CopyWebpackPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';
const devServerAllowedOrigins = (
  process.env.BRIDGE_DEV_ALLOWED_ORIGINS ??
  'http://localhost:9000,http://127.0.0.1:9000,http://[::1]:9000'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = {
  mode: isProd ? 'production' : 'development',
  // No regular entry points needed. All plugin related scripts are generated via ConsoleRemotePlugin.
  entry: {},
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? '[name]-bundle-[hash].min.js' : '[name]-bundle.js',
    chunkFilename: isProd ? '[name]-chunk-[chunkhash].min.js' : '[name]-chunk.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /\/node_modules\//,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        ],
      },
      {
        test: /\.(css)$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|otf)(\?.*$|$)/,
        type: 'asset/resource',
        generator: {
          filename: isProd ? 'assets/[contenthash][ext]' : 'assets/[name][ext]',
        },
      },
      {
        test: /\.(m?js)$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  devServer: {
    static: './dist',
    port: 9001,
    // Allow only the known local console bridge hosts used in development.
    allowedHosts: ['localhost', '127.0.0.1', '[::1]', 'host.docker.internal', 'host.containers.internal'],
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
    },
    setupMiddlewares: (middlewares, devServer) => {
      devServer?.app?.use((req, res, next) => {
        const origin = req.headers.origin;

        if (origin && devServerAllowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }

        next();
      });

      return middlewares;
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
  plugins: [
    new ConsoleRemotePlugin({
      pluginMetadata,
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(__dirname, 'locales'), to: 'locales' }],
    }),
  ],
  devtool: isProd ? false : 'source-map',
  optimization: {
    chunkIds: isProd ? 'deterministic' : 'named',
    minimize: isProd,
  },
};

export default config;
