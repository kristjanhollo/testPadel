const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// Define HTML pages to process
const htmlPages = [
  { name: 'index', chunk: 'index' },
  { name: 'player-management', chunk: 'player-management' },
  { name: 'player-profile', chunk: 'player-profile' },
  { name: 'player-rankings', chunk: 'player-rankings' },
  { name: 'tournament-bracket', chunk: 'tournament-bracket' },
  { name: 'tournament-bracket-M', chunk: 'tournament-bracket-m' },
  { name: 'tournament-create', chunk: 'tournament-create' },
  { name: 'tournament-list', chunk: 'tournament-list' },
  { name: 'tournament-management', chunk: 'tournament-management' }
];

// Generate HtmlWebpackPlugin instances for each page
const multipleHtmlPlugins = htmlPages.map(({ name, chunk }) => {
  return new HtmlWebpackPlugin({
    template: `./public/${name}.html`,
    filename: `${name}.html`,
    chunks: ['vendors', 'common', chunk],
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
      // Vendor bundle with shared dependencies
      vendors: [
        'firebase/app',
        'firebase/firestore',
        'sweetalert2'
      ],
      
      // Common utilities
      common: './public/scripts/firebase-init.js',
      
      // Page-specific entry points - each corresponds to an HTML page
      'index': './public/scripts/main.js',
      'player-management': './public/scripts/player-management.js',
      'player-profile': './public/scripts/player-profile.js',
      'player-rankings': './public/scripts/player-rankings.js',
      'tournament-bracket': './public/scripts/tournament-bracket.js',
      'tournament-bracket-m': './public/scripts/tournament-bracket-Mexicano.js',
      'tournament-create': './public/scripts/tournament-create.js',
      'tournament-list': './public/scripts/tournament-list.js',
      'tournament-management': './public/scripts/tournament-management.js',
    },
    
    output: {
      filename: 'scripts/[name].[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        // Add aliases for easier imports
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
      new MiniCssExtractPlugin({
        filename: 'styles/[name].[contenthash].css'
      }),
      
      // Copy static assets
      new CopyWebpackPlugin({
        patterns: [
          // Static files
          { from: 'public/styles', to: 'styles' },
          { from: 'public/404.html', to: '404.html' },
          
          // Images, if you have any
          // { from: 'public/images', to: 'images' },
          
          // Any other static files
          // { from: 'public/favicon.ico', to: 'favicon.ico' },
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