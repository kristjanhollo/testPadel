module.exports = {
  'env': {
    'browser': true,
    'es2021': true
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'ecmaVersion': 2022,
    'sourceType': 'module'
  },
  'plugins': [
    'html',
    'compat'
  ],
  'rules': {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['warn', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['warn'],
    'no-console': ['warn', { 'allow': ['warn', 'error'] }],
    'compat/compat': 'warn'
  },
  'settings': {
    'html/html-extensions': ['.html']
  },
  'globals': {
    'firebase': 'readonly',
    'Swal': 'readonly'
  }
};