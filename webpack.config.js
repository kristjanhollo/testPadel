const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const htmlPageNames = [
  'index',
  'player-management',
  'player-profile',
  'player-rankings',
  'tournament-bracket',
  'tournament-bracket-M',
  'tournament-create',
  'tournament-list',
  'tournament-management'
];

const multipleHtmlPlugins = htmlPageNames.map(name => {
  return new HtmlWebpackPlugin({
    template: `./public/${name}.html`,
    filename: `${name}.html`,
    chunks: ['shared', name],
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
      'shared': './public/scripts/shared-dependencies.js',
      // Define entry points for each page
      'index': './public/scripts/main.js',
      'player-management': './public/scripts/player-management.js',
      'player-profile': './public/scripts/player-profile.js',
      'player-rankings': './public/scripts/player-rankings.js',
      'tournament-bracket': './public/scripts/tournament-bracket.js',
      'tournament-bracket-M': './public/scripts/tournament-bracket-Mexicano.js',
      'tournament-create': './public/scripts/tournament-create.js',
      'tournament-list': './public/scripts/tournament-list.js',
      'tournament-management': './public/scripts/tournament-management.js',
    },
    output: {
      filename: 'scripts/[name].[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      hot: true,
      compress: true,
      port: 9000,
    },
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
        },
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
      new MiniCssExtractPlugin({
        filename: 'styles/[name].[contenthash].css'
      }),
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'public/styles', 
            to: 'styles' 
          },
          {
            from: 'public/404.html',
            to: '404.html'
          }
        ]
      }),
      ...multipleHtmlPlugins
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: -20
          }
        }
      }
    }
  };
};