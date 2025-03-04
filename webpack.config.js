const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');

// Define HTML pages to process
const htmlPages = [
  { name: 'index', chunk: 'index' },
  { name: 'player-management', chunk: 'player-management' },
  { name: 'player-profile', chunk: 'player-profile' },
  { name: 'player-rankings', chunk: 'player-rankings' },
  { name: 'tournament-bracket-Americano', chunk: 'tournament-bracket-americano' },
  { name: 'tournament-bracket-M', chunk: 'tournament-bracket-m' },
  { name: 'tournament-create', chunk: 'tournament-create' },
  { name: 'tournament-list', chunk: 'tournament-list' },
  { name: 'tournament-management', chunk: 'tournament-management' },
  { name: 'tournament-management-americano', chunk: 'tournament-management-americano' },
  { name: 'tournament-management-mexicano', chunk: 'tournament-management-mexicano' },
  { name: 'tournament-stats', chunk: 'tournament-stats' }
];

// Generate HtmlWebpackPlugin instances for each page
const multipleHtmlPlugins = htmlPages.map(({ name, chunk }) => {
  return new HtmlWebpackPlugin({
    template: `./public/${name}.html`,
    filename: `${name}.html`,
    chunks: [chunk, 'shared_vendors', 'shared_common'],
    minify: {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true
    }
  });
});

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      // Page-specific entry points - each corresponds to an HTML page
      'index': './public/scripts/main.js',
      'player-management': './public/scripts/player-management.js',
      'player-profile': './public/scripts/player-profile.js',
      'player-rankings': './public/scripts/player-rankings.js',
      'tournament-bracket-americano': './public/scripts/tournament-bracket-Americano.js',
      'tournament-bracket-m': './public/scripts/controllers/mexicano-bracket-controller.js',
      'tournament-create': './public/scripts/tournament-create.js',
      'tournament-list': './public/scripts/tournament-list.js',
      'tournament-management': './public/scripts/tournament-management.js',
      'tournament-management-americano': './public/scripts/controllers/americano-management-controller.js',
      'tournament-management-mexicano': './public/scripts/controllers/mexicano-management-controller.js',
      'tournament-stats': './public/scripts/tournament-stats.js',
      '404': './public/scripts/handle-404.js',
    },
    
    output: {
      filename: 'scripts/[name].[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'public'),
        '@services': path.resolve(__dirname, 'public/scripts/services'),
        '@utils': path.resolve(__dirname, 'public/scripts/utils'),
      }
    },
    
    module: {
      rules: [
        // JavaScript files
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        
        // CSS files
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        }
      ]
    },
    
    plugins: [
      // Extract CSS into separate files
      new Dotenv(),

      new MiniCssExtractPlugin({
        filename: 'styles/[name].[contenthash].css'
      }),
      
      // Copy static assets
      new CopyWebpackPlugin({
        patterns: [
          // Static files
          { from: 'public/styles', to: 'styles' },
          { from: 'public/404.html', to: '404.html' },
        ]
      }),
      
      // Add all HTML page plugins
      ...multipleHtmlPlugins
    ],
    
    optimization: {
      minimizer: [
        // Minimize JavaScript
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      
      // Split chunks for better caching and code organization
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          shared_vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'shared_vendors',
            chunks: 'all',
            priority: 10
          },
          shared_common: {
            test: module => {
              // Include services directory as common code
              return /[\\/]services[\\/]/.test(module.resource) ||
                module.resource === path.resolve(__dirname, 'public/scripts/firebase-init.js');
            },
            name: 'shared_common',
            chunks: 'all',
            minChunks: 2,
            priority: 5
          }
        }
      }
    },
    
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      hot: true,
      compress: true,
      port: 9000,
      historyApiFallback: true,
      open: true
    }
  };
};